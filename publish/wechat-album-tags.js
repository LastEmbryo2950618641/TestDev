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

  wechatAlbumCompactDrawTagPrompt(ctx = {}, kind = 'natural') {
    return [
      'Convert the character material into anime image prompt tags.',
      'Return exactly two lines:',
      'Positive prompt: comma-separated English tags',
      'Negative prompt: comma-separated English tags',
      '',
      'Hard rules:',
      '- Positive prompt must include at least 6 personalized visual tags from the material.',
      '- Personalized tags should cover hair, eyes, face, body shape, skin tone, aura, outfit or body-part details when available.',
      '- Do not return only camera/composition tags such as 1girl, solo, full body, standing, front view.',
      '- Use English tags only in the output.',
      '',
      `State: ${kind === 'dressed' ? 'dressed' : 'natural'}`,
      `Identity material:\n${ctx.identityTags || 'unknown'}`,
      `Body material:\n${ctx.bodyTags || 'unknown'}`,
    ].join('\n');
  },

  wechatAlbumStructuredTags(items = []) {
    return [...new Set((items || []).map((item) => String(item?.value || '').trim())
      .filter((value) => value && value !== '未记录'))].join('，');
  },

  wechatAlbumPromptMaterialText(items = [], fallback = '未记录') {
    const lines = (items || []).map((item) => {
      const text = String(item?.text || '').trim();
      if (text) return text;
      const label = String(item?.label || item?.key || '').trim();
      const value = String(item?.value || '').trim();
      return [label, value].filter(Boolean).join('：');
    }).filter((line) => line && line !== fallback);
    return [...new Set(lines)].join('\n') || fallback;
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
    const identityText = selected?.identityInfo || this.wechatAlbumPromptMaterialText(identityItems);
    const bodyBase = kind === 'custom' ? bodyText : this.wechatAlbumPromptMaterialText(bodyItems);
    const fixedTags = this.wechatAlbumFixedTags(kind);
    const fixedText = fixedTags ? `，${fixedTags}` : '';
    return {
      identityTags: identityText,
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
  },

  cleanWechatAlbumTags(text = '') {
    return [...new Set(String(text || '').replace(/```[a-z]*|```/gi, '')
      .replace(/^(正向提示词|正向|绘图提示词|提示词|负面提示词|负向提示词|负向|positive\s*prompt|negative\s*prompt|positive|negative|prompt|tags)\s*[:：]/gim, '')
      .replace(/\b(positive\s*prompt|negative\s*prompt|positive|negative|prompt|tags)\s*[:：]/gi, '\n')
      .split(/[\n,，、；;]+/).map((item) => item.trim().replace(/^[-*]\s*/, ''))
      .filter(Boolean))].join(', ');
  },


  isWechatAlbumDefaultPositivePrompt(prompt = '') {
    const normalize = (value) => String(value || '').toLowerCase().split(/[\n,，、；;]+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .sort()
      .join('|');
    return normalize(prompt) === normalize('solo, full body, standing, front view, clear face, clean background, anime style, high quality');
  },

  isWechatAlbumPlaceholderPrompt(prompt = '') {
    const tags = String(prompt || '').split(/[\n,，、；;]+/).map((item) => item.trim().toLowerCase()).filter(Boolean);
    return tags.length > 0 && tags.every((tag) => /^tag\d+$/.test(tag));
  },

  wechatAlbumMeaningfulPromptTags(prompt = '') {
    const fixed = new Set([
      '1girl or 1boy', '1girl', '1boy', 'solo', 'full body', 'standing', 'front view',
      'clear face', 'clean background', 'anime style', 'high quality',
      'natural', 'original body', 'no clothes',
    ]);
    return String(prompt || '').split(/[\n,，、；;]+/)
      .map((item) => item.trim())
      .filter((tag) => tag && !fixed.has(tag.toLowerCase()) && !/^tag\d+$/i.test(tag));
  },

  parseWechatAlbumDrawPrompt(text = '', options = {}) {
    const raw = String(text || '').replace(/\r/g, '').replace(/```[a-z]*|```/gi, '').trim();
    const positiveLabel = '(?:正向提示词|正向|绘图提示词|提示词|positive\\s*prompt|positive|prompt|tags)';
    const negativeLabel = '(?:负面提示词|负向提示词|负向|negative\\s*prompt|negative)';
    const positiveMatch = raw.match(new RegExp(`${positiveLabel}\\s*[:：]\\s*([\\s\\S]*?)(?=\\n?\\s*${negativeLabel}\\s*[:：]|$)`, 'i'));
    const negativeMatch = raw.match(new RegExp(`${negativeLabel}\\s*[:：]\\s*([\\s\\S]*)$`, 'i'));
    const defaultPositive = 'solo, full body, standing, front view, clear face, clean background, anime style, high quality';
    const defaultNegative = 'bad anatomy, extra fingers, extra arms, missing fingers, low quality, blurry, worst quality, watermark, text, logo, bad hands';
    if (options.strict && !raw) throw new Error('AI 没有返回绘图提示词，请检查文本模型配置后重试。');
    const rawWithoutNegative = raw.replace(new RegExp(`${negativeLabel}\\s*[:：][\\s\\S]*$`, 'i'), '').trim();
    const positiveSource = positiveMatch?.[1] || rawWithoutNegative || raw;
    const positive = this.cleanWechatAlbumTags(positiveSource);
    if (options.strict && (!positive || this.isWechatAlbumDefaultPositivePrompt(positive) || this.isWechatAlbumPlaceholderPrompt(positive))) {
      throw new Error('AI 没有返回有效的正向绘图提示词，请重试或检查文本模型配置。');
    }
    if (options.strict && this.wechatAlbumMeaningfulPromptTags(positive).length < (options.minFeatureTags || 0)) {
      throw new Error('AI 返回的绘图提示词缺少人物特征，请重试或补充/勾选外貌、身材、肤色、气质与部位描述。');
    }
    const negative = this.cleanWechatAlbumTags(negativeMatch?.[1] || defaultNegative) || defaultNegative;
    return { prompt: positive || defaultPositive, negativePrompt: negative };
  },

  async requestWechatAlbumDrawPrompt(prompt, contact, kind, titleState, retryLabel = '') {
    const model = this.modelId || this.settingsState?.textModelId;
    return await window.GameModules.aiRequest.complete({
      source: retryLabel ? `draw-tag-prompt-${retryLabel}` : 'draw-tag-prompt',
      model,
      prompt,
      maxTokens: 1000,
      timeoutMs: 60000,
      requireDone: true,
      deepThinking: false,
      thinking: { type: 'disabled' },
      ...(window.GameModules.promptSkills?.completionOptions?.('draw-tag-prompt') || { jsonMode: false, outputLimitKind: 'other' }),
      tokenMeta: { title: `绘图提示词生成｜${contact.name || '联系人'}｜${titleState}${retryLabel ? '｜重试' : ''}`, category: '图片生成', summary: '根据微信相册素材生成正向/负面绘图提示词。', kind: 'completion' },
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
    const prompt = this.pictureGenerateSafeReplacements(this.appendWechatAlbumFixedTags(parsed.prompt, kind));
    const negativePrompt = this.pictureGenerateSafeReplacements(parsed.negativePrompt);
    return { prompt: prompt.slice(0, 2000), negativePrompt: negativePrompt.slice(0, 2000), source, raw: output };
  },
};
