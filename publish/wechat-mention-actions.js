window.GameModules = window.GameModules || {};

const wechatMentionFacadeGroups = [
  {
    moduleName: 'mentionInputHelper',
    methods: ['insertWechatMention', 'mentionWechatMessage'],
  },
  {
    moduleName: 'mentionBasePhotoHelper',
    methods: [
      'mentionWechatImage',
      'wechatImageMentionId',
      'wechatMessageImageMentionId',
      'wechatImageBasePhoto',
    ],
  },
  {
    moduleName: 'mentionReferenceHelpers',
    methods: [
      'wechatMessageMentionId',
      'wechatMentionedImages',
      'attachWechatMentionedImageIntent',
    ],
  },
  {
    moduleName: 'mentionViewHelpers',
    methods: [
      'wechatMentionedContacts',
      'wechatMentionedMessages',
      'wechatMessageMentionSources',
      'wechatImageMentionSources',
      'wechatMentionContextText',
    ],
  },
];

function callWechatMentionModule(moduleName, methodName, context, args) {
  return window.GameModules.app.wechat[moduleName][methodName].call(context, ...args);
}

window.GameModules.wechatMentionActions = {};

for (const group of wechatMentionFacadeGroups) {
  for (const methodName of group.methods) {
    window.GameModules.wechatMentionActions[methodName] = function wechatMentionFacade(...args) {
      return callWechatMentionModule(group.moduleName, methodName, this, args);
    };
  }
}
