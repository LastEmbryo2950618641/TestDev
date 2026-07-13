const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const runtimeFiles = [
  'publish/platform/storage/metadata-source.js',
  'publish/metadata-store.js',
  'publish/platform/storage/character-memory-maintenance-source.js',
  'publish/character-memory-maintenance-store.js',
  'publish/app/wechat/cleanup-orchestration.js',
];

for (const relativePath of runtimeFiles) {
  assert.ok(fs.existsSync(path.join(root, relativePath)), `${relativePath} must exist`);
}

for (const relativePath of [
  'publish/boot/scripts.json',
  'mobile/android-webview-shell/app/src/main/assets/publish/boot/scripts.json',
]) {
  const scripts = JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
  const cleanupIndex = scripts.indexOf('app/wechat/cleanup-orchestration.js');
  for (const dependency of [
    'platform/storage/metadata-source.js',
    'metadata-store.js',
    'platform/storage/character-memory-maintenance-source.js',
    'character-memory-maintenance-store.js',
  ]) {
    const dependencyIndex = scripts.indexOf(dependency);
    assert.ok(dependencyIndex >= 0 && dependencyIndex < cleanupIndex, `${relativePath} must load ${dependency} before cleanup orchestration`);
  }
}

const calls = [];
const oldText = '\u8054\u7cfb\u4eba\u56de\u590d\uff1alegacy';
const memoryRows = [{
  characterId: 'c1',
  memory: {
    shortTerm: { recent: [{ text: oldText }, { text: 'keep' }] },
    longTerm: {},
  },
}];
const archiveRows = [{ id: 'a1', characterId: 'c1', text: oldText }];
let marker = null;
const context = vm.createContext({
  console,
  Date,
  window: {
    GameModules: {
      app: { wechat: {} },
      sqliteSave: {
        db: {},
        getMetaJson(key) { calls.push(['getMeta', key]); return marker; },
        saveMetaJson(key, value) { calls.push(['saveMeta', key, value]); marker = value; return Promise.resolve(value); },
        listCharacterMemories() { calls.push(['listMemories']); return memoryRows; },
        replaceCharacterMemory(characterId, memory) { calls.push(['replaceMemory', characterId, memory]); },
        listAllMemoryArchives() { calls.push(['listArchives']); return archiveRows; },
        deleteMemoryArchive(id) { calls.push(['removeArchive', id]); },
      },
      storage: {
        snapshot(store) { calls.push(['snapshot', store]); return { ok: true }; },
        put(value) { calls.push(['put', value]); return Promise.resolve(); },
      },
    },
  },
});

for (const relativePath of runtimeFiles.slice(0, -1)) {
  vm.runInContext(fs.readFileSync(path.join(root, relativePath), 'utf8'), context, { filename: relativePath });
}

const metadataStore = context.window.GameModules.metadataStore;
const maintenanceStore = context.window.GameModules.characterMemoryMaintenanceStore;
assert.strictEqual(metadataStore.isAvailable(), true);
assert.strictEqual(maintenanceStore.isAvailable(), true);
assert.strictEqual(metadataStore.get('marker'), null);
assert.deepStrictEqual(JSON.parse(JSON.stringify(maintenanceStore.listMemories())), memoryRows);
assert.deepStrictEqual(JSON.parse(JSON.stringify(maintenanceStore.listArchives())), archiveRows);

calls.length = 0;
vm.runInContext(fs.readFileSync(path.join(root, runtimeFiles.at(-1)), 'utf8'), context, { filename: runtimeFiles.at(-1) });
const cleanup = context.window.GameModules.app.wechat.cleanupOrchestration;
const store = {
  realWorldlineState: {
    events: [{ eventId: 'wx_old', detail: oldText }, { eventId: 'keep', detail: 'keep' }],
    plots: [],
    pendingPlot: null,
  },
};

assert.strictEqual(cleanup.run(store), true);
assert.deepStrictEqual(JSON.parse(JSON.stringify(store.realWorldlineState.events)), [{ eventId: 'keep', detail: 'keep' }]);
const replaceCall = calls.find(([name]) => name === 'replaceMemory');
assert.ok(replaceCall, 'cleanup must replace a memory containing legacy WeChat text');
assert.deepStrictEqual(JSON.parse(JSON.stringify(replaceCall[2].shortTerm.recent)), [{ text: 'keep' }]);
assert.ok(calls.some(([name, id]) => name === 'removeArchive' && id === 'a1'), 'cleanup must remove matching archives');
assert.ok(calls.some(([name, key]) => name === 'saveMeta' && key === cleanup.version), 'cleanup must save its migration marker');

const cleanupSource = fs.readFileSync(path.join(root, runtimeFiles.at(-1)), 'utf8');
assert.doesNotMatch(cleanupSource, /window\.GameModules\.sqliteSave|\.db\b/u, 'cleanup orchestration must not access SQLite directly');

console.log('PASS WeChat cleanup uses metadata and character-memory maintenance stores');
