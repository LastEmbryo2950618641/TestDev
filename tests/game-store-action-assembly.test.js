const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const gameSource = fs.readFileSync(path.join(root, 'publish', 'game.js'), 'utf8');
const remergeSource = fs.readFileSync(path.join(root, 'publish', 'remerge-game-store.js'), 'utf8');

for (const namespace of ['factionMembershipActions', 'controlEntryActions']) {
  assert.match(
    gameSource,
    new RegExp(`gm\\.${namespace}`, 'u'),
    `initial game store must include ${namespace}`,
  );
  assert.match(
    remergeSource,
    new RegExp(`gm\\.${namespace}`, 'u'),
    `dynamic game store remerge must include ${namespace}`,
  );
}

console.log('PASS game store includes required action modules in both assembly paths');
