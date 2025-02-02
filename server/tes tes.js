const signal = AbortSignal.timeout(1000);

new Promise.race([
  new Promise((res, _) => res(1)),
  new Promise((_, rej) => rej(new DOMException('TimeoutError', 'AbortError'))),
]);
