window.GameModules = window.GameModules || {};
window.GameModules.wechatAlbumTagActions = {
  wechatAlbumFixedNaturalTags() { return 'natural, original body, no clothes'; },

  wechatAlbumStructuredTags(items = []) {
    return [...new Set((items || []).map((item) => String(item?.value || '').trim())
      .filter((value) => value && value !== '未记录'))].join('，');
  },

  wechatAlbumTagContext(contact, kind = 'natural', draft = null) {
    const { state, profile } = this.wechatAlbumStateData(contact);
    const selected = draft ? this.wechatAlbumSelectedText() : null;
    const identityItems = selected?.identityItems || this.wechatAlbumIdentityItems(contact, state, profile);
    const defaultBodyItems = this.wechatAlbumBodyItems(kind === 'dressed' ? profile.dressedProfile : profile.bodyProfile);
    const bodyItems = selected?.bodyItems?.length ? selected.bodyItems : defaultBodyItems;
    const bodyText = selected?.bodyText || bodyItems.map((item) => item.text).join('\n');
    const extraText = selected?.extraText ? `，${selected.extraText}` : '';
    const bodyBase = kind === 'custom' ? bodyText : this.wechatAlbumStructuredTags(bodyItems);
    const naturalTags = kind === 'natural' ? `，${this.wechatAlbumFixedNaturalTags()}` : '';
    return {
      identityTags: this.wechatAlbumStructuredTags(identityItems),
      bodyTags: `${bodyBase}${extraText}${naturalTags}`,
    };
  },

  renderWechatAlbumPrompt(template, vars) {
    return String(template || '').replace(/\{角色身份信息标签\}/g, vars.identityTags || '')
      .replace(/\{状态部位描述标签\}/g, vars.bodyTags || '');
  },

  cleanWechatAlbumTags(text = '') {
    return [...new Set(String(text || '').replace(/```[a-z]*|```/gi, '')
      .replace(/^(正向提示词|负面提示词|positive|negative)\s*[:：]/gim, '')
      .replace(/\b(positive|negative)\s*[:：]/gi, '\n')
      .split(/[\n,，、；;]+/).map((item) => item.trim().replace(/^[-*]\s*/, ''))
      .filter(Boolean))].join(', ');
  },


  parseWechatAlbumDrawPrompt(text = '') {
    const raw = String(text || '').replace(/\r/g, '').replace(/```[a-z]*|```/gi, '').trim();
    const positiveMatch = raw.match(/(?:正向提示词|positive)\s*[:：]\s*([\s\S]*?)(?=\n?\s*(?:负面提示词|negative)\s*[:：]|$)/i);
    const negativeMatch = raw.match(/(?:负面提示词|negative)\s*[:：]\s*([\s\S]*)$/i);
    const defaultNegative = 'bad anatomy, extra fingers, extra arms, missing fingers, low quality, blurry, worst quality, watermark, text, logo, bad hands';
    const positive = this.cleanWechatAlbumTags(positiveMatch?.[1] || 'solo, full body, standing, front view, clear face, clean background, anime style, high quality');
    const negative = this.cleanWechatAlbumTags(negativeMatch?.[1] || defaultNegative) || defaultNegative;
    return { prompt: positive, negativePrompt: negative };
  },


  async buildWechatAlbumDrawPrompt(contact, kind = 'natural', draft = null) {
    const ctx = this.wechatAlbumTagContext(contact, kind, draft);
    const template = window.GameModules.pictureGeneratePrompts?.drawTagPrompt || '';
    const requestPrompt = this.renderWechatAlbumPrompt(template, ctx);
    const model = this.modelId || this.settingsState?.textModelId;
    const titleState = this.wechatAlbumKindLabel(kind);
    const output = await window.GameModules.aiRequest.complete({
      source: 'draw-tag-prompt',
      model,
      prompt: requestPrompt,
      maxTokens: 600,
      timeoutMs: 60000,
      requireDone: true,
      tokenMeta: { title: `绘图提示词生成｜${contact.name || '联系人'}｜${titleState}`, category: '图片生成', summary: '根据微信相册素材生成正向/负面绘图提示词。', kind: 'completion' },
    });
    console.log('[微信相册] 绘图提示词 AI 原始返回:', output);
    const parsed = this.parseWechatAlbumDrawPrompt(output);
    const prompt = window.GameModules.applyPictureGenerateSensitiveReplacements(parsed.prompt);
    const negativePrompt = window.GameModules.applyPictureGenerateSensitiveReplacements(parsed.negativePrompt);
    return { prompt: prompt.slice(0, 2000), negativePrompt: negativePrompt.slice(0, 2000), source: requestPrompt, raw: output };
  },
};
