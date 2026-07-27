const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
let card;
const saves = [];
const context = vm.createContext({ console, Date, Math, String, Array, Object, Boolean, Number, JSON, window: { GameModules: {} } });
context.window.window = context.window;

function load(relativePath) {
  vm.runInContext(fs.readFileSync(path.join(root, relativePath), 'utf8'), context, { filename: relativePath });
}

load('publish/character-social-drive.js');
load('publish/character-intro-card.js');
card = context.window.GameModules.characterIntroCard.normalize({
  id: 'rel-ai-100',
  name: '陈默',
  worldTag: '现代都市世界',
  identity: { role: '同事', age: '26', gender: '女', job: '产品经理', baseLocation: '科技园B座' },
  persona: { appearance: '短发', personality: '沉稳', background: '互联网从业者', preferences: ['安静'], attraction: ['坦率'], voice: '简洁' },
  social: { relationToPlayer: '同事', relationDetail: '同组协作', affection: 40, familiarity: 50, lastContactAt: '2026-07-28T10:00:00+08:00', lastContactChannel: 'wechat', reach: ['wechat'] },
  agenda: { short: '完成方案', deadline: '2026-07-30', needPlayer: true, needPlayerWhy: '确认需求', urgency: 0.5, cooldownUntil: '2026-07-28T11:00:00+08:00' },
  routine: { tags: ['工作日上班'] },
  memory: { facts: ['玩家负责后端'] },
  links: { scheduleId: 'rel-ai-100', wechatContactId: 'wx-100', roleCardId: 'rel-ai-100' },
  meta: { source: 'scene', solidifyStatus: 'none', createdAt: '2026-07-01T00:00:00Z', updatedAt: '2026-07-28T10:00:00Z' },
}, null, 'scene');

context.window.GameModules.characterIntroStore = {
  getById: (id) => id === card.id ? card : null,
  get: (name) => name === card.name ? card : null,
  save(raw) {
    card = raw;
    saves.push(card);
    return card;
  },
};

load('publish/character-intro-update-operations.js');

const operations = context.window.GameModules.characterIntroUpdateOperations;
const subject = { id: card.id, name: card.name };
const systemBefore = {
  lastContactAt: card.social.lastContactAt,
  lastContactChannel: card.social.lastContactChannel,
  reach: JSON.stringify(card.social.reach),
  cooldownUntil: card.agenda.cooldownUntil,
  links: JSON.stringify(card.links),
  createdAt: card.meta.createdAt,
  source: card.meta.source,
};

function operation(field, op, extra = {}) {
  return { subject, field, op, reason: '本轮正文依据', ...extra };
}

(async () => {
  let result = await operations.apply(null, operation('identity.role', 'set', { value: '高级产品经理同事' }));
  assert.strictEqual(result.applied, true);
  assert.strictEqual(card.identity.role, '高级产品经理同事');

  result = await operations.apply(null, operation('social.affection', 'delta', { delta: 70 }));
  assert.strictEqual(result.applied, true);
  assert.strictEqual(card.social.affection, 100);
  result = await operations.apply(null, operation('social.familiarity', 'delta', { delta: -80 }));
  assert.strictEqual(result.applied, true);
  assert.strictEqual(card.social.familiarity, 0);

  result = await operations.apply(null, operation('persona.preferences', 'add', { value: '手冲咖啡' }));
  assert.strictEqual(result.applied, true);
  result = await operations.apply(null, operation('memory.facts', 'replace', { target: '玩家负责后端', value: '玩家负责服务端架构' }));
  assert.strictEqual(result.applied, true);
  result = await operations.apply(null, operation('routine.tags', 'delete', { target: '工作日上班' }));
  assert.strictEqual(result.applied, true);
  assert.ok(card.persona.preferences.includes('手冲咖啡'));
  assert.ok(card.memory.facts.includes('玩家负责服务端架构'));
  assert.strictEqual(card.routine.tags.length, 0);

  for (const invalid of [
    operation('social.lastContactAt', 'set', { value: '覆盖系统时间' }),
    operation('persona.preferences', 'set', { value: ['整组覆盖'] }),
    operation('social.affection', 'delta', { delta: 0 }),
    operation('memory.facts', 'replace', { target: '不存在事实', value: '不应新增' }),
    operation('skills', 'add', { value: '非法技术字段' }),
  ]) {
    result = await operations.apply(null, invalid);
    assert.strictEqual(result.applied, false, `${invalid.field}/${invalid.op} must be rejected`);
  }
  assert.strictEqual(card.memory.facts.length, 1, 'missing replace target must not become add');
  assert.strictEqual(card.social.lastContactAt, systemBefore.lastContactAt);
  assert.strictEqual(card.social.lastContactChannel, systemBefore.lastContactChannel);
  assert.strictEqual(JSON.stringify(card.social.reach), systemBefore.reach);
  assert.strictEqual(card.agenda.cooldownUntil, systemBefore.cooldownUntil);
  assert.strictEqual(JSON.stringify(card.links), systemBefore.links);
  assert.strictEqual(card.meta.createdAt, systemBefore.createdAt);
  assert.strictEqual(card.meta.source, systemBefore.source);
  assert.ok(saves.length >= 6);

  console.log('PASS intro card typed operations enforce field ownership');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
