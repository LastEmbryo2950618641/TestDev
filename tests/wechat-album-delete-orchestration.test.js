const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadScript(context, relPath) {
  const file = path.join(__dirname, '..', relPath);
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: relPath });
}

function loadDeleteOrchestration(context) {
  const relPath = 'publish/app/wechat/album-delete-orchestration.js';
  const file = path.join(__dirname, '..', relPath);
  assert.ok(fs.existsSync(file), 'album delete orchestration module should exist');
  loadScript(context, relPath);
  return context.window.GameModules.app.wechat.albumDeleteOrchestration;
}

async function testFacadeForwarding() {
  const forwardedResult = { source: 'album-delete-orchestration' };
  let receivedThis = null;
  let receivedArgs = null;
  const context = vm.createContext({
    console,
    window: {
      GameModules: {
        app: {
          wechat: {
            albumDeleteOrchestration: {
              async confirmDeleteWechatAlbumPhoto(...args) {
                receivedThis = this;
                receivedArgs = args;
                return forwardedResult;
              },
            },
            albumPhotoStateHelpers: {},
            albumUiStateHelpers: {},
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
    closeWechatAlbumDeleteConfirm: () => {},
  };
  const result = await store.confirmDeleteWechatAlbumPhoto('arg');

  assert.strictEqual(result, forwardedResult);
  assert.strictEqual(receivedThis, store);
  assert.deepStrictEqual(receivedArgs, ['arg']);
}

async function testValidDeletion() {
  const calls = [];
  let helperArgs = null;
  const context = vm.createContext({
    console,
    window: {
      GameModules: {
        app: {
          wechat: {
            albumPhotoStateHelpers: {
              wechatAlbumPhotosAfterDelete(...args) {
                calls.push('helper');
                helperArgs = args;
                return { 'npc-1': [{ url: 'kept' }] };
              },
            },
            albumUiStateHelpers: {},
          },
        },
      },
    },
  });
  context.window.window = context.window;
  const orchestration = loadDeleteOrchestration(context);
  const list = [{ url: 'remove' }, { url: 'keep' }];
  const contact = { id: 'npc-1' };
  const originalPhotos = { 'npc-1': list };
  const store = {
    wechatAlbumDeleteConfirm: { index: '0' },
    wechatAlbumPhotos: originalPhotos,
    wechatProfileContact: () => { calls.push('contact'); return contact; },
    wechatAlbumPhotoList: () => { calls.push('list'); return list; },
    closeWechatAlbumDeleteConfirm() { calls.push('close'); },
    async save() { calls.push('save'); },
  };

  await orchestration.confirmDeleteWechatAlbumPhoto.call(store);

  assert.deepStrictEqual(calls, ['contact', 'list', 'helper', 'close', 'save']);
  assert.deepStrictEqual(helperArgs, [originalPhotos, 'npc-1', list, 0]);
  assert.deepStrictEqual(store.wechatAlbumPhotos, { 'npc-1': [{ url: 'kept' }] });
}

async function testInvalidDeletion() {
  const calls = [];
  const context = vm.createContext({
    console,
    window: { GameModules: { app: { wechat: { albumPhotoStateHelpers: {} } } } },
  });
  context.window.window = context.window;
  const orchestration = loadDeleteOrchestration(context);
  const store = {
    wechatAlbumDeleteConfirm: { index: '4.5' },
    wechatAlbumPhotos: { 'npc-1': [{ url: 'keep' }] },
    wechatProfileContact: () => ({ id: 'npc-1' }),
    wechatAlbumPhotoList: () => [{ url: 'keep' }],
    closeWechatAlbumDeleteConfirm: () => calls.push('close'),
    async save() { calls.push('save'); },
  };

  await orchestration.confirmDeleteWechatAlbumPhoto.call(store);

  assert.deepStrictEqual(calls, ['close']);
  assert.deepStrictEqual(store.wechatAlbumPhotos, { 'npc-1': [{ url: 'keep' }] });
}

(async () => {
  await testFacadeForwarding();
  console.log('PASS album delete facade forwards context and arguments');
  await testValidDeletion();
  console.log('PASS album delete orchestration preserves valid deletion order');
  await testInvalidDeletion();
  console.log('PASS album delete orchestration preserves invalid deletion behavior');
})().catch((err) => {
    console.error(err);
    process.exit(1);
});
