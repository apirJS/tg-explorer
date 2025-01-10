import { Elysia } from 'elysia';
import Scraper from './scraper';

const app = new Elysia()
  .state('scraper', await Scraper.getInstance({ headless: false }))
  .get('/login', async ({ store: { scraper } }) => {
    const creds = await scraper.getCredentials()
  })
  .listen(3000);

process.on('SIGINT', async () => {
  const scraper = await Scraper.getInstance();
  await scraper.close();
  process.exit();
});
