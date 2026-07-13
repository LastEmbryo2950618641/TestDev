window.GameModules = window.GameModules || {};

const wechatChatSessionForwarders = {
  selectWechatContact: 'selectContact',
  wechatMessageKey: 'messageKey',
  wechatMessages: 'messages',
  updateWechatLatest: 'updateLatest',
};

const wechatChatMessageForwarders = {
  appendWechatMessage: 'appendWechatMessage',
  wechatMessageTime: 'wechatMessageTime',
  wechatMemoryTime: 'wechatMemoryTime',
  wechatDialogueTimeLabel: 'wechatDialogueTimeLabel',
  formatWechatDialogueLog: 'formatWechatDialogueLog',
  wechatTimeValue: 'wechatTimeValue',
  wechatTimeDisplay: 'wechatTimeDisplay',
};

const wechatChatReplyForwarders = {
  wechatContactProfileText: 'wechatContactProfileText',
  validateWechatReply: 'validateWechatReply',
  fallbackWechatReply: 'fallbackWechatReply',
};

const wechatChatOrchestrationForwarders = {
  sendWechatMessage: 'sendWechatMessage',
  replyWechatContact: 'replyWechatContact',
  generateWechatReply: 'generateWechatReply',
};

function callWechatChatSession(name, context, ...args) {
  return window.GameModules.app.wechat.chatSession[name].call(context, ...args);
}

function callWechatChatMessageHelper(name, context, ...args) {
  return window.GameModules.app.wechat.chatMessageHelpers[name].call(context, ...args);
}

function callWechatChatReplyHelper(name, context, ...args) {
  return window.GameModules.app.wechat.chatReplyHelpers[name].call(context, ...args);
}

function callWechatChatOrchestration(name, context, ...args) {
  return window.GameModules.app.wechat.chatOrchestration[name].call(context, ...args);
}

window.GameModules.wechatChatActions = {};


Object.entries(wechatChatSessionForwarders).forEach(([name, helperName]) => {
  window.GameModules.wechatChatActions[name] = function wechatChatSessionFacade(...args) {
    return callWechatChatSession(helperName, this, ...args);
  };
});

Object.entries(wechatChatMessageForwarders).forEach(([name, helperName]) => {
  window.GameModules.wechatChatActions[name] = function wechatChatMessageFacade(...args) {
    return callWechatChatMessageHelper(helperName, this, ...args);
  };
});

Object.entries(wechatChatReplyForwarders).forEach(([name, helperName]) => {
  window.GameModules.wechatChatActions[name] = function wechatChatReplyFacade(...args) {
    return callWechatChatReplyHelper(helperName, this, ...args);
  };
});

Object.entries(wechatChatOrchestrationForwarders).forEach(([name, helperName]) => {
  window.GameModules.wechatChatActions[name] = function wechatChatOrchestrationFacade(...args) {
    return callWechatChatOrchestration(helperName, this, ...args);
  };
});
