const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const sourcePath = 'publish/wechat-chat-actions.js';
const helperPath = 'publish/app/wechat/chat-reply-helpers.js';
const webManifestPath = 'publish/boot/script-manifest.js';
const webScriptsPath = 'publish/boot/scripts.json';
const androidManifestPath = 'mobile/android-webview-shell/app/src/main/assets/publish/boot/script-manifest.js';
const androidScriptsPath = 'mobile/android-webview-shell/app/src/main/assets/publish/boot/scripts.json';

const source = read(sourcePath);
const helper = read(helperPath);

const violations = [];

function fail(message) {
  violations.push(message);
}

function has(text, needle) {
  return text.includes(needle);
}

function assertIncludes(text, needle, label) {
  if (!has(text, needle)) fail(`${label}: missing "${needle}"`);
}

function assertNotIncludes(text, needle, label) {
  if (has(text, needle)) fail(`${label}: still contains "${needle}"`);
}

function assertOrder(text, needles, label) {
  let cursor = -1;
  for (const needle of needles) {
    const next = text.indexOf(needle, cursor + 1);
    if (next < 0) {
      fail(`${label}: missing ordered marker "${needle}"`);
      return;
    }
    if (next <= cursor) {
      fail(`${label}: marker out of order "${needle}"`);
      return;
    }
    cursor = next;
  }
}

function methodBlock(name, nextName = null) {
  const startPattern = new RegExp(`\\n  (?:async )?${name}\\(`);
  const startMatch = startPattern.exec(source);
  if (!startMatch) {
    fail(`${sourcePath}: missing method ${name}`);
    return '';
  }
  const start = startMatch.index;
  if (!nextName) return source.slice(start);
  const nextPattern = new RegExp(`\\n  (?:async )?${nextName}\\(`);
  const nextMatch = nextPattern.exec(source.slice(start + 1));
  if (!nextMatch) {
    fail(`${sourcePath}: missing next method ${nextName} after ${name}`);
    return source.slice(start);
  }
  return source.slice(start, start + 1 + nextMatch.index);
}

const sendBlock = methodBlock('sendWechatMessage', 'replyWechatContact');
const replyBlock = methodBlock('replyWechatContact', 'generateWechatReply');
const generateBlock = methodBlock('generateWechatReply', 'wechatReplyPrompt');

assertIncludes(source, "const wechatChatReplyForwarders = {", `${sourcePath} reply facade`);
assertIncludes(source, "wechatContactProfileText: 'wechatContactProfileText'", `${sourcePath} reply facade`);
assertIncludes(source, "validateWechatReply: 'validateWechatReply'", `${sourcePath} reply facade`);
assertIncludes(source, "fallbackWechatReply: 'fallbackWechatReply'", `${sourcePath} reply facade`);
assertIncludes(source, 'callWechatChatReplyHelper(helperName, this, ...args)', `${sourcePath} reply facade`);

for (const marker of [
  'wechatContactProfileText(contact, playerText = \'\')',
  'validateWechatReply(raw, contact)',
  'fallbackWechatReply(contact, text)',
]) {
  assertNotIncludes(source, `\n  ${marker}`, `${sourcePath} should not own reply helper implementation`);
  assertIncludes(helper, `\n  ${marker}`, `${helperPath} should own reply helper implementation`);
}

assertOrder(sendBlock, [
  "const text = String(this.wechatInput || '').trim();",
  'const target = this.wechatSelected();',
  'if (!text || this.wechatSending || !target) return;',
  "this.wechatError = '';",
  "this.wechatInput = '';",
  'this.wechatMentionPanelOpen = false;',
  'this.appendWechatMessage(this.wechatMessageKey(target)',
  "if (target.group) await this.recordWechatWorldline(target, text, '');",
  'await this.save?.();',
  'if (target.group) return;',
  'await this.replyWechatContact(target, text);',
], 'sendWechatMessage order');

assertOrder(replyBlock, [
  'this.wechatSending = true;',
  'const reqId = (this.wechatReplyRequestId || 0) + 1;',
  'this.wechatReplyRequestId = reqId;',
  'const result = await this.generateWechatReply(contact, playerText);',
  'if (reqId !== this.wechatReplyRequestId) return;',
  'const characterId = contact.id;',
  'const state = this.rpgStates?.[characterId]',
  'result.characterCardChanges = await window.GameModules.characterCardLexicon?.applyToState?.',
  'await this.applyMetricUpdatesToState?.(state, result.metricUpdates);',
  'await this.applyInventoryUpdatesToState?.(state, result.lexiconUpdates || []);',
  'this.advancePhoneTime?.(result.elapsedSeconds || 60);',
  'this.appendWechatMessage(characterId',
  'if (result.imageIntent?.offer) await this.appendWechatPendingImageMessage',
  'await window.GameModules.characterMemory?.recordWechatExchange?.',
  'window.GameModules.factionArchive?.recordWechat?.',
  'await this.recordWechatWorldline',
  'this.debugWechatMemory?.',
  'await this.save?.();',
], 'replyWechatContact success order');

assertOrder(replyBlock, [
  '} catch (err) {',
  'if (reqId !== this.wechatReplyRequestId) return;',
  'this.wechatError = err.message',
  'const fallback =',
  'const characterId = contact.id;',
  'const state = this.rpgStates?.[characterId]',
  'this.advancePhoneTime?.(60);',
  'this.appendWechatMessage(characterId',
  'await window.GameModules.characterMemory?.recordWechatExchange?.',
  'window.GameModules.factionArchive?.recordWechat?.',
  'await this.recordWechatWorldline',
  'await this.save?.();',
  '} finally {',
  'if (reqId === this.wechatReplyRequestId) this.wechatSending = false;',
], 'replyWechatContact failure/finally order');

assertOrder(generateBlock, [
  'if (!window.dzmm?.completions) return { reply: this.fallbackWechatReply(contact, playerText), elapsedSeconds: 60, impression: 20 };',
  'try { await this.ensureWechatUserProfile?.(contact); }',
  'const prompt = await this.wechatReplyPrompt(contact, playerText);',
  'const result = await window.GameModules.jsonUtils.generateJsonWithRetry({',
  "source: 'wechat-chat-reply'",
  "promptId: 'wechat-chat-reply'",
  'validate: (raw) => this.validateWechatReply(raw, contact),',
  'return this.attachWechatMentionedImageIntent?.(result, playerText, this.wechatMessageKey(contact)) || result;',
], 'generateWechatReply order');

function parseJsonList(relativePath) {
  try {
    const value = JSON.parse(read(relativePath));
    if (!Array.isArray(value)) {
      fail(`${relativePath}: expected JSON array`);
      return [];
    }
    return value;
  } catch (err) {
    fail(`${relativePath}: JSON parse failed: ${err.message}`);
    return [];
  }
}

function assertListOrder(list, relativePath) {
  const helperIndex = list.indexOf('app/wechat/chat-reply-helpers.js');
  const actionIndex = list.indexOf('wechat-chat-actions.js');
  if (helperIndex < 0) fail(`${relativePath}: missing app/wechat/chat-reply-helpers.js`);
  if (actionIndex < 0) fail(`${relativePath}: missing wechat-chat-actions.js`);
  if (helperIndex >= 0 && actionIndex >= 0 && helperIndex > actionIndex) {
    fail(`${relativePath}: chat-reply-helpers.js must load before wechat-chat-actions.js`);
  }
}

function assertManifestOrder(relativePath) {
  const text = read(relativePath);
  assertOrder(text, [
    '"app/wechat/chat-message-helpers.js"',
    '"app/wechat/chat-reply-helpers.js"',
    '"app/wechat/mention-view-helpers.js"',
    '"wechat-chat-actions.js"',
  ], `${relativePath} wechat manifest order`);
}

assertManifestOrder(webManifestPath);
assertManifestOrder(androidManifestPath);
assertListOrder(parseJsonList(webScriptsPath), webScriptsPath);
assertListOrder(parseJsonList(androidScriptsPath), androidScriptsPath);

if (violations.length) {
  console.error(JSON.stringify({ ok: false, violations }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  checked: {
    sourcePath,
    helperPath,
    manifests: [webManifestPath, webScriptsPath, androidManifestPath, androidScriptsPath],
    invariants: [
      'reply-helper-facade',
      'send-message-order',
      'reply-success-order',
      'reply-failure-finally-order',
      'generate-reply-order',
      'runtime-manifest-order',
    ],
  },
}, null, 2));
