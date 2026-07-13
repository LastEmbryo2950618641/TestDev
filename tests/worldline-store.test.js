const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'publish/platform/storage/worldline-source.js');
const storePath = path.join(root, 'publish/worldline-store.js');
const consumers = [
  'publish/domain/worldline/state-service.js',
  'publish/story-agent-context.js',
  'publish/world-lore.js',
];

assert.ok(fs.existsSync(sourcePath), 'worldline platform source must exist');
assert.ok(fs.existsSync(storePath), 'worldlineStore must exist');

for (const relativePath of [
  'publish/boot/scripts.json',
  'mobile/android-webview-shell/app/src/main/assets/publish/boot/scripts.json',
]) {
  const scripts = JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
  const sourceIndex = scripts.indexOf('platform/storage/worldline-source.js');
  const storeIndex = scripts.indexOf('worldline-store.js');
  const loreIndex = scripts.indexOf('world-lore.js');
  const storyIndex = scripts.indexOf('story-agent-context.js');
  assert.ok(sourceIndex >= 0 && sourceIndex < storeIndex, `${relativePath} must load worldlineSource before worldlineStore`);
  assert.ok(storeIndex < loreIndex && storeIndex < storyIndex, `${relativePath} must load worldlineStore before its consumers`);
}

const calls = [];
const context = vm.createContext({
  window: {
    GameModules: {
      sqliteSave: {
        getWorldline(worldTag) { calls.push(['get', worldTag]); return { worldTag, events: [] }; },
        async saveWorldline(worldTag, worldline) { calls.push(['save', worldTag, worldline]); return worldline; },
      },
    },
  },
});
vm.runInContext(fs.readFileSync(sourcePath, 'utf8'), context, { filename: 'worldline-source.js' });
vm.runInContext(fs.readFileSync(storePath, 'utf8'), context, { filename: 'worldline-store.js' });
const store = context.window.GameModules.worldlineStore;
const worldline = { events: [{ eventId: 'event-1' }] };

assert.strictEqual(store.get('世界A')?.worldTag, '世界A');

async function run() {
  assert.strictEqual(await store.save('世界A', worldline), worldline);
  assert.deepStrictEqual(calls, [['get', '世界A'], ['save', '世界A', worldline]]);
  assert.strictEqual(context.window.GameModules.platform.core.storage.worldlineSource, context.window.GameModules.platform.storage.worldlineSource);

  for (const relativePath of consumers) {
    const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
    assert.doesNotMatch(
      source,
      /(?:window\.GameModules\.sqliteSave|save)\??\.(?:getWorldline|saveWorldline)/u,
      `${relativePath} must access worldline state through worldlineStore`,
    );
  }

  console.log('PASS worldline consumers use the shared store boundary');
}

run();
