const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const html = read('publish/index.html');
assert.ok(html.includes("!entry.transientError && ($store.game.hasRealWorldThinking(entry) || entry.promptPack)"));
assert.ok(html.includes('aria-label="查看生成提示词">提示词</button>'));
assert.ok(html.includes('realWorldThinkingLines(entry)'));
assert.ok(!html.includes('realWorldTraceLines(entry)"'));
assert.ok(html.includes('real-world-hud-emblem'));
assert.ok(html.includes('realWorldMatterButtonText()'));
assert.ok(html.includes('realWorldEntryIcon(entry)'));
assert.ok(html.includes('realWorldChoiceIcon(choice)'));
assert.ok(html.includes('realWorldStatusIcon($store.game.realWorldStatus)'));
assert.ok(html.includes('realWorldDisplayLog()'));
assert.ok(!html.includes('real-world-paired-player'));

const actions = read('publish/real-world-actions.js');
assert.ok(actions.includes('promptPack: null'));
assert.ok(actions.includes('thinkingSections: []'));
assert.ok(actions.includes('streamTrace: []'));

const context = { window: { GameModules: {} }, console };
vm.runInNewContext(read('publish/real-world-thinking-actions.js'), context, { filename: 'real-world-thinking-actions.js' });
const thinking = context.window.GameModules.realWorldThinkingActions;
const store = {
  realWorldLog: [],
  ...thinking,
};
assert.strictEqual(store.hasRealWorldThinking({ transientError: true, promptPack: { systemPrompt: 'x' }, thinking: '=' }), false);
assert.strictEqual(store.cleanRealWorldThinkingText('='), '');
assert.strictEqual(store.cleanRealWorldThinkingText('===---'), '');
assert.strictEqual(store.cleanRealWorldThinkingText('有效推演'), '有效推演');
assert.strictEqual(store.realWorldDisplayLog([
  { id: 'u1', type: 'user', text: 'same action' },
  { id: 'u2', type: 'user', text: 'same action' },
  { id: 'a1', type: 'ai', narration: 'AI request failed', transientError: true },
  { id: 'u3', type: 'user', text: 'same action' },
  { id: 'a2', type: 'ai', narration: 'AI request failed', transientError: true },
  { id: 'u4', type: 'user', text: 'new action' },
  { id: 'a3', type: 'ai', narration: 'normal result' },
  { id: 'u5', type: 'user', text: 'same action' },
]).map((entry) => entry.id).join(','), 'u1,a1,u4,a3,u5');

vm.runInNewContext(read('publish/real-world-utility-actions.js'), context, { filename: 'real-world-utility-actions.js' });
const utility = context.window.GameModules.realWorldUtilityActions;
assert.strictEqual(utility.realWorldChoiceIcon('检查手机记录'), '📱');
assert.strictEqual(utility.realWorldChoiceIcon('观察居住环境'), '🔎');
assert.strictEqual(utility.realWorldEntryIcon({ type: 'user' }), '🧍');
assert.strictEqual(utility.realWorldEntryIcon({ transientError: true }), '⚠️');
assert.strictEqual(utility.realWorldStatusIcon('当前目标'), '🎯');

console.log('PASS real world log UI hides failed prompt/thinking noise');
