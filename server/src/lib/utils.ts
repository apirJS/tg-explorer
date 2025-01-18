import { LaunchOptions, Page } from 'puppeteer';
import path from 'path';
import fs from 'fs';
import Scraper from '../scraper';

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

export async function initializeScraper(options?: LaunchOptions) {
  return await Scraper.getInstance(options);
}
