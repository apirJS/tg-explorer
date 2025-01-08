import loginHandler from './handlers/login';

async function server(req: Request) {
  const url = new URL(req.url);
  const path = url.pathname;

  switch (req.method) {
    case 'GET': {
      if (path === '/login') {
        return loginHandler(req);
      }
      break;
    }
    case 'POST': {
      if (path === '/login') {
        return loginHandler(req);
      }
      break;
    }
  }

  return new Response('Not found', { status: 404 });
}

Bun.serve({
  port: 3000,
  fetch: server,
});
