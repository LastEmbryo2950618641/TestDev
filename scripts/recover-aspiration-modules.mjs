#!/usr/bin/env node
/**
 * 从 __chunk-core.js 提取人生取向 / 首页相关模块到 publish/
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const chunkPath = path.join(root, 'publish', '__chunk-core.js');
const outDir = path.join(root, 'publish');

const chunk = fs.readFileSync(chunkPath, 'utf8');

const modules = [
  ['home-actions.js', ';// ---- home-actions.js ----', ';// ---- player-aspiration-config.js ----'],
  ['player-aspiration-config.js', ';// ---- player-aspiration-config.js ----', ';// ---- player-aspiration-preference-layers.js ----'],
  ['player-aspiration-preference-layers.js', ';// ---- player-aspiration-preference-layers.js ----', ';// ---- player-aspiration-actions.js ----'],
  ['player-aspiration-actions.js', ';// ---- player-aspiration-actions.js ----', ';// ---- result-actions.js ----'],
];

for (const [filename, startMark, endMark] of modules) {
  const start = chunk.indexOf(startMark);
  const end = chunk.indexOf(endMark);
  if (start < 0 || end < 0 || end <= start) {
    console.error(`[FAIL] ${filename}: markers not found (start=${start}, end=${end})`);
    process.exitCode = 1;
    continue;
  }
  const content = chunk.slice(start + startMark.length, end).replace(/^\r?\n/, '');
  const outPath = path.join(outDir, filename);
  fs.writeFileSync(outPath, content, 'utf8');
  console.log(`[OK] ${filename} (${content.length} chars)`);
}
