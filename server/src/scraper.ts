import { Browser, LaunchOptions, Page } from 'puppeteer';
import {
  BASE_TELEGRAM_URL,
  DEFAULT_CLICK_DELAY_MS,
  DEFAULT_LOGIN_TIMEOUT_MS,
  VALID_AUTH_STATE,
} from './lib/const';
import path from 'path';
import {
  getChannelName,
  formatFullName,
  formatErrorMessage,
  generateTelegramChatUrl,
  disableAnimation,
} from './lib/utils';
import { ChannelInfo, PageType } from './lib/types';
import puppeteer from 'puppeteer-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import { INDEXED_DB_CONFIG } from './lib/config';
import selectors from './lib/selectors';

//
// THIS IS A SINGLETON CLASS
// Which means, there is only one instance globally at a time.
//
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
      args: ['--start-maximized'],
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
        formatErrorMessage('Browser initialization failed', error)
      );
    }
  }

  private async obtainFreshPage(): Promise<Page> {
    try {
      if (this.activePage && !this.activePage.isClosed()) {
        return this.activePage;
      }

      const [existingPage] = await this.browser.pages();
      this.activePage = existingPage || (await this.browser.newPage());
      return this.activePage;
    } catch (error) {
      throw new Error(formatErrorMessage('Failed to obtain fresh page', error));
    }
  }

  private async ensureTelegramPage(pageType: PageType = 'k'): Promise<Page> {
    try {
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
    } catch (error) {
      throw new Error(
        formatErrorMessage('Failed to ensures Telegram page', error)
      );
    }
  }

  private async ensureTelegramHomePage(
    pageType: PageType = 'k'
  ): Promise<Page> {
    try {
      const page = await this.obtainFreshPage();
      const telegramHomePageUrl = `${BASE_TELEGRAM_URL}/${pageType}/`;
      if (page.url() !== telegramHomePageUrl) {
        await page.goto(telegramHomePageUrl);
        await page.waitForFunction(
          (expectedUrl) => window.location.href.includes(expectedUrl),
          {},
          'web.telegram.org'
        );
      }
      return page;
    } catch (error) {
      throw new Error(
        formatErrorMessage('Failed to ensures Telegram home page', error)
      );
    }
  }

  async closeInstance(): Promise<void> {
    try {
      if (this.browser) {
        await this.browser.close();
      }
    } catch (error) {
      throw new Error(formatErrorMessage('Failed to close browser', error));
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
      throw new Error(formatErrorMessage('Failed to relaunch browser', error));
    }
  }

  async navigateToTelegram(pageType: PageType = 'k'): Promise<void> {
    await this.ensureTelegramPage(pageType);
  }

  private async navigateToTelegramHomePage(
    pageType: PageType = 'k'
  ): Promise<Page> {
    try {
      const page = await this.obtainFreshPage();
      await page.goto(`${BASE_TELEGRAM_URL}/${pageType}/`);
      await page.waitForFunction(
        (expectedUrl) => window.location.href.includes(expectedUrl),
        {},
        'web.telegram.org'
      );
      return page;
    } catch (error) {
      throw new Error(
        formatErrorMessage("Failed to navigate to Telegram's homepage", error)
      );
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
            const openRequest = indexedDB.open(INDEXED_DB_CONFIG.DATABASE_NAME);

            abortTimeout.addEventListener('abort', () => {
              openRequest.onerror = null;
              openRequest.onsuccess = null;
              reject(new DOMException('Timeout reached', 'AbortError'));
            });

            openRequest.onerror = () =>
              reject(new Error('Database open failed'));
            openRequest.onsuccess = () => {
              const db = openRequest.result;
              const transaction = db.transaction(storeName, 'readonly');
              const store = transaction.objectStore(storeName);
              const query = store.get(key);

              query.onsuccess = () => resolve(query.result);
              query.onerror = () => reject(new Error('Data query failed'));
            };
          });
        },
        { storeName, key }
      );
    } catch (error) {
      throw new Error(formatErrorMessage('Failed to query IndexedDB', error));
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
        formatErrorMessage('Failed to check for user credentials', error)
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
      throw new Error(formatErrorMessage('Failed to retrieve user ID', error));
    }
  }

  async waitForUserLogin(
    timeoutMs: number = DEFAULT_LOGIN_TIMEOUT_MS
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
        formatErrorMessage('Failed to check for user login state', error)
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
      throw new Error(formatErrorMessage('Failed to fetch full name', error));
    }
  }

  async updateLocalStorage(key: string, value: string): Promise<void> {
    try {
      const page = await this.obtainFreshPage();
      await page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, value]);
    } catch (error) {
      throw new Error(formatErrorMessage('LocalStorage update failed', error));
    }
  }

  async getLocalStorageItem(key: string): Promise<string | null> {
    try {
      const page = await this.ensureTelegramPage();
      return await page.evaluate((key) => localStorage.getItem(key), key);
    } catch (error) {
      throw new Error(
        formatErrorMessage('Failed to retrieve item from localstorage', error)
      );
    }
  }

  private async getChannelInfo(channelName: string): Promise<ChannelInfo> {
    try {
      const page = await this.navigateToTelegramHomePage();

      // Dispatch FocusEvent to the input element to trigger the search helper list
      await page.waitForSelector(selectors.k.home.SEARCH_INPUT.selector);
      await page.evaluate((selectors) => {
        const focusEvent = new FocusEvent('focus');
        const inputElement: HTMLInputElement | null = document.querySelector(
          selectors.k.home.SEARCH_INPUT.selector
        );

        if (!inputElement) {
          throw new Error('Search input element not found.');
        }

        inputElement.dispatchEvent(focusEvent);
      }, selectors);

      // Begin to search the channel
      await page.type(selectors.k.home.SEARCH_INPUT.selector, channelName);

      const result: ChannelInfo = await page.evaluate(
        (selectors, channelName) => {
          const chatList: NodeListOf<HTMLSpanElement> =
            document.querySelectorAll(
              selectors.k.home.SEARCH_INPUT.SEARCH_HELPER_LIST.selector
            );

          if (chatList.length === 0) {
            return {
              channelExists: false,
              channelName: null,
              peerId: null,
            } as const;
          }

          for (const chat of chatList) {
            if (chat.innerHTML.trim() === channelName) {
              const peerId = chat.getAttribute('data-peer-id');
              if (!peerId) {
                throw new Error('Cannot retrieve peerId');
              }

              return {
                channelExists: true,
                channelName: chat.innerHTML.trim(),
                peerId,
              } as const;
            }
          }

          return {
            channelExists: false,
            channelName: null,
            peerId: null,
          } as const;
        },
        selectors,
        channelName
      );

      return result;
    } catch (error) {
      throw new Error(
        formatErrorMessage('Failed to check for the channel existence', error)
      );
    }
  }

  async createChannel(): Promise<boolean> {
    try {
      const userId = await this.retrieveUserId();
      const channelName = getChannelName(userId);
      const channelInfo = await this.getChannelInfo(channelName);

      if (channelInfo.channelExists) {
        throw new Error('Channel already exists.');
      }

      console.log(channelInfo);

      const page = await this.navigateToTelegramHomePage();
      disableAnimation(page);

      await page.waitForSelector(selectors.k.home.PEN_ICON_BUTTON.selector);
      await page.click(selectors.k.home.PEN_ICON_BUTTON.selector, {
        delay: DEFAULT_CLICK_DELAY_MS,
      });

      // await this.updateLocalStorage('channelUrl', channelUrl);
      return (await this.getChannelInfo(channelName)).channelExists;
    } catch (error) {
      throw new Error(formatErrorMessage('Failed to create channel', error));
    }
  }

  async navigateToChannel(): Promise<boolean> {
    try {
      const userId = await this.retrieveUserId();
      const channelName = getChannelName(userId);
      const channelInfo = await this.getChannelInfo(channelName);
      if (!channelInfo.channelExists) {
        throw new Error(`Channel "${channelName}" didn't exists`);
      }

      const page = await this.obtainFreshPage();
      const localChannelUrl = await this.getLocalStorageItem('channelUrl');
      if (localChannelUrl) {
        await page.goto(localChannelUrl);
        return true;
      }

      const channelUrl = generateTelegramChatUrl(channelInfo.peerId);
      await page.goto(channelUrl);
      return true;
    } catch (error) {
      throw new Error(
        formatErrorMessage('Failed to navigate to channel', error)
      );
    }
  }

  private async isChannelExists(peerId: string): Promise<boolean> {
    try {
      try {
        await this.queryIndexedDB('chats', peerId);
        return true;
      } catch (error) {
        if (error instanceof Error && error.message === 'Data query failed') {
          return false;
        }
        throw new Error('Error on querying data');
      }
    } catch (error) {
      throw new Error(formatErrorMessage('Failed to check for channel', error));
    }
  }
}

export default TelegramScraper;
