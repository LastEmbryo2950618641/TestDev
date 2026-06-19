window.GameModules = window.GameModules || {};
window.GameModules.wechatAlbumTagActions = {
  wechatAlbumFixedNaturalTags() { return 'natural body, no artificial modification, original body shape, uncovered body silhouette'; },

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
    return {
      identityTags: this.wechatAlbumStructuredTags(identityItems),
      bodyTags: `${kind === 'custom' ? bodyText : this.wechatAlbumStructuredTags(bodyItems)}${extraText}`,
      naturalTags: kind === 'natural' ? this.wechatAlbumFixedNaturalTags() : '',
    };
  },

  renderWechatAlbumPrompt(template, vars) {
    return String(template || '').replace(/\{角色身份信息标签\}/g, vars.identityTags || '')
      .replace(/\{状态部位描述标签\}/g, vars.bodyTags || '')
      .replace(/\{自然状态补充要求标签\}/g, vars.naturalTags || '');
  },

  parseWechatAlbumDrawPrompt(text = '') {
    const positive = String(text).match(/正向提示词\s*[:：]\s*([^\n]+)/)?.[1]?.trim() || '';
    const negative = String(text).match(/负面提示词\s*[:：]\s*([^\n]+)/)?.[1]?.trim() || '';
    return {
      prompt: positive || 'solo, full body, standing, front view, clear face, clean background, anime style, high quality',
      negativePrompt: negative || 'bad anatomy, extra fingers, extra arms, missing fingers, low quality, blurry, worst quality, watermark, text, logo, bad hands',
    };
  },

  async buildWechatAlbumDrawPrompt(contact, kind = 'natural', draft = null) {
    const ctx = this.wechatAlbumTagContext(contact, kind, draft);
    const template = window.GameModules.pictureGeneratePrompts?.drawTagPrompt || '';
    const requestPrompt = this.renderWechatAlbumPrompt(template, ctx);
    const models = await window.dzmm.models.list().catch((err) => {
      console.error('[微信相册] 模型列表获取失败:', err.code, err.message, err.stack);
      return { defaultModel: 'nalang-turbo-0826', models: [] };
    });
    let output = '';
    await window.dzmm.completions({
      model: models.defaultModel || models.models?.[0]?.internalName || 'nalang-turbo-0826',
      messages: [{ role: 'user', content: requestPrompt }],
      maxTokens: 600,
    }, (chunk) => { output += String(chunk || ''); });
    const parsed = this.parseWechatAlbumDrawPrompt(output);
    return { prompt: parsed.prompt.slice(0, 2000), negativePrompt: parsed.negativePrompt.slice(0, 2000), source: requestPrompt, raw: output };
  },
};
