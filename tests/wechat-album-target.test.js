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
  loadScript(context, 'publish/ui/wechat/view-helpers.js');
  loadScript(context, 'publish/wechat-view-actions.js');
  loadScript(context, 'publish/app/wechat/album-orchestration.js');
  loadScript(context, 'publish/app/wechat/album-body-figure-context-helpers.js');
  loadScript(context, 'publish/app/wechat/album-body-profile-generator-orchestration.js');
  loadScript(context, 'publish/app/wechat/album-delete-orchestration.js');
  loadScript(context, 'publish/app/wechat/album-mark-real-orchestration.js');
  loadScript(context, 'publish/app/wechat/album-generate-helpers.js');
  loadScript(context, 'publish/app/wechat/album-draw-helpers.js');
  loadScript(context, 'publish/app/wechat/album-prompt-editor-helpers.js');
  loadScript(context, 'publish/app/wechat/album-prompt-editor-orchestration.js');
  loadScript(context, 'publish/app/wechat/album-ui-state-helpers.js');
  loadScript(context, 'publish/app/wechat/album-body-figure-helpers.js');
  loadScript(context, 'publish/app/wechat/album-body-figure-asset-orchestration.js');
  loadScript(context, 'publish/app/wechat/album-prompt-helpers.js');
  loadScript(context, 'publish/app/wechat/album-photo-state-helpers.js');
  loadScript(context, 'publish/app/wechat/album-generation-orchestration.js');
  loadScript(context, 'publish/app/wechat/album-selected-generation-orchestration.js');
  loadScript(context, 'publish/app/wechat/avatar-crop-helpers.js');
  loadScript(context, 'publish/wechat-album-actions.js');
  loadScript(context, 'publish/wechat-avatar-crop-actions.js');
  loadScript(context, 'publish/rpg-field-ui.js');

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
    ...context.window.GameModules.wechatAvatarCropActions,
    ...context.window.GameModules.rpgFieldUi,
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
  context.window.GameModules.tokenStats = { record: () => 'token-1', recordResponse: () => {} };
  context.window.GameModules.drawProvider = { generate: async () => ({ images: ['generated-image'], taskId: 'task-1' }) };
  return { store, calls, context };
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

test('body figure generation auto captures the generated real photo as target contact avatar', async () => {
  const { store } = createStore();
  store.rpgStates['npc-1'] = {
    id: 'npc-1',
    name: 'Npc One',
    profile: {
      id: 'npc-1',
      name: 'Npc One',
      gender: 'female',
      bodyProfileMeta: {},
      dressedProfileMeta: {},
      bodyProfile: [],
      dressedProfile: [],
    },
  };
  store.wechatSelectedContact = 'npc-1';
  store.wechatAlbumBodyFigureContext = { characterId: 'npc-1', kind: 'natural', startedAt: Date.now() };
  store.selectedDrawModelId = () => 'model-1';
  store.selectedDrawProviderId = () => 'pixai';
  store.appendWechatAlbumFixedTags = (prompt) => prompt;
  store.pictureGenerateSafeReplacements = (text) => text;
  store.loadWechatAvatarImage = async () => ({ naturalWidth: 100, naturalHeight: 200 });
  store.detectWechatAvatarFace = async () => ({ x: 0.11, y: 0.22, w: 0.33, ratio: 2 });
  store.saveGeneratedBodyFigureAsset = async () => ({
    imageSrc: '/assets/body-figures/npc-1-123/figure.png',
    path: 'npc-1-123',
    metaPath: 'npc-1-123/meta.json',
    imagePath: 'npc-1-123/figure.png',
  });

  await store.generateWechatAlbumPhoto('natural', { prompt: 'portrait prompt', negativePrompt: '' });

  const photo = store.wechatAlbumPhotos['npc-1']?.[0];
  const contact = store.wechatUsers.find((item) => item.id === 'npc-1');
  assert.strictEqual(photo?.real, true);
  assert.strictEqual(photo?.url, '/assets/body-figures/npc-1-123/figure.png');
  assert.strictEqual(contact?.avatar?.url, '/assets/body-figures/npc-1-123/figure.png');
  assert.strictEqual(contact?.avatar?.crop?.x, 0.11);
  assert.strictEqual(contact?.avatar?.crop?.y, 0.22);
  assert.strictEqual(contact?.avatar?.crop?.w, 0.33);
  assert.strictEqual(contact?.avatar?.crop?.ratio, 2);
});

test('manual body figure selection auto captures selected figure as target contact avatar', async () => {
  const { store, context } = createStore();
  let captured = null;
  let refreshed = false;
  context.window.GameModules.bodyFigure = {
    bindCurrentFigure: async () => ({ ok: true, path: 'preset/path' }),
  };
  store.bodyFigurePickerTarget = {
    characterId: 'npc-1',
    characterName: 'Npc One',
    kind: 'natural',
  };
  store.wechatAlbumContact = (id) => ({ id, name: 'Npc One', mark: 'N' });
  store.autoCaptureWechatAvatarFromUrl = async (url, contact) => {
    captured = { url, contact };
  };
  store.refreshBodyFigurePickerItems = async () => { refreshed = true; };

  await store.setBodyFigurePickerCurrent({
    path: 'preset/path',
    imageSrc: 'assets/body-figures/preset/path/figure.png',
  });

  assert.strictEqual(captured?.url, 'assets/body-figures/preset/path/figure.png');
  assert.strictEqual(captured?.contact?.id, 'npc-1');
  assert.strictEqual(refreshed, true);
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
