const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8765;
const ROOT = __dirname;

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
};

const server = http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/') url = '/test-harness.html';

  // CORS for ES modules
  res.setHeader('Access-Control-Allow-Origin', '*');

  const filePath = path.join(ROOT, url);
  // Prevent path traversal
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end('forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('not found: ' + url);
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': mime[ext] || 'text/plain' });
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Test server listening on http://localhost:${PORT}/test-harness.html`);
});
