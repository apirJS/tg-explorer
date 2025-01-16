import { Elysia } from 'elysia';
import Scraper from './scraper';
import { cors } from '@elysiajs/cors';
import path from 'path';

const app = new Elysia()
  .use(cors({ origin: 'http://localhost:5173' }))
  .state(
    'scraper',
    await Scraper.getInstance({
      userDataDir: path.resolve(__dirname, '../session'),
      headless: false,
    })
  )
  .state('authed', false)
  .onBeforeHandle(async ({ store }) => {
    store.authed = await store.scraper.isUserAuthenticated();
  })
  .get(
    '/login',
    async ({ store: { scraper, authed }, set }) => {
      if (authed) {
        await scraper.openTelegram();
        set.status = 'OK';
        return {
          data: {
            username: 'John',
          },
        };
      }
    },
    {}
  )
  .listen({ idleTimeout: 120, port: 3000 }, () => {
    console.log('Server listening on http://localhost:3000');
  });

process.on('SIGINT', async () => {
  const scraper = await Scraper.getInstance();
  await scraper.close();
  process.exit();
});
