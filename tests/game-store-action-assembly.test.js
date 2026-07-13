const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const gameSource = fs.readFileSync(path.join(root, 'publish', 'game.js'), 'utf8');
const remergeSource = fs.readFileSync(path.join(root, 'publish', 'remerge-game-store.js'), 'utf8');

assert.match(
  gameSource,
  /gm\.factionMembershipActions/u,
  'initial game store must include faction membership actions',
);
assert.match(
  remergeSource,
  /gm\.factionMembershipActions/u,
  'dynamic game store remerge must include faction membership actions',
);

console.log('PASS game store includes faction membership actions in both assembly paths');
