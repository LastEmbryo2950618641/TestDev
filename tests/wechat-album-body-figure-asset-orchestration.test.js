const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadScript(context, relPath) {
  const file = path.join(__dirname, '..', relPath);
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: relPath });
}

function loadAssetOrchestration(context) {
  const relPath = 'publish/app/wechat/album-body-figure-asset-orchestration.js';
  const file = path.join(__dirname, '..', relPath);
  assert.ok(fs.existsSync(file), 'body figure asset orchestration module should exist');
  loadScript(context, relPath);
  return context.window.GameModules.app.wechat.albumBodyFigureAssetOrchestration;
}

async function testFacadeForwarding() {
  const forwardedResult = { source: 'asset-orchestration' };
  let receivedThis = null;
  let receivedArgs = null;
  const context = vm.createContext({
    console,
    window: {
      GameModules: {
        app: {
          wechat: {
            albumBodyFigureAssetOrchestration: {
              async saveGeneratedBodyFigureAsset(...args) {
                receivedThis = this;
                receivedArgs = args;
                return forwardedResult;
              },
            },
          },
        },
        platform: {
          core: {
            assets: {
              bodyFigure: {
                saveImage: async () => ({
                  ok: true,
                  status: 200,
                  json: async () => ({ ok: true, path: 'legacy-inline-result' }),
                }),
              },
            },
          },
        },
        bodyFigure: {
          registerEntry() {},
          bindCurrentFigure: async () => ({ ok: true }),
        },
      },
    },
  });
  context.window.window = context.window;
  loadScript(context, 'publish/wechat-album-actions.js');

  const contact = { id: 'npc-1', name: 'Npc One' };
  const drawResult = { taskId: 'task-1' };
  const drawOptions = { model: 'model-1' };
  const store = {
    ...context.window.GameModules.wechatAlbumActions,
    buildGeneratedBodyFigureMeta: () => ({
      ownerId: 'npc-1',
      ownerName: 'Npc One',
      stateKind: 'natural',
    }),
  };

  const result = await store.saveGeneratedBodyFigureAsset(
    'generated-image',
    'natural',
    contact,
    drawResult,
    drawOptions,
  );

  assert.strictEqual(result, forwardedResult);
  assert.strictEqual(receivedThis, store);
  assert.deepStrictEqual(receivedArgs, [
    'generated-image',
    'natural',
    contact,
    drawResult,
    drawOptions,
  ]);
}

async function testAssetOrchestrationSuccess() {
  const calls = [];
  let savePayload = null;
  let registered = null;
  let bound = null;
  const data = {
    ok: true,
    path: 'npc-1/generated-natural',
    imagePath: 'npc-1/generated-natural/figure.webp',
    entry: { id: 'entry-1' },
  };
  const context = vm.createContext({
    console,
    window: {
      GameModules: {
        platform: {
          core: {
            assets: {
              bodyFigure: {
                async saveImage(payload) {
                  calls.push('save');
                  savePayload = payload;
                  return { ok: true, status: 200, json: async () => data };
                },
              },
            },
          },
        },
        bodyFigure: {
          registerEntry(entry, meta) {
            calls.push('register');
            registered = { entry, meta };
          },
          async bindCurrentFigure(...args) {
            calls.push('bind');
            bound = args;
            return { ok: true };
          },
        },
      },
    },
  });
  context.window.window = context.window;
  const orchestration = loadAssetOrchestration(context);
  const contact = { id: 'npc-1', name: 'Npc One' };
  const drawResult = { taskId: 'task-1' };
  const drawOptions = { model: 'model-1' };
  const meta = {
    ownerId: 'npc-1',
    ownerName: 'Fallback Name',
    stateKind: 'natural',
  };
  const store = {
    buildGeneratedBodyFigureMeta(kind, receivedContact, receivedResult, receivedOptions) {
      calls.push('meta');
      assert.strictEqual(kind, 'natural');
      assert.strictEqual(receivedContact, contact);
      assert.strictEqual(receivedResult, drawResult);
      assert.strictEqual(receivedOptions, drawOptions);
      return meta;
    },
  };

  const result = await orchestration.saveGeneratedBodyFigureAsset.call(
    store,
    'generated-image',
    'natural',
    contact,
    drawResult,
    drawOptions,
  );

  assert.strictEqual(result, data);
  assert.deepStrictEqual(calls, ['meta', 'save', 'register', 'bind']);
  assert.strictEqual(savePayload.imageUrl, 'generated-image');
  assert.strictEqual(savePayload.ownerId, 'npc-1');
  assert.strictEqual(savePayload.kind, 'natural');
  assert.strictEqual(savePayload.meta, meta);
  assert.strictEqual(typeof savePayload.timestamp, 'number');
  assert.strictEqual(registered.entry, data.entry);
  assert.strictEqual(registered.meta.id, data.path);
  assert.strictEqual(registered.meta.image, 'figure.webp');
  assert.strictEqual(bound[0], data.path);
  assert.strictEqual(bound[1], 'npc-1');
  assert.strictEqual(bound[2], 'Npc One');
  assert.strictEqual(bound[3].stateKind, 'natural');
  assert.strictEqual(bound[3].force, true);
}

async function testAssetOrchestrationFailure() {
  const warnings = [];
  const context = vm.createContext({
    console: {
      ...console,
      warn(...args) { warnings.push(args); },
    },
    window: {
      GameModules: {
        platform: {
          core: {
            assets: {
              bodyFigure: {
                saveImage: async () => ({
                  ok: false,
                  status: 503,
                  json: async () => ({ ok: false, error: 'disk full' }),
                }),
              },
            },
          },
        },
      },
    },
  });
  context.window.window = context.window;
  const orchestration = loadAssetOrchestration(context);
  const store = {
    wechatError: '',
    buildGeneratedBodyFigureMeta: () => ({
      ownerId: 'npc-1',
      ownerName: 'Npc One',
      stateKind: 'natural',
    }),
  };

  const result = await orchestration.saveGeneratedBodyFigureAsset.call(
    store,
    'generated-image',
    'natural',
    { id: 'npc-1', name: 'Npc One' },
  );

  assert.strictEqual(result, null);
  assert.ok(store.wechatError.endsWith('disk full'));
  assert.strictEqual(warnings.length, 1);
  assert.strictEqual(warnings[0][0], '[body-figure] 生成形象图本地保存失败:');
}

(async () => {
  await testFacadeForwarding();
  console.log('PASS body figure asset facade forwards context and arguments');
  await testAssetOrchestrationSuccess();
  console.log('PASS body figure asset orchestration saves registers and binds in order');
  await testAssetOrchestrationFailure();
  console.log('PASS body figure asset orchestration preserves failure handling');
})().catch((err) => {
    console.error(err);
    process.exit(1);
});
