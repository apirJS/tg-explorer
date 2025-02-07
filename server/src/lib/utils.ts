import { LaunchOptions, Page } from 'puppeteer';
import path from 'path';
import fs from 'fs';
import Scraper from '../scraper';
import { IDBOperationResult, IDBOperationSuccess, PageType } from './types';
import { BASE_TELEGRAM_URL } from './const';

export function disableAnimation(page: Page) {
  page.on('load', () => {
    const content = `
    *,
    *::after,
    *::before {
        transition-delay: 0s !important;
        transition-duration: 0s !important;
        animation-delay: -0.0001s !important;
        animation-duration: 0s !important;
        animation-play-state: paused !important;
        caret-color: transparent !important;
    }`;

    page.addStyleTag({ content });
  });
}

export function isSessionFolderExists(): boolean {
  const folder = path.resolve(__dirname, '../../session');
  return fs.existsSync(folder);
}

export function isIDBOperationSuccess<T = any>(
  result: IDBOperationResult<T>
): result is IDBOperationSuccess<T> {
  return (result as IDBOperationSuccess<T>).data !== undefined;
}

export function formatFullName(firstName: string, lastName?: string): string {
  return `${firstName} ${lastName}`.trim();
}

export function getChannelName(userId: string): string {
  return `tg-explorer-${userId}`;
}

export function formatErrorMessage(
  title: string,
  error: unknown,
  message?: string
): string {
  const errorMessage =
    message ||
    (error instanceof Error ||
    (typeof error === 'object' && error !== null && 'message' in error)
      ? (error as Error).message
      : 'Unknown Error.');
  return `${title}: ${errorMessage}`;
}

export function generateTelegramChatUrl(
  peerId: string,
  pageType: PageType = 'k'
) {
  return `${BASE_TELEGRAM_URL}/${pageType}/#${peerId}`;
}
