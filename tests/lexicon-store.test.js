const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'publish/platform/storage/lexicon-source.js');
const storePath = path.join(root, 'publish/lexicon-store.js');
const consumers = [
  'publish/item-skill-actions.js',
  'publish/lexicon-skill.js',
  'publish/prompts/materials/real-world-material-query.js',
  'publish/rpg-lexicon.js',
];

assert.ok(fs.existsSync(sourcePath), 'lexicon platform source must exist');
assert.ok(fs.existsSync(storePath), 'lexiconStore must exist');

for (const relativePath of [
  'publish/boot/scripts.json',
  'mobile/android-webview-shell/app/src/main/assets/publish/boot/scripts.json',
]) {
  const scripts = JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
  const sourceIndex = scripts.indexOf('platform/storage/lexicon-source.js');
  const storeIndex = scripts.indexOf('lexicon-store.js');
  assert.ok(sourceIndex >= 0 && sourceIndex < storeIndex, `${relativePath} must load lexiconSource before lexiconStore`);
  for (const consumer of consumers) {
    const consumerEntry = consumer.replace(/^publish\//u, '');
    assert.ok(storeIndex < scripts.indexOf(consumerEntry), `${relativePath} must load lexiconStore before ${consumer}`);
  }
}

const calls = [];
const context = vm.createContext({
  window: {
    GameModules: {
      sqliteSave: {
        db: {},
        getLexiconEntry(worldTag, kind, name) { calls.push(['get', worldTag, kind, name]); return null; },
        listLexiconEntries(worldTag, kind) { calls.push(['list', worldTag, kind]); return [{ worldTag, kind, name: 'known' }]; },
        saveLexiconEntry(entry) { calls.push(['save', entry]); return Promise.resolve(entry); },
        saveLexiconEntries(entries) { calls.push(['saveMany', entries]); return Promise.resolve(entries); },
      },
      playerAspirationPreferenceLayers: { isImmutableFieldName: () => false },
    },
  },
});

for (const relativePath of [
  'publish/platform/storage/lexicon-source.js',
  'publish/lexicon-store.js',
  'publish/rpg-lexicon.js',
  'publish/lexicon-skill.js',
]) {
  vm.runInContext(fs.readFileSync(path.join(root, relativePath), 'utf8'), context, { filename: relativePath });
}

async function run() {
  const store = context.window.GameModules.lexiconStore;
  assert.strictEqual(store.isAvailable(), true);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(store.list('world-a', 'item'))), [{ worldTag: 'world-a', kind: 'item', name: 'known' }]);

  const changed = await context.window.GameModules.rpgLexicon.applyLexiconSkill([
    { worldTag: 'world-a', kind: 'item', name: 'new-item', description: 'detail' },
  ]);
  assert.strictEqual(changed.length, 1);
  const saveManyCall = calls.find(([name]) => name === 'saveMany');
  assert.ok(saveManyCall, 'lexicon skill must use one batched store save');
  assert.strictEqual(saveManyCall[1][0].name, 'new-item');

  for (const relativePath of consumers) {
    const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
    assert.doesNotMatch(source, /window\.GameModules\.sqliteSave|\.db\b|\.persist\(/u, `${relativePath} must use lexiconStore`);
  }

  let runCount = 0;
  let persistCount = 0;
  const sqliteContext = vm.createContext({
    Date,
    window: {
      GameModules: {
        sqliteSave: {
          db: { run() { runCount += 1; } },
          async persist() { persistCount += 1; },
        },
      },
    },
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'publish/sqlite-world.js'), 'utf8'), sqliteContext, { filename: 'sqlite-world.js' });
  await sqliteContext.window.GameModules.sqliteSave.saveLexiconEntries([
    { worldTag: 'world-a', kind: 'item', name: 'one', source: 'test' },
    { worldTag: 'world-a', kind: 'item', name: 'two', source: 'test' },
  ]);
  assert.strictEqual(runCount, 2);
  assert.strictEqual(persistCount, 1);

  console.log('PASS lexicon consumers use one shared store and preserve batched persistence');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
