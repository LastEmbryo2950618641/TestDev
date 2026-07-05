window.GameModules = window.GameModules || {};
window.GameModules.wechatAlbumTagActions = {
  wechatAlbumFixedTags(kind = 'natural', providerId = this.selectedDrawProviderId?.() || 'pixai') {
    const provider = String(providerId || 'pixai').trim().toLowerCase();
    const state = kind === 'dressed' ? 'dressed' : 'natural';
    if (provider === 'pixai') {
      return state === 'natural'
        ? '赤身, 全身, 无遮掩, 美乳, 双腿, 玉足, 站立'
        : '全身, 美乳, 双腿, 玉足, 站立';
    }
    return state === 'natural' ? 'natural, original body, no clothes' : '';
  },

  wechatAlbumFixedNaturalTags() { return this.wechatAlbumFixedTags('natural'); },

  appendWechatAlbumFixedTags(prompt = '', kind = 'natural') {
    const fixed = this.wechatAlbumFixedTags(kind);
    const baseTags = String(prompt || '').split(/[\n,，、；;]+/).map((item) => item.trim()).filter(Boolean);
    const seen = new Set(baseTags.map((item) => item.toLowerCase()));
    const addTags = String(fixed || '').split(/[\n,，、；;]+/).map((item) => item.trim()).filter(Boolean)
      .filter((item) => {
        const key = item.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    return [...baseTags, ...addTags].join(', ');
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
    return [
      'You are an anime image prompt tag engineer. Convert the following material into drawing tags.',
      '',
      'Input:',
      'Identity tags: {{identityTags}}',
      'State/body tags: {{bodyTags}}',
      '',
      'Rules:',
      '- Return only two lines.',
      '- Use English comma-separated tags.',
      '- Positive prompt must include: 1girl or 1boy, solo, full body, standing, front view, clear face, clean background, anime style, high quality.',
      '- Negative prompt is only for quality fixes.',
      '',
      'Positive prompt: tag1, tag2, tag3',
      'Negative prompt: tag1, tag2, tag3',
    ].join('\n');
  },

  wechatAlbumStructuredTags(items = []) {
    return [...new Set((items || []).map((item) => String(item?.value || '').trim())
      .filter((value) => value && value !== '未记录'))].join('，');
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
    const extraText = selected?.extraText ? `，${selected.extraText}` : '';
    const bodyBase = kind === 'custom' ? bodyText : this.wechatAlbumStructuredTags(bodyItems);
    const fixedTags = this.wechatAlbumFixedTags(kind);
    const fixedText = fixedTags ? `，${fixedTags}` : '';
    return {
      identityTags: this.wechatAlbumStructuredTags(identityItems),
      bodyTags: `${bodyBase}${extraText}${fixedText}`,
    };
  },

  renderWechatAlbumPrompt(template, vars) {
    const identityTags = vars.identityTags || '';
    const bodyTags = vars.bodyTags || '';
    return String(template || this.wechatAlbumFallbackDrawTagTemplate())
      .replace(/\{\{\s*identityTags\s*\}\}/g, identityTags)
      .replace(/\{\s*identityTags\s*\}/g, identityTags)
      .replace(/\{\{\s*bodyTags\s*\}\}/g, bodyTags)
      .replace(/\{\s*bodyTags\s*\}/g, bodyTags)
      .replace(/\{\{[^{}]*(?:identity|韬|身份)[^{}]*\}\}/gi, identityTags)
      .replace(/\{[^{}]*(?:identity|韬|身份)[^{}]*\}/gi, identityTags)
      .replace(/\{\{[^{}]*(?:body|state|鐘|部位|状态)[^{}]*\}\}/gi, bodyTags)
      .replace(/\{[^{}]*(?:body|state|鐘|部位|状态)[^{}]*\}/gi, bodyTags);
    return String(template || '').replace(/\{角色身份信息标签\}/g, vars.identityTags || '')
      .replace(/\{状态部位描述标签\}/g, vars.bodyTags || '');
  },

  cleanWechatAlbumTags(text = '') {
    return [...new Set(String(text || '').replace(/```[a-z]*|```/gi, '')
      .replace(/^(正向提示词|正向|绘图提示词|提示词|负面提示词|负向提示词|负向|positive\s*prompt|negative\s*prompt|positive|negative|prompt|tags)\s*[:：]/gim, '')
      .replace(/\b(positive\s*prompt|negative\s*prompt|positive|negative|prompt|tags)\s*[:：]/gi, '\n')
      .split(/[\n,，、；;]+/).map((item) => item.trim().replace(/^[-*]\s*/, ''))
      .filter(Boolean))].join(', ');
  },


  parseWechatAlbumDrawPrompt(text = '') {
    const raw = String(text || '').replace(/\r/g, '').replace(/```[a-z]*|```/gi, '').trim();
    const positiveLabel = '(?:正向提示词|正向|绘图提示词|提示词|positive\\s*prompt|positive|prompt|tags)';
    const negativeLabel = '(?:负面提示词|负向提示词|负向|negative\\s*prompt|negative)';
    const positiveMatch = raw.match(new RegExp(`${positiveLabel}\\s*[:：]\\s*([\\s\\S]*?)(?=\\n?\\s*${negativeLabel}\\s*[:：]|$)`, 'i'));
    const negativeMatch = raw.match(new RegExp(`${negativeLabel}\\s*[:：]\\s*([\\s\\S]*)$`, 'i'));
    const defaultPositive = 'solo, full body, standing, front view, clear face, clean background, anime style, high quality';
    const defaultNegative = 'bad anatomy, extra fingers, extra arms, missing fingers, low quality, blurry, worst quality, watermark, text, logo, bad hands';
    const rawWithoutNegative = raw.replace(new RegExp(`${negativeLabel}\\s*[:：][\\s\\S]*$`, 'i'), '').trim();
    const positiveSource = positiveMatch?.[1] || rawWithoutNegative || raw;
    const positive = this.cleanWechatAlbumTags(positiveSource) || defaultPositive;
    const negative = this.cleanWechatAlbumTags(negativeMatch?.[1] || defaultNegative) || defaultNegative;
    return { prompt: positive, negativePrompt: negative };
  },


  async buildWechatAlbumDrawPrompt(contact, kind = 'natural', draft = null) {
    const ctx = this.wechatAlbumTagContext(contact, kind, draft);
    const template = this.wechatAlbumDrawTagTemplate();
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
      ...(window.GameModules.promptSkills?.completionOptions?.('draw-tag-prompt') || { jsonMode: false, outputLimitKind: 'other' }),
      tokenMeta: { title: `绘图提示词生成｜${contact.name || '联系人'}｜${titleState}`, category: '图片生成', summary: '根据微信相册素材生成正向/负面绘图提示词。', kind: 'completion' },
    });
    console.log('[微信相册] 绘图提示词 AI 原始返回:', output);
    const parsed = this.parseWechatAlbumDrawPrompt(output);
    const prompt = this.pictureGenerateSafeReplacements(this.appendWechatAlbumFixedTags(parsed.prompt, kind));
    const negativePrompt = this.pictureGenerateSafeReplacements(parsed.negativePrompt);
    return { prompt: prompt.slice(0, 2000), negativePrompt: negativePrompt.slice(0, 2000), source: requestPrompt, raw: output };
  },
};
