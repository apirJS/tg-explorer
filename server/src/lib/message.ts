import { BunFile } from 'bun';

type ConstructorParams = {
  file: BunFile;
  filePath: string;
  isAPart?: boolean;
  nthPart?: number;
};

class Message {
  private messageContent: string;
  private file: BunFile;
  private fileName: string;
  private fileType: string;
  private filePath: string;
  private fileSize: number;
  private fileExt: string;
  private createdAt: Date;
  private modifiedAt: Date;
  private isAPart: boolean;
  private nthPart: number;

  constructor({ file, filePath, isAPart = false, nthPart = -1 }: ConstructorParams) {
    this.file = file;
    this.filePath = filePath;
    this.fileName = this.extractFileName(filePath);
    this.fileType = file.type;
    this.fileSize = file.size;
    this.fileExt = this.extractFileExtension(this.fileName);
    this.createdAt = new Date();
    this.modifiedAt = this.createdAt;
    this.isAPart = isAPart;
    this.nthPart = nthPart;
  }

  private extractFileName(filePath: string): string {
    return filePath.split('/').pop() ?? 'untitled';
  }

  private extractFileExtension(fileName: string): string {
    const ext = fileName.split('.').pop();
    return ext ? `.${ext}` : 'unknown';
  }
}
