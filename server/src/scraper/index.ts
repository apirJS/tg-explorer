import puppeteer, { Browser, LaunchOptions, Page } from 'puppeteer';
import { BASE_TELEGRAM_URL, VALID_AUTH_STATE } from '../lib/const';
import path from 'path';
import { isIDBOperationSuccess } from '../lib/utils';
import { IDBOperationResult } from '../lib/types';

class Scraper {
  private static instance: Scraper;
  private browser!: Browser;
  private currentPage?: Page;
  public cookies?: string[];
  public localStorage?: Record<string, any>;

  private constructor() {}

  static async getInstance(options?: LaunchOptions): Promise<Scraper> {
    if (!Scraper.instance) {
      Scraper.instance = new Scraper();
      await Scraper.instance.init(options);
    }
    return Scraper.instance;
  }

  private async init(options?: LaunchOptions) {
    this.browser = await puppeteer.launch(options);
    await this.getPage();
    return this.browser;
  }

  private async getPage(): Promise<Page> {
    const [page] = await this.browser.pages();
    this.currentPage = page || (await this.browser.newPage());
    return this.currentPage;
  }

  async openTelegram(type: 'a' | 'k' = 'a') {
    const page = await this.getPage();
    await page.goto(`${BASE_TELEGRAM_URL}${type}/`);
  }

  async close() {
    await this.browser.close();
  }

  private async captureLocalStorage() {
    const page = await this.getPage();
    this.localStorage = await page.evaluate(() => {
      const data: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          data[key] = localStorage.getItem(key) || '';
        }
      }
      return data;
    });
    await Bun.write('localStorage.json', JSON.stringify(this.localStorage));
  }

  async getCredentials() {
    const page = await this.getPage();
    page.on('request', async (request) => {
      const url = new URL(request.url());
      if (url.pathname === '/_websync_' && url.searchParams.get('authed')) {
        await this.captureLocalStorage();
      }
    });
  }

  async getLocalStorage() {
    const filePath = path.resolve(__dirname, '../../creds/localStorage.json');
    const file = Bun.file(filePath);
    const ls = (await file.json()) ?? null;
    return ls as Record<string, string> | null;
  }

  async capturePage() {
    const page = await this.getPage();
    await page.waitForNetworkIdle({ idleTime: 10_000 });
    await page.screenshot({ path: 'assets/telegram.png' });
  }

  async isUserAuthenticated(): Promise<boolean | Error> {
    const page = await this.getPage();
    const currentURL = page.url();
    if (!currentURL.includes('web.telegram.org')) {
      await this.openTelegram('a');
    }

    const result = await page.evaluate(
      async (): Promise<IDBOperationResult<{ authState: string }>> => {
        return new Promise((resolve, reject) => {
          const open = indexedDB.open('tweb');

          open.onerror = () =>
            reject({ error: new Error('Failed to open DB!') });

          open.onsuccess = () => {
            const db = open.result;
            const transaction = db.transaction('session', 'readonly');
            const store = transaction.objectStore('session');
            const query = store.get('authState');

            query.onsuccess = () =>
              resolve({ data: { authState: query.result['_'] } });
            query.onerror = () =>
              reject({ error: new Error('Failed to retrieve data!') });
          };
        });
      }
    );
    if (!isIDBOperationSuccess(result)) {
      return result.error;
    }

    return result.data.authState === VALID_AUTH_STATE;
  }

  async relaunch(options: LaunchOptions) {
    await this.browser.close();
    this.browser = await puppeteer.launch(options);
    this.currentPage = await this.getPage();
  }

  async getUserId() {
    const page = await this.getPage();
    const userId: string | null = await page.evaluate(() => {
      const data = localStorage.getItem('user_auth');
      return data ? JSON.parse(data).id : null;
    });
    return userId;
  }

  async isChannelExists() {
    const page = await this.getPage();
    return !!(await page.evaluate(() => {
      return localStorage.getItem('tg-explorer-channel-url');
    }));
  }

  async waitForLogin(timeout: number = 300_000): Promise<boolean> {
    await this.relaunch({
      headless: false,
      userDataDir: path.resolve(__dirname, '../session'),
      pipe: true
    });
    await this.openTelegram('a');

    return new Promise((resolve, reject) => {
      let timeoutId: Timer | null = null;

      const intervalId = setInterval(async () => {
        try {
          const result = await this.isUserAuthenticated();
          if (result === true) {
            clearInterval(intervalId);
            if (timeoutId) clearTimeout(timeoutId);
            await this.openTelegram('a');
            resolve(true);
          }
        } catch (error) {
          clearInterval(intervalId);
          if (timeoutId) clearTimeout(timeoutId);
          reject(error);
        }
      }, 1000);

      timeoutId = setTimeout(() => {
        clearInterval(intervalId);
        reject(false);
      }, timeout);
    });
  }

  async getFullName() {
    const page = await this.getPage();
    await this.openTelegram('a');
    const userId = await this.getUserId();
    if (userId === null) {
      return new Error('Failed to get userId.');
    }

    const result = await page.evaluate(
      async (userId): Promise<IDBOperationResult<{ fullName: string }>> => {
        return new Promise((resolve, reject) => {
          const open = indexedDB.open('tweb');

          open.onerror = () =>
            reject({ error: new Error('Failed to open DB!') });

          open.onsuccess = () => {
            const db = open.result;
            const transaction = db.transaction('users', 'readonly');
            const store = transaction.objectStore('users');
            const query = store.get(userId);

            query.onsuccess = () =>
              resolve({
                data: {
                  fullName: `${query.result['first_name']} ${
                    query.result['last_name'] ?? ''
                  }`,
                },
              });
            query.onerror = () =>
              reject({ error: new Error('Failed to retrieve data!') });
          };
        });
      },
      userId
    );

    if (!isIDBOperationSuccess(result)) {
      return result.error;
    }

    await page.goto(BASE_TELEGRAM_URL + 'a');
    return result.data.fullName;
  }

  async setItemOnLocalStorage(key: string, value: string) {
    const page = await this.getPage();
    const currentURL = page.url();
    if (!currentURL.includes('web.telegram.org')) {
      await this.openTelegram('a');
    }

    await page.evaluate(
      ([key, value]) => {
        localStorage.setItem(key, value);
      },
      [key, value]
    );
  }
}

export default Scraper;
