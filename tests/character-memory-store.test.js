const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'publish/platform/storage/character-memory-source.js');
const storePath = path.join(root, 'publish/character-memory-store.js');
const consumers = [
  'publish/app/wechat/memory-debug-orchestration.js',
  'publish/character-memory-flow.js',
  'publish/character-memory.js',
  'publish/past-event-query.js',
];

assert.ok(fs.existsSync(sourcePath), 'character memory platform source must exist');
assert.ok(fs.existsSync(storePath), 'characterMemoryStore must exist');

for (const relativePath of [
  'publish/boot/scripts.json',
  'mobile/android-webview-shell/app/src/main/assets/publish/boot/scripts.json',
]) {
  const scripts = JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
  const sourceIndex = scripts.indexOf('platform/storage/character-memory-source.js');
  const storeIndex = scripts.indexOf('character-memory-store.js');
  const memoryIndex = scripts.indexOf('character-memory.js');
  const flowIndex = scripts.indexOf('character-memory-flow.js');
  assert.ok(sourceIndex >= 0 && sourceIndex < storeIndex, `${relativePath} must load characterMemorySource before characterMemoryStore`);
  assert.ok(storeIndex < memoryIndex && storeIndex < flowIndex, `${relativePath} must load characterMemoryStore before memory consumers`);
}

const calls = [];
const memory = { characterId: 'c1', version: 2 };
const archive = { id: 'a1', text: 'archive' };
const context = vm.createContext({
  window: {
    GameModules: {
      sqliteSave: {
        getCharacterMemory(characterId) { calls.push(['get', characterId]); return memory; },
        async saveCharacterMemory(characterId, value) { calls.push(['save', characterId, value]); return value; },
        listMemoryArchives(characterId) { calls.push(['listArchives', characterId]); return [archive]; },
        async saveMemoryArchive(characterId, item) { calls.push(['saveArchive', characterId, item]); return item; },
      },
    },
  },
});
vm.runInContext(fs.readFileSync(sourcePath, 'utf8'), context, { filename: 'character-memory-source.js' });
vm.runInContext(fs.readFileSync(storePath, 'utf8'), context, { filename: 'character-memory-store.js' });
const store = context.window.GameModules.characterMemoryStore;

assert.strictEqual(store.get('c1'), memory);
assert.deepStrictEqual(JSON.parse(JSON.stringify(store.listArchives('c1'))), [archive]);

async function run() {
  assert.strictEqual(await store.save('c1', memory), memory);
  assert.strictEqual(await store.saveArchive('c1', archive), archive);
  assert.deepStrictEqual(calls, [
    ['get', 'c1'],
    ['listArchives', 'c1'],
    ['save', 'c1', memory],
    ['saveArchive', 'c1', archive],
  ]);
  assert.strictEqual(context.window.GameModules.platform.core.storage.characterMemorySource, context.window.GameModules.platform.storage.characterMemorySource);

  for (const relativePath of consumers) {
    const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
    assert.doesNotMatch(
      source,
      /(?:window\.GameModules\.sqliteSave|save)\??\.(?:getCharacterMemory|saveCharacterMemory|listMemoryArchives|saveMemoryArchive)/u,
      `${relativePath} must access character memory through characterMemoryStore`,
    );
  }

  console.log('PASS character memory and archives use the shared store boundary');
}

run();
