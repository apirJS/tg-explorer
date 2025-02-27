import { Page } from 'puppeteer';
import { LogOptions, PageType } from './types';
import { BASE_TELEGRAM_URL } from './const';
import type { EnvirontmentVariables } from './global.types';
import chalk from 'chalk';
import { readFile } from 'node:fs/promises';

/**
 * Disables animations on the provided Puppeteer page.
 * @param {Page} page - Puppeteer Page instance
 */
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

/**
 * Returns the full name, combining first name and optional last name.
 * @param {string} firstName - First name
 * @param {string} [lastName] - Last name
 * @returns {string} The combined full name
 */
export function formatFullName(firstName: string, lastName?: string): string {
  return `${firstName} ${lastName}`.trim();
}

/**
 * Returns the channel name based on user ID.
 * @param {string} userId - The user's ID
 * @returns {string} The formatted channel name
 */
export function formatChannelName(userId: string): string {
  return `tg-explorer-${userId}`;
}

/**
 * Formats an error message by combining a title, an error object, and an optional message.
 * @param {string} title - Error title
 * @param {unknown} error - Error object or unknown
 * @param {string} [message] - Optional message
 * @returns {string} Formatted error message
 */
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

/**
 * Returns a Telegram chat URL.
 * @param {string} peerId - Peer ID
 * @param {PageType} [pageType='k'] - Optional page type
 * @returns {string} Telegram chat URL
 */
export function formatTelegramChatUrl(
  peerId: string,
  pageType: PageType = 'k'
) {
  return `${BASE_TELEGRAM_URL}/${pageType}/#${peerId}`;
}

/**
 * Retrieves an environment variable by key.
 * @param {keyof EnvirontmentVariables} key - Environment variable key
 * @returns {string} The environment variable value
 */
export function getEnv(key: keyof EnvirontmentVariables): string {
  try {
    return Bun.env[key];
  } catch (error) {
    throw new Error(`Environment variable [${key}] was missing.`);
  }
}

/**
 * Logs a message with optional type, indentation, and color settings.
 * @param {string} message - Message text
 * @param {LogOptions} [options={}] - Logging options
 * @returns {void}
 */
export function log(message: string, options: LogOptions = {}): void {
  let { type = 'log', indentSize = 0, color, success, error } = options;
  const indent = indentSize >= 1 ? '└──' + '──'.repeat(indentSize) : '';
  const timestamp = new Date().toISOString();
  color = indentSize === 0 ? 'blue' : color || 'white';
  const prefix = chalk[color](`${indent}${timestamp} ── `);

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
