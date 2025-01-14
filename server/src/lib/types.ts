export type WSMessageData<T> = T extends WSMessage<infer U> ? U : never;

export type WSMessageTypes = 'login';

export type WSMessage<T> = {
  type: WSMessageTypes;
  data: T;
};
