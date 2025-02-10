import { Browser, LaunchOptions, Page } from 'puppeteer';
import {
  BASE_TELEGRAM_URL,
  DEFAULT_CLICK_DELAY_MS,
  DEFAULT_IDB_QUERY_TIMEOUT_MS,
  DEFAULT_LOGIN_TIMEOUT_MS,
  DEFAULT_TYPING_DELAY_MS,
  VALID_AUTH_STATE,
} from './lib/const';
import path from 'path';
import {
  formatChannelName,
  formatFullName,
  formatErrorMessage,
  formatTelegramChatUrl,
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
  private _browser!: Browser;
  private _activePage?: Page;

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

  private get browser() {
    return this._browser;
  }

  private set browser(browser: Browser) {
    this._browser = browser;
  }

  private get activePage() {
    if (!this._activePage) {
      throw new Error('No active page available');
    }
    return this._activePage;
  }

  private set activePage(activePage: Page) {
    this._activePage = activePage;
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
      this._browser = await puppeteer.launch({
        ...this.defaultBrowserSettings,
        ...options,
      });
      await this.getFreshPage();
    } catch (error) {
      throw new Error(
        formatErrorMessage('Browser initialization failed', error)
      );
    }
  }

  private async getFreshPage(): Promise<Page> {
    try {
      if (this._activePage && !this._activePage.isClosed()) {
        return this._activePage;
      }

      const [existingPage] = await this._browser.pages();
      this._activePage = existingPage || (await this._browser.newPage());
      return this._activePage;
    } catch (error) {
      throw new Error(formatErrorMessage('Failed to obtain fresh page', error));
    }
  }

  private async waitForPageLoad(page: Page): Promise<void> {
    try {
      await page.waitForFunction(
        () => document.querySelectorAll('ul.chatlist > a').length > 0,
        { timeout: 30_000 }
      );
    } catch (error) {
      throw new Error(
        formatErrorMessage('Failed to load Telegram page in time', error)
      );
    }
  }

  private async gotoTelegram(
    page: Page,
    pageType: PageType = 'k'
  ): Promise<void> {
    try {
      await page.goto(`${BASE_TELEGRAM_URL}/${pageType}/`, { timeout: 30_000 });
    } catch (error) {
      throw new Error(
        formatErrorMessage('Failed to navigate to Telegram page', error)
      );
    }
  }

  private async ensureTelegramPage(
    pageType: PageType = 'k',
    homePage: boolean = false,
    reload: boolean = false
  ): Promise<Page> {
    try {
      const page = await this.getFreshPage();
      const url = new URL(page.url());
      if (
        !url.href.includes('web.telegram.org') ||
        (homePage && url.href !== `${BASE_TELEGRAM_URL}/${pageType}/`) ||
        reload
      ) {
        await this.gotoTelegram(page, pageType);
      }
      await this.waitForPageLoad(page);
      await this.waitForDOMIdle(page);
      return page;
    } catch (error) {
      throw new Error(
        formatErrorMessage('Failed to ensures Telegram page', error)
      );
    }
  }

  public async closeInstance(): Promise<void> {
    try {
      await this._browser.close();
    } catch (error) {
      throw new Error(formatErrorMessage('Failed to close browser', error));
    }
  }

  private async relaunchBrowser(options: LaunchOptions): Promise<void> {
    try {
      if (this._browser) {
        await this._browser.close();
      }

      await this.initializeBrowser(options);
    } catch (error) {
      throw new Error(formatErrorMessage('Failed to relaunch browser', error));
    }
  }

  private async queryIndexedDB<T>(
    storeName: string,
    key: string,
    timeoutMs: number = DEFAULT_IDB_QUERY_TIMEOUT_MS
  ): Promise<T> {
    const page = await this.ensureTelegramPage();

    try {
      return await page.evaluate(
        async ({ storeName, key, timeoutMs, INDEXED_DB_CONFIG }) => {
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
        { storeName, key, timeoutMs, INDEXED_DB_CONFIG }
      );
    } catch (error) {
      throw new Error(formatErrorMessage('Failed to query IndexedDB', error));
    }
  }

  private async waitForNetworkIdle(
    page: Page,
    ms: number = 500
  ): Promise<void> {
    await page.waitForFunction(
      `window.performance.timing.loadEventEnd - window.performance.timing.navigationStart >= ${ms}`
    );
  }

  private async waitForDOMIdle(
    page: Page,
    ms: number = 500,
    timeoutMs: number = 5000
  ): Promise<void> {
    await page.waitForFunction(
      (ms, timeoutMs) => {
        return new Promise((resolve) => {
          let timeout: ReturnType<typeof setTimeout>;

          const observer = new MutationObserver(() => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
              observer.disconnect();
              resolve(true);
            }, ms);
          });

          // Resolve if max wait time exceeded even if mutations continue
          const maxTimeout = setTimeout(() => {
            observer.disconnect();
            resolve(true);
          }, timeoutMs);

          observer.observe(document.body, { childList: true, subtree: true });

          // In case there are no changes at all, set an initial timeout
          timeout = setTimeout(() => {
            observer.disconnect();
            clearTimeout(maxTimeout);
            resolve(true);
          }, ms);
        });
      },
      {},
      ms,
      timeoutMs
    );
  }

  public async checkAuthentication(): Promise<boolean> {
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

  private async retrieveUserId(): Promise<string> {
    try {
      const page = await this.ensureTelegramPage();
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

  public async waitForUserLogin(
    timeoutMs: number = DEFAULT_LOGIN_TIMEOUT_MS
  ): Promise<boolean> {
    try {
      await this.relaunchBrowser({ headless: false });
      await this.ensureTelegramPage();

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
              formatErrorMessage('Failed to check for user login state', error)
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
      throw new Error(formatErrorMessage('User failed to login', error));
    }
  }

  public async fetchUserFullName(): Promise<string> {
    try {
      await this.ensureTelegramPage();

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

  private async updateLocalStorage(key: string, value: string): Promise<void> {
    try {
      const page = await this.ensureTelegramPage();
      await page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, value]);
    } catch (error) {
      throw new Error(formatErrorMessage('LocalStorage update failed', error));
    }
  }

  private async getLocalStorageItem(key: string): Promise<string | null> {
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
      const page = await this.ensureTelegramPage(undefined, true);

      // Dispatch FocusEvent to the input element to trigger the search helper list
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

      // Begin to search for the channel
      await this.waitForDOMIdle(page);
      await page.type(selectors.k.home.SEARCH_INPUT.selector, channelName, {
        delay: DEFAULT_TYPING_DELAY_MS,
      });
      await page.waitForSelector(
        selectors.k.home.SEARCH_INPUT.SEARCH_HELPER_LIST.selector
      );

      // Begin Querying NodeList
      await this.waitForDOMIdle(page, 3000);
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

      await page.click(
        selectors.k.home.SEARCH_INPUT.BACK_TO_HOME_BUTTON.selector,
        { delay: DEFAULT_CLICK_DELAY_MS }
      );

      return result;
    } catch (error) {
      throw new Error(formatErrorMessage('Failed to get channel info', error));
    }
  }

  public async createChannel(): Promise<boolean> {
    try {
      const page = await this.ensureTelegramPage(undefined, true);
      const userId = await this.retrieveUserId();
      const channelName = formatChannelName(userId);
      const channelInfo = await this.getChannelInfo(channelName);

      if (channelInfo.channelExists) {
        throw new Error('Channel already exists.');
      }

      // wait for button transtition
      await page.evaluate((selector) => {
        document
          .querySelector(selector)
          ?.addEventListener('transitionend', (event) => {
            return;
          });
      }, selectors.k.home.PEN_ICON_BUTTON.selector);

      // click on pencil button element
      await this.waitForDOMIdle(page);
      await page.waitForSelector(selectors.k.home.PEN_ICON_BUTTON.selector);
      await page.click(selectors.k.home.PEN_ICON_BUTTON.selector, {
        delay: DEFAULT_CLICK_DELAY_MS,
      });

      // click on "New Channel" menu item
      await this.waitForDOMIdle(page);
      await page.waitForSelector(
        selectors.k.home.PEN_ICON_BUTTON.NEW_CHANNEL_BUTTON.selector
      );
      await page.click(
        selectors.k.home.PEN_ICON_BUTTON.NEW_CHANNEL_BUTTON.selector,
        {
          delay: DEFAULT_CLICK_DELAY_MS,
        }
      );
      // Telegram use div's innerHTML to store channel's name
      // Filling div innerHTML and removing "is-empty" class
      const channelUrl: string = await page.evaluate(
        (selectors, channelName) => {
          const div: HTMLDivElement | null = document.querySelector(
            selectors.k.home.PEN_ICON_BUTTON.NEW_CHANNEL_BUTTON
              .CHANNEL_NAME_INPUT.selector
          );
          if (div === null) {
            throw new Error('Div channel name input element is missing');
          }

          div.innerHTML = channelName;
          if (div.classList.contains('is-empty')) {
            div.classList.remove('is-empty');
          }

          // make arrow button (continue button) visible
          const button: HTMLButtonElement | null = document.querySelector(
            selectors.k.home.PEN_ICON_BUTTON.NEW_CHANNEL_BUTTON.ARROW_BUTTON
              .selector
          );
          if (button === null) {
            throw new Error(
              'Arrow button (continue button) element is missing'
            );
          }
          if (!button.classList.contains('is-visible')) {
            button.classList.add('is-visible');
          }

          return window.location.href;
        },
        selectors,
        channelName
      );

      // click the arrow button
      await this.waitForDOMIdle(page);
      await page.click(
        selectors.k.home.PEN_ICON_BUTTON.NEW_CHANNEL_BUTTON.ARROW_BUTTON
          .selector,
        { delay: DEFAULT_CLICK_DELAY_MS }
      );

      const creationSuccess = await this.isChannelExists(channelName);
      if (!creationSuccess) {
        return false;
      }

      await this.updateLocalStorage('channelUrl', channelUrl);
      return true;
    } catch (error) {
      throw new Error(formatErrorMessage('Failed to create channel', error));
    }
  }

  public async navigateToChannel(): Promise<void> {
    try {
      const page = await this.ensureTelegramPage();
      const userId = await this.retrieveUserId();
      const channelName = formatChannelName(userId);
      const channelInfo = await this.getChannelInfo(channelName);
      if (!channelInfo.channelExists) {
        throw new Error(`Channel "${channelName}" didn't exists`);
      }

      const cachedChannelUrl = await this.getLocalStorageItem('channelUrl');
      if (cachedChannelUrl) {
        await page.goto(cachedChannelUrl);
        return;
      }

      const channelUrl = formatTelegramChatUrl(channelInfo.peerId);
      await page.goto(channelUrl);
    } catch (error) {
      throw new Error(
        formatErrorMessage('Failed to navigate to channel', error)
      );
    }
  }

  private async isChannelExists(peerId: string): Promise<boolean> {
    try {
      await this.queryIndexedDB('dialogs', peerId);
      return true;
    } catch (error) {
      if (error instanceof Error && error.message === 'Data query failed') {
        return false;
      }
      throw new Error(formatErrorMessage('Failed to check for channel', error));
    }
  }
}

export default TelegramScraper;
