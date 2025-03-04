import { readdirSync, readFileSync } from 'node:fs';
import TelegramScraper from './src/classes/scraper';
import path from 'node:path';
import { FileManager } from './src/classes/fileManager';
/* 
A PLACE FOR PLAYING AROUND WITH CODE; 
EXPERIMENT,TEST,ETC.
*/

const fm = new FileManager();
await fm.splitFile(
  './src/dummies/(Reup) NodeJS-20250206T123910Z-001.zip',
  './src/dummies/'
);
