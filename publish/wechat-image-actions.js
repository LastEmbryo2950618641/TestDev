window.GameModules = window.GameModules || {};

const wechatImageFacadeGroups = [
  {
    moduleName: 'imageOfferOrchestration',
    methods: ['appendWechatPendingImageMessage', 'recordWechatImageOffer'],
  },
  {
    moduleName: 'imageRecordHelpers',
    methods: [
      'wechatImageRecordText',
      'wechatImageReadRecord',
      'replaceWechatImageRecord',
      'replaceWechatImageRecordInMemory',
      'replaceWechatImageRecordInWorldline',
    ],
  },
  {
    moduleName: 'imageUiHelpers',
    methods: [
      'openWechatImageConfirm',
      'closeWechatImageConfirm',
      'openWechatImagePreview',
      'closeWechatImagePreview',
      'wechatImageConfirmPromptText',
      'updateWechatImageMessage',
    ],
  },
  {
    moduleName: 'imageAlbumHelpers',
    methods: ['wechatRealPhotoForContact', 'addWechatImageToAlbum'],
  },
  {
    moduleName: 'imagePromptHelpers',
    methods: ['wechatMemorySections', 'wechatWearingContext', 'cleanWechatImageTags', 'buildWechatImageTags'],
  },
  {
    moduleName: 'imageReceiveOrchestration',
    methods: ['confirmWechatImageReceive'],
  },
];

const wechatImageAsyncFacades = new Set([
  'appendWechatPendingImageMessage',
  'recordWechatImageOffer',
  'replaceWechatImageRecord',
  'buildWechatImageTags',
  'confirmWechatImageReceive',
]);

function callWechatImageModule(moduleName, methodName, context, args) {
  return window.GameModules.app.wechat[moduleName][methodName].call(context, ...args);
}

window.GameModules.wechatImageActions = {};

for (const group of wechatImageFacadeGroups) {
  for (const methodName of group.methods) {
    window.GameModules.wechatImageActions[methodName] = wechatImageAsyncFacades.has(methodName)
      ? async function wechatImageAsyncFacade(...args) {
        return callWechatImageModule(group.moduleName, methodName, this, args);
      }
      : function wechatImageFacade(...args) {
        return callWechatImageModule(group.moduleName, methodName, this, args);
      };
  }
}
