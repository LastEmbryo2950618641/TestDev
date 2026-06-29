const assert = require('assert');
const fs = require('fs');
const path = require('path');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

const root = path.join(__dirname, '..');
function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('index loads role card json app assets', () => {
  const html = read('publish/index.html');
  assert.ok(html.includes('role-card-json-app/role-card-json-app.css'));
  assert.ok(html.includes('role-card-json-app/role-card-json-app.js'));
});

test('desktop contains role card json app launcher and window textarea', () => {
  const html = read('publish/index.html');
  assert.ok(html.includes('openRoleCardJsonApp()'));
  assert.ok(html.includes('role-card-json-app-screen'));
  assert.ok(html.includes('x-model="$store.game.roleCardJsonText"'));
  assert.ok(html.includes('readonly'));
});

test('game store initializes role card json state and mixes in actions', () => {
  const game = read('publish/game.js');
  assert.ok(game.includes('gm.roleCardJsonApp?.actions'));
  assert.ok(game.includes('roleCardJsonAppOpen: false'));
  assert.ok(game.includes("roleCardJsonText: ''"));
});

test('closeDesktopApps closes role card json app', () => {
  const actions = read('publish/app-switch-actions.js');
  assert.ok(actions.includes('this.roleCardJsonAppOpen = false'));
});

(async () => {
  for (const item of tests) {
    await item.fn();
    console.log(`PASS ${item.name}`);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
