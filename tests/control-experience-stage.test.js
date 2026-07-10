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

function setupStage(loadConfig = true) {
  const context = createContext();
  if (loadConfig) loadScript(context, 'publish/control-experience-config.js');
  loadScript(context, 'publish/control-experience-stage.js');
  return context.window.GameModules;
}

test('first-time low-adaptation resolves to first/veryLow metadata', () => {
  const modules = setupStage();
  const meta = modules.controlExperienceStage.resolveStageMeta({ onlineCount: 0, adaptation: 10 });

  assert.strictEqual(meta.onlineCount, 0);
  assert.strictEqual(meta.adaptation, 10);
  assert.strictEqual(meta.countTier, 'first');
  assert.strictEqual(meta.adaptationTier, 'veryLow');
  assert.strictEqual(meta.onlineTier, 'first');
  assert.strictEqual(meta.stageKey, 'first.veryLow');
  assert.strictEqual(meta.stageLabel, '首次上线 / 极低适应');
});

test('stageDescription remains neutral for first-time low-adaptation case', () => {
  const modules = setupStage();
  const meta = modules.controlExperienceStage.resolveStageMeta({ onlineCount: 0, adaptation: 0 });

  assert.ok(meta.stageDescription.includes('第一次经历'));
  assert.ok(meta.stageDescription.includes('尚未形成稳定的应对方式'));
  assert.ok(!meta.stageDescription.includes('恐惧'));
  assert.ok(!meta.stageDescription.includes('顺从'));
});

test('threshold boundaries map to the expected tiers', () => {
  const modules = setupStage();
  const stage = modules.controlExperienceStage;

  assert.strictEqual(stage.resolveStageMeta({ onlineCount: 10, adaptation: 10 }).countTier, 'earlyRepeat');
  assert.strictEqual(stage.resolveStageMeta({ onlineCount: 11, adaptation: 10 }).countTier, 'familiar');
  assert.strictEqual(stage.resolveStageMeta({ onlineCount: 30, adaptation: 10 }).countTier, 'familiar');
  assert.strictEqual(stage.resolveStageMeta({ onlineCount: 31, adaptation: 10 }).countTier, 'seasoned');
  assert.strictEqual(stage.resolveStageMeta({ onlineCount: 1, adaptation: 10 }).adaptationTier, 'veryLow');
  assert.strictEqual(stage.resolveStageMeta({ onlineCount: 1, adaptation: 11 }).adaptationTier, 'low');
  assert.strictEqual(stage.resolveStageMeta({ onlineCount: 1, adaptation: 35 }).adaptationTier, 'low');
  assert.strictEqual(stage.resolveStageMeta({ onlineCount: 1, adaptation: 36 }).adaptationTier, 'medium');
  assert.strictEqual(stage.resolveStageMeta({ onlineCount: 1, adaptation: 65 }).adaptationTier, 'medium');
  assert.strictEqual(stage.resolveStageMeta({ onlineCount: 1, adaptation: 66 }).adaptationTier, 'high');
});

test('normalization clamps and floors numeric inputs', () => {
  const modules = setupStage();
  const meta = modules.controlExperienceStage.resolveStageMeta({
    onlineCount: '-3.8',
    adaptation: '35.9',
  });

  assert.strictEqual(meta.onlineCount, 0);
  assert.strictEqual(meta.adaptation, 35);
  assert.strictEqual(meta.countTier, 'first');
  assert.strictEqual(meta.adaptationTier, 'low');
});

test('renderPromptBlock replaces variables in both template styles', () => {
  const modules = setupStage();
  const stage = modules.controlExperienceStage;

  const rendered = stage.renderPromptBlock({
    config: {
      enabled: true,
      masterPrompt: [
        '目标: ${被控制者}',
        '次数: {{上线次数}}',
        '适应: ${适应度}',
        '阶段: {{上线阶段}}',
        '说明: ${阶段说明}',
        '性格: ${角色性格}',
        '身份: {{角色身份}}',
        '场景: ${当前场景}',
      ].join('\n'),
    },
    onlineCount: 12,
    adaptation: 40,
    variables: {
      被控制者: '林夏',
      角色性格: '冷静克制',
      角色身份: '调查记者',
      当前场景: '深夜办公室',
    },
  });

  assert.ok(rendered.includes('目标: 林夏'));
  assert.ok(rendered.includes('次数: 12'));
  assert.ok(rendered.includes('适应: 40'));
  assert.ok(rendered.includes('阶段: 熟悉上线 / 中适应'));
  assert.ok(rendered.includes('说明:'));
  assert.ok(rendered.includes('性格: 冷静克制'));
  assert.ok(rendered.includes('身份: 调查记者'));
  assert.ok(rendered.includes('场景: 深夜办公室'));
  assert.ok(!rendered.includes('${'));
  assert.ok(!rendered.includes('{{'));
});

test('derived stage values cannot be overridden by caller variables', () => {
  const modules = setupStage();
  const rendered = modules.controlExperienceStage.renderPromptBlock({
    config: {
      enabled: true,
      masterPrompt: '次数=${上线次数}|适应=${适应度}|阶段=${上线阶段}|说明=${阶段说明}',
    },
    onlineCount: 6,
    adaptation: 22,
    variables: {
      上线次数: 999,
      适应度: 999,
      上线阶段: '伪造阶段',
      阶段说明: '伪造说明',
    },
  });

  assert.ok(rendered.includes('次数=6'));
  assert.ok(rendered.includes('适应=22'));
  assert.ok(rendered.includes('阶段=早期重复上线 / 低适应'));
  assert.ok(!rendered.includes('999'));
  assert.ok(!rendered.includes('伪造'));
});

test('disabled config returns an empty prompt block even without config module loaded', () => {
  const modules = setupStage(false);
  const stage = modules.controlExperienceStage;

  assert.strictEqual(
    stage.renderPromptBlock({
      config: { enabled: 'false', masterPrompt: 'ignored' },
      onlineCount: 3,
      adaptation: 20,
      variables: { 被控制者: '林夏' },
    }),
    '',
  );
});

test('config module exposes composable preview cases and normalized defaults', () => {
  const context = createContext();
  loadScript(context, 'publish/control-experience-config.js');
  loadScript(context, 'publish/control-experience-stage.js');
  const config = context.window.GameModules.controlExperienceConfig;
  const stage = context.window.GameModules.controlExperienceStage;

  const normalized = config.normalize({ enabled: 'yes' });
  const previews = config.previewCases();
  const rendered = stage.renderPromptBlock({
    config: config.defaultConfig(),
    ...previews[0],
  });

  assert.strictEqual(normalized.enabled, true);
  assert.strictEqual(typeof normalized.masterPrompt, 'string');
  assert.ok(Array.isArray(previews));
  assert.ok(previews.length > 0);
  assert.ok(previews.every((item) => item && typeof item === 'object'));
  assert.ok(previews.every((item) => item.variables && item.variables.被控制者));
  assert.ok(rendered.includes(previews[0].variables.被控制者));
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
