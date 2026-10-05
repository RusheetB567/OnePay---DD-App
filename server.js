import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('.', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const allowed = new Set(['/index.html', '/src/app.js', '/src/finance.js', '/src/data.js', '/src/styles.css']);
http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const target = pathname === '/' ? '/index.html' : pathname;
  if (!allowed.has(target)) { res.writeHead(404); res.end('Not found'); return; }
  try {
    const content = await readFile(path.join(root, target));
    res.writeHead(200, { 'Content-Type': `${types[path.extname(target)]}; charset=utf-8`, 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'", 'Cache-Control': 'no-store' });
    res.end(content);
  } catch { res.writeHead(500); res.end('Unable to load application'); }
}).listen(Number(process.env.PORT || 3000), '127.0.0.1', () => console.log('OnePay is ready at http://localhost:3000'));
