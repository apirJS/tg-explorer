export type WSMessageData<T> = T extends WSMessage<infer U> ? U : never;

export type WSMessageTypes = 'get_creds';

export type WSMessage<T = undefined> = {
  type: WSMessageTypes;
  data?: T;
};

export type IDBOperationSuccess<T> = { data: T };
export type IDBOperationFailed = { error: Error };
export type IDBOperationResult<T> = IDBOperationFailed | IDBOperationSuccess<T>;