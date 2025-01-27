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
      switch (
        msg.type
        //
      ) {
      }
    },
  })
  .post('/login', async ({ set }) => {
    const username = await scraper.getUsername();
    set.status = 'OK';
    return {
      data: {
        username,
      },
    };
  })
  .onBeforeHandle(async () => {
    const result = await scraper.isUserAuthenticated();
    if (result instanceof Error) {
      return error('Unauthorized', {
        message: result.message,
      });
    }

    if (result === false) {
      return error('Unauthorized', { message: 'User not authenticated.' });
    }
  })
  .post('/channels', async ({ set, store: { userId } }) => {
    const isChannelExists = await scraper.isChannelExists();
    if (!isChannelExists) {
      const channelURL = await scraper.createChannel(userId);
      if (!channelURL) {
        return error('Internal Server Error', {
          message: 'Failed to create channel',
        });
      }
      set.status = 'Created';
      return {
        data: {
          channelURL,
        },
      };
    } else {
      return error('Conflict', { message: 'channel already exists.' });
    }
  })
  .listen({ idleTimeout: 120, port: 3000 }, () => {
    console.log('Server listening on http://localhost:3000');
  });

process.on('SIGINT', async () => {
  const scraper = await Scraper.getInstance();
  await scraper.close();
  process.exit();
});
