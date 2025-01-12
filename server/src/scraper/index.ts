import puppeteer, { Browser, LaunchOptions, Page } from 'puppeteer';
import { BASE_TELEGRAM_URL } from '../lib/const';
import { getLocalStorage } from '../lib';

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

  async init(options?: LaunchOptions) {
    this.browser = await puppeteer.launch(options);
  }

  async getPage(): Promise<Page> {
    if (!this.currentPage) {
      const [page] = await this.browser.pages();
      this.currentPage = page ?? (await this.browser.newPage());
    }
    return this.currentPage;
  }

  async openTelegram() {
    if (!this.currentPage) {
      this.currentPage = await this.getPage();
    }

    await this.currentPage.goto(BASE_TELEGRAM_URL);
  }

  async close() {
    await this.browser.close();
  }

  async getCredentials() {
    if (!this.currentPage) {
      this.currentPage = await this.getPage();
    }

    this.currentPage.on('request', async (request) => {
      const url = request.url();
      if (url.includes('avatar') && url.endsWith('.js')) {
        this.localStorage = await this.currentPage?.evaluate(() => {
          const data: Record<string, string> = {};
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
              data[key] = localStorage.getItem(key) || '';
            }
          }
          return data;
        });
      }
    });
  }

  async loadCredentials() {
    if (!this.currentPage) {
      this.currentPage = await this.getPage();
    }

    const ls = await getLocalStorage();
    if (ls === null) {
      return await this.getCredentials();
    }

    this.localStorage = ls;
    await this.currentPage.waitForNetworkIdle({ idleTime: 10_000 });
    await this.currentPage.evaluate(() => {
      for (const [key, value] of Object.entries(ls)) {
        console.log('Setting localStorage...');
        console.log(key, value);
        console.log(ls);
        localStorage.setItem(key, value);
      }
    });
  }

  async capturePage() {
    if (!this.currentPage) {
      this.currentPage = await this.getPage();
    }

    await this.currentPage.waitForNetworkIdle({ idleTime: 10_000 });
    await this.currentPage.screenshot({ path: 'assets/telegram.png' });
  }
}

export default Scraper;
