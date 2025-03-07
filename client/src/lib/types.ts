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