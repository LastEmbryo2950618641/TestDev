const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadScript(context, relPath) {
  const file = path.join(__dirname, '..', relPath);
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: relPath });
}

function loadPromptEditorOrchestration(context) {
  const relPath = 'publish/app/wechat/album-prompt-editor-orchestration.js';
  const file = path.join(__dirname, '..', relPath);
  assert.ok(fs.existsSync(file), 'prompt editor orchestration module should exist');
  loadScript(context, relPath);
  return context.window.GameModules.app.wechat.albumPromptEditorOrchestration;
}

async function testFacadeForwarding() {
  const forwardedResult = { source: 'prompt-editor-orchestration' };
  let receivedThis = null;
  let receivedArgs = null;
  const context = vm.createContext({
    console,
    window: {
      GameModules: {
        app: {
          wechat: {
            albumPromptEditorOrchestration: {
              async openWechatAlbumPromptEditor(...args) {
                receivedThis = this;
                receivedArgs = args;
                return forwardedResult;
              },
            },
            albumPromptEditorHelpers: {
              wechatAlbumPromptEditorDraft: () => ({ identityKeys: [], bodyKeys: [] }),
            },
          },
        },
      },
    },
  });
  context.window.window = context.window;
  loadScript(context, 'publish/wechat-album-actions.js');

  const store = {
    ...context.window.GameModules.wechatAlbumActions,
    wechatAlbumContact: () => ({ id: 'npc-1', name: 'Npc One' }),
    ensureWechatUserProfile: async () => {},
    wechatAlbumPromptOptions: () => ({ identity: [], body: [] }),
  };
  const result = await store.openWechatAlbumPromptEditor('custom');

  assert.strictEqual(result, forwardedResult);
  assert.strictEqual(receivedThis, store);
  assert.deepStrictEqual(receivedArgs, ['custom']);
}

async function testPlayerPromptEditorFlow() {
  const calls = [];
  const context = vm.createContext({
    console,
    window: { GameModules: { app: { wechat: { albumPromptEditorHelpers: {} } } } },
  });
  context.window.window = context.window;
  context.window.GameModules.app.wechat.albumPromptEditorHelpers.wechatAlbumPromptEditorDraft = (...args) => {
    calls.push(['draft', ...args]);
    return { kind: args[0], identityKeys: [], bodyKeys: [], customText: '' };
  };
  const orchestration = loadPromptEditorOrchestration(context);
  const contact = { id: 'player-self', name: 'Player' };
  const options = {
    identity: [{ key: 'name' }, { key: 'role' }],
    body: [{ key: 'height' }],
  };
  const store = {
    wechatAlbumPromptDraft: null,
    wechatAlbumPromptStep: 'choice',
    wechatAlbumBodyFigureContext: { characterId: 'player-self', kind: 'natural' },
    wechatAlbumContact() {
      calls.push('contact');
      return contact;
    },
    async ensurePlayerRpgState() { calls.push('player-state'); },
    async ensureWechatUserProfile() { calls.push('npc-state'); },
    wechatAlbumPromptOptions(kind) {
      calls.push(['options', kind]);
      return options;
    },
  };

  await orchestration.openWechatAlbumPromptEditor.call(store, 'natural');

  assert.deepStrictEqual(calls, [
    'contact',
    'player-state',
    ['options', 'natural'],
    ['draft', 'natural', store.wechatAlbumBodyFigureContext],
  ]);
  assert.deepStrictEqual(store.wechatAlbumPromptDraft, {
    kind: 'natural',
    identityKeys: ['name', 'role'],
    bodyKeys: ['height'],
    customText: '',
  });
  assert.strictEqual(store.wechatAlbumPromptStep, 'edit');
}

async function testNpcPromptEditorFlow() {
  const calls = [];
  const context = vm.createContext({
    console,
    window: { GameModules: { app: { wechat: { albumPromptEditorHelpers: {} } } } },
  });
  context.window.window = context.window;
  context.window.GameModules.app.wechat.albumPromptEditorHelpers.wechatAlbumPromptEditorDraft = (kind) => ({
    kind,
    identityKeys: [],
    bodyKeys: [],
  });
  const orchestration = loadPromptEditorOrchestration(context);
  const contact = { id: 'npc-1', name: 'Npc One' };
  const store = {
    wechatAlbumBodyFigureContext: null,
    wechatAlbumPromptStep: 'choice',
    wechatAlbumContact: () => contact,
    ensurePlayerRpgState: async () => calls.push('player-state'),
    async ensureWechatUserProfile(receivedContact) {
      calls.push(['npc-state', receivedContact]);
    },
    wechatAlbumPromptOptions: () => ({ identity: [], body: [] }),
  };

  await orchestration.openWechatAlbumPromptEditor.call(store, 'dressed');

  assert.deepStrictEqual(calls, [['npc-state', contact]]);
  assert.strictEqual(store.wechatAlbumPromptDraft.kind, 'dressed');
  assert.strictEqual(store.wechatAlbumPromptStep, 'edit');
}

(async () => {
  await testFacadeForwarding();
  console.log('PASS prompt editor facade forwards context and arguments');
  await testPlayerPromptEditorFlow();
  console.log('PASS prompt editor orchestration preserves player preparation and draft flow');
  await testNpcPromptEditorFlow();
  console.log('PASS prompt editor orchestration preserves npc preparation flow');
})().catch((err) => {
    console.error(err);
    process.exit(1);
});
