import { ForegroundColorName } from 'chalk';

export type WSMessageData<T> = T extends WSMessage<infer U> ? U : never;

export type WSMessageTypes =
  | 'login'
  | 'already_signed'
  | 'error'
  | 'timeout'
  | 'login_success';

export type WSMessage<T = undefined> = {
  type: WSMessageTypes;
  data?: T;
};

export type IDBOperationSuccess<T> = { data: T };
export type IDBOperationFailed = { error: Error | DOMException };
export type IDBOperationResult<T> = IDBOperationFailed | IDBOperationSuccess<T>;

export type PageType = 'k' | 'a';
export type ChannelInfo =
  | {
      channelExists: true;
      channelName: string;
      peerId: string;
      selector: string;
    }
  | {
      channelExists: false;
      channelName: null;
      peerId: null;
    };

export interface LogOptions {
  error?: any;
  type?: 'error' | 'log' | 'info' | 'warn';
  indentSize?: number;
  success?: boolean;
  color?: ForegroundColorName
}