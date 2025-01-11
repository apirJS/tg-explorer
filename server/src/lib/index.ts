import { Page } from 'puppeteer';
import path from 'path';

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

export async function getLocalStorage() {
  const filePath = path.resolve(__dirname, '../../creds/localStorage.json');
  const file = Bun.file(filePath);
  const ls = await file.json() ?? null;
  return ls as Record<string, string> | null;
}
