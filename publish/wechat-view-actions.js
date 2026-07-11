window.GameModules = window.GameModules || {};
window.GameModules.wechatViewActions = {
  wechatContacts() {
    return window.GameModules.wechatViewHelpers.wechatContacts.call(this);
  },

  wechatThreadRows() {
    return window.GameModules.wechatViewHelpers.wechatThreadRows.call(this);
  },

  wechatContactRows() {
    return window.GameModules.wechatViewHelpers.wechatContactRows.call(this);
  },

  wechatMeEntryRows() {
    return window.GameModules.wechatViewHelpers.wechatMeEntryRows.call(this);
  },

  wechatChatsPanelView() {
    return window.GameModules.wechatViewHelpers.wechatChatsPanelView.call(this);
  },

  wechatContactsPanelView() {
    return window.GameModules.wechatViewHelpers.wechatContactsPanelView.call(this);
  },

  wechatAlbumPhotoRows() {
    return window.GameModules.wechatViewHelpers.wechatAlbumPhotoRows.call(this);
  },

  wechatAvatarCropView() {
    return window.GameModules.wechatViewHelpers.wechatAvatarCropView.call(this);
  },

  wechatProfileHeaderView() {
    return window.GameModules.wechatViewHelpers.wechatProfileHeaderView.call(this);
  },

  wechatAlbumPromptChoiceView() {
    return window.GameModules.wechatViewHelpers.wechatAlbumPromptChoiceView.call(this);
  },

  wechatAlbumPromptListView() {
    return window.GameModules.wechatViewHelpers.wechatAlbumPromptListView.call(this);
  },

  wechatAlbumPromptDetailView() {
    return window.GameModules.wechatViewHelpers.wechatAlbumPromptDetailView.call(this);
  },

  setWechatTab(tab) {
    this.wechatTab = tab || 'chats';
    this.wechatView = 'home';
  },
};
