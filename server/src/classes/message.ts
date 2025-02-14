import { BunFile } from 'bun';

type ConstructorParams = {
  file: BunFile;
  filePath: string;
  isAPart?: boolean;
  nthPart?: number;
  messageElement: HTMLDivElement;
};

class Message {
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
  private messageElement: HTMLDivElement;

  constructor({
    file,
    filePath,
    isAPart = false,
    nthPart = -1,
    messageElement,
  }: ConstructorParams) {
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
    this.messageElement = messageElement;

    this.buildElementDataset();
  }

  private extractFileName(filePath: string): string {
    return filePath.split('/').pop() ?? 'untitled';
  }

  private extractFileExtension(fileName: string): string {
    const ext = fileName.split('.').pop();
    return ext ? `.${ext}` : 'unknown';
  }

  private formatElementDatasetAttr(
    prefix: string = 'tg-explorer',
    key: string
  ): string {
    return `${prefix}-${key}`;
  }

  private setElementDatasetItem(key: string, value: string): void {
    this.messageElement.dataset[key] = value;
  }

  private getElementDatasetItem(key: string): string | null {
    return this.messageElement.dataset[key] || null;
  }

  private buildElementDataset(): void {
    const attrs = [
      { key: 'file-name', value: this.fileName },
      { key: 'file-type', value: this.fileType },
      { key: 'file-path', value: this.filePath },
      { key: 'file-size', value: this.fileSize.toString() },
      { key: 'file-ext', value: this.fileExt },
      { key: 'created-at', value: this.createdAt.toISOString() },
      { key: 'modified-at', value: this.modifiedAt.toISOString() },
      { key: 'is-a-part', value: this.isAPart.toString() },
      { key: 'nth-part', value: this.nthPart.toString() },
    ];

    attrs.forEach(({ key, value }) => {
      this.setElementDatasetItem(
        this.formatElementDatasetAttr('tg-explorer', key),
        value
      );
    });
  }

  public getElementOuterHTML(): string {
    return this.messageElement.outerHTML;
  }
}
