import { Browser, LaunchOptions, Page } from 'puppeteer';
import { BASE_TELEGRAM_URL, VALID_AUTH_STATE } from './lib/const';
import path from 'path';
import { formatFullName } from './lib/utils';
import { PageType } from './lib/types';
import puppeteer from 'puppeteer-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import { INDEXED_DB_CONFIG } from './lib/config';

// THIS IS A SINGLETON CLASS
// Which means, there is only one instance globally at a time.
class TelegramScraper {
  private static instance: TelegramScraper;
  private browser!: Browser;
  private activePage?: Page;

  private constructor() {}

  static async createInstance(
    options?: LaunchOptions
  ): Promise<TelegramScraper> {
    if (!TelegramScraper.instance) {
      TelegramScraper.instance = new TelegramScraper();
      await TelegramScraper.instance.initializeBrowser(options);
    }
    return TelegramScraper.instance;
  }

  private get defaultBrowserSettings(): LaunchOptions {
    return {
      defaultViewport: { width: 1280, height: 720 },
      headless: false,
      userDataDir: path.resolve(__dirname, '../session'),
    };
  }

  private async initializeBrowser(options?: LaunchOptions): Promise<void> {
    try {
      puppeteer.use(stealthPlugin());
      this.browser = await puppeteer.launch({
        ...this.defaultBrowserSettings,
        ...options,
      });
      await this.obtainFreshPage();
    } catch (error) {
      throw new Error(
        `Browser initialization failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  private async obtainFreshPage(): Promise<Page> {
    if (this.activePage && !this.activePage.isClosed()) {
      return this.activePage;
    }

    const [existingPage] = await this.browser.pages();
    this.activePage = existingPage || (await this.browser.newPage());
    return this.activePage;
  }

  private async ensureTelegramPage(authType: PageType = 'k'): Promise<void> {
    const page = await this.obtainFreshPage();
    if (!page.url().includes('web.telegram.org')) {
      await page.goto(`${BASE_TELEGRAM_URL}/${authType}/`);
      await page.waitForFunction(
        (expectedUrl) => window.location.href.includes(expectedUrl),
        {},
        'web.telegram.org'
      );
    }
  }

  async navigateToTelegram(authType: PageType = 'k'): Promise<void> {
    await this.ensureTelegramPage(authType);
  }

  async terminateBrowser(): Promise<void> {
    try {
      await this.browser.close();
    } catch (error) {
      console.error('Browser termination error:', error);
    }
  }

  private async queryIndexedDB<T>(
    storeName: string,
    key: string,
    timeoutMs: number = 1000 * 60 // default one minute
  ): Promise<T> {
    const page = await this.obtainFreshPage();

    try {
      return await page.evaluate(
        async ({ storeName, key }) => {
          const abortTimeout = AbortSignal.timeout(timeoutMs);
          return new Promise<T>((resolve, reject) => {
            const openRequest = indexedDB.open(INDEXED_DB_CONFIG.name);

            abortTimeout.addEventListener('abort', () => {
              openRequest.onerror = null;
              openRequest.onsuccess = null;
              reject(new DOMException('Timeout reached', 'AbortError'));
            });

            openRequest.onerror = () => reject('Database open failed');
            openRequest.onsuccess = () => {
              const db = openRequest.result;
              const transaction = db.transaction(storeName, 'readonly');
              const store = transaction.objectStore(storeName);
              const query = store.get(key);

              query.onsuccess = () => resolve(query.result);
              query.onerror = () => reject('Data query failed');
            };
          });
        },
        { storeName, key }
      );
    } catch (error) {
      throw new Error(
        `IndexedDB query failed: ${
          error instanceof Error ? error.message : error
        }`
      );
    }
  }

  async checkAuthentication(): Promise<boolean> {
    try {
      await this.ensureTelegramPage();
      const authState = await this.queryIndexedDB<{ _: string }>(
        'session',
        'authState'
      );
      return authState?._ === VALID_AUTH_STATE;
    } catch (error) {
      console.error('Authentication check failed:', error);
      return false;
    }
  }

  async retrieveUserId(): Promise<string> {
    try {
      await this.ensureTelegramPage();
      const page = await this.obtainFreshPage();

      const userAuthData = await page.evaluate(() =>
        JSON.parse(localStorage.getItem('user_auth') || 'null')
      );

      if (!userAuthData?.id) {
        throw new Error('User ID not found in localStorage');
      }

      return userAuthData.id;
    } catch (error) {
      throw new Error(
        `Failed to retrieve user ID: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  async waitForUserLogin(timeoutMs: number = 300_000): Promise<boolean> {
    try {
      await this.initializeBrowser();
      return await new Promise((resolve, reject) => {
        let timeoutId: Timer | null = null;
        const startTime = Date.now();

        const checkLoop = async () => {
          try {
            const userId = await this.retrieveUserId();
            if (userId) {
              resolve(true);
              return;
            }

            if (Date.now() - startTime > timeoutMs) {
              reject(new Error('Login timeout reached'));
              return;
            }

            timeoutId = setTimeout(checkLoop, 1000);
          } catch (error) {
            reject(error);
            return;
          } finally {
            if (timeoutId) {
              clearTimeout(timeoutId);
            }
          }
        };

        checkLoop();
      });
    } catch (error) {
      console.error('Login wait failed:', error);
      return false;
    }
  }

  async fetchUserFullName(): Promise<string> {
    try {
      const userId = await this.retrieveUserId();
      const userData = await this.queryIndexedDB<{
        first_name: string;
        last_name?: string;
      }>('users', userId);

      return formatFullName(userData.first_name, userData.last_name);
    } catch (error) {
      throw new Error(
        `Failed to fetch full name: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  async updateLocalStorage(key: string, value: string): Promise<void> {
    try {
      const page = await this.obtainFreshPage();
      await page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, value]);
    } catch (error) {
      throw new Error(
        `LocalStorage update failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }
}

export default TelegramScraper;
