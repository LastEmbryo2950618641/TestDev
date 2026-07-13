const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const sourcePath = 'publish/wechat-chat-actions.js';
const pastEventPath = 'publish/wechat-past-event-actions.js';
const helperPath = 'publish/app/wechat/chat-reply-helpers.js';
const orchestrationPath = 'publish/app/wechat/chat-orchestration.js';
const promptHelperPath = 'publish/app/wechat/chat-prompt-helpers.js';
const memoryContextActionPath = 'publish/wechat-memory-context-actions.js';
const historyContextHelperPath = 'publish/app/wechat/history-context-helpers.js';
const mentionActionPath = 'publish/wechat-mention-actions.js';
const mentionReferenceHelperPath = 'publish/app/wechat/mention-reference-helpers.js';
const imageActionPath = 'publish/wechat-image-actions.js';
const imageRecordHelperPath = 'publish/app/wechat/image-record-helpers.js';
const imageUiHelperPath = 'publish/app/wechat/image-ui-helpers.js';
const webManifestPath = 'publish/boot/script-manifest.js';
const webScriptsPath = 'publish/boot/scripts.json';
const androidManifestPath = 'mobile/android-webview-shell/app/src/main/assets/publish/boot/script-manifest.js';
const androidScriptsPath = 'mobile/android-webview-shell/app/src/main/assets/publish/boot/scripts.json';

const source = read(sourcePath);
const pastEvent = read(pastEventPath);
const helper = read(helperPath);
const orchestration = read(orchestrationPath);
const promptHelper = read(promptHelperPath);
const memoryContextAction = read(memoryContextActionPath);
const historyContextHelper = read(historyContextHelperPath);
const mentionAction = read(mentionActionPath);
const mentionReferenceHelper = read(mentionReferenceHelperPath);
const imageAction = read(imageActionPath);
const imageRecordHelper = read(imageRecordHelperPath);
const imageUiHelper = read(imageUiHelperPath);

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

function methodBlock(text, relativePath, name, nextName = null) {
  const startPattern = new RegExp(`\\n  (?:async )?${name}\\(`);
  const startMatch = startPattern.exec(text);
  if (!startMatch) {
    fail(`${relativePath}: missing method ${name}`);
    return '';
  }
  const start = startMatch.index;
  if (!nextName) return text.slice(start);
  const nextPattern = new RegExp(`\\n  (?:async )?${nextName}\\(`);
  const nextMatch = nextPattern.exec(text.slice(start + 1));
  if (!nextMatch) {
    fail(`${relativePath}: missing next method ${nextName} after ${name}`);
    return text.slice(start);
  }
  return text.slice(start, start + 1 + nextMatch.index);
}

const sendBlock = methodBlock(orchestration, orchestrationPath, 'sendWechatMessage', 'replyWechatContact');
const replyBlock = methodBlock(orchestration, orchestrationPath, 'replyWechatContact', 'generateWechatReply');
const generateBlock = methodBlock(orchestration, orchestrationPath, 'generateWechatReply');
const promptBlock = methodBlock(promptHelper, promptHelperPath, 'wechatReplyPrompt');

assertIncludes(source, "const wechatChatReplyForwarders = {", `${sourcePath} reply facade`);
assertIncludes(source, "wechatContactProfileText: 'wechatContactProfileText'", `${sourcePath} reply facade`);
assertIncludes(source, "validateWechatReply: 'validateWechatReply'", `${sourcePath} reply facade`);
assertIncludes(source, "fallbackWechatReply: 'fallbackWechatReply'", `${sourcePath} reply facade`);
assertIncludes(source, 'callWechatChatReplyHelper(helperName, this, ...args)', `${sourcePath} reply facade`);

assertIncludes(source, "const wechatChatOrchestrationForwarders = {", `${sourcePath} orchestration facade`);
assertIncludes(source, "sendWechatMessage: 'sendWechatMessage'", `${sourcePath} orchestration facade`);
assertIncludes(source, "replyWechatContact: 'replyWechatContact'", `${sourcePath} orchestration facade`);
assertIncludes(source, "generateWechatReply: 'generateWechatReply'", `${sourcePath} orchestration facade`);
assertIncludes(source, 'callWechatChatOrchestration(helperName, this, ...args)', `${sourcePath} orchestration facade`);

for (const marker of [
  'wechatContactProfileText(contact, playerText = \'\')',
  'validateWechatReply(raw, contact)',
  'fallbackWechatReply(contact, text)',
]) {
  assertNotIncludes(source, `\n  ${marker}`, `${sourcePath} should not own reply helper implementation`);
  assertIncludes(helper, `\n  ${marker}`, `${helperPath} should own reply helper implementation`);
}

for (const marker of [
  'async sendWechatMessage()',
  'async replyWechatContact(contact, playerText)',
  'async generateWechatReply(contact, playerText)',
]) {
  assertNotIncludes(source, `\n  ${marker}`, `${sourcePath} should not own chat orchestration implementation`);
  assertIncludes(orchestration, `\n  ${marker}`, `${orchestrationPath} should own chat orchestration implementation`);
}

assertIncludes(pastEvent, "const wechatChatPromptForwarders = {", `${pastEventPath} prompt facade`);
assertIncludes(pastEvent, "isWechatPastEventQuestion: 'isWechatPastEventQuestion'", `${pastEventPath} prompt facade`);
assertIncludes(pastEvent, "wechatPastEventContext: 'wechatPastEventContext'", `${pastEventPath} prompt facade`);
assertIncludes(pastEvent, "wechatReplyPrompt: 'wechatReplyPrompt'", `${pastEventPath} prompt facade`);
assertIncludes(pastEvent, 'callWechatChatPromptHelper(helperName, this, ...args)', `${pastEventPath} prompt facade`);

for (const marker of [
  'isWechatPastEventQuestion(text = \'\')',
  'wechatPastEventContext(contact, playerText = \'\', state = null)',
  'async wechatReplyPrompt(contact, playerText)',
]) {
  assertNotIncludes(pastEvent, `\n  ${marker}`, `${pastEventPath} should not own chat prompt implementation`);
  assertIncludes(promptHelper, `\n  ${marker}`, `${promptHelperPath} should own chat prompt implementation`);
}

assertIncludes(memoryContextAction, "const wechatHistoryContextForwarders = {", `${memoryContextActionPath} history context facade`);
assertIncludes(memoryContextAction, 'callWechatHistoryContextHelper(helperName, this, ...args)', `${memoryContextActionPath} history context facade`);
for (const marker of [
  'ensureWechatHistoryTable()',
  'async saveWechatHistoryRow(contactId, message)',
  'wechatHistoryCreatedAt(message = {})',
  'listWechatHistoryRows(contactId, limit = 12)',
  'wechatHistoryQueryText(contactId, limit = 12)',
  'wechatHistoryText(id)',
  'wechatMemoryContext(characterId, playerText = \'\')',
  'validateWechatHistoryDecision(raw = {})',
  'async wechatHistoryContextForReply(contactId, playerText = \'\', memoryContext = \'\')',
  'wechatHistoryQueryHint(characterId)',
]) {
  assertNotIncludes(memoryContextAction, `\n  ${marker}`, `${memoryContextActionPath} should not own history context implementation`);
  assertIncludes(historyContextHelper, `\n  ${marker}`, `${historyContextHelperPath} should own history context implementation`);
}

assertIncludes(mentionAction, 'callWechatMentionReferenceHelper', `${mentionActionPath} mention reference facade`);
for (const marker of [
  'wechatMessageMentionId(msg = {}, index = 0)',
  'wechatMentionedImages(text = \'\', currentId = \'\')',
  'attachWechatMentionedImageIntent(result = {}, playerText = \'\', currentId = \'\')',
]) {
  assertIncludes(mentionReferenceHelper, `\n  ${marker}`, `${mentionReferenceHelperPath} should own mention reference implementation`);
}
assertIncludes(methodBlock(mentionAction, mentionActionPath, 'wechatMessageMentionId', 'wechatMessageImageMentionId'), "return callWechatMentionReferenceHelper('wechatMessageMentionId', this, msg, index);", `${mentionActionPath} wechatMessageMentionId facade`);
assertIncludes(methodBlock(mentionAction, mentionActionPath, 'wechatMentionedImages', 'wechatImageMentionSources'), "return callWechatMentionReferenceHelper('wechatMentionedImages', this, text, currentId);", `${mentionActionPath} wechatMentionedImages facade`);
assertIncludes(methodBlock(mentionAction, mentionActionPath, 'attachWechatMentionedImageIntent', 'wechatImageBasePhoto'), "return callWechatMentionReferenceHelper('attachWechatMentionedImageIntent', this, result, playerText, currentId);", `${mentionActionPath} attachWechatMentionedImageIntent facade`);

assertIncludes(imageAction, 'callWechatImageRecordHelper', `${imageActionPath} image record facade`);
for (const marker of [
  'wechatImageRecordText(contactName, label, imageId, imageDescription, read = false)',
  'wechatImageReadRecord(msg = {})',
  'async replaceWechatImageRecord(msg = {}, readRecord = \'\')',
  'replaceWechatImageRecordInMemory(memory = {}, oldRecord = \'\', readRecord = \'\')',
  'replaceWechatImageRecordInWorldline(oldRecord = \'\', readRecord = \'\')',
]) {
  assertIncludes(imageRecordHelper, `\n  ${marker}`, `${imageRecordHelperPath} should own image record implementation`);
}
assertIncludes(methodBlock(imageAction, imageActionPath, 'wechatImageRecordText', 'wechatImageReadRecord'), "return callWechatImageRecordHelper('wechatImageRecordText', this, contactName, label, imageId, imageDescription, read);", `${imageActionPath} wechatImageRecordText facade`);
assertIncludes(methodBlock(imageAction, imageActionPath, 'wechatImageReadRecord', 'replaceWechatImageRecord'), "return callWechatImageRecordHelper('wechatImageReadRecord', this, msg);", `${imageActionPath} wechatImageReadRecord facade`);
assertIncludes(methodBlock(imageAction, imageActionPath, 'replaceWechatImageRecord', 'replaceWechatImageRecordInMemory'), "return callWechatImageRecordHelper('replaceWechatImageRecord', this, msg, readRecord);", `${imageActionPath} replaceWechatImageRecord facade`);
assertIncludes(methodBlock(imageAction, imageActionPath, 'replaceWechatImageRecordInMemory', 'replaceWechatImageRecordInWorldline'), "return callWechatImageRecordHelper('replaceWechatImageRecordInMemory', this, memory, oldRecord, readRecord);", `${imageActionPath} replaceWechatImageRecordInMemory facade`);
assertIncludes(methodBlock(imageAction, imageActionPath, 'replaceWechatImageRecordInWorldline', 'openWechatImageConfirm'), "return callWechatImageRecordHelper('replaceWechatImageRecordInWorldline', this, oldRecord, readRecord);", `${imageActionPath} replaceWechatImageRecordInWorldline facade`);

assertIncludes(imageAction, 'callWechatImageUiHelper', `${imageActionPath} image ui facade`);
for (const marker of [
  'openWechatImageConfirm(msg = {})',
  'closeWechatImageConfirm()',
  'openWechatImagePreview(url = \'\', title = \'图片预览\')',
  'closeWechatImagePreview()',
  'wechatImageConfirmPromptText(msg = this.wechatImageConfirmMessage)',
  'updateWechatImageMessage(targetMsg = {}, patch = {})',
]) {
  assertIncludes(imageUiHelper, `\n  ${marker}`, `${imageUiHelperPath} should own image ui implementation`);
}
assertIncludes(methodBlock(imageAction, imageActionPath, 'openWechatImageConfirm', 'closeWechatImageConfirm'), "return callWechatImageUiHelper('openWechatImageConfirm', this, msg);", `${imageActionPath} openWechatImageConfirm facade`);
assertIncludes(methodBlock(imageAction, imageActionPath, 'closeWechatImageConfirm', 'openWechatImagePreview'), "return callWechatImageUiHelper('closeWechatImageConfirm', this);", `${imageActionPath} closeWechatImageConfirm facade`);
assertIncludes(methodBlock(imageAction, imageActionPath, 'openWechatImagePreview', 'closeWechatImagePreview'), "return callWechatImageUiHelper('openWechatImagePreview', this, url, title);", `${imageActionPath} openWechatImagePreview facade`);
assertIncludes(methodBlock(imageAction, imageActionPath, 'closeWechatImagePreview', 'wechatImageConfirmPromptText'), "return callWechatImageUiHelper('closeWechatImagePreview', this);", `${imageActionPath} closeWechatImagePreview facade`);
assertIncludes(methodBlock(imageAction, imageActionPath, 'wechatImageConfirmPromptText', 'updateWechatImageMessage'), "return callWechatImageUiHelper('wechatImageConfirmPromptText', this, msg);", `${imageActionPath} wechatImageConfirmPromptText facade`);
assertIncludes(methodBlock(imageAction, imageActionPath, 'updateWechatImageMessage', 'wechatRealPhotoForContact'), "return callWechatImageUiHelper('updateWechatImageMessage', this, targetMsg, patch);", `${imageActionPath} updateWechatImageMessage facade`);

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

assertOrder(promptBlock, [
  'const sections = window.GameModules.promptSections;',
  'const player = sections.playerProfile(this);',
  "const stateSkill = await window.GameModules.skillLoader?.instruction?.('emotion.feeling.wearing.assess')",
  'const characterId = this.wechatMessageKey(contact);',
  'const state = this.rpgStates?.[characterId]',
  'const archive = await this.searchMemoryArchive?.(characterId, playerText)',
  'const memoryContext = this.wechatMemoryContext?.(characterId, playerText)',
  'const historyContext = await this.wechatHistoryContextForReply?.',
  "return window.GameModules.renderPrompt('wechat-chat-reply', {",
  'this.wechatContactProfileText(contact, playerText)',
  'sections.stateSnapshot(this, state)',
  'this.wechatMentionContextText?.(playerText, characterId)',
  'this.wechatPastEventContext(contact, playerText, state)',
], 'wechatReplyPrompt effective prompt order');

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
  const orchestrationIndex = list.indexOf('app/wechat/chat-orchestration.js');
  const promptIndex = list.indexOf('app/wechat/chat-prompt-helpers.js');
  const historyContextIndex = list.indexOf('app/wechat/history-context-helpers.js');
  const memoryContextActionIndex = list.indexOf('wechat-memory-context-actions.js');
  const mentionBasePhotoIndex = list.indexOf('app/wechat/mention-base-photo-helper.js');
  const mentionReferenceIndex = list.indexOf('app/wechat/mention-reference-helpers.js');
  const imageRecordIndex = list.indexOf('app/wechat/image-record-helpers.js');
  const imageUiIndex = list.indexOf('app/wechat/image-ui-helpers.js');
  const actionIndex = list.indexOf('wechat-chat-actions.js');
  const pastEventIndex = list.indexOf('wechat-past-event-actions.js');
  const mentionActionIndex = list.indexOf('wechat-mention-actions.js');
  const imageActionIndex = list.indexOf('wechat-image-actions.js');
  if (helperIndex < 0) fail(`${relativePath}: missing app/wechat/chat-reply-helpers.js`);
  if (orchestrationIndex < 0) fail(`${relativePath}: missing app/wechat/chat-orchestration.js`);
  if (promptIndex < 0) fail(`${relativePath}: missing app/wechat/chat-prompt-helpers.js`);
  if (historyContextIndex < 0) fail(`${relativePath}: missing app/wechat/history-context-helpers.js`);
  if (memoryContextActionIndex < 0) fail(`${relativePath}: missing wechat-memory-context-actions.js`);
  if (mentionReferenceIndex < 0) fail(`${relativePath}: missing app/wechat/mention-reference-helpers.js`);
  if (imageRecordIndex < 0) fail(`${relativePath}: missing app/wechat/image-record-helpers.js`);
  if (imageUiIndex < 0) fail(`${relativePath}: missing app/wechat/image-ui-helpers.js`);
  if (actionIndex < 0) fail(`${relativePath}: missing wechat-chat-actions.js`);
  if (pastEventIndex < 0) fail(`${relativePath}: missing wechat-past-event-actions.js`);
  if (mentionActionIndex < 0) fail(`${relativePath}: missing wechat-mention-actions.js`);
  if (imageActionIndex < 0) fail(`${relativePath}: missing wechat-image-actions.js`);
  if (helperIndex >= 0 && orchestrationIndex >= 0 && helperIndex > orchestrationIndex) {
    fail(`${relativePath}: chat-reply-helpers.js must load before chat-orchestration.js`);
  }
  if (orchestrationIndex >= 0 && promptIndex >= 0 && orchestrationIndex > promptIndex) {
    fail(`${relativePath}: chat-orchestration.js must load before chat-prompt-helpers.js`);
  }
  if (orchestrationIndex >= 0 && actionIndex >= 0 && orchestrationIndex > actionIndex) {
    fail(`${relativePath}: chat-orchestration.js must load before wechat-chat-actions.js`);
  }
  if (promptIndex >= 0 && pastEventIndex >= 0 && promptIndex > pastEventIndex) {
    fail(`${relativePath}: chat-prompt-helpers.js must load before wechat-past-event-actions.js`);
  }
  if (historyContextIndex >= 0 && memoryContextActionIndex >= 0 && historyContextIndex > memoryContextActionIndex) {
    fail(`${relativePath}: history-context-helpers.js must load before wechat-memory-context-actions.js`);
  }
  if (mentionBasePhotoIndex >= 0 && mentionReferenceIndex >= 0 && mentionBasePhotoIndex > mentionReferenceIndex) {
    fail(`${relativePath}: mention-base-photo-helper.js must load before mention-reference-helpers.js`);
  }
  if (mentionReferenceIndex >= 0 && mentionActionIndex >= 0 && mentionReferenceIndex > mentionActionIndex) {
    fail(`${relativePath}: mention-reference-helpers.js must load before wechat-mention-actions.js`);
  }
  if (imageRecordIndex >= 0 && imageActionIndex >= 0 && imageRecordIndex > imageActionIndex) {
    fail(`${relativePath}: image-record-helpers.js must load before wechat-image-actions.js`);
  }
  if (imageUiIndex >= 0 && imageActionIndex >= 0 && imageUiIndex > imageActionIndex) {
    fail(`${relativePath}: image-ui-helpers.js must load before wechat-image-actions.js`);
  }
}

function assertManifestOrder(relativePath) {
  const text = read(relativePath);
  assertOrder(text, [
    '"app/wechat/history-context-helpers.js"',
    '"wechat-memory-context-actions.js"',
    '"app/wechat/chat-message-helpers.js"',
    '"app/wechat/chat-reply-helpers.js"',
    '"app/wechat/chat-orchestration.js"',
    '"app/wechat/chat-prompt-helpers.js"',
    '"app/wechat/mention-view-helpers.js"',
    '"app/wechat/mention-base-photo-helper.js"',
    '"app/wechat/mention-reference-helpers.js"',
    '"wechat-chat-actions.js"',
    '"wechat-past-event-actions.js"',
    '"app/wechat/image-record-helpers.js"',
    '"app/wechat/image-ui-helpers.js"',
    '"wechat-image-actions.js"',
    '"wechat-mention-actions.js"',
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
    pastEventPath,
      helperPath,
      orchestrationPath,
      promptHelperPath,
      memoryContextActionPath,
      historyContextHelperPath,
      mentionActionPath,
      mentionReferenceHelperPath,
      imageActionPath,
      imageRecordHelperPath,
      imageUiHelperPath,
      manifests: [webManifestPath, webScriptsPath, androidManifestPath, androidScriptsPath],
    invariants: [
      'reply-helper-facade',
      'chat-orchestration-facade',
      'chat-prompt-facade',
      'history-context-facade',
      'mention-reference-facade',
      'image-record-facade',
      'image-ui-facade',
      'send-message-order',
      'reply-success-order',
      'reply-failure-finally-order',
      'generate-reply-order',
      'effective-reply-prompt-order',
      'runtime-manifest-order',
    ],
  },
}, null, 2));
