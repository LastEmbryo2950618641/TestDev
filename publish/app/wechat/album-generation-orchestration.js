window.GameModules = window.GameModules || {};
window.GameModules.app = window.GameModules.app || {};
window.GameModules.app.wechat = window.GameModules.app.wechat || {};

window.GameModules.app.wechat.albumGenerationOrchestration = {
  async generateWechatAlbumPhoto(kind = 'natural', promptData = null) {
    if (this.wechatAlbumGenerating) return;
    const contact = this.wechatAlbumContact();
    if (!contact || contact.group) return;
    const bodyFigureContext = window.GameModules.app.wechat.albumGenerateHelpers.wechatAlbumBodyFigureContextForContact.call(this, contact);
    const generationState = window.GameModules.app.wechat.albumGenerateHelpers.wechatAlbumGenerationStartState(this.wechatAlbumRequestId);
    const reqId = generationState.requestId;
    this.wechatAlbumRequestId = generationState.requestId;
    this.wechatAlbumGenerating = generationState.generating;
    this.wechatAlbumPromptOpen = generationState.promptOpen;
    try {
      if (contact?.id === 'player-self') await this.ensurePlayerRpgState?.();
      else await this.ensureWechatUserProfile?.(contact);
      const prompt = String(promptData?.prompt || '').trim();
      if (!prompt) throw new Error('请先选择或生成绘图提示词');
      const negativePrompt = String(promptData?.negativePrompt || '').trim() || 'bad anatomy, extra fingers, extra arms, missing fingers, low quality, blurry, worst quality, watermark, text, logo, bad hands';
      const promptWithFixedTags = this.appendWechatAlbumFixedTags?.(prompt, kind, contact) || prompt;
      const safePrompt = this.pictureGenerateSafeReplacements?.(promptWithFixedTags) || promptWithFixedTags;
      const safeNegativePrompt = this.pictureGenerateSafeReplacements?.(negativePrompt) || negativePrompt;
      const drawOptions = window.GameModules.app.wechat.albumGenerateHelpers.wechatAlbumDrawOptions.call(this, safePrompt, safeNegativePrompt);
      const titleState = this.wechatAlbumKindLabel(kind);
      const drawProvider = this.selectedDrawProviderId?.() || 'pixai';
      const tokenRecordId = window.GameModules.tokenStats?.record?.(
        `draw-wechat-album-${kind}`,
        drawOptions.prompt,
        {
          model: `${drawProvider}:${drawOptions.model}`,
          title: `微信相册图片生成｜${contact.name || '联系人'}｜${titleState}`,
          category: '图片生成',
          summary: '微信联系人相册全身正面照绘图请求。',
          kind: 'draw',
        },
      );
      const result = await this.wechatDrawWithRetry(() => window.GameModules.drawProvider.generate(drawOptions));
      window.GameModules.tokenStats?.recordResponse?.(
        tokenRecordId,
        JSON.stringify(result || {}, null, 2),
        result?.images || [],
      );
      if (reqId !== this.wechatAlbumRequestId) return;
      const url = result?.images?.[0] || '';
      if (!url) throw new Error('图片生成完成但没有返回图片');
      const savedFigure = bodyFigureContext
        ? await this.saveGeneratedBodyFigureAsset(url, kind, contact, result, drawOptions)
        : null;
      const list = this.wechatAlbumPhotoListForContact(contact);
      const photo = window.GameModules.app.wechat.albumGenerateHelpers.wechatAlbumGeneratedPhoto.call(
        this,
        contact,
        kind,
        result,
        savedFigure,
        bodyFigureContext,
      );
      this.wechatAlbumPhotos = window.GameModules.app.wechat.albumPhotoStateHelpers.wechatAlbumPhotosAfterInsert(
        this.wechatAlbumPhotos,
        contact.id,
        list,
        photo,
      );
      if (bodyFigureContext) {
        await this.autoCaptureWechatAvatar?.(0, contact);
        this.wechatAlbumBodyFigureContext = null;
      }
      await this.save?.();
    } catch (err) {
      if (reqId !== this.wechatAlbumRequestId) return;
      console.error('[微信相册] 图片生成失败:', err.code, err.message, err.stack);
      this.wechatError = err?.message || '照片生成失败，请稍后重试。';
    } finally {
      if (reqId === this.wechatAlbumRequestId) this.wechatAlbumGenerating = false;
    }
  },
};
