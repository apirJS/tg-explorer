import path from 'path';
import crypto from 'crypto';
import TelegramScraper from './src/classes/scraper';
/* 
A PLACE FOR PLAYING AROUND WITH CODE; 
EXPERIMENT,TEST,ETC.
*/

const scraper = await TelegramScraper.createInstance({ headless: false });
await scraper.createChannel()
await scraper.navigateToChannel()
