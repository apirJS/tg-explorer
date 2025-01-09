import { publicProcedure, router } from './trpc';
import { createHTTPServer } from '@trpc/server/adapters/standalone';

const appRouter = router({
  hello: publicProcedure.query(async () => {
    const data = 'Hello World';
    return data;
  }),
});

const server = createHTTPServer({
  router: appRouter,
});

server.listen(3000);
server.on('listening', () => {
  console.log(`Server start on http://localhost:3000`)
})

export type AppRouter = typeof appRouter;
