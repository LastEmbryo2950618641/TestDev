const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const context = vm.createContext({
  window: { GameModules: {} },
  Array,
  Boolean,
  Date,
  JSON,
  Map,
  Math,
  Number,
  Object,
  Promise,
  RegExp,
  Set,
  String,
  console,
});

function load(relativePath) {
  vm.runInContext(fs.readFileSync(path.join(root, relativePath), 'utf8'), context, { filename: relativePath });
}

load('publish/character-social-drive.js');
load('publish/inference/intro-card-stage-update.js');

const social = context.window.GameModules.characterSocialDrive;
const stage = context.window.GameModules.inferenceIntroCardStageUpdate;
const legacy = social.normalize({
  agenda: { short: '准备期末考试', needPlayer: false, urgency: 0.7 },
});
assert.strictEqual(legacy.agenda.short, '准备期末考试');
assert.deepStrictEqual(JSON.parse(JSON.stringify(legacy.ideas)), []);

const roleState = {
  id: 'rel-ai-ideas-1',
  name: '林青',
  profile: {
    name: '林青',
    socialDrive: {
      agenda: { short: '准备期末考试', needPlayer: false, urgency: 0.7 },
      ideas: [
        { id: 'idea-old-1', title: '洗澡', detail: '想放松一下', status: 'active' },
        { id: 'idea-old-2', title: '玩游戏', detail: '想换换心情', status: 'active' },
      ],
    },
  },
};

const saved = [];
context.window.GameModules.characterStateStore = {
  get: () => roleState,
  save: (state) => {
    saved.push(state);
    return Promise.resolve(state);
  },
};

(async () => {
  const replaced = await stage.applyRoleDriveOps({}, [roleState], [{
    id: roleState.id,
    field: 'socialDrive.ideas',
    op: 'replace',
    value: [
      { id: 'idea-a', title: '洗澡', detail: '想让自己放松', status: 'active', reason: '当前疲劳' },
      { id: 'idea-b', title: '玩游戏', detail: '暂时转移注意力', status: 'active', reason: '情绪需要缓冲' },
      { id: 'idea-c', title: '出去走走', detail: '想呼吸新鲜空气', status: 'active', reason: '地点与时间允许' },
    ],
    reason: '本轮上下文调整想法',
  }]);
  assert.strictEqual(replaced.applied.length, 1);
  assert.strictEqual(roleState.profile.socialDrive.agenda.short, '准备期末考试');
  assert.strictEqual(roleState.profile.socialDrive.ideas.length, 3);

  const completed = await stage.applyRoleDriveOps({}, [roleState], [{
    id: roleState.id,
    field: 'socialDrive.ideas',
    op: 'complete',
    ideaId: 'idea-a',
    reason: '想法已完成',
  }]);
  assert.strictEqual(completed.applied.length, 1);
  assert.strictEqual(roleState.profile.socialDrive.ideas.find((idea) => idea.id === 'idea-a').status, 'completed');
  assert.strictEqual(roleState.profile.socialDrive.agenda.short, '准备期末考试');

  roleState.profile.socialDrive.ideas = roleState.profile.socialDrive.ideas.filter((idea) => idea.status === 'active');
  let calls = 0;
  const fill = await stage.runRoleDriveAfterStage4({
    store: {},
    participants: [{ id: roleState.id, name: roleState.name }],
    narration: '林青整理好物品，准备继续复习。',
    updates: {},
    loop: {
      completeCachedJsonPrompt: async () => {
        calls += 1;
        return calls === 1
          ? '{"ops":[],"done":true}'
          : JSON.stringify({
            ops: [{
              id: roleState.id,
              field: 'socialDrive.ideas',
              op: 'replace',
              value: [
                { id: 'idea-b', title: '玩游戏', detail: '暂时转移注意力', status: 'active', reason: '情绪需要缓冲' },
                { id: 'idea-c', title: '出去走走', detail: '想呼吸新鲜空气', status: 'active', reason: '地点与时间允许' },
                { id: 'idea-d', title: '喝水', detail: '想先缓一缓再复习', status: 'active', reason: '当前状态' },
              ],
              reason: '补足三条想法',
            }],
            done: true,
          });
      },
    },
  });
  assert.strictEqual(calls, 2);
  assert.strictEqual(fill.error, undefined);
  assert.strictEqual(roleState.profile.socialDrive.ideas.filter((idea) => idea.status === 'active').length, 3);
  assert.ok(saved.length >= 3);
  console.log('PASS character-social-drive ideas');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
