import { Elysia, error } from 'elysia';
import { cors } from '@elysiajs/cors';
import { initializeScraper } from './lib/utils';
import path from 'path';
import Scraper from './scraper';
import { WSMessage } from './lib/types';

const scraper = await initializeScraper({
  headless: false,
  userDataDir: path.resolve(__dirname, '../session'),
});

new Elysia()
  .use(cors({ origin: 'http://localhost:5173' }))
  .ws('/ws', {
    open(ws) {
      console.log('WS connected: ', ws.id);
    },
    message(ws, msg: WSMessage) {
      switch (msg.type) {
        case 'get_creds':
        //
      }
    },
  })
  .get('/login', async ({ set }) => {
    const authenticated = await scraper.isUserAuthenticated();
    if (!authenticated) {
      return error('Unauthorized', { message: 'User is not authenticated.' });
    }

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
