window.GameModules = window.GameModules || {};

function wechatAlbumTagHelpers() {
  return window.GameModules.wechatAlbumTagHelpers || {};
}

window.GameModules.wechatAlbumTagActions = {
  wechatAlbumTargetGender(contact = this.wechatProfileContact()) {
    const { profile } = this.wechatAlbumStateData?.(contact) || {};
    return wechatAlbumTagHelpers().targetGenderFromProfile?.(profile) || '';
  },

  wechatAlbumFixedTags(kind = 'natural', providerId = this.selectedDrawProviderId?.() || 'pixai', contact = this.wechatProfileContact()) {
    return wechatAlbumTagHelpers().fixedTags?.(kind, providerId, this.wechatAlbumTargetGender?.(contact) || '') || '';
  },

  wechatAlbumFixedNaturalTags() { return this.wechatAlbumFixedTags('natural'); },

  wechatAlbumSplitPromptTags(text = '') {
    return wechatAlbumTagHelpers().splitPromptTags?.(text) || [];
  },

  wechatAlbumFixedTagVariants(providerId = this.selectedDrawProviderId?.() || 'pixai') {
    return wechatAlbumTagHelpers().fixedTagVariants?.(providerId) || [];
  },

  normalizeWechatAlbumPromptFixedTags(prompt = '', kind = 'natural', contact = this.wechatProfileContact(), providerId = this.selectedDrawProviderId?.() || 'pixai') {
    return wechatAlbumTagHelpers().normalizePromptFixedTags?.(prompt, kind, providerId, this.wechatAlbumTargetGender?.(contact) || '') || '';
  },

  appendWechatAlbumFixedTags(prompt = '', kind = 'natural', contact = this.wechatProfileContact()) {
    return this.normalizeWechatAlbumPromptFixedTags(prompt, kind, contact);
  },

  pictureGenerateSafeReplacements(text = '') {
    const fn = window.GameModules.applyPictureGenerateSensitiveReplacements;
    return typeof fn === 'function' ? fn(text) : String(text || '');
  },

  wechatAlbumDrawTagTemplate() {
    return window.GameModules.pictureGeneratePrompts?.drawTagPrompt
      || window.GameModules.promptTemplates?.inline?.['draw-tag-prompt']
      || window.GameModules.promptTemplates?.snapshot?.('draw-tag-prompt')
      || this.wechatAlbumFallbackDrawTagTemplate();
  },

  wechatAlbumFallbackDrawTagTemplate() {
    return wechatAlbumTagHelpers().fallbackDrawTagTemplate?.() || '';
  },

  wechatAlbumCompactDrawTagPrompt(ctx = {}, kind = 'natural') {
    return wechatAlbumTagHelpers().compactDrawTagPrompt?.(ctx, kind) || '';
  },

  wechatAlbumStructuredTags(items = []) {
    return wechatAlbumTagHelpers().structuredTags?.(items) || '';
  },

  wechatAlbumPromptMaterialText(items = [], fallback = '未记录') {
    return wechatAlbumTagHelpers().promptMaterialText?.(items, fallback) || fallback;
  },

  wechatAlbumTagContext(contact, kind = 'natural', draft = null) {
    const { state, profile } = this.wechatAlbumStateData(contact);
    const selected = draft ? this.wechatAlbumSelectedText() : null;
    const identityItems = selected?.identityItems || this.wechatAlbumIdentityItems(contact, state, profile);
    const defaultBodyItems = this.wechatAlbumBodyItems(
      kind === 'dressed' ? profile.dressedProfile : profile.bodyProfile,
      profile,
      kind,
    );
    const bodyItems = selected?.bodyItems?.length ? selected.bodyItems : defaultBodyItems;
    const bodyText = selected?.bodyText || bodyItems.map((item) => item.text).join('\n');
    const extraText = selected?.extraText ? '，' + selected.extraText : '';
    const identityText = selected?.identityInfo || this.wechatAlbumPromptMaterialText(identityItems);
    const bodyBase = kind === 'custom' ? bodyText : this.wechatAlbumPromptMaterialText(bodyItems);
    const fixedTags = this.wechatAlbumFixedTags(kind, undefined, contact);
    const fixedText = fixedTags ? '，' + fixedTags : '';
    return {
      identityTags: identityText,
      bodyTags: bodyBase + extraText + fixedText,
    };
  },

  renderWechatAlbumPrompt(template, vars) {
    return wechatAlbumTagHelpers().renderPrompt?.(template, vars) || '';
  },

  cleanWechatAlbumTags(text = '') {
    return wechatAlbumTagHelpers().cleanTags?.(text) || '';
  },

  isWechatAlbumDefaultPositivePrompt(prompt = '') {
    return Boolean(wechatAlbumTagHelpers().isDefaultPositivePrompt?.(prompt));
  },

  isWechatAlbumPlaceholderPrompt(prompt = '') {
    return Boolean(wechatAlbumTagHelpers().isPlaceholderPrompt?.(prompt));
  },

  wechatAlbumMeaningfulPromptTags(prompt = '') {
    return wechatAlbumTagHelpers().meaningfulPromptTags?.(prompt) || [];
  },

  parseWechatAlbumDrawPrompt(text = '', options = {}) {
    return wechatAlbumTagHelpers().parseDrawPrompt?.(text, options) || { prompt: '', negativePrompt: '' };
  },

  async requestWechatAlbumDrawPrompt(prompt, contact, kind, titleState, retryLabel = '') {
    const model = this.modelId || this.settingsState?.textModelId;
    return await window.GameModules.aiRequest.complete({
      source: retryLabel ? 'draw-tag-prompt-' + retryLabel : 'draw-tag-prompt',
      model,
      prompt,
      maxTokens: 1000,
      timeoutMs: 60000,
      requireDone: true,
      deepThinking: false,
      thinking: { type: 'disabled' },
      ...(window.GameModules.promptSkills?.completionOptions?.('draw-tag-prompt') || { jsonMode: false, outputLimitKind: 'other' }),
      tokenMeta: { title: '绘图提示词生成：' + (contact.name || '联系人') + '｜' + titleState + (retryLabel ? '｜重试' : ''), category: '图片生成', summary: '根据微信相册素材生成正向/负面绘图提示词。', kind: 'completion' },
    });
  },

  async buildWechatAlbumDrawPrompt(contact, kind = 'natural', draft = null) {
    const ctx = this.wechatAlbumTagContext(contact, kind, draft);
    const template = this.wechatAlbumDrawTagTemplate();
    const requestPrompt = this.renderWechatAlbumPrompt(template, ctx);
    const titleState = this.wechatAlbumKindLabel(kind);
    let output = await this.requestWechatAlbumDrawPrompt(requestPrompt, contact, kind, titleState);
    let source = requestPrompt;
    if (!String(output || '').trim()) {
      source = this.wechatAlbumCompactDrawTagPrompt(ctx, kind);
      output = await this.requestWechatAlbumDrawPrompt(source, contact, kind, titleState, 'retry');
    }
    console.log('[微信相册] 绘图提示词 AI 原始返回:', output);
    const parsed = this.parseWechatAlbumDrawPrompt(output, { strict: true, minFeatureTags: 2 });
    const prompt = this.pictureGenerateSafeReplacements(this.appendWechatAlbumFixedTags(parsed.prompt, kind, contact));
    const negativePrompt = this.pictureGenerateSafeReplacements(parsed.negativePrompt);
    return { prompt: prompt.slice(0, 2000), negativePrompt: negativePrompt.slice(0, 2000), source, raw: output };
  },
};
