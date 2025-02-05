import { Browser, LaunchOptions, Mouse, Page } from 'puppeteer';
import {
  BASE_TELEGRAM_URL,
  DEFAULT_TIMEOUT,
  VALID_AUTH_STATE,
} from './lib/const';
import path from 'path';
import { formatFullName } from './lib/utils';
import { PageType } from './lib/types';
import puppeteer from 'puppeteer-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import { INDEXED_DB_CONFIG } from './lib/config';
import selectors from './lib/selectors';

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

  private async ensureTelegramPage(pageType: PageType = 'k'): Promise<Page> {
    const page = await this.obtainFreshPage();
    if (!page.url().includes('web.telegram.org')) {
      await page.goto(`${BASE_TELEGRAM_URL}/${pageType}/`);
      await page.waitForFunction(
        (expectedUrl) => window.location.href.includes(expectedUrl),
        {},
        'web.telegram.org'
      );
    }
    return page;
  }

  async closeInstance(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async relaunchBrowser(options: LaunchOptions): Promise<boolean> {
    try {
      if (this.browser) {
        await this.browser.close();
      }

      await this.initializeBrowser(options);
      return true;
    } catch (error) {
      throw new Error(
        `Failed to relaunch browser: ${
          error instanceof Error ? error.message : 'Unknown reason.'
        }`
      );
    }
  }

  async navigateToTelegram(pageType: PageType = 'k'): Promise<void> {
    await this.ensureTelegramPage(pageType);
  }

  private async navigateToTelegramHomePage(
    pageType: PageType = 'k'
  ): Promise<Page> {
    const page = await this.obtainFreshPage();
    await page.goto(`${BASE_TELEGRAM_URL}/${pageType}/`);
    await page.waitForFunction(
      (expectedUrl) => window.location.href.includes(expectedUrl),
      {},
      'web.telegram.org'
    );
    return page;
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
      throw new Error(
        `Failed to check user credentials: ${
          error instanceof Error ? error.message : 'Unknown reason.'
        }`
      );
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

  async waitForUserLogin(
    timeoutMs: number = DEFAULT_TIMEOUT
  ): Promise<boolean> {
    try {
      await this.relaunchBrowser({ headless: false });
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
              reject(false);
              return;
            }

            timeoutId = setTimeout(checkLoop, 1000);
          } catch (error) {
            throw new Error(
              `Failed to check for user login state: ${
                error instanceof Error ? error.message : 'Unknown reason.'
              }`
            );
          } finally {
            if (timeoutId) {
              clearTimeout(timeoutId);
            }
          }
        };

        checkLoop();
      });
    } catch (error) {
      throw new Error(
        `Failed to check for user login state: ${
          error instanceof Error ? error.message : 'Unknown reason.'
        }`
      );
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

  private async checkForChannel(userId: string): Promise<boolean> {
    try {
      const page = await this.navigateToTelegramHomePage();
      const searchTarget = `tg-explorer-${userId}`;

      // Dispatch FocusEvent to the input element to trigger the search helper list
      await page.evaluate((selectors) => {
        const focusEvent = new FocusEvent('focus');
        const inputElement: null | HTMLInputElement = document.querySelector(
          selectors.k.home.SEARCH_INPUT.selector
        );

        if (inputElement === null) {
          throw new Error('Search input element not found.');
        }

        inputElement.dispatchEvent(focusEvent);
      }, selectors);

      // Begin to search the channel
      await page.type(selectors.k.home.SEARCH_INPUT.selector, searchTarget);

      const isChannelExists = await page.evaluate((selectors) => {
        const chatList = document.querySelectorAll(
          selectors.k.home.SEARCH_INPUT.SEARCH_HELPER_LIST.selector
        );

        if (chatList.length === 0) {
          return false;
        }

        chatList.forEach((chat) => {
          if (chat.innerHTML.trim() === searchTarget.trim()) {
            return true;
          }
        });

        return false;
      }, selectors);

      return isChannelExists;
    } catch (error) {
      throw new Error(
        `Failed to check for the channel existence: ${
          error instanceof Error ? error.message : 'unknown error.'
        }`
      );
    }
  }

  async createChannel(): Promise<boolean> {
    try {
      const userId = await this.retrieveUserId();
      let isChannelExists = await this.checkForChannel(userId);
      const channelName = `tg-explorer-${userId}`;

      if (isChannelExists) {
        throw new Error('Channel already exists.');
      }
      const page = await this.navigateToTelegramHomePage();

      await page.evaluate(
        (selectors, channelName) => {
          const penIconButton: HTMLButtonElement | null =
            document.querySelector(selectors.k.home.PEN_ICON_BUTTON.selector);
          if (penIconButton === null) {
            throw new Error('Pen icon button not found');
          }

          penIconButton.click();

          const newChannelMenuItem: HTMLDivElement | null =
            document.querySelector(
              selectors.k.home.PEN_ICON_BUTTON.NEW_CHANNEL_BUTTON.selector
            );
          if (newChannelMenuItem === null) {
            throw new Error('New channel menu item not found');
          }

          newChannelMenuItem.click();

          const channelNameInput: HTMLDivElement | null =
            document.querySelector(
              selectors.k.home.PEN_ICON_BUTTON.NEW_CHANNEL_BUTTON
                .CHANNEL_NAME_INPUT.selector
            );
          if (channelNameInput === null) {
            throw new Error('Channel name input not found');
          }

          if (channelNameInput.classList.contains('is-empty')) {
            channelNameInput.classList.remove('is-empty');
          }

          channelNameInput.innerHTML = channelName;

          const continueButton: HTMLButtonElement | null =
            document.querySelector(
              selectors.k.home.PEN_ICON_BUTTON.NEW_CHANNEL_BUTTON
                .CONTINUE_BUTTON.selector
            );
          if (continueButton === null) {
            throw new Error('Continue button not found');
          }

          if (!continueButton.classList.contains('is-visible')) {
            continueButton.classList.add('is-visible');
          }

          continueButton.click();
        },
        selectors,
        channelName
      );

      return await this.checkForChannel(userId);
    } catch (error) {
      throw new Error(
        `Failed to create channel: ${
          error instanceof Error ? error.message : 'unknown error.'
        }`
      );
    }
  }
}

export default TelegramScraper;
