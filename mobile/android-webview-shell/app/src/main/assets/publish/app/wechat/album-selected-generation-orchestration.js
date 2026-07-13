window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.wechat = window.GameModules.app.wechat || {};

window.GameModules.app.wechat.albumSelectedGenerationOrchestration = {
  async generateWechatAlbumSelectedPhoto() {
    await this.generateWechatAlbumPhotoFromSelectedPrompt();
  },

  async generateWechatAlbumPhotoFromSelectedPrompt() {
    const selectedPrompt = this.wechatAlbumSelectedPrompt?.();
    const kind = selectedPrompt?.kind || this.wechatAlbumPromptDraft?.kind || 'natural';
    const contact = this.wechatAlbumContact();
    const prompt = this.normalizeWechatAlbumPromptFixedTags?.(
      this.wechatAlbumPromptEditText || selectedPrompt?.prompt || '',
      kind,
      contact,
    ) || this.wechatAlbumPromptEditText || selectedPrompt?.prompt || '';
    const negativePrompt = this.wechatAlbumPromptEditNegative || selectedPrompt?.negativePrompt || '';
    if (selectedPrompt) {
      this.wechatAlbumPrompts = window.GameModules.app.wechat.albumPromptListHelpers.wechatAlbumPromptsAfterSelectedUpdate(
        this.wechatAlbumPrompts,
        contact.id,
        this.wechatAlbumPromptList(contact),
        selectedPrompt.id,
        prompt,
        negativePrompt,
      );
      await this.save?.();
    }
    await this.generateWechatAlbumPhoto(kind, { prompt, negativePrompt });
  },
};
