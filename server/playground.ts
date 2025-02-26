import { readdirSync, readFileSync } from 'node:fs';
import TelegramScraper from './src/classes/scraper';
import path from 'node:path';
/* 
A PLACE FOR PLAYING AROUND WITH CODE; 
EXPERIMENT,TEST,ETC.
*/

const scraper = await TelegramScraper.createInstance({ headless: false });
function readFiles(dirname: string): File[] {
  const files: File[] = [];
  const fileNames = readdirSync(dirname);
  for (const fileName of fileNames) {
    const filePath = path.join(dirname, fileName);
    const fileBuffer = readFileSync(filePath);
    const file = new File([fileBuffer], fileName, { type: 'application/json' });
    files.push(file);
  }

  return files;
}

const files = readFiles('./src/dummies');
await scraper.uploadFiles(files);
