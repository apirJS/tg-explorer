import { createReadStream, createWriteStream } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { formatErrorMessage } from '../lib/utils';

export class FileManager {
  private _CHUNK_SIZE = 524_288_000; // 500 MB

  constructor() {}

  public async splitFile(
    filePath: string,
    outputDir: string,
    chunkSize: number = this._CHUNK_SIZE
  ): Promise<{
    files: {
      path: string;
      size: number;
    }[];
    checksum: {
      path: string;
      algorithm: string;
    };
    location: string;
  }> {
    try {
      const result: {
        files: { path: string; size: number }[];
        checksum: { path: string; algorithm: string };
        location: string;
      } = {
        files: [],
        checksum: { path: '', algorithm: 'sha256' },
        location: outputDir,
      };

      const fileName = path.basename(filePath);
      const file = Bun.file(filePath);
      const readStream = file.stream();
      const hash = new Bun.CryptoHasher('sha256');
      const fileSize = file.size;

      let partIndex = 0;
      let currentFile = path.join(outputDir, `${fileName}.part_${partIndex}`);
      let currentSize = 0;
      let totalSize = 0;
      let writer = Bun.file(currentFile).writer();

      for await (const chunk of readStream) {
        let chunkOffset = 0;
        hash.update(chunk);

        while (chunkOffset < chunk.length) {
          let spaceLeft = chunkSize - currentSize;
          let bytesToWrite = Math.min(spaceLeft, chunk.length - chunkOffset);

          writer.write(
            chunk.subarray(chunkOffset, chunkOffset + bytesToWrite)
          );
          currentSize += bytesToWrite;
          totalSize += bytesToWrite;
          chunkOffset += bytesToWrite;

          if (currentSize >= chunkSize) {
            await writer.flush();
            await writer.end();
            result.files.push({ path: currentFile, size: currentSize });
            console.log(
              `Finished writing ${currentFile} (${currentSize} bytes)`
            );

            if (totalSize < fileSize) {
              partIndex++;
              currentFile = path.join(
                outputDir,
                `${fileName}.part_${partIndex}`
              );
              writer = Bun.file(currentFile).writer();
              currentSize = 0;
            }
          }
        }
      }

      if (currentSize > 0) {
        await writer.flush();
        await writer.end();
        result.files.push({ path: currentFile, size: currentSize });
        console.log(
          `Finished last part: ${currentFile} (${currentSize} bytes)`
        );
      }

      const checksumPath = path.join(outputDir, `${fileName}.sha256`);
      const checksum = hash.digest('hex');

      await Bun.write(checksumPath, checksum);

      result.checksum = { path: checksumPath, algorithm: 'sha256' };
      result.location = outputDir;
      return result;
    } catch (error) {
      throw new Error(formatErrorMessage('Failed to split the file', error));
    }
  }

  public async mergeFile(
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
      const hash = new Bun.CryptoHasher('sha256');

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
