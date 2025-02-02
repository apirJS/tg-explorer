import { Browser, LaunchOptions, Page } from 'puppeteer';
import { BASE_TELEGRAM_URL, VALID_AUTH_STATE } from './lib/const';
import path from 'path';
import { isIDBOperationSuccess } from './lib/utils';
import { IDBOperationResult } from './lib/types';
import puppeteer from 'puppeteer-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';

class Scraper {
  private static instance: Scraper;
  private browser!: Browser;
  private currentPage?: Page;
  public localStorage?: Record<string, any>;

  private constructor() {}

  static async getInstance(options?: LaunchOptions): Promise<Scraper> {
    if (!Scraper.instance) {
      Scraper.instance = new Scraper();
      await Scraper.instance.init(options);
    }
    return Scraper.instance;
  }

  private async getPuppeteerDefaultArgs() {
    return {
      defaultViewport: { width: 1280, height: 720 },
    } as LaunchOptions;
  }

  private async init(options?: LaunchOptions) {
    puppeteer.use(stealthPlugin());
    this.browser = await puppeteer.launch({
      ...this.getPuppeteerDefaultArgs(),
      ...options,
    });
    await this.getPage();
    return this.browser;
  }

  private async getPage(): Promise<Page> {
    // If currentPage exists and is still open, return it
    if (this.currentPage) {
      try {
        // Check if page is still accessible (it might be closed)
        await this.currentPage.title(); // any simple operation
        return this.currentPage;
      } catch {
        // If it throws, we'll create a new page below
      }
    }

    // Get all pages; if none, create a new page
    const pages = await this.browser.pages();
    this.currentPage =
      pages.length > 0 ? pages[0] : await this.browser.newPage();
    return this.currentPage;
  }

  async openTelegram(type: 'a' | 'k' = 'k') {
    const page = await this.getPage();
    await page.goto(`${BASE_TELEGRAM_URL}/${type}/`);
  }

  async close() {
    await this.browser.close();
  }

  async isUserAuthenticated(): Promise<boolean | Error> {
    const page = await this.getPage();
    const currentURL = page.url();
    if (!currentURL.includes('web.telegram.org')) {
      await this.openTelegram('k');
      // Wait until the page's URL includes the expected domain.
      await page.waitForFunction(
        (url) => window.location.href.includes(url),
        {},
        'web.telegram.org'
      );
    }
    const result = await page.evaluate(
      async (): Promise<IDBOperationResult<{ authState: string }>> => {
        const signal = AbortSignal.timeout(1000 * 60 * 2);
        return Promise.race<IDBOperationResult<{ authState: string }>>([
          new Promise((resolve, reject) => {
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
          }),
          new Promise((_, reject) =>
            signal.addEventListener('abort', () =>
              reject({ error: new DOMException('AbortError', 'AbortError') })
            )
          ),
        ]);
      }
    );
    if (!isIDBOperationSuccess(result)) {
      return result.error;
    }

    return result.data.authState === VALID_AUTH_STATE;
  }

  async relaunch(options: LaunchOptions) {
    await this.browser.close();
    this.browser = await puppeteer.launch({
      ...this.getPuppeteerDefaultArgs(),
      ...options,
    });
    this.currentPage = await this.getPage();
  }

  async getUserId() {
    const page = await this.getPage();
    const currentURL = page.url();
    if (!currentURL.includes('web.telegram.org')) {
      await this.openTelegram('k');
      // Wait until the page's URL includes the expected domain.
      await page.waitForFunction(
        (url) => window.location.href.includes(url),
        {},
        'web.telegram.org'
      );
    }

    const userId: string | null = await page.evaluate(() => {
      const data = localStorage.getItem('user_auth');
      return data ? JSON.parse(data).id : null;
    });
    console.log('userID: ', userId);
    return userId;
  }

  async waitForLogin(timeout: number = 300_000): Promise<boolean> {
    await this.relaunch({
      headless: false,
      userDataDir: path.resolve(__dirname, '../session'),
      defaultViewport: { width: 1280, height: 720 },
    });
    await this.openTelegram('k');

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let finished = false;
      let timeoutId: Timer;

      const checkAuth = async () => {
        if (finished) return;

        try {
          const result = await this.getUserId();
          if (result) {
            console.log('result is catched', result);
            finished = true;
            clearTimeout(timeoutId); // Stop any pending timeout
            resolve(true);
          } else if (Date.now() - startTime >= timeout) {
            finished = true;
            clearTimeout(timeoutId);
            reject(false);
          } else {
            timeoutId = setTimeout(checkAuth, 1000);
          }
        } catch (error) {
          finished = true;
          clearTimeout(timeoutId);
          console.error(error);
          reject(false);
        }
      };

      checkAuth();
    });
  }

  async getFullName() {
    console.log('getting fullname');
    const page = await this.getPage();
    const currentURL = page.url();
    if (!currentURL.includes('web.telegram.org')) {
      await this.openTelegram('k');
      // Wait until the page's URL includes the expected domain.
      await page.waitForFunction(
        (url) => window.location.href.includes(url),
        {},
        'web.telegram.org'
      );
    }

    const userId = await this.getUserId();
    if (userId === null) {
      return new Error('Failed to get userId.');
    }

    const result = await page.evaluate(
      async (userId): Promise<IDBOperationResult<{ fullName: string }>> => {
        const signal = AbortSignal.timeout(1000 * 60 * 2);
        return Promise.race<IDBOperationResult<{ fullName: string }>>([
          new Promise((resolve, reject) => {
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
          }),
          new Promise((_, reject) =>
            signal.addEventListener('abort', () =>
              reject({ error: new DOMException('AbortError', 'AbortError') })
            )
          ),
        ]);
      },
      userId
    );

    if (!isIDBOperationSuccess(result)) {
      return result.error;
    }

    return result.data.fullName;
  }

  async setItemOnLocalStorage(key: string, value: string) {
    const page = await this.getPage();
    const currentURL = page.url();
    if (!currentURL.includes('web.telegram.org')) {
      await this.openTelegram('k');
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
