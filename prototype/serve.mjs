// Local-only, throwaway design review server. Never use this as the production app.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.env.NODE_ENV === 'production') {
  console.error('This is a local design prototype. Production serving is disabled.');
  process.exit(1);
}

const root = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PROTOTYPE_PORT || 4173);
const host = process.env.PROTOTYPE_HOST || '127.0.0.1';
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === '/prototype-config.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' });
    res.end('window.__MTRS_PROTOTYPE__ = true;');
    return;
  }
  const path = resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
  if (!path.startsWith(root + sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const body = await readFile(path);
    res.writeHead(200, { 'Content-Type': `${types[extname(path)] || 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Prototype file not found.');
  }
}).listen(port, host, () => console.log(`MTRS 95/97 design prototype: http://${host}:${port}/?variant=A`));
