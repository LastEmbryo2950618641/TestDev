window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.wechat = window.GameModules.app.wechat || {};

window.GameModules.app.wechat.albumPromptListHelpers = {
  wechatAlbumPromptList(contact = this.wechatProfileContact()) {
    return (this.wechatAlbumPrompts?.[contact?.id || 'player-self'] || []).filter((item) => item?.prompt);
  },

  wechatAlbumSelectedPrompt() {
    return this.wechatAlbumPromptList().find((item) => item.id === this.wechatAlbumPromptSelectedId) || null;
  },

  wechatAlbumPromptListPreview(item) {
    const fixed = new Set(['1girl or 1boy', '1girl', '1boy', 'solo', 'full body', 'standing', 'front view', 'clear face', 'clean background', 'anime style', 'high quality', 'natural', 'original body', 'no clothes', '赤身', '全身', '无遮蔽', '美乳', '双腿', '玉足', '站立']);
    const tags = String(item?.prompt || '').split(/[\n,，、；;]+/).map((tag) => tag.trim()).filter(Boolean);
    const distinct = tags.filter((tag) => !fixed.has(tag.toLowerCase()));
    return (distinct.length ? distinct : tags).slice(0, 8).join(', ').slice(0, 88) || '未命名提示词';
  },

  wechatAlbumPromptsAfterSelectedUpdate(promptsByContact = {}, contactId = '', list = [], promptId = '', prompt = '', negativePrompt = '') {
    return {
      ...(promptsByContact || {}),
      [contactId]: (Array.isArray(list) ? list : []).map((item) => (
        item?.id === promptId ? { ...item, prompt, negativePrompt } : item
      )),
    };
  },
};
