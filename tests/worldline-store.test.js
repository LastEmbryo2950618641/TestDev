const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'publish/platform/storage/worldline-source.js');
const storePath = path.join(root, 'publish/worldline-store.js');
const consumers = [
  'publish/app/wechat/memory-debug-orchestration.js',
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
        listWorldlineEvents(worldTag) { calls.push(['listEvents', worldTag]); return [{ eventId: 'event-1' }]; },
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

let eventQuery = '';
let eventBind = null;
let eventIndex = -1;
let eventFreed = false;
const sqliteContext = vm.createContext({
  window: {
    GameModules: {
      sqliteSave: {
        migrate() {},
        saveWorldLore() {},
        db: {
          prepare(sql) {
            eventQuery = sql;
            return {
              bind(params) { eventBind = params; },
              step() { eventIndex += 1; return eventIndex < 2; },
              getAsObject() { return { event_json: JSON.stringify({ eventId: `event-${eventIndex + 1}` }) }; },
              free() { eventFreed = true; },
            };
          },
        },
      },
    },
  },
});
vm.runInContext(fs.readFileSync(path.join(root, 'publish/sqlite-worldline.js'), 'utf8'), sqliteContext, { filename: 'sqlite-worldline.js' });
const persistedEvents = sqliteContext.window.GameModules.sqliteSave.listWorldlineEvents('world-a');
assert.deepStrictEqual(JSON.parse(JSON.stringify(persistedEvents)), [{ eventId: 'event-1' }, { eventId: 'event-2' }]);
assert.match(eventQuery, /WHERE world_tag=\? ORDER BY updated_at/u);
assert.deepStrictEqual(JSON.parse(JSON.stringify(eventBind)), ['world-a']);
assert.strictEqual(eventFreed, true);

async function run() {
  assert.strictEqual(await store.save('世界A', worldline), worldline);
  assert.deepStrictEqual(calls, [['get', '世界A'], ['save', '世界A', worldline]]);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(store.listEvents('world-a'))), [{ eventId: 'event-1' }]);
  assert.deepStrictEqual(calls.at(-1), ['listEvents', 'world-a']);
  assert.strictEqual(context.window.GameModules.platform.core.storage.worldlineSource, context.window.GameModules.platform.storage.worldlineSource);

  for (const relativePath of consumers) {
    const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
    assert.doesNotMatch(
      source,
      /(?:window\.GameModules\.sqliteSave|save)\??\.(?:db|(?:get|list|save)Worldline(?:Events)?)/u,
      `${relativePath} must access worldline state through worldlineStore`,
    );
  }

  console.log('PASS worldline consumers use the shared store boundary');
}

run();
