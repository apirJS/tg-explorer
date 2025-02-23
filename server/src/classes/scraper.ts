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
  log,
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
   * Returns an instance of TelegramScraper.
   * @param options - Launch options for the browser.
   */
  public static async createInstance(
    options?: LaunchOptions
  ): Promise<TelegramScraper> {
    try {
      log(`Creating scraper instance...`);

      if (!TelegramScraper.instance) {
        TelegramScraper.instance = new TelegramScraper();
        await TelegramScraper.instance.initializeBrowser(options);
      }

      log(`Scraper instance created.`, { success: true });

      return TelegramScraper.instance;
    } catch (error) {
      log(`Failed to create scraper instance`, { type: 'error', error });

      throw new Error(
        formatErrorMessage('Failed to create scraper instance!', error)
      );
    }
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
      log('Initializing browser...');
      puppeteer.use(stealthPlugin());
      this._browser = await puppeteer.launch({
        ...this.defaultBrowserSettings,
        ...options,
      });
      // Retrieve first page to initialize activePage.
      await this.getFreshPage();
      log('Browser initialization success.', { success: true });
    } catch (error) {
      log('Failed to open a browser instance', { type: 'error', error });
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
      log('Getting fresh page...', { indentSize: 1 });

      if (this._activePage && !this._activePage.isClosed()) {
        log('Fresh page obtained.', { indentSize: 1, success: true });
        return this._activePage;
      }

      const pages = await this._browser.pages();
      this._activePage = pages[0] || (await this._browser.newPage());

      log('Fresh page obtained.', { indentSize: 1, success: true });

      return this._activePage;
    } catch (error) {
      log('Failed to retrieve fresh page', { type: 'error', error });
      throw new Error(formatErrorMessage('Failed to obtain fresh page', error));
    }
  }

  /**
   * Waits for the chat-list to loads at least one chat.
   * @param page - The Page to wait on.
   */
  private async waitForChatsLoad(page: Page): Promise<void> {
    try {
      log('Waiting for chat list element...', { indentSize: 1 });

      await page.waitForFunction(
        () => document.querySelectorAll('ul.chatlist > a').length > 0,
        { timeout: 30000 }
      );

      log('Waiting success.', { success: true, indentSize: 1 });
    } catch (error) {
      log('Failed to wait for chat list element', { type: 'error', error });
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
      log('Opening telegram...');

      await page.goto(`${BASE_TELEGRAM_URL}/${pageType}/`, { timeout: 30000 });

      log('Telegram opened.', { success: true });
    } catch (error) {
      log('Failed to visit telegram', { type: 'error', error });
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
      log('Ensuring Telegram page...', { indentSize: 1 });

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

      log('Already in a Telegram page', { success: true, indentSize: 1 });

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
      log('Closing scraper instance...');

      await this._browser.close();

      log('Scraper instance closed.', { success: true });
    } catch (error) {
      log('Failed to close the instance', { type: 'error', error });
      throw new Error(formatErrorMessage('Failed to close browser', error));
    }
  }

  /**
   * Relaunches the browser with the given options.
   * @param options - Browser launch options.
   */
  private async relaunchBrowser(options: LaunchOptions): Promise<void> {
    try {
      log('Relaunching browser...');

      if (this._browser) {
        await this._browser.close();
      }
      await this.initializeBrowser(options);

      log('Browser relaunced', { success: true });
    } catch (error) {
      log('Failed to relaunch browser', { type: 'error', error });

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
      log(`Querying [${storeName}.${key}] on IDB...`);

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
              query.onsuccess = () => {
                log(`Query for [${storeName}.${key}] success.`, {
                  success: true,
                });

                resolve(query.result);
              };
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
    log('Waiting for network idle...', { indentSize: 1 });

    await page.waitForFunction(
      `window.performance.timing.loadEventEnd - window.performance.timing.navigationStart >= ${ms}`
    );

    log('Network is idle', { success: true, indentSize: 1 });
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
    log('Waiting for DOM idle...', { indentSize: 1 });

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

    log('DOM is idle.', { success: true, indentSize: 1 });
  }

  /**
   * Checks if the user is authenticated.
   */
  public async checkAuthentication(): Promise<boolean> {
    try {
      log("Checking for user's authentication...");

      await this.ensureTelegramPage();
      const authState = await this.queryIndexedDB<{ _: string }>(
        'session',
        'authState'
      );

      log('Credentials is valid.', { success: true });
      return authState?._ === VALID_AUTH_STATE;
    } catch (error) {
      log('Failed to check for credentials', { type: 'error', error });
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
      log('Retrieving userid...', { indentSize: 1 });

      const page = await this.ensureTelegramPage();
      const userAuthData = await page.evaluate(() =>
        JSON.parse(localStorage.getItem('user_auth') || 'null')
      );
      if (!userAuthData?.id) {
        throw new Error('User ID not found in localStorage');
      }

      log('Userid retreived', { success: true, indentSize: 1 });

      return userAuthData.id;
    } catch (error) {
      log('Failed to retrieve userid', { type: 'error', error });
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
      log('Waiting for user to login...');

      await this.relaunchBrowser({ headless: false });
      await this.ensureTelegramPage();
      return await new Promise((resolve, reject) => {
        const startTime = Date.now();
        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        const checkLoop = async () => {
          try {
            const userId = await this.retrieveUserId();
            if (userId) {
              log('Login success.', { success: true });

              resolve(true);
              return;
            }
            if (Date.now() - startTime > timeoutMs) {
              reject(new Error('Login failed. Timeout reached.'));
              return;
            }
            timeoutId = setTimeout(checkLoop, 1000);
          } catch (error) {
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
      log('Login failed. Timeout reached.', { type: 'error', error });

      throw new Error(formatErrorMessage('User failed to login', error));
    }
  }

  /**
   * Fetch the full name of the user.
   */
  public async fetchUserFullName(): Promise<string> {
    try {
      log("Fetching user's fullname...", { indentSize: 1 });

      await this.ensureTelegramPage();
      const userId = await this.retrieveUserId();
      const userData = await this.queryIndexedDB<{
        first_name: string;
        last_name?: string;
      }>('users', userId);

      log('Username fetched.', { success: true, indentSize: 1 });
      return formatFullName(userData.first_name, userData.last_name);
    } catch (error) {
      log("Failed to fetch user's fullname", { type: 'error', error });
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
      log('Updating local storage...', { indentSize: 1 });

      const page = await this.ensureTelegramPage();
      await page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, value]);

      log('Localstorage updated.', { success: true, indentSize: 1 });
    } catch (error) {
      log('Failed to update localstorage', { type: 'error', error });
      throw new Error(formatErrorMessage('LocalStorage update failed', error));
    }
  }

  /**
   * Retrieve an item from local storage.
   * @param key - The storage key.
   */
  private async getLocalStorageItem(key: string): Promise<string | null> {
    try {
      log('Getting local storage item...', { indentSize: 1 });

      const page = await this.ensureTelegramPage();
      const result = await page.evaluate(
        (storageKey) => localStorage.getItem(storageKey),
        key
      );

      log(`Local storage item [${key}] retrieved.`, {
        success: true,
        indentSize: 1,
      });

      return result;
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
      log('Getting channel info...', { indentSize: 1 });

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

      log('Channel info fetched successfully.', {
        success: true,
        indentSize: 1,
      });

      return result;
    } catch (error) {
      log('Failed to fetch channel info', { type: 'error', error });
      throw new Error(formatErrorMessage('Failed to get channel info', error));
    }
  }

  /**
   * Creates a new channel.
   */
  public async createChannel(): Promise<boolean> {
    try {
      log('Creating telegram channel...');

      const page = await this.ensureTelegramPage(undefined, true);
      const userId = await this.retrieveUserId();
      const channelName = formatChannelName(userId);
      const channelInfo = await this.getChannelInfo(channelName, true);

      if (channelInfo.channelExists) {
        log('Failed, channel already exists!', {
          success: false,
        });

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
        log('Failed to create channel', { type: 'warn' });
        return false;
      }
      await this.updateLocalStorage('channelUrl', channelUrl);
      log('Telegram channel created successfully.', { success: true });
      return true;
    } catch (error) {
      log('Failed to create telegram channel', { type: 'error', error });
      throw new Error(formatErrorMessage('Failed to create channel', error));
    }
  }

  /**
   * Navigates to the existing channel.
   */
  public async navigateToChannel(): Promise<void> {
    try {
      log(`Navigating to telegram channel...`);

      const page = await this.ensureTelegramPage();
      const userId = await this.retrieveUserId();
      const channelName = formatChannelName(userId);
      const channelInfo = await this.getChannelInfo(channelName, false);
      if (!channelInfo.channelExists) {
        throw new Error(`Channel "${channelName}" doesn't exist`);
      }

      await page.evaluate((selector: string) => {
        document
          .querySelector(selector)
          ?.dispatchEvent(new MouseEvent('mousedown'));
      }, channelInfo.selector);

      log('Navigation success.', { success: true });
    } catch (error) {
      log('Failed to navigate to telegram channel', { type: 'error', error });
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
      log('Checking for channel existsance...', { indentSize: 1 });

      await this.queryIndexedDB('dialogs', peerId);

      log('Channel exists.', { indentSize: 1, success: true });
      return true;
    } catch (error) {
      log('Failed to check for for channel existsance', {
        type: 'error',
        error,
      });
      if (error instanceof Error && error.message === 'Data query failed') {
        log('Channel was not exists.', { indentSize: 1, success: false });
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
      log('Scrolling message panel to top...');

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

      log('Top of the message panel reached.', { success: true });
    } catch (error) {
      log('Failed to scroll to top of the message panel', {
        type: 'error',
        error,
      });
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
