import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { formatErrorMessage, log } from '../lib/utils';

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
      log(`Splitting [${filePath}]...`);

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

          writer.write(chunk.subarray(chunkOffset, chunkOffset + bytesToWrite));
          currentSize += bytesToWrite;
          totalSize += bytesToWrite;
          chunkOffset += bytesToWrite;

          if (currentSize >= chunkSize) {
            await writer.flush();
            await writer.end();
            result.files.push({ path: currentFile, size: currentSize });
            log(`Finished writting ${currentFile} (${currentSize} bytes)`, {
              success: true,
            });

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
        log(`Finished last part: ${currentFile} (${currentSize} bytes)`, {
          success: true,
        });
      }

      const checksumPath = path.join(outputDir, `${fileName}.sha256`);
      const checksum = hash.digest('hex');

      await Bun.write(checksumPath, checksum);

      result.checksum = { path: checksumPath, algorithm: 'sha256' };
      result.location = outputDir;

      log(`Splitting [${filePath}] success`, { success: true });
      return result;
    } catch (error) {
      log(`Failed to split [${filePath}]`, { type: 'error', error });
      throw new Error(formatErrorMessage('Failed to split the file', error));
    }
  }

  public async mergeFile(
    originalFileName: string,
    chunksDir: string,
    outputFilepath: string
  ): Promise<boolean> {
    try {
      log(`Merging [${originalFileName}] ...`);

      const fileNames = (await readdir(chunksDir))
        .filter((fileName) => fileName.startsWith(originalFileName + '.part_'))
        .sort(
          (a, b) =>
            parseInt(a.split('.part_').at(-1) ?? '0', 10) -
            parseInt(b.split('.part_').at(-1) ?? '0', 10)
        );
      const hash = new Bun.CryptoHasher('sha256');
      const outputFile = Bun.file(outputFilepath);
      const writer = outputFile.writer();

      for (const fileName of fileNames) {
        const readStream = Bun.file(path.join(chunksDir, fileName)).stream();
        for await (const chunk of readStream) {
          hash.update(chunk);
          writer.write(chunk);
        }

        writer.flush();
      }

      writer.end();
      const checksum = hash.digest('hex');
      const originalChecksum = await Bun.file(
        path.join(chunksDir, originalFileName + '.sha256')
      ).text();

      if (!originalChecksum) {
        log(
          `Failed to merge [${originalFileName}]: Original checksum is missing!`,
          { success: false }
        );
        return false;
      } else if (checksum !== originalChecksum) {
        log(`Failed to merge [${originalFileName}]: Checksums didn't match`, {
          success: false,
        });
        return false;
      } else {
        log(`Merging [${originalFileName}] success`, { success: true });
        return true;
      }
    } catch (error) {
      log(`Failed to merge [${originalFileName}]`, { type: 'error', error });
      throw new Error(formatErrorMessage('Failed to merge the files', error));
    }
  }
}
