import { Elysia } from 'elysia';
import Scraper from './scraper';
import { cors } from '@elysiajs/cors';

const app = new Elysia()
  .use(cors({ origin: 'http://localhost:5173' }))
  .state('scraper', await Scraper.getInstance({ headless: false }))
  .ws('/ws', {
    message(ws, message) {
      console.log("Received: " + message);
      ws.send("You send me: " + message);
    }
  })
  .get('/login', async ({ store: { scraper }, set }) => {
    await scraper.getPage();
    await scraper.openTelegram();
    await scraper.getCredentials();
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        set.status = 'Request Timeout';
        reject({ error: 'Reached timeout.' });
      }, 60_000);

      const checkLocalStorage = () => {
        if (scraper.localStorage) {
          clearTimeout(timeout);
          Bun.write(
            'creds/localStorage.json',
            JSON.stringify(scraper.localStorage)
          );

          set.status = 'OK';
          resolve({ data: { localStorage } });
        } else {
          setTimeout(checkLocalStorage, 500);
        }
      };

      checkLocalStorage();
    });
  })
  .listen(3000, () => {
    console.log('Server listening on http://localhost:3000');
  });

process.on('SIGINT', async () => {
  const scraper = await Scraper.getInstance();
  await scraper.close();
  process.exit();
});

export default app;
