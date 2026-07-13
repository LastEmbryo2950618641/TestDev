const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const runtimeFiles = [
  'publish/platform/storage/profession-info-source.js',
  'publish/profession-info-store.js',
  'publish/platform/storage/rpg-definition-source.js',
  'publish/rpg-definition-store.js',
];
const consumers = ['publish/profession-info.js', 'publish/rpg-state.js'];

for (const relativePath of runtimeFiles) assert.ok(fs.existsSync(path.join(root, relativePath)), `${relativePath} must exist`);

for (const relativePath of [
  'publish/boot/scripts.json',
  'mobile/android-webview-shell/app/src/main/assets/publish/boot/scripts.json',
]) {
  const scripts = JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
  for (const [source, store] of [
    ['platform/storage/profession-info-source.js', 'profession-info-store.js'],
    ['platform/storage/rpg-definition-source.js', 'rpg-definition-store.js'],
  ]) {
    const sourceIndex = scripts.indexOf(source);
    const storeIndex = scripts.indexOf(store);
    assert.ok(sourceIndex >= 0 && sourceIndex < storeIndex, `${relativePath} must load ${source} before ${store}`);
    for (const consumer of consumers) assert.ok(storeIndex < scripts.indexOf(consumer.replace(/^publish\//u, '')), `${relativePath} must load ${store} before ${consumer}`);
  }
}

const calls = [];
const profession = { name: 'Reporter', worldTag: 'world-a' };
const attributes = { worldTag: 'world-a', fields: [{ key: 'focus' }] };
const schema = { worldTag: 'world-a', sections: [] };
const context = vm.createContext({
  window: {
    GameModules: {
      sqliteSave: {
        getProfessionInfo(worldTag, name) { calls.push(['getProfession', worldTag, name]); return profession; },
        saveProfessionInfo(worldTag, info) { calls.push(['saveProfession', worldTag, info]); return Promise.resolve(info); },
        getWorldAttributes(worldTag) { calls.push(['getAttributes', worldTag]); return attributes; },
        saveWorldAttributes(worldTag, value) { calls.push(['saveAttributes', worldTag, value]); return Promise.resolve(value); },
        getSchema(worldTag) { calls.push(['getSchema', worldTag]); return schema; },
        saveSchema(worldTag, value) { calls.push(['saveSchema', worldTag, value]); return Promise.resolve(value); },
        getCharacterWorld(characterId) { calls.push(['getWorld', characterId]); return 'world-a'; },
      },
    },
  },
});

for (const relativePath of [
  'publish/platform/storage/profession-info-source.js',
  'publish/profession-info-store.js',
  'publish/platform/storage/rpg-definition-source.js',
  'publish/rpg-definition-store.js',
  'publish/platform/storage/character-state-source.js',
  'publish/character-state-store.js',
]) {
  vm.runInContext(fs.readFileSync(path.join(root, relativePath), 'utf8'), context, { filename: relativePath });
}

async function run() {
  const professionStore = context.window.GameModules.professionInfoStore;
  const definitionStore = context.window.GameModules.rpgDefinitionStore;
  const stateStore = context.window.GameModules.characterStateStore;
  assert.strictEqual(professionStore.get('world-a', 'Reporter'), profession);
  assert.strictEqual(await professionStore.save('world-a', profession), profession);
  assert.strictEqual(definitionStore.getAttributes('world-a'), attributes);
  assert.strictEqual(await definitionStore.saveAttributes('world-a', attributes), attributes);
  assert.strictEqual(definitionStore.getSchema('world-a'), schema);
  assert.strictEqual(await definitionStore.saveSchema('world-a', schema), schema);
  assert.strictEqual(stateStore.getWorld('c1'), 'world-a');

  for (const relativePath of consumers) {
    const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
    assert.doesNotMatch(source, /window\.GameModules\.sqliteSave/u, `${relativePath} must use shared stores`);
  }

  console.log('PASS RPG definitions, profession info, and character-world reads use shared stores');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
