const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'publish/platform/storage/world-lore-source.js');
const storePath = path.join(root, 'publish/world-lore-store.js');
const consumers = [
  'publish/domain/worldline/state-service.js',
  'publish/entry-actions.js',
  'publish/entry-time.js',
  'publish/entry-year.js',
  'publish/world-lore.js',
];

assert.ok(fs.existsSync(storePath), 'worldLoreStore must exist');

for (const relativePath of [
  'publish/boot/scripts.json',
  'mobile/android-webview-shell/app/src/main/assets/publish/boot/scripts.json',
]) {
  const scripts = JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
  const sourceIndex = scripts.indexOf('platform/storage/world-lore-source.js');
  const storeIndex = scripts.indexOf('world-lore-store.js');
  const consumerIndex = scripts.indexOf('world-lore.js');
  assert.ok(sourceIndex >= 0 && sourceIndex < storeIndex, `${relativePath} must load worldLoreSource before worldLoreStore`);
  assert.ok(storeIndex < consumerIndex, `${relativePath} must load worldLoreStore before world-lore.js`);
}

const calls = [];
const context = vm.createContext({
  window: {
    GameModules: {
      sqliteSave: {
        getWorldLore(worldTag) { calls.push(['get', worldTag]); return { worldTag }; },
        listWorldLores() { calls.push(['list']); return [{ worldTag: '世界A' }]; },
        async saveWorldLore(worldTag, lore) { calls.push(['save', worldTag, lore]); return lore; },
      },
    },
  },
});
vm.runInContext(fs.readFileSync(sourcePath, 'utf8'), context, { filename: 'world-lore-source.js' });
vm.runInContext(fs.readFileSync(storePath, 'utf8'), context, { filename: 'world-lore-store.js' });
const store = context.window.GameModules.worldLoreStore;
const lore = { worldTag: '世界A', background: '背景' };

assert.strictEqual(store.get('世界A')?.worldTag, '世界A');
assert.deepStrictEqual(JSON.parse(JSON.stringify(store.list())), [{ worldTag: '世界A' }]);

async function run() {
  assert.strictEqual(await store.save('世界A', lore), lore);
  assert.deepStrictEqual(calls, [
    ['get', '世界A'],
    ['list'],
    ['save', '世界A', lore],
  ]);
  assert.strictEqual(context.window.GameModules.platform.core.storage.worldLoreSource, context.window.GameModules.platform.storage.worldLoreSource);

  for (const relativePath of consumers) {
    const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
    assert.doesNotMatch(
      source,
      /(?:window\.GameModules\.sqliteSave|save)\??\.(?:getWorldLore|listWorldLores|saveWorldLore)/u,
      `${relativePath} must access world lore through worldLoreStore`,
    );
  }

  console.log('PASS world-lore consumers use the shared store boundary');
}

run();
