#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const indexPath = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'publish', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

const startNeedle = '<section x-show="!$store.game.loading && $store.game.homeScreenView === \'new-game\' && !$store.game.phoneSetupDone && !$store.game.phoneActivationChoice"';
const start = html.indexOf(startNeedle);
if (start < 0) {
  console.log('[SKIP] phone setup already moved or not found');
  process.exit(0);
}
const endNeedle = '<section x-show="!$store.game.loading && $store.game.desktopUnlocked && $store.game.phoneSetupDone && $store.game.controlSelectOpen';
const end = html.indexOf(endNeedle, start);
if (end < 0) {
  console.error('[FAIL] end marker not found');
  process.exit(1);
}
const block = html.slice(start, end);
html = html.slice(0, start) + html.slice(end);
const insertNeedle = '<div x-show="$store.game.homeScreenView === \'playing\'" x-cloak>';
const insertAt = html.indexOf(insertNeedle);
if (insertAt < 0) {
  console.error('[FAIL] playing wrapper not found');
  process.exit(1);
}
html = `${html.slice(0, insertAt)}${block}\n\n  ${html.slice(insertAt)}`;
fs.writeFileSync(indexPath, html, 'utf8');
console.log('[OK] phone setup moved outside playing wrapper');
