export interface EnvirontmentVariables {
  DB_FILE_NAME: string;
}

declare module 'bun' {
  interface Env extends EnvirontmentVariables {}
}
