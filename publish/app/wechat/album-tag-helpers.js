window.GameModules = window.GameModules || {};
window.GameModules.wechatAlbumTagHelpers = (() => {
  const TAG_SPLIT_RE = /[\n,，、；;]+/;
  const DEFAULT_POSITIVE_PROMPT = 'solo, full body, standing, front view, clear face, clean background, anime style, high quality';
  const DEFAULT_NEGATIVE_PROMPT = 'bad anatomy, extra fingers, extra arms, missing fingers, low quality, blurry, worst quality, watermark, text, logo, bad hands';

  function targetGenderFromProfile(profile = {}) {
    const text = String(profile?.gender || profile?.sex || '').trim().toLowerCase();
    if (text.includes('女') || text.includes('female') || text.includes('woman') || text.includes('girl')) return 'female';
    if (text.includes('男') || text.includes('male') || text.includes('man') || text.includes('boy')) return 'male';
    return '';
  }

  function splitPromptTags(text = '') {
    return String(text || '').split(TAG_SPLIT_RE).map((item) => item.trim()).filter(Boolean);
  }

  function fixedTags(kind = 'natural', providerId = 'pixai', gender = '') {
    const provider = String(providerId || 'pixai').trim().toLowerCase();
    const state = kind === 'dressed' ? 'dressed' : 'natural';
    if (provider === 'pixai') {
      if (gender === 'male') {
        return state === 'natural'
          ? '赤身, 全身, 无遮掩, 双腿, 站立'
          : '全身, 双腿, 站立';
      }
      return state === 'natural'
        ? '赤身, 全身, 无遮掩, 美乳, 双腿, 玉足, 站立'
        : '全身, 美乳, 双腿, 玉足, 站立';
    }
    return state === 'natural' ? 'natural, original body, no clothes' : '';
  }

  function fixedTagVariants(providerId = 'pixai') {
    const provider = String(providerId || 'pixai').trim().toLowerCase();
    if (provider !== 'pixai') return [fixedTags('natural', provider, ''), fixedTags('dressed', provider, '')];
    const variants = [];
    ['male', 'female'].forEach((gender) => {
      ['natural', 'dressed'].forEach((state) => variants.push(fixedTags(state, provider, gender)));
    });
    return variants;
  }

  function normalizePromptFixedTags(prompt = '', kind = 'natural', providerId = 'pixai', gender = '') {
    const fixed = fixedTags(kind, providerId, gender);
    const legacyFixed = new Set(fixedTagVariants(providerId)
      .flatMap((item) => splitPromptTags(item))
      .map((item) => item.toLowerCase()));
    const baseTags = splitPromptTags(prompt).filter((item) => !legacyFixed.has(item.toLowerCase()));
    const seen = new Set(baseTags.map((item) => item.toLowerCase()));
    const addTags = splitPromptTags(fixed).filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return [...baseTags, ...addTags].join(', ');
  }

  function fallbackDrawTagTemplate() {
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
  }

  function compactDrawTagPrompt(ctx = {}, kind = 'natural') {
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
      'State: ' + (kind === 'dressed' ? 'dressed' : 'natural'),
      'Identity material:\n' + (ctx.identityTags || 'unknown'),
      'Body material:\n' + (ctx.bodyTags || 'unknown'),
    ].join('\n');
  }

  function structuredTags(items = []) {
    return [...new Set((items || []).map((item) => String(item?.value || '').trim())
      .filter((value) => value && value !== '未记录'))].join('，');
  }

  function promptMaterialText(items = [], fallback = '未记录') {
    const lines = (items || []).map((item) => {
      const text = String(item?.text || '').trim();
      if (text) return text;
      const label = String(item?.label || item?.key || '').trim();
      const value = String(item?.value || '').trim();
      return [label, value].filter(Boolean).join('：');
    }).filter((line) => line && line !== fallback);
    return [...new Set(lines)].join('\n') || fallback;
  }

  function renderPrompt(template, vars = {}) {
    const identityTags = vars.identityTags || '';
    const bodyTags = vars.bodyTags || '';
    return String(template || fallbackDrawTagTemplate())
      .replace(/\{\{\s*identityTags\s*\}\}/g, identityTags)
      .replace(/\{\s*identityTags\s*\}/g, identityTags)
      .replace(/\{\{\s*bodyTags\s*\}\}/g, bodyTags)
      .replace(/\{\s*bodyTags\s*\}/g, bodyTags)
      .replace(/\{\{[^{}]*(?:identity|韬|身份)[^{}]*\}\}/gi, identityTags)
      .replace(/\{[^{}]*(?:identity|韬|身份)[^{}]*\}/gi, identityTags)
      .replace(/\{\{[^{}]*(?:body|state|鐘|部位|状态)[^{}]*\}\}/gi, bodyTags)
      .replace(/\{[^{}]*(?:body|state|鐘|部位|状态)[^{}]*\}/gi, bodyTags);
  }

  function cleanTags(text = '') {
    return [...new Set(String(text || '').replace(/```[a-z]*|```/gi, '')
      .replace(/^(正向提示词|正向|绘图提示词|提示词|负面提示词|负向提示词|负向|positive\s*prompt|negative\s*prompt|positive|negative|prompt|tags)\s*[:：]/gim, '')
      .replace(/\b(positive\s*prompt|negative\s*prompt|positive|negative|prompt|tags)\s*[:：]/gi, '\n')
      .split(TAG_SPLIT_RE).map((item) => item.trim().replace(/^[-*]\s*/, ''))
      .filter(Boolean))].join(', ');
  }

  function normalizePromptForCompare(value) {
    return String(value || '').toLowerCase().split(TAG_SPLIT_RE)
      .map((item) => item.trim())
      .filter(Boolean)
      .sort()
      .join('|');
  }

  function isDefaultPositivePrompt(prompt = '') {
    return normalizePromptForCompare(prompt) === normalizePromptForCompare(DEFAULT_POSITIVE_PROMPT);
  }

  function isPlaceholderPrompt(prompt = '') {
    const tags = String(prompt || '').split(TAG_SPLIT_RE).map((item) => item.trim().toLowerCase()).filter(Boolean);
    return tags.length > 0 && tags.every((tag) => /^tag\d+$/.test(tag));
  }

  function meaningfulPromptTags(prompt = '') {
    const fixed = new Set([
      '1girl or 1boy', '1girl', '1boy', 'solo', 'full body', 'standing', 'front view',
      'clear face', 'clean background', 'anime style', 'high quality',
      'natural', 'original body', 'no clothes',
    ]);
    return String(prompt || '').split(TAG_SPLIT_RE)
      .map((item) => item.trim())
      .filter((tag) => tag && !fixed.has(tag.toLowerCase()) && !/^tag\d+$/i.test(tag));
  }

  function parseDrawPrompt(text = '', options = {}) {
    const raw = String(text || '').replace(/\r/g, '').replace(/```[a-z]*|```/gi, '').trim();
    const positiveLabel = '(?:正向提示词|正向|绘图提示词|提示词|positive\\s*prompt|positive|prompt|tags)';
    const negativeLabel = '(?:负面提示词|负向提示词|负向|negative\\s*prompt|negative)';
    const positiveMatch = raw.match(new RegExp(positiveLabel + '\\s*[:：]\\s*([\\s\\S]*?)(?=\\n?\\s*' + negativeLabel + '\\s*[:：]|$)', 'i'));
    const negativeMatch = raw.match(new RegExp(negativeLabel + '\\s*[:：]\\s*([\\s\\S]*)$', 'i'));
    if (options.strict && !raw) throw new Error('AI 没有返回绘图提示词，请检查文本模型配置后重试。');
    const rawWithoutNegative = raw.replace(new RegExp(negativeLabel + '\\s*[:：][\\s\\S]*$', 'i'), '').trim();
    const positiveSource = positiveMatch?.[1] || rawWithoutNegative || raw;
    const positive = cleanTags(positiveSource);
    if (options.strict && (!positive || isDefaultPositivePrompt(positive) || isPlaceholderPrompt(positive))) {
      throw new Error('AI 没有返回有效的正向绘图提示词，请重试或检查文本模型配置。');
    }
    if (options.strict && meaningfulPromptTags(positive).length < (options.minFeatureTags || 0)) {
      throw new Error('AI 返回的绘图提示词缺少人物特征，请重试或补充“勾选外貌、身材、肤色、气质与部位描述”。');
    }
    const negative = cleanTags(negativeMatch?.[1] || DEFAULT_NEGATIVE_PROMPT) || DEFAULT_NEGATIVE_PROMPT;
    return { prompt: positive || DEFAULT_POSITIVE_PROMPT, negativePrompt: negative };
  }

  return {
    targetGenderFromProfile,
    splitPromptTags,
    fixedTags,
    fixedTagVariants,
    normalizePromptFixedTags,
    fallbackDrawTagTemplate,
    compactDrawTagPrompt,
    structuredTags,
    promptMaterialText,
    renderPrompt,
    cleanTags,
    isDefaultPositivePrompt,
    isPlaceholderPrompt,
    meaningfulPromptTags,
    parseDrawPrompt,
  };
})();
