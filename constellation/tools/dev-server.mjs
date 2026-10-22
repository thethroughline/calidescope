// Serve the site the way Vercel does, for local work and the end-to-end tests:
// static files from the repo root (a directory answers with its index.html, no trailing slash)
// and /api/constellation/<path> handed to api/constellation.js with ?path=<path>.
//
//   node constellation/tools/dev-server.mjs [port]        default 8787
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const api = require(path.join(ROOT, 'api/constellation.js'));
const PORT = +(process.argv[2] || process.env.PORT || 8787);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.ico': 'image/x-icon' };

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (u.pathname === '/api/constellation' || u.pathname.startsWith('/api/constellation/')) {
    const rest = u.pathname.replace(/^\/api\/constellation\/?/, '');
    req.query = Object.fromEntries(u.searchParams);
    req.query.path = rest;
    return api(req, res);
  }
  let p = path.normalize(decodeURIComponent(u.pathname)).replace(/^(\.\.[/\\])+/, '');
  let f = path.join(ROOT, p);
  if (!f.startsWith(ROOT)) { res.statusCode = 403; return res.end('forbidden'); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  else if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html';
  if (!fs.existsSync(f)) { res.statusCode = 404; res.setHeader('Content-Type', 'text/plain'); return res.end('not found'); }
  res.setHeader('Content-Type', TYPES[path.extname(f)] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-store');
  fs.createReadStream(f).pipe(res);
});
server.listen(PORT, () => console.log(`serving ${ROOT} on http://localhost:${PORT}`));
