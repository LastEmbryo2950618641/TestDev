#!/usr/bin/env node
/**
 * 本地 dev 静态服务：publish/ 为站点根，/deepseek_key.txt 映射到项目根 deepseek_key.txt
 * 对应路径：F:\TestDev-main\TestDev-main\deepseek_key.txt
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const publishDir = path.join(root, 'publish');
const keyFile = path.join(root, 'deepseek_key.txt');
const port = Number(process.env.PORT) || 8000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
};

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(err.code === 'ENOENT' ? 404 : 500);
      res.end(err.code === 'ENOENT' ? 'Not Found' : 'Internal Server Error');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
  const pathname = decodeURIComponent(url.pathname);

  if (pathname === '/deepseek_key.txt') {
    fs.readFile(keyFile, 'utf8', (err, data) => {
      if (err) {
        console.warn('[dev-server] 无法读取 key 文件:', keyFile, err.message);
        res.writeHead(err.code === 'ENOENT' ? 404 : 500);
        res.end('deepseek_key.txt not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(String(data).trim());
    });
    return;
  }

  const rel = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.normalize(path.join(publishDir, rel));
  if (!filePath.startsWith(publishDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  sendFile(res, filePath);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`[dev-server] http://127.0.0.1:${port}/index.html`);
  console.log(`[dev-server] deepseek_key.txt <- ${keyFile}`);
});
