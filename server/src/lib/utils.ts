import { Page } from 'puppeteer';
import { LogOptions, PageType } from './types';
import { BASE_TELEGRAM_URL } from './const';
import type { EnvirontmentVariables } from './global.types';
import chalk, { ForegroundColorName } from 'chalk';

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

/**
 *
 * @param message - Message that is being logged
 */
export function log(message: string, options: LogOptions = {}): void {
  let { type = 'log', indentSize = 0, color, success, error } = options;
  const indent = indentSize >= 1 ? '└──' + '──'.repeat(indentSize) : '';
  const timestamp = new Date().toISOString();
  color = indentSize === 0 ? 'blue' : color || 'white';
  const prefix = chalk[color](
    `${indent}${timestamp} ── `
  );

  switch (type) {
    case 'warn': {
      console.warn(indent + chalk.yellow(message));
      break;
    }
    case 'error': {
      console.error(indent + message, '\n', error);
      break;
    }
    case 'info': {
      console.log(indent + message);
    }
    default: {
      const defaultColor =
        success !== undefined ? (success ? 'green' : 'red') : color || 'white';
      const coloredMessage = chalk[defaultColor](message);

      console.log(`${prefix}${coloredMessage}`);
      break;
    }
  }
}
