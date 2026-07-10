const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function loadScript(context, relativePath) {
  const file = path.join(root, relativePath);
  const code = fs.readFileSync(file, 'utf8');
  vm.runInContext(code, context, { filename: relativePath });
}

function createContext() {
  const context = vm.createContext({
    console,
    window: {},
  });
  context.window.window = context.window;
  context.window.GameModules = {};
  return context;
}

function setupModules() {
  const context = createContext();
  loadScript(context, 'publish/control-experience-config.js');
  loadScript(context, 'publish/control-experience-stage.js');
  loadScript(context, 'publish/control-experience-config-app.js');
  return context.window.GameModules;
}

test('default state inherits normalized config defaults', () => {
  const modules = setupModules();
  const state = modules.controlExperienceConfigApp.defaultState();

  assert.strictEqual(state.open, false);
  assert.strictEqual(state.enabled, true);
  assert.strictEqual(typeof state.masterPrompt, 'string');
  assert.ok(Array.isArray(state.previewItems));
});

test('preview sync renders stage-aware prompt previews', () => {
  const modules = setupModules();
  const store = {
    controlExperienceConfigState: {
      enabled: true,
      masterPrompt: '阶段={{上线阶段}}|次数={{上线次数}}|适应={{适应度}}|对象={{被控制者}}',
    },
  };

  const items = modules.controlExperienceConfigApp.syncControlExperiencePreview(store);

  assert.ok(Array.isArray(items));
  assert.ok(items.length > 0);
  assert.ok(items[0].promptText.includes('阶段=首次上线 / 极低适应'));
  assert.ok(items[0].promptText.includes('次数=0'));
  assert.ok(items[0].promptText.includes('适应=8'));
  assert.ok(items[0].promptText.includes('对象=林夏'));
});

test('open save reset and close keep config app state consistent', () => {
  const modules = setupModules();
  const app = modules.controlExperienceConfigApp;
  const store = {
    desktopUnlocked: false,
    controlExperienceConfigState: app.defaultState(),
    closeDesktopApps() {
      this.desktopAppsClosed = true;
      if (this.controlExperienceConfigState) this.controlExperienceConfigState.open = false;
    },
    closeAppToDesktop() {
      this.closedToDesktop = true;
    },
  };
  Object.assign(store, app);

  store.openControlExperienceConfigApp();
  assert.strictEqual(store.desktopAppsClosed, true);
  assert.strictEqual(store.desktopUnlocked, true);
  assert.strictEqual(store.controlExperienceConfigState.open, true);
  assert.ok(store.controlExperienceConfigState.previewItems.length > 0);

  store.controlExperienceConfigState.masterPrompt = '自定义提示词';
  store.saveControlExperienceConfig();
  assert.strictEqual(store.controlExperienceConfigState.masterPrompt, '自定义提示词');
  assert.ok(store.controlExperienceConfigState.message.includes('已保存'));

  store.resetControlExperiencePrompt();
  assert.notStrictEqual(store.controlExperienceConfigState.masterPrompt, '自定义提示词');
  assert.ok(store.controlExperienceConfigState.message.includes('默认'));

  store.closeControlExperienceConfigApp();
  assert.strictEqual(store.controlExperienceConfigState.open, false);
  assert.strictEqual(store.closedToDesktop, true);
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
