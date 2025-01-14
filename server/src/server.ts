import { Elysia } from 'elysia';
import Scraper from './scraper';
import { cors } from '@elysiajs/cors';
import { WSMessage } from './lib/types';

const app = new Elysia()
  .use(cors({ origin: 'http://localhost:5173' }))
  .ws('/ws', {
    async open() {
      const scraper = await Scraper.getInstance({ headless: false });
      await scraper.openTelegram();
      await scraper.loadCredentials();
    },
    message(ws, message) {},
  })
  .listen({ idleTimeout: 120, port: 3000 }, () => {
    console.log('Server listening on http://localhost:3000');
  });

process.on('SIGINT', async () => {
  const scraper = await Scraper.getInstance();
  await scraper.close();
  process.exit();
});
