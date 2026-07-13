const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadScript(context, relPath) {
  const file = path.join(__dirname, '..', relPath);
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: relPath });
}

function loadMarkRealOrchestration(context) {
  const relPath = 'publish/app/wechat/album-mark-real-orchestration.js';
  const file = path.join(__dirname, '..', relPath);
  assert.ok(fs.existsSync(file), 'mark-real orchestration module should exist');
  loadScript(context, relPath);
  return context.window.GameModules.app.wechat.albumMarkRealOrchestration;
}

async function testFacadeForwarding() {
  const forwardedResult = { source: 'mark-real-orchestration' };
  let receivedThis = null;
  let receivedArgs = null;
  const context = vm.createContext({
    console,
    window: {
      GameModules: {
        app: {
          wechat: {
            albumMarkRealOrchestration: {
              async markWechatAlbumPhotoReal(...args) {
                receivedThis = this;
                receivedArgs = args;
                return forwardedResult;
              },
            },
            albumPhotoStateHelpers: {},
          },
        },
      },
    },
  });
  context.window.window = context.window;
  loadScript(context, 'publish/wechat-album-actions.js');

  const store = {
    ...context.window.GameModules.wechatAlbumActions,
    wechatProfileContact: () => null,
    wechatAlbumPhotoList: () => [],
  };
  const result = await store.markWechatAlbumPhotoReal(2);

  assert.strictEqual(result, forwardedResult);
  assert.strictEqual(receivedThis, store);
  assert.deepStrictEqual(receivedArgs, [2]);
}

async function testValidMarkRealFlow() {
  const calls = [];
  let helperArgs = null;
  const context = vm.createContext({
    console,
    window: {
      GameModules: {
        app: {
          wechat: {
            albumPhotoStateHelpers: {
              wechatAlbumPhotosAfterMarkReal(...args) {
                calls.push('helper');
                helperArgs = args;
                return { 'npc-1': [{ url: 'first' }, { url: 'second', real: true }] };
              },
            },
          },
        },
      },
    },
  });
  context.window.window = context.window;
  const orchestration = loadMarkRealOrchestration(context);
  const list = [{ url: 'first' }, { url: 'second' }];
  const originalPhotos = { 'npc-1': list };
  const contact = { id: 'npc-1' };
  const store = {
    wechatAlbumPhotos: originalPhotos,
    wechatProfileContact: () => { calls.push('contact'); return contact; },
    wechatAlbumPhotoList: () => { calls.push('list'); return list; },
    async save() { calls.push('save'); },
    async autoCaptureWechatAvatar(index) { calls.push(['avatar', index]); },
  };

  await orchestration.markWechatAlbumPhotoReal.call(store, 1);

  assert.deepStrictEqual(calls, ['contact', 'list', 'helper', 'save', ['avatar', 1]]);
  assert.deepStrictEqual(helperArgs, [originalPhotos, 'npc-1', list, 1]);
  assert.strictEqual(store.wechatAlbumPhotos['npc-1'][1].real, true);
}

async function testInvalidMarkRealFlow() {
  const calls = [];
  const context = vm.createContext({
    console,
    window: { GameModules: { app: { wechat: { albumPhotoStateHelpers: {} } } } },
  });
  context.window.window = context.window;
  const orchestration = loadMarkRealOrchestration(context);
  const originalPhotos = { 'npc-1': [{ url: 'first' }] };
  const store = {
    wechatAlbumPhotos: originalPhotos,
    wechatProfileContact: () => ({ id: 'npc-1' }),
    wechatAlbumPhotoList: () => originalPhotos['npc-1'],
    async save() { calls.push('save'); },
    async autoCaptureWechatAvatar(index) { calls.push(['avatar', index]); },
  };

  await orchestration.markWechatAlbumPhotoReal.call(store, 4);

  assert.deepStrictEqual(calls, []);
  assert.strictEqual(store.wechatAlbumPhotos, originalPhotos);
}

(async () => {
  await testFacadeForwarding();
  console.log('PASS mark-real facade forwards context and arguments');
  await testValidMarkRealFlow();
  console.log('PASS mark-real orchestration preserves save and avatar order');
  await testInvalidMarkRealFlow();
  console.log('PASS mark-real orchestration preserves invalid-photo behavior');
})().catch((err) => {
    console.error(err);
    process.exit(1);
});
