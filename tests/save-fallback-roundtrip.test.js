const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
function loadScript(context, relativePath) {
  vm.runInNewContext(fs.readFileSync(path.join(root, relativePath), 'utf8'), context, { filename: relativePath });
}

async function main() {
  const rawByKey = new Map();
  const context = {
    window: {
      location: { protocol: 'file:' },
      GameModules: {
        platform: {
          core: {
            storage: {
              sqliteSlotSource: {
                read(key) { return rawByKey.get(key) || null; },
                write(key, value) { rawByKey.set(key, value); return true; },
                remove(key) { rawByKey.delete(key); return true; },
              },
            },
          },
        },
      },
    },
    console,
    JSON,
    String,
    Number,
    Object,
    Array,
    Boolean,
    Date,
    Promise,
    Error,
    Map,
    Set,
    Uint8Array,
    WeakSet,
    CompressionStream,
    DecompressionStream,
    Blob,
    Response,
    btoa,
    atob,
  };
  loadScript(context, 'publish/platform/storage/sqlite/save.js');
  const save = context.window.GameModules.sqliteSave;
  await save.open('slot-1');
  const completeState = {
    started: true,
    realWorldMap: { current: '锦苑小区3栋', nodes: [{ id: 'home', name: '锦苑小区3栋' }] },
    locationGraph: {
      nodesById: {
        home: {
          id: 'home',
          name: '锦苑小区3栋',
          positionInfo: { positionChain: ['2单元', '601室', '刘思琪房间内'], items: [{ name: '书包', place: '椅子上' }] },
        },
      },
    },
  };
  await save.saveGameState(completeState);
  assert.match(rawByKey.get('control-rpg-sqlite-slot-1'), /^gzip:/u, 'file saves use compressed complete snapshots when supported');
  save.fallbackState = null;
  await save.open('slot-1');
  const restored = await save.loadGameState();
  assert.deepStrictEqual(restored.locationGraph.nodesById.home.positionInfo.positionChain, ['2单元', '601室', '刘思琪房间内']);
  assert.strictEqual(restored.locationGraph.nodesById.home.positionInfo.items[0].name, '书包');

  context.window.dzmm = { kv: { async get() { throw new Error('bridge must not be called for file: storage'); } } };
  assert.ok(await save.readRaw('slot-1'), 'file: reads must use the local slot snapshot directly');
  await save.saveGameState({ ...completeState, marker: 'bridge-must-not-block-file-save' });
  delete context.window.dzmm;

  context.window.GameModules.platform.core.storage.sqliteSlotSource.write = () => false;
  await assert.rejects(
    () => save.saveGameState({ ...completeState, marker: 'must-fail' }),
    /本地存档写入失败/u,
    'failed localStorage writes must not be reported as successful saves',
  );

  await assert.rejects(
    () => save.readFallbackState('gzip:invalid'),
    /本地存档读取失败/u,
    'corrupt snapshots must not silently become empty saves',
  );

  console.log('PASS fallback save roundtrip preserves complete map state and rejects failed writes');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
