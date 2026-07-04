#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const indexPath = path.join(root, 'publish', 'index.html');
const bootScripts = [
  'boot/script-loader.js',
  'boot/store-modules.js',
  'boot/script-manifest.js',
  'boot/boot-actions.js',
  'boot/boot.js',
];

function main() {
  if (!fs.existsSync(indexPath)) {
    console.error('[FAIL] missing', indexPath);
    process.exit(1);
  }
  let html = fs.readFileSync(indexPath, 'utf8');
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  if (!headMatch) {
    console.error('[FAIL] <head> not found');
    process.exit(1);
  }
  const headInner = headMatch[1];
  const kept = [];
  headInner.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    if (/^<link\b/i.test(trimmed)) kept.push(line);
    if (/^<meta\b/i.test(trimmed)) kept.push(line);
    if (/^<title\b/i.test(trimmed)) kept.push(line);
  });
  const bootTags = bootScripts.map((src) => `  <script src="${src}"></script>`).join('\n');
  const newHead = `<head>\n${kept.join('\n')}\n${bootTags}\n</head>`;
  html = html.replace(/<head[^>]*>[\s\S]*?<\/head>/i, newHead);
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('[OK] publish/index.html head now has', bootScripts.length, 'boot scripts');
}

main();
