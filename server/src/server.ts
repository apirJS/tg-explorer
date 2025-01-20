import { Elysia, error } from 'elysia';
import { cors } from '@elysiajs/cors';
import { initializeScraper } from './lib/utils';
import path from 'path';
import Scraper from './scraper';
import { WSMessage } from './lib/types';

const app = new Elysia()
  .use(cors({ origin: 'http://localhost:5173' }))
  .state(
    'scraper',
    await initializeScraper({
      headless: false,
      userDataDir: path.resolve(__dirname, '../session'),
    })
  )
  .ws('/ws', {
    open(ws) {
      console.log('WS connected: ', ws.id);
    },
    message(ws, msg: WSMessage) {
      switch (msg.type) {
        case 'get_creds':
      }
    },
  })
  .onBeforeHandle(async ({ store }) => {
    const authed = await store.scraper.isUserAuthenticated();
    if (!authed) {
      return error('Unauthorized', { message: 'User not authenticated' });
    }
  })
  .get('/login', async ({ store: { scraper }, set }) => {
    const username = await scraper.getUsername();
    set.status = 'OK';
    return {
      data: {
        username,
      },
    };
  })
  .listen({ idleTimeout: 120, port: 3000 }, () => {
    console.log('Server listening on http://localhost:3000');
  });

process.on('SIGINT', async () => {
  const scraper = await Scraper.getInstance();
  await scraper.close();
  process.exit();
});
