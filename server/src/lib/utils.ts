import { Page } from 'puppeteer';
import { PageType } from './types';
import { BASE_TELEGRAM_URL } from './const';
import type { EnvirontmentVariables } from './global.types';

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

export function formatFullName(firstName: string, lastName?: string): string {
  return `${firstName} ${lastName}`.trim();
}

export function formatChannelName(userId: string): string {
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

export function formatTelegramChatUrl(
  peerId: string,
  pageType: PageType = 'k'
) {
  return `${BASE_TELEGRAM_URL}/${pageType}/#${peerId}`;
}
export function getEnv(key: keyof EnvirontmentVariables): string {
  try {
    return Bun.env[key];
  } catch (error) {
    throw new Error(`Environment variable [${key}] was missing.`);
  }
}
