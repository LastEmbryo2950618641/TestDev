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

const stage = context.window.GameModules.inferenceIntroCardStageUpdate;
const participants = stage.narrationParticipants('<role id="rel-ai-247528">刘思琪</role>走到门口。');
assert.deepStrictEqual(JSON.parse(JSON.stringify(participants)), [{ id: 'rel-ai-247528', name: '刘思琪' }]);

const saved = [];
context.window.GameModules.characterStateStore = {
  save(state) {
    saved.push(state);
    return Promise.resolve(state);
  },
};

const roleState = {
  id: 'rel-ai-247528',
  name: '刘思琪',
  profile: {
    name: '刘思琪',
    socialDrive: { relationToPlayer: '', familiarity: 20, agenda: {} },
  },
};

(async () => {
  const result = await stage.applyRoleDriveOps({}, [roleState], [
    { id: 'rel-ai-247528', field: 'socialDrive.relationToPlayer', op: 'set', value: '妹妹', reason: '既有角色资料确认' },
    { id: 'rel-ai-247528', field: 'socialDrive.agenda.short', op: 'set', value: '等哥哥说明来意', reason: '正文明确' },
    { id: 'rel-ai-247528', field: 'socialDrive.familiarity', op: 'delta', value: 8, reason: '本轮交流' },
  ]);
  assert.strictEqual(result.applied.length, 3);
  assert.strictEqual(roleState.profile.socialDrive.relationToPlayer, '妹妹');
  assert.strictEqual(roleState.profile.socialDrive.agenda.short, '等哥哥说明来意');
  assert.strictEqual(roleState.profile.socialDrive.familiarity, 28);
  assert.strictEqual(saved.length, 1);

  const sceneContactCount = await stage.touchRoleDriveSceneContacts({
    phoneDate: () => new Date('2026-08-04T08:00:00.000Z'),
  }, [roleState]);
  assert.strictEqual(sceneContactCount, 1);
  assert.strictEqual(roleState.profile.socialDrive.lastContactAt, '2026-08-04T08:00:00.000Z');
  assert.strictEqual(roleState.profile.socialDrive.lastContactChannel, 'scene');
  assert.ok(roleState.profile.socialDrive.reach.includes('scene'));
  console.log('PASS intro-card-stage-update');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
