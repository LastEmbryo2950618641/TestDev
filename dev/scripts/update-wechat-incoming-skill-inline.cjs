#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../..');
const inlinePath = path.join(root, 'publish/skill-docs-inline.js');
const mdPath = path.join(root, 'publish/skills/wechat-message-incoming/SKILL.md');
const key = 'wechat-message-incoming/SKILL.md';
const md = fs.readFileSync(mdPath, 'utf8');
let src = fs.readFileSync(inlinePath, 'utf8');
const marker = `"${key}":`;
const start = src.indexOf(marker);
if (start < 0) {
  console.error('missing key', key);
  process.exit(1);
}
const valueStart = src.indexOf('"', start + marker.length);
let i = valueStart + 1;
while (i < src.length) {
  if (src[i] === '\\') { i += 2; continue; }
  if (src[i] === '"') break;
  i += 1;
}
const before = src.slice(0, valueStart);
const after = src.slice(i + 1);
src = `${before}${JSON.stringify(md)}${after}`;
fs.writeFileSync(inlinePath, src);
console.log('updated', key);
