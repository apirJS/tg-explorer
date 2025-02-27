import { readFileSync, readSync } from 'node:fs';
import { open, readdir } from 'node:fs/promises';
import path from 'node:path';
import { v4 as uuid } from 'uuid';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { join } from 'path';
import crypto from 'crypto';

class FileManager {
  private _TWO_GIGABYTES = 2_147_483_648;
  private _CHUNK_SIZE = 1024 * 1024; // 1MB
  constructor() {}

  private async splitFile(filePath: string, outputDir: string) {
    const readStream = createReadStream(filePath, {
      highWaterMark: this._CHUNK_SIZE,
    });
    let index = 0;
    let hash = crypto.createHash('sha256');

    for await (const chunk of readStream) {
      const chunkPath = join(outputDir, `chunk_${index}.part`);
      await Bun.write(chunkPath, chunk);
      hash.update(chunk);
      index++;
    }

    const checksum = hash.digest('hex');
    await Bun.write(join(outputDir, 'checksum.txt'), checksum);
  }

  private async mergeFile(outputDir: string, outputFilePath: string) {
    const files = (await readdir(outputDir))
      .filter((file) => file.startsWith('chunk_'))
      .sort((a, b) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]));

    const writeStream = createWriteStream(outputFilePath);
    let hash = crypto.createHash('sha256');

    for (const file of files) {
      const chunkPath = join(outputDir, file);
      const chunk = await Bun.file(chunkPath).arrayBuffer();
      const buffer = Buffer.from(chunk);
      const uint8Array = new Uint8Array(buffer.buffer);
      hash.update(uint8Array);
      writeStream.write(uint8Array);
    }

    writeStream.end();

    // Verify integrity
    const originalChecksum = readFileSync(
      join(outputDir, 'checksum.txt'),
      'utf8'
    ).trim();
    const mergedChecksum = hash.digest('hex');

    if (originalChecksum === mergedChecksum) {
      //
    } else {
      //
    }
  }
}
