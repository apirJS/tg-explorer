import puppeteer, { Browser, LaunchOptions, Page } from 'puppeteer';
import { BASE_TELEGRAM_URL, VALID_AUTH_STATE } from '../lib/const';
import path from 'path';
import selectors from '../lib/selectors';
import { getAuthState } from './indexedDB/services';
import { isIDBOperationSuccess } from '../lib/utils';

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
  }

  private async getPage(): Promise<Page> {
    if (!this.currentPage) {
      const [page] = await this.browser.pages();
      this.currentPage = page || (await this.browser.newPage());
    }
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

  async loadCredentials() {
    const page = await this.getPage();
    const ls = await this.getLocalStorage();

    if (ls === null) {
      await this.getCredentials();
    } else {
      this.localStorage = ls;
      await page.evaluate((localStorageData) => {
        for (const [key, value] of Object.entries(localStorageData)) {
          localStorage.setItem(key, value);
        }
      }, ls);
      await page.reload();
    }
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
      await this.openTelegram('k');
    }

    const authState = await page.evaluate(async () => {
      return await getAuthState();
    });
    if (!isIDBOperationSuccess(authState)) {
      return authState.error;
    }

    return authState.data.authState === VALID_AUTH_STATE;
  }

  async relaunch(options: LaunchOptions) {
    await this.browser.close();
    this.browser = await puppeteer.launch(options);
    this.currentPage = await this.getPage();
  }

  async getUserId() {
    const page = await this.getPage();
    const userId = await page.evaluate(() => {
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

}

export default Scraper;
