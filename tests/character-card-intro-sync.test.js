const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const context = vm.createContext({ console, Date, Math, String, Array, Object, Boolean, Number, JSON, window: { GameModules: {} } });
context.window.window = context.window;

function load(relativePath) {
  vm.runInContext(fs.readFileSync(path.join(root, relativePath), 'utf8'), context, { filename: relativePath });
}

load('publish/current-location-field.js');
load('publish/character-social-drive.js');
load('publish/character-intro-card.js');

let intro = context.window.GameModules.characterIntroCard.normalize({
  id: 'rel-ai-200',
  name: '旧姓名',
  worldTag: '旧世界',
  identity: { role: '旧身份', age: '20', gender: '女', job: '旧职业', baseLocation: '旧地点' },
  persona: { appearance: '旧外貌', personality: '旧性格', background: '旧说明', preferences: ['旧偏好'], attraction: ['保留吸引点'], voice: '保留声音' },
  social: { relationToPlayer: '旧关系', relationDetail: '旧关系说明', affection: 10, familiarity: 20, lastContactAt: '2026-07-28T10:00:00+08:00', lastContactChannel: 'wechat', reach: ['wechat'] },
  agenda: { short: '旧议程', deadline: '', needPlayer: false, needPlayerWhy: '', urgency: 0.1, cooldownUntil: '2026-07-28T12:00:00+08:00' },
  links: { scheduleId: 'rel-ai-200', wechatContactId: 'wx-200', roleCardId: 'rel-ai-200' },
  meta: { source: 'scene', solidifyStatus: 'solidified', createdAt: '2026-07-01T00:00:00Z' },
}, null, 'scene');
const savedRoles = [];
context.window.GameModules.characterIntroStore = {
  getById: (id) => id === intro.id ? intro : null,
  get: (name) => name === intro.name ? intro : null,
  save(raw) {
    intro = raw;
    return intro;
  },
};
context.window.GameModules.characterStateStore = { save: (state) => { savedRoles.push(state); return state; } };

load('publish/character-intro-update-operations.js');
const sync = context.window.GameModules.characterIntroUpdateOperations;
load('publish/progression.js');
load('publish/progression-definitions.js');
load('publish/character-card-update-operations.js');
const role = {
  id: 'rel-ai-200',
  profile: {
    name: '陈默',
    worldTag: '出生世界甲',
    role: '产品负责人',
    age: 27,
    gender: '女',
    job: '产品经理',
    currentLocation: '当前世界乙·星河集团·东区·科技园B座·十二层产品部工位旁',
    detail: '负责核心产品线。',
    appearance: '短发与深色衬衫。',
    personality: '沉稳直接。',
    preferences: '偏爱安静与手冲咖啡。',
    socialDrive: {
      relationToPlayer: '同事',
      relationDetail: '长期同组协作',
      familiarity: 68,
      lastContactAt: '2026-07-28T10:00:00+08:00',
      lastContactChannel: 'wechat',
      reach: ['wechat'],
      agenda: { short: '周五前完成方案', deadline: '2026-07-31', needPlayer: true, needPlayerWhy: '确认接口', urgency: 0.8, cooldownUntil: '2026-07-28T12:00:00+08:00' },
    },
  },
  metrics: { playerFeelings: { 好感: 74 } },
};

(async () => {
  const systemBefore = {
    lastContactAt: intro.social.lastContactAt,
    lastContactChannel: intro.social.lastContactChannel,
    reach: JSON.stringify(intro.social.reach),
    cooldownUntil: intro.agenda.cooldownUntil,
    links: JSON.stringify(intro.links),
    createdAt: intro.meta.createdAt,
  };
  const syncedIntro = await sync.syncRoleToIntro(role, intro);
  assert.strictEqual(syncedIntro.name, '陈默');
  assert.strictEqual(syncedIntro.worldTag, '出生世界甲');
  assert.strictEqual(syncedIntro.identity.role, '产品负责人');
  assert.strictEqual(syncedIntro.identity.age, '27');
  assert.strictEqual(syncedIntro.identity.gender, '女');
  assert.strictEqual(syncedIntro.identity.job, '产品经理');
  assert.strictEqual(syncedIntro.identity.baseLocation, '科技园B座');
  assert.strictEqual(syncedIntro.persona.background, '负责核心产品线。');
  assert.strictEqual(syncedIntro.persona.appearance, '短发与深色衬衫。');
  assert.strictEqual(syncedIntro.persona.personality, '沉稳直接。');
  assert.ok(syncedIntro.persona.preferences.includes('偏爱安静与手冲咖啡。'));
  assert.strictEqual(syncedIntro.social.relationToPlayer, '同事');
  assert.strictEqual(syncedIntro.social.relationDetail, '长期同组协作');
  assert.strictEqual(syncedIntro.social.familiarity, 68);
  assert.strictEqual(syncedIntro.social.affection, 74);
  assert.strictEqual(syncedIntro.agenda.short, '周五前完成方案');
  assert.strictEqual(syncedIntro.social.lastContactAt, systemBefore.lastContactAt);
  assert.strictEqual(syncedIntro.social.lastContactChannel, systemBefore.lastContactChannel);
  assert.strictEqual(JSON.stringify(syncedIntro.social.reach), systemBefore.reach);
  assert.strictEqual(syncedIntro.agenda.cooldownUntil, systemBefore.cooldownUntil);
  assert.strictEqual(JSON.stringify(syncedIntro.links), systemBefore.links);
  assert.strictEqual(syncedIntro.meta.createdAt, systemBefore.createdAt);

  const promotedRole = { id: 'rel-ai-200', profile: { name: '陈默', socialDrive: {} }, metrics: { playerFeelings: {} } };
  await sync.syncIntroToRole(syncedIntro, promotedRole);
  assert.strictEqual(promotedRole.metrics.playerFeelings.好感, 74);
  assert.strictEqual(promotedRole.profile.socialDrive.familiarity, 68);
  assert.strictEqual(promotedRole.profile.socialDrive.relationToPlayer, '同事');
  assert.strictEqual(promotedRole.profile.socialDrive.relationDetail, '长期同组协作');
  assert.strictEqual(promotedRole.profile.socialDrive.reach[0], 'wechat');
  assert.strictEqual(promotedRole.profile.socialDrive.agenda.short, '周五前完成方案');
  assert.ok(savedRoles.length >= 1);

  let roleToIntroSyncCount = 0;
  const originalSyncRoleToIntro = sync.syncRoleToIntro.bind(sync);
  sync.syncRoleToIntro = async (...args) => {
    roleToIntroSyncCount += 1;
    return originalSyncRoleToIntro(...args);
  };
  const store = { itemSkillState: (id) => id === role.id ? role : null };
  const batch = await context.window.GameModules.characterCardUpdateOperations.applyMany(store, [
    { subject: { id: role.id, name: role.profile.name }, field: 'detail', op: 'set', value: '更新后说明', reason: '正文依据' },
    { subject: { id: role.id, name: role.profile.name }, field: 'personality', op: 'set', value: '更新后性格', reason: '正文依据' },
  ]);
  assert.strictEqual(batch.applied.length, 2);
  assert.strictEqual(roleToIntroSyncCount, 1, 'one role-card batch must synchronize its intro card once');
  assert.strictEqual(intro.persona.background, '更新后说明');
  assert.strictEqual(intro.persona.personality, '更新后性格');

  console.log('PASS role and intro cards synchronize owned fields deterministically');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
