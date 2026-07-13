const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const context = vm.createContext({
  window: { GameModules: {} },
});
context.window.window = context.window;

const helperPath = path.join(
  __dirname,
  '..',
  'publish',
  'app',
  'wechat',
  'album-generate-helpers.js',
);
vm.runInContext(fs.readFileSync(helperPath, 'utf8'), context, {
  filename: 'publish/app/wechat/album-generate-helpers.js',
});

const helpers = context.window.GameModules.app.wechat.albumGenerateHelpers;
const state = helpers.wechatAlbumGenerationStartState(7);

assert.deepStrictEqual(
  JSON.parse(JSON.stringify(state)),
  {
    requestId: 8,
    generating: true,
    promptOpen: false,
  },
);

console.log('PASS album generation start state increments request id and enters busy state');
