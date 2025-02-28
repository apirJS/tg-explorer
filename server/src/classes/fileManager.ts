import { readFileSync, readSync } from 'node:fs';
import { open, readdir } from 'node:fs/promises';
import path from 'node:path';
import { v4 as uuid } from 'uuid';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { join } from 'path';
import crypto from 'crypto';
import { formatErrorMessage } from '../lib/utils';

class FileManager {
  private _TWO_GIGABYTES = 2_147_483_648;

  constructor() {}

  private async splitFile(
    filePath: string,
    outputDir: string,
    chunkSize: number = this._TWO_GIGABYTES
  ) {
    try {
      if (chunkSize > this._TWO_GIGABYTES) {
        throw new Error(
          "Chunk size can't be bigger than 2GB due to Telegram limit"
        );
      }

      const readStream = createReadStream(filePath, {
        highWaterMark: chunkSize,
      }) as AsyncIterable<Buffer>;
      const hash = crypto.createHash('sha256');
      const fileBasename = path.basename(filePath).slice(0, 246);
      let index = 0;

      for await (const chunk of readStream) {
        const chunkPath = path.join(outputDir, `${fileBasename}_${index}.part`);
        const uint8Array = new Uint8Array(chunk);
        await Bun.write(chunkPath, uint8Array);
        hash.update(uint8Array);
        index++;
      }

      const checksum = hash.digest('hex');
      await Bun.write(
        path.join(outputDir, `${fileBasename}_checksum.txt`),
        checksum
      );
    } catch (error) {
      throw new Error(formatErrorMessage('Failed to split the file', error));
    }
  }

  private async mergeFile(outputDir: string, outputFilePath: string) {
    try {
      
    } catch (error) {
      
    }
  }
}
