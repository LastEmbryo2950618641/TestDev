const assert = require('assert');
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const vm = require('vm');

function loadSqliteSave(extra = {}) {
  const context = vm.createContext({
    console,
    window: {
      GameModules: {
        rpgState: {
          migrateProfileOwnedFields: () => false,
          ensureCurrentLocation: (state) => {
            if (state?.values && Object.prototype.hasOwnProperty.call(state.values, 'current_location')) {
              delete state.values.current_location;
              return true;
            }
            return false;
          },
        },
        platform: { core: { storage: { sqliteSlotSource: { read: () => null, write: () => {} } } } },
        ...extra,
      },
    },
  });
  context.window.window = context.window;
  const code = fs.readFileSync(path.join(__dirname, '..', 'publish/platform/storage/sqlite/save.js'), 'utf8');
  vm.runInContext(code, context, { filename: 'publish/platform/storage/sqlite/save.js' });
  return context.window.GameModules.sqliteSave;
}

test('sqlite listCharacterStates strips values.current_location before export', () => {
  const rows = [
    {
      id: 'rel-ai-1',
      profile: { id: 'rel-ai-1', name: '刘思琪', currentLocation: '中华人民共和国·四川省·成都市·武侯区·锦苑小区3栋·2单元202' },
      values: { current_location: { name: '锦苑小区3栋' } },
    },
  ];
  const sqliteSave = loadSqliteSave({
    sqliteSave: {},
  });
  sqliteSave.db = {
    prepare() {
      let done = false;
      return {
        step() {
          if (done) return false;
          done = true;
          return true;
        },
        getAsObject() {
          return { state_json: JSON.stringify(rows[0]) };
        },
        free() {},
      };
    },
  };

  const list = sqliteSave.listCharacterStates();
  assert.strictEqual(list[0].profile.currentLocation, '中华人民共和国·四川省·成都市·武侯区·锦苑小区3栋·2单元202');
  assert.strictEqual(list[0].values.current_location, undefined);
});

test('sqlite saveCharacterState strips values.current_location before persistence', async () => {
  const sqliteSave = loadSqliteSave();
  const writes = [];
  sqliteSave.db = {
    run(sql, params) {
      writes.push({ sql, params });
    },
  };
  sqliteSave.saveCharacterWorld = async () => {};
  sqliteSave.persist = async () => {};

  await sqliteSave.saveCharacterState({
    id: 'rel-ai-1',
    name: '刘思琪',
    worldTag: '2026 现代都市现实世界',
    profile: { id: 'rel-ai-1', name: '刘思琪', currentLocation: '中华人民共和国·四川省·成都市·武侯区·锦苑小区3栋·2单元202' },
    values: { current_location: { name: '锦苑小区3栋' } },
  });

  const serialized = JSON.parse(writes.find((item) => item.sql.includes('INSERT OR REPLACE INTO character_state'))?.params?.[3] || '{}');
  assert.strictEqual(serialized.profile.currentLocation, '中华人民共和国·四川省·成都市·武侯区·锦苑小区3栋·2单元202');
  assert.strictEqual(serialized.values.current_location, undefined);
});
