window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.wechat = window.GameModules.app.wechat || {};

window.GameModules.app.wechat.imageReceiveOrchestration = {
  async confirmWechatImageReceive() {
      const msg = this.wechatImageConfirmMessage;
      if (!msg || this.wechatImageGenerating) return;
      const photo = this.wechatImageBasePhoto?.(msg) || this.wechatRealPhotoForContact(msg.characterId);
      if (!photo?.url) { this.wechatError = '请先在相册中标记一张角色真实照片或@一张可编辑图片'; this.wechatImageConfirmOpen = false; return; }
      const reqId = (this.wechatImageRequestId || 0) + 1;
      this.wechatImageRequestId = reqId;
      this.wechatImageGenerating = true;
      this.updateWechatImageMessage(msg, { imageStatus: 'generating' });
      try {
        const tags = await this.buildWechatImageTags(msg);
        const prompt = await window.GameModules.renderPrompt('common-image-edit-generate', { 动态标签: tags });
        const drawOptions = { prompt: prompt.slice(0, 2000), images: [photo.url], dimension: '2:3', model: this.selectedDrawProviderId?.() === 'pixai' ? this.selectedDrawModelId?.() : 'lite' };
        const drawProvider = this.selectedDrawProviderId?.() || 'dzmm';
        const tokenRecordId = window.GameModules.tokenStats?.record?.('draw-edit-wechat-image', drawOptions.prompt, { model: `${drawProvider}:${drawOptions.model}`, title: '微信图片编辑生成', category: '图片生成', summary: '使用角色真实照片编辑生成微信图片。', kind: 'draw' });
        const result = await this.wechatDrawWithRetry(() => window.GameModules.drawProvider.edit(drawOptions));
        window.GameModules.tokenStats?.recordResponse?.(tokenRecordId, JSON.stringify(result || {}, null, 2), result?.images || []);
        if (reqId !== this.wechatImageRequestId) return;
        const url = result?.images?.[0] || '';
        if (!url) throw new Error('图片编辑完成但没有返回图片');
        this.addWechatImageToAlbum?.(msg.characterId, { url, taskId: result.taskId || '', imageId: msg.imageId || '', prompt: drawOptions.prompt, tags, description: msg.imageDescription || msg.imageIntent?.imageDescription || '' });
        const readRecord = this.wechatImageReadRecord(msg);
        await this.replaceWechatImageRecord?.(msg, readRecord);
        this.updateWechatImageMessage(msg, { imageStatus: 'done', imageUrl: url, taskId: result.taskId || '', text: '[图片]', imageRecord: readRecord, imageUnreadBy: [], imageReadBy: ['玩家'] });
        await this.save?.();
        this.wechatImageConfirmOpen = false;
      } catch (err) {
        if (reqId !== this.wechatImageRequestId) return;
        console.error('[微信图片] 图片生成失败:', err.code, err.message, err.stack);
        this.wechatError = err.message || '图片生成失败';
        this.updateWechatImageMessage(msg, { imageStatus: 'pending' });
      } finally {
        if (reqId === this.wechatImageRequestId) this.wechatImageGenerating = false;
      }
    },
};
