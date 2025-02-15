export interface EnvirontmentVariables {
  DB_FILE_PATH: string
}

declare module 'bun' {
  interface Env extends EnvirontmentVariables {}
}