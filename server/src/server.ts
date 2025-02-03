import { Elysia, error } from 'elysia';
import { cors } from '@elysiajs/cors';
import { WSMessage } from './lib/types';
import TelegramScraper from './scraper';

const scraper = await TelegramScraper.createInstance({ headless: true });

new Elysia()
  .use(cors({ origin: 'http://localhost:5173' }))
  .ws('/ws', {
    open(ws) {
      console.log('WS connected: ', ws.id);
    },
    async message(ws, msg: WSMessage<any>) {
      switch (msg.type) {
        case 'login':
          try {
            const isUserAuthenticated = await scraper.checkAuthentication();
            if (isUserAuthenticated) {
              const message: WSMessage = {
                type: 'already_signed',
              };

              ws.send(JSON.stringify(message));
            }

            // START A LOGIN POOLING
            const loginSuccess = await scraper.waitForUserLogin();
            if (!loginSuccess) {
              const message: WSMessage = {
                type: 'timeout',
              };
              ws.send(JSON.stringify(message));
            }

            const fullName = await scraper.fetchUserFullName();
            const message: WSMessage<{ user: { fullName: string } }> = {
              type: 'login_success',
              data: {
                user: {
                  fullName,
                },
              },
            };

            ws.send(JSON.stringify(message));
          } catch (error) {
            const message: WSMessage<{ message: string }> = {
              type: 'error',
              data: {
                message:
                  error instanceof Error ? error.message : 'Unknown error.',
              },
            };

            ws.send(JSON.stringify(message));
          }
      }
    },
  })
  .onBeforeHandle(async () => {
    try {
      const result = await scraper.checkAuthentication();

      if (result === false) {
        return error('Unauthorized', { message: 'User not authenticated.' });
      }
    } catch (e) {
      return error('Internal Server Error', {
        message: e instanceof Error ? e.message : 'Unknown error.',
      });
    }
  })
  .post('/channels', async () => {
    //
  })
  .listen({ idleTimeout: 120, port: 3000 }, () => {
    console.log('Server listening on http://localhost:3000');
  });

process.on('SIGINT', async () => {
  const scraper = await TelegramScraper.createInstance();
  await scraper.closeInstance();
  process.exit();
});
