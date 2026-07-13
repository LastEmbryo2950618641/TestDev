const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const characterConsumers = [
  'publish/real-world-agent-loop.js',
  'publish/real-world-profile-stage5.js',
  'publish/update/generic-update-applier.js',
  'publish/update/update-registry.js',
];

for (const relativePath of characterConsumers) {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
  assert.doesNotMatch(
    source,
    /(?:window\.GameModules|store)\.sqliteSave/u,
    `${relativePath} must stay behind shared stores instead of direct SQLite access`,
  );
}

console.log('PASS real-world downstream consumers stay behind shared character-state storage');
