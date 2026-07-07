const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function loadBodyFigure() {
  const context = vm.createContext({
    console,
    window: {
      GameModules: {
        appearanceProfileTags: {
          normalizeNaturalMeta(meta = {}) { return meta; },
        },
      },
    },
  });
  context.window.window = context.window;
  const code = fs.readFileSync(path.join(__dirname, '..', 'publish/body-figure.js'), 'utf8');
  vm.runInContext(code, context, { filename: 'publish/body-figure.js' });
  return context.window.GameModules.bodyFigure;
}

test('male profile only scores generic male preset folders', () => {
  const bodyFigure = loadBodyFigure();
  bodyFigure.figureEntries = [
    { id: 'female-base', path: 'female/female-base', default: true },
    { id: 'male-base', path: 'male/male-base', default: true },
  ];
  bodyFigure.manifestEntries = [];
  bodyFigure.metaCache = {
    'female/female-base': { gender: 'female', overall: ['少女'], figure: ['纤细'] },
    'male/male-base': { gender: 'male', overall: ['青年'], figure: ['匀称'] },
  };
  const scored = bodyFigure.scoredFigures({ gender: '男', overall: ['青年'], figure: ['匀称'] }, []);
  assert.ok(scored.length >= 1);
  assert.ok(scored.every((item) => !String(item.entry.path || '').startsWith('female/')));
  assert.strictEqual(scored[0].entry.path, 'male/male-base');
});

test('female profile only scores generic female preset folders', () => {
  const bodyFigure = loadBodyFigure();
  bodyFigure.figureEntries = [
    { id: 'female-base', path: 'female/female-base', default: true },
    { id: 'male-base', path: 'male/male-base', default: true },
  ];
  bodyFigure.manifestEntries = [];
  bodyFigure.metaCache = {
    'female/female-base': { gender: 'female', overall: ['少女'], figure: ['纤细'] },
    'male/male-base': { gender: 'male', overall: ['青年'], figure: ['匀称'] },
  };
  const scored = bodyFigure.scoredFigures({ gender: '女', overall: ['少女'], figure: ['纤细'] }, []);
  assert.ok(scored.length >= 1);
  assert.ok(scored.every((item) => !String(item.entry.path || '').startsWith('male/')));
  assert.strictEqual(scored[0].entry.path, 'female/female-base');
});

(async () => {
  for (const item of tests) {
    await item.fn();
    console.log(`PASS ${item.name}`);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
