/* 
A PLACE FOR PLAYING AROUND WITH CODE; 
EXPERIMENT,TEST,ETC.
*/

import TelegramScraper from './src/scraper';

const scraper = await TelegramScraper.createInstance();
await scraper.createChannel();
// await scraper.navigateToChannel();
