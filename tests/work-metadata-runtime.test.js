const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const publish = path.join(root, 'publish');
const context = {
  console,
  window: {
    GameData: {},
    GameModules: {
      cache: { enabled: () => false },
    },
  },
};
context.window.window = context.window;
vm.createContext(context);

function run(relative) {
  const file = path.join(publish, relative);
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}

context.window.GameBoot = {
  async loadScripts(files) {
    files.forEach(run);
  },
};

run('work-metadata-manifest.js');
run('work-metadata-loader.js');
run('catalog.js');

(async () => {
  const catalog = await context.window.GameModules.catalog.load();
  assert.strictEqual(catalog.works.length, 13);
  assert.strictEqual(context.window.GameData.loreSources.length, 13);
  assert.strictEqual(Object.keys(context.window.GameData.storyStarts).length, 14);
  assert.strictEqual(
    context.window.GameModules.catalog.characters('刀剑神域').find((character) => character.name === '桐人').id,
    'char-57486be34fcb',
  );
  console.log('work metadata runtime tests passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
