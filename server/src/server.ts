import { Elysia } from 'elysia';
import Scraper from './scraper';
import { cors } from '@elysiajs/cors';
import path from 'path';

const app = new Elysia()
  .use(cors({ origin: 'http://localhost:5173' }))
  .ws('/ws', {
    async open() {
      const scraper = await Scraper.getInstance({
        headless: false,
        userDataDir: path.resolve(__dirname, '../session'),
      });
      const authed = await scraper.isUserAuthenticated();
      if (!authed) {
        await scraper.openTelegram();
      }
    },
  })
  .listen({ idleTimeout: 120, port: 3000 }, () => {
    console.log('Server listening on http://localhost:3000');
  });

process.on('SIGINT', async () => {
  const scraper = await Scraper.getInstance();
  await scraper.close();
  process.exit();
});
