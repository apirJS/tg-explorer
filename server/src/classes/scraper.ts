import { Browser, LaunchOptions, Page } from 'puppeteer';
import {
  BASE_TELEGRAM_URL,
  DEFAULT_CLICK_DELAY_MS,
  DEFAULT_IDB_QUERY_TIMEOUT_MS,
  DEFAULT_LOGIN_TIMEOUT_MS,
  DEFAULT_TYPING_DELAY_MS,
  VALID_AUTH_STATE,
} from '../lib/const';
import path from 'path';
import {
  formatChannelName,
  formatFullName,
  formatErrorMessage,
  formatTelegramChatUrl,
} from '../lib/utils';
import { ChannelInfo, PageType } from '../lib/types';
import puppeteer from 'puppeteer-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import { INDEXED_DB_CONFIG } from '../lib/config';
import selectors from '../lib/selectors';

/**
 * TelegramScraper is a singleton class that manages the browser instance
 * and its interactions with Telegram's web interface.
 */
class TelegramScraper {
  private static instance: TelegramScraper;
  private _browser!: Browser;
  private _activePage?: Page;

  private constructor() {}

  /**
   *
   * @param message - Message that is being logged
   */
  private log(message: string): void {
    console.log(`[${new Date().toISOString()}] -- ${message}`);
  }

  /**
   *
   * @param message - Error message that is being logged
   * @param error - Error object
   */
  private errorLog(message: string, error: any): void {
    console.error(
      `[${new Date().toISOString()}] -- [ERROR] -- ${message}!`,
      error
    );
  }

  /**
   * Returns an instance of TelegramScraper.
   * @param options - Launch options for the browser.
   */
  public static async createInstance(
    options?: LaunchOptions
  ): Promise<TelegramScraper> {
    console.log(
      `[${new Date().toISOString()}] -- Creating scraper instance...`
    );
    if (!TelegramScraper.instance) {
      TelegramScraper.instance = new TelegramScraper();
      await TelegramScraper.instance.initializeBrowser(options);
    }
    console.log(`[${new Date().toISOString()}] -- Scraper instance created.`);
    return TelegramScraper.instance;
  }

  /** Getter for the browser instance. */
  private get browser(): Browser {
    return this._browser;
  }

  /** Setter for the browser instance. */
  private set browser(browser: Browser) {
    this._browser = browser;
  }

  /**
   * Getter for the active Page.
   * @throws Error if no active page available.
   */
  private get activePage(): Page {
    if (!this._activePage) {
      throw new Error('No active page available');
    }
    return this._activePage;
  }

  /** Setter for the active Page. */
  private set activePage(activePage: Page) {
    this._activePage = activePage;
  }

  /** Default browser settings. */
  private get defaultBrowserSettings(): LaunchOptions {
    return {
      defaultViewport: { width: 1280, height: 720 },
      headless: false,
      userDataDir: path.resolve(__dirname, '../session'),
      args: ['--start-maximized'],
    };
  }

  /**
   * Initializes the browser instance.
   * @param options - Launch options to override default settings.
   */
  private async initializeBrowser(options?: LaunchOptions): Promise<void> {
    try {
      this.log('Initializing browser...');
      puppeteer.use(stealthPlugin());
      this._browser = await puppeteer.launch({
        ...this.defaultBrowserSettings,
        ...options,
      });
      // Retrieve first page to initialize activePage.
      await this.getFreshPage();
      this.log('Browser initialization success.');
    } catch (error) {
      this.errorLog('Failed to open a browser instance', error);
      throw new Error(
        formatErrorMessage('Browser initialization failed', error)
      );
    }
  }

  /**
   * Returns a fresh page. If an active page exists and is open, return it.
   */
  private async getFreshPage(): Promise<Page> {
    try {
      this.log('Getting fresh page...');
      if (this._activePage && !this._activePage.isClosed()) {
        this.log('Fresh page obtained.');
        return this._activePage;
      }
      const pages = await this._browser.pages();
      this._activePage = pages[0] || (await this._browser.newPage());
      this.log('Fresh page obtained.');
      return this._activePage;
    } catch (error) {
      this.errorLog('Failed to retrieve fresh page', error);
      throw new Error(formatErrorMessage('Failed to obtain fresh page', error));
    }
  }

  /**
   * Waits for the chat-list to loads at least one chat.
   * @param page - The Page to wait on.
   */
  private async waitForChatsLoad(page: Page): Promise<void> {
    try {
      this.log('Waiting for chat list element...');
      await page.waitForFunction(
        () => document.querySelectorAll('ul.chatlist > a').length > 0,
        { timeout: 30000 }
      );
      this.log('Waiting success.');
    } catch (error) {
      this.errorLog('Failed to wait for chat list element', error);
      throw new Error(
        formatErrorMessage('Failed to load Telegram page in time', error)
      );
    }
  }

  /**
   * Navigates to the Telegram page.
   * @param page - The page instance.
   * @param pageType - Page type identifier.
   */
  private async gotoTelegram(
    page: Page,
    pageType: PageType = 'k'
  ): Promise<void> {
    try {
      this.log('Opening telegram...');
      await page.goto(`${BASE_TELEGRAM_URL}/${pageType}/`, { timeout: 30000 });
      this.log('Telegram opened.');
    } catch (error) {
      this.errorLog('Failed to visit telegram', error);
      throw new Error(
        formatErrorMessage('Failed to navigate to Telegram page', error)
      );
    }
  }

  /**
   * Ensures the browser is on a valid Telegram page.
   * @param pageType - Type of Telegram page.
   * @param homePage - Whether it needs to be the home page.
   * @param reload - Flag to force reload.
   */
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
      await this.waitForChatsLoad(page);
      await this.waitForDOMIdle(page);
      return page;
    } catch (error) {
      throw new Error(
        formatErrorMessage('Failed to ensure Telegram page', error)
      );
    }
  }

  /**
   * Closes the browser instance.
   */
  public async closeInstance(): Promise<void> {
    try {
      this.log('Closing scraper instance...');
      await this._browser.close();
      this.log('Scraper instance closed.');
    } catch (error) {
      this.errorLog('Failed to close the instance', error);
      throw new Error(formatErrorMessage('Failed to close browser', error));
    }
  }

  /**
   * Relaunches the browser with the given options.
   * @param options - Browser launch options.
   */
  private async relaunchBrowser(options: LaunchOptions): Promise<void> {
    try {
      this.log('Relaunching browser...');
      if (this._browser) {
        await this._browser.close();
      }
      await this.initializeBrowser(options);
      this.log('Browser relaunced');
    } catch (error) {
      this.errorLog('Failed to relaunch browser', error);
      throw new Error(formatErrorMessage('Failed to relaunch browser', error));
    }
  }

  /**
   * Queries IndexedDB and returns the value for the given key.
   * @param storeName - IndexedDB store name.
   * @param key - Query key.
   * @param timeoutMs - Query timeout in milliseconds.
   */
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

  /**
   * Wait for the page's network activities to be idle.
   * @param page - The page instance.
   * @param ms - Minimum wait time (ms) after navigation start.
   */
  private async waitForNetworkIdle(
    page: Page,
    ms: number = 500
  ): Promise<void> {
    this.log('Waiting for network idle...');
    await page.waitForFunction(
      `window.performance.timing.loadEventEnd - window.performance.timing.navigationStart >= ${ms}`
    );
    this.log('Waiting success');
  }

  /**
   * Wait for the DOM to be idle.
   * This function resolves even if there are continuous mutations by using
   * both an initial timeout and a maximum wait time.
   *
   * @param page - The page instance.
   * @param ms - Delay (ms) after the last mutation before resolving.
   * @param timeoutMs - Maximum wait time (ms) regardless of new mutations.
   */
  private async waitForDOMIdle(
    page: Page,
    ms: number = 500,
    timeoutMs: number = 5000
  ): Promise<void> {
    this.log('Waiting for DOM idle...');
    await page.waitForFunction(
      (ms: number, timeoutMs: number) => {
        return new Promise((resolve) => {
          let timeout: ReturnType<typeof setTimeout>;
          const maxTimeout: ReturnType<typeof setTimeout> = setTimeout(() => {
            observer.disconnect();
            resolve(true);
          }, timeoutMs);

          const observer = new MutationObserver(() => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
              observer.disconnect();
              resolve(true);
            }, ms);
          });

          observer.observe(document.body, { childList: true, subtree: true });

          // In case there are no changes at all, resolve after ms.
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
    this.log('DOM is idle.');
  }

  /**
   * Checks if the user is authenticated.
   */
  public async checkAuthentication(): Promise<boolean> {
    try {
      this.log("Checking for user's authentication...");
      await this.ensureTelegramPage();
      const authState = await this.queryIndexedDB<{ _: string }>(
        'session',
        'authState'
      );
      this.log('Credentials verified.');
      return authState?._ === VALID_AUTH_STATE;
    } catch (error) {
      this.errorLog('Failed to check for credentials', error);
      throw new Error(
        formatErrorMessage('Failed to check for user credentials', error)
      );
    }
  }

  /**
   * Retrieves the user ID from local storage.
   */
  private async retrieveUserId(): Promise<string> {
    try {
      this.log('Retrieving userid...');
      const page = await this.ensureTelegramPage();
      const userAuthData = await page.evaluate(() =>
        JSON.parse(localStorage.getItem('user_auth') || 'null')
      );
      if (!userAuthData?.id) {
        throw new Error('User ID not found in localStorage');
      }
      this.log('Userid retreived');
      return userAuthData.id;
    } catch (error) {
      this.errorLog('Failed to retrieve userid', error);
      throw new Error(formatErrorMessage('Failed to retrieve user ID', error));
    }
  }

  /**
   * Wait for the user to log in.
   * @param timeoutMs - Maximum wait time for login.
   */
  public async waitForUserLogin(
    timeoutMs: number = DEFAULT_LOGIN_TIMEOUT_MS
  ): Promise<boolean> {
    try {
      this.log('Waiting for user to login...');
      await this.relaunchBrowser({ headless: false });
      await this.ensureTelegramPage();
      return await new Promise((resolve, reject) => {
        const startTime = Date.now();
        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        const checkLoop = async () => {
          try {
            const userId = await this.retrieveUserId();
            if (userId) {
              this.log('Login success.');
              resolve(true);
              return;
            }
            if (Date.now() - startTime > timeoutMs) {
              const err = new Error('Login failed. Timeout reached.');
              this.errorLog('Login failed. Timeout reached.', err);
              reject(err);
              return;
            }
            timeoutId = setTimeout(checkLoop, 1000);
          } catch (error) {
            this.errorLog('Login failed', error);
            reject(
              new Error(`User login check failed: ${(error as Error).message}`)
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
      this.errorLog('Login failed. Timeout reached.', error);
      throw new Error(formatErrorMessage('User failed to login', error));
    }
  }

  /**
   * Fetch the full name of the user.
   */
  public async fetchUserFullName(): Promise<string> {
    try {
      this.log("Fetching user's fullname...");
      await this.ensureTelegramPage();
      const userId = await this.retrieveUserId();
      const userData = await this.queryIndexedDB<{
        first_name: string;
        last_name?: string;
      }>('users', userId);
      this.log('Username fetched.');
      return formatFullName(userData.first_name, userData.last_name);
    } catch (error) {
      this.errorLog("Failed to fetch user's fullname", error);
      throw new Error(formatErrorMessage('Failed to fetch full name', error));
    }
  }

  /**
   * Update local storage with the provided key and value.
   * @param key - The storage key.
   * @param value - The value to store.
   */
  private async updateLocalStorage(key: string, value: string): Promise<void> {
    try {
      this.log('Updating local storage...');
      const page = await this.ensureTelegramPage();
      await page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, value]);
      this.log('Localstorage updated.');
    } catch (error) {
      this.log('Failed to update localstorage');
      throw new Error(formatErrorMessage('LocalStorage update failed', error));
    }
  }

  /**
   * Retrieve an item from local storage.
   * @param key - The storage key.
   */
  private async getLocalStorageItem(key: string): Promise<string | null> {
    try {
      const page = await this.ensureTelegramPage();
      return await page.evaluate(
        (storageKey) => localStorage.getItem(storageKey),
        key
      );
    } catch (error) {
      throw new Error(
        formatErrorMessage('Failed to retrieve item from localStorage', error)
      );
    }
  }

  /**
   * Retrieves channel information by channel name.
   * @param channelName - The name of the channel to search.
   * @param back - Whether to click the back button after search.
   */
  private async getChannelInfo(
    channelName: string,
    back: boolean = true
  ): Promise<ChannelInfo> {
    try {
      this.log('Getting channel info...');
      const page = await this.ensureTelegramPage(undefined, true);

      // Focus the search input element to trigger helper list.
      await page.evaluate((selectors) => {
        const focusEvent = new FocusEvent('focus');
        const inputElement = document.querySelector(
          selectors.k.home.SEARCH_INPUT.selector
        ) as HTMLInputElement | null;
        if (!inputElement) {
          throw new Error('Search input element not found.');
        }
        inputElement.dispatchEvent(focusEvent);
      }, selectors);

      // Begin channel search.
      await this.waitForDOMIdle(page);
      await page.type(selectors.k.home.SEARCH_INPUT.selector, channelName, {
        delay: DEFAULT_TYPING_DELAY_MS,
      });
      await this.waitForDOMIdle(page, 3000);

      // Query NodeList for channel match.
      const result: ChannelInfo = await page.evaluate(
        (selectors, channelName) => {
          const chatList = document.querySelectorAll<HTMLSpanElement>(
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
                selector: `[data-peer-id="${peerId}"]`,
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

      if (back) {
        await page.click(
          selectors.k.home.SEARCH_INPUT.BACK_TO_HOME_BUTTON.selector,
          {
            delay: DEFAULT_CLICK_DELAY_MS,
          }
        );
      }

      this.log('Channel info fetched successfully.');
      return result;
    } catch (error) {
      this.errorLog('Failed to fetch channel info', error);
      throw new Error(formatErrorMessage('Failed to get channel info', error));
    }
  }

  /**
   * Creates a new channel.
   */
  public async createChannel(): Promise<boolean> {
    try {
      this.log('Creating telegram channel...');
      const page = await this.ensureTelegramPage(undefined, true);
      const userId = await this.retrieveUserId();
      const channelName = formatChannelName(userId);
      const channelInfo = await this.getChannelInfo(channelName, true);

      if (channelInfo.channelExists) {
        this.log('Failed, channel already exists!');
        return false;
      }

      // Wait for button transition.
      await page.evaluate((selector: string) => {
        document
          .querySelector(selector)
          ?.addEventListener('transitionend', () => {
            return;
          });
      }, selectors.k.home.PEN_ICON_BUTTON.selector);

      // Click pencil button.
      await this.waitForDOMIdle(page);
      await page.waitForSelector(selectors.k.home.PEN_ICON_BUTTON.selector);
      await page.click(selectors.k.home.PEN_ICON_BUTTON.selector, {
        delay: DEFAULT_CLICK_DELAY_MS,
      });

      // Click on "New Channel" menu item.
      await this.waitForDOMIdle(page);
      await page.waitForSelector(
        selectors.k.home.PEN_ICON_BUTTON.NEW_CHANNEL_BUTTON.selector
      );
      await page.click(
        selectors.k.home.PEN_ICON_BUTTON.NEW_CHANNEL_BUTTON.selector,
        { delay: DEFAULT_CLICK_DELAY_MS }
      );

      // Set channel name and allow navigation.
      const channelUrl: string = await page.evaluate(
        (selectors, channelName) => {
          const div = document.querySelector<HTMLDivElement>(
            selectors.k.home.PEN_ICON_BUTTON.NEW_CHANNEL_BUTTON
              .CHANNEL_NAME_INPUT.selector
          );
          if (!div) {
            throw new Error('Channel name input element missing');
          }
          div.innerHTML = channelName;
          div.classList.remove('is-empty');

          const button = document.querySelector<HTMLButtonElement>(
            selectors.k.home.PEN_ICON_BUTTON.NEW_CHANNEL_BUTTON.ARROW_BUTTON
              .selector
          );
          if (!button) {
            throw new Error('Arrow button (continue button) is missing');
          }
          button.classList.add('is-visible');
          return window.location.href;
        },
        selectors,
        channelName
      );

      // Click arrow button to continue.
      await this.waitForDOMIdle(page);
      await page.click(
        selectors.k.home.PEN_ICON_BUTTON.NEW_CHANNEL_BUTTON.ARROW_BUTTON
          .selector,
        {
          delay: DEFAULT_CLICK_DELAY_MS,
        }
      );

      const creationSuccess = await this.isChannelExists(channelName);
      if (!creationSuccess) {
        this.log('Failed to create channel');
        return false;
      }
      await this.updateLocalStorage('channelUrl', channelUrl);
      this.log('Telegram channel created successfully.');
      return true;
    } catch (error) {
      this.errorLog('Failed to create telegram channel', error);
      throw new Error(formatErrorMessage('Failed to create channel', error));
    }
  }

  /**
   * Navigates to the existing channel.
   */
  public async navigateToChannel(): Promise<void> {
    try {
      const page = await this.ensureTelegramPage();
      const userId = await this.retrieveUserId();
      const channelName = formatChannelName(userId);
      this.log(`Navigating to telegram channel [${channelName}]...`);
      const channelInfo = await this.getChannelInfo(channelName, false);
      if (!channelInfo.channelExists) {
        throw new Error(`Channel "${channelName}" doesn't exist`);
      }

      await page.evaluate((selector: string) => {
        document
          .querySelector(selector)
          ?.dispatchEvent(new MouseEvent('mousedown'));
      }, channelInfo.selector);
      this.log('Navigation success.');
    } catch (error) {
      this.errorLog('Failed to navigate to telegram channel', error);
      throw new Error(
        formatErrorMessage('Failed to navigate to channel', error)
      );
    }
  }

  /**
   * Checks if a channel exists in IndexedDB.
   * @param peerId - The peer ID of the channel. Starts with "-" for example: -213871827.
   */
  private async isChannelExists(peerId: string): Promise<boolean> {
    try {
      this.log('Checking for channel existsance...');
      await this.queryIndexedDB('dialogs', peerId);
      this.log('Channel exists.');
      return true;
    } catch (error) {
      this.errorLog('Failed to check for for channel existsance', error);
      if (error instanceof Error && error.message === 'Data query failed') {
        return false;
      }
      throw new Error(formatErrorMessage('Failed to check for channel', error));
    }
  }

  /**
   * Scroll until the "Channel Created" message is detected
   * @param {number} timeoutMs - The timeout in milliseconds
   * @param {number} intervalMs - interval between scroll in ms
   */
  private async scrollMessagePanel(
    timeoutMs: number = 1000 * 60 * 5,
    intervalMs: number = 100
  ): Promise<void> {
    try {
      this.log('Scrolling message panel to top...');
      const page = await this.ensureTelegramPage(undefined, true);
      await page.evaluate(
        (selectors, timeoutMs, intervalMs) => {
          return new Promise<void>((resolve, reject) => {
            const scrollable = document.querySelector<HTMLDivElement>(
              selectors.k.channel.SCROLLABLE.selector
            );
            if (!scrollable) {
              return reject(new Error('Scrollable element not found'));
            }

            const timeoutId = setTimeout(() => {
              clearInterval(intervalId);
              reject(new Error('Timeout reached'));
            }, timeoutMs);

            const intervalId = setInterval(() => {
              // Trigger scrolling to load older messages.
              scrollable.scrollTo(0, -document.body.scrollHeight);
              scrollable.scrollTo(0, 200);
              scrollable.scrollTo(0, 100);
              scrollable.scrollTo(0, 200);

              // Check if "Channel Created" message appears.
              const elem = document.querySelector(
                selectors.k.channel.FIRST_CHAT_BUBBLE_GROUP.selector
              );
              if (elem !== null) {
                clearTimeout(timeoutId);
                clearInterval(intervalId);
                resolve();
              }
            }, intervalMs);
          });
        },
        selectors,
        timeoutMs,
        intervalMs
      );
      this.log('Top of the message panel reached.');
    } catch (error) {
      this.errorLog('Failed to scroll to top of the message panel', error);
      throw new Error(
        formatErrorMessage('Failed to scroll message panel', error)
      );
    }
  }

  /*
   *
   *
   * DUMMIES FUNCTIONS FOR TESTING PURPOSE HERE
   *
   *
   */

  async upload() {
    const page = await this.ensureTelegramPage('k', true, undefined);
    await this.navigateToChannel();
  }
}

export default TelegramScraper;
