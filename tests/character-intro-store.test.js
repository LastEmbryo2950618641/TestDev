const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'publish/platform/storage/character-intro-source.js');
const storePath = path.join(root, 'publish/character-intro-store.js');
const consumers = ['publish/character-intro-card.js', 'publish/character-query.js'];

assert.ok(fs.existsSync(sourcePath), 'character intro platform source must exist');
assert.ok(fs.existsSync(storePath), 'characterIntroStore must exist');

for (const relativePath of [
  'publish/boot/scripts.json',
  'mobile/android-webview-shell/app/src/main/assets/publish/boot/scripts.json',
]) {
  const scripts = JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
  const sourceIndex = scripts.indexOf('platform/storage/character-intro-source.js');
  const storeIndex = scripts.indexOf('character-intro-store.js');
  assert.ok(sourceIndex >= 0 && sourceIndex < storeIndex, `${relativePath} must load characterIntroSource before characterIntroStore`);
  for (const consumer of consumers) {
    assert.ok(storeIndex < scripts.indexOf(consumer.replace(/^publish\//u, '')), `${relativePath} must load characterIntroStore before ${consumer}`);
  }
}

const publishScripts = JSON.parse(fs.readFileSync(path.join(root, 'publish/boot/scripts.json'), 'utf8'));
const introCardIndex = publishScripts.indexOf('character-intro-card.js');
const introOperationsIndex = publishScripts.indexOf('character-intro-update-operations.js');
assert.ok(introOperationsIndex > introCardIndex, 'intro update operations must load after intro card normalization');
assert.ok(introOperationsIndex < publishScripts.indexOf('real-world-agent-loop.js'));

const calls = [];
const intro = { name: 'Alice', worldTag: 'world-a', intro: 'Known character' };
const context = vm.createContext({
  window: {
    GameModules: {
      sqliteSave: {
        getCharacterIntro(name, worldTag) { calls.push(['get', name, worldTag]); return intro; },
        listCharacterIntros() { calls.push(['list']); return [intro]; },
        saveCharacterIntro(card) { calls.push(['save', card]); return Promise.resolve(card); },
      },
    },
  },
});
vm.runInContext(fs.readFileSync(sourcePath, 'utf8'), context, { filename: 'character-intro-source.js' });
vm.runInContext(fs.readFileSync(storePath, 'utf8'), context, { filename: 'character-intro-store.js' });

async function run() {
  const store = context.window.GameModules.characterIntroStore;
  assert.strictEqual(store.get('Alice', 'world-a'), intro);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(store.list())), [intro]);
  assert.strictEqual(await store.save(intro), intro);
  assert.deepStrictEqual(calls, [['get', 'Alice', 'world-a'], ['list'], ['save', intro]]);
  assert.strictEqual(context.window.GameModules.platform.core.storage.characterIntroSource, context.window.GameModules.platform.storage.characterIntroSource);

  for (const relativePath of consumers) {
    const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
    assert.doesNotMatch(source, /window\.GameModules\.sqliteSave|(?:get|list|save)CharacterIntro/u, `${relativePath} must use characterIntroStore`);
  }

  console.log('PASS character intro consumers use the shared store boundary');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
