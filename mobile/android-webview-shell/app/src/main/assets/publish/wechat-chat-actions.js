window.GameModules = window.GameModules || {};

const wechatChatFacadeGroups = [
  {
    moduleName: 'chatSession',
    methods: {
      selectWechatContact: 'selectContact',
      wechatMessageKey: 'messageKey',
      wechatMessages: 'messages',
      updateWechatLatest: 'updateLatest',
    },
  },
  {
    moduleName: 'chatMessageHelpers',
    methods: {
      appendWechatMessage: 'appendWechatMessage',
      wechatMessageTime: 'wechatMessageTime',
      wechatMemoryTime: 'wechatMemoryTime',
      wechatDialogueTimeLabel: 'wechatDialogueTimeLabel',
      formatWechatDialogueLog: 'formatWechatDialogueLog',
      wechatTimeValue: 'wechatTimeValue',
      wechatTimeDisplay: 'wechatTimeDisplay',
    },
  },
  {
    moduleName: 'chatReplyHelpers',
    methods: {
      wechatContactProfileText: 'wechatContactProfileText',
      validateWechatReply: 'validateWechatReply',
      fallbackWechatReply: 'fallbackWechatReply',
    },
  },
  {
    moduleName: 'chatOrchestration',
    methods: {
      sendWechatMessage: 'sendWechatMessage',
      replyWechatContact: 'replyWechatContact',
      generateWechatReply: 'generateWechatReply',
    },
  },
];

function callWechatChatModule(moduleName, methodName, context, args) {
  return window.GameModules.app.wechat[moduleName][methodName].call(context, ...args);
}

window.GameModules.wechatChatActions = {};

for (const group of wechatChatFacadeGroups) {
  for (const [publicName, helperName] of Object.entries(group.methods)) {
    window.GameModules.wechatChatActions[publicName] = function wechatChatFacade(...args) {
      return callWechatChatModule(group.moduleName, helperName, this, args);
    };
  }
}
