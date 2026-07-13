const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadScript(context, relPath) {
  const file = path.join(__dirname, '..', relPath);
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: relPath });
}

function loadGenerationOrchestration(context) {
  const relPath = 'publish/app/wechat/album-generation-orchestration.js';
  const file = path.join(__dirname, '..', relPath);
  assert.ok(fs.existsSync(file), 'album generation orchestration module should exist');
  loadScript(context, relPath);
  return context.window.GameModules.app.wechat.albumGenerationOrchestration;
}

function createFlowHarness() {
  const calls = [];
  const errors = [];
  const tokenRecords = [];
  const tokenResponses = [];
  const drawResult = { images: ['generated-image'], taskId: 'task-1' };
  const context = vm.createContext({
    console: {
      ...console,
      error(...args) { errors.push(args); },
    },
    window: {
      GameModules: {
        tokenStats: {
          record(...args) {
            calls.push('token-record');
            tokenRecords.push(args);
            return 'token-1';
          },
          recordResponse(...args) {
            calls.push('token-response');
            tokenResponses.push(args);
          },
        },
        drawProvider: {
          async generate(options) {
            calls.push('draw');
            return { ...drawResult, options };
          },
        },
      },
    },
  });
  context.window.window = context.window;
  loadScript(context, 'publish/app/wechat/album-generate-helpers.js');
  loadScript(context, 'publish/app/wechat/album-photo-state-helpers.js');
  const orchestration = loadGenerationOrchestration(context);
  const contact = { id: 'npc-1', name: 'Npc One' };
  const existingPhoto = { url: 'existing-image', kind: 'natural' };
  const safeInputs = [];
  const store = {
    wechatAlbumGenerating: false,
    wechatAlbumRequestId: 4,
    wechatAlbumPromptOpen: true,
    wechatAlbumBodyFigureContext: null,
    wechatAlbumPhotos: { 'npc-1': [existingPhoto] },
    wechatError: '',
    wechatAlbumContact() {
      calls.push('contact');
      return contact;
    },
    async ensureWechatUserProfile(receivedContact) {
      calls.push('ensure-profile');
      assert.strictEqual(receivedContact, contact);
    },
    appendWechatAlbumFixedTags(prompt, kind, receivedContact) {
      calls.push('fixed-tags');
      assert.strictEqual(kind, 'natural');
      assert.strictEqual(receivedContact, contact);
      return `fixed:${prompt}`;
    },
    pictureGenerateSafeReplacements(value) {
      calls.push('safe-replace');
      safeInputs.push(value);
      return `safe:${value}`;
    },
    selectedDrawModelId() {
      calls.push('draw-model');
      return 'model-1';
    },
    wechatAlbumKindLabel(kind) {
      calls.push('kind-label');
      return kind === 'natural' ? 'Natural' : kind;
    },
    selectedDrawProviderId() {
      calls.push('draw-provider');
      return 'pixai';
    },
    async wechatDrawWithRetry(fn) {
      calls.push('draw-retry');
      return fn();
    },
    wechatAlbumPhotoListForContact(receivedContact) {
      calls.push('photo-list');
      assert.strictEqual(receivedContact, contact);
      return this.wechatAlbumPhotos[contact.id];
    },
    async save() {
      calls.push('save');
    },
    async saveGeneratedBodyFigureAsset() {
      throw new Error('body figure persistence should not run');
    },
    async autoCaptureWechatAvatar() {
      throw new Error('avatar capture should not run');
    },
  };
  return {
    calls,
    contact,
    context,
    drawResult,
    errors,
    existingPhoto,
    orchestration,
    safeInputs,
    store,
    tokenRecords,
    tokenResponses,
  };
}

async function testFacadeForwarding() {
  const forwardedResult = { source: 'album-generation-orchestration' };
  let receivedThis = null;
  let receivedArgs = null;
  const context = vm.createContext({
    console,
    window: {
      GameModules: {
        app: {
          wechat: {
            albumGenerationOrchestration: {
              async generateWechatAlbumPhoto(...args) {
                receivedThis = this;
                receivedArgs = args;
                return forwardedResult;
              },
            },
          },
        },
      },
    },
  });
  context.window.window = context.window;
  loadScript(context, 'publish/wechat-album-actions.js');

  const promptData = { prompt: 'portrait', negativePrompt: 'blur' };
  const store = {
    ...context.window.GameModules.wechatAlbumActions,
    wechatAlbumGenerating: true,
  };
  const result = await store.generateWechatAlbumPhoto('dressed', promptData);

  assert.strictEqual(result, forwardedResult);
  assert.strictEqual(receivedThis, store);
  assert.deepStrictEqual(receivedArgs, ['dressed', promptData]);
}

async function testGenerationSuccess() {
  const harness = createFlowHarness();
  const { calls, orchestration, safeInputs, store, tokenRecords, tokenResponses } = harness;

  await orchestration.generateWechatAlbumPhoto.call(store, 'natural', {
    prompt: '  portrait  ',
    negativePrompt: '',
  });

  assert.strictEqual(store.wechatAlbumRequestId, 5);
  assert.strictEqual(store.wechatAlbumGenerating, false);
  assert.strictEqual(store.wechatAlbumPromptOpen, false);
  assert.strictEqual(store.wechatError, '');
  assert.strictEqual(store.wechatAlbumPhotos['npc-1'].length, 2);
  assert.strictEqual(store.wechatAlbumPhotos['npc-1'][0].url, 'generated-image');
  assert.strictEqual(store.wechatAlbumPhotos['npc-1'][0].taskId, 'task-1');
  assert.strictEqual(store.wechatAlbumPhotos['npc-1'][0].real, false);
  assert.strictEqual(safeInputs[0], 'fixed:portrait');
  assert.ok(safeInputs[1].includes('bad anatomy'));
  assert.strictEqual(tokenRecords.length, 1);
  assert.strictEqual(tokenRecords[0][0], 'draw-wechat-album-natural');
  assert.strictEqual(tokenRecords[0][2].model, 'pixai:model-1');
  assert.strictEqual(tokenResponses.length, 1);
  assert.strictEqual(tokenResponses[0][0], 'token-1');
  assert.ok(calls.indexOf('ensure-profile') < calls.indexOf('draw'));
  assert.ok(calls.indexOf('token-record') < calls.indexOf('draw'));
  assert.ok(calls.indexOf('draw') < calls.indexOf('token-response'));
  assert.ok(calls.indexOf('token-response') < calls.indexOf('photo-list'));
  assert.ok(calls.indexOf('photo-list') < calls.indexOf('save'));
}

async function testEmptyPromptFailure() {
  const harness = createFlowHarness();
  const { calls, errors, existingPhoto, orchestration, store } = harness;

  await orchestration.generateWechatAlbumPhoto.call(store, 'natural', {
    prompt: '   ',
    negativePrompt: '',
  });

  assert.strictEqual(store.wechatAlbumRequestId, 5);
  assert.strictEqual(store.wechatAlbumGenerating, false);
  assert.strictEqual(store.wechatAlbumPromptOpen, false);
  assert.ok(store.wechatError.includes('请先选择或生成绘图提示词'));
  assert.deepStrictEqual(store.wechatAlbumPhotos['npc-1'], [existingPhoto]);
  assert.strictEqual(calls.includes('draw'), false);
  assert.strictEqual(calls.includes('save'), false);
  assert.strictEqual(errors.length, 1);
}

async function testStaleRequestPreservesNewerState() {
  const harness = createFlowHarness();
  const { calls, existingPhoto, orchestration, store, tokenResponses } = harness;
  store.wechatDrawWithRetry = async (fn) => {
    calls.push('draw-retry');
    const result = await fn();
    store.wechatAlbumRequestId = 99;
    return result;
  };

  await orchestration.generateWechatAlbumPhoto.call(store, 'natural', {
    prompt: 'portrait',
    negativePrompt: 'blur',
  });

  assert.strictEqual(store.wechatAlbumRequestId, 99);
  assert.strictEqual(store.wechatAlbumGenerating, true);
  assert.strictEqual(store.wechatError, '');
  assert.deepStrictEqual(store.wechatAlbumPhotos['npc-1'], [existingPhoto]);
  assert.strictEqual(tokenResponses.length, 1);
  assert.strictEqual(calls.includes('photo-list'), false);
  assert.strictEqual(calls.includes('save'), false);
}

(async () => {
  await testFacadeForwarding();
  console.log('PASS album generation facade forwards context and arguments');
  await testGenerationSuccess();
  console.log('PASS album generation orchestration preserves successful flow');
  await testEmptyPromptFailure();
  console.log('PASS album generation orchestration preserves prompt failure');
  await testStaleRequestPreservesNewerState();
  console.log('PASS album generation orchestration preserves stale request state');
})().catch((err) => {
    console.error(err);
    process.exit(1);
});
