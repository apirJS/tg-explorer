import puppeteer from 'puppeteer';
import { disableAnimation } from '../lib';

export default async function loginHandler(req: Request): Response {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--enable-gpu'],
  });

  const page = await browser.newPage();
  disableAnimation(page);

  await page.goto('https://web.telegram.org/a/');
  
}
