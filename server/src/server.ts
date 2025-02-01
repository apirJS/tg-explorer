import { Elysia, error } from 'elysia';
import { cors } from '@elysiajs/cors';
import { initializeScraper } from './lib/utils';
import path from 'path';
import Scraper from './scraper';
import { WSMessage } from './lib/types';

const scraper = await initializeScraper({
  headless: true,
  userDataDir: path.resolve(__dirname, '../session'),
});

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
            const result = await scraper.getUserId();
            console.log('AUTH_STATE: ', result)

            if (result) {
              const message: WSMessage = {
                type: 'already_signed',
              };
              return ws.send(JSON.stringify(message));
            }

            // START A POOLING TO WAIT FOR LOGIN SUCCESS EVENT
            const success = await scraper.waitForLogin(msg.data?.timeout);
            console.log('success: ', success)
            if (!success) {
              const message: WSMessage = {
                type: 'timeout',
              };
              return ws.send(JSON.stringify(message));
            }
            
            const fullName = await scraper.getFullName();
            console.log('fullName: ', fullName)
            if (fullName instanceof Error) {
              const message: WSMessage<{ message: string }> = {
                type: 'error',
                data: {
                  message: fullName.message,
                },
              };
              return ws.send(JSON.stringify(message));
            }

            await scraper.setItemOnLocalStorage('fullName', fullName);
            const message: WSMessage<{ fullName: string }> = {
              type: 'login_success',
              data: {
                fullName,
              },
            };
            return ws.send(JSON.stringify(message));
          } catch (error) {
            const message: WSMessage<{ message: string }> = {
              type: 'error',
              data: {
                message:
                  error instanceof Error ? error.message : 'Unknown error',
              },
            };
            return ws.send(JSON.stringify(message));
          }
      }
    },
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
  .post('/channels', async () => {
    //
  })
  .listen({ idleTimeout: 120, port: 3000 }, () => {
    console.log('Server listening on http://localhost:3000');
  });

process.on('SIGINT', async () => {
  const scraper = await Scraper.getInstance();
  await scraper.close();
  process.exit();
});
