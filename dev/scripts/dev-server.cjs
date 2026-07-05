#!/usr/bin/env node
/**
 * 本地 dev 静态服务：publish/ 为站点根，API key 文件映射到项目根目录。
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const publishDir = path.join(root, 'publish');
const keyFile = path.join(root, 'deepseek_key.txt');
const pixaiKeyFile = path.join(root, 'pixatart_key.txt');
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

function readJsonBody(req, callback, maxBytes = 64 * 1024 * 1024) {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > maxBytes) req.destroy();
  });
  req.on('end', () => {
    try {
      callback(null, JSON.parse(body || '{}'));
    } catch (err) {
      callback(err);
    }
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function safeName(value, fallback = 'figure') {
  const text = String(value || '').trim().replace(/[<>:"/\\|?*\x00-\x1F]/g, '-').replace(/\s+/g, '-');
  return (text || fallback).slice(0, 120);
}

function imageExtFromMime(mime = '') {
  const type = String(mime || '').toLowerCase();
  if (type.includes('jpeg') || type.includes('jpg')) return '.jpg';
  if (type.includes('webp')) return '.webp';
  return '.png';
}

async function imageBufferFromSource(source = '') {
  const value = String(source || '').trim();
  if (!value) throw new Error('Missing imageUrl');
  const dataMatch = value.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (dataMatch) {
    return {
      buffer: Buffer.from(dataMatch[2], 'base64'),
      ext: imageExtFromMime(dataMatch[1]),
      contentType: dataMatch[1],
    };
  }
  const response = await fetch(value);
  if (!response.ok) throw new Error(`Image download failed: HTTP ${response.status}`);
  const contentType = response.headers.get('content-type') || '';
  if (contentType && !/^image\//i.test(contentType)) throw new Error(`Unsupported image content-type: ${contentType}`);
  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    ext: imageExtFromMime(contentType || path.extname(new URL(value).pathname)),
    contentType,
  };
}

function pngSize(buffer) {
  if (buffer.length < 24) return null;
  if (buffer.toString('hex', 0, 8) !== '89504e470d0a1a0a') return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function jpegSize(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) return null;
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2) return null;
    if (marker >= 0xc0 && marker <= 0xc3) {
      return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
    }
    offset += 2 + length;
  }
  return null;
}

function imageSize(buffer) {
  return pngSize(buffer) || jpegSize(buffer) || null;
}

function bodyFiguresDir() {
  return path.normalize(path.join(publishDir, 'assets', 'body-figures'));
}

function writeBodyFigureIndex(entry) {
  const indexPath = path.join(bodyFiguresDir(), 'index.json');
  let current = { figures: [] };
  try {
    current = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  } catch (_) {
    current = { figures: [] };
  }
  const figures = Array.isArray(current.figures) ? current.figures : [];
  const next = [entry, ...figures.filter((item) => item?.path !== entry.path && item?.id !== entry.id)];
  fs.writeFileSync(indexPath, `${JSON.stringify({ ...current, figures: next }, null, 2)}\n`, 'utf8');
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
  const pathname = decodeURIComponent(url.pathname);

  if (req.method === 'POST' && pathname === '/__dev/body-figure-meta') {
    readJsonBody(req, (err, payload) => {
      if (err) {
        sendJson(res, 400, { ok: false, error: 'Invalid JSON body' });
        return;
      }
      const rel = String(payload?.path || '').replace(/^\/+/, '');
      const filePath = path.normalize(path.join(publishDir, 'assets', 'body-figures', rel));
      const figuresDir = path.normalize(path.join(publishDir, 'assets', 'body-figures'));
      if (!filePath.startsWith(figuresDir) || path.basename(filePath) !== 'meta.json') {
        sendJson(res, 403, { ok: false, error: 'Forbidden path' });
        return;
      }
      if (!payload?.meta || typeof payload.meta !== 'object') {
        sendJson(res, 400, { ok: false, error: 'Missing meta object' });
        return;
      }
      fs.writeFile(filePath, `${JSON.stringify(payload.meta, null, 2)}\n`, 'utf8', (writeErr) => {
        if (writeErr) {
          sendJson(res, 500, { ok: false, error: writeErr.message });
          return;
        }
        sendJson(res, 200, { ok: true, path: rel });
      });
    });
    return;
  }

  if (req.method === 'POST' && pathname === '/__dev/body-figure-image') {
    readJsonBody(req, async (err, payload) => {
      if (err) {
        sendJson(res, 400, { ok: false, error: 'Invalid JSON body' });
        return;
      }
      try {
        if (!payload?.meta || typeof payload.meta !== 'object') throw new Error('Missing meta object');
        const ownerId = safeName(payload.ownerId || payload.meta.characterId || payload.meta.ownerId || 'character');
        const stamp = safeName(payload.timestamp || Date.now());
        const folder = safeName(`${ownerId}-${stamp}`);
        const targetDir = path.normalize(path.join(bodyFiguresDir(), folder));
        if (!targetDir.startsWith(bodyFiguresDir())) throw new Error('Forbidden path');
        const image = await imageBufferFromSource(payload.imageUrl);
        const filename = `figure${image.ext}`;
        fs.mkdirSync(targetDir, { recursive: true });
        fs.writeFileSync(path.join(targetDir, filename), image.buffer);
        const size = imageSize(image.buffer);
        const meta = {
          ...payload.meta,
          id: folder,
          image: filename,
          generatedAt: new Date().toISOString(),
          imageSize: size || payload.meta.imageSize || { width: 768, height: 1152 },
        };
        fs.writeFileSync(path.join(targetDir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
        const entry = { id: folder, path: folder, generated: true, ownerId: meta.ownerId || meta.characterId || ownerId, stateKind: meta.stateKind || payload.kind || '' };
        writeBodyFigureIndex(entry);
        sendJson(res, 200, {
          ok: true,
          entry,
          path: folder,
          metaPath: `${folder}/meta.json`,
          imagePath: `${folder}/${filename}`,
          imageSrc: `assets/body-figures/${folder}/${filename}`,
          meta,
        });
      } catch (saveErr) {
        sendJson(res, 500, { ok: false, error: saveErr.message || String(saveErr) });
      }
    });
    return;
  }

  if (pathname === '/deepseek_key.txt') {
    sendKeyFile(res, keyFile, 'deepseek_key.txt');
    return;
  }

  if (pathname === '/pixatart_key.txt' || pathname === '/pixai_key.txt') {
    sendKeyFile(res, pixaiKeyFile, 'pixatart_key.txt');
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

function sendKeyFile(res, filePath, label) {
  fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.warn('[dev-server] 无法读取 key 文件:', filePath, err.message);
        res.writeHead(err.code === 'ENOENT' ? 404 : 500);
        res.end(`${label} not found`);
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(String(data).trim());
  });
}

server.listen(port, '127.0.0.1', () => {
  console.log(`[dev-server] http://127.0.0.1:${port}/index.html`);
  console.log(`[dev-server] deepseek_key.txt <- ${keyFile}`);
  console.log(`[dev-server] pixatart_key.txt <- ${pixaiKeyFile}`);
});
