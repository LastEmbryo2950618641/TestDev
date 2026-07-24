const assert = require('assert');
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const vm = require('vm');

function loadScript(relativePath, sandbox) {
  const file = path.join(__dirname, '..', 'publish', relativePath);
  vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: relativePath });
}

function createSandbox() {
  const window = { GameModules: {} };
  window.window = window;
  const sandbox = vm.createContext({ console, window });
  loadScript('player-aspiration-preference-layers.js', sandbox);
  loadScript('character-query.js', sandbox);
  loadScript('inference/agent-context-core.js', sandbox);
  sandbox.window.GameModules.realWorldAgentContext = {
    ...sandbox.window.GameModules.realWorldAgentContextParts.core,
    recentWorldline() { return ''; },
    recentSummary() { return ''; },
    redactNarrationPollution(text = '') { return String(text || ''); },
    limit(text = '', max = 1000) { return String(text || '').slice(0, max); },
  };
  // real-world-agent-context.js overwrites realWorldAgentContext; load after stubbing map.
  sandbox.window.GameModules.realWorldMap = { ensure: () => ({ current: '测试地点' }) };
  loadScript('real-world-agent-context.js', sandbox);
  return sandbox.window;
}

test('characterQuery.stateText includes destiny log and goals from lifeOrientation', () => {
  const window = createSandbox();
  const text = window.GameModules.characterQuery.stateText({
    id: 'player-self',
    name: '刘悠',
    profile: {
      name: '刘悠',
      role: '程序员',
      essentialPreferenceLayers: {
        layer1: '价值立场偏好: 守序邪恶',
      },
      lifeOrientation: {
        portraitSummary: '守序邪恶的理性掌控者画像',
        goals: {
          summary: '在底线内追求支配',
          short: '建立技术影响力',
          medium: '晋升主管',
          long: '掌控妹妹人生选择',
        },
      },
    },
  });
  assert.match(text, /价值立场偏好/);
  assert.match(text, /人生总结：守序邪恶的理性掌控者画像/);
  assert.match(text, /目标摘要：在底线内追求支配/);
  assert.match(text, /近期目标：建立技术影响力/);
  assert.match(text, /中期目标：晋升主管/);
  assert.match(text, /长期目标：掌控妹妹人生选择/);
});

test('loadedNarrationSummary keeps full role-card lines without field whitelist', () => {
  const window = createSandbox();
  const core = window.GameModules.realWorldAgentContextParts.core;
  const summary = core.loadedNarrationSummary([
    {
      title: '自动资料：刘悠角色卡',
      text: [
        '资料类型：完整角色卡',
        '姓名：刘悠',
        '价值立场偏好: 守序邪恶',
        '人生总结：守序邪恶的理性掌控者画像',
        '近期目标：建立技术影响力',
        '全新字段：也应保留',
        'elapsedSeconds：12',
      ].join('\n'),
    },
  ]);
  assert.match(summary, /价值立场偏好/);
  assert.match(summary, /人生总结/);
  assert.match(summary, /近期目标/);
  assert.match(summary, /全新字段：也应保留/);
  assert.doesNotMatch(summary, /elapsedSeconds/);
});

test('role-card summaries pass through without length truncation', () => {
  const window = createSandbox();
  const core = window.GameModules.realWorldAgentContextParts.core;
  const longTail = `尾部标记：${'很长内容'.repeat(800)}`;
  const text = [
    '资料类型：完整角色卡',
    '姓名：刘悠',
    '人生总结：DESTINY LOG',
    longTail,
  ].join('\n');
  const routing = core.loadedRoleCardRoutingSummary({ title: '角色卡', text });
  const narration = core.loadedNarrationSummary([{ title: '自动资料：刘悠角色卡', text }]);
  const loaded = core.buildLoadedText([{ title: '自动资料：刘悠角色卡', text, unlimited: true, max: 0 }]);
  assert.match(routing, /尾部标记/);
  assert.match(narration, /尾部标记/);
  assert.match(loaded, /尾部标记/);
  assert.ok(routing.includes(longTail));
  assert.ok(narration.includes(longTail));
});

test('buildNarrationContext injects player life orientation for Stage3', () => {
  const window = createSandbox();
  const text = window.GameModules.realWorldAgentContext.buildNarrationContext({
    store: {
      playerName: '刘悠',
      playerSetupSummary: () => '刘悠｜程序员',
      playerAspirationSummary: () => '本质偏好五层（永久固化）：\n价值立场偏好: 守序邪恶\n人生总结：DESTINY LOG\n近期目标：建立技术影响力',
      phoneDateText: () => '2026-07-23',
      phoneTimeText: () => '12:00',
      realWorldLocationName: '锦苑小区',
      realWorldSceneTitle: '家中',
    },
    action: '观察妹妹',
    config: { label: '现实' },
  });
  assert.match(text, /人生取向：/);
  assert.match(text, /DESTINY LOG/);
  assert.match(text, /近期目标：建立技术影响力/);
});
