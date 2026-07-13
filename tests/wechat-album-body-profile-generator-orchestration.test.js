const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadScript(context, relPath) {
  const file = path.join(__dirname, '..', relPath);
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: relPath });
}

function loadBodyProfileGeneratorOrchestration(context) {
  const relPath = 'publish/app/wechat/album-body-profile-generator-orchestration.js';
  const file = path.join(__dirname, '..', relPath);
  assert.ok(fs.existsSync(file), 'body profile generator orchestration module should exist');
  loadScript(context, relPath);
  return context.window.GameModules.app.wechat.albumBodyProfileGeneratorOrchestration;
}

async function testFacadeForwarding() {
  const forwardedResult = { source: 'body-profile-generator-orchestration' };
  let receivedThis = null;
  let receivedArgs = null;
  const context = vm.createContext({
    console,
    window: {
      GameModules: {
        app: {
          wechat: {
            albumBodyProfileGeneratorOrchestration: {
              async openBodyProfileImageGenerator(...args) {
                receivedThis = this;
                receivedArgs = args;
                return forwardedResult;
              },
            },
            albumBodyFigureHelpers: {
              bodyProfileImageKind: () => 'natural',
              bodyProfileTargetState: () => ({ id: 'npc-1' }),
            },
            albumBodyFigureContextHelpers: {
              wechatAlbumBodyFigureContext: () => ({ characterId: 'npc-1', kind: 'natural' }),
            },
          },
        },
      },
    },
  });
  context.window.window = context.window;
  loadScript(context, 'publish/wechat-album-actions.js');

  const section = { title: 'natural', fields: [{ stateId: 'npc-1' }] };
  const store = {
    ...context.window.GameModules.wechatAlbumActions,
    wechatContactFromState: () => ({ id: 'npc-1' }),
    openWechatAlbumPromptEditor: async () => {},
  };
  const result = await store.openBodyProfileImageGenerator(section);

  assert.strictEqual(result, forwardedResult);
  assert.strictEqual(receivedThis, store);
  assert.deepStrictEqual(receivedArgs, [section]);
}

async function testTargetStateFlow() {
  const calls = [];
  const context = vm.createContext({
    console,
    window: {
      GameModules: {
        app: {
          wechat: {
            albumBodyFigureContextHelpers: {
              wechatAlbumBodyFigureContext(...args) {
                calls.push(['context', ...args]);
                return { characterId: 'npc-1', kind: 'dressed', sectionTitle: 'dressed' };
              },
            },
          },
        },
      },
    },
  });
  context.window.window = context.window;
  const orchestration = loadBodyProfileGeneratorOrchestration(context);
  const section = { title: 'dressed', fields: [{ stateId: 'npc-1' }] };
  const state = { id: 'npc-1' };
  const contact = { id: 'npc-1', name: 'Npc One' };
  const store = {
    identityTargetId: 'player-self',
    wechatSelectedContact: 'player-self',
    wechatAlbumPromptOpen: false,
    wechatAlbumPromptError: 'old error',
    bodyProfileImageKind(receivedSection) {
      calls.push(['kind', receivedSection]);
      return 'dressed';
    },
    bodyProfileTargetState(receivedSection) {
      calls.push(['target', receivedSection]);
      return state;
    },
    wechatContactFromState(id) {
      calls.push(['contact', id]);
      return contact;
    },
    async openWechatAlbumPromptEditor(kind) {
      calls.push(['editor', kind]);
    },
  };

  await orchestration.openBodyProfileImageGenerator.call(store, section);

  assert.deepStrictEqual(calls, [
    ['kind', section],
    ['target', section],
    ['contact', 'npc-1'],
    ['context', section, contact, 'dressed'],
    ['editor', 'dressed'],
  ]);
  assert.strictEqual(store.wechatSelectedContact, 'npc-1');
  assert.deepStrictEqual(store.wechatAlbumBodyFigureContext, {
    characterId: 'npc-1',
    kind: 'dressed',
    sectionTitle: 'dressed',
  });
  assert.strictEqual(store.wechatAlbumPromptOpen, true);
  assert.strictEqual(store.wechatAlbumPromptError, '');
}

async function testFallbackTargetFlow() {
  const calls = [];
  const context = vm.createContext({
    console,
    window: {
      GameModules: {
        app: {
          wechat: {
            albumBodyFigureContextHelpers: {
              wechatAlbumBodyFigureContext: () => ({ characterId: 'player-self', kind: 'natural' }),
            },
          },
        },
      },
    },
  });
  context.window.window = context.window;
  const orchestration = loadBodyProfileGeneratorOrchestration(context);
  const store = {
    identityTargetId: '',
    wechatSelectedContact: '',
    wechatAlbumPromptOpen: false,
    wechatAlbumPromptError: 'old error',
    bodyProfileImageKind: () => 'natural',
    bodyProfileTargetState: () => null,
    wechatContactFromState(id) {
      calls.push(id);
      return { id };
    },
    openWechatAlbumPromptEditor: async (kind) => calls.push(kind),
  };

  await orchestration.openBodyProfileImageGenerator.call(store, { title: 'natural' });

  assert.deepStrictEqual(calls, ['player-self', 'natural']);
  assert.strictEqual(store.wechatSelectedContact, 'player-self');
  assert.strictEqual(store.wechatAlbumPromptOpen, true);
  assert.strictEqual(store.wechatAlbumPromptError, '');
}

(async () => {
  await testFacadeForwarding();
  console.log('PASS body profile generator facade forwards context and arguments');
  await testTargetStateFlow();
  console.log('PASS body profile generator orchestration preserves target state flow');
  await testFallbackTargetFlow();
  console.log('PASS body profile generator orchestration preserves player fallback flow');
})().catch((err) => {
    console.error(err);
    process.exit(1);
});
