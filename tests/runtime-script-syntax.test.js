const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const publishRoot = path.join(root, 'publish');
const manifestEntries = JSON.parse(
  fs.readFileSync(path.join(publishRoot, 'boot', 'scripts.json'), 'utf8'),
);
const scripts = [
  'character-card-lexicon.js',
  'character-profile-metric-sources.js',
  'company-attendance-actions.js',
  'company-faction-actions.js',
  'known-profession-actions.js',
  'predefined-role-cards.js',
  'real-world-clock-actions.js',
  'real-world-stream-actions.js',
  'ui-theme-actions.js',
  'wechat-actions.js',
];

const failures = [];
for (const absolutePath of scripts) {
  const relativePath = absolutePath;
  const sourcePath = path.join(publishRoot, relativePath);
  try {
    assert.ok(manifestEntries.includes(relativePath), `${relativePath} is missing from boot/scripts.json`);
    const source = fs.readFileSync(sourcePath, 'utf8');
    new vm.Script(source, { filename: `publish/${relativePath}` });
  } catch (error) {
    failures.push(`${relativePath}: ${error.message}`);
  }
}

assert.deepStrictEqual(
  failures,
  [],
  `runtime scripts must be valid JavaScript:\n${failures.join('\n')}`,
);

console.log(`PASS ${scripts.length} required compatibility scripts are loaded and valid`);
