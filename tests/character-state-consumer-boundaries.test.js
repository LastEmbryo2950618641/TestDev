const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const consumers = [
  'publish/character-intro-card.js',
  'publish/character-query.js',
  'publish/character-profile.js',
  'publish/faction-archive.js',
  'publish/inference/material-loader.js',
  'publish/inference/scene-boundary.js',
  'publish/real-world-agent-location-fill.js',
  'publish/role-card-json-app/role-card-json-app.js',
  'publish/rpg-field-ui.js',
  'publish/rpg-state.js',
  'publish/wearing-sync-actions.js',
  'publish/wechat-actions.js',
];
const directCharacterMethod = /(?:window\.GameModules\.sqliteSave|save)\??\.(?:getCharacterStateByName|getCharacterState|listCharacterStates|saveCharacterState)/u;

const calls = [];
const context = vm.createContext({
  window: {
    GameModules: {
      sqliteSave: {
        getCharacterStateByName(name, worldTag) {
          calls.push([name, worldTag]);
          return { id: 'matched' };
        },
      },
    },
  },
});
vm.runInContext(fs.readFileSync(path.join(root, 'publish/platform/storage/character-state-source.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(root, 'publish/character-state-store.js'), 'utf8'), context);
assert.strictEqual(context.window.GameModules.characterStateStore.getByName('同名角色', '世界A')?.id, 'matched');
assert.deepStrictEqual(calls, [['同名角色', '世界A']], 'characterStateStore must preserve world-specific name lookup');

for (const relativePath of consumers) {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
  assert.doesNotMatch(
    source,
    directCharacterMethod,
    `${relativePath} must access character state through characterStateStore`,
  );
}

console.log('PASS shared character-state consumers avoid direct SQLite methods');
