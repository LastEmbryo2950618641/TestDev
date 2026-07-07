const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function loadScript(context, relPath) {
  const file = path.join(__dirname, '..', relPath);
  const code = fs.readFileSync(file, 'utf8');
  vm.runInContext(code, context, { filename: relPath });
}

function createStore(gender = '男') {
  const context = vm.createContext({
    console,
    window: {
      GameModules: {},
    },
  });
  context.window.window = context.window;
  loadScript(context, 'publish/wechat-album-tags.js');
  const contact = { id: 'player-self', name: '测试', relation: '玩家' };
  const store = {
    ...context.window.GameModules.wechatAlbumTagActions,
    selectedDrawProviderId: () => 'pixai',
    wechatProfileContact: () => contact,
    wechatAlbumStateData: () => ({ state: {}, profile: { gender } }),
  };
  return { store, contact };
}

test('pixai male natural fixed tags use male natural body tag set', () => {
  const { store, contact } = createStore('男');
  assert.strictEqual(
    store.wechatAlbumFixedTags('natural', 'pixai', contact),
    '赤身, 全身, 无遮掩, 双腿, 站立',
  );
});

test('pixai male dressed fixed tags use male dressed tag set', () => {
  const { store, contact } = createStore('男');
  assert.strictEqual(
    store.wechatAlbumFixedTags('dressed', 'pixai', contact),
    '全身, 双腿, 站立',
  );
});

test('male prompt strips legacy female fixed tags before appending male natural tags', () => {
  const { store, contact } = createStore('男');
  assert.strictEqual(
    store.appendWechatAlbumFixedTags(
      '1boy, solo, full body, standing, 赤身, 全身, 无遮掩, 美乳, 双腿, 玉足, 站立',
      'natural',
      contact,
    ),
    '1boy, solo, full body, standing, 赤身, 全身, 无遮掩, 双腿, 站立',
  );
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
