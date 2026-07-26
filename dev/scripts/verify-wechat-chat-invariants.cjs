const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const sourcePath = 'publish/wechat-chat-actions.js';
const pastEventPath = 'publish/wechat-past-event-actions.js';
const chatSessionPath = 'publish/app/wechat/chat-session.js';
const helperPath = 'publish/app/wechat/chat-reply-helpers.js';
const orchestrationPath = 'publish/app/wechat/chat-orchestration.js';
const promptHelperPath = 'publish/app/wechat/chat-prompt-helpers.js';
const memoryContextActionPath = 'publish/wechat-memory-context-actions.js';
const historyContextHelperPath = 'publish/app/wechat/history-context-helpers.js';
const mentionActionPath = 'publish/wechat-mention-actions.js';
const mentionViewHelperPath = 'publish/app/wechat/mention-view-helpers.js';
const mentionBasePhotoHelperPath = 'publish/app/wechat/mention-base-photo-helper.js';
const mentionReferenceHelperPath = 'publish/app/wechat/mention-reference-helpers.js';
const mentionInputHelperPath = 'publish/app/wechat/mention-input-helper.js';
const imageActionPath = 'publish/wechat-image-actions.js';
const imageRecordHelperPath = 'publish/app/wechat/image-record-helpers.js';
const imageUiHelperPath = 'publish/app/wechat/image-ui-helpers.js';
const imageAlbumHelperPath = 'publish/app/wechat/image-album-helpers.js';
const imagePromptHelperPath = 'publish/app/wechat/image-prompt-helpers.js';
const imageReceiveOrchestrationPath = 'publish/app/wechat/image-receive-orchestration.js';
const imageOfferOrchestrationPath = 'publish/app/wechat/image-offer-orchestration.js';
const webManifestPath = 'publish/boot/script-manifest.js';
const webScriptsPath = 'publish/boot/scripts.json';
const androidManifestPath = 'mobile/android-webview-shell/app/src/main/assets/publish/boot/script-manifest.js';
const androidScriptsPath = 'mobile/android-webview-shell/app/src/main/assets/publish/boot/scripts.json';

const source = read(sourcePath);
const pastEvent = read(pastEventPath);
const chatSession = read(chatSessionPath);
const helper = read(helperPath);
const orchestration = read(orchestrationPath);
const promptHelper = read(promptHelperPath);
const memoryContextAction = read(memoryContextActionPath);
const historyContextHelper = read(historyContextHelperPath);
const mentionAction = read(mentionActionPath);
const mentionViewHelper = read(mentionViewHelperPath);
const mentionBasePhotoHelper = read(mentionBasePhotoHelperPath);
const mentionReferenceHelper = read(mentionReferenceHelperPath);
const mentionInputHelper = read(mentionInputHelperPath);
const imageAction = read(imageActionPath);
const imageRecordHelper = read(imageRecordHelperPath);
const imageUiHelper = read(imageUiHelperPath);
const imageAlbumHelper = read(imageAlbumHelperPath);
const imagePromptHelper = read(imagePromptHelperPath);
const imageReceiveOrchestration = read(imageReceiveOrchestrationPath);
const imageOfferOrchestration = read(imageOfferOrchestrationPath);

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

for (const marker of [
  '[微信] 选中联系人资料补全失败',
  "name: '系统'",
  "mark: '系'",
  '新手机已激活，微信数据同步完成。',
  '资料已同步。',
]) {
  assertIncludes(chatSession, marker, `${chatSessionPath} should keep readable UTF-8 defaults`);
}
for (const marker of ['寰俊', '鑱旂郴', '鏂版墜', '璧勬枡', '绯荤粺']) {
  assertNotIncludes(chatSession, marker, `${chatSessionPath} should not contain mojibake defaults`);
}

assertIncludes(source, 'const wechatChatFacadeGroups = [', `${sourcePath} declarative chat facade groups`);
assertIncludes(source, 'function callWechatChatModule(moduleName, methodName, context, args)', `${sourcePath} generic chat module caller`);
assertIncludes(source, 'window.GameModules.wechatChatActions = {};', `${sourcePath} chat action shell`);
assertIncludes(source, 'callWechatChatModule(group.moduleName, helperName, this, args)', `${sourcePath} declarative chat facade dispatch`);
for (const marker of [
  "moduleName: 'chatSession'",
  "moduleName: 'chatMessageHelpers'",
  "moduleName: 'chatReplyHelpers'",
  "moduleName: 'chatOrchestration'",
  "selectWechatContact: 'selectContact'",
  "wechatMessageKey: 'messageKey'",
  "wechatMessages: 'messages'",
  "updateWechatLatest: 'updateLatest'",
  "appendWechatMessage: 'appendWechatMessage'",
  "wechatMessageTime: 'wechatMessageTime'",
  "wechatMemoryTime: 'wechatMemoryTime'",
  "wechatDialogueTimeLabel: 'wechatDialogueTimeLabel'",
  "formatWechatDialogueLog: 'formatWechatDialogueLog'",
  "wechatTimeValue: 'wechatTimeValue'",
  "wechatTimeDisplay: 'wechatTimeDisplay'",
  "wechatContactProfileText: 'wechatContactProfileText'",
  "validateWechatReply: 'validateWechatReply'",
  "normalizeWechatBodyStatusUpdates: 'normalizeWechatBodyStatusUpdates'",
  "fallbackWechatReply: 'fallbackWechatReply'",
  "sendWechatMessage: 'sendWechatMessage'",
  "replyWechatContact: 'replyWechatContact'",
  "generateWechatReply: 'generateWechatReply'",
  "applyWechatBodyStatusUpdates: 'applyWechatBodyStatusUpdates'",
  "fallbackWechatBehavior: 'fallbackWechatBehavior'",
  "wechatBehaviorShortPrompt: 'wechatBehaviorShortPrompt'",
  "validateWechatBehaviorShort: 'validateWechatBehaviorShort'",
  "runWechatBehaviorShortInference: 'runWechatBehaviorShortInference'",
]) {
  assertIncludes(source, marker, `${sourcePath} declarative chat facade should expose ${marker}`);
}

for (const marker of [
  'wechatContactProfileText(contact, playerText = \'\')',
  'validateWechatReply(raw, contact)',
  'normalizeWechatBodyStatusUpdates(raw = [])',
  'fallbackWechatReply(contact, text)',
]) {
  assertNotIncludes(source, `\n  ${marker}`, `${sourcePath} should not own reply helper implementation`);
  assertIncludes(helper, `\n  ${marker}`, `${helperPath} should own reply helper implementation`);
}

for (const marker of [
  'async sendWechatMessage()',
  'async replyWechatContact(contact, playerText)',
  'async generateWechatReply(contact, playerText)',
  'async applyWechatBodyStatusUpdates(state, updates = [])',
  'async runWechatBehaviorShortInference(contact, playerText, replyText, state, meta = {})',
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
  assertNotIncludes(source, `\n  ${marker}`, `${sourcePath} should not own chat prompt implementation`);
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

assertIncludes(mentionAction, 'const wechatMentionFacadeGroups = [', `${mentionActionPath} declarative mention facade groups`);
assertIncludes(mentionAction, 'function callWechatMentionModule(moduleName, methodName, context, args)', `${mentionActionPath} generic mention module caller`);
assertIncludes(mentionAction, 'window.GameModules.wechatMentionActions = {};', `${mentionActionPath} mention action shell`);
assertIncludes(mentionAction, 'callWechatMentionModule(group.moduleName, methodName, this, args)', `${mentionActionPath} declarative mention facade dispatch`);
for (const [text, relativePath, label] of [
  [mentionAction, mentionActionPath, 'mention action'],
  [mentionViewHelper, mentionViewHelperPath, 'mention view helper'],
  [mentionBasePhotoHelper, mentionBasePhotoHelperPath, 'mention base-photo helper'],
  [mentionReferenceHelper, mentionReferenceHelperPath, 'mention reference helper'],
  [mentionInputHelper, mentionInputHelperPath, 'mention input helper'],
]) {
  for (const marker of ['娑堟伅', '鍥剧墖', '鐜╁', '鑱旂郴浜']) {
    assertNotIncludes(text, marker, `${relativePath} ${label} should not contain mojibake mention text`);
  }
}
for (const marker of [
  '@消息',
  '玩家',
  '联系人',
  '当前微信对话',
  '其它微信对话',
  '当前联系人相册',
  '其它联系人相册',
  '无描述',
]) {
  assertIncludes(mentionViewHelper, marker, `${mentionViewHelperPath} should keep readable UTF-8 mention text`);
}
assertIncludes(mentionBasePhotoHelper, '@图片', `${mentionBasePhotoHelperPath} should keep readable UTF-8 image mention insert text`);
for (const marker of ['图片)?', '图片\\[']) {
  assertIncludes(mentionReferenceHelper, marker, `${mentionReferenceHelperPath} should keep readable UTF-8 image mention parse text`);
}
for (const marker of [
  'insertWechatMention(text = \'\')',
  'mentionWechatMessage(msg = {}, index = 0)',
]) {
  assertIncludes(mentionInputHelper, `\n  ${marker}`, `${mentionInputHelperPath} should own mention input implementation`);
}
assertIncludes(mentionInputHelper, '@消息', `${mentionInputHelperPath} should keep readable message mention insert text`);
for (const marker of [
  'wechatMessageMentionId(msg = {}, index = 0)',
  'wechatMentionedImages(text = \'\', currentId = \'\')',
  'attachWechatMentionedImageIntent(result = {}, playerText = \'\', currentId = \'\')',
]) {
  assertIncludes(mentionReferenceHelper, `\n  ${marker}`, `${mentionReferenceHelperPath} should own mention reference implementation`);
}
for (const marker of [
  'mentionWechatImage(msg = {}, index = 0)',
  'wechatImageMentionId(photo = {}, index = 0)',
  'wechatMessageImageMentionId(msg = {}, index = 0)',
  'wechatImageBasePhoto(msg = {})',
]) {
  assertIncludes(mentionBasePhotoHelper, `\n  ${marker}`, `${mentionBasePhotoHelperPath} should own mention base-photo implementation`);
}
for (const marker of [
  'wechatMentionedContacts(text = \'\')',
  'wechatMentionedMessages(text = \'\', currentId = \'\')',
  'wechatMessageMentionSources(currentId = \'\')',
  'wechatImageMentionSources(currentId = \'\')',
  'wechatMentionContextText(playerText = \'\', currentId = \'\')',
]) {
  assertIncludes(mentionViewHelper, `\n  ${marker}`, `${mentionViewHelperPath} should own mention view implementation`);
}
for (const marker of [
  "moduleName: 'mentionInputHelper'",
  "moduleName: 'mentionBasePhotoHelper'",
  "moduleName: 'mentionReferenceHelpers'",
  "moduleName: 'mentionViewHelpers'",
  "'insertWechatMention'",
  "'mentionWechatMessage'",
  "'mentionWechatImage'",
  "'wechatImageMentionId'",
  "'wechatMessageImageMentionId'",
  "'wechatImageBasePhoto'",
  "'wechatMessageMentionId'",
  "'wechatMentionedImages'",
  "'attachWechatMentionedImageIntent'",
  "'wechatMentionedContacts'",
  "'wechatMentionedMessages'",
  "'wechatMessageMentionSources'",
  "'wechatImageMentionSources'",
  "'wechatMentionContextText'",
]) {
  assertIncludes(mentionAction, marker, `${mentionActionPath} declarative mention facade should expose ${marker}`);
}
for (const marker of [
  'const value = String(this.wechatInput || \'\')',
  'wechatContacts?.()',
  'wechatMessagesByContact',
  'wechatAlbumPhotos',
  'imageIntent?.baseImage',
  'baseImage: {',
  '图片ID：',
]) {
  assertNotIncludes(mentionAction, marker, `${mentionActionPath} should not own mention business implementation`);
}

assertIncludes(imageAction, 'const wechatImageFacadeGroups = [', `${imageActionPath} declarative image facade groups`);
assertIncludes(imageAction, 'const wechatImageAsyncFacades = new Set([', `${imageActionPath} async image facade set`);
assertIncludes(imageAction, 'function callWechatImageModule(moduleName, methodName, context, args)', `${imageActionPath} generic image module caller`);
assertIncludes(imageAction, 'window.GameModules.wechatImageActions = {};', `${imageActionPath} image action shell`);
assertIncludes(imageAction, 'callWechatImageModule(group.moduleName, methodName, this, args)', `${imageActionPath} declarative image facade dispatch`);
for (const marker of [
  'memory.shortTerm.recent.push',
  'appendWorldlineEvent',
  'renderPrompt',
  'drawProvider',
  'wechatImageGenerating',
  'imageStatus:',
]) {
  assertNotIncludes(imageAction, marker, `${imageActionPath} should not own image business implementation`);
}
for (const marker of [
  "moduleName: 'imageOfferOrchestration'",
  "moduleName: 'imageRecordHelpers'",
  "moduleName: 'imageUiHelpers'",
  "moduleName: 'imageAlbumHelpers'",
  "moduleName: 'imagePromptHelpers'",
  "moduleName: 'imageReceiveOrchestration'",
  "'appendWechatPendingImageMessage'",
  "'recordWechatImageOffer'",
  "'wechatImageRecordText'",
  "'wechatImageReadRecord'",
  "'replaceWechatImageRecord'",
  "'replaceWechatImageRecordInMemory'",
  "'replaceWechatImageRecordInWorldline'",
  "'openWechatImageConfirm'",
  "'closeWechatImageConfirm'",
  "'openWechatImagePreview'",
  "'closeWechatImagePreview'",
  "'wechatImageConfirmPromptText'",
  "'updateWechatImageMessage'",
  "'wechatRealPhotoForContact'",
  "'addWechatImageToAlbum'",
  "'wechatMemorySections'",
  "'wechatWearingContext'",
  "'cleanWechatImageTags'",
  "'buildWechatImageTags'",
  "'confirmWechatImageReceive'",
]) {
  assertIncludes(imageAction, marker, `${imageActionPath} declarative image facade should expose ${marker}`);
}
for (const marker of [
  "'appendWechatPendingImageMessage'",
  "'recordWechatImageOffer'",
  "'replaceWechatImageRecord'",
  "'buildWechatImageTags'",
  "'confirmWechatImageReceive'",
]) {
  assertIncludes(imageAction, marker, `${imageActionPath} async image facade should include ${marker}`);
}

for (const marker of [
  'wechatImageRecordText(contactName, label, imageId, imageDescription, read = false)',
  'wechatImageReadRecord(msg = {})',
  'async replaceWechatImageRecord(msg = {}, readRecord = \'\')',
  'replaceWechatImageRecordInMemory(memory = {}, oldRecord = \'\', readRecord = \'\')',
  'replaceWechatImageRecordInWorldline(oldRecord = \'\', readRecord = \'\')',
]) {
  assertIncludes(imageRecordHelper, `\n  ${marker}`, `${imageRecordHelperPath} should own image record implementation`);
}

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

for (const marker of [
  'wechatRealPhotoForContact(characterId = this.wechatSelectedContact)',
  'addWechatImageToAlbum(characterId = \'\', photo = {})',
]) {
  assertIncludes(imageAlbumHelper, `\n  ${marker}`, `${imageAlbumHelperPath} should own image album implementation`);
}

for (const marker of [
  'wechatMemorySections(characterId = \'\')',
  'wechatWearingContext(state = {})',
  'cleanWechatImageTags(text = \'\')',
  'async buildWechatImageTags(msg = {})',
]) {
  assertIncludes(imagePromptHelper, `\n  ${marker}`, `${imagePromptHelperPath} should own image prompt implementation`);
}

assertIncludes(imageReceiveOrchestration, '\n  async confirmWechatImageReceive()', `${imageReceiveOrchestrationPath} should own image receive orchestration implementation`);

for (const marker of [
  'async appendWechatPendingImageMessage(characterId, state = {}, contact = {}, imageIntent = {})',
  'async recordWechatImageOffer(contact = {}, time = {}, imageRecord = \'\', imageId = \'\', imageIntent = {})',
]) {
  assertIncludes(imageOfferOrchestration, `\n  ${marker}`, `${imageOfferOrchestrationPath} should own image offer orchestration implementation`);
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
  'result.bodyStatusUpdates = await this.applyWechatBodyStatusUpdates?.',
  'this.advancePhoneTime?.(result.elapsedSeconds || 60);',
  'this.appendWechatMessage(characterId',
  'if (result.imageIntent?.offer) await this.appendWechatPendingImageMessage',
  'await window.GameModules.characterMemory?.recordWechatExchange?.',
  'window.GameModules.factionArchive?.recordWechat?.',
  'await this.recordWechatWorldline',
  'this.debugWechatMemory?.',
  'window.GameModules.wechatOutreachContext?.closeOutreach?.',
  'window.GameModules.realWorldAgentLoop?.appendWechatDialogueContext?.',
  'await window.GameModules.realWorldAgentLoop?.mirrorExternalContextToRealWorldLog?.',
  'await this.runWechatBehaviorShortInference?.',
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
  'window.GameModules.wechatOutreachContext?.closeOutreach?.',
  'window.GameModules.realWorldAgentLoop?.appendWechatDialogueContext?.',
  'await window.GameModules.realWorldAgentLoop?.mirrorExternalContextToRealWorldLog?.',
  'await this.runWechatBehaviorShortInference?.',
  'await this.save?.();',
  '} finally {',
  'if (reqId === this.wechatReplyRequestId) this.wechatSending = false;',
], 'replyWechatContact failure/finally order');

assertIncludes(orchestration, "closeOutreach?.(this, { ...contact, id: characterId, characterId });", `${orchestrationPath} closeOutreach must pass matching characterId`);
assertNotIncludes(read('publish/wechat-actions.js'), '`wx-${name}', 'wechat-actions must not generate wx-* contact ids');
assertIncludes(read('publish/wechat-actions.js'), 'isWechatContactCharacterId', 'wechat-actions must validate contact role ids');
assertIncludes(read('publish/wechat-actions.js'), 'migrateWechatContactIdentity', 'wechat-actions must migrate legacy contact ids');
assertIncludes(read('publish/domain/storage/restore-state-helpers.js'), 'migrateWechatContactIdentity', 'restore must migrate wechat contact ids');
assertIncludes(read('publish/social-inbox.js'), 'await window.GameModules.realWorldAgentLoop?.mirrorExternalContextToRealWorldLog?', 'inbox delivery must await log mirror');

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
  'const outreach = window.GameModules.wechatOutreachContext',
  "return window.GameModules.renderPrompt('wechat-chat-reply', {",
  'this.wechatContactProfileText(contact, playerText)',
  'sections.stateSnapshot(this, state)',
  '外联上下文: outreachBlock',
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
  const mentionInputIndex = list.indexOf('app/wechat/mention-input-helper.js');
  const imageRecordIndex = list.indexOf('app/wechat/image-record-helpers.js');
  const imageUiIndex = list.indexOf('app/wechat/image-ui-helpers.js');
  const imageAlbumIndex = list.indexOf('app/wechat/image-album-helpers.js');
  const imagePromptIndex = list.indexOf('app/wechat/image-prompt-helpers.js');
  const imageReceiveIndex = list.indexOf('app/wechat/image-receive-orchestration.js');
  const imageOfferIndex = list.indexOf('app/wechat/image-offer-orchestration.js');
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
  if (mentionInputIndex < 0) fail(`${relativePath}: missing app/wechat/mention-input-helper.js`);
  if (imageRecordIndex < 0) fail(`${relativePath}: missing app/wechat/image-record-helpers.js`);
  if (imageUiIndex < 0) fail(`${relativePath}: missing app/wechat/image-ui-helpers.js`);
  if (imageAlbumIndex < 0) fail(`${relativePath}: missing app/wechat/image-album-helpers.js`);
  if (imagePromptIndex < 0) fail(`${relativePath}: missing app/wechat/image-prompt-helpers.js`);
  if (imageReceiveIndex < 0) fail(`${relativePath}: missing app/wechat/image-receive-orchestration.js`);
  if (imageOfferIndex < 0) fail(`${relativePath}: missing app/wechat/image-offer-orchestration.js`);
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
  if (actionIndex >= 0 && pastEventIndex >= 0 && actionIndex > pastEventIndex) {
    fail(`${relativePath}: wechat-chat-actions.js must load before wechat-past-event-actions.js`);
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
  if (mentionInputIndex >= 0 && mentionActionIndex >= 0 && mentionInputIndex > mentionActionIndex) {
    fail(`${relativePath}: mention-input-helper.js must load before wechat-mention-actions.js`);
  }
  if (imageRecordIndex >= 0 && imageActionIndex >= 0 && imageRecordIndex > imageActionIndex) {
    fail(`${relativePath}: image-record-helpers.js must load before wechat-image-actions.js`);
  }
  if (imageUiIndex >= 0 && imageActionIndex >= 0 && imageUiIndex > imageActionIndex) {
    fail(`${relativePath}: image-ui-helpers.js must load before wechat-image-actions.js`);
  }
  if (imageAlbumIndex >= 0 && imageActionIndex >= 0 && imageAlbumIndex > imageActionIndex) {
    fail(`${relativePath}: image-album-helpers.js must load before wechat-image-actions.js`);
  }
  if (imagePromptIndex >= 0 && imageActionIndex >= 0 && imagePromptIndex > imageActionIndex) {
    fail(`${relativePath}: image-prompt-helpers.js must load before wechat-image-actions.js`);
  }
  if (imageReceiveIndex >= 0 && imageActionIndex >= 0 && imageReceiveIndex > imageActionIndex) {
    fail(`${relativePath}: image-receive-orchestration.js must load before wechat-image-actions.js`);
  }
  if (imageOfferIndex >= 0 && imageActionIndex >= 0 && imageOfferIndex > imageActionIndex) {
    fail(`${relativePath}: image-offer-orchestration.js must load before wechat-image-actions.js`);
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
    '"app/wechat/mention-input-helper.js"',
    '"wechat-chat-actions.js"',
    '"wechat-past-event-actions.js"',
    '"app/wechat/image-record-helpers.js"',
    '"app/wechat/image-ui-helpers.js"',
    '"app/wechat/image-album-helpers.js"',
    '"app/wechat/image-prompt-helpers.js"',
    '"app/wechat/image-receive-orchestration.js"',
    '"app/wechat/image-offer-orchestration.js"',
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
      chatSessionPath,
      orchestrationPath,
      promptHelperPath,
      memoryContextActionPath,
      historyContextHelperPath,
      mentionActionPath,
      mentionViewHelperPath,
      mentionBasePhotoHelperPath,
      mentionReferenceHelperPath,
      mentionInputHelperPath,
      imageActionPath,
      imageRecordHelperPath,
      imageUiHelperPath,
      imageAlbumHelperPath,
      imagePromptHelperPath,
      imageReceiveOrchestrationPath,
      imageOfferOrchestrationPath,
      manifests: [webManifestPath, webScriptsPath, androidManifestPath, androidScriptsPath],
    invariants: [
      'reply-helper-facade',
      'chat-session-utf8-defaults',
      'chat-orchestration-facade',
      'chat-prompt-facade',
      'history-context-facade',
      'mention-utf8-defaults',
      'mention-input-facade',
      'mention-reference-facade',
      'image-record-facade',
      'image-ui-facade',
      'image-album-facade',
      'image-prompt-facade',
      'image-receive-orchestration-facade',
      'image-offer-orchestration-facade',
      'send-message-order',
      'reply-success-order',
      'reply-failure-finally-order',
      'generate-reply-order',
      'effective-reply-prompt-order',
      'runtime-manifest-order',
    ],
  },
}, null, 2));
