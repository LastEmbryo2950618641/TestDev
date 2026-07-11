window.GameModules = window.GameModules || {};

const wechatViewHelperForwarders = [
  'wechatContacts',
  'wechatThreadRows',
  'wechatContactRows',
  'wechatMeEntryRows',
  'wechatChatsPanelView',
  'wechatContactsPanelView',
  'wechatAlbumPhotoRows',
  'wechatAvatarCropView',
  'wechatProfileHeaderView',
  'wechatAlbumPromptChoiceView',
  'wechatAlbumPromptListView',
  'wechatAlbumPromptDetailView',
  'setWechatTab',
];

function callWechatViewHelper(name, context, ...args) {
  return window.GameModules.wechatViewHelpers[name].call(context, ...args);
}

window.GameModules.wechatViewActions = {};

wechatViewHelperForwarders.forEach((name) => {
  window.GameModules.wechatViewActions[name] = function wechatViewHelperFacade(...args) {
    return callWechatViewHelper(name, this, ...args);
  };
});
