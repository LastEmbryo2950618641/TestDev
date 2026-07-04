#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const gameCore = fs.readFileSync(path.join(root, 'publish', '__game-core.js'), 'utf8');

const skillKey = 'prompts/手机激活/player-aspiration-goals/SKILL.md';
const needle = `"${skillKey}": "`;
const start = gameCore.indexOf(needle);
if (start < 0) {
  console.error('SKILL entry not found');
  process.exit(1);
}
let i = start + needle.length;
let raw = '';
while (i < gameCore.length) {
  const ch = gameCore[i];
  if (ch === '\\') {
    raw += gameCore[i + 1];
    i += 2;
    continue;
  }
  if (ch === '"') break;
  raw += ch;
  i += 1;
}
const skill = raw.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '\t').replace(/\\r/g, '\r');
const mdStart = skill.indexOf('````md');
if (mdStart < 0) {
  console.error('md opener not found');
  process.exit(1);
}
const mdBodyStart = skill.indexOf('\n', mdStart) + 1;
const mdEnd = skill.indexOf('````', mdBodyStart);
if (mdBodyStart <= 0 || mdEnd < 0) {
  console.error('template block not found');
  process.exit(1);
}
const md = skill.slice(mdBodyStart, mdEnd).trim() + '\n';
const outPath = path.join(root, 'publish', 'prompts', 'player-aspiration-goals.md');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, md, 'utf8');
console.log('[OK]', outPath, md.length);
