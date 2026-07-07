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

function createStore() {
  const context = vm.createContext({
    console,
    setTimeout,
    clearTimeout,
    window: {
      GameModules: {
        sqliteSave: {
          getCharacterState: () => null,
        },
      },
    },
  });
  context.window.window = context.window;
  loadScript(context, 'publish/wechat-view-actions.js');
  loadScript(context, 'publish/wechat-album-actions.js');

  const playerState = {
    id: 'player-self',
    name: '刘悠',
    profile: {
      id: 'player-self',
      name: '刘悠',
      role: '玩家',
      gender: '女',
      age: 27,
      birthday: '1998-11-19',
      job: '程序工程师',
      appearance: '黑发女性',
      personality: '冷静',
      detail: '玩家本人',
      relationships: '暂无',
      bodyProfileMeta: { overall: ['少女'] },
      bodyProfile: [],
    },
    values: { age: 27 },
  };

  const calls = [];
  const store = {
    ...context.window.GameModules.wechatViewActions,
    ...context.window.GameModules.wechatAlbumActions,
    rpgStates: { 'player-self': playerState },
    identityTargetId: 'player-self',
    wechatSelectedContact: 'player-self',
    wechatUsers: [
      { id: 'npc-1', name: '刘思琪', relation: '妹妹', latest: '在吗', unread: 0 },
    ],
    wechatAlbumPromptDraft: null,
    wechatAlbumPromptError: '',
    wechatAlbumPromptOpen: false,
    wechatAlbumPromptStep: 'choice',
    wechatAlbumBodyFigureContext: null,
    playerName: '刘悠',
    playerProfile: playerState.profile,
    currentRpgState: playerState,
    defaultWechatGroup() {
      return { id: 'group-main', name: '操控者交流群', mark: '群', group: true };
    },
    displayWechatContact(contact) { return contact; },
    identityTargetState() { return this.rpgStates[this.identityTargetId] || null; },
    playerIdentityState() { return this.rpgStates['player-self'] || null; },
    ensurePlayerRpgState: async () => { calls.push('ensurePlayerRpgState'); return playerState; },
    ensureWechatUserProfile: async (contact) => { calls.push(`ensureWechatUserProfile:${contact?.id || ''}`); return null; },
    save: async () => {},
  };
  return { store, calls };
}

test('body figure prompt editor uses current identity target instead of default wechat group', async () => {
  const { store, calls } = createStore();
  await store.openBodyProfileImageGenerator({ title: '当前自然状态', fields: [{ stateId: 'player-self' }] });
  const options = store.wechatAlbumPromptOptions('natural');
  const nameItem = options.identity.find((item) => item.key === 'name');
  const roleItem = options.identity.find((item) => item.key === 'role');
  assert.strictEqual(nameItem?.value, '刘悠');
  assert.strictEqual(roleItem?.value, '玩家');
  assert.deepStrictEqual(calls, ['ensurePlayerRpgState']);
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
