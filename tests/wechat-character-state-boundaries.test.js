const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const consumers = [
  'publish/app/wechat/album-orchestration.js',
  'publish/app/wechat/album-prompt-helpers.js',
  'publish/app/wechat/chat-orchestration.js',
  'publish/app/wechat/chat-prompt-helpers.js',
  'publish/app/wechat/chat-reply-helpers.js',
  'publish/app/wechat/image-prompt-helpers.js',
  'publish/app/wechat/memory-debug-orchestration.js',
];

for (const relativePath of consumers) {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
  assert.doesNotMatch(
    source,
    /sqliteSave\?\.getCharacterState/u,
    `${relativePath} must resolve character state through characterStateStore`,
  );
}

console.log('PASS WeChat character-state consumers stay behind the shared store');
