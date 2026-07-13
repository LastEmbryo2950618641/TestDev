const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const orphanFiles = [
  'publish/alert-log.js',
  'publish/real-world-layout-catalog-actions.js',
];

for (const file of orphanFiles) {
  assert.strictEqual(fs.existsSync(path.join(root, file)), false, `${file} must stay removed`);
}

for (const script of ['scripts/sync-from-bundles.mjs', 'dev/scripts/restore-from-bundles.cjs']) {
  const source = fs.readFileSync(path.join(root, script), 'utf8');
  assert.doesNotMatch(source, /core\/alert-log\.js/u, `${script} must not restore alert-log.js`);
}

const clockActions = fs.readFileSync(path.join(root, 'publish/real-world-clock-actions.js'), 'utf8');
assert.doesNotMatch(
  clockActions,
  /realWorldLayoutCatalog/u,
  'clock actions must not retain unreachable layout catalog branches',
);

console.log('PASS orphan runtime files and restore aliases stay removed');
