import puppeteer, { Browser, LaunchOptions, Page } from 'puppeteer';
import { BASE_TELEGRAM_URL } from '../lib/const';

class Scraper {
  private static instance: Scraper;
  private browser!: Browser;
  private currentPage?: Page;

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

  async close() {
    await this.browser.close();
  }

  async getCredentials() {
    if (!this.currentPage) {
      this.currentPage = await this.getPage();
    }

    await this.currentPage.goto(BASE_TELEGRAM_URL);
    this.currentPage.on('response', async (response) => {
      const headers = response.headers();
      if (headers['set-cookie']) {
        console.log('Set-Cookie header detected:', headers['set-cookie']);
        console.log(await this.currentPage?.cookies());
      }
    });

    const interval = setInterval(async () => {
      console.log(await this.browser.cookies());
    }, 1000);

    setTimeout(() => {
      clearInterval(interval);
    }, 30_000);
  }
}

export default Scraper;
