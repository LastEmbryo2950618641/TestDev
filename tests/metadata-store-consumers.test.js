const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const calls = [];
const values = {
  writing_styles: {
    active: ['dark'],
    custom: [{ id: 'custom-one', name: 'Custom', prompt: 'Custom prompt' }],
  },
};
const context = vm.createContext({
  window: {
    GameModules: {
      sqliteSave: {
        db: {},
        getMetaJson(key) { calls.push(['get', key]); return values[key] ?? null; },
        saveMetaJson(key, value, options) { calls.push(['save', key, value, options]); values[key] = value; return Promise.resolve(value); },
      },
      penStyleRegistry: {
        list() {
          return [
            { id: 'literary', name: 'Literary', prompt: 'Literary prompt' },
            { id: 'dark', name: 'Dark', prompt: 'Dark prompt' },
            { id: 'spring-heart', name: 'Spring Heart', prompt: 'Spring prompt' },
          ];
        },
      },
    },
  },
});

for (const relativePath of [
  'publish/platform/storage/metadata-source.js',
  'publish/metadata-store.js',
  'publish/style-actions.js',
]) {
  vm.runInContext(fs.readFileSync(path.join(root, relativePath), 'utf8'), context, { filename: relativePath });
}

async function run() {
  const options = { deferPersist: true };
  const styleActions = context.window.GameModules.styleActions;
  const store = { ...styleActions };
  await store.loadWritingStyles(options);

  assert.deepStrictEqual(JSON.parse(JSON.stringify(store.activeStyleIds)), ['dark']);
  assert.strictEqual(store.customWritingStyles[0].id, 'custom-one');
  const saveCall = calls.find(([name, key]) => name === 'save' && key === 'writing_styles');
  assert.ok(saveCall, 'style actions must save through metadataStore');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(saveCall[3])), options);
  assert.strictEqual(saveCall[2].defaultWritingStyleId, 'spring-heart');

  values.writing_styles = { active: ['literary'], custom: [] };
  calls.length = 0;
  const legacyStore = { ...styleActions };
  await legacyStore.loadWritingStyles(options);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(legacyStore.activeStyleIds)), ['spring-heart']);

  values.writing_styles = { active: ['literary'], defaultWritingStyleId: 'spring-heart', custom: [] };
  calls.length = 0;
  const explicitLiteraryStore = { ...styleActions };
  await explicitLiteraryStore.loadWritingStyles(options);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(explicitLiteraryStore.activeStyleIds)), ['literary']);

  for (const relativePath of ['publish/known-profession-actions.js', 'publish/style-actions.js']) {
    const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
    assert.doesNotMatch(source, /window\.GameModules\.sqliteSave|getMetaJson|saveMetaJson/u, `${relativePath} must use metadataStore`);
  }

  console.log('PASS metadata consumers preserve values and deferred persistence options');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
