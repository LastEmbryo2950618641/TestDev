window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.wechat = window.GameModules.app.wechat || {};

window.GameModules.app.wechat.imageUiHelpers = {
  openWechatImageConfirm(msg = {}) {
      if (msg.imageStatus !== 'pending') return;
      this.wechatImageConfirmMessage = msg;
      this.wechatImageConfirmOpen = true;
    },

  closeWechatImageConfirm() { if (!this.wechatImageGenerating) this.wechatImageConfirmOpen = false; },

  openWechatImagePreview(url = '', title = '图片预览') {
      if (!url) return;
      this.wechatImagePreview = { open: true, url, title };
    },

  closeWechatImagePreview() { this.wechatImagePreview = { open: false, url: '', title: '' }; },

  wechatImageConfirmPromptText(msg = this.wechatImageConfirmMessage) {
      return String(msg?.imageDescription || msg?.imageIntent?.imageDescription || msg?.imageIntent?.tagsHint || '一张联系人发送的近照。').trim();
    },

  updateWechatImageMessage(targetMsg = {}, patch = {}) {
      const key = targetMsg.characterId || this.wechatSelectedContact;
      const same = (msg) => msg.imagePending && msg.time === targetMsg.time && msg.characterId === targetMsg.characterId;
      const list = (this.wechatMessagesByContact?.[key] || []).map((msg) => same(msg) ? { ...msg, ...patch } : msg);
      this.wechatMessagesByContact = { ...(this.wechatMessagesByContact || {}), [key]: list };
      this.wechatImageConfirmMessage = list.find(same) || null;
    },
};
