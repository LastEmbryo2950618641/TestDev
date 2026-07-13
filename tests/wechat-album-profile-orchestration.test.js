const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadScript(context, relPath) {
  const file = path.join(__dirname, '..', relPath);
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: relPath });
}

function loadProfileOrchestration(context) {
  const relPath = 'publish/app/wechat/album-profile-orchestration.js';
  const file = path.join(__dirname, '..', relPath);
  assert.ok(fs.existsSync(file), 'album profile orchestration module should exist');
  loadScript(context, relPath);
  return context.window.GameModules.app.wechat.albumProfileOrchestration;
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

function createFacadeContext() {
  const received = [];
  const context = vm.createContext({
    console,
    window: {
      GameModules: {
        app: {
          wechat: {
            albumProfileOrchestration: {
              openWechatContactProfile(...args) {
                received.push(['open', this, args]);
                return 'open-result';
              },
              backWechatContactProfile(...args) {
                received.push(['back', this, args]);
                return 'back-result';
              },
              openWechatAlbum(...args) {
                received.push(['album', this, args]);
                return 'album-result';
              },
            },
          },
        },
      },
    },
  });
  context.window.window = context.window;
  loadScript(context, 'publish/wechat-album-actions.js');
  return { context, received };
}

function testFacadeForwarding() {
  const { context, received } = createFacadeContext();
  const store = {
    ...context.window.GameModules.wechatAlbumActions,
    wechatSelected: () => ({ id: 'group-1', group: true }),
  };

  assert.strictEqual(store.openWechatContactProfile('npc-1'), 'open-result');
  assert.strictEqual(store.backWechatContactProfile('arg'), 'back-result');
  assert.strictEqual(store.openWechatAlbum('arg'), 'album-result');
  assert.strictEqual(received.length, 3);
  assert.deepStrictEqual(received.map((item) => [item[0], item[2]]), [
    ['open', ['npc-1']],
    ['back', ['arg']],
    ['album', ['arg']],
  ]);
  assert.ok(received.every((item) => item[1] === store));
}

async function testSuccessfulProfileOpen() {
  const calls = [];
  const context = vm.createContext({ console, window: { GameModules: {} } });
  context.window.window = context.window;
  const orchestration = loadProfileOrchestration(context);
  const contact = { id: 'npc-1', name: 'Npc One' };
  const store = {
    wechatSelectedContact: 'old',
    wechatView: 'home',
    wechatAlbumMode: 'album',
    wechatError: '',
    wechatSelected() {
      calls.push('selected');
      return this.wechatSelectedContact === 'npc-1' ? contact : null;
    },
    reuseWechatCharacterProfile(receivedContact) {
      calls.push(['reuse', receivedContact]);
      return Promise.resolve({ id: 'state-1' });
    },
    async save() { calls.push('save'); },
    wechatMissingRoleCardMessage: () => 'missing',
  };

  const result = orchestration.openWechatContactProfile.call(store, 'npc-1');
  await flushPromises();

  assert.strictEqual(result, undefined);
  assert.strictEqual(store.wechatSelectedContact, 'npc-1');
  assert.strictEqual(store.wechatView, 'profile');
  assert.strictEqual(store.wechatAlbumMode, 'profile');
  assert.strictEqual(store.wechatError, '');
  assert.deepStrictEqual(calls, ['selected', 'selected', ['reuse', contact], 'save']);
}

async function testMissingProfileOpen() {
  const context = vm.createContext({ console, window: { GameModules: {} } });
  context.window.window = context.window;
  const orchestration = loadProfileOrchestration(context);
  const contact = { id: 'npc-1', name: 'Npc One' };
  let saved = false;
  const store = {
    wechatSelectedContact: '',
    wechatView: 'home',
    wechatAlbumMode: 'profile',
    wechatError: '',
    wechatSelected: () => contact,
    reuseWechatCharacterProfile: () => Promise.resolve(null),
    save: async () => { saved = true; },
    wechatMissingRoleCardMessage: (receivedContact) => `missing:${receivedContact.id}`,
  };

  orchestration.openWechatContactProfile.call(store, 'npc-1');
  await flushPromises();

  assert.strictEqual(saved, false);
  assert.strictEqual(store.wechatError, 'missing:npc-1');
}

function testGroupShortCircuit() {
  const context = vm.createContext({ console, window: { GameModules: {} } });
  context.window.window = context.window;
  const orchestration = loadProfileOrchestration(context);
  let reused = false;
  const store = {
    wechatSelectedContact: 'old',
    wechatView: 'home',
    wechatAlbumMode: 'album',
    wechatSelected: () => ({ id: 'group-1', group: true }),
    reuseWechatCharacterProfile: () => { reused = true; return Promise.resolve(null); },
  };

  orchestration.openWechatContactProfile.call(store, 'group-1');

  assert.strictEqual(store.wechatSelectedContact, 'group-1');
  assert.strictEqual(store.wechatView, 'home');
  assert.strictEqual(store.wechatAlbumMode, 'album');
  assert.strictEqual(reused, false);
}

function testProfileNavigation() {
  const context = vm.createContext({ console, window: { GameModules: {} } });
  context.window.window = context.window;
  const orchestration = loadProfileOrchestration(context);
  const store = { wechatView: 'profile', wechatAlbumMode: 'album' };

  orchestration.backWechatContactProfile.call(store);
  assert.strictEqual(store.wechatView, 'profile');
  assert.strictEqual(store.wechatAlbumMode, 'profile');

  orchestration.backWechatContactProfile.call(store);
  assert.strictEqual(store.wechatView, 'home');
  assert.strictEqual(store.wechatAlbumMode, 'profile');

  orchestration.openWechatAlbum.call(store);
  assert.strictEqual(store.wechatAlbumMode, 'album');
}

(async () => {
  testFacadeForwarding();
  console.log('PASS album profile facade forwards all navigation methods');
  await testSuccessfulProfileOpen();
  console.log('PASS album profile orchestration preserves successful profile reuse');
  await testMissingProfileOpen();
  console.log('PASS album profile orchestration preserves missing profile error');
  testGroupShortCircuit();
  console.log('PASS album profile orchestration preserves group short circuit');
  testProfileNavigation();
  console.log('PASS album profile orchestration preserves navigation levels');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
