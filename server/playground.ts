import { readdirSync, readFileSync } from 'node:fs';
import TelegramScraper from './src/classes/scraper';
import path from 'node:path';
import { FileManager } from './src/classes/fileManager';
/* 
A PLACE FOR PLAYING AROUND WITH CODE; 
EXPERIMENT,TEST,ETC.
*/

const s = await TelegramScraper.createInstance({ headless: false });
await s.uploadFiles();

