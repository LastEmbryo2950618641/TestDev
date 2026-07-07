const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'publish', 'index.html'), 'utf8');

assert.ok(
  html.includes('@keydown.escape.window="$store.game.closeFactionDetail()"'),
  'faction detail modal should close on Escape',
);
assert.ok(
  html.includes('class="small-btn faction-rpg-close"'),
  'faction detail close button should exist',
);
assert.ok(
  html.includes('data-faction-close-detail'),
  'faction detail close controls should expose a native fallback marker',
);
assert.ok(
  html.includes('onclick="window.closeFactionDetailNative?.(event)"'),
  'faction detail close controls should have a native onclick fallback',
);
assert.ok(
  html.includes('onpointerdown="window.closeFactionDetailNative?.(event)"'),
  'faction detail close controls should close on native pointerdown before click can be swallowed',
);
assert.ok(
  html.includes('onmousedown="window.closeFactionDetailNative?.(event)"'),
  'faction detail close controls should close on native mousedown for desktop fallback',
);
assert.ok(
  html.includes('function closeFactionDetailNative(event)'),
  'faction detail close fallback should be available before external boot scripts load',
);
assert.ok(
  html.includes(':data-faction-id="faction.id"'),
  'faction rows should expose native faction ids for fallback navigation',
);
assert.ok(
  html.includes('@pointerdown.stop.prevent="$store.game.closeFactionDetail()"'),
  'faction detail close controls should close on pointerdown',
);
assert.ok(
  html.includes('@click.stop.prevent="$store.game.closeFactionDetail()"'),
  'faction detail close controls should close on click',
);

console.log('PASS faction detail close controls close on pointerdown, click, and escape');
