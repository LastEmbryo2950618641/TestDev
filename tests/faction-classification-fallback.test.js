const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

test('faction overview display helpers avoid hardcoded fallback country name lists', () => {
  const orgActions = read('publish/faction-org-actions.js');
  const gameStore = read('publish/game.js');
  assert.ok(!orgActions.includes('fallbackCountry = /'));
  assert.ok(!gameStore.includes('fallbackCountry = /'));
});

test('archive and territory classification avoid hardcoded real-country name lists', () => {
  const archiveScript = read('publish/faction-archive.js');
  const territoryScript = read('publish/org-territory-system.js');
  assert.ok(!archiveScript.includes('/国家|国籍|政府|美国|中国|日本|英国|法国/'));
  assert.ok(!territoryScript.includes("'中国', '中华人民共和国'"));
});
