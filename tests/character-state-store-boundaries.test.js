const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const consumers = [
  'publish/character-feedback.js',
  'publish/faction-actions.js',
  'publish/player-aspiration-actions.js',
  'publish/predefined-role-cards.js',
];

for (const relativePath of consumers) {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
  assert.doesNotMatch(
    source,
    /(?:window\.GameModules|store)\.sqliteSave/u,
    `${relativePath} must save character state through characterStateStore`,
  );
}

console.log('PASS character-state consumers stay behind the shared store boundary');
