const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadScript(context, relPath) {
  const file = path.join(__dirname, '..', relPath);
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: relPath });
}

function loadSelectedGenerationOrchestration(context) {
  const relPath = 'publish/app/wechat/album-selected-generation-orchestration.js';
  const file = path.join(__dirname, '..', relPath);
  assert.ok(fs.existsSync(file), 'selected-generation orchestration module should exist');
  loadScript(context, relPath);
  return context.window.GameModules.app.wechat.albumSelectedGenerationOrchestration;
}

async function testFacadeForwarding() {
  const forwardedResult = { source: 'selected-generation-orchestration' };
  let receivedThis = null;
  let receivedArgs = null;
  const context = vm.createContext({
    console,
    window: {
      GameModules: {
        app: {
          wechat: {
            albumSelectedGenerationOrchestration: {
              async generateWechatAlbumPhotoFromSelectedPrompt(...args) {
                receivedThis = this;
                receivedArgs = args;
                return forwardedResult;
              },
            },
            albumPromptListHelpers: {},
          },
        },
      },
    },
  });
  context.window.window = context.window;
  loadScript(context, 'publish/wechat-album-actions.js');

  const store = {
    ...context.window.GameModules.wechatAlbumActions,
    wechatAlbumSelectedPrompt: () => null,
    wechatAlbumContact: () => ({ id: 'npc-1' }),
    generateWechatAlbumPhoto: async () => {},
  };
  const result = await store.generateWechatAlbumPhotoFromSelectedPrompt('arg');

  assert.strictEqual(result, forwardedResult);
  assert.strictEqual(receivedThis, store);
  assert.deepStrictEqual(receivedArgs, ['arg']);
}

async function testSelectedPromptFlow() {
  const calls = [];
  let helperArgs = null;
  const context = vm.createContext({
    console,
    window: {
      GameModules: {
        app: {
          wechat: {
            albumPromptListHelpers: {
              wechatAlbumPromptsAfterSelectedUpdate(...args) {
                calls.push('helper');
                helperArgs = args;
                return { 'npc-1': [{ id: 'prompt-1', prompt: 'normalized', negativePrompt: 'edited-neg' }] };
              },
            },
          },
        },
      },
    },
  });
  context.window.window = context.window;
  const orchestration = loadSelectedGenerationOrchestration(context);
  const selected = { id: 'prompt-1', kind: 'dressed', prompt: 'stored', negativePrompt: 'stored-neg' };
  const contact = { id: 'npc-1' };
  const list = [selected];
  const originalPrompts = { 'npc-1': list };
  const store = {
    wechatAlbumPromptEditText: 'edited',
    wechatAlbumPromptEditNegative: 'edited-neg',
    wechatAlbumPromptDraft: { kind: 'natural' },
    wechatAlbumPrompts: originalPrompts,
    wechatAlbumSelectedPrompt: () => { calls.push('selected'); return selected; },
    wechatAlbumContact: () => { calls.push('contact'); return contact; },
    normalizeWechatAlbumPromptFixedTags(prompt, kind, receivedContact) {
      calls.push(['normalize', prompt, kind, receivedContact]);
      return 'normalized';
    },
    wechatAlbumPromptList(receivedContact) {
      calls.push(['list', receivedContact]);
      return list;
    },
    async save() { calls.push('save'); },
    async generateWechatAlbumPhoto(kind, promptData) {
      calls.push(['generate', kind, promptData]);
    },
  };

  await orchestration.generateWechatAlbumPhotoFromSelectedPrompt.call(store);

  assert.deepStrictEqual(JSON.parse(JSON.stringify(calls)), [
    'selected',
    'contact',
    ['normalize', 'edited', 'dressed', contact],
    ['list', contact],
    'helper',
    'save',
    ['generate', 'dressed', { prompt: 'normalized', negativePrompt: 'edited-neg' }],
  ]);
  assert.deepStrictEqual(helperArgs, [
    originalPrompts,
    'npc-1',
    list,
    'prompt-1',
    'normalized',
    'edited-neg',
  ]);
  assert.strictEqual(store.wechatAlbumPrompts['npc-1'][0].prompt, 'normalized');
}

async function testNoSelectedPromptFlow() {
  const calls = [];
  const context = vm.createContext({
    console,
    window: { GameModules: { app: { wechat: { albumPromptListHelpers: {} } } } },
  });
  context.window.window = context.window;
  const orchestration = loadSelectedGenerationOrchestration(context);
  const contact = { id: 'npc-1' };
  const store = {
    wechatAlbumPromptEditText: 'custom prompt',
    wechatAlbumPromptEditNegative: 'custom negative',
    wechatAlbumPromptDraft: { kind: 'custom' },
    wechatAlbumSelectedPrompt: () => null,
    wechatAlbumContact: () => contact,
    normalizeWechatAlbumPromptFixedTags: () => '',
    async save() { calls.push('save'); },
    async generateWechatAlbumPhoto(kind, promptData) {
      calls.push(['generate', kind, promptData]);
    },
  };

  await orchestration.generateWechatAlbumPhotoFromSelectedPrompt.call(store);

  assert.deepStrictEqual(JSON.parse(JSON.stringify(calls)), [[
    'generate',
    'custom',
    { prompt: 'custom prompt', negativePrompt: 'custom negative' },
  ]]);
}

(async () => {
  await testFacadeForwarding();
  console.log('PASS selected-generation facade forwards context and arguments');
  await testSelectedPromptFlow();
  console.log('PASS selected-generation orchestration preserves selected prompt flow');
  await testNoSelectedPromptFlow();
  console.log('PASS selected-generation orchestration preserves no-selection flow');
})().catch((err) => {
    console.error(err);
    process.exit(1);
});
