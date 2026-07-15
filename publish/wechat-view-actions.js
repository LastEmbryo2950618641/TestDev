window.GameModules = window.GameModules || {};

const wechatViewHelperForwarders = [
  'wechatContacts',
  'wechatThreads',
  'wechatSelected',
  'wechatThreadRows',
  'wechatContactRows',
  'wechatContactEmptyText',
  'wechatProfileCard',
  'wechatProfileHeaderTitle',
  'wechatMeCard',
  'wechatMeEntryRows',
  'wechatProfileEntryRows',
  'wechatChatsPanelView',
  'wechatContactsPanelView',
  'wechatAlbumPhotoRows',
  'wechatAlbumEmptyState',
  'wechatAlbumToolbarState',
  'wechatAlbumDeleteConfirmView',
  'wechatAlbumDeleteConfirmDetailView',
  'wechatAvatarCropView',
  'wechatAvatarCropDetailView',
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
