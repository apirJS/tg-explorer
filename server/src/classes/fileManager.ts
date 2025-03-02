import { createReadStream, createWriteStream } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'crypto';
import { formatErrorMessage } from '../lib/utils';
import { Transform } from 'node:stream';

export class FileManager {
  private _CHUNK_SIZE = 524_288_000; // 500 MB

  constructor() {}

  private async splitFile(
    filePath: string,
    outputDir: string,
    chunkSize: number = this._CHUNK_SIZE
  ): Promise<void> {
    try {
      const fileName = path.basename(filePath).slice(0, 246);
      const hash = crypto.createHash('sha256');
      let buffer = Buffer.alloc(0);
      let chunkIndex = 1;

      const splitter = new Transform({
        transform(chunk, _, callback) {
          (async () => {
            try {
              buffer = Buffer.concat([buffer, chunk]);

              while (buffer.length >= chunkSize) {
                const chunkToWrite = buffer.subarray(0, chunkSize);
                buffer = buffer.subarray(chunkSize);
                const uint8Array = new Uint8Array(chunkToWrite);
                hash.update(uint8Array);

                await Bun.write(
                  path.join(outputDir, `${fileName}.part_${chunkIndex}`),
                  uint8Array
                );
                chunkIndex++;
              }

              callback(); // All good
            } catch (err) {
              callback(err as Error); // Pass error to the stream
            }
          })();
        },

        flush(callback) {
          (async () => {
            try {
              if (buffer.length > 0) {
                const uint8Array = new Uint8Array(buffer);
                hash.update(uint8Array);
                await Bun.write(
                  path.join(outputDir, `${fileName}.part_${chunkIndex}`),
                  uint8Array
                );
                chunkIndex++;
              }
              const checksumPath = path.join(outputDir, `${fileName}.sha256`);
              const checksum = hash.digest('hex');

              await Bun.write(checksumPath, checksum);
              callback(); // Stream finish, no more incoming chunk
            } catch (err) {
              callback(err as Error);
            }
          })();
        },
      });

      const readStream = createReadStream(filePath);
      await new Promise<void>((resolve, reject) => {
        readStream
          .pipe(splitter)
          .on('finish', () => {
            resolve();
          })
          .on('error', (err) => {
            reject(err);
          });
      });
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
        .filter(
          (fileName) =>
            fileName.includes(originalFileName) && fileName.includes('.part')
        )
        .sort((a, b) => {
          return (
            parseInt(a.split('.part_').at(-1) ?? '', 10) -
            parseInt(b.split('.part_').at(-1) ?? '', 10)
          );
        });

      if (files.length === 0) {
        return false;
      }

      const writeStream = createWriteStream(outputFilePath);
      const hash = crypto.createHash('sha256');

      for (const chunkFileName of files) {
        const chunkPath = path.join(inputDir, chunkFileName);
        const readStream = createReadStream(chunkPath);

        readStream.on('data', (data) => {
          const uint8Array = new Uint8Array(data as Buffer);
          hash.update(uint8Array);
        });

        readStream.pipe(writeStream, { end: false });

        await new Promise((resolve, reject) => {
          readStream.on('end', resolve); // chunk fully read
          readStream.on('error', reject);
          writeStream.on('error', reject);
        });
      }

      writeStream.end();
      await new Promise<void>((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      const originalChecksumPath = path.join(
        inputDir,
        `${originalFileName}.sha256`
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
