#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = path.join(root, 'publish', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

const marker = '</section>\r\n\r\n  <section x-show="$store.game.savePanelOpen"';
const markerLf = '</section>\n\n  <section x-show="$store.game.savePanelOpen"';
const insertBlock = fs.readFileSync(path.join(root, 'scripts', 'home-aspiration-html.fragment'), 'utf8');

if (html.includes('home-menu-screen')) {
  console.log('[SKIP] home menu already present');
} else {
  let replaced = false;
  for (const m of [marker, markerLf]) {
    if (html.includes(m)) {
      html = html.replace(m, `</section>\n\n${insertBlock}\n\n  <div x-show="$store.game.homeScreenView === 'playing'" x-cloak>\n  <section x-show="$store.game.savePanelOpen"`);
      replaced = true;
      break;
    }
  }
  if (!replaced) {
    console.error('[FAIL] marker not found');
    process.exit(1);
  }
}

html = html.replace(
  /<section x-show="!\$store\.game\.loading && !\$store\.game\.phoneSetupDone && !\$store\.game\.phoneActivationChoice"/g,
  '<section x-show="!$store.game.loading && $store.game.homeScreenView === \'new-game\' && !$store.game.phoneSetupDone && !$store.game.phoneActivationChoice"',
);

html = html.replace(
  /<section x-show="!\$store\.game\.loading && !\$store\.game\.phoneSetupDone && \['existing', 'new'\]\.includes\(\$store\.game\.phoneActivationChoice\)"/g,
  '<section x-show="!$store.game.loading && $store.game.homeScreenView === \'new-game\' && !$store.game.phoneSetupDone && [\'existing\', \'new\'].includes($store.game.phoneActivationChoice)"',
);

if (!html.includes('<!-- HOME_PLAYING_WRAPPER_END -->')) {
  html = html.replace(/\n<\/body>\n<\/html>\s*$/, '\n  </div><!-- HOME_PLAYING_WRAPPER_END -->\n</body>\n</html>\n');
}

fs.writeFileSync(indexPath, html, 'utf8');
console.log('[OK] index.html patched');
