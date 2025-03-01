import { createReadStream, createWriteStream } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'crypto';
import { formatErrorMessage } from '../lib/utils';

class FileManager {
  private _CHUNK_SIZE = 524_288_000;

  constructor() {}

  private async splitFile(
    filePath: string,
    outputDir: string,
    chunkSize: number = this._CHUNK_SIZE
  ) {
    try {
      if (chunkSize > this._CHUNK_SIZE) {
        throw new Error(
          "Chunk size can't be bigger than 2GB due to Telegram limit"
        );
      }

      const readStream = createReadStream(filePath, {
        highWaterMark: chunkSize,
      }) as AsyncIterable<Buffer>;
      const hash = crypto.createHash('sha256');
      const fileName = path.basename(filePath).slice(0, 246);
      let index = 0;

      for await (const chunk of readStream) {
        const chunkPath = path.join(outputDir, `${fileName}_${index}.part`);
        const uint8Array = new Uint8Array(chunk);

        await Bun.write(chunkPath, uint8Array);
        hash.update(uint8Array);
        index++;
      }

      const checksum = hash.digest('hex');
      await Bun.write(path.join(outputDir, `${fileName}.checksum`), checksum);
    } catch (error) {
      throw new Error(formatErrorMessage('Failed to split the file', error));
    }
  }

  private async mergeFile(
    originalFileName: string,
    inputDir: string,
    outputFilePath: string
  ): Promise<boolean> {
    try {
      const files = (await readdir(inputDir))
        .filter((fileName) => fileName.includes('.part'))
        .sort((a, b) => {
          return (
            parseInt(a.split('_').at(-1)!.replace('.part', ''), 10) -
            parseInt(b.split('_').at(-1)!.replace('.part', ''), 10)
          );
        });

      if (files.length === 0) {
        return false;
      }

      const writeStream = createWriteStream(outputFilePath);
      const hash = crypto.createHash('sha256');

      for (const chunkFileName of files) {
        const chunkPath = path.join(inputDir, chunkFileName);
        const chunk = await Bun.file(chunkPath).arrayBuffer();
        const buffer = Buffer.from(chunk);
        const uint8Array = new Uint8Array(buffer);

        hash.update(uint8Array);
        writeStream.write(uint8Array);
      }

      writeStream.end();

      const originalChecksumPath = path.join(
        inputDir,
        `${originalFileName}.checksum`
      );
      let originalChecksum = '';

      if (await Bun.file(originalChecksumPath).exists()) {
        originalChecksum = (await Bun.file(originalChecksumPath).text()).trim();
      }

      const mergedChecksum = hash.digest('hex');

      if (originalChecksum && mergedChecksum === originalChecksum) {
        console.log('Checksums match! File integrity verified.');
        return true;
      } else if (originalChecksum) {
        console.log('Checksum mismatch! The file may be corrupted.');
        return false;
      } else {
        console.log('No checksum file found; skipping integrity check.');
        return false;
      }
    } catch (error) {
      throw new Error(formatErrorMessage('Failed to merge the files', error));
    }
  }
}
