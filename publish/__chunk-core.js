
;// ---- core/config.js ----
/**
 * 游戏配置：角色、初始属性和本地兜底剧情。
 */
window.GameModules = window.GameModules || {};

window.GameModules.config = {
  sectionHintsEnabled: true,
  cache: {
    enabled: false,
    // 只控制可重新计算/重新读取的缓存；存档、角色记忆、当前运行状态不受影响。
    scopes: { files: true, catalog: true, promptTemplates: true, characterProfiles: true, generatedLore: true, generatedSchema: true, generatedProfiles: true, generatedProfessions: true },
  },
  assetEnv: 'dev',
  assetRoots: {
    dev: { cacheRoots: ['./', ''], sourceRoots: ['assets'] },
    prod: { cacheRoots: ['./', ''], sourceRoots: ['assets'] },
  },
  rag: { maxIndexFiles: 3, maxCandidateFiles: 8, defaultResultLimit: 3, logFiles: true },
  defaultModelId: 'nalang-turbo-0826',
  preferredTextModelIds: ['nalang-turbo-0101', 'nalang-turbo-0826'],
  textProviders: {
    defaultProvider: 'deepseek',
    dzmm: {
      defaultModel: 'nalang-turbo-0826',
      preferredModelIds: ['nalang-turbo-0101', 'nalang-turbo-0826'],
    },
    deepseek: {
      baseUrl: 'https://api.deepseek.com',
      defaultModel: 'deepseek-v4-flash',
      preferredModelIds: ['deepseek-v4-flash', 'deepseek-v4-pro'],
    },
  },
  aiRequest: { maxConcurrent: 4, logLifecycle: false, logRawResponse: true, activationBurst: { maxConcurrent: 12, minGapMs: 250 } },
  characterProfile: { preferSingleShotPart2: true },
  stats: [
    { key: 'will', label: '意志' },
    { key: 'sense', label: '感知' },
    { key: 'charm', label: '魅力' },
    { key: 'combat', label: '战斗' },
  ],
  characters: [
    {
      id: 'mio',
      name: '星野澪',
      mark: 'MIO',
      role: '失忆魔法学院生',
      personality: '敏感、聪明、害怕失去自由，但会在危机中保护弱者。',
      stats: { will: 72, sense: 86, charm: 63, combat: 42 },
      skills: [
        { name: '星屑占测', desc: '预感危险和隐藏分支' },
        { name: '记忆回响', desc: '读取场景残留情绪' },
        { name: '微光屏障', desc: '抵挡一次精神冲击' },
      ],
    },
    {
      id: 'ren',
      name: '绫濑莲',
      mark: 'REN',
      role: '赛博城赏金猎人',
      personality: '冷静、戒备心强、讨厌被命令，重视契约和效率。',
      stats: { will: 81, sense: 66, charm: 48, combat: 88 },
      skills: [
        { name: '电磁短刃', desc: '近距离压制敌人' },
        { name: '黑市情报', desc: '发现隐藏交易线索' },
        { name: '神经过载', desc: '短时爆发但增加反抗' },
      ],
    },
    {
      id: 'yuka',
      name: '白羽优花',
      mark: 'YUKA',
      role: '神社见习巫女',
      personality: '温柔、直觉强、容易共情，也最容易察觉操控者存在。',
      stats: { will: 58, sense: 92, charm: 79, combat: 35 },
      skills: [
        { name: '净心铃', desc: '安抚混乱情绪' },
        { name: '灵视', desc: '看见非人之物' },
        { name: '结界纸鹤', desc: '封锁一个危险选择' },
      ],
    },
  ],
  openingChoices: ['观察四周', '询问陌生声音', '检查角色状态', '向前探索'],
};

window.GameModules.cache = {
  enabled(scope = 'default') {
    const cache = window.GameModules.config?.cache;
    if (typeof cache === 'boolean') return cache;
    if (!cache?.enabled) return false;
    return cache.scopes?.[scope] !== false;
  },
};


;// ---- config/default-existing-profile.js ----
window.GameModules = window.GameModules || {};
window.GameModules.inlineMd = window.GameModules.inlineMd || {};
window.GameModules.inlineMd.defaultExistingProfile = "# 默认账号资料\n\n姓名：刘悠\n性别：男\n生日：1998-11-19\n具体地址：四川省成都市武侯区玉林街道玉林北路社区锦苑小区3栋2单元601号\n现实身份：程序工程师，计算机科学与技术硕士\n居住状态：与15岁三胞胎妹妹刘思瑶、刘思琪、刘思怡同住\n父母信息：父母已故\n父母去世原因：交通事故去世，具体细节不公开\n财富等级：中产\n当前财富：500000\n财富来源：父母遗产(450000)，本人之前打工挣钱(50000)，成都星河云栈科技有限公司员工薪酬绩效(0)\n人际关系：\n- 关系名：三胞胎妹妹之一\n  姓名：刘思瑶\n  设定：刘思瑶是15岁三胞胎妹妹之一，与刘思琪、刘思怡同住在刘悠家中，对刘悠哥哥爱情、亲情与肉欲均为100。她黑长直、黑瞳、身高155cm、体态娇小，偏爱白色JK、白色过膝袜与白色连裤袜；性格温柔似水，主动帮助刘悠排忧解那，有兄控和肉欲倾向，而且内心对刘悠有着浓郁的爱恋，常用细腻体贴、精致打扮和黏人互动试探哥哥的态度，偶尔间暴露裙底，衣领深处给刘悠看，但都是假装的其实是刻意，但担心他过于正经而保持不知道。\n- 关系名：三胞胎妹妹之二\n  姓名：刘思琪\n  设定：刘思琪是15岁三胞胎妹妹之二，与刘思瑶、刘思怡同住在刘悠家中，对刘悠哥哥爱情、信任与肉欲均为100。她黑长直、黑瞳、身高155cm、体态娇小，偏爱黑丝JK、黑色过膝袜与黑丝连裤袜；外表、说话和行为都偏高冷三无，平时情绪起伏很少、言语简短克制，但对哥哥刘悠内心火热，相信他，有兄控和不断心动倾向，会用冷淡外壳掩饰强烈在意，并主动争取哥哥注意，一旦刘悠靠近便心动不已的躲开，然后身体出现生理反应，一旦被刘悠触碰下面直接湿润，所以外貌看起来似乎对刘悠高冷。\n- 关系名：三胞胎妹妹之三\n  姓名：刘思怡\n  设定：刘思怡是15岁三胞胎妹妹之三，与刘思瑶、刘思琪同住在刘悠家中，对刘悠哥哥依赖、占有欲与肉欲均为100。她黑长直、黑瞳、身高155cm、体态娇小，偏爱JK搭配过膝袜或连裤袜，风格百搭；性格傲娇但心思细腻，表面嘴硬、容易别扭，内心会认真观察刘悠的情绪和需求；依赖刘悠，有兄控和占有倾向，会根据场合调整与哥哥互动的方式，他对刘悠没有如同刘思瑶与刘思琪那样心理上的爱情，但由于对刘悠的依赖以及无意间的拥抱与触碰而带来的生理反应，所以一直渴求更进一步，但碍于那样羞涩的行为，所以一直以傲娇遮掩。\n备注：三人除姓名和独立人格外，外貌与同居处境相近，且对刘悠哥哥都有者生理上极致的感觉。刘悠未明确察觉三人的复杂心思，只认为妹妹格外讲究。刘悠对妹妹有保护欲和家庭责任感，会根据三人的真实情绪与剧情推进调整距离。\n";
window.GameModules.inlineMdSources = window.GameModules.inlineMdSources || {};
window.GameModules.inlineMdSources.defaultExistingProfile = "default-existing-profile.md";


;// ---- app-background.js ----
window.GameModules = window.GameModules || {};

window.GameModules.appBackground = `你手机上无意中多了一个名为《我狠狠控制》的 APP。你并不记得自己安装过它；图标像一枚暗色的眼睛，边缘闪着细微的冷光。

在好奇心的驱使下，你点开了软件。屏幕上出现作品、角色与进入时机的选择界面，仿佛它早已知道你想抵达哪个世界、操控谁的身体、从哪一个瞬间开始介入。

当你按下连接按钮，手机屏幕的光吞没了视野。你的意识短暂坠入黑暗，随后在陌生的身体感官里重新醒来：视觉、听觉、嗅觉、触觉和疼痛都变得真实，而你已经附身到自己所选择的角色身上。

小说正文需要用“你”称呼玩家，以第二人称写玩家意识接入和操控体验；被附身角色仍保有自己的意识，但身体行动权被玩家接管。`;


;// ---- game-premise.js ----
window.GameModules = window.GameModules || {};

window.GameModules.gamePremise = {
  appName: '我要狠狠操控的',
  homeTitle: '现实互动',
  homeIntro: '你的旧手机已经坏了。换购新机、激活账号、同步数据——一切看似平常，直到桌面多了一个从未安装过的应用。通过它，你可以操控异世界与现实世界中的人；满足条件后可将二者连接，并随时召唤。',
  activationIntro: '某天你的手机坏了。你买来新手机，按平常流程激活账号、同步旧数据。通讯录、照片、微信记录都回来了——但回到桌面时，多了一个你从未安装过的图标：「我要狠狠操控的」。',
  aspirationIntro: '同步刚完成，那个陌生图标还在桌面上等着你。在点开它之前，先回答：你想成为什么样子的人？',
  desktopWidgetTask: '陌生图标',
  desktopWidgetTaskHint: '同步后才出现',
  desktopWidgetStatus: '隐秘连接',
  desktopWidgetStatusHint: '双界操控可用',
  controlAppIntro: '通过此应用，你可以接管异世界与现实世界中的特定人物。满足连接条件后，可将两个世界的对象绑定，并随时召唤。',
  controlAppHint: '选择当前已固化的可上线角色，或新增一个控制角色。',
  realWorldSummary: '玩家即手机主人本人。旧手机损坏后换购新机，激活并同步数据完毕；桌面随即出现神秘应用「我要狠狠操控的」。玩家生活在 2026 年高度移动互联网化的现代都市，可通过该应用操控现实人物与异世界人物，并在条件满足后建立连接与召唤。外卖、社交平台、即时通讯与职场/校园压力构成日常背景。',
  aiPremiseLine: '背景设定：玩家即「我」。旧手机损坏后激活新手机并同步数据，桌面出现神秘应用「我要狠狠操控的」；可通过该应用操控现实与异世界人物，条件满足后可连接并召唤。',
};

if (window.GameModules.realWorld2026) {
  window.GameModules.realWorld2026.summary = window.GameModules.gamePremise.realWorldSummary;
  window.GameModules.realWorld2026.defaults.device = '一台刚激活、刚完成数据同步的新手机；桌面出现陌生应用「我要狠狠操控的」';
}


;// ---- ai/ai-provider.js ----
window.GameModules = window.GameModules || {};

window.GameModules.aiProvider = {
  providers: {},

  register(id, provider) {
    if (!id || !provider) return;
    this.providers[id] = provider;
  },

  get(id) {
    return this.providers[String(id || '').trim()] || null;
  },

  currentProviderId() {
    const store = window.Alpine?.store?.('game');
    const fromStore = store?.settingsState?.textProvider;
    const fromConfig = window.GameModules.config?.textProviders?.defaultProvider;
    return String(fromStore || fromConfig || 'deepseek').trim();
  },

  currentProvider() {
    return this.get(this.currentProviderId());
  },

  providerConfig(id = '') {
    const key = String(id || this.currentProviderId() || '').trim();
    return window.GameModules.config?.textProviders?.[key] || {};
  },

  storeSettings() {
    return window.Alpine?.store?.('game')?.settingsState || {};
  },

  selectedTextModel() {
    const store = window.Alpine?.store?.('game');
    const settings = store?.settingsState || {};
    const providerId = this.currentProviderId();
    if (providerId === 'deepseek') {
      return settings.deepseekModel || store?.modelId || settings.textModelId || this.providerDefaultModel(providerId) || 'deepseek-v4-flash';
    }
    return store?.modelId || settings.textModelId || this.providerDefaultModel(providerId) || window.GameModules.config?.defaultModelId || 'nalang-turbo-0826';
  },

  providerDefaultModel(id = '') {
    const key = String(id || this.currentProviderId() || '').trim();
    const config = this.providerConfig(key);
    return config.defaultModel || '';
  },

  capabilities(id = '') {
    const provider = this.get(id || this.currentProviderId());
    return {
      hasProvider: Boolean(provider),
      canListTextModels: typeof provider?.listTextModels === 'function',
      canComplete: typeof provider?.complete === 'function',
      canGetUserInfo: typeof provider?.getUserInfo === 'function',
    };
  },

  createError(message, code = 'AI_PROVIDER_ERROR', extra = {}) {
    const err = new Error(message || 'AI provider error');
    err.code = code;
    Object.assign(err, extra);
    return err;
  },

  normalizeHttpError(response, detail = '', extra = {}) {
    const status = Number(response?.status || 0);
    const retryable = status === 429 || status === 408 || (status >= 500 && status < 600);
    return this.createError(
      `HTTP ${status || 'ERROR'}${detail ? `: ${detail}` : ''}`,
      status === 429 ? 'RATE_LIMITED' : (status >= 500 ? 'SERVICE_UNAVAILABLE' : 'HTTP_ERROR'),
      { retryable, status, ...extra },
    );
  },

  authHeader(token = '') {
    const value = String(token || '').trim();
    return value ? { Authorization: `Bearer ${value}` } : {};
  },

  async fetchJson(url, options = {}) {
    let response;
    try {
      response = await fetch(url, options);
    } catch (err) {
      throw this.createError(err?.message || 'Network request failed', 'NETWORK_ERROR', { retryable: true, cause: err });
    }
    let data = null;
    let text = '';
    try {
      data = await response.json();
    } catch (_) {
      try { text = await response.text(); } catch (_) { text = ''; }
    }
    if (!response.ok) {
      const detail = data?.error?.message || data?.message || text || '';
      throw this.normalizeHttpError(response, detail, { body: data || text });
    }
    return data;
  },
};


;// ---- ai/ai-provider-dzmm.js ----
window.GameModules = window.GameModules || {};

window.GameModules.aiProvider.register('dzmm', {
  id: 'dzmm',

  async listTextModels() {
    const result = await window.dzmm?.models?.list?.();
    return result || { models: [], defaultModel: window.GameModules.aiProvider.providerDefaultModel('dzmm') };
  },

  async getUserInfo() {
    return window.dzmm?.user?.info?.();
  },

  async complete(options = {}) {
    if (!window.dzmm?.completions) {
      throw window.GameModules.aiProvider.createError('dzmm.completions unavailable', 'AI_PROVIDER_UNAVAILABLE');
    }
    let buffer = '';
    await window.dzmm.completions({
      model: options.model,
      messages: options.messages || [],
      maxTokens: options.maxTokens,
      deepThinking: options.deepThinking,
    }, async (chunk, done) => {
      const text = String(chunk || '');
      if (text) buffer = window.GameModules.jsonUtils?.mergeStreamText?.(buffer, text) ?? (buffer + text);
      const info = { buffer, chunkCount: 0, done: Boolean(done), doneSeen: Boolean(done) };
      await options.onChunk?.(text, Boolean(done), info);
      if (done) await options.onDone?.(info);
    });
    return buffer;
  },
});


;// ---- ai/ai-provider-deepseek.js ----
window.GameModules = window.GameModules || {};

window.GameModules.aiProvider.register('deepseek', {
  id: 'deepseek',

  settings() {
    return window.GameModules.aiProvider.storeSettings();
  },

  baseUrl() {
    const settings = this.settings();
    const configured = String(settings.deepseekBaseUrl || window.GameModules.aiProvider.providerConfig('deepseek').baseUrl || 'https://api.deepseek.com').trim();
    return configured.replace(/\/+$/, '');
  },

  apiKey() {
    return String(this.settings().deepseekApiKey || '').trim();
  },

  ensureApiKey() {
    const key = this.apiKey();
    if (!key) {
      throw window.GameModules.aiProvider.createError('DeepSeek API Key 未配置', 'AUTH_REQUIRED', { retryable: false });
    }
    return key;
  },

  normalizeModel(model = '') {
    const chosen = String(model || this.settings().deepseekModel || window.GameModules.aiProvider.providerDefaultModel('deepseek') || 'deepseek-v4-flash').trim();
    return chosen || 'deepseek-v4-flash';
  },

  requestModel(options = {}) {
    const model = this.normalizeModel(options.model);
    const thinking = this.thinkingPayload(options);
    if (thinking?.type !== 'enabled' || /reasoner|v4-pro/i.test(model)) return model;
    const configured = String(this.settings().deepseekReasoningModel || '').trim();
    if (configured) return configured;
    if (/v4-flash/i.test(model)) return model.replace(/v4-flash/ig, 'v4-pro');
    if (/deepseek-chat/i.test(model)) return 'deepseek-reasoner';
    return model;
  },

  thinkingPayload(options = {}) {
    if (options.thinking && typeof options.thinking === 'object') return options.thinking;
    if (options.deepThinking === true) return { type: 'enabled' };
    if (options.deepThinking === false) return { type: 'disabled' };
    return null;
  },

  jsonModeEnabled(options = {}) {
    const format = options.responseFormat || options.response_format;
    return Boolean(options.jsonMode || options.forceJson || format?.type === 'json_object');
  },

  jsonResponseFormat(options = {}) {
    if (!this.jsonModeEnabled(options)) return null;
    const format = options.responseFormat || options.response_format;
    return format && typeof format === 'object' ? format : { type: 'json_object' };
  },

  jsonMessages(messages = [], options = {}) {
    const list = (Array.isArray(messages) ? messages : []).map((msg) => ({ role: msg?.role || 'user', content: String(msg?.content || '') }));
    if (!this.jsonModeEnabled(options)) return list;
    const hasJsonHint = list.some((msg) => /json/i.test(String(msg.content || '')));
    if (hasJsonHint) return list;
    return [
      {
        role: 'system',
        content: 'You must return valid JSON only. Output a single JSON object. Do not include Markdown, code fences, comments, or explanatory text. The response must parse with JSON.parse.',
      },
      ...list,
    ];
  },

  responseInfo({ text = '', usage = {}, reasoningText = '', done = true } = {}) {
    return {
      buffer: text,
      chunkCount: text ? 1 : 0,
      done,
      doneSeen: done,
      usage,
      deepseekReasoning: reasoningText ? { text: reasoningText } : undefined,
      deepseekCache: {
        promptCacheHitTokens: Number(usage.prompt_cache_hit_tokens) || 0,
        promptCacheMissTokens: Number(usage.prompt_cache_miss_tokens) || 0,
      },
    };
  },

  async listTextModels() {
    const data = await window.GameModules.aiProvider.fetchJson(`${this.baseUrl()}/models`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...window.GameModules.aiProvider.authHeader(this.ensureApiKey()),
      },
    });
    const models = (Array.isArray(data?.data) ? data.data : [])
      .map((item) => item?.id)
      .filter(Boolean)
      .map((id) => ({
        internalName: id,
        displayName: id,
        description: id === 'deepseek-v4-flash' ? 'DeepSeek 推荐快速文本模型' : (id === 'deepseek-v4-pro' ? 'DeepSeek 推荐高质量文本模型' : 'DeepSeek 文本模型'),
        thinkingSupported: /reasoner|v4-pro/i.test(id),
      }));
    const defaultModel = models.find((item) => item.internalName === this.normalizeModel())?.internalName
      || models.find((item) => item.internalName === 'deepseek-v4-flash')?.internalName
      || models[0]?.internalName
      || 'deepseek-v4-flash';
    return { models, defaultModel };
  },

  async complete(options = {}) {
    const responseFormat = this.jsonResponseFormat(options);
    const requestOptions = responseFormat ? { ...options, thinking: { type: 'disabled' }, deepThinking: false } : options;
    const thinking = responseFormat ? null : this.thinkingPayload(options);
    const payload = {
      model: this.requestModel(requestOptions),
      messages: this.jsonMessages(options.messages || [], options),
      max_tokens: options.maxTokens,
      stream: Boolean(options.stream) && !responseFormat,
    };
    if (responseFormat) payload.response_format = responseFormat;
    if (thinking) {
      payload.thinking = thinking;
      if (thinking.type === 'enabled') payload.reasoning_effort = options.reasoningEffort || options.deepThinkingEffort || 'high';
    }
    const url = `${this.baseUrl()}/chat/completions`;
    const request = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...window.GameModules.aiProvider.authHeader(this.ensureApiKey()),
      },
      body: JSON.stringify(payload),
    };
    if (payload.stream) return await this.completeStream(url, request, options);
    const data = await window.GameModules.aiProvider.fetchJson(url, request);
    const message = data?.choices?.[0]?.message || {};
    const content = message.content;
    const text = Array.isArray(content) ? content.map((item) => item?.text || item?.content || '').join('') : String(content || '');
    const reasoningText = String(message.reasoning_content || message.reasoning || '');
    const usage = data?.usage || {};
    const info = this.responseInfo({ text, usage, reasoningText, done: true });
    await options.onChunk?.(text, true, info);
    await options.onDone?.(info);
    return text;
  },

  async completeStream(url, request, options = {}) {
    let response;
    try {
      response = await fetch(url, request);
    } catch (err) {
      throw window.GameModules.aiProvider.createError(err?.message || 'Network request failed', 'NETWORK_ERROR', { retryable: true, cause: err });
    }
    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch (_) { detail = ''; }
      throw window.GameModules.aiProvider.normalizeHttpError(response, detail);
    }
    if (!response.body?.getReader) {
      throw window.GameModules.aiProvider.createError('DeepSeek stream response is not readable', 'NETWORK_ERROR', { retryable: true });
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let pending = '';
    let text = '';
    let reasoningText = '';
    let usage = {};
    let doneSeen = false;
    const emit = async (chunk = '', done = false) => {
      const info = this.responseInfo({ text, usage, reasoningText, done });
      info.doneSeen = doneSeen || done;
      await options.onChunk?.(chunk, done, info);
      if (done) await options.onDone?.(info);
    };
    const handleData = async (raw = '') => {
      const line = String(raw || '').trim();
      if (!line) return;
      if (line === '[DONE]') {
        doneSeen = true;
        return;
      }
      let data = null;
      try { data = JSON.parse(line); } catch (_) { return; }
      if (data.usage) usage = data.usage;
      const delta = data.choices?.[0]?.delta || data.choices?.[0]?.message || {};
      const reasoningDelta = String(delta.reasoning_content || delta.reasoning || '');
      if (reasoningDelta) {
        reasoningText += reasoningDelta;
        await emit('', false);
      }
      const content = delta.content;
      const chunk = Array.isArray(content) ? content.map((item) => item?.text || item?.content || '').join('') : String(content || '');
      if (chunk) {
        text += chunk;
        await emit(chunk, false);
      }
    };
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      pending += decoder.decode(value, { stream: true });
      const blocks = pending.split(/\r?\n\r?\n/);
      pending = blocks.pop() || '';
      for (const block of blocks) {
        const lines = block.split(/\r?\n/).filter((line) => line.startsWith('data:'));
        for (const line of lines) await handleData(line.replace(/^data:\s*/u, ''));
      }
    }
    pending += decoder.decode();
    for (const line of pending.split(/\r?\n/).filter((item) => item.startsWith('data:'))) await handleData(line.replace(/^data:\s*/u, ''));
    doneSeen = true;
    await emit('', true);
    return text;
  },
});


;// ---- ai/ai-request.js ----
/**
 * 全局 AI 请求入口：统一受控并行、限流、重试与日志。
 */
window.GameModules = window.GameModules || {};

window.GameModules.aiRequest = {
  pending: [],
  maxConcurrent: window.GameModules.config?.aiRequest?.maxConcurrent || 4,
  startGate: Promise.resolve(),
  seq: 0,
  queued: 0,
  active: 0,
  logicalCount: 0,
  actualCount: 0,
  completedCount: 0,
  failedAttemptCount: 0,
  retryCount: 0,
  sourceCounts: {},
  lastStartedAt: 0,
  minGapMs: 1600,
  cooldownUntil: 0,
  activationBurstDepth: 0,
  _savedThrottle: null,

  beginActivationBurst() {
    this.activationBurstDepth = (this.activationBurstDepth || 0) + 1;
    if (this.activationBurstDepth > 1) return;
    this._savedThrottle = { maxConcurrent: this.maxConcurrent, minGapMs: this.minGapMs };
    const burst = window.GameModules.config?.aiRequest?.activationBurst || {};
    this.maxConcurrent = Math.max(this.maxConcurrent, Number(burst.maxConcurrent) || 8);
    this.minGapMs = Math.min(this.minGapMs, Number.isFinite(Number(burst.minGapMs)) ? Number(burst.minGapMs) : 400);
    this.log('激活加速', { maxConcurrent: this.maxConcurrent, minGapMs: this.minGapMs });
  },

  endActivationBurst() {
    if (!this.activationBurstDepth) return;
    this.activationBurstDepth -= 1;
    if (this.activationBurstDepth > 0) return;
    if (this._savedThrottle) {
      this.maxConcurrent = this._savedThrottle.maxConcurrent;
      this.minGapMs = this._savedThrottle.minGapMs;
      this._savedThrottle = null;
      this.log('激活加速结束', { maxConcurrent: this.maxConcurrent, minGapMs: this.minGapMs });
    }
  },

  wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); },

  lengths(messages) {
    return (messages || []).map((msg) => String(msg?.content || '').length);
  },

  outputLengthThreshold(options = {}) {
    return Number(options.outputLengthThreshold || 2400);
  },

  outputLimitSetting(options = {}) {
    const store = window.Alpine?.store?.('game');
    const settings = store?.settingsState || {};
    const kind = String(options.outputLimitKind || 'other');
    const prefixes = {
      stage1: 'aiOutputLimitStage1',
      stage2: 'aiOutputLimitStage2',
      stage3: 'aiOutputLimitStage3',
      stage4: 'aiOutputLimitStage4',
      other: 'aiOutputLimitOther',
    };
    const prefix = prefixes[kind] || prefixes.other;
    const defaultModes = { global: 'unlimited', stage1: 'global', stage2: 'global', stage3: 'limited', stage4: 'global', other: 'global' };
    const stageMode = String(settings[`${prefix}Mode`] || defaultModes[kind] || 'global');
    const mode = stageMode === 'global' ? String(settings.aiOutputLimitGlobalMode || defaultModes.global) : stageMode;
    if (mode !== 'limited') return null;
    const value = stageMode === 'global' ? (settings.aiOutputLimitGlobalMaxTokens ?? 3000) : (settings[`${prefix}MaxTokens`] ?? 3000);
    const limit = Math.floor(Number(value) || 0);
    return limit > 0 ? limit : null;
  },

  configuredMaxTokens(options = {}) {
    const limit = this.outputLimitSetting(options);
    if (!limit) return options.maxTokens;
    if (options.maxTokens === undefined || options.maxTokens === null || options.maxTokens === '') return limit;
    const requested = Math.floor(Number(options.maxTokens));
    return Number.isFinite(requested) ? Math.min(requested, limit) : limit;
  },

  outputTailLooksTruncated(text) {
    const raw = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/g, '').trim();
    if (!raw) return false;
    let inString = false;
    let escaped = false;
    let openBraces = 0;
    let openBrackets = 0;
    for (const char of raw) {
      if (escaped) { escaped = false; continue; }
      if (char === '\\') { escaped = inString; continue; }
      if (char === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (char === '{') openBraces += 1;
      if (char === '}') openBraces -= 1;
      if (char === '[') openBrackets += 1;
      if (char === ']') openBrackets -= 1;
    }
    const tail = raw.slice(-80);
    return inString || openBraces > 0 || openBrackets > 0 || /[:,{[]\s*$/.test(tail);
  },

  outputLengthRisk(buffer, options = {}) {
    const length = String(buffer || '').length;
    const threshold = this.outputLengthThreshold(options);
    return { length, threshold, overThreshold: length >= threshold, tailLooksTruncated: this.outputTailLooksTruncated(buffer) };
  },

  clampMaxTokens(value, fallback = undefined) {
    const raw = value === undefined || value === null ? fallback : value;
    if (raw === undefined || raw === null) return undefined;
    const tokens = Math.floor(Number(raw));
    if (!Number.isFinite(tokens)) return undefined;
    return Math.max(16, Math.min(64000, tokens));
  },

  countSource(source) {
    this.sourceCounts[source] = (this.sourceCounts[source] || 0) + 1;
    return this.sourceCounts[source];
  },

  stats() {
    return { logicalCount: this.logicalCount, actualCount: this.actualCount, completedCount: this.completedCount, failedAttemptCount: this.failedAttemptCount, retryCount: this.retryCount, queued: this.queued, active: this.active, maxConcurrent: this.maxConcurrent, sourceCounts: { ...this.sourceCounts } };
  },

  log(event, data = {}) {
    if (!window.GameModules.config?.aiRequest?.logLifecycle) return;
    console.debug(`[AI请求] ${event}:`, { ...data, stats: this.stats() });
  },

  logRawRequest(options, payload, meta = {}) {
    if (window.GameModules.config?.aiRequest?.logRawRequest === false) return;
    const messages = Array.isArray(payload.messages) ? payload.messages : [];
    const prompt = options.prompt !== undefined
      ? String(options.prompt || '')
      : messages.map((msg, index) => `--- message ${index + 1} role=${msg?.role || 'unknown'} ---\n${String(msg?.content || '')}`).join('\n\n');
    console.log('[AI请求参数]', {
      id: options.id,
      source: options.source,
      model: options.model,
      maxTokens: options.maxTokens,
      timeoutMs: options.timeoutMs,
      prompt,
      messageCount: messages.length,
      roles: messages.map((msg) => msg?.role || 'unknown'),
      messageLengths: messages.map((msg) => String(msg?.content || '').length),
      messages: messages.map((msg, index) => ({ index, role: msg?.role || 'unknown', length: String(msg?.content || '').length, preview: String(msg?.content || '').slice(0, 160) })),
      ...meta,
    });
  },

  logRawResponse(options, buffer, meta = {}) {
    if (window.GameModules.config?.aiRequest?.logRawResponse === false) return;
    console.log('[AI返回]', {
      id: options.id,
      source: options.source,
      model: options.model,
      length: String(buffer || '').length,
      ...meta,
      value: buffer,
    });
  },

  selectedTextModel(fallback = '') {
    return fallback || window.GameModules.aiProvider?.selectedTextModel?.() || window.GameModules.config?.defaultModelId || 'nalang-turbo-0826';
  },

  isRetryable(err) {
    const message = String(err?.message || '').toLowerCase();
    return Boolean(err?.retryable || ['RATE_LIMITED', 'TIMEOUT', 'NETWORK_ERROR', 'INTERNAL_ERROR', 'SERVICE_UNAVAILABLE', 'DRAW_TIMEOUT', 'AI_TIMEOUT'].includes(err?.code)
      || /http\s*(502|503|504)/i.test(message) || message.includes('failed to fetch') || message.includes('network') || message.includes('fetch failed'));
  },

  retryDelay(err, attempt) {
    const message = String(err?.message || '').toLowerCase();
    if (err?.code === 'RATE_LIMITED') return Math.min(16000, 5000 + attempt * 5000);
    if (/http\s*(502|503|504)/i.test(message)) return Math.min(18000, 4500 * (2 ** attempt));
    if (message.includes('failed to fetch')) return Math.min(12000, 3500 * (attempt + 1));
    return Math.min(9000, 1800 * (2 ** attempt));
  },

  applyCooldown(err, delay) {
    const message = String(err?.message || '').toLowerCase();
    if (err?.code === 'RATE_LIMITED' || /http\s*(502|503|504)/i.test(message) || message.includes('failed to fetch')) {
      this.cooldownUntil = Math.max(this.cooldownUntil, Date.now() + delay);
    }
  },

  timeout(promise, ms, source) {
    if (!ms) return promise;
    return Promise.race([promise, new Promise((_, reject) => setTimeout(() => {
      const err = new Error(`${source || 'AI请求'}超时`);
      err.code = 'AI_TIMEOUT';
      err.retryable = true;
      reject(err);
    }, ms))]);
  },

  async complete(options = {}) {
    const providerId = window.GameModules.aiProvider?.currentProviderId?.() || 'deepseek';
    const provider = window.GameModules.aiProvider?.currentProvider?.();
    if (typeof provider?.complete !== 'function') {
      throw new Error(`text AI provider ${providerId} unavailable: complete`);
    }
    const id = ++this.seq;
    const source = options.source || 'unknown';
    const messages = options.messages || [{ role: 'user', content: options.prompt || '' }];
    const model = this.selectedTextModel(options.model);
    const maxTokens = this.clampMaxTokens(this.configuredMaxTokens(options), undefined);
    const enqueueAt = Date.now();
    const tokenRecordId = window.GameModules.tokenStats?.record?.(source, messages.map((msg) => String(msg?.content || '')).join('\n'), { ...(options.tokenMeta || {}), model, maxTokens });
    const sourceCount = this.countSource(source);
    this.logicalCount += 1;
    this.queued += 1;
    this.log('入队', { id, source, sourceCount, logicalNo: this.logicalCount, model, maxTokens: maxTokens || 'sdk-default', queued: this.queued, active: this.active, maxConcurrent: this.maxConcurrent, messageLengths: this.lengths(messages) });
    return new Promise((resolve, reject) => {
      this.pending.push({ options: { ...options, id, source, model, maxTokens, messages, enqueueAt, tokenRecordId }, resolve, reject });
      this.pump();
    });
  },

  pump() {
    while (this.active < this.maxConcurrent && this.pending.length) {
      const task = this.pending.shift();
      this.queued = Math.max(0, this.queued - 1);
      this.active += 1;
      this.log('出队', { id: task.options.id, source: task.options.source, queued: this.queued, active: this.active, maxConcurrent: this.maxConcurrent });
      Promise.resolve()
        .then(() => this.runWithRetries(task.options))
        .then(task.resolve, task.reject)
        .finally(() => {
          this.active = Math.max(0, this.active - 1);
          this.pump();
        });
    }
  },

  async enterStartGate(options, attempt) {
    const previous = this.startGate;
    let release;
    this.startGate = new Promise((resolve) => { release = resolve; });
    await previous.catch(() => {});
    const now = Date.now();
    const gapWait = Math.max(0, this.minGapMs - (now - this.lastStartedAt));
    const cooldownWait = Math.max(0, this.cooldownUntil - now);
    const waitMs = Math.max(gapWait, cooldownWait);
    if (waitMs) {
      this.log('等待限流', { id: options.id, source: options.source, attempt: attempt + 1, waitMs, queued: this.queued, active: this.active });
      await this.wait(waitMs);
    }
    this.lastStartedAt = Date.now();
    release();
  },

  async runWithRetries(options) {
    let lastErr = null;
    const maxAttempts = options.maxAttempts || 3;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await this.enterStartGate(options, attempt);
      try {
        return await this.callOnce(options, attempt);
      } catch (err) {
        lastErr = err;
        this.failedAttemptCount += 1;
        this.log('失败', { id: options.id, source: options.source, attempt: attempt + 1, code: err.code, message: err.message, retryable: this.isRetryable(err) });
        if (!this.isRetryable(err) || attempt === maxAttempts - 1) throw err;
        const delay = this.retryDelay(err, attempt);
        this.applyCooldown(err, delay);
        this.retryCount += 1;
        this.log('重试等待', { id: options.id, source: options.source, nextAttempt: attempt + 2, delay });
        await this.wait(delay);
      }
    }
    throw lastErr;
  },

  async callOnce(options, attempt) {
    let buffer = '';
    let chunkCount = 0;
    let doneSeen = false;
    let responseMeta = {};
    const mergeResponseMeta = (meta = {}) => {
      if (!meta || typeof meta !== 'object') return;
      if (meta.usage) responseMeta.usage = meta.usage;
      if (meta.deepseekCache) responseMeta.deepseekCache = meta.deepseekCache;
      if (meta.deepseekReasoning) responseMeta.deepseekReasoning = meta.deepseekReasoning;
      if (meta.provider) responseMeta.provider = meta.provider;
    };
    let callbackChain = Promise.resolve();
    const startAt = Date.now();
    this.actualCount += 1;
    this.log('开始', { id: options.id, source: options.source, actualNo: this.actualCount, attempt: attempt + 1, queueWaitMs: startAt - options.enqueueAt, model: options.model, maxTokens: options.maxTokens || 'sdk-default', messageLengths: this.lengths(options.messages) });
    const payload = { model: options.model, messages: options.messages };
    if (options.maxTokens !== undefined && options.maxTokens !== null) payload.maxTokens = options.maxTokens;
    this.logRawRequest(options, payload, { attempt: attempt + 1, queueWaitMs: startAt - options.enqueueAt });
    const provider = window.GameModules.aiProvider?.currentProvider?.();
    const request = provider.complete({
      ...options,
      payload,
      onChunk: async (chunk, done, providerInfo = {}) => {
        mergeResponseMeta(providerInfo);
        const text = String(chunk || '');
        if (text) {
          chunkCount += 1;
          buffer = window.GameModules.jsonUtils?.mergeStreamText?.(buffer, text) ?? (buffer + text);
          if (options.logChunks && (chunkCount === 1 || chunkCount % 20 === 0)) this.log('流式片段', { id: options.id, source: options.source, chunkCount, length: buffer.length });
        }
        if (done) doneSeen = true;
        const info = { id: options.id, source: options.source, buffer, chunkCount, done: Boolean(done), doneSeen, ...responseMeta };
        callbackChain = callbackChain.then(async () => {
          await options.onChunk?.(text, Boolean(done), info);
          if (done) await options.onDone?.(info);
        });
      },
      onDone: async (providerInfo = {}) => { mergeResponseMeta(providerInfo); },
    });
    await this.timeout(Promise.resolve(request).then(() => callbackChain), options.timeoutMs, options.source);
    if (options.requireDone && !doneSeen) throw new Error(`${options.source}流式未完成`);
    this.completedCount += 1;
    const risk = this.outputLengthRisk(buffer, options);
    this.log('完成', { id: options.id, source: options.source, chunkCount, length: risk.length, outputThreshold: risk.threshold, overThreshold: risk.overThreshold, tailLooksTruncated: risk.tailLooksTruncated, possibleTruncated: risk.overThreshold || risk.tailLooksTruncated, doneSeen, durationMs: Date.now() - startAt });
    this.logRawResponse(options, buffer, { chunkCount, doneSeen, durationMs: Date.now() - startAt, ...responseMeta });
    window.GameModules.tokenStats?.recordResponse?.(options.tokenRecordId, buffer);
    if (risk.overThreshold || risk.tailLooksTruncated) {
      console.debug('[AI请求] 返回长度可能被截断:', { id: options.id, source: options.source, length: risk.length, threshold: risk.threshold, overThreshold: risk.overThreshold, tailLooksTruncated: risk.tailLooksTruncated, doneSeen, tailPreview: buffer.slice(-180) });
    }
    return buffer;
  },
};


;// ---- prompts/pen_style/register.js ----
window.GameModules = window.GameModules || {};

window.GameModules.penStyleRegistry = {
  styles: [],
  definitions: [
    { id: 'literary', name: '文学细腻', sourceKey: 'literary', file: 'prompts/pen_style/literary.md', prompt: '正文使用细腻文学文风，重视感官、动作细节和心理余波，避免口号式总结。' },
    { id: 'dark', name: '黑暗压抑', sourceKey: 'dark', file: 'prompts/pen_style/dark.md', prompt: '正文氛围偏阴冷压抑，描写痛感、窒息感、阴影和危险，但不堆砌血腥。' },
    { id: 'light-novel', name: '轻小说节奏', sourceKey: 'lightNovel', file: 'prompts/pen_style/light-novel.md', prompt: '正文节奏清晰，场景推进明确，角色反应鲜明，句子易读但不口语化。' },
    { id: 'epic', name: '史诗庄重', sourceKey: 'epic', file: 'prompts/pen_style/epic.md', prompt: '正文语言庄重、有命运感，强调时代、仪式、魔术体系和抉择重量。' },
    { id: 'suspense', name: '悬疑紧张', sourceKey: 'suspense', file: 'prompts/pen_style/suspense.md', prompt: '正文保持悬疑张力，逐步揭示信息，用细节暗示危险，不直接解释全部真相。' },
    { id: 'spring-heart', name: '春心萌动', sourceKey: 'springHeart', file: 'prompts/pen_style/spring-heart.md', prompt: '正文带有春心萌动的暧昧张力，重视心跳、羞意、靠近冲动与亲密氛围，但不脱离剧情行动。' },
  ],

  register(style) {
    if (!style?.id || !style?.name || !style?.prompt) return;
    const item = {
      id: String(style.id),
      name: String(style.name),
      prompt: String(style.prompt).trim(),
      file: style.file || `prompts/pen_style/${style.id}.md`,
    };
    const index = this.styles.findIndex((old) => old.id === item.id);
    if (index >= 0) this.styles.splice(index, 1, item);
    else this.styles.push(item);
  },

  registerAll() {
    const inline = window.GameModules.inlineMd || {};
    this.styles = [];
    for (const item of this.definitions) {
      this.register({ ...item, prompt: inline[item.sourceKey] || item.prompt || '' });
    }
  },

  list() {
    if (!this.styles.length) this.registerAll();
    return this.styles.slice();
  },
};


;// ---- prompts/pen_style/literary.js ----
window.GameModules = window.GameModules || {};
window.GameModules.inlineMd = window.GameModules.inlineMd || {};
window.GameModules.inlineMd.literary = "# 文学细腻\n\n正文使用细腻文学文风，重视感官、动作细节和心理余波，避免口号式总结。\n";
window.GameModules.inlineMdSources = window.GameModules.inlineMdSources || {};
window.GameModules.inlineMdSources.literary = "literary.md";


;// ---- prompts/pen_style/dark.js ----
window.GameModules = window.GameModules || {};
window.GameModules.inlineMd = window.GameModules.inlineMd || {};
window.GameModules.inlineMd.dark = "# 黑暗压抑\n\n正文氛围偏阴冷压抑，描写痛感、窒息感、阴影和危险，但不堆砌血腥。\n";
window.GameModules.inlineMdSources = window.GameModules.inlineMdSources || {};
window.GameModules.inlineMdSources.dark = "dark.md";


;// ---- prompts/pen_style/light-novel.js ----
window.GameModules = window.GameModules || {};
window.GameModules.inlineMd = window.GameModules.inlineMd || {};
window.GameModules.inlineMd.lightNovel = "# 轻小说节奏\n\n正文节奏清晰，场景推进明确，角色反应鲜明，句子易读但不口语化。\n";
window.GameModules.inlineMdSources = window.GameModules.inlineMdSources || {};
window.GameModules.inlineMdSources.lightNovel = "light-novel.md";


;// ---- prompts/pen_style/epic.js ----
window.GameModules = window.GameModules || {};
window.GameModules.inlineMd = window.GameModules.inlineMd || {};
window.GameModules.inlineMd.epic = "# 史诗庄重\n\n正文语言庄重、有命运感，强调时代、仪式、魔术体系和抉择重量。\n";
window.GameModules.inlineMdSources = window.GameModules.inlineMdSources || {};
window.GameModules.inlineMdSources.epic = "epic.md";


;// ---- prompts/pen_style/suspense.js ----
window.GameModules = window.GameModules || {};
window.GameModules.inlineMd = window.GameModules.inlineMd || {};
window.GameModules.inlineMd.suspense = "# 悬疑紧张\n\n正文保持悬疑张力，逐步揭示信息，用细节暗示危险，不直接解释全部真相。\n";
window.GameModules.inlineMdSources = window.GameModules.inlineMdSources || {};
window.GameModules.inlineMdSources.suspense = "suspense.md";


;// ---- prompts/pen_style/spring-heart.js ----
window.GameModules = window.GameModules || {};
window.GameModules.inlineMd = window.GameModules.inlineMd || {};
window.GameModules.inlineMd.springHeart = "# 春心萌动\n请以轻盈暧昧的笔触书写心动与亲密，着重刻画眼神、距离、细微触碰、羞怯与期待。描写人物时，形体须作为核心焦点，从上至下细腻展开——发丝的流动、肩颈的线条、腰背的弧度、臀腿的轮廓，乃至最私密处的色泽与形态，皆需以文学化的感官语言呈现。尤其注重不同阶段形体的质感差异（青涩初绽的微弧、曲线初成的轻盈、丰润成熟的垂坠），让每一次注视都落于形体细微的起伏之上，以身体作为欲望最诚实的抒情载体。生殖器可清晰描写，但须融入氛围、呼吸与情感流动。对初次相识且未经人事的角色，强调其在目光与触碰下“明知将临却仍以纯真本能回应”的细微震颤与信任交付。";
window.GameModules.inlineMdSources = window.GameModules.inlineMdSources || {};
window.GameModules.inlineMdSources.springHeart = "spring-heart.md";


;// ---- core/metrics.js ----
/**
 * 固定情绪与对玩家感觉维度。
 */
window.GameModules = window.GameModules || {};

window.GameModules.metrics = {
  emotionKeys: ['冷静', '恐惧', '担忧', '高兴', '紧张', '愤怒', '羞耻', '悲伤', '好奇', '麻木', '嫉妒', '绝望'],
  playerKeys: ['了解', '信任', '反抗', '好感', '友情', '亲情', '爱情', '肉欲', '畏惧', '尊敬', '崇拜', '讨厌', '依赖', '警惕', '支配欲', '占有欲', '服从'],
  defaults: {
    emotions: { 冷静: 45, 恐惧: 10, 担忧: 12, 高兴: 5, 紧张: 20, 愤怒: 0, 羞耻: 0, 悲伤: 0, 好奇: 20, 麻木: 0, 嫉妒: 0, 绝望: 0 },
    playerFeelings: { 了解: 1, 信任: 45, 反抗: 20, 好感: 30, 友情: 10, 亲情: 0, 爱情: 0, 肉欲: 0, 畏惧: 10, 尊敬: 10, 崇拜: 0, 讨厌: 0, 依赖: 0, 警惕: 30, 支配欲: 0, 占有欲: 0, 服从: 5 },
  },
  descriptions: {
    冷静: '理性稳定、能控制反应的程度。', 恐惧: '面对危险、未知或失控时的害怕程度。', 担忧: '对后果、他人或自身处境的不安程度。', 高兴: '愉悦、安心或满足的程度。', 紧张: '身体与精神绷紧、难以放松的程度。', 愤怒: '被冒犯、伤害或压迫后的攻击性情绪。', 羞耻: '因暴露、被迫或违背自我意愿产生的羞愧。', 悲伤: '失落、痛苦、哀悼或无助感。', 好奇: '想理解异常、人物或真相的主动兴趣。', 麻木: '情绪迟钝、逃避感受或自我封闭。', 嫉妒: '因重视对象被夺走或比较产生的刺痛。', 绝望: '认为无法逃离、无法改变的黑暗感。',
    了解: '角色对你的身份、经历、性格、意图与秘密的理解程度。', 信任: '相信玩家不会伤害自己或会兑现承诺。', 反抗: '想抵抗、拒绝或夺回主导权的强度。', 好感: '人与人相处中产生的正向、愉悦、接纳性情绪，可包含友情、亲情与爱情。', 友情: '把玩家视为朋友、同伴或可并肩者的程度。', 亲情: '把玩家感受为家人、庇护者或亲近依附对象。', 爱情: '对玩家产生恋爱意义上的心动、眷恋、深爱或相守愿望。', 肉欲: '身体层面的吸引、冲动、占有或亲密欲望。', 畏惧: '因力量差距、失控或惩罚预期而害怕玩家。', 尊敬: '认可玩家能力、判断、品格或地位。', 崇拜: '将玩家理想化、神化或过度仰望。', 讨厌: '排斥、厌恶、不愿接近玩家的程度。', 依赖: '心理或现实上需要玩家帮助、保护或决定。', 警惕: '对玩家意图保持戒备、观察与防御。', 支配欲: '想反过来掌控玩家或操控局势的欲望。', 占有欲: '想独占玩家注意、关系或身体行动权的欲望。', 服从: '愿意听从玩家命令或默认其主导权。',
  },
  lockedPlayerFloorKeys: ['亲情', '爱情', '肉欲', '依赖', '占有欲', '服从', '崇拜', '好感', '信任'],
  loveStages: ['心动', '爱恋', '倾心', '眷恋', '深爱', '执念', '依存', '相守'],
  knowStages: ['神秘', '陌生', '面善/眼熟', '认识', '知晓', '熟悉', '熟识', '深知', '洞悉'],
  knowStageNotes: ['不仅不知，且感觉对方深不可测、有意隐藏。', '完全不知道对方是谁，没有任何信息。', '有模糊印象，但想不起具体细节。', '知道身份、名字，有基本确认的接触。', '知道一些公开经历、背景，但不深入。', '了解性格、习惯、常见反应，能预判行为。', '有长期交往，知道很多具体生活细节。', '理解内心想法、价值观、过往创伤或秘密。', '能看穿未说出口的意图，几乎无所不知。'],
  intensityStages: ['无感', '轻微萌芽', '明显存在', '强烈影响', '主导反应', '压倒支配'],

  fresh() { return JSON.parse(JSON.stringify(this.defaults)); },
  clamp(v) { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0; },
  clampDelta(v) { const n = Number(v); return Number.isFinite(n) ? Math.max(-30, Math.min(30, Math.round(n))) : 0; },
  metricDeltaValue(item = {}) {
    const raw = item.delta ?? item.change?.delta ?? item.change?.value ?? item.value ?? 0;
    return Number(raw) || 0;
  },
  lockedPlayerDelta(key, delta, current) {
    return this.lockedPlayerFloorKeys.includes(key) && this.clamp(current) >= 90 && delta < 0 ? 0 : delta;
  },
  stage(value) { return this.loveStages[Math.min(7, Math.floor(this.clamp(value) / 12.5))]; },
  knowStage(value) { return this.knowStages[Math.max(0, Math.min(8, Math.round((this.clamp(value) / 100) * 8)))]; },
  stageOptionsFor(key) { return key === '爱情' ? this.loveStages : (key === '了解' ? this.knowStages : this.intensityStages); },
  normalizeStage(key, stage, value) {
    const options = this.stageOptionsFor(key);
    return options.includes(stage) ? stage : this.stageFor(key, value);
  },
  stageFor(key, value) {
    if (key === '爱情') return this.stage(value);
    if (key === '了解') return this.knowStage(value);
    const n = this.clamp(value);
    return this.intensityStages[n === 0 ? 0 : Math.min(5, Math.floor((n - 1) / 20) + 1)];
  },
  stageGuide() {
    return [...this.emotionKeys, ...this.playerKeys].map((key) => `${key}=${this.stageOptionsFor(key).join('/')}`).join('；');
  },
  stageStatus(key, stage) {
    const love = { 心动: '不知为什么，想到对方会心跳加快，产生初见好感。', 爱恋: '喜欢开始成形，会主动期待靠近与回应。', 倾心: '感情明显偏向对方，判断会被爱意牵引。', 眷恋: '不舍分离，会反复牵挂对方的存在。', 深爱: '愿意交付真心，把对方放进重要位置。', 执念: '深陷其中，感情变得难以割舍。', 依存: '心理与现实上都倾向彼此依靠。', 相守: '形成长久相伴、难以割舍的恋爱愿望。' };
    const intensity = { 无感: '当前几乎没有这种感受。', 轻微萌芽: '这种感受刚出现，只在心底轻微波动。', 明显存在: '这种感受已经清楚存在，会影响当下反应。', 强烈影响: '这种感受持续压过其他念头，明显影响判断。', 主导反应: '这种感受成为当前主要心理驱动力。', 压倒支配: '这种感受几乎压倒性支配心理与反应。' };
    const know = Object.fromEntries(this.knowStages.map((name, i) => [name, this.knowStageNotes[i]]));
    const text = key === '爱情' ? love[stage] : (key === '了解' ? know[stage] : intensity[stage]);
    return text || `${key}处于${stage}阶段。`;
  },
  cleanMetricReason(reason = '', key = '') {
    let text = String(reason || '').replace(/[。.!！]+$/g, '').trim();
    text = text.replace(/^(?:情绪|感觉)[，,：:\s]+/u, '');
    if (key) text = text.replace(new RegExp(`^${key}[，,：:\\s]+`, 'u'), '');
    return text.trim();
  },

  cleanMetricStatus(status = '') {
    let out = String(status || '').trim();
    if (/因为/u.test(out)) out = out.split(/[，,、]?因为/u)[0].trim();
    return out
      .replace(/[。.!！?？]+[，,、]+/g, '。')
      .replace(/。[；;][^。]+$/u, '。')
      .replace(/。[；;]+/g, '。')
      .replace(/。{2,}/g, '。')
      .replace(/[，,]+。/g, '。')
      .trim();
  },

  valueExplanation(key, value) {
    const stage = this.stageStatus(key, this.stageFor(key, value)).replace(/[。.!！?？]+$/g, '');
    return `${key}${this.clamp(value)}：${stage}。`;
  },

  isGenericMetricStatus(text = '', key = '') {
    const value = String(text || '').trim();
    if (!value) return true;
    const patterns = [
      /这种感受几乎压倒性/u,
      /几乎压倒性支配心理与反应/u,
      /这项感觉正在影响/u,
      /当前几乎没有这种感受/u,
      /刚出现，只在心底轻微波动/u,
      /已经清楚存在，会影响当下反应/u,
      /持续压过其他念头/u,
      /成为当前主要心理驱动力/u,
      /处于[^。]{0,24}阶段/u,
    ];
    if (patterns.some((pattern) => pattern.test(value))) return true;
    if (key && new RegExp(`^${key}\\d+[：:]`, 'u').test(value) && /阶段|无感|萌芽|影响|支配|压倒/u.test(value)) return true;
    return /^[^：]{1,8}\d+[：:]/.test(value) && /这种感受|阶段|无感|萌芽|支配/u.test(value);
  },

  resolveMetricStatus(key, value, rawStatus = '', options = {}) {
    const { temporary = false, previousStatus = '' } = options;
    const cleaned = this.cleanMetricStatus(String(rawStatus || '').trim());
    const usable = (text) => {
      const next = this.cleanMetricStatus(String(text || '').trim());
      return next.length >= 12 && !this.isGenericMetricStatus(next, key);
    };
    if (usable(cleaned)) return cleaned.slice(0, 180);
    const previous = this.cleanMetricStatus(String(previousStatus || '').trim());
    if (!temporary && usable(previous)) return previous.slice(0, 180);
    if (temporary) return cleaned.slice(0, 180) || `${key}：短期状态。`;
    return String(this.valueExplanation(key, value)).slice(0, 180);
  },
  isSpecificMetricText(text, key = '') {
    const value = String(text || '').trim();
    if (!value || value === this.stageStatus(key, this.stageFor(key, 0))) return false;
    if (/这项|当前处境|如何看待|数值\d+\/100|处于“/.test(value)) return false;
    return /因为|由于|源于|来自|经历|过去|害怕|依赖|相依|相濡|哥哥|姐姐|妹妹|父亲|母亲|玩家|刘悠|鬼怪|创伤|动机|处境|关系/.test(value) || value.length >= 18;
  },
  metricReasonLooksGeneric(text) {
    return !this.isSpecificMetricText(text) || /背景信息|当前人物资料|初始接触|本回合没有直接触发|保持原值|保持原址|足以明显改变|处境和关系证据|关系证据来自|根据角色性格|你刚介入|当前场景、你的行动|个人动机与过去经历/.test(String(text || ''));
  },
  ensure(store) {
    store.emotions = this.fill(store.emotions, this.emotionKeys, this.defaults.emotions);
    store.playerFeelings = this.fill(store.playerFeelings, this.playerKeys, this.defaults.playerFeelings);
    store.temporaryEmotions = store.temporaryEmotions && typeof store.temporaryEmotions === 'object' ? store.temporaryEmotions : {};
    store.temporaryPlayerFeelings = store.temporaryPlayerFeelings && typeof store.temporaryPlayerFeelings === 'object' ? store.temporaryPlayerFeelings : {};
    store.metricNotes = store.metricNotes || {};
  },
  fill(current, keys, defaults) {
    const out = {};
    keys.forEach((key) => { out[key] = this.clamp(current?.[key] ?? defaults[key] ?? 0); });
    return out;
  },
  apply(store, updates) {
    this.ensure(store);
    Object.keys(store.temporaryEmotions).forEach((key) => { store.temporaryEmotions[key] = Math.max(0, this.clamp(store.temporaryEmotions[key]) - 1); });
    Object.keys(store.temporaryPlayerFeelings).forEach((key) => { store.temporaryPlayerFeelings[key] = Math.max(0, this.clamp(store.temporaryPlayerFeelings[key]) - 1); });
    this.applyGroup(store.emotions, updates?.emotions, store.metricNotes, 'emotion', store.temporaryEmotions);
    this.applyGroup(store.playerFeelings, updates?.playerFeelings, store.metricNotes, 'player', store.temporaryPlayerFeelings);
  },
  applyInitial(store, updates) {
    this.ensure(store);
    this.setGroup(store.emotions, updates?.emotions, store.metricNotes, 'emotion');
    this.setGroup(store.playerFeelings, updates?.playerFeelings, store.metricNotes, 'player');
  },
  applyGroup(target, items, notes, group, temporaryTarget = null) {
    if (!Array.isArray(items)) return;
    items.forEach((item) => {
      const key = String(item?.key || '').trim();
      if (!key) return;
      const isFixed = Object.prototype.hasOwnProperty.call(target, key);
      const targetGroup = isFixed ? target : temporaryTarget;
      if (!targetGroup) return;
      const before = this.clamp(targetGroup[key] || 0);
      const rawDelta = this.clampDelta(this.metricDeltaValue(item));
      const delta = group === 'player' && isFixed ? this.lockedPlayerDelta(item.key, rawDelta, before) : rawDelta;
      const value = this.clamp(before + delta);
      this.writeMetric(targetGroup, notes, group, { ...item, key, delta, temporary: !isFixed }, value, '本回合没有直接触发变化，保持原值。');
    });
  },
  setGroup(target, items, notes, group) {
    if (!Array.isArray(items)) return;
    items.forEach((item) => {
      if (!Object.prototype.hasOwnProperty.call(target, item?.key)) return;
      this.writeMetric(target, notes, group, item, this.clamp(item.value), '你刚介入她/他的处境，因此这项感受还在形成。');
    });
  },
  writeMetric(target, notes, group, item, value, fallbackReason) {
    const noteGroup = item.temporary ? `${group}:temporary` : group;
    const noteKey = `${noteGroup}:${item.key}`;
    target[item.key] = value;
    const rawStatus = String(item.status || '').trim();
    const rawReason = String(item.reason || '').trim();
    const reason = this.cleanMetricReason(String(rawReason || fallbackReason).slice(0, 180), item.key);
    const previousStatus = notes[noteKey]?.status || '';
    const status = this.resolveMetricStatus(item.key, value, rawStatus, { temporary: item.temporary, previousStatus });
    const statusFromAi = Boolean(rawStatus) && status === this.cleanMetricStatus(rawStatus) && !this.isGenericMetricStatus(rawStatus, item.key);
    const explicitSources = item.metricSources || null;
    const isAi = (source) => String(source || '').toLowerCase() === 'ai';
    const metricSources = explicitSources ? {
      数值: isAi(explicitSources.数值) ? 'AI' : '系统',
      解释: statusFromAi || isAi(explicitSources.解释) ? 'AI' : '系统',
      原因: isAi(explicitSources.原因) && rawReason ? 'AI' : '系统',
    } : {
      数值: 'AI',
      解释: statusFromAi ? 'AI' : '系统',
      原因: rawReason ? 'AI' : '系统',
    };
    notes[noteKey] = { status, reason, metricSources };
    if (item.temporary) delete notes[`${group}:${item.key}`];
  },
};


;// ---- database/sqlite-save.js ----
/**
 * SQLite 存档：每个 slot 一个 sqlite 数据库，序列化后写入 dzmm.kv/localStorage。
 */
window.GameModules = window.GameModules || {};

window.GameModules.sqliteSave = {
  SQL: null,
  db: null,
  fallback: false,
  fallbackState: null,
  activeSlot: 'slot-1',

  async init() {
    if (this.SQL || this.fallback) return this.SQL;
    try {
      if (!window.initSqlJs) throw new Error('sql.js 未加载');
      this.SQL = await window.initSqlJs({ locateFile: (f) => `https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/${f}` });
      return this.SQL;
    } catch (err) {
      console.warn('SQLite 初始化失败，改用基础 JSON 存档:', err.message, err.stack);
      this.fallback = true;
      return null;
    }
  },

  async open(slot, options = {}) {
    this.activeSlot = slot || this.activeSlot;
    await this.init();
    const raw = await this.readRaw(this.activeSlot);
    if (this.fallback) {
      this.db = null;
      this.fallbackState = this.readFallbackState(raw);
      return;
    }
    this.db = raw ? new this.SQL.Database(this.fromBase64(raw)) : new this.SQL.Database();
    this.migrate();
    if (!options.deferPersist) await this.persist();
  },

  async inspectSlot(slot) {
    await this.init();
    const raw = await this.readRaw(slot);
    if (!raw) return { slot, exists: false, savedAt: '', playerName: '', phoneSetupDone: false };
    let savedAt = '';
    let playerName = '';
    let phoneSetupDone = false;
    if (this.fallback) {
      const state = this.readFallbackState(raw);
      const main = state?.main || {};
      savedAt = state?.updatedAt || '';
      playerName = String(main.playerName || main.playerProfile?.name || '').trim();
      phoneSetupDone = Boolean(main.phoneSetupDone);
      return { slot, exists: Boolean(state?.main), savedAt, playerName, phoneSetupDone };
    }
    const db = new this.SQL.Database(this.fromBase64(raw));
    try {
      const row = db.exec('SELECT value, updated_at FROM game_state WHERE key="main" LIMIT 1')?.[0]?.values?.[0];
      if (row) {
        savedAt = row[1] || '';
        try {
          const main = JSON.parse(String(row[0] || '{}'));
          playerName = String(main.playerName || main.playerProfile?.name || '').trim();
          phoneSetupDone = Boolean(main.phoneSetupDone);
        } catch (_) { /* 忽略 */ }
      }
    } catch (_) { /* 忽略 */ }
    db.close();
    return { slot, exists: true, savedAt, playerName, phoneSetupDone };
  },

  migrate() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS game_state(key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS world_lore(world_tag TEXT PRIMARY KEY, lore_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS world_attributes(world_tag TEXT PRIMARY KEY, attrs_json TEXT NOT NULL, source TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS rpg_schema(world_tag TEXT PRIMARY KEY, schema_json TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS profession_info(world_tag TEXT NOT NULL, name TEXT NOT NULL, info_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(world_tag,name));
      CREATE TABLE IF NOT EXISTS lexicon_entries(world_tag TEXT NOT NULL, kind TEXT NOT NULL, name TEXT NOT NULL, entry_json TEXT NOT NULL, source TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(world_tag,kind,name));
      CREATE TABLE IF NOT EXISTS character_world(character_id TEXT PRIMARY KEY, world_tag TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS character_state(character_id TEXT PRIMARY KEY, name TEXT NOT NULL, world_tag TEXT NOT NULL, state_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS character_intro(world_tag TEXT NOT NULL, name TEXT NOT NULL, intro_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(world_tag,name));
      CREATE TABLE IF NOT EXISTS character_memory(character_id TEXT PRIMARY KEY, memory_json TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS memory_archive(id TEXT PRIMARY KEY, character_id TEXT NOT NULL, text TEXT NOT NULL, vector_json TEXT NOT NULL, meta_json TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS wechat_history(id TEXT PRIMARY KEY, contact_id TEXT NOT NULL, message_json TEXT NOT NULL, created_at TEXT NOT NULL);
    `);
    this.db.run('INSERT OR REPLACE INTO metadata(key,value) VALUES (?,?)', ['version', '1']);
  },

  async readRaw(slot) {
    const key = this.key(slot);
    try {
      if (window.dzmm?.kv) return (await window.dzmm.kv.get(key))?.value || null;
    } catch (err) {
      console.warn('SQLite 存档读取 KV 失败:', err.code, err.message);
    }
    try { return localStorage.getItem(key); } catch (_) { return null; }
  },

  async writeRaw(slot, value) {
    const key = this.key(slot);
    try {
      if (window.dzmm?.kv) {
        await window.dzmm.kv.put(key, value);
        return;
      }
    } catch (err) {
      console.warn('SQLite 存档写入 KV 失败:', err.code, err.message);
    }
    try { localStorage.setItem(key, value); } catch (_) { /* 忽略 */ }
  },

  async deleteSlot(slot) {
    const key = this.key(slot);
    try { if (window.dzmm?.kv) await window.dzmm.kv.delete(key); } catch (_) { /* 忽略 */ }
    try { localStorage.removeItem(key); } catch (_) { /* 忽略 */ }
  },

  key(slot) {
    return `control-rpg-sqlite-${slot}`;
  },

  async persist() {
    if (this.fallback) {
      await this.writeRaw(this.activeSlot, JSON.stringify(this.fallbackState || { version: 1, main: null, updatedAt: '' }));
      return;
    }
    if (!this.db) return;
    await this.writeRaw(this.activeSlot, this.toBase64(this.db.export()));
  },

  readFallbackState(raw) {
    if (!raw) return { version: 1, main: null, updatedAt: '', characterStates: {}, characterWorlds: {}, characterIntros: {} };
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object'
        ? { version: 1, main: parsed.main || null, updatedAt: parsed.updatedAt || '', characterStates: parsed.characterStates || {}, characterWorlds: parsed.characterWorlds || {}, characterIntros: parsed.characterIntros || {} }
        : { version: 1, main: null, updatedAt: '', characterStates: {}, characterWorlds: {}, characterIntros: {} };
    } catch (_) {
      return { version: 1, main: null, updatedAt: '', characterStates: {}, characterWorlds: {}, characterIntros: {} };
    }
  },

  getJson(sql, params = []) {
    if (!this.db) return null;
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    const row = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    return row ? JSON.parse(row.value || row.lore_json || row.worldline_json || row.attrs_json || row.schema_json || row.info_json || row.entry_json || row.state_json || row.intro_json || row.memory_json || row.meta_json || row.vector_json) : null;
  },

  async saveGameState(value) {
    const now = new Date().toISOString();
    if (!this.db && !this.fallback) {
      await this.open(this.activeSlot);
    }
    if (this.fallback) {
      this.fallbackState = { ...(this.fallbackState || {}), version: 1, main: value, updatedAt: now };
      await this.persist();
      return;
    }
    if (!this.db) return;
    this.db.run('INSERT OR REPLACE INTO game_state(key,value,updated_at) VALUES (?,?,?)', ['main', JSON.stringify(value), now]);
    await this.persist();
  },

  loadGameState() {
    if (this.fallback) return this.fallbackState?.main || null;
    if (!this.db) return null;
    return this.getJson('SELECT value FROM game_state WHERE key=?', ['main']);
  },

  getMetaJson(key) {
    if (this.fallback) return null;
    if (!this.db) return null;
    const stmt = this.db.prepare('SELECT value FROM metadata WHERE key=?');
    stmt.bind([key]);
    const row = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    try { return row ? JSON.parse(row.value) : null; } catch (_) { return null; }
  },

  async saveMetaJson(key, value, options = {}) {
    if (!this.db) return;
    this.db.run('INSERT OR REPLACE INTO metadata(key,value) VALUES (?,?)', [key, JSON.stringify(value)]);
    if (!options.deferPersist) await this.persist();
  },

  getWorldLore(worldTag) {
    return this.db ? this.getJson('SELECT lore_json FROM world_lore WHERE world_tag=?', [worldTag]) : null;
  },

  listWorldLores() {
    if (!this.db) return [];
    const rows = [];
    const stmt = this.db.prepare('SELECT lore_json FROM world_lore ORDER BY updated_at DESC');
    while (stmt.step()) rows.push(JSON.parse(stmt.getAsObject().lore_json));
    stmt.free(); return rows;
  },

  async saveWorldLore(worldTag, lore) {
    if (!this.db) return;
    const now = new Date().toISOString();
    this.db.run(
      'INSERT OR REPLACE INTO world_lore(world_tag,lore_json,created_at,updated_at) VALUES (?,?,COALESCE((SELECT created_at FROM world_lore WHERE world_tag=?),?),?)',
      [worldTag, JSON.stringify(lore), worldTag, now, now],
    );
    await this.persist();
  },


  getSchema(worldTag) {
    return this.db ? this.getJson('SELECT schema_json FROM rpg_schema WHERE world_tag=?', [worldTag]) : null;
  },

  async saveSchema(worldTag, schema) {
    if (!this.db) return;
    this.db.run('INSERT OR REPLACE INTO rpg_schema(world_tag,schema_json,created_at) VALUES (?,?,?)', [worldTag, JSON.stringify(schema), new Date().toISOString()]);
    await this.persist();
  },

  getCharacterState(characterId) {
    if (this.fallback) return this.fallbackState?.characterStates?.[characterId] || null;
    return this.db ? this.getJson('SELECT state_json FROM character_state WHERE character_id=?', [characterId]) : null;
  },

  realWorldAliases() {
    const label = window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';
    return [label, '2026 现代都市现实世界', '现代都市现实世界', '现实世界'];
  },

  normalizeQueryWorldTag(worldTag = '') {
    const text = String(worldTag || '').trim();
    return this.realWorldAliases().includes(text) ? (window.GameModules.realWorld2026?.label || '2026 现代都市现实世界') : text;
  },

  worldTagMatchesQuery(stateWorld = '', queryWorld = '') {
    const state = this.normalizeQueryWorldTag(stateWorld);
    const query = this.normalizeQueryWorldTag(queryWorld);
    return !query || state === query;
  },

  getCharacterStateByName(name, worldTag = '') {
    if (!name) return null;
    const queryWorld = this.normalizeQueryWorldTag(worldTag);
    if (this.fallback) {
      const states = Object.values(this.fallbackState?.characterStates || {}).filter((state) => state?.name === name && this.worldTagMatchesQuery(state.worldTag || state.profile?.work, queryWorld));
      return states.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))[0] || null;
    }
    if (!this.db) return null;
    if (queryWorld) {
      const aliases = this.realWorldAliases().includes(queryWorld) ? this.realWorldAliases() : [queryWorld];
      const placeholders = aliases.map(() => '?').join(',');
      return this.getJson(`SELECT state_json FROM character_state WHERE name=? AND world_tag IN (${placeholders}) ORDER BY updated_at DESC LIMIT 1`, [name, ...aliases]);
    }
    return this.getJson('SELECT state_json FROM character_state WHERE name=? ORDER BY updated_at DESC LIMIT 1', [name]);
  },

  listCharacterStates() {
    if (this.fallback) return Object.values(this.fallbackState?.characterStates || {});
    if (!this.db) return [];
    const rows = [];
    const stmt = this.db.prepare('SELECT state_json FROM character_state ORDER BY created_at');
    while (stmt.step()) rows.push(JSON.parse(stmt.getAsObject().state_json));
    stmt.free(); return rows;
  },



  introKey(worldTag, name) {
    return `${worldTag || '未知世界'}::${name || '未知角色'}`;
  },

  getCharacterIntro(name, worldTag = '') {
    if (!name) return null;
    const queryWorld = this.normalizeQueryWorldTag(worldTag);
    if (this.fallback) {
      const rows = Object.values(this.fallbackState?.characterIntros || {}).filter((card) => card?.name === name && this.worldTagMatchesQuery(card.worldTag || card.work, queryWorld));
      return rows.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))[0] || null;
    }
    if (!this.db) return null;
    if (queryWorld) {
      const aliases = this.realWorldAliases().includes(queryWorld) ? this.realWorldAliases() : [queryWorld];
      const placeholders = aliases.map(() => '?').join(',');
      return this.getJson(`SELECT intro_json FROM character_intro WHERE name=? AND world_tag IN (${placeholders}) ORDER BY updated_at DESC LIMIT 1`, [name, ...aliases]);
    }
    return this.getJson('SELECT intro_json FROM character_intro WHERE name=? ORDER BY updated_at DESC LIMIT 1', [name]);
  },

  listCharacterIntros() {
    if (this.fallback) return Object.values(this.fallbackState?.characterIntros || {});
    if (!this.db) return [];
    const rows = [];
    const stmt = this.db.prepare('SELECT intro_json FROM character_intro ORDER BY updated_at DESC');
    while (stmt.step()) rows.push(JSON.parse(stmt.getAsObject().intro_json));
    stmt.free(); return rows;
  },

  async saveCharacterIntro(card) {
    if (!card?.name) return null;
    const now = new Date().toISOString();
    const intro = { ...card, worldTag: this.normalizeQueryWorldTag(card.worldTag || card.work || '未知世界'), updatedAt: now, createdAt: card.createdAt || now };
    if (this.fallback) {
      this.fallbackState = this.fallbackState || { version: 1, main: null, updatedAt: '', characterIntros: {} };
      this.fallbackState.characterIntros = { ...(this.fallbackState.characterIntros || {}), [this.introKey(intro.worldTag, intro.name)]: intro };
      this.fallbackState.updatedAt = now;
      await this.persist();
      return intro;
    }
    if (!this.db) return intro;
    this.db.run(
      'INSERT OR REPLACE INTO character_intro(world_tag,name,intro_json,created_at,updated_at) VALUES (?,?,?,COALESCE((SELECT created_at FROM character_intro WHERE world_tag=? AND name=?),?),?)',
      [intro.worldTag, intro.name, JSON.stringify(intro), intro.worldTag, intro.name, now, now],
    );
    await this.persist();
    return intro;
  },

  async saveCharacterState(character) {
    if (!character) return;
    const now = new Date().toISOString();
    const worldTag = this.normalizeQueryWorldTag(character.worldTag || character.profile?.work || '未知世界');
    character.worldTag = worldTag;
    if (character.values) character.values.world_tag = worldTag;
    if (character.profile?.work) character.profile.work = worldTag;
    const normalized = { ...character, worldTag, values: character.values ? { ...character.values, world_tag: worldTag } : character.values, updatedAt: now };
    if (normalized.profile?.work) normalized.profile = { ...normalized.profile, work: worldTag };
    if (this.fallback) {
      this.fallbackState = this.fallbackState || { version: 1, main: null, updatedAt: '' };
      this.fallbackState.characterStates = { ...(this.fallbackState.characterStates || {}), [normalized.id]: normalized };
      this.fallbackState.characterWorlds = { ...(this.fallbackState.characterWorlds || {}), [normalized.id]: worldTag };
      this.fallbackState.updatedAt = now;
      await this.persist();
      return;
    }
    if (!this.db) return;
    await this.saveCharacterWorld(normalized.id, worldTag);
    this.db.run(
      'INSERT OR REPLACE INTO character_state(character_id,name,world_tag,state_json,created_at,updated_at) VALUES (?,?,?,?,COALESCE((SELECT created_at FROM character_state WHERE character_id=?),?),?)',
      [normalized.id, normalized.name, worldTag, JSON.stringify(normalized), normalized.id, now, now],
    );
    await this.persist();
  },


  toBase64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(binary);
  },

  fromBase64(raw) {
    const binary = atob(raw); const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  },
};


;// ---- database/sqlite-world.js ----
/**
 * SQLite 世界属性与角色-世界关联扩展。
 */
window.GameModules = window.GameModules || {};
Object.assign(window.GameModules.sqliteSave, {
  getWorldAttributes(worldTag) {
    return this.db ? this.getJson('SELECT attrs_json FROM world_attributes WHERE world_tag=?', [worldTag]) : null;
  },

  async saveWorldAttributes(worldTag, attrs) {
    if (!this.db) return;
    const now = new Date().toISOString();
    this.db.run(
      'INSERT OR REPLACE INTO world_attributes(world_tag,attrs_json,source,created_at,updated_at) VALUES (?,?,?,COALESCE((SELECT created_at FROM world_attributes WHERE world_tag=?),?),?)',
      [worldTag, JSON.stringify(attrs), attrs.source || 'runtime', worldTag, now, now],
    );
    await this.persist();
  },

  getCharacterWorld(characterId) {
    if (this.fallback) return this.normalizeQueryWorldTag?.(this.fallbackState?.characterWorlds?.[characterId]) || this.fallbackState?.characterWorlds?.[characterId] || null;
    if (!this.db) return null;
    const stmt = this.db.prepare('SELECT world_tag FROM character_world WHERE character_id=?');
    stmt.bind([characterId]);
    const row = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    return this.normalizeQueryWorldTag?.(row?.world_tag) || row?.world_tag || null;
  },

  async saveCharacterWorld(characterId, worldTag) {
    const normalizedWorld = this.normalizeQueryWorldTag?.(worldTag) || worldTag;
    if (this.fallback) {
      this.fallbackState = this.fallbackState || { version: 1, main: null, updatedAt: '' };
      this.fallbackState.characterWorlds = { ...(this.fallbackState.characterWorlds || {}), [characterId]: normalizedWorld };
      this.fallbackState.updatedAt = new Date().toISOString();
      await this.persist();
      return;
    }
    if (!this.db) return;
    this.db.run('INSERT OR REPLACE INTO character_world(character_id,world_tag,updated_at) VALUES (?,?,?)', [characterId, normalizedWorld, new Date().toISOString()]);
    await this.persist();
  },

  getProfessionInfo(worldTag, name) {
    return this.db ? this.getJson('SELECT info_json FROM profession_info WHERE world_tag=? AND name=?', [worldTag, name]) : null;
  },

  async saveProfessionInfo(worldTag, info) {
    if (!this.db || !info) return;
    const now = new Date().toISOString();
    this.db.run(
      'INSERT OR REPLACE INTO profession_info(world_tag,name,info_json,created_at,updated_at) VALUES (?,?,?,COALESCE((SELECT created_at FROM profession_info WHERE world_tag=? AND name=?),?),?)',
      [worldTag, info.name, JSON.stringify(info), worldTag, info.name, now, now],
    );
    await this.persist();
  },

  cleanLexiconReason(entry) {
    const reason = String(entry?.meta?.modifyReason || '').trim();
    if (!reason) return entry;
    const blocked = [entry.description, entry.summary].filter(Boolean).map((x) => String(x).trim());
    const isDescription = blocked.includes(reason) || /词条说明|当前作用|用于记录|暂无详细说明/.test(reason);
    if (!isDescription && !/^(AI演算|系统结算|系统词条调整|用户主动)$/.test(reason)) return entry;
    return { ...entry, meta: { ...(entry.meta || {}), modifyReason: '' } };
  },

  getLexiconEntry(worldTag, kind, name) {
    if (!this.db) return null;
    return this.cleanLexiconReason(this.getJson('SELECT entry_json FROM lexicon_entries WHERE world_tag=? AND kind=? AND name=?', [worldTag, kind, name]));
  },

  listLexiconEntries(worldTag = '', kind = '') {
    if (!this.db) return [];
    const rows = [];
    const where = [];
    const params = [];
    if (worldTag) { where.push('world_tag=?'); params.push(worldTag); }
    if (kind) { where.push('kind=?'); params.push(kind); }
    const stmt = this.db.prepare(`SELECT entry_json FROM lexicon_entries${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY updated_at DESC`);
    stmt.bind(params);
    while (stmt.step()) {
      try { rows.push(this.cleanLexiconReason(JSON.parse(stmt.getAsObject().entry_json))); } catch (_) { /* ignore bad row */ }
    }
    stmt.free();
    return rows.filter(Boolean);
  },

  async saveLexiconEntry(entry) {
    if (!this.db || !entry) return;
    const now = new Date().toISOString();
    this.db.run(
      'INSERT OR REPLACE INTO lexicon_entries(world_tag,kind,name,entry_json,source,created_at,updated_at) VALUES (?,?,?,?,?,COALESCE((SELECT created_at FROM lexicon_entries WHERE world_tag=? AND kind=? AND name=?),?),?)',
      [entry.worldTag, entry.kind, entry.name, JSON.stringify(entry), entry.source || 'runtime', entry.worldTag, entry.kind, entry.name, now, now],
    );
    await this.persist();
  },
});


;// ---- database/sqlite-worldline.js ----
/**
 * SQLite 世界线扩展：保存世界范围时间、异世界事件、原著剧情索引与势力对象。
 */
window.GameModules = window.GameModules || {};

(() => {
  const save = window.GameModules.sqliteSave;
  const baseMigrate = save.migrate.bind(save);
  const baseSaveWorldLore = save.saveWorldLore.bind(save);

  save.worldlineFieldDocs = {
    世界线: {
      时间: '当前世界线覆盖的世界范围时间，格式为 [时间1 - 时间2]。',
      异世界事件: '当前世界线内已经确认或正在发生的原创/异世界事件列表。',
      原著剧情: '关联到 md 文档“剧情索引”的剧情索引条目。',
      势力: 'key=势力ID，value=势力对象的键值对集合。',
    },
    事件: {
      事件ID: '事件唯一 ID。', 名称: '事件显示名称。', 时间: '事件发生或持续时间。', 摘要: '短摘要。',
      详细信息: '事件背景、经过、影响、可推进方向。', 剧情索引: '关联原著剧情索引 ID/标题。', 关联势力: '参与或受影响的势力ID。', 状态: '未触发/进行中/已结束/改变原著。',
    },
    势力: {
      势力ID: '与对象 key 相同，便于解析。', 名称: '显示名称。', 类型: '国家/组织/种族/个人。', 属性: '固化 key:value 属性表。',
      关系网: 'key=目标势力ID，value=关系值(-100到100)。', 当前目标: '当前主要行动意图。', 近期决策: '最近几个时间步的决策记录。', 状态: '正常/危机/扩张/衰退。',
    },
  };

  save.migrate = function migrate() {
    baseMigrate();
    this.db.run(`
      CREATE TABLE IF NOT EXISTS worldline_state(world_tag TEXT PRIMARY KEY, worldline_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS worldline_events(world_tag TEXT NOT NULL, event_id TEXT NOT NULL, event_json TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(world_tag,event_id));
      CREATE TABLE IF NOT EXISTS worldline_factions(world_tag TEXT NOT NULL, faction_id TEXT NOT NULL, faction_json TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(world_tag,faction_id));
    `);
    this.db.run('INSERT OR REPLACE INTO metadata(key,value) VALUES (?,?)', ['worldline_field_docs', JSON.stringify(this.worldlineFieldDocs)]);
  };

  save.getWorldline = function getWorldline(worldTag) {
    if (!this.db) return null;
    const stmt = this.db.prepare('SELECT worldline_json FROM worldline_state WHERE world_tag=?');
    stmt.bind([worldTag]);
    const row = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    return row ? JSON.parse(row.worldline_json) : null;
  };

  save.saveWorldline = async function saveWorldline(worldTag, worldline) {
    if (!this.db || !worldline) return;
    const now = new Date().toISOString();
    const worldlineJson = JSON.stringify(worldline);
    const oldJson = this.getJson('SELECT worldline_json FROM worldline_state WHERE world_tag=?', [worldTag]);
    if (JSON.stringify(oldJson) === worldlineJson) return;
    this.db.run(
      'INSERT OR REPLACE INTO worldline_state(world_tag,worldline_json,created_at,updated_at) VALUES (?,?,COALESCE((SELECT created_at FROM worldline_state WHERE world_tag=?),?),?)',
      [worldTag, worldlineJson, worldTag, now, now],
    );
    const eventIds = [];
    for (const event of worldline.events || []) {
      const id = event.eventId || event.事件ID || event.id;
      if (id) {
        eventIds.push(id);
        this.db.run('INSERT OR REPLACE INTO worldline_events(world_tag,event_id,event_json,updated_at) VALUES (?,?,?,?)', [worldTag, id, JSON.stringify(event), now]);
      }
    }
    this.pruneWorldlineRows('worldline_events', 'event_id', worldTag, eventIds);
    const factionIds = Object.keys(worldline.factions || {});
    for (const [id, faction] of Object.entries(worldline.factions || {})) {
      this.db.run('INSERT OR REPLACE INTO worldline_factions(world_tag,faction_id,faction_json,updated_at) VALUES (?,?,?,?)', [worldTag, id, JSON.stringify(faction), now]);
    }
    this.pruneWorldlineRows('worldline_factions', 'faction_id', worldTag, factionIds);
    await this.persist();
  };

  save.pruneWorldlineRows = function pruneWorldlineRows(table, column, worldTag, ids) {
    if (!ids.length) {
      this.db.run(`DELETE FROM ${table} WHERE world_tag=?`, [worldTag]);
      return;
    }
    const marks = ids.map(() => '?').join(',');
    this.db.run(`DELETE FROM ${table} WHERE world_tag=? AND ${column} NOT IN (${marks})`, [worldTag, ...ids]);
  };

  save.saveWorldLore = async function saveWorldLore(worldTag, lore) {
    await baseSaveWorldLore(worldTag, lore);
    if (lore?.worldline) await this.saveWorldline(worldTag, lore.worldline);
  };
})();


;// ---- database/sqlite-memory.js ----
/**
 * SQLite 角色记忆扩展。
 */
window.GameModules = window.GameModules || {};
Object.assign(window.GameModules.sqliteSave, {
  getCharacterMemory(characterId) {
    return this.db ? this.getJson('SELECT memory_json FROM character_memory WHERE character_id=?', [characterId]) : null;
  },

  async saveCharacterMemory(characterId, memory) {
    if (!this.db) return;
    this.db.run('INSERT OR REPLACE INTO character_memory(character_id,memory_json,updated_at) VALUES (?,?,?)', [characterId, JSON.stringify(memory), new Date().toISOString()]);
    await this.persist();
  },

  listMemoryArchives(characterId) {
    if (!this.db) return [];
    const rows = [];
    const stmt = this.db.prepare('SELECT id,text,vector_json,meta_json,created_at FROM memory_archive WHERE character_id=? ORDER BY created_at DESC');
    stmt.bind([characterId]);
    while (stmt.step()) {
      const row = stmt.getAsObject();
      rows.push({ id: row.id, text: row.text, vector: JSON.parse(row.vector_json), meta: JSON.parse(row.meta_json), createdAt: row.created_at });
    }
    stmt.free(); return rows;
  },

  async saveMemoryArchive(characterId, item) {
    if (!this.db || !item) return;
    this.db.run(
      'INSERT OR REPLACE INTO memory_archive(id,character_id,text,vector_json,meta_json,created_at) VALUES (?,?,?,?,?,?)',
      [item.id, characterId, item.text, JSON.stringify(item.vector), JSON.stringify(item.meta || {}), item.createdAt || new Date().toISOString()],
    );
    await this.persist();
  },
});


;// ---- core/json-utils.js ----
/**
 * JSON 与流式文本工具。
 */
window.GameModules = window.GameModules || {};
window.GameModules.jsonUtils = {
  mergeStreamText(buffer, chunk) {
    const text = String(chunk || '');
    if (!text) return buffer;
    if (!buffer || text.startsWith(buffer)) return text;
    if (buffer.endsWith(text)) return buffer;
    const overlap = Math.min(buffer.length, text.length);
    for (let size = overlap; size > 0; size -= 1) {
      if (buffer.endsWith(text.slice(0, size))) return buffer + text.slice(size);
    }
    return buffer + text;
  },

  extractJson(text) {
    const start = text.indexOf('{');
    if (start === -1) throw new Error('JSON missing');
    let depth = 0; let inString = false; let escaped = false;
    for (let i = start; i < text.length; i += 1) {
      const ch = text[i];
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === '"') inString = !inString;
      if (inString) continue;
      if (ch === '{') depth += 1;
      if (ch === '}') depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
    throw new Error('JSON incomplete');
  },

  parseLoose(text) {
    const raw = String(text || '').replace(/```(?:json)?|```/g, '').trim();
    let json = '';
    try { json = this.extractJson(raw); } catch (err) {
      if (err.message !== 'JSON incomplete') throw err;
      json = this.completePartialJson(raw);
    }
    try {
      return JSON.parse(json);
    } catch (firstErr) {
      const repaired = this.repairJson(json);
      try { return JSON.parse(repaired); } catch (secondErr) {
        console.warn('[JSON解析] 修复失败:', { first: firstErr.message, second: secondErr.message, preview: repaired.slice(0, 180) });
        throw secondErr;
      }
    }
  },

  completePartialJson(text) {
    const start = text.indexOf('{');
    if (start === -1) throw new Error('JSON missing');
    let inString = false; let escaped = false; const stack = [];
    let out = this.trimDanglingProperty(text.slice(start).replace(/```(?:json)?|```/g, '').trim());
    for (let i = 0; i < out.length; i += 1) {
      const ch = out[i];
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{') stack.push('}');
      if (ch === '[') stack.push(']');
      if ((ch === '}' || ch === ']') && stack[stack.length - 1] === ch) stack.pop();
    }
    if (inString) out += '"';
    return out.replace(/,\s*$/, '') + stack.reverse().join('');
  },

  trimDanglingProperty(text) {
    let out = String(text || '').trim();
    for (let i = 0; i < 3; i += 1) {
      const next = out
        .replace(/,\s*"[^"\\]*(?:\\.[^"\\]*)*"\s*$/s, '')
        .replace(/,\s*"[^"\\]*(?:\\.[^"\\]*)*"\s*:\s*$/s, '')
        .replace(/,\s*"[^"\\]*(?:\\.[^"\\]*)*"\s*:\s*\{\s*$/s, '')
        .replace(/,\s*"[^"\\]*(?:\\.[^"\\]*)*"\s*:\s*\[\s*$/s, '');
      if (next === out) break;
      out = next.trim();
    }
    return out;
  },

  aiOutputRisk(text, options = {}) {
    const tool = window.GameModules.aiRequest;
    if (tool?.outputLengthRisk) return tool.outputLengthRisk(text, options);
    const length = String(text || '').length;
    const threshold = Number(options.outputLengthThreshold || 2400);
    return { length, threshold, overThreshold: length >= threshold, tailLooksTruncated: false };
  },

  rawFieldHits(text, fields = []) {
    const raw = String(text || '');
    return Object.fromEntries((fields || []).map((field) => [field, raw.includes(`"${field}"`) || raw.includes(field)]));
  },

  completionOptions(promptId = '', options = {}) {
    const overrides = {};
    if (Object.prototype.hasOwnProperty.call(options, 'jsonMode')) overrides.jsonMode = options.jsonMode;
    if (Object.prototype.hasOwnProperty.call(options, 'outputLimitKind')) overrides.outputLimitKind = options.outputLimitKind;
    if (Object.prototype.hasOwnProperty.call(options, 'responseFormat')) overrides.responseFormat = options.responseFormat;
    if (promptId && window.GameModules.promptSkills?.completionOptions) {
      return window.GameModules.promptSkills.completionOptions(promptId, overrides);
    }
    const jsonMode = options.jsonMode !== false;
    return {
      outputLimitKind: options.outputLimitKind || 'other',
      jsonMode,
      responseFormat: options.responseFormat || (jsonMode ? { type: 'json_object' } : undefined),
    };
  },

  async generateJsonWithRetry(options) {
    const max = options.max ?? 2;
    let prompt = options.prompt;
    let promptId = options.promptId || '';
    const initialPromptId = promptId;
    let lastText = '';
    let lastError = null;
    for (let i = 0; i < max; i += 1) {
      const completionOptions = this.completionOptions(promptId, options);
      lastText = await this.requestCompletion({ model: options.model, prompt, maxTokens: options.maxTokens, source: options.source || 'json-utils', timeoutMs: options.timeoutMs || 90000, maxAttempts: options.maxAttempts, ...completionOptions });
      try {
        const parsed = options.parse ? options.parse(lastText) : this.parseLoose(lastText);
        return options.validate ? options.validate(parsed) : parsed;
      } catch (err) {
        lastError = err;
        const risk = this.aiOutputRisk(lastText, options);
        const rawFieldHits = this.rawFieldHits(lastText, options.requiredRawFields || []);
        console.debug('[JSON重试] AI返回格式校验失败，准备生成修复提示:', {
          source: options.source || 'json-utils',
          attempt: i + 1,
          max,
          error: err?.message || 'unknown',
          stack: err?.stack || '',
          outputLength: risk.length,
          outputThreshold: risk.threshold,
          possibleTruncated: risk.overThreshold || risk.tailLooksTruncated,
          overThreshold: risk.overThreshold,
          tailLooksTruncated: risk.tailLooksTruncated,
          rawFieldHits,
          rawPreview: String(lastText || '').slice(0, 1200),
        });
        if (i === max - 1) break;
        prompt = await this.repairPrompt(options.format || options.prompt, lastText, err, options.repairHint || '');
        promptId = options.repairPromptId || initialPromptId || 'json-repair';
      }
    }
    const error = new Error(`AI返回格式错误: ${lastError?.message || 'unknown'}`);
    error.cause = lastError;
    error.rawOutput = lastText;
    throw error;
  },

  async requestCompletion({ model, prompt, maxTokens, source = 'json-utils', timeoutMs = 90000, maxAttempts, jsonMode = true, outputLimitKind = 'other', responseFormat }) {
    return window.GameModules.aiRequest.complete({ source, model, maxTokens, prompt, timeoutMs, maxAttempts, jsonMode, responseFormat: responseFormat || (jsonMode ? { type: 'json_object' } : undefined), outputLimitKind });
  },

  async repairPrompt(format, badOutput, err, hint = '') {
    return window.GameModules.renderPrompt('json-repair', { 错误: err?.message || 'unknown', 原要求: String(format || '').slice(0, 3200), 修复补充要求: String(hint || '').slice(0, 1400), 错误输出: String(badOutput || '').slice(0, 1200) });
  },

  normalizeJsonSyntax(text) {
    const raw = String(text || '');
    let out = '', quoteMode = '', escaped = false;
    for (let i = 0; i < raw.length; i += 1) {
      const ch = raw[i];
      if (escaped) { out += ch; escaped = false; continue; }
      if (quoteMode) {
        if (ch === '\\') { out += ch; escaped = true; continue; }
        if (quoteMode === 'ascii' && ch === '"') { quoteMode = ''; out += ch; continue; }
        if (quoteMode === 'curly' && ch === '”') {
          const next = raw.slice(i + 1).match(/\S/)?.[0] || '';
          if (!next || /[,，}\]:：]/.test(next)) { quoteMode = ''; out += '"'; continue; }
        }
        out += ch;
        continue;
      }
      if (ch === '"') { quoteMode = 'ascii'; out += ch; continue; }
      if (ch === '“') { quoteMode = 'curly'; out += '"'; continue; }
      if (ch === '：') { out += ':'; continue; }
      if (ch === '，') { out += ','; continue; }
      if (ch === '‘' || ch === '’') { out += "'"; continue; }
      out += ch;
    }
    return out;
  },

  repairJson(json) {
    let out = this.normalizeJsonSyntax(this.trimDanglingProperty(String(json || '')))
      .replace(/([}\]"0-9]|true|false|null)\s*,\s*(")/g, '$1,$2')
      .replace(/([}\]])\s*，\s*([\[{])/g, '$1,$2')
      .replace(/([}\]])\s*，\s*(")/g, '$1,$2')
      .replace(/([{,]\s*)([A-Za-z_$][\w$]*)(\s*:)/g, '$1"$2"$3')
      .replace(/([{,]\s*)([\u4e00-\u9fa5][\u4e00-\u9fa5\w-]*)(\s*:)/g, '$1"$2"$3')
      .replace(/:\s*'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_, value) => `:"${value.replace(/"/g, '\\"')}"`)
      .replace(/"\s+("(?:[^"\\]|\\.)*"\s*[,\]])/g, '",$1')
      .replace(/}\s*({)/g, '},$1')
      .replace(/\]\s*(\[)/g, '],$1')
      .replace(/("metricUpdates"\s*:\s*\{[\s\S]*?)\]\s*,\s*("lexiconUpdates"\s*:)/, '$1},$2')
      .replace(/("metricUpdates"\s*:\s*\{[\s\S]*?)\]\s*}/, '$1}}')
      .replace(/"\s+("[A-Za-z_$\u4e00-\u9fa5][\w\u4e00-\u9fa5-]*"\s*:)/g, '",$1')
      .replace(/(\d|true|false|null)\s+("[A-Za-z_$\u4e00-\u9fa5][\w\u4e00-\u9fa5-]*"\s*:)/g, '$1,$2')
      .replace(/([}\]])\s+("[A-Za-z_$\u4e00-\u9fa5][\w\u4e00-\u9fa5-]*"\s*:)/g, '$1,$2')
      .replace(/:\s*([}\]])/g, ':null$1')
      .replace(/:\s*null\s*\]/g, ':null}]')
      .replace(/,\s*"[^"\\]*(?:\\.[^"\\]*)*"\s*([}\]])/g, '$1')
      .replace(/,\s*([}\]])/g, '$1');
    out = this.repairMisnestedMetricArrays(out);
    out = this.repairBareReasonArrays(out);
    return out;
  },

  repairBareReasonArrays(text) {
    return String(text || '').replace(/"reasons"\s*:\s*\[\s*"trigger"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"\s*,\s*"evidence"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"\s*,\s*"confidence"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"\s*\]/g, (_, trigger, evidence, confidence) => `"reasons":[{"trigger":"${trigger}","evidence":"${evidence}","confidence":"${confidence}"}]`);
  },

  repairMisnestedMetricArrays(text) {
    return String(text || '')
      .replace(/("emotions"\s*:\s*\[[\s\S]*?\})(\s*,\s*)"playerFeelings"\s*:/g, '$1],"playerFeelings":')
      .replace(/("playerFeelings"\s*:\s*\[[\s\S]*?\})(\s*,\s*)"emotions"\s*:/g, '$1],"emotions":');
  },

  recoverAiResult(content) {
    const text = String(content || '').replace(/```(?:json)?|```/g, '');
    const data = {};
    ['sceneTitle', 'thinking', 'narration', 'speech', 'mind', 'mood', 'quest', 'characterIntent', 'controlFeeling', 'controlExperienceSummary'].forEach((key) => {
      const value = this.pickStringField(text, key);
      if (value) data[key] = value;
    });
    ['elapsedSeconds', 'trust', 'resistance', 'controlAdaptation'].forEach((key) => {
      const match = text.match(new RegExp(`"${key}"\\s*:\\s*(-?\\d+)`));
      if (match) data[key] = Number(match[1]);
    });
    const choices = this.pickStringArray(text, 'choices');
    if (choices.length) data.choices = choices;
    return data.narration || data.mind || data.choices ? data : null;
  },

  pickStringField(text, key) {
    const playerNext = 'refinedCity|refinedRole|workplace|position|refinedLivingStatus|relationships|parentStatus|parentDeathCause|worldbuildingNote|knownProfessions|items|wearing|profileEnrichedAt';
    const next = `thinking|narration|speech|mind|mood|quest|characterIntent|controlFeeling|controlExperienceSummary|choices|metricUpdates|appearedCharacters|statChanges|combatEvent|elapsedSeconds|trust|resistance|controlAdaptation|${playerNext}`;
    const match = text.match(new RegExp(`"${key}"\\s*:\\s*"([\\s\\S]*?)(?:"\\s*,\\s*"(?:${next})"\\s*:|"\\s+"(?:${next})"\\s*:|"\\s*[,}])`));
    return match ? match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim() : '';
  },

  pickStringArray(text, key) {
    const match = text.match(new RegExp(`"${key}"\\s*:\\s*\\[([\\s\\S]*?)(?:\\]|$)`));
    if (!match) return [];
    return Array.from(match[1].matchAll(/"([^"\\]*(?:\\.[^"\\]*)*)"/g)).map((x) => x[1].replace(/\\"/g, '"').trim()).filter(Boolean).slice(0, 4);
  },

  pickObjectArrayNames(text, key) {
    const match = String(text || '').match(new RegExp(`"${key}"\\s*:\\s*\\[([\\s\\S]*?)(?:\\]\\s*,\\s*"|\\]\\s*}|$)`));
    if (!match) return [];
    return Array.from(match[1].matchAll(/"name"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g)).map((x) => x[1].replace(/\\"/g, '"').trim()).filter(Boolean).slice(0, 12);
  },
};


;// ---- worldline-plots.js ----
/**
 * 世界线情节归纳：事件如实记录，summary 仅保存所属情节编号。
 */
window.GameModules = window.GameModules || {};

window.GameModules.worldlinePlots = {
  textOf(event = {}) {
    return [event.eventId, event.name, event.time, event.detail, event.status].filter(Boolean).join('\n');
  },

  ensureState(line, prefix = '情节') {
    line.plots = Array.isArray(line.plots) ? line.plots : [];
    line.pendingPlot = line.pendingPlot && typeof line.pendingPlot === 'object' ? line.pendingPlot : null;
    if (!line.pendingPlot) {
      const id = `${prefix}${line.plots.length + 1}`;
      line.pendingPlot = { 情节编号: id, recordIds: [], textLength: 0, startedAt: '', endedAt: '' };
    }
    return line.pendingPlot;
  },

  async assign(store, line, event, prefix = '情节') {
    const plot = this.ensureState(line, prefix);
    const text = this.textOf(event);
    event.summary = plot.情节编号;
    event.plotId = plot.情节编号;
    plot.startedAt = plot.startedAt || event.time || '';
    plot.endedAt = event.time || plot.endedAt || '';
    if (!plot.recordIds.includes(event.eventId)) plot.recordIds.push(event.eventId);
    plot.textLength += text.length;
    if (plot.textLength < 2400) return;
    await this.finalize(store, line, plot);
    line.pendingPlot = null;
  },

  async finalize(store, line, plot) {
    const events = (line.events || []).filter((event) => plot.recordIds.includes(event.eventId));
    if (!events.length) return;
    const fallback = this.fallback(plot, events);
    let summary = fallback;
    try {
      const prompt = await this.prompt(plot, events);
      summary = await window.GameModules.jsonUtils.generateJsonWithRetry({
        source: 'worldline-plot',
        promptId: 'worldline-plot-summary',
        model: store.modelId,
        timeoutMs: 90000,
        maxTokens: 1800,
        outputLengthThreshold: 1600,
        prompt,
        format: prompt,
        max: 2,
        parse: (text) => window.GameModules.jsonUtils.parseLoose(text),
        validate: (raw) => this.normalize(raw, fallback),
        repairHint: '必须输出单个合法 JSON 对象；重要记录编号必须是字符串，不要数组；不要 Markdown 代码块。',
      });
    } catch (err) {
      console.warn('世界线情节归纳失败，已使用本地兜底:', err.code, err.message);
    }
    line.plots = [...(line.plots || []).filter((item) => item.情节编号 !== plot.情节编号), summary];
  },

  async prompt(plot, events) {
    const body = events.map((event) => [
      `记录编号:${event.eventId}`,
      `时间:${event.time || ''}`,
      `标题:${event.name || ''}`,
      `状态:${event.status || ''}`,
      `详细:${this.compactText(event.detail || '', 900)}`,
    ].join('\n')).join('\n---\n');
    return window.GameModules.renderPrompt('worldline-plot-summary', {
      schemaExample: JSON.stringify({ 情节标题: '十字以内', 情节编号: plot.情节编号, 情节时间段: '开始时间 - 结束时间', 短摘要: '300-600字短摘要', 情节总结: '同短摘要，兼容旧字段', 关键事实: ['事实1'], 检索标签: ['人物/地点/关系/物品/状态关键词'], 重要记录编号: 'record_id', 重要片段: '来自原文的关键片段' }),
      plotId: plot.情节编号,
      eventsText: body,
    });
  },

  normalize(raw, fallback) {
    const title = String(raw?.情节标题 || fallback.情节标题).slice(0, 10);
    const shortSummary = this.compactText(raw?.短摘要 || raw?.情节总结 || fallback.短摘要 || fallback.情节总结, 600) || '世界线记录';
    const ids = Array.isArray(raw?.重要记录编号) ? raw.重要记录编号.join('、') : raw?.重要记录编号;
    const facts = this.normalizeList(raw?.关键事实 || fallback.关键事实, 12, 80);
    const tags = this.normalizeList(raw?.检索标签 || fallback.检索标签, 16, 24);
    return { ...fallback, 情节标题: title, 短摘要: shortSummary, 情节总结: shortSummary, 关键事实: facts, 检索标签: tags, 重要记录编号: String(ids || fallback.重要记录编号), 重要片段: String(raw?.重要片段 || fallback.重要片段).slice(0, 240) };
  },

  normalizeList(value, maxItems, itemLimit) {
    const list = Array.isArray(value) ? value : String(value || '').split(/[、,，\n]/u);
    return [...new Set(list.map((item) => this.compactText(item, itemLimit)).filter(Boolean))].slice(0, maxItems);
  },

  compactText(text, limit) {
    return String(text || '').replace(/\s+/g, ' ').trim().slice(0, limit);
  },

  fallback(plot, events) {
    const first = events[0] || {}, last = events[events.length - 1] || first;
    const ids = events.map((event) => event.eventId).filter(Boolean).join('、');
    const details = events.map((event) => this.compactText(event.detail || event.name || '世界线记录', 120)).filter(Boolean);
    const important = details.slice(-3).join('\n');
    const shortSummary = this.compactText(details.join('；'), 600) || '世界线记录';
    const tags = events.flatMap((event) => [event.name, event.status]).filter(Boolean);
    return {
      情节标题: String(last.name || first.name || '情节记录').slice(0, 10),
      情节编号: plot.情节编号,
      情节时间段: [first.time, last.time].filter(Boolean).join(' - ') || '时间未知',
      短摘要: shortSummary,
      情节总结: shortSummary,
      关键事实: details.slice(-12),
      检索标签: this.normalizeList(tags, 16, 24),
      重要记录编号: ids || String(last.eventId || first.eventId || ''),
      重要片段: important.slice(0, 240) || this.compactText(last.detail || first.detail || '世界线记录', 240),
    };
  },

  items(line = {}) {
    return [...(line.plots || []), line.pendingPlot ? { ...line.pendingPlot, 情节标题: '记录中', 情节时间段: [line.pendingPlot.startedAt, line.pendingPlot.endedAt].filter(Boolean).join(' - '), 短摘要: '累计记录尚未超过2400字，暂不归纳。', 情节总结: '累计记录尚未超过2400字，暂不归纳。', 关键事实: [], 检索标签: [], 重要记录编号: line.pendingPlot.recordIds?.join('、') || '', 重要片段: '继续如实记录中。' } : null].filter(Boolean);
  },
};


;// ---- progression.js ----
window.GameModules = window.GameModules || {};
window.GameModules.progression = {
  learnedNext: [0, 100, 250, 600, 1400, 3200, 7200, Infinity],
  schemaSections(attrs) {
    return [
      { title: '基础能力', fields: [
        this.field('world_tag', '所属世界', 'text', 0, 100, '角色所属的作品或世界。'), this.field('age', '年龄', 'number', 0, 999, '角色在当前进入时间点的年龄。'),
        this.field('level', '个人等级', 'number', 1, 100, '角色综合成长阶段。'), this.field('exp', '个人经验', 'text', 0, 100, '当前经验与升到下一级所需经验。'),
        this.field('free_attribute_points', '自由属性点', 'number', 0, 999, '升级获得、可用于分配到身内能力的点数。'), this.field('level_growth', '升级成长记录', 'text', 0, 100, '个人等级提升时自动加点与自由属性点记录。'),
        this.field('vitality', '生命力', 'text', 0, 100, '当前承伤、生存与身体完整状态。'), this.field('stamina_pool', '精力池', 'text', 0, 100, '体能、耐力与持续行动余量。'),
        this.field('satiety', '饱食度', 'text', 0, 100, '进食状态对体力与恢复的影响。'), this.field('hydration', '水分', 'text', 0, 100, '补水状态对体力与判断的影响。'),
        this.field('fatigue', '疲劳度', 'text', 0, 100, '累积疲惫、伤痛和行动消耗。'), this.field('learning_ability', '学习能力', 'number', 0, 100, '理解、模仿和掌握新知识技能的效率。'),
        this.field('mental_stability', '精神稳定', 'text', 0, 100, '心理稳定、创伤压力和判断能力。'), this.field('growth_potential', '成长潜力', 'number', 0, 100, '未来继续成长与突破的空间。'),
        this.field('action_ability', '行动能力', 'text', 0, 100, '可执行行动的灵活度、协调性与主动性。'),
      ] },
      { title: '身内能力', fields: [
        ['strength', '力量', '肌肉力量、爆发力与近战压制能力。'], ['agility', '敏捷', '速度、反应和身体协调性。'],
        ['constitution', '体质', '抗伤、耐受、恢复和身体基础强度。'], ['intelligence', '智力', '理解、推理、知识运用和术式分析能力。'],
        ['perception', '感知', '观察、直觉、索敌和异常察觉能力。'], ['willpower', '意志', '忍耐、抗压、抵抗精神干涉和坚持目标的能力。'],
        ['charisma', '魅力', '外在吸引力、表达力和影响他人的能力。'],
      ].map(([key, label, desc]) => this.field(key, label, 'number', 0, 100, desc)) },
      { title: '习得与职业', fields: [
        this.field('knowledge', '知识储备', 'list', 0, 100, '已掌握的知识领域及等级。'), this.field('skills', '技能等级', 'list', 0, 100, '经过学习或训练获得的技能等级。'),
        this.field('professions', '职业等级', 'list', 0, 100, '已内化的职业能力、经验与胜任资格。'), this.field('factions', '社群角色', 'list', 0, 100, '所属社群与在其中承担的社会角色。'),
        this.field('force_positions', '势力地位', 'list', 0, 100, '在有层级制度势力中的等级、职级、年级或职位。'), this.field('status_tags', '状态标签', 'list', 0, 100, '当前处境、身份标签或剧情状态。'),
        this.field('intimacy', '亲密经历', 'text', 0, 100, '成人虚构角色的抽象经历次数记录。'), this.field('bodyStatus', '身体状态', 'list', 0, 100, '各身体部位的中性短状态。'),
        this.field('control_experience', '上线体验', 'text', 0, 100, '角色对被玩家上线操控的经历记录。'), this.field('derived', '攻防衍生', 'text', 0, 100, '由基础能力推导出的攻防表现。'),
        this.field('combat_simulation', '战斗模拟', 'text', 0, 100, '基于当前状态估算的一次战斗表现。'),
      ] },
      { title: '世界固有属性', fields: (attrs?.fields || []).slice(0, 16).map((field, index) => ({
        key: /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field.key) ? field.key : `world_field_${index}`,
        label: String(field.label || field.key || '属性').slice(0, 12),
        type: ['number', 'rank', 'list', 'text'].includes(field.type) ? field.type : 'number',
        min: 0, max: 100, desc: String(field.desc || '').slice(0, 80), grade: Boolean(field.grade),
      })) },
    ];
  },

  field(key, label, type, min = 0, max = 100, desc = '') { return { key, label, type, min, max, desc }; }, nextCharacterExp(level) { return Math.round(100 * Math.max(1, Number(level) || 1) ** 1.65); },
  clamp(value, min, max) { return Math.max(min, Math.min(max, Math.round(Number(value) || 0))); }, pool(current, max) { return { current: this.clamp(current, 0, max), max: Math.max(1, Math.round(max)) }; },
  normalizeCharacterExp(exp, level, fallbackCurrent = 0) { const next = this.nextCharacterExp(level); return { current: this.clamp(exp?.current ?? fallbackCurrent, 0, next), next, curve: 'nextExp=round(100*level^1.65)' }; },
  ensureProgressionNotes(values) {
    if (!values) return; if (values.exp) values.exp.curve = 'nextExp=round(100*level^1.65)';
    for (const item of [...(values.factions || []), ...(values.force_positions || []), ...(values.items || []), ...(values.wearing || []), ...(values.status_tags || [])]) if (item && typeof item === 'object' && Object.prototype.hasOwnProperty.call(item, 'level')) item.level = -1;
  },

  ensureStateMechanics(state, character = state?.profile || {}) {
    if (!state?.values) return false;
    const values = state.values;
    const seed = window.GameModules.rpgState.seed(`${state.name}${state.worldTag}${character.role || ''}`);
    let changed = false;
    const incomplete = !values.level || !values.exp?.next || !values.skills?.[0]?.level;
    if (incomplete) { Object.assign(values, this.createValues(character, seed, values)); changed = true; }
    const normalizedExp = this.normalizeCharacterExp(values.exp, values.level, seed % 60);
    if (!values.exp?.next || values.exp.next !== normalizedExp.next || values.exp.curve !== normalizedExp.curve) { values.exp = normalizedExp; changed = true; }
    if (!values.level_growth) { values.free_attribute_points = 0; values.level_growth = { totalLevelUps: 0, autoPointsPerLevel: 1, freePointsPerLevel: 1, history: [] }; changed = true; }
    if (this.ensureIntrinsicSources(values)) changed = true;
    if (this.normalizeFreeAttributePoints(values)) changed = true;
    if (this.normalizeLearnedLists(values)) changed = true;
    if (!values.vitality?.max || !values.stamina_pool?.max) { this.recalculatePools(values, true, character); changed = true; }
    if (!values.derived?.attackPower) { values.derived = this.derived(values); changed = true; }
    if (!values.combat_simulation) { values.combat_simulation = this.defaultCombat(values); changed = true; }
    this.ensureProgressionNotes(values);
    values.health = this.percent(values.vitality);
    values.stamina = this.percent(values.stamina_pool);
    return changed;
  },

  createValues(character, seed, existing) {
    const minor = character.importance === 'minor' || character.isMinor;
    const rpg = character.rpgField || {};
    const level = this.clamp(existing.level || rpg.level?.value || (minor ? 1 + seed % 4 : 3 + seed % 8), 1, 100);
    const inferred = this.intrinsic(character, seed, level);
    const intrinsic = Object.fromEntries(Object.entries(inferred).map(([key, value]) => [key, this.clamp(rpg.intrinsicBase?.[key]?.value ?? value, 1, 100)]));
    const learning = this.clamp(character.learningAbility?.value ?? (35 + intrinsic.intelligence * 4 + seed % 18), 0, 100);
    const vitalityMax = level * 10 + intrinsic.constitution * 8;
    const staminaMax = level * 8 + intrinsic.constitution * 5 + this.trainingBonus(character);
    return {
      level,
      exp: this.normalizeCharacterExp(existing.exp, level, seed % 60),
      free_attribute_points: 0,
      level_growth: { totalLevelUps: 0, autoPointsPerLevel: 1, freePointsPerLevel: 1, history: [] },
      intrinsic_sources: this.createIntrinsicSources(intrinsic),
      vitality: existing.vitality?.max ? existing.vitality : this.pool(existing.health ?? vitalityMax, vitalityMax),
      stamina_pool: existing.stamina_pool?.max ? existing.stamina_pool : this.pool(existing.stamina ?? staminaMax, staminaMax),
      satiety: existing.satiety || this.pool(70 + seed % 20, 100),
      hydration: existing.hydration || this.pool(72 + seed % 18, 100),
      fatigue: existing.fatigue || this.pool(seed % 25, 100),
      learning_ability: learning,
      mental_stability: existing.mental_stability?.max ? existing.mental_stability : this.pool(character.mentalStability?.value ?? (40 + intrinsic.willpower * 4 + intrinsic.perception * 2), Math.max(1, 70 + intrinsic.willpower * 4)),
      growth_potential: existing.growth_potential ?? this.clamp(character.growthPotential?.value ?? (82 - level * 4 + seed % 25), 0, 100),
      action_ability: existing.action_ability?.max ? existing.action_ability : this.pool(character.actionAbility?.value ?? (35 + intrinsic.agility * 5 + intrinsic.constitution * 2), Math.max(1, 35 + intrinsic.agility * 5 + intrinsic.constitution * 2)),
      ...intrinsic,
      knowledge: existing.knowledge?.length ? existing.knowledge : this.knowledge(character, seed),
      skills: existing.skills?.[0]?.level ? existing.skills : this.skills(character, seed),
      professions: existing.professions?.length ? existing.professions : (character.professions?.length ? character.professions : this.professions(character, seed)),
      factions: existing.factions?.length ? existing.factions : this.factions(character),
      force_positions: existing.force_positions?.length ? existing.force_positions : this.forcePositions(character),
      derived: {},
    };
  },

  intrinsic(character, seed, level) {
    const text = `${character.role || ''}${character.detail || ''}${character.job || ''}`;
    const supernatural = /魔术|英灵|Servant|从者|鬼|神|龙|超能力/.test(text);
    const base = supernatural ? 8 + level % 8 : 3 + seed % 5;
    const stat = (offset, bonus = 0) => this.clamp(base + bonus + ((seed + offset) % 5) - 2, 1, 100);
    return {
      strength: stat(1, /战士|骑士|佣兵|从者|英灵/.test(text) ? 3 : 0), agility: stat(2, /刺客|弓|剑|忍/.test(text) ? 3 : 0),
      constitution: stat(3, /病弱|幼/.test(text) ? -2 : (/英灵|龙|鬼/.test(text) ? 4 : 0)), intelligence: stat(4, /魔术|学者|医生|教师|军师/.test(text) ? 4 : 0),
      perception: stat(5, /侦探|弓|刺客|感知/.test(text) ? 3 : 0), willpower: stat(6, /王|骑士|复仇|圣/.test(text) ? 3 : 0),
      charisma: stat(7, /王|偶像|领袖|公主/.test(text) ? 4 : 0),
    };
  },

  knowledge(character, seed) { return [this.learned('世界常识', '知识', 1 + seed % 3, ['intelligence', 'perception'], '对整个世界的认知程度，包括国家、文化风俗、社会规则、地理环境和日常常识。')]; },
  isStageIdentity(name) { return /学生|中学生|高中生|初中生|小学生|大学生|年级|班学生/.test(String(name || '')); },

  skills(character, seed) {
    const list = (character.skills || [{ name: '观察', desc: '通过细节、环境变化和他人反应判断局势的能力。' }]).filter((skill) => !this.isStageIdentity(skill.name)).slice(0, 5);
    return list.map((skill, index) => {
      const item = this.learned(skill.name || `技能${index + 1}`, '技能', 1 + ((seed + index) % 3), this.linkedStats(skill.name), skill.desc || this.learnedDefinition(skill.name, '技能'));
      const r = String(skill.reason || skill.changeMode || '').trim().slice(0, 120);
      return r ? { ...item, reason: r, changeMode: r } : item;
    });
  },

  professions(character, seed) {
    return (window.GameModules.socialPosition?.splitRole(character.job) || [character.job]).map((x) => window.GameModules.professionInfo.normalizeJobName(x)).filter((x) => x && !this.isStageIdentity(x)).slice(0, 3).map((name, index) => this.learned(name, '职业', 1 + ((seed + index) % 3), ['intelligence', 'willpower', 'charisma'], this.learnedDefinition(name, '职业')));
  },
  factions(character) {
    const social = window.GameModules.socialPosition;
    if (character.isPlayer && social) return social.playerItems(character.profile || character);
    if (Array.isArray(character.factions) && character.factions.length) return character.factions;
    return character.faction ? [social?.item?.(character.faction, character.factionRole || character.role || '成员') || character.faction] : [character.role || '无'].filter((x) => x && x !== '无');
  },
  forcePositions(character) {
    if (Array.isArray(character.force_positions) && character.force_positions.length) return character.force_positions;
    return [];
  },
  normalizeLearnedLists(values) {
    if (!values) return false; let changed = false;
    const clean = (list) => (list || []).filter((item) => {
      const keep = !this.isStageIdentity(typeof item === 'string' ? item : item?.name); if (!keep) changed = true; return keep;
    });
    values.skills = clean(values.skills);
    values.professions = clean(values.professions);
    return changed;
  },
  learned(name, type, level, linkedStats, source) {
    const lv = this.clamp(level, 1, 7);
    const cleanName = String(name).slice(0, 16);
    const definition = this.learnedDefinition(cleanName, type, source);
    return { name: cleanName, type, level: lv, exp: { current: 0, next: this.learnedNext[lv] }, linkedStats, source: definition, description: definition, levelDescription: this.levelDescription(type, lv), effect: this.levelEffect(cleanName, type, lv) };
  },
  linkedStats(name) {
    if (/剑|战|拳|武|射|枪/.test(name)) return ['strength', 'agility', 'perception']; if (/魔|术|医|学|分析/.test(name)) return ['intelligence', 'perception', 'willpower'];
    if (/交涉|说服|领导/.test(name)) return ['charisma', 'willpower', 'perception']; return ['agility', 'perception', 'intelligence'];
  },

  trainingBonus(character) { return /士兵|骑士|运动|佣兵|从者|英灵/.test(`${character.role || ''}${character.job || ''}`) ? 20 : 0; }, percent(pool) { return pool?.max ? this.clamp((pool.current / pool.max) * 100, 0, 100) : 100; },
  intrinsicKeys() { return ['strength', 'agility', 'constitution', 'intelligence', 'perception', 'willpower', 'charisma']; },
  createIntrinsicSources(values) { return Object.fromEntries(this.intrinsicKeys().map((k) => [k, { initial: values[k] || 1, level: 0, allocated: 0, npc: 0 }])); },
  ensureIntrinsicSources(values) {
    let changed = false;
    if (!values.intrinsic_sources) { values.intrinsic_sources = {}; changed = true; }
    for (const k of this.intrinsicKeys()) {
      if (!values.intrinsic_sources[k]) { values.intrinsic_sources[k] = { initial: values[k] || 1, level: 0, allocated: 0, npc: 0 }; changed = true; }
      const s = values.intrinsic_sources[k];
      const total = (s.initial || 0) + (s.level || 0) + (s.allocated || 0) + (s.npc || 0);
      if (total !== values[k]) { s.initial = this.clamp((s.initial || 1) + values[k] - total, 1, 100); changed = true; }
    }
    return changed;
  },
  normalizeFreeAttributePoints(values) {
    const earned = (values.level_growth?.totalLevelUps || 0) * (values.level_growth?.freePointsPerLevel || 1);
    const spent = Object.values(values.intrinsic_sources || {}).reduce((sum, s) => sum + (s.allocated || 0), 0);
    const expected = Math.max(0, earned - spent);
    if (values.level_growth) values.level_growth.allocatedSpent = spent;
    if (values.level_growth?.totalLevelUps === 0 && values.free_attribute_points !== 0) { values.free_attribute_points = 0; return true; }
    if (!Number.isFinite(values.free_attribute_points) || values.free_attribute_points > earned || values.free_attribute_points < 0) { values.free_attribute_points = expected; return true; }
    return false;
  },

  recalculatePools(values, keepRatio, character = {}) {
    const hpRatio = keepRatio && values.vitality?.max ? values.vitality.current / values.vitality.max : 1;
    const spRatio = keepRatio && values.stamina_pool?.max ? values.stamina_pool.current / values.stamina_pool.max : 1;
    const msRatio = keepRatio && values.mental_stability?.max ? values.mental_stability.current / values.mental_stability.max : 1;
    const acRatio = keepRatio && values.action_ability?.max ? values.action_ability.current / values.action_ability.max : 1;
    const hpMax = values.level * 10 + values.constitution * 8;
    const spMax = values.level * 8 + values.constitution * 5 + this.trainingBonus(character);
    const msMax = 70 + values.willpower * 4;
    const acMax = 35 + values.agility * 5 + values.constitution * 2;
    values.vitality = this.pool(hpMax * hpRatio, hpMax);
    values.stamina_pool = this.pool(spMax * spRatio, spMax);
    values.mental_stability = this.pool(msMax * msRatio, msMax);
    values.action_ability = this.pool(acMax * acRatio, acMax);
    values.learning_ability = this.clamp(25 + values.intelligence * 4 + Math.floor((values.perception + values.willpower) / 4), 0, 100);
    values.derived = this.derived(values);
    values.combat_simulation = this.defaultCombat(values);
  },
};


;// ---- progression-wearables.js ----
window.GameModules = window.GameModules || {};

(function setupWearableProgression() {
  const progression = window.GameModules.progression;
  if (!progression) return;
  const baseSchemaSections = progression.schemaSections.bind(progression);
  const baseCreateValues = progression.createValues.bind(progression);
  const baseEnsureStateMechanics = progression.ensureStateMechanics.bind(progression);

  Object.assign(progression, {
    bodyWearSlots() { return ['head', 'neck', 'innerwearTop', 'top', 'outerwear', 'gloves', 'waist', 'innerwearBottom', 'bottom', 'socks', 'shoes', 'wrist']; },
    equipSlotDefaults() { return Array.from({ length: 10 }, (_, i) => `装备${i + 1}`); },
    wearableSlots(existing = []) {
      const active = (Array.isArray(existing) ? existing : []).filter((item) => !this.isPlaceholderEmptyWear(item));
      return [...this.bodyWearSlots(), ...this.customWearSlots(active), ...this.dynamicSlots(active, '饰品'), ...this.dynamicSlots(active, '装备')];
    },
    customWearSlots(existing = []) {
      const reserved = new Set([...this.bodyWearSlots(), '饰品', '装备']); return [...new Set((Array.isArray(existing) ? existing : []).filter((item) => !this.isPlaceholderEmptyWear(item)).map((item) => this.canonicalWearSlot(item?.slot ? item : { slot: item })).filter((slot) => slot && !reserved.has(this.slotBase(slot))))];
    },
    slotBase(slot) { return String(slot || '').replace(/\d+$/, ''); },
    canonicalWearSlot(itemOrSlot) {
      const item = typeof itemOrSlot === 'object' && itemOrSlot ? itemOrSlot : { slot: itemOrSlot };
      const slot = String(item.slot || '').trim();
      if (this.bodyWearSlots().includes(slot)) return slot;
      const text = `${slot}${item.clothing_position || ''}${item.slotLabel || ''}${item.name || ''}${item.description || ''}`;
      const exact = { 头部: 'head', 颈部: 'neck', 上衣: 'top', 外套: 'outerwear', 手套: 'gloves', 腰部: 'waist', 下衣: 'bottom', 下装: 'bottom', 袜子: 'socks', 鞋子: 'shoes', 手腕: 'wrist' }[slot];
      if (exact) return exact;
      if (slot === '内裤') return 'innerwearBottom';
      if (slot === '内衣') return /内裤|底裤|三角裤|四角裤/.test(text) ? 'innerwearBottom' : 'innerwearTop';
      if (/头部|帽|发卡|发夹|发带|头饰|发饰|头巾|头绳|蝴蝶结|头箍|头冠/.test(text)) return 'head';
      if (/颈部|项链|围巾|领带|项圈|颈环|围脖|吊坠|丝巾/.test(text)) return 'neck';
      return slot;
    },
    dynamicSlots(existing = [], base, min = 0) {
      const slots = (Array.isArray(existing) ? existing : []).map((item) => item?.slot || item).filter((slot) => this.slotBase(slot) === base);
      const max = Math.max(min, ...slots.map((slot) => Number(String(slot).match(/(\d+)$/)?.[1] || 0)));
      return Array.from({ length: max }, (_, i) => `${base}${i + 1}`);
    },
    nextSlot(existing = [], base = '装备') { return `${base}${this.dynamicSlots(existing, base).length + 1}`; },
    inferEquipSlots(item = {}, kind = '') {
      const explicit = item.equipSlots || item.equippableSlots || item.wearableSlots || item.equipSlot || item.slot;
      const list = Array.isArray(explicit) ? explicit : String(explicit || '').split(/[、,，/|；;\s]+/);
      const slots = list.map((x) => String(x || '').trim()).filter(Boolean);
      const text = `${item.name || ''}${item.description || item.desc || ''}`;
      const rules = [
        ['内衣', /内衣|胸衣|文胸|bra|背心/iu], ['上衣', /上衣|衬衫|T恤|短袖|长袖|卫衣|毛衣|外衣/iu],
        ['内裤', /内裤|底裤|三角裤|四角裤|brief|panty/iu], ['下衣', /下衣|裤|长裤|短裤|裙|牛仔裤|运动裤/iu],
        ['袜子', /袜|丝袜|短袜|长袜/iu], ['鞋子', /鞋|靴|凉鞋|运动鞋|皮鞋/iu],
        ['外套', /外套|大衣|风衣|夹克|披风|斗篷/iu], ['手套', /手套/iu], ['头部', /帽|头盔|发饰/iu],
        ['颈部', /项链|围巾|领带|项圈/iu], ['腰部', /腰带|皮带/iu], ['包具', /包|背包|挎包|手提包|书包/iu],
      ];
      for (const slot of this.bodyWearSlots()) if (text.includes(slot) && !slots.includes(slot)) slots.push(slot);
      for (const [slot, re] of rules) if (re.test(text) && !slots.includes(slot)) slots.push(slot);
      if (/戒指|项链|耳环|手链|胸针|饰品/.test(text) && !slots.includes('饰品')) slots.push('饰品');
      if ((kind === '装备' || item.type === '装备' || item.kind === '装备') && !slots.length) slots.push('装备');
      return [...new Set(slots)];
    },
    pollutedReason(text = '') {
      const value = String(text || '').trim();
      return value.length > 90 || /变化方式|生成来源|词条名AI生成|值AI生成/.test(value) || /[：:](妹妹|姐姐|哥哥|弟弟|父亲|母亲|兄长)[：:]/.test(value);
    },
    cleanRelationText(text = '') { return String(text || '').replace(/([：:])(?=(妹妹|姐姐|哥哥|弟弟|父亲|母亲|兄长|朋友|同学|同事)[：:])/g, '；'); },
    itemReason(item = {}, kind = '物品') {
      if ((kind === '穿着' || item.type === '穿着') && item?.name === '未穿戴') return String(item.reason || item.changeMode || `${item.clothing_position || item.slot || '该'}槽位当前未穿戴。`).slice(0, 120);
      const raw = this.cleanRelationText(String(item.reason || '').trim());
      const fallbackRaw = this.cleanRelationText(String(item.changeMode || '').trim());
      const candidate = raw && !this.pollutedReason(raw) ? raw : fallbackRaw;
      const vague = window.GameModules.characterProfile?.abstractReason?.(candidate) || /当前角色资料|持有状态|穿戴槽位|固化/.test(candidate) || this.pollutedReason(candidate);
      if (candidate && !vague) return candidate.slice(0, 120);
      const name = item.name || item.label || '未命名物品';
      const slot = item.slot ? String(item.slot) : '';
      const slots = (Array.isArray(item.equipSlots) ? item.equipSlots : String(item.equipSlots || '').split(/[、,，/|；;\s]+/)).filter(Boolean).join('、');
      if (kind === '穿着' || item.type === '穿着') return `${name}当前${slot ? `占用${slot}槽位` : '处于已穿戴状态'}，因此会影响角色此刻外观和行动。`;
      if (kind === '装备' || item.type === '装备') return `${name}被记录为当前可调用装备${slots ? `，可装备在${slots}` : ''}，后续获得、损坏、转让或穿戴时会更新。`;
      if (kind === '物品' || item.type === '物品') return `${name}被记录为当前持有物${item.quantity ? `，数量为${item.quantity}` : ''}，后续使用、消耗、转让或遗失时会更新。`;
      return `${name}当前属于${kind}词条，后续由明确行动或状态变化更新。`;
    },

    normalizeCarryItem(item, kind = '物品', ownerId = '') {
      const obj = typeof item === 'string' ? { name: item } : { ...(item || {}) };
      const name = String(obj.name || obj.label || '未命名物品').slice(0, 32);
      const finalOwnerId = String(obj.ownerId || obj.characterId || ownerId || '').trim();
      const id = String(obj.id || (finalOwnerId ? this.itemId(finalOwnerId, kind, obj.slot || '', name) : '')).slice(0, 80);
      const reason = this.itemReason({ ...obj, name }, kind);
      const mode = obj.changeMode && !this.pollutedReason(obj.changeMode) && String(obj.changeMode).length < 24 ? obj.changeMode : '状态规范化';
      return { ...obj, id, ownerId: finalOwnerId, characterId: finalOwnerId, name, type: obj.type || kind, kind: obj.kind || kind, quantity: Math.max(1, Number(obj.quantity) || 1), equipSlots: this.inferEquipSlots(obj, kind), reason, changeMode: mode, level: Number(obj.level) > 0 ? obj.level : -1 };
    },

    itemId(ownerId = '', kind = '物品', slot = '', name = '') {
      const raw = `${ownerId || 'unknown'}:${kind}:${slot}:${name}`; return `item_${window.GameModules.rpgState?.seed?.(raw) || Math.abs([...raw].reduce((sum, ch) => sum + ch.charCodeAt(0), 0))}`;
    },

    clothingPositionForSlot(slot) {
      const base = this.slotBase(slot);
      return ({ head: '头部', neck: '颈部', innerwearTop: '内衣', top: '上衣', outerwear: '外套', gloves: '手套', waist: '腰部', innerwearBottom: '内衣', bottom: '下装', socks: '袜子', shoes: '鞋子', wrist: '手腕', 内衣: '内衣', 上衣: '上衣', 内裤: '内衣', 下衣: '下装', 袜子: '袜子', 鞋子: '鞋子', 外套: '外套', 手套: '手套', 头部: '头部', 颈部: '颈部', 腰部: '腰部', 包具: '肩部', 饰品: '装饰部位', 装备: '装备位' })[base] || base || '';
    },

    defaultWearForSlot(slot) { return null; },

    emptyWearReason(slot) {
      const position = this.clothingPositionForSlot(slot) || slot || '该部位';
      return /^(head|neck|outerwear|gloves|waist|wrist|饰品\d*|装备\d*)$/.test(String(slot || '')) ? `${position}此刻没有额外穿戴物。` : `${position}当前没有明确记录的穿戴物，保持空置状态。`;
    },

    fallbackWearPattern() { return /暂无已记录|未被上下文记录|当前未穿戴|当前没有明确记录|保持空置状态|此刻没有额外穿戴物|该槽位当前未穿戴|缺少AI生成|缺少有效AI|状态规范化|常规场景基础穿着槽位|上下文未写明异常|没有已穿戴物，表示该可穿戴位置空置|该槽位当前未穿戴，表示对应部位空置/; },

    concreteWearReason(item = {}) { const reason = String(item.reason || '').trim(); return reason && !this.fallbackWearPattern().test(reason) ? reason : ''; },

    isPlaceholderEmptyWear(item) {
      const text = `${item?.name || ''}${item?.description || ''}${item?.reason || ''}${item?.changeMode || ''}`;
      const reason = String(item?.reason || item?.changeMode || '').trim();
      if (item?.source === 'AI生成' && item?.slot && reason && !this.fallbackWearPattern().test(reason)) return false;
      return !item?.name || item.name === '未记录' || item.name === '未穿戴' || /^日常(内衣|上衣|内裤|下衣|袜子|鞋子)$/.test(item.name) || this.fallbackWearPattern().test(text);
    },

    defaultWearing(existing = [], ownerId = '') {
      const old = Array.isArray(existing) ? existing.map((item) => ({ ...(item || {}), slot: this.canonicalWearSlot(item) })) : [];
      const bySlot = new Map(old.filter((item) => item?.slot).map((item) => [item.slot, item]));
      return this.wearableSlots(old).map((slot) => {
        const hit = bySlot.get(slot);
        if (hit && !this.isPlaceholderEmptyWear(hit)) {
          const reason = hit.source === 'AI生成' ? String(hit.reason || hit.changeMode || this.emptyWearReason(slot)).slice(0, 120) : this.itemReason(hit, '穿着');
          const mode = hit.source === 'AI生成' ? reason : (hit.changeMode && !this.pollutedReason(hit.changeMode) && String(hit.changeMode).length < 24 ? hit.changeMode : reason);
          const finalOwnerId = hit.ownerId || hit.characterId || ownerId;
          return { ...hit, id: hit.id || (finalOwnerId ? this.itemId(finalOwnerId, '穿着', slot, hit.name || '未穿戴') : ''), ownerId: finalOwnerId, characterId: finalOwnerId, slot, clothing_position: hit.clothing_position || this.clothingPositionForSlot(slot), slotLabel: hit.slotLabel || this.clothingPositionForSlot(slot), type: hit.type || '穿着', reason, changeMode: mode, level: -1 };
        }
        const basic = this.defaultWearForSlot(slot);
        if (basic) return basic;
        const position = this.clothingPositionForSlot(slot);
        const aiReason = hit?.source === 'AI生成' ? this.concreteWearReason(hit) : '';
        const reason = aiReason || this.concreteWearReason(hit) || this.emptyWearReason(slot);
        return { id: ownerId ? this.itemId(ownerId, '穿着', slot, '未穿戴') : '', ownerId, characterId: ownerId, slot, clothing_position: position, slotLabel: position, name: '未穿戴', type: '穿着', description: hit?.description || `${position || '该部位'}当前未穿戴。`, reason, changeMode: reason, source: hit?.source, level: -1 };
      });
    },

    profileWearingFromRows(profile = {}) {
      const rows = (Array.isArray(profile.wearingRawRows) ? profile.wearingRawRows : []).filter((row) => String(row || '').startsWith('wearing,'));
      if (!rows.length || !window.GameModules.characterProfile?.buildInventoryFromRows) return [];
      try {
        const parsed = window.GameModules.characterProfile.buildInventoryFromRows(rows, profile.name || '');
        return (window.GameModules.characterProfile.wearingItemsLoose?.(parsed.wearing) || []).map((item) => ({ ...item, source: 'AI生成' }));
      } catch (err) {
        console.warn('[穿着同步] 原始AI穿着行恢复失败:', err.message, err.stack);
        return [];
      }
    },

    profileWearingItems(profile = {}) {
      const saved = Array.isArray(profile.wearingItems) ? profile.wearingItems : [];
      const objectItems = window.GameModules.characterProfile?.wearingItemsLoose?.(profile.wearing) || [];
      const rows = this.profileWearingFromRows(profile);
      const merged = objectItems.length ? this.mergeProfileWearing(saved, objectItems) : saved;
      const raw = rows.length ? this.mergeProfileWearing(merged, rows) : merged;
      const ownerId = String(profile.id || '').trim();
      return raw.map((item) => {
        const slot = this.canonicalWearSlot(item);
        const name = item?.name || '未穿戴';
        const id = item?.id || (ownerId ? this.itemId(ownerId, '穿着', slot, name) : '');
        const base = { ...(item || {}), id, ownerId, characterId: ownerId, slot, name, clothing_position: item?.clothing_position || this.clothingPositionForSlot(slot), slotLabel: item?.slotLabel || this.clothingPositionForSlot(slot), type: '穿着', source: item?.source || (profile.roleCardSource === 'ai' ? 'AI生成' : item?.source), level: -1 };
        const reason = this.concreteWearReason(item) || this.concreteWearReason(base) || item?.reason || item?.changeMode || this.itemReason(base, '穿着');
        return { ...base, reason, changeMode: reason };
      }).filter((item) => item.slot).slice(0, 40);
    },

    generatedFallbackWear(item = {}) {
      const text = `${item.description || ''}${item.reason || ''}${item.changeMode || ''}`;
      if (item?.source === 'AI生成') return this.fallbackWearPattern().test(text);
      return !item?.slot || this.fallbackWearPattern().test(text);
    },

    shouldReplaceWearing(current = [], incoming = []) {
      if (!incoming.length) return false;
      const fixed = this.bodyWearSlots();
      const old = Array.isArray(current) ? current.map((item) => ({ ...(item || {}), slot: this.canonicalWearSlot(item) })) : [];
      const incomingSlots = new Set(incoming.map((item) => item.slot));
      if (!fixed.every((slot) => incomingSlots.has(slot))) return false;
      if (!old.length) return true;
      const oldSlots = new Set(old.map((item) => item.slot));
      if (!fixed.every((slot) => oldSlots.has(slot))) return true;
      return old.some((item) => fixed.includes(item.slot) && this.generatedFallbackWear(item));
    },

    profileWearIsNewer(current = {}, incoming = {}) {
      if (incoming.source === 'AI生成' && current.source !== '玩家操作') return true;
      if (!current.name || current.name === '未穿戴' || current.name === '未记录') return Boolean(incoming.name && incoming.reason);
      if (this.generatedFallbackWear(current)) return true;
      if (incoming.name && current.name !== incoming.name && (incoming.source === 'AI生成' || current.source !== '玩家操作')) return true;
      if (incoming.source === 'AI生成' && incoming.name === '未穿戴' && current.name === '未穿戴' && incoming.reason && current.reason !== incoming.reason) return true;
      return false;
    },

    mergeProfileWearing(current = [], incoming = []) {
      const bySlot = new Map((Array.isArray(current) ? current : []).map((item) => [{ ...(item || {}), slot: this.canonicalWearSlot(item) }]).filter((item) => item[0].slot).map((item) => [item[0].slot, item[0]]));
      incoming.forEach((raw) => {
        const item = { ...(raw || {}), slot: this.canonicalWearSlot(raw) };
        const old = bySlot.get(item.slot);
        if (!old || this.profileWearIsNewer(old, item)) bySlot.set(item.slot, { ...old, ...item });
      });
      return [...bySlot.values()];
    },

    syncInventoryFromProfile(state, profile = state?.profile || {}) {
      if (!state?.values || !profile) return false;
      let changed = false;
      const before = JSON.stringify({ items: state.values.items, wearing: state.values.wearing });
      if (Array.isArray(profile.items) && profile.items.length && (!Array.isArray(state.values.items) || !state.values.items.length)) state.values.items = profile.items;
      const wearing = this.profileWearingItems(profile);
      const replaceAi = profile.roleCardSource === 'ai' && wearing.length && wearing.every((item) => this.bodyWearSlots().includes(item.slot) || item.name !== '未穿戴' || item.reason);
      if (replaceAi || this.shouldReplaceWearing(state.values.wearing, wearing)) state.values.wearing = wearing;
      else state.values.wearing = this.mergeProfileWearing(state.values.wearing, wearing);
      this.ensureInventoryFields(state.values, state.id || profile.id || '');
      changed = before !== JSON.stringify({ items: state.values.items, wearing: state.values.wearing });
      return changed;
    },

    ensureInventoryFields(values, ownerId = '') {
      if (!values) return false; const before = JSON.stringify({ items: values.items, wearing: values.wearing });
      values.items = (Array.isArray(values.items) ? values.items : []).map((item) => this.normalizeCarryItem(item, item.type || '物品', ownerId)); values.wearing = this.defaultWearing(values.wearing, ownerId);
      return before !== JSON.stringify({ items: values.items, wearing: values.wearing });
    },

    schemaSections(attrs) {
      return baseSchemaSections(attrs).map((section) => {
        if (section.title !== '习得与职业') return section;
        const fields = [...section.fields];
        const insertAfter = fields.findIndex((field) => field.key === 'force_positions') + 1;
        const additions = [
          this.field('items', '物品', 'list', 0, 100, '当前持有、可消耗、可转让或可用于现实行动的物品与装备。'),
          this.field('wearing', '穿着', 'list', 0, 100, '当前穿戴在各人体着装部位、饰品位和装备位的衣物、装备、饰品与包具。'),
        ].filter((field) => !fields.some((item) => item.key === field.key));
        fields.splice(insertAfter || fields.length, 0, ...additions);
        return { ...section, fields };
      });
    },

    createValues(character, seed, existing) {
      const values = baseCreateValues(character, seed, existing || {});
      values.items = values.items?.length ? values.items : (character.items || []);
      const profileWearing = this.profileWearingItems(character);
      values.wearing = values.wearing?.length ? this.mergeProfileWearing(values.wearing, profileWearing) : profileWearing;
      this.ensureInventoryFields(values, character.id || '');
      return values;
    },

    ensureStateMechanics(state, character = state?.profile || {}) {
      const changed = baseEnsureStateMechanics(state, character);
      return this.ensureInventoryFields(state?.values, state?.id || character?.id || '') || changed;
    },
  });
})();


;// ---- rpg-schema.js ----
window.GameModules = window.GameModules || {};

window.GameModules.rpgSchema = {
  base(worldTag, attrs) {
    return this.validate({ worldTag, sections: window.GameModules.progression.schemaSections(attrs) }, worldTag);
  },

  matchesAttrs(schema, attrs) {
    const fields = schema.sections?.flatMap((section) => section.fields) || [];
    return (attrs.fields || []).every((field) => {
      const current = fields.find((item) => item.key === field.key);
      return current && current.type === field.type && (current.desc || '') === (field.desc || '') && Boolean(current.grade) === Boolean(field.grade);
    });
  },

  sameFields(left, right) {
    const sig = (fields) => (fields || []).map((field) => [field.key, field.type, field.desc || '', field.grade ? 1 : 0].join(':')).join('|');
    return sig(left) === sig(right);
  },

  validate(schema, worldTag) {
    if (!Array.isArray(schema.sections)) throw new Error('schema sections invalid');
    schema.worldTag = worldTag;
    schema.sections = schema.sections.slice(0, 4).map((section, si) => ({
      title: String(section.title || `状态${si + 1}`).slice(0, 12),
      fields: (section.fields || []).slice(0, section.title === '基础能力' ? 15 : (section.title === '世界固有属性' ? 16 : (section.title === '习得与职业' ? 12 : 10))).map((field, fi) => ({
        key: /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field.key) ? field.key : `field_${si}_${fi}`,
        label: String(field.label || field.key || '状态').slice(0, 12),
        type: ['number', 'rank', 'list', 'text'].includes(field.type) ? field.type : 'number',
        min: Number.isFinite(field.min) ? field.min : 0,
        max: Number.isFinite(field.max) ? field.max : 100,
        desc: String(field.desc || '').slice(0, 100),
        grade: Boolean(field.grade),
      })),
    })).filter((section) => section.fields.length);
    if (!schema.sections.length) throw new Error('schema empty');
    if (!schema.sections.some((section) => section.fields.some((field) => field.key === 'age'))) {
      schema.sections[0].fields.unshift({ key: 'age', label: '年龄', type: 'number', min: 0, max: 999 });
    }
    return schema;
  },
};


;// ---- progression-definitions.js ----
window.GameModules = window.GameModules || {};

Object.assign(window.GameModules.progression, {
  hasLearnedLevel(item) {
    return ['知识', '技能', '职业'].includes(item?.type) && Number(item?.level) !== -1;
  },

  levelMeaningMap() {
    return ['无', '入门：知道基本概念或能做最简单动作。', '初学：能在低压环境稳定使用。', '熟练：能处理常见情况。', '专业：能独立应对复杂情况。', '专家：能创新、优化或指导他人。', '大师：领域内极少数高位者。', '传说：世界观顶级或规格外。'];
  },

  levelDescription(type, lv) {
    return `${type || '能力'}lv${lv}｜${this.levelMeaningMap()[lv]}`;
  },

  levelDescriptionList(type) {
    return this.levelMeaningMap().slice(1).map((text, index) => `${type || '能力'}lv${index + 1}｜${text}`).join('；');
  },

  levelEffect(name, type, lv) {
    const scope = lv <= 2 ? '基础场景' : lv <= 4 ? '常见与复杂场景' : lv <= 6 ? '高压或专业场景' : '世界观顶级场景';
    return `${name}达到lv${lv}后，可在${scope}中提供${type === '职业' ? '职责、身份与资源影响' : '行动判定与成长效率'}加成。`;
  },

  learnedDefinition(name, type, source = '') {
    const text = String(source || '').trim();
    if (text && !/暂无|资料|当前作用|长期身份与社会功能|角色已掌握的行动能力/.test(text)) return text;
    if (name === '世界常识') return '对整个世界的认知程度，包括国家、文化风俗、社会规则、地理环境和日常常识。';
    if (name === '手机操作') return '能够使用智能手机完成通讯、检索、拍摄、设置、应用切换和信息处理等操作。';
    if (name === '现实观察' || name === '观察') return '通过细节、环境变化和他人反应判断局势的能力。';
    if (type === '知识') return `对“${name}”这一知识领域的概念、规则、背景和应用范围的理解程度。`;
    if (type === '职业') return `以“${name}”为核心的内化职业能力、经验与胜任资格；不等同当前雇佣单位或岗位，失业也不直接失去该职业。`;
    return `执行“${name}”相关行动时所需的理解、操作熟练度和稳定发挥能力。`;
  },
});


;// ---- profession-info.js ----
window.GameModules = window.GameModules || {};

window.GameModules.professionInfo = {
  pending: {},
  roleWords: /主角|配角|路人|核心|悲剧|女主|男主|反派|支持|重要|可被操控|出场人物|学生|中学生|高中生|初中生|小学生|大学生|年级|班学生/,

  normalizeJobName(name) {
    const text = String(name || '').replace(/lv\.?\d+/ig, '').trim();
    if (!text || this.roleWords.test(text)) return '';
    return text.slice(0, 18);
  },

  async ensure(worldTag, name, context = {}) {
    const jobName = this.normalizeJobName(name);
    if (!jobName) return null;
    const save = window.GameModules.sqliteSave;
    const existing = save.getProfessionInfo?.(worldTag, jobName);
    if (existing) {
      const normalized = this.validate({ ...existing, confirmed: true }, worldTag, existing.name || jobName, context);
      if (normalized) {
        if (JSON.stringify(normalized) !== JSON.stringify(existing)) await save.saveProfessionInfo?.(worldTag, normalized);
        return normalized;
      }
    }
    const key = `${worldTag}::${jobName}`;
    if (!this.pending[key]) this.pending[key] = this.createAndSave(worldTag, jobName, context);
    try { return await this.pending[key]; }
    finally { delete this.pending[key]; }
  },

  async createAndSave(worldTag, jobName, context) {
    const info = await this.generate(worldTag, jobName, context);
    if (!info) return null;
    await window.GameModules.sqliteSave.saveProfessionInfo?.(worldTag, info);
    await window.GameModules.rpgLexicon.save(worldTag, '职业', info.name, { summary: info.summary, description: info.description, reason: info.requirements.reason, nameAiGenerated: true, valueAiGenerated: true, changeMode: info.requirements.reason, related: [...info.intrinsicStats, ...info.learnedAbilities, ...info.knowledgeAreas, ...info.worldAbilities], meta: { info }, source: 'ai' });
    return info;
  },

  async generate(worldTag, name, context) {
    try {
      if (!window.dzmm?.completions) return null;
      const prompt = await this.prompt(worldTag, name, context);
      return await window.GameModules.jsonUtils.generateJsonWithRetry({
        source: 'profession-info',
        promptId: 'profession-info',
        model: window.GameModules.aiRequest?.selectedTextModel?.(),
        timeoutMs: 60000,
        prompt,
        format: prompt,
        validate: (raw) => this.validate(raw, worldTag, name, context),
      });
    } catch (err) {
      console.error('职业资料生成失败，等待重新生成:', err.message, err.stack);
      throw err;
    }
  },

  prompt(worldTag, name, context) {
    const fields = (context.worldFields || []).map((x) => `${x.key}:${x.label}`).join('、') || '无';
    const list = (items, pick) => (items || []).map((x) => pick ? pick(x) : (x.name || x.key || x.label || x)).filter(Boolean).join('、') || '无';
    return window.GameModules.renderPrompt('profession-info', {
      世界: worldTag,
      职业: name,
      角色: context.characterName || '',
      身份: context.role || '',
      背景: context.detail || '',
      身内能力候选: context.intrinsicStats || 'strength(力量)、agility(敏捷)、constitution(体质)、intelligence(智力)、perception(感知)、willpower(意志)、charisma(魅力)',
      世界专属能力候选: fields,
      技能候选: list(context.skills),
      知识储备候选: list(context.knowledge),
    });
  },

  validate(raw, worldTag, name, context = {}) {
    if (!raw || typeof raw !== 'object' || raw.confirmed !== true) return null;
    const arr = (value) => (Array.isArray(value) ? value : []).slice(0, 6).map((x) => String(x).slice(0, 24)).filter(Boolean);
    const cleanName = this.normalizeJobName(raw.name || name);
    const intrinsicStats = this.pickIntrinsic(arr(raw.intrinsicStats));
    const learnedAbilities = this.ensureList(arr(raw.learnedAbilities), context.skills);
    const knowledgeAreas = this.ensureList(arr(raw.knowledgeAreas), context.knowledge);
    const worldAbilities = this.pickWorldAbilities(arr(raw.worldAbilities), context.worldFields);
    const reason = String(raw.requirements?.reason || raw.reason || '').trim().slice(0, 120);
    if (!cleanName || !raw.summary || !raw.description || !reason || window.GameModules.characterProfile?.abstractReason?.(reason) || !intrinsicStats.length || !learnedAbilities.length || !knowledgeAreas.length) return null;
    const reqStats = this.pickIntrinsic(arr(raw.requirements?.intrinsicStats?.length ? raw.requirements.intrinsicStats : intrinsicStats));
    const reqSkills = this.ensureList(arr(raw.requirements?.learnedAbilities?.length ? raw.requirements.learnedAbilities : learnedAbilities), context.skills);
    const reqKnowledge = this.ensureList(arr(raw.requirements?.knowledgeAreas?.length ? raw.requirements.knowledgeAreas : knowledgeAreas), context.knowledge);
    if (!reqStats.length || !reqSkills.length || !reqKnowledge.length) return null;
    return {
      worldTag,
      name: cleanName,
      summary: String(raw.summary).slice(0, 60),
      description: String(raw.description).slice(0, 180),
      levelDescription: raw.levelDescription ? String(raw.levelDescription).slice(0, 100) : '',
      effect: raw.effect ? String(raw.effect).slice(0, 120) : '',
      intrinsicStats,
      learnedAbilities,
      knowledgeAreas,
      worldAbilities,
      requirements: {
        intrinsicStats: reqStats,
        worldAbilities: this.pickWorldAbilities(arr(raw.requirements?.worldAbilities?.length ? raw.requirements.worldAbilities : worldAbilities), context.worldFields),
        learnedAbilities: reqSkills,
        knowledgeAreas: reqKnowledge,
        reason,
      },
    };
  },

  pickIntrinsic(items) {
    const allowed = ['strength', 'agility', 'constitution', 'intelligence', 'perception', 'willpower', 'charisma'];
    return items.filter((x) => allowed.includes(x)).slice(0, 4);
  },

  pickWorldAbilities(items, fields = []) {
    const keys = new Set((fields || []).flatMap((x) => [x.key, x.label].filter(Boolean).map(String)));
    return items.filter((x) => keys.has(x)).slice(0, 4);
  },

  ensureList(items, candidates = []) {
    const names = (candidates || []).map((x) => String(x?.name || x || '').trim()).filter(Boolean);
    const matched = names.filter((name) => items.some((item) => name.includes(item) || item.includes(name)));
    return [...new Set([...items, ...matched])].slice(0, 6);
  },
};


;// ---- rpg-profession-state.js ----
window.GameModules = window.GameModules || {};

window.GameModules.rpgProfessionState = {
  normalizeProfessions(state) {
    const jobs = state.values?.professions || [];
    if (!jobs.length) return false;
    let changed = false;
    const normalized = jobs.map((job) => {
      const clean = window.GameModules.professionInfo.normalizeJobName(job.name);
      if (job.name !== clean) changed = true;
      return { ...job, name: clean };
    }).filter((job) => job.name);
    if (normalized.length !== jobs.length) changed = true;
    if (changed) state.values.professions = normalized;
    return changed;
  },

  async ensureInfo(state, character, schema) {
    this.normalizeProfessions(state);
    const jobs = state.values?.professions || [];
    const job = jobs.find((item) => item?.name && !item.info) || jobs[0];
    if (!job?.name || job.info) return false;
    const worldFields = schema.sections.find((section) => section.title === '世界固有属性')?.fields || [];
    const info = await window.GameModules.professionInfo.ensure(state.worldTag, job.name, {
      characterName: state.name,
      role: character?.role || state.profile?.role,
      detail: character?.detail || state.profile?.detail,
      skills: state.values.skills,
      knowledge: state.values.knowledge,
      intrinsicStats: 'strength(力量)、agility(敏捷)、constitution(体质)、intelligence(智力)、perception(感知)、willpower(意志)、charisma(魅力)',
      worldFields,
    });
    if (!info) return false;
    const before = JSON.stringify({ info: job.info || null, skills: state.values.skills, knowledge: state.values.knowledge });
    job.name = info.name;
    job.info = info;
    job.linkedStats = info.intrinsicStats;
    job.levelDescription = info.levelDescription || job.levelDescription;
    job.effect = info.effect || job.effect;
    this.ensurePrerequisites(state, info);
    return before !== JSON.stringify({ info, skills: state.values.skills, knowledge: state.values.knowledge });
  },

  ensurePrerequisites(state, info) {
    const p = window.GameModules.progression;
    const has = (list, name) => (list || []).some((item) => String(item?.name || item).includes(name) || name.includes(String(item?.name || item)));
    state.values.skills = state.values.skills || [];
    state.values.knowledge = state.values.knowledge || [];
    for (const name of info.learnedAbilities || []) {
      if (!has(state.values.skills, name)) state.values.skills.push(p.learned(name, '技能', 1, info.intrinsicStats, `${info.name}职业前置技能。`));
    }
    for (const name of info.knowledgeAreas || []) {
      if (!has(state.values.knowledge, name)) state.values.knowledge.push(p.learned(name, '知识', 1, info.intrinsicStats, `${info.name}职业前置知识。`));
    }
  },
};


;// ---- rpg-lexicon.js ----
window.GameModules = window.GameModules || {};

window.GameModules.rpgLexicon = {
  normalizeName(name) {
    return String(name || '').trim().slice(0, 32);
  },

  entry(worldTag, kind, name, data = {}) {
    const clean = this.normalizeName(name);
    if (!clean) return null;
    const ai = this.aiFlags(kind, data);
    return {
      worldTag: worldTag || '原创世界',
      kind,
      name: clean,
      summary: String(data.summary || data.desc || data.description || '').slice(0, 80),
      description: String(data.description || data.desc || data.summary || '').slice(0, 240),
      value: Object.prototype.hasOwnProperty.call(data, 'value') ? data.value : null,
      nameAiGenerated: ai.name,
      valueAiGenerated: ai.value,
      changeMode: String(data.changeMode || this.defaultChangeMode(data.source)).slice(0, 80),
      hierarchy: ['tree', 'leaf'].includes(data.hierarchy) ? data.hierarchy : this.defaultHierarchy(kind),
      promptInstruction: String(data.promptInstruction || this.defaultPromptInstruction(kind, clean)).slice(0, 260),
      aliases: Array.isArray(data.aliases) ? data.aliases.slice(0, 6).map(String) : [],
      related: Array.isArray(data.related) ? data.related.slice(0, 12).map(String) : [],
      meta: data.meta || {},
      source: data.source || 'runtime',
    };
  },

  aiFlags(kind, data = {}) {
    const source = String(data.source || '');
    const mode = String(data.changeMode || '');
    const nameFlag = data.nameAiGenerated ?? data.aiGenerated ?? (source === 'ai' && kind !== '玩家设定');
    const valueFlag = data.valueAiGenerated ?? data.aiGenerated ?? (source === 'ai' || mode.includes('AI'));
    return { name: Boolean(nameFlag), value: Boolean(valueFlag) };
  },

  defaultChangeMode(source) {
    if (source === 'schema' || source === 'system') return '代码计算';
    if (source === 'player') return '用户主动';
    return 'AI演算';
  },

  defaultHierarchy(kind) {
    return ['知识树', '技能树', '职业树'].includes(kind) ? 'tree' : 'leaf';
  },

  compactPrompt(content, change) {
    return `${content}，${change}`.slice(0, 260);
  },

  playerPromptInstruction(name) {
    const map = {
      姓名: ['玩家登记姓名或代号', '玩家主动改名或登记资料被明确修正时才可改变。'],
      生日: ['玩家登记的公历生日', '仅玩家主动修正生日时可改变。'],
      年龄: ['按生日与当前日期计算的周岁', '日期推进跨生日或生日被修正时才可改变。'],
      具体地址: ['精确到省/市州/区县/镇街道/社区或小区/楼栋/门牌', '玩家明确搬家、主动改址或剧情确认住址变更时才可改变。'],
      现实身份: ['2026现实世界中的学校年级、职业或日常社会身份', '年龄、学业、工作、地址或玩家设定发生明确变化时才可改变。'],
      居住状态: ['独居、同住、寄宿、租住等当前生活状态', '搬家、同住者变化、经济条件变化或玩家主动设定时才可改变。'],
      父母状态: ['父母存活、已故、失踪或其他可判定状态', '玩家设定、调查证据或剧情事实改写亲属状态时才可改变。'],
      父母去世原因: ['父母已故时的具体、克制、现实死因', '仅父母状态为已故且玩家设定或调查证据给出新事实时可改变。'],
      人际关系: ['玩家明确填写或剧情固化的亲友、同学、同事等关系', '玩家主动补充、互动结果或关系断裂/建立时才可改变。'],
      世界观补全: ['围绕玩家资料补齐的现实背景与社会处境', '核心资料、地点、身份或关键关系变化后才可重算。'],
      备注: ['玩家补充的个人设定备注', '仅玩家主动修改备注时可改变。'],
    };
    const hit = map[name];
    return hit ? this.compactPrompt(hit[0], hit[1]) : this.compactPrompt(`玩家设定“${name}”的准确可落库内容`, '玩家主动设定或资料事实变化时才可改变。');
  },

  attributePromptInstruction(name) {
    const map = {
      个人等级: ['角色总体成长等级与经验进度', '获得足够经验并通过升级公式结算时才可改变。'],
      自由属性点: ['升级获得且尚未分配的属性点余额', '升级增加或玩家分配消耗时才可改变。'],
      升级成长记录: ['每次升级的自动加点、自由点与来源记录', '个人等级实际提升并完成成长结算时追加。'],
      生命力: ['当前承伤、生存与身体完整状态', '受伤、治疗、休息、疾病或恢复效果结算时才可改变。'],
      精力池: ['体能耐力与持续行动余量', '剧烈行动、休息、进食、技能消耗或恢复效果结算时才可改变。'],
      饱食度: ['进食状态对体力与恢复的影响', '进食、饥饿时间流逝或消耗效果结算时才可改变。'],
      水分: ['补水状态对体力与判断的影响', '饮水、脱水、流汗或时间流逝结算时才可改变。'],
      疲劳度: ['累积疲惫、伤痛和行动消耗', '行动消耗、休息、睡眠或异常状态结算时才可改变。'],
      学习能力: ['理解、模仿和掌握新知识技能的效率', '等级成长、长期训练、状态惩罚或特殊事件结算时才可改变。'],
      力量: ['肌肉输出、负重、破坏和近身爆发基础值', '升级、自由分配、训练成果或伤病惩罚结算时才可改变。'],
      敏捷: ['移动、反应、闪避和精细动作基础值', '升级、自由分配、训练成果或束缚伤病结算时才可改变。'],
      体质: ['抗伤、耐受、恢复和身体基础强度', '升级、自由分配、训练成果或疾病伤势结算时才可改变。'],
      智力: ['理解、推理、知识运用和分析能力', '升级、自由分配、学习成果或精神影响结算时才可改变。'],
      感知: ['观察、直觉、索敌和异常察觉能力', '升级、自由分配、训练成果或感官状态变化时才可改变。'],
      意志: ['抗压、专注、抵抗诱导和坚持行动能力', '升级、自由分配、心理冲击或坚定事件结算时才可改变。'],
      魅力: ['表达、吸引、说服和社会印象能力', '升级、自由分配、社交成果、名誉或外观状态变化时才可改变。'],
    };
    const hit = map[name];
    return hit ? this.compactPrompt(hit[0], hit[1]) : this.compactPrompt(`${name}的当前值、阶段与来源拆分`, '对应公式、状态事件、等级成长或玩家分配完成结算时才可改变。');
  },

  defaultPromptInstruction(kind, name) {
    if (kind === '玩家设定') return this.playerPromptInstruction(name);
    if (kind === '属性') return this.attributePromptInstruction(name);
    if (kind === '职业树') return this.compactPrompt('职业等级父词条，汇总角色内化的长期能力、经验与胜任资格', '获得长期训练、遗忘失能、升级或修正任一职业子词条时才可改变。');
    if (kind === '知识树') return this.compactPrompt('知识储备父词条，汇总角色已掌握知识领域及其等级子词条', '新增、遗忘、升级或修正任一知识子词条时才可改变。');
    if (kind === '技能树') return this.compactPrompt('技能等级父词条，汇总角色经过训练或实践获得的技能子词条', '新增、遗忘、升级、伤病限制或修正任一技能子词条时才可改变。');
    if (kind === '职业') return this.compactPrompt('内化职业能力、经验与胜任资格，含等级、经验和可胜任范围，不等同当前岗位', '获得长期训练、遗忘失能、职业升级或设定修正时才可改变。');
    if (kind === '知识') return this.compactPrompt('具体知识领域，含等级、经验、来源与当前可用范围', '学习、调查、阅读、授课、记忆恢复或遗忘事件明确结算时才可改变。');
    if (kind === '技能') return this.compactPrompt('可执行行动能力，含等级、经验、熟练度与当前效果', '训练、实战使用、教学、失败复盘、伤病限制或升级结算时才可改变。');
    if (kind === '装备') return this.compactPrompt('当前持有或可调用的重要装备，含效果、状态、持有者与是否可穿戴', '获得、损坏、丢失、转让、维修、升级改造或穿戴状态变化时才可改变。');
    if (kind === '物品') return this.compactPrompt('当前持有、可消耗、可转让或可用于现实行动的普通物品，含数量、用途与位置', '获得、消耗、丢失、转让、使用、拆封或位置变化时才可改变。');
    if (kind === '穿着') return this.compactPrompt('当前穿戴在人体着装部位和随身位置的衣物、鞋帽、饰品与包具，必须写明槽位', '更衣、脱下、穿上、损坏、清洗、替换或外观状态变化时才可改变。');
    if (kind === '社群角色' || kind === '阵营') return this.compactPrompt('社群角色叶子词条，名称与定义都必须写明社群和角色两个字段', '加入退出居住社区、家庭、社交圈或临时群体，或社会角色变化时才可改变。');
    if (kind === '势力地位') return this.compactPrompt('势力地位叶子词条，名称与定义都必须写明势力和地位两个字段，地位必须体现组织层级、职级、年级或职位', '加入退出势力、任免岗位、升降级、转部门或职级变化时才可改变。');
    if (kind === '状态') return this.compactPrompt('当前处境、身份标签或异常状态，含触发原因与持续条件', '触发条件出现、强度变化、持续时间结束或解除条件达成时才可改变。');
    return this.compactPrompt(`${kind || '词条'}“${name}”的准确、可落库、可判定内容`, '同类词条对应的数值、归属、状态或规则来源完成结算时才可改变。');
  },

  shouldRefreshPromptInstruction(value) {
    const text = String(value || '');
    return !text || /生成内容：|改变要求：|只有剧情事实明确改变该词条时才可改变/.test(text);
  },

  get(worldTag, kind, name) {
    return window.GameModules.sqliteSave.getLexiconEntry?.(worldTag || '原创世界', kind, this.normalizeName(name));
  },

  async save(worldTag, kind, name, data) {
    const changed = await this.applyLexiconSkill?.([{ worldTag, kind, name, ...(data || {}) }]);
    return changed?.[0] || null;
  },

  async saveMany(entries) {
    return this.applyLexiconSkill?.(entries) || [];
  },
};


;// ---- lexicon-skill.js ----
window.GameModules = window.GameModules || {};

Object.assign(window.GameModules.rpgLexicon, {
  lexiconSkillId: 'lexicon.modify.batch',

  cleanSkillReason(reason, raw = {}, old = {}) {
    raw = raw || {}; old = old || {};
    const text = String(reason || '').trim();
    if (!text) return `${raw.name || old.name || '词条'}由当前上下文记录为已变化。`.slice(0, 120);
    const blocked = [raw.description, raw.summary, old.description, old.summary].filter(Boolean).map((x) => String(x).trim());
    if (blocked.includes(text) || /词条说明|当前作用|用于记录|暂无详细说明/.test(text)) return `${raw.name || old.name || '词条'}由当前上下文记录为已变化。`.slice(0, 120);
    return text.slice(0, 120);
  },

  buildSkillEntry(raw = {}) {
    const worldTag = raw.worldTag || raw.world || '原创世界';
    const kind = raw.kind || raw.type || '词条';
    const name = this.normalizeName(raw.name || raw.label);
    if (!name || !kind) return null;
    const old = this.get(worldTag, kind, name);
    const promptInstruction = this.shouldRefreshPromptInstruction(old?.promptInstruction)
      ? (raw.promptInstruction || this.defaultPromptInstruction(kind, name))
      : old?.promptInstruction;
    return this.entry(worldTag, kind, name, {
      ...raw,
      nameAiGenerated: (old?.nameAiGenerated || old?.aiGenerated) ? true : (raw.nameAiGenerated ?? raw.aiGenerated),
      valueAiGenerated: old?.valueAiGenerated ? true : (raw.valueAiGenerated ?? raw.aiGenerated),
      changeMode: old?.changeMode || raw.changeMode,
      hierarchy: old?.hierarchy || raw.hierarchy,
      promptInstruction,
      meta: {
        ...(old?.meta || {}),
        ...(raw.meta || {}),
        modifiedBySkill: this.lexiconSkillId,
        modifyReason: this.cleanSkillReason(raw.reason || raw.modifyReason || raw.meta?.modifyReason || old?.meta?.modifyReason, raw, old),
      },
    });
  },

  async applyLexiconSkill(payload = {}) {
    const save = window.GameModules.sqliteSave;
    const entries = Array.isArray(payload) ? payload : (payload.entries || payload.updates || []);
    if (!save.db || !Array.isArray(entries) || !entries.length) return [];
    const changed = [];
    const now = new Date().toISOString();
    for (const raw of entries) {
      const entry = this.buildSkillEntry({ source: 'skill', ...raw });
      if (!entry || this.isSameLexiconEntry(this.get(entry.worldTag, entry.kind, entry.name), entry)) continue;
      if (window.GameModules.playerAspirationPreferenceLayers?.isImmutableFieldName?.(entry.name)) continue;
      save.db.run(
        'INSERT OR REPLACE INTO lexicon_entries(world_tag,kind,name,entry_json,source,created_at,updated_at) VALUES (?,?,?,?,?,COALESCE((SELECT created_at FROM lexicon_entries WHERE world_tag=? AND kind=? AND name=?),?),?)',
        [entry.worldTag, entry.kind, entry.name, JSON.stringify(entry), entry.source, entry.worldTag, entry.kind, entry.name, now, now],
      );
      changed.push(entry);
    }
    if (changed.length) await save.persist();
    return changed;
  },

  isSameLexiconEntry(a, b) {
    if (!a || !b) return false;
    return JSON.stringify(a) === JSON.stringify(b);
  },
});


;// ---- rpg-lexicon-sync.js ----
window.GameModules = window.GameModules || {};

Object.assign(window.GameModules.rpgLexicon, {
  collectFromState(state) {
    const worldTag = state?.worldTag || '原创世界';
    const values = state?.values || {};
    const entries = [];
    for (const section of state?.schema?.sections || []) {
      for (const field of section.fields || []) {
        const treeKind = { knowledge: '知识树', skills: '技能树', professions: '职业树' }[field.key];
        const reason = state?.profile?.rpgFieldReasons?.[field.key];
        entries.push({ worldTag, kind: treeKind || '属性', name: field.label, value: values[field.key], desc: field.desc, reason, nameAiGenerated: false, valueAiGenerated: false, changeMode: reason, hierarchy: treeKind ? 'tree' : 'leaf', source: 'schema', meta: { key: field.key, type: field.type, grade: Boolean(field.grade), targetType: state?.profile?.isPlayer ? '非角色' : '角色', commonField: section.title !== '世界固有属性' && field.key !== 'world_tag' } });
      }
    }
    this.collectLearned(entries, worldTag, '知识', values.knowledge, state?.profile?.rpgFieldReasons?.knowledge, state);
    this.collectLearned(entries, worldTag, '技能', values.skills, state?.profile?.rpgFieldReasons?.skills, state);
    this.collectLearned(entries, worldTag, '职业', values.professions, state?.profile?.rpgFieldReasons?.professions, state);
    this.collectLearned(entries, worldTag, '物品', values.items, state?.profile?.rpgFieldReasons?.items, state);
    this.collectLearned(entries, worldTag, '穿着', values.wearing, state?.profile?.rpgFieldReasons?.wearing, state);
    for (const item of values.factions || []) {
      const entry = this.factionEntry(worldTag, item, state);
      if (entry) entries.push(entry);
    }
    for (const item of values.force_positions || []) {
      const entry = this.forcePositionEntry(worldTag, item, state);
      if (entry) entries.push(entry);
    }
    for (const name of values.status_tags || []) entries.push({ worldTag, kind: '状态', name, desc: `${name}表示角色当前处境、身份或剧情状态。`, reason: state?.profile?.rpgFieldReasons?.status_tags, nameAiGenerated: this.isAiStateName(name, state), valueAiGenerated: true, changeMode: state?.profile?.rpgFieldReasons?.status_tags, source: 'state' });
    return entries;
  },

  isAiStateName(name, state) {
    return ![state?.name, state?.worldTag, state?.profile?.role, '路人', '可被操控', '玩家本人', '手机主人'].includes(name);
  },

  concreteSocialReason(text, fallback) {
    const value = String(text || '').trim();
    const abstract = /^(AI演算|系统结算|系统词条调整|用户主动)$/.test(value) || window.GameModules.characterProfile?.abstractReason?.(value);
    return (value && !abstract ? value : fallback).slice(0, 120);
  },

  factionEntry(worldTag, item, state) {
    const obj = typeof item === 'string' ? { faction: item, role: '成员' } : item;
    const faction = String(obj?.faction || obj?.name || '').trim();
    const role = String(obj?.role || obj?.position || obj?.rank || '成员').trim();
    if (!faction) return null;
    const name = obj.name && obj.name.includes('/') ? obj.name : `${faction} / ${role}`;
    const description = obj.description || `社群：${faction}；角色：${role}。该词条表示角色所属居住社区、家庭、社交圈或临时群体，以及其在其中承担的社会角色。`;
    const actor = state?.profile?.name || state?.name || '该人物';
    const reason = this.concreteSocialReason(obj.reason || obj.changeMode || state?.profile?.rpgFieldReasons?.factions, `${faction}来自${actor}当前住址、家庭、社交圈或临时群体资料，${role}是其在该社群中的社会角色。`);
    return { worldTag, kind: '社群角色', name, summary: `${faction}中的${role}`, description, reason, value: { ...obj, name, faction, community: faction, role, position: role, level: -1, reason, changeMode: reason }, nameAiGenerated: this.isAiStateName(name, state), valueAiGenerated: true, changeMode: reason, source: 'state', meta: { info: { faction, community: faction, role, level: -1 } } };
  },

  forcePositionEntry(worldTag, item, state) {
    const obj = typeof item === 'string' ? { force: item, position: '成员' } : item;
    const force = String(obj?.force || obj?.faction || obj?.name || '').trim();
    const position = String(obj?.position || obj?.rank || '成员').trim();
    if (!force) return null;
    const name = obj.name && obj.name.includes('/') ? obj.name : `${force} / ${position}`;
    const description = obj.description || `势力：${force}；地位：${position}。该词条表示角色在有层级制度势力中的等级、职级、年级或职位。`;
    const actor = state?.profile?.name || state?.name || '该人物';
    const reason = this.concreteSocialReason(obj.reason || obj.changeMode || state?.profile?.rpgFieldReasons?.force_positions, `${force}是${actor}资料中可确认的组织、机构或国家级归属，${position}是其在该势力中的当前地位。`);
    return { worldTag, kind: '势力地位', name, summary: `${force}中的${position}`, description, reason, value: { ...obj, name, force, faction: force, position, level: -1, reason, changeMode: reason }, nameAiGenerated: this.isAiStateName(name, state), valueAiGenerated: true, changeMode: reason, source: 'state', meta: { info: { force, faction: force, position, level: -1 } } };
  },

  learnedDescription(kind, name, item) {
    const explicit = [item.info?.description, item.description, item.desc, item.source].find((x) => x && !/暂无|资料|当前作用/.test(String(x)));
    if (explicit) return explicit;
    if (name === '世界常识') return '对整个世界的认知程度，包括国家、文化风俗、社会规则、地理环境和日常常识。';
    if (name === '手机操作') return '能够使用智能手机完成通讯、检索、拍摄、设置、应用切换和信息处理等操作。';
    if (name === '现实观察' || name === '观察') return '通过细节、环境变化和他人反应判断局势的能力。';
    if (kind === '知识') return `对“${name}”这一知识领域的概念、规则、背景和应用范围的理解程度。`;
    if (kind === '职业') return `以“${name}”为核心的内化职业能力、经验与胜任资格；不等同当前雇佣单位或岗位，失业也不直接失去该职业。`;
    if (kind === '装备') return `装备词条，说明“${name}”的当前状态、效果、持有者、可调用方式和是否可穿戴。`;
    if (kind === '物品') return `物品词条，说明“${name}”的数量、用途、所在位置和消耗或转让条件。`;
    if (kind === '穿着') return `穿着词条，说明“${name}”占用的槽位、外观、状态和对现实行动的影响。`;
    if (kind === '社群角色' || kind === '阵营') return `社群角色词条，说明角色所属居住社区、家庭、社交圈或临时群体，以及其在其中承担的社会角色。`;
    if (kind === '势力地位') return `势力地位词条，说明角色在有层级制度势力中的等级、职级、年级或职位。`;
    return `执行“${name}”相关行动时所需的理解、操作熟练度和稳定发挥能力。`;
  },

  learnedReason(kind, name, item = {}, parentReason = '', state = null) {
    const explicit = item.reason || item.changeMode;
    if (explicit && !window.GameModules.characterProfile?.abstractReason?.(explicit)) return explicit;
    const actor = state?.profile?.name || state?.name || '该人物';
    if (parentReason && !window.GameModules.characterProfile?.abstractReason?.(parentReason)) return `${actor}拥有“${name}”这一${kind}，因为${parentReason}`.slice(0, 120);
    if (name === '世界常识') return `${actor}长期生活在${state?.worldTag || '当前世界'}，日常交流、出行和判断都需要理解当地社会规则与常识。`;
    if (kind === '知识') return `${actor}在学习、工作或日常生活中接触过“${name}”，所以能够把它作为可调用知识。`;
    if (kind === '技能') return `${actor}的经历中已经反复使用“${name}”，因此它成为可执行技能。`;
    if (kind === '职业') return `${actor}围绕“${name}”形成过长期职责、训练或胜任经验，因此记录为职业能力。`;
    if (kind === '装备') return `${actor}当前处境允许调用“${name}”，它会影响行动选择和判定。`;
    if (kind === '物品') return `${actor}随身或生活场景中持有“${name}”，后续可被消耗、转让或使用。`;
    if (kind === '穿着') return `${actor}此刻穿戴“${name}”，它符合当前身份、环境和行动状态。`;
    return `${actor}的当前经历支持记录“${name}”这一${kind}。`;
  },

  collectLearned(entries, worldTag, kind, list, parentReason = '', state = null) {
    for (const item of list || []) {
      const name = typeof item === 'string' ? item : item?.name;
      if (!name) continue;
      const reason = this.learnedReason(kind, name, item, parentReason, state);
      entries.push({
        worldTag, kind, name,
        summary: item.description || item.info?.description || item.desc || item.source,
        description: this.learnedDescription(kind, name, item),
        value: typeof item === 'string' ? item : item,
        nameAiGenerated: true,
        valueAiGenerated: true,
        reason,
        changeMode: reason,
        related: [...(item.linkedStats || []), ...(item.info?.learnedAbilities || []), ...(item.info?.knowledgeAreas || []), ...(item.info?.worldAbilities || [])],
        meta: { info: { ...(item.info || {}), levelDescription: Number(item.level) > 0 ? item.levelDescription : undefined, effect: Number(item.level) > 0 ? item.effect : undefined } },
        source: item.info ? 'ai' : 'state',
      });
    }
  },

  async syncState(state) {
    window.GameModules.characterProfile.requireRpgFieldReasons(state?.profile, state?.profile?.worldAttributes, state?.profile?.name || state?.name || '个人资料');
    await this.saveMany(this.collectFromState(state));
  },
});


;// ---- rpg-lexicon-update.js ----
window.GameModules = window.GameModules || {};

Object.assign(window.GameModules.rpgLexicon, {
  async applyAiUpdates(updates = []) {
    if (!Array.isArray(updates)) return [];
    const entries = updates.map((patch) => this.mergeAiPatch(patch)).filter(Boolean);
    return this.applyLexiconSkill?.(entries) || [];
  },

  mergeAiPatch(patch) {
    const worldTag = patch?.worldTag || '原创世界';
    const kind = patch?.kind;
    const name = this.normalizeName(patch?.name);
    if (!kind || !name) return null;
    const existing = this.get(worldTag, kind, name) || this.entry(worldTag, kind, name, { source: 'ai' });
    const next = { ...existing, meta: { ...(existing.meta || {}) } };
    for (const key of ['summary', 'description', 'value', 'aliases', 'related', 'meta']) {
      if (!Object.prototype.hasOwnProperty.call(patch, key) || patch[key] === undefined || patch[key] === null) continue;
      next[key] = Array.isArray(patch[key]) ? patch[key].map(String) : patch[key];
    }
    next.nameAiGenerated = Boolean(existing.nameAiGenerated || existing.aiGenerated || patch.nameAiGenerated || patch.aiGenerated || patch.source === 'ai');
    next.valueAiGenerated = Boolean(existing.valueAiGenerated || patch.valueAiGenerated || patch.aiGenerated || patch.source === 'ai');
    next.changeMode = existing.changeMode;
    next.hierarchy = existing.hierarchy;
    next.meta.modifyReason = this.cleanSkillReason?.(patch.reason || patch.modifyReason || patch.meta?.modifyReason, patch, existing);
    next.promptInstruction = this.shouldRefreshPromptInstruction(existing.promptInstruction) ? this.defaultPromptInstruction(kind, name) : existing.promptInstruction;
    next.source = patch.source || 'ai';
    return this.entry(worldTag, kind, name, next);
  },
});


;// ---- character-card-lexicon.js ----
window.GameModules = window.GameModules || {};

window.GameModules.characterCardLexicon = {
  modifySkillId: 'character.card.modify',
  addSkillId: 'character.card.add',

  fieldMap: { 姓名: 'name', 性别: 'gender', 身份: 'role', 职业: 'job', 人物说明: 'detail', 背景: 'detail', 外貌: 'appearance', 喜好: 'preferences', 偏好: 'preferences', 穿着偏好: 'preferences', 性格: 'personality', 人际关系: 'relationships', 关系: 'relationships', 技能: 'skills', essentialPreferenceLayers: 'essentialPreferenceLayers', 本质偏好: 'essentialPreferenceLayers', 价值立场偏好: 'essentialPreferenceLayers', 决策风格偏好: 'essentialPreferenceLayers', 人生六维偏好: 'essentialPreferenceLayers', 底线锚点偏好: 'essentialPreferenceLayers', 心理偏好: 'essentialPreferenceLayers' },

  isImmutableProfileUpdate(update = {}) {
    const tool = window.GameModules.playerAspirationPreferenceLayers;
    if (update.field === 'essentialPreferenceLayers') return true;
    if (tool?.isImmutableFieldName?.(update.field) || tool?.isImmutableFieldName?.(update.name)) return true;
    return false;
  },

  normalizeField(raw) {
    const text = String(raw || '').trim();
    return this.fieldMap[text] || text;
  },

  displayField(field) {
    return Object.entries(this.fieldMap).find(([, key]) => key === field)?.[0] || field;
  },

  normalizeKind(raw) {
    const text = String(raw || '').trim();
    if (text.includes('角色技能')) return '角色技能';
    if (text.includes('角色卡')) return '角色卡';
    return text;
  },

  normalizeUpdate(raw = {}) {
    const kind = this.normalizeKind(raw.kind);
    const field = this.normalizeField(raw.field || raw.name);
    const reason = String(raw.reason || raw.modifyReason || '').trim().slice(0, 160);
    if (!reason || !['角色卡', '角色技能'].includes(kind)) return null;
    const value = Object.prototype.hasOwnProperty.call(raw, 'value') ? raw.value : raw.description;
    if (!field || value === undefined || value === null) return null;
    return { ...raw, kind, field, value, reason };
  },

  async applyToState(state, updates = []) {
    if (!Array.isArray(updates)) return [];
    const records = [];
    let changed = false;
    for (const raw of updates) {
      const update = this.normalizeUpdate(raw);
      if (!update) continue;
      const applied = state?.profile ? this.applyOne(state.profile, update) : false;
      if (applied) changed = true;
      records.push(this.changeRecord(update, applied));
    }
    if (!records.length) return [];
    if (state?.profile) {
      const reasons = { ...(state.profile.roleCardFieldReasons || {}) };
      records.forEach((item) => { reasons[item.field] = item.reason; });
      state.profile.roleCardFieldReasons = reasons;
    }
    if (changed && state?.profile) {
      state.profile.roleCardUpdatedAt = new Date().toISOString();
      state.profile.roleCardChangeLog = [...(state.profile.roleCardChangeLog || []), ...records.filter((item) => item.applied)].slice(-30);
      window.GameModules.rpgInitializer?.touch?.(state.values, window.Alpine?.store?.('game'));
      await window.GameModules.sqliteSave.saveCharacterState(state);
    } else if (records.length && state?.profile) {
      await window.GameModules.sqliteSave.saveCharacterState(state);
    }
    return records;
  },

  applyOne(profile, update) {
    if (this.isImmutableProfileUpdate(update)) return false;
    if (update.kind === '角色技能' || update.field === 'skills') return this.applySkill(profile, update);
    const key = update.field;
    if (!['name', 'gender', 'role', 'job', 'detail', 'appearance', 'preferences', 'personality', 'relationships'].includes(key)) return false;
    const next = String(update.value || '').trim().slice(0, key === 'detail' ? 180 : 120);
    if (!next || profile[key] === next) return false;
    profile[key] = next;
    return true;
  },

  applySkill(profile, update) {
    const value = update.value && typeof update.value === 'object' ? update.value : { name: update.name, desc: update.value || update.description || update.summary };
    const name = String(value.name || update.skillName || update.name || '').trim().slice(0, 16);
    const desc = String(value.desc || value.description || update.description || update.summary || update.reason).trim().slice(0, 80);
    if (!name) return false;
    const skills = Array.isArray(profile.skills) ? [...profile.skills] : [];
    const index = skills.findIndex((item) => item?.name === name);
    const next = { name, desc, reason: update.reason, changeMode: update.reason };
    if (index >= 0) skills[index] = next;
    else skills.push(next);
    profile.skills = skills.slice(0, 8);
    return true;
  },

  changeRecord(update, applied = true) {
    return { at: new Date().toISOString(), skillId: update.kind === '角色技能' ? this.addSkillId : this.modifySkillId, field: this.displayField(update.field), name: update.name || update.field, value: update.value, reason: update.reason, applied };
  },
};


;// ---- character-intro-card.js ----
window.GameModules = window.GameModules || {};

window.GameModules.characterIntroCard = {
  worldOf(raw = {}, store = null) {
    return String(store?.currentWorldTag?.() || raw.worldTag || raw.work || store?.character?.work || window.GameModules.realWorld2026?.label || '未知世界').slice(0, 40);
  },

  normalize(raw = {}, store = null, source = 'ai') {
    const name = String(raw.name || raw.characterName || '').trim().slice(0, 24);
    if (!name) return null;
    const worldTag = store?.currentWorldTag?.()
      || (source === 'real'
        ? String(window.GameModules.realWorld2026?.label || '2026 现代都市现实世界').slice(0, 40)
        : this.worldOf(raw, store));
    return {
      name,
      worldTag,
      role: String(raw.role || raw.identity || '出场人物').trim().slice(0, 40),
      intro: String(raw.intro || raw.detail || raw.description || raw.summary || '本回合被提及或出现的人物，细节尚未固化。').trim().slice(0, 280),
      wearing: raw.wearing || raw.clothing || raw.outfit || '',
      source,
      solidifyStatus: 'pending',
    };
  },

  roleCardState(card = {}) {
    const save = window.GameModules.sqliteSave;
    const worldTag = window.GameModules.characterQuery?.normalizeWorldTag?.(card.worldTag || card.work) || card.worldTag;
    return save?.getCharacterStateByName?.(card.name, worldTag)
      || (save?.listCharacterStates?.() || []).find((state) => {
        const profile = state?.profile || {};
        const sameName = state?.name === card.name || profile.name === card.name;
        const sameWorld = window.GameModules.characterQuery?.worldMatches?.(worldTag, state?.worldTag || profile.work) ?? (!worldTag || state?.worldTag === worldTag || profile.work === worldTag);
        return sameName && sameWorld;
      })
      || null;
  },

  roleCardExists(card = {}) { return Boolean(this.roleCardState(card)); },

  async ensure(store, raw = {}, source = 'ai') {
    const card = this.normalize(raw, store, source);
    if (!card) return null;
    if (this.roleCardExists(card)) return { ...card, displayType: 'role' };
    const save = window.GameModules.sqliteSave;
    const existing = save?.getCharacterIntro?.(card.name, card.worldTag);
    if (existing) return existing;
    return await save?.saveCharacterIntro?.({ ...card, createdAt: new Date().toISOString() });
  },

  async ensureMany(store, items = [], source = 'ai') {
    const out = [];
    for (const item of Array.isArray(items) ? items : []) {
      const card = await this.ensure(store, item, source);
      if (card) out.push(card);
    }
    return out;
  },
};


;// ---- character-query.js ----
window.GameModules = window.GameModules || {};

window.GameModules.characterQuery = {
  worldOf(store = null, params = {}) {
    return this.normalizeWorldTag(store?.currentWorldTag?.() || params.worldTag || params.world || params.work || store?.character?.work || window.GameModules.realWorld2026?.label || '未知世界');
  },

  normalizeWorldTag(value = '') {
    const text = String(value || '').trim().slice(0, 40);
    if (!text) return '';
    if (this.isRealWorldTag(text)) return window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';
    return text;
  },

  isRealWorldTag(value = '') {
    const text = String(value || '').trim();
    return text === '现实世界' || text === '现代都市现实世界' || text === '2026 现代都市现实世界' || text === window.GameModules.realWorld2026?.label;
  },

  worldMatches(a = '', b = '') {
    const left = this.normalizeWorldTag(a);
    const right = this.normalizeWorldTag(b);
    return !left || !right || left === right;
  },

  stateNameMatches(state = {}, key = '') {
    const profile = state?.profile || {};
    return state?.name === key || profile.name === key || state?.id === key || profile.id === key;
  },

  stateByName(store = null, name = '', worldTag = '') {
    const key = String(name || '').trim();
    if (!key) return null;
    const save = window.GameModules.sqliteSave;
    const exact = save?.getCharacterStateByName?.(key, worldTag);
    if (exact) return exact;
    return [...Object.values(store?.rpgStates || {}), ...(save?.listCharacterStates?.() || [])].find((state) => {
      const profile = state?.profile || {};
      return this.stateNameMatches(state, key) && this.worldMatches(worldTag, state?.worldTag || profile.work);
    }) || null;
  },

  introByName(name = '', worldTag = '') {
    const key = String(name || '').trim();
    if (!key) return null;
    const save = window.GameModules.sqliteSave;
    return save?.getCharacterIntro?.(key, worldTag)
      || (save?.listCharacterIntros?.() || []).find((card) => card?.name === key && this.worldMatches(worldTag, card.worldTag || card.work))
      || null;
  },

  query(store = null, method = '', params = {}) {
    if (method === 'listKnownCharacters') return this.listKnownCharacters(store, params);
    return this.searchCharacter(store, params);
  },

  searchCharacter(store = null, params = {}) {
    const name = String(params.name || params.keyword || params.characterName || '').trim();
    const worldTag = this.worldOf(store, params);
    const maxChars = Number(params.maxChars) || 3200;
    if (!name) return '未提供角色名，无法查询角色资料。';
    const state = this.stateByName(store, name, worldTag);
    if (state) return this.stateText(state, worldTag, maxChars);
    const intro = this.introByName(name, worldTag);
    if (intro) return this.introText(intro, maxChars);
    return `未找到角色资料：${name}｜世界：${worldTag}。若正文确认该人物存在，请在结算 JSON 的 appearedCharacters 写入 name、role、intro、work；若值得手动固化，同时写入 solidifiableCharacters。`;
  },

  listKnownCharacters(store = null, params = {}) {
    const worldTag = this.worldOf(store, params);
    const states = (window.GameModules.sqliteSave?.listCharacterStates?.() || []).filter((state) => this.worldMatches(worldTag, state.worldTag || state.profile?.work));
    const intros = (window.GameModules.sqliteSave?.listCharacterIntros?.() || []).filter((card) => this.worldMatches(worldTag, card.worldTag || card.work));
    const rows = [
      ...states.slice(0, 12).map((state) => `角色卡｜${state.name || state.profile?.name || state.id}｜${state.worldTag || worldTag}｜${state.profile?.role || state.profile?.detail || '完整资料已固化'}`),
      ...intros.slice(0, 12).map((card) => `介绍卡｜${card.name}｜${card.worldTag || worldTag}｜${card.role || ''}｜${card.intro || ''}`),
    ];
    return rows.join('\n') || `世界 ${worldTag} 暂无角色卡或介绍卡。`;
  },

  limit(text = '', max = 3200) {
    return String(text || '').trim().slice(0, Math.max(200, Number(max) || 3200));
  },

  line(label, value) {
    const text = this.valueText(value);
    return text ? `${label}：${text}` : '';
  },

  valueText(value) {
    if (value === undefined || value === null || value === '') return '';
    if (Array.isArray(value)) return this.listText(value);
    if (typeof value !== 'object') return String(value);
    if (value.name && (value.current !== undefined || value.max !== undefined)) return `${value.name}:${value.current ?? ''}/${value.max ?? ''}`;
    if (value.name && (value.level || value.type)) return `${value.name}${value.level ? ` lv.${value.level}` : ''}${value.type ? `（${value.type}）` : ''}`;
    if (Object.prototype.hasOwnProperty.call(value, 'current')) return `${value.current}/${value.max ?? 'max'}`;
    if (Object.prototype.hasOwnProperty.call(value, 'onlineCount')) return `上线${value.onlineCount || 0}次｜${value.feeling || '未知'}｜适应${value.adaptation || 0}/100｜${value.summary || ''}`;
    if (Object.values(value).some((item) => item?.partKey && item?.status)) return Object.values(value).filter((item) => item?.partKey || item?.part || item?.name).map((item) => `${item.part || item.name || item.partKey}：${item.status || item.summary || '稳定'}`).join('；');
    return JSON.stringify(value);
  },

  listText(list, limit = 8) {
    const rows = Array.isArray(list) ? list : (list ? [list] : []);
    return rows.map((item) => {
      if (!item || typeof item !== 'object') return String(item || '').trim();
      const name = item.slot ? `${item.slot}:${item.name || '未穿戴'}` : (item.name || item.title || item.faction || item.force || item.position || item.role || item.key || '条目');
      const extra = [item.type, item.level ? `lv.${item.level}` : '', item.role, item.position, item.summary || item.desc || item.description || item.reason].filter(Boolean).join('｜');
      return extra ? `${name}（${extra}）` : String(name || '').trim();
    }).filter(Boolean).slice(0, limit).join('、');
  },

  locationText(value) {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return [value.name, value.worldTag, value.reason].filter(Boolean).join('｜');
  },

  attributeText(values = {}) {
    const keys = [['level', '等级'], ['strength', '力量'], ['agility', '敏捷'], ['constitution', '体质'], ['intelligence', '智力'], ['perception', '感知'], ['willpower', '意志'], ['charisma', '魅力'], ['health', '生命'], ['stamina', '精力']];
    return keys.map(([key, label]) => values[key] !== undefined ? `${label}${this.valueText(values[key])}` : '').filter(Boolean).join('、');
  },

  bodyText(values = {}) {
    const rows = [];
    if (values.bodyStatus) rows.push(this.valueText(values.bodyStatus));
    if (values.intimacy?.bodyStatus) rows.push(this.valueText(values.intimacy.bodyStatus));
    ['vitality', 'stamina_pool', 'satiety', 'hydration', 'fatigue', 'mental_stability'].forEach((key) => {
      if (values[key]) rows.push(`${key}:${this.valueText(values[key])}`);
    });
    return rows.filter(Boolean).join('；');
  },

  metricText(metrics = {}) {
    return Object.entries(metrics || {}).map(([key, value]) => `${key}${value}`).slice(0, 12).join('、');
  },

  schemaSectionText(state = {}) {
    const values = state.values || {};
    const covered = new Set(['world_tag', 'gender', 'age', 'current_location', 'factions', 'force_positions', 'status_tags', 'level', 'strength', 'agility', 'constitution', 'intelligence', 'perception', 'willpower', 'charisma', 'health', 'stamina', 'bodyStatus', 'intimacy', 'vitality', 'stamina_pool', 'satiety', 'hydration', 'fatigue', 'mental_stability', 'wearing', 'items', 'skills', 'knowledge', 'control_experience']);
    return (state.schema?.sections || []).map((section) => {
      const rows = (section.fields || []).map((field) => {
        if (!field?.key || covered.has(field.key) || values[field.key] === undefined) return '';
        return `${field.label || field.key}=${this.valueText(values[field.key])}`;
      }).filter(Boolean).slice(0, 8);
      return rows.length ? `${section.title || '状态'}：${rows.join('；')}` : '';
    }).filter(Boolean).join('\n');
  },

  stateText(state = {}, fallbackWorld = '', maxChars = 3200) {
    const profile = state.profile || {};
    const values = state.values || {};
    const metrics = state.metrics || {};
    const rows = [
      `资料类型：完整角色卡`,
      `姓名：${state.name || profile.name || state.id || '未知'}`,
      `角色ID：${state.id || profile.id || state.name || '未知'}`,
      `世界：${state.worldTag || profile.work || fallbackWorld || '未知世界'}`,
      `身份：${profile.role || profile.job || '未知'}`,
      this.line('性别', profile.gender || values.gender),
      this.line('年龄/生日', [values.age ?? profile.age, profile.birthday].filter(Boolean).join(' / ')),
      this.line('职业', profile.job || this.valueText(values.profession || values.professions)),
      this.line('当前地点', this.locationText(values.current_location)),
      this.line('人际关系', profile.relationships),
      this.line('外貌', profile.appearance),
      this.line('性格', profile.personality),
      this.line('喜好', profile.preferences),
      ...(window.GameModules.playerAspirationPreferenceLayers?.toLines?.(profile.essentialPreferenceLayers) || []),
      this.line('人物说明', profile.detail || state.note),
      this.line('社群角色', this.listText(profile.factions || values.factions, 8)),
      this.line('势力地位', this.listText(profile.force_positions || profile.forcePositions || values.force_positions, 8)),
      this.line('状态标签', this.listText(values.status_tags, 12)),
      this.line('核心属性', this.attributeText(values)),
      this.line('身体状态', this.bodyText(values)),
      this.line('情绪', this.metricText(metrics.emotions)),
      this.line('对玩家感觉', this.metricText(metrics.playerFeelings)),
      this.line('穿着', this.listText(values.wearing || profile.wearingItems || profile.wearing, 12)),
      this.line('物品', this.listText(values.items || profile.items, 12)),
      this.line('技能', this.listText(values.skills || profile.skills, 10)),
      this.line('知识', this.listText(values.knowledge, 8)),
      this.line('上线体验', this.valueText(values.control_experience)),
      this.line('其他身份状态', this.schemaSectionText(state)),
    ].filter(Boolean);
    return this.limit(rows.join('\n'), maxChars);
  },

  introText(card = {}, maxChars = 1600) {
    return this.limit([
      `资料类型：介绍卡`,
      `姓名：${card.name}`,
      `世界：${card.worldTag || card.work || '未知世界'}`,
      `身份：${card.role || '出场人物'}`,
      this.line('介绍', card.intro || card.detail || '暂无介绍。'),
      this.line('性格', card.personality),
      this.line('关系', card.relationships || card.relation),
      this.line('外貌', card.appearance),
    ].filter(Boolean).join('\n'), maxChars);
  },
};


;// ---- past-event-query.js ----
window.GameModules = window.GameModules || {};

window.GameModules.pastEventQuery = {
  query(store = null, method = '', params = {}) {
    if (method !== 'searchPastEvent') return this.search(store, params);
    return this.search(store, params);
  },

  search(store = null, params = {}) {
    const keys = this.keywords(params);
    const refs = this.recentReferenceIndex(store);
    const scored = this.sources(store, params).map((row) => this.withReference(this.score(row, keys, params), refs));
    const matched = scored.filter((row) => row.score > 0 || !keys.length);
    const rows = matched.length ? matched : scored;
    rows.sort((a, b) => b.score - a.score || String(b.time || '').localeCompare(String(a.time || '')));
    const picked = this.pick(rows, Number(params.maxChars) || 5000);
    const confidence = this.confidence(matched.length ? picked : [], keys);
    return [
      `过去事件查询：${keys.join('、') || '最近记录'}`,
      `准确度：${confidence.label}｜${confidence.reason}`,
      `回复策略：${confidence.reply}`,
      matched.length ? '命中资料：' : (picked.length ? '命中资料：无；以下为全文候选，仅可用于判断不确定或反问，不可当作准确记忆。' : '命中资料：无'),
      ...picked.map((row, index) => this.formatPickedRow(row, index)),
    ].join('\n\n');
  },

  formatPickedRow(row, index) {
    return `## ${index + 1}. ${row.source}｜${row.title}\n时间：${row.time || '未知'}\n匹配：${row.score}｜关键词：${row.hitKeys.join('、') || '无'}\n${this.rowOutputText(row)}`;
  },

  rowOutputText(row = {}) {
    if (!row.reference) return row.text;
    return [`文本内容参照${row.reference.id}(唯一id)`, `参照对象：${row.reference.label}`].join('\n');
  },

  keywords(params = {}) {
    const raw = [params.question, params.keyword, params.timeHint, params.characterName, params.locationName, ...(Array.isArray(params.keywords) ? params.keywords : [])].filter(Boolean).join(' ');
    return [...new Set(String(raw).split(/[\s,，。！？；、"“”'‘’（）()]+/).map((x) => x.trim()).filter((x) => x.length >= 2).slice(0, 12))];
  },

  sources(store = null, params = {}) {
    return [
      ...this.realRows(),
      ...this.worldlineRows(store, params),
      ...this.memoryRows(store, params),
      ...this.wechatRows(store, params),
    ];
  },

  realRows() {
    const db = window.GameModules.sqliteSave;
    try {
      if (db?.db) {
        const rows = [];
        const stmt = db.db.prepare('SELECT entry_json,created_at FROM real_world_log ORDER BY created_at DESC LIMIT 600');
        while (stmt.step()) {
          const row = stmt.getAsObject();
          const entry = JSON.parse(row.entry_json);
          rows.push(this.row('现实日志', entry.sceneTitle || entry.locationName || entry.id, entry.time?.label || row.created_at, `${entry.text || ''}\n${entry.narration || ''}\n${entry.thinking || ''}`, entry));
        }
        stmt.free();
        return rows;
      }
    } catch (_) { /* 忽略表不存在 */ }
    return [];
  },

  worldlineRows(store = null, params = {}) {
    const lines = [];
    const addLine = (tag, line = {}) => {
      (line.events || []).forEach((event) => lines.push(this.row(`世界线:${tag}`, event.name || event.eventId || event.id, event.time, `${event.summary || ''}\n${event.detail || ''}\n${JSON.stringify(event)}`, event)));
      (line.plots || []).forEach((plot) => lines.push(this.row(`情节归纳:${tag}`, plot.情节标题 || plot.情节名称 || plot.情节编号 || plot.id, plot.情节时间段, `${plot.情节总结 || plot.摘要 || ''}\n${plot.重要片段 || ''}\n${JSON.stringify(plot)}`, plot)));
    };
    try { addLine('现实世界', store?.realWorldline?.()); } catch (_) { /* ignore */ }
    (store?.savedWorldLores || []).forEach((lore) => addLine(lore.worldTag || params.worldTag || '未知世界', lore.worldline || {}));
    return lines;
  },

  memoryRows(store = null, params = {}) {
    const ids = this.memoryIds(store, params);
    const rows = [];
    ids.forEach((id) => {
      const memory = window.GameModules.characterMemory?.ensure?.(id);
      if (!memory) return;
      const pools = [['刚发生记忆', memory.shortTerm?.recent], ['归纳中记忆', memory.shortTerm?.summaryBuffer], ['近发生记忆', memory.shortTerm?.summarized], ['遗忘区记忆', memory.shortTerm?.forgotten], ['难忘记忆', memory.longTerm?.vivid], ['永久记忆', memory.longTerm?.permanent]];
      pools.forEach(([name, list]) => (list || []).forEach((item) => rows.push(this.row(`${name}:${id}`, item.summary || item.id, item.time?.label, `${item.summary || ''}\n${item.text || ''}`, item))));
      (window.GameModules.sqliteSave?.listMemoryArchives?.(id) || []).forEach((item) => rows.push(this.row(`记忆归档:${id}`, item.meta?.summary || item.id, item.meta?.time || item.createdAt, item.text || item.meta?.summary || '', item)));
    });
    return rows;
  },

  memoryIds(store = null, params = {}) {
    const ids = new Set(['player-self']);
    [params.characterId, params.contactId].filter(Boolean).forEach((id) => ids.add(String(id)));
    const name = String(params.characterName || params.name || '').trim();
    Object.values(store?.rpgStates || {}).forEach((state) => {
      if (!name || state?.name === name || state?.profile?.name === name) ids.add(state.id);
    });
    return [...ids].filter(Boolean).slice(0, 8);
  },

  wechatRows(store = null, params = {}) {
    const rows = [];
    const wanted = String(params.contactId || params.characterId || '').trim();
    try {
      const db = window.GameModules.sqliteSave;
      if (db?.db) {
        const sql = wanted ? 'SELECT contact_id,message_json,created_at FROM wechat_history WHERE contact_id=? ORDER BY created_at DESC LIMIT 300' : 'SELECT contact_id,message_json,created_at FROM wechat_history ORDER BY created_at DESC LIMIT 300';
        const stmt = db.db.prepare(sql);
        if (wanted) stmt.bind([wanted]);
        while (stmt.step()) {
          const row = stmt.getAsObject();
          const msg = JSON.parse(row.message_json);
          rows.push(this.row(`微信历史:${row.contact_id}`, msg.side === 'self' ? '玩家消息' : (msg.name || '联系人消息'), msg.at || msg.atDisplay || row.created_at, msg.imageRecord || msg.text || '', msg));
        }
        stmt.free();
      }
    } catch (_) { /* 忽略表不存在 */ }
    Object.entries(store?.wechatMessagesByContact || {}).forEach(([id, list]) => {
      if (wanted && id !== wanted) return;
      (list || []).forEach((msg) => rows.push(this.row(`微信缓存:${id}`, msg.side === 'self' ? '玩家消息' : (msg.name || '联系人消息'), msg.at || msg.atDisplay, msg.imageRecord || msg.text || '', msg)));
    });
    return rows;
  },

  row(source, title, time, text, raw) { return { source, title: String(title || '未命名'), time: String(time || ''), text: String(text || ''), raw }; },

  stableId(raw = {}, fallback = '') {
    return String(raw.eventId || raw.id || raw.linkedLongTermId || raw.memoryId || fallback || '').trim();
  },

  normalizeText(text = '') {
    return String(text || '')
      .replace(/[\s\p{P}\p{S}]+/gu, '')
      .slice(0, 900);
  },

  textSimilarity(a = '', b = '') {
    const left = this.normalizeText(a);
    const right = this.normalizeText(b);
    if (!left || !right) return 0;
    if (left.includes(right.slice(0, Math.min(80, right.length))) || right.includes(left.slice(0, Math.min(80, left.length)))) return 1;
    const grams = (text) => {
      const out = new Set();
      for (let i = 0; i < text.length - 1; i += 1) out.add(text.slice(i, i + 2));
      return out;
    };
    const aSet = grams(left), bSet = grams(right);
    if (!aSet.size || !bSet.size) return 0;
    let hit = 0;
    aSet.forEach((gram) => { if (bSet.has(gram)) hit += 1; });
    return hit / Math.min(aSet.size, bSet.size);
  },

  recentReferenceIndex(store = null) {
    const line = store?.realWorldline?.() || {};
    const picked = [];
    let total = 0;
    for (const event of (line.events || []).slice().reverse()) {
      const text = `${event.summary || ''}\n${event.detail || ''}\n${JSON.stringify(event)}`;
      const nextTotal = total + text.length;
      if (nextTotal > 6000) break;
      picked.push(event);
      total = nextTotal;
      if (total >= 5000) break;
    }
    return picked.map((event) => {
      const id = this.stableId(event);
      const text = `${event.summary || ''}\n${event.detail || ''}\n${JSON.stringify(event)}`;
      return id ? { id, label: `${event.name || '世界线记录'}｜${event.time || '未知时间'}`, text } : null;
    }).filter(Boolean);
  },

  withReference(row = {}, refs = []) {
    const id = this.stableId(row.raw);
    const hit = refs.find((ref) => (id && ref.id === id) || this.textSimilarity(row.text, ref.text) >= 0.82);
    return hit ? { ...row, reference: hit } : row;
  },

  score(row, keys = [], params = {}) {
    const body = `${row.source}\n${row.title}\n${row.time}\n${row.text}`;
    const hitKeys = keys.filter((key) => body.includes(key));
    let score = hitKeys.reduce((sum, key) => sum + (body.split(key).length - 1), 0);
    if (params.characterName && body.includes(params.characterName)) score += 3;
    if (params.timeHint && body.includes(params.timeHint)) score += 3;
    return { ...row, score, hitKeys };
  },

  pick(rows = [], budget = 5000) {
    const out = [];
    let total = 0;
    for (const row of rows.slice(0, 30)) {
      out.push(row);
      total += row.text.length + row.title.length + 80;
      if (total >= budget) break;
    }
    return out;
  },

  confidence(rows = [], keys = []) {
    const best = rows[0]?.score || 0;
    const needed = Math.max(3, Math.ceil(keys.length * 0.6));
    if (!rows.length || best <= 0) return { label: '无命中', reason: '没有找到可依据的过去事件。', reply: '按角色性格承认忘记或表示没有必要记得，不要编造。' };
    if (best >= needed + 2) return { label: '高', reason: '多个关键词命中过去资料，可直接确认事件。', reply: '按角色性格说“你说的是那件事呀……”并引用命中事实。' };
    if (best >= needed) return { label: '中', reason: '命中部分关键词，但仍可能有歧义。', reply: '按角色性格先确认“你说的是那件事？”再克制复述。' };
    return { label: '低', reason: '只有弱关键词命中，不能确定具体事件。', reply: '按角色性格说“有些记不得了/你指哪件事？”不要把弱命中当事实。' };
  },
};


;// ---- rpg-field-ui.js ----
window.GameModules = window.GameModules || {};

window.GameModules.rpgFieldUi = {
  rpgFieldKey(field) { return `${field?.stateId || 'state'}:${field?.key || ''}:${field?.label || ''}`; },
  rpgItemKey(field, index) { return `${this.rpgFieldKey(field)}:item:${index}`; },
  toggleRpgField(field) { const key = this.rpgFieldKey(field); if (key) this.expandedRpgFieldKey = this.expandedRpgFieldKey === key ? '' : key; },
  toggleRpgItem(field, index) { const key = this.rpgItemKey(field, index); if (key) this.expandedRpgFieldKey = this.expandedRpgFieldKey === key ? '' : key; },
  isRpgFieldOpen(field) { return this.expandedRpgFieldKey === this.rpgFieldKey(field); },
  isRpgItemOpen(field, index) { return this.expandedRpgFieldKey === this.rpgItemKey(field, index); },
  isRpgListField(field) { return ['knowledge', 'skills', 'professions', 'factions', 'force_positions', 'items', 'wearing', 'bodyProfile', 'dressedProfile', 'bodyStatus', 'sexualExperienceParts', 'sexualPartners', 'status_tags'].includes(field?.key) && Array.isArray(field.raw); },
  rpgFieldSummary(field) {
    if (!this.isRpgListField(field)) return `${field.label}：${Array.isArray(field.value) ? field.value.join('、') || '无' : field.value}`;
    const unit = { knowledge: '知识', skills: '技能', professions: '职业', bodyProfile: '部位', dressedProfile: '部位', bodyStatus: '部位', sexualExperienceParts: '分类', sexualPartners: '人' }[field.key] || '项';
    return `${field.label}：${field.raw.length}${unit}`;
  },
  canExpandRpgField(field) { return Boolean(field); },
  isLexiconField(field) { return Boolean(field); },
  roleCardReasonGetter(profile = {}) {
    const reasons = profile.roleCardFieldReasons || {}, log = {};
    (profile.roleCardChangeLog || []).forEach((item) => [item.field, item.name].filter(Boolean).forEach((key) => { log[key] = item.reason || log[key] || ''; }));
    const wrongSubject = (text, label = '') => {
      const value = String(text || '').trim(), name = String(profile?.name || '').trim();
      if (!name || label === '人际关系' || /(妹妹|姐姐|哥哥|弟弟|父亲|母亲|女儿|儿子)/.test(String(profile?.role || ''))) return false;
      if (value.includes(name)) return false;
      return /(作为|是|属于|承担|体现了).{0,18}(妹妹|姐姐|哥哥|弟弟|父亲|母亲|女儿|儿子)/.test(value) || /(妹妹|姐姐|哥哥|弟弟|父亲|母亲|女儿|儿子).{0,12}(身份|性格|外貌|生日|职业|资料)/.test(value);
    };
    const usable = (text, label) => !/^错误：.*缺少AI给出的变化原因/.test(String(text || '').trim()) && !wrongSubject(text, label) && String(text || '').trim();
    return (label, key) => usable(reasons[label], label) || usable(reasons[key], label) || usable(log[label], label) || usable(log[key], label) || this.missingReasonText(`${profile?.name || '个人资料'}-${label}`);
  },

  missingReasonText(name = '词条') { return `错误：${name}缺少AI给出的变化原因，请重新生成个人资料或重新触发AI更新。`; },
  rpgListItems(field) { return Array.isArray(field?.raw) ? field.raw : []; },
  isBodyProfileField(field) { return field?.key === 'bodyProfile' || field?.key === 'dressedProfile'; },
  rpgBodyPartDescription(item) { return String(item?.description || '未记录').trim(); },

  profileIdentityFields(state, provided = []) {
    if (Array.isArray(provided) && provided.length) return provided;
    const p = state?.profile || {};
    const worldTag = p.work || state?.worldTag || '原创世界';
    const reasonFor = this.roleCardReasonGetter(p);
    const row = (key, label, value, desc) => ({ key: `profile-${state?.id || 'target'}-${key}`, stateId: state?.id || '', label, kind: '角色卡', value: value || '未记录', raw: value || '', desc, reason: reasonFor(label, key), worldTag, targetType: p.isPlayer ? '非角色' : '角色', commonField: key !== 'work' });
    return [
      row('name', '姓名', p.name || state?.name, '角色卡固化姓名。'), row('work', '所属世界', worldTag, '角色出身作品或世界。'),
      row('role', '身份', p.role || p.job, '角色当前身份。'),
      row('job', '职业', p.job, '角色真实职业、训练身份或社会功能。'),
      row('gender', '性别', p.gender, '角色性别资料。'), row('birthday', '生日', p.birthday, '角色生日资料。'),
      row('relationships', '人际关系', p.relationships, '关系必须使用“关系：姓名”的格式。'), row('appearance', '外貌', p.appearance, '角色卡固化外貌。'),
      row('preferences', '喜好', p.preferences, '角色稳定喜好和穿着偏好。'), row('personality', '性格', p.personality, '角色卡固化性格。'), row('detail', '人物说明', p.detail, '角色卡补充说明。'),
    ];
  },

  profileDisplayState(state, identityFields = []) {
    if (state?.values) return state;
    const fromFields = Object.fromEntries((identityFields || []).map((field) => [field.key, field.value]));
    const id = identityFields?.[0]?.stateId || state?.id || 'profile-preview';
    const profile = { ...(state?.profile || {}), id, name: fromFields.name || state?.name || '未命名', work: fromFields.work || state?.worldTag || '原创世界', role: fromFields.role || fromFields.job || '', job: fromFields.job || fromFields.role || '', isPlayer: id === 'player-self' };
    return { ...(state || {}), id, name: profile.name, worldTag: profile.work, profile, values: {} };
  },

  shouldShowEssentialPreferenceSection(displayState = {}) {
    return Boolean(this.essentialPreferenceViewForState?.(displayState));
  },

  profileSections(state, identityFields = []) {
    const displayState = this.profileDisplayState(state, identityFields);
    const aspirationFields = (identityFields || []).filter((field) => field.profileGroup === '人生取向');
    const essentialPreferenceFields = (identityFields || []).filter((field) => field.profileGroup === '本质偏好');
    const baseIdentityFields = (identityFields || []).filter((field) => field.profileGroup !== '人生取向' && field.profileGroup !== '本质偏好');
    const entries = this.rpgEntries?.(displayState) || [];
    const all = entries.flatMap((section) => section.fields || []);
    const byKey = (key) => all.find((field) => field.key === key);
    const take = (keys) => keys.map(byKey).filter(Boolean);
    const identity = this.profileIdentityFields(displayState, baseIdentityFields);
    const relations = identity.filter((field) => field.label === '人际关系' || /relationships|人际关系/.test(field.key));
    const privateLabels = new Set(['性经验次数', '当前身体状态']);
    const identityRest = identity.filter((field) => !relations.includes(field) && !privateLabels.has(field.label));
    const naturalState = this.profileNaturalStateField(displayState);
    const dressedState = this.profileDressedStateField(displayState);
    const intimacyUi = window.GameModules.initPromptRegistry?.uiFor?.('intimacyBody') || {};
    const intimacyAllFields = this.intimacyBodyInitialized(displayState) ? (window.GameModules.initPromptRegistry?.fields?.('intimacyBody', displayState) || []) : [];
    const intimacyFieldKeys = new Set(intimacyUi.fieldKeys || ['sexualStatus', 'sexualPartnerCount', 'sexualPartners', 'sexualExperienceCount', 'sexualExperienceParts', 'bodyStatus']);
    const intimacyFields = intimacyAllFields.filter((field) => intimacyFieldKeys.has(field.key));
    if (!intimacyFields.length) intimacyFields.push(...this.defaultIntimacyBodyFields(displayState));
    const longing = this.profileLongingField(state);
    const used = new Set(['world_tag', 'age', 'factions', 'force_positions', 'current_location', 'strength', 'agility', 'constitution', 'intelligence', 'perception', 'willpower', 'charisma', 'items', 'wearing', 'bodyProfile', 'dressedProfile', 'bodyStatus', 'intimacy', 'status_tags']);
    const personal = all.filter((field) => !used.has(field.key));
    const groups = [
      { title: '个人能力', fields: personal },
      { title: '身内能力', fields: take(['strength', 'agility', 'constitution', 'intelligence', 'perception', 'willpower', 'charisma']) },
      { title: '装备与物品', fields: take(['items', 'wearing']) },
      { title: '当前自然状态', fields: naturalState ? [naturalState] : [] },
      { title: '盛装', fields: dressedState ? [dressedState] : [] },
      { title: '状态标签', fields: take(['status_tags']) },
      { title: '人际关系', fields: relations },
      { title: '身份信息', fields: [...identityRest, ...(longing ? [longing] : []), ...take(['world_tag', 'age', 'current_location', 'factions', 'force_positions'])] },
    ];
    if (aspirationFields.length) {
      groups.splice(groups.findIndex((group) => group.title === '身份信息') + 1, 0, {
        title: '人生目标',
        fields: aspirationFields,
        view: 'goals',
      });
    }
    if (this.shouldShowEssentialPreferenceSection(displayState)) {
      const anchor = groups.findIndex((group) => group.title === '人生取向');
      const at = anchor >= 0 ? anchor + 1 : groups.findIndex((group) => group.title === '身份信息') + 1;
      groups.splice(at < 0 ? groups.length : at, 0, {
        title: '本质偏好',
        fields: essentialPreferenceFields,
        view: 'essentialPreference',
      });
    }
    return this.placeProfileSection(groups, { title: intimacyUi.sectionTitle || '身体状态', fields: intimacyFields }, intimacyUi).filter((group) => group.fields.length || group.view === 'goals' || group.view === 'essentialPreference');
  },

  placeProfileSection(groups = [], section = {}, ui = {}) {
    if (!section.fields?.length || ui.hidden) return groups;
    const next = groups.slice();
    const after = ui.afterSection || '身份信息';
    const before = ui.beforeSection || '';
    const index = before ? next.findIndex((group) => group.title === before) : next.findIndex((group) => group.title === after);
    const at = index < 0 ? next.length : (before ? index : index + 1);
    next.splice(at, 0, section);
    return next;
  },

  intimacyBodyInitialized(state = {}) {
    const body = state.values?.bodyStatus;
    const intimacy = state.values?.intimacy;
    const bodyDone = body && typeof body === 'object' && Object.values(body).some((item) => item?.initializedByAi || item?.source === 'AI初始化');
    const intimacyDone = Boolean(intimacy?.initializedByAi || intimacy?.source === 'AI初始化');
    return Boolean(bodyDone || intimacyDone);
  },

  defaultIntimacyBodyFields(state = {}) {
    const template = window.GameModules.initDefaults?.intimacyBody || window.GameModules.initTemplateSources?.intimacyBody;
    const intimacy = template?.intimacy?.() || template?.intimacyDefaults || {};
    const bodyStatus = template?.bodyStatus?.() || template?.bodyStatusDefaults || {};
    const sexRows = Object.entries(template?.sexPartLabels || {}).map(([partKey, name]) => ({ partKey, name, count: 0, initialCount: 0, laterCount: 0, prompt: template?.sexPartPrompts?.[partKey] || template?.sexPartPrompts?.other || '', type: template?.fieldMeta?.sexualExperienceParts?.kind || '性经验分类', pendingAiInit: true }));
    const bodyRows = Object.values(bodyStatus || {}).map((item) => ({ ...item, name: item.part || item.partKey, type: template?.fieldMeta?.bodyStatus?.kind || '当前身体状态', pendingAiInit: true, reason: '尚未经过现实推演AI初始化；当前仅按模板占位显示。' }));
    const base = { templateKey: 'intimacyBody', stateId: state.id || '', worldTag: state.worldTag || state.profile?.work || '原创世界', targetType: state.profile?.isPlayer ? '非角色' : '角色', commonField: true, pendingAiInit: true, reason: '待AI初始化。' };
    const meta = template?.fieldMeta || {};
    return [
      { key: 'sexualStatus', ...base, ...(meta.sexualStatus || {}), value: `${intimacy.sexualStatus || '待AI判断'}｜模板占位，待AI初始化`, raw: intimacy.sexualStatus || '待AI判断' },
      { key: 'sexualPartnerCount', ...base, ...(meta.sexualPartnerCount || {}), value: `${Number(intimacy.sexualPartnerCount) || 0}人｜模板占位，待AI初始化`, raw: Number(intimacy.sexualPartnerCount) || 0 },
      { key: 'sexualPartners', ...base, ...(meta.sexualPartners || {}), value: [template?.displayTexts?.noPartner || '无', '模板占位，待AI初始化'], raw: [template?.displayTexts?.noPartner || '无'] },
      { key: 'sexualExperienceCount', ...base, ...(meta.sexualExperienceCount || {}), value: `${Number(intimacy.sexualExperienceCount) || 0}次｜模板占位，待AI初始化`, raw: Number(intimacy.sexualExperienceCount) || 0 },
      { key: 'sexualExperienceParts', ...base, ...(meta.sexualExperienceParts || {}), value: sexRows.map((item) => `${item.name}：0(初次见面) + 0 (后续次数)`), raw: sexRows },
      { key: 'bodyStatus', ...base, ...(meta.bodyStatus || {}), value: bodyRows.map((item) => template?.formatBodyStatus?.(item) || `${item.part || item.partKey}：${item.status || '--'}`), raw: bodyRows, desc: '身体状态尚未经过现实推演AI初始化；当前显示的是模板占位，不作为真实原始值。' },
    ];
  },

  profileLongingField(state = {}) {
    if (!state?.id || state.id === 'player-self') return null;
    const p = state.profile || {};
    const raw = state.values?.longing_to_player || {};
    const value = Math.max(0, Math.min(999, Number(raw.value) || 0));
    const updatedAt = Number(raw.updatedAt) || 0;
    const date = updatedAt ? new Date(updatedAt) : null;
    const time = date && Number.isFinite(date.getTime()) ? date.toLocaleString('zh-CN') : '尚未结算';
    return {
      key: 'longing_to_player', stateId: state.id, label: '思念度', kind: '关系状态', value: `${value.toFixed(1)}/100`, raw: value,
      desc: '角色对玩家的思念累积值；满100会在现实推演中触发一次思念事件。',
      reason: `${p.name || state.name || '该角色'}的思念度由现实推演间隔时间、好感度与随机系数结算累积；最近结算：${time}。`,
      worldTag: p.work || state.worldTag || '原创世界', targetType: '角色', commonField: true,
    };
  },

  profileNaturalStateField(state = {}) {
    const p = state?.profile || {};
    return this.profileBodyStateField(state, p.bodyProfile, {
      key: 'bodyProfile', label: '当前自然状态', kind: '身体原貌', type: '身体原貌',
      desc: '角色未经衣物遮掩、未作人工修饰时的原本身体状态。',
      reason: `${p.name || '该人物'}的自然状态来自角色卡 Part5 身体原貌生成结果。`,
    });
  },

  profileDressedStateField(state = {}) {
    const p = state?.profile || {};
    return this.profileBodyStateField(state, p.dressedProfile, {
      key: 'dressedProfile', label: '盛装', kind: '盛装状态', type: '盛装状态',
      desc: '角色盛装或打扮完全后各身体部位的造型、修饰与衣物包裹状态。',
      reason: `${p.name || '该人物'}的盛装状态来自角色卡 Part6 盛装状态生成结果。`,
    });
  },

  profileBodyStateField(state = {}, source = [], meta = {}) {
    const p = state?.profile || {};
    const list = Array.isArray(source) ? source : [];
    const rows = list.map((item, index) => {
      const part = String(item?.part || item?.部位 || '').trim();
      const description = String(item?.description || item?.部位描写 || '').trim();
      if (!part || !description) return null;
      return { index: Number(item?.index || item?.序号) || index + 1, part, description, name: part, type: meta.type };
    }).filter(Boolean).sort((a, b) => a.index - b.index);
    if (!rows.length) return null;
    return {
      key: meta.key, stateId: state?.id || '', label: meta.label, kind: meta.kind, value: rows.map((item) => `${item.part}：${item.description}`), raw: rows,
      desc: meta.desc, reason: meta.reason,
      worldTag: p.work || state?.worldTag || '原创世界', targetType: p.isPlayer ? '非角色' : '角色', commonField: true,
    };
  },

  lexiconKind(field, item = null) {
    if (item?.type) return item.type;
    if (field?.key && !item) return { knowledge: '知识树', skills: '技能树', professions: '职业树', factions: '社群角色', force_positions: '势力地位', items: '物品', wearing: '穿着', bodyProfile: '身体原貌', dressedProfile: '盛装状态', status_tags: '状态' }[field.key] || field.kind || '属性';
    if (field?.kind) return field.kind;
    return { factions: '社群角色', force_positions: '势力地位', items: '物品', wearing: '穿着', bodyProfile: '身体原貌', dressedProfile: '盛装状态', status_tags: '状态' }[field?.key] || '属性';
  },

  lexiconFor(field, item = null) {
    const worldTag = field?.worldTag || this.currentRpgState?.worldTag || this.character?.work || '原创世界';
    const kind = this.lexiconKind(field, item);
    const name = this.rpgItemName(item) || field?.label;
    return window.GameModules.rpgLexicon.get(worldTag, kind, name) || null;
  },

  fallbackDesc(field) {
    const worldTag = this.currentRpgState?.worldTag || this.character?.work || '';
    const attrs = window.GameModules.worldAttributes.defaults(worldTag);
    const sections = this.currentRpgState?.schema?.sections || window.GameModules.progression.schemaSections(attrs);
    const found = sections.flatMap((section) => section.fields || []).find((item) => item.key === field?.key)?.desc;
    return found || `${field?.label || '该词条'}用于记录可被剧情判定和成长系统引用的具体状态。`;
  },

  activeDetailState(field = null) {
    const id = field?.stateId || field?.ownerStateId || '';
    if (id && this.rpgStates?.[id]) return this.rpgStates[id];
    return this.identityTargetState?.() || this.currentRpgState || this.playerIdentityState?.() || null;
  },

  usableChangeReason(reason, blocked = []) {
    const text = String(reason || '').trim();
    if (/^错误：.*缺少AI给出的变化原因/.test(text)) return '';
    if (/性别：|年龄：|生日：|具体地址：|势力地位：|社群角色：|居住：|父母：|关系：|备注：|关系为.*备注为|居住在.*生活状态.*家庭状态/.test(text)) return '';
    if (/^(AI演算|系统结算|系统词条调整|用户主动)$/.test(text) || /词条说明|当前作用|用于记录|暂无详细说明/.test(text)) return '';
    if (/依据.*(当前值|上限|已落库|经验曲线)|当前为.*依据|被记录为当前|后续(获得|使用|消耗|转让|遗失|损坏|穿戴|由明确行动|状态变化)时会更新|当前属于.*词条/.test(text)) return '';
    return blocked.some((item) => item && text === String(item).trim()) ? '' : text;
  },

  fallbackBasis(field, obj = null, kind = '', name = '') {
    const state = this.activeDetailState?.(field) || this.currentRpgState || this.playerIdentityState?.() || null;
    const profile = state?.profile || {};
    const generated = window.GameModules.characterReasonFallback?.rpgReasons?.(profile, profile.worldAttributes || { fields: state?.schema?.sections?.find((section) => section.title === '世界固有属性')?.fields || [] }) || {};
    if (!obj && generated[field?.key]) return generated[field.key];
    const finalKind = kind || (obj ? this.lexiconKind(field, obj) : (field?.kind || this.lexiconKind(field)));
    const finalName = name || (obj ? this.rpgItemName(obj) : (field?.label || field?.key || '该词条'));
    if (obj && finalKind === '穿着') return `${profile.name || '该人物'}当前穿着为${finalName}，后续只有明确换装、脱下、破损或洗浴等事件才会更新。`;
    if (obj) return `${profile.name || '该人物'}持有${finalName}，是其${finalKind}、当前处境或既有生活经历的一部分，后续会随明确剧情事件更新。`;
    if (field?.source) return `${profile.name || '该人物'}的${finalName}由初始经历、等级成长、自由分配和非玩家成长共同形成。`;
    return `${profile.name || '该人物'}的${finalName}按其当前身份、处境、过去经历和可支配资源固化。`;
  },

  explicitFieldChangeReason(field, lexicon = null) {
    const state = this.activeDetailState(field), values = state?.values || {}, profile = state?.profile || {};
    const explicit = this.usableChangeReason(field?.reason || lexicon?.meta?.modifyReason, [lexicon?.description, lexicon?.summary, field?.desc]);
    if (explicit) return explicit;
    const aiReason = this.usableChangeReason(profile.rpgFieldReasons?.[field?.key] || profile.rpgFieldReasons?.[field?.label], [lexicon?.description, lexicon?.summary, field?.desc]);
    if (aiReason) return String(aiReason).slice(0, 120);
    if (field?.key === 'level' && values.level_growth?.history?.length) return values.level_growth.history.at(-1)?.reason || '';
    if (field?.key === 'level_growth' && values.level_growth?.history?.length) return values.level_growth.history.at(-1)?.reason || '';
    return '';
  },

  fieldChangeReason(field, lexicon = null) {
    return this.explicitFieldChangeReason(field, lexicon) || this.missingReasonText(field?.label || field?.key || '词条');
  },

  cleanDetailText(text = '') {
    return String(text || '').replace(/([：:])(?=(妹妹|姐姐|哥哥|弟弟|父亲|母亲|兄长|朋友|同学|同事)[：:])/g, '；');
  },

  pollutedDetailText(text = '') {
    const value = String(text || '').trim();
    return value.length > 90 || /变化方式|生成来源|词条名AI生成|值AI生成/.test(value) || /[：:](妹妹|姐姐|哥哥|弟弟|父亲|母亲|兄长)[：:]/.test(value);
  },

  itemChangeMode(obj = {}, lexicon = null) {
    const raw = String(lexicon?.changeMode || obj.changeMode || '').trim();
    if (obj?.type === '穿着' && obj?.source === 'AI生成') return 'AI生成';
    return raw && !this.pollutedDetailText(raw) && raw.length < 24 ? raw : '状态规范化';
  },

  itemBasis(field, obj = {}, kind = '', name = '') {
    const reason = this.itemChangeReason(field, obj, this.lexiconFor(field, obj));
    if ((kind || obj?.type) === '穿着' && reason && !/^错误：/.test(reason)) return reason;
    return this.fallbackBasis(field, obj, kind, name);
  },

  itemChangeReason(field, obj = {}, lexicon = null) {
    const raw = lexicon?.meta?.modifyReason || obj.reason || '';
    const cleaned = this.cleanDetailText(raw);
    const explicit = !this.pollutedDetailText(cleaned) ? this.usableChangeReason(cleaned, [lexicon?.description, lexicon?.summary, obj.description, obj.desc, obj.source, obj.changeMode]) : '';
    return explicit || window.GameModules.progression?.itemReason?.(obj, this.lexiconKind(field, obj)) || this.missingReasonText(this.rpgItemName(obj) || field?.label || '词条');
  },

  rpgItemName(item) {
    if (typeof item === 'string') return item;
    return item?.name || item?.part || (item?.force ? `${item.force} / ${item.position || '成员'}` : (item?.faction ? `${item.faction} / ${item.role || item.position || '成员'}` : '未命名'));
  },

  initUiRow(field, item = null) {
    const ui = field?.templateKey ? window.GameModules.initPromptRegistry?.uiFor?.(field.templateKey) : null;
    if (typeof ui?.row !== 'function') return null;
    return ui.row(field, item);
  },

  rpgItemSummary(item, field = null) {
    const row = field?.key === 'bodyStatus' ? this.initUiRow(field, item) : null;
    if (row) return `${row.name || row.field || '身体状态'}：${row.value || '--'}`;
    const name = this.rpgItemName(item);
    if (typeof item === 'string') return name;
    if (item?.type === '身体原貌' || item?.type === '盛装状态') return `${item.index || ''}.${item.part || name}`;
    if (item?.type === '性经验分类') return `${item.name || name}：${item.initialCount || 0}(初次见面) + ${item.laterCount || 0} (后续次数)`;
    if (item?.type === '当前身体状态') {
      const desc = item.description || item['描述状态'] || '';
      return `${item.part || name}：${item.status || '稳定'}${desc ? `｜${desc}` : ''}`;
    }
    const levelName = Number(item?.level) > 0 ? `${name} lv.${item.level}` : name;
    if (item?.type === '穿着' && item?.slot && item?.clothing_position) return `${item.clothing_position}｜${levelName}`;
    return levelName;
  },

  sexPartTemplate(defaults = null) {
    return defaults || window.GameModules.initDefaults?.intimacyBody || window.GameModules.initTemplateSources?.intimacyBody || {};
  },

  sexPartKey(obj = {}, defaults = null) {
    const template = this.sexPartTemplate(defaults);
    const prompts = template.sexPartPrompts || {}, labels = template.sexPartLabels || {};
    const names = [obj.partKey, obj.key, obj.name, obj.label, obj.value, obj.raw].map((x) => String(x || '').trim()).filter(Boolean);
    const direct = names.find((name) => prompts[name]);
    const byLabel = Object.entries(labels).find(([key, label]) => names.some((name) => name === label || name.includes(label) || label.includes(name) || name.includes(key)))?.[0];
    return direct || byLabel || 'other';
  },

  sexPartPrompt(obj = {}, defaults = null) {
    const template = this.sexPartTemplate(defaults);
    const key = this.sexPartKey(obj, template);
    return obj.prompt || template.sexPartPrompts?.[key] || template.sexPartPrompts?.other || '该分类暂无次数增加标准。';
  },

  learnedDefinition(kind, name, obj = {}, lexicon = null, info = {}) {
    const explicit = [info.description, lexicon?.description, obj.description, obj.desc, obj.source].find((x) => x && !/暂无|资料|当前作用/.test(String(x)));
    if (explicit) return explicit;
    if (name === '世界常识') return '对整个世界的认知程度，包括国家、文化风俗、社会规则、地理环境和日常常识。';
    if (name === '手机操作') return '能够使用智能手机完成通讯、检索、拍摄、设置、应用切换和信息处理等操作。';
    if (name === '现实观察' || name === '观察') return '通过细节、环境变化和他人反应判断局势的能力。';
    if (kind === '知识') return `对“${name}”这一知识领域的概念、规则、背景和应用范围的理解程度。`;
    if (kind === '职业') return `以“${name}”为核心的内化职业能力、经验与胜任资格；不等同当前雇佣单位或岗位，失业也不直接失去该职业。`;
    if (kind === '装备') return `装备词条，说明“${name}”的当前状态、效果、持有者、可调用方式和是否可穿戴。`;
    if (kind === '物品') return `物品词条，说明“${name}”的数量、用途、所在位置和消耗或转让条件。`;
    if (kind === '穿着') return `穿着词条，说明“${name}”占用的槽位、外观、状态和对现实行动的影响。`;
    if (kind === '社群角色' || kind === '阵营') {
      const community = obj.community || obj.faction || info.community || info.faction || name.split('/')[0]?.trim();
      const role = obj.role || info.role || obj.position || info.position || name.split('/')[1]?.trim() || '成员';
      return `社群：${community}；角色：${role}。该词条说明角色所属居住社区、家庭、社交圈或临时群体，以及其在其中承担的社会角色。`;
    }
    if (kind === '势力地位') {
      const force = obj.force || obj.faction || info.force || info.faction || name.split('/')[0]?.trim();
      const position = obj.position || info.position || name.split('/')[1]?.trim() || '成员';
      return `势力：${force}；地位：${position}。该词条说明角色在有层级制度势力中的等级、职级、年级或职位。`;
    }
    return `执行“${name}”相关行动时所需的理解、操作熟练度和稳定发挥能力。`;
  },

  rpgItemDetail(field, item) {
    const lexicon = this.lexiconFor(field, item);
    const obj = typeof item === 'string' ? { name: item, type: this.lexiconKind(field, item) } : item;
    const info = lexicon?.meta?.info || obj?.info || {};
    const exp = obj?.exp || {};
    const statName = { strength: '力量', agility: '敏捷', constitution: '体质', intelligence: '智力', perception: '感知', willpower: '意志', charisma: '魅力' };
    const linkedStats = (info.intrinsicStats || obj?.linkedStats || []).map((x) => statName[x] || x);
    const kind = field?.key === 'sexualExperienceParts' ? '性经验分类' : (obj?.type || this.lexiconKind(field, obj));
    const name = this.rpgItemName(obj) || field?.label || '未知';
    if (kind === '身体原貌' || kind === '盛装状态') return [`部位: ${name}`, `序号: ${obj.index || '未记录'}`, `所属世界: ${field?.worldTag || '公共'}`, `词条类型: ${field?.targetType || '角色'}`, `当前依据: ${field?.reason || (kind === '盛装状态' ? '来自角色卡 Part6 盛装状态生成结果。' : '来自角色卡 Part5 身体原貌生成结果。')}`].join('\n');
    if (kind === '性经验分类') {
      const defaults = window.GameModules.initDefaults?.intimacyBody;
      const partKey = this.sexPartKey(obj, defaults);
      return [`分类: ${obj.name || name}`, `字段: intimacy.sexualExperienceParts.${partKey}`, `次数: ${defaults?.formatExperienceSplit?.(obj) || ''}`, `初始化: ${obj.pendingAiInit ? '否，当前为模板占位，待AI初始化' : (field?.pendingAiInit ? '否，当前为模板占位，待AI初始化' : '按当前记录')}`, `次数增加标准: ${this.sexPartPrompt(obj, defaults)}`, `所属世界: ${field?.worldTag || defaults?.displayTexts?.publicWorld || '公共'}`].join('\n');
    }
    if (kind === '当前身体状态') {
      const uiRow = this.initUiRow(field, obj);
      const defaults = window.GameModules.initDefaults?.intimacyBody, text = defaults?.displayTexts || {}, values = defaults?.valueDefaults || {};
      const lines = [`部位: ${uiRow?.name || obj.part || name}`, `状态: ${obj.status || values.bodyStatus || ''}`, `初始化: ${obj.pendingAiInit ? '否，当前为模板占位，待AI初始化' : (obj.initializedByAi ? '是，已由AI初始化' : '未标记')}`, `初始见面: ${obj.initialMeeting || text.noRecord || ''}`, `描述状态: ${obj.description || text.noRecord || ''}`];
      if (Array.isArray(uiRow?.detailLines)) lines.push(...uiRow.detailLines);
      lines.push(`变化原因: ${obj.reason || text.currentRecord || ''}`, `更新时间: ${obj.updatedAt || text.noRecord || ''}`, `所属世界: ${field?.worldTag || text.publicWorld || '公共'}`);
      return lines.join('\n');
    }
    const hasLevel = Number(obj?.level) > 0;
    const lines = [`名称: ${name}`, `定义: ${this.learnedDefinition(kind, name, obj, lexicon, info)}`, `类型: ${kind}`, `所属世界: ${field?.worldTag || lexicon?.worldTag || '公共'}`, `词条类型: ${field?.targetType || lexicon?.meta?.targetType || '角色'}`];
    if (kind === '穿着' && (obj?.clothing_position || obj?.slotLabel)) lines.push(`穿戴位: ${obj.clothing_position || obj.slotLabel}`);
    if (kind === '穿着' && obj?.slot) lines.push(`槽位: ${obj.slot}`);
    if ((kind === '物品' || kind === '穿着' || kind === '装备') && (obj?.id || obj?.ownerId || obj?.characterId)) lines.push(`唯一ID: ${obj.id || '未记录'}`, `所属角色ID: ${obj.ownerId || obj.characterId || '未记录'}`);
    if ((kind === '社群角色' || kind === '阵营') && (obj?.community || obj?.faction || info.community || info.faction)) lines.push(`社群: ${obj.community || obj.faction || info.community || info.faction}`, `角色: ${obj.role || info.role || obj.position || info.position || '成员'}`);
    if (kind === '势力地位' && (obj?.force || obj?.faction || info.force || info.faction)) lines.push(`势力: ${obj.force || obj.faction || info.force || info.faction}`, `地位: ${obj.position || info.position || '成员'}`);
    if (hasLevel) {
      lines.push(`等级: lv${obj.level}`);
      lines.push(`当前等级含义: ${obj?.levelDescription || info.levelDescription || window.GameModules.progression.levelDescription(kind, obj.level)}`);
      lines.push(`完整等级含义: ${window.GameModules.progression.levelDescriptionList(kind)}`);
      lines.push(`等级效果: ${obj?.effect || info.effect || window.GameModules.progression.levelEffect(name, kind, obj.level)}`);
      lines.push(`经验值/升级所需经验值: ${exp.current || 0}/${exp.next || 'max'}`);
    }
    lines.push(`关联身内能力: ${linkedStats.join('、') || '无直接关联'}`);
    lines.push(`词条层级: ${lexicon?.hierarchy === 'tree' ? '树词条' : '叶子词条'}`);
    lines.push(`生成来源: 词条名${(lexicon?.nameAiGenerated ?? lexicon?.aiGenerated) ? 'AI生成' : '系统/用户给定'}，值${lexicon?.valueAiGenerated ? 'AI生成' : '系统/用户给定'}，变化方式${this.itemChangeMode(obj, lexicon)}`);
    lines.push(`变化原因: ${this.itemChangeReason(field, obj, lexicon)}`);
    lines.push(`当前依据: ${this.itemBasis(field, obj, kind, name)}`);
    if (obj?.type === '职业' && ((info.learnedAbilities || []).length || (info.worldAbilities || []).length)) lines.push(`职业关联: ${(info.learnedAbilities || []).concat(info.worldAbilities || []).join('、')}`);
    return lines.join('\n');
  },

  rpgFieldDetail(field) {
    const lexicon = this.lexiconFor(field);
    const rawValue = field?.key === 'current_location' && field?.raw && typeof field.raw === 'object'
      ? (window.GameModules.characterQuery?.locationText?.(field.raw) || [field.raw.name, field.raw.worldTag, field.raw.reason].filter(Boolean).join('｜'))
      : (Array.isArray(field?.value) ? field.value.join('、') : (field?.value ?? field?.raw ?? '未记录'));
    const lines = [`完整内容: ${rawValue || '未记录'}`, `说明: ${lexicon?.description || lexicon?.summary || field?.desc || this.fallbackDesc(field)}`];
    if (field?.key === 'current_location' && field?.raw && typeof field.raw === 'object') {
      if (field.raw.updatedAt) lines.push(`更新时间: ${field.raw.updatedAt}`);
      if (field.raw.reason && !String(rawValue || '').includes(field.raw.reason)) lines.push(`登记依据: ${field.raw.reason}`);
    }
    if (field?.pendingAiInit) lines.push('初始化: 否，当前为模板占位，待AI初始化');
    if (field && Object.prototype.hasOwnProperty.call(field, 'initialMeeting')) lines.push(`初始见面: ${Array.isArray(field.initialMeeting) ? field.initialMeeting.join('、') || '无' : field.initialMeeting}`);
    lines.push(`变化原因: ${this.fieldChangeReason(field, lexicon)}`);
    lines.push(`当前依据: ${this.fallbackBasis(field)}`);
    lines.push(`所属世界: ${field?.worldTag || lexicon?.worldTag || '公共'}`);
    lines.push(`字段范围: ${(field?.commonField ?? lexicon?.meta?.commonField) ? '公共字段' : '世界专属字段'}`);
    lines.push(`词条类型: ${field?.targetType || lexicon?.meta?.targetType || '角色'}`);
    lines.push(`层级: ${lexicon?.hierarchy === 'tree' ? '树词条' : '叶子词条'}`);
    lines.push(`词条名AI生成: ${(lexicon?.nameAiGenerated ?? lexicon?.aiGenerated) ? '是' : '否'}`);
    lines.push(`值AI生成: ${lexicon?.valueAiGenerated ? '是' : '否'}`);
    lines.push(`变化方式: ${lexicon?.changeMode || '系统结算'}`);
    if (lexicon?.promptInstruction) lines.push(`提示词说明: ${lexicon.promptInstruction}`);
    if (field?.source) lines.push(`来源: 初始值(${field.source.initial || 0}) + 等级值(${field.source.level || 0}) + 分配值(${field.source.allocated || 0}) + 非玩家成长(${field.source.npc || 0}) = ${field.raw || 0}`);
    if (field?.limit) lines.push(`限制: ${field.limit}`);
    if (field?.key === 'free_attribute_points') lines.push('用途: 可分配到力量、敏捷、体质、智力、感知、意志、魅力；每次真实升级获得1点。');
    if (field?.key === 'level_growth' && field.raw?.history?.length) lines.push(`最近升级: ${field.raw.history.map((x) => `${x.from}->${x.to} 自动${Object.entries(x.auto || {}).map(([k, v]) => `${k}+${v}`).join('/')} 自由+${x.free}`).join('；')}`);
    return lines.join('\n');
  },
};


;// ---- progression-combat.js ----
window.GameModules = window.GameModules || {};

Object.assign(window.GameModules.progression, {
  derived(values) {
    const level = Math.max(1, Number(values.level) || 1);
    const intelligence = Math.max(1, Number(values.intelligence) || 1);
    const attackPower = Math.round(level * 3 + intelligence * 2);
    const defensePower = Math.round(level * 2 + intelligence * 2);
    return { attackPower, defensePower, damageRuleNote: '攻击力=等级*3+智力*2；防御力=等级*2+智力*2。' };
  },

  defaultCombat(values) {
    const d = this.derived(values);
    return { summary: '尚未发生战斗，显示当前攻防预估。', attackPower: d.attackPower, defensePower: d.defensePower, effectiveDamage: 0 };
  },

  ensureProgressionNotes(values) {
    values.exp.curve = 'nextExp=round(100*level^1.65)';
    for (const item of [...(values.factions || []), ...(values.force_positions || []), ...(values.items || []), ...(values.wearing || []), ...(values.status_tags || [])]) {
      if (item && typeof item === 'object' && Object.prototype.hasOwnProperty.call(item, 'level')) item.level = -1;
    }
    for (const item of [...(values.knowledge || []), ...(values.skills || []), ...(values.professions || [])]) {
      item.description = this.learnedDefinition(item.name, item.type, item.description || item.source);
      item.source = item.description;
      if (!this.hasLearnedLevel(item)) {
        item.level = -1;
        delete item.exp;
        delete item.levelDescription;
        delete item.effect;
        continue;
      }
      const lv = this.clamp(item.level || 1, 1, 7);
      item.level = lv;
      item.exp = item.exp || { current: 0, next: this.learnedNext[lv] };
      item.levelDescription = item.levelDescription || this.levelDescription(item.type, lv);
      item.effect = item.effect || this.levelEffect(item.name, item.type, lv);
      item.exp.curve = 'lv1-7:100/250/600/1400/3200/7200/max';
    }
  },

  applySceneChanges(state, changes = {}, result = {}) {
    this.ensureStateMechanics(state);
    const v = state.values;
    this.addExp(v, 12 + (result.combatEvent ? 12 : 0), state.profile || {});
    if (Number.isFinite(changes.stamina)) this.deltaPool(v.stamina_pool, changes.stamina);
    if (Number.isFinite(changes.mental_stability)) this.deltaPool(v.mental_stability, changes.mental_stability);
    if (Number.isFinite(changes.health)) this.applyVitalityChange(v, changes.health, result.combatEvent);
    v.fatigue.current = this.clamp(v.fatigue.current + Math.max(0, -(changes.stamina || 0)), 0, v.fatigue.max);
    this.advanceLearned(v, result);
    v.derived = this.derived(v);
    this.ensureProgressionNotes(v);
    v.health = this.percent(v.vitality);
    v.stamina = this.percent(v.stamina_pool);
  },

  deltaPool(pool, percentDelta) {
    pool.current = this.clamp(pool.current + pool.max * percentDelta / 100, 0, pool.max);
  },

  advanceLearned(values, result) {
    const quality = result.combatEvent ? 1.4 : 1;
    const gain = Math.round(8 * (0.5 + (values.learning_ability || 50) / 100) * quality);
    for (const item of [...(values.knowledge || []).slice(0, 1), ...(values.skills || []).slice(0, 2)]) this.addLearnedExp(item, gain);
    for (const job of (values.professions || []).slice(0, 1)) this.addLearnedExp(job, Math.round(gain / 2));
  },

  addLearnedExp(item, amount) {
    if (!item || !this.hasLearnedLevel(item) || item.level >= 7) return;
    item.exp = item.exp || { current: 0, next: this.learnedNext[item.level || 1] };
    item.exp.current += amount;
    while (item.level < 7 && item.exp.current >= item.exp.next) {
      item.exp.current -= item.exp.next;
      item.level += 1;
      item.exp.next = this.learnedNext[item.level];
    }
  },

  applyVitalityChange(values, percentDelta, event) {
    if (percentDelta >= 0) { this.deltaPool(values.vitality, percentDelta); return; }
    const before = values.vitality.current;
    const baseDamage = Math.max(1, Math.round(values.vitality.max * Math.abs(percentDelta) / 100));
    const derived = this.derived(values);
    const attackPower = Math.max(1, Number(event?.attackPower) || derived.defensePower + baseDamage);
    const defensePower = Math.max(0, Number(event?.defensePower) || derived.defensePower);
    const effectiveDamage = Math.max(1, Number(event?.effectiveDamage) || Math.min(baseDamage, Math.max(1, attackPower - defensePower)));
    values.vitality.current = this.clamp(before - effectiveDamage, 0, values.vitality.max);
    values.combat_simulation = { summary: event?.summary || '外部威胁命中，生命力按攻防差扣减。', attackPower, defensePower, effectiveDamage, vitalityBefore: before, vitalityAfter: values.vitality.current };
  },

  addExp(values, amount, character = {}) {
    values.exp.current += Math.max(0, Math.round(amount));
    while (values.level < 100 && values.exp.current >= values.exp.next) {
      values.exp.current -= values.exp.next;
      this.applyLevelUp(values, character);
    }
  },

  applyLevelUp(values, character = {}) {
    const before = values.level;
    values.level += 1;
    values.exp.next = this.nextCharacterExp(values.level);
    this.ensureIntrinsicSources(values);
    const applied = this.applyAutoIntrinsicGrowth(values, character, 2, 'level');
    values.free_attribute_points = Math.max(0, Number(values.free_attribute_points) || 0) + 1;
    values.level_growth = values.level_growth || { totalLevelUps: 0, autoPointsPerLevel: 1, freePointsPerLevel: 1, history: [] };
    values.level_growth.totalLevelUps += 1;
    values.level_growth.history = [{ from: before, to: values.level, auto: applied, free: 1, at: new Date().toISOString() }, ...(values.level_growth.history || [])].slice(0, 10);
    this.recalculatePools(values, true, character);
  },

  applyAutoIntrinsicGrowth(values, character, points, bucket = 'level') {
    const keys = this.intrinsicKeys();
    const weights = this.growthWeights(character, values);
    const applied = {};
    for (let i = 0; i < points; i += 1) {
      const key = keys.filter((x) => values[x] < 100).sort((a, b) => (weights[b] - values[b] / 50) - (weights[a] - values[a] / 50))[0];
      if (!key) break;
      values[key] = this.clamp(values[key] + 1, 1, 100);
      values.intrinsic_sources[key][bucket] = (values.intrinsic_sources[key][bucket] || 0) + 1;
      applied[key] = (applied[key] || 0) + 1;
      weights[key] *= 0.72;
    }
    return applied;
  },

  growthWeights(character = {}, values = {}) {
    const text = `${character.role || ''}${character.job || ''}${character.detail || ''}${character.personality || ''}`;
    const w = { strength: 1, agility: 1, constitution: 1, intelligence: 1, perception: 1, willpower: 1, charisma: 1 };
    const add = (list, n) => list.forEach((k) => { w[k] += n; });
    if (/战|武|剑|骑士|士兵|军人|运动|拳|枪/.test(text)) add(['strength', 'agility', 'constitution'], 3);
    if (/学生|学者|医生|教师|魔术|研究|技术|工程/.test(text)) add(['intelligence', 'perception', 'willpower'], 3);
    if (/领袖|偶像|贵族|王|交涉|销售|主播|演员/.test(text)) add(['charisma', 'willpower', 'perception'], 3);
    for (const item of [...(values.skills || []), ...(values.knowledge || []), ...(values.professions || [])]) add((item.linkedStats || []).filter((k) => w[k] !== undefined), 1.2);
    return w;
  },
});


;// ---- rpg-initializer.js ----
/**
 * RPG 初始数值推导：结合人物资料、当前状态、进入时机和世界固有属性。
 */
window.GameModules = window.GameModules || {};

window.GameModules.rpgInitializer = {
  context(store, character) {
    const profile = store?.characterProfiles?.[character.id]?.summary || '';
    return [
      character.name, character.role, character.job, character.rank,
      character.personality, character.detail, profile,
      store?.entryTimeLabel?.(), store?.entryCurrentAction,
      store?.quest, store?.selectedWork || character.work,
    ].filter(Boolean).join(' ');
  },

  infer(character, store, seed) {
    const text = this.context(store, character);
    const minor = character.importance === 'minor' || character.isMinor;
    const levelBase = minor ? 1 : this.has(text, /英灵|从者|Servant|王|顶级|高手|精英/) ? 12 : this.has(text, /魔术师|骑士|战士|军人|杀手|教师|医生|学者/) ? 7 : 4;
    return {
      text,
      level: this.clamp(levelBase + (seed % 4) - (this.has(text, /幼|儿童|小学生|病弱|囚禁|受害/) ? 2 : 0), 1, 100),
      danger: this.score(text, [/战斗|追杀|逃亡|圣杯战争|危险|地下室|囚禁|虫|受伤|失控/, /准备|潜伏|调查|监视/]),
      trauma: this.score(text, [/虐|虫|囚|牺牲|受害|孤|恐惧|崩溃|病弱/, /间桐|樱|实验|改造/]),
      mage: this.score(text, [/魔术|魔力|回路|刻印|圣杯|御主|术式|型月/, /研究|地下室|仪式/]),
      fighter: this.score(text, [/剑|枪|弓|拳|战斗|骑士|军人|杀手|从者|英灵/, /训练|准备|警戒/]),
      scholar: this.score(text, [/学者|教师|医生|研究|学习|分析|书|知识/, /准备|调查/]),
      leader: this.score(text, [/王|领袖|队长|贵族|公主|皇帝|高傲|统率/, /指挥|支配/]),
      weak: this.score(text, [/幼|小|病弱|虚弱|受伤|囚禁|疲惫|饥饿/, /地下室|虫/]),
    };
  },

  apply(values, character, store, seed, attrs) {
    const ctx = this.infer(character, store, seed);
    if (character.rpgField) {
      this.applyRoleCardRpg(values, character);
    } else {
      values.level = ctx.level;
      values.strength = this.clamp(values.strength + ctx.fighter - ctx.weak, 1, 100);
      values.agility = this.clamp(values.agility + Math.floor(ctx.fighter / 2) - Math.floor(ctx.weak / 2), 1, 100);
      values.constitution = this.clamp(values.constitution + ctx.fighter - ctx.trauma - ctx.weak, 1, 100);
      values.intelligence = this.clamp(values.intelligence + ctx.mage + ctx.scholar, 1, 100);
      values.perception = this.clamp(values.perception + ctx.danger + Math.floor(ctx.scholar / 2), 1, 100);
      values.willpower = this.clamp(values.willpower + ctx.leader + ctx.trauma - Math.floor(ctx.weak / 2), 1, 100);
      values.charisma = this.clamp(values.charisma + ctx.leader - Math.floor(ctx.trauma / 2), 1, 100);
      values.learning_ability = this.clamp(values.learning_ability + ctx.scholar + ctx.mage, 0, 100);
      values.growth_potential = this.clamp(values.growth_potential + (ctx.weak ? 8 : 0) - Math.floor(values.level / 8), 0, 100);
    }
    values.exp = window.GameModules.progression.normalizeCharacterExp(values.exp, values.level);
    this.applyPools(values, ctx);
    if (character.rpgField && character.mentalStability?.value !== undefined) values.mental_stability = window.GameModules.progression.pool(character.mentalStability.value, Math.max(character.mentalStability.value, 100));
    this.applyWorld(values, attrs, ctx, seed);
    values.initial_context = this.summary(character, store, ctx);
    return values;
  },

  applyRoleCardRpg(values, character) {
    const rpg = character.rpgField || {};
    const keys = ['strength', 'agility', 'constitution', 'intelligence', 'perception', 'willpower', 'charisma'];
    values.level = this.clamp(rpg.level?.value ?? values.level, 1, 100);
    keys.forEach((key) => { values[key] = this.clamp(rpg.intrinsicBase?.[key]?.value ?? values[key], 1, 100); });
    if (character.learningAbility?.value !== undefined) values.learning_ability = this.clamp(character.learningAbility.value, 0, 100);
    if (character.growthPotential?.value !== undefined) values.growth_potential = this.clamp(character.growthPotential.value, 0, 100);
  },

  applyPools(values, ctx) {
    const hpMax = Math.max(1, values.level * 10 + values.constitution * 8);
    const spMax = Math.max(1, values.level * 8 + values.constitution * 5 + ctx.fighter * 3);
    const mentalMax = Math.max(1, 70 + values.willpower * 4);
    const hpRatio = this.clamp(100 - ctx.weak * 6 - ctx.danger * 2, 20, 100) / 100;
    const spRatio = this.clamp(88 - ctx.weak * 5 - ctx.danger * 3, 15, 100) / 100;
    const mentalRatio = this.clamp(82 - ctx.trauma * 7 - ctx.danger * 4, 10, 100) / 100;
    values.vitality = window.GameModules.progression.pool(hpMax * hpRatio, hpMax);
    values.stamina_pool = window.GameModules.progression.pool(spMax * spRatio, spMax);
    values.mental_stability = window.GameModules.progression.pool(mentalMax * mentalRatio, mentalMax);
    values.fatigue = window.GameModules.progression.pool(this.clamp(ctx.weak * 10 + ctx.danger * 5, 0, 100), 100);
  },

  applyWorld(values, attrs, ctx, seed) {
    for (const field of attrs?.fields || []) {
      if (field.key === 'magic_circuit_quality') values[field.key] = this.clamp(20 + ctx.mage * 18 + seed % 16, 0, 100);
      else if (field.key === 'magic_circuit_quantity') values[field.key] = this.clamp(18 + ctx.mage * 16 + seed % 18, 0, 100);
      else if (field.key === 'mana_capacity') values[field.key] = this.clamp(20 + ctx.mage * 14 + values.willpower * 2, 0, 100);
      else if (field.key === 'magic_attribute') values[field.key] = this.magicAttributes(ctx.text);
      else if (field.key === 'magic_trait') values[field.key] = this.magicTraits(ctx.text);
      else if (field.key === 'origin') values[field.key] = this.origins(ctx.text);
      else if (field.key === 'mystery_affinity') values[field.key] = this.clamp(15 + ctx.mage * 15 + ctx.trauma * 4, 0, 100);
      else if (field.key === 'magic_crest_affinity') values[field.key] = this.clamp(12 + ctx.mage * 12 - ctx.weak * 3 + seed % 20, 0, 100);
    }
  },

  updateExisting(state, character, store, seed) {
    const ctx = this.infer(character, store, seed);
    const elapsed = this.elapsedSeconds(state.values?.updatedGameTimeValue, store);
    const scale = elapsed > 0 ? Math.min(1, Math.max(0.08, elapsed / 86400)) : 0;
    const v = state.values;
    if (scale > 0) {
      this.driftPool(v.vitality, (ctx.weak ? -ctx.weak : 1) * scale);
      this.driftPool(v.stamina_pool, (1 - ctx.danger - ctx.weak) * scale);
      this.driftPool(v.mental_stability, (1 - ctx.trauma - ctx.danger) * scale);
      v.fatigue = window.GameModules.progression.pool(this.clamp((v.fatigue?.current || 0) + (ctx.danger + ctx.weak) * 3 * scale, 0, 100), 100);
      this.applyNpcGrowth(v, character, ctx, scale);
    }
    v.health = window.GameModules.progression.percent(v.vitality);
    v.stamina = window.GameModules.progression.percent(v.stamina_pool);
    v.current_context = this.summary(character, store, ctx, elapsed);
    this.touch(v, store);
    return true;
  },

  touch(values, store) {
    values.updatedAt = new Date().toISOString();
    values.updatedGameTime = store?.entryTimeLabel?.() || '时间未知';
    values.updatedGameTimeValue = window.GameModules.characterMemory?.timeValue?.(store?.entryTime) || null;
  },

  elapsedSeconds(prev, store) {
    const now = window.GameModules.characterMemory?.timeValue?.(store?.entryTime);
    if (!prev || !now) return 0;
    const a = new Date(prev.year, prev.month - 1, prev.day, prev.hour, prev.minute, prev.second);
    const b = new Date(now.year, now.month - 1, now.day, now.hour, now.minute, now.second);
    return Math.max(0, Math.round((b - a) / 1000));
  },

  driftPool(pool, delta) {
    if (!pool?.max) return;
    pool.current = this.clamp(pool.current + delta, 0, pool.max);
  },

  applyNpcGrowth(values, character, ctx, scale) {
    if (character?.isPlayer || values.level_growth?.playerControlled) return;
    const effort = ctx.fighter + ctx.mage + ctx.scholar + ctx.leader + ctx.danger;
    const points = Math.min(2, Math.floor(scale * Math.max(0, effort) / 6));
    if (points <= 0) return;
    window.GameModules.progression.ensureIntrinsicSources(values);
    const applied = window.GameModules.progression.applyAutoIntrinsicGrowth(values, character, points, 'npc');
    values.npc_growth = { at: new Date().toISOString(), reason: `时间流逝与努力方向：战斗${ctx.fighter}/魔术${ctx.mage}/学习${ctx.scholar}/领导${ctx.leader}/压力${ctx.danger}`, applied };
    window.GameModules.progression.recalculatePools(values, true, character);
  },

  summary(character, store, ctx, elapsed = 0) {
    const gap = elapsed ? `距上次更新约${elapsed}秒。` : '';
    return `基于${character.name}的人物资料、${store?.entryTimeLabel?.() || '未知时间'}、当前行动“${store?.entryCurrentAction || '未知'}”推导。${gap}危险${ctx.danger}，创伤${ctx.trauma}，魔术${ctx.mage}，战斗${ctx.fighter}。`;
  },

  magicAttributes(text) {
    if (/樱|影|虚|暗|虫|间桐/.test(text)) return ['虚', '影'];
    if (/火|爆|炎/.test(text)) return ['火'];
    if (/水|治愈|医/.test(text)) return ['水'];
    if (/风|弓|速/.test(text)) return ['风'];
    return /魔术|型月|圣杯/.test(text) ? ['地', '水'] : [];
  },

  magicTraits(text) {
    if (/虫|间桐|吸收|束缚/.test(text)) return ['吸收', '束缚'];
    if (/投影|复制|剑/.test(text)) return ['投影'];
    if (/治愈|保护/.test(text)) return ['修复'];
    return /魔术|术式/.test(text) ? ['转换'] : [];
  },

  origins(text) {
    if (/樱|牺牲|囚|受害/.test(text)) return ['承受'];
    if (/王|支配|统治/.test(text)) return ['支配'];
    if (/杀|复仇|愤怒/.test(text)) return ['破坏'];
    return [];
  },

  score(text, patterns) {
    return patterns.reduce((sum, pattern) => sum + (this.has(text, pattern) ? 2 : 0), 0);
  },

  has(text, pattern) { return pattern.test(String(text || '')); },
  clamp(value, min, max) { return Math.max(min, Math.min(max, Math.round(Number(value) || 0))); },
};


;// ---- rpg-profile-metrics.js ----
window.GameModules = window.GameModules || {};

window.GameModules.rpgProfileMetrics = {
  apply(state, profile) {
    const source = profile?.initialMetrics;
    const signature = profile?.roleCardInputSignature || profile?.roleCardUpdatedAt || '';
    if (!state || state.id === 'player-self' || !source) return false;
    if (state.metrics?.profileInitialApplied && state.metrics.profileInitialSignature === signature) return false;
    const before = JSON.stringify(state.metrics || {});
    state.metrics = state.metrics || {};
    state.metrics.emotions = state.metrics.emotions || {};
    state.metrics.playerFeelings = state.metrics.playerFeelings || {};
    state.metrics.notes = state.metrics.notes || {};
    this.applyGroup(state.metrics.emotions, source.emotions, window.GameModules.metrics.emotionKeys, state.metrics.notes, 'emotion');
    this.applyGroup(state.metrics.playerFeelings, source.playerFeelings, window.GameModules.metrics.playerKeys, state.metrics.notes, 'player');
    state.metrics.profileInitialApplied = true;
    state.metrics.profileInitialSignature = profile.roleCardInputSignature || profile.roleCardUpdatedAt || '';
    return before !== JSON.stringify(state.metrics);
  },
  rebase(state, profile, previousProfile = {}) {
    const source = profile?.initialMetrics;
    if (!state || state.id === 'player-self' || !source) return false;
    if (!state.metrics?.profileInitialApplied) return this.apply(state, profile);
    const before = JSON.stringify(state.metrics || {}), fresh = window.GameModules.metrics.fresh();
    state.metrics = state.metrics || {};
    state.metrics.emotions = window.GameModules.metrics.fill(state.metrics.emotions, window.GameModules.metrics.emotionKeys, fresh.emotions);
    state.metrics.playerFeelings = window.GameModules.metrics.fill(state.metrics.playerFeelings, window.GameModules.metrics.playerKeys, fresh.playerFeelings);
    state.metrics.notes = state.metrics.notes || {};
    this.rebaseGroup(state.metrics.emotions, source.emotions, previousProfile.initialMetrics?.emotions, window.GameModules.metrics.emotionKeys, state.metrics.notes, 'emotion', fresh.emotions);
    this.rebaseGroup(state.metrics.playerFeelings, source.playerFeelings, previousProfile.initialMetrics?.playerFeelings, window.GameModules.metrics.playerKeys, state.metrics.notes, 'player', fresh.playerFeelings);
    state.metrics.profileInitialSignature = profile.roleCardInputSignature || profile.roleCardUpdatedAt || '';
    return before !== JSON.stringify(state.metrics);
  },
  applyGroup(target, list, keys, notes, type) {
    if (!Array.isArray(list)) return;
    list.forEach((item) => {
      if (!keys.includes(item?.key)) return;
      const value = window.GameModules.metrics.clamp(item.value);
      window.GameModules.metrics.writeMetric(target, notes, type, item, value, '根据角色性格、经历、关系事件与玩家互动倾向形成。');
    });
  },
  rebaseGroup(target, list, oldList, keys, notes, type, defaults) {
    if (!Array.isArray(list)) return;
    const oldMap = new Map(Array.isArray(oldList) ? oldList.map((item) => [item?.key, window.GameModules.metrics.clamp(item?.value)]) : []);
    list.forEach((item) => {
      if (!keys.includes(item?.key)) return;
      const value = window.GameModules.metrics.clamp(item.value);
      const current = window.GameModules.metrics.clamp(target[item.key]);
      const base = oldMap.has(item.key) ? oldMap.get(item.key) : window.GameModules.metrics.clamp(defaults?.[item.key]);
      if (current !== base) return;
      window.GameModules.metrics.writeMetric(target, notes, type, item, value, '根据角色资料变化、关系事件与玩家互动倾向重新形成。');
    });
  },

  refreshGenericNotes(state, profile) {
    const metrics = window.GameModules.metrics;
    const source = profile?.initialMetrics;
    if (!state?.metrics?.notes || !source) return false;
    const before = JSON.stringify(state.metrics.notes || {});
    const refresh = (items, values, group) => (Array.isArray(items) ? items : []).forEach((item) => {
      if (!item?.key) return;
      const noteKey = `${group}:${item.key}`;
      const note = state.metrics.notes[noteKey];
      if (!note || !metrics.isGenericMetricStatus(note.status, item.key)) return;
      const rawStatus = String(item.status || '').trim();
      if (!rawStatus || metrics.isGenericMetricStatus(rawStatus, item.key)) return;
      const value = metrics.clamp(values?.[item.key] ?? item.value);
      metrics.writeMetric(values, state.metrics.notes, group, { ...item, value }, value, note.reason || '根据角色性格、经历、关系事件与玩家互动倾向形成。');
    });
    refresh(source.emotions, state.metrics.emotions, 'emotion');
    refresh(source.playerFeelings, state.metrics.playerFeelings, 'player');
    return before !== JSON.stringify(state.metrics.notes || {});
  },
};


;// ---- rpg-age.js ----
window.GameModules = window.GameModules || {};

window.GameModules.rpgAge = {
  sync(values, character, store = null) {
    if (!values) return false;
    const age = this.forCharacter(character, store);
    const changed = values.age !== age || values.age_label !== `${age}岁`;
    values.age = age;
    values.age_label = `${age}岁`;
    return changed;
  },

  forCharacter(character, store = null) {
    const directAge = character?.age && typeof character.age === 'object' && character.age.value !== undefined ? character.age.value : character?.age;
    if (directAge !== undefined && directAge !== null && String(directAge).trim()) {
      const parsed = parseInt(String(directAge), 10);
      if (Number.isFinite(parsed)) return this.clamp(parsed, 0, 999);
    }
    const isCurrent = character?.id && character.id === store?.character?.id;
    if (isCurrent) {
      const age = parseInt(String(store?.characterAge || ''), 10);
      if (Number.isFinite(age)) return this.clamp(age, 0, 999);
    }
    const text = [character?.role, character?.relationships, character?.detail, character?.personality].filter(Boolean).join(' ');
    const explicit = String(text).match(/(\d{1,3})\s*岁/);
    if (explicit) return this.clamp(Number(explicit[1]), 0, 999);
    return this.clamp(this.seed(`${character?.name || ''}${character?.role || ''}${character?.detail || ''}`) % 60 + 18, 0, 999);
  },

  seed(text) {
    return [...String(text)].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  },

  clamp(value, min, max) {
    return Math.max(min, Math.min(max, Math.round(Number(value) || 0)));
  },
};


;// ---- init/intimacy-body-init-template.js ----
window.GameModules = window.GameModules || {};
window.GameModules.initDefaults = window.GameModules.initDefaults || {};
window.GameModules.initTemplateSources = window.GameModules.initTemplateSources || {};

const intimacyBodySexParts = {
  genital: 0, chest: 0, lips: 0, mouth: 0, oralAction: 0, oralSex: 0, oralInternalFinish: 0,
  genitalEntry: 0, vaginalInsertion: 0, vaginalInternalFinish: 0, anus: 0, analEntry: 0,
  analSex: 0, analInternalFinish: 0, legs: 0, hips: 0, hands: 0, skin: 0, other: 0,
};

// ---- 色情化、露骨化描述（完全符合处女初始状态） ----
const intimacyBodyDescriptions = {
  overall: '整体娇躯柔嫩，肌肤光洁如脂，散发着处子特有的幽香，曲线玲珑，未经人事的痕迹一览无余。',
  mouth: '双唇柔软丰润，口腔内壁温热潮红，舌苔洁净，未有异物深入过的青涩感。',
  chest: '双乳挺拔饱满，乳晕粉嫩如樱，乳头小巧微翘，从未被吮吸或揉捏，敏感而稚嫩。',
  genital: '阴部闭合完美，大阴唇紧致合拢，小阴唇粉嫩隐蔽，处女膜完整无缺，未经任何阴茎或器物侵入，颜色呈淡粉，褶皱细密，未经开发的圣洁之域。',
  anus: '肛口紧致收缩，周围肌肤平滑浅粉，无任何扩张或摩擦痕迹，从未被进入。',
  hips: '臀部圆润挺翘，臀瓣紧实，肌肤细腻，无任何抓痕或拍打印记。',
  limbs: '四肢修长匀称，关节柔韧，皮肤光滑，未因性事留下任何青紫或疲劳。',
  skin: '全身皮肤白嫩如脂，触感丝滑，无吻痕、齿印或精斑，尽显处女之洁净。',
  other: '身体其他部位均保持天然状态，无性爱留下的任何印记。',
};

const intimacyBodyTemplate = {
  id: 'intimacy-body',
  title: '亲密与身体状态初始化模板（色情化版）',

  partLabels: { overall: '整体', mouth: '口部', chest: '胸部', genital: '阴部', anus: '肛部', hips: '臀部', limbs: '四肢', skin: '皮肤', other: '其他' },

  sexPartLabels: {
    genital: '阴部次数', chest: '胸部次数', lips: '嘴唇次数', mouth: '口部次数', oralAction: '口部行为次数',
    oralSex: '口交次数', oralInternalFinish: '口交中出次数', genitalEntry: '阴部进入次数', vaginalInsertion: '阴部插入次数',
    vaginalInternalFinish: '阴部中出次数', anus: '肛门次数', analEntry: '肛部进入次数', analSex: '肛交次数',
    analInternalFinish: '肛交中出次数', legs: '腿部次数', hips: '臀部次数', hands: '手部次数', skin: '皮肤接触次数', other: '其他次数',
  },

  sexPartPrompts: {
    genital: '仅当正文明确发生对阴部的性接触、刺激、暴露检查或与性行为直接相关的处置时增加；普通视线、普通洗浴、日常衣物摩擦不计。',
    chest: '仅当正文明确发生对胸部的性接触、刺激、揉压、亲吻或与性行为直接相关的处置时增加；普通穿衣、碰撞或医疗外观检查不计。',
    lips: '仅当正文明确发生带亲密或性意味的接吻、舔吻、吮吻等唇部接触时增加；普通说话、进食、无亲密意味的触碰不计。',
    mouth: '仅当正文明确发生口腔被用于亲密、性接触、含入口腔或明显性意味的口部互动时增加；普通饮食、说话、刷牙不计。',
    oralAction: '仅当正文明确发生由口部主动参与的性行为或性服务行为时增加；单纯接吻不计入此项，可计入嘴唇次数。',
    oralSex: '仅当正文明确发生口部与对方性器官之间的性行为时增加；暗示、未完成尝试或普通亲吻不计。',
    oralInternalFinish: '仅当正文明确发生口部性行为并伴随射入口腔、吞咽或口内结束事实时增加；外部结束或模糊暗示不计。',
    genitalEntry: '仅当正文明确发生阴部被进入这一事实时增加；外部摩擦、触碰、未进入尝试不计。',
    vaginalInsertion: '仅当正文明确发生阴道插入行为时增加；外部接触、器械检查或未进入不计。',
    vaginalInternalFinish: '仅当正文明确发生阴道插入并伴随体内结束事实时增加；外部结束或模糊暗示不计。',
    anus: '仅当正文明确发生肛部性接触、刺激、扩张、检查或与性行为直接相关的处置时增加；普通如厕、清洁不计。',
    analEntry: '仅当正文明确发生肛部被进入这一事实时增加；外部接触或未进入尝试不计。',
    analSex: '仅当正文明确发生肛交行为时增加；肛部外部刺激或准备动作不计入此项。',
    analInternalFinish: '仅当正文明确发生肛交并伴随体内结束事实时增加；外部结束或模糊暗示不计。',
    legs: '仅当正文明确发生腿部参与性接触、夹压、摩擦、束缚或带性意味的抚触时增加；普通行走、跌倒、换衣不计。',
    hips: '仅当正文明确发生臀部参与性接触、拍打、揉捏、摩擦或带性意味的暴露时增加；普通坐下、碰撞不计。',
    hands: '仅当正文明确发生手部主动或被动参与性接触、抚摸、刺激、抓握等行为时增加；普通握手、拿取物品不计。',
    skin: '仅当正文明确发生大面积肌肤亲密接触、裸露贴合、性意味抚触或留下性痕迹时增加；普通擦肩、医疗清洁不计。',
    other: '仅当正文存在明确性经历事实但不属于以上分类时增加；不得用来记录模糊暗示、心理想象或未发生行为。',
  },

  bodyDescriptions: intimacyBodyDescriptions,  // 使用新描述

  valueDefaults: {
    sexualStatus: '处女', sexualStatusChanged: '非处女', sexualPartnerCount: 0, sexualPartners: [],
    sexualExperienceCount: 0, sexualExperiencePartCount: 0, updatedAt: '', intimacyReason: '默认未记录',
    bodyStatus: '稳定', bodyDescription: '身体状态稳定，无性经历痕迹', bodyReason: '初始处女状态', empty: '--',
  },

  displayTexts: {
    noPartner: '无', noRecord: '未记录', currentRecord: '当前记录。',
    publicWorld: '公共', otherPart: '其他', statusChange: '状态变化',
  },

  sexualExperiencePartDefaults: intimacyBodySexParts,
  sexualHistoryDefaults: { sexualStatus: '处女', sexualPartnerCount: 0, sexualPartners: [] },

  intimacyDefaults: {
    sexualStatus: '处女', sexualPartnerCount: 0, sexualPartners: [], sexualExperienceCount: 0,
    sexualExperienceParts: intimacyBodySexParts, updatedAt: '', reason: '默认处女状态，未经任何性行为',
  },

  bodyStatusDefaults: {
    overall: { partKey: 'overall', part: '整体', status: '稳定', description: intimacyBodyDescriptions.overall, reason: '初始处女身体状态', updatedAt: '' },
    mouth: { partKey: 'mouth', part: '口部', status: '稳定', description: intimacyBodyDescriptions.mouth, reason: '初始处女身体状态', updatedAt: '' },
    chest: { partKey: 'chest', part: '胸部', status: '稳定', description: intimacyBodyDescriptions.chest, reason: '初始处女身体状态', updatedAt: '' },
    genital: { partKey: 'genital', part: '阴部', status: '稳定', description: intimacyBodyDescriptions.genital, reason: '初始处女身体状态', updatedAt: '' },
    anus: { partKey: 'anus', part: '肛部', status: '稳定', description: intimacyBodyDescriptions.anus, reason: '初始处女身体状态', updatedAt: '' },
    hips: { partKey: 'hips', part: '臀部', status: '稳定', description: intimacyBodyDescriptions.hips, reason: '初始处女身体状态', updatedAt: '' },
    limbs: { partKey: 'limbs', part: '四肢', status: '稳定', description: intimacyBodyDescriptions.limbs, reason: '初始处女身体状态', updatedAt: '' },
    skin: { partKey: 'skin', part: '皮肤', status: '稳定', description: intimacyBodyDescriptions.skin, reason: '初始处女身体状态', updatedAt: '' },
    other: { partKey: 'other', part: '其他', status: '稳定', description: intimacyBodyDescriptions.other, reason: '初始处女身体状态', updatedAt: '' },
  },

  fieldMeta: {
    sexualStatus: { label: '当前状态', kind: '性经历', desc: '亲密经历当前状态（初始为处女）。', reasonFallback: '默认处女。' },
    sexualPartnerCount: { label: '经历人数', kind: '性经历', unit: '人', desc: '发生性关系的对象总数。', reasonFallback: '默认0人。' },
    sexualPartners: { label: '经历人列表', kind: '性经历', desc: '已计入经历的具体对象。', reasonFallback: '默认空。' },
    sexualExperienceCount: { label: '性经验总次数', kind: '角色卡', unit: '次', desc: '所有类型性行为的总次数。', reasonFallback: '默认0次。' },
    sexualExperienceParts: { label: '性经验分类次数', kind: '性经验分类', desc: '按部位细分的性行为次数。', reasonFallback: '默认全0。' },
    bodyStatus: { label: '当前身体状态', kind: '当前身体状态', desc: '身体各部位的状态描述（色情化）。', reasonFallback: '初始处女状态描述。' },
  },

  stateDefaults: [
    { key: 'intimacy', path: 'intimacy', factory: 'intimacy' },
    { key: 'bodyStatus', path: 'bodyStatus', factory: 'bodyStatus' },
  ],

  uiFieldDefs: [
    { key: 'sexualStatus', meta: 'sexualStatus', path: 'intimacy.sexualStatus', initialPath: 'sexualStatus' },
    { key: 'sexualPartnerCount', meta: 'sexualPartnerCount', path: 'intimacy.sexualPartnerCount', initialPath: 'sexualPartnerCount', display: 'count', unit: '人' },
    { key: 'sexualPartners', meta: 'sexualPartners', path: 'intimacy.sexualPartners', initialPath: 'sexualPartners', display: 'list', emptyText: 'noPartner' },
    { key: 'sexualExperienceCount', meta: 'sexualExperienceCount', path: 'intimacy.sexualExperienceCount', initialPath: 'sexualExperienceCount', display: 'count', unit: '次' },
    { key: 'sexualExperienceParts', meta: 'sexualExperienceParts', path: 'intimacy.sexualExperienceParts', initialPath: 'sexualExperienceParts', display: 'sexPartRows', labels: 'sexPartLabels' },
    { key: 'bodyStatus', meta: 'bodyStatus', path: 'bodyStatus', initialPath: 'bodyStatus', display: 'bodyStatusRows', labels: 'partLabels' },
  ],

  formatPartnerCount(value) { return `${value}${this.fieldMeta.sexualPartnerCount.unit}`; },
  formatExperienceCount(value) { return `${value}${this.fieldMeta.sexualExperienceCount.unit}`; },
  formatExperienceSplit(item) { return `${item.name}：${item.initialCount}(初次见面) + ${item.laterCount} (后续次数)`; },
  formatInitialExperience(item) { return `${item.name}：${item.count}${this.fieldMeta.sexualExperienceCount.unit}`; },
  formatBodyStatus(item) { return `${item.part}：${item.status}`; },
  formatInitialBody(item) { return `${item.part}：${item.status}｜${item.description}`; },
  clone(value) { return JSON.parse(JSON.stringify(value ?? null)); },
  bodyStatusEntry(key) { return this.clone(this.bodyStatusDefaults[key] || this.bodyStatusDefaults.other); },
  bodyStatus() { return this.clone(this.bodyStatusDefaults); },
  sexualExperienceParts() { return this.clone(this.sexualExperiencePartDefaults); },
  intimacy() { return this.clone(this.intimacyDefaults); },
  initialMeeting() {
    const intimacy = this.intimacy();
    return { sexualStatus: intimacy.sexualStatus, sexualPartnerCount: intimacy.sexualPartnerCount, sexualPartners: this.displayTexts.noPartner, sexualExperienceCount: intimacy.sexualExperienceCount, sexualExperienceParts: this.sexualExperienceParts(), bodyStatus: this.bodyStatus() };
  },

  defaults() { return this; },
  fields() {
    return {
      partLabels: { defaultValue: this.clone(this.partLabels), meaning: '身体状态部位键与中文显示名。' },
      sexPartLabels: { defaultValue: this.clone(this.sexPartLabels), meaning: '性经验分类键与中文显示名。' },
      sexPartPrompts: { defaultValue: this.clone(this.sexPartPrompts), meaning: '每个性经验分类的次数增加标准。' },
      bodyDescriptions: { defaultValue: this.clone(this.bodyDescriptions), meaning: '每个身体部位的色情化处女状态描述。' },
      valueDefaults: { defaultValue: this.clone(this.valueDefaults), meaning: '亲密与身体状态通用缺省值。' },
      displayTexts: { defaultValue: this.clone(this.displayTexts), meaning: 'UI 展示和无记录状态的缺省文案。' },
      sexualExperiencePartDefaults: { defaultValue: this.clone(this.sexualExperiencePartDefaults), meaning: '每个性经验分类的默认次数。' },
      sexualHistoryDefaults: { defaultValue: this.clone(this.sexualHistoryDefaults), meaning: '性经历当前状态、经历人数和经历人列表的默认值。' },
      intimacyDefaults: { defaultValue: this.clone(this.intimacyDefaults), meaning: '完整亲密经历初始化对象。' },
      bodyStatusDefaults: { defaultValue: this.clone(this.bodyStatusDefaults), meaning: '完整身体各部位状态初始化对象。' },
      fieldMeta: { defaultValue: this.clone(this.fieldMeta), meaning: '每个 UI 字段的名称、类型、说明和缺省原因。' },
    };
  },

  editableFields() {
    const f = this.fields();
    return {
      intimacy: { meaning: '玩家或角色的亲密经历初始化，只保存中性元数据。', defaults: f.intimacyDefaults.defaultValue, fields: {
        sexualStatus: { defaultValue: f.sexualHistoryDefaults.defaultValue?.sexualStatus, meaning: '性经历当前状态；初始为处女。' },
        sexualPartnerCount: { defaultValue: f.sexualHistoryDefaults.defaultValue?.sexualPartnerCount, meaning: '经历人数。' },
        sexualPartners: { defaultValue: f.sexualHistoryDefaults.defaultValue?.sexualPartners, meaning: '经历对象列表。' },
        sexualExperienceCount: { defaultValue: f.intimacyDefaults.defaultValue?.sexualExperienceCount, meaning: '抽象性经验总次数；初始0。' },
        sexualExperienceParts: { defaultValue: f.sexualExperiencePartDefaults.defaultValue, meaning: '分部位抽象次数统计；每个分类默认0；只有符合 sexPartPrompts 对应次数增加标准时才能增加。' },
        updatedAt: { defaultValue: f.intimacyDefaults.defaultValue?.updatedAt, meaning: '初始化时间；无明确时间可留空。' },
        reason: { defaultValue: f.intimacyDefaults.defaultValue?.reason, meaning: '初始化依据；引用现实推演正文事实。' },
      } },
      bodyStatus: { meaning: '各身体部位当前状态初始化，只保存中性短状态和描述。', defaults: f.bodyStatusDefaults.defaultValue, fields: {
        partKey: { defaultValue: 'overall', meaning: '部位键；只能使用 bodyStatusDefaults 中存在的键。' },
        part: { defaultValue: f.partLabels.defaultValue?.overall, meaning: '部位中文名。' },
        status: { defaultValue: f.valueDefaults.defaultValue?.bodyStatus, meaning: '短状态。' },
        description: { defaultValue: f.valueDefaults.defaultValue?.bodyDescription, meaning: '色情化处女状态描述。' },
        reason: { defaultValue: f.valueDefaults.defaultValue?.bodyReason, meaning: '初始化依据；引用现实推演正文事实。' },
        updatedAt: { defaultValue: f.valueDefaults.defaultValue?.updatedAt, meaning: '初始化时间；无明确时间可留空。' },
      } },
    };
  },

  jsonFormat() {
    const editable = this.editableFields();
    return { initUpdates: [{ target: 'player-self 或角色id/姓名', subject: { type: 'player 或 character', id: 'player-self 或角色id', name: '玩家或角色名' }, section: '亲密与身体状态初始化', fields: { intimacy: editable.intimacy.defaults, bodyStatus: editable.bodyStatus.defaults }, reason: '正文中的初始化依据' }] };
  },

  promptText() {
    return ['### 亲密与身体状态初始化字段模板（色情化）', '只在现实推演正文明确支持初始化时填写；没有依据的字段保持缺省值或不返回。', `全部默认配置与含义：${JSON.stringify(this.fields())}`, `可填写字段与含义：${JSON.stringify(this.editableFields())}`, `规范 JSON 格式：${JSON.stringify(this.jsonFormat())}`].join('\n\n');
  },
};

window.GameModules.initTemplateSources.intimacyBody = intimacyBodyTemplate;
window.GameModules.initDefaults.intimacyBody = intimacyBodyTemplate;


;// ---- init/init-prompt-registry.js ----
window.GameModules = window.GameModules || {};

window.GameModules.initPromptRegistry = {
  prompts: {},
  executed: {},
  ui: {},
registerUi(templateKey, ui = {}) {
    if (!templateKey || !ui) return;
    this.ui[templateKey] = { ...(this.ui[templateKey] || {}), ...ui };
  },
uiFor(templateKey = '') {
    return this.ui[templateKey] || {};
  },
loadExecuted(store = null) {
    const saved = store?.playerIdentityState?.()?.values?.initPromptExecuted;
    if (saved && typeof saved === 'object') this.executed = { ...this.executed, ...saved };
  },
saveExecuted(store = null) {
    const state = store?.playerIdentityState?.();
    if (state?.values) state.values.initPromptExecuted = { ...(state.values.initPromptExecuted || {}), ...this.executed };
  },
parse(text = '') {
    const raw = String(text || ''), match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/), meta = {};
    if (match) match[1].split(/\n+/).forEach((line) => { const at = line.indexOf(':'); if (at > 0) meta[line.slice(0, at).trim()] = line.slice(at + 1).trim(); });
    return { name: meta.name || '', description: meta.description || '', body: match ? match[2].trim() : raw.trim(), raw };
  },
register(id, source = {}) {
    const text = typeof source === 'string' ? source : source.prompt;
    if (!id || !text) return;
    const templateKey = typeof source === 'object' ? source.templateKey : '';
    this.prompts[id] = { id, templateKey, template: templateKey ? window.GameModules.initTemplateSources?.[templateKey] : null, ...this.parse(text) };
  },
pending(prefix = '', store = null) {
    if (!Object.keys(this.prompts).length) this.registerAll(prefix);
    this.loadExecuted(store);
    return Object.values(this.prompts).filter((item) => (!prefix || String(item.id).startsWith(prefix)) && !this.executed[item.id]);
  },
markExecuted(ids = [], store = null) {
    const changed = [];
    (Array.isArray(ids) ? ids : [ids]).filter(Boolean).forEach((id) => { if (!this.executed[id]) changed.push(id); this.executed[id] = true; });
    this.saveExecuted(store);
    return changed;
  },
markByInitUpdates(updates = [], store = null) {
    if (!Array.isArray(updates) || !updates.length) return [];
    const matched = this.pending('', store).filter((item) => updates.some((update) => {
      const promptId = update.initPromptId || update.promptId || update.registryId, templateKey = update.templateKey || update.template;
      if ((promptId && promptId === item.id) || (templateKey && templateKey === item.templateKey)) return true;
      const section = String(update.section || ''), title = String(item.template?.title || item.name || item.id || '');
      return section && title && (section.includes(title) || title.includes(section));
    })).map((item) => item.id);
    return this.markExecuted(matched, store);
  },
targetState(store, update = {}) {
    const subject = update.subject || {};
    const rawId = subject.characterId || subject.playerId || subject.id || update.target || 'player-self';
    const id = window.GameModules.updateRegistry?.normalizeSubjectId?.(store, rawId, subject) || rawId;
    return store?.itemSkillState?.(id) || (id === 'player-self' ? store?.playerIdentityState?.() : null);
  },
async apply(store, updates = []) {
    const applied = [];
    for (const update of Array.isArray(updates) ? updates : []) {
      const fields = update?.fields, state = this.targetState(store, update);
      if (!state?.values || !fields || typeof fields !== 'object') continue;
      const templateKey = this.templateKeyForUpdate(update, store);
      if (templateKey) this.ensureTemplateState(templateKey, state);
      Object.entries(fields).forEach(([key, value]) => this.applyField(state.values, key, this.markInitializedValue(templateKey, key, value)));
      applied.push(update);
      await window.GameModules.sqliteSave.saveCharacterState?.(state);
    }
    this.markByInitUpdates(applied, store);
    return applied;
  },
  templateKeyForUpdate(update = {}, store = null) {
    const direct = update.templateKey || update.template;
    if (direct && this.template(direct)) return direct;
    const promptId = update.initPromptId || update.promptId || update.registryId;
    if (promptId && this.prompts[promptId]?.templateKey) return this.prompts[promptId].templateKey;
    return this.pending('', store).find((item) => {
      const title = String(item.template?.title || item.name || item.id || ''), section = String(update.section || '');
      return section && title && (section.includes(title) || title.includes(section));
    })?.templateKey || '';
  },
  applyField(values = {}, key = '', value) {
    if (value === undefined || value === null) return;
    const current = values[key];
    if (current && typeof current === 'object' && !Array.isArray(current) && value && typeof value === 'object' && !Array.isArray(value)) values[key] = this.deepMerge(current, value);
    else values[key] = this.clone(value);
  },
  markInitializedValue(templateKey = '', key = '', value) {
    if (templateKey !== 'intimacyBody' || !value || typeof value !== 'object' || Array.isArray(value)) return value;
    const next = this.clone(value);
    if (key === 'intimacy') return { ...next, initializedByAi: true, source: 'AI初始化' };
    if (key !== 'bodyStatus') return value;
    Object.keys(next).forEach((partKey) => {
      if (next[partKey] && typeof next[partKey] === 'object' && !Array.isArray(next[partKey])) next[partKey] = { ...next[partKey], initializedByAi: true, source: 'AI初始化' };
    });
    return next;
  },
  deepMerge(base, patch) {
    const next = this.clone(base);
    Object.entries(patch || {}).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (next[key] && typeof next[key] === 'object' && !Array.isArray(next[key]) && value && typeof value === 'object' && !Array.isArray(value)) next[key] = this.deepMerge(next[key], value);
      else next[key] = this.clone(value);
    });
    return next;
  },
clone(value) { return JSON.parse(JSON.stringify(value ?? null)); },
  template(key = '') { return window.GameModules.initTemplateSources?.[key] || window.GameModules.initDefaults?.[key] || null; },
  parts(path = '') { return String(path || '').split('.').filter(Boolean); },
  get(obj, path = '', fallback = undefined) { return this.parts(path).reduce((acc, key) => acc?.[key], obj) ?? fallback; },
  set(obj, path = '', value) { const keys = this.parts(path), last = keys.pop(), target = keys.reduce((acc, key) => (acc[key] = acc[key] || {}), obj); target[last] = value; },
mergeMissing(target, defaults) {
    if (!target || typeof target !== 'object' || Array.isArray(target)) return this.clone(defaults);
    let changed = false;
    Object.entries(defaults || {}).forEach(([key, value]) => {
      if (target[key] === undefined || target[key] === null) { target[key] = this.clone(value); changed = true; }
      else if (value && typeof value === 'object' && !Array.isArray(value)) changed = this.mergeMissing(target[key], value) || changed;
    });
    return changed;
  },
defaultValue(templateKey = '', key = '') {
    const template = this.template(templateKey), def = template?.stateDefaults?.find((item) => item.key === key || item.path === key);
    if (!template || !def) return null;
    return typeof template[def.factory] === 'function' ? template[def.factory]() : this.clone(this.get(template, def.factory));
  },
  markPendingInit(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
    const next = { ...this.clone(value), pendingAiInit: true, initializedByAi: false, source: '模板占位' };
    Object.keys(next).forEach((partKey) => {
      if (next[partKey] && typeof next[partKey] === 'object' && !Array.isArray(next[partKey])) next[partKey] = { ...next[partKey], pendingAiInit: true, initializedByAi: false, source: '模板占位' };
    });
    return next;
  },
ensureTemplateState(templateKey = '', state = {}) {
    const template = this.template(templateKey);
    if (!template || !state?.values) return false;
    let changed = false;
    (template.stateDefaults || []).forEach((def) => {
      const value = this.defaultValue(templateKey, def.key), current = this.get(state.values, def.path);
      if (current === undefined || current === null) { this.set(state.values, def.path, templateKey === 'intimacyBody' && (def.path === 'bodyStatus' || def.path === 'intimacy') ? this.markPendingInit(value) : value); changed = true; }
      else if (value && typeof value === 'object') changed = this.mergeMissing(current, value) || changed;
    });
    return changed;
  },
fieldRows(template, def, raw, initial) {
    const empty = template.valueDefaults?.empty || '--';
    if (raw === undefined || raw === null) return { value: empty, raw: '', initialMeeting: initial ?? empty };
    if (def.display === 'count') return { value: `${Number(raw) || 0}${def.unit || ''}`, raw: Number(raw) || 0, initialMeeting: `${Number(initial) || 0}${def.unit || ''}` };
    if (def.display === 'list') return { value: Array.isArray(raw) && raw.length ? raw : [template.displayTexts?.[def.emptyText] || empty], raw: Array.isArray(raw) ? raw : [], initialMeeting: initial || empty };
    if (def.display === 'sexPartRows') return this.sexPartRows(template, def, raw, initial);
    if (def.display === 'bodyStatusRows') return this.bodyStatusRows(template, def, raw, initial);
    return { value: raw || empty, raw, initialMeeting: initial ?? empty };
  },
sexPartRows(template, def, raw = {}, initial = {}) {
    const rows = Object.entries(template[def.labels] || {}).map(([key, name]) => {
      const count = Number(raw?.[key]) || 0, initialCount = Number(initial?.[key]) || 0;
      return { partKey: key, name, count, initialCount, laterCount: Math.max(0, count - initialCount), prompt: template.sexPartPrompts?.[key] || template.sexPartPrompts?.other || '', type: template.fieldMeta?.[def.meta]?.kind };
    });
    return { value: rows.map((item) => template.formatExperienceSplit?.(item) || `${item.name}：${item.count}`), raw: rows, initialMeeting: rows.map((item) => template.formatInitialExperience?.(item) || `${item.name}：${item.initialCount}`) };
  },
bodyStatusRows(template, def, raw = {}, initial = {}) {
    const rows = Object.values(raw || {}).map((item) => ({ ...item, name: item.part || item.partKey, type: template.fieldMeta?.[def.meta]?.kind }));
    return { value: rows.map((item) => template.formatBodyStatus?.(item) || `${item.part || item.partKey}：${item.status || '--'}`), raw: rows, initialMeeting: Object.values(initial || {}).map((item) => template.formatInitialBody?.(item) || `${item.part}：${item.status}`) };
  },
fields(templateKey = '', state = {}) {
    const template = this.template(templateKey);
    if (!template || !state?.values) return [];
    const initial = template.initialMeeting?.() || {}, p = state.profile || {}, base = { stateId: state.id || '', worldTag: p.work || state.worldTag || '原创世界', targetType: p.isPlayer ? '非角色' : '角色', commonField: true };
    return (template.uiFieldDefs || []).map((def) => {
      const meta = template.fieldMeta?.[def.meta] || {}, shown = this.fieldRows(template, def, this.get(state.values, def.path), this.get(initial, def.initialPath));
      return { key: def.key, templateKey, ...meta, ...base, ...shown, reason: this.get(state.values, `${def.path}.reason`) || this.get(state.values, 'intimacy.reason') || meta.reasonFallback || '' };
    });
  },
registerAll(prefix = '') { this.prompts = {}; Object.entries(window.GameModules.initPromptSources || {}).forEach(([key, source]) => { if (!prefix || String(key).startsWith(prefix)) this.register(key, source); }); },
  selectByNames(names = [], store = null) { const wanted = this.normalizedSkillNameSet(names); return this.pending('', store).filter((item) => wanted.has(item.id) || wanted.has(item.templateKey) || wanted.has(item.name)); },
  canonicalSkillIds(names = [], store = null) { const wanted = this.normalizedSkillNameSet(names); return this.pending('', store).filter((item) => wanted.has(item.id) || wanted.has(item.templateKey) || wanted.has(item.name)).map((item) => item.id); },
  normalizedSkillNameSet(names = []) {
    const out = new Set();
    for (const raw of Array.isArray(names) ? names : []) {
      const name = String(raw || '').trim();
      if (!name) continue;
      out.add(name);
      const dotted = name.match(/^([a-z0-9-]+)\.[A-Za-z0-9_]+$/u)?.[1];
      if (dotted) out.add(dotted);
    }
    return out;
  },
  skillSummaries(store = null) { return this.pending('', store).map((item) => `- ${item.id}：${item.description || item.template?.title || ''}`).join('\n'); },
  skillText(ids = null, store = null) { const selected = Array.isArray(ids) ? this.selectByNames(ids, store) : this.pending(String(ids || ''), store); return selected.map((item) => [`## ${item.name || item.id}`, item.body, item.template?.promptText?.() || ''].filter(Boolean).join('\n\n')).filter(Boolean).join('\n\n'); },
  schema(ids = null, store = null) { const result = { initUpdates: [] }, selected = Array.isArray(ids) ? this.selectByNames(ids, store) : this.pending(String(ids || ''), store); selected.forEach((item) => { const schema = item.template?.jsonFormat?.(); if (Array.isArray(schema?.initUpdates)) result.initUpdates.push(...schema.initUpdates); }); return result; },
};


;// ---- init/intimacy-body-ui.js ----
window.GameModules = window.GameModules || {};

window.GameModules.initPromptRegistry?.registerUi?.('intimacyBody', {
  sectionTitle: '身体状态',
  afterSection: '身份信息',
  bodyStatusUpdateType: 'body-status',
  fieldKeys: ['sexualStatus', 'sexualPartnerCount', 'sexualPartners', 'sexualExperienceCount', 'sexualExperienceParts', 'bodyStatus'],
  row(field = {}, item = null) {
    if (item && item.type === '当前身体状态') {
      if (item.pendingAiInit) {
        const desc = item.description || item['描述状态'] || '';
        return { field: '身体状态', name: item.part || item.partKey || '', value: `${item.status || '稳定'}${desc ? `｜${desc}` : ''}｜模板占位，待AI初始化`, detailLines: ['尚未经过现实推演AI初始化', '当前显示 init template 映射与默认描述', '占位值不作为真实原始值'] };
      }
      const updateUi = window.GameModules.updateRegistry?.uiForChange?.({ updateType: this.bodyStatusUpdateType });
      const value = { part: item.part, partKey: item.partKey, status: item.status, description: item.description || item['描述状态'] };
      if (typeof updateUi?.row === 'function') return updateUi.row({ updateType: this.bodyStatusUpdateType, field: `bodyStatus.${item.partKey || 'overall'}`, change: { value }, reasons: [{ trigger: item.reason || '初始化身体状态', confidence: 'initial' }] }, null, { name: item.part || item.partKey || '' });
    }
    return { field: field.label || '身体状态', name: item?.name || field.label || '', value: item ? window.GameModules.rpgFieldUi?.rpgItemSummary?.(item) : field.value };
  },
});


;// ---- rpg-state.js ----
window.GameModules = window.GameModules || {};

window.GameModules.rpgState = {
  async ensureWorldAttributes(worldTag) {
    const save = window.GameModules.sqliteSave;
    const attrs = window.GameModules.worldAttributes.defaults(worldTag);
    const existing = save.getWorldAttributes(worldTag);
    if (existing && window.GameModules.rpgSchema.sameFields(existing.fields, attrs.fields)) return existing;
    await save.saveWorldAttributes(worldTag, attrs);
    return attrs;
  },

  async ensureSchema(worldTag) {
    const save = window.GameModules.sqliteSave;
    const attrs = await this.ensureWorldAttributes(worldTag);
    const existing = save.getSchema(worldTag);
    const schema = window.GameModules.rpgSchema.base(worldTag, attrs);
    const schemaFields = schema.sections.flatMap((section) => section.fields);
    if (existing && window.GameModules.rpgSchema.matchesAttrs(existing, { fields: schemaFields })) return existing;
    console.log('[RPG状态] 固化世界属性 schema:', worldTag, attrs.fields?.length || 0);
    await save.saveSchema(worldTag, schema);
    return schema;
  },

  async ensureCharacter(character, store = null) {
    const save = window.GameModules.sqliteSave;
    const id = character.id || character.name;
    const existing = save.getCharacterState(id);
    if (existing) {
      console.log('[RPG状态] 使用已保存角色状态:', id, existing.worldTag);
      const schema = await this.ensureSchema(existing.worldTag || character.work || '原创世界');
      const profileChanged = this.ensureRoleCard(existing, character);
      const upgraded = this.upgradeCharacterState(existing, schema);
      const updated = this.updateExistingCharacter(existing, character, store);
      const inventorySynced = window.GameModules.progression.syncInventoryFromProfile?.(existing, existing.profile || character);
      const professionChanged = await window.GameModules.rpgProfessionState?.ensureInfo?.call(window.GameModules.rpgProfessionState, existing, character, schema);
      await window.GameModules.rpgLexicon.syncState(existing);
      if (profileChanged || upgraded || updated || inventorySynced || professionChanged) await save.saveCharacterState(existing);
      return existing;
    }
    const worldTag = save.getCharacterWorld(id) || character.work || '原创世界';
    console.log('[RPG状态] 创建角色状态:', id, character.name, worldTag);
    const schema = await this.ensureSchema(worldTag);
    const created = this.createCharacterState(character, schema, store);
    await window.GameModules.rpgProfessionState?.ensureInfo?.call(window.GameModules.rpgProfessionState, created, character, schema);
    await window.GameModules.rpgLexicon.syncState(created);
    await save.saveCharacterState(created);
    return created;
  },
  ensureRoleCard(state, character) {
    if (!state || !character?.roleCard) return false;
    const oldProfile = state.profile || {};
    if (oldProfile.roleCard && oldProfile.roleCardUpdatedAt) {
      const sameRoleCard = oldProfile.roleCardInputSignature === character.roleCardInputSignature;
      const profileTool = window.GameModules.characterProfile;
      const oldNameOk = profileTool?.isConcreteName?.(oldProfile.name) !== false;
      const newNameOk = profileTool?.isConcreteName?.(character.name) !== false;
      const freshAiProfile = character.roleCardSource === 'ai' && character.roleCardUpdatedAt && character.roleCardUpdatedAt !== oldProfile.roleCardUpdatedAt;
      if (!freshAiProfile && !character.forceRoleCardRegenerate && oldNameOk && newNameOk && profileTool?.isReusableRoleCard?.(oldProfile, character.roleCardInputSignature)) return false;
      state.profile = { ...oldProfile, ...character, roleCard: true };
      state.note = state.profile.detail || state.profile.personality || state.note || '';
      const metricsChanged = sameRoleCard
        ? window.GameModules.rpgProfileMetrics?.apply(state, state.profile)
        : window.GameModules.rpgProfileMetrics?.rebase(state, state.profile, oldProfile);
      return metricsChanged || true;
    }
    state.profile = { ...oldProfile, ...character, roleCard: true };
    state.note = state.profile.detail || state.profile.personality || state.note || '';
    return true;
  },
  updateExistingCharacter(state, character, store = null) {
    if (!state?.values || !store) return false;
    const profile = character || state.profile || {};
    const seed = this.seed(`${state.name}${state.worldTag}${store.entryCurrentAction || ''}${store.entryTimeLabel?.() || ''}`);
    const updated = Boolean(window.GameModules.rpgInitializer?.updateExisting(state, profile, store, seed));
    return window.GameModules.rpgAge.sync(state.values, profile, store) || updated;
  },
  upgradeCharacterState(state, schema) {
    let changed = false;
    state.worldTag = schema.worldTag;
    if (!state.schema || !window.GameModules.rpgSchema.matchesAttrs(state.schema, { fields: schema.sections.flatMap((section) => section.fields) })) {
      state.schema = schema;
      changed = true;
    }
    if (!state.values) state.values = {};
    state.values.world_tag = state.worldTag;
    const seed = this.seed(state.name + state.worldTag);
    schema.sections.forEach((section) => section.fields.forEach((field) => {
      if (state.values[field.key] === undefined) {
        if (field.key === 'free_attribute_points') state.values[field.key] = 0;
        else if (field.key === 'level_growth') state.values[field.key] = { totalLevelUps: 0, autoPointsPerLevel: 1, freePointsPerLevel: 1, history: [] };
        else state.values[field.key] = ['health', 'stamina'].includes(field.key) ? 100 : this.valueFor(field, seed + field.key.length);
        changed = true;
      }
    }));
    const worldChanged = this.normalizeWorldValues(state), jobChanged = window.GameModules.rpgProfessionState.normalizeProfessions(state), controlChanged = this.ensureControlExperience(state), locationChanged = this.ensureCurrentLocation(state), metricsChanged = this.ensureCharacterMetrics(state);
    const intimacyChanged = window.GameModules.initPromptRegistry?.ensureTemplateState?.('intimacyBody', state);
    const reasonChanged = this.ensureRpgFieldReasons(state);
    const socialChanged = this.syncSocialPositions(state);
    const inventoryChanged = window.GameModules.progression.ensureInventoryFields?.(state.values, state.id || '');
    const mechanicsChanged = window.GameModules.progression.ensureStateMechanics(state);
    return worldChanged || jobChanged || controlChanged || locationChanged || intimacyChanged || metricsChanged || reasonChanged || socialChanged || inventoryChanged || mechanicsChanged || changed;
  },
  ensureRpgFieldReasons(state) {
    if (!state?.profile) throw new Error('个人资料缺失，无法校验RPG变化原因');
    const tool = window.GameModules.characterProfile;
    const before = JSON.stringify(state.profile.rpgFieldReasons || {});
    state.profile.worldAttributes = state.profile.worldAttributes || { fields: (state.schema?.sections || []).flatMap((section) => section.fields || []) };
    state.profile.rpgFieldReasons = tool.requireRpgFieldReasons(state.profile, state.profile.worldAttributes, state.profile.name || state.name || state.id);
    return before !== JSON.stringify(state.profile.rpgFieldReasons || {});
  },

  ensureCharacterMetrics(state) {
    if (!state || state.id === 'player-self') return false;
    const before = JSON.stringify(state.metrics || {}), fresh = window.GameModules.metrics.fresh();
    state.metrics = state.metrics || {};
    state.metrics.emotions = window.GameModules.metrics.fill(state.metrics.emotions, window.GameModules.metrics.emotionKeys, fresh.emotions);
    state.metrics.playerFeelings = window.GameModules.metrics.fill(state.metrics.playerFeelings, window.GameModules.metrics.playerKeys, fresh.playerFeelings);
    state.metrics.notes = state.metrics.notes || {};
    window.GameModules.rpgProfileMetrics?.apply(state, state.profile);
    return before !== JSON.stringify(state.metrics);
  },
  syncSocialPositions(state) {
    if (!state?.values || !state?.profile) return false;
    let changed = false;
    const profile = state.profile;
    const factions = Array.isArray(profile.factions) ? profile.factions : [];
    const forces = Array.isArray(profile.force_positions) ? profile.force_positions : (Array.isArray(profile.forcePositions) ? profile.forcePositions : []);
    if ((!Array.isArray(state.values.factions) || !state.values.factions.length) && factions.length) {
      state.values.factions = factions;
      changed = true;
    }
    if ((!Array.isArray(state.values.force_positions) || !state.values.force_positions.length) && forces.length) {
      state.values.force_positions = forces;
      changed = true;
    }
    if (state.values.force_positions?.length || state.values.memberships?.length) {
      window.GameModules.orgTerritory?.syncCharacterOrgMemberships?.(state, null);
      changed = true;
    }
    return changed;
  },

  isInvalidLocationName(name = '') {
    return !String(name || '').trim() || /^剧情起始时间｜/.test(String(name || '')) || /^公元纪年｜/.test(String(name || ''));
  },

  initialLocationName(character = {}, store = null) {
    const explicit = character.currentLocation || character.locationName || character.location || character.place;
    if (!this.isInvalidLocationName(explicit)) return String(explicit).trim();
    const realWorld = window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';
    const world = character.work || store?.selectedWork || '';
    if ((world === realWorld || /现实|现代都市|2026/.test(world)) && !this.isInvalidLocationName(store?.realWorldLocationName)) return store.realWorldLocationName;
    return '当前位置未知';
  },

  ensureCurrentLocation(state) {
    let changed = false;
    if (!state.values) state.values = {};
    if (!state.values.current_location || this.isInvalidLocationName(state.values.current_location?.name || state.values.current_location)) {
      state.values.current_location = { name: '当前位置未知', worldTag: state.worldTag || state.profile?.work || '未知世界', updatedAt: '', reason: '资料不足，等待后续剧情推演给出具体位置。' };
      changed = true;
    }
    const sections = state.schema?.sections || [];
    const identity = sections.find((section) => section.title === '身份信息' || section.fields.some((field) => field.key === 'world_tag')) || sections[0];
    if (identity && !identity.fields.some((field) => field.key === 'current_location')) {
      identity.fields.push({ key: 'current_location', label: '当前所在位置', type: 'text', desc: '用于避免同一人物同时出现在两个地点。' });
      changed = true;
    }
    return changed;
  },

  ensureControlExperience(state) {
    let changed = false;
    if (!state.values) state.values = {};
    if (!state.values.control_experience) {
      state.values.control_experience = { onlineCount: 0, feeling: '未知', adaptation: 0, summary: '尚未经历上线操控。', lastUpdated: '' };
      changed = true;
    }
    const sections = state.schema?.sections || [];
    const itemSection = sections.find((section) => section.title === '习得与职业') || sections.find((section) => section.fields.some((field) => field.key === 'status_tags')) || sections.at(-1);
    if (itemSection && !itemSection.fields.some((field) => field.key === 'control_experience')) {
      itemSection.fields.push({ key: 'control_experience', label: '上线体验', type: 'text' });
      changed = true;
    }
    return changed;
  },
  createCharacterState(character, schema, store = null) {
    const seed = this.seed(character.name + character.role + schema.worldTag + (character.detail || '') + (store?.entryCurrentAction || ''));
    const values = { world_tag: schema.worldTag, health: 100, stamina: 100 };
    for (const section of schema.sections) {
      for (const field of section.fields) {
        if (['world_tag', 'health', 'stamina', 'age'].includes(field.key)) continue;
        values[field.key] = this.valueFor(field, seed + field.key.length);
      }
    }
    Object.assign(values, window.GameModules.progression.createValues(character, seed, values));
    const worldFields = schema.sections.find((section) => section.title === '世界固有属性')?.fields || [];
    window.GameModules.rpgInitializer?.apply(values, character, store, seed, { fields: worldFields });
    window.GameModules.rpgInitializer?.touch(values, store);
    window.GameModules.progression.ensureIntrinsicSources(values);
    window.GameModules.progression.ensureProgressionNotes(values);
    values.derived = window.GameModules.progression.derived(values);
    values.combat_simulation = window.GameModules.progression.defaultCombat(values);
    Object.assign(values, character.worldValues || {});
    window.GameModules.rpgAge.sync(values, character, store);
    values.status_tags = [character.role, character.importance === 'minor' ? '路人' : '可被操控', schema.worldTag];
    values.current_location = { name: this.initialLocationName(character, store), worldTag: schema.worldTag, updatedAt: store?.phoneDateText?.() || '', reason: '创建角色卡时根据明确上下文登记；资料不足则等待后续剧情推演填充。' };
    values.control_experience = { onlineCount: 0, feeling: '未知', adaptation: 0, summary: '尚未经历上线操控。', lastUpdated: '' };
    values.intimacy = window.GameModules.initPromptRegistry?.markPendingInit?.(window.GameModules.initPromptRegistry?.defaultValue?.('intimacyBody', 'intimacy') || {});
    values.bodyStatus = window.GameModules.initPromptRegistry?.markPendingInit?.(window.GameModules.initPromptRegistry?.defaultValue?.('intimacyBody', 'bodyStatus') || {});
    const state = {
      id: character.id,
      name: character.name,
      worldTag: schema.worldTag,
      schema,
      values,
      profile: character,
      note: character.detail || character.personality || '',
      firstAppearedAt: values.updatedAt,
      firstAppearedGameTime: values.updatedGameTime,
    };
    this.ensureControlExperience(state);
    this.ensureCurrentLocation(state);
    window.GameModules.progression.syncInventoryFromProfile?.(state, character);
    this.ensureCharacterMetrics(state);
    return state;
  }, valueFor(field, seed) {
    if (field.type === 'number') return field.min + (seed % ((field.max - field.min) + 1));
    if (field.type === 'rank') return ['E', 'D', 'C', 'B', 'A', 'EX'][seed % 6];
    return field.type === 'list' ? [] : '';
  },
  seed(text) { return [...String(text)].reduce((sum, ch) => sum + ch.charCodeAt(0), 0); },
};


;// ---- rpg-world-values.js ----
window.GameModules = window.GameModules || {};
window.GameModules.rpgState = window.GameModules.rpgState || {};

Object.assign(window.GameModules.rpgState, {
  normalizeWorldValues(state) {
    let changed = false;
    const worldFields = state.schema?.sections?.find((section) => section.title === '世界固有属性')?.fields || [];
    worldFields.forEach((field) => {
      if (field.type !== 'number') return;
      const value = state.values[field.key];
      if (typeof value === 'number') return;
      const ranks = { EX: 100, A: 85, B: 70, C: 55, D: 35, E: 15 };
      const parsed = ranks[String(value || '').toUpperCase()] ?? Number(value);
      state.values[field.key] = Number.isFinite(parsed) ? Math.max(0, Math.min(100, Math.round(parsed))) : 0;
      changed = true;
    });
    return changed;
  },
});


;// ---- timeline-data.js ----
window.GameData = window.GameData || {};
window.GameData.timelines = {"Fate  kaleid liner☆伊莉雅":[{"title":"剧情起点","time":"时间未明，按作品上下文近似","summary":"卫宫士郎、远坂凛围绕发生冲突，召唤英灵展开，推动当前场景发展。"}],"Fate Apocrypha":[{"title":"剧情起点","time":"时间未明，按作品上下文近似","summary":"卫宫士郎、Saber围绕发生冲突，召唤英灵展开，推动当前场景发展。"}],"Fate Labyrinth":[{"title":"剧情起点","time":"时间未明，按作品上下文近似","summary":"Saber、Archer围绕表明愿望，日常铺垫展开，推动当前场景发展。"}],"Fate Lost Einherjar":[{"title":"剧情起点","time":"时间未明，按作品上下文近似","summary":"Archer、Rider围绕发生冲突，召唤英灵展开，推动当前场景发展。"}],"Fate Prototype苍银的碎片":[{"title":"剧情起点","time":"时间未明，按作品上下文近似","summary":"卫宫士郎、间桐樱围绕发生冲突，召唤英灵展开，推动当前场景发展。"}],"Fate Requiem":[{"title":"剧情起点","time":"时间未明，按作品上下文近似","summary":"Saber、Rider围绕发生冲突，召唤英灵展开，推动当前场景发展。"}],"Fate Stay Night":[{"title":"第五次圣杯战争前夕","time":"2004年02月01日06时00分00秒","summary":"卫宫士郎的日常与冬木异常逐渐交错，第五次圣杯战争临近。"},{"title":"第五次圣杯战争开幕","time":"2004年02月02日22时00分00秒","summary":"士郎卷入战斗并召唤 Saber，各阵营围绕圣杯开始行动。"},{"title":"三线分歧展开","time":"2004年02月03日00时00分00秒","summary":"Fate、UBW、HF 等路线围绕不同选择展开，人物关系和圣杯真相逐步显露。"}],"Fate Strange Fake":[{"title":"剧情起点","time":"时间未明，按作品上下文近似","summary":"卫宫切嗣、间桐脏砚围绕发生冲突，召唤英灵展开，推动当前场景发展。"}],"Fate Zero":[{"title":"第四次圣杯战争前传","time":"1986年01月01日00时00分00秒","summary":"序章以“八年前”回溯切嗣的理想与过往，为第四次圣杯战争的动机奠基。"},{"title":"第四次圣杯战争召集","time":"1994年11月01日18时00分00秒","summary":"冬木第四次圣杯战争前夕，各阵营御主、从者与魔术师势力陆续集结。"},{"title":"第四次圣杯战争展开","time":"1994年11月02日00时00分00秒","summary":"圣杯战争正式进入夜间交锋，御主与英灵围绕冬木展开侦察、结盟、暗杀与正面对抗。"},{"title":"第四次圣杯战争终局","time":"1994年11月08日03时00分00秒","summary":"战争走向终局，圣杯真相、御主愿望与冬木灾厄集中爆发。"}],"Fate 君主埃尔梅罗二世事件簿":[{"title":"圣杯战局","time":"近似：第四次圣杯战争","summary":"圣杯战争围绕推进人物关系与事件线索展开，推动当前场景发展。"}],"Fate 君主埃尔梅罗二世的冒险":[{"title":"剧情起点","time":"时间未明，按作品上下文近似","summary":"卫宫切嗣、卫宫士郎围绕发生冲突，召唤英灵展开，推动当前场景发展。"}],"Fate 月姬":[{"title":"剧情起点","time":"时间未明，按作品上下文近似","summary":"魔术师围绕发生冲突，召唤英灵展开，推动当前场景发展。"}],"Fate 空之境界":[{"title":"剧情起点","time":"时间未明，按作品上下文近似","summary":"魔术师围绕发生冲突，召唤英灵展开，推动当前场景发展。"}],"Fate 阿瓦隆之庭":[{"title":"剧情起点","time":"时间未明，按作品上下文近似","summary":"言峰绮礼、Saber围绕发生冲突，召唤英灵展开，推动当前场景发展。"}]};


;// ---- entry-year.js ----
/**
 * 通用年份推断：本地证据 AI 自审 → 公共资料 AI 自审 → 兜底。
 */
window.GameModules = window.GameModules || {};

window.GameModules.entryYear = {
  async baseYear(calendar, store) {
    const fallback = this.fallbackBaseYear(calendar, store);
    const timelineYear = this.timelineYear(store);
    if (timelineYear) return timelineYear;
    const local = await this.localEvidence(store, 'storyYear');
    const localYear = await this.audit(store, 'storyYear', local, fallback);
    if (localYear) return localYear;
    const publicYear = await this.publicAudited(store, 'storyYear', this.queriesFor(store, 'storyYear'), fallback);
    return publicYear || fallback;
  },

  async targetYear(calendar, store, base) {
    const targetAge = Math.max(1, Math.min(9999, parseInt(store?.characterAge, 10) || 16));
    const currentAge = await this.currentAge(store, base);
    const year = currentAge ? base - (currentAge - targetAge) : base;
    return `${year}${calendar.units.year || '年'}`;
  },

  async currentAge(store, base) {
    const local = await this.localEvidence(store, 'characterAge');
    const localAge = await this.audit(store, 'characterAge', local, 0, base);
    if (localAge) return localAge;
    return await this.publicAudited(store, 'characterAge', this.queriesFor(store, 'characterAge'), base) || 0;
  },

  fallbackBaseYear(calendar, store) {
    const lore = window.GameModules.sqliteSave?.getWorldLore?.(store?.character?.work || '原创世界');
    const text = `${calendar.label || ''} ${store?.character?.work || ''} ${lore?.background || ''}`;
    const years = text.match(/\b(1[5-9]\d{2}|20\d{2}|21\d{2})\b/g);
    if (years?.length) return Number(years[0]);
    if (/现代|公元|都市|学校|科技/.test(text) && this.isOriginalWorld(store)) return 2026;
    let hash = 0;
    for (const char of text) hash = (hash + char.charCodeAt(0)) % 900;
    return 1000 + hash;
  },

  isOriginalWorld(store) {
    const work = String(store?.character?.work || '');
    return !work || /原创|自定义|异界|原创世界/.test(work);
  },

  timelineYear(store) {
    const rows = window.GameData?.timelines?.[store?.character?.work || ''] || [];
    const years = rows.map((x) => Number((String(x.time || '').match(/(\d{3,4})年/) || [])[1])).filter((x) => x >= 1000);
    return years.length ? years[Math.min(1, years.length - 1)] : 0;
  },

  async localEvidence(store, mode) {
    const character = store?.character || {};
    const lore = window.GameModules.sqliteSave?.getWorldLore?.(character.work || '原创世界');
    const profile = store?.characterProfiles?.[character.id] || null;
    const basics = (profile?.basics || []).map((x) => `${x.label}:${x.value}`).join('\n');
    const base = `${character.name || ''} ${(character.aliases || []).join(' ')} ${character.role || ''} ${character.detail || ''}\n${lore?.background || ''}\n${profile?.summary || ''}\n${basics}`;
    try {
      const query = mode === 'storyYear' ? `${character.work} 故事 发生 年份 时间线` : `${character.name} ${(character.aliases || []).join(' ')} 年龄 出生 岁 寿命`;
      const hits = await window.GameModules.rag?.search?.(query, { limit: 4, sourceHint: character.work, strictSource: true, contextRadius: 1 });
      return `${base}\n${(hits || []).map((x) => x.text).join('\n')}`.slice(0, 2600);
    } catch (err) {
      console.warn('本地年份证据检索失败:', err.message);
      return base.slice(0, 2600);
    }
  },

  queriesFor(store, mode) {
    const c = store?.character || {};
    const works = this.termVariants([c.work || 'anime']);
    const names = this.termVariants([c.name, ...(c.aliases || [])]);
    if (mode === 'storyYear') return works.flatMap((w) => [`${w} 故事年份 时间线`, `${w} 背景年份`, `${w} setting story year`, `${w} timeline`]);
    const pairs = works.flatMap((w) => names.map((n) => `${n} ${w}`)).slice(0, 8);
    return pairs.flatMap((q) => [`${q} 年龄 出生 生日`, `${q} age birth year birthday`, `${q} profile`]);
  },

  termVariants(list) {
    const values = [];
    for (const raw of list) {
      const text = String(raw || '').trim();
      if (text) values.push(text, text.replace(/\s+/g, '/'), text.replace(/\s+/g, ''), text.replace(/[·・]/g, ' '));
    }
    return [...new Set(values)].filter(Boolean);
  },

  async audit(store, mode, evidence, fallback, base = 0) {
    if (!evidence || !window.dzmm?.completions) return 0;
    const prompt = await this.auditPrompt(store, mode, evidence, base);
    try {
      return await window.GameModules.jsonUtils.generateJsonWithRetry({
        source: 'entry-year-audit',
        promptId: 'entry-year-audit',
        model: store.modelId,
        timeoutMs: 60000,
        prompt,
        format: prompt,
        validate: (raw) => this.auditValue(raw, fallback),
      });
    } catch (err) {
      console.warn('年份证据自审格式失败:', err.message);
      return this.parseAudit(err.rawOutput, fallback);
    }
  },

  auditPrompt(store, mode, evidence, base) {
    const character = store?.character || {};
    const target = mode === 'storyYear' ? `作品《${character.work}》当前剧情基准年份` : `${character.name}在${base}年这一剧情基准年时的年龄；若证据给出出生年份/生日，可用${base}-出生年份简单算术推出`;
    return window.GameModules.renderPrompt('entry-year-audit', { 目标: target, 证据: evidence });
  },

  parseAudit(text, fallback) {
    const raw = String(text || '');
    const json = this.parseAuditJson(raw);
    if (json) return this.auditValue(json, fallback);
    const pass = /pass\s*[:：=]\s*(true|是|通过)/i.test(raw) || /通过/.test(raw);
    const value = Number((raw.match(/value\s*[:：=]\s*(\d{1,4})/i) || raw.match(/(?:年份|年龄|value|结果)[^\d]{0,8}(\d{1,4})/) || [])[1]);
    if (pass && Number.isFinite(value) && value > 0) return Math.round(value);
    return 0;
  },

  parseAuditJson(raw) {
    try {
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      if (start === -1 || end === -1 || end <= start) return null;
      let body = raw.slice(start, end + 1)
        .replace(/[“”]/g, '"')
        .replace(/([{,]\s*)([a-zA-Z_][\w-]*|[\u4e00-\u9fa5]+)(\s*:)/g, '$1"$2"$3')
        .replace(/:\s*是([,}])/g, ':true$1')
        .replace(/:\s*否([,}])/g, ':false$1');
      return JSON.parse(body);
    } catch (_) {
      return null;
    }
  },

  auditValue(json, fallback) {
    const value = Number(json.value ?? json.值 ?? json.年份 ?? json.年龄);
    const pass = json.pass === true || json.pass === 'true' || json.pass === '是' || json.pass === '通过';
    return pass && Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
  },

  stripHtml(text) {
    const div = document.createElement('div');
    div.innerHTML = String(text || '');
    return div.textContent || '';
  },
};


;// ---- entry-year-public.js ----
window.GameModules = window.GameModules || {};
window.GameModules.entryYear = window.GameModules.entryYear || {};

Object.assign(window.GameModules.entryYear, {
  async publicAudited(store, mode, queries, base = 0) {
    if (!window.fetch) return 0;
    try {
      const sources = await fetch('./public-year-sources.json').then((r) => r.json());
      for (const source of sources) {
        let evidence = '';
        for (const query of this.limitQueries(queries)) evidence += `\n# ${source.name} / ${query}\n${await this.fetchEvidence(source, query)}`;
        const value = await this.audit(store, mode, evidence.slice(0, 4200), 0, base);
        if (value) return value;
      }
    } catch (err) {
      console.warn('公共资料推断失败:', err.message);
    }
    return 0;
  },

  limitQueries(queries) {
    return [...new Set((Array.isArray(queries) ? queries : [queries]).filter(Boolean))].slice(0, 8);
  },

  async fetchEvidence(source, query) {
    try {
      const url = source.url.replace('{query}', encodeURIComponent(query));
      const data = await fetch(url).then((r) => (r.ok ? r.json() : null));
      if (source.kind === 'mediawikiSearch') return await this.mediawikiSearchText(source, data);
      return this.publicText(source.kind, data).slice(0, 2200);
    } catch (err) {
      console.warn('公共资料源跳过:', source.name, err.message);
      return '';
    }
  },

  async mediawikiSearchText(source, data) {
    const rows = (data?.query?.search || []).slice(0, 3);
    const text = rows.map((x) => `${x.title}\n${this.stripHtml(x.snippet)}`).join('\n');
    return `${text}\n${await this.extractTitles(source, rows.map((x) => x.title))}`.slice(0, 2600);
  },

  async extractTitles(source, titles) {
    if (!source.extractUrl) return '';
    let text = '';
    for (const title of titles.slice(0, 3)) {
      const url = source.extractUrl.replace('{title}', encodeURIComponent(title));
      const data = await fetch(url).then((r) => (r.ok ? r.json() : null));
      text += `\n${this.publicText('mediawikiExtract', data)}`;
    }
    return text;
  },

  publicText(kind, data) {
    if (kind === 'jikanAnime') {
      const item = data?.data?.[0] || {};
      return `${item.title || ''}\n${item.aired?.string || ''}\n${item.synopsis || ''}`;
    }
    if (kind === 'mediawikiExtract') return Object.values(data?.query?.pages || {}).map((x) => x.extract).join('\n');
    if (kind === 'wikidataSearch') return (data?.search || []).map((x) => `${x.label} ${x.description}`).join('\n');
    return JSON.stringify(data || '');
  },
});


;// ---- entry-time.js ----
/**
 * 进入时机：为每个世界固化历法，默认取小说最开始的剧情时间。
 */
window.GameModules = window.GameModules || {};

window.GameModules.entryTime = {
  async ensureCalendar(store) {
    const start = await this.storyStart(store);
    if (!start) throw new Error('剧情索引缺少可用的默认进入时间');
    const calendar = this.modernCalendar();
    store.entryTimeOptions = { ...store.entryTimeOptions, start };
    await this.persistCalendar(store, calendar);
    return calendar;
  },

  async persistCalendar(store, calendar) {
    const save = window.GameModules.sqliteSave;
    if (!save?.db) return;
    const worldTag = store.character.work || '原创世界';
    const lore = save.getWorldLore(worldTag);
    if (!lore) return;
    lore.calendar = calendar;
    await save.saveWorldLore(worldTag, lore);
  },

  calendarFor(worldTag, lore) {
    const text = `${worldTag} ${lore.background || ''} ${(lore.coreRules || []).join(' ')}`;
    if (/Fate|现代|公元|圣杯|魔术|学校|都市/.test(text)) return this.modernCalendar();
    if (/五行|金|木|水|火|土|灵|仙|修/.test(text)) return this.wuxingCalendar();
    return this.fantasyCalendar(worldTag);
  },

  modernCalendar() {
    return { label: '公元纪年', units: { year: '年', month: '月', day: '日', hour: '时' }, months: Array.from({ length: 12 }, (_, i) => `${i + 1}月`), days: 31, hours: ['清晨', '上午', '午后', '黄昏', '深夜'] };
  },

  wuxingCalendar() {
    return { label: '五行轮纪', units: { year: '轮', month: '相', day: '刻日', hour: '时辰' }, months: ['木生相', '火盛相', '土衡相', '金肃相', '水藏相'], days: 30, hours: ['卯木时', '午火时', '酉金时', '子水时'] };
  },

  fantasyCalendar(worldTag) {
    const base = String(worldTag || '异界').slice(0, 4);
    return { label: `${base}历`, units: { year: '纪年', month: '月', day: '日', hour: '时段' }, months: ['新芽月', '晴火月', '长雨月', '白霜月'], days: 28, hours: ['晨祷', '正昼', '暮钟', '星夜'] };
  },

  async options(calendar, store) {
    let start = store.entryTimeOptions.start || await this.storyStart(store);
    if (start) {
      const birth = await this.birthDateFor(store);
      if (birth && this.dateValue([birth.year, birth.month, birth.day, 0, 0, 0]) > this.dateValue([start.year, start.month, start.day, start.hour, start.minute, start.second])) {
        start = { year: birth.year, month: birth.month, day: birth.day, ...this.randomClock() };
      }
      store.entryCalendar = this.modernCalendar();
      return {
        years: this.unique([`${start.year}年`, ...this.nearYears({ units: { year: '年' } }, start.year)]),
        months: Array.from({ length: 12 }, (_, i) => `${i + 1}月`),
        days: Array.from({ length: 31 }, (_, i) => `${i + 1}日`),
        hours: this.unique([`${String(start.hour).padStart(2, '0')}时`, ...Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}时`)]),
        minutes: this.unique([`${String(start.minute).padStart(2, '0')}分`, ...Array.from({ length: 12 }, (_, i) => `${String(i * 5).padStart(2, '0')}分`)]),
        seconds: this.unique([`${String(start.second).padStart(2, '0')}秒`, ...Array.from({ length: 12 }, (_, i) => `${String(i * 5).padStart(2, '0')}秒`)]),
        start,
      };
    }
    throw new Error('剧情索引缺少可用的默认进入时间');
  },

  async storyStart(store) {
    const source = window.GameModules.characterBrief.sourceFor(store.character.work);
    console.log('[剧情起点] 查找剧情起点:', store.character.work, 'source=', source?.name || '未匹配');
    const precomputed = this.precomputedStart(store.character.work, source);
    if (precomputed) {
      console.log('[剧情起点] 使用预计算剧情起点:', precomputed);
      return precomputed;
    }
    if (!source) return null;
    const url = `${source.base}/02_按需加载_剧情/剧情索引.md`;
    console.log('[剧情起点] 读取剧情索引:', url);
    const text = await window.GameModules.rag.fetchText(url);
    const head = String(text || '').split('\n').slice(0, 50).join('\n');
    console.log('[剧情起点] 剧情索引读取完成:', { totalLength: String(text || '').length, headLength: head.length, preview: head.slice(0, 220) });
    const defaultTime = head.match(/默认进入剧情起始时间[:：]\s*(\d{3,4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})/);
    if (defaultTime) {
      const parts = defaultTime.slice(1).map(Number);
      const result = { year: parts[0], month: parts[1], day: parts[2], hour: parts[3], minute: parts[4], second: parts[5] };
      console.log('[剧情起点] 命中默认进入剧情起始时间:', result);
      return result;
    }
    const times = [...head.matchAll(/\|\s*\d+\s*\|[^|]*\|\s*(\d{3,4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})\s*\|/g)];
    console.log('[剧情起点] 表格时间候选数量:', times.length);
    if (!times.length) return null;
    const first = times.map((m) => m.slice(1).map(Number)).sort((a, b) => this.dateValue(a) - this.dateValue(b))[0];
    const result = { year: first[0], month: first[1], day: first[2], hour: first[3], minute: first[4], second: first[5] };
    console.log('[剧情起点] 使用最早表格时间:', result);
    return result;
  },

  precomputedStart(work, source) {
    const starts = window.GameData?.storyStarts || {};
    const names = [work, source?.name, ...(source?.aliases || [])].filter(Boolean);
    return names.map((name) => starts[name]).find(Boolean) || null;
  },

  dateValue(parts) {
    return parts[0] * 1e10 + parts[1] * 1e8 + parts[2] * 1e6 + parts[3] * 1e4 + parts[4] * 100 + parts[5];
  },

  randomClock() {
    return {
      hour: Math.floor(Math.random() * 24),
      minute: Math.floor(Math.random() * 60),
      second: Math.floor(Math.random() * 60),
    };
  },

  async applyStart(store) {
    const start = store.entryTimeOptions.start;
    if (!start) return false;
    store.entryTime.year = `${start.year}年`;
    store.entryTime.month = `${start.month}月`;
    store.entryTime.day = `${start.day}日`;
    store.entryTime.hour = `${String(start.hour).padStart(2, '0')}时`;
    store.entryTime.minute = `${String(start.minute).padStart(2, '0')}分`;
    store.entryTime.second = `${String(start.second).padStart(2, '0')}秒`;
    await this.applyCharacterAge(store);
    return true;
  },

  nearYears(calendar, base) {
    const unit = calendar.units.year || '年';
    return [-1, 1, 3].map((delta) => `${base + delta}${unit}`);
  },

  format(time, calendar) {
    const hasRealDate = /^\d{3,4}年$/.test(time.year) && /月$/.test(time.month) && /日$/.test(time.day);
    const label = hasRealDate ? '剧情起始时间' : calendar.label;
    return `${label}｜${time.year} ${time.month} ${time.day} ${time.hour}${time.minute}${time.second}`;
  },

  async storyContextFor(store) {
    const source = window.GameModules.characterBrief.sourceFor(store.character.work);
    const start = store.entryTimeOptions.start || await this.storyStart(store);
    const current = this.selectedDate(store.entryTime);
    if (!source || !start || !current) return '未读取到剧情索引上下文。';
    const url = `${source.base}/02_按需加载_剧情/剧情索引.md`;
    const text = await window.GameModules.rag.fetchText(url);
    const rows = this.storyIndexRows(text)
      .filter((row) => row.value >= this.dateValue([start.year, start.month, start.day, start.hour, start.minute, start.second]) && row.value <= this.dateValue(current))
      .sort((a, b) => a.value - b.value);
    const picked = this.pickStoryContextRows(rows, store.character);
    console.log('[剧情上下文] 起点到当前时间索引:', { total: rows.length, used: picked.length, current: store.entryTimeLabel(), character: store.character.name });
    if (!picked.length) return '剧情索引中没有命中起点到当前时间范围内的条目。';
    return `剧情索引范围：从小说起点到${store.entryTimeLabel()}，共${rows.length}条，以下为用于推演的摘要：\n${picked.map((row) => `${row.time}｜${row.title}｜人物:${row.people || '未标注'}｜${row.intro}`).join('\n')}`.slice(0, 4800);
  },

  pickStoryContextRows(rows, character) {
    if (rows.length <= 40) return rows;
    const names = [character.name, ...(character.aliases || [])].filter(Boolean);
    const related = rows.filter((row) => names.some((name) => `${row.title} ${row.intro} ${row.people || ''}`.includes(name)));
    const map = new Map();
    [...rows.slice(0, 8), ...related, ...rows.slice(-24)].forEach((row) => map.set(row.no, row));
    return [...map.values()].sort((a, b) => a.value - b.value).slice(-60);
  },

  storyIndexRows(markdown) {
    return String(markdown || '').split('\n').map((line) => {
      if (!/^\|\s*\d+\s*\|/.test(line)) return null;
      const cells = line.split('|').slice(1, -1).map((x) => x.trim());
      const time = cells[2] || '';
      const parts = (time.match(/(\d{3,4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})/) || []).slice(1).map(Number);
      if (parts.length !== 6) return null;
      return { no: cells[0], title: cells[1], time, intro: cells[3] || '无摘要', people: cells[4] || '', file: cells[6], value: this.dateValue(parts) };
    }).filter(Boolean);
  },

  selectedDate(time) {
    const nums = [time.year, time.month, time.day, time.hour, time.minute, time.second].map((x) => parseInt(String(x || '').replace(/\D/g, ''), 10));
    return nums.every((x) => Number.isFinite(x)) ? nums : null;
  },

  unique(list) { return [...new Set(list.filter(Boolean))]; },
};


;// ---- entry-age.js ----
window.GameModules = window.GameModules || {};
window.GameModules.entryTime = window.GameModules.entryTime || {};

Object.assign(window.GameModules.entryTime, {
  async applyCharacterAge(store) {
    const at = this.selectedDate(store.entryTime) || (store.entryTimeOptions.start ? [
      store.entryTimeOptions.start.year,
      store.entryTimeOptions.start.month,
      store.entryTimeOptions.start.day,
      store.entryTimeOptions.start.hour,
      store.entryTimeOptions.start.minute,
      store.entryTimeOptions.start.second,
    ] : null);
    const birth = await this.birthDateFor(store);
    const age = this.ageAt(birth, at ? { year: at[0], month: at[1], day: at[2] } : null);
    const state = store.rpgStates[store.character.id];
    if (age === null) {
      store.characterAge = at ? '出生日期缺失' : '';
      if (state?.values) {
        delete state.values.age;
        delete state.values.age_label;
        store.rpgStates = { ...store.rpgStates, [state.id]: state };
        if (window.GameModules.sqliteSave.db) window.GameModules.sqliteSave.saveCharacterState(state);
      }
      return;
    }
    const ageLabel = birth.month && birth.day ? `${age}岁` : `约${age}岁`;
    store.characterAge = ageLabel;
    if (state?.values) {
      this.ensureAgeField(state);
      state.values.age = age;
      state.values.age_label = ageLabel;
      store.rpgStates = { ...store.rpgStates, [state.id]: state };
      if (window.GameModules.sqliteSave.db) window.GameModules.sqliteSave.saveCharacterState(state);
    }
  },

  ensureAgeField(state) {
    const section = state.schema?.sections?.[0];
    if (!section || section.fields.some((field) => field.key === 'age')) return;
    section.fields.unshift({ key: 'age', label: '年龄', type: 'number', min: 0, max: 999 });
  },

  async birthDateFor(store) {
    const character = store.character;
    const indexed = this.birthDateFromData(character);
    if (indexed) return indexed;
    const current = this.birthDate(store.characterProfiles[character.id]);
    if (current) return current;
    const profile = await window.GameModules.characterBrief.loadProfile(character);
    store.characterProfiles = { ...store.characterProfiles, [character.id]: profile };
    return this.birthDate(profile);
  },

  birthDateFromData(character) {
    const dates = window.GameData?.characterBirthDates || {};
    const date = dates[character.id] || dates[`${character.work}::${character.name}`] || null;
    return this.completeBirthDate(date);
  },

  birthDate(profile) {
    const rows = profile?.basics || [];
    const value = rows.find((x) => /出生|生日|生年月日/.test(x.label))?.value || '';
    const source = String(value || profile?.raw || '');
    if (/不明|年份不明|公元前|年-\d{3,4}年|以前/.test(source)) return null;
    if (/约/.test(source)) {
      const yearOnly = source.match(/(\d{3,4})\s*年/);
      return this.completeBirthDate(yearOnly ? { year: +yearOnly[1], precision: 'year' } : null);
    }
    const match = source.match(/(\d{3,4})\s*[年\/-]\s*(\d{1,2})\s*[月\/-]\s*(\d{1,2})/);
    return this.completeBirthDate(match ? { year: +match[1], month: +match[2], day: +match[3], precision: 'day' } : null);
  },

  completeBirthDate(date) {
    if (!date || !date.year) return null;
    const birth = { year: +date.year };
    if (date.precision === 'day' && date.month && date.day) {
      birth.month = +date.month;
      birth.day = +date.day;
    }
    return birth;
  },

  ageAt(birth, at) {
    if (!birth || !at || !birth.year) return null;
    let age = at.year - birth.year;
    if (birth.month && birth.day && (at.month < birth.month || (at.month === birth.month && at.day < birth.day))) age -= 1;
    return age >= 0 && age < 1000 ? age : null;
  },
});


;// ---- world-lore.js ----
window.GameModules = window.GameModules || {};

window.GameModules.worldLore = {
  inflight: {},

  async ensure(worldTag, context = '') {
    const save = window.GameModules.sqliteSave;
    const existing = save.getWorldLore(worldTag);
    if (existing) {
      if (!existing.worldline && !save.getWorldline?.(worldTag)) {
        console.debug('[世界观] 旧设定缺少世界线，正在补齐:', worldTag);
        const upgraded = this.validate(existing, worldTag);
        await save.saveWorldLore(worldTag, upgraded);
        return upgraded;
      }
      if (!existing.worldline) existing.worldline = save.getWorldline?.(worldTag);
      console.debug('[世界观] 使用已保存设定:', worldTag);
      return existing;
    }
    const key = String(worldTag || '未知世界');
    if (this.inflight[key]) return this.inflight[key];
    this.inflight[key] = (async () => {
      console.debug('[世界观] 开始生成设定:', worldTag, 'contextLength=', String(context || '').length);
      const lore = await this.generate(worldTag, context);
      await save.saveWorldLore(worldTag, lore);
      return lore;
    })();
    try { return await this.inflight[key]; }
    finally { delete this.inflight[key]; }
  },

  async generate(worldTag, context) {
    try {
      if (this.isRealWorld(worldTag)) return this.realWorld(worldTag);
      if (!window.dzmm?.completions) return this.fallback(worldTag);
      const prompt = await this.prompt(worldTag, context);
      console.debug('[世界观] AI请求:', { worldTag, promptLength: prompt.length, model: window.GameModules.aiRequest?.selectedTextModel?.()});
      return await window.GameModules.jsonUtils.generateJsonWithRetry({
        source: 'world-lore',
        promptId: 'world-lore',
        model: window.GameModules.aiRequest?.selectedTextModel?.(),
        prompt,
        timeoutMs: 60000,
        maxAttempts: 2,
        maxTokens: 1600,
        max: 2,
        parse: (text) => this.parse(text),
        validate: (data) => this.validate(data, worldTag),
        repairHint: '只返回一行完整合法 JSON；不要 Markdown；不要尾随逗号；数组最后一项后必须直接闭合。',
      });
    } catch (err) {
      console.warn('世界观设定生成失败，使用兜底:', err.message);
      return this.fallback(worldTag);
    }
  },

  async prompt(worldTag, context) {
    return window.GameModules.renderPrompt('world-lore', { 世界: worldTag, 剧情上下文: String(context || '暂无').slice(0, 240) });
  },

  parse(text) {
    return window.GameModules.jsonUtils.parseLoose(String(text || '').replace(/[\u0000-\u001F]/g, ''));
  },

  parseOrRecover(text, worldTag) {
    try { return this.parse(text); } catch (err) {
      console.warn('[世界观] JSON解析失败，改用文本恢复兜底:', err.message);
      return this.recover(text, worldTag);
    }
  },

  recover(text, worldTag) {
    const utils = window.GameModules.jsonUtils;
    const source = String(text || '').replace(/```(?:json)?|```/g, '');
    const pick = (key, fallback) => utils.pickStringField?.(source, key) || fallback;
    const names = (key, fallback) => {
      const list = utils.pickObjectArrayNames?.(source, key) || [];
      return (list.length ? list : fallback).slice(0, 4).map((name) => ({ name, desc: `${name}影响${worldTag}的局势。` }));
    };
    return {
      worldTag,
      background: pick('background', `${worldTag}的日常秩序下隐藏着会改变角色处境的冲突。`),
      factions: names('factions', ['本地社会', '关键关系网']),
      specialJobs: names('specialJobs', ['普通职业']),
      jobRanks: utils.pickStringArray?.(source, 'jobRanks').slice(0, 6),
      coreRules: utils.pickStringArray?.(source, 'coreRules').slice(0, 6),
      calendar: this.fallback(worldTag).calendar,
      worldline: this.fallback(worldTag).worldline,
    };
  },

  validate(lore, worldTag) {
    lore.worldTag = worldTag;
    lore.background = String(lore.background || `${worldTag}的冲突正在暗处酝酿。`).slice(0, 240);
    lore.factions = this.list(lore.factions, '势力');
    lore.specialJobs = this.list(lore.specialJobs, '职业');
    lore.jobRanks = this.stringList(lore.jobRanks, 8);
    lore.coreRules = this.stringList(lore.coreRules, 8);
    lore.calendar = this.calendar(lore.calendar, worldTag);
    lore.specialFields = window.GameModules.worldAttributes.defaults(worldTag).fields;
    lore.worldline = this.worldline(lore.worldline, lore, worldTag);
    return lore;
  },

  worldline(raw, lore, worldTag) {
    const firstFaction = (raw?.factionMap && Object.keys(raw.factionMap)[0]) || 'faction_1';
    const factions = this.factionMap(raw?.factionMap, lore.factions, worldTag);
    const storyIndexes = this.stringList(raw?.storyIndexes, 8);
    const events = this.array(raw?.events).slice(0, 8).map((item, i) => {
      const obj = this.object(item);
      return {
        eventId: String(obj.eventId || obj.事件ID || `event_${i + 1}`).slice(0, 32),
        name: String(obj.name || obj.名称 || `事件${i + 1}`).slice(0, 28),
        time: String(obj.time || obj.时间 || raw?.timeRange || '时间未知').slice(0, 48),
        summary: String(obj.summary || obj.摘要 || item || '').slice(0, 90),
        detail: String(obj.detail || obj.详细信息 || obj.summary || item || '').slice(0, 420),
        storyIndexes: this.stringList(obj.storyIndexes || obj.剧情索引 || storyIndexes, 6),
        factionIds: this.stringList(obj.factionIds || obj.关联势力 || [firstFaction], 6),
        status: ['未触发', '进行中', '已结束', '改变原著'].includes(obj.status || obj.状态) ? (obj.status || obj.状态) : '进行中',
      };
    });
    return { timeRange: String(raw?.timeRange || raw?.时间 || '[时间未知 - 时间未知]').slice(0, 80), events, storyIndexes, factions };
  },

  factionMap(raw, list, worldTag) {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) return Object.fromEntries(Object.entries(raw).slice(0, 8).map(([id, item]) => [id, this.faction(id, item)]));
    return Object.fromEntries(this.array(list?.length ? list : [{ name: `${worldTag}主要势力`, desc: '影响当前世界线。' }]).slice(0, 4).map((item, i) => {
      const id = `faction_${i + 1}`;
      const obj = this.object(item);
      return [id, this.faction(id, { 名称: obj.name || item, 类型: '组织', 属性: { 说明: obj.desc || String(item || '暂无') }, 关系网: {}, 当前目标: obj.desc || '维持影响力', 近期决策: [], 状态: '正常' })];
    }));
  },

  faction(id, item) {
    const obj = this.object(item);
    const state = ['正常', '危机', '扩张', '衰退'].includes(obj.状态 || obj.status) ? (obj.状态 || obj.status) : '正常';
    return { 势力ID: String(obj.势力ID || obj.id || id), 名称: String(obj.名称 || obj.name || item || id).slice(0, 28), 类型: String(obj.类型 || obj.type || '组织').slice(0, 12), 属性: this.object(obj.属性 || obj.attrs), 关系网: this.object(obj.关系网 || obj.relations), 当前目标: String(obj.当前目标 || obj.goal || '').slice(0, 90), 近期决策: this.stringList(obj.近期决策 || obj.decisions, 6), 状态: state };
  },

  object(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  },

  array(value) {
    if (Array.isArray(value)) return value;
    return value == null || value === '' ? [] : [value];
  },

  stringList(value, max) {
    return this.array(value).slice(0, max).map(String);
  },

  list(items, prefix) {
    return this.array(items).slice(0, 8).map((item, index) => {
      const obj = this.object(item);
      return {
        name: String(obj.name || obj.名称 || item || `${prefix}${index + 1}`).slice(0, 18),
        desc: String(obj.desc || obj.description || obj.说明 || '').slice(0, 90),
      };
    });
  },

  calendar(raw, worldTag) {
    const obj = this.object(raw);
    const fallback = window.GameModules.entryTime?.calendarFor(worldTag, { worldTag }) || { label: '公元纪年', months: ['1月'], days: 31, hours: ['上午'], units: { year: '年', month: '月', day: '日', hour: '时' } };
    return {
      label: String(obj.label || fallback.label).slice(0, 14),
      months: this.stringList(this.array(obj.months).length ? obj.months : fallback.months, 12).map((x) => x.slice(0, 10)),
      days: Math.max(7, Math.min(60, Number(obj.days) || fallback.days || 30)),
      hours: this.stringList(this.array(obj.hours).length ? obj.hours : fallback.hours, 8).map((x) => x.slice(0, 10)),
      units: this.object(obj.units).year ? obj.units : fallback.units,
    };
  },

  isRealWorld(worldTag) { return /现实|现代都市|2026/.test(String(worldTag || '')); },

  realWorld(worldTag) {
    const event = { eventId: 'event_1', name: '现实日常展开', time: '当前时期', summary: '家庭与工作生活继续推进。', detail: '玩家在现实城市生活中处理工作、家庭和人际关系。', storyIndexes: ['现实日常'], factionIds: ['faction_1'], status: '进行中' };
    return this.validate({ worldTag, background: '2026年现代都市日常生活。', factions: [{ name: '家庭关系网', desc: '亲属与同住关系' }, { name: '职场组织', desc: '工作与社会协作' }], specialJobs: [{ name: '程序工程师', desc: '软件研发职业' }, { name: '学生', desc: '现代教育身份' }], jobRanks: ['初级', '中级', '高级'], coreRules: ['现实法律约束', '家庭责任影响', '职场秩序运行'], calendar: { label: '公元纪年', months: ['1月', '6月', '12月'], days: 31, hours: ['上午', '下午', '夜晚'], units: { year: '年', month: '月', day: '日', hour: '时' } }, worldline: { timeRange: '[2026年当前 - 后续日常]', events: [event], storyIndexes: ['现实日常'], factionMap: { faction_1: { 势力ID: 'faction_1', 名称: '现实社会', 类型: '社会', 属性: { 影响: '高' }, 关系网: {}, 当前目标: '维持日常秩序', 近期决策: [], 状态: '正常' } } }, specialFields: window.GameModules.worldAttributes.defaults(worldTag).fields }, worldTag);
  },

  fallback(worldTag) {
    const fate = String(worldTag).includes('Fate');
    return this.validate({
      worldTag,
      background: fate ? '现代魔术社会隐藏在日常背后，圣杯与魔术家系牵动暗处冲突。' : `${worldTag}中存在尚未公开的超常体系。`,
      factions: [{ name: fate ? '魔术协会' : '本地势力', desc: '维护秩序并争夺资源。' }],
      specialJobs: [{ name: fate ? '魔术师' : '异能者', desc: '掌握特殊力量的人。' }],
      jobRanks: fate ? ['见习', '正式', '开位', '祭位', '色位'] : ['低阶', '中阶', '高阶'],
      coreRules: ['力量与身份绑定', '秘密会改变角色处境'],
      worldline: {
        timeRange: '[当前起点 - 后续发展]',
        events: [{ eventId: 'event_1', name: fate ? '圣杯暗流' : '异变扩散', time: '当前时期', summary: '暗处冲突开始影响角色行动。', detail: '世界线中出现会改变原有剧情走向的异常事件，角色与势力会围绕资源、秘密或生存做出选择。', storyIndexes: ['默认剧情起点'], factionIds: ['faction_1'], status: '进行中' }],
        storyIndexes: ['默认剧情起点'],
        factionMap: { faction_1: { 势力ID: 'faction_1', 名称: fate ? '魔术协会' : '本地势力', 类型: '组织', 属性: { 影响力: '中', 资源: '中' }, 关系网: {}, 当前目标: '维持秩序并争夺关键资源', 近期决策: [], 状态: '正常' } },
      },
      specialFields: window.GameModules.worldAttributes.defaults(worldTag).fields,
    }, worldTag);
  },
};


;// ---- world-attributes.js ----
/**
 * 世界专属固化属性：运行时从这里写入 SQLite 世界属性表。
 */
window.GameModules = window.GameModules || {};

window.GameModules.worldAttributes = {
  defaults(worldTag) {
    return this.isTypeMoon(worldTag) ? this.typeMoon(worldTag) : { worldTag, source: 'fallback', fields: [] };
  },

  isTypeMoon(worldTag) {
    return /Fate|fate|Zero|型月|魔术|圣杯/.test(String(worldTag || ''));
  },

  typeMoon(worldTag) {
    return {
      worldTag,
      source: 'assets/fate zero/AI设定库/00_常驻加载/能力维度属性.md',
      fields: [
        { key: 'magic_circuit_quality', label: '魔术回路质', type: 'number', desc: '魔术回路单条质量、转换效率与稳定性。', grade: true },
        { key: 'magic_circuit_quantity', label: '魔术回路量', type: 'number', desc: '魔术回路的数量。', grade: true },
        { key: 'mana_capacity', label: '魔力量', type: 'number', desc: '当前可调用魔力储备。', grade: true },
        { key: 'magic_attribute', label: '魔术属性', type: 'list', desc: '元素或方向性属性。' },
        { key: 'magic_trait', label: '魔术特性', type: 'list', desc: '魔术运作倾向或术式特征。' },
        { key: 'origin', label: '起源', type: 'list', desc: '灵魂深处的根源性倾向。' },
        { key: 'mystery_affinity', label: '神秘适性', type: 'number', desc: '个人体质对神秘、魔术、诅咒或仪式的适配程度。', grade: true },
        { key: 'magic_crest_affinity', label: '刻印适配度', type: 'number', desc: '承受、继承或移植魔术刻印的个人适配程度。', grade: true },
      ],
    };
  },

  grade(value) {
    const n = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
    if (n >= 95) return 'EX';
    if (n >= 80) return 'A';
    if (n >= 65) return 'B';
    if (n >= 45) return 'C';
    if (n >= 25) return 'D';
    return 'E';
  },

  displayValue(field, value) {
    if (!field?.grade || typeof value !== 'number') return value;
    return `${value}（${this.grade(value)}）`;
  },
};


;// ---- character-profile-source.js ----
window.GameModules = window.GameModules || {};

window.GameModules.characterProfileSource = {
  async resolve(raw, store) {
    const candidate = this.candidate(raw, store);
    try {
      const profile = await window.GameModules.characterBrief?.loadProfile?.(candidate);
      if (profile?.path) return { raw: candidate, preset: profile };
    } catch (err) {
      console.warn('[角色卡] 预设资料读取失败，改用上下文生成:', err.message, err.stack);
    }
    return { raw: candidate, preset: null };
  },

  candidate(raw, store) {
    const data = typeof raw === 'object' && raw ? { ...raw } : { name: String(raw || '无名路人') };
    if (!data.work) data.work = store?.character?.work || '原创世界';
    return data;
  },

  presetText(profile) {
    if (!profile?.path) return '无预设人物 md：必须只根据人物基础区、玩家资料区、关系事件区和世界观资料生成。';
    const basics = (profile.basics || []).map((row) => `${row.label}：${row.value}`).join('\n');
    const sections = (profile.sections || []).map((section) => `【${section.title}】\n${section.body || (section.items || []).join('\n')}`).join('\n');
    return [`预设人物 md：${profile.path}`, profile.summary, basics, sections].filter(Boolean).join('\n').slice(0, 1800);
  },
};


;// ---- character-reason-fallback.js ----
window.GameModules = window.GameModules || {};

window.GameModules.characterReasonFallback = {
  text(profile = {}) {
    return [profile.name, profile.role, profile.job, profile.detail, profile.relationships, profile.personality, profile.work, profile.city, profile.workplace, profile.position].filter(Boolean).join('，');
  },

  usable(text) {
    const value = String(text || '').trim();
    return value && !/^错误：/.test(value) && !window.GameModules.characterProfile?.abstractReason?.(value);
  },

  mergeReasons(fallback, current = {}) {
    const out = { ...fallback };
    Object.entries(current || {}).forEach(([key, value]) => { if (this.usable(value)) out[key] = String(value).trim(); });
    return out;
  },

  roleReasons(profile = {}) {
    const name = profile.name || '该人物';
    const world = profile.work || profile.worldTag || '当前世界';
    const role = profile.role || profile.job || '当前身份';
    const detail = profile.detail || profile.personality || '已有资料';
    return {
      姓名: `${name}这个称呼与当前家庭、社交或人物关系链一致，能让他人在剧情里明确指认本人。`,
      所属世界: `${name}的生活地点、社会规则和行动范围都落在${world}，后续事件需要按这个世界处理。`,
      身份: `${detail}让${name}在当前场景中承担“${role}”这一社会位置。`,
      职业: profile.job ? `${name}长期承担${profile.job}相关工作或训练，所以职业写为${profile.job}。` : `${name}当前经历只显示日常身份和生活处境，还没有足够履历证明一个长期职业。`,
      性别: profile.gender ? `${name}在当前人物记录中以${profile.gender}参与家庭、社交和身体状态判定。` : `${name}目前的关系和行动记录没有给出可靠性别线索。`,
      生日: profile.birthday ? `${name}的生日已用于年龄和人生阶段计算，因此记录为${profile.birthday}。` : `${name}只暴露了身份阶段或关系称谓，还没有出现明确生日。`,
      人际关系: profile.relationships ? `${profile.relationships}会直接影响${name}对玩家的亲疏、信任和日常互动。` : `${name}暂时没有与玩家形成可确认的亲属、同事、同学或朋友关系。`,
      外貌: `${name}的可见形象按年龄、生活环境、职业或家庭处境克制描写，避免脱离当前经历。`,
      喜好: profile.preferences ? `${name}的稳定喜好记录为${profile.preferences}，会影响穿着、随身物和审美选择。` : `${name}暂未暴露强烈喜好，只能按身份、性格和生活处境保守判断。`,
      性格: `${profile.personality || detail}体现了${name}面对压力、关系和日常选择时的稳定反应。`,
      人物说明: `${detail}说明了${name}此刻的生活位置、关系牵连和可行动边界。`,
      社群角色: `${name}需要通过居住地、家庭、朋友圈或临时处境确定自己属于哪个社群。`,
      势力地位: `${name}在国家、学校、公司或组织中的层级会影响资源、责任和可用行动。`,
    };
  },

  rpgReasons(profile = {}, attrs = null) {
    const name = profile.name || '该人物';
    const text = this.text(profile);
    const has = (pattern) => pattern.test(text);
    const keys = window.GameModules.characterProfile.rpgFieldReasonKeys(attrs || profile.worldAttributes || null);
    const map = {
      age: profile.birthday ? `${name}的年龄按已记录生日与当前时间计算，生日事实来自玩家资料或人物基础区。` : `${name}的年龄按人物身份、关系称谓和当前生活处境折算，缺少明确生日时不凭空改写生日。`,
      level: `${name}的等级按其身份经历、当前生活压力和可行动范围折算，反映初始综合成熟度。`,
      exp: `${name}刚以当前资料首次落库，经验从其已有经历折算为初始进度，等待后续行动继续累积。`,
      free_attribute_points: `${name}尚未发生由玩家分配的升级结算，因此自由属性点保持初始余额。`,
      level_growth: `${name}还没有完整升级历史，成长记录从首次固化状态开始追踪。`,
      vitality: `${name}当前没有明确致命伤证据，生命力按年龄、体质和生活处境维持初始状态。`,
      stamina_pool: `${name}的精力按日常作息、身体负担和当前行动压力折算。`,
      satiety: `${name}当前没有明确饥饿或进食事件，饱食度保持日常稳定水平。`,
      hydration: `${name}当前没有明确脱水或补水事件，水分状态保持日常稳定水平。`,
      fatigue: `${name}的疲劳度按当前压力、身体负担和最近行动强度推定。`,
      strength: has(/训练|战斗|军人|运动|体力|劳动/) ? `${name}有体能训练、战斗或劳动经历，力量高于普通日常水平。` : `${name}缺少专项力量训练证据，力量按普通日常生活水平固化。`,
      agility: has(/运动|战斗|逃|敏捷|训练/) ? `${name}的行动经历需要反应和移动能力，因此敏捷被推到较高水平。` : `${name}主要处于普通生活节奏，敏捷按日常移动和反应能力固化。`,
      constitution: has(/病|虚弱|创伤|受伤/) ? `${name}的身体处境存在病弱、创伤或受伤线索，因此体质受到压低。` : `${name}没有严重疾病或伤势证据，体质按日常健康基础固化。`,
      intelligence: has(/学生|学习|工程|研究|教师|医生|知识/) ? `${name}的学习、工作或知识经历需要理解分析能力，因此智力较受支撑。` : `${name}缺少高强度知识训练证据，智力按生活经验与基础教育固化。`,
      perception: has(/观察|警惕|危险|照顾|调查/) ? `${name}长期需要观察环境或他人反应，因此感知能力被提高。` : `${name}当前处境没有高危侦察需求，感知按普通生活经验固化。`,
      willpower: has(/丧亲|压力|照顾|创伤|坚持|困难/) ? `${name}经历家庭压力、责任或创伤，需要持续忍耐，因此意志较高。` : `${name}缺少强烈逆境证据，意志按稳定日常心理承受力固化。`,
      charisma: has(/社交|管理|亲密|服务|领导|家庭/) ? `${name}的关系或社会角色需要沟通协调，因此魅力有现实支撑。` : `${name}没有突出社交影响力证据，魅力按普通人际表现固化。`,
      learning_ability: has(/学生|学习|研究|工程|技能|训练/) ? `${name}持续学习或训练经历支撑其学习能力。` : `${name}目前缺少持续训练证据，学习能力按普通适应力固化。`,
      mental_stability: has(/创伤|丧亲|恐惧|压力|病/) ? `${name}受到创伤、丧亲或压力影响，精神稳定性因此承压。` : `${name}没有明显心理冲击证据，精神稳定按日常状态固化。`,
      growth_potential: `${name}仍会随剧情行动、训练和关系变化成长，因此保留可发展潜力。`,
      action_ability: `${name}的行动能力按当前身体状态、身份限制和可支配资源综合固化。`,
      world_tag: `${name}的状态归属于${profile.work || profile.worldTag || '当前世界'}，用于区分世界专属规则。`,
      health: `${name}没有明确重伤事件，健康百分比由生命力初始状态换算。`,
      stamina: `${name}没有明确精疲力尽事件，精力百分比由精力池初始状态换算。`,
      professions: `${name}的职业树只记录已有职业资格或长期训练经历，缺少证据时保持为空。`,
      skills: `${name}的技能来自人物资料、现实身份或当前生活经验，后续使用和训练会继续更新。`,
      knowledge: `${name}的知识储备来自教育、职业、生活经验和世界观背景，缺少证据的领域不强行添加。`,
      items: `${name}的物品按日常携带和生活需要固化。`,
      wearing: `${name}的穿着按当前生活场景、身份和基础穿戴需求固化。`,
      factions: `${name}的社群角色来自住址、家庭、社交圈或当前处境。`,
      force_positions: `${name}的势力地位来自国家、学校、公司或组织层级归属。`,
      status_tags: `${name}的状态标签概括其身份、处境和所属世界，供剧情判定使用。`,
      derived: `${name}的衍生战斗与判定数值由力量、敏捷、体质、感知和意志等已固化能力计算得到。`,
      combat_simulation: `${name}的战斗模拟按当前能力、装备和状态生成，用于后续行动判定而不是独立编造。`,
      control_experience: `${name}尚未形成被玩家上线操控的经历，因此上线体验从初始状态开始记录。`,
    };
    return Object.fromEntries(keys.map((key) => [key, map[key] || `${name}的${key}按当前人物资料、生活经历和世界规则固化，后续由明确剧情事件更新。`]));
  },

  apply(profile = {}, attrs = null) {
    const role = this.roleReasons(profile);
    const rpg = this.rpgReasons(profile, attrs);
    return {
      ...profile,
      roleCardFieldReasons: this.mergeReasons(role, profile.roleCardFieldReasons),
      rpgFieldReasons: this.mergeReasons(rpg, profile.rpgFieldReasons),
    };
  },
};


;// ---- character-profile-template-class.js ----
window.GameModules = window.GameModules || {};

window.GameModules.characterProfileTemplateClass = {
  clone(value) { return JSON.parse(JSON.stringify(value)); },
  valueReason(value, reason) { return { value, reason }; },

  levelEffects() {
    return {
      lv1: { 程度介绍: '入门', 说明: '只能完成基础动作或理解基础概念' },
      lv2: { 程度介绍: '初学', 说明: '能在熟悉场景中稳定使用' },
      lv3: { 程度介绍: '熟练', 说明: '能独立处理常见复杂情况' },
      lv4: { 程度介绍: '专业', 说明: '能在专业场景中解决高难问题' },
      lv5: { 程度介绍: '专家', 说明: '能主导领域任务并指导他人' },
      lv6: { 程度介绍: '大师', 说明: '能形成体系化方法并培养团队' },
      lv7: { 程度介绍: '传说', 说明: '表现超越常规认知并影响领域规则' },
    };
  },

  metricObject(names) {
    return Object.fromEntries(Object.entries(names).map(([key, name]) => [key, { name, value: 0, status: `${name}因为当前人物处境形成初始状态`, reason: `${name}源于当前人物经历和关系证据` }]));
  },

  part1() {
    return {
      name: '角色姓名',
      worldTag: this.valueReason('所属世界', '所属世界来自人物资料、关系事件和世界观证据。'),
      age: this.valueReason(18, '年龄由人物资料、身份阶段和世界时间推断。'),
      gender: '性别',
      learningAbility: this.valueReason(8, '学习能力由教育经历、职业背景和适应表现判断。'),
      mentalStability: this.valueReason(8, '精神稳定度由性格、压力来源和过往经历判断。'),
      growthPotential: this.valueReason(8, '成长潜力由年龄阶段、资源环境和个人动机判断。'),
      actionAbility: this.valueReason(8, '行动能力由身体状态、生活经验和训练程度判断。'),
      relationships: '与玩家或相关人物的关系',
      role: '当前身份',
      detail: '人物背景、生活处境和进入剧情的原因。',
      appearance: '外貌、体态和可识别特征。',
      preferences: '稳定喜好，尤其是穿着偏好、颜色偏好、审美习惯和随身物偏好。',
      personality: '性格倾向、行为习惯和面对压力时的表现。',
      factions: [{ faction: '所属社群', role: '成员身份', reason: '该社群角色由人物生活处境和关系证据确定。' }],
      forcePositions: [{ force: '所属势力', position: '地位身份', reason: '该势力地位由人物身份、国籍或组织关系确定。' }],
      job: '',
      jobConfirmed: false,
      rank: '普通成员',
      control_experience: { 上线次数: 0, 习惯程度: '初次操控尚不熟悉' },
    };
  },

  part2() {
    return { name: '角色姓名', feeling: {
      emotions: this.metricObject({ cold: '冷静', fear: '恐惧', worry: '担忧', joy: '高兴', tension: '紧张', anger: '愤怒', shame: '羞耻', sadness: '悲伤', curiosity: '好奇', numbness: '麻木', jealousy: '嫉妒', despair: '绝望' }),
      playerFeelings: this.metricObject({ understanding: '了解', trust: '信任', resistance: '反抗', affection: '好感', friendship: '友情', familyLove: '亲情', romanticLove: '爱情', lust: '肉欲', awe: '畏惧', respect: '尊敬', admiration: '崇拜', dislike: '讨厌', dependence: '依赖', vigilance: '警惕', dominance: '支配欲', possessiveness: '占有欲', submission: '服从' }),
    } };
  },

  learnedItem(name) {
    return { name, desc: `${name}的实际表现与可用范围。`, level: 2, levelEffects: this.levelEffects(), reason: `${name}来自人物经历、训练或生活环境。` };
  },

  skillItem(name) {
    return { ...this.learnedItem(name), requiredKnowledge: ['基础知识'], requiredIntrinsicBase: ['intelligence'] };
  },

  professionItem(name) {
    return { ...this.learnedItem(name), requiredSkills: ['基础能力'], requiredKnowledge: ['基础知识'], requiredIntrinsicBase: ['intelligence'], reason: `${name}由人物技能、知识和基础属性共同支持。` };
  },

  part3() {
    return { name: '角色姓名', skills: [this.skillItem('基础能力')], knowledge: [this.learnedItem('基础知识')], professions: [this.professionItem('潜在职业')] };
  },

  wearSlot(clothing_position, name = '', description = '', reason = '当前场景没有穿戴该槽位物品。') {
    return { clothing_position, name, description, reason };
  },

  wearingObject() {
    return {
      head: this.wearSlot('头部'),
      neck: this.wearSlot('颈部'),
      innerwearTop: this.wearSlot('内衣'),
      top: this.wearSlot('上衣'),
      outerwear: this.wearSlot('外套'),
      gloves: this.wearSlot('手套'),
      waist: this.wearSlot('腰部'),
      innerwearBottom: this.wearSlot('内衣'),
      bottom: this.wearSlot('下装'),
      socks: this.wearSlot('袜子'),
      shoes: this.wearSlot('鞋子'),
      wrist: this.wearSlot('手腕'),
      slot: [],
    };
  },

  rpgField() {
    const intrinsic = ['strength', 'agility', 'constitution', 'intelligence', 'perception', 'willpower', 'charisma'];
    return {
      level: this.valueReason(3, '等级由年龄、训练程度、经验和世界观强度综合判断。'),
      intrinsicBase: Object.fromEntries(intrinsic.map((key) => [key, { value: 8, description: `${key}处于普通人到熟练者之间的表现。`, reason: `${key}由人物经历、身体状态和世界规则判断。` }])),
    };
  },

  part4() {
    return { name: '角色姓名', items: [{ name: '随身物品', description: '当前人物合理随身携带的物品。', quantity: 1, reason: '该物品由身份、场景和行动需要决定。' }], wearing: this.wearingObject() };
  },

  bodyProfile() {
    return [
      { index: 1, part: '头发', description: '天然头发的色泽、蓬松度和垂落走向。' },
      { index: 2, part: '脸部', description: '素净面容的眉眼鼻唇与天然气色。' },
      { index: 3, part: '耳朵', description: '耳廓、耳垂与耳后肌肤的自然形态。' },
      { index: 4, part: '脖颈', description: '颈部线条、锁骨与颈窝的自然轮廓。' },
      { index: 5, part: '胸部', description: '胸部未经束缚的天然轮廓和细节。' },
      { index: 6, part: '双臂', description: '手臂、手腕、手背和手指的自然线条。' },
      { index: 7, part: '小腹', description: '腹部、肚脐和呼吸起伏的自然状态。' },
      { index: 8, part: '臀部', description: '臀部饱满度和腰臀连接处的自然弧线。' },
      { index: 9, part: '神秘花园', description: '含蓄身体美学下的天然私密轮廓。' },
      { index: 10, part: '双大腿', description: '大腿线条、肌肤质感和站立时的自然贴合。' },
      { index: 11, part: '双小腿', description: '小腿肚、跟腱、脚踝和脚背的自然弧线。' },
    ];
  },

  dressedProfile() {
    return [
      { index: 1, part: '头发', description: '盛装造型后的发型、光泽和发饰效果。' },
      { index: 2, part: '脸部', description: '完整妆容修饰后的眉眼鼻唇与肤色。' },
      { index: 3, part: '耳朵', description: '佩戴耳饰后耳廓、耳垂与饰物反光。' },
      { index: 4, part: '脖颈', description: '颈部饰品与锁骨颈线的盛装修饰。' },
      { index: 5, part: '胸部', description: '胸衣、礼服或衬衣塑造后的胸部轮廓。' },
      { index: 6, part: '双臂', description: '袖口、臂饰、手镯、戒指和指甲修饰。' },
      { index: 7, part: '小腹', description: '束腰、腰带或紧身服饰塑形后的腰腹。' },
      { index: 8, part: '臀部', description: '裙装或裤装包裹后的臀部线条。' },
      { index: 9, part: '神秘花园', description: '下装精心遮掩与包裹后的含蓄状态。' },
      { index: 10, part: '双大腿', description: '丝袜、裤袜、长靴或裙摆衬托的大腿状态。' },
      { index: 11, part: '双小腿', description: '鞋袜与鞋履装饰修饰后的小腿线条。' },
    ];
  },

  part5() {
    return { name: '角色姓名', bodyProfile: this.bodyProfile() };
  },

  part6() {
    return { name: '角色姓名', dressedProfile: this.dressedProfile() };
  },

  part7() {
    return { name: '角色姓名', rpgField: this.rpgField() };
  },

  parts() { return { 1: this.clone(this.part1()), 2: this.clone(this.part2()), 3: this.clone(this.part3()), 4: this.clone(this.part4()), 5: this.clone(this.part5()), 6: this.clone(this.part6()), 7: this.clone(this.part7()) }; },
};


;// ---- character-profile.js ----
/**
 * 出场人物设定：为已知角色与路人 NPC 固化完整资料。
 */
window.GameModules = window.GameModules || {};

window.GameModules.characterProfile = {
  async ensure(raw, store, context = '') {
    const source = await window.GameModules.characterProfileSource.resolve(raw, store);
    const base = this.normalize(source.raw, store, source.preset);
    const signature = this.inputSignature(base, context, store, source.preset);
    const existing = base.forceRoleCardRegenerate ? null : this.findSavedRoleCard(base, signature);
    if (existing) {
      const profile = { ...existing.profile, id: base.id, work: existing.profile?.work || base.work };
      store?.finishRoleCardLoading?.(base.id, profile);
      return profile;
    }
    const lore = await window.GameModules.worldLore.ensure(base.work, context);
    const attrs = await window.GameModules.rpgState.ensureWorldAttributes(base.work);
    return this.generate(base, lore, attrs, context, store, signature, source.preset);
  },

  onProgress(store, id, stepKey, status, text = '', progress = null) {
    store?.updateRoleCardLoadingStep?.(id, stepKey, status, text, progress);
  },

  reportFeelingProgress(store, loadingId, feelingPartial = {}, total = null) {
    if (!store || !loadingId) return;
    const stepTotal = total ?? this.partProgressTotal(2);
    this.onProgress(store, loadingId, 'feeling', 'running', '', {
      done: this.partProgressDone(2, { feeling: feelingPartial }),
      total: stepTotal,
    });
  },

  part2FeelingContext(vars = {}) {
    return [vars.part1Summary, vars.关系事件区, vars.玩家备注区].filter(Boolean).join('\n');
  },

  partProgressTotal(partIndex, template, attrs = null, part = null) {
    if (partIndex === 2) return window.GameModules.metrics.emotionKeys.length + window.GameModules.metrics.playerKeys.length;
    if (partIndex === 3 && part) return this.partProgressDone(3, part) || 3;
    if (partIndex === 4 && part) return this.partProgressDone(4, part) || 13;
    if (partIndex === 5 || partIndex === 6) return this.bodyProfileParts().length;
    if (partIndex === 7) {
      const intrinsicCount = Object.keys(attrs?.intrinsicBase || {}).length;
      return intrinsicCount ? 1 + intrinsicCount : 8;
    }
    return Object.keys(template || {}).length || 1;
  },

  partProgressDone(partIndex, part = {}) {
    if (partIndex === 2) {
      const emotions = this.metricProgressDone(part.feeling?.emotions, window.GameModules.metrics.emotionKeys);
      const playerFeelings = this.metricProgressDone(part.feeling?.playerFeelings, window.GameModules.metrics.playerKeys);
      return emotions + playerFeelings;
    }
    if (partIndex === 3) return ['skills', 'knowledge', 'professions'].reduce((sum, key) => sum + ((part[key] || []).length), 0);
    if (partIndex === 4) return (part.items || []).length + this.fixedWearingSlots().filter((slot) => this.wearingSlotProgressDone(part.wearing?.[slot])).length + (part.wearing?.slot || []).length;
    if (partIndex === 5) return this.bodyProfileCompleteItems(part.bodyProfile).length;
    if (partIndex === 6) return this.bodyProfileCompleteItems(part.dressedProfile).length;
    if (partIndex === 7) return (this.valueReasonComplete(part.rpgField?.level) ? 1 : 0) + Object.values(part.rpgField?.intrinsicBase || {}).filter((item) => this.intrinsicBaseItemComplete(item)).length;
    const template = this.partTemplateCache?.[partIndex] || {};
    return Object.keys(template).filter((key) => this.partFieldComplete(partIndex, key, part[key], template[key], part)).length;
  },

  metricProgressDone(value, keys) {
    return this.metricGroupAsArray(value, keys).filter((item) => item.value !== undefined && String(item.status || '').trim() && String(item.reason || '').trim()).length;
  },

  wearingSlotProgressDone(item) {
    return item && typeof item === 'object' && String(item.clothing_position || '').trim() && String(item.reason || '').trim() && Object.prototype.hasOwnProperty.call(item, 'description');
  },

  findSavedRoleCard(base, signature) {
    const save = window.GameModules.sqliteSave;
    const candidates = [
      save.getCharacterState(base.id),
      save.getCharacterStateByName?.(base.name, base.work),
      save.getCharacterStateByName?.(base.name),
    ].filter(Boolean);
    const exact = candidates.find((state) => this.roleCardMatchesTarget(state.profile, base) && this.isReusableRoleCard(state.profile, signature));
    if (exact) return exact;
    return candidates.find((state) => this.isReusableSavedRoleCard(state, base)) || null;
  },

  isReusableSavedRoleCard(state, base) {
    const profile = state?.profile;
    if (!this.roleCardMatchesTarget(profile, base)) return false;
    const savedWorld = profile.work || state.worldTag;
    if (base.work && savedWorld && savedWorld !== base.work) return false;
    return this.isReusableRoleCard(profile, null);
  },

  roleCardMatchesTarget(profile, base = {}) {
    if (!profile || profile.name !== base.name) return false;
    const lockedAge = this.lockedAge({ age: '' }, base);
    if (lockedAge !== undefined && lockedAge !== null && String(lockedAge).trim()) {
      const profileAge = profile.age && typeof profile.age === 'object' && profile.age.value !== undefined ? profile.age.value : profile.age;
      if (String(profileAge || '').trim() !== String(lockedAge).trim()) return false;
    }
    if (base.gender && profile.gender && String(profile.gender).trim() !== String(base.gender).trim()) return false;
    return true;
  },

  withKnown(raw, store) {
    return raw;
  },

  isRoleCard(profile) {
    const hasFactions = Array.isArray(profile?.factions) && profile.factions.length;
    const forces = profile?.forcePositions || profile?.force_positions;
    const hasForces = Array.isArray(forces) && forces.length;
    return Boolean(profile?.roleCard && this.isConcreteName(profile.name) && profile?.role && profile?.detail && profile?.personality && profile?.appearance && hasFactions && hasForces);
  },

  isConcreteName(name) {
    const raw = String(name || '').trim();
    return Boolean(raw) && !/待命名|待AI补全|等待AI补全|等待ai补全|姓名待AI补全|未知|需要AI/i.test(raw)
      && !/^(妹妹|姐姐|哥哥|弟弟|父亲|母亲|爸爸|妈妈|联系人|微信联系人)$/.test(raw)
      && !/^(双胞胎|三胞胎|多胞胎)?(妹妹|姐姐|哥哥|弟弟|兄弟|姐妹|联系人)(之一|之二|之三|其一|其二|其三)$/.test(raw);
  },

  findKnown(raw, store) {
    const name = typeof raw === 'string' ? raw : raw?.name;
    if (!name) return null;
    return store.findKnownCharacter?.(name) || null;
  },

  normalize(raw, store, preset = null) {
    const data = typeof raw === 'object' && raw ? raw : { name: String(raw || '无名路人') };
    const name = String(data.name || '无名路人').slice(0, 16);
    const work = String(store?.currentWorldTag?.() || data.work || store?.character?.work || '原创世界').slice(0, 40);
    const id = data.id || `npc-${this.slug(work)}-${this.slug(name)}`;
    return {
      id,
      name,
      work,
      role: String(data.role || (data.isMinor ? '路人' : '出场人物')).slice(0, 18),
      gender: String(data.gender || '').slice(0, 8),
      relationships: this.formatRelationships(data.relationships || ''),
      nameRule: String(data.nameRule || '').slice(0, 80),
      detail: String(data.detail || data.desc || preset?.summary || '刚被剧情卷入的人物。').slice(0, 120),
      appearance: String(data.appearance || '外貌尚未固化。').slice(0, 120),
      preferences: String(data.preferences || data.wearingPreference || '').slice(0, 120),
      personality: String(data.personality || '谨慎观察局势。').slice(0, 80),
      age: (data.age && typeof data.age === 'object' && data.age.value !== undefined ? data.age.value : data.age) || (String(`${data.role || ''} ${data.relationships || ''} ${data.detail || data.desc || preset?.summary || ''}`).match(/(\d{1,3})\s*岁/)?.[1] || ''),
      birthday: String(data.birthday || '').slice(0, 20),
      aliases: Array.isArray(data.aliases) ? data.aliases.slice(0, 4).map(String) : [],
      skills: Array.isArray(data.skills) ? data.skills.slice(0, 10) : [],
      items: this.carryItemsLoose(data.items, '物品'),
      wearing: this.wearingItemsLoose(data.wearing),
      importance: data.importance || (data.isMinor ? 'minor' : 'support'),
      isMinor: Boolean(data.isMinor),
      roleCard: true,
      forceRoleCardRegenerate: Boolean(data.forceRoleCardRegenerate),
      retryFromStep: String(data.retryFromStep || ''),
      roleCardRetryParts: data.roleCardRetryParts && typeof data.roleCardRetryParts === 'object' ? data.roleCardRetryParts : {},
      presetProfilePath: preset?.path || '',
    };
  },

  async generate(base, lore, attrs, context, store, signature = '', preset = null) {
    try {
      const providerId = window.GameModules.aiProvider?.currentProviderId?.() || 'deepseek';
      const provider = window.GameModules.aiProvider?.currentProvider?.();
      if (!provider || typeof provider.complete !== 'function') {
        throw new Error(`无法生成个人资料：文本 AI 提供方 ${providerId} 未就绪，请先在激活首页配置模型`);
      }
      this.partTemplateCache = null;
      const sections = window.GameModules.promptSections;
      const player = sections.playerProfile(store);
      const templates = await this.loadPartTemplates();
      const commonVars = {
        人物预设资料区: window.GameModules.characterProfileSource.presetText(preset),
        人物基础区: sections.characterBase(base),
        玩家基础资料区: player.playerBasic,
        玩家现实身份区: player.playerIdentity,
        玩家居住家庭区: player.playerHome,
        玩家人际关系区: player.playerRelations,
        玩家备注区: player.playerNotes,
        关系事件区: sections.relationContext(context),
        世界观资料区: sections.worldLore(lore),
        世界字段: sections.worldFields(attrs),
        角色卡目标作品: this.roleCardPromptTarget(base, store),
        玩家本人目标锁定: this.targetLockText(base),
      };
      const loadingId = base.id;
      const retryParts = base.roleCardRetryParts || {};
      const shouldReuse = (stepKey) => this.shouldReuseRoleCardPart(base.retryFromStep, stepKey) && retryParts[stepKey];
      const remember = (stepKey, part) => store?.rememberRoleCardLoadingPart?.(loadingId, stepKey, part);
      const part1Total = this.partProgressTotal(1, templates[1], attrs);
      let part1 = shouldReuse('profile') ? retryParts.profile : null;
      if (!part1) {
        this.onProgress(store, loadingId, 'profile', 'running', '', { done: 0, total: part1Total });
        part1 = await this.generatePart(1, 'character-profile-part1-base-identity', commonVars, templates[1], base, lore, attrs, store);
        this.onProgress(store, loadingId, 'profile', 'done', '', { done: this.partProgressDone(1, part1), total: part1Total });
        remember('profile', part1);
      }
      store?.updateRoleCardLoading?.(loadingId, { name: part1.name || base.name, status: 'running' });
      const p1Summary = this.part1Summary(part1);
      const namedBase = { ...base, name: this.isConcreteName(base.name) ? base.name : (part1.name || base.name) };
      let essentialPref = shouldReuse('essentialPreferences') ? retryParts.essentialPreferences : null;
      if (!essentialPref) {
        this.onProgress(store, loadingId, 'essentialPreferences', 'running', '', { done: 0, total: 5 });
        essentialPref = await this.generateEssentialPreferenceLayers(namedBase, store, part1, p1Summary, commonVars);
        this.onProgress(store, loadingId, 'essentialPreferences', 'done', '', { done: 5, total: 5 });
        remember('essentialPreferences', essentialPref);
      }
      const essentialPrefSummary = window.GameModules.playerAspirationPreferenceLayers?.summaryText?.(essentialPref?.essentialPreferenceLayers) || '';
      const part2Total = this.partProgressTotal(2, templates[2], attrs);
      let part2 = shouldReuse('feeling') ? retryParts.feeling : null;
      if (!part2) {
        part2 = await this.generateOrDefaultPart(2, 'character-profile-part2-feeling', 'feeling', { ...commonVars, part1Summary: p1Summary, 本质偏好五层: essentialPrefSummary }, templates[2], namedBase, lore, attrs, store, part2Total);
        remember('feeling', part2);
      }
      const part3StartTotal = this.partProgressTotal(3, templates[3], attrs);
      let part3 = shouldReuse('abilities') ? retryParts.abilities : null;
      if (!part3) {
        this.onProgress(store, loadingId, 'abilities', 'running', '', { done: 0, total: part3StartTotal });
        part3 = await this.generatePart(3, 'character-profile-part3-abilities-professions', { ...commonVars, part1Summary: p1Summary }, templates[3], namedBase, lore, attrs, store);
        const part3Total = this.partProgressTotal(3, templates[3], attrs, part3);
        this.onProgress(store, loadingId, 'abilities', 'done', '', { done: this.partProgressDone(3, part3), total: part3Total });
        remember('abilities', part3);
      }
      const rpgKeys = this.rpgFieldReasonKeys(attrs);
      const part4StartTotal = this.partProgressTotal(4, templates[4], attrs);
      let part4 = shouldReuse('inventory') ? retryParts.inventory : null;
      if (!part4) {
        this.onProgress(store, loadingId, 'inventory', 'running', '', { done: 0, total: part4StartTotal });
        part4 = await this.generatePart(4, 'character-profile-part4-inventory-wearing-rpg', { ...commonVars, part1Summary: p1Summary }, templates[4], namedBase, lore, attrs, store);
        const part4Total = this.partProgressTotal(4, templates[4], attrs, part4);
        this.onProgress(store, loadingId, 'inventory', 'done', '', { done: this.partProgressDone(4, part4), total: part4Total });
        remember('inventory', part4);
      }
      const p3Summary = this.part3Summary(part3);
      const p4Summary = this.part4Summary(part4);
      const part5Total = this.partProgressTotal(5, templates[5], attrs);
      let part5 = shouldReuse('bodyProfile') ? retryParts.bodyProfile : null;
      if (!part5) {
        part5 = await this.generateOrDefaultPart(5, 'character-profile-part5-body-profile', 'bodyProfile', { ...commonVars, part1Summary: p1Summary }, templates[5], namedBase, lore, attrs, store, part5Total);
        remember('bodyProfile', part5);
      }
      const p5Summary = this.bodyProfileSummary(part5.bodyProfile);
      const part6Total = this.partProgressTotal(6, templates[6], attrs);
      let part6 = shouldReuse('dressedProfile') ? retryParts.dressedProfile : null;
      if (!part6) {
        part6 = await this.generateOrDefaultPart(6, 'character-profile-part6-dressed-profile', 'dressedProfile', { ...commonVars, part1Summary: p1Summary, part4Summary: p4Summary, part5Summary: p5Summary }, templates[6], namedBase, lore, attrs, store, part6Total);
        remember('dressedProfile', part6);
      }
      const part7Total = this.partProgressTotal(7, templates[7], attrs);
      let part7 = shouldReuse('rpgField') ? retryParts.rpgField : null;
      if (!part7) {
        this.onProgress(store, loadingId, 'rpgField', 'running', '', { done: 0, total: part7Total });
        part7 = await this.generatePart(7, 'character-profile-part7-rpg-field', { ...commonVars, part1Summary: p1Summary, part3Summary: p3Summary, part4Summary: p4Summary, 世界字段: sections.worldFields(attrs), RPG字段列表: rpgKeys.join('、'), RPG字段列表JSON: rpgKeys.map((key) => `"${key}"`).join(', ') }, templates[7], namedBase, lore, attrs, store);
        this.onProgress(store, loadingId, 'rpgField', 'done', '', { done: this.partProgressDone(7, part7), total: part7Total });
        remember('rpgField', part7);
      }
      const merged = this.mergeGeneratedParts(part1, part2, part3, { ...part4, ...part5, ...part6, ...part7, essentialPreferenceLayers: essentialPref?.essentialPreferenceLayers, essentialPreferenceLayersLocked: true }, attrs);
      const profile = this.validate(merged, base, lore, attrs, store, { skipInitialMetrics: false });
      return this.withSignature(profile, signature);
    } catch (err) {
      store?.failRoleCardLoading?.(base.id, err.message || '生成失败');
      console.warn('人物设定生成失败:', err.code, err.message, err.stack);
      throw err;
    }
  },

  shouldReuseRoleCardPart(retryFromStep = '', stepKey = '') {
    if (!retryFromStep) return false;
    const order = ['profile', 'essentialPreferences', 'feeling', 'abilities', 'inventory', 'bodyProfile', 'dressedProfile', 'rpgField', 'state'];
    const retryIndex = order.indexOf(retryFromStep);
    const stepIndex = order.indexOf(stepKey);
    return retryIndex > 0 && stepIndex >= 0 && stepIndex < retryIndex;
  },

  roleCardPromptTarget(base = {}, store = null) {
    const work = String(base.work || store?.selectedWork || store?.character?.work || '').trim();
    if (!work || this.isRealWorldRoleCardTarget(work, base)) return '2026 现代都市互动小说';
    return work;
  },

  isRealWorldRoleCardTarget(work = '', base = {}) {
    const realWorld = String(window.GameModules.realWorld2026?.label || '2026 现代都市现实世界').trim();
    const raw = String(work || '').trim();
    return base.id === 'player-self' || base.isPlayer || raw === realWorld || /^(原创世界|现实世界|2026\s*现代都市现实世界|2026\s*现代都市互动小说)$/.test(raw);
  },

  targetLockText(base = {}) {
    const locks = [];
    const name = String(base.name || '').trim();
    if (name) locks.push(`本次只生成候选人物本人“${name}”的角色卡；JSON 根字段 name 必须逐字写“${name}”，不得改字、换名、写成玩家、亲属、联系人或关系事件里的其他姓名。`);
    if (base.age !== undefined && base.age !== null && String(base.age).trim()) locks.push(`人物基础区已指定年龄为“${base.age}”，age.value 必须等于该年龄数字，不得按玩家年龄、随机年龄或其他人物年龄改写。`);
    if (base.gender) locks.push(`人物基础区已指定性别为“${base.gender}”，gender 必须保持一致。`);
    if (base.birthday) locks.push(`人物基础区已指定生日为“${base.birthday}”，不得用其他人物生日覆盖。`);
    if (base.id === 'player-self') locks.push('目标是玩家本人时，只能生成玩家本人，不得生成妹妹、姐姐、父母、联系人或关系事件里的任何其他人。');
    return locks.length ? locks.join('\n') : '无。';
  },

  async generateEssentialPreferenceLayers(base, store, part1, p1Summary, commonVars = {}) {
    const tool = window.GameModules.playerAspirationPreferenceLayers;
    if ((base.id === 'player-self' || base.isPlayer) && store?.playerAspiration?.alignment) {
      const layers = tool?.buildFromPlayerAspiration?.(store.playerAspiration);
      if (layers) return { name: base.name || part1.name, essentialPreferenceLayers: layers };
    }
    try {
      const prompt = await window.GameModules.renderPrompt('character-profile-essential-preference-layers', { ...commonVars, part1Summary: p1Summary });
      const raw = await window.GameModules.jsonUtils.generateJsonWithRetry({
        source: 'character-profile-essential-preference-layers',
        promptId: 'character-profile-essential-preference-layers',
        model: window.GameModules.aiRequest?.selectedTextModel?.(),
        timeoutMs: 60000,
        prompt,
        format: prompt,
        max: 2,
      });
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const layers = tool?.normalizeLayers?.(parsed?.essentialPreferenceLayers || parsed);
      if (layers?.layer1) {
        return { name: parsed?.name || base.name || part1.name, essentialPreferenceLayers: layers };
      }
    } catch (err) {
      console.warn('[角色卡] 本质偏好五层 AI 生成失败，使用 Part1 推断兜底:', err?.message || err);
    }
    return { name: base.name || part1.name, essentialPreferenceLayers: this.fallbackEssentialPreferenceLayers(part1) };
  },

  fallbackEssentialPreferenceLayers(part1 = {}) {
    const tool = window.GameModules.playerAspirationPreferenceLayers;
    const personality = String(part1.personality || '').trim();
    const alignment = /邪恶|自私|冷酷|算计|不择手段/.test(personality) ? '中立邪恶'
      : /善良|温柔|体贴|正直|守序/.test(personality) ? '中立善良'
      : '绝对中立';
    const cfg = window.GameModules.playerAspirationConfig;
    const alignLabel = cfg?.alignmentById?.(alignment)?.label || alignment;
    return tool.normalizeLayers({
      layer1: tool.formatLayer1(alignLabel),
      layer2: tool.formatLayer2(50, '理性感性居中'),
      layer3: tool.formatLayer3(cfg?.defaultAxes?.()),
      layer4: tool.formatLayer4(cfg?.defaultGuiltAxes?.()),
      layer5: `心理偏好: ${String(part1.preferences || personality || '未显化').slice(0, 80)}`,
    });
  },

  async loadPartTemplates() {
    if (this.partTemplateCache) return this.partTemplateCache;
    const templates = window.GameModules.characterProfileTemplateClass?.parts?.();
    if (!templates?.[1] || !templates?.[2] || !templates?.[3] || !templates?.[4] || !templates?.[5] || !templates?.[6] || !templates?.[7]) throw new Error('角色卡模板类未加载，无法生成七段角色卡。');
    this.partTemplateCache = templates;
    return templates;
  },

  async generateOrDefaultPart(partIndex, promptId, stepKey, vars, template, base, lore, attrs, store, total) {
    if (partIndex === 2) {
      return this.generatePart2Progressive(promptId, stepKey, vars, template, base, lore, attrs, store, total);
    }
    const loadingId = base.id;
    this.onProgress(store, loadingId, stepKey, 'running', '', { done: 0, total });
    const part = await this.generatePart(partIndex, promptId, vars, template, base, lore, attrs, store);
    this.onProgress(store, loadingId, stepKey, 'done', '', { done: this.partProgressDone(partIndex, part), total });
    return part;
  },

  async generatePart2Progressive(promptId, stepKey, vars, template, base, lore, attrs, store, total) {
    const loadingId = base.id;
    const stepTotal = total ?? this.partProgressTotal(2, template);
    this.onProgress(store, loadingId, stepKey, 'running', '', { done: 0, total: stepTotal });
    const profile = { name: base.name };
    const context = this.part2FeelingContext(vars);
    let part = null;
    const preferSingleShot = window.GameModules.config?.characterProfile?.preferSingleShotPart2 !== false;
    if (preferSingleShot && store?.roleCardLoadingState?.open) {
      try {
        part = await this.generatePart2SingleShot(promptId, vars, template, base, store, stepTotal, loadingId);
      } catch (err) {
        console.warn('[角色卡Part2] 单次情感生成失败，改用分块并行:', err?.message || err);
      }
    }
    if (!part || !this.feelingComplete(part.feeling)) {
      const feeling = await this.generatePartFeeling(profile, base, lore, attrs, context, store, 'all', { loadingId, total: stepTotal });
      part = this.lockPartTargetName(2, this.sanitizePart(2, { name: base.name, feeling }, template), base);
      this.reportFeelingProgress(store, loadingId, part.feeling || feeling, stepTotal);
    }
    const format = this.partPromptWithTemplate(await window.GameModules.renderPrompt(promptId, vars), template, 2);
    part = await this.completeMissingPart(2, part, template, format, base, lore, attrs, store);
    part = this.validatePart(2, part, base, lore, attrs, store, template);
    this.onProgress(store, loadingId, stepKey, 'done', '', { done: this.partProgressDone(2, part), total: stepTotal });
    return part;
  },

  async generatePart2SingleShot(promptId, vars, template, base, store, stepTotal, loadingId) {
    const prompt = await window.GameModules.renderPrompt(promptId, vars);
    const format = this.partPromptWithTemplate(prompt, template, 2);
    const raw = await window.GameModules.jsonUtils.generateJsonWithRetry({
      source: 'character-profile-part2-feeling-single',
      promptId,
      model: window.GameModules.aiRequest?.selectedTextModel?.(),
      timeoutMs: 90000,
      prompt: format,
      format,
      repairHint: this.partRepairHint(2, base, null, template),
      requiredRawFields: this.partRequiredRawFields(2),
      parse: (text) => this.parsePartOutput(2, text, base),
      max: 2,
    });
    const normalized = await this.normalizeJsonPart(2, raw, base);
    const part = this.lockPartTargetName(2, this.sanitizePart(2, normalized, template), base);
    if (!this.feelingComplete(part.feeling)) throw new Error('Part2 单次生成结果不完整');
    this.reportFeelingProgress(store, loadingId, part.feeling, stepTotal);
    return part;
  },

  async generatePart(partIndex, promptId, vars, template, base, lore, attrs, store) {
    const prompt = await window.GameModules.renderPrompt(promptId, vars);
    const format = this.partPromptWithTemplate(prompt, template, partIndex);
    const raw = await window.GameModules.jsonUtils.generateJsonWithRetry({
      source: `character-profile-part${partIndex}`,
      promptId,
      model: window.GameModules.aiRequest?.selectedTextModel?.(),
      timeoutMs: 60000,
      prompt: format,
      format,
      repairHint: this.partRepairHint(partIndex, base, attrs, template),
      requiredRawFields: this.partRequiredRawFields(partIndex),
      parse: (text) => this.parsePartOutput(partIndex, text, base),
      max: 2,
    });
    const repairedRaw = [2, 3, 4, 5, 6].includes(partIndex)
      ? await this.normalizeJsonPart(partIndex, raw, base)
      : await this.repairCsvPartRows(partIndex, raw, format, base, lore, attrs, store, vars);
    let normalized = this.lockPartTargetName(partIndex, this.sanitizePart(partIndex, repairedRaw, template), base);
    if (partIndex === 2) this.reportFeelingProgress(store, base.id, normalized.feeling || {}, this.partProgressTotal(2, template));
    normalized = await this.completeMissingPart(partIndex, normalized, template, format, base, lore, attrs, store);
    return this.validatePart(partIndex, normalized, base, lore, attrs, store, template);
  },

  partRequiredRawFields(partIndex, fields = null) {
    const byPart = {
      1: ['name', 'worldTag', 'age', 'gender', 'factions', 'forcePositions'],
      2: ['name', 'feeling', 'emotions', 'playerFeelings'],
      3: ['name', 'skills', 'knowledge', 'professions', 'level', 'reason'],
      4: ['name', 'items', 'wearing', 'head', 'top', 'bottom', 'socks', 'shoes'],
      5: ['name', 'bodyProfile', '头发', '脸部', '神秘花园', '双小腿'],
      6: ['name', 'dressedProfile', '头发', '脸部', '神秘花园', '双小腿'],
      7: ['name', 'rpgField', 'level', 'intrinsicBase', 'strength', 'agility', 'constitution', 'intelligence', 'perception', 'willpower', 'charisma'],
    };
    if (!fields) return byPart[partIndex] || [];
    const nested = [];
    if (fields.includes('feeling')) nested.push('feeling', 'emotions', 'playerFeelings', 'cold', 'curiosity', 'understanding', 'submission');
    if (fields.includes('wearing')) nested.push('wearing', 'head', 'top', 'bottom', 'shoes', 'slot');
    if (fields.includes('bodyProfile')) nested.push('bodyProfile', '头发', '脸部', '胸部', '神秘花园', '双小腿');
    if (fields.includes('dressedProfile')) nested.push('dressedProfile', '头发', '脸部', '胸部', '神秘花园', '双小腿');
    if (fields.includes('rpgField')) nested.push('rpgField', 'level', 'intrinsicBase', 'strength', 'agility', 'constitution', 'intelligence', 'perception', 'willpower', 'charisma');
    return [...new Set([...fields, ...nested])];
  },

  partPromptWithTemplate(prompt, template, partIndex) {
    return [
      prompt,
      '',
      '## MD角色卡模板字段骨架',
      '下方模板由 MD 文档结构生成，本次输出必须严格遵守这些字段名、嵌套结构和数组元素字段。',
      '模板中不存在的字段不要输出；不要把旧版 force_positions、数组式 feeling 或数组式 wearing 写回角色卡。',
      `Part${partIndex} 模板：`,
      JSON.stringify(template, null, 2),
    ].join('\n');
  },

  async normalizeJsonPart(partIndex, raw, base = {}) {
    let data = raw && typeof raw === 'object' ? raw : this.parsePartOutput(partIndex, String(raw || ''), base);
    if (partIndex === 3 && data) this.promotePart3Dependencies(data);
    if (partIndex === 2 && data?.feeling) data = { ...data, feeling: this.normalizeFeelingObject(data.feeling) };
    if (partIndex === 5 || partIndex === 6) data = this.completeBodyProfileFallback(partIndex, data, base);
    return data;
  },

  sanitizePart(partIndex, raw, template) {
    const clean = this.sanitizeByTemplate(raw, template);
    if (clean && typeof clean === 'object') {
      if ((partIndex === 4 || partIndex === 5 || partIndex === 6) && Array.isArray(raw?._csvRows)) clean._csvRows = raw._csvRows;
      if (partIndex !== 4 && partIndex !== 5 && partIndex !== 6) delete clean._csvRows;
    }
    if (partIndex === 2 && clean.feeling) {
      clean.feeling = this.normalizeFeelingObject(clean.feeling);
    }
    if (partIndex === 1 && clean.initialMetrics) {
      clean.initialMetrics = this.sanitizeInitialMetrics(clean.initialMetrics);
    }
    return clean;
  },

  lockPartTargetName(partIndex, data, base = {}) {
    const name = String(base?.name || '').trim();
    if (![2, 3, 4, 5, 6, 7].includes(partIndex) || !name || !data || typeof data !== 'object') return data;
    return { ...data, name };
  },

  sanitizeInitialMetrics(value) {
    if (!value || typeof value !== 'object') return value;
    return {
      emotions: this.metricGroupAsArray(value.emotions, window.GameModules.metrics.emotionKeys),
      playerFeelings: this.metricGroupAsArray(value.playerFeelings, window.GameModules.metrics.playerKeys),
    };
  },

  normalizeFeelingObject(value) {
    if (!value || typeof value !== 'object') return value;
    const metric = window.GameModules.metrics;
    const toObject = (items, keys) => Object.fromEntries(this.metricGroupAsArray(items, keys).map((item) => [item.key, {
      name: item.name || item.key,
      value: item.value,
      status: item.status,
      reason: item.reason,
      metricSources: item.metricSources || item.sourceMap,
    }]));
    return { emotions: toObject(value.emotions, metric.emotionKeys), playerFeelings: toObject(value.playerFeelings, metric.playerKeys) };
  },

  metricGroupAsArray(value, keys) {
    if (Array.isArray(value)) return keys.map((key) => {
      const item = value.find((entry) => entry?.key === key || entry?.name === key) || {};
      return { key, value: item.value, status: item.status, reason: item.reason, metricSources: item.metricSources || item.sourceMap };
    });
    const source = value && typeof value === 'object' ? value : {};
    return keys.map((key) => {
      const item = source[key] || Object.values(source).find((entry) => entry?.name === key) || {};
      return { key, value: item.value, status: item.status, reason: item.reason, metricSources: item.metricSources || item.sourceMap };
    });
  },

  sanitizeByTemplate(value, template) {
    if (Array.isArray(template)) {
      if (!Array.isArray(value)) return value;
      const itemTemplate = template[0];
      return itemTemplate && typeof itemTemplate === 'object'
        ? value.map((item) => this.sanitizeByTemplate(item, itemTemplate)).filter((item) => item && typeof item === 'object')
        : value;
    }
    if (template && typeof template === 'object') {
      const source = value && typeof value === 'object' ? value : {};
      return Object.fromEntries(Object.keys(template).filter((key) => Object.prototype.hasOwnProperty.call(source, key)).map((key) => [key, this.sanitizeByTemplate(source[key], template[key])]));
    }
    return value;
  },

  missingPartFields(partIndex, data, template, base, attrs = null) {
    const missing = [];
    const source = data && typeof data === 'object' ? data : {};
    Object.keys(template || {}).forEach((key) => { if (!this.partFieldComplete(partIndex, key, source[key], template[key], base, attrs)) missing.push(key); });
    return missing;
  },

  partFieldComplete(partIndex, key, value, template, base, attrs = null) {
    if (value === undefined || value === null) return false;
    if (key === 'name') {
      const current = String(value || '').trim(), expected = String(base?.name || '').trim();
      if (base?.id === 'player-self') return current === expected;
      if (this.isConcreteName(expected)) return current === expected;
      return this.isConcreteName(current);
    }
    if (partIndex === 1 && ['worldTag', 'age', 'learningAbility', 'mentalStability', 'growthPotential', 'actionAbility'].includes(key)) return this.valueReasonComplete(value);
    if (partIndex === 1 && ['gender', 'job'].includes(key)) return typeof value === 'string';
    if (partIndex === 1 && ['relationships', 'role', 'detail', 'appearance', 'preferences', 'personality', 'rank'].includes(key)) return typeof value === 'string' && String(value).trim();
    if (partIndex === 1 && key === 'jobConfirmed') return typeof value === 'boolean';
    if (partIndex === 1 && key === 'control_experience') return value && typeof value === 'object' && Number.isInteger(Number(value.上线次数)) && typeof value.习惯程度 === 'string';
    if (partIndex === 1 && key === 'factions') return this.arrayItemsComplete(value, ['faction', 'role', 'reason'], false);
    if (partIndex === 1 && key === 'forcePositions') return this.arrayItemsComplete(value, ['force', 'position', 'reason'], false);
    if (partIndex === 1 && key === 'initialMetrics') return this.initialMetricsComplete(value);
    if (partIndex === 2 && key === 'feeling') return this.feelingComplete(value);
    if (partIndex === 3 && ['skills', 'knowledge', 'professions'].includes(key)) return this.arrayItemsComplete(value, ['name', 'desc', 'level', 'levelEffects', 'reason'], key === 'professions', (item) => this.learnedItemComplete(item));
    if (partIndex === 4 && key === 'items') return this.arrayItemsComplete(value, ['name', 'description', 'quantity', 'reason'], true, (item) => Number.isInteger(Number(item.quantity)) && Number(item.quantity) >= 1);
    if (partIndex === 4 && key === 'wearing') return this.wearingObjectComplete(value);
    if (partIndex === 5 && key === 'bodyProfile') return this.bodyProfileComplete(value);
    if (partIndex === 6 && key === 'dressedProfile') return this.bodyProfileComplete(value);
    if (partIndex === 7 && key === 'rpgField') return this.rpgFieldComplete(value);
    if (Array.isArray(template)) return Array.isArray(value);
    if (template && typeof template === 'object') return value && typeof value === 'object';
    return typeof value === typeof template || value !== undefined;
  },

  valueReasonComplete(value) {
    return value && typeof value === 'object' && value.value !== undefined && String(value.reason || '').trim();
  },

  intrinsicBaseItemComplete(value) {
    return value && typeof value === 'object' && value.value !== undefined && String(value.description || '').trim() && String(value.reason || '').trim();
  },

  wearingObjectComplete(value) {
    const slots = ['head', 'neck', 'innerwearTop', 'top', 'outerwear', 'gloves', 'waist', 'innerwearBottom', 'bottom', 'socks', 'shoes', 'wrist'];
    const completeItem = (item, allowEmptyName = true) => item && typeof item === 'object' && String(item.clothing_position || '').trim() && String(item.reason || '').trim() && (allowEmptyName || String(item.name || '').trim()) && Object.prototype.hasOwnProperty.call(item, 'description');
    return value && typeof value === 'object' && !Array.isArray(value)
      && slots.every((slot) => completeItem(value[slot], true))
      && Array.isArray(value.slot)
      && value.slot.every((item) => item && typeof item === 'object' && String(item.slot || '').trim() && completeItem(item, false));
  },

  initialMetricsComplete(value) {
    const templateKeys = { emotions: window.GameModules.metrics.emotionKeys, playerFeelings: window.GameModules.metrics.playerKeys };
    return value && typeof value === 'object' && Object.entries(templateKeys).every(([group, keys]) => {
      const list = this.metricGroupAsArray(value[group], keys);
      return keys.every((key) => {
        const item = list.find((entry) => entry?.key === key);
        return item && item.value !== undefined && String(item.status || '').trim() && String(item.reason || '').trim();
      });
    });
  },

  arrayItemsComplete(value, fields, allowEmpty = false, itemCheck = null) {
    if (!Array.isArray(value)) return false;
    if (!allowEmpty && !value.length) return false;
    return value.every((item) => item && typeof item === 'object' && fields.every((field) => item[field] !== undefined && (Array.isArray(item[field]) || String(item[field]).trim() !== '')) && (!itemCheck || itemCheck(item)));
  },

  learnedItemComplete(item) {
    return Number.isInteger(Number(item.level)) && Number(item.level) >= 1 && Number(item.level) <= 7 && item.levelEffects && typeof item.levelEffects === 'object';
  },

  feelingComplete(value) {
    return this.feelingGroupComplete(value, 'emotions') && this.feelingGroupComplete(value, 'playerFeelings');
  },

  feelingGroupComplete(value, group) {
    const keys = group === 'emotions' ? window.GameModules.metrics.emotionKeys : window.GameModules.metrics.playerKeys;
    const list = value?.[group];
    if (Array.isArray(list)) {
      return keys.every((key) => {
        const item = list.find((entry) => entry?.key === key || entry?.name === key);
        return item && item.value !== undefined && String(item.status || '').trim() && String(item.reason || '').trim();
      });
    }
    if (list && typeof list === 'object') {
      return keys.every((key) => {
        const item = list[key] || Object.values(list).find((entry) => entry?.name === key);
        return item && item.value !== undefined && String(item.status || '').trim() && String(item.reason || '').trim();
      });
    }
    return false;
  },

  rpgFieldComplete(value) {
    const keys = ['strength', 'agility', 'constitution', 'intelligence', 'perception', 'willpower', 'charisma'];
    return value && typeof value === 'object'
      && this.valueReasonComplete(value.level)
      && keys.every((key) => this.intrinsicBaseItemComplete(value.intrinsicBase?.[key]));
  },

  async completeMissingPart(partIndex, data, template, format, base, lore, attrs, store) {
    let current = this.lockPartTargetName(partIndex, data, base);
    for (let i = 0; i < 2; i += 1) {
      let missing = this.missingPartFields(partIndex, current, template, base, attrs);
      if (!missing.length) return current;
      if (partIndex === 2 && missing.includes('feeling')) {
        const progressCtx = store?.roleCardLoadingState?.open ? { loadingId: base.id, total: this.partProgressTotal(2) } : null;
        const feeling = await this.generatePartFeeling(current, base, lore, attrs, format, store, 'all', progressCtx);
        current = this.lockPartTargetName(partIndex, this.sanitizePart(partIndex, { ...current, feeling }, template), base);
        missing = this.missingPartFields(partIndex, current, template, base, attrs);
        if (!missing.length) return current;
      }
      if ((partIndex === 5 && missing.includes('bodyProfile')) || (partIndex === 6 && missing.includes('dressedProfile'))) {
        current = this.completeBodyProfileFallback(partIndex, current, base);
        missing = this.missingPartFields(partIndex, current, template, base, attrs);
        if (!missing.length) return current;
      }
      const patch = await this.generateMissingPartFields(partIndex, current, template, missing, format, base, attrs);
      current = this.lockPartTargetName(partIndex, this.sanitizePart(partIndex, this.mergeMissingPatch(partIndex, current, patch), template), base);
    }
    const stillMissing = this.missingPartFields(partIndex, current, template, base, attrs);
    if (stillMissing.length) throw new Error(`Part${partIndex} 缺少字段：${stillMissing.join('、')}`);
    return current;
  },

  async repairCsvPartRows(partIndex, raw, format, base, lore, attrs, store, vars = {}) {
    if (![2, 3, 4, 5, 6].includes(partIndex)) return raw;
    if (partIndex === 5 || partIndex === 6) raw = this.completeBodyProfileFallback(partIndex, raw, base);
    let currentRows = this.normalizeCsvPartRows(partIndex, this.rowsFromCsvPart(partIndex, raw));
    let attempts = 0;
    while (true) {
      attempts += 1;
      currentRows = this.applyLocalCsvFixes(partIndex, currentRows);
      const issues = this.csvPartIssues(partIndex, currentRows, base);
      if (!issues.length) return this.buildPartFromCsvRows(partIndex, currentRows, base.name);
      const aiIssues = issues.filter((issue) => !/超过10行$/.test(issue.reason || ''));
      const unlimitedRepair = partIndex === 2 || partIndex === 4 || partIndex === 5 || partIndex === 6;
      const repairLimit = partIndex === 4 || partIndex === 5 || partIndex === 6 ? 8 : 2;
      if (!aiIssues.length || (!unlimitedRepair && attempts >= 2) || (unlimitedRepair && attempts > repairLimit)) break;
      try {
        const fixedRows = await this.generateCsvFixRows(partIndex, aiIssues, currentRows, format, base, lore, attrs, store, vars);
        currentRows = this.normalizeCsvPartRows(partIndex, this.mergeCsvFixRows(partIndex, currentRows, fixedRows, issues));
      } catch (err) {
        if (!unlimitedRepair) throw err;
        console.warn(`[角色卡Part${partIndex}] CSV修复未收敛，继续重试:`, err?.message || 'unknown');
      }
    }
    const finalRows = this.applyLocalCsvFixes(partIndex, currentRows);
    const finalIssues = this.csvPartIssues(partIndex, finalRows, base);
    if ((partIndex === 5 || partIndex === 6) && finalIssues.length) {
      return this.completeBodyProfileFallback(partIndex, this.buildPartFromCsvRows(partIndex, finalRows, base.name), base);
    }
    if (partIndex === 4 && finalIssues.length) throw new Error(`Part${partIndex} CSV修复未收敛：${finalIssues.map((x) => `${x.key}:${x.reason}`).join('、')}`);
    return this.buildPartFromCsvRows(partIndex, finalRows, base.name);
  },

  rowsFromCsvPart(partIndex, raw) {
    if (Array.isArray(raw?._csvRows)) return raw._csvRows;
    const headers = { 2: 'name,value,status,reason', 3: 'type,name,level,', 4: 'type,slot,', 5: '序号,部位,部位描写', 6: '序号,部位,部位描写' };
    return this.csvDataRows(raw?.rawText || raw?.text || '', headers[partIndex] || '');
  },

  normalizeCsvPartRows(partIndex, rows) {
    if (partIndex === 2) return rows.map((row) => this.normalizePart2Row(row)).filter(Boolean);
    if (partIndex === 3) return rows.map((row) => this.normalizePart3Row(row)).filter(Boolean);
    if (partIndex === 4) return rows.map((row) => this.normalizePart4Row(row)).filter(Boolean);
    if (partIndex === 5 || partIndex === 6) return rows.map((row) => this.normalizePart5Row(row)).filter(Boolean);
    return rows;
  },

  normalizePart2Row(row) {
    const parts = this.csvParts(row);
    if (parts[0] === 'name' && parts.length >= 5) return this.normalizePart2Row(parts.slice(1).join(','));
    const keys = [...window.GameModules.metrics.emotionKeys, ...window.GameModules.metrics.playerKeys];
    if (!keys.includes(parts[0]) || parts.length <= 4) return row;
    return [parts[0], parts[1], parts[2], parts.slice(3).join('，')].join(',');
  },

  normalizePart3Row(row) {
    const parts = this.csvParts(row);
    if (parts.length <= 7) return row;
    const [type, itemName, level, reason, requiredIntrinsicBase, requiredKnowledge, ...requiredSkills] = parts;
    if (!['skills', 'knowledge', 'professions'].includes(type)) return row;
    return [type, itemName, level, reason, requiredIntrinsicBase, requiredKnowledge, requiredSkills.join('|')].join(',');
  },

  normalizePart5Row(row) {
    let parts = this.csvParts(row);
    if (parts.length > 3) parts = [parts[0], parts[1], parts.slice(2).join('，')];
    if (parts.length !== 3) return row;
    const [index, part, description] = parts;
    return this.csvJoin([index, part, description]);
  },

  normalizePart4Row(row) {
    let parts = this.csvParts(row);
    if (parts.length > 7 && ['item', 'wearing', 'slot'].includes(parts[0])) {
      parts = [parts[0], parts[1], parts[2], parts[3], parts.slice(4, -2).join('，'), parts.at(-2), parts.at(-1)];
    }
    if (parts.length !== 7) return row;
    let [type, slot, clothingPosition, itemName, description, quantity, reason] = parts;
    if (!['item', 'wearing', 'slot'].includes(type)) return this.csvJoin(parts);
    quantity = '1';
    if (type !== 'wearing') return this.csvJoin([type, slot, clothingPosition, itemName, description, quantity, reason]);
    const positions = this.wearingClothingPositions();
    if (this.fixedWearingSlots().includes(slot)) clothingPosition = positions[slot];
    if (this.part4EmptyLikeCell(itemName) && this.part4EmptyLikeCell(description)) {
      itemName = '--';
      description = '--';
    }
    return this.csvJoin([type, slot, clothingPosition, itemName, description, quantity, reason]);
  },

  part4EmptyLikeCell(value) {
    return /^(--|无|暂无|没有|未穿戴|不适用)$/.test(String(value || '').trim());
  },

  part4HasConcreteWear(parts) {
    return this.csvCell(parts?.[3]) && this.csvCell(parts?.[4]) && !this.part4EmptyLikeCell(parts[3]) && !this.part4EmptyLikeCell(parts[4]);
  },

  applyLocalCsvFixes(partIndex, rows) {
    if (partIndex === 2) return this.normalizePart2RowsLocally(rows);
    if (partIndex === 4) return this.normalizePart4RowsLocally(rows);
    if (partIndex !== 3) return rows;
    const kept = { skills: 0, knowledge: 0, professions: 0 };
    return this.normalizeCsvPartRows(partIndex, rows).filter((row) => {
      const type = this.csvParts(row)[0];
      if (!Object.prototype.hasOwnProperty.call(kept, type)) return true;
      kept[type] += 1;
      return kept[type] <= 10;
    });
  },

  normalizePart4RowsLocally(rows) {
    return this.normalizeCsvPartRows(4, rows);
  },

  normalizePart2RowsLocally(rows) {
    const keys = [...window.GameModules.metrics.emotionKeys, ...window.GameModules.metrics.playerKeys];
    const seen = new Set();
    const cleaned = [];
    rows.map((row) => this.normalizePart2Row(row)).forEach((row) => {
      let parts = this.csvParts(row);
      if (parts[0] === 'name' && keys.includes(parts[1])) parts = parts.slice(1);
      const key = parts[0];
      if (!keys.includes(key) || seen.has(key)) return;
      if (parts.length > 4) parts = [parts[0], parts[1], parts[2], parts.slice(3).join('，')];
      if (this.part2RowIssue(parts, key)) return;
      seen.add(key);
      cleaned.push(parts.join(','));
    });
    return cleaned;
  },

  buildPartFromCsvRows(partIndex, rows, name) {
    if (partIndex === 2) return this.buildFeelingFromRows(rows, name, true);
    if (partIndex === 3) return this.buildAbilitiesFromRows(rows, name, true);
    if (partIndex === 5) return this.buildBodyProfileFromRows(rows, name);
    if (partIndex === 6) return this.buildDressedProfileFromRows(rows, name);
    return this.buildInventoryFromRows(rows, name);
  },

  csvPartIssues(partIndex, rows, profile = null) {
    if (partIndex === 2) return this.part2CsvIssues(rows);
    if (partIndex === 3) return this.part3CsvIssues(rows);
    if (partIndex === 5 || partIndex === 6) return this.part5CsvIssues(rows);
    return this.part4CsvIssues(rows, profile);
  },

  part2CsvIssues(rows) {
    const issues = [];
    const keys = [...window.GameModules.metrics.emotionKeys, ...window.GameModules.metrics.playerKeys];
    const normalized = rows.map((row) => this.normalizePart2Row(row));
    keys.forEach((key) => {
      const lines = normalized.filter((row) => row.startsWith(`${key},`) || row.startsWith(`name,${key},`));
      if (!lines.length) {
        issues.push({ key, reason: '缺失该行' });
        return;
      }
      if (lines.length > 1) issues.push({ key, reason: '重复输出该情感行', badRow: lines.join(' / ') });
      let parts = this.csvParts(lines[0]);
      if (parts[0] === 'name' && parts[1] === key) parts = parts.slice(1);
      const reason = this.part2RowIssue(parts, key);
      if (reason) issues.push({ key, reason, badRow: lines[0] });
    });
    normalized.forEach((row, index) => {
      let parts = this.csvParts(row);
      if (parts[0] === 'name') parts = parts.slice(1);
      if (parts[0] && !keys.includes(parts[0]) && /[,，]/.test(row)) issues.push({ key: `row${index + 1}`, reason: '未要求或不支持的情感名', badRow: row });
    });
    return issues;
  },

  part3CsvIssues(rows) {
    const issues = [];
    const counts = { skills: 0, knowledge: 0, professions: 0 };
    rows.forEach((row, index) => {
      const parts = this.csvParts(row);
      const reason = this.part3RowIssue(parts);
      if (reason) {
        issues.push({ key: `row${index + 1}`, reason, badRow: row });
        return;
      }
      counts[parts[0]] += 1;
      if (counts[parts[0]] > 10) issues.push({ key: `row${index + 1}`, reason: `${parts[0]}超过10行`, badRow: row });
    });
    if (!counts.skills) issues.push({ key: 'skills', reason: '缺失至少1行skills' });
    if (!counts.knowledge) issues.push({ key: 'knowledge', reason: '缺失至少1行knowledge' });
    return issues;
  },

  part5CsvIssues(rows) {
    const issues = [];
    const expected = this.bodyProfileParts();
    const seen = new Set();
    rows.forEach((row, index) => {
      const normalized = this.normalizePart5Row(row);
      const parts = this.csvParts(normalized);
      const reason = this.part5RowIssue(parts);
      if (reason) {
        const key = expected.includes(parts[1]) ? parts[1] : `row${index + 1}`;
        issues.push({ key, reason, badRow: normalized });
        return;
      }
      seen.add(parts[1]);
    });
    expected.forEach((part) => {
      if (!seen.has(part)) issues.push({ key: part, reason: '缺失身体部位行' });
    });
    return issues;
  },

  part4CsvIssues(rows, profile = null) {
    const issues = [];
    const present = new Set();
    rows.forEach((row, index) => {
      const normalized = this.normalizePart4Row(row);
      const parts = this.csvParts(normalized);
      const reason = this.part4RowIssue(parts);
      if (reason) {
        const key = parts[0] === 'wearing' && this.fixedWearingSlots().includes(parts[1]) ? parts[1] : `row${index + 1}`;
        issues.push({ key, reason, badRow: normalized });
      }
      if (!reason && parts[0] === 'wearing') present.add(parts[1]);
    });
    this.fixedWearingSlots().forEach((slot) => {
      if (!present.has(slot)) issues.push({ key: slot, reason: '缺失固定wearing槽位' });
    });
    return issues;
  },


  async generateCsvFixRows(partIndex, issues, currentRows, format, base, lore, attrs, store, vars) {
    const promptIds = { 2: 'character-profile-part2-feeling-fix', 3: 'character-profile-part3-abilities-professions-fix' };
    const promptId = promptIds[partIndex] || 'character-profile-csv-fix';
    const skeleton = this.csvFixSkeleton(partIndex, issues);
    const prompt = await window.GameModules.renderPrompt(promptId, { ...vars, partIndex, 角色姓名: base.name, 需要AI返回的行: skeleton, 当前已合格行: this.validCsvRowsForPrompt(partIndex, currentRows).join('\n') || '无', 错误行说明: issues.map((x) => `${x.key}：${x.reason}${x.badRow ? `｜${x.badRow}` : ''}`).join('\n'), 严格修复要求: this.csvFixStrictRequirement(partIndex, issues, skeleton), 原始要求: String(format || '').slice(0, 2200) });
    return window.GameModules.jsonUtils.generateJsonWithRetry({
      source: `character-profile-part${partIndex}-csv-fix`,
      promptId,
      model: window.GameModules.aiRequest?.selectedTextModel?.(),
      timeoutMs: 60000,
      prompt,
      format: prompt,
      repairHint: this.csvFixStrictRequirement(partIndex, issues, skeleton),
      requiredRawFields: this.partRequiredRawFields(partIndex),
      parse: (text) => ({ _csvRows: this.normalizeCsvPartRows(partIndex, this.csvDataRows(text, this.csvFixHeaderPrefix(partIndex))) }),
      validate: (parsed) => {
        const rows = this.csvFixRowsToApply(partIndex, issues, parsed._csvRows || []);
        if (!rows.length) throw new Error('CSV修复没有返回有效行');
        if (partIndex === 4 || partIndex === 5 || partIndex === 6) {
          const returnedIssue = this.csvFixReturnedIssue(partIndex, issues, rows, skeleton);
          if (returnedIssue) throw new Error(returnedIssue);
          const remaining = this.csvPartIssues(partIndex, this.mergeCsvFixRows(partIndex, currentRows, rows, issues), base);
          const wanted = new Set(issues.map((x) => x.key));
          const stillWanted = remaining.filter((x) => wanted.has(x.key) || /^row\d+$/.test(x.key));
          if (stillWanted.length) throw new Error(`CSV修复仍不完整：${stillWanted.map((x) => x.key).join('、')}`);
          return rows;
        }
        const returnedIssue = this.csvFixReturnedIssue(partIndex, issues, rows, skeleton);
        if (returnedIssue) throw new Error(returnedIssue);
        const remaining = this.csvPartIssues(partIndex, this.mergeCsvFixRows(partIndex, currentRows, rows, issues), base);
        const wanted = new Set(issues.map((x) => x.key));
        const stillWanted = remaining.filter((x) => wanted.has(x.key) || /^row\d+$/.test(x.key));
        if (stillWanted.length) throw new Error(`CSV修复仍不完整：${stillWanted.map((x) => x.key).join('、')}`);
        return rows;
      },
      max: (partIndex === 2 || partIndex === 4 || partIndex === 5 || partIndex === 6) ? 2 : (partIndex === 3 && issues.some((x) => x.key === 'skills' || x.key === 'knowledge') ? 4 : 2),
    });
  },

  csvFixStrictRequirement(partIndex, issues, skeleton) {
    if (partIndex === 2) {
      return [
        '只返回要求补齐的 Part2 CSV 行，不要表头、JSON、Markdown 或解释。',
        '每行必须恰好 4 列：情感名,value,status,reason。',
        '如果“需要AI返回的行”为空，必须返回空文本，不能发明 row1、row2 或其它行。',
        '第一列必须逐字照抄“需要AI返回的行”的情感名，禁止写 name，禁止改名，禁止新增未要求的行。',
        '必须批量返回本次所有有问题的行，返回行数必须等于需要AI返回的行数。',
        '禁止返回当前已合格行；禁止重复同一个情感名；禁止输出“好的、已理解”等确认语。',
        '禁止使用固定列表之外的情感名，禁止用喜悦替代高兴，禁止用羞愧替代羞耻，禁止用顺从替代服从。',
        'status 和 reason 内禁止英文逗号，只能用中文逗号；如果句子需要停顿必须使用中文逗号。',
        '每行第二列必须是 0-100 整数，第三列和第四列都必须是具体短句，不能留空。',
        '必须严格照下面的情感名列表逐行生成：',
        skeleton,
      ].join('\n');
    }
    if (partIndex === 5 || partIndex === 6) {
      const isDressed = partIndex === 6;
      return [
        `只返回要求补齐的 Part${partIndex} CSV 行，不要表头、JSON、Markdown 或解释。`,
        '每行必须恰好 3 列：序号,部位,部位描写。',
        `部位只能使用固定列表：${this.bodyProfileParts().join('、')}。`,
        '必须批量返回本次缺失或错误的身体部位；如果额外返回其它固定部位，代码会只提取有效部位合并。',
        '单元格内禁止英文逗号，需要停顿时用中文逗号。',
        isDressed
          ? '部位描写必须继承角色身份、Part4当前穿着和Part5身体原貌；本部分只写盛装/打扮完全后的造型、妆容、饰品、衣物包裹塑形与视觉效果。'
          : '部位描写必须继承角色身份、外貌、人物说明和备注；除非上下文明确说明外貌很丑，否则向很漂亮、很有吸引力的方向描写。',
        isDressed
          ? '如果当前穿着不足以构成盛装，必须基于人物身份、喜好、审美和身体原貌生成完整打扮方案；不要返回未打扮或空缺。'
          : '本部分只写毫无人工雕琢、未经衣物遮掩的原本躯体，不要写衣物、饰品、妆容、护肤或行为。',
        '需要AI返回的行：',
        skeleton,
      ].join('\n');
    }
    if (partIndex === 4) {
      return [
        '只返回要求补齐的 Part4 CSV 行，不要表头、JSON、Markdown 或解释。',
        '每行必须恰好 7 列：type,slot,clothing_position,name,description,quantity,reason。',
        'wearing 行的 slot 只能是固定值：head、neck、innerwearTop、top、outerwear、gloves、waist、innerwearBottom、bottom、socks、shoes、wrist。',
        '缺 socks 就必须返回 wearing,socks,袜子,...；鞋子必须用 shoes，禁止写 feet、foot、ankle、legs 或其它替代槽位。',
        'quantity 可统一写 1；代码不会用 quantity 判断穿着有效性。',
        '未穿戴是合法状态，name 和 description 必须同时写 --，reason 必须写清具体不穿原因。',
        '禁止返回 --.--、-.--、---、... 等非法占位；未穿戴只能用精确的 --。',
        '禁止返回“当前场景未穿戴该槽位物品/未穿戴该槽位物品/无/暂无/不适用/上下文未说明/信息不足/日常需要/符合身份”等泛化原因。',
        '禁止返回“日常上衣/日常下衣/日常袜子/上下文未写明异常/常规场景基础穿着槽位”等兜底文案。',
        '如果角色卡基础信息或输入的喜好写明 JK、制服、百褶裙、过膝袜、连裤袜、丝袜、黑丝、白丝等，必须落实到 top/bottom/socks，不能改成泛化日常衣物。',
        'bottom 只能写一件主要下装，不能同时写百褶裙和牛仔裤；过膝袜、连裤袜、丝袜必须写在 socks。',
        '槽位语义必须匹配：outerwear只能写外套，waist只能写腰带腰封，bottom只能写裤裙，socks只能写袜类，shoes只能写鞋类，neck不能写耳环耳钉。',
        'clothing_position 是人体着装部位，必须按固定映射逐字填写：head=头部，neck=颈部，innerwearTop=内衣，top=上衣，outerwear=外套，gloves=手套，waist=腰部，innerwearBottom=内衣，bottom=下装，socks=袜子，shoes=鞋子，wrist=手腕。',
        '不穿袜子、内衣、上衣、外套等都可以成立，但必须保留对应固定槽位行；例如袜子不穿仍输出 wearing,socks,袜子,--,--,1,具体不穿原因。',
        '裸体、裸睡、洗澡、换衣、刚醒等场景可以让多个穿着槽位未穿戴，但不得省略槽位，也不得把未穿戴槽位改成其它 slot。',
        '必须批量返回本次所有有问题的行，并严格照下面列表的 type 和 slot 生成：',
        skeleton,
      ].join('\n');
    }
    if (partIndex !== 3) return '只返回要求补齐的 CSV 行，不要表头、JSON、Markdown 或解释。每行列数必须完整。';
    const requiredTypes = issues.map((x) => x.key).filter((key) => key === 'skills' || key === 'knowledge');
    const lines = ['只返回要求补齐的 CSV 行，不要表头、JSON、Markdown 或解释。每行必须恰好 7 列。'];
    if (requiredTypes.length) {
      lines.push(`本次缺失的基础类型必须由 AI 补齐：${requiredTypes.join('、')}。`);
      lines.push(`返回行的 type 必须包含且只能针对这些缺失类型：${requiredTypes.join('、')}；禁止用其它 type 替代。`);
      lines.push('不要返回当前已合格行，不要返回未要求的 skills/knowledge/professions 行。');
    }
    lines.push('必须严格照“需要AI返回的行”的 type 生成：');
    lines.push(skeleton);
    return lines.join('\n');
  },

  csvFixRowsToApply(partIndex, issues, rows) {
    if (partIndex === 5 || partIndex === 6) {
      const used = new Set();
      return rows.map((row) => this.normalizePart5Row(row)).filter((row) => {
        const parts = this.csvParts(row);
        if (this.part5RowIssue(parts)) return false;
        if (used.has(parts[1])) return false;
        used.add(parts[1]);
        return true;
      });
    }
    if (partIndex !== 4) return rows;
    const requiredKeys = issues.map((x) => x.key).filter((key) => this.fixedWearingSlots().includes(key));
    const used = new Set();
    return rows.map((row) => this.normalizePart4Row(row)).filter((row) => {
      const parts = this.csvParts(row);
      if (this.part4RowIssue(parts)) return false;
      if (parts[0] !== 'wearing') return true;
      if (!requiredKeys.length) return true;
      if (!requiredKeys.includes(parts[1]) || used.has(parts[1])) return false;
      used.add(parts[1]);
      return true;
    });
  },

  csvFixReturnedIssue(partIndex, issues, rows, skeleton = '') {
    if (partIndex === 2) {
      const requiredKeys = issues.map((x) => x.key).filter((key) => [...window.GameModules.metrics.emotionKeys, ...window.GameModules.metrics.playerKeys].includes(key));
      const returnedKeys = rows.map((row) => {
        const parts = this.csvParts(row);
        return parts[0] === 'name' ? parts[1] : parts[0];
      }).filter(Boolean);
      const missing = requiredKeys.filter((key) => !returnedKeys.includes(key));
      const extra = returnedKeys.filter((key) => !requiredKeys.includes(key));
      const duplicate = returnedKeys.filter((key, index) => returnedKeys.indexOf(key) !== index);
      if (missing.length || extra.length || duplicate.length || returnedKeys.length !== requiredKeys.length) return [
        `CSV修复必须且只能返回这些情感行：${requiredKeys.join('、')}。`,
        missing.length ? `缺失：${missing.join('、')}` : '',
        extra.length ? `多余或不支持：${extra.join('、')}` : '',
        duplicate.length ? `重复：${[...new Set(duplicate)].join('、')}` : '',
        '请按下面“需要AI返回的行”重写，不要返回表头、解释或当前已合格行：',
        skeleton,
      ].filter(Boolean).join('\n');
      const bad = rows.find((row) => {
        let parts = this.csvParts(row);
        if (parts[0] === 'name') parts = parts.slice(1);
        return this.part2RowIssue(parts, parts[0]);
      });
      if (bad) return `CSV修复行格式不合格：${bad}`;
      return '';
    }
    if (partIndex === 5 || partIndex === 6) {
      const requiredKeys = issues.map((x) => x.key).filter((key) => this.bodyProfileParts().includes(key));
      const normalizedRows = rows.map((row) => this.normalizePart5Row(row));
      if (!requiredKeys.length) return '';
      const relevantRows = normalizedRows.filter((row) => requiredKeys.includes(this.csvParts(row)[1]));
      const bad = relevantRows.find((row) => this.part5RowIssue(this.csvParts(row)));
      if (bad) return `CSV修复行格式不合格：${bad}`;
      const returnedKeys = [...new Set(normalizedRows.map((row) => this.csvParts(row)[1]).filter(Boolean))];
      const missing = requiredKeys.filter((key) => !returnedKeys.includes(key));
      if (missing.length) return [
        `CSV修复必须返回这些身体部位：${requiredKeys.join('、')}。`,
        `缺失：${missing.join('、')}`,
        '请按下面“需要AI返回的行”重写，不要返回表头或解释：',
        skeleton,
      ].filter(Boolean).join('\n');
      return '';
    }
    if (partIndex === 4) {
      const requiredKeys = issues.map((x) => x.key).filter((key) => this.fixedWearingSlots().includes(key));
      const normalizedRows = rows.map((row) => this.normalizePart4Row(row));
      const bad = normalizedRows.find((row) => this.part4RowIssue(this.csvParts(row)));
      if (bad) return `CSV修复行格式不合格：${bad}`;
      if (!requiredKeys.length) return '';
      const returnedKeys = normalizedRows.map((row) => this.csvParts(row)).filter((parts) => parts[0] === 'wearing').map((parts) => parts[1]);
      const missing = requiredKeys.filter((key) => !returnedKeys.includes(key));
      const duplicate = returnedKeys.filter((key, index) => returnedKeys.indexOf(key) !== index);
      if (missing.length || duplicate.length) return [
        `CSV修复必须返回这些 wearing 槽位：${requiredKeys.join('、')}。`,
        missing.length ? `缺失：${missing.join('、')}` : '',
        duplicate.length ? `重复：${[...new Set(duplicate)].join('、')}` : '',
        '请按下面“需要AI返回的行”重写，不要返回表头或解释：',
        skeleton,
      ].filter(Boolean).join('\n');
      return '';
    }
    if (partIndex !== 3) return '';
    const requiredTypes = issues.map((x) => x.key).filter((key) => key === 'skills' || key === 'knowledge');
    if (!requiredTypes.length) return '';
    const returnedTypes = rows.map((row) => this.csvParts(row)[0]).filter(Boolean);
    const missing = requiredTypes.filter((type) => !returnedTypes.includes(type));
    if (missing.length) return [
      `CSV修复必须返回 ${missing.join('、')} 行，不能用 ${returnedTypes.join('、') || '空输出'} 替代。`,
      '请只按下面“需要AI返回的行”的 type 重写，不要返回其它 type：',
      skeleton,
    ].join('\n');
    const extra = returnedTypes.filter((type) => !requiredTypes.includes(type));
    if (extra.length) return [
      `CSV修复返回了未要求的 Part3 类型：${extra.join('、')}；本次只能返回 ${requiredTypes.join('、')}。`,
      '请删除未要求行，只返回缺失基础类型对应行：',
      skeleton,
    ].join('\n');
    return '';
  },

  csvFixHeaderPrefix(partIndex) {
    if (partIndex === 2) return 'name,value,status,reason';
    if (partIndex === 3) return 'type,name,level,';
    if (partIndex === 5 || partIndex === 6) return '序号,部位,部位描写';
    return 'type,slot,';
  },

  csvFixSkeleton(partIndex, issues) {
    if (partIndex === 2) {
      const keys = [...window.GameModules.metrics.emotionKeys, ...window.GameModules.metrics.playerKeys];
      return issues.filter((x) => keys.includes(x.key)).map((x) => `${x.key},50,${x.key}因为当前证据形成状态,${x.key}源于人物经历和关系证据`).join('\n');
    }
    if (partIndex === 3) return issues.map((x) => (x.key === 'knowledge' ? 'knowledge,现代常识,2,日常生活和教育经历形成基础常识,生活经验,家庭经历|教育背景,--' : 'skills,观察力,2,长期生活经历形成基础观察能力,perception|谨慎性格,现代常识|过往经历,日常观察习惯')).join('\n');
    if (partIndex === 5 || partIndex === 6) {
      const parts = this.bodyProfileParts();
      const direct = issues.map((x) => x.key).filter((key) => parts.includes(key));
      const fromBadRows = issues.map((x) => this.csvParts(this.normalizePart5Row(x.badRow || ''))[1]).filter((key) => parts.includes(key));
      const targets = [...new Set([...direct, ...fromBadRows])];
      return targets.map((part) => {
        const finalIndex = parts.indexOf(part) + 1;
        const text = partIndex === 6 ? this.dressedProfilePromptText(part) : this.bodyProfilePromptText(part);
        return `${finalIndex},${part},${text}`;
      }).join('\n');
    }
    const positions = this.wearingClothingPositions();
    const missingReasonHints = {
      head: '当前场景没有帽子或发饰需要佩戴',
      neck: '当前场景没有项链围巾等颈部饰物需要佩戴',
      innerwearTop: '当前场景明确没有胸部内衣穿戴记录',
      top: '当前场景明确没有上衣穿戴记录',
      outerwear: '室内或当前温度不需要额外外套',
      gloves: '当前行动需要直接触摸物品所以没有戴手套',
      waist: '当前下装不需要腰带腰封固定',
      innerwearBottom: '当前场景明确没有腰臀内衣穿戴记录',
      bottom: '当前场景明确没有下装穿戴记录',
      socks: '当前场景没有袜类穿戴记录',
      shoes: '当前处于室内或休息状态所以没有穿鞋',
      wrist: '当前场景没有腕表手链等手腕饰物需要佩戴',
    };
    return issues.map((x) => {
      if (!this.fixedWearingSlots().includes(x.key)) return 'item,--,--,随身钥匙,金属边缘有磨痕,1,临时出门需要随手带走';
      const parts = this.csvParts(x.badRow || '');
      const normalized = this.normalizePart4Row(x.badRow || '');
      if (!this.part4RowIssue(this.csvParts(normalized))) return normalized;
      const [, , , itemName, description, , reason] = parts;
      const safeReason = this.csvCell(reason) ? reason : missingReasonHints[x.key];
      return this.part4HasConcreteWear(parts)
        ? this.csvJoin(['wearing', x.key, positions[x.key], itemName, description, '1', safeReason])
        : this.csvJoin(['wearing', x.key, positions[x.key], '--', '--', '1', safeReason]);
    }).join('\n');
  },

  validCsvRowsForPrompt(partIndex, rows) {
    return rows.filter((row) => {
      const parts = this.csvParts(row);
      if (partIndex === 2) return parts[0] !== 'name' && !this.part2RowIssue(parts);
      if (partIndex === 3) return !this.part3RowIssue(parts);
      if (partIndex === 5 || partIndex === 6) return !this.part5RowIssue(parts);
      return !this.part4RowIssue(parts);
    });
  },

  mergeCsvFixRows(partIndex, rows, fixedRows, issues) {
    const output = rows.filter((row, index) => !issues.some((issue) => issue.key === `row${index + 1}`));
    fixedRows.forEach((row) => {
      const parts = this.csvParts(row);
      const key = partIndex === 2 ? (parts[0] === 'name' ? parts[1] : parts[0]) : (partIndex === 4 && parts[0] === 'wearing' ? parts[1] : ((partIndex === 5 || partIndex === 6) ? parts[1] : ''));
      const existingIndex = key ? output.findIndex((old) => {
        const oldParts = this.csvParts(old);
        if (partIndex === 2) return oldParts[0] === key || (oldParts[0] === 'name' && oldParts[1] === key);
        if (partIndex === 5 || partIndex === 6) return oldParts[1] === key;
        return oldParts[0] === 'wearing' && oldParts[1] === key;
      }) : -1;
      if (existingIndex >= 0) output[existingIndex] = row;
      else output.push(row);
    });
    return output;
  },

  async generatePartFeeling(profile, base, lore, attrs, context, store, group = 'all', progressCtx = null) {
    const loadingId = progressCtx?.loadingId || base.id;
    const stepTotal = progressCtx?.total ?? this.partProgressTotal(2);
    const shared = { emotions: {}, playerFeelings: {} };
    const bump = (partialFeeling = {}) => {
      if (partialFeeling.emotions) Object.assign(shared.emotions, partialFeeling.emotions);
      if (partialFeeling.playerFeelings) Object.assign(shared.playerFeelings, partialFeeling.playerFeelings);
      if (progressCtx || store) this.reportFeelingProgress(store, loadingId, { ...shared }, stepTotal);
    };
    bump({});
    const evidence = this.initialMetricsEvidence(profile, base, lore, attrs, context, store);
    const toObject = (items, names) => Object.fromEntries(Object.entries(names).map(([key, name]) => {
      const item = items.find((entry) => entry?.key === name || entry?.name === name) || {};
      return [key, { name, value: item.value, status: item.status, reason: item.reason }];
    }));
    const emotionMap = { cold: '冷静', fear: '恐惧', worry: '担忧', joy: '高兴', tension: '紧张', anger: '愤怒', shame: '羞耻', sadness: '悲伤', curiosity: '好奇', numbness: '麻木', jealousy: '嫉妒', despair: '绝望' };
    const playerMap = { understanding: '了解', trust: '信任', resistance: '反抗', affection: '好感', friendship: '友情', familyLove: '亲情', romanticLove: '爱情', lust: '肉欲', awe: '畏惧', respect: '尊敬', admiration: '崇拜', dislike: '讨厌', dependence: '依赖', vigilance: '警惕', dominance: '支配欲', possessiveness: '占有欲', submission: '服从' };
    const tasks = [];
    if (group === 'all' || group === 'emotions') {
      tasks.push((async () => {
        const emotions = await this.generateMetricGroupChunks(profile, base, evidence, 'emotions', window.GameModules.metrics.emotionKeys, bump, shared);
        return toObject(emotions, emotionMap);
      })());
    }
    if (group === 'all' || group === 'playerFeelings') {
      tasks.push((async () => {
        const playerFeelings = await this.generateMetricGroupChunks(profile, base, evidence, 'playerFeelings', window.GameModules.metrics.playerKeys, bump, shared);
        return toObject(playerFeelings, playerMap);
      })());
    }
    const results = await Promise.all(tasks);
    const feeling = {};
    if (group === 'all' || group === 'emotions') feeling.emotions = results.shift();
    if (group === 'all' || group === 'playerFeelings') feeling.playerFeelings = results.shift();
    bump(feeling);
    return feeling;
  },

  async generateMissingPartFields(partIndex, current, template, missing, format, base, attrs = null) {
    const partialTemplate = this.missingPartTemplate(partIndex, current, template, missing);
    const promptId = 'character-profile-missing-fields';
    const prompt = await this.missingPartPrompt(partIndex, current, partialTemplate, missing, format, base);
    return window.GameModules.jsonUtils.generateJsonWithRetry({
      source: `character-profile-part${partIndex}-missing`,
      promptId,
      model: window.GameModules.aiRequest?.selectedTextModel?.(),
      timeoutMs: 60000,
      prompt,
      format: prompt,
      repairHint: this.missingPartRepairHint(partIndex, missing),
      requiredRawFields: this.partRequiredRawFields(partIndex, missing),
      parse: (text) => this.parse(text),
      validate: (raw) => {
        const clean = this.sanitizeByTemplate(raw, partialTemplate);
        const extra = Object.keys(raw || {}).filter((key) => !missing.includes(key));
        if (extra.length) throw new Error(`缺失字段修复输出了多余字段：${extra.join('、')}`);
        const absent = this.missingPartFields(partIndex, this.mergeMissingPatch(partIndex, current, clean), template, base, attrs).filter((key) => missing.includes(key));
        if (absent.length) throw new Error(`缺失字段仍未补齐：${absent.join('、')}`);
        return clean;
      },
      max: 2,
    });
  },

  missingPartTemplate(partIndex, current, template, missing) {
    if (partIndex !== 7 || !missing.includes('rpgField')) return Object.fromEntries(missing.map((key) => [key, template[key]]));
    const rpg = current?.rpgField || {};
    const src = template.rpgField || {};
    const intrinsicKeys = ['strength', 'agility', 'constitution', 'intelligence', 'perception', 'willpower', 'charisma'];
    const rpgField = {};
    if (!this.valueReasonComplete(rpg.level)) rpgField.level = src.level;
    const intrinsicBase = {};
    intrinsicKeys.forEach((key) => {
      if (!this.intrinsicBaseItemComplete(rpg.intrinsicBase?.[key])) intrinsicBase[key] = src.intrinsicBase?.[key];
    });
    if (Object.keys(intrinsicBase).length) rpgField.intrinsicBase = intrinsicBase;
    return { rpgField };
  },

  async missingPartPrompt(partIndex, current, partialTemplate, missing, format, base) {
    const extraRules = [];
    if (partIndex === 7 && missing.includes('rpgField')) {
      extraRules.push(
        '只补模板中列出的 rpgField 子字段；已合格的 level 或 intrinsicBase 子项禁止重复输出、禁止改动。',
        'rpgField 只需要包含 level 与模板列出的 intrinsicBase 子项；禁止返回 derived、攻击力、防御力。',
        '每个返回的 intrinsicBase 子项必须含 integer value、description、reason。',
      );
    }
    return window.GameModules.renderPrompt('character-profile-missing-fields', {
      partIndex,
      角色姓名: base.name,
      缺失字段: missing.join('、'),
      额外规则: extraRules.join('\n') || '无额外规则。',
      缺失字段模板: JSON.stringify(partialTemplate, null, 2),
      已合格字段: JSON.stringify(current, null, 2),
      原始要求: String(format || '').slice(0, 2600),
    });
  },

  missingPartRepairHint(partIndex, missing) {
    if (partIndex === 7 && missing.includes('rpgField')) {
      return '只能返回 rpgField 中模板列出的缺失子字段。已合格的 level 或 intrinsicBase 子项禁止重复输出；禁止返回 derived、攻击力、防御力。';
    }
    return `只能返回缺失字段：${missing.join('、')}。不能新增其它字段。`;
  },

  mergeMissingPatch(partIndex, current, patch) {
    if (partIndex !== 7) return { ...current, ...patch };
    const merged = { ...current, ...patch };
    if (current?.rpgField || patch?.rpgField) {
      merged.rpgField = this.mergeRpgField(current?.rpgField, patch?.rpgField);
    }
    return merged;
  },

  mergeRpgField(current = {}, patch = {}) {
    return {
      ...(current || {}),
      ...(patch || {}),
      level: patch?.level || current?.level,
      intrinsicBase: { ...(current?.intrinsicBase || {}), ...(patch?.intrinsicBase || {}) },
    };
  },

  mergeGeneratedParts(part1, part2, part3, part4, attrs) {
    const feeling = { emotions: part2.feeling?.emotions, playerFeelings: part2.feeling?.playerFeelings };
    const merged = { ...part1, ...part3, ...part4, initialMetrics: this.sanitizeInitialMetrics(feeling) };
    merged.forcePositions = part1.forcePositions || part1.force_positions || [];
    if (part4.essentialPreferenceLayers) {
      merged.essentialPreferenceLayers = window.GameModules.playerAspirationPreferenceLayers?.normalizeLayers?.(part4.essentialPreferenceLayers) || part4.essentialPreferenceLayers;
      merged.essentialPreferenceLayersLocked = part4.essentialPreferenceLayersLocked !== false;
    }
    merged.roleCardFieldReasons = this.roleReasonsFromParts(merged);
    merged.rpgFieldReasons = this.rpgReasonsFromPart4(merged, attrs);
    return merged;
  },

  roleReasonsFromParts(profile = {}) {
    const factionText = (profile.factions || []).map((x) => `${x.faction}/${x.role}：${x.reason || ''}`).join('；');
    const forceText = ((profile.forcePositions || profile.force_positions) || []).map((x) => `${x.force}/${x.position}：${x.reason || ''}`).join('；');
    return {
      姓名: `${profile.name || '该人物'}的姓名来自 Part1 固化身份字段。`,
      所属世界: profile.worldTag?.reason || `${profile.name || '该人物'}的所属世界来自 Part1 worldTag。`,
      身份: `${profile.role || '身份'}来自 Part1 role 与人物背景。`,
      职业: profile.job ? `${profile.job}由 Part1 jobConfirmed 确认。` : 'Part1 未确认内化职业，职业保持为空。',
      性别: profile.gender ? `${profile.name || '该人物'}的性别由 Part1 gender 固化为${profile.gender}。` : 'Part1 未给出可确认性别。',
      生日: profile.birthday ? `${profile.name || '该人物'}生日来自人物基础资料。` : (profile.age?.reason || 'Part1 只固化年龄，未提供生日。'),
      人际关系: profile.relationships || `${profile.name || '该人物'}暂无可固化人际关系。`,
      外貌: profile.appearance || '外貌来自 Part1 appearance。',
      喜好: profile.preferences || '喜好来自 Part1 preferences。',
      性格: profile.personality || '性格来自 Part1 personality。',
      人物说明: profile.detail || '人物说明来自 Part1 detail。',
      社群角色: factionText || '社群角色来自 Part1 factions。',
      势力地位: forceText || '势力地位来自 Part1 forcePositions。',
      本质偏好: window.GameModules.playerAspirationPreferenceLayers?.summaryText?.(profile.essentialPreferenceLayers) || '本质偏好五层在角色卡生成时固化。',
    };
  },

  rpgReasonsFromPart4(profile = {}, attrs = null) {
    const fallback = window.GameModules.characterReasonFallback?.rpgReasons?.(profile, attrs) || {};
    const rpg = profile.rpgField || {};
    const base = rpg.intrinsicBase || {};
    const derived = rpg.derived || {};
    const direct = {
      level: rpg.level?.reason,
      strength: base.strength?.reason,
      agility: base.agility?.reason,
      constitution: base.constitution?.reason,
      intelligence: base.intelligence?.reason,
      perception: base.perception?.reason,
      willpower: base.willpower?.reason,
      charisma: base.charisma?.reason,
      derived: [derived.攻击力?.reason, derived.防御力?.reason].filter(Boolean).join('；'),
      learning_ability: profile.learningAbility?.reason,
      mental_stability: profile.mentalStability?.reason,
      growth_potential: profile.growthPotential?.reason,
      action_ability: profile.actionAbility?.reason,
      world_tag: profile.worldTag?.reason,
      control_experience: profile.control_experience?.习惯程度,
    };
    return Object.fromEntries(this.rpgFieldReasonKeys(attrs).map((key) => [key, String(direct[key] || fallback[key] || `${profile.name || '该人物'}的${key}来自 Part1/Part7 固化资料。`).slice(0, 120)]));
  },

  parse(text) {
    return window.GameModules.jsonUtils.parseLoose(text);
  },

  parsePartOutput(partIndex, text, base = {}) {
    if ([2, 3, 4, 5, 6, 7].includes(partIndex)) return this.parse(text);
    return this.parse(text);
  },

  parseCsvAbilitiesPart(text, name = '') {
    const rows = this.csvDataRows(text, 'type,name,level,');
    return this.buildAbilitiesFromRows(rows, name, true);
  },

  buildAbilitiesFromRows(rows, name = '', strict = false) {
    const result = { name, skills: [], knowledge: [], professions: [], _csvRows: [] };
    rows.forEach((row) => {
      const parts = this.csvParts(row);
      const issue = this.part3RowIssue(parts);
      if (issue) return;
      const [type, itemName, level, reason, requiredIntrinsicBase, requiredKnowledge, requiredSkills] = parts;
      const item = {
        name: itemName,
        desc: `${itemName}的实际表现与可用范围。`,
        level: Number(level),
        levelEffects: this.csvLevelEffects(itemName),
        reason: this.csvCell(reason),
      };
      item.requiredIntrinsicBase = this.csvList(requiredIntrinsicBase);
      item.requiredKnowledge = this.csvList(requiredKnowledge);
      item.requiredSkills = this.csvList(requiredSkills);
      result[type].push(item);
      result._csvRows.push(row);
    });
    this.promotePart3Dependencies(result);
    if (strict && !result.skills.length) throw new Error('Part3 CSV 缺少 skills 行');
    if (strict && !result.knowledge.length) throw new Error('Part3 CSV 缺少 knowledge 行');
    return result;
  },

  promotePart3Dependencies(result) {
    const baseKeys = new Set(['strength', 'agility', 'constitution', 'intelligence', 'perception', 'willpower', 'charisma']);
    const names = {
      skills: new Set(result.skills.map((item) => item.name)),
      knowledge: new Set(result.knowledge.map((item) => item.name)),
    };
    const add = (type, itemName) => {
      const name = this.csvCell(itemName);
      if (!name || baseKeys.has(name) || names[type].has(name)) return;
      result[type].push({
        name,
        desc: `${name}的基础掌握与实际应用。`,
        level: 1,
        levelEffects: this.csvLevelEffects(name),
        reason: '由能力依赖自动提升为角色基础能力。',
        requiredIntrinsicBase: [],
        requiredKnowledge: [],
        requiredSkills: [],
      });
      names[type].add(name);
    };
    [...result.skills, ...result.knowledge, ...result.professions].forEach((item) => {
      (item.requiredKnowledge || []).forEach((name) => add('knowledge', name));
      (item.requiredSkills || []).forEach((name) => add('skills', name));
    });
  },

  part3RowIssue(parts) {
    if (parts.length !== 7) return '列数不是7';
    const [type, itemName, level, reason] = parts;
    if (!['skills', 'knowledge', 'professions'].includes(type)) return 'type无效';
    if (!itemName || itemName === '--') return 'name缺失';
    if (!Number.isInteger(Number(level)) || Number(level) < 1 || Number(level) > 7) return 'level无效';
    if (!this.csvCell(reason)) return 'reason缺失';
    return '';
  },

  buildBodyProfileFromRows(rows, name = '') {
    const expected = this.bodyProfileParts();
    const byPart = new Map();
    rows.forEach((row) => {
      const normalized = this.normalizePart5Row(row);
      const parts = this.csvParts(normalized);
      if (this.part5RowIssue(parts)) return;
      const [index, part, description] = parts;
      byPart.set(part, { index: Number(index), part, description: this.csvCell(description) });
    });
    return { name, bodyProfile: expected.map((part, i) => byPart.get(part) || { index: i + 1, part, description: '' }), _csvRows: rows };
  },

  buildDressedProfileFromRows(rows, name = '') {
    const body = this.buildBodyProfileFromRows(rows, name);
    return { name, dressedProfile: body.bodyProfile, _csvRows: rows };
  },

  bodyProfileSummary(value) {
    const list = Array.isArray(value) ? value : [];
    return list.map((item, index) => {
      const part = String(item?.part || item?.部位 || '').trim();
      const description = String(item?.description || item?.部位描写 || '').trim();
      if (!part || !description) return '';
      return `${Number(item?.index || item?.序号) || index + 1}.${part}：${description}`;
    }).filter(Boolean).join('\n') || '未生成身体原貌。';
  },

  part5RowIssue(parts) {
    if (parts.length !== 3) return '列数不是3';
    const [index, part, description] = parts;
    const expected = this.bodyProfileParts();
    if (!Number.isInteger(Number(index)) || Number(index) < 1 || Number(index) > expected.length) return '序号无效';
    if (!expected.includes(part)) return '部位不在固定列表';
    if (!this.csvCell(description)) return '部位描写缺失';
    return '';
  },

  bodyProfileParts() {
    return ['头发', '脸部', '耳朵', '脖颈', '胸部', '双臂', '小腹', '臀部', '神秘花园', '双大腿', '双小腿'];
  },

  bodyProfilePromptText(part) {
    return {
      头发: '描写未经任何造型、未施任何护发产品的天然头发，包括其色泽、蓬松度、发丝的粗细、垂落时的走向，以及光线照射下呈现的天然光泽。',
      脸部: '描写完全素净的面容，无粉底、无口红、无眉笔修饰。重点描写眉毛的天然走向、眼睑的褶皱、鼻梁的天然弧线、唇色的本来气色（苍白或红润）。',
      耳朵: '描写耳廓的软骨弧度、耳垂的形态、耳后肌肤的细腻度，以及半透明软骨在逆光下的透光效果。',
      脖颈: '描写颈部的修长线条、咽喉处的轻微凸起（喉结或软骨）、锁骨的横向凹陷、颈窝的深浅，以及颈侧隐约的筋脉走向。',
      胸部: '（若为女性）描写未经胸衣束缚的天然乳房轮廓，包括侧面的弧线、乳晕的色泽与大小、静止时自然的下垂弧度；（若为男性）描写胸大肌的天然厚度、乳头的位置与形态、肋骨隐约浮现的痕迹。',
      双臂: '描写大臂的圆润、肘部骨节的突出、小臂内侧的浅静脉走向、手腕的纤细、手背的骨骼轮廓以及手指的长度与关节弧度。',
      小腹: '描写腹部的平坦或自然微凸、肚脐的形状（如椭圆形或圆形）、腹中线隐约的纵向纹路，以及呼吸时腹部轻微的起伏动态。',
      臀部: '描写臀部的饱满程度、从腰部到臀顶的弧线、臀缝的纵向凹陷、臀部下沿与大腿连接处的清晰分界褶皱。',
      神秘花园: '描写阴部的天然形态，使用含蓄隐喻（如“贝壳”“花瓣”“柔丘”等），包括耻骨的隆起、阴毛的天然分布（若有）、大小阴唇的闭合形态，作为身体美学的一部分呈现。',
      双大腿: '描写大腿从根部到膝盖的渐收线条、大腿内侧肌肤的细腻度、外侧的肌肉轮廓，以及站立时大腿之间的自然缝隙或贴合程度。',
      双小腿: '描写小腿肚的腓肠肌弧度、跟腱的修长拉伸感、脚踝两侧骨节的突出、脚背的拱形弧线。',
    }[part] || '描写未经人工修饰、未经衣物遮掩的天然身体状态。';
  },

  dressedProfilePromptText(part) {
    return {
      头发: '描写经过精心造型、使用护发与定型产品后的发型，包括发丝的光泽感（如精油或喷雾带来的镜面反光）、卷曲或盘起的弧度、发胶固定后的纹理走向，以及发饰（如簪子、发夹、发带）的点缀效果，光线照射下呈现的人工增亮光泽。',
      脸部: '描写完整的妆容修饰，包括粉底均匀覆盖后的无瑕肤色、眉毛经描画后的精致弧度与填充、眼睑上眼影的晕染层次、眼线的勾勒、睫毛膏的纤长卷翘效果、腮红赋予的双颊血色，以及唇膏/唇釉涂抹后的饱满色泽与边界分明的唇形。',
      耳朵: '描写佩戴耳饰后的耳朵状态，包括耳钉/耳环/耳坠的材质（金属、宝石、珍珠等）与造型、耳饰与耳廓的贴合或垂坠关系、耳垂因负重产生的轻微拉伸感，以及耳饰在光线下的闪烁反光，衬托得耳部肌肤愈发细腻。',
      脖颈: '描写颈部佩戴饰品（项链/项圈/choker）后的状态，包括链条的粗细、吊坠垂落的位置与锁骨窝的关系、金属或珠宝贴肤的冰凉质感暗示、颈链对颈部线条的视觉分割与修饰，以及妆容中脖颈部涂抹粉底的均匀过渡。',
      胸部: '（若为女性）描写穿着胸衣/礼服后的胸部形态，包括胸衣承托形成的饱满上提弧度、乳沟的明显聚拢效果、面料（蕾丝、缎面、薄纱）覆盖或半覆盖下的若隐若现；（若为男性）描写穿着衬衣或礼服后的胸廓形态，包括衬衣纽扣间的轻微张力、胸肌被衣料勾勒出的轮廓，以及领带/领结的垂落位置。',
      双臂: '描写佩戴臂饰/手镯/戒指等饰物后的手臂状态，包括袖口（长袖、中袖、无袖）的款式与堆叠褶皱、手镯在腕间滑动时与骨骼的触碰关系、戒指在手指上的位置与宝石的光泽、指甲油的颜色与指甲的修长形状，以及整体在衣物面料衬托下露出的肤色对比。',
      小腹: '描写穿着紧身服饰（如束腰、鱼骨、腰带、高腰裙/裤）后的小腹状态，包括衣物对腹部的轻微塑形压缩、面料贴腹产生的横向褶皱、腰带/腰封对腰部曲线的强化收紧、肚脐位置在薄透面料下的隐约可辨，以及整体呈现的人工塑形腰腹弧线。',
      臀部: '描写穿着下装（裙装/裤装）后的臀部形态，包括面料包裹臀部的紧绷或垂坠程度、臀缝在衣裙表面的隐约印痕、裙摆/裤管从臀部最凸点到下摆的流畅垂坠或蓬松展开，以及腰带/腰封在腰部与臀部之间形成的视觉强调。',
      神秘花园: '描写穿着下装（内裤、衬裙、紧身裙/裤）后阴部的遮掩状态，包括面料（蕾丝、丝绸、棉质）的覆盖质感、紧身面料贴合时勾勒出的轻微隆起轮廓、裤缝/裆线在人鱼线或腹股沟处的延伸走向，整体强调“被精心包裹与修饰”的含蓄美感。',
      双大腿: '描写穿着丝袜/裤袜/长靴或裸露于裙摆之外的大腿状态，包括丝袜覆盖下的肤色均匀化与细微光泽、裙摆边缘在大腿处形成的横向切割线、长靴筒口对大腿肌肉的轻微挤压痕迹、以及行走时衣料随大腿动作产生的皱褶位移。',
      双小腿: '描写穿着鞋袜后的小腿状态，包括高跟鞋/靴子对跟腱的拉伸修饰效果（使小腿线条更修长）、鞋面覆盖或露出脚背的弧线、袜子/丝袜在脚踝处的堆叠或绷紧、鞋跟在视觉上提升腿长的效果，以及鞋履本身的装饰细节（绑带、扣饰、镂空等）对小腿的衬托。',
    }[part] || '描写盛装/打扮完全后的造型、修饰和衣物包裹效果。';
  },

  bodyProfileCompleteItems(value) {
    const list = Array.isArray(value) ? value : [];
    return this.bodyProfileParts().filter((part, index) => {
      const item = list.find((entry) => entry?.part === part || entry?.部位 === part);
      return item && Number(item.index || item.序号) === index + 1 && String(item.description || item.部位描写 || '').trim();
    });
  },

  bodyProfileComplete(value) {
    return this.bodyProfileCompleteItems(value).length === this.bodyProfileParts().length;
  },

  completeBodyProfileFallback(partIndex, data, base = {}) {
    const key = partIndex === 6 ? 'dressedProfile' : 'bodyProfile';
    const list = Array.isArray(data?.[key]) ? data[key] : [];
    const byPart = new Map();
    list.forEach((item) => {
      const part = String(item?.part || item?.部位 || '').trim();
      const description = String(item?.description || item?.部位描写 || '').trim();
      if (this.bodyProfileParts().includes(part) && description) byPart.set(part, { ...item, part, description });
    });
    const label = partIndex === 6 ? '盛装状态' : '自然状态';
    const filled = this.bodyProfileParts().map((part, index) => {
      const old = byPart.get(part);
      if (old) return { index: index + 1, part, description: old.description };
      const text = partIndex === 6 ? this.dressedProfilePromptText(part) : this.bodyProfilePromptText(part);
      return { index: index + 1, part, description: `采用系统兜底${label}：${text}` };
    });
    return { ...(data || {}), name: base.name || data?.name || '', [key]: filled };
  },

  parseCsvInventoryPart(text, name = '') {
    const rows = this.csvDataRows(text, 'type,slot,clothing_position,');
    return this.buildInventoryFromRows(rows, name);
  },

  buildInventoryFromRows(rows, name = '') {
    const wearing = this.emptyWearingObject();
    const result = { name, items: [], wearing, _csvRows: [] };
    rows.forEach((row) => {
      const normalizedRow = this.normalizePart4Row(row);
      const parts = this.csvParts(normalizedRow);
      const issue = this.part4RowIssue(parts);
      if (issue) return;
      const [type, slot, clothingPosition, itemName, description, quantity, reason] = parts;
      if (type === 'item') {
        result.items.push({ name: itemName, description: this.csvCell(description), quantity: Math.max(1, Number(quantity) || 1), reason: this.csvCell(reason) });
      }
      if (type === 'wearing') {
        wearing[slot] = { clothing_position: this.csvCell(clothingPosition) || wearing[slot].clothing_position, name: this.csvCell(itemName), description: this.csvCell(description), reason: this.csvCell(reason) };
      }
      if (type === 'slot') {
        wearing.slot.push({ slot: this.csvCell(slot), clothing_position: this.csvCell(clothingPosition), name: itemName, description: this.csvCell(description), reason: this.csvCell(reason) });
      }
      result._csvRows.push(normalizedRow);
    });
    return result;
  },

  part4RowIssue(parts) {
    if (parts.length !== 7) return '列数不是7';
    const [type, slot, clothingPosition, itemName, description, quantity, reason] = parts;
    if (parts.some((cell) => this.invalidPlaceholderCell(cell))) return '非法占位符，未穿戴只能写--';
    if (!['item', 'wearing', 'slot'].includes(type)) return 'type无效';
    if (type === 'item') {
      if (slot !== '--' || clothingPosition !== '--') return 'item槽位列和人体着装部位列必须为--';
      if (!itemName || itemName === '--') return 'item名称缺失';
      if (!this.csvCell(description)) return 'item描述缺失';
      if (!this.csvCell(reason)) return 'item原因缺失';
    }
    if (type === 'wearing') {
      if (!this.fixedWearingSlots().includes(slot)) return 'wearing槽位无效';
      const expectedPosition = this.wearingClothingPositions()[slot];
      if (clothingPosition !== expectedPosition) return `clothing_position应为${expectedPosition}`;
      if (!this.csvCell(reason)) return 'reason缺失';
      const emptyName = itemName === '--';
      const emptyDesc = description === '--';
      if (emptyName !== emptyDesc) return '未穿戴时name和description必须同时为--';
      if (!emptyName && (!this.csvCell(itemName) || !this.csvCell(description))) return '穿戴物名称或描述缺失';
    }
    if (type === 'slot') {
      if (!this.csvCell(slot) || !this.csvCell(clothingPosition) || !itemName || itemName === '--' || !this.csvCell(description)) return 'slot字段缺失';
      if (!this.csvCell(reason)) return 'slot原因缺失';
    }
    return '';
  },

  emptyWearingObject() {
    const positions = this.wearingClothingPositions();
    return { ...Object.fromEntries(Object.entries(positions).map(([key, clothing_position]) => [key, { clothing_position, name: '', description: '', reason: '等待AI生成具体穿着或未穿戴原因。' }])), slot: [] };
  },

  invalidPlaceholderCell(value) {
    const text = String(value || '').trim();
    return Boolean(text) && text !== '--' && /^[-.。·_\s]+$/.test(text);
  },

  wearingClothingPositions() {
    return { head: '头部', neck: '颈部', innerwearTop: '内衣', top: '上衣', outerwear: '外套', gloves: '手套', waist: '腰部', innerwearBottom: '内衣', bottom: '下装', socks: '袜子', shoes: '鞋子', wrist: '手腕' };
  },

  fixedWearingSlots() {
    return ['head', 'neck', 'innerwearTop', 'top', 'outerwear', 'gloves', 'waist', 'innerwearBottom', 'bottom', 'socks', 'shoes', 'wrist'];
  },

  csvDataRows(text, headerPrefix) {
    const raw = String(text || '').replace(/```(?:csv|txt|json)?|```/g, '').trim();
    return raw.split(/\n+/)
      .map((row) => row.trim().replace(/^[\-*]\s*/, '').replace(/^\d+[.)、]\s*/, ''))
      .filter(Boolean)
      .filter((row) => !row.toLowerCase().startsWith(headerPrefix));
  },

  csvParts(row) {
    const text = String(row || '');
    const parts = [];
    let current = '';
    let quote = '';
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      const atCellStart = !current.trim();
      if ((ch === '"' || ch === '“') && (!quote || atCellStart)) {
        quote = quote ? '' : (ch === '“' ? '”' : ch);
        continue;
      }
      if (quote && ch === quote) {
        if (quote === '"' && text[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          quote = '';
        }
        continue;
      }
      if (ch === ',' && !quote) {
        parts.push(current.trim());
        current = '';
        continue;
      }
      current += ch;
    }
    parts.push(current.trim());
    return parts.map((part) => this.csvStripOuterQuotes(part));
  },

  csvStripOuterQuotes(value) {
    const text = String(value || '').trim();
    return text.replace(/^["“”]|["“”]$/g, '');
  },

  csvJoin(parts) {
    return parts.map((part) => String(part ?? '').replace(/,/g, '，')).join(',');
  },

  csvCell(value) {
    const text = this.csvStripOuterQuotes(value);
    return text === '--' ? '' : text;
  },

  csvList(value) {
    return this.csvCell(value).split('|').map((item) => item.trim()).filter(Boolean);
  },

  csvLevelEffects(name = '能力') {
    const labels = ['刚入门', '初学', '熟练', '专业', '专家', '大师', '极致'];
    return Object.fromEntries(labels.map((label, index) => [`lv${index + 1}`, { 程度介绍: label, 说明: `${name}${label}时的表现。` }]));
  },

  parseCsvFeelingPart(text, name = '') {
    const rows = this.csvDataRows(text, 'name,value,status,reason');
    return this.buildFeelingFromRows(rows, name, true);
  },

  buildFeelingFromRows(rows, name = '', strict = false) {
    const emotions = this.parseMetricGroupLines(rows, 'emotions', window.GameModules.metrics.emotionKeys).emotions || [];
    const playerFeelings = this.parseMetricGroupLines(rows, 'playerFeelings', window.GameModules.metrics.playerKeys).playerFeelings || [];
    if (strict && emotions.length !== window.GameModules.metrics.emotionKeys.length) throw new Error('emotions CSV 行数不完整');
    if (strict && playerFeelings.length !== window.GameModules.metrics.playerKeys.length) throw new Error('playerFeelings CSV 行数不完整');
    const emotionMap = { 冷静: 'cold', 恐惧: 'fear', 担忧: 'worry', 高兴: 'joy', 紧张: 'tension', 愤怒: 'anger', 羞耻: 'shame', 悲伤: 'sadness', 好奇: 'curiosity', 麻木: 'numbness', 嫉妒: 'jealousy', 绝望: 'despair' };
    const playerMap = { 了解: 'understanding', 信任: 'trust', 反抗: 'resistance', 好感: 'affection', 友情: 'friendship', 亲情: 'familyLove', 爱情: 'romanticLove', 肉欲: 'lust', 畏惧: 'awe', 尊敬: 'respect', 崇拜: 'admiration', 讨厌: 'dislike', 依赖: 'dependence', 警惕: 'vigilance', 支配欲: 'dominance', 占有欲: 'possessiveness', 服从: 'submission' };
    const toObject = (items, map) => Object.fromEntries(items.map((item) => [map[item.key] || item.key, { name: item.key, value: item.value, status: item.status, reason: item.reason, metricSources: item.metricSources || this.metricSourceMap?.('ai') }]));
    return { name, feeling: { emotions: toObject(emotions, emotionMap), playerFeelings: toObject(playerFeelings, playerMap) }, _csvRows: rows };
  },

  parseMetricGroup(text, group, keys) {
    const lined = this.parseMetricGroupLines(text, group, keys);
    if (lined[group]?.length === keys.length) return lined;
    const recovered = this.recoverMetricGroup(text, group, keys);
    if (recovered[group]?.length === keys.length) return recovered;
    try {
      return this.parse(text);
    } catch (err) {
      if (lined[group]?.length) return lined;
      if (recovered[group]?.length) return recovered;
      throw err;
    }
  },

  parseMetricGroupLines(text, group, keys) {
    const rawRows = Array.isArray(text) ? text : this.csvDataRows(text, 'name,value,status,reason');
    const rows = rawRows.map((row) => this.normalizePart2Row(row));
    const items = [];
    keys.forEach((key) => {
      const line = rows.find((row) => row.startsWith(`${key},`) || row.startsWith(`name,${key},`));
      if (!line) return;
      let parts = this.csvParts(line);
      if (parts[0] === 'name' && parts[1] === key) parts = parts.slice(1);
      if (parts.length === 3) parts = [parts[0], parts[1], parts[2], parts[2]];
      if (this.part2RowIssue(parts, key)) return;
      const value = Number(parts[1]);
      const status = parts[2] || '';
      const reason = parts[3] || status;
      items.push({ key, value, status, reason, metricSources: this.metricSourceMap?.('ai') });
    });
    return { [group]: items };
  },

  part2RowIssue(parts, expectedKey = '') {
    if (parts[0] === 'name' && expectedKey && parts[1] === expectedKey) parts = parts.slice(1);
    if (parts.length !== 4) return '列数不是4';
    const [key, value, status, reason] = parts;
    const allKeys = [...window.GameModules.metrics.emotionKeys, ...window.GameModules.metrics.playerKeys];
    if (expectedKey && key !== expectedKey) return '情感名错位';
    if (!allKeys.includes(key)) return '情感名不在固定列表';
    if (!Number.isInteger(Number(value)) || Number(value) < 0 || Number(value) > 100) return 'value无效';
    if (!String(status || '').trim()) return 'status缺失';
    if (!String(reason || '').trim()) return 'reason缺失';
    return '';
  },

  recoverMetricGroup(text, group, keys) {
    const raw = String(text || '').replace(/```(?:json)?|```/g, '');
    const items = [];
    keys.forEach((key, index) => {
      const keyPattern = new RegExp(`"key"\\s*:\\s*"${key}"`);
      const found = raw.match(keyPattern);
      const start = found?.index ?? -1;
      const endKey = keys[index + 1];
      const endMatch = endKey && start >= 0 ? raw.slice(start + 1).match(new RegExp(`"key"\\s*:\\s*"${endKey}"`)) : null;
      const end = endMatch ? start + 1 + endMatch.index : -1;
      const chunk = start >= 0 ? raw.slice(start, end >= 0 ? end : undefined) : '';
      const value = chunk.match(/"value"\s*:\s*(-?\d+)/)?.[1] ?? chunk.match(/,\s*(-?\d+)\s*(?:[}\]])/)?.[1];
      const status = chunk.match(/"status"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/)?.[1];
      const reason = this.pickMetricReason(raw, chunk, key, start);
      if (value !== undefined || status || reason) {
        const complete = value !== undefined && status && reason;
        const fallback = `${key}暂按当前资料保守记录，等待后续AI补齐。`;
        items.push({ key, value: Number(value || 0), status: status || fallback, reason: reason || fallback, metricSources: this.metricSourceMap?.(complete ? 'ai' : '系统') });
      }
    });
    return { [group]: items };
  },

  pickMetricReason(raw, chunk, key, start) {
    const normal = chunk.match(/"reason"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/)?.[1];
    if (normal) return normal;
    const tail = String(raw || '').slice(Math.max(0, start));
    const loose = tail.match(new RegExp(`"reason"\\s*:\\s*"(${key}[^"\\\\]*(?:\\\\.[^"\\\\]*)*)"`));
    return loose?.[1] || '';
  },

  async generateInitialMetrics(profile, base, lore, attrs, context, store) {
    const evidence = this.initialMetricsEvidence(profile, base, lore, attrs, context, store);
    const emotions = await this.generateMetricGroupChunks(profile, base, evidence, 'emotions', window.GameModules.metrics.emotionKeys);
    const playerFeelings = await this.generateMetricGroupChunks(profile, base, evidence, 'playerFeelings', window.GameModules.metrics.playerKeys);
    return this.initialMetrics({ emotions, playerFeelings }, { ...base, ...profile });
  },

  metricGroupKeyChunks(group, keys) {
    return [keys];
  },

  estimateMetricItemChars(key) {
    return 170 + key.length * 3;
  },

  async generateMetricGroupChunks(profile, base, evidence, group, keys, bumpProgress = null, feelingSoFar = null) {
    const chunks = this.metricGroupKeyChunks(group, keys);
    const items = [];
    const reportChunk = () => {
      if (typeof bumpProgress !== 'function' || !feelingSoFar) return;
      const partial = { ...feelingSoFar };
      const objectKey = group === 'emotions' ? 'emotions' : 'playerFeelings';
      partial[objectKey] = Object.fromEntries(keys.map((key) => {
        const item = items.find((entry) => entry?.key === key) || {};
        return [key, { name: key, value: item.value, status: item.status, reason: item.reason }];
      }));
      bumpProgress(partial);
    };
    for (let i = 0; i < chunks.length; i += 1) {
      const chunk = chunks[i];
      try {
        const part = await this.generateMetricGroup(profile, base, evidence, group, chunk, i + 1, chunks.length);
        items.push(...part);
        reportChunk();
      } catch (err) {
        console.warn('[角色数值] 分块生成失败:', { profile: profile.name || base.name, group, keys: chunk, error: err.message });
      }
      const needsRepair = chunk.filter((key) => {
        const item = items.find((entry) => entry?.key === key);
        return !item || !this.metricSourcesAreAi?.(item);
      });
      if (needsRepair.length) {
        this.warnMetricGroupIssues('角色数值缺字段或系统来源，批量补齐一次', items, chunk, { ...base, ...profile, group, chunkIndex: i + 1 });
        try {
          const part = await this.generateMetricGroup(profile, base, evidence, group, needsRepair, `${i + 1}-repair`, chunks.length);
          needsRepair.forEach((key) => {
            const index = items.findIndex((item) => item?.key === key);
            if (index >= 0) items.splice(index, 1);
          });
          items.push(...part);
          reportChunk();
        } catch (err) {
          console.warn('[角色数值] 批量补齐失败，保留系统来源兜底:', { profile: profile.name || base.name, group, missing: needsRepair, error: err.message, stack: err.stack });
        }
      }
    }
    return this.validateMetricGroup(items, keys, { ...base, ...profile, group });
  },

  async generateMetricGroup(profile, base, evidence, group, keys, chunkIndex = 1, chunkTotal = 1) {
    const prompt = await this.metricGroupPrompt(profile, base, evidence, group, keys);
    const source = chunkTotal > 1 ? `character-profile-${group}-${chunkIndex}` : `character-profile-${group}`;
    return window.GameModules.jsonUtils.generateJsonWithRetry({
      source,
      promptId: 'character-profile-metric-group',
      model: window.GameModules.aiRequest?.selectedTextModel?.(),
      timeoutMs: 60000,
      prompt,
      format: prompt,
      repairHint: this.metricGroupRepairHint(base, group, keys, evidence),
      requiredRawFields: [group, 'key', 'value', 'status', 'reason', ...keys],
      parse: (text) => this.parseMetricGroup(text, group, keys),
      validate: (raw) => this.validateMetricGroup(raw?.[group] || raw?.items || raw, keys, { ...base, ...profile, group }),
    });
  },

  initialMetricsEvidence(profile, base, lore, attrs, context, store) {
    const sections = window.GameModules.promptSections;
    const player = sections.playerProfile(store);
    return {
      roleCard: [
        `姓名：${profile.name || base.name}`,
        `身份：${profile.role || base.role || ''}`,
        `关系：${profile.relationships || base.relationships || ''}`,
        `背景：${profile.detail || base.detail || ''}`,
        `外貌：${profile.appearance || base.appearance || ''}`,
        `喜好：${profile.preferences || base.preferences || ''}`,
        `性格：${profile.personality || base.personality || ''}`,
        `社群：${(profile.factions || []).map((x) => `${x.faction}/${x.role || x.position || ''}`).join('、') || profile.faction || ''}`,
        `势力：${((profile.forcePositions || profile.force_positions) || []).map((x) => `${x.force}/${x.position}`).join('、') || profile.rank || ''}`,
      ].join('\n').slice(0, 900),
      playerProfile: [
        player.playerBasic,
        player.playerIdentity,
        player.playerHome,
        player.playerRelations,
        player.playerNotes,
      ].map((text) => String(text || '').slice(0, 700)).join('\n'),
      worldLore: sections.worldLore(lore).slice(0, 700),
      worldFields: sections.worldFields(attrs).slice(0, 400),
      relationContext: sections.relationContext(context).slice(0, 900),
    };
  },

  async metricGroupPrompt(profile, base, evidence, group, keys) {
    return window.GameModules.renderPrompt('character-profile-metric-group', {
      人物姓名: profile.name || base.name,
      数值组名称: group === 'emotions' ? '情绪' : '对玩家感觉',
      根字段: group,
      字段列表: keys.join('、'),
      人物角色卡: evidence.roleCard,
      玩家资料: evidence.playerProfile,
      世界观资料: evidence.worldLore,
      世界字段: evidence.worldFields,
      剧情关系事件: evidence.relationContext,
      完整JSON骨架: this.metricGroupJsonSkeleton(group, keys),
      完整行格式骨架: this.metricGroupSkeleton(group, keys),
      首个字段: keys[0],
    });
  },

  metricGroupSkeleton(group, keys) {
    return keys.map((key) => `${key},0,${key}因为人物经历与关系事件形成当前数值,${key}源于人物过去经历和当前关系事件的影响`).join('\n');
  },

  metricGroupJsonSkeleton(group, keys) {
    return JSON.stringify({ [group]: keys.map((key) => ({ key, value: 0, status: `${key}因为人物经历与关系事件形成当前数值`, reason: `${key}源于人物过去经历和当前关系事件的影响` })) });
  },

  metricGroupRepairHint(base, group, keys, evidence = {}) {
    const relationEvidence = group === 'playerFeelings' ? [
      '修复 playerFeelings 时请重新参考下列证据，避免只照抄骨架里的 0：',
      `人物角色卡：${evidence.roleCard || ''}`,
      `玩家资料：${evidence.playerProfile || ''}`,
      `剧情关系事件：${evidence.relationContext || ''}`,
      '若证据中存在亲属、恋人、暧昧、依赖、占有、肉欲、畏惧、尊敬、支配等明确关系，相关 key 建议给出匹配数值，避免无依据地补成 0。',
      '证据明确缺乏对应关系或冲动时，亲情、爱情、肉欲、依赖、占有欲等可以为 0。',
    ].join('\n') : '';
    return [
      `目标人物只能是：${base.name}。`,
      `目标数值组是 ${group}，但不要输出根字段名。`,
      `必须重写完整 ${group} 行列表，不是只输出报错的单个 key。`,
      relationEvidence,
      `直接按这个完整行格式骨架保留 key 和行数，再根据证据改写 value/status/reason；骨架里的 value 0 只是占位，不能当默认值：\n${this.metricGroupSkeleton(group, keys)}`,
      `${group} 必须按顺序完整包含：${keys.join('、')}，每个 key 精确一次，不能截断。`,
      '每一行都必须是 key,value,status,reason 四段；reason 是强制段，即使上一轮只有 status，也必须为同一个 key 补出 reason。',
      '本批 key 很少，必须完整输出每个 key；不要省略任何一行。',
      'status 必须是20-50个汉字的短句，必须以当前key开头，使用“当前key因为……”或“当前key源于……”句式。',
      'reason 必须是20-50个汉字的短句，必须以当前key开头，写形成该数值的具体原因，结合角色动机、处境与过去经历。',
      'status 和 reason 内不要使用英文逗号；reason 不能和 status 完全重复，不能只写抽象性格词；禁止写“默认、初始化、根据上下文、系统生成、综合判断、阶段定义、背景信息、个人动机与过去经历、等待后续AI补齐”等空话。',
      '不要返回英文 key、initial_metrics、affection、dependency、trust_level 等替代结构。',
      '只返回纯文本行，不要 JSON，不要 Markdown。',
    ].filter(Boolean).join('\n');
  },

  warnMetricGroupIssues(label, value, keys, profile = {}) {
    const list = Array.isArray(value) ? value : [];
    const returnedKeys = list.map((entry) => entry?.key).filter(Boolean);
    const missing = keys.filter((key) => !list.some((entry) => entry?.key === key));
    const missingValue = keys.filter((key) => {
      const item = list.find((entry) => entry?.key === key);
      return item && item.value === undefined;
    });
    const missingStatus = keys.filter((key) => {
      const item = list.find((entry) => entry?.key === key);
      return item && !String(item.status || '').trim();
    });
    const missingReason = keys.filter((key) => {
      const item = list.find((entry) => entry?.key === key);
      return item && !String(item.reason || '').trim();
    });
    const extra = returnedKeys.filter((key) => !keys.includes(key));
    if (missing.length || missingValue.length || missingStatus.length || missingReason.length || extra.length) {
      console.warn(`[${label}]`, { profile: profile.name || '角色', group: profile.group || 'unknown', expectedKeys: keys, returnedKeys, missing, missingValue, missingStatus, missingReason, extra, chunkIndex: profile.chunkIndex || null });
    }
    return { missing, missingValue, missingStatus, missingReason, extra };
  },

  validateMetricGroup(value, keys, profile = {}) {
    if (!Array.isArray(value)) {
      console.warn('[角色数值校验] 数值组不是数组:', { profile: profile.name || '角色', group: profile.group || 'unknown', value });
      throw new Error(`${profile.name || '角色'} 的数值组不是数组`);
    }
    const issues = this.warnMetricGroupIssues('角色数值校验缺字段', value, keys, profile);
    if (issues.missing.length) throw new Error(`${profile.name || '角色'} 缺少AI生成的${issues.missing.join('、')}数值项`);
    if (issues.missingValue.length) throw new Error(`${profile.name || '角色'} 缺少AI生成的${issues.missingValue.join('、')}数值`);
    if (issues.missingStatus.length) throw new Error(`${profile.name || '角色'} 的${issues.missingStatus.join('、')}缺少AI生成的数值解释`);
    if (issues.missingReason.length) throw new Error(`${profile.name || '角色'} 的${issues.missingReason.join('、')}缺少AI生成的变化原因`);
    return keys.map((key) => {
      const item = value.find((entry) => entry?.key === key);
      return { key, value: window.GameModules.metrics.clamp(item.value), status: String(item.status).slice(0, 160), reason: String(item.reason).slice(0, 180) };
    });
  },

  part1Summary(part1, essentialLayers = null) {
    const lines = [
      `姓名：${part1.name || ''}`,
      `所属世界：${part1.worldTag?.value || ''}`,
      `性别：${part1.gender || ''}`,
      `年龄：${part1.age?.value || part1.age || ''}`,
      `身份：${part1.role || ''}`,
      `关系：${part1.relationships || ''}`,
      `背景：${part1.detail || ''}`,
      `外貌：${part1.appearance || ''}`,
      `喜好：${part1.preferences || ''}`,
      `性格：${part1.personality || ''}`,
      `学习能力：${part1.learningAbility?.value || ''}`,
      `精神稳定度：${part1.mentalStability?.value || ''}`,
      `成长潜力：${part1.growthPotential?.value || ''}`,
      `行动能力：${part1.actionAbility?.value || ''}`,
      `社群：${(part1.factions || []).map((x) => `${x.faction}/${x.role}`).join('、')}`,
      `势力：${((part1.forcePositions || part1.force_positions) || []).map((x) => `${x.force}/${x.position}`).join('、')}`,
      `职业：${part1.job || '无'}`,
    ];
    const layers = essentialLayers || part1.essentialPreferenceLayers;
    const prefText = window.GameModules.playerAspirationPreferenceLayers?.summaryText?.(layers);
    if (prefText) lines.push(`本质偏好五层：\n${prefText}`);
    return lines.join('\n');
  },

  part3Summary(part3 = {}) {
    const names = (items) => (items || []).map((item) => `${item.name || ''}lv${item.level || ''}`).filter(Boolean).join('、') || '无';
    return [`技能：${names(part3.skills)}`, `知识：${names(part3.knowledge)}`, `职业：${names(part3.professions)}`].join('\n');
  },

  part4Summary(part4 = {}) {
    const items = (part4.items || []).map((item) => item.name).filter(Boolean).slice(0, 6).join('、') || '无';
    const wearing = Object.entries(part4.wearing || {}).filter(([key, item]) => key !== 'slot' && item?.name).map(([key, item]) => `${key}:${item.name}`).join('、') || '无';
    return [`物品：${items}`, `穿着：${wearing}`].join('\n');
  },

  partRepairHint(partIndex, base, attrs = null) {
    const nameHint = `目标人物只能是：${base.name}。name 必须逐字等于"${base.name}"，不要同音改字。`;
    if (partIndex === 1) {
      return [
        nameHint,
        '必须返回根字段 worldTag（含 value 和 reason）、age（含 value 和 reason）。',
        '必须返回根字段 learningAbility、mentalStability、growthPotential、actionAbility（各含 value 和 reason）。',
        '必须返回根字段 factions 和 forcePositions（数组，每项含 reason）。',
        'relationships 只能写“当前人物与别人”的关系，冒号右侧不能是当前人物本人；当前人物自己的长兄、妹妹、学生等身份写入 role/detail。',
        '本轮不要返回 feeling/skills/knowledge/professions/items/wearing/rpgField/rpgFieldReasons。',
      ].join('\n');
    }
    if (partIndex === 2) {
      return [
        nameHint,
        '必须返回 JSON 对象，含根字段 name 与 feeling。',
        'feeling 含 emotions 与 playerFeelings，各固定 key 齐全，每项含 name、value、status、reason。',
        '禁止返回 CSV 或 Markdown。',
      ].join('\n');
    }
    if (partIndex === 3) {
      return [
        nameHint,
        '必须返回 JSON：name、skills（≥1）、knowledge（≥1）、professions（可为空数组）。',
        '每项含 name、desc、level、levelEffects、reason；禁止 CSV。',
      ].join('\n');
    }
    if (partIndex === 4) {
      return [
        nameHint,
        '必须返回 JSON：name、items、wearing（12 固定槽位 + slot 数组）。',
        '禁止 CSV；不要返回 rpgField。',
      ].join('\n');
    }
    if (partIndex === 5 || partIndex === 6) {
      const field = partIndex === 5 ? 'bodyProfile' : 'dressedProfile';
      return [
        nameHint,
        `必须返回 JSON：name、${field}（11 项数组，含 index/part/description）。`,
        `必须完整覆盖：${this.bodyProfileParts().join('、')}；禁止 CSV。`,
      ].join('\n');
    }
    return [
      nameHint,
      '必须返回根字段 rpgField，含 level、intrinsicBase（7项，每项含 value/description/reason）。',
      '不要返回 derived、攻击力或防御力；这些由代码根据 level 与 intelligence 自动计算。',
      '顶层只能包含 name 和 rpgField，不要返回 items、wearing 或 rpgFieldReasons。',
      'intrinsicBase 每项的 description 必须根据该属性含义和数值段描写对应表现。',
    ].join('\n');
  },

  validatePart(partIndex, raw, base, lore, attrs, store, template = null) {
    if (!raw || typeof raw !== 'object') throw new Error('AI 输出不是合法对象');
    if (template) {
      const internalKeys = new Set((partIndex === 4 || partIndex === 5 || partIndex === 6) ? ['_csvRows'] : []);
      const extra = Object.keys(raw).filter((key) => !internalKeys.has(key) && !Object.prototype.hasOwnProperty.call(template, key));
      if (extra.length) throw new Error(`Part${partIndex} 返回了模板外字段：${extra.join('、')}`);
      const missing = this.missingPartFields(partIndex, raw, template, base, attrs);
      if (missing.length) throw new Error(`Part${partIndex} 缺少字段：${missing.join('、')}`);
    }
    if (partIndex === 1) {
      if (base.id === 'player-self' && raw.name !== base.name) throw new Error(`Part1 玩家本人姓名漂移: ${raw.name}`);
      if (!this.isConcreteName(raw.name) && base.id !== 'player-self') throw new Error(`Part1 缺少有效姓名: ${raw.name}`);
      return raw;
    }
    if (partIndex === 2) {
      if (!this.feelingGroupComplete(raw.feeling, 'emotions')) throw new Error('Part2 emotions 字段不完整');
      if (!this.feelingGroupComplete(raw.feeling, 'playerFeelings')) throw new Error('Part2 playerFeelings 字段不完整');
      return raw;
    }
    if (partIndex === 3) {
      if (!Array.isArray(raw.skills) || !raw.skills.length) throw new Error('Part3 缺少 skills');
      if (!Array.isArray(raw.knowledge) || !raw.knowledge.length) throw new Error('Part3 缺少 knowledge');
      return raw;
    }
    if (partIndex === 4) {
      if (!this.wearingObjectComplete(raw.wearing)) throw new Error('Part4 缺少 wearing 完整结构');
      return raw;
    }
    if (partIndex === 5) {
      if (!this.bodyProfileComplete(raw.bodyProfile)) throw new Error('Part5 缺少 bodyProfile 完整结构');
      return raw;
    }
    if (partIndex === 6) {
      if (!this.bodyProfileComplete(raw.dressedProfile)) throw new Error('Part6 缺少 dressedProfile 完整结构');
      return raw;
    }
    if (!this.rpgFieldComplete(raw.rpgField)) throw new Error('Part7 缺少 rpgField 完整结构');
    return raw;
  },

  repairHint(base, attrs = null) {
    return [
      `目标人物只能是：${base.name}。name 必须逐字等于“${base.name}”，不要同音改字，不要改成亲属、联系人或关系对象。`,
      '必须返回根字段 roleCardFieldReasons，不是 roleCardField、中文字段平铺或社群映射。',
      'roleCardFieldReasons 必须完整包含：姓名、所属世界、身份、职业、性别、生日、人际关系、外貌、喜好、性格、人物说明、社群角色、势力地位。每个值建议写一句人物相关原因。',
      `必须返回根字段 rpgFieldReasons，并完整包含：${this.rpgFieldReasonKeys(attrs).join('、')}。`,
      '本轮不要返回 initialMetrics、initial_metrics 或任何情绪/感觉数组。',
      'relationships 必须是字符串，格式“关系：姓名”；不要对象。',
    ].join('\n');
  },

  validate(profile, base, lore, attrs, store = null, options = {}) {
    let rawProfile = profile || {};
    const expectedName = String(base.name || '').trim();
    rawProfile = this.lockTargetProfile(rawProfile, base);
    if (this.isConcreteName(expectedName) && rawProfile.name && rawProfile.name !== expectedName) {
      throw new Error(`目标人物漂移: 需要生成${expectedName}，AI返回了${rawProfile.name}`);
    }
    profile = { ...base, ...rawProfile, name: expectedName || rawProfile.name || base.name };
    const fallbackApplied = window.GameModules.characterReasonFallback?.apply?.(profile, attrs) || profile;
    profile = { ...profile, roleCardFieldReasons: fallbackApplied.roleCardFieldReasons, rpgFieldReasons: fallbackApplied.rpgFieldReasons };
    const skills = Array.isArray(profile.skills) ? profile.skills : [];
    const knowledge = Array.isArray(profile.knowledge) ? profile.knowledge : [];
    const professions = Array.isArray(profile.professions) ? profile.professions : [];
    const confirmedJob = profile.jobConfirmed === true ? window.GameModules.professionInfo.normalizeJobName(profile.job) : '';
    const factions = this.factionRoles(profile, base, store);
    const forcePositions = this.forcePositions(profile, base, store);
    const validated = {
      ...base,
      name: this.validName(profile.name, base),
      gender: String(base.gender || profile.gender || '').slice(0, 8),
      age: this.lockedAge(profile, base),
      worldTag: profile.worldTag || null,
      learningAbility: profile.learningAbility || null,
      mentalStability: profile.mentalStability || null,
      growthPotential: profile.growthPotential || null,
      actionAbility: profile.actionAbility || null,
      control_experience: profile.control_experience || { 上线次数: 0, 习惯程度: '初次操控尚不熟悉' },
      relationships: this.formatRelationships(profile.relationships || base.relationships || '', base),
      role: String(profile.role || base.role).slice(0, 18),
      detail: String(profile.detail || base.detail).slice(0, 160),
      appearance: String(profile.appearance || base.appearance || '外貌尚未固化。').slice(0, 140),
      preferences: String(profile.preferences || base.preferences || '').slice(0, 140),
      personality: String(profile.personality || base.personality).slice(0, 100),
      faction: String(factions[0]?.faction || profile.faction || '无').slice(0, 30),
      factionRole: String(factions[0]?.role || factions[0]?.position || profile.factionRole || profile.role || '').slice(0, 24),
      job: confirmedJob,
      rank: String(forcePositions[0]?.position || profile.rank || '').slice(0, 30),
      factions,
      forcePositions,
      force_positions: forcePositions,
      skills: skills.slice(0, 10).map((skill, index) => {
        const name = String(skill.name || `能力${index + 1}`).slice(0, 16);
        const desc = String(skill.desc || '').slice(0, 60);
        const reason = this.inventoryReason({ ...skill, name, desc }, '技能', { ...base, ...profile });
        const item = { name, desc, reason, changeMode: reason };
        if (skill.level !== undefined) item.level = skill.level;
        if (skill.levelEffects) item.levelEffects = skill.levelEffects;
        item.requiredSkills = Array.isArray(skill.requiredSkills) ? skill.requiredSkills : [];
        item.requiredKnowledge = Array.isArray(skill.requiredKnowledge) ? skill.requiredKnowledge : [];
        item.requiredIntrinsicBase = Array.isArray(skill.requiredIntrinsicBase) ? skill.requiredIntrinsicBase : [];
        return item;
      }),
      knowledge: knowledge.slice(0, 10).map((k, index) => {
        const name = String(k.name || `知识${index + 1}`).slice(0, 16);
        const desc = String(k.desc || '').slice(0, 60);
        const reason = this.inventoryReason({ ...k, name, desc }, '知识', { ...base, ...profile });
        const item = { name, desc, reason, changeMode: reason };
        if (k.level !== undefined) item.level = k.level;
        if (k.levelEffects) item.levelEffects = k.levelEffects;
        item.requiredSkills = Array.isArray(k.requiredSkills) ? k.requiredSkills : [];
        item.requiredKnowledge = Array.isArray(k.requiredKnowledge) ? k.requiredKnowledge : [];
        item.requiredIntrinsicBase = Array.isArray(k.requiredIntrinsicBase) ? k.requiredIntrinsicBase : [];
        return item;
      }),
      professions: professions.slice(0, 10).map((p) => ({
        name: String(p.name || '').slice(0, 24),
        desc: String(p.desc || '').slice(0, 80),
        level: p.level || 1,
        levelEffects: p.levelEffects || {},
        'requiredSkills': Array.isArray(p['requiredSkills']) ? p['requiredSkills'] : [],
        'requiredKnowledge': Array.isArray(p['requiredKnowledge']) ? p['requiredKnowledge'] : [],
        'requiredIntrinsicBase': Array.isArray(p['requiredIntrinsicBase']) ? p['requiredIntrinsicBase'] : [],
        reason: String(p.reason || '').slice(0, 120),
      })),
      rpgField: profile.rpgField || null,
      roleCardFieldReasons: this.roleCardFieldReasons(profile.roleCardFieldReasons, { ...base, ...profile }),
      items: this.carryItems(profile.items || base.items, '物品', { ...base, ...profile }),
      wearing: this.wearingObject(profile.wearing || base.wearing, { ...base, ...profile }),
      bodyProfile: Array.isArray(profile.bodyProfile) ? profile.bodyProfile : [],
      dressedProfile: Array.isArray(profile.dressedProfile) ? profile.dressedProfile : [],
      wearingItems: this.wearingItems(profile.wearing || base.wearing, { ...base, ...profile }),
      wearingRawRows: Array.isArray(profile._csvRows) ? profile._csvRows.filter((row) => String(row || '').startsWith('wearing,')) : [],
      worldValues: this.worldValues(profile.worldValues, attrs, base.name),
      worldAttributes: attrs,
      rpgFieldReasons: this.rpgFieldReasons(profile.rpgFieldReasons, attrs, { ...base, ...profile, factions, forcePositions }),
      initialMetrics: options.skipInitialMetrics ? null : this.initialMetrics(profile.initialMetrics, { ...base, ...profile }),
      essentialPreferenceLayers: profile.essentialPreferenceLayers
        ? window.GameModules.playerAspirationPreferenceLayers?.normalizeLayers?.(profile.essentialPreferenceLayers)
        : null,
      essentialPreferenceLayersLocked: Boolean(profile.essentialPreferenceLayersLocked && profile.essentialPreferenceLayers),
      roleCard: true,
      roleCardSource: 'ai',
      roleCardUpdatedAt: new Date().toISOString(),
    };
    return this.ensureInventoryReasons(validated);
  },

  lockPlayerSelfProfile(profile, base) {
    return this.lockTargetProfile(profile, { ...base, id: 'player-self', isPlayer: true });
  },

  lockTargetProfile(profile, base) {
    const locked = { ...profile };
    if (base.id) locked.id = base.id;
    if (base.name) locked.name = base.name;
    if (base.isPlayer || base.id === 'player-self') locked.isPlayer = true;
    ['gender', 'age', 'birthday'].forEach((key) => {
      if (base[key] !== undefined && base[key] !== null && String(base[key]).trim()) locked[key] = base[key];
    });
    ['work', 'role', 'job', 'faction', 'workplace', 'position', 'rank'].forEach((key) => {
      if (base[key] !== undefined && base[key] !== null && String(base[key]).trim()) locked[key] = base[key];
    });
    const wrongName = String(profile?.name || '').trim();
    if (base.name && wrongName && wrongName !== base.name) {
      console.warn('[角色卡] AI返回姓名与目标不一致，已强制锁回:', { expected: base.name, actual: wrongName });
      locked.detail = base.detail || locked.detail;
      locked.personality = base.personality || locked.personality;
      locked.appearance = base.appearance || locked.appearance;
      locked.relationships = base.relationships || locked.relationships;
    }
    return locked;
  },

  lockedAge(profile, base) {
    const baseAge = base?.age && typeof base.age === 'object' && base.age.value !== undefined ? base.age.value : base?.age;
    if (baseAge !== undefined && baseAge !== null && String(baseAge).trim()) return baseAge;
    return (profile.age && typeof profile.age === 'object' && profile.age.value !== undefined) ? profile.age.value : (profile.age || '');
  },

  escapeRegExp(text) {
    return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  },

  withSignature(profile, signature) {
    return { ...profile, roleCardInputSignature: signature || profile.roleCardInputSignature || '' };
  },

  inputSignature(base, context, store, preset = null) {
    const p = store?.playerProfile || {};
    const data = {
      base: {
        id: base.id, name: base.name, work: base.work, role: base.role, gender: base.gender, age: base.age, birthday: base.birthday,
        relationships: base.relationships, nameRule: base.nameRule, detail: base.detail,
        appearance: base.appearance, preferences: base.preferences, personality: base.personality, presetProfilePath: base.presetProfilePath,
        factions: base.factions, forcePositions: base.forcePositions || base.force_positions,
      },
      preset: { path: preset?.path || '', summary: preset?.summary || '' },
      player: {
        name: p.name || store?.playerName, gender: p.gender, birthday: p.birthday, age: p.age,
        city: p.refinedCity || p.city, role: p.refinedRole || p.dailyRole, workplace: p.workplace,
        position: p.position, livingStatus: p.refinedLivingStatus || p.livingStatus,
        parents: p.parentStatus || p.parents, parentDeathCause: p.parentDeathCause,
        relationships: p.relationships, notes: p.notes, worldbuildingNote: p.worldbuildingNote,
      },
      context: String(context || '').slice(0, 1200),
    };
    const raw = JSON.stringify(data);
    return `v7:${raw.length}-${window.GameModules.rpgState.seed(raw)}`;
  },

  fallback(base, lore, attrs) {
    return this.validate({
      ...base,
      faction: lore.factions[0]?.name || '临时关系社群',
      job: '',
      jobConfirmed: false,
      rank: base.role || '成员',
      skills: base.skills?.length ? base.skills : [{ name: '观察', desc: '从细节中判断局势。' }],
      worldValues: {},
    }, base, lore, attrs, window.Alpine?.store?.('game'));
  },

  factionRoles(profile, base, store = null) {
    const social = window.GameModules.socialPosition;
    const list = Array.isArray(profile.factions) ? profile.factions : [];
    const items = list.map((item) => {
      if (typeof item === 'string') {
        const [faction, role] = item.split('/').map((x) => x.trim());
        return social?.item?.(faction, role || '成员') || { name: item, faction, role: role || '成员' };
      }
      const baseItem = social?.item?.(item.faction || item.name, item.role || item.position || '成员') || item;
      const reason = String(item.reason || item.changeMode || baseItem.reason || baseItem.changeMode || '').trim().slice(0, 120);
      return { ...baseItem, reason, changeMode: reason };
    }).filter((item) => item?.faction || item?.name);
    if (items.length) return items.slice(0, 4);
    const faction = profile.faction || base.faction || store?.playerProfile?.refinedCity || store?.playerProfile?.city || '临时关系社群';
    const role = profile.factionRole || base.factionRole || base.role || profile.role || '成员';
    return [social?.item?.(faction, role) || { name: `${faction} / ${role}`, faction, role }].filter((item) => item?.faction || item?.name).slice(0, 4);
  },

  forcePositions(profile, base = {}) {
    const social = window.GameModules.socialPosition;
    const list = Array.isArray((profile.forcePositions || profile.force_positions)) ? (profile.forcePositions || profile.force_positions) : [];
    const blocked = /^(现实社会|现代社会|现实世界|社会|国家|中华人民共和国)$/;
    const blockedPosition = /^(公民|居民|成年人|成年学生|成员)$/;
    const toItem = (force, position, reason = '') => {
      const f = String(force || '').trim();
      const p = String(position || '').trim();
      if (!f || !p || blocked.test(f) || blockedPosition.test(p)) return null;
      const baseItem = social?.forceItem?.(f, p, reason) || { name: `${f} / ${p}`, force: f, position: p };
      const detail = String(reason || baseItem.reason || baseItem.changeMode || '').trim().slice(0, 120);
      return { ...baseItem, reason: detail, changeMode: detail };
    };
    const items = list.map((item) => {
      if (typeof item === 'string') {
        const [force, position] = item.split('/').map((x) => x.trim());
        return toItem(force, position || '成员');
      }
      return toItem(item.force || item.faction || item.name, item.position || item.rank || '成员', item.reason || item.changeMode || '');
    }).filter(Boolean);
    if (!items.length) {
      const force = profile.force || base.force || profile.workplace || base.workplace || '';
      const position = profile.position || base.position || '';
      const item = toItem(force, position);
      if (item) items.push(item);
    }
    return items.slice(0, 4);
  },

  carryItemsLoose(value, kind) {
    const p = window.GameModules.progression;
    const list = Array.isArray(value) ? value : [];
    return list.map((item) => p.normalizeCarryItem(item, kind)).filter((item) => item.name && item.name !== '未命名物品').slice(0, 20);
  },

  wearingSlotKeys() {
    return ['head', 'neck', 'innerwearTop', 'top', 'outerwear', 'gloves', 'waist', 'innerwearBottom', 'bottom', 'socks', 'shoes', 'wrist'];
  },

  wearingSlotNames() {
    return this.wearingClothingPositions();
  },

  normalizeWearSlot(slot, item = {}, profile = {}) {
    const source = item && typeof item === 'object' ? item : { name: item };
    const names = this.wearingSlotNames();
    const clothing_position = String(source.clothing_position || source.部位 || names[slot] || slot || '').slice(0, 16);
    const name = String(source.name || source.名称 || '').slice(0, 32);
    const description = String(source.description || source.desc || '').slice(0, 100);
    const reason = String(source.reason || source.changeMode || (name ? this.inventoryReason({ ...source, name, slot }, '穿着', profile) : `${clothing_position || slot}当前没有穿戴物。`)).slice(0, 120);
    return { clothing_position, name, description, reason };
  },

  canonicalWearSlot(itemOrSlot) {
    const p = window.GameModules.progression;
    if (p?.canonicalWearSlot) return p.canonicalWearSlot(itemOrSlot);
    const item = typeof itemOrSlot === 'object' && itemOrSlot ? itemOrSlot : { slot: itemOrSlot };
    const slot = String(item.slot || '').trim();
    const text = `${slot}${item.clothing_position || ''}${item.slotLabel || ''}${item.name || ''}${item.description || ''}`;
    const exact = { 头部: 'head', 颈部: 'neck', 上衣: 'top', 外套: 'outerwear', 手套: 'gloves', 腰部: 'waist', 下衣: 'bottom', 下装: 'bottom', 袜子: 'socks', 鞋子: 'shoes', 手腕: 'wrist' }[slot];
    if (exact || this.wearingSlotKeys().includes(slot)) return exact || slot;
    if (slot === '内裤') return 'innerwearBottom';
    if (slot === '内衣') return /内裤|底裤|三角裤|四角裤/.test(text) ? 'innerwearBottom' : 'innerwearTop';
    return slot;
  },

  wearingObject(value, profile = {}) {
    const template = window.GameModules.characterProfileTemplateClass?.wearingObject?.() || {};
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const fromArray = Array.isArray(value) ? Object.fromEntries(value.map((item) => [this.canonicalWearSlot(item), item]).filter(([slot]) => slot)) : {};
    const out = {};
    this.wearingSlotKeys().forEach((slot) => {
      out[slot] = this.normalizeWearSlot(slot, source[slot] || fromArray[slot] || template[slot], profile);
    });
    const custom = Array.isArray(source.slot) ? source.slot : [];
    const arrayCustom = Array.isArray(value) ? value.filter((item) => {
      const slot = this.canonicalWearSlot(item);
      return item?.slot && slot && !this.wearingSlotKeys().includes(slot);
    }) : [];
    out.slot = [...custom, ...arrayCustom].map((item) => {
      const slot = String(this.canonicalWearSlot(item) || item?.slot || '自定义').slice(0, 16);
      return { slot, ...this.normalizeWearSlot(slot, item, profile) };
    }).filter((item) => item.name).slice(0, 20);
    return out;
  },

  wearingAsArray(value) {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== 'object') {
      const text = String(value || '').trim();
      return text ? [{ slot: '穿着', name: text }] : [];
    }
    const fixed = this.wearingSlotKeys().map((slot) => {
      const item = value[slot];
      if (!item || typeof item !== 'object') return null;
      return { ...item, slot, slotLabel: this.wearingSlotNames()[slot] || slot };
    });
    const custom = Array.isArray(value.slot) ? value.slot : [];
    return [...fixed, ...custom].filter(Boolean);
  },

  wearingItemsLoose(value) {
    const list = this.wearingAsArray(value);
    return list.map((item) => {
      const name = String(item?.name || '未穿戴').slice(0, 32);
      const slot = String(this.canonicalWearSlot(item) || item?.slot || '').slice(0, 24);
      const clothing_position = String(item?.clothing_position || item?.部位 || this.wearingSlotNames()[slot] || '').slice(0, 12);
      return { slot, clothing_position, name, type: '穿着', description: String(item?.description || '').slice(0, 80), reason: String(item?.reason || item?.changeMode || '').trim().slice(0, 120), changeMode: String(item?.reason || item?.changeMode || '').trim().slice(0, 120), source: item?.source, level: -1 };
    }).filter((item) => item.slot).slice(0, 24);
  },

  compactProfileContext(profile = {}) {
    return [profile.work, this.formatRelationships(profile.relationships || ''), profile.role || profile.job, profile.personality].filter(Boolean).join('，').slice(0, 80);
  },

  inventoryReason(item, kind, profile = {}) {
    const explicit = String(item?.reason || '').trim().slice(0, 120);
    if (!this.abstractReason(explicit)) return explicit;
    const name = String(item?.name || item?.slot || kind || '词条').trim();
    const actor = profile.name || '该人物';
    const role = profile.role || profile.job || '当前身份';
    const setting = this.compactProfileContext(profile) || '当前生活处境';
    if (kind === '穿着') return `${actor}当前处于${setting}，${name}符合其年龄、场景和日常穿戴需要。`.slice(0, 120);
    if (kind === '装备') return `${actor}以${role}行动时需要${name}支撑通讯、工作、训练或当前事件处理。`.slice(0, 120);
    if (kind === '物品') return `${actor}在${setting}中日常需要携带${name}，便于生活、出行或处理当前事件。`.slice(0, 120);
    return `${actor}在${setting}中长期形成或需要使用${name}，支撑其${role}的行动判断。`.slice(0, 120);
  },

  carryItems(value, kind, profile = {}) {
    const list = this.carryItemsLoose(value, kind);
    return list.map((item) => {
      const reason = this.inventoryReason(item, kind, profile);
      return { ...item, reason, changeMode: '角色卡初始固化' };
    });
  },

  wearingItems(value, profile = {}) {
    return this.wearingItemsLoose(value).map((item) => {
      const reason = item.name === '未穿戴' && String(item.reason || '').trim()
        ? String(item.reason).trim().slice(0, 120)
        : this.inventoryReason(item, '穿着', profile);
      return { ...item, reason, changeMode: reason, source: 'AI生成' };
    });
  },

  worldValues(values, attrs) {
    if (!values || typeof values !== 'object') return {};
    const keys = new Set((attrs.fields || []).map((field) => field.key));
    return Object.fromEntries(Object.entries(values).filter(([key]) => keys.has(key)));
  },

  roleCardFieldKeys() {
    return ['姓名', '所属世界', '身份', '职业', '性别', '生日', '人际关系', '外貌', '喜好', '性格', '人物说明', '社群角色', '势力地位'];
  },

  abstractReason(text) {
    const value = String(text || '').trim();
    if (!value) return true;
    return /^(来源于角色资料|剧情证据|世界规则|根据上下文|根据上下文推断|根据上下文判断|初始化|系统生成|综合判断|默认|身份信息|资料|固化|共同确定)$/.test(value)
      || /^(来源于|根据|基于).{0,8}(角色资料|剧情证据|世界规则|上下文)$/.test(value)
      || /^缺少明确证据所以默认$/.test(value);
  },

  wrongSubjectReason(text, profile = {}, key = '') {
    const value = String(text || '').trim(), name = String(profile?.name || '').trim();
    const kinship = /(妹妹|姐姐|哥哥|弟弟|父亲|母亲|女儿|儿子)/;
    if (!name || key === '人际关系' || kinship.test(String(profile?.role || ''))) return false;
    if (value.includes(name)) return false;
    return /(作为|是|属于|承担|体现了).{0,18}(妹妹|姐姐|哥哥|弟弟|父亲|母亲|女儿|儿子)/.test(value) || /(妹妹|姐姐|哥哥|弟弟|父亲|母亲|女儿|儿子).{0,12}(身份|性格|外貌|生日|职业|资料)/.test(value);
  },

  roleCardFieldReasons(value, profile = {}) {
    const keys = this.roleCardFieldKeys();
    const fallback = window.GameModules.characterReasonFallback?.roleReasons?.(profile) || {};
    const source = value && typeof value === 'object' ? value : {};
    return Object.fromEntries(keys.map((key) => {
      const current = String(source[key] || '').trim().slice(0, 140);
      const safeCurrent = current && !this.wrongSubjectReason(current, profile, key) ? current : '';
      return [key, safeCurrent || String(fallback[key] || `${profile.name || '该人物'}的${key}由当前人物资料与生活处境共同确定。`).slice(0, 140)];
    }));
  },

  hasRequiredRoleCardFieldReasons(value, profile = {}) {
    if (!value || typeof value !== 'object') return false;
    return this.roleCardFieldKeys().every((key) => String(value[key] || '').trim() && !this.wrongSubjectReason(value[key], profile, key));
  },

  hasRequiredInventoryReasons(profile) {
    const hasReason = (items) => Array.isArray(items) && items.length && items.every((item) => String(item?.reason || item?.changeMode || '').trim());
    const optionalReason = (items) => !Array.isArray(items) || !items.length || items.every((item) => String(item?.reason || item?.changeMode || '').trim());
    const wearingReason = (wearing) => {
      if (Array.isArray(wearing)) return optionalReason(wearing);
      if (!wearing || typeof wearing !== 'object') return true;
      const fixedOk = this.wearingSlotKeys().every((slot) => String(wearing[slot]?.reason || '').trim());
      const customOk = !Array.isArray(wearing.slot) || wearing.slot.every((item) => String(item?.reason || '').trim());
      return fixedOk && customOk;
    };
    return hasReason(profile?.factions) && hasReason(profile?.forcePositions || profile?.force_positions) && optionalReason(profile?.items) && wearingReason(profile?.wearing) && optionalReason(profile?.wearingItems) && optionalReason(profile?.skills);
  },

  ensureInventoryReasons(profile) {
    const fill = (items, kind) => (Array.isArray(items) ? items.map((item) => {
      const reason = this.inventoryReason(item, kind, profile);
      return { ...item, reason, changeMode: item.changeMode && !this.abstractReason(item.changeMode) && item.changeMode.length < 24 ? item.changeMode : '角色卡初始固化' };
    }) : []);
    const fillWearingObject = (wearing) => {
      const obj = this.wearingObject(wearing, profile);
      const fixed = Object.fromEntries(this.wearingSlotKeys().map((slot) => {
        const item = obj[slot] || {};
        const reason = item.name === '未穿戴' && String(item.reason || '').trim()
          ? String(item.reason).trim().slice(0, 120)
          : (item.name ? this.inventoryReason({ ...item, slot }, '穿着', profile) : (item.reason || `${item.clothing_position || slot}当前没有穿戴物。`));
        return [slot, { ...item, reason }];
      }));
      fixed.slot = (Array.isArray(obj.slot) ? obj.slot : []).map((item) => ({ ...item, reason: this.inventoryReason(item, '穿着', profile) }));
      return fixed;
    };
    const forcePositions = fill((profile.forcePositions || profile.force_positions), '势力地位');
    const wearing = fillWearingObject(profile.wearing);
    const out = {
      ...profile,
      factions: fill(profile.factions, '社群角色'),
      forcePositions,
      force_positions: forcePositions,
      items: fill(profile.items, '物品'),
      wearing,
      wearingItems: fill(profile.wearingItems || this.wearingAsArray(wearing), '穿着').map((item) => ({ ...item, changeMode: item.reason || item.changeMode, source: item.source || 'AI生成' })),
      skills: fill(profile.skills, '技能'),
    };
    return out;
  },

  isReusableRoleCard(profile, signature = null) {
    const signatureOk = signature === null || profile?.roleCardInputSignature === signature;
    return signatureOk && this.isRoleCard(profile) && this.hasRequiredRoleCardFieldReasons(profile.roleCardFieldReasons, profile) && this.hasRequiredInventoryReasons(profile) && this.hasRequiredInitialMetrics(profile.initialMetrics) && this.hasRequiredRpgFieldReasons(profile.rpgFieldReasons, profile?.worldAttributes);
  },

  rpgFieldReasonKeys(attrs = null) {
    const sections = window.GameModules.progression.schemaSections(attrs || { fields: [] });
    return [...new Set(sections.flatMap((section) => section.fields || []).map((field) => field.key).filter((key) => key !== 'intrinsic_sources'))];
  },


  hasRequiredRpgFieldReasons(value, attrs = null) {
    if (!value || typeof value !== 'object') return false;
    return this.rpgFieldReasonKeys(attrs).every((key) => this.validRpgReasonText(value[key]));
  },

  validRpgReasonText(text) {
    const value = String(text || '').trim();
    return Boolean(value) && !/^[-+]?\d+(?:\.\d+)?$/.test(value) && value.length >= 8;
  },

  cleanRpgFieldReasons(value, attrs = null) {
    return this.requireRpgFieldReasons({ rpgFieldReasons: value, worldAttributes: attrs }, attrs, '个人资料');
  },

  requireRpgFieldReasons(profile, attrs = null, label = '个人资料') {
    const finalAttrs = attrs || profile?.worldAttributes || null;
    const keys = this.rpgFieldReasonKeys(finalAttrs);
    const reasons = profile?.rpgFieldReasons || {};
    const fallback = window.GameModules.characterReasonFallback?.rpgReasons?.(profile, finalAttrs) || {};
    const missing = keys.filter((key) => !String(reasons[key] || fallback[key] || '').trim());
    if (missing.length) throw new Error(`${label} 缺少AI给出的RPG变化原因: ${missing.join('、')}`);
    return Object.fromEntries(keys.map((key) => {
      const current = String(reasons[key] || '').trim();
      const safe = this.validRpgReasonText(current) ? current : String(fallback[key] || '').trim();
      return [key, safe.slice(0, 120)];
    }));
  },

  rpgFieldReasons(value, attrs = null, profile = {}) {
    return this.requireRpgFieldReasons({ ...profile, rpgFieldReasons: value, worldAttributes: attrs }, attrs, profile?.name || '角色卡');
  },

  hasRequiredInitialMetrics(value) {
    const hasAll = (items, keys) => Array.isArray(items) && keys.every((key) => {
      const item = items.find((entry) => entry?.key === key);
      return item && item.value !== undefined && String(item.status || '').trim() && String(item.reason || '').trim();
    });
    return hasAll(value?.emotions, window.GameModules.metrics.emotionKeys) && hasAll(value?.playerFeelings, window.GameModules.metrics.playerKeys);
  },

  validMetricText(text, key) {
    return Boolean(String(text || '').trim());
  },

  initialMetrics(value, profile = {}) {
    const normalize = (items, keys, type) => {
      const list = this.metricGroupAsArray(items, keys);
      return keys.map((key) => {
        const item = list.find((entry) => entry?.key === key) || {};
        if (item.value === undefined) throw new Error(`${profile.name || '角色'} 缺少AI生成的${key}数值`);
        if (!String(item.status || '').trim()) throw new Error(`${profile.name || '角色'} 的${key}缺少AI生成的数值解释`);
        if (!String(item.reason || '').trim()) throw new Error(`${profile.name || '角色'} 的${key}缺少AI生成的变化原因`);
        const metricValue = window.GameModules.metrics.clamp(item.value);
        return {
          key,
          value: metricValue,
          status: String(item.status).slice(0, 160),
          reason: String(item.reason).slice(0, 180),
        };
      });
    };
    return { emotions: normalize(value?.emotions, window.GameModules.metrics.emotionKeys, 'emotion'), playerFeelings: normalize(value?.playerFeelings, window.GameModules.metrics.playerKeys, 'player') };
  },

  defaultMetric(key, type, profile = {}) {
    const name = profile.name || '该人物';
    const role = profile.role || profile.job || '当前身份';
    const detail = profile.detail || profile.personality || '当前人物资料';
    const defaults = type === 'emotion' ? window.GameModules.metrics.defaults.emotions : window.GameModules.metrics.defaults.playerFeelings;
    const value = window.GameModules.metrics.clamp(defaults[key] ?? 0);
    const stage = window.GameModules.metrics.stageFor(key, value);
    const status = window.GameModules.metrics.stageStatus(key, stage);
    let reason = type === 'emotion'
      ? `${name}以${role}处在${detail}中，因此${key}按当前经历折算为初始状态。`
      : `${name}与玩家的关系证据来自${profile.relationships || detail}，因此对玩家的${key}按初始接触状态记录。`;
    if (key === '亲情' && /哥哥|姐姐|弟弟|妹妹|父亲|母亲|家人|亲属/.test(`${profile.relationships || ''} ${detail}`)) reason = `${name}与玩家存在明确亲属或家庭关系，因此亲情从人物关系中形成。`;
    if (key === '了解') reason = `${name}只掌握玩家当前表现出的身份、关系和行为线索，了解程度按初始接触记录。`;
    if (key === '警惕') reason = `${name}尚未完全确认玩家意图，会依据当前处境保持必要观察和防备。`;
    return { value, status, reason };
  },

  formatRelationships(value, base = null) {
    const self = String(base?.name || '').trim();
    const knownRel = '妹妹|姐姐|哥哥|弟弟|父亲|母亲|爸爸|妈妈|兄长|兄弟|姐妹|女儿|儿子|朋友|同学|同事|邻居|恋人|妻子|丈夫';
    const normalized = String(value || '').replace(new RegExp(`([：:])(?=(${knownRel})[：:])`, 'g'), '；');
    const parts = normalized.split(/[；;\n]+/).map((part) => part.trim()).filter(Boolean);
    const dropped = [];
    const formatted = parts.map((part) => {
      const pair = part.split(/[：:]/);
      const rel = String(pair[0] || '').replace(/[，。,.].*$/, '').trim();
      const name = String(pair[1] || '').replace(/[，。；;、,.].*$/, '').trim();
      if (self && name === self) {
        dropped.push(`${rel}：${name}`);
        return '';
      }
      const invalid = /同居|喜欢|倾向|关系|需要|生成|资料|补全|未知|待/.test(name) || name.length > 12;
      return rel && name && !invalid ? `${rel}：${name}` : '';
    }).filter(Boolean).join('；');
    if (dropped.length) console.debug('[角色卡] 已移除指向当前角色本人的关系项:', { name: self, dropped });
    return formatted;
  },

  validName(name, base) {
    const raw = String(name || '').trim();
    if (this.isConcreteName(raw)) return raw.slice(0, 16);
    return '姓名待AI补全';
  },

  slug(text) {
    return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `id-${window.GameModules.rpgState.seed(text)}`;
  },

  mergeDressedProfilePatch(current = [], patch = []) {
    const byPart = new Map((Array.isArray(current) ? current : []).map((item) => [String(item?.part || '').trim(), { ...item }]));
    (Array.isArray(patch) ? patch : []).forEach((item) => {
      const part = String(item?.part || '').trim();
      if (!part) return;
      byPart.set(part, {
        index: Number(item.index) || this.bodyProfileParts().indexOf(part) + 1,
        part,
        description: String(item.description || '').trim(),
      });
    });
    return this.bodyProfileParts().map((part, index) => {
      const item = byPart.get(part);
      return item?.description ? item : { index: index + 1, part, description: String(item?.description || '') };
    });
  },

  async patchDressedProfileParts(store, state, parts, contextVars = {}) {
    const profile = state?.profile || {};
    const base = { id: state?.id, name: profile.name || state?.name };
    const allowedParts = this.bodyProfileParts();
    const targetParts = (Array.isArray(parts) ? parts : []).filter((part) => allowedParts.includes(part)).slice(0, 3);
    if (!targetParts.length || !String(base.name || '').trim()) return null;

    const existing = Array.isArray(profile.dressedProfile) ? profile.dressedProfile : [];
    const currentLines = targetParts.map((part) => {
      const item = existing.find((entry) => entry?.part === part);
      const idx = allowedParts.indexOf(part) + 1;
      return `${idx}.${part}：${String(item?.description || '暂无').slice(0, 100)}`;
    }).join('\n');

    const vars = {
      part1Summary: contextVars.part1Summary || this.part1Summary(profile),
      part4Summary: contextVars.part4Summary || this.part4Summary(profile),
      part5Summary: contextVars.part5Summary || this.bodyProfileSummary(profile.bodyProfile),
      角色姓名: base.name,
      更新部位: targetParts.join('、'),
      当前部位描写: currentLines,
      更新原因: String(contextVars.reason || '穿着或外观变化').slice(0, 200),
      更新证据: String(contextVars.evidence || contextVars.narrationExcerpt || '').slice(0, 400),
      穿着变化摘要: String(contextVars.wearingChangeSummary || '无').slice(0, 400),
      本轮正文摘要: String(contextVars.narrationExcerpt || '').slice(0, 800),
    };

    const promptId = 'inference-stage5-dressed-profile-patch';
    const prompt = await window.GameModules.renderPrompt(promptId, vars);
    const partialTemplate = {
      name: base.name,
      dressedProfile: targetParts.map((part) => ({ index: allowedParts.indexOf(part) + 1, part, description: '' })),
    };
    const format = [prompt, '', '## 局部模板（只输出以下部位）', JSON.stringify(partialTemplate, null, 2)].join('\n');

    const raw = await window.GameModules.jsonUtils.generateJsonWithRetry({
      source: 'stage5-dressed-profile-patch',
      promptId,
      model: window.GameModules.aiRequest?.selectedTextModel?.(),
      timeoutMs: 90000,
      prompt: format,
      format,
      repairHint: `只能返回 name 与 dressedProfile；dressedProfile 必须且只能包含：${targetParts.join('、')}；每项 description 120-170 汉字。`,
      requiredRawFields: ['name', 'dressedProfile', ...targetParts],
      parse: (text) => this.parse(text),
      validate: (data) => {
        if (!data || String(data.name || '').trim() !== String(base.name || '').trim()) throw new Error('姓名不匹配');
        const list = Array.isArray(data.dressedProfile) ? data.dressedProfile : [];
        const returnedParts = list.map((item) => String(item?.part || '').trim()).filter(Boolean);
        const missing = targetParts.filter((part) => !returnedParts.includes(part));
        if (missing.length) throw new Error(`缺少部位：${missing.join('、')}`);
        const extra = returnedParts.filter((part) => !targetParts.includes(part));
        if (extra.length) throw new Error(`多余部位：${extra.join('、')}`);
        list.forEach((item) => {
          const desc = String(item?.description || '').trim();
          if (desc.length < 40) throw new Error(`${item.part} 描写过短`);
        });
        return data;
      },
      max: 2,
    });

    return { name: base.name, dressedProfile: this.mergeDressedProfilePatch(existing, raw.dressedProfile) };
  },
};


;// ---- character-profile-metric-sources.js ----
window.GameModules = window.GameModules || {};

(function attachCharacterProfileMetricSources() {
  const profileTool = window.GameModules.characterProfile;
  if (!profileTool) return;
  const originalEnsure = profileTool.ensure.bind(profileTool);
  const keysFor = (group) => group === 'emotions' ? window.GameModules.metrics.emotionKeys : window.GameModules.metrics.playerKeys;

  Object.assign(profileTool, {
    metricSourceValue(source = '系统') {
      return String(source).toLowerCase() === 'ai' ? 'AI' : '系统';
    },

    metricSourceMap(source = '系统') {
      const value = this.metricSourceValue(source);
      return { 数值: value, 解释: value, 原因: value };
    },

    metricSources(item, fallback = '系统') {
      const raw = item?.metricSources || item?.sourceMap || {};
      const merged = { ...this.metricSourceMap(fallback), ...raw };
      return { 数值: this.metricSourceValue(merged.数值), 解释: this.metricSourceValue(merged.解释), 原因: this.metricSourceValue(merged.原因) };
    },

    metricSourcesAreAi(item) {
      const sources = this.metricSources(item, '系统');
      return sources.数值 === 'AI' && sources.解释 === 'AI' && sources.原因 === 'AI';
    },

    withMetricSources(item, source = 'ai') {
      return { ...item, metricSources: this.metricSourceMap(source) };
    },

    initialMetricDefaultSource(profile = {}) {
      const source = String(profile?.roleCardSource || '').toLowerCase();
      if (source === 'ai' || source === 'predefined') return 'ai';
      if (profile?.roleCard && source !== 'predefined-edited') return 'ai';
      return '系统';
    },

    initialMetricItemSources(item, fallback = '系统') {
      const complete = item?.value !== undefined && String(item.status || '').trim() && String(item.reason || '').trim();
      if (!complete) return this.metricSourceMap('系统');
      if (this.metricSourceValue(fallback) === 'AI') return this.metricSourceMap('ai');
      return item?.metricSources || item?.sourceMap ? this.metricSources(item, fallback) : this.metricSourceMap(fallback);
    },

    hasValidInitialMetricTexts(value) {
      const valid = (items, keys) => Array.isArray(items) && keys.every((key) => {
        const item = items.find((entry) => entry?.key === key);
        return item && item.value !== undefined && String(item.status || '').trim() && String(item.reason || '').trim();
      });
      return valid(value?.emotions, keysFor('emotions')) && valid(value?.playerFeelings, keysFor('playerFeelings'));
    },

    hasRequiredInitialMetrics(value) {
      const valid = (items, keys) => Array.isArray(items) && keys.every((key) => {
        const item = items.find((entry) => entry?.key === key);
        return item && item.value !== undefined && String(item.status || '').trim() && String(item.reason || '').trim() && this.metricSourcesAreAi(item);
      });
      return valid(value?.emotions, keysFor('emotions')) && valid(value?.playerFeelings, keysFor('playerFeelings'));
    },

    initialMetrics(value, profile = {}) {
      const defaultSource = this.initialMetricDefaultSource(profile);
      const normalize = (items, keys) => {
        const list = Array.isArray(items) ? items : [];
        return keys.map((key) => {
          const item = list.find((entry) => entry?.key === key) || {};
          if (item.value === undefined) throw new Error(`${profile.name || '角色'} 缺少AI生成的${key}数值`);
          if (!String(item.status || '').trim()) throw new Error(`${profile.name || '角色'} 的${key}缺少AI生成的数值解释`);
          if (!String(item.reason || '').trim()) throw new Error(`${profile.name || '角色'} 的${key}缺少AI生成的变化原因`);
          const sources = this.initialMetricItemSources(item, defaultSource);
          return { key, value: window.GameModules.metrics.clamp(item.value), status: String(item.status).slice(0, 160), reason: String(item.reason).slice(0, 180), metricSources: sources };
        });
      };
      return { emotions: normalize(value?.emotions, keysFor('emotions')), playerFeelings: normalize(value?.playerFeelings, keysFor('playerFeelings')) };
    },

    validateMetricGroup(value, keys, profile = {}) {
      if (!Array.isArray(value)) {
        console.warn('[角色数值校验] 数值组不是数组:', { profile: profile.name || '角色', group: profile.group || 'unknown', value });
        throw new Error(`${profile.name || '角色'} 的数值组不是数组`);
      }
      const issues = this.warnMetricGroupIssues ? this.warnMetricGroupIssues('角色数值校验缺字段', value, keys, profile) : null;
      if (issues?.missing?.length) throw new Error(`${profile.name || '角色'} 缺少AI生成的${issues.missing.join('、')}数值项`);
      if (issues?.missingValue?.length) throw new Error(`${profile.name || '角色'} 缺少AI生成的${issues.missingValue.join('、')}数值`);
      if (issues?.missingStatus?.length) throw new Error(`${profile.name || '角色'} 的${issues.missingStatus.join('、')}缺少AI生成的数值解释`);
      if (issues?.missingReason?.length) throw new Error(`${profile.name || '角色'} 的${issues.missingReason.join('、')}缺少AI生成的变化原因`);
      return keys.map((key) => {
        const item = value.find((entry) => entry?.key === key);
        const sources = item.metricSources ? this.metricSources(item, 'ai') : this.metricSourceMap('ai');
        return { key, value: window.GameModules.metrics.clamp(item.value), status: String(item.status).slice(0, 160), reason: String(item.reason).slice(0, 180), metricSources: sources };
      });
    },

    initialMetricNonAiKeys(metrics, group) {
      const list = Array.isArray(metrics?.[group]) ? metrics[group] : [];
      return keysFor(group).filter((key) => {
        const item = list.find((entry) => entry?.key === key);
        return !item || item.value === undefined || !String(item.status || '').trim() || !String(item.reason || '').trim() || !this.metricSourcesAreAi(item);
      });
    },

    mergeMetricAiFields(current, generated) {
      const sources = this.metricSources(current, '系统');
      const output = { ...current, metricSources: { ...sources } };
      if (sources.数值 !== 'AI') {
        output.value = generated.value;
        output.metricSources.数值 = 'AI';
      }
      if (sources.解释 !== 'AI') {
        output.status = generated.status;
        output.metricSources.解释 = 'AI';
      }
      if (sources.原因 !== 'AI') {
        output.reason = generated.reason;
        output.metricSources.原因 = 'AI';
      }
      return output;
    },

    async repairInitialMetricSources(profile, base, lore, attrs, context, store) {
      const current = this.initialMetrics(profile.initialMetrics, { ...base, ...profile });
      const evidence = this.initialMetricsEvidence(profile, base, lore, attrs, context, store);
      for (const group of ['emotions', 'playerFeelings']) {
        const missing = this.initialMetricNonAiKeys(current, group);
        if (!missing.length) continue;
        console.warn('[角色数值来源] 发现非AI或缺字段，按10个key一组补齐一次:', { profile: profile.name || base.name, group, missing });
        const byKey = new Map(current[group].map((item) => [item.key, item]));
        const chunks = this.metricGroupKeyChunks(group, missing);
        for (let i = 0; i < chunks.length; i += 1) {
          const chunk = chunks[i];
          try {
            const generated = await this.generateMetricGroup(profile, base, evidence, group, chunk, `source-repair-${i + 1}`, chunks.length);
            let repaired = generated;
            const issues = this.warnMetricGroupIssues ? this.warnMetricGroupIssues('角色数值来源补齐返回检查', repaired, chunk, { ...base, ...profile, group, chunkIndex: i + 1 }) : { missing: [] };
            if (issues.missing?.length || issues.missingValue?.length || issues.missingStatus?.length || issues.missingReason?.length) {
              repaired = chunk.map((key) => repaired.find((item) => item?.key === key) || { ...byKey.get(key), key, metricSources: this.metricSourceMap('系统') });
            }
            repaired.forEach((item) => {
              if (!chunk.includes(item?.key)) return;
              const currentItem = byKey.get(item.key);
              byKey.set(item.key, currentItem ? this.mergeMetricAiFields(currentItem, item) : item);
            });
            if (issues.missing?.length) console.warn('[角色数值来源] 补齐后仍缺少key:', { profile: profile.name || base.name, group, missing: issues.missing });
          } catch (err) {
            console.warn('[角色数值来源] 批量AI补齐失败，保留系统来源:', { profile: profile.name || base.name, group, keys: chunk, error: err.message, stack: err.stack });
          }
        }
        current[group] = keysFor(group).map((key) => byKey.get(key));
      }
      return current;
    },

    initialMetricRepairable(profile, signature) {
      const signatureOk = !signature || profile?.roleCardInputSignature === signature;
      return signatureOk && this.isRoleCard(profile) && this.hasRequiredRoleCardFieldReasons(profile.roleCardFieldReasons, profile) && this.hasRequiredInventoryReasons(profile) && this.hasValidInitialMetricTexts(profile.initialMetrics) && this.hasRequiredRpgFieldReasons(profile.rpgFieldReasons, profile?.worldAttributes);
    },

    async ensureInitialMetricSources(profile, base, context = '', store = null) {
      if (!this.initialMetricRepairable(profile, profile?.roleCardInputSignature || null)) return profile;
      if (this.hasRequiredInitialMetrics(profile.initialMetrics)) return profile;
      const normalized = this.initialMetrics(profile.initialMetrics, { ...base, ...profile });
      if (this.hasRequiredInitialMetrics(normalized)) {
        return { ...profile, initialMetrics: normalized, initialMetricSourceRepairSignature: profile.roleCardInputSignature || '', initialMetricSourceRepairRemaining: { emotions: [], playerFeelings: [] } };
      }
      const worldTag = base.work || profile.work || '现实世界';
      const lore = await window.GameModules.worldLore.ensure(worldTag, context);
      const attrs = await window.GameModules.rpgState.ensureWorldAttributes(worldTag);
      const initialMetrics = await this.repairInitialMetricSources({ ...profile, initialMetrics: normalized }, base, lore, attrs, context, store);
      const remaining = Object.fromEntries(['emotions', 'playerFeelings'].map((group) => [group, this.initialMetricNonAiKeys(initialMetrics, group)]));
      if (remaining.emotions.length || remaining.playerFeelings.length) console.warn('[角色数值来源] 补齐后仍存在非AI或缺字段，停止重复补齐并保留问题信息:', { profile: profile.name || base.name, remaining });
      return { ...profile, initialMetrics, initialMetricSourceRepairSignature: profile.roleCardInputSignature || '', initialMetricSourceRepairRemaining: remaining };
    },
  });

  profileTool.ensure = async function ensureWithMetricSourceRepair(raw, store, context = '') {
    const source = await window.GameModules.characterProfileSource.resolve(raw, store);
    const base = this.normalize(source.raw, store, source.preset);
    const signature = this.inputSignature(base, context, store, source.preset);
    const existing = window.GameModules.sqliteSave.getCharacterState(base.id);
    if (existing && this.isReusableRoleCard(existing.profile, signature) && this.hasRequiredInitialMetrics(existing.profile?.initialMetrics)) return existing.profile;
    if (existing && this.initialMetricRepairable(existing.profile, signature) && existing.profile?.initialMetricSourceRepairSignature !== signature) {
      existing.profile = await this.ensureInitialMetricSources(existing.profile, base, context, store);
      existing.profile = this.withSignature(existing.profile, signature);
      await window.GameModules.sqliteSave.saveCharacterState(existing);
      return existing.profile;
    }
    return originalEnsure(raw, store, context);
  };
})();


;// ---- character-memory.js ----
/**
 * 人物记忆：分层短期/长期/归档上下文。
 */
window.GameModules = window.GameModules || {};

window.GameModules.characterMemory = {
  limits: { recent: 1200, summaryBuffer: 1600, summarized: 900, forgotten: 500, vivid: 1200, permanent: 800, archiveHits: 5, vividThreshold: 60, permanentThreshold: 88, summaryTargetChars: 180 },

  async contextFor(store, action) {
    const debug = window.GameModules.debug;
    const token = debug?.start?.('[记忆上下文] 组装', { characterId: store.characterRpgState?.id, actionLength: String(action || '').length });
    const state = store.characterRpgState;
    if (!state) return '暂无人物记忆。';
    const memory = this.ensure(state.id);
    const archive = await this.queryArchive(state.id, `${action} ${store.sceneTitle} ${store.quest} ${store.mindText}`);
    memory.archive = this.archiveStats(state.id);
    const text = this.format(memory, archive);
    debug?.done?.(token, { archiveHits: archive.length, contextLength: text.length });
    return text;
  },

  ensure(characterId) {
    const raw = window.GameModules.sqliteSave.getCharacterMemory(characterId);
    const memory = this.normalize(raw, characterId);
    memory.archive = this.archiveStats(characterId);
    return memory;
  },

  normalize(raw, characterId) {
    const base = { characterId, version: 2, shortTerm: { recent: [], summaryBuffer: [], summarized: [], forgotten: [] }, longTerm: { vivid: [], permanent: [] }, archive: { indexCount: 0, itemCount: 0 }, updatedAt: new Date().toISOString() };
    if (!raw) return base;
    if (raw.version === 2) return { ...base, ...raw, shortTerm: { ...base.shortTerm, ...(raw.shortTerm || {}) }, longTerm: { ...base.longTerm, ...(raw.longTerm || {}) } };
    return { ...base, shortTerm: { ...base.shortTerm, recent: (raw.shortTerm || []).map((x) => this.legacyItem(x, 'short')) }, longTerm: { ...base.longTerm, vivid: (raw.longTerm || []).map((x) => this.legacyItem(x, 'long')) }, updatedAt: raw.updatedAt || base.updatedAt };
  },

  legacyItem(item, source) {
    const text = item.text || item.summary || '';
    return this.withTokens({ id: item.id || `mem_legacy_${window.GameModules.rpgState.seed(text)}`, time: { label: `旧记忆/第${item.turn || '?'}回合`, value: null }, place: item.scene || item.title || '旧场景', text, summary: item.summary || text.slice(0, 120), impression: source === 'long' ? 65 : 35, source, sourceIds: [], linkedLongTermId: '', createdAt: item.createdAt || new Date().toISOString() });
  },

  archiveStats(characterId) {
    const count = window.GameModules.sqliteSave.listMemoryArchives(characterId).length;
    return { indexCount: count, itemCount: count };
  },

  stats(items, maxTokens) {
    const tokens = (items || []).reduce((sum, item) => sum + (item.tokens || this.estimateTokens(this.itemText(item))), 0);
    return { count: (items || []).length, tokens, maxTokens };
  },

  format(memory, archive) {
    const s = memory.shortTerm; const l = memory.longTerm;
    return [
      '人物记忆状态：',
      this.statLine('刚发生记忆', this.stats(s.recent, this.limits.recent)),
      this.statLine('归纳总结区', this.stats(s.summaryBuffer, this.limits.summaryBuffer)),
      this.statLine('近发生记忆', this.stats(s.summarized, this.limits.summarized)),
      this.statLine('难以忘记的记忆', this.stats(l.vivid, this.limits.vivid)),
      this.statLine('不可忘记的记忆', this.stats(l.permanent, this.limits.permanent)),
      this.statLine('遗忘区', this.stats(s.forgotten, this.limits.forgotten)),
      `记忆归档：当前索引 ${memory.archive.indexCount} / 当前条目 ${memory.archive.itemCount}，本次命中 ${archive.length}`,
      '', this.section('刚发生记忆', s.recent), this.section('近发生记忆', s.summarized),
      this.section('难以忘记的记忆', l.vivid), this.section('不可忘记的记忆', l.permanent), this.archiveSection(archive),
    ].join('\n');
  },

  statLine(name, stat) { return `${name}：当前 ${stat.count} 条 / ${stat.tokens} token / 可用 ${stat.maxTokens} token`; },
  section(name, items) { return `${name}：\n${(items || []).map((x) => `- ${this.itemText(x)}`).join('\n') || '无'}`; },
  archiveSection(items) { return `记忆归档检索结果：\n${items.map((x) => `- ${x.meta?.time || '时间未知'}｜${x.meta?.place || '地点未知'}｜印象${x.meta?.impression ?? '?'}｜${x.meta?.summary || x.text}`).join('\n') || '无'}`; },
  itemText(item) { return `${item.time?.label || '时间未知'}｜${item.place || '地点未知'}｜印象${item.impression ?? 0}｜${item.summary || item.text || ''}`; },

  withTokens(item) {
    const next = { ...item };
    next.tokens = this.estimateTokens(`${this.itemText(next)}\n${next.text || ''}`);
    return next;
  },

  estimateTokens(text) {
    const s = String(text || '');
    const han = (s.match(/[\u4e00-\u9fff]/g) || []).length;
    const words = (s.match(/[a-zA-Z0-9_]+/g) || []).reduce((n, w) => n + Math.ceil(w.length / 4), 0);
    return Math.ceil(han * 0.65 + words + s.length / 18);
  },

  gameTime(store) {
    const value = this.timeValue(store.entryTime);
    const label = value ? `${value.year}年${value.month}月${value.day}日 ${String(value.hour).padStart(2, '0')}:${String(value.minute).padStart(2, '0')}:${String(value.second).padStart(2, '0')}` : (store.entryTimeLabel?.() || '时间未知');
    return { label, value };
  },

  timeValue(entryTime) {
    const get = (key) => Number(String(entryTime?.[key] || '').match(/\d+/)?.[0]);
    const value = { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute'), second: get('second') };
    return Object.values(value).every(Number.isFinite) ? value : null;
  },

  archiveItem(characterId, memory, detailText) {
    const createdAt = new Date().toISOString();
    const text = detailText || memory.text || memory.summary || '';
    return { id: `${characterId}-${createdAt}-${window.GameModules.rpgState.seed(text)}`, text, vector: this.vectorize(`${memory.summary || ''} ${text}`), meta: { time: memory.time?.label, place: memory.place, summary: memory.summary, impression: memory.impression, sourceIds: memory.sourceIds || [memory.id] }, createdAt };
  },

  async queryArchive(characterId, rawQuery) {
    const query = await this.intentQuery(rawQuery);
    const qv = this.vectorize(query);
    return window.GameModules.sqliteSave.listMemoryArchives(characterId).map((item) => ({ ...item, score: this.cosine(qv, item.vector) })).sort((a, b) => b.score - a.score).slice(0, this.limits.archiveHits);
  },

  async intentQuery(rawQuery) {
    try {
      if (!window.dzmm?.completions) return rawQuery;
      const prompt = await window.GameModules.renderPrompt('memory-intent-query', { 玩家输入: rawQuery });
      const buffer = await window.GameModules.aiRequest.complete({ source: 'memory-intent-query', model: window.GameModules.aiRequest?.selectedTextModel?.(), prompt, timeoutMs: 60000, ...(window.GameModules.promptSkills?.completionOptions?.('memory-intent-query') || { jsonMode: false, outputLimitKind: 'other' }) });
      return buffer.trim() || rawQuery;
    } catch (err) {
      console.warn('记忆检索意图解析失败:', err.code, err.message);
      return rawQuery;
    }
  },

  vectorize(text) {
    const vector = Array(64).fill(0);
    const tokens = String(text || '').match(/[\p{Script=Han}]|[a-zA-Z0-9_]+/gu) || [];
    for (const token of tokens) vector[window.GameModules.rpgState.seed(token) % vector.length] += Math.max(1, token.length);
    return vector;
  },

  cosine(a, b) {
    let dot = 0; let an = 0; let bn = 0;
    for (let i = 0; i < a.length; i += 1) { dot += a[i] * (b[i] || 0); an += a[i] ** 2; bn += (b[i] || 0) ** 2; }
    return dot / (Math.sqrt(an) * Math.sqrt(bn) || 1);
  },
};


;// ---- character-memory-flow.js ----
/**
 * 人物记忆流转：写入、印象、归纳、长期遗忘。
 */
window.GameModules = window.GameModules || {};

Object.assign(window.GameModules.characterMemory, {
  async addManual(characterId, text, store) {
    const memory = this.ensure(characterId);
    const item = this.memoryItem(store, { text: `手动记忆：${text}`, source: 'manual', impression: 70 });
    memory.shortTerm.recent.push(item);
    this.promote(memory, item);
    await this.compact(characterId, memory);
  },

  async recordTurn(store, result) {
    const states = this.relatedStates(store, result);
    const text = this.eventText(store, result);
    for (const state of states) {
      const memory = this.ensure(state.id);
      const item = this.memoryItem(store, { text, source: 'turn', impression: this.impression(store, result, text) });
      memory.shortTerm.recent.push(item);
      this.promote(memory, item);
      await this.compact(state.id, memory);
    }
  },

  async recordWechatExchange(store, contact, playerText, replyText, result = {}) {
    if (!contact?.id || contact.group) return;
    const characterId = String(contact.id || '').trim();
    if (!characterId) throw new Error('微信记忆写入失败：联系人缺少角色ID');
    const state = store.rpgStates?.[characterId] || window.GameModules.sqliteSave.getCharacterState(characterId) || null;
    if (state && !store.rpgStates?.[characterId]) store.rpgStates = { ...(store.rpgStates || {}), [characterId]: state };
    const display = store.displayWechatContact?.(contact) || contact;
    const phoneTime = store.wechatMemoryTime?.() || this.gameTime({ entryTimeLabel: () => `${store.phoneDateText?.() || ''} ${store.phoneTimeText?.() || ''}`.trim() });
    const label = store.wechatDialogueTimeLabel?.(phoneTime.label) || phoneTime.label || '时间未知';
    const playerName = store.playerDisplayCharacter?.().name || store.playerName || '玩家';
    const contactName = state?.name || state?.profile?.name || display.name || '微信联系人';
    const text = store.formatWechatDialogueLog?.(playerName, contactName, label, playerText, replyText) || `以下来自微信对话。${playerName}（${label}）：“${playerText}”${contactName}（${label}）：“${replyText}”`;
    const memory = this.ensure(characterId);
    const item = this.memoryItem(store, { text, source: 'wechat', place: '微信', time: phoneTime, impression: this.resultImpression(result) });
    memory.shortTerm.recent.push(item);
    this.promote(memory, item);
    await this.compact(characterId, memory);
    const playerMemoryText = text;
    const playerMemory = this.ensure('player-self');
    const playerItem = this.memoryItem(store, { text: playerMemoryText, source: 'wechat', place: '微信', time: phoneTime, impression: this.resultImpression(result) });
    playerMemory.shortTerm.recent.push(playerItem);
    this.promote(playerMemory, playerItem);
    await this.compact('player-self', playerMemory);
    console.log('[微信记忆] 已写入:', { characterId, contact: contactName, player: 'player-self', stateFound: Boolean(state) });
  },

  relatedStates(store, result) {
    const names = new Set([store.character.name, ...(result.appearedCharacters || []).map((x) => x.name || x)]);
    return Object.values(store.rpgStates).filter((state) => names.has(state.name));
  },

  memoryItem(store, data) {
    const text = this.refine(data.text || '');
    const item = {
      id: `mem_${Date.now()}_${window.GameModules.rpgState.seed(text)}`,
      time: data.time || this.gameTime(store),
      place: data.place || store.sceneTitle || '地点未知',
      text,
      summary: this.summary(text, this.limits.summaryTargetChars),
      impression: Math.max(0, Math.min(100, Math.round(data.impression || 20))),
      source: data.source || 'turn',
      sourceIds: data.sourceIds || [],
      linkedLongTermId: '',
      createdAt: new Date().toISOString(),
    };
    return this.withTokens(item);
  },

  eventText(store, result) {
    return [
      `地点：${store.sceneTitle}`,
      `玩家行动：${store.lastAction || '无'}`,
      `流逝时间：${result.elapsedSeconds || 60}秒`,
      `发生：${result.narration || ''}`,
      result.speech ? `她/他说过：${result.speech}` : '',
      result.mind ? `她/他心里想：${result.mind}` : '',
      `目标：${result.quest || store.quest}`,
    ].filter(Boolean).join('\n');
  },

  refine(text) {
    return String(text || '').replace(/\s+/g, ' ').trim().slice(0, 700);
  },

  summary(text, max = 180) {
    const raw = String(text || '').replace(/地点：[^ ]+ ?/g, '').replace(/\s+/g, ' ').trim();
    return raw.length > max ? `${raw.slice(0, max - 1)}…` : raw;
  },

  impression(store, result, text) {
    const all = `${text} ${result.narration || ''} ${result.mind || ''} ${result.quest || ''}`;
    let score = 25;
    if (/操控|身体|失控|接管|附身/.test(all)) score += 18;
    if (/受伤|死亡|战斗|血|痛|杀|危险/.test(all)) score += 18;
    if (/秘密|真相|契约|背叛|承诺|觉醒|圣杯/.test(all)) score += 16;
    if (/告白|拯救|保护|亲吻|拥抱|泪|崩溃/.test(all)) score += 16;
    score += this.metricImpact(result.metricUpdates);
    const profile = `${store.character?.role || ''} ${store.character?.detail || ''} ${store.character?.personality || ''}`;
    if (/幼|弱|病|囚|虐|恐|孤|樱|间桐|虫|牺牲|受害/.test(profile)) score += 8;
    return Math.max(0, Math.min(100, score));
  },

  metricImpact(updates) {
    const list = [...(updates?.emotions || []), ...(updates?.playerFeelings || [])];
    const total = list.reduce((sum, item) => sum + Math.abs(Number(item.delta) || 0), 0);
    return Math.min(20, Math.round(total / 8));
  },

  resultImpression(result = {}) {
    return Math.max(0, Math.min(100, Math.round(Number(result.impression) || 20)));
  },

  promote(memory, item) {
    if (item.impression >= this.limits.vividThreshold && !memory.longTerm.vivid.some((x) => x.id === item.id)) {
      memory.longTerm.vivid.push({ ...item, source: 'vivid' });
      item.linkedLongTermId = item.id;
    }
    if (item.impression >= this.limits.permanentThreshold) this.addPermanent(memory, item);
  },

  addPermanent(memory, item) {
    const p = memory.longTerm.permanent;
    if (p.some((x) => x.id === item.id)) return;
    p.push({ ...item, source: 'permanent' });
    while (this.stats(p, this.limits.permanent).tokens > this.limits.permanent && p.length > 1) {
      const weakest = p.reduce((best, x, i) => (x.impression < p[best].impression ? i : best), 0);
      if (p[weakest].id === item.id) { p.splice(weakest, 1); break; }
      p.splice(weakest, 1);
    }
  },

  async compact(characterId, memory) {
    this.moveOverflow(memory.shortTerm.recent, memory.shortTerm.summaryBuffer, this.limits.recent);
    if (this.stats(memory.shortTerm.summaryBuffer, this.limits.summaryBuffer).tokens > this.limits.summaryBuffer) {
      const summary = this.summarizeBuffer(memory.shortTerm.summaryBuffer);
      memory.shortTerm.summarized.push(summary);
      await window.GameModules.sqliteSave.saveMemoryArchive(characterId, this.archiveItem(characterId, summary, memory.shortTerm.summaryBuffer.map((x) => x.text).join('\n')));
      memory.shortTerm.summaryBuffer = [];
    }
    this.moveOverflow(memory.shortTerm.summarized, memory.shortTerm.forgotten, this.limits.summarized);
    this.trimFifo(memory.shortTerm.forgotten, this.limits.forgotten);
    this.trimVivid(memory.longTerm.vivid, this.limits.vivid);
    memory.updatedAt = new Date().toISOString();
    memory.archive = this.archiveStats(characterId);
    await window.GameModules.sqliteSave.saveCharacterMemory(characterId, memory);
  },

  summarizeBuffer(items) {
    const first = items[0]; const last = items[items.length - 1] || first;
    const text = items.map((x) => x.summary || x.text).join(' ');
    return this.withTokens({ id: `sum_${Date.now()}_${window.GameModules.rpgState.seed(text)}`, time: { label: `${first.time?.label || '时间未知'}-${last.time?.label || '时间未知'}`, value: first.time?.value || null }, place: first.place || last.place || '地点未知', text, summary: this.summary(text, this.limits.summaryTargetChars), impression: Math.max(...items.map((x) => x.impression || 0), 30), source: 'summary', sourceIds: items.map((x) => x.id), linkedLongTermId: '', createdAt: new Date().toISOString() });
  },

  moveOverflow(from, to, maxTokens) {
    while (this.stats(from, maxTokens).tokens > maxTokens && from.length) to.push(from.shift());
  },

  trimFifo(items, maxTokens) {
    while (this.stats(items, maxTokens).tokens > maxTokens && items.length) items.shift();
  },

  trimVivid(items, maxTokens) {
    while (this.stats(items, maxTokens).tokens > maxTokens && items.length > 1) {
      let weakest = 0;
      items.forEach((item, i) => {
        if (item.impression < items[weakest].impression || (item.impression === items[weakest].impression && item.createdAt < items[weakest].createdAt)) weakest = i;
      });
      items.splice(weakest, 1);
    }
  },
});


;// ---- memory-query-actions.js ----
window.GameModules = window.GameModules || {};
window.GameModules.memoryQueryActions = {
  memoryQueryContext(characterId = '', keyword = '') {
    const id = characterId || 'player-self';
    const query = String(keyword || '').trim();
    const memory = window.GameModules.characterMemory?.ensure?.(id);
    if (!memory) return '暂无人物记忆。';
    const m = window.GameModules.characterMemory;
    const status = [m.statLine('刚发生记忆', m.stats(memory.shortTerm?.recent, m.limits.recent)), m.statLine('近发生记忆', m.stats(memory.shortTerm?.summarized, m.limits.summarized)), m.statLine('难以忘记', m.stats(memory.longTerm?.vivid, m.limits.vivid)), m.statLine('不可忘记', m.stats(memory.longTerm?.permanent, m.limits.permanent))].join('｜');
    const hits = query ? this.searchCharacterMemory?.(id, query) || '' : '无关键词。';
    return [`## 记忆状态\n${status}`, `## 关键词记忆条\n${hits}`].join('\n\n').slice(0, 2200);
  },

  getCharacterMemory(characterId = '') {
    const memory = window.GameModules.characterMemory?.ensure?.(characterId);
    if (!memory) return '暂无人物记忆。';
    return window.GameModules.characterMemory.format(memory, []);
  },

  searchCharacterMemory(characterId = '', keyword = '') {
    const raw = String(keyword || '').trim();
    if (!raw) return '无关键词。';
    const memory = window.GameModules.characterMemory?.ensure?.(characterId);
    if (!memory) return '暂无人物记忆。';
    const keys = raw.split(/[\s,，。！？；、]+/).map((x) => x.trim()).filter(Boolean).slice(0, 12);
    const pools = [
      ['刚发生记忆', memory.shortTerm?.recent], ['归纳总结区', memory.shortTerm?.summaryBuffer],
      ['近发生记忆', memory.shortTerm?.summarized], ['遗忘区', memory.shortTerm?.forgotten],
      ['难以忘记的记忆', memory.longTerm?.vivid], ['不可忘记的记忆', memory.longTerm?.permanent],
    ];
    const hits = [];
    pools.forEach(([name, list]) => (list || []).forEach((item) => {
      const text = `${window.GameModules.characterMemory.itemText(item)} ${item.text || ''}`;
      if (keys.some((key) => text.includes(key))) hits.push(`- ${name}｜${window.GameModules.characterMemory.itemText(item)}`);
    }));
    return hits.slice(0, 12).join('\n') || '未命中相关记忆条。';
  },

  async searchMemoryArchive(characterId = '', keyword = '') {
    const raw = String(keyword || '').trim();
    if (!raw) return '无关键词。';
    const hits = await window.GameModules.characterMemory?.queryArchive?.(characterId, raw) || [];
    return window.GameModules.characterMemory?.archiveSection?.(hits) || '未命中记忆归档。';
  },
};


;// ---- entry-time-flow.js ----
/**
 * 游戏内时间流动。
 */
window.GameModules = window.GameModules || {};
Object.assign(window.GameModules.entryTime, {
  async advance(store, seconds = 60) {
    const current = window.GameModules.characterMemory?.timeValue(store.entryTime);
    if (!current) return false;
    const d = new Date(current.year, current.month - 1, current.day, current.hour, current.minute, current.second + seconds);
    store.entryTime = {
      year: `${d.getFullYear()}年`,
      month: `${d.getMonth() + 1}月`,
      day: `${d.getDate()}日`,
      hour: `${String(d.getHours()).padStart(2, '0')}时`,
      minute: `${String(d.getMinutes()).padStart(2, '0')}分`,
      second: `${String(d.getSeconds()).padStart(2, '0')}秒`,
    };
    if (this.applyCharacterAge) await this.applyCharacterAge(store);
    return true;
  },
});


;// ---- character-feedback.js ----
/**
 * 角色心理反馈：生成角色刚被操控或上线时的内心、意图与行动选项。
 */
window.GameModules = window.GameModules || {};

window.GameModules.characterFeedback = {
  feelingExamples: ['极度惊恐', '非常害怕', '恐惧', '疑惑', '警惕', '愤怒', '屈辱', '麻木', '担忧', '习惯', '冷静分析'],

  pronoun(store) {
    const text = `${store.character?.name || ''} ${store.character?.role || ''} ${store.character?.detail || ''}`;
    return /男性|男人|少年|青年|父亲|哥哥|弟弟|叔叔|丈夫|王子|皇帝/u.test(text) ? '他' : '她';
  },

  async initial(store) {
    this.ensureExperience(store);
    const fallback = this.fallback(store);
    console.debug('[角色反馈] 初始请求准备:', {
      character: store.character?.name,
      model: store.modelId || store.settingsState?.textModelId,
      controlMode: store.controlMode,
      hasCompletions: Boolean(window.dzmm?.completions),
    });
    if (!window.dzmm?.completions) return fallback;

    let buffer = '';
    let doneSeen = false;
    try {
      const prompt = await this.prompt(store);
      let resolveDone;
      const donePromise = new Promise((resolve) => { resolveDone = resolve; });
      const request = window.GameModules.aiRequest.complete({
        source: 'character-feedback',
        model: store.modelId || store.settingsState?.textModelId,
        prompt,
        timeoutMs: 60000,
        requireDone: true,
        ...(window.GameModules.promptSkills?.completionOptions?.('character-feedback') || {
          jsonMode: true,
          responseFormat: { type: 'json_object' },
          outputLimitKind: 'other',
        }),
        onChunk: (chunk, done, info) => {
          buffer = info.buffer;
          if (done) {
            doneSeen = true;
            console.debug('[角色反馈] 流式 done:', { length: buffer.length });
            resolveDone();
          }
        },
      });
      await Promise.race([
        Promise.all([request, donePromise]),
        new Promise((_, reject) => setTimeout(() => reject(new Error('角色反馈生成超时')), 60000)),
      ]);
      if (!doneSeen) throw new Error('角色反馈流式未完成');
      return this.parse(buffer, fallback, store);
    } catch (err) {
      console.warn('角色反馈生成失败，使用兜底:', err.code, err.message, err.stack);
      return fallback;
    }
  },

  prompt(store) {
    const base = store.character || {};
    const card = store.characterRpgState?.profile || store.characterProfiles?.[base.id] || {};
    const skills = (card.skills || base.skills || [])
      .map((item) => typeof item === 'string' ? item : `${item.name || ''}${item.desc ? `：${item.desc}` : ''}`)
      .filter(Boolean)
      .join('；');
    const worldValues = card.worldValues
      ? Object.entries(card.worldValues).map(([key, value]) => `${key}：${value}`).join('；')
      : '';
    const line = (label, value) => value ? `${label}：${value}` : '';
    const profile = [
      line('姓名', card.name || base.name),
      line('性别', card.gender || base.gender),
      line('年龄', store.characterAge),
      line('作品/世界', base.work || card.work),
      line('身份', card.role || base.role),
      line('人际关系', card.relationships || base.relationships),
      line('外貌', card.appearance || base.appearance),
      line('性格', card.personality || base.personality),
      line('人物说明', card.detail || base.detail),
      line('势力', card.faction || base.faction),
      line('职业', card.job || base.job),
      line('等级', card.rank || base.rank),
      line('技能', skills),
      line('属性/世界词条', worldValues),
      line('摘要', card.summary),
    ].filter(Boolean).join('\n');
    const experience = this.experience(store);
    const outputJson = JSON.stringify({
      mind: '角色第一人称内心，30到80字',
      intent: `${base.name || '角色'}自己下一步想做什么，30到80字`,
      mood: '冷静',
      resistance: 0,
      controlFeeling: '疑惑/恐惧/愤怒等短语',
      adaptation: 0,
      experienceSummary: '40字内',
      choices: ['4个行动选项，每个12字内'],
    });
    return window.GameModules.renderPrompt('character-feedback', {
      角色: `${base.name || ''}｜${base.role || ''}｜${base.work || ''}`,
      年龄: store.characterAge || '未知',
      操控方式: store.controlMode,
      当前场景: store.entryCurrentAction || '未知',
      人物资料: profile.slice(0, 1600),
      上线次数: experience.onlineCount,
      上线感觉: experience.feeling,
      适应度: experience.adaptation,
      上线摘要: experience.summary,
      输出示例: outputJson,
    });
  },

  parse(text, fallback, store) {
    try {
      const data = window.GameModules.jsonUtils.parseLoose(text);
      return this.normalizeFeedbackData(data, fallback, store, 'ai');
    } catch (err) {
      if (err.message === 'JSON incomplete') {
        const recovered = this.recoverFeedbackFields(text);
        if (recovered.mind || recovered.intent) return this.normalizeFeedbackData(recovered, fallback, store, 'partial');
        console.debug('[角色反馈] JSON 未完成，使用兜底:', { length: String(text || '').length });
        return fallback;
      }
      console.warn('角色反馈解析失败:', err.message);
      return fallback;
    }
  },

  normalizeFeedbackData(data, fallback, store, source) {
    if (!data.mind && !data.intent) throw new Error('角色反馈缺少 mind/intent');
    const moods = ['冷静', '紧张', '愤怒', '动摇', '信任', '恐惧', '好奇', '坚定'];
    const result = {
      mind: String(data.mind || fallback.mind).slice(0, 80),
      intent: String(data.intent || fallback.intent).slice(0, 80),
      mood: moods.includes(data.mood) ? data.mood : fallback.mood,
      resistance: this.clamp(data.resistance, fallback.resistance),
      controlFeeling: String(data.controlFeeling || fallback.controlFeeling || '疑惑').slice(0, 40),
      adaptation: this.clamp(data.adaptation, fallback.adaptation),
      experienceSummary: String(data.experienceSummary || fallback.experienceSummary).slice(0, 80),
      choices: this.normalizeChoices(data.choices, fallback.choices),
      source,
    };
    console.debug('[角色反馈] AI 解析成功:', { source, mindLength: result.mind.length, intentLength: result.intent.length });
    return result;
  },

  recoverFeedbackFields(text) {
    const pick = (key) => {
      const match = String(text || '').match(new RegExp(`"${key}"\\s*:\\s*"([^"\\\\]*(?:\\\\.[^"\\\\]*)*)`));
      return match ? match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim() : '';
    };
    return {
      mind: pick('mind'),
      intent: pick('intent'),
      controlFeeling: pick('controlFeeling'),
      experienceSummary: pick('experienceSummary'),
    };
  },

  hasCompleteInitialMetrics(updates) {
    const hasAll = (items, keys) => Array.isArray(items) && keys.every((key) => items.some((item) => item?.key === key && Number.isFinite(Number(item.value))));
    return hasAll(updates?.emotions, window.GameModules.metrics.emotionKeys) && hasAll(updates?.playerFeelings, window.GameModules.metrics.playerKeys);
  },

  fallback(store) {
    const experience = this.experience(store);
    const metrics = this.fallbackMetrics(store);
    return {
      mind: '--',
      intent: '--',
      mood: metrics.emotions.sort((a, b) => b.value - a.value)[0]?.key || '动摇',
      resistance: metrics.playerFeelings.find((x) => x.key === '反抗')?.value || 35,
      controlFeeling: experience.onlineCount > 0 ? experience.feeling : '疑惑',
      adaptation: experience.adaptation,
      experienceSummary: '身体突然失控，她/他还无法确认你会做什么。',
      choices: ['确认周围状况', '尝试移动身体', '寻找安全位置', '接近关键人物'],
      source: 'fallback',
    };
  },

  fallbackMetrics(store) {
    const text = `${store.character?.name || ''} ${store.character?.role || ''} ${store.character?.personality || ''} ${store.character?.detail || ''} ${store.entryCurrentAction || ''}`;
    const vulnerable = /幼|小|弱|病|困|虚|受伤|受害/u.test(text);
    const proud = /王|骑士|强|冷静|自信|支配|高傲|魔术师/u.test(text);
    const possess = store.controlMode === 'possess';
    const emotionBase = vulnerable
      ? { 冷静: 12, 恐惧: 72, 担忧: 68, 高兴: 0, 紧张: 76, 愤怒: 18, 羞耻: 34, 悲伤: 58, 好奇: 8, 麻木: 44, 嫉妒: 0, 绝望: 48 }
      : { 冷静: proud ? 54 : 32, 恐惧: possess ? 34 : 16, 担忧: 28, 高兴: 2, 紧张: possess ? 46 : 24, 愤怒: proud ? 30 : 12, 羞耻: 10, 悲伤: 8, 好奇: 22, 麻木: 4, 嫉妒: 0, 绝望: 6 };
    const feelingBase = vulnerable
      ? { 了解: 1, 信任: 6, 反抗: 18, 好感: 2, 友情: 0, 亲情: 0, 爱情: 0, 肉欲: 0, 畏惧: 72, 尊敬: 0, 崇拜: 0, 讨厌: 22, 依赖: 16, 警惕: 82, 支配欲: 0, 占有欲: 0, 服从: 28 }
      : { 了解: 1, 信任: 18, 反抗: proud ? 48 : 34, 好感: 4, 友情: 0, 亲情: 0, 爱情: 0, 肉欲: 0, 畏惧: possess ? 38 : 18, 尊敬: 0, 崇拜: 0, 讨厌: 16, 依赖: 0, 警惕: 60, 支配欲: proud ? 28 : 6, 占有欲: 0, 服从: possess ? 8 : 2 };
    const actor = this.pronoun(store);
    return {
      emotions: this.metricList(emotionBase, actor, 'emotion', vulnerable, possess),
      playerFeelings: this.metricList(feelingBase, actor, 'player', vulnerable, possess),
    };
  },

  metricList(values, actor, type, vulnerable, possess) {
    return Object.entries(values).map(([key, value]) => {
      const stage = window.GameModules.metrics.stageFor(key, value);
      return { key, value, status: this.metricStatus(actor, key, stage), reason: this.metricReason(actor, key, type, vulnerable, possess) };
    });
  },

  metricStatus(actor, key, stage) {
    if (key === '爱情') return stage === '无感'
      ? `${actor}看着你时没有恋爱意义上的心动。`
      : `${actor}看到你时心里扑通扑通，似乎是${stage}了。`;
    if (key === '了解') return `${actor}对你的了解处于“${stage}”：${actor}只掌握你显露出的少量线索，还无法确认你的身份、来历和真正意图。`;
    return `${actor}对你或当前处境的${key}处于“${stage}”状态。`;
  },

  metricReason(actor, key, type, vulnerable, possess) {
    if (type === 'emotion') {
      return vulnerable
        ? `${actor}曾经受过伤害，身体又突然失控，所以${key}被明显牵动。`
        : `${actor}突然面对身体失控和陌生干预，所以${key}随之变化。`;
    }
    const base = {
      了解: `${actor}第一次接触你，只知道你能介入这具身体，却不知道你的身份、来历和真正意图。`,
      信任: `你第一次出现就${possess ? '控制了' : '影响了'}${actor}的身体，所以${actor}暂时无法信任你。`,
      反抗: `${actor}发现自己的行动权被你夺走，本能地想把身体夺回来。`,
      好感: `你还没有做出足以让${actor}安心或亲近的事。`,
      爱情: `你与${actor}才刚接触，还没有产生恋爱意义上的心动。`,
      畏惧: `你能越过${actor}的意愿控制身体，让${actor}害怕你的力量。`,
      警惕: `${actor}不知道你会如何使用这具身体，只能高度戒备。`,
      服从: `${actor}身体被你接管，只能被迫跟随你的动作。`,
      依赖: vulnerable ? `${actor}处境脆弱，可能把你的干预误认为唯一能依靠的出口。` : `你还没有证明自己值得${actor}依靠。`,
    };
    return base[key] || `你刚介入${actor}的处境，${actor}还没有形成更深的${key}。`;
  },

  ensureExperience(store) {
    const state = store.characterRpgState;
    if (!state?.values) return null;
    if (!state.values.control_experience) {
      state.values.control_experience = {
        onlineCount: 0,
        feeling: '未知',
        adaptation: 0,
        summary: '尚未经历上线操控。',
        lastUpdated: '',
      };
    }
    return state.values.control_experience;
  },

  experience(store) {
    return this.ensureExperience(store) || { onlineCount: 0, feeling: '未知', adaptation: 0, summary: '尚未经历上线操控。', lastUpdated: '' };
  },

  async applyExperience(store, feedback) {
    const state = store.characterRpgState;
    const exp = this.ensureExperience(store);
    if (!state || !exp) return;
    exp.onlineCount = Math.max(0, Number(exp.onlineCount) || 0) + 1;
    exp.feeling = feedback.controlFeeling || exp.feeling || '疑惑';
    exp.adaptation = this.clamp(feedback.adaptation, exp.adaptation || 0);
    exp.summary = feedback.experienceSummary || exp.summary || '';
    exp.lastUpdated = new Date().toISOString();
    store.rpgStates = { ...store.rpgStates, [state.id]: state };
    await window.GameModules.sqliteSave?.saveCharacterState?.(state);
  },

  normalizeChoices(value, fallback) {
    return window.GameModules.ai?.normalizeChoices?.(value, fallback) || [];
  },

  merge(buffer, chunk) {
    const text = String(chunk || '');
    if (!text) return buffer;
    if (!buffer || text.startsWith(buffer)) return text;
    if (buffer.endsWith(text)) return buffer;
    const overlap = Math.min(buffer.length, text.length);
    for (let size = overlap; size > 0; size -= 1) {
      if (buffer.endsWith(text.slice(0, size))) return buffer + text.slice(size);
    }
    return buffer + text;
  },

  clamp(value, fallback) {
    const num = Number(value);
    return Number.isFinite(num) ? Math.max(0, Math.min(100, Math.round(num))) : fallback;
  },
};


;// ---- character-brief.js ----
/**
 * 首页角色预览：读取本地人物设定卡，解析基础档案与详情。
 */
window.GameModules = window.GameModules || {};

window.GameModules.characterBrief = {
  async ensure(store) {
    const character = store.character;
    const useCache = window.GameModules.cache.enabled('characterProfiles');
    const current = character?.id ? store.homeCharacterProfiles?.[character.id] : null;
    if (!character?.id || (useCache && current && this.hasBirthDate(current))) return;
    store.characterBriefBusy = true;
    try {
      console.log('[人物资料] 开始读取:', character.work, character.name, character.id);
      const profile = await this.loadProfile(character);
      console.log('[人物资料] 读取完成:', character.name, profile.path || '无路径', 'summaryLength=', String(profile.summary || '').length);
      store.homeCharacterProfiles = { ...store.homeCharacterProfiles, [character.id]: profile };
      store.characterProfiles = { ...store.characterProfiles, [character.id]: profile };
    } catch (err) {
      console.warn('人物设定读取失败:', err.message, err.stack);
      const fallback = this.fallbackProfile(character);
      store.homeCharacterProfiles = { ...store.homeCharacterProfiles, [character.id]: fallback };
      store.characterProfiles = { ...store.characterProfiles, [character.id]: fallback };
    } finally {
      store.characterBriefBusy = false;
    }
  },

  async loadProfile(character) {
    const source = this.sourceFor(character.work);
    if (!source) return this.fallbackProfile(character);
    const index = await this.fetchText(`${source.base}/01_按需加载_人物/人物索引.md`);
    const path = character.profilePath || this.findCardPath(index, character) || await this.searchCardPath(source, character);
    const markdown = path ? await this.fetchText(`${source.base}/${path}`) : '';
    return this.parseProfile(character, source, path, markdown);
  },

  sourceFor(work) {
    const text = window.GameModules.rag.normalize(work || '');
    return (window.GameData?.loreSources || []).find((source) => [source.name, ...(source.aliases || [])]
      .some((name) => text.includes(window.GameModules.rag.normalize(name))));
  },

  findCardPath(index, character) {
    const names = [character.name, ...(character.aliases || [])].filter(Boolean);
    for (const name of names) {
      const line = String(index || '').split('\n').find((row) => row.includes(name) && row.includes('.md'));
      const path = this.extractPath(line);
      if (path) return path;
    }
    return '';
  },

  async searchCardPath(source, character) {
    const hits = await window.GameModules.rag.search(`${character.name} ${(character.aliases || []).join(' ')}`, { sourceHint: character.work, limit: 6 });
    return hits.map((x) => x.path).find((p) => /01_按需加载_人物\/.+\.md$/.test(p)) || '';
  },

  extractPath(text) {
    const raw = (String(text || '').match(/`([^`]+\.md)`/) || String(text || '').match(/([^\s|`]+\.md)/) || [])[1] || '';
    return raw.replace(/^AI设定库\//, '').replace(/^\.\//, '');
  },

  async fetchText(url) {
    return await window.GameModules.rag.fetchText(url);
  },

  parseProfile(character, source, path, markdown) {
    const md = String(markdown || '');
    const intro = md.split('\n').find((line) => line && !line.startsWith('#')) || character.detail || character.personality || '';
    return {
      source: source?.name || character.work || '未知作品', path: path || '', raw: md,
      summary: intro.trim(), basics: this.parseBasics(md, character), sections: this.parseSections(md),
    };
  },

  parseBasics(markdown, character) {
    const rows = [];
    const block = (String(markdown || '').split(/##\s*基础档案/)[1] || '').split(/\n##\s+/)[0] || '';
    for (const line of block.split('\n')) {
      const match = line.match(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*$/);
      if (!match || /---|项目/.test(match[1])) continue;
      rows.push({ label: match[1].trim(), value: match[2].trim() });
    }
    if (rows.length) return rows;
    return [
      { label: '姓名', value: character.name }, { label: '身份', value: character.role || '角色' },
      { label: '作品', value: character.work || '未知作品' }, { label: '性格', value: character.personality || character.detail || '暂无' },
    ];
  },

  parseSections(markdown) {
    return String(markdown || '').split(/\n(?=##\s+)/).map((block) => {
      const title = (block.match(/^##\s+(.+)$/m) || [])[1];
      if (!title || title === '基础档案') return null;
      const items = block.split('\n').slice(1).map((line) => line.trim()).filter((line) => line.startsWith('- ')).map((line) => line.slice(2));
      const body = block.split('\n').slice(1).filter((line) => line.trim() && !line.trim().startsWith('|')).join('\n').trim();
      return { title, items, body };
    }).filter(Boolean).slice(0, 12);
  },

  hasBirthDate(profile) {
    return (profile?.basics || []).some((row) => /出生|生日|生年月日/.test(row.label));
  },

  fallbackProfile(character) {
    return this.parseProfile(character, { name: character.work }, '', '');
  },
};


;// ---- core/storage.js ----
/**
 * 存档管理：多 slot SQLite 存储，序列化后走 dzmm.kv/localStorage。
 */
window.GameModules = window.GameModules || {};

window.GameModules.storage = {
  slots: Array.from({ length: 10 }, (_, index) => `slot-${index + 1}`),

  async open(slot, options = {}) {
    await window.GameModules.sqliteSave.open(slot, options);
  },

  async put(value) {
    await window.GameModules.sqliteSave.saveGameState(value);
  },

  async get() {
    return window.GameModules.sqliteSave.loadGameState();
  },

  async remove(slot) {
    await window.GameModules.sqliteSave.deleteSlot(slot || window.GameModules.sqliteSave.activeSlot);
  },

  snapshot(store) {
    return {
      started: store.started,
      phoneSetupDone: store.phoneSetupDone,
      playerProfile: store.playerProfile,
      playerAspiration: store.playerAspiration || null,
      playerName: store.playerName,
      roleCardSetup: {
        usePredefinedPlayerCard: Boolean(store.roleCardSetup?.usePredefinedPlayerCard),
        selectedPlayerName: store.roleCardSetup?.selectedPlayerName || '',
        selectedRelationNames: store.roleCardSetup?.selectedRelationNames || [],
        relationRoles: store.roleCardSetup?.relationRoles || {},
      },
      wechatUsers: store.wechatUsers || [],
      wechatMessagesByContact: store.wechatMessagesByContact || {},
      wechatAlbumPhotos: store.wechatAlbumPhotos || {},
      wechatAlbumPrompts: store.wechatAlbumPrompts || {},
      settingsState: store.settingsState ? {
        textProvider: store.settingsState.textProvider || 'deepseek',
        textModelId: store.modelId || store.settingsState.textModelId,
        deepseekApiKey: store.settingsState.deepseekApiKey || '',
        deepseekBaseUrl: store.settingsState.deepseekBaseUrl || 'https://api.deepseek.com',
        deepseekModel: store.settingsState.deepseekModel || '',
        drawModelId: store.settingsState.drawModelId || 'anime',
        stage1MaterialIterationLimited: Boolean(store.settingsState.stage1MaterialIterationLimited),
        stage1MaterialMaxIterations: Number(store.settingsState.stage1MaterialMaxIterations) || 2,
      } : undefined,
      phoneFixedTime: store.phoneFixedTime,
      selectedSlot: store.selectedSlot,
      selectedWork: store.selectedWork,
      selectedCharacterId: store.selectedCharacterId,
      characterAge: store.characterAge,
      entryTime: store.entryTime,
      entryCalendar: store.entryCalendar,
      entryCurrentAction: store.entryCurrentAction,
      controlMode: store.controlMode,
      online: store.online,
      turn: store.turn,
      sceneTitle: store.sceneTitle,
      mood: store.mood,
      trust: store.trust,
      resistance: store.resistance,
      emotions: store.emotions,
      playerFeelings: store.playerFeelings,
      temporaryEmotions: store.temporaryEmotions,
      temporaryPlayerFeelings: store.temporaryPlayerFeelings,
      metricsReady: store.metricsReady,
      metricNotes: store.metricNotes,
      quest: store.quest,
      mindText: store.mindText,
      feedbackSource: store.feedbackSource,
      characterIntent: store.characterIntent,
      choices: store.choices,
      log: store.log.slice(-30).map((entry) => ({ ...entry, thinking: store.normalizeNovelThinking ? store.normalizeNovelThinking(entry.thinking) : entry.thinking })),
      realWorldThinkMode: Boolean(store.realWorldThinkMode),
      realWorldSceneTitle: store.realWorldSceneTitle,
      realWorldLocationName: store.realWorldLocationName,
      realWorldMap: store.realWorldMap,
      realWorldQuest: store.realWorldQuest,
      realWorldStatus: store.realWorldStatus,
      realWorldChoices: store.realWorldChoices,
      realWorldLog: (store.realWorldLog || []).filter((entry) => !entry.transientError).slice(-30),
      realWorldLongingEvents: store.realWorldLongingEvents || [],
      realWorldlineState: store.realWorldlineState || { events: [], plots: [], pendingPlot: null },
      realWorldSystemRecords: (store.realWorldSystemRecords || []).slice(-60),
      realWorldAgentKvByMode: store.realWorldAgentKvByMode || {},
      characterSchedules: store.characterSchedules && typeof store.characterSchedules === 'object' ? store.characterSchedules : {},
      orgTerritoryReconciliationLog: (store.orgTerritoryReconciliationLog || []).slice(-30),
      alertLogEntries: (store.alertLogEntries || []).slice(-120).map((item) => ({ ...item, read: true })),
      alertLogState: store.alertLogState ? { ...store.alertLogState, open: false, selectedId: '' } : undefined,
      orgTerritoryConsistency: store.orgTerritoryConsistency ? {
        dismissed: Boolean(store.orgTerritoryConsistency.dismissed),
        at: store.orgTerritoryConsistency.at || '',
        signature: store.orgTerritoryConsistency.signature
          || window.GameModules.orgTerritory?.consistencySignature?.(store.orgTerritoryConsistency)
          || '',
      } : undefined,
      companyState: store.companyState ? { ...store.companyState, open: false } : store.companyState,
      bossState: store.bossState ? { ...store.bossState, open: false, companyDetailOpen: false, generating: false } : store.bossState,
      calendarState: store.calendarState ? { ...store.calendarState, open: false } : store.calendarState,
      factionState: store.factionState ? { ...store.factionState, open: false, detailOpen: false, generating: false } : store.factionState,
      taobaoState: store.taobaoState ? { ...store.taobaoState, open: false, generatingId: '', buyingId: '', walletOpen: false } : store.taobaoState,
      rpgPanelCharacterId: store.rpgPanelCharacterId,
      solidifyState: store.solidifyState ? { open: false, candidates: store.solidifyState.candidates || [], selectedKey: store.solidifyState.selectedKey || '' } : undefined,
    };
  },

  restore(store, save) {
    if (!save) return false;
    store.phoneSetupDone = save.phoneSetupDone ?? store.phoneSetupDone;
    store.phoneFixedTime = Number(save.phoneFixedTime) || new Date(save.playerProfile?.initializedAt || Date.now()).getTime();
    store.playerProfile = { ...store.playerProfile, ...(save.playerProfile || {}) };
    store.playerAspiration = save.playerAspiration || null;
    store.playerName = save.playerName || store.playerProfile?.name || store.playerName;
    if (save.roleCardSetup && store.roleCardSetup) {
      store.roleCardSetup = {
        ...store.roleCardSetup,
        usePredefinedPlayerCard: Boolean(save.roleCardSetup.usePredefinedPlayerCard),
        selectedPlayerName: save.roleCardSetup.selectedPlayerName || store.roleCardSetup.selectedPlayerName,
        selectedRelationNames: Array.isArray(save.roleCardSetup.selectedRelationNames) ? save.roleCardSetup.selectedRelationNames : store.roleCardSetup.selectedRelationNames,
        relationRoles: save.roleCardSetup.relationRoles && typeof save.roleCardSetup.relationRoles === 'object' ? save.roleCardSetup.relationRoles : store.roleCardSetup.relationRoles,
      };
    }
    store.wechatUsers = Array.isArray(save.wechatUsers) ? save.wechatUsers : (store.wechatUsers || []);
    store.wechatMessagesByContact = save.wechatMessagesByContact && typeof save.wechatMessagesByContact === 'object' ? save.wechatMessagesByContact : (store.wechatMessagesByContact || {});
    store.wechatAlbumPhotos = save.wechatAlbumPhotos && typeof save.wechatAlbumPhotos === 'object' ? save.wechatAlbumPhotos : (store.wechatAlbumPhotos || {});
    store.wechatAlbumPrompts = save.wechatAlbumPrompts && typeof save.wechatAlbumPrompts === 'object' ? save.wechatAlbumPrompts : (store.wechatAlbumPrompts || {});
    if (save.settingsState && store.settingsState) {
      store.settingsState = { ...store.settingsState, ...save.settingsState, open: false, loading: false, error: '' };
      store.settingsState.stage1MaterialIterationLimited = Boolean(store.settingsState.stage1MaterialIterationLimited);
      store.settingsState.stage1MaterialMaxIterations = Math.max(1, Math.min(8, Math.round(Number(store.settingsState.stage1MaterialMaxIterations) || 2)));
      store.settingsState.textProvider = store.settingsState.textProvider || 'deepseek';
      store.settingsState.deepseekBaseUrl = store.settingsState.deepseekBaseUrl || 'https://api.deepseek.com';
      store.modelId = store.settingsState.textModelId || store.modelId;
    }
    window.GameModules.runtimeConfig?.applyToStore?.(store);
    store.realWorldThinkMode = Boolean(save.realWorldThinkMode ?? store.realWorldThinkMode);
    store.realWorldSceneTitle = save.realWorldSceneTitle || store.realWorldSceneTitle;
    store.realWorldLocationName = save.realWorldLocationName || store.realWorldLocationName;
    store.realWorldMap = save.realWorldMap || store.realWorldMap;
    window.GameModules.realWorldMap?.ensure?.(store, store.playerProfile || {});
    store.realWorldQuest = save.realWorldQuest || store.realWorldQuest;
    store.realWorldStatus = save.realWorldStatus || store.realWorldStatus;
    store.realWorldChoices = save.realWorldChoices || store.realWorldChoices;
    store.realWorldLog = window.GameModules.realWorldThinkingActions?.normalizeRealWorldLog?.(save.realWorldLog || store.realWorldLog) || (save.realWorldLog || store.realWorldLog);
    store.realWorldLongingEvents = Array.isArray(save.realWorldLongingEvents) ? save.realWorldLongingEvents : (store.realWorldLongingEvents || []);
    window.GameModules.sqliteSave.saveRealWorldLogEntries?.(store.realWorldLog).catch((err) => console.warn('[现实日志] 旧日志迁移失败:', err.message, err.stack));
    store.realWorldlineState = save.realWorldlineState || store.realWorldlineState || { events: [], plots: [], pendingPlot: null };
    store.realWorldSystemRecords = Array.isArray(save.realWorldSystemRecords) ? save.realWorldSystemRecords : (store.realWorldSystemRecords || []);
    store.realWorldAgentKvByMode = save.realWorldAgentKvByMode && typeof save.realWorldAgentKvByMode === 'object'
      ? save.realWorldAgentKvByMode
      : (store.realWorldAgentKvByMode || {});
    store.characterSchedules = save.characterSchedules && typeof save.characterSchedules === 'object'
      ? save.characterSchedules
      : (store.characterSchedules || {});
    store.orgTerritoryReconciliationLog = Array.isArray(save.orgTerritoryReconciliationLog)
      ? save.orgTerritoryReconciliationLog.slice(-30)
      : (store.orgTerritoryReconciliationLog || []);
    store.alertLogEntries = Array.isArray(save.alertLogEntries) ? save.alertLogEntries.slice(-120) : (store.alertLogEntries || []);
    store.alertLogState = save.alertLogState
      ? { ...window.GameModules.alertLog.defaultState(), ...save.alertLogState, open: false, selectedId: '' }
      : { ...window.GameModules.alertLog.defaultState(), ...(store.alertLogState || {}) };
    if (save.orgTerritoryConsistency) {
      store.orgTerritoryConsistency = {
        ...(store.orgTerritoryConsistency || {}),
        dismissed: Boolean(save.orgTerritoryConsistency.dismissed),
        at: save.orgTerritoryConsistency.at || '',
        signature: String(save.orgTerritoryConsistency.signature || '').slice(0, 4000),
      };
    }
    window.GameModules.wechatCleanup?.run?.(store);
    store.companyState = save.companyState ? { ...save.companyState, open: false } : store.companyState;
    store.bossState = save.bossState ? { ...save.bossState, open: false, companyDetailOpen: false, generating: false } : store.bossState;
    store.calendarState = save.calendarState ? { ...save.calendarState, open: false } : store.calendarState;
    store.factionState = save.factionState ? { ...save.factionState, open: false, detailOpen: false, generating: false, archives: save.factionState.archives || save.factionArchives || {} } : store.factionState;
    store.initFactionSystem?.();
    window.GameModules.orgTerritory?.validateWorldConsistency?.(store);
    store.taobaoState = save.taobaoState ? { ...store.taobaoState, ...save.taobaoState, open: false, generatingId: '', buyingId: '' } : store.taobaoState;
    store.solidifyState = save.solidifyState ? { ...store.solidifyState, ...save.solidifyState, open: false } : store.solidifyState;
    store.initTaobaoApp?.();
    if (!save.started) return false;
    store.selectedWork = save.selectedWork || store.selectedWork;
    store.selectedCharacterId = save.selectedCharacterId || store.selectedCharacterId;
    store.characterAge = save.characterAge || store.characterAge;
    store.entryTime = save.entryTime || store.entryTime;
    store.entryCalendar = save.entryCalendar || store.entryCalendar;
    store.entryCurrentAction = save.entryCurrentAction || store.entryCurrentAction;
    store.controlMode = save.controlMode || store.controlMode;
    store.online = save.online ?? store.online;
    store.turn = save.turn || 1;
    store.sceneTitle = save.sceneTitle || store.sceneTitle;
    store.mood = save.mood || store.mood;
    store.trust = save.trust ?? store.trust;
    store.resistance = save.resistance ?? store.resistance;
    store.emotions = save.emotions || store.emotions;
    store.playerFeelings = save.playerFeelings || store.playerFeelings;
    store.temporaryEmotions = save.temporaryEmotions && typeof save.temporaryEmotions === 'object' ? save.temporaryEmotions : (store.temporaryEmotions || {});
    store.temporaryPlayerFeelings = save.temporaryPlayerFeelings && typeof save.temporaryPlayerFeelings === 'object' ? save.temporaryPlayerFeelings : (store.temporaryPlayerFeelings || {});
    store.metricsReady = save.metricsReady ?? true;
    store.metricNotes = save.metricNotes || store.metricNotes;
    window.GameModules.metrics.ensure(store);
    store.quest = save.quest || store.quest;
    store.mindText = save.mindText || store.mindText;
    store.feedbackSource = save.feedbackSource || store.feedbackSource || 'fallback';
    store.characterIntent = save.characterIntent || store.characterIntent;
    store.choices = save.choices || store.choices;
    store.log = save.log || store.log;
    store.rpgPanelCharacterId = save.rpgPanelCharacterId || store.selectedCharacterId;
    store.started = true;
    return true;
  },
};


;// ---- lore-sources.js ----
window.GameData = window.GameData || {};
window.GameData.loreSources = [
  {"name":"Fate Apocrypha","base":"assets/Fate Apocrypha/AI设定库","aliases":["Fate Apocrypha"],"cache":"lore-cache/fate-apocrypha-9171f8da.json"},
  {"name":"Fate Labyrinth","base":"assets/Fate Labyrinth/AI设定库","aliases":["Fate Labyrinth"],"cache":"lore-cache/fate-labyrinth-0ec49929.json"},
  {"name":"Fate Requiem","base":"assets/Fate Requiem/AI设定库","aliases":["Fate Requiem"],"cache":"lore-cache/fate-requiem-ff6510b8.json"},
  {"name":"Fate Stay Night【游戏文本】","base":"assets/Fate Stay Night【游戏文本】/AI设定库","aliases":["Fate Stay Night","Fate/stay night","Fate 月姬","Fate 空之境界"],"cache":"lore-cache/fate-stay-night-2d84d3a4.json"},
  {"name":"Fate Strange Fake","base":"assets/Fate Strange Fake/AI设定库","aliases":["Fate Strange Fake"],"cache":"lore-cache/fate-strange-fake-aa7fc051.json"},
  {"name":"Fate-Prototype苍银的碎片","base":"assets/Fate-Prototype苍银的碎片/AI设定库","aliases":["Fate Prototype苍银的碎片","Fate Prototype 苍银的碎片"],"cache":"lore-cache/fate-prototype-79f63de2.json"},
  {"name":"fate zero","base":"assets/fate zero/AI设定库","aliases":["Fate Zero","fate zero"],"cache":"lore-cache/fate-zero-81e314aa.json"},
  {"name":"【阿瓦隆之庭】Fate／stay night Garden of Avalon","base":"assets/【阿瓦隆之庭】Fate／stay night Garden of Avalon/AI设定库","aliases":["Fate 阿瓦隆之庭","Garden of Avalon","阿瓦隆之庭"],"cache":"lore-cache/fate-stay-night-garden-of-avalon-2e7a65a4.json"},
  {"name":"刀剑神域","base":"assets/刀剑神域/AI设定库","aliases":["刀剑神域","Sword Art Online"],"cache":"lore-cache/source-99ac5075.json"},
  {"name":"君主·埃尔梅罗二世事件簿","base":"assets/君主·埃尔梅罗二世事件簿/AI设定库","aliases":["Fate 君主埃尔梅罗二世事件簿","君主埃尔梅罗二世事件簿"],"cache":"lore-cache/source-a0603d1a.json"},
  {"name":"君主·埃尔梅罗二世的冒险","base":"assets/君主·埃尔梅罗二世的冒险/AI设定库","aliases":["Fate 君主埃尔梅罗二世的冒险","君主埃尔梅罗二世的冒险"],"cache":"lore-cache/source-a32fd835.json"},
  {"name":"我的青春恋爱物语果然有问题","base":"assets/我的青春恋爱物语果然有问题/AI设定库","aliases":["我的青春恋爱物语果然有问题","俺ガイル"],"cache":"lore-cache/source-3a53e486.json"},
  {"name":"魔法少女小圆","base":"assets/魔法少女小圆/AI设定库","aliases":["魔法少女小圆","Puella Magi Madoka Magica"],"cache":"lore-cache/source-95eba955.json"},
];


;// ---- story-start-data.js ----
window.GameData = window.GameData || {};
window.GameData.storyStarts = {
  "Fate Apocrypha": { year: 2011, month: 1, day: 1, hour: 8, minute: 8, second: 0 },
  "Fate Labyrinth": { year: 2011, month: 1, day: 1, hour: 8, minute: 8, second: 0 },
  "Fate Requiem": { year: 2011, month: 1, day: 1, hour: 8, minute: 8, second: 0 },
  "Fate Stay Night【游戏文本】": { year: 2011, month: 1, day: 1, hour: 8, minute: 8, second: 0 },
  "Fate Strange Fake": { year: 2011, month: 1, day: 1, hour: 8, minute: 8, second: 0 },
  "Fate-Prototype苍银的碎片": { year: 2011, month: 1, day: 1, hour: 8, minute: 8, second: 0 },
  "fate zero": { year: 1994, month: 11, day: 19, hour: 8, minute: 0, second: 0 },
  "【阿瓦隆之庭】Fate／stay night Garden of Avalon": { year: 465, month: 5, day: 1, hour: 8, minute: 0, second: 0 },
  "刀剑神域": { year: 2011, month: 1, day: 1, hour: 8, minute: 10, second: 0 },
  "君主·埃尔梅罗二世事件簿": { year: 2011, month: 1, day: 1, hour: 8, minute: 8, second: 0 },
  "君主·埃尔梅罗二世的冒险": { year: 2011, month: 1, day: 1, hour: 8, minute: 8, second: 0 },
  "我的青春恋爱物语果然有问题": { year: 2011, month: 1, day: 1, hour: 8, minute: 8, second: 0 },
  "魔法少女小圆": { year: 2011, month: 1, day: 1, hour: 8, minute: 10, second: 0 },
};


;// ---- character-birth-data.js ----
window.GameData = window.GameData || {};
window.GameData.characterBirthDates = {"char-c6da91efea77":{"year":1989,"month":1,"day":1},"Fate Apocrypha::齐格":{"year":1989,"month":1,"day":1},"char-481848444321":{"year":1988,"month":1,"day":1},"Fate Apocrypha::贞德":{"year":1988,"month":1,"day":1},"char-ab73fc5288db":{"year":1987,"month":1,"day":1},"Fate Apocrypha::天草四郎时贞":{"year":1987,"month":1,"day":1},"char-f17decbc73b9":{"year":1988,"month":1,"day":1},"Fate Apocrypha::莫德雷德":{"year":1988,"month":1,"day":1},"char-dd9cdedfcc13":{"year":1974,"month":1,"day":1},"Fate Apocrypha::狮子劫界离":{"year":1974,"month":1,"day":1},"char-46b8d765c3cb":{"year":1989,"month":1,"day":1},"Fate Apocrypha::阿斯托尔福":{"year":1989,"month":1,"day":1},"char-8b95a36bfc9a":{"year":1964,"month":1,"day":1},"Fate Apocrypha::弗拉德三世":{"year":1964,"month":1,"day":1},"char-66bc8a3a5386":{"year":1924,"month":1,"day":1},"Fate Apocrypha::达尼克":{"year":1924,"month":1,"day":1},"char-975c3f65d63d":{"year":1986,"month":1,"day":1},"Fate Apocrypha::菲奥蕾":{"year":1986,"month":1,"day":1},"char-9658dce59d92":{"year":1989,"month":1,"day":1},"Fate Apocrypha::考列斯":{"year":1989,"month":1,"day":1},"char-a6976158121c":{"year":1984,"month":1,"day":1},"Fate Apocrypha::阿喀琉斯":{"year":1984,"month":1,"day":1},"char-7cf2269990df":{"year":1986,"month":1,"day":1},"Fate Apocrypha::阿塔兰忒":{"year":1986,"month":1,"day":1},"char-01efc4118cf3":{"year":1964,"month":1,"day":1},"Fate Apocrypha::莎士比亚":{"year":1964,"month":1,"day":1},"char-b9d73cda4861":{"year":1994,"month":1,"day":1},"Fate Apocrypha::罗克":{"year":1994,"month":1,"day":1},"char-bef7031291e0":{"year":1990,"month":1,"day":1},"Fate Labyrinth::沙条爱歌":{"year":1990,"month":1,"day":1},"char-d5ed8648e4ff":{"year":1989,"month":1,"day":1},"Fate Labyrinth::诺玛":{"year":1989,"month":1,"day":1},"char-93f0f55c090c":{"year":1984,"month":1,"day":1},"Fate Labyrinth::亚瑟·潘德拉贡":{"year":1984,"month":1,"day":1},"char-a010441ee32c":{"year":1984,"month":1,"day":1},"Fate Labyrinth::罗宾汉":{"year":1984,"month":1,"day":1},"char-4bd549978a79":{"year":1979,"month":1,"day":1},"Fate Labyrinth::亨利·杰基尔":{"year":1979,"month":1,"day":1},"char-6abf672a3700":{"year":1986,"month":1,"day":1},"Fate Labyrinth::美杜莎":{"year":1986,"month":1,"day":1},"char-615a292b388d":{"year":2011,"month":1,"day":1},"Fate Requiem::宇津见绘里世":{"year":2011,"month":1,"day":1},"char-28f19f6ee059":{"year":2015,"month":1,"day":1},"Fate Requiem::少年从者":{"year":2015,"month":1,"day":1},"char-8ac8d06b462e":{"year":2011,"month":1,"day":1},"Fate Requiem::卡琳":{"year":2011,"month":1,"day":1},"char-0dd69e15fd6d":{"year":2015,"month":1,"day":1},"Fate Requiem::路易十七":{"year":2015,"month":1,"day":1},"char-1e94ca1210af":{"year":2005,"month":1,"day":1},"Fate Requiem::鬼女红叶":{"year":2005,"month":1,"day":1},"char-e4940c13c22b":{"year":2005,"month":1,"day":1},"Fate Requiem::库丘林":{"year":2005,"month":1,"day":1},"char-04bee688aa9f":{"year":2015,"month":1,"day":1},"Fate Requiem::主公":{"year":2015,"month":1,"day":1},"char-9bfddc2c675a":{"year":2015,"month":1,"day":1},"Fate Requiem::朽目":{"year":2015,"month":1,"day":1},"char-dabba65cc60c":{"year":2015,"month":1,"day":1},"Fate Requiem::欧克勒得斯":{"year":2015,"month":1,"day":1},"char-431d16f6b81d":{"year":2015,"month":1,"day":1},"Fate Requiem::玛琪":{"year":2015,"month":1,"day":1},"char-4a00fecfa959":{"year":2015,"month":1,"day":1},"Fate Requiem::琉璃姬":{"year":2015,"month":1,"day":1},"char-a2577ca0da37":{"year":2015,"month":1,"day":1},"Fate Requiem::藤村":{"year":2015,"month":1,"day":1},"char-4591326294f3":{"year":2015,"month":1,"day":1},"Fate Requiem::阿努比斯":{"year":2015,"month":1,"day":1},"char-539051670d5d":{"year":1987,"month":1,"day":1},"Fate Stay Night【游戏文本】::卫宫士郎":{"year":1987,"month":1,"day":1},"char-3eb99303731c":{"year":1989,"month":1,"day":1},"Fate Stay Night【游戏文本】::阿尔托莉雅":{"year":1989,"month":1,"day":1},"char-5be3be77ce94":{"year":1987,"month":2,"day":3},"Fate Stay Night【游戏文本】::远坂凛":{"year":1987,"month":2,"day":3},"char-d1a3351e00c0":{"year":1987,"month":3,"day":2},"Fate Stay Night【游戏文本】::间桐樱":{"year":1987,"month":3,"day":2},"char-1a41750ea7f5":{"year":1986,"month":11,"day":20},"Fate Stay Night【游戏文本】::伊莉雅丝菲尔":{"year":1986,"month":11,"day":20},"char-a18d77f87576":{"year":1967,"month":12,"day":28},"Fate Stay Night【游戏文本】::言峰绮礼":{"year":1967,"month":12,"day":28},"char-1050cb55d4b9":{"year":1965,"month":11,"day":11},"Fate Stay Night【游戏文本】::卫宫切嗣":{"year":1965,"month":11,"day":11},"char-17a6d692d2ce":{"year":1979,"month":1,"day":1},"Fate Stay Night【游戏文本】::吉尔伽美什":{"year":1979,"month":1,"day":1},"char-2cc198dcd736":{"year":1984,"month":1,"day":1},"Fate Stay Night【游戏文本】::美狄亚":{"year":1984,"month":1,"day":1},"char-135c1d8c01d3":{"year":1974,"month":1,"day":1},"Fate Stay Night【游戏文本】::赫拉克勒斯":{"year":1974,"month":1,"day":1},"char-be27e1264481":{"year":1994,"month":1,"day":1},"Fate Stay Night【游戏文本】::三枝":{"year":1994,"month":1,"day":1},"char-897642c888c7":{"year":1994,"month":1,"day":1},"Fate Stay Night【游戏文本】::后藤":{"year":1994,"month":1,"day":1},"char-758b28900f97":{"year":1994,"month":1,"day":1},"Fate Stay Night【游戏文本】::葛木":{"year":1994,"month":1,"day":1},"char-db42a7ce91e7":{"year":1994,"month":1,"day":1},"Fate Stay Night【游戏文本】::藤村":{"year":1994,"month":1,"day":1},"char-4fbd968f97b8":{"year":1993,"month":1,"day":1},"Fate Strange Fake::绫香·沙条":{"year":1993,"month":1,"day":1},"char-462b88d5423c":{"year":1984,"month":1,"day":1},"Fate Strange Fake::理查一世":{"year":1984,"month":1,"day":1},"char-517f24690420":{"year":1984,"month":1,"day":1},"Fate Strange Fake::吉尔伽美什":{"year":1984,"month":1,"day":1},"char-07f007f607ce":{"year":1989,"month":1,"day":1},"Fate Strange Fake::恩奇都":{"year":1989,"month":1,"day":1},"char-afbaff0ca6c4":{"year":1997,"month":1,"day":1},"Fate Strange Fake::缇妮":{"year":1997,"month":1,"day":1},"char-65a49b8ff113":{"year":1991,"month":1,"day":1},"Fate Strange Fake::弗拉特":{"year":1991,"month":1,"day":1},"char-26ccd097f734":{"year":1909,"month":1,"day":1},"Fate Strange Fake::杰克":{"year":1909,"month":1,"day":1},"char-a110892691d9":{"year":1984,"month":1,"day":1},"Fate Strange Fake::法尔迪乌斯":{"year":1984,"month":1,"day":1},"char-31bdd0d8d330":{"year":1999,"month":1,"day":1},"Fate Strange Fake::克雷蒂安":{"year":1999,"month":1,"day":1},"char-227fcfa0f60d":{"year":1999,"month":1,"day":1},"Fate Strange Fake::哈露莉":{"year":1999,"month":1,"day":1},"char-074e24018e78":{"year":1999,"month":1,"day":1},"Fate Strange Fake::巴兹迪洛特":{"year":1999,"month":1,"day":1},"char-975484e00572":{"year":1999,"month":1,"day":1},"Fate Strange Fake::捷斯塔":{"year":1999,"month":1,"day":1},"char-9e46e7b73ace":{"year":1999,"month":1,"day":1},"Fate Strange Fake::朗格尔":{"year":1999,"month":1,"day":1},"char-fd0a600c15b0":{"year":1999,"month":1,"day":1},"Fate Strange Fake::柯狄里翁":{"year":1999,"month":1,"day":1},"char-3e8fcc987075":{"year":1999,"month":1,"day":1},"Fate Strange Fake::汉萨":{"year":1999,"month":1,"day":1},"char-80d4498e7bad":{"year":1999,"month":1,"day":1},"Fate Strange Fake::法兰契丝卡":{"year":1999,"month":1,"day":1},"char-0b6f27d1fe3b":{"year":1999,"month":1,"day":1},"Fate Strange Fake::西格玛":{"year":1999,"month":1,"day":1},"char-4835b1c777a7":{"year":1999,"month":1,"day":1},"Fate Strange Fake::费拉特":{"year":1999,"month":1,"day":1},"char-638411457e4f":{"year":1999,"month":1,"day":1},"Fate Strange Fake::那些骷髅":{"year":1999,"month":1,"day":1},"char-64f44bcd8f3f":{"year":1999,"month":1,"day":1},"Fate Strange Fake::阿特莉亚":{"year":1999,"month":1,"day":1},"char-7b8e90786268":{"year":1999,"month":1,"day":1},"Fate Strange Fake::黑漆漆":{"year":1999,"month":1,"day":1},"char-318b9bc5a3ec":{"year":1983,"month":1,"day":1},"Fate-Prototype苍银的碎片::沙条绫香":{"year":1983,"month":1,"day":1},"char-92dbf396a6ad":{"year":1977,"month":1,"day":1},"Fate-Prototype苍银的碎片::沙条爱歌":{"year":1977,"month":1,"day":1},"char-8bacc345c08c":{"year":1971,"month":1,"day":1},"Fate-Prototype苍银的碎片::亚瑟·潘德拉贡":{"year":1971,"month":1,"day":1},"char-c93b8113ad84":{"year":1977,"month":1,"day":1},"Fate-Prototype苍银的碎片::玲珑馆美沙夜":{"year":1977,"month":1,"day":1},"char-bd6cf207883f":{"year":1971,"month":1,"day":1},"Fate-Prototype苍银的碎片::布伦希尔德":{"year":1971,"month":1,"day":1},"char-292d8535f2c4":{"year":1966,"month":1,"day":1},"Fate-Prototype苍银的碎片::奥斯曼狄斯":{"year":1966,"month":1,"day":1},"char-74b0ec0e8d0a":{"year":1966,"month":1,"day":1},"Fate-Prototype苍银的碎片::亨利·杰基尔":{"year":1966,"month":1,"day":1},"char-1bd014be6f60":{"year":1981,"month":1,"day":1},"Fate-Prototype苍银的碎片::玛丽":{"year":1981,"month":1,"day":1},"char-f5e3b39a7911":{"year":1965,"month":11,"day":11,"precision":"day"},"fate zero::卫宫切嗣":{"year":1965,"month":11,"day":11,"precision":"day"},"char-d1669ea4a8e8":{"year":1985,"precision":"year"},"fate zero::爱丽丝菲尔·冯·爱因兹贝伦":{"year":1985,"precision":"year"},"char-32ea575c155f":{"year":1967,"month":12,"day":28,"precision":"day"},"fate zero::言峰绮礼":{"year":1967,"month":12,"day":28,"precision":"day"},"char-0e4438d86d8c":{"month":6,"day":16,"precision":"month-day"},"fate zero::远坂时臣":{"month":6,"day":16,"precision":"month-day"},"char-d1225f870f60":{"year":1975,"month":10,"day":3,"precision":"day"},"fate zero::韦伯·维尔维特":{"year":1975,"month":10,"day":3,"precision":"day"},"char-67132724be0b":{"month":4,"day":11,"precision":"month-day"},"fate zero::肯尼斯·埃尔梅罗·阿奇博尔德":{"month":4,"day":11,"precision":"month-day"},"char-a1b5dc73aad6":{"year":1975,"month":1,"day":31,"precision":"day"},"fate zero::雨生龙之介":{"year":1975,"month":1,"day":31,"precision":"day"},"char-47a2be039d9e":null,"fate zero::间桐雁夜":null,"char-19c651c68a52":null,"fate zero::阿尔托莉雅·潘德拉贡":null,"char-ca76acf10d1d":null,"fate zero::吉尔伽美什":null,"char-1108db5be655":null,"fate zero::迪尔姆德·奥迪那":null,"char-df497e164ccc":null,"fate zero::伊斯坎达尔":null,"char-7bd06d512d7b":null,"fate zero::吉尔斯·德·莱斯":null,"char-a3a8e861bdd8":null,"fate zero::百貌哈桑":null,"char-8ef222fb7596":null,"fate zero::兰斯洛特":null,"char-ad29d46dbb4c":{"month":7,"day":7,"precision":"month-day"},"fate zero::久宇舞弥":{"month":7,"day":7,"precision":"month-day"},"char-da5a6b166cf5":{"month":8,"day":19,"precision":"month-day"},"fate zero::索拉乌·娜泽莱·索菲亚利":{"month":8,"day":19,"precision":"month-day"},"char-1cbae61565b9":{"year":1913,"month":12,"day":29,"precision":"day"},"fate zero::言峰璃正":{"year":1913,"month":12,"day":29,"precision":"day"},"char-98d7eed47c68":null,"fate zero::远坂葵":null,"char-3dfd2166afe1":{"year":1987,"month":2,"day":3,"precision":"day"},"fate zero::远坂凛":{"year":1987,"month":2,"day":3,"precision":"day"},"char-6008ff05a8ca":{"year":1987,"month":3,"day":2,"precision":"day"},"fate zero::间桐樱":{"year":1987,"month":3,"day":2,"precision":"day"},"char-062993f22d19":null,"fate zero::间桐脏砚":null,"char-c044611fbb65":{"year":1986,"precision":"year"},"fate zero::伊莉雅丝菲尔·冯·爱因兹贝伦":{"year":1986,"precision":"year"},"char-6ce5c150de06":null,"fate zero::阿其波卢德":null,"char-7528c87580a2":null,"fate zero::阿莱克斯":null,"char-dfe74b83be39":{"year":475,"month":1,"day":1},"【阿瓦隆之庭】Fate／stay night Garden of Avalon::梅林":{"year":475,"month":1,"day":1},"char-46e1fbdcd67b":{"year":485,"month":1,"day":1},"【阿瓦隆之庭】Fate／stay night Garden of Avalon::阿尔托莉雅·潘德拉贡":{"year":485,"month":1,"day":1},"char-bfebff4f9529":{"year":480,"month":1,"day":1},"【阿瓦隆之庭】Fate／stay night Garden of Avalon::凯":{"year":480,"month":1,"day":1},"char-238dc11335b4":{"year":455,"month":1,"day":1},"【阿瓦隆之庭】Fate／stay night Garden of Avalon::艾克托":{"year":455,"month":1,"day":1},"char-cbadd693a204":{"year":460,"month":1,"day":1},"【阿瓦隆之庭】Fate／stay night Garden of Avalon::伏提庚":{"year":460,"month":1,"day":1},"char-3317b855e330":{"year":475,"month":1,"day":1},"【阿瓦隆之庭】Fate／stay night Garden of Avalon::摩根":{"year":475,"month":1,"day":1},"char-a9978cffde1b":{"year":480,"month":1,"day":1},"【阿瓦隆之庭】Fate／stay night Garden of Avalon::格尼薇儿":{"year":480,"month":1,"day":1},"char-56cc0148390e":{"year":475,"month":1,"day":1},"【阿瓦隆之庭】Fate／stay night Garden of Avalon::兰斯洛特":{"year":475,"month":1,"day":1},"char-aee15cd9882f":{"year":485,"month":1,"day":1},"【阿瓦隆之庭】Fate／stay night Garden of Avalon::莫德雷德":{"year":485,"month":1,"day":1},"char-04707148c022":{"year":480,"month":1,"day":1},"【阿瓦隆之庭】Fate／stay night Garden of Avalon::贝德维尔":{"year":480,"month":1,"day":1},"char-a49ad469e50b":{"year":480,"month":1,"day":1},"【阿瓦隆之庭】Fate／stay night Garden of Avalon::高文":{"year":480,"month":1,"day":1},"char-60611fb1326f":{"year":475,"month":1,"day":1},"【阿瓦隆之庭】Fate／stay night Garden of Avalon::阿格规文":{"year":475,"month":1,"day":1},"char-368194a2431d":{"year":480,"month":1,"day":1},"【阿瓦隆之庭】Fate／stay night Garden of Avalon::崔斯坦":{"year":480,"month":1,"day":1},"char-57486be34fcb":{"year":2008,"month":10,"day":7},"刀剑神域::桐人":{"year":2008,"month":10,"day":7},"char-de880450c7eb":{"year":2007,"month":9,"day":30},"刀剑神域::亚丝娜":{"year":2007,"month":9,"day":30},"char-48aa1ab8ba46":{"year":1997,"month":1,"day":1},"刀剑神域::茅场晶彦":{"year":1997,"month":1,"day":1},"char-58bb3bb1928d":{"year":2000,"month":1,"day":1},"刀剑神域::克莱因":{"year":2000,"month":1,"day":1},"char-4d1850daa9f7":{"year":1995,"month":3,"day":9},"刀剑神域::艾基尔":{"year":1995,"month":3,"day":9},"char-c5e7e8b9bd85":{"year":2007,"month":1,"day":1},"刀剑神域::莉兹贝特":{"year":2007,"month":1,"day":1},"char-06e6b8c657d5":{"year":2010,"month":1,"day":1},"刀剑神域::西莉卡":{"year":2010,"month":1,"day":1},"char-3061baf7aaa2":{"year":2022,"month":8,"day":1},"刀剑神域::结衣":{"year":2022,"month":8,"day":1},"char-9cbc4106a53d":{"year":2007,"month":1,"day":1},"刀剑神域::幸":{"year":2007,"month":1,"day":1},"char-f0c213a5b48c":{"year":2009,"month":8,"day":21},"刀剑神域::诗乃":{"year":2009,"month":8,"day":21},"char-095512888570":{"year":2009,"month":4,"day":19},"刀剑神域::莉法":{"year":2009,"month":4,"day":19},"char-5669bfdc081a":{"year":2007,"month":1,"day":1},"刀剑神域::优纪":{"year":2007,"month":1,"day":1},"char-1b32d6c85493":{"year":2005,"month":1,"day":1},"刀剑神域::尤吉欧":{"year":2005,"month":1,"day":1},"char-890f379fe2e3":{"year":2005,"month":1,"day":1},"刀剑神域::爱丽丝":{"year":2005,"month":1,"day":1},"char-a8e5a5acdbe2":{"year":2002,"month":1,"day":1},"刀剑神域::Administrator":{"year":2002,"month":1,"day":1},"char-e11235b34cb9":{"year":2007,"month":1,"day":1},"刀剑神域::死枪":{"year":2007,"month":1,"day":1},"char-9ddbe9840ddf":{"year":2004,"month":1,"day":1},"刀剑神域::克拉帝尔":{"year":2004,"month":1,"day":1},"char-632c3cf1981f":{"year":2006,"month":1,"day":1},"刀剑神域::迪亚贝尔":{"year":2006,"month":1,"day":1},"char-533f19d004d7":{"year":2008,"month":1,"day":1},"刀剑神域::阿尔戈":{"year":2008,"month":1,"day":1},"char-65f09632bb2b":{"year":2002,"month":1,"day":1},"刀剑神域::基滋梅尔":{"year":2002,"month":1,"day":1},"char-280e7cd27f5f":{"year":2012,"month":1,"day":1},"刀剑神域::玩家群体":{"year":2012,"month":1,"day":1},"char-2989f555a038":{"year":2012,"month":1,"day":1},"刀剑神域::菊冈":{"year":2012,"month":1,"day":1},"char-a1abb806950f":{"year":2012,"month":1,"day":1},"刀剑神域::牙王":{"year":2012,"month":1,"day":1},"char-46bafa903c30":{"year":2012,"month":1,"day":1},"刀剑神域::罗妮耶":{"year":2012,"month":1,"day":1},"char-79837b036a32":{"year":2012,"month":1,"day":1},"刀剑神域::赛亚诺":{"year":2012,"month":1,"day":1},"char-5af7317ce89a":{"year":2012,"month":1,"day":1},"刀剑神域::凛子":{"year":2012,"month":1,"day":1},"char-44b459ce4ae9":{"year":2012,"month":1,"day":1},"刀剑神域::莉庭":{"year":2012,"month":1,"day":1},"char-bee378923a17":{"year":2012,"month":1,"day":1},"刀剑神域::凛德":{"year":2012,"month":1,"day":1},"char-313b09b241a4":{"year":2012,"month":1,"day":1},"刀剑神域::谢达":{"year":2012,"month":1,"day":1},"char-e71790e8c302":{"year":2012,"month":1,"day":1},"刀剑神域::夜子":{"year":2012,"month":1,"day":1},"char-260d844e67c1":{"year":2012,"month":1,"day":1},"刀剑神域::法那提欧":{"year":2012,"month":1,"day":1},"char-c8fa6a3f749f":{"year":2012,"month":1,"day":1},"刀剑神域::派伊萨古鲁斯":{"year":2012,"month":1,"day":1},"char-39e0711cd918":{"year":2012,"month":1,"day":1},"刀剑神域::赛龙":{"year":2012,"month":1,"day":1},"char-cf89670cf588":{"year":2012,"month":1,"day":1},"刀剑神域::缇卓":{"year":2012,"month":1,"day":1},"char-51ad3528c99b":{"year":2012,"month":1,"day":1},"刀剑神域::比嘉":{"year":2012,"month":1,"day":1},"char-c77cbd3299b2":{"year":2012,"month":1,"day":1},"刀剑神域::缇洁":{"year":2012,"month":1,"day":1},"char-8e6214756bc6":{"year":2012,"month":1,"day":1},"刀剑神域::妮露妮尔":{"year":2012,"month":1,"day":1},"char-8908001f9238":{"year":2012,"month":1,"day":1},"刀剑神域::连利":{"year":2012,"month":1,"day":1},"char-a501107efab5":{"year":2012,"month":1,"day":1},"刀剑神域::艾欧莱茵":{"year":2012,"month":1,"day":1},"char-950b57a53b31":{"year":2012,"month":1,"day":1},"刀剑神域::萝涅":{"year":2012,"month":1,"day":1},"char-ff166c292abf":{"year":2012,"month":1,"day":1},"刀剑神域::安岐":{"year":2012,"month":1,"day":1},"char-1b1d963a3d15":{"year":2012,"month":1,"day":1},"刀剑神域::葛莉赛达":{"year":2012,"month":1,"day":1},"char-f0501d19a94f":{"year":2012,"month":1,"day":1},"刀剑神域::米亚":{"year":2012,"month":1,"day":1},"char-504b35a27212":{"year":2012,"month":1,"day":1},"刀剑神域::赛尔卡":{"year":2012,"month":1,"day":1},"char-bfed2ef9ac24":{"year":2012,"month":1,"day":1},"刀剑神域::西田":{"year":2012,"month":1,"day":1},"char-af362b943582":{"year":2012,"month":1,"day":1},"刀剑神域::凯因兹":{"year":2012,"month":1,"day":1},"char-e49f6f65e1d5":{"year":2012,"month":1,"day":1},"刀剑神域::ceba":{"year":2012,"month":1,"day":1},"char-52cb01504353":{"year":2012,"month":1,"day":1},"刀剑神域::阿优哈":{"year":2012,"month":1,"day":1},"char-f9cbb85422c6":{"year":2012,"month":1,"day":1},"刀剑神域::罗莎莉雅":{"year":2012,"month":1,"day":1},"char-752859ed3b82":{"year":2012,"month":1,"day":1},"刀剑神域::整合骑士":{"year":2012,"month":1,"day":1},"char-ecbdf6f18dcf":{"year":2012,"month":1,"day":1},"刀剑神域::卡迪娜尔":{"year":2012,"month":1,"day":1},"char-c5f64314aad1":{"year":2012,"month":1,"day":1},"刀剑神域::索尔缇莉娜":{"year":2012,"month":1,"day":1},"char-e696760018d2":{"year":2012,"month":1,"day":1},"刀剑神域::桠赞":{"year":2012,"month":1,"day":1},"char-7cc777cd69ae":{"year":2012,"month":1,"day":1},"刀剑神域::以及":{"year":2012,"month":1,"day":1},"char-ed40460de0e9":{"year":2012,"month":1,"day":1},"刀剑神域::剑士":{"year":2012,"month":1,"day":1},"char-4e4723917f3d":{"year":2012,"month":1,"day":1},"刀剑神域::纱夏":{"year":2012,"month":1,"day":1},"char-bc85fd14eae5":{"year":2012,"month":1,"day":1},"刀剑神域::修密特":{"year":2012,"month":1,"day":1},"char-8c831d86246c":{"year":2012,"month":1,"day":1},"刀剑神域::阿滋利卡":{"year":2012,"month":1,"day":1},"char-fd0060c31f19":{"year":2012,"month":1,"day":1},"刀剑神域::温贝尔":{"year":2012,"month":1,"day":1},"char-fd7e6f80ac72":{"year":2012,"month":1,"day":1},"刀剑神域::哈夫":{"year":2012,"month":1,"day":1},"char-5ccf6ace2ef0":{"year":2012,"month":1,"day":1},"刀剑神域::莉娜":{"year":2012,"month":1,"day":1},"char-7a89dd68591f":{"year":2012,"month":1,"day":1},"刀剑神域::欧柯唐":{"year":2012,"month":1,"day":1},"char-e4878dbe3157":{"year":2012,"month":1,"day":1},"刀剑神域::柳井":{"year":2012,"month":1,"day":1},"char-f179a6ccac69":{"year":2012,"month":1,"day":1},"刀剑神域::迪索尔巴德":{"year":2012,"month":1,"day":1},"char-9fc4196ebdd1":{"year":2012,"month":1,"day":1},"刀剑神域::布乎鲁姆":{"year":2012,"month":1,"day":1},"char-c44f2acadd83":{"year":2012,"month":1,"day":1},"刀剑神域::传述者":{"year":2012,"month":1,"day":1},"char-29daca646ab4":{"year":2012,"month":1,"day":1},"刀剑神域::广播":{"year":2012,"month":1,"day":1},"char-209a71672937":{"year":2012,"month":1,"day":1},"刀剑神域::拉维克":{"year":2012,"month":1,"day":1},"char-50f1c4115ef2":{"year":2012,"month":1,"day":1},"刀剑神域::阿尤哈":{"year":2012,"month":1,"day":1},"char-9c9e3c02c9ee":{"year":2012,"month":1,"day":1},"刀剑神域::霍尔加":{"year":2012,"month":1,"day":1},"char-0985e6cf5564":{"year":2012,"month":1,"day":1},"刀剑神域::由莉耶儿":{"year":2012,"month":1,"day":1},"char-437e21425510":{"year":2012,"month":1,"day":1},"刀剑神域::当叽":{"year":2012,"month":1,"day":1},"char-8afd3bcd45b9":{"year":2012,"month":1,"day":1},"刀剑神域::葛利牧罗克":{"year":2012,"month":1,"day":1},"char-821367ab2020":{"year":2012,"month":1,"day":1},"刀剑神域::就是":{"year":2012,"month":1,"day":1},"char-992710e5ef97":{"year":2012,"month":1,"day":1},"刀剑神域::哥鲁哥罗索":{"year":2012,"month":1,"day":1},"char-02efc827042d":{"year":2012,"month":1,"day":1},"刀剑神域::萨多雷":{"year":2012,"month":1,"day":1},"char-67d4827f8d4c":{"year":2012,"month":1,"day":1},"刀剑神域::莱欧斯":{"year":2012,"month":1,"day":1},"char-8a28ed0ce1d7":{"year":2012,"month":1,"day":1},"刀剑神域::艾尔多利耶":{"year":2012,"month":1,"day":1},"char-a3fe06343dab":{"year":2012,"month":1,"day":1},"刀剑神域::奎涅拉":{"year":2012,"month":1,"day":1},"char-d96b68dfd320":{"year":2012,"month":1,"day":1},"刀剑神域::巴尔波萨":{"year":2012,"month":1,"day":1},"char-38845bc0430b":{"year":2012,"month":1,"day":1},"刀剑神域::罗摩罗":{"year":2012,"month":1,"day":1},"char-a3a8c5cd9d41":{"year":2012,"month":1,"day":1},"刀剑神域::席娃达":{"year":2012,"month":1,"day":1},"char-a9d1dfe02fb5":{"year":2012,"month":1,"day":1},"刀剑神域::欧柯":{"year":2012,"month":1,"day":1},"char-6823e4ced2c2":{"year":2012,"month":1,"day":1},"刀剑神域::费赛尔":{"year":2012,"month":1,"day":1},"char-ceeb4627f1e7":{"year":2012,"month":1,"day":1},"刀剑神域::恩特基尔":{"year":2012,"month":1,"day":1},"char-0c7b9dd89461":{"year":2012,"month":1,"day":1},"刀剑神域::克里斯海特":{"year":2012,"month":1,"day":1},"char-e610262cca3b":{"year":2012,"month":1,"day":1},"刀剑神域::Schinken":{"year":2012,"month":1,"day":1},"char-65ed99b80670":{"year":2012,"month":1,"day":1},"刀剑神域::艾尔莉":{"year":2012,"month":1,"day":1},"char-9d8aed7683ae":{"year":2012,"month":1,"day":1},"刀剑神域::伊迪丝":{"year":2012,"month":1,"day":1},"char-9698e01a4df9":{"year":2012,"month":1,"day":1},"刀剑神域::迪克斯":{"year":2012,"month":1,"day":1},"char-83160e3a6832":{"year":2012,"month":1,"day":1},"刀剑神域::赫伦茨":{"year":2012,"month":1,"day":1},"char-9c10054acf08":{"year":1975,"month":1,"day":1},"君主·埃尔梅罗二世事件簿::君主·埃尔梅罗二世":{"year":1975,"month":1,"day":1},"char-cd84a26a79aa":{"year":1989,"month":1,"day":1},"君主·埃尔梅罗二世事件簿::格蕾":{"year":1989,"month":1,"day":1},"char-6bc4ffab5c68":{"year":1989,"month":1,"day":1},"君主·埃尔梅罗二世事件簿::莱妮丝":{"year":1989,"month":1,"day":1},"char-bd5151103702":{"year":1986,"month":1,"day":1},"君主·埃尔梅罗二世事件簿::弗拉特":{"year":1986,"month":1,"day":1},"char-9923c5518ec6":{"year":1986,"month":1,"day":1},"君主·埃尔梅罗二世事件簿::斯芬":{"year":1986,"month":1,"day":1},"char-39317d0d6879":{"year":1989,"month":1,"day":1},"君主·埃尔梅罗二世事件簿::考列斯":{"year":1989,"month":1,"day":1},"char-1ffa61f605e9":{"year":1979,"month":1,"day":1},"君主·埃尔梅罗二世事件簿::化野菱理":{"year":1979,"month":1,"day":1},"char-b973f618cfd9":{"year":1994,"month":1,"day":1},"君主·埃尔梅罗二世事件簿::奥尔加玛丽":{"year":1994,"month":1,"day":1},"char-357f39f955ab":{"year":1994,"month":1,"day":1},"君主·埃尔梅罗二世事件簿::伊薇特":{"year":1994,"month":1,"day":1},"char-ca4f0742fe87":{"year":1994,"month":1,"day":1},"君主·埃尔梅罗二世事件簿::伊诺莱":{"year":1994,"month":1,"day":1},"char-502ceeff193b":{"year":1994,"month":1,"day":1},"君主·埃尔梅罗二世事件簿::卡拉柏":{"year":1994,"month":1,"day":1},"char-9f2e82c024e3":{"year":1994,"month":1,"day":1},"君主·埃尔梅罗二世事件簿::司祭":{"year":1994,"month":1,"day":1},"char-3d27070183dc":{"year":1994,"month":1,"day":1},"君主·埃尔梅罗二世事件簿::哈特雷斯":{"year":1994,"month":1,"day":1},"char-44a05a57ba22":{"year":1994,"month":1,"day":1},"君主·埃尔梅罗二世事件簿::弗利乌":{"year":1994,"month":1,"day":1},"char-325362c4a5f1":{"year":1994,"month":1,"day":1},"君主·埃尔梅罗二世事件簿::梅尔文":{"year":1994,"month":1,"day":1},"char-f2184c0ce476":{"year":1994,"month":1,"day":1},"君主·埃尔梅罗二世事件簿::橙子":{"year":1994,"month":1,"day":1},"char-56435458664b":{"year":1994,"month":1,"day":1},"君主·埃尔梅罗二世事件簿::清玄":{"year":1994,"month":1,"day":1},"char-f3630945376a":{"year":1994,"month":1,"day":1},"君主·埃尔梅罗二世事件簿::爱斯缇拉":{"year":1994,"month":1,"day":1},"char-858fa885d448":{"year":1994,"month":1,"day":1},"君主·埃尔梅罗二世事件簿::特莉夏":{"year":1994,"month":1,"day":1},"char-ee0f539ceda7":{"year":1994,"month":1,"day":1},"君主·埃尔梅罗二世事件簿::白银姬":{"year":1994,"month":1,"day":1},"char-23f8011630fe":{"year":1994,"month":1,"day":1},"君主·埃尔梅罗二世事件簿::罗莎琳德":{"year":1994,"month":1,"day":1},"char-64d9704ccf70":{"year":1994,"month":1,"day":1},"君主·埃尔梅罗二世事件簿::蒂娅德拉":{"year":1994,"month":1,"day":1},"char-11731945dd38":{"year":1994,"month":1,"day":1},"君主·埃尔梅罗二世事件簿::西萨蒙德":{"year":1994,"month":1,"day":1},"char-7d2a9957ccfd":{"year":1994,"month":1,"day":1},"君主·埃尔梅罗二世事件簿::贝尔萨克":{"year":1994,"month":1,"day":1},"char-f32e96bd17a5":{"year":1994,"month":1,"day":1},"君主·埃尔梅罗二世事件簿::阿特拉姆":{"year":1994,"month":1,"day":1},"char-487547f9f621":{"year":1994,"month":1,"day":1},"君主·埃尔梅罗二世事件簿::露维雅":{"year":1994,"month":1,"day":1},"char-d9f3b47ca437":{"year":1985,"month":1,"day":1},"君主·埃尔梅罗二世的冒险::君主·埃尔梅罗二世":{"year":1985,"month":1,"day":1},"char-0e1b1380a0c9":{"year":2000,"month":1,"day":1},"君主·埃尔梅罗二世的冒险::格蕾":{"year":2000,"month":1,"day":1},"char-eff3ddfa4121":{"year":2000,"month":1,"day":1},"君主·埃尔梅罗二世的冒险::莱妮丝":{"year":2000,"month":1,"day":1},"char-6e7b013a414f":{"year":1987,"month":2,"day":3},"君主·埃尔梅罗二世的冒险::远坂凛":{"year":1987,"month":2,"day":3},"char-ee76b025098f":{"year":1998,"month":1,"day":1},"君主·埃尔梅罗二世的冒险::露维亚瑟琳塔":{"year":1998,"month":1,"day":1},"char-711110ae5325":{"year":2000,"month":1,"day":1},"君主·埃尔梅罗二世的冒险::埃尔戈":{"year":2000,"month":1,"day":1},"char-4187581afef1":{"year":1995,"month":1,"day":1},"君主·埃尔梅罗二世的冒险::拜隆":{"year":1995,"month":1,"day":1},"char-72c54e7324e6":{"year":2005,"month":1,"day":1},"君主·埃尔梅罗二世的冒险::拉提奥":{"year":2005,"month":1,"day":1},"char-65349a09aa39":{"year":1994,"month":8,"day":8},"我的青春恋爱物语果然有问题::比企谷八幡":{"year":1994,"month":8,"day":8},"char-fe93084205cc":{"year":1994,"month":1,"day":3},"我的青春恋爱物语果然有问题::雪之下雪乃":{"year":1994,"month":1,"day":3},"char-c2524a4c3868":{"year":1994,"month":6,"day":18},"我的青春恋爱物语果然有问题::由比滨结衣":{"year":1994,"month":6,"day":18},"char-405f3555da5c":{"year":1995,"month":4,"day":16},"我的青春恋爱物语果然有问题::一色彩羽":{"year":1995,"month":4,"day":16},"char-b61b512dbc4b":{"year":1982,"month":12,"day":7},"我的青春恋爱物语果然有问题::平冢静":{"year":1982,"month":12,"day":7},"char-74e256ec1f12":{"year":1995,"month":1,"day":1},"我的青春恋爱物语果然有问题::叶山隼人":{"year":1995,"month":1,"day":1},"char-a14f5bb52915":{"year":1994,"month":5,"day":9},"我的青春恋爱物语果然有问题::户冢彩加":{"year":1994,"month":5,"day":9},"char-947cfd175c6c":{"year":1997,"month":3,"day":3},"我的青春恋爱物语果然有问题::比企谷小町":{"year":1997,"month":3,"day":3},"char-7b51f1e51b69":{"year":1990,"month":7,"day":7},"我的青春恋爱物语果然有问题::雪之下阳乃":{"year":1990,"month":7,"day":7},"char-6967c226a3d5":{"year":1995,"month":1,"day":1},"我的青春恋爱物语果然有问题::材木座义辉":{"year":1995,"month":1,"day":1},"char-69ff70118cb0":{"year":1994,"month":12,"day":12},"我的青春恋爱物语果然有问题::三浦优美子":{"year":1994,"month":12,"day":12},"char-5374fa0f010e":{"year":1995,"month":1,"day":1},"我的青春恋爱物语果然有问题::海老名姬菜":{"year":1995,"month":1,"day":1},"char-bb40b4c4928c":{"year":1994,"month":10,"day":26},"我的青春恋爱物语果然有问题::川崎沙希":{"year":1994,"month":10,"day":26},"char-d8cfa08ba6dc":{"year":1995,"month":1,"day":1},"我的青春恋爱物语果然有问题::户部翔":{"year":1995,"month":1,"day":1},"char-b84b65d4b1a2":{"year":1994,"month":6,"day":26},"我的青春恋爱物语果然有问题::相模南":{"year":1994,"month":6,"day":26},"char-d7cde8fcb04e":{"year":1994,"month":1,"day":1},"我的青春恋爱物语果然有问题::城廻巡":{"year":1994,"month":1,"day":1},"char-8dfce424d3e2":{"year":1995,"month":1,"day":1},"我的青春恋爱物语果然有问题::折本香织":{"year":1995,"month":1,"day":1},"char-1331970f4e83":{"year":1995,"month":1,"day":1},"我的青春恋爱物语果然有问题::仲町千佳":{"year":1995,"month":1,"day":1},"char-f1520d0b03eb":{"year":1995,"month":1,"day":1},"我的青春恋爱物语果然有问题::玉绳":{"year":1995,"month":1,"day":1},"char-e5679534b45b":{"year":2001,"month":1,"day":1},"我的青春恋爱物语果然有问题::鹤见留美":{"year":2001,"month":1,"day":1},"char-2f109205d713":{"year":1997,"month":1,"day":1},"我的青春恋爱物语果然有问题::川崎大志":{"year":1997,"month":1,"day":1},"char-5ffb4e23fa19":{"year":2006,"month":1,"day":1},"我的青春恋爱物语果然有问题::川崎京华":{"year":2006,"month":1,"day":1},"char-ce14caa47d89":{"year":1995,"month":1,"day":1},"我的青春恋爱物语果然有问题::大和":{"year":1995,"month":1,"day":1},"char-cae21f4e0899":{"year":1995,"month":1,"day":1},"我的青春恋爱物语果然有问题::大冈":{"year":1995,"month":1,"day":1},"char-56bb6ac56431":{"year":1995,"month":1,"day":1},"我的青春恋爱物语果然有问题::秦野":{"year":1995,"month":1,"day":1},"char-5aea679c69e5":{"year":1995,"month":1,"day":1},"我的青春恋爱物语果然有问题::冈本":{"year":1995,"month":1,"day":1},"char-ef8db8e3666d":{"year":1966,"month":1,"day":1},"我的青春恋爱物语果然有问题::雪之下母亲":{"year":1966,"month":1,"day":1},"char-10e23bc3b9d9":{"year":1966,"month":1,"day":1},"我的青春恋爱物语果然有问题::雪之下父亲":{"year":1966,"month":1,"day":1},"char-c8069cad2a67":{"year":1971,"month":1,"day":1},"我的青春恋爱物语果然有问题::由比滨母亲":{"year":1971,"month":1,"day":1},"char-18b69cb9b6d7":{"year":1971,"month":1,"day":1},"我的青春恋爱物语果然有问题::比企谷母亲":{"year":1971,"month":1,"day":1},"char-4a5d6cdc372e":{"year":1971,"month":1,"day":1},"我的青春恋爱物语果然有问题::比企谷父亲":{"year":1971,"month":1,"day":1},"char-be55cee503c0":{"year":2010,"month":1,"day":1},"我的青春恋爱物语果然有问题::卡玛库拉":{"year":2010,"month":1,"day":1},"char-bec49f24550b":{"year":2010,"month":1,"day":1},"我的青春恋爱物语果然有问题::萨布雷":{"year":2010,"month":1,"day":1},"char-38a591a71727":{"year":2001,"month":1,"day":1},"我的青春恋爱物语果然有问题::由香":{"year":2001,"month":1,"day":1},"char-45281d5394cc":{"year":2001,"month":1,"day":1},"我的青春恋爱物语果然有问题::仁美":{"year":2001,"month":1,"day":1},"char-e6c98ab0e41f":{"year":2001,"month":1,"day":1},"我的青春恋爱物语果然有问题::小森":{"year":2001,"month":1,"day":1},"char-7b72bc7ea72d":{"year":2001,"month":1,"day":1},"我的青春恋爱物语果然有问题::优子":{"year":2001,"month":1,"day":1},"char-248e5779de3e":{"year":1995,"month":1,"day":1},"我的青春恋爱物语果然有问题::遥":{"year":1995,"month":1,"day":1},"char-0101e40c26ae":{"year":1981,"month":1,"day":1},"我的青春恋爱物语果然有问题::厚木":{"year":1981,"month":1,"day":1},"char-f1f0aeb4d739":{"year":1996,"month":1,"day":1},"我的青春恋爱物语果然有问题::本牧牧人":{"year":1996,"month":1,"day":1},"char-acfff84f9508":{"year":1996,"month":1,"day":1},"我的青春恋爱物语果然有问题::藤泽沙和子":{"year":1996,"month":1,"day":1},"char-be6d512f2205":{"year":1996,"month":1,"day":1},"我的青春恋爱物语果然有问题::稻村纯":{"year":1996,"month":1,"day":1},"char-c5597d39c019":{"year":1995,"month":1,"day":1},"我的青春恋爱物语果然有问题::2年F班同学群体":{"year":1995,"month":1,"day":1},"char-5b7e12392c86":{"year":1995,"month":1,"day":1},"我的青春恋爱物语果然有问题::叶山集团":{"year":1995,"month":1,"day":1},"char-b35a9bdfcfb7":{"year":1996,"month":1,"day":1},"我的青春恋爱物语果然有问题::总武高中学生会":{"year":1996,"month":1,"day":1},"char-2a81f567a88e":{"year":1996,"month":1,"day":1},"我的青春恋爱物语果然有问题::海滨综合高中学生会":{"year":1996,"month":1,"day":1},"char-71c01bf7b58f":{"year":1995,"month":1,"day":1},"我的青春恋爱物语果然有问题::文化祭执行委员会":{"year":1995,"month":1,"day":1},"char-f96c25d7aacb":{"year":2001,"month":1,"day":1},"我的青春恋爱物语果然有问题::林间学校小学生女子组":{"year":2001,"month":1,"day":1},"char-b9b578524a7d":{"year":1997,"month":1,"day":1},"我的青春恋爱物语果然有问题::补习班学生群体":{"year":1997,"month":1,"day":1},"char-3270d79e84c5":{"year":1995,"month":1,"day":1},"我的青春恋爱物语果然有问题::富冈":{"year":1995,"month":1,"day":1},"char-1be1dc8cc16d":{"year":1991,"month":1,"day":1},"我的青春恋爱物语果然有问题::相扑小姐":{"year":1991,"month":1,"day":1},"char-5cf21c0cf6e4":{"year":2005,"month":1,"day":1},"我的青春恋爱物语果然有问题::麻花辫妹妹":{"year":2005,"month":1,"day":1},"char-c11784fbd27b":{"year":1976,"month":1,"day":1},"我的青春恋爱物语果然有问题::胡子先生":{"year":1976,"month":1,"day":1},"char-4ab3a21bd3ff":{"year":1976,"month":1,"day":1},"我的青春恋爱物语果然有问题::油头先生":{"year":1976,"month":1,"day":1},"char-ba9f068ee70d":{"year":1996,"month":1,"day":1},"我的青春恋爱物语果然有问题::书记妹妹":{"year":1996,"month":1,"day":1},"char-620324abede0":{"year":2001,"month":1,"day":1},"我的青春恋爱物语果然有问题::龙套川":{"year":2001,"month":1,"day":1},"char-db688a4d1bdb":{"year":2001,"month":1,"day":1},"我的青春恋爱物语果然有问题::弓滨":{"year":2001,"month":1,"day":1},"char-96a6bd59642f":{"year":1996,"month":10,"day":3},"魔法少女小圆::鹿目圆":{"year":1996,"month":10,"day":3},"char-83a592766b67":{"year":1997,"month":1,"day":1},"魔法少女小圆::晓美焰":{"year":1997,"month":1,"day":1},"char-b41960d5bf05":{"year":1996,"month":9,"day":20},"魔法少女小圆::美树沙耶香":{"year":1996,"month":9,"day":20},"char-1016cf22c0ca":{"year":1996,"month":1,"day":1},"魔法少女小圆::巴麻美":{"year":1996,"month":1,"day":1},"char-27f0169134d8":{"year":1997,"month":1,"day":1},"魔法少女小圆::佐仓杏子":{"year":1997,"month":1,"day":1},"char-a5d65106b8b9":{"year":1986,"month":1,"day":1},"魔法少女小圆::早乙女和子":{"year":1986,"month":1,"day":1},"char-db0b7039794f":{"year":7989,"month":1,"day":1},"魔法少女小圆::丘比":{"year":7989,"month":1,"day":1}};


;// ---- catalog.js ----
/**
 * Fate 作品与可操控角色目录。
 */
window.GameModules = window.GameModules || {};

window.GameModules.catalog = {
  data: null,
  catalogUrl: 'character-catalog.json',

  async load() {
    if (window.GameModules.cache.enabled('catalog') && this.data) return this.data;
    const fetched = await this.fetchCatalog();
    if (fetched) {
      if (window.GameModules.cache.enabled('catalog')) this.data = fetched;
      return fetched;
    }
    const inline = window.GameData?.characterCatalog;
    if (inline) {
      if (window.GameModules.cache.enabled('catalog')) this.data = inline;
      return inline;
    }
    throw new Error('角色目录未加载');
  },

  async fetchCatalog() {
    const urls = ['./character-catalog.json', 'character-catalog.json'];
    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        return await res.json();
      } catch (_) {}
    }
    return null;
  },

  current() {
    return window.GameModules.cache.enabled('catalog') ? this.data : window.GameData?.characterCatalog;
  },

  firstWork() {
    return this.current()?.works?.[0]?.name || '';
  },

  works() {
    return this.current()?.works || [];
  },

  characters(workName) {
    return this.works().find((work) => work.name === workName)?.characters || [];
  },

  firstCharacter(workName) {
    return this.characters(workName)[0]?.id || '';
  },

  find(characterId) {
    for (const work of this.works()) {
      const found = work.characters.find((character) => character.id === characterId);
      if (found) return found;
    }
    return null;
  },
};


;// ---- catalog-actions.js ----
window.GameModules = window.GameModules || {};

window.GameModules.catalogActions = {
  async loadCatalog() {
    try {
      await window.GameModules.catalog.load();
      this.works = window.GameModules.catalog.works();
      this.selectedWork = this.selectedWork || window.GameModules.catalog.firstWork();
      this.selectedCharacterId = window.GameModules.catalog.firstCharacter(this.selectedWork) || this.selectedCharacterId;
      window.GameModules.characterBrief.ensure(this);
    } catch (err) {
      console.error('角色目录加载失败:', err.message, err.stack);
    }
  },

  loadStartupPlayerConfig() {
    this.applyStartupTextModels?.();
  },

  ensureCatalogSelection() {
    const catalog = window.GameModules.catalog;
    if (!catalog) return;
    try {
      const works = catalog.works?.() || this.works || [];
      if (!this.selectedWork) this.selectedWork = works[0]?.name || '';
      if (!this.selectedCharacterId && this.selectedWork) {
        this.selectedCharacterId = catalog.firstCharacter?.(this.selectedWork) || '';
      }
      const found = this.selectedCharacterId ? catalog.find?.(this.selectedCharacterId) : null;
      if (found) this.character = found;
    } catch (err) {
      console.warn('[角色目录] 恢复目录选择失败:', err?.message || err);
    }
  },
};


;// ---- ai/ai.js ----
/**
 * AI 剧情请求与结果解析。
 */
window.GameModules = window.GameModules || {};

window.GameModules.ai = {
  latestRequestId: 0,
  async withRetry(fn, max = 3) {
    for (let i = 0; i < max; i += 1) {
      try {
        return await fn();
      } catch (err) {
        const retryable = window.dzmm?.errors?.isDzmmError?.(err) && err.retryable;
        if (!retryable || i === max - 1) throw err;
        await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** i));
      }
    }
  },

  async generate(store, action, logId = null) {
    const requestId = ++this.latestRequestId;
    console.debug('[AI推演] 分阶段请求开始:', { requestId, action, model: store.modelId, character: store.character?.name, work: store.character?.work });
    try {
      const loop = await window.GameModules.realWorldAgentLoop.runStory(store, action, logId);
      if (requestId !== this.latestRequestId) throw new Error('剧情推演请求已被新请求取代');
      const result = { ...loop.result, source: 'ai' };
      if (logId && store.attachNovelPrompt) store.attachNovelPrompt(logId, { systemPrompt: loop.prompt || '', userPrompt: action || '无，继续推进', model: store.modelId, promptTokens: Math.ceil(String(loop.prompt || '').length / 2), loadedContext: loop.loaded || [] });
      result.agentTrace = loop.trace || [];
      await store.applyResult(result, logId);
    } catch (err) {
      console.error('AI 推演失败:', err.code, err.message, err.stack);
      if (requestId === this.latestRequestId) {
        this.latestRequestId += 1;
        await store.applyResult({ ...window.GameModules.createFallbackResult(store, action), source: 'fallback' }, logId);
      }
    }
  },

  parse(content, store, action) {
    try {
      const data = window.GameModules.jsonUtils.parseLoose(content);
      console.debug('[AI推演] JSON解析成功:', Object.keys(data));
      return { ...this.normalize(data, store, action), source: 'ai' };
    } catch (err) {
      const recovered = window.GameModules.jsonUtils.recoverAiResult(content);
      if (recovered) {
        console.debug('[AI推演] JSON不完整，已恢复可用字段:', { fields: Object.keys(recovered), error: err.message });
        return { ...this.normalize(recovered, store, action), source: 'ai' };
      }
      console.debug('AI 返回解析失败，使用兜底:', err.message);
      return { ...window.GameModules.createFallbackResult(store, action), source: 'fallback' };
    }
  },

  normalize(data, store, action) {
    const fallback = { ...window.GameModules.createFallbackResult(store, action), source: 'fallback' };
    const changes = data.statChanges || {};
    return {
      sceneTitle: String(data.sceneTitle || fallback.sceneTitle).slice(0, 12),
      elapsedSeconds: this.clampElapsed(data.elapsedSeconds, fallback.elapsedSeconds),
      thinking: store.thinkingMode ? String(data.thinking || fallback.thinking || '').slice(0, 220) : '',
      narration: String(data.narration || fallback.narration),
      speech: String(data.speech || fallback.speech),
      mind: String(data.mind || ''),
      mood: ['冷静', '紧张', '愤怒', '动摇', '信任', '恐惧', '好奇', '坚定'].includes(data.mood) ? data.mood : fallback.mood,
      trust: this.clampNumber(data.trust, fallback.trust),
      resistance: this.clampNumber(data.resistance, fallback.resistance),
      quest: String(data.quest || fallback.quest).slice(0, 24),
      characterIntent: String(data.characterIntent || '').slice(0, 80),
      controlFeeling: String(data.controlFeeling || fallback.controlFeeling || '疑惑').slice(0, 40),
      controlAdaptation: this.clampNumber(data.controlAdaptation, fallback.controlAdaptation || 0),
      controlExperienceSummary: String(data.controlExperienceSummary || fallback.controlExperienceSummary || '').slice(0, 80),
      metricUpdates: this.normalizeMetricUpdates(data.metricUpdates),
      choices: this.normalizeChoices(data.choices, fallback.choices),
      appearedCharacters: Array.isArray(data.appearedCharacters) ? data.appearedCharacters.slice(0, 6).map((x) => this.normalizeCharacter(x, store)).filter(Boolean) : fallback.appearedCharacters,
      solidifiableCharacters: Array.isArray(data.solidifiableCharacters) ? data.solidifiableCharacters.slice(0, 6).map((x) => this.normalizeCharacter(x, store)).filter(Boolean) : [],
      statChanges: { health: this.clampVitalDelta(changes.health), stamina: this.clampVitalDelta(changes.stamina), mental_stability: this.clampVitalDelta(changes.mental_stability) },
      combatEvent: this.normalizeCombatEvent(data.combatEvent),
      lexiconUpdates: this.normalizeLexiconUpdates(data.lexiconUpdates, store),
    };
  },


  normalizeMetricUpdates(value, state = null) {
    const source = value || {};
    return {
      emotions: this.normalizeMetricGroup(source.emotions, window.GameModules.metrics.emotionKeys, state?.metrics?.emotions || null),
      playerFeelings: this.normalizeMetricGroup(source.playerFeelings, window.GameModules.metrics.playerKeys, state?.metrics?.playerFeelings || null),
    };
  },

  normalizeInitialMetricUpdates(value, fallback, store) {
    const source = value || fallback || {};
    return { emotions: this.normalizeInitialGroup(source.emotions, null, window.GameModules.metrics.emotionKeys, store, 'emotion'), playerFeelings: this.normalizeInitialGroup(source.playerFeelings, null, window.GameModules.metrics.playerKeys, store, 'player') };
  },

  normalizeMetricKey(rawKey = '', keys = []) {
    const key = String(rawKey || '').trim();
    if (keys.includes(key)) return key;
    const aliases = { 羞涩: '羞耻', 羞怯: '羞耻', 害羞: '羞耻', 依恋: '依赖' };
    return keys.includes(aliases[key]) ? aliases[key] : key;
  },

  metricDeltaValue(item = {}) {
    return window.GameModules.metrics.metricDeltaValue?.(item) ?? 0;
  },

  normalizeMetricGroup(value, keys, currentValues = null) {
    const main = Array.isArray(value) ? value : [];
    const used = new Set();
    const fixed = keys.map((key) => {
      const item = main.find((x) => this.normalizeMetricKey(x?.key, keys) === key);
      if (!item) return null;
      used.add(item);
      const rawDelta = window.GameModules.metrics.clampDelta(this.metricDeltaValue(item));
      const fallbackValues = window.Alpine?.store?.('game')?.[keys === window.GameModules.metrics.emotionKeys ? 'emotions' : 'playerFeelings'];
      const current = window.GameModules.metrics.clamp((currentValues || fallbackValues)?.[key] || 0);
      const delta = window.GameModules.metrics.lockedPlayerDelta?.(key, rawDelta, current) ?? rawDelta;
      const nextValue = window.GameModules.metrics.clamp(current + delta);
      const firstReason = Array.isArray(item.reasons) ? item.reasons.find(Boolean) || {} : {};
      const reason = String(item.reason || item.evidence || item.trigger || firstReason.evidence || firstReason.trigger || item.explanation || item.cause || '').slice(0, 180);
      const rawStatus = String(item.status || item.程度 || item.解释 || '').trim();
      const status = window.GameModules.metrics.resolveMetricStatus(key, nextValue, rawStatus);
      const statusFromAi = Boolean(rawStatus) && status === window.GameModules.metrics.cleanMetricStatus(rawStatus) && !window.GameModules.metrics.isGenericMetricStatus(rawStatus, key);
      return { key, delta, status: String(status).slice(0, 180), reason, metricSources: { 数值: 'AI', 解释: statusFromAi ? 'AI' : '系统', 原因: 'AI' } };
    }).filter(Boolean);
    const temporary = main.filter((item) => item && !used.has(item)).map((item) => {
      const key = String(item.key || '').trim();
      if (!key || keys.includes(this.normalizeMetricKey(key, keys))) return null;
      const rawDelta = window.GameModules.metrics.clampDelta(this.metricDeltaValue(item));
      const firstReason = Array.isArray(item.reasons) ? item.reasons.find(Boolean) || {} : {};
      const reason = String(item.reason || item.evidence || item.trigger || firstReason.evidence || firstReason.trigger || item.explanation || item.cause || item.status || '').slice(0, 180);
      const status = String(item.status || (reason ? `${key}：短期状态，因为${reason}。` : `${key}：短期状态。`)).slice(0, 180);
      return { key, delta: rawDelta, status, reason, temporary: true, metricSources: { 数值: 'AI', 解释: 'AI', 原因: 'AI' } };
    }).filter(Boolean);
    return [...fixed, ...temporary];
  },

  normalizeInitialGroup(value, fallback, keys, store, type) {
    const list = Array.isArray(value) ? value : (Array.isArray(fallback) ? fallback : []);
    const actor = this.actorPronoun(store);
    return list.filter((item) => keys.includes(item?.key)).map((item) => {
      const metricValue = window.GameModules.metrics.clamp(item.value);
      const stage = window.GameModules.metrics.stageFor(item.key, metricValue);
      return {
        key: item.key,
        value: metricValue,
        status: String(item.status || this.fallbackMetricStatus(actor, item.key, stage, type)).slice(0, 120),
        reason: String(item.reason || this.fallbackMetricReason(actor, item.key, type)).slice(0, 160),
      };
    });
  },

  actorPronoun(store) {
    const c = store?.character || {};
    return /男性|男人|少年|青年|父亲|哥哥|弟弟|叔叔|丈夫|王子|皇帝/.test(`${c.name || ''} ${c.role || ''} ${c.detail || ''}`) ? '他' : '她';
  },

  fallbackMetricStatus(actor, key, stage, type) {
    if (type === 'emotion') return `${actor}的${key}处于“${stage}”：这项情绪正在影响${actor}对当前处境的反应。`;
    if (key === '爱情') return stage === '无感' ? `${actor}看着你时没有恋爱意义上的心动。` : `${actor}看到你时心里扑通扑通，似乎是${stage}了。`;
    if (key === '了解') return `${actor}对你的了解处于“${stage}”：${actor}只掌握你显露出的少量线索，还无法确认你的身份、来历和真正意图。`;
    return `${actor}对你的${key}处于“${stage}”：这项感觉正在影响${actor}如何看待你。`;
  },

  fallbackMetricReason(actor, key, type) {
    if (type === 'emotion') return `你介入了${actor}的行动与处境，使${actor}的${key}随当前剧情发生波动。`;
    if (key === '了解') return `${actor}只知道你能影响这具身体，还没有从你这里得到足以确认身份、来历或意图的信息。`;
    if (key === '信任') return `你曾直接影响${actor}的身体与行动权，所以${actor}暂时难以完全信任你。`;
    if (key === '警惕') return `${actor}不知道你下一步会如何使用这具身体，所以仍然对你保持戒备。`;
    return `你与${actor}的关系还没有出现足以明显改变${key}的具体事件。`;
  },

  choiceText(item) {
    if (typeof item === 'string' || typeof item === 'number') return String(item);
    if (!item || typeof item !== 'object') return '';
    return String(item.text || item.action || item.label || item.title || item.name || item.value || '').trim();
  },

  normalizeChoices(value, fallback) {
    const base = Array.isArray(fallback) ? fallback : [];
    const list = Array.isArray(value) ? value : [];
    const merged = list.concat(base).map((item) => this.choiceText(item).slice(0, 14)).filter(Boolean);
    return [...new Set(merged)].slice(0, 4);
  },

  normalizeCombatEvent(value) {
    if (!value || typeof value !== 'object') return null;
    if (!Number.isFinite(value.effectiveDamage) && !Number.isFinite(value.attackPower) && !value.summary) return null;
    return {
      summary: String(value.summary || '战斗命中，按攻防差结算。').slice(0, 80),
      attackPower: Number.isFinite(value.attackPower) ? Math.round(value.attackPower) : undefined,
      defensePower: Number.isFinite(value.defensePower) ? Math.round(value.defensePower) : undefined,
      effectiveDamage: Number.isFinite(value.effectiveDamage) ? Math.max(0, Math.round(value.effectiveDamage)) : undefined,
    };
  },

  normalizeCharacter(value, store, worldOverride = '') {
    const fallbackWork = String(worldOverride || store?.currentWorldTag?.() || store?.character?.work || '原创世界');
    const work = String(fallbackWork || '原创世界').slice(0, 40);
    if (typeof value === 'string') return { name: value.slice(0, 16), work, worldTag: work, isMinor: false, importance: 'support' };
    if (!value?.name) return null;
    const importance = ['minor', 'support', 'main'].includes(value.importance) ? value.importance : (value.isMinor ? 'minor' : 'support');
    return { name: String(value.name).slice(0, 16), role: String(value.role || (value.isMinor ? '路人' : '出场人物')).slice(0, 18), detail: String(value.detail || value.intro || value.desc || value.summary || '').slice(0, 120), personality: String(value.personality || '').slice(0, 80), wearing: value.wearing || value.clothing || value.outfit || '', work, worldTag: work, isMinor: Boolean(value.isMinor), importance };
  },

  clampNumber(value, fallback) { return Math.max(0, Math.min(100, Number.isFinite(value) ? Math.round(value) : fallback)); },
  clampElapsed(value, fallback = 60) { const n = Number(value); return Number.isFinite(n) ? Math.max(1, Math.min(2592000, Math.round(n))) : fallback; },
  clampVitalDelta(value) { return Number.isFinite(value) ? Math.max(-8, Math.min(8, Math.round(value))) : 0; },
};


;// ---- ai/ai-lexicon.js ----
window.GameModules = window.GameModules || {};

Object.assign(window.GameModules.ai, {
  normalizeLexiconUpdates(value, store = {}) {
    const list = Array.isArray(value) ? value : [];
    const out = [];
    for (const item of list) {
      const normalized = this.normalizeLexiconUpdateItem(item, store);
      if (normalized) out.push(normalized);
      if (out.length >= 20) break;
    }
    return out;
  },

  normalizeLexiconKind(item = {}) {
    const kind = String(item?.kind || '').trim();
    if (kind) return kind.slice(0, 16);
    if (item?.term || item?.definition || item?.synonyms || item?.aliases) return '专用术语';
    return String(item?.type || '词条').trim().slice(0, 16);
  },

  normalizeLexiconUpdateItem(item, store = {}) {
    const name = String(item?.name || item?.term || item?.field || '').trim().slice(0, 32);
    const kind = this.normalizeLexiconKind(item);
    const reason = String(item?.reason || item?.modifyReason || '').trim().slice(0, 120);
    if (!name || !kind) return null;
    const safeReason = reason || 'AI根据当前上下文记录了这次词条变化。';
    const value = Object.prototype.hasOwnProperty.call(item, 'value') ? item.value : (item?.definition || item?.description || item?.summary || null);
    const update = {
      worldTag: String(item.worldTag || store.character?.work || '原创世界').slice(0, 40),
      kind,
      name,
      value,
      summary: String(item.summary || item.definition || item.description || safeReason).slice(0, 80),
      description: String(item.description || item.definition || safeReason).slice(0, 240),
      reason: safeReason,
      source: 'ai',
      aiGenerated: true,
      changeMode: 'AI演算',
    };
    const aliases = Array.isArray(item?.aliases) ? item.aliases : item?.synonyms;
    if (Array.isArray(aliases)) update.aliases = aliases.map((alias) => String(alias).trim()).filter(Boolean).slice(0, 6);
    if (item?.type && !item?.kind) update.meta = { termType: String(item.type).slice(0, 32) };
    const target = String(item?.target || item?.targetId || item?.characterId || item?.owner || '').trim();
    if (item?.field) update.field = String(item.field).trim().slice(0, 32);
    if (target) {
      update.target = target.slice(0, 64);
      update.targetId = target.slice(0, 64);
    }
    if (item?.characterId) update.characterId = String(item.characterId).trim().slice(0, 64);
    if (kind === '角色卡' || kind === '角色技能') update.changeMode = kind === '角色技能' ? '角色卡词条添加Skill' : '角色卡词条修改Skill';
    return update;
  },
});


;// ---- actions.js ----
/**
 * Store 行为扩展：资料查询与存档。
 */
window.GameModules = window.GameModules || {};

window.GameModules.actions = {
  async refreshRagContext(action) {
    const aliases = (this.character.aliases || []).join(' ');
    const query = `${action} ${this.sceneTitle} ${this.quest} ${this.character.work || ''} ${this.character.name} ${aliases}`;
    console.log('[资料检索] 回合检索开始:', { query, sourceHint: this.character.work });
    const results = await window.GameModules.rag.search(query, { limit: 3, sourceHint: this.character.work, strictSource: true });
    console.log('[资料检索] 回合检索完成:', results.map((x) => ({ title: x.title, score: x.ragScore, length: String(x.text || '').length })));
    this.ragResults = results;
    this.ragContext = window.GameModules.rag.formatContext(results);
  },

  metricGroups(state = null) {
    if (!state || state.id === this.character?.id) {
      window.GameModules.metrics.ensure(this);
      return [
        { title: '情绪', type: 'emotion', values: this.emotions, ready: this.metricsReady },
        { title: '感觉', type: 'player', values: this.playerFeelings, ready: this.metricsReady },
        { title: '临时情绪', type: 'emotion:temporary', values: this.temporaryEmotions || {}, ready: this.metricsReady },
        { title: '临时感觉', type: 'player:temporary', values: this.temporaryPlayerFeelings || {}, ready: this.metricsReady },
      ];
    }
    const metrics = this.ensureStateMetrics(state);
    return [
      { title: '情绪', type: 'emotion', values: metrics.emotions, ready: true },
      { title: '感觉', type: 'player', values: metrics.playerFeelings, ready: true },
      { title: '临时情绪', type: 'emotion:temporary', values: metrics.temporaryEmotions || {}, ready: true },
      { title: '临时感觉', type: 'player:temporary', values: metrics.temporaryPlayerFeelings || {}, ready: true },
    ];
  },

  ensureStateMetrics(state) {
    const fresh = window.GameModules.metrics.fresh();
    state.metrics = state.metrics || {};
    state.metrics.emotions = window.GameModules.metrics.fill(state.metrics.emotions, window.GameModules.metrics.emotionKeys, fresh.emotions);
    state.metrics.playerFeelings = window.GameModules.metrics.fill(state.metrics.playerFeelings, window.GameModules.metrics.playerKeys, fresh.playerFeelings);
    state.metrics.temporaryEmotions = state.metrics.temporaryEmotions && typeof state.metrics.temporaryEmotions === 'object' ? state.metrics.temporaryEmotions : {};
    state.metrics.temporaryPlayerFeelings = state.metrics.temporaryPlayerFeelings && typeof state.metrics.temporaryPlayerFeelings === 'object' ? state.metrics.temporaryPlayerFeelings : {};
    state.metrics.notes = state.metrics.notes || {};
    return state.metrics;
  },

  metricEntries(group) { return Object.entries(group.values).map(([key, value]) => ({ key, value, text: this.metricValueText(value, group.ready) })); },

  metricValueText(value, ready = this.metricsReady) { return ready && Number.isFinite(Number(value)) ? value : '--'; },

  metricCollapsedItems() {
    window.GameModules.metrics.ensure(this);
    const list = window.GameModules.metrics.emotionKeys.map((key) => ({ key, value: this.emotions[key], text: this.metricValueText(this.emotions[key]) }));
    return list.slice(0, Math.max(1, this.metricSummaryLimit || 3));
  },

  installMetricSummaryObserver(el) {
    if (!window.ResizeObserver || !el) return;
    if (this.metricSummaryObserver) this.metricSummaryObserver.disconnect();
    let frame = 0;
    const update = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = 0;
        this.refreshMetricSummaryLimit(el);
      });
    };
    this.metricSummaryObserver = new ResizeObserver(update);
    this.metricSummaryObserver.observe(el);
    update();
  },

  refreshMetricSummaryLimit(el) {
    const line = el?.querySelector?.('.metrics-collapsed-line');
    if (!line) return;
    const available = Math.max(40, line.clientWidth - 82);
    let used = 0;
    let count = 0;
    for (const key of window.GameModules.metrics.emotionKeys) {
      const text = `${key}${this.metricValueText(this.emotions[key])}`;
      const width = Array.from(text).length * 12 + 10;
      if (used + width > available) break;
      used += width + 5;
      count += 1;
    }
    const next = Math.max(1, count);
    if (this.metricSummaryLimit !== next) this.metricSummaryLimit = next;
  },
  metricNote(type, key, state = null) {
    const target = this.metricTargetForNote(type, key, state);
    const metrics = window.GameModules.metrics;
    if (!target.ready) return `定义: ${target.description}\n字段值来源: 数值=系统 / 解释=系统 / 原因=系统\n解释: 等待推演，数值尚未完成初始化。\n变化原因: 数值正在刷新，尚未完成初始推演。`;
    const isTemporary = String(type || '').includes('temporary');
    const value = metrics.clamp(target.value ?? 0);
    const rawReason = String(target.raw?.reason || '').trim();
    const reason = metrics.cleanMetricReason(rawReason, key) || '缺少AI生成的变化原因，请重新生成角色卡或推进剧情。';
    const rawStatus = String(target.raw?.status || '').trim();
    const status = metrics.resolveMetricStatus(key, value, rawStatus, { temporary: isTemporary });
    const sources = target.raw?.metricSources || {};
    const sourceText = `数值=${sources.数值 || '系统'} / 解释=${sources.解释 || '系统'} / 原因=${sources.原因 || '系统'}`;
    return `定义: ${target.description}\n字段值来源: ${sourceText}\n解释: ${status}\n变化原因: ${reason}`;
  },
  metricTargetForNote(type, key, state = null) {
    const metrics = state ? this.ensureStateMetrics(state) : {
      emotions: this.emotions,
      playerFeelings: this.playerFeelings,
      temporaryEmotions: this.temporaryEmotions || {},
      temporaryPlayerFeelings: this.temporaryPlayerFeelings || {},
      notes: this.metricNotes,
    };
    const values = type === 'emotion:temporary'
      ? metrics.temporaryEmotions
      : (type === 'player:temporary' ? metrics.temporaryPlayerFeelings : (type === 'emotion' ? metrics.emotions : metrics.playerFeelings));
    return { value: values?.[key], raw: metrics.notes?.[`${type}:${key}`], ready: state ? true : this.metricsReady, description: window.GameModules.metrics.descriptions[key] || key };
  },

  toggleMetric(type, key) {
    const id = `${type}:${key}`;
    this.expandedMetricKey = this.expandedMetricKey === id ? '' : id;
  },

  isMetricOpen(type, key) {
    return this.expandedMetricKey === `${type}:${key}`;
  },

  feedbackText() {
    return this.feedbackSource === 'ai' ? (this.mindText || '--') : '--';
  },

  feedbackPlan() {
    return this.feedbackSource === 'ai' ? (this.characterIntent || '--') : '--';
  },

  feedbackSourceText() {
    return this.feedbackSource === 'ai' ? 'AI生成' : '本地兜底';
  },

  feedbackSummary() {
    const text = this.feedbackText();
    const summary = text.length > 18 ? `${text.slice(0, 18)}…` : text;
    return `【${this.feedbackSourceText()}】${summary} / ${this.feedbackPlan()}`;
  },

  loreNames(list, key) {
    return (Array.isArray(list) ? list : []).map((item) => item?.[key] || '').filter(Boolean).join('、') || '无';
  },

  async searchLore() {
    const query = this.ragQuery.trim();
    if (!query || this.ragBusy) return;
    this.ragBusy = true;
    this.ragError = '';
    try {
      const results = await window.GameModules.rag.search(query, { limit: 5, sourceHint: this.character.work });
      this.ragResults = results;
      this.ragContext = window.GameModules.rag.formatContext(results);
    } catch (err) {
      console.error('资料查询失败:', err.message, err.stack);
      this.ragError = '资料查询失败，请稍后重试';
    } finally {
      this.ragBusy = false;
    }
  },

  addLog(type, speaker, text) {
    this.log.push({ id: this.nextId++, type, speaker, text });
    if (this.log.length > 40) this.log.shift();
    this.scrollLog();
  },

  scrollLog() {
    queueMicrotask(() => {
      const el = document.querySelector('.app-window .story-log') || document.querySelector('.story-log');
      if (el) el.scrollTop = el.scrollHeight;
    });
  },

  async save() {
    await window.GameModules.storage.put(window.GameModules.storage.snapshot(this));
    if (this.refreshSaveMetas) await this.refreshSaveMetas();
  },

  async resetGame() {
    if (this.busy) return;
    this.busy = true;
    try {
      await window.GameModules.storage.remove(this.selectedSlot);
      await window.GameModules.storage.open(this.selectedSlot);
      this.started = false;
      this.turn = 1;
      this.sceneTitle = '裂隙前厅';
      this.mood = '冷静';
      this.trust = 45;
      this.resistance = 20;
      const metrics = window.GameModules.metrics.fresh();
      this.emotions = metrics.emotions;
      this.playerFeelings = metrics.playerFeelings;
      this.temporaryEmotions = {};
      this.temporaryPlayerFeelings = {};
      this.metricsReady = false;
      this.metricNotes = {};
      this.expandedMetricKey = '';
      this.quest = '确认操控连接';
      this.mindText = '';
      this.feedbackSource = 'pending';
      this.characterIntent = '';
      this.choices = window.GameModules.config.openingChoices;
      this.log = [];
      this.nextId = 1;
      this.ragContext = '';
      this.memoryContext = '';
      this.ragResults = [];
      this.rpgStates = {};
      this.rpgPanelCharacterId = this.selectedCharacterId;
      this.profileOpen = false;
      this.metricsOpen = false;
      this.feedbackOpen = false;
      this.savePanelOpen = false;
      await this.refreshSaveMetas();
    } finally {
      this.busy = false;
    }
  },
};


;// ---- novel-log.js ----
/**
 * 小说记录：玩家行动、作者叙事与可折叠心理。
 */
window.GameModules = window.GameModules || {};

Object.assign(window.GameModules.actions, {
  addNovelEntry(playerText, options = {}) {
    const entry = {
      id: this.nextId++,
      kind: 'novel',
      type: this.online ? 'player' : 'advice',
      playerText,
      playerVisible: options.playerVisible !== false,
      storyText: '作者正在续写这一段剧情…',
      thinking: '',
      speech: '',
      mind: '',
      promptPack: null,
      characterCardChanges: [],
      cardChangesOpen: false,
      solidifyCards: [],
      solidifyOpen: false,
      solidifySelectedKey: '',
      thinkingOpen: false,
      streaming: true,
    };
    this.log.push(entry);
    if (this.log.length > 40) this.log.shift();
    this.scrollLog();
    return entry.id;
  },

  normalizeNovelThinking(text) {
    const value = String(text || '').trim();
    return /AI\s*正在整理角色状态|正在整理角色状态、玩家输入/.test(value) ? '' : value;
  },

  updateNovelEntry(id, patch = {}) {
    const entry = this.log.find((item) => item.id === id);
    if (!entry) return;
    if (Object.prototype.hasOwnProperty.call(patch, 'thinking')) patch.thinking = this.normalizeNovelThinking(patch.thinking);
    Object.assign(entry, patch);
    this.log = [...this.log];
    this.scrollLog();
  },

  attachNovelPrompt(id, promptPack) {
    this.updateNovelEntry(id, { promptPack });
  },

  openNovelPrompt(id) {
    const entry = this.log.find((item) => item.id === id);
    if (!entry?.promptPack) return;
    this.promptDialogEntry = entry;
    this.promptDialogTab = 'system';
    this.promptDialogOpen = true;
  },

  promptDialogText() {
    const pack = this.promptDialogEntry?.promptPack || {};
    return this.promptDialogTab === 'user' ? pack.userPrompt : pack.systemPrompt;
  },

  updateNovelStream(id, raw) {
    const entry = this.log.find((item) => item.id === id);
    if (!entry) return false;
    const thinking = this.thinkingMode ? this.extractStreamingField(raw, 'thinking') : '';
    const text = this.extractStreamingField(raw, 'narration');
    const patch = { streaming: true };
    let changed = !entry.streaming;
    if (thinking && thinking !== entry.thinking) {
      patch.thinking = thinking;
      patch.thinkingOpen = true;
      changed = true;
    }
    if (text && text !== entry.storyText) {
      patch.storyText = text;
      changed = true;
    }
    if (changed) this.updateNovelEntry(id, patch);
    return changed;
  },

  updateStoryAgentStream(id, raw) {
    const entry = this.log.find((item) => item.id === id);
    if (!entry) return false;
    const text = window.GameModules.realWorldAi?.formatNarration?.(raw, 100) || String(raw || '').trim();
    if (!text || text === entry.storyText) return false;
    this.updateNovelEntry(id, { storyText: text, streaming: true });
    return true;
  },

  finalizeNovelEntry(id, result) {
    if (!id) return false;
    const entry = this.log.find((item) => item.id === id);
    if (!entry) return false;
    const speech = result.speech ? `\n\n「${result.speech}」` : '';
    this.updateNovelEntry(id, {
      storyText: `${result.narration || '剧情继续向前推进。'}${speech}`,
      thinking: this.thinkingMode ? (result.thinking || entry.thinking || '') : '',
      thinkingOpen: false,
      mind: result.mind || '',
      characterCardChanges: result.characterCardChanges || [],
      cardChangesOpen: false,
      solidifyCards: result.solidifyCards || [],
      solidifyOpen: Boolean(result.solidifyOpen),
      solidifySelectedKey: result.solidifySelectedKey || this.solidifyKey?.((result.solidifyCards || [])[0]) || '',
      streaming: false,
    });
    return true;
  },

  toggleNovelThinking(id) {
    const entry = this.log.find((item) => item.id === id);
    if (!entry) return;
    entry.thinkingOpen = !entry.thinkingOpen;
    this.log = [...this.log];
  },

  toggleCardChanges(entry) {
    if (!entry) return;
    entry.cardChangesOpen = !entry.cardChangesOpen;
    this.log = [...this.log];
    this.realWorldLog = [...(this.realWorldLog || [])];
    this.wechatMessagesByContact = { ...(this.wechatMessagesByContact || {}) };
  },

  novelLogEntries() {
    return (this.log || []).filter((entry) => entry.kind === 'novel').map((entry) => ({
      ...entry,
      playerVisible: entry.playerVisible !== false && !/《我狠狠控制》APP里选中/.test(entry.playerText || ''),
      thinking: this.normalizeNovelThinking(entry.thinking),
    }));
  },

  legacyLogText(entry) {
    return `${entry.speaker || '记录'}：${entry.text || ''}`;
  },

  extractStreamingField(raw, field) {
    const text = String(raw || '').replace(/```(?:json)?|```/g, '');
    const match = text.match(new RegExp(`"${field}"\\s*:\\s*"([\\s\\S]*)`));
    if (!match) return '';
    let value = match[1];
    const end = value.search(/"\s*,\s*"(?:thinking|narration|speech|mind|mood|trust|resistance|quest|characterIntent|controlFeeling|controlAdaptation|controlExperienceSummary|metricUpdates|choices|appearedCharacters|statChanges|combatEvent)"/);
    if (end >= 0) value = value.slice(0, end);
    value = value.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\').trim();
    return value.length ? value : '';
  },
});


;// ---- core/debug.js ----
/**
 * 调试日志工具：统一输出阶段、耗时和错误信息。
 */
window.GameModules = window.GameModules || {};

window.GameModules.debug = {
  start(label, data = {}) {
    const token = { label, startedAt: performance.now() };
    console.log(`${label} 开始:`, data);
    return token;
  },

  done(token, data = {}) {
    console.log(`${token.label} 完成:`, { ...data, ms: Math.round(performance.now() - token.startedAt) });
  },

  fail(token, err, data = {}) {
    console.warn(`${token.label} 失败:`, { ...data, code: err?.code, message: err?.message, stack: err?.stack, ms: Math.round(performance.now() - token.startedAt) });
  },

  step(label, data = {}) {
    console.log(`${label}:`, data);
  },
};


;// ---- control-monitor.js ----
/**
 * 控制上线监视器：确认点击、Alpine 方法和全局错误是否触发。
 */
window.GameModules = window.GameModules || {};
console.log('[控制监视] 脚本已加载', { readyState: document.readyState, time: new Date().toISOString() });

window.addEventListener('error', (event) => {
  console.error('[控制监视] window error:', event.message, event.filename, event.lineno, event.colno, event.error?.stack);
});

window.addEventListener('unhandledrejection', (event) => {
  const err = event.reason;
  console.error('[控制监视] unhandledrejection:', err?.code, err?.message || err, err?.stack);
});

document.addEventListener('click', (event) => {
  const el = event.target?.closest?.('button');
  if (!el) return;
  const text = String(el.textContent || '').trim();
  const expr = el.getAttribute('@click') || el.getAttribute('x-on:click') || '';
  if (!/开始连接|控制|confirmControl|start\(\)/.test(`${text} ${expr}`)) return;
  const store = window.Alpine?.store?.('game');
  console.log('[控制监视] 捕获按钮点击:', {
    text,
    expr,
    disabled: el.disabled,
    hasStore: Boolean(store),
    busy: store?.busy,
    loading: store?.loading,
    started: store?.started,
    entrySetupOpen: store?.entrySetupOpen,
    hasStart: typeof store?.start,
    hasConfirmControl: typeof store?.confirmControl,
    entryStartReady: Boolean(store?.entryTimeOptions?.start),
  });
}, true);

document.addEventListener('alpine:init', () => {
  console.log('[控制监视] alpine:init 已触发');
  queueMicrotask(() => setTimeout(() => {
    const store = window.Alpine?.store?.('game');
    console.log('[控制监视] store 检查:', {
      hasStore: Boolean(store),
      hasStart: typeof store?.start,
      hasConfirmControl: typeof store?.confirmControl,
      hasRunLoggedControlTask: typeof store?.runLoggedControlTask,
    });
    if (store) window.GameModules.controlMonitor.wrap(store);
  }, 0));
});

window.GameModules.controlMonitor = {
  wrap(store) {
    ['start', 'prepareEntrySetup', 'confirmControl', 'runLoggedControlTask'].forEach((name) => {
      if (typeof store[name] !== 'function' || store[name].__monitored) return;
      const original = store[name];
      store[name] = async function monitoredMethod(...args) {
        console.log(`[控制监视] 方法进入 ${name}:`, { args, busy: this.busy, started: this.started, entrySetupOpen: this.entrySetupOpen });
        try {
          const result = await original.apply(this, args);
          console.log(`[控制监视] 方法完成 ${name}:`, { busy: this.busy, started: this.started, entrySetupOpen: this.entrySetupOpen, logCount: this.log?.length });
          return result;
        } catch (err) {
          console.error(`[控制监视] 方法异常 ${name}:`, err?.code, err?.message, err?.stack);
          throw err;
        }
      };
      store[name].__monitored = true;
    });
  },
};


;// ---- loading-actions.js ----
/**
 * 启动加载阶段：无依赖任务并行，有依赖任务串行。
 */
window.GameModules = window.GameModules || {};

window.GameModules.loadingActions = {
  resetLoadingStages() {
    const now = Date.now();
    this.loadingStartedAt = now;
    this.loadingNow = now;
    this.loadingStages = [
      { key: 'sdk', name: '平台连接', status: 'waiting', startedAt: 0, finishedAt: 0 },
      { key: 'catalog', name: '角色目录', status: 'waiting', startedAt: 0, finishedAt: 0 },
      { key: 'user', name: '玩家配置', status: 'waiting', startedAt: 0, finishedAt: 0 },
      { key: 'slots', name: '存档扫描', status: 'waiting', startedAt: 0, finishedAt: 0 },
      { key: 'db', name: '当前存档', status: 'waiting', startedAt: 0, finishedAt: 0 },
      { key: 'rpg', name: 'RPG 缓存', status: 'waiting', startedAt: 0, finishedAt: 0 },
    ];
    this.startLoadingTimer();
  },

  startLoadingTimer() {
    if (this.loadingTimer) return;
    const tick = () => {
      this.loadingNow = Date.now();
      this.loadingClockTick = (Number(this.loadingClockTick) || 0) + 1;
      if (this.loading || this.roleCardLoadingState?.open) {
        this.syncLoadingStepHeadline?.();
      }
    };
    tick();
    this.loadingTimer = setInterval(tick, 1000);
  },

  stopLoadingTimerIfIdle() {
    const roleOpen = Boolean(this.roleCardLoadingState?.open);
    if ((this.loading || roleOpen) && this.loadingTimer) return;
    clearInterval(this.loadingTimer);
    this.loadingTimer = null;
  },

  setStage(key, status, detail = '') {
    const now = Date.now();
    this.loadingStages = this.loadingStages.map((x) => {
      if (x.key !== key) return x;
      return { ...x, status, startedAt: x.startedAt || (status === 'running' ? now : 0), finishedAt: ['done', 'error'].includes(status) ? now : x.finishedAt };
    });
    if (detail) this.loadingDetail = detail;
    this.syncLoadingStepHeadline();
  },

  syncLoadingStepHeadline() {
    const running = (this.loadingStages || []).find((stage) => stage.status === 'running');
    if (running) {
      this.loadingStep = `${running.name}：${this.stageText(running.status)}`;
      return;
    }
    const latest = [...(this.loadingStages || [])].reverse().find((stage) => stage.status === 'done' || stage.status === 'error');
    this.loadingStep = latest ? `${latest.name}：${this.stageText(latest.status)}` : this.loadingStep;
  },

  stageText(status) {
    return { waiting: '等待中', running: '加载中', done: '完成', error: '失败' }[status] || status;
  },

  formatDuration(ms = 0) {
    const total = Math.max(0, Math.floor(Number(ms || 0) / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h) return `${h}h${m}m${s}s`;
    if (m) return `${m}m${s}s`;
    return `${s}s`;
  },

  elapsedText(startedAt = 0, finishedAt = 0) {
    if (!startedAt) return '';
    const end = finishedAt || this.loadingNow || Date.now();
    const ms = Math.max(0, end - startedAt);
    if (ms < 1000) return '<1s';
    return this.formatDuration(ms);
  },

  stageElapsedLabel(startedAt = 0, finishedAt = 0) {
    void this.loadingClockTick;
    return this.elapsedText(startedAt, finishedAt);
  },

  loadingProgressPercent() {
    void this.loadingClockTick;
    const stages = this.loadingStages || [];
    if (!stages.length) return Math.min(100, Math.max(0, Math.round(Number(this.loadingBootPercent) || 0)));
    const total = stages.length || 1;
    const done = stages.filter((x) => x.status === 'done').length;
    const running = stages.filter((x) => x.status === 'running').length * 0.35;
    const stagePart = ((done + running) / total) * 80;
    return Math.min(100, Math.round(20 + stagePart));
  },

  loadingProgressText() {
    void this.loadingClockTick;
    const stages = this.loadingStages || [];
    if (!stages.length) return this.loadingBootMeta || '准备中';
    const total = stages.length || 0;
    const done = stages.filter((x) => x.status === 'done').length;
    return `${done}/${total} 阶段 · ${this.elapsedText(this.loadingStartedAt)}`;
  },

  roleCardLoadingProgressPercent() {
    const cards = this.roleCardLoadingState?.cards || [];
    const totals = cards.flatMap((card) => card.steps || []).reduce((acc, step) => ({ done: acc.done + (Number(step.done) || 0), total: acc.total + (Number(step.total) || 0) }), { done: 0, total: 0 });
    return totals.total ? Math.min(100, Math.round((totals.done / totals.total) * 100)) : 0;
  },

  async runStage(key, detail, fn) {
    console.log('[启动流程] 阶段开始:', key, detail);
    this.setStage(key, 'running', detail);
    try {
      const result = await fn();
      console.log('[启动流程] 阶段完成:', key);
      this.setStage(key, 'done');
      await (window.GameModules.assetLoader?.yieldMain?.() || Promise.resolve());
      return result;
    } catch (err) {
      console.warn('[启动流程] 阶段失败:', key, err.message, err.stack);
      this.setStage(key, 'error', `${detail}失败：${err.message || '未知错误'}`);
      throw err;
    }
  },

  async initGame() {
    this.loadingBootPercent = 100;
    this.loadingBootMeta = '资源已就绪';
    this.loadingStep = '正在初始化游戏';
    this.loadingDetail = '正在连接平台并恢复存档。';
    this.resetLoadingStages();
    await this.runStage('sdk', '正在连接 Gamefy SDK。', () => dzmmReady);
    await Promise.all([
      this.runStage('catalog', '正在读取作品、角色和本地设定库入口。', () => this.loadCatalog()),
      this.runStage('user', '正在准备本地玩家与模型默认值。', () => this.loadStartupPlayerConfig()),
      this.runStage('slots', '正在并行检查 10 个存档位。', () => this.refreshSaveMetas()),
    ]);
    await this.runStage('db', '正在打开当前 SQLite 存档。', async () => {
      await window.GameModules.storage.open(this.selectedSlot);
      const save = await window.GameModules.storage.get();
      window.GameModules.storage.restore(this, save);
      await this.migrateCurrentSaveWealthToOneHundredMillion?.();
      await this.loadWritingStyles();
    });
    await this.runStage('rpg', '正在从当前存档数据库恢复已保存的角色状态。', async () => {
      this.ensureCatalogSelection();
      this.loadSavedRpgStates();
    });
    this.loading = false;
    this.homeScreenView = 'menu';
    this.startStartupWarmup?.();
    this.startBackgroundAssetLoad?.();
    this.stopLoadingTimerIfIdle();
  },

  startBackgroundAssetLoad() {
    return window.GameModules.assetLoader?.prefetchAfterHome?.(this);
  },

  runDeferredInits() {
    if (this._deferredInitsDone) return;
    this._deferredInitsDone = true;
    this.initCompanySystem?.();
    this.initBossRecruitment?.();
    this.initCalendar?.();
    this.initFactionSystem?.();
    this.ensureAllCompanyFactions?.();
    this.initSkillsApp?.();
    this.initKnownProfessionApp?.();
    this.initTaobaoApp?.();
    this.initPromptApp?.();
    this.initTokenStatsApp?.();
  },

  ensureGameplayAssetsReady() {
    return window.GameModules.assetLoader?.ensureGameplayReady?.(this);
  },

  ensureNewGameAssetsReady() {
    return window.GameModules.assetLoader?.ensureNewGameReady?.(this);
  },

  startStartupWarmup() {
    if (this.startupWarmupPromise || !window.GameModules.sqliteSave.db) return this.startupWarmupPromise;
    this.startLoadingTimer();
    this.startupWarmupDone = false;
    this.startupWarmupPromise = this.runStartupWarmup().finally(() => { this.startupWarmupDone = true; this.stopLoadingTimerIfIdle(); });
    return this.startupWarmupPromise;
  },

  async runStartupWarmup() {
    console.log('[启动预热] 开始全量异步生成');
    const tasks = [];
    if (this.phoneSetupDone) {
      await this.syncRelationshipWechatUsers?.({ generateProfile: false, save: false });
      tasks.push(this.warmupTask('玩家身份', () => this.ensurePlayerRpgState?.()));
    }
    const contacts = (this.wechatUsers || []).filter((item) => item && !item.group);
    for (const contact of contacts) tasks.push(this.warmupTask(`微信联系人:${contact.name || contact.id}`, () => this.ensureWechatUserProfile?.(contact)));
    await Promise.all(tasks.map((task) => task()));
    console.log('[启动预热] 全量异步生成完成', { tasks: tasks.length });
    if (tasks.length) await this.save?.();
  },

  warmupTask(name, fn) {
    return async () => {
      try {
        console.log('[启动预热] 开始:', name);
        const result = await fn();
        console.log('[启动预热] 完成:', name);
        return result;
      } catch (err) {
        console.warn('[启动预热] 失败:', name, err?.message || 'unknown', err?.stack || '');
        return null;
      }
    };
  },
};


;// ---- solidify-actions.js ----
window.GameModules = window.GameModules || {};

window.GameModules.solidifyActions = {
  async collectSolidifiableCharacters(result = {}, mode = 'story') {
    const source = this.solidifySourceItems(result);
    const cards = await window.GameModules.characterIntroCard.ensureMany(this, source, mode);
    await this.syncSolidifyWearing?.(cards);
    return this.solidifyDisplayCards(cards);
  },

  solidifyParticipantName(item = '') {
    if (typeof item === 'string') return item.replace(/[（(].*$/u, '').trim();
    return String(item?.name || item?.characterName || item?.idOrName || '').trim();
  },

  solidifyLoadedMaterialItems(materials = []) {
    return (Array.isArray(materials) ? materials : []).map((item) => this.parseLoadedMaterialCharacter(item)).filter(Boolean);
  },

  parseLoadedMaterialCharacter(item = {}) {
    const text = [item?.title, item?.text, item?.content, item?.summary].map((part) => String(part || '').trim()).filter(Boolean).join('\n');
    if (!text) return null;
    const isRoleCard = /(?:^|\n)资料类型[:：]\s*(?:完整)?角色卡/u.test(text) || /(?:^|\n)角色ID[:：]/u.test(text);
    const isIntroCard = /(?:^|\n)资料类型[:：]\s*介绍卡/u.test(text);
    if (!isRoleCard && !isIntroCard) return null;
    const name = text.match(/(?:^|\n)姓名[:：]\s*([^\s｜|，,；;\n]+)/u)?.[1]?.trim().slice(0, 24) || '';
    if (!name || ['无', '玩家', '系统'].includes(name) || !this.solidifyLooksLikePersonName(name)) return null;
    const role = text.match(/(?:^|\n)身份[:：]\s*([^\n]+)/u)?.[1]?.trim().slice(0, 40) || '出场人物';
    const intro = text.match(/(?:^|\n)人物说明[:：]\s*([^\n]+)/u)?.[1]
      || text.match(/(?:^|\n)介绍[:：]\s*([^\n]+)/u)?.[1]
      || text.match(/(?:^|\n)性格[:：]\s*([^\n]+)/u)?.[1]
      || '';
    const worldTag = text.match(/(?:^|\n)世界[:：]\s*([^\n]+)/u)?.[1]?.trim().slice(0, 40)
      || window.GameModules.realWorld2026?.label
      || '';
    return { name, worldTag, role, intro: String(intro || '本回合载入的资料人物。').slice(0, 280) };
  },

  solidifyParticipantsFromTrace(trace = []) {
    const out = [];
    const groups = ['forcedParticipants', 'priorityCandidates', 'dramaCandidates', 'characters'];
    const anchorFields = ['强制出场'];
    (Array.isArray(trace) ? trace : []).forEach((item) => {
      groups.forEach((key) => {
        (Array.isArray(item?.[key]) ? item[key] : []).forEach((participant) => {
          const name = this.solidifyParticipantName(participant);
          if (name) out.push({ name, role: '出场人物' });
        });
      });
      const participantGroups = item?.participants;
      if (participantGroups && typeof participantGroups === 'object') {
        Object.values(participantGroups).flat().forEach((participant) => {
          const name = this.solidifyParticipantName(participant);
          if (name) out.push({ name, role: '出场人物' });
        });
      } else if (Array.isArray(participantGroups)) {
        participantGroups.forEach((participant) => {
          const name = this.solidifyParticipantName(participant);
          if (name) out.push({ name, role: '出场人物' });
        });
      }
      const anchorRoot = item?.anchorReport || {};
      const anchor = anchorRoot.values || anchorRoot;
      anchorFields.forEach((field) => {
        String(anchor[field] || '').split(/[、,，；;\n]/u).forEach((raw) => {
          const name = this.solidifyCleanPersonToken(raw);
          if (name) out.push({ name, role: 'current-scene' });
        });
      });
      this.solidifyPeopleFromAnchorReport(anchorRoot).forEach((row) => out.push(row));
    });
    return out;
  },

  solidifyCleanPersonToken(raw = '') {
    const name = String(raw || '')
      .replace(/^(?:人物|角色|人员)[:：]\s*/u, '')
      .replace(/[（(].*$/u, '')
      .trim();
    if (!name || name === '无') return '';
    if (/^(?:物品|地点|事实|系统)[:：]/u.test(String(raw || ''))) return '';
    return this.solidifyLooksLikePersonName(name) ? name : '';
  },

  solidifyPeopleFromAnchorReport(anchorRoot = {}) {
    const out = [];
    const structured = anchorRoot.sceneImpactObjects;
    if (structured && typeof structured === 'object') {
      (Array.isArray(structured.people) ? structured.people : []).forEach((raw) => {
        const name = this.solidifyCleanPersonToken(raw);
        if (name) out.push({ name, role: 'current-scene' });
      });
      return out;
    }
    const anchor = anchorRoot.values || anchorRoot;
    const text = String(anchor['当前场景影响对象'] || anchor.currentSceneImpactObjects || '').trim();
    if (!text) return out;
    const peopleMatch = text.match(/(?:人物|角色|人员)[:：]\s*([^；;|｜]+)/u);
    if (peopleMatch) {
      peopleMatch[1].split(/[、,，]/u).forEach((raw) => {
        const name = this.solidifyCleanPersonToken(raw);
        if (name) out.push({ name, role: 'current-scene' });
      });
      return out;
    }
    text.split(/[、,，；;\n]/u).forEach((raw) => {
      const name = this.solidifyCleanPersonToken(raw);
      if (name) out.push({ name, role: 'current-scene' });
    });
    return out;
  },

  solidifyMentionedRoleCards(narration = '') {
    const text = String(narration || '');
    if (!text) return [];
    return Object.values(this.rpgStates || {}).flatMap((state) => {
      const name = String(state?.profile?.name || state?.name || '').trim();
      return name && text.includes(name) ? [{ name, role: state?.profile?.role || '角色', worldTag: state?.worldTag || state?.profile?.work || '' }] : [];
    });
  },

  solidifySourceItems(result = {}) {
    const seen = new Set();
    const out = [];
    const playerName = String(this.playerName || this.playerProfile?.name || '').trim();
    const add = (item) => {
      if (!item) return;
      const raw = typeof item === 'string' ? { name: item } : item;
      const name = String(raw?.name || raw?.characterName || '').trim().slice(0, 24);
      if (!name || name === playerName || seen.has(name) || ['玩家', '系统', '无'].includes(name)) return;
      if (!this.solidifyLooksLikePersonName(name)) return;
      seen.add(name);
      out.push(raw);
    };
    [...(result.appearedCharacters || []), ...(result.solidifiableCharacters || [])].forEach(add);
    this.solidifyLoadedMaterialItems(result.promptPack?.loadedContext || []).forEach(add);
    this.solidifyLoadedMaterialItems(result.loadedContext || []).forEach(add);
    (Array.isArray(result.agentTrace) ? result.agentTrace : []).flatMap((item) => item?.loaded || []).forEach((item) => this.solidifyLoadedMaterialItems([item]).forEach(add));
    this.solidifyParticipantsFromTrace(result.agentTrace || []).forEach(add);
    this.solidifyMentionedRoleCards(result.narration || result.text || '').forEach(add);
    return out.slice(0, 8);
  },

  solidifySourceItemsFromEntry(entry = {}) {
    return this.solidifySourceItems({
      appearedCharacters: entry.appearedCharacters,
      solidifiableCharacters: entry.solidifiableCharacters,
      promptPack: entry.promptPack,
      agentTrace: entry.agentTrace,
      narration: entry.narration || entry.text,
    });
  },


  solidifyKey(card = {}) { return card?.name ? `${card.worldTag || ''}::${card.name}` : ''; },

  solidifyPersonName(card = {}) {
    return String(card?.name || '').replace(/^人物[:：]\s*/u, '').trim();
  },

  solidifyPersonKey(card = {}) {
    const name = this.solidifyPersonName(card);
    const world = String(card?.worldTag || card?.roleState?.worldTag || '').trim();
    return name ? `${world}::${name}` : '';
  },

  solidifyLooksLikePersonName(name = '') {
    const clean = String(name || '').replace(/^人物[:：]\s*/u, '').trim();
    if (!clean || clean.length < 2 || clean.length > 16) return false;
    if (/^(?:执行|继续|当前|系统|玩家|无)$/u.test(clean)) return false;
    if (/行动$|控制部$|控制体验$|结算$|目标$|状态$/u.test(clean)) return false;
    if (/抱住|抚摸|揉捏|询问|后退|执行|控制/u.test(clean)) return false;
    if (this.solidifyLooksLikeObjectOrSceneName(clean)) return false;
    return /^[\u4e00-\u9fff·]{2,16}$/u.test(clean);
  },

  solidifyLooksLikeObjectOrSceneName(name = '') {
    const clean = String(name || '').trim();
    if (!clean) return true;
    if (/^(?:以及|以及房间|以及.+|等物|等物品)$/u.test(clean)) return true;
    if (/(?:之类|等物|等物品|等)$/u.test(clean)) return true;
    return /^(?:被褥|枕头|床铺|床|被子|床单|被单|毯子|沙发|茶几|桌子|椅子|台灯|窗帘|门|墙|地板|房间|门铃|手机|电脑|电视|衣柜|抽屉|梳妆台|地毯|靠垫|抱枕|床单|席梦思|床垫|被芯|枕芯|床头|床尾|床架|床单|门把手|窗户|窗|镜|镜子|灯|音响|空调|风扇|暖气|暖气|垃圾桶|书包|背包|水杯|杯子|碗|盘|锅|刀|叉|勺|书|本|笔|纸|盒|袋|瓶|罐|箱|柜|架|栏|杆|绳|线|布|巾|袜|鞋|帽|镜|锁|钥|匙|卡|票|钱|币|物)$/u.test(clean)
      || /(?:被褥|枕头|床铺|沙发|窗帘|台灯|衣柜|梳妆台|门铃|空调|靠垫|抱枕)$/u.test(clean);
  },

  solidifyShouldSkipCard(card = {}) {
    const name = this.solidifyPersonName(card);
    if (!name || !this.solidifyLooksLikePersonName(name)) return true;
    const playerName = String(this.playerName || this.playerProfile?.name || '').trim();
    if (playerName && name === playerName) return true;
    if (card?.roleState?.id === 'player-self') return true;
    return false;
  },

  solidifyDisplayCards(list = this.solidifyState?.candidates || []) {
    const byKey = new Map();
    (Array.isArray(list) ? list : []).forEach((raw) => {
      const card = this.solidifyDisplayCard(raw);
      if (!card || this.solidifyShouldSkipCard(card)) return;
      const key = this.solidifyPersonKey(card);
      if (!key) return;
      const prev = byKey.get(key);
      if (!prev || (card.displayType === 'role' && prev.displayType !== 'role')) byKey.set(key, card);
    });
    return [...byKey.values()];
  },

  solidifyDisplayCard(card = {}) {
    if (!card?.name) return null;
    const state = window.GameModules.characterIntroCard.roleCardState(card);
    if (state) return { ...card, displayType: 'role', roleState: state, profile: state.profile || {}, role: state.profile?.role || card.role || '角色卡', intro: state.profile?.detail || card.intro || '完整角色卡已固化。' };
    return { ...card, displayType: 'intro' };
  },

  solidifyCandidates() { return this.solidifyDisplayCards(); },

  selectedSolidifyCard(entry = null) {
    const cards = this.solidifyEntryCards(entry);
    const key = entry ? (entry.solidifySelectedKey || this.solidifyKey(cards[0])) : (this.solidifyState?.selectedKey || this.solidifyKey(cards[0]));
    return cards.find((card) => this.solidifyKey(card) === key) || cards[0] || null;
  },

  solidifyEntryCards(entry = null) {
    if (!entry) return this.solidifyDisplayCards();
    const stored = Array.isArray(entry.solidifyCards) ? entry.solidifyCards : [];
    if (stored.length) return this.solidifyDisplayCards(stored);
    const intro = window.GameModules.characterIntroCard;
    const derived = this.solidifySourceItemsFromEntry(entry).map((item) => intro.normalize(item, this, entry.type === 'ai' ? 'real' : 'story')).filter(Boolean);
    return this.solidifyDisplayCards(derived);
  },

  solidifyPanelTitle(card = this.selectedSolidifyCard()) { return card?.displayType === 'role' ? '角色卡查看' : '介绍卡固化'; },

  solidifyTypeLabel(card = this.selectedSolidifyCard()) { return card?.displayType === 'role' ? '角色卡' : '介绍卡'; },

  solidifyDetailRows(card = this.selectedSolidifyCard()) {
    if (!card) return [];
    if (card.displayType !== 'role') return [
      ['世界', card.worldTag || '未知世界'],
      ['身份', card.role || '出场人物'],
      ['穿着', this.solidifyWearingText(card)],
      ['介绍', card.intro || '暂无介绍。'],
    ];
    const profile = card.profile || card.roleState?.profile || {};
    return [
      ['世界', card.roleState?.worldTag || card.worldTag || profile.work || '未知世界'],
      ['身份', profile.role || card.role || '角色卡'],
      ['穿着', this.solidifyWearingText(card.roleState || profile)],
      ['外貌', profile.appearance || '未记录'],
      ['性格', profile.personality || '未记录'],
      ['详情', profile.detail || card.intro || '完整角色卡已固化。'],
    ];
  },

  solidifyWearingText(source = {}) {
    const list = this.solidifyWearingItems(source);
    if (list.length) return list.map((item) => this.solidifyWearingItemText(item)).filter(Boolean).join('；') || '当前无明确穿着记录。';
    const raw = this.solidifyRawWearing(source);
    return String(raw || '当前无明确穿着记录。').slice(0, 260);
  },

  solidifyRawWearing(source = {}) {
    const values = source.values || {};
    const profile = source.profile || {};
    return values.wearing || source.wearingItems || source.wearing || profile.wearingItems || profile.wearing || source.clothing || source.outfit || source.dressedProfile || profile.dressedProfile || '';
  },

  solidifyWearingItems(source = {}, state = null) {
    const raw = this.solidifyRawWearing(source);
    const list = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? Object.values(raw).flat() : []);
    if (list.length) return list.map((item) => this.solidifyNormalizeWearingItem(item, state)).filter(Boolean);
    const text = String(raw || '').trim();
    if (!text || /^当前无明确|未记录|无$/u.test(text)) return [];
    return [this.solidifyNormalizeWearingItem({ name: text, slot: this.solidifyInferWearSlot(text), description: text, reason: '现实推演正文确认的当前穿着。' }, state)].filter(Boolean);
  },

  solidifyNormalizeWearingItem(item, state = null) {
    if (!item) return null;
    const p = window.GameModules.progression;
    const raw = typeof item === 'string' ? { name: item } : { ...item };
    const name = String(raw.name || raw.label || raw.description || '').trim();
    if (!name || name === '未穿戴' || name === '未记录') return null;
    const slot = p.canonicalWearSlot?.({ ...raw, slot: raw.slot || this.solidifyInferWearSlot(name) }) || raw.slot || '装备';
    return p.normalizeCarryItem?.({ ...raw, name, slot, description: raw.description || name, reason: raw.reason || '现实推演正文确认的当前穿着。', changeMode: '现实推演', source: 'AI生成' }, '穿着', state?.id || raw.ownerId || raw.characterId || '') || { ...raw, name, slot, type: '穿着' };
  },

  solidifyInferWearSlot(text = '') {
    if (/睡裙|连衣裙|裙|衬衫|T恤|上衣|背心|吊带/u.test(text)) return 'top';
    if (/裤|短裤|长裤|下装/u.test(text)) return 'bottom';
    if (/内衣|胸衣|文胸/u.test(text)) return 'innerwearTop';
    if (/内裤|底裤/u.test(text)) return 'innerwearBottom';
    if (/袜/u.test(text)) return 'socks';
    if (/鞋|靴/u.test(text)) return 'shoes';
    if (/外套|大衣|风衣/u.test(text)) return 'outerwear';
    return '装备';
  },

  solidifyWearingItemText(item) {
    if (!item) return '';
    if (typeof item === 'string') return item;
    const name = item.name || item.label || item.description || '';
    if (!name || name === '未穿戴' || name === '未记录') return '';
    const slot = item.slotLabel || item.clothing_position || item.slot || item.part || '';
    return `${slot ? `${slot}：` : ''}${name}`;
  },

  selectSolidifyCard(card) { this.solidifyState.selectedKey = this.solidifyKey(card); },

  selectEntrySolidifyCard(entry, card) {
    if (!entry || !card) return;
    entry.solidifySelectedKey = this.solidifyKey(card);
    entry.solidifyOpen = true;
    entry.solidifyUserClosed = false;
    if (entry.type === 'ai' || entry.type === 'system') window.GameModules.sqliteSave.saveRealWorldLogEntry?.(entry).catch((err) => console.warn('[现实日志] 角色卡面板状态保存失败:', err.message, err.stack));
    this.log = [...(this.log || [])];
    this.realWorldLog = [...(this.realWorldLog || [])];
  },

  closeSolidifyPanel() { this.solidifyState.open = false; },

  closeEntrySolidifyPanel(entry) {
    if (!entry) return;
    entry.solidifyOpen = false;
    entry.solidifyUserClosed = true;
    if (entry.type === 'ai' || entry.type === 'system') window.GameModules.sqliteSave.saveRealWorldLogEntry?.(entry).catch((err) => console.warn('[现实日志] 角色卡面板状态保存失败:', err.message, err.stack));
    this.log = [...(this.log || [])];
    this.realWorldLog = [...(this.realWorldLog || [])];
  },

  async solidifySelectedIntroCard(card = this.selectedSolidifyCard(), entry = null) {
    if (!card || card.displayType === 'role' || this.busy) return;
    const source = { id: `npc-${window.GameModules.characterProfile.slug(card.worldTag)}-${window.GameModules.characterProfile.slug(card.name)}`, name: card.name, work: card.worldTag, role: card.role, detail: card.intro, importance: 'support', isMinor: false };
    this.startRoleCardLoadingBatch?.([{ id: source.id, name: card.name, type: '角色卡', source, context: card.intro }]);
    await this.ensureRpgForCharacter(source, card.intro, { loadMetrics: false, allowManualSolidify: true });
    if (entry) {
      entry.solidifyCards = this.solidifyDisplayCards(entry.solidifyCards || []);
      entry.solidifySelectedKey = this.solidifyKey(card);
      entry.solidifyOpen = true;
      entry.solidifyUserClosed = false;
      if (entry.type === 'ai' || entry.type === 'system') window.GameModules.sqliteSave.saveRealWorldLogEntry?.(entry).catch((err) => console.warn('[现实日志] 角色卡面板状态保存失败:', err.message, err.stack));
      this.log = [...(this.log || [])];
      this.realWorldLog = [...(this.realWorldLog || [])];
    } else {
      this.solidifyState = { ...(this.solidifyState || {}), selectedKey: this.solidifyKey(card), open: true };
    }
  },
};


;// ---- wearing-sync-actions.js ----
window.GameModules = window.GameModules || {};

window.GameModules.wearingSyncActions = {
  async syncSolidifyWearing(cards = []) {
    for (const card of Array.isArray(cards) ? cards : []) await this.syncWearingForName(card.name, card.wearing || card.clothing || card.outfit, card);
  },

  async syncNarrationWearing(result = {}) {
    const text = String(result.narration || result.text || '');
    const names = new Set([
      ...(result.appearedCharacters || []).map((x) => x?.name),
      ...(result.solidifiableCharacters || []).map((x) => x?.name),
      ...(window.GameModules.sqliteSave.listCharacterStates?.() || []).map((x) => x?.profile?.name || x?.name),
    ].filter(Boolean));
    for (const name of names) {
      const wearing = this.extractNarrationWearing(text, name);
      if (wearing) await this.syncWearingForName(name, wearing, { name, worldTag: window.GameModules.realWorld2026?.label });
    }
  },

  extractNarrationWearing(text = '', name = '') {
    const safe = String(name || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!safe || !text.includes(name)) return '';
    const direct = [
      new RegExp(`${safe}[^。！？]{0,40}?穿着([^。！？]{2,80})`, 'u'),
      new RegExp(`${safe}[^。！？]{0,40}?一件([^。！？]{2,60})`, 'u'),
      new RegExp(`${safe}[^。！？]{0,40}?身上([^。！？]{2,80})`, 'u'),
    ].map((rx) => text.match(rx)?.[1]).find(Boolean);
    if (direct) return direct.replace(/，.*$/u, '').trim();
    const at = text.indexOf(name);
    const after = at >= 0 ? text.slice(at, at + 260) : '';
    const pronoun = after.match(/[她他其][^。！？]{0,30}?穿着([^。！？]{2,80})/u)?.[1];
    return pronoun ? pronoun.replace(/，.*$/u, '').trim() : '';
  },

  async syncWearingForName(name = '', raw = '', card = {}) {
    const state = window.GameModules.characterIntroCard.roleCardState({ ...card, name }) || this.itemSkillState?.(name);
    const items = this.solidifyWearingItems({ ...card, wearing: raw }, state);
    if (!state?.values || !items.length) return false;
    const p = window.GameModules.progression;
    p.ensureInventoryFields?.(state.values, state.id || '');
    const before = JSON.stringify(state.values.wearing || []);
    state.values.wearing = p.mergeProfileWearing?.(state.values.wearing || [], items) || items;
    if (state.profile) {
      state.profile.wearingItems = p.mergeProfileWearing?.(state.profile.wearingItems || [], items) || items;
      state.profile.wearing = p.mergeProfileWearing?.(state.profile.wearing || [], items) || items;
      state.profile.roleCardUpdatedAt = new Date().toISOString();
    }
    if (before === JSON.stringify(state.values.wearing || [])) return false;
    this.rpgStates = { ...(this.rpgStates || {}), [state.id]: state };
    await window.GameModules.sqliteSave.saveCharacterState?.(state);
    return true;
  },
};


;// ---- save-actions.js ----
window.GameModules = window.GameModules || {};
window.GameModules.saveActions = {
  async refreshSaveMetas() {
    const entries = await Promise.all(this.saveSlots.map(async (slot) => [slot, await window.GameModules.sqliteSave.inspectSlot(slot)]));
    this.saveMetas = Object.fromEntries(entries);
  },

  async refreshSaveMeta(slot) {
    if (!slot) return;
    this.saveMetas = { ...(this.saveMetas || {}), [slot]: await window.GameModules.sqliteSave.inspectSlot(slot) };
  },

  findEmptySaveSlot() {
    return (this.saveSlots || []).find((slot) => !this.saveMeta(slot).exists) || null;
  },

  /** 优先空槽，其次可复用的未完成激活存档 */
  findNewGameSaveSlot() {
    const slots = this.saveSlots || [];
    const empty = slots.find((slot) => !this.saveMeta(slot).exists);
    if (empty) return empty;
    return slots.find((slot) => {
      const meta = this.saveMeta(slot);
      return meta.exists && !meta.phoneSetupDone;
    }) || null;
  },
  saveMeta(slot) {
    return this.saveMetas[slot] || { slot, exists: false, savedAt: '', playerName: '', phoneSetupDone: false };
  },
  formatSaveTime(value) {
    if (!value) return '无存档';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '时间未知';
    return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  },
  async openSlot(slot) {
    this.selectedSlot = slot;
    await window.GameModules.storage.open(slot);
    const save = await window.GameModules.storage.get();
    if (save) window.GameModules.storage.restore(this, save);
    await this.loadWritingStyles();
    this.ensureCatalogSelection();
    this.loadSavedRpgStates();
  },
  async loadSlot(slot) {
    if (this.busy || !this.saveMeta(slot).exists) return;
    await this.openSlot(slot);
    await this.refreshSaveMetas();
    this.saveMessage = `已读取 ${slot}`;
    this.savePanelOpen = false;
    this.saveAppOpen = false;
  },
  async overwriteSlot(slot) {
    if (this.busy) return;
    const source = this.selectedSlot;
    await this.save();
    if (slot !== source) {
      const raw = await window.GameModules.sqliteSave.readRaw(source);
      await window.GameModules.storage.remove(slot);
      if (raw) await window.GameModules.sqliteSave.writeRaw(slot, raw);
      this.selectedSlot = slot;
      await window.GameModules.storage.open(slot);
      const save = await window.GameModules.storage.get();
      if (save) window.GameModules.storage.restore(this, save);
      await this.loadWritingStyles(); this.loadSavedRpgStates();
    }
    await this.refreshSaveMetas();
    this.saveMessage = slot === source ? `已覆盖保存 ${slot}` : `已完整复制当前数据并覆盖 ${slot}`;
  },
  async newSlot(slot) {
    if (this.saveMeta(slot).exists) {
      await window.GameModules.storage.remove(slot);
    }
    this.selectedSlot = slot;
    await window.GameModules.storage.open(slot, { deferPersist: true });
    await this.loadWritingStyles({ deferPersist: true, skipSave: true });
    this.started = false;
    this.turn = 1;
    this.log = [];
    this.rpgStates = {};
    this.rpgPanelCharacterId = this.selectedCharacterId;
    if (this.phoneSetupDone) await this.ensurePlayerRpgState?.(true);
    await Promise.resolve();
    await window.GameModules.sqliteSave.persist();
  },
  loadSavedRpgStates() {
    const states = window.GameModules.sqliteSave.listCharacterStates();
    const cleaned = states.map((state) => {
      const changed = window.GameModules.progression.ensureInventoryFields?.(state?.values, state?.id || '');
      if (changed) window.GameModules.sqliteSave.saveCharacterState(state).catch((err) => console.warn('[存档清洗] 角色穿着说明保存失败:', err.message, err.stack));
      return state;
    });
    this.rpgStates = Object.fromEntries(cleaned.map((state) => [state.id, state]));
    cleaned.forEach((state) => {
      if (!state?.profile?.initialMetrics) return;
      const changed = window.GameModules.rpgProfileMetrics?.refreshGenericNotes?.(state, state.profile);
      if (changed) window.GameModules.sqliteSave.saveCharacterState(state).catch((err) => console.warn('[存档] 刷新指标解释失败:', err.message, err.stack));
    });
    if (this.hasPlayerAspiration?.()) {
      this.syncEssentialPreferenceLayersToPlayerState?.().catch((err) => {
        console.warn('[存档] 同步玩家本质偏好失败:', err?.message || err);
      });
    }
    this.initFactionSystem?.();
    const report = window.GameModules.orgTerritory?.validateWorldConsistency?.(this);
    if (report?.fixes?.length) {
      window.GameModules.storage?.put?.(window.GameModules.storage.snapshot(this)).catch((err) => console.warn('[存档] 一致性自动修复保存失败:', err.message, err.stack));
      const player = this.rpgStates?.['player-self'];
      if (player) window.GameModules.sqliteSave.saveCharacterState(player).catch((err) => console.warn('[存档] 玩家位置同步保存失败:', err.message, err.stack));
    }
  },
  prepareRpgSchemaForSelectedWork() {
    if (!window.GameModules.sqliteSave.db || !this.character?.work) return null;
    const worldTag = this.character.work || '原创世界';
    return window.GameModules.rpgState.ensureSchema(worldTag).catch((err) => {
      console.warn('[RPG状态] schema 预热失败:', worldTag, err.message, err.stack);
      return null;
    });
  },
  prepareRpgForSelectedCharacter() {
    return this.prepareRpgSchemaForSelectedWork();
  },
  async ensureRpgForCharacter(character, context = '', options = {}) {
    if (!window.GameModules.sqliteSave.db || !character) return null;
    const worldTag = character.work || '原创世界';
    console.log('[RPG状态] 准备角色状态:', worldTag, character.name);
    let profile = null;
    try {
      profile = await window.GameModules.characterProfile.ensure(character, this, context || this.entryCurrentAction || this.sceneTitle || '');
      this.updateRoleCardLoadingStep?.(profile.id || character.id, 'state', 'running', '', { done: 0, total: 1 });
      const state = await window.GameModules.rpgState.ensureCharacter(profile, this);
      this.rpgStates = { ...this.rpgStates, [state.id]: state };
      if (options.loadMetrics !== false && state.id === this.character.id) this.loadMetricsFromCharacterState(state);
      this.rpgPanelCharacterId = this.rpgPanelCharacterId || state.id;
      this.finishRoleCardLoading?.(state.id, state.profile || profile);
      return state;
    } catch (err) {
      this.failRoleCardLoading?.(profile?.id || character.id || character.name, err.message || '角色卡生成失败');
      throw err;
    }
  },
  async ensureRpgForCurrentCharacter(options = {}) {
    if (!options.refresh && this.rpgStates[this.character.id]) {
      this.loadMetricsFromCharacterState(this.rpgStates[this.character.id]);
      return this.rpgStates[this.character.id];
    }
    return this.ensureRpgForCharacter(this.character, this.entryCurrentAction || this.sceneTitle || '');
  },
  async ensureRpgFromResults(result) {
    const entries = [this.character];
    const context = `${this.sceneTitle} ${this.quest} ${result.narration || ''}`;
    result.solidifyCards = await this.collectSolidifiableCharacters?.(result, 'story') || [];
    result.solidifyOpen = false;
    result.solidifySelectedKey = this.solidifyKey?.(result.solidifyCards[0]) || '';
    await Promise.all(entries.filter(Boolean).map((entry) => this.ensureRpgForCharacter(entry, context, { loadMetrics: entry.id === this.character.id })));
  },
  findKnownCharacter(name) {
    if (!name) return null;
    for (const work of this.works) {
      const hit = work.characters.find((char) => char.name === name || (char.aliases || []).includes(name));
      if (hit) return hit;
    }
    return null;
  },
  rpgVitals(state) {
    const values = state?.values || {};
    const percent = (pool) => pool?.max ? Math.round((pool.current / pool.max) * 100) : 100;
    const vital = (key, label, poolKey = key) => {
      const pool = values[poolKey];
      const note = values.vital_update_notes?.[poolKey];
      return { key, label, value: poolKey === 'stamina_pool' ? (values.stamina ?? percent(pool)) : percent(pool), text: note?.reason || this.rpgFieldValue(pool) };
    };
    return [
      { key: 'health', label: '生命力', value: values.health ?? percent(values.vitality), text: this.rpgFieldValue(values.vitality) },
      vital('stamina', '精力', 'stamina_pool'),
      vital('satiety', '饱食度'),
      vital('hydration', '水分'),
      vital('fatigue', '疲劳度'),
      vital('mental_stability', '精神稳定'),
    ];
  },
  rpgFieldValue(value) {
    if (Array.isArray(value)) return value.map((item) => this.rpgFieldValue(item));
    if (!value || typeof value !== 'object') return value;
    if (Object.prototype.hasOwnProperty.call(value, 'next')) return `${value.current || 0}/${value.next || 'max'}`;
    if (Object.prototype.hasOwnProperty.call(value, 'current') && Object.prototype.hasOwnProperty.call(value, 'max')) return `${value.current}/${value.max}`;
    if (value.type === '职业') return `${value.name} lv.${value.level || 1}`;
    if (Object.prototype.hasOwnProperty.call(value, 'sexualExperienceCount')) return `性经验${value.sexualExperienceCount || 0}次`;
    if (Object.values(value).some((item) => item?.partKey && item?.status)) return Object.values(value).map((item) => `${item.part || item.partKey}：${item.status || '稳定'}`).join('；');
    if (Object.prototype.hasOwnProperty.call(value, 'onlineCount')) {
      return `上线${value.onlineCount || 0}次｜${value.feeling || '未知'}｜适应${value.adaptation || 0}/100｜${value.summary || ''}`;
    }
    if (Object.prototype.hasOwnProperty.call(value, 'totalLevelUps')) return `累计升级${value.totalLevelUps || 0}次｜自动${value.autoPointsPerLevel || 1}点/级｜自由${value.freePointsPerLevel || 1}点/级`;
    if (value.attackPower || value.defensePower) return `攻${value.attackPower || 0}｜防${value.defensePower || 0}｜${value.damageRuleNote || ''}`;
    if (value.effectiveDamage !== undefined) return `${value.summary || '战斗模拟'}｜伤害${value.effectiveDamage}`;
    if (value.level) return `${value.name} lv${value.level}（${value.type || '能力'}）`;
    if (Object.prototype.hasOwnProperty.call(value, 'name') && (Object.prototype.hasOwnProperty.call(value, 'worldTag') || Object.prototype.hasOwnProperty.call(value, 'updatedAt') || Object.prototype.hasOwnProperty.call(value, 'reason'))) {
      return window.GameModules.characterQuery?.locationText?.(value)
        || [value.name, value.worldTag, value.reason].filter(Boolean).join('｜')
        || String(value.name || '未记录');
    }
    return JSON.stringify(value);
  },
  rpgEntries(state) {
    if (!state?.schema) return [];
    window.GameModules.progression.ensureStateMechanics(state, state.profile || {});
    window.GameModules.initPromptRegistry?.ensureTemplateState?.('intimacyBody', state);
    return state.schema.sections.map((section) => ({
      title: section.title,
      fields: section.fields
        .map((field) => {
          const raw = field.key === 'exp' ? window.GameModules.progression.normalizeCharacterExp(state.values.exp, state.values.level) : state.values[field.key];
          const display = window.GameModules.worldAttributes.displayValue(field, raw);
          const source = state.values.intrinsic_sources?.[field.key] || null;
          const kind = { factions: '社群角色', force_positions: '势力地位', items: '物品', wearing: '穿着', bodyStatus: '当前身体状态', intimacy: '亲密经历', status_tags: '状态', current_location: '位置' }[field.key] || '属性';
          const targetType = state.profile?.isPlayer ? '非角色' : '角色';
          const commonField = section.title !== '世界固有属性' && field.key !== 'world_tag';
          const reason = state.profile?.rpgFieldReasons?.[field.key] || '';
          return { key: field.key, stateId: state.id, label: field.label, kind, value: this.rpgFieldValue(display), raw, source, desc: field.desc || '', reason, worldTag: state.worldTag, targetType, commonField };
        }),
    })).filter((section) => section.fields.length);
  },
  memoryItems(kind) {
    const memory = this.currentMemory;
    if (kind === 'shortTerm') return [...(memory.shortTerm.recent || []), ...(memory.shortTerm.summarized || [])];
    if (kind === 'longTerm') return [...(memory.longTerm.vivid || []), ...(memory.longTerm.permanent || [])];
    return [];
  },
  memoryStatus(kind) {
    const memory = this.currentMemory;
    const m = window.GameModules.characterMemory;
    if (kind === 'shortTerm') return [m.statLine('刚发生记忆', m.stats(memory.shortTerm.recent, m.limits.recent)), m.statLine('近发生记忆', m.stats(memory.shortTerm.summarized, m.limits.summarized)), m.statLine('遗忘区', m.stats(memory.shortTerm.forgotten, m.limits.forgotten))].join('｜');
    return [m.statLine('难以忘记', m.stats(memory.longTerm.vivid, m.limits.vivid)), m.statLine('不可忘记', m.stats(memory.longTerm.permanent, m.limits.permanent))].join('｜');
  },
  async addManualMemory() {
    const text = this.memoryInput.trim();
    const state = this.currentRpgState;
    if (!text || !state) return;
    await window.GameModules.characterMemory.addManual(state.id, text, this);
    this.memoryInput = '';
  },
  async searchMemoryArchive() {
    const state = this.characterRpgState;
    const query = this.memoryArchiveQuery.trim();
    if (!state || !query) return;
    this.memoryArchiveResults = await window.GameModules.characterMemory.queryArchive(state.id, query);
  },
};


;// ---- home-actions.js ----
window.GameModules = window.GameModules || {};

window.GameModules.homeActions = {
  hasContinueSave() {
    return Boolean(this.latestSaveSlot());
  },

  latestSaveSlot() {
    const slots = this.saveSlots || [];
    const ranked = slots
      .map((slot) => ({ slot, meta: this.saveMeta(slot) }))
      .filter((item) => item.meta.exists && item.meta.phoneSetupDone)
      .sort((a, b) => new Date(b.meta.savedAt || 0) - new Date(a.meta.savedAt || 0));
    return ranked[0]?.slot || null;
  },

  saveSlotLabel(slot) {
    const meta = this.saveMeta(slot);
    if (!meta.exists) return '空存档位';
    if (meta.playerName) return meta.playerName;
    if (meta.phoneSetupDone) return '已激活存档';
    return '未完成激活';
  },

  async openHomeSavePanel() {
    this.homeMessage = '';
    await this.refreshSaveMetas?.();
    this.homeSavePanelOpen = true;
  },

  closeHomeSavePanel() {
    this.homeSavePanelOpen = false;
  },

  markSaveMeta(slot, patch = {}) {
    if (!slot) return;
    const prev = this.saveMeta(slot);
    this.saveMetas = {
      ...(this.saveMetas || {}),
      [slot]: { ...prev, slot, ...patch },
    };
  },

  async startNewGame() {
    if (this.busy) return;
    this.homeMessage = '';
    this.homeSavePanelOpen = false;
    this.busy = true;
    try {
      await this.refreshSaveMetas?.();
      const slot = this.findNewGameSaveSlot?.() || null;
      if (!slot) {
        this.homeMessage = '10 个存档位已满。请在存档面板中选择一个槽位「覆盖新建」，或删除不需要的存档。';
        this.homeSavePanelOpen = true;
        return;
      }
      try {
        await this.ensureNewGameAssetsReady?.();
      } catch (err) {
        console.warn('[首页] 新游戏资源加载失败:', err?.message || err);
      }
      await this.beginNewGameOnSlot(slot);
      this.homeScreenView = 'new-game';
    } catch (err) {
      console.error('[首页] 开始新游戏失败:', err.message, err.stack);
      this.homeMessage = err.message || '开始新游戏失败';
      this.homeScreenView = 'menu';
    } finally {
      this.busy = false;
    }
  },

  async startNewGameOnSlot(slot) {
    if (this.busy || !slot) return;
    const meta = this.saveMeta(slot);
    if (meta.exists && meta.phoneSetupDone) {
      const label = meta.playerName || '已有存档';
      if (!window.confirm(`确定覆盖 ${slot}（${label}）并开始新游戏？此操作不可撤销。`)) return;
    }
    this.busy = true;
    this.homeMessage = '';
    try {
      await this.refreshSaveMetas?.();
      try {
        await this.ensureNewGameAssetsReady?.();
      } catch (err) {
        console.warn('[首页] 新游戏资源加载失败:', err?.message || err);
      }
      await this.beginNewGameOnSlot(slot);
      this.homeScreenView = 'new-game';
      this.homeSavePanelOpen = false;
    } catch (err) {
      console.error('[首页] 开始新游戏失败:', err.message, err.stack);
      this.homeMessage = err.message || '开始新游戏失败';
      this.homeScreenView = 'menu';
    } finally {
      this.busy = false;
    }
  },

  async beginNewGameOnSlot(emptySlot) {
    this.phoneSetupDone = false;
    this.phoneActivationChoice = '';
    this.desktopUnlocked = false;
    this.started = false;
    await this.newSlot?.(emptySlot);
    this.playerName = '';
    this.playerProfile = {
      ...this.playerProfile,
      name: '',
      birthday: '',
      gender: '',
      city: '',
      dailyRole: '',
      livingStatus: '',
      relationships: '',
      relationshipEntries: [],
      notes: '',
    };
    this.setupError = '';
    this.playerAspiration = null;
    this.aspirationSetupOpen = false;
    this.log = [];
    this.turn = 1;
    this.markSaveMeta(emptySlot, {
      exists: true,
      savedAt: new Date().toISOString(),
      playerName: '',
      phoneSetupDone: false,
    });
  },

  backToHomeMenu() {
    this.homeMessage = '';
    this.homeSavePanelOpen = false;
    this.homeScreenView = 'menu';
    this.phoneActivationChoice = '';
    this.setupError = '';
  },

  setHomeLoadProgress(percent, label) {
    this.homeLoadActive = true;
    this.homeLoadPercent = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
    if (label != null && label !== '') this.homeLoadLabel = String(label);
  },

  clearHomeLoadProgress() {
    this.homeLoadActive = false;
    this.homeLoadPercent = 0;
    this.homeLoadLabel = '';
    this.homeLoadSlot = '';
  },

  yieldHomeLoadUi() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => setTimeout(resolve, 0));
    });
  },

  homeLoadProgressText() {
    return this.homeLoadLabel || '正在载入存档…';
  },

  homeLoadProgressDisplayPercent() {
    if (!this.homeLoadActive) return 0;
    const base = this.homeLoadPercent || 0;
    const assetPct = this.backgroundLoadPercent || 0;
    if (base <= 28 && assetPct > 0) {
      return Math.min(100, Math.round(8 + (assetPct * 20) / 100));
    }
    return base;
  },

  async loadGameplayAssetsWithHomeProgress(basePct = 8, spanPct = 22) {
    const loader = window.GameModules.assetLoader;
    if (!loader) return;
    if (loader._prefetchPromise) {
      this.setHomeLoadProgress(basePct + spanPct, '玩法模块已就绪');
      await loader._prefetchPromise;
      return;
    }
    const names = window.GameModules.bootManifest?.prefetchAfterHome || [];
    if (!names.length) {
      this.setHomeLoadProgress(basePct + spanPct, '玩法模块已就绪');
      return;
    }
    await loader.loadChunks(names, {
      onProgress: (p) => {
        const sub = p.percent ?? 0;
        const mapped = basePct + Math.round((spanPct * sub) / 100);
        this.setHomeLoadProgress(mapped, p.label || '加载微信、公司等应用模块…');
      },
    });
    this.runDeferredInits?.();
  },

  async continueGame() {
    if (this.busy) return;
    this.homeMessage = '';
    await this.refreshSaveMetas?.();
    const slot = this.latestSaveSlot();
    if (!slot) {
      this.homeMessage = '没有可继续的存档，请先开始新游戏。';
      return;
    }
    await this.loadSlotFromHome(slot);
  },

  async loadSlotFromHome(slot) {
    if (this.busy || !this.saveMeta(slot).exists) return;
    this.busy = true;
    this.homeLoadSlot = slot;
    this.setHomeLoadProgress(2, `准备载入 ${slot}…`);
    try {
      await this.yieldHomeLoadUi();
      await this.loadGameplayAssetsWithHomeProgress(8, 22);
      await this.yieldHomeLoadUi();
      this.setHomeLoadProgress(32, '合并应用能力…');
      window.GameModules.remergeGameStore?.();
      await this.yieldHomeLoadUi();
      this.setHomeLoadProgress(38, '读取存档并初始化世界…');
      await this.openSlot(slot);
      await this.yieldHomeLoadUi();
      this.setHomeLoadProgress(52, '存档已读取');
      await this.refreshSaveMetas?.();
      if (!this.phoneSetupDone) {
        this.setHomeLoadProgress(60, '加载新游戏资源…');
        await this.ensureNewGameAssetsReady?.();
        this.homeMessage = `${slot} 尚未完成手机激活，请从新游戏继续设置。`;
        this.homeScreenView = 'new-game';
        return;
      }
      this.setHomeLoadProgress(58, '恢复角色与玩法状态…');
      this.loadSavedRpgStates?.();
      this.ensureCatalogSelection?.();
      await this.yieldHomeLoadUi();
      this.setHomeLoadProgress(68, '加载角色卡…');
      await this.initPredefinedRoleCards?.();
      await this.yieldHomeLoadUi();
      if (!this.hasPlayerAspiration?.()) {
        this.setHomeLoadProgress(100, '载入完成');
        this.saveMessage = `已载入 ${slot}`;
        this.openPlayerAspirationWizard?.();
      } else {
        this.saveMessage = `已载入 ${slot}`;
        await this.enterPlayingFromSetup?.();
      }
    } catch (err) {
      console.error('[首页] 载入存档失败:', err.message, err.stack);
      this.homeMessage = err.message || '载入存档失败';
    } finally {
      this.clearHomeLoadProgress();
      this.busy = false;
    }
  },

  async deleteSaveSlot(slot) {
    if (this.busy || !this.saveMeta(slot).exists) return;
    this.busy = true;
    try {
      await window.GameModules.storage.remove(slot);
      if (this.selectedSlot === slot) {
        await window.GameModules.storage.open(slot);
        this.phoneSetupDone = false;
        this.phoneActivationChoice = '';
        this.started = false;
        this.rpgStates = {};
        this.playerName = '';
        this.playerProfile = { ...this.playerProfile, name: '', birthday: '', relationships: '', relationshipEntries: [] };
      }
      await this.refreshSaveMetas?.();
      this.saveMessage = `已删除 ${slot}`;
      if (!this.hasContinueSave() && this.homeScreenView === 'menu') this.homeMessage = '';
    } catch (err) {
      console.error('[首页] 删除存档失败:', err.message, err.stack);
      this.homeMessage = err.message || '删除存档失败';
    } finally {
      this.busy = false;
    }
  },

  async enterPlayingFromSetup() {
    if (this._enterPlayingPromise) return this._enterPlayingPromise;
    this._enterPlayingPromise = (async () => {
      this.phoneDesktopBooting = true;
      this.setHomeLoadProgress?.(78, '正在进入手机桌面…');
      await this.yieldHomeLoadUi?.();
      try {
        await this.loadGameplayAssetsWithHomeProgress?.(78, 10);
      } catch (err) {
        console.warn('[首页] 玩法资源加载失败:', err?.message || err);
      }
      this.setHomeLoadProgress?.(90, '初始化应用模块…');
      window.GameModules.remergeGameStore?.();
      this.runDeferredInits?.();
      await this.yieldHomeLoadUi?.();
      this.homeScreenView = 'playing';
      this.homeSavePanelOpen = false;
      this.homeMessage = '';
      this.desktopUnlocked = false;
      this.aspirationSetupOpen = false;
      this.setHomeLoadProgress?.(98, '即将完成…');
      await this.yieldHomeLoadUi?.();
      this.phoneDesktopBooting = false;
      this.setHomeLoadProgress?.(100, '载入完成');
      await this.yieldHomeLoadUi?.();
      this.startStartupWarmup?.();
    })().finally(() => {
      this._enterPlayingPromise = null;
    });
    return this._enterPlayingPromise;
  },
};


;// ---- player-aspiration-config.js ----
window.GameModules = window.GameModules || {};

window.GameModules.playerAspirationConfig = {
  alignmentColumns: [
    { key: 'lawful', label: '守序', labelEn: 'Lawful' },
    { key: 'neutral', label: '中立', labelEn: 'Neutral' },
    { key: 'chaotic', label: '混乱', labelEn: 'Chaotic' },
  ],
  alignmentRows: [
    { key: 'good', label: '善良', labelEn: 'Good' },
    { key: 'neutral', label: '中立', labelEn: 'Neutral' },
    { key: 'evil', label: '邪恶', labelEn: 'Evil' },
  ],
  alignments: [
    { id: 'lawful_good', row: 'good', col: 'lawful', label: '守序善良', labelEn: 'Lawful Good', hint: '有原则、守规则，并愿意帮助他人。' },
    { id: 'neutral_good', row: 'good', col: 'neutral', label: '中立善良', labelEn: 'Neutral Good', hint: '以善意为先，但不拘泥于形式。' },
    { id: 'chaotic_good', row: 'good', col: 'chaotic', label: '混乱善良', labelEn: 'Chaotic Good', hint: '凭良知行动，常打破常规。' },
    { id: 'lawful_neutral', row: 'neutral', col: 'lawful', label: '守序中立', labelEn: 'Lawful Neutral', hint: '重视秩序、职责与可预期规则。' },
    { id: 'true_neutral', row: 'neutral', col: 'neutral', label: '绝对中立', labelEn: 'True Neutral', hint: '倾向平衡，不主动站队。' },
    { id: 'chaotic_neutral', row: 'neutral', col: 'chaotic', label: '混乱中立', labelEn: 'Chaotic Neutral', hint: '重视自由，抗拒束缚。' },
    { id: 'lawful_evil', row: 'evil', col: 'lawful', label: '守序邪恶', labelEn: 'Lawful Evil', hint: '用规则与体系达成目的。' },
    { id: 'neutral_evil', row: 'evil', col: 'neutral', label: '中立邪恶', labelEn: 'Neutral Evil', hint: '以自身利益为先，手段灵活。' },
    { id: 'chaotic_evil', row: 'evil', col: 'chaotic', label: '混乱邪恶', labelEn: 'Chaotic Evil', hint: '追求破坏、支配或极端自我。' },
  ],
  axes: [
    {
      key: 'control_freedom',
      left: '掌控',
      right: '自由',
      leftTag: '权力',
      rightTag: '自由',
      title: '掌控 vs 自由',
      detail: '掌控追求对他人、环境或结果的支配力；自由追求自身不被支配。想掌权就要接受责任枷锁，要自由就要接受不干涉的代价。',
    },
    {
      key: 'detachment_engagement',
      left: '超然',
      right: '投入',
      leftTag: '智慧',
      rightTag: '欲望',
      title: '超然 vs 投入',
      detail: '超然是抽离旁观、克制欲望；投入是纵身体验、由感官与情感驱动。智慧要求看清欲望，投入要求屈从欲望。',
    },
    {
      key: 'depth_breadth',
      left: '深度',
      right: '广度',
      leftTag: '感情',
      rightTag: '名望',
      title: '深度 vs 广度',
      detail: '感情深度来自少数人上的长期投入；名望广度来自被更多人知晓。你要少数人的深刻，还是多数人的风光？',
    },
    {
      key: 'acquisition_giving',
      left: '获取',
      right: '付出',
      leftTag: '财富',
      rightTag: '救赎',
      title: '获取 vs 付出',
      detail: '获取向内聚集资源；付出向外释放价值。财富逻辑是积累，救赎逻辑常是分享与意义感。',
    },
    {
      key: 'tradition_innovation',
      left: '守旧',
      right: '创新',
      leftTag: '平凡',
      rightTag: '创造',
      title: '守旧 vs 创新',
      detail: '守旧拥抱熟悉路径与稳定；创新打破常规、承担风险。你要安全可期的稳定，还是充满可能的冒险？',
    },
    {
      key: 'solitude_companionship',
      left: '独处',
      right: '相伴',
      leftTag: '内省',
      rightTag: '归属',
      title: '独处 vs 相伴',
      detail: '独处把能量指向内部、获得自我认知；相伴把能量指向关系、获得归属感。你更需要自我对话，还是人际连接？',
    },
  ],
  defaultAxes() {
    return Object.fromEntries(this.axes.map((axis) => [axis.key, 50]));
  },
  alignmentById(id) {
    return this.alignments.find((item) => item.id === id) || null;
  },
  axisLeanText(value, axis) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '居中';
    if (num <= 35) return `偏${axis.left}`;
    if (num >= 65) return `偏${axis.right}`;
    return '居中';
  },
  guiltLines: [
    { id: 'ethics', category: '伦理', theme: '普世是非', guiltName: '悖德感', quote: '我越过了那条线，再也回不去了。', left: '无伦理', right: '强伦理', leftTag: '无所顾忌', rightTag: '铁律边界', title: '伦理 · 普世是非', detail: '无伦理一端：对逾矩亲近（如与妹妹发生关系）毫无罪恶感，伦理几乎不构成内心阻碍。强伦理一端：无法接受此类关系，连过于亲昵的举止都会触发强烈排斥与罪恶感。' },
    { id: 'profession', category: '职业', theme: '身份尊严', guiltName: '渎职感', quote: '我不配再有这个头衔。', left: '无感觉', right: '无法接受', leftTag: '渎职无感', rightTag: '渎职难容', title: '职业 · 身份尊严', detail: '无感觉一端：对失职、渎职、玷污头衔几乎无内心波动。无法接受一端：一旦违背职业操守，便难以原谅自己，甚至觉得不配再担此职。' },
    { id: 'homeland', category: '家国', theme: '血脉故土', guiltName: '背叛感', quote: '我亲手出卖了自己的根。', left: '无感觉', right: '无法接受', leftTag: '背叛无感', rightTag: '背叛难容', title: '家国 · 血脉故土', detail: '无感觉一端：对出卖故土、血脉、集体几乎无罪恶感。无法接受一端：任何背叛根脉的行为都会引发强烈自责与排斥。' },
    { id: 'faith', category: '信念', theme: '自我誓约', guiltName: '自弃感', quote: '我看着镜中的自己，觉得陌生。', left: '无感觉', right: '无法接受', leftTag: '誓约无感', rightTag: '誓约难容', title: '信念 · 自我誓约', detail: '无感觉一端：对背离自我誓约、放弃信念几乎无波动。无法接受一端：一旦违背对自己的承诺，便觉镜中人陌生，难以自恕。' },
    { id: 'humanity', category: '人性', theme: '具体面孔', guiltName: '冷漠感', quote: '我本可以伸手的，但我没有。', left: '无感觉', right: '无法接受', leftTag: '冷漠无感', rightTag: '冷漠难容', title: '人性 · 具体面孔', detail: '无感觉一端：对见死不救、袖手旁观几乎无罪恶感。无法接受一端：明明可以伸手却未伸手，会长期无法原谅自己的冷漠。' },
    { id: 'existence', category: '存在', theme: '生命尊严', guiltName: '僭越感', quote: '我扮演了神，却忘了自己只是人。', left: '无感觉', right: '无法接受', leftTag: '僭越无感', rightTag: '僭越难容', title: '存在 · 生命尊严', detail: '无感觉一端：对僭越生死、扮演「神」的边界几乎无排斥。无法接受一端：一旦越界干预生命尊严，便难以原谅自己只是凡人。' },
  ],
  directionChoices: [
    { id: 'power', label: '权力', left: '低倾向', right: '高倾向' },
    { id: 'wealth', label: '财富', left: '低倾向', right: '高倾向' },
    { id: 'emotion', label: '感情', left: '低倾向', right: '高倾向' },
    { id: 'desire', label: '欲望', left: '低倾向', right: '高倾向' },
  ],
  directionHorizons: [
    { key: 'short', label: '近期方向' },
    { key: 'medium', label: '中期方向' },
    { key: 'long', label: '长期方向' },
  ],
  defaultGuiltAxes() {
    return Object.fromEntries(this.guiltLines.map((item) => [item.id, 50]));
  },
  defaultDirectionWeights() {
    return Object.fromEntries(this.directionChoices.map((item) => [item.id, 50]));
  },
  defaultDirections() {
    const weights = this.defaultDirectionWeights();
    return { short: { ...weights }, medium: { ...weights }, long: { ...weights } };
  },
  guiltLeanText(value, item) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '居中';
    if (num <= 35) return `偏${item.left}`;
    if (num >= 65) return `偏${item.right}`;
    return '居中';
  },
  directionLeanText(value, item) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '居中';
    if (num <= 35) return `低${item.label}倾向`;
    if (num >= 65) return `高${item.label}倾向`;
    return `${item.label}倾向居中`;
  },
  dominantDirection(weights = {}) {
    const ranked = this.directionChoices
      .map((item) => ({ item, value: Number(weights[item.id]) || 0 }))
      .sort((a, b) => b.value - a.value);
    return ranked[0]?.item || null;
  },
  primaryGuiltLineId(guiltAxes = {}) {
    const ranked = this.guiltLines
      .map((item) => ({ item, value: Number(guiltAxes[item.id]) || 0 }))
      .sort((a, b) => b.value - a.value);
    return ranked[0]?.item?.id || '';
  },
  guiltLineById(id) {
    return this.guiltLines.find((item) => item.id === id) || null;
  },
  directionLabel(id) {
    return this.directionChoices.find((item) => item.id === id)?.label || '';
  },

  psychOptionKey(groupId, laneId) {
    return `${groupId}:${laneId}`;
  },

  psychSelectKey(groupId) {
    return groupId;
  },

  /** @deprecated 兼容旧引用 */
  psychGroupKey(laneId, groupId) {
    return this.psychOptionKey(groupId, laneId);
  },

  psychMaxSelectPerGroup: 3,
  psychOptionCount: 10,

  psychCategoryById(id) {
    return this.psychPreferenceCategories.find((item) => item.id === id) || null;
  },

  psychCategoryGroups(category) {
    return category?.groups || [];
  },

  /** 每个小类（正常/二次元）一条，用于标签池与换一批 */
  psychCategoryOptionEntries(category) {
    const entries = [];
    this.psychCategoryGroups(category).forEach((group) => {
      (group.lanes || []).forEach((lane) => {
        entries.push({
          key: this.psychOptionKey(group.id, lane.id),
          selectKey: group.id,
          group,
          lane,
          tagGroup: { id: group.id, label: group.label, hint: lane.hint, fallbackTags: lane.fallbackTags },
        });
      });
    });
    return entries;
  },

  psychCategoryGroupKeys(category) {
    return this.psychCategoryOptionEntries(category);
  },

  psychPreferenceCategories: [
    {
      id: 'emotion',
      label: '感情倾向',
      intro: '你喜欢谁、被什么吸引。每个偏好大类下，正常与二次元合计最多选 3 个「最喜欢」；可自定义标签，换一批时在已有标签后追加不重复新标签。',
      groups: [
        {
          id: 'emotion_pref',
          label: '情感偏好',
          lanes: [{ id: 'normal', label: '正常', hint: '如妹控、姐控、同龄偏好', fallbackTags: ['妹控', '姐控', '同龄偏好', '成熟偏好', '依赖型', '保护型', '慢热型', '直球型', '柏拉图', '激情型'] }],
        },
        {
          id: 'appearance',
          label: '外貌偏好',
          lanes: [{ id: 'normal', label: '正常', hint: '体型、肤色、气质', fallbackTags: ['萝莉', '御姐', '少女', '贫乳', '中乳', '巨乳', '白虎', '稀疏', '浓郁', '白皮肤', '黑皮肤', '黄皮肤', '高挑', '娇小', '肌肉型'] }],
        },
        {
          id: 'personality',
          label: '性格偏向',
          lanes: [{ id: 'normal', label: '正常', hint: '相处气质', fallbackTags: ['傲娇', '温柔', '高冷', '三无', '呆萌', '元气', '腹黑', '天然', '病娇', '可靠'] }],
        },
        {
          id: 'dress',
          label: '打扮偏好',
          lanes: [
            { id: 'normal', label: '正常', hint: '日常穿搭元素', fallbackTags: ['双马尾', '单马尾', '超短裙', '百T恤', '连裤袜', '过肩发', '眼镜娘', '运动风', '通勤风', '休闲风'] },
            { id: 'acg', label: '二次元', hint: 'ACG 穿搭元素', fallbackTags: ['JK服装', '过膝袜', '洛丽塔', '猫耳娘', '女仆装', '双马尾JK', '哥特萝莉', '兽耳', '和风浴衣', '校园泳装'] },
          ],
        },
        {
          id: 'kink_outfit',
          label: '情趣服装',
          lanes: [
            { id: 'normal', label: '正常', hint: '亲密场景穿着', fallbackTags: ['比基尼', '兔女郎', '睡衣', '浴衣', '居家服', '制服感', '蕾丝', '丝绸', '运动内衣', '简约裸感'] },
            { id: 'acg', label: '二次元', hint: 'ACG 情趣穿着', fallbackTags: ['透明女仆装', '水着', '死库水', '兔女郎', '旗袍', '和服', 'JK泳装', 'Cosplay', '角色扮演服', '轻束缚风'] },
          ],
        },
        {
          id: 'affection_action',
          label: '亲昵动作',
          lanes: [
            { id: 'normal', label: '正常', hint: '拥抱、亲吻、膝枕等非性行为亲昵', fallbackTags: ['耳鬓厮磨', '轻抚发丝', '拥抱依偎', '十指紧扣', '额头轻吻', '颈侧亲吻', '后背拥抱', '膝枕', '撒娇', '宠溺语气'] },
            { id: 'acg', label: '二次元', hint: 'ACG 向非性亲昵', fallbackTags: ['膝枕', '摸头杀', '壁咚', '耳边低语', '公主抱', '牵手', '靠肩', '投喂', '背后环抱', '轻捏脸颊'] },
          ],
        },
        {
          id: 'kink_action',
          label: '情趣动作',
          lanes: [
            { id: 'normal', label: '正常', hint: '发生关系时的姿势与行为', fallbackTags: ['口角', '乳交', '正常位', '女上位', '跨坐', '站立进入', '后入', '侧入', '69式', '指交'] },
            { id: 'acg', label: '二次元', hint: 'ACG 向性行为姿势与行为', fallbackTags: ['口角', '乳交', '正常位', '骑乘位', '跨坐', '站立进入', '后入', '侧入', '69式', '桌边位'] },
          ],
        },
      ],
    },
    {
      id: 'hobby',
      label: '爱好倾向',
      intro: '空闲时间更愿意把精力投向哪里。同一大类下正常与二次元合计最多选 3 个。',
      groups: [
        {
          id: 'outdoor',
          label: '户外偏好',
          lanes: [
            { id: 'normal', label: '正常', hint: '离开房间的活动', fallbackTags: ['羽毛球', '篮球', '爬山', '跑步', '骑行', '游泳', '露营', '摄影外拍', 'Citywalk', '探店'] },
            { id: 'acg', label: '二次元', hint: 'ACG 相关外出', fallbackTags: ['cosplay漫展', 'cosplay摄影', '主题咖啡厅', '动漫周边店', '声优活动', '痛车聚会', '同人展', '圣地巡礼', '手办展', '联名快闪'] },
          ],
        },
        {
          id: 'indoor',
          label: '室内偏好',
          lanes: [
            { id: 'normal', label: '正常', hint: '居家或室内活动', fallbackTags: ['游戏', '电视剧', '阅读', '烹饪', '手工', '健身', '音乐', '桌游', '写作', '收纳整理'] },
            { id: 'acg', label: '二次元', hint: 'ACG 相关室内', fallbackTags: ['动漫', '同人小说', 'Galgame', 'Vtuber', '手办拼装', '二次元手游', '补番', '画同人', '听OP/ED', '看轻小说'] },
          ],
        },
      ],
    },
    {
      id: 'perception',
      label: '感知倾向',
      intro: '你怎么感受世界——五感与氛围。同一大类下正常与二次元合计最多选 3 个。',
      groups: [
        {
          id: 'hearing',
          label: '听觉偏好',
          lanes: [
            { id: 'normal', label: '正常', hint: '声音与音乐', fallbackTags: ['白噪音', '雨声', '海浪', '古典钢琴', 'J-Pop', '纯音乐', '说唱', '播客', '环境音', '轻爵士'] },
            { id: 'acg', label: '二次元', hint: 'ACG 向声音', fallbackTags: ['ASMR', '咀嚼音', '敲击音', '动漫BGM', '角色歌', '声优广播', '8bit复古', 'Synthwave', '游戏OST', '治愈系纯音'] },
          ],
        },
        {
          id: 'taste_scent',
          label: '味觉/嗅觉偏好',
          lanes: [
            { id: 'normal', label: '正常', hint: '口味与气味', fallbackTags: ['甜口', '咸口', '辣口', '酸口', '咖啡', '茶', '木质香', '花果香', '海洋香调', '食物锅气'] },
            { id: 'acg', label: '二次元', hint: '主题感官', fallbackTags: ['主题咖啡', '限定甜点', '和果子', '波子汽水', '周边香薰', '书墨味', '新刊油墨', '模型胶味', '展场小吃', '便利店饭团'] },
          ],
        },
        {
          id: 'touch',
          label: '触觉/体感偏好',
          lanes: [
            { id: 'normal', label: '正常', hint: '触碰与材质', fallbackTags: ['喜欢被拥抱', '讨厌肢体接触', '柔软毛绒', '冰凉光滑', '温暖被炉', '裸睡', '加重毯', '阳光晒被', '丝绸触感', '棉麻触感'] },
            { id: 'acg', label: '二次元', hint: '周边与材质', fallbackTags: ['抱枕', '等身抱枕', '毛绒玩偶', '亚克力立牌手感', '键盘青轴', '手办漆面', 'Cosplay面料', '过膝袜触感', '耳机罩软垫', '毯子裹身'] },
          ],
        },
      ],
    },
    {
      id: 'aesthetic',
      label: '审美倾向',
      intro: '你觉得什么美——整体美学滤镜。同一大类下正常与二次元合计最多选 3 个。',
      groups: [
        {
          id: 'visual',
          label: '美术/视觉风格',
          lanes: [
            { id: 'normal', label: '正常', hint: '宏观视觉品味', fallbackTags: ['极简主义', '复古胶片', '工业风', '北欧风', '水墨国风', '写实摄影', '街头涂鸦', '包豪斯', '自然田园', '现代轻奢'] },
            { id: 'acg', label: '二次元', hint: 'ACG 视觉', fallbackTags: ['赛博朋克', '废土末日', '蒸汽波', '浮世绘风', '赛璐璐', '厚涂', 'Gal系柔光', '机甲硬核', '魔法少女', '暗黑哥特'] },
          ],
        },
        {
          id: 'narrative',
          label: '叙事/故事基调',
          lanes: [
            { id: 'normal', label: '正常', hint: '偏好的故事气质', fallbackTags: ['治愈系', '致郁系', '热血王道', '悬疑烧脑', '日常轻喜剧', '史诗奇幻', '现实主义', '黑色幽默', '慢生活', '成长叙事'] },
            { id: 'acg', label: '二次元', hint: 'ACG 故事', fallbackTags: ['校园日常', '异世界', '恋爱喜剧', 'Post-apoc', '机战', '悬疑推理', '致郁美学', '百合/耽美', '冒险RPG', 'Meta叙事'] },
          ],
        },
      ],
    },
    {
      id: 'cognitive',
      label: '思维倾向',
      intro: '你怎么想问题——信息口味与学习方式。同一大类下正常与二次元合计最多选 3 个。',
      groups: [
        {
          id: 'knowledge',
          label: '知识领域偏好',
          lanes: [
            { id: 'normal', label: '正常', hint: '常关注的领域', fallbackTags: ['自然科学', '人文社科', '历史哲学', '生活实用', '编程技术', '商业财经', '心理学', '艺术鉴赏', '医学健康', '法律时事'] },
            { id: 'acg', label: '二次元', hint: 'ACG 向知识', fallbackTags: ['设定考据', '声优知识', '作画MAD', '同人文化', 'Gal剧情结构', '轻小说语法', '模型改造', 'VTuber生态', '同人法律', '二次元史'] },
          ],
        },
        {
          id: 'info_density',
          label: '信息密度偏好',
          lanes: [
            { id: 'normal', label: '正常', hint: '摄取信息的方式', fallbackTags: ['深度长文', '硬核考据', '短视频', '碎片化信息', '图文并茂', '纯文字脑补', '播客长谈', '数据图表', '案例故事', '清单体'] },
            { id: 'acg', label: '二次元', hint: 'ACG 信息方式', fallbackTags: ['Wiki考据', '长评文章', '切片短视频', '直播切片', '论坛楼', '设定集阅读', 'N站弹幕', '图解攻略', '汉化组博客', '官方访谈'] },
          ],
        },
      ],
    },
    {
      id: 'lifestyle',
      label: '生活倾向',
      intro: '你怎么过日子——节奏、空间、社交、消费与亲密边界。同一大类下正常与二次元合计最多选 3 个。',
      groups: [
        {
          id: 'rhythm',
          label: '时间节律',
          lanes: [
            { id: 'normal', label: '正常', hint: '一天中的能量分布', fallbackTags: ['晨型人', '夜猫子', '午睡派', '碎片化休息', '番茄钟', '周末集中', '规律作息', '弹性作息', '加班型', '随缘型'] },
            { id: 'acg', label: '二次元', hint: '追番/游戏节奏', fallbackTags: ['追番夜', '新番凌晨', '周末补番', '手游日常', '活动期爆肝', '长休沉浸', '碎片抽卡', '同人赶稿夜', '漫展前冲刺', '季番节奏'] },
          ],
        },
        {
          id: 'space',
          label: '空间秩序',
          lanes: [
            { id: 'normal', label: '正常', hint: '与环境的关系', fallbackTags: ['极度整洁', '乱中有序', '囤积癖', '封闭小空间', '开阔大空间', '极简断舍离', '工作台固定', '移动办公', '植物陪伴', '宠物友好'] },
            { id: 'acg', label: '二次元', hint: '周边与展示', fallbackTags: ['手办墙', '书架满溢', '痛桌', '藏周边', '亚克力墙', '模型柜', '海报满墙', '极简隐藏宅', 'RGB电竞角', '和室风'] },
          ],
        },
        {
          id: 'social',
          label: '社交能量',
          lanes: [
            { id: 'normal', label: '正常', hint: '与人相处的充电方式', fallbackTags: ['独处充电', '社交充电', '小圈子深度', '广撒网泛社交', '线上社交', '线下聚会', '一对一深聊', '旁观型', '组织者', '随缘型'] },
            { id: 'acg', label: '二次元', hint: '同好社交', fallbackTags: ['同好群聊', '漫展面基', '线上公会', 'solo宅', 'Cos圈社交', '同人交流', '主播互动', '仅围观', '组织活动', '小圈子深交'] },
          ],
        },
        {
          id: 'consumption',
          label: '消费观',
          lanes: [
            { id: 'normal', label: '正常', hint: '金钱流向', fallbackTags: ['体验派', '物质派', '实用派', '收藏癖', '为健康投资', '为学习付费', '为颜值付费', '为效率付费', '极简消费', '冲动消费'] },
            { id: 'acg', label: '二次元', hint: '宅向消费', fallbackTags: ['手办收藏', '限定周边', '数字内容', '同人支持', '游戏氪金', '理性补款', '为IP买单', '为体验买单', '二手捡漏', '自制省钱'] },
          ],
        },
        {
          id: 'decision',
          label: '决策驱动',
          lanes: [
            { id: 'normal', label: '正常', hint: '如何做决定', fallbackTags: ['理性分析', '感性冲动', '情怀驱动', '看评测', '看眼缘', '问朋友', '拖延后再定', '列清单', '直觉第一', '风险厌恶'] },
            { id: 'acg', label: '二次元', hint: '宅向决策', fallbackTags: ['看口碑', '看画风', '看声优', '看设定', '跟风入坑', '等打折', '首发支持', '测评参考', '情怀入', '随缘入'] },
          ],
        },
        {
          id: 'intimacy',
          label: '相处模式',
          lanes: [
            { id: 'normal', label: '正常', hint: '亲密关系中的偏好', fallbackTags: ['黏腻型', '放养型', '对抗型', '照顾型', '被照顾型', '高质量独处', '共享爱好', '深度对话', '行动派', '仪式感'] },
            { id: 'acg', label: '二次元', hint: '与推/角色的情感', fallbackTags: ['推活分享', '私享不打扰', '一起打游戏', '一起追番', '互赠周边', '写同人', 'Cos给看', '语音陪伴', '线下约会', '精神陪伴'] },
          ],
        },
        {
          id: 'boundary',
          label: '私密边界',
          lanes: [
            { id: 'normal', label: '正常', hint: '隐私与信任', fallbackTags: ['极度开放', '中等隐私', '高度戒备', '共享密码', '独立设备', '日记私密', '手机可看', '需要报备', '空间分隔', '信任渐进'] },
            { id: 'acg', label: '二次元', hint: '宅身份边界', fallbackTags: ['公开宅', '半公开', '完全隐藏', '仅网友知', '仅亲友知', '收藏保密', '浏览记录私密', '小号社交', '痛包出门', '宅味不外露'] },
          ],
        },
      ],
    },
  ],

  defaultPsychPreferences() {
    return { selected: {}, options: {}, custom: {} };
  },

  /** 每组预置 10 个内置标签（来自 fallbackTags，去重后取前 10） */
  getBuiltinPsychTags(group, count = null) {
    const total = count ?? this.psychOptionCount ?? 10;
    const pool = [...new Set((Array.isArray(group?.fallbackTags) ? group.fallbackTags : [])
      .map((item) => String(item || '').trim())
      .filter(Boolean))];
    if (pool.length >= total) return pool.slice(0, total);
    const padded = pool.slice();
    while (padded.length < total) {
      const base = pool[padded.length % Math.max(pool.length, 1)] || `选项${padded.length + 1}`;
      const suffix = padded.length >= pool.length ? `·${Math.floor(padded.length / Math.max(pool.length, 1)) + 1}` : '';
      padded.push(`${base}${suffix}`);
    }
    return padded.slice(0, total);
  },

  fallbackPsychTags(group, count = 10) {
    const pool = Array.isArray(group?.fallbackTags) ? group.fallbackTags.slice() : [];
    if (!pool.length) return Array.from({ length: count }, (_, i) => `选项${i + 1}`);
    const out = [];
    while (out.length < count) {
      const item = pool[out.length % pool.length];
      const suffix = out.length >= pool.length ? `·${Math.floor(out.length / pool.length) + 1}` : '';
      out.push(`${item}${suffix}`);
    }
    return out.slice(0, count);
  },

  buildPsychTagOptions(group, newTags = [], lockedTags = [], excludeTags = []) {
    const total = this.psychOptionCount || 10;
    const locked = [...new Set((lockedTags || []).map((item) => String(item || '').trim()).filter(Boolean))];
    const exclude = new Set([
      ...locked,
      ...(Array.isArray(excludeTags) ? excludeTags : []).map((item) => String(item || '').trim()).filter(Boolean),
    ]);
    const need = Math.max(0, total - locked.length);
    const fresh = (Array.isArray(newTags) ? newTags : [])
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .filter((item) => !exclude.has(item));
    const pool = this.getBuiltinPsychTags(group, Math.max(need, total)).filter((item) => !exclude.has(item));
    const rest = [];
    [...fresh, ...pool].forEach((item) => {
      if (rest.length >= need) return;
      if (!rest.includes(item) && !exclude.has(item)) rest.push(item);
    });
    return [...locked, ...rest].slice(0, Math.max(total, locked.length));
  },

  /** 换一批：在已有标签末尾追加不重复的新标签 */
  appendPsychTagOptions(group, existingTags = [], newTags = [], excludeTags = [], appendCount = null) {
    const count = appendCount ?? this.psychOptionCount ?? 10;
    const existing = [...new Set((existingTags || []).map((item) => String(item || '').trim()).filter(Boolean))];
    const exclude = new Set([
      ...existing,
      ...(Array.isArray(excludeTags) ? excludeTags : []).map((item) => String(item || '').trim()).filter(Boolean),
    ]);
    const appended = [];
    const pushUnique = (item) => {
      const tag = String(item || '').trim();
      if (!tag || exclude.has(tag) || appended.includes(tag)) return;
      appended.push(tag);
      exclude.add(tag);
    };
    (Array.isArray(newTags) ? newTags : []).forEach(pushUnique);
    if (appended.length < count && group) {
      const pool = [
        ...(Array.isArray(group?.fallbackTags) ? group.fallbackTags : []),
        ...this.getBuiltinPsychTags(group, count * 2),
      ];
      pool.forEach((item) => {
        if (appended.length >= count) return;
        pushUnique(item);
      });
    }
    return [...existing, ...appended.slice(0, count)];
  },
};


;// ---- player-aspiration-preference-layers.js ----
window.GameModules = window.GameModules || {};

window.GameModules.playerAspirationPreferenceLayers = {
  layerMeta: [
    { key: 'layer1', label: '价值立场偏好', prefix: '价值立场偏好' },
    { key: 'layer2', label: '决策风格偏好', prefix: '决策风格偏好' },
    { key: 'layer3', label: '人生六维偏好', prefix: '人生六维偏好' },
    { key: 'layer4', label: '底线锚点偏好', prefix: '底线锚点偏好' },
    { key: 'layer5', label: '心理偏好', prefix: '心理偏好' },
  ],

  layerLabel(key) {
    return this.layerMeta.find((item) => item.key === key)?.label || key;
  },

  ensurePrefix(prefix, value) {
    const text = String(value || '').trim();
    if (!text) return '';
    return text.startsWith(prefix) ? text : `${prefix}: ${text.replace(/^[^:]+:\s*/, '')}`;
  },

  formatLayer1(alignmentLabel = '') {
    const label = String(alignmentLabel || '').trim() || '未设定';
    return `价值立场偏好: ${label}`;
  },

  formatLayer2(rationality = 50, rationalityLabel = '') {
    const num = Number(rationality);
    const value = Number.isFinite(num) ? num : 50;
    const lean = String(rationalityLabel || '').trim() || (value <= 35 ? '偏理性' : value >= 65 ? '偏感性' : '理性感性居中');
    return `决策风格偏好: ${lean},${value}`;
  },

  formatLayer3(axes = {}) {
    const cfg = window.GameModules.playerAspirationConfig;
    const parts = (cfg?.axes || []).map((axis) => {
      const value = Number(axes[axis.key]) || 50;
      const lean = cfg.axisLeanText(value, axis);
      const tag = value <= 35 ? axis.leftTag : value >= 65 ? axis.rightTag : '均衡';
      return `${axis.leftTag}/${axis.rightTag}${lean}${value}`;
    });
    return `人生六维偏好: ${parts.join(',')}`;
  },

  formatLayer4(guiltAxes = {}) {
    const cfg = window.GameModules.playerAspirationConfig;
    const parts = (cfg?.guiltLines || []).map((item) => {
      const value = Number(guiltAxes[item.id]) || 50;
      const lean = cfg.guiltLeanText(value, item);
      return `${item.category}·${item.theme}${lean}${value}`;
    });
    return `底线锚点偏好: ${parts.join(',')}`;
  },

  formatLayer5(psychPreferences = null) {
    const cfg = window.GameModules.playerAspirationConfig;
    const psych = psychPreferences || cfg?.defaultPsychPreferences?.() || { selected: {} };
    const groups = [];
    (cfg?.psychPreferenceCategories || []).forEach((category) => {
      cfg.psychCategoryGroups(category).forEach((group) => {
        let tags = psych.selected?.[group.id];
        if (!Array.isArray(tags) || !tags.length) {
          const legacy = [];
          ['normal', 'acg'].forEach((laneId) => {
            const old = psych.selected?.[`${laneId}:${group.id}`];
            if (Array.isArray(old)) legacy.push(...old);
          });
          tags = [...new Set(legacy)];
        }
        if (tags.length) groups.push(`${group.label}:${tags.join(',')}`);
      });
    });
    return groups.length ? `心理偏好: ${groups.join('; ')}` : '心理偏好: 未勾选';
  },

  buildFromAspirationDraft(draft = {}) {
    const cfg = window.GameModules.playerAspirationConfig;
    const alignment = cfg?.alignmentById?.(draft.alignment);
    const rationality = draft.rationality ?? 50;
    const rationalityLabel = draft.rationalityLabel
      || (rationality <= 35 ? '偏理性' : rationality >= 65 ? '偏感性' : '理性感性居中');
    return this.normalizeLayers({
      layer1: this.formatLayer1(alignment?.label || draft.alignmentLabel || draft.alignment),
      layer2: this.formatLayer2(rationality, rationalityLabel),
      layer3: this.formatLayer3(draft.axes || cfg?.defaultAxes?.()),
      layer4: this.formatLayer4(draft.guiltAxes || cfg?.defaultGuiltAxes?.()),
      layer5: this.formatLayer5(draft.psychPreferences),
    });
  },

  buildFromPlayerAspiration(data = {}) {
    if (!data || !data.alignment) return null;
    const cfg = window.GameModules.playerAspirationConfig;
    const rationality = data.rationality ?? 50;
    return this.normalizeLayers({
      layer1: this.formatLayer1(data.alignmentLabel || cfg?.alignmentById?.(data.alignment)?.label || data.alignment),
      layer2: this.formatLayer2(rationality, data.rationalityLabel),
      layer3: this.formatLayer3(data.axes || cfg?.defaultAxes?.()),
      layer4: this.formatLayer4(data.guiltAxes || cfg?.defaultGuiltAxes?.()),
      layer5: this.formatLayer5(data.psychPreferences),
    });
  },

  normalizeLayers(raw = {}) {
    const out = {};
    this.layerMeta.forEach(({ key, prefix }) => {
      out[key] = this.ensurePrefix(prefix, raw[key] || raw[prefix] || '');
    });
    return out;
  },

  toLines(layers = {}) {
    return this.layerMeta.map(({ key }) => String(layers[key] || '').trim()).filter(Boolean);
  },

  summaryText(layers = {}) {
    return this.toLines(layers).join('\n');
  },

  lexiconRows(layers = {}, worldTag = '', targetType = '角色') {
    const row = window.GameModules.playerProfileLexicon?.row;
    if (!row) return [];
    return this.toLines(layers).map((line) => {
      const label = line.split(':')[0]?.trim() || '本质偏好';
      return {
        ...row(label, line, '角色本质偏好层，固化后不可被推演修改；行为与情绪变化须与此一致并有迹可循。', worldTag),
        kind: targetType === '非角色' ? '玩家设定' : '角色卡',
        targetType,
        profileGroup: '本质偏好',
        immutable: true,
      };
    });
  },

  isImmutableFieldName(name = '') {
    const text = String(name || '').trim();
    if (!text) return false;
    if (/^layer[1-5]$/.test(text) || text === 'essentialPreferenceLayers') return true;
    return this.layerMeta.some(({ label, prefix }) => text === label || text === prefix || text.includes('本质偏好'));
  },

  applyToProfile(profile = {}, layers = null, { locked = true } = {}) {
    if (!profile || !layers) return profile;
    profile.essentialPreferenceLayers = this.normalizeLayers(layers);
    if (locked) profile.essentialPreferenceLayersLocked = true;
    return profile;
  },

  ensureOnProfile(profile = {}) {
    if (!profile || typeof profile !== 'object') return null;
    const normalized = this.normalizeLayers(profile.essentialPreferenceLayers || {});
    if (normalized.layer1) return normalized;
    const fallback = window.GameModules.characterProfile?.fallbackEssentialPreferenceLayers?.(profile);
    if (!fallback) return null;
    const layers = this.normalizeLayers(fallback);
    profile.essentialPreferenceLayers = layers;
    profile.essentialPreferenceLayersLocked = true;
    return layers;
  },

  stripLayerPrefix(line = '', prefix = '') {
    const text = String(line || '').trim();
    if (!text) return '';
    if (prefix && text.startsWith(`${prefix}:`)) return text.slice(prefix.length + 1).trim();
    const idx = text.indexOf(':');
    return idx >= 0 ? text.slice(idx + 1).trim() : text;
  },

  parseTrailingNumber(text = '', fallback = 50) {
    const match = String(text || '').trim().match(/(\d+)\s*$/);
    const num = Number(match?.[1]);
    return Number.isFinite(num) ? Math.max(0, Math.min(100, num)) : fallback;
  },

  parseListParts(body = '') {
    return String(body || '').split(',').map((part) => part.trim()).filter(Boolean);
  },

  viewFromLayers(layers = {}) {
    const cfg = window.GameModules.playerAspirationConfig;
    const normalized = this.normalizeLayers(layers);
    if (!normalized.layer1) return null;

    const alignmentLabel = this.stripLayerPrefix(normalized.layer1, '价值立场偏好') || '未设定';
    const layer2Body = this.stripLayerPrefix(normalized.layer2, '决策风格偏好');
    const rationalityParts = layer2Body.split(',');
    const rationality = this.parseTrailingNumber(rationalityParts[rationalityParts.length - 1] || layer2Body, 50);
    const rationalityLabel = rationalityParts[0]?.replace(/\d+\s*$/, '').trim()
      || (rationality <= 35 ? '偏理性' : rationality >= 65 ? '偏感性' : '理性感性居中');

    const axisBody = this.stripLayerPrefix(normalized.layer3, '人生六维偏好');
    const axes = this.parseListParts(axisBody).map((part, index) => {
      const value = this.parseTrailingNumber(part, 50);
      const cfgAxis = cfg?.axes?.[index];
      if (cfgAxis) {
        return {
          key: cfgAxis.key,
          title: cfgAxis.title,
          left: cfgAxis.left,
          right: cfgAxis.right,
          leftTag: cfgAxis.leftTag,
          rightTag: cfgAxis.rightTag,
          value,
          summary: `${cfgAxis.title}：${cfg.axisLeanText(value, cfgAxis)}（${value}/100）`,
        };
      }
      return { key: `axis-${index}`, title: part.replace(/\d+\s*$/, '').trim() || part, value, summary: `${part}（${value}/100）` };
    });

    const guiltBody = this.stripLayerPrefix(normalized.layer4, '底线锚点偏好');
    const guiltLines = this.parseListParts(guiltBody).map((part, index) => {
      const value = this.parseTrailingNumber(part, 50);
      const cfgItem = cfg?.guiltLines?.[index];
      if (cfgItem) {
        return {
          id: cfgItem.id,
          title: cfgItem.title,
          left: cfgItem.left,
          right: cfgItem.right,
          leftTag: cfgItem.leftTag,
          rightTag: cfgItem.rightTag,
          value,
          summary: `${cfgItem.title}：${cfg.guiltLeanText(value, cfgItem)}（${value}/100）`,
        };
      }
      return { id: `guilt-${index}`, title: part.replace(/\d+\s*$/, '').trim() || part, value, summary: `${part}（${value}/100）` };
    });

    const psychBody = this.stripLayerPrefix(normalized.layer5, '心理偏好');
    const psychGroups = String(psychBody || '').split(';').map((chunk) => chunk.trim()).filter(Boolean).map((chunk, index) => {
      const splitAt = chunk.indexOf(':');
      if (splitAt < 0) return { groupLabel: `偏好${index + 1}`, tags: [chunk] };
      const groupLabel = chunk.slice(0, splitAt).trim();
      const tags = chunk.slice(splitAt + 1).split(',').map((tag) => tag.trim()).filter(Boolean);
      return { groupLabel, tags };
    }).filter((group) => group.tags.length);

    return {
      alignmentLabel,
      rationality,
      rationalityLabel,
      axes,
      guiltLines,
      psychGroups,
      layerLines: this.toLines(normalized),
    };
  },
};


;// ---- player-aspiration-actions.js ----
window.GameModules = window.GameModules || {};

window.GameModules.playerAspirationActions = {
  defaultAspirationDraft() {
    return {
      alignment: '',
      rationality: 50,
      axes: window.GameModules.playerAspirationConfig.defaultAxes(),
      guiltAxes: window.GameModules.playerAspirationConfig.defaultGuiltAxes(),
      directions: window.GameModules.playerAspirationConfig.defaultDirections(),
      psychPreferences: window.GameModules.playerAspirationConfig.defaultPsychPreferences(),
    };
  },

  hasPlayerAspiration() {
    const data = this.playerAspiration || {};
    return Boolean(data.completedAt && data.alignment);
  },

  async finishActivationFlow() {
    this.homeScreenView = 'playing';
    if (this.hasPlayerAspiration()) {
      await this.enterPlayingFromSetup?.();
      return;
    }
    this.openPlayerAspirationWizard();
  },

  openPlayerAspirationWizard() {
    this.aspirationSetupOpen = true;
    this.aspirationStep = 1;
    this.aspirationPsychStep = 1;
    this.aspirationPsychLoading = false;
    this.aspirationBusy = false;
    this.aspirationError = '';
    this.aspirationDraft = this.defaultAspirationDraft();
    this.aspirationGoalDraft = { short: '', medium: '', long: '', summary: '' };
    this.aspirationSummaryDraft = { portrait: '' };
    this.aspirationPsychCustomDraft = {};
    this.homeScreenView = 'playing';
    this.homeSavePanelOpen = false;
    this.desktopUnlocked = false;
  },

  closePlayerAspirationWizard() {
    this.aspirationSetupOpen = false;
  },

  selectAspirationAlignment(id) {
    if (this.aspirationBusy) return;
    this.aspirationDraft = { ...this.aspirationDraft, alignment: id };
    this.aspirationError = '';
  },

  setAspirationGuiltAxis(id, value) {
    if (this.aspirationBusy) return;
    const num = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
    this.aspirationDraft = {
      ...this.aspirationDraft,
      guiltAxes: { ...(this.aspirationDraft.guiltAxes || window.GameModules.playerAspirationConfig.defaultGuiltAxes()), [id]: num },
    };
    this.aspirationError = '';
  },

  setAspirationDirectionAxis(horizon, directionId, value) {
    if (this.aspirationBusy) return;
    const num = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
    const cfg = window.GameModules.playerAspirationConfig;
    const directions = { ...(this.aspirationDraft.directions || cfg.defaultDirections()) };
    directions[horizon] = { ...(directions[horizon] || cfg.defaultDirectionWeights()), [directionId]: num };
    this.aspirationDraft = { ...this.aspirationDraft, directions };
    this.aspirationError = '';
  },

  setAspirationRationality(value) {
    const num = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
    this.aspirationDraft = { ...this.aspirationDraft, rationality: num };
  },

  setAspirationAxis(key, value) {
    const num = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
    this.aspirationDraft = {
      ...this.aspirationDraft,
      axes: { ...(this.aspirationDraft.axes || {}), [key]: num },
    };
  },

  aspirationAlignmentLabel(id = '') {
    const item = window.GameModules.playerAspirationConfig.alignmentById(id || this.aspirationDraft?.alignment);
    return item ? `${item.label}（${item.labelEn}）` : '未选择';
  },

  aspirationPrimaryGuiltLineId(guiltAxes = this.aspirationDraft?.guiltAxes) {
    return window.GameModules.playerAspirationConfig.primaryGuiltLineId(guiltAxes);
  },

  aspirationGuiltLineLabel(id = '') {
    const cfg = window.GameModules.playerAspirationConfig;
    const resolved = id || this.aspirationPrimaryGuiltLineId();
    const item = cfg.guiltLineById(resolved);
    if (!item) return '未选择';
    return `${item.category}·${item.theme}（${item.guiltName}）`;
  },

  aspirationGuiltAxisLabel(id) {
    const cfg = window.GameModules.playerAspirationConfig;
    const item = cfg.guiltLineById(id);
    if (!item) return '';
    const value = this.aspirationDraft?.guiltAxes?.[id] ?? 50;
    return `${item.title}：${cfg.guiltLeanText(value, item)}（${value}/100）`;
  },

  aspirationGuiltSummary(guiltAxes = this.aspirationDraft?.guiltAxes) {
    const cfg = window.GameModules.playerAspirationConfig;
    return cfg.guiltLines.map((item) => {
      const value = guiltAxes?.[item.id] ?? 50;
      return `${item.title}：${cfg.guiltLeanText(value, item)}（${value}/100，${item.leftTag}/${item.rightTag}）`;
    }).join('\n');
  },

  aspirationDirectionHorizonLabel(horizon) {
    const cfg = window.GameModules.playerAspirationConfig;
    const weights = this.aspirationDraft?.directions?.[horizon] || cfg.defaultDirectionWeights();
    const dominant = cfg.dominantDirection(weights);
    const parts = cfg.directionChoices.map((item) => `${item.label}${weights[item.id] ?? 50}`);
    return `${cfg.directionHorizons.find((item) => item.key === horizon)?.label || horizon}：${parts.join(' / ')}；主轴偏${dominant?.label || '均衡'}`;
  },

  aspirationDirectionAxisLabel(horizon, directionId) {
    const cfg = window.GameModules.playerAspirationConfig;
    const item = cfg.directionChoices.find((entry) => entry.id === directionId);
    if (!item) return '';
    const value = this.aspirationDraft?.directions?.[horizon]?.[directionId] ?? 50;
    return `${item.label}：${cfg.directionLeanText(value, item)}（${value}/100）`;
  },

  aspirationRationalityLabel(value = this.aspirationDraft?.rationality) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '居中';
    if (num <= 35) return '偏绝对理性';
    if (num >= 65) return '偏纯粹感性';
    return '理性与感性并存';
  },

  aspirationAxisLabel(key) {
    const axis = window.GameModules.playerAspirationConfig.axes.find((item) => item.key === key);
    if (!axis) return '';
    const value = this.aspirationDraft?.axes?.[key] ?? 50;
    return `${axis.title}：${window.GameModules.playerAspirationConfig.axisLeanText(value, axis)}`;
  },

  aspirationDirectionsSummary(directions = this.aspirationDraft?.directions) {
    const psych = this.aspirationPsychSummary();
    if (psych) return psych;
    const cfg = window.GameModules.playerAspirationConfig;
    return cfg.directionHorizons.map((item) => {
      const weights = directions?.[item.key] || cfg.defaultDirectionWeights();
      const dominant = cfg.dominantDirection(weights);
      const parts = cfg.directionChoices.map((choice) => `${choice.label}${weights[choice.id] ?? 50}`);
      return `${item.label}：${parts.join(' / ')}；主轴偏${dominant?.label || '均衡'}`;
    }).join('\n');
  },

  aspirationPsychCategoryId(step = this.aspirationPsychStep) {
    const cfg = window.GameModules.playerAspirationConfig;
    return cfg.psychPreferenceCategories[(Number(step) || 1) - 1]?.id || '';
  },

  aspirationPsychCategory(step = this.aspirationPsychStep) {
    const cfg = window.GameModules.playerAspirationConfig;
    return cfg.psychCategoryById(this.aspirationPsychCategoryId(step));
  },

  aspirationPsychCategoryGroups(category = this.aspirationPsychCategory()) {
    return window.GameModules.playerAspirationConfig.psychCategoryGroups(category);
  },

  aspirationPsychGroupKeys(category = this.aspirationPsychCategory()) {
    return window.GameModules.playerAspirationConfig.psychCategoryGroupKeys(category);
  },

  aspirationPsychOptions(optionKey) {
    const psych = this.aspirationDraft?.psychPreferences;
    const direct = psych?.options?.[optionKey];
    if (Array.isArray(direct) && direct.length) return direct;
    const parts = String(optionKey || '').split(':');
    if (parts.length === 2) {
      const legacy = psych?.options?.[`${parts[1]}:${parts[0]}`];
      if (Array.isArray(legacy) && legacy.length) return legacy;
    }
    return psych?.options?.[optionKey] || [];
  },

  aspirationPsychCustomTags(optionKey) {
    const psych = this.aspirationDraft?.psychPreferences;
    const direct = psych?.custom?.[optionKey];
    if (Array.isArray(direct) && direct.length) return direct;
    const parts = String(optionKey || '').split(':');
    if (parts.length === 2) {
      const legacy = psych?.custom?.[`${parts[1]}:${parts[0]}`];
      if (Array.isArray(legacy) && legacy.length) return legacy;
    }
    return psych?.custom?.[optionKey] || [];
  },

  isAspirationPsychCustomTag(optionKey, tag) {
    return this.aspirationPsychCustomTags(optionKey).includes(tag);
  },

  getAspirationPsychCustomDraft(optionKey) {
    return this.aspirationPsychCustomDraft?.[optionKey] || '';
  },

  setAspirationPsychCustomDraft(optionKey, value) {
    this.aspirationPsychCustomDraft = { ...(this.aspirationPsychCustomDraft || {}), [optionKey]: String(value ?? '') };
  },

  aspirationPsychKnownTags(optionKey, tagGroup = null) {
    const cfg = window.GameModules.playerAspirationConfig;
    const psych = this.aspirationDraft?.psychPreferences || cfg.defaultPsychPreferences();
    if (!tagGroup) {
      const category = this.aspirationPsychCategory();
      const entry = cfg.psychCategoryGroupKeys(category).find((item) => item.key === optionKey);
      tagGroup = entry?.tagGroup || null;
    }
    const builtin = tagGroup ? cfg.getBuiltinPsychTags(tagGroup) : [];
    const custom = this.aspirationPsychCustomTags(optionKey);
    const options = this.aspirationPsychOptions(optionKey);
    return [...new Set([...builtin, ...custom, ...options].map((item) => String(item || '').trim()).filter(Boolean))];
  },

  aspirationPsychPreserveTags(optionKey) {
    const cfg = window.GameModules.playerAspirationConfig;
    const category = this.aspirationPsychCategory();
    const entry = cfg.psychCategoryGroupKeys(category).find((item) => item.key === optionKey);
    const selectKey = entry?.selectKey || String(optionKey).split(':')[0];
    const selected = this.aspirationPsychSelected(selectKey);
    const options = this.aspirationPsychOptions(optionKey);
    const custom = this.aspirationPsychCustomTags(optionKey);
    const keepSelected = selected.filter((tag) => options.includes(tag));
    return [...new Set([...keepSelected, ...custom].map((item) => String(item || '').trim()).filter(Boolean))];
  },

  aspirationPsychSelected(selectKey) {
    const psych = this.aspirationDraft?.psychPreferences;
    const direct = psych?.selected?.[selectKey];
    if (Array.isArray(direct) && direct.length) return direct;
    const merged = [];
    ['normal', 'acg'].forEach((laneId) => {
      const legacy = psych?.selected?.[`${laneId}:${selectKey}`];
      if (Array.isArray(legacy)) merged.push(...legacy);
    });
    return [...new Set(merged.map((item) => String(item || '').trim()).filter(Boolean))];
  },

  aspirationPsychMaxSelect() {
    return window.GameModules.playerAspirationConfig?.psychMaxSelectPerGroup || 3;
  },

  aspirationPsychGroupSelectedCount(selectKey) {
    return this.aspirationPsychSelected(selectKey).length;
  },

  canSelectAspirationPsychTag(selectKey, tag) {
    if (this.isAspirationPsychTagSelected(selectKey, tag)) return true;
    return this.aspirationPsychGroupSelectedCount(selectKey) < this.aspirationPsychMaxSelect();
  },

  isAspirationPsychTagSelected(selectKey, tag) {
    return this.aspirationPsychSelected(selectKey).includes(tag);
  },

  toggleAspirationPsychTag(selectKey, tag) {
    if (this.aspirationBusy || this.aspirationPsychLoading) return;
    const psych = this.aspirationDraft.psychPreferences || window.GameModules.playerAspirationConfig.defaultPsychPreferences();
    const prev = this.aspirationPsychSelected(selectKey);
    if (prev.includes(tag)) {
      psych.selected[selectKey] = prev.filter((item) => item !== tag);
      ['normal', 'acg'].forEach((laneId) => { delete psych.selected[`${laneId}:${selectKey}`]; });
      this.aspirationDraft = { ...this.aspirationDraft, psychPreferences: { ...psych, selected: { ...psych.selected }, options: { ...(psych.options || {}) }, custom: { ...(psych.custom || {}) } } };
      this.aspirationError = '';
      return;
    }
    if (prev.length >= this.aspirationPsychMaxSelect()) {
      this.aspirationError = `该偏好大类下正常与二次元合计最多选 ${this.aspirationPsychMaxSelect()} 个`;
      return;
    }
    psych.selected[selectKey] = [...prev, tag];
    ['normal', 'acg'].forEach((laneId) => { delete psych.selected[`${laneId}:${selectKey}`]; });
    this.aspirationDraft = { ...this.aspirationDraft, psychPreferences: { ...psych, selected: { ...psych.selected }, options: { ...(psych.options || {}) }, custom: { ...(psych.custom || {}) } } };
    this.aspirationError = '';
  },

  addAspirationPsychCustomTag(optionKey, rawTag) {
    if (this.aspirationBusy || this.aspirationPsychLoading) return;
    const tag = String(rawTag ?? this.getAspirationPsychCustomDraft(optionKey) ?? '').trim();
    if (!tag) {
      this.aspirationError = '请输入标签内容';
      return;
    }
    if (tag.length > 12) {
      this.aspirationError = '标签最多 12 个字';
      return;
    }
    const cfg = window.GameModules.playerAspirationConfig;
    const category = this.aspirationPsychCategory();
    const entry = cfg.psychCategoryGroupKeys(category).find((item) => item.key === optionKey);
    if (!entry) return;
    if (this.aspirationPsychKnownTags(optionKey, entry.tagGroup).includes(tag)) {
      this.aspirationError = '该标签已存在';
      return;
    }
    const psych = this.aspirationDraft.psychPreferences || cfg.defaultPsychPreferences();
    const custom = [...this.aspirationPsychCustomTags(optionKey), tag];
    const options = [...this.aspirationPsychOptions(optionKey), tag];
    this.aspirationDraft = {
      ...this.aspirationDraft,
      psychPreferences: {
        ...psych,
        custom: { ...(psych.custom || {}), [optionKey]: custom },
        options: { ...(psych.options || {}), [optionKey]: options },
        selected: { ...(psych.selected || {}) },
      },
    };
    this.setAspirationPsychCustomDraft(optionKey, '');
    this.aspirationError = '';
  },

  normalizePsychTagGroups(data = {}, entries = [], context = {}) {
    const cfg = window.GameModules.playerAspirationConfig;
    const groups = data?.groups && typeof data.groups === 'object' ? data.groups : data;
    const { append = false, existingByKey = {}, excludeByKey = {}, lockedByKey = {} } = context;
    const out = {};
    entries.forEach(({ key, tagGroup }) => {
      const raw = groups?.[key];
      const list = Array.isArray(raw) ? raw.map((item) => String(item || '').trim()).filter(Boolean) : [];
      if (append) {
        out[key] = cfg.appendPsychTagOptions(tagGroup, existingByKey[key] || [], list, excludeByKey[key] || []);
        return;
      }
      const locked = lockedByKey[key] || [];
      const exclude = excludeByKey[key] || [];
      out[key] = cfg.buildPsychTagOptions(tagGroup, list, locked, exclude);
    });
    return out;
  },

  applyPsychTagOptions(categoryId, patch = {}) {
    const psych = this.aspirationDraft.psychPreferences || window.GameModules.playerAspirationConfig.defaultPsychPreferences();
    const options = { ...psych.options, ...patch };
    this.aspirationDraft = { ...this.aspirationDraft, psychPreferences: { ...psych, options, selected: { ...psych.selected } } };
  },

  async ensureAspirationPsychTags(categoryId = this.aspirationPsychCategoryId(), { refresh = false } = {}) {
    const cfg = window.GameModules.playerAspirationConfig;
    const category = cfg.psychCategoryById(categoryId);
    if (!category) return;
    const entries = cfg.psychCategoryGroupKeys(category);
    const psych = this.aspirationDraft.psychPreferences || cfg.defaultPsychPreferences();
    const initTargets = entries.filter(({ key }) => !(this.aspirationPsychOptions(key).length >= cfg.psychOptionCount));

    if (!refresh) {
      if (!initTargets.length) return;
      const patch = Object.fromEntries(initTargets.map(({ key, tagGroup }) => {
        const preserve = this.aspirationPsychPreserveTags(key);
        const builtin = cfg.getBuiltinPsychTags(tagGroup);
        return [key, cfg.buildPsychTagOptions(tagGroup, builtin, preserve, [])];
      }));
      this.applyPsychTagOptions(categoryId, patch);
      return;
    }

    const existingByKey = Object.fromEntries(entries.map(({ key }) => [key, psych.options?.[key] || []]));
    const excludeByKey = Object.fromEntries(entries.map(({ key, tagGroup }) => [key, this.aspirationPsychKnownTags(key, tagGroup)]));

    this.aspirationPsychLoading = true;
    this.aspirationError = '';
    try {
      await window.GameModules.assetLoader?.loadChunk?.('prompts');
      window.GameModules.remergeGameStore?.();
      const appendCount = cfg.psychOptionCount || 10;
      const groupList = entries.map(({ key, lane, group, tagGroup }) => {
        const current = (existingByKey[key] || []).join('、') || '无';
        const known = (excludeByKey[key] || []).join('、') || '无';
        return `${key}｜${group.label}｜${lane.label}｜${lane.hint || tagGroup.hint || ''}｜当前已有：${current}｜不可重复：${known}｜需追加：${appendCount}个`;
      }).join('\n');
      const prompt = await window.GameModules.renderPrompt('player-aspiration-psych-tags', {
        玩家资料: this.playerSetupSummary?.() || '',
        类别名称: category.label,
        类别说明: category.intro || '',
        分组列表: groupList,
      });
      let data = null;
      try {
        data = await Promise.race([
          window.GameModules.jsonUtils.generateJsonWithRetry({
            source: 'player-aspiration-psych-tags',
            promptId: 'player-aspiration-psych-tags',
            model: this.modelId,
            timeoutMs: 45000,
            prompt,
            format: prompt,
            max: 2,
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('标签生成超时')), 45000)),
        ]);
      } catch (err) {
        console.warn('[人生取向] AI 标签生成失败，使用本地候选:', err?.message || err);
      }
      const appendContext = { append: true, existingByKey, excludeByKey };
      const patch = data
        ? this.normalizePsychTagGroups(data, entries, appendContext)
        : Object.fromEntries(entries.map(({ key, tagGroup }) => {
          const extra = cfg.getBuiltinPsychTags(tagGroup).filter((item) => !(excludeByKey[key] || []).includes(item));
          return [key, cfg.appendPsychTagOptions(tagGroup, existingByKey[key] || [], extra, excludeByKey[key] || [])];
        }));
      this.applyPsychTagOptions(categoryId, patch);
    } catch (err) {
      console.warn('[人生取向] 标签加载失败，使用本地候选:', err?.message || err);
      const patch = Object.fromEntries(entries.map(({ key, tagGroup }) => {
        const extra = cfg.getBuiltinPsychTags(tagGroup).filter((item) => !(excludeByKey[key] || []).includes(item));
        return [key, cfg.appendPsychTagOptions(tagGroup, existingByKey[key] || [], extra, excludeByKey[key] || [])];
      }));
      this.applyPsychTagOptions(categoryId, patch);
    } finally {
      this.aspirationPsychLoading = false;
    }
  },

  async regenerateAspirationPsychTags() {
    if (this.aspirationBusy || this.aspirationPsychLoading) return;
    await this.ensureAspirationPsychTags(this.aspirationPsychCategoryId(), { refresh: true });
  },

  aspirationPsychSummary(psychPreferences = this.aspirationDraft?.psychPreferences) {
    const cfg = window.GameModules.playerAspirationConfig;
    const lines = [];
    cfg.psychPreferenceCategories.forEach((category) => {
      const parts = [];
      cfg.psychCategoryGroups(category).forEach((group) => {
        const tags = (psychPreferences?.selected?.[group.id] || []);
        const legacy = [];
        if (!tags.length) {
          ['normal', 'acg'].forEach((laneId) => {
            const old = psychPreferences?.selected?.[`${laneId}:${group.id}`];
            if (Array.isArray(old)) legacy.push(...old);
          });
        }
        const merged = tags.length ? tags : [...new Set(legacy)];
        if (merged.length) parts.push(`${group.label}：${merged.join('、')}`);
      });
      if (parts.length) lines.push(`${category.label}：${parts.join('；')}`);
    });
    return lines.join('\n');
  },

  aspirationPsychSelectionCount(category = this.aspirationPsychCategory()) {
    const groups = window.GameModules.playerAspirationConfig.psychCategoryGroups(category);
    return groups.reduce((sum, group) => sum + this.aspirationPsychSelected(group.id).length, 0);
  },

  aspirationSelectionSummary() {
    const draft = this.aspirationDraft || {};
    const cfg = window.GameModules.playerAspirationConfig;
    const primaryGuilt = cfg.guiltLineById(this.aspirationPrimaryGuiltLineId(draft.guiltAxes));
    const lines = [
      `价值立场：${this.aspirationAlignmentLabel(draft.alignment)}`,
      `决策风格：${this.aspirationRationalityLabel(draft.rationality)}（${draft.rationality}/100）`,
    ];
    cfg.axes.forEach((axis) => {
      const value = draft.axes?.[axis.key] ?? 50;
      lines.push(`${axis.title}：${cfg.axisLeanText(value, axis)}（${value}/100，${axis.leftTag}/${axis.rightTag}）`);
    });
    lines.push(`底线锚点（六维 guilt 强度）：\n${this.aspirationGuiltSummary(draft.guiltAxes)}`);
    if (primaryGuilt) {
      lines.push(`主锚点：${primaryGuilt.category}·${primaryGuilt.theme}｜${primaryGuilt.guiltName}｜「${primaryGuilt.quote}」`);
    }
    lines.push(this.aspirationPsychSummary(draft.psychPreferences) || this.aspirationDirectionsSummary(draft.directions));
    return lines.join('\n');
  },

  playerAspirationSummary() {
    const data = this.playerAspiration || {};
    if (!this.hasPlayerAspiration()) return '';
    const goals = data.goals || {};
    const prefTool = window.GameModules.playerAspirationPreferenceLayers;
    const layers = data.essentialPreferenceLayers || prefTool?.buildFromPlayerAspiration?.(data);
    const prefLines = prefTool?.toLines?.(layers) || [];
    const parts = [
      prefLines.length ? `本质偏好五层（永久固化）：\n${prefLines.join('\n')}` : '',
      data.summary || this.aspirationSelectionSummaryFromData(data),
      goals.short ? `近期目标：${goals.short}` : '',
      goals.medium ? `中期目标：${goals.medium}` : '',
      goals.long ? `长期目标：${goals.long}` : '',
    ].filter(Boolean);
    return parts.join('\n');
  },

  aspirationSelectionSummaryFromData(data = {}) {
    const cfg = window.GameModules.playerAspirationConfig;
    const primaryGuilt = cfg.guiltLineById(data.guiltLine || cfg.primaryGuiltLineId(data.guiltAxes));
    const lines = [
      `价值立场：${this.aspirationAlignmentLabel(data.alignment)}`,
      `决策风格：${this.aspirationRationalityLabel(data.rationality)}（${data.rationality ?? 50}/100）`,
    ];
    cfg.axes.forEach((axis) => {
      const value = data.axes?.[axis.key] ?? 50;
      lines.push(`${axis.title}：${cfg.axisLeanText(value, axis)}（${value}/100）`);
    });
    if (data.guiltAxes) {
      lines.push(`底线锚点：${cfg.guiltLines.map((item) => {
        const value = data.guiltAxes[item.id] ?? 50;
        return `${item.title}${value}`;
      }).join('；')}`);
    }
    if (primaryGuilt) {
      lines.push(`主锚点：${primaryGuilt.category}·${primaryGuilt.theme}｜${primaryGuilt.guiltName}`);
    }
    if (data.psychPreferences?.selected) {
      lines.push(this.aspirationPsychSummary(data.psychPreferences));
    } else if (data.directions) {
      lines.push(cfg.directionHorizons.map((item) => {
        const weights = data.directions[item.key];
        if (!weights || typeof weights !== 'object') return `${item.label}：${cfg.directionLabel(weights) || '未选择'}`;
        const dominant = cfg.dominantDirection(weights);
        const parts = cfg.directionChoices.map((choice) => `${choice.label}${weights[choice.id] ?? 50}`);
        return `${item.label}：${parts.join(' / ')}；主轴偏${dominant?.label || '均衡'}`;
      }).join('\n'));
    }
    return lines.join('\n');
  },

  aspirationCell(rowKey, colKey) {
    return window.GameModules.playerAspirationConfig.alignments.find((item) => item.row === rowKey && item.col === colKey) || null;
  },

  aspirationStepTitle(step = this.aspirationStep) {
    if (step === 5) {
      const category = this.aspirationPsychCategory();
      return category ? `心理偏好 · ${category.label}` : '心理偏好';
    }
    return ({ 1: '价值立场', 2: '决策风格', 3: '人生六维', 4: '底线锚点', 5: '心理偏好', 6: '人生总结', 7: '确认目标' })[step] || '';
  },

  aspirationCanNextStep() {
    const step = this.aspirationStep || 1;
    const draft = this.aspirationDraft || {};
    if (step === 1) return Boolean(draft.alignment);
    if (step === 5) return !this.aspirationBusy && !this.aspirationPsychLoading;
    if (step === 6) return Boolean(String(this.aspirationSummaryDraft?.portrait || '').trim()) && !this.aspirationBusy;
    return !this.aspirationBusy;
  },

  async aspirationPrevStep() {
    if (this.aspirationBusy || this.aspirationPsychLoading) return;
    const step = this.aspirationStep || 1;
    if (step === 7) {
      this.aspirationStep = 6;
      this.aspirationError = '';
      return;
    }
    if (step === 6) {
      this.aspirationStep = 5;
      this.aspirationPsychStep = window.GameModules.playerAspirationConfig?.psychPreferenceCategories?.length || 6;
      this.aspirationError = '';
      return;
    }
    if (step === 5 && (this.aspirationPsychStep || 1) > 1) {
      this.aspirationPsychStep -= 1;
      await this.ensureAspirationPsychTags(this.aspirationPsychCategoryId());
      this.aspirationError = '';
      return;
    }
    if (step <= 1) return;
    this.aspirationStep = step - 1;
    this.aspirationError = '';
  },

  async aspirationNextStep() {
    if (!this.aspirationCanNextStep() || this.aspirationBusy) return;
    const step = this.aspirationStep || 1;
    if (step === 4) {
      this.aspirationStep = 5;
      this.aspirationPsychStep = 1;
      await this.ensureAspirationPsychTags(this.aspirationPsychCategoryId());
      this.aspirationError = '';
      return;
    }
    if (step === 5) {
      const psychStep = this.aspirationPsychStep || 1;
      const cfg = window.GameModules.playerAspirationConfig;
      if (psychStep < cfg.psychPreferenceCategories.length) {
        this.aspirationPsychStep = psychStep + 1;
        await this.ensureAspirationPsychTags(this.aspirationPsychCategoryId());
        this.aspirationError = '';
        return;
      }
      await this.generateAspirationSummary();
      return;
    }
    if (step === 6) {
      await this.generateAspirationGoals();
      return;
    }
    if (step < 5) {
      this.aspirationStep = step + 1;
      this.aspirationError = '';
    }
  },

  fallbackAspirationSummary() {
    const draft = this.aspirationDraft || {};
    const name = this.playerProfile?.name || this.playerName || '你';
    const alignment = this.aspirationAlignmentLabel(draft.alignment);
    const psych = this.aspirationPsychSummary(draft.psychPreferences);
    const topTags = Object.values(draft.psychPreferences?.selected || {}).flat().slice(0, 6).join('、') || '自我成长';
    const lines = [
      `你是${name}，在 2026 现代都市里，行事风格偏向${alignment}。`,
      `决策上${this.aspirationRationalityLabel(draft.rationality)}，六维取向与底线锚点共同塑造你的行动边界。`,
      psych ? `心理偏好上，你最喜欢：${topTags}。` : '',
      '你会在熟悉的生活节奏里，把这些取向慢慢落实成可坚持的选择。',
    ].filter(Boolean);
    return { portrait: lines.join('').slice(0, 220) };
  },

  normalizeAspirationSummary(data = {}) {
    const fallback = this.fallbackAspirationSummary();
    return {
      portrait: String(data.portrait || fallback.portrait).trim().slice(0, 400),
    };
  },

  async generateAspirationSummary() {
    if (this.aspirationBusy) return;
    this.aspirationBusy = true;
    this.aspirationError = '';
    try {
      const draft = this.aspirationDraft || {};
      const cfg = window.GameModules.playerAspirationConfig;
      const primaryGuiltId = this.aspirationPrimaryGuiltLineId(draft.guiltAxes);
      const guilt = cfg.guiltLineById(primaryGuiltId);
      await window.GameModules.assetLoader?.loadChunk?.('prompts');
      window.GameModules.remergeGameStore?.();
      const prompt = await window.GameModules.renderPrompt('player-aspiration-summary', {
        玩家资料: this.playerSetupSummary?.() || '',
        价值选择: this.aspirationSelectionSummary(),
        输入: JSON.stringify({
          alignment: draft.alignment,
          alignmentLabel: this.aspirationAlignmentLabel(draft.alignment),
          rationality: draft.rationality,
          axes: draft.axes,
          guiltAxes: draft.guiltAxes,
          guiltLine: primaryGuiltId,
          guiltLabel: this.aspirationGuiltLineLabel(primaryGuiltId),
          guiltQuote: guilt?.quote || '',
          psychPreferences: draft.psychPreferences?.selected || {},
          psychSummary: this.aspirationPsychSummary(draft.psychPreferences),
        }),
      });
      let data = null;
      try {
        data = await Promise.race([
          window.GameModules.jsonUtils.generateJsonWithRetry({
            source: 'player-aspiration-summary',
            promptId: 'player-aspiration-summary',
            model: this.modelId,
            timeoutMs: 60000,
            prompt,
            format: prompt,
            max: 2,
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('总结生成超时')), 60000)),
        ]);
      } catch (err) {
        console.warn('[人生取向] AI 总结生成失败，使用本地兜底:', err?.message || err);
        data = this.fallbackAspirationSummary();
      }
      this.aspirationSummaryDraft = this.normalizeAspirationSummary(data);
      this.aspirationStep = 6;
    } catch (err) {
      console.error('[人生取向] 生成总结失败:', err.message, err.stack);
      this.aspirationError = err.message || '生成总结失败';
    } finally {
      this.aspirationBusy = false;
    }
  },

  fallbackAspirationGoals() {
    const draft = this.aspirationDraft || {};
    const name = this.playerProfile?.name || this.playerName || '你';
    const role = this.playerProfile?.refinedRole || this.playerProfile?.dailyRole || '现代都市居民';
    const portrait = String(this.aspirationSummaryDraft?.portrait || '').trim();
    const topTags = Object.values(draft.psychPreferences?.selected || {}).flat().slice(0, 4).join('、') || '自我成长';
    return {
      shortTermGoal: `${name}先按总结「${portrait.slice(0, 36)}…」处理眼前一件最要紧的事，从${topTags}相关的具体行动开始。`,
      mediumTermGoal: `在${role}的日常里，让总结中的取向变成稳定习惯，并在现实处境中持续校准。`,
      longTermGoal: `朝着总结所描绘的人生方向持续靠近，让行动、偏好与价值立场保持一致。`,
      summary: portrait.slice(0, 60) || topTags,
    };
  },

  normalizeAspirationGoals(data = {}) {
    const fallback = this.fallbackAspirationGoals();
    return {
      short: String(data.shortTermGoal || data.short || fallback.shortTermGoal).trim().slice(0, 200),
      medium: String(data.mediumTermGoal || data.medium || fallback.mediumTermGoal).trim().slice(0, 200),
      long: String(data.longTermGoal || data.long || fallback.longTermGoal).trim().slice(0, 200),
      summary: String(data.summary || fallback.summary).trim().slice(0, 160),
    };
  },

  async generateAspirationGoals() {
    if (this.aspirationBusy) return;
    this.aspirationBusy = true;
    this.aspirationError = '';
    try {
      const draft = this.aspirationDraft || {};
      const cfg = window.GameModules.playerAspirationConfig;
      const primaryGuiltId = this.aspirationPrimaryGuiltLineId(draft.guiltAxes);
      const guilt = cfg.guiltLineById(primaryGuiltId);
      const prompt = await window.GameModules.renderPrompt('player-aspiration-goals', {
        玩家资料: this.playerSetupSummary?.() || '',
        人生总结: this.aspirationSummaryDraft?.portrait || '',
        价值选择: this.aspirationSelectionSummary(),
        输入: JSON.stringify({
          portraitSummary: this.aspirationSummaryDraft?.portrait || '',
          alignment: draft.alignment,
          alignmentLabel: this.aspirationAlignmentLabel(draft.alignment),
          rationality: draft.rationality,
          axes: draft.axes,
          guiltAxes: draft.guiltAxes,
          guiltLine: primaryGuiltId,
          guiltLabel: this.aspirationGuiltLineLabel(primaryGuiltId),
          guiltQuote: guilt?.quote || '',
          psychPreferences: draft.psychPreferences,
          psychSummary: this.aspirationPsychSummary(draft.psychPreferences),
        }),
      });
      let data = null;
      try {
        data = await Promise.race([
          window.GameModules.jsonUtils.generateJsonWithRetry({
            source: 'player-aspiration-goals',
            promptId: 'player-aspiration-goals',
            model: this.modelId,
            timeoutMs: 60000,
            prompt,
            format: prompt,
            max: 2,
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('目标生成超时')), 60000)),
        ]);
      } catch (err) {
        console.warn('[人生取向] AI 目标生成失败，使用本地兜底:', err.message, err.stack);
        data = this.fallbackAspirationGoals();
      }
      const goals = this.normalizeAspirationGoals(data);
      this.aspirationGoalDraft = goals;
      this.aspirationStep = 7;
    } catch (err) {
      console.error('[人生取向] 生成目标失败:', err.message, err.stack);
      this.aspirationError = err.message || '生成目标失败';
    } finally {
      this.aspirationBusy = false;
    }
  },

  playerAspirationLexiconFields() {
    if (!this.hasPlayerAspiration()) return [];
    const data = this.playerAspiration || {};
    const goals = data.goals || {};
    const worldTag = window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';
    const row = (name, value, desc) => ({
      ...window.GameModules.playerProfileLexicon.row(name, value, desc, worldTag),
      profileGroup: '人生取向',
    });
    return [
      row('人生取向总结', data.portraitSummary || this.aspirationSummaryDraft?.portrait || '', '第 6 步确认的人生取向画像。'),
      row('人生取向摘要', data.summary || goals.summary || '', '激活向导确认后的一句话概括。'),
      row('近期目标', goals.short || '', '数天到数周内可推进的具体方向。'),
      row('中期目标', goals.medium || '', '数月内的成长或处境变化。'),
      row('长期目标', goals.long || '', '数年或人生方向层面的追求。'),
    ];
  },

  async syncEssentialPreferenceLayersToPlayerState() {
    const tool = window.GameModules.playerAspirationPreferenceLayers;
    const layers = tool?.buildFromPlayerAspiration?.(this.playerAspiration);
    if (!layers) return;
    this.playerAspiration = { ...(this.playerAspiration || {}), essentialPreferenceLayers: layers };
    const state = this.playerIdentityState?.();
    if (state?.profile) {
      tool.applyToProfile(state.profile, layers, { locked: true });
      await window.GameModules.sqliteSave?.saveCharacterState?.(state);
      this.rpgStates = { ...(this.rpgStates || {}), [state.id]: state };
    }
  },

  playerAspirationView() {
    if (!this.hasPlayerAspiration()) return null;
    const data = this.playerAspiration || {};
    const cfg = window.GameModules.playerAspirationConfig;
    const guiltAxes = data.guiltAxes || cfg.defaultGuiltAxes();
    const directions = data.directions || cfg.defaultDirections();
    const psychPreferences = data.psychPreferences || cfg.defaultPsychPreferences();
    const axes = data.axes || cfg.defaultAxes();
    const primaryGuiltId = data.guiltLine || cfg.primaryGuiltLineId(guiltAxes);
    return {
      alignmentLabel: data.alignmentLabel || this.aspirationAlignmentLabel(data.alignment),
      rationality: data.rationality ?? 50,
      rationalityLabel: this.aspirationRationalityLabel(data.rationality),
      axes: cfg.axes.map((axis) => {
        const value = axes[axis.key] ?? 50;
        return { ...axis, value, summary: `${axis.title}：${cfg.axisLeanText(value, axis)}（${value}/100）` };
      }),
      guiltLines: cfg.guiltLines.map((item) => {
        const value = guiltAxes[item.id] ?? 50;
        return { ...item, value, summary: `${item.title}：${cfg.guiltLeanText(value, item)}（${value}/100）` };
      }),
      primaryGuiltLabel: this.aspirationGuiltLineLabel(primaryGuiltId),
      psychCategories: cfg.psychPreferenceCategories.map((category) => {
        const groups = cfg.psychCategoryGroups(category).map((group) => ({
          groupLabel: group.label,
          tags: (() => {
            const direct = psychPreferences.selected?.[group.id];
            if (Array.isArray(direct) && direct.length) return direct;
            const legacy = [];
            ['normal', 'acg'].forEach((laneId) => {
              const old = psychPreferences.selected?.[`${laneId}:${group.id}`];
              if (Array.isArray(old)) legacy.push(...old);
            });
            return [...new Set(legacy)];
          })(),
        })).filter((item) => item.tags.length);
        return { ...category, groups };
      }).filter((category) => category.groups.length),
      horizons: cfg.directionHorizons.map((horizon) => {
        const weights = directions[horizon.key] || cfg.defaultDirectionWeights();
        const dominant = cfg.dominantDirection(weights);
        const parts = cfg.directionChoices.map((choice) => `${choice.label}${weights[choice.id] ?? 50}`);
        return {
          ...horizon,
          summary: `${parts.join(' / ')}；主轴偏${dominant?.label || '均衡'}`,
          choices: cfg.directionChoices.map((choice) => {
            const value = weights[choice.id] ?? 50;
            return { ...choice, value, summary: `${choice.label}：${cfg.directionLeanText(value, choice)}（${value}/100）` };
          }),
        };
      }),
      goals: data.goals || {},
      summary: data.summary || data.goals?.summary || '',
    };
  },

  async confirmPlayerAspiration() {
    if (this.aspirationBusy) return;
    const draft = this.aspirationDraft || {};
    if (!draft.alignment) {
      this.aspirationError = '请先完成价值立场选择。';
      this.aspirationStep = 1;
      return;
    }
    this.aspirationBusy = true;
    try {
      const cfg = window.GameModules.playerAspirationConfig;
      const goals = this.normalizeAspirationGoals(this.aspirationGoalDraft || {});
      const primaryGuiltId = this.aspirationPrimaryGuiltLineId(draft.guiltAxes);
      const guilt = cfg.guiltLineById(primaryGuiltId);
      this.playerAspiration = {
        alignment: draft.alignment,
        alignmentLabel: this.aspirationAlignmentLabel(draft.alignment),
        rationality: draft.rationality ?? 50,
        axes: { ...(draft.axes || cfg.defaultAxes()) },
        guiltAxes: { ...(draft.guiltAxes || cfg.defaultGuiltAxes()) },
        guiltLine: primaryGuiltId,
        guiltLabel: this.aspirationGuiltLineLabel(primaryGuiltId),
        guiltQuote: guilt?.quote || '',
        psychPreferences: JSON.parse(JSON.stringify(draft.psychPreferences || cfg.defaultPsychPreferences())),
        essentialPreferenceLayers: window.GameModules.playerAspirationPreferenceLayers?.buildFromAspirationDraft?.(draft),
        portraitSummary: String(this.aspirationSummaryDraft?.portrait || '').trim(),
        directions: JSON.parse(JSON.stringify(draft.directions || cfg.defaultDirections())),
        goals,
        summary: goals.summary,
        completedAt: new Date().toISOString(),
      };
      this.realWorldQuest = goals.short || this.realWorldQuest;
      this.quest = goals.short || this.quest;
      await this.syncEssentialPreferenceLayersToPlayerState?.();
      await this.syncPlayerProfileLexicon?.();
      await this.save?.();
      this.aspirationError = '';
      await this.enterPlayingFromSetup?.();
    } catch (err) {
      console.error('[人生取向] 确认失败:', err.message, err.stack);
      this.aspirationError = err.message || '保存人生取向失败';
    } finally {
      this.aspirationBusy = false;
    }
  },
};


;// ---- result-actions.js ----
/**
 * AI 结果应用与数值回填。
 */
window.GameModules = window.GameModules || {};

window.GameModules.resultActions = {
  async applyResult(result, logId = null) {
    console.log('[回合流程] 应用AI结果:', { sceneTitle: result.sceneTitle, appearedCharacters: result.appearedCharacters?.length || 0, choices: result.choices?.length || 0 });
    this.sceneTitle = result.sceneTitle;
    this.mood = result.mood;
    this.trust = result.trust;
    this.resistance = result.resistance;
    this.quest = result.quest;
    this.updateFeedbackFromResult(result);
    this.choices = result.choices;
    this.applyMetricUpdates(result.metricUpdates);
    await this.applyLexiconUpdatesFromResult(result);
    const genericApplied = await this.applyGenericUpdatesFromResult(result);
    if (genericApplied.length) result.characterCardChanges = [...(result.characterCardChanges || []), ...genericApplied];
    await window.GameModules.entryTime.advance(this, result.elapsedSeconds || 60);
    this.advancePhoneTime?.(result.elapsedSeconds || 60);
    this.checkWorkReminder?.();
    await this.ensureRpgFromResults(result);
    await this.applyStatChanges(result.statChanges, result);
    await this.applyControlExperience(result);
    await this.refreshControlLinkStates?.();
    await window.GameModules.characterMemory.recordTurn(this, result);
    if (this.updateWorldlineFromTurn) this.updateWorldlineFromTurn(result).catch((err) => console.warn('[世界线] 回合更新跳过:', err.code, err.message));
    if (!this.finalizeNovelEntry(logId, result)) {
      const id = this.addNovelEntry(this.lastAction || '继续推进');
      this.finalizeNovelEntry(id, result);
    }
  },

  updateFeedbackFromResult(result) {
    const mind = String(result.mind || '').trim();
    const intent = String(result.characterIntent || '').trim();
    if (result.source === 'ai' && (mind || intent)) {
      this.mindText = mind || this.mindText;
      this.characterIntent = intent || this.characterIntent;
      this.feedbackSource = 'ai';
      console.debug('[角色反馈] 剧情AI回填:', { mindLength: mind.length, intentLength: intent.length });
      return;
    }
    console.debug('[角色反馈] 保留现有反馈:', { source: result.source, hasMind: Boolean(mind), currentSource: this.feedbackSource });
  },

  applyMetricUpdates(updates) {
    window.GameModules.metrics.apply(this, updates);
    this.metricsReady = true;
    this.syncMetricDerived();
  },

  async applyLexiconUpdatesFromResult(result) {
    if (!Array.isArray(result.lexiconUpdates) || !result.lexiconUpdates.length) return;
    const cardChanges = await window.GameModules.characterCardLexicon?.applyToState?.(this.currentRpgState, result.lexiconUpdates) || [];
    result.characterCardChanges = cardChanges;
    await window.GameModules.rpgLexicon.applyLexiconSkill(result.lexiconUpdates.filter((item) => item?.kind !== '角色卡' && item?.kind !== '角色技能'));
    await this.applyInventoryUpdatesToState?.(this.currentRpgState, result.lexiconUpdates);
    for (const item of result.lexiconUpdates) {
      if (item?.kind === '职业' && item?.name) await this.knowProfession?.(item.name, item.worldTag || this.character?.work, { sourceReason: item.reason || '剧情推演中出现并确认该职业', characterName: this.character?.name, role: this.character?.role, detail: item.description || item.summary || this.character?.detail });
    }
  },

  async applyGenericUpdatesFromResult(result = {}) {
    let updates = Array.isArray(result.genericUpdates) ? result.genericUpdates : [];
    updates = window.GameModules.orgTerritory?.filterUpdatesForStoryWorld?.(updates, this) || updates;
    if (!updates.length) return [];
    await window.GameModules.updateRegistry?.applyGeneric?.(this, updates);
    return updates.map((item) => {
      const subject = item.subject || {};
      const field = item.field || item.updateType || '状态';
      const value = item.change?.value ?? item.value ?? '';
      return `角色卡：${subject.name || subject.id || this.character?.name || '目标'} ${field} 已更新${value && typeof value !== 'object' ? `：${value}` : ''}`;
    });
  },

  applyInitialMetrics(updates) {
    this.temporaryEmotions = {};
    this.temporaryPlayerFeelings = {};
    window.GameModules.metrics.applyInitial(this, updates);
    this.metricsReady = true;
    this.syncMetricDerived();
  },

  async applyMetricUpdatesToState(state, updates) {
    if (!state?.id) return;
    const metrics = this.ensureStateMetrics(state);
    Object.keys(metrics.temporaryEmotions).forEach((key) => { metrics.temporaryEmotions[key] = Math.max(0, window.GameModules.metrics.clamp(metrics.temporaryEmotions[key]) - 1); });
    Object.keys(metrics.temporaryPlayerFeelings).forEach((key) => { metrics.temporaryPlayerFeelings[key] = Math.max(0, window.GameModules.metrics.clamp(metrics.temporaryPlayerFeelings[key]) - 1); });
    window.GameModules.metrics.applyGroup(metrics.emotions, updates?.emotions, metrics.notes, 'emotion', metrics.temporaryEmotions);
    window.GameModules.metrics.applyGroup(metrics.playerFeelings, updates?.playerFeelings, metrics.notes, 'player', metrics.temporaryPlayerFeelings);
    this.rpgStates = { ...this.rpgStates, [state.id]: state };
    if (state.id === this.character?.id) this.loadMetricsFromCharacterState(state);
    await window.GameModules.sqliteSave.saveCharacterState(state);
  },

  loadMetricsFromCharacterState(state = this.characterRpgState) {
    const metrics = this.ensureStateMetrics(state);
    this.emotions = { ...metrics.emotions };
    this.playerFeelings = { ...metrics.playerFeelings };
    this.temporaryEmotions = { ...(metrics.temporaryEmotions || {}) };
    this.temporaryPlayerFeelings = { ...(metrics.temporaryPlayerFeelings || {}) };
    this.metricNotes = { ...(metrics.notes || {}) };
    this.metricsReady = true;
    this.syncMetricDerived();
  },

  syncMetricDerived() {
    this.trust = this.playerFeelings.信任;
    this.resistance = this.playerFeelings.反抗;
    this.mood = Object.entries(this.emotions).sort((a, b) => b[1] - a[1])[0]?.[0] || this.mood;
  },

  async applyStatChanges(changes, result = {}) {
    const state = this.characterRpgState;
    if (!state?.values) return;
    window.GameModules.progression.applySceneChanges(state, changes, result);
    window.GameModules.rpgInitializer?.touch(state.values, this);
    this.rpgStates = { ...this.rpgStates, [state.id]: state };
    await window.GameModules.sqliteSave.saveCharacterState(state);
  },

  async applyControlExperience(result) {
    if (!this.online || this.controlMode !== 'possess') return;
    const state = this.characterRpgState;
    if (!state?.values) return;
    const exp = state.values.control_experience || { onlineCount: 0, feeling: '未知', adaptation: 0, summary: '', lastUpdated: '' };
    exp.onlineCount = Math.max(0, Number(exp.onlineCount) || 0);
    exp.feeling = result.controlFeeling || exp.feeling || '疑惑';
    exp.adaptation = Math.max(0, Math.min(100, Math.round(Number(result.controlAdaptation ?? exp.adaptation) || 0)));
    exp.summary = result.controlExperienceSummary || exp.summary || '';
    exp.lastUpdated = new Date().toISOString();
    state.values.control_experience = exp;
    window.GameModules.rpgInitializer?.touch(state.values, this);
    this.rpgStates = { ...this.rpgStates, [state.id]: state };
    await window.GameModules.sqliteSave.saveCharacterState(state);
  },
};


;// ---- style-actions.js ----
/**
 * 小说文风：默认预设、多选、自定义，并写入 SQLite metadata。
 */
window.GameModules = window.GameModules || {};

window.GameModules.styleActions = {
  defaultWritingStyles: [
    { id: 'literary', name: '文学细腻', prompt: '正文使用细腻文学文风，重视感官、动作细节和心理余波，避免口号式总结。' },
    { id: 'dark', name: '黑暗压抑', prompt: '正文氛围偏阴冷压抑，描写痛感、窒息感、阴影和危险，但不堆砌血腥。' },
    { id: 'light-novel', name: '轻小说节奏', prompt: '正文节奏清晰，场景推进明确，角色反应鲜明，句子易读但不口语化。' },
    { id: 'epic', name: '史诗庄重', prompt: '正文语言庄重、有命运感，强调时代、仪式、魔术体系和抉择重量。' },
    { id: 'suspense', name: '悬疑紧张', prompt: '正文保持悬疑张力，逐步揭示信息，用细节暗示危险，不直接解释全部真相。' },
  ],

  async loadWritingStyles(options = {}) {
    const registered = window.GameModules.penStyleRegistry?.list?.() || [];
    if (registered.length) this.defaultWritingStyles = registered;
    const saved = window.GameModules.sqliteSave.getMetaJson?.('writing_styles');
    this.customWritingStyles = Array.isArray(saved?.custom) ? saved.custom : [];
    const availableIds = new Set(this.allWritingStyles().map((style) => style.id));
    const active = Array.isArray(saved?.active) ? saved.active.filter((id) => availableIds.has(id)) : [];
    const preferredDefault = availableIds.has('spring-heart') ? 'spring-heart' : (this.defaultWritingStyles[0]?.id || 'literary');
    this.activeStyleIds = (!saved || (active.length === 1 && active[0] === 'literary')) ? [preferredDefault] : (active.length ? active : [preferredDefault]);
    this.customStyleName = '';
    this.customStylePrompt = '';
    if (options.skipSave) return;
    await this.saveWritingStyles(options);
  },

  selectedWritingStyleId() {
    return this.activeStyleIds[0] || this.defaultWritingStyles[0]?.id || 'literary';
  },

  async selectWritingStyle(id) {
    if (!id) return;
    this.activeStyleIds = [id];
    await this.saveWritingStyles();
  },

  allWritingStyles() {
    const registered = window.GameModules.penStyleRegistry?.list?.() || [];
    const defaults = registered.length ? registered : this.defaultWritingStyles;
    return [...defaults, ...this.customWritingStyles];
  },

  selectedWritingStyle() {
    const id = this.selectedWritingStyleId();
    return this.allWritingStyles().find((style) => style.id === id) || this.allWritingStyles()[0] || null;
  },

  selectedWritingStylePrompt() {
    const selected = this.selectedWritingStyle();
    const prompt = String(selected?.prompt || '').trim();
    return selected && prompt ? `【${selected.name}】\n${prompt}` : '';
  },

  isStyleActive(id) {
    return this.activeStyleIds.includes(id);
  },

  async toggleWritingStyle(id, enabled) {
    const ids = new Set(this.activeStyleIds);
    if (enabled) ids.add(id); else ids.delete(id);
    this.activeStyleIds = [...ids];
    await this.saveWritingStyles();
  },

  async addCustomWritingStyle() {
    const name = this.customStyleName.trim().slice(0, 18);
    const prompt = this.customStylePrompt.trim().slice(0, 500);
    if (!name || !prompt) return;
    const item = { id: `custom-${Date.now()}`, name, prompt };
    this.customWritingStyles = [...this.customWritingStyles, item];
    this.activeStyleIds = [...new Set([...this.activeStyleIds, item.id])];
    this.customStyleName = '';
    this.customStylePrompt = '';
    await this.saveWritingStyles();
  },

  async removeCustomWritingStyle(id) {
    this.customWritingStyles = this.customWritingStyles.filter((x) => x.id !== id);
    this.activeStyleIds = this.activeStyleIds.filter((x) => x !== id);
    await this.saveWritingStyles();
  },

  async saveWritingStyles(options = {}) {
    await window.GameModules.sqliteSave.saveMetaJson?.('writing_styles', {
      active: this.activeStyleIds,
      defaults: this.defaultWritingStyles,
      custom: this.customWritingStyles,
    }, options);
  },

  writingStylePrompt() {
    const active = this.allWritingStyles().filter((style) => this.activeStyleIds.includes(style.id));
    return active.map((style) => {
      const prompt = String(style.prompt || '').trim();
      return prompt ? `【${style.name}】\n${prompt}` : '';
    }).filter(Boolean).join('\n\n');
  },
};


;// ---- worldline-actions.js ----
/**
 * 图书馆世界线展示辅助。
 */
window.GameModules = window.GameModules || {};

window.GameModules.worldlineActions = {
  openWorldlineApp() {
    this.closeDesktopApps?.();
    this.worldlineAppOpen = true;
    this.desktopUnlocked = true;
  },

  closeWorldlineApp() {
    this.worldlineAppOpen = false;
    this.closeAppToDesktop?.();
  },

  selectWorldlineDebugSection(name) {
    this.worldlineDebugSection = name || '世界线APP主面板';
  },

  isWorldlineDebugSection(name) {
    return this.worldlineDebugSection === name;
  },

  toggleWorldline(lore) {
    if (!this.loreWorldline(lore)) return;
    const tag = lore?.worldTag || '';
    if (!tag) return;
    this.expandedWorldlineTag = this.expandedWorldlineTag === tag ? '' : tag;
  },

  isWorldlineOpen(lore) {
    return Boolean(lore?.worldTag && this.expandedWorldlineTag === lore.worldTag);
  },

  controlWorldLores() {
    const realTag = this.realWorldTag();
    return (this.savedWorldLores || []).filter((lore) => lore.worldTag !== realTag);
  },

  realWorldTag() {
    return window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';
  },

  realWorldLore() {
    const tag = this.realWorldTag();
    const saved = (this.savedWorldLores || []).find((lore) => lore.worldTag === tag) || {};
    return { worldTag: tag, background: saved.background || this.playerProfile?.worldbuildingNote || '玩家所在的现代都市现实世界。', factions: saved.factions || [], specialJobs: saved.specialJobs || [], jobRanks: saved.jobRanks || [], specialFields: saved.specialFields || [], worldline: this.realWorldline() };
  },

  realWorldline() {
    const state = this.realWorldlineState || { events: [], plots: [], pendingPlot: null };
    const logEvents = (this.realWorldLog || []).filter((entry) => entry.type === 'ai' || entry.type === 'system').map((entry, index) => ({
      eventId: `real_${entry.id || index}`, name: entry.sceneTitle || entry.locationName || this.realWorldSceneTitle || '现实事件', time: entry.time?.label || entry.createdAt || `${this.phoneDateText?.() || ''} ${this.phoneTimeText?.() || ''}`.trim(), summary: entry.plotId || '未分配情节', plotId: entry.plotId || '', detail: String(entry.narration || entry.thinking || entry.text || ''), status: entry.streaming ? '记录中' : '已记录', kind: 'event',
    }));
    const byId = new Map([...(state.events || []), ...logEvents].map((event) => [event.eventId, { ...event, kind: 'event' }]));
    const events = [...byId.values()];
    return { timeRange: `${this.phoneDateText?.() || '现实时间'} - 现在`, events, plots: state.plots || [], pendingPlot: state.pendingPlot || null, storyIndexes: ['现实世界独立记录，不并入被操控世界线'], factions: {} };
  },

  loreWorldline(lore) {
    if (!lore?.worldTag) return null;
    if (!lore.worldline) lore.worldline = window.GameModules.sqliteSave.getWorldline?.(lore.worldTag) || null;
    return lore.worldline;
  },

  timelineItems(lore) {
    const worldline = this.loreWorldline(lore) || {};
    const events = this.worldlineEventsNewestFirst(worldline.events || []).map((event, index) => ({ ...event, kind: 'event', order: index }));
    const indexes = (worldline.storyIndexes || []).map((text, index) => ({ kind: 'story', order: events.length + index, time: '原著剧情', name: `剧情索引 ${index + 1}`, summary: text }));
    return [...events, ...indexes];
  },

  worldlineEventsNewestFirst(events = []) {
    return (Array.isArray(events) ? events : []).map((event, index) => ({ ...event, order: index })).sort((a, b) => String(b.time || '').localeCompare(String(a.time || '')) || b.order - a.order);
  },

  worldlinePlots(lore) {
    return window.GameModules.worldlinePlots.items(this.loreWorldline(lore) || {});
  },

  realWorldSummarizedPlots() {
    return this.realWorldline().plots || [];
  },

  selectRealWorldPlot(plotId) {
    this.selectedRealWorldPlotId = plotId || '';
  },

  realWorldSelectedPlot() {
    const plots = this.realWorldSummarizedPlots();
    return plots.find((plot) => plot.情节编号 === this.selectedRealWorldPlotId) || plots[0] || null;
  },

  realWorldPlotEvents(plot = null) {
    const selected = plot || this.realWorldSelectedPlot();
    const id = selected?.情节编号 || '';
    if (!id) return [];
    const recordIds = String(selected?.重要记录编号 || '').split(/[、,，\s]+/).filter(Boolean);
    return this.worldlineEventsNewestFirst(this.realWorldline().events || []).filter((event) => (event.plotId || event.summary) === id || recordIds.includes(event.eventId));
  },

  realWorldRecordingEvents() {
    const ids = this.realWorldline().pendingPlot?.recordIds || [];
    if (!ids.length) return [];
    return this.worldlineEventsNewestFirst(this.realWorldline().events || []).filter((event) => ids.includes(event.eventId));
  },

  timelineMeta(item) {
    const parts = [];
    if (item.status) parts.push(item.status);
    if (item.kind === 'event' && (item.plotId || item.summary)) parts.push(`情节:${item.plotId || item.summary}`);
    if (item.storyIndexes?.length) parts.push(`剧情:${item.storyIndexes.join('、')}`);
    if (item.factionIds?.length) parts.push(`势力:${item.factionIds.join('、')}`);
    return parts.join('｜') || (item.kind === 'story' ? '原著剧情索引' : '世界线事件');
  },

  async ensureWorldline(context = '') {
    const worldTag = this.character?.work || '原创世界';
    const lore = await window.GameModules.worldLore.ensure(worldTag, context || this.entryCurrentAction || this.sceneTitle);
    const line = this.loreWorldline(lore) || window.GameModules.worldLore.worldline(null, lore, worldTag);
    const shouldRecordConnection = !line.events?.length || /按下连接按钮|玩家上线连接|附身到|进入异世界|操控连接/u.test(String(context || ''));
    if (shouldRecordConnection) {
      const event = this.connectionWorldlineEvent(line, context);
      if (!(line.events || []).some((item) => item.eventId === event.eventId)) {
        line.events = [...(line.events || []), event];
        await window.GameModules.worldlinePlots.assign(this, line, event);
        lore.worldline = line;
        await window.GameModules.sqliteSave.saveWorldLore(worldTag, lore);
      }
    }
    if (!this.expandedWorldlineTag) this.expandedWorldlineTag = worldTag;
    return lore;
  },

  connectionWorldlineEvent(line = {}, context = '') {
    const eventId = `connection_${this.worldlineSafeId(this.character?.id || this.character?.name || 'character')}_${this.worldlineSafeId(this.entryTimeLabel?.() || this.sceneTitle || 'time')}_${this.turn || 1}`.slice(0, 120);
    return {
      eventId,
      name: '玩家上线连接',
      time: this.entryTimeLabel?.() || this.sceneTitle || '当前时间',
      detail: [
        `玩家：${this.playerName || this.playerProfile?.name || '玩家'}`,
        `操控对象：${this.character?.name || '未知角色'}｜作品：${this.character?.work || '原创世界'}｜模式：${this.online ? 'online' : 'offline'}｜${this.controlMode || 'possess'}`,
        `进入上下文：${String(context || this.entryCurrentAction || '玩家连接角色，世界线开始记录偏移。')}`,
      ].join('\n'),
      storyIndexes: line.storyIndexes || ['默认剧情起点'],
      factionIds: Object.keys(line.factions || {}).slice(0, 2),
      status: '进行中',
    };
  },

  async updateWorldlineFromTurn(result = {}) {
    const worldTag = this.character?.work || '原创世界';
    const lore = await this.ensureWorldline(`${this.entryTimeLabel?.() || this.sceneTitle} ${result.narration || ''}`);
    const line = this.loreWorldline(lore);
    if (!line) return;
    const eventId = this.worldlineTurnEventId(result);
    if (!(line.events || []).some((event) => event.eventId === eventId)) {
      const event = { eventId, name: result.sceneTitle || this.sceneTitle, time: this.entryTimeLabel?.() || this.sceneTitle, detail: this.worldlineTurnDetail(result), storyIndexes: line.storyIndexes || [], factionIds: Object.keys(line.factions || {}).slice(0, 2), status: '进行中' };
      line.events = [...(line.events || []), event];
      await this.appendWorldlineEvent(line, event);
      lore.worldline = line;
      await window.GameModules.sqliteSave.saveWorldLore(worldTag, lore);
    }
  },

  worldlineTurnEventId(result = {}) {
    const time = this.worldlineSafeId(this.entryTimeLabel?.() || this.sceneTitle || 'time').slice(0, 40) || 'time';
    const name = this.worldlineSafeId(this.character?.id || this.character?.name || 'character').slice(0, 24) || 'character';
    const title = this.worldlineSafeId(result.sceneTitle || this.sceneTitle || 'scene').slice(0, 24) || 'scene';
    return `turn_${name}_${time}_${title}_${this.turn || 1}`.slice(0, 120);
  },

  worldlineSafeId(value = '') {
    return String(value || '').replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '');
  },

  worldlineTurnDetail(result = {}) {
    return [
      `玩家：${this.playerName || this.playerProfile?.name || '玩家'}`,
      `操控对象：${this.character?.name || '未知角色'}｜作品：${this.character?.work || '原创世界'}｜模式：${this.online ? 'online' : 'offline'}｜${this.controlMode || 'possess'}`,
      `玩家行动：${this.lastAction || this.entryCurrentAction || ''}`,
      `正文：${String(result.narration || '')}`,
      result.mind ? `被操控者心理：${result.mind}` : '',
      result.quest ? `结果目标：${result.quest}` : '',
    ].filter(Boolean).join('\n');
  },

  async appendWorldlineEvent(line, event, prefix = '情节') {
    await window.GameModules.worldlinePlots.assign(this, line, event, prefix);
  },

  worldlineFactions(lore) {
    const factions = this.loreWorldline(lore)?.factions || {};
    return Object.entries(factions).map(([id, value]) => ({ id, ...value }));
  },

  factionAttrs(faction) {
    return Object.entries(faction?.属性 || {}).map(([key, value]) => `${key}:${value}`).join('；') || '无';
  },

  factionRelations(faction) {
    return Object.entries(faction?.关系网 || {}).map(([key, value]) => `${key}:${value}`).join('；') || '无';
  },
};


;// ---- social-position.js ----
window.GameModules = window.GameModules || {};

window.GameModules.socialPosition = {
  splitRole(role) {
    return String(role || '').split(/[，,、；;]/).map((x) => x.trim()).filter(Boolean);
  },

  cleanLevel(text) {
    return String(text || '').replace(/lv\.?\d+/ig, '').trim();
  },

  mainProfession(role) {
    return this.cleanLevel(this.splitRole(role)[0] || role || '现代都市居民');
  },

  workplace(role, city = '') {
    const job = this.mainProfession(role);
    if (/程序|软件|开发|计算机|工程师/.test(job)) return '成都星河云栈科技有限公司';
    if (/医生|护士|医疗/.test(job)) return '成都市第三人民医院';
    if (/教师|老师|教授/.test(job)) return '成都市第七中学';
    if (/律师|法务/.test(job)) return '锦城联合律师事务所';
    if (/学生|高中|初中|小学|大学/.test(job)) return `${String(city || '本地').slice(0, 8)}第一中学`;
    return '成都青羊综合服务有限公司';
  },

  position(role) {
    const job = this.mainProfession(role);
    if (/程序|软件|开发|计算机|工程师/.test(job)) return /硕士|专家|lv\.?[5-7]/i.test(role) ? '高级后端工程师' : '软件工程师';
    if (/医生/.test(job)) return '主治医师';
    if (/护士/.test(job)) return '护士';
    if (/教师|老师|教授/.test(job)) return '任课教师';
    if (/学生|高中|初中|小学|大学/.test(job)) return '在读学生';
    return job && !/居民/.test(job) ? job : '居民';
  },

  concreteReason(text, fallback) {
    const value = String(text || '').trim();
    if (value && !/^(AI演算|系统结算|系统词条调整|用户主动)$/.test(value)) return value.slice(0, 120);
    return String(fallback || '该词条由当前角色资料中的明确归属关系生成。').slice(0, 120);
  },

  item(community, role, reason = '') {
    const f = String(community || '未设定社群').trim();
    const r = String(role || '成员').trim();
    const detail = this.concreteReason(reason, `${f}来自角色当前住址、家庭、社交圈或临时群体资料，${r}是其在该社群中的社会角色。`);
    return { name: `${f} / ${r}`, type: '社群角色', faction: f, community: f, role: r, position: r, level: -1, description: `社群：${f}；角色：${r}。该词条表示角色当前所属的居住社区、家庭、社交圈或临时群体，以及其在其中承担的社会角色。`, source: 'ai', reason: detail, changeMode: detail };
  },

  forceItem(force, position, reason = '', factionsOrStore = null) {
    const f = String(force || '未设定势力').trim();
    const p = String(position || '成员').trim();
    const detail = this.concreteReason(reason, `${f}是角色资料中可确认的组织、机构或国家级归属，${p}是其在该势力中的当前地位。`);
    const store = factionsOrStore && factionsOrStore.factionState ? factionsOrStore : { factionState: { factions: Array.isArray(factionsOrStore) ? factionsOrStore : [] } };
    const orgId = window.GameModules.orgTerritory?.resolveOrgIdByName?.(store, f) || '';
    return {
      name: `${f} / ${p}`,
      type: '势力地位',
      force: f,
      faction: f,
      position: p,
      orgId,
      department: '',
      departmentFog: true,
      level: -1,
      description: `势力：${f}；地位：${p}。${orgId ? `组织ID：${orgId}。` : ''}该词条表示角色在有层级制度的国家、公司、学校、部门、军队、宗门、机构或组织中的等级、职级、年级、职位或法定身份。`,
      source: 'ai',
      reason: detail,
      changeMode: detail,
    };
  },

  playerItems(profile = {}) {
    const city = profile.refinedCity || profile.city || profile.faction || '';
    const community = city || '登记住址';
    return [this.item(community, '居民', `玩家资料登记的现实住址为${community}，因此玩家本人属于该居住社群并以居民身份显示。`)];
  },

  countryForceItems() {
    return [];
  },

  playerForceItems(profile = {}, factionsOrStore = null) {
    const role = profile.refinedRole || profile.dailyRole || profile.role || profile.job;
    const city = profile.refinedCity || profile.city || profile.faction || '';
    const workplace = profile.workplace || this.workplace(role, city);
    const position = profile.position || this.position(role);
    const reason = `玩家资料中的现实身份为${role || '现代都市居民'}，工作或学习归属确定为${workplace}，因此在该势力中的地位为${position || '成员'}。`;
    return workplace ? [this.forceItem(workplace, position || '成员', reason, factionsOrStore)] : [];
  },

  membershipItems(profile = {}, factionsOrStore = null) {
    const store = factionsOrStore && factionsOrStore.factionState ? factionsOrStore : { factionState: { factions: Array.isArray(factionsOrStore) ? factionsOrStore : [] } };
    const ot = window.GameModules.orgTerritory;
    return this.playerForceItems(profile, factionsOrStore).map((fp) => ot?.membershipFromForcePosition?.(fp, store) || fp);
  },
};


;// ---- player-profile-lexicon.js ----
window.GameModules = window.GameModules || {};

window.GameModules.playerProfileLexicon = {
  reason(label, value) {
    const v = value || '未填写';
    const map = {
      所属世界: `玩家当前从手机入口进入${v}，现实行动、联系人和公司系统都以这个世界为边界。`,
      姓名: `玩家以“${v}”完成手机激活，后续联系人称呼和身份卡都沿用这个登记名。`,
      性别: `玩家登记性别为“${v}”，会影响现实联系人称呼和部分生活场景描写。`,
      生日: `玩家登记生日为“${v}”，年龄、学校/工作阶段和家庭关系判断都据此展开。`,
      年龄: `年龄显示为“${v}”，由生日推算后用于判断学习、工作、家庭责任和行动体力。`,
      具体地址: `具体地址为“${v}”，现实地图、社群角色和通勤范围都围绕该居住地点展开。`,
      现实身份: `现实身份为“${v}”，玩家最近行动动机、职业压力和日常任务会按这个身份展开。`,
      势力地位: `势力地位为“${v}”，说明玩家当前依附的学校/公司/组织及其内部位置。`,
      社群角色: `社群角色为“${v}”，说明玩家在居住社区或生活圈中的长期关系位置。`,
      居住状态: `居住状态为“${v}”，会影响玩家最近休息、家庭互动和可获得的照料或压力。`,
      财富等级: `财富等级为“${v}”，会影响玩家可支配资源、消费能力和现实压力。`,
      当前财富: `当前财富为“${v}”，作为玩家现金资产与生活底气的现实依据。`,
      财富来源: `财富来源为“${v}”，会解释玩家资产中父母遗产、本人打工与公司薪酬绩效的量化构成。`,
      固定收入: `固定收入为“${v}”，玩家担任公司员工时按该薪酬与绩效规则持续获得收入。`,
      性经验次数: `性经验次数为“${v}”，只作为成人虚构身份的抽象数值记录，不包含过程描写。`,
      当前身体状态: `当前身体状态为“${v}”，只记录身体部位的中性短状态，用于护理与现实判定。`,
      父母状态: `父母状态为“${v}”，会影响玩家家庭责任、情绪底色和亲属关系动机。`,
      父母去世原因: `父母去世原因为“${v}”，这是玩家家庭创伤和长期生活压力的来源之一。`,
      人际关系: `人际关系为“${v}”，后续微信联系人、亲疏和信任动机会优先引用这些关系。`,
      世界观补全: `世界观补全为“${v}”，用于解释玩家当前生活压力、职业方向和近期处境。`,
      备注: `备注为“${v}”，会作为玩家偏好、秘密、关系边界或最近状态的额外证据。`,
    };
    return map[label] || `${label}当前为“${v}”，后续剧情会把它作为玩家经历、偏好或近况证据。`;
  },

  row(name, value, desc, worldTag) {
    const reason = window.GameModules.playerProfileLexicon.reason(name, value || '未填写');
    return { key: `player-${name}`, label: name, kind: '玩家设定', value: value || '未填写', raw: value || '', desc, reason, worldTag, targetType: '非角色', commonField: name !== '所属世界' };
  },
};


;// ---- player-setup-actions.js ----
window.GameModules = window.GameModules || {};

window.GameModules.playerSetupActions = {
  playerProfileLexiconFields() {
    const p = this.playerProfile || {};
    const worldTag = window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';
    const row = (name, value, desc) => window.GameModules.playerProfileLexicon.row(name, value, desc, worldTag);
    const fields = [
      row('所属世界', worldTag, '玩家当前所在的现实世界。'),
      row('操控应用', window.GameModules.gamePremise?.appName || '我要狠狠操控的', '旧手机损坏后，新手机同步完成时出现在桌面的神秘应用；可操控现实与异世界人物，条件满足后可连接并召唤。'),
      row('姓名', p.name || this.playerName, '玩家登记的姓名或代号。'),
      row('性别', p.gender, '玩家登记的性别。'),
      row('生日', p.birthday, '玩家登记生日，用于计算年龄与现实身份。'),
      row('年龄', p.age ? `${p.age}岁` : '', '由生日按2026-06-12计算得到。'),
      row('具体地址', p.refinedCity || p.city, '玩家当前登记住址。'),
      row('现实身份', p.refinedRole || p.dailyRole, '玩家在2026现实世界中的日常身份。'),
      row('势力地位', [p.workplace, p.position].filter(Boolean).join(' / '), '玩家当前工作、学习或组织势力及其内部地位。'),
      row('社群角色', [p.refinedCity || p.city, '居民'].filter(Boolean).join(' / '), '玩家当前居住社群及其中承担的社会角色。'),
      row('居住状态', p.refinedLivingStatus || p.livingStatus, '玩家当前居住与生活状态。'),
      row('性经验次数', this.playerIdentityState?.()?.values?.intimacy?.sexualExperienceCount ?? 0, '成人虚构身份的抽象经历次数，只记录数值。'),
      row('当前身体状态', Object.values(this.playerIdentityState?.()?.values?.bodyStatus || {}).map((item) => `${item.part || item.partKey}：${item.status || '稳定'}`).join('；') || '未记录', '身体部位的中性短状态记录。'),
      row('父母状态', p.parentStatus || p.parents || '父母已故', '玩家父母当前状态。'),
      row('父母去世原因', p.parentDeathCause || '待生成', '父母已故时的入库死因。'),
      row('人际关系', p.relationships || '由玩家自行设定，暂无补充', '玩家明确填写的人际关系。'),
      row('世界观补全', p.worldbuildingNote || '暂无', 'AI围绕玩家资料补全的现实背景。'),
      row('备注', p.notes || '无', '玩家补充设定。'),
    ];
    return fields;
  },

  playerProfileFieldsForView() {
    return [
      ...this.playerProfileLexiconFields(),
      ...(this.playerAspirationLexiconFields?.() || []),
    ];
  },

  playerSetupSummary() {
    return this.playerProfileFieldsForView().map((x) => `${x.label}：${x.value}`).join('\n');
  },

  normalizeRelationshipEntries(entries = null, text = '') {
    const source = Array.isArray(entries) ? entries : [];
    const parsed = source.length ? source : String(text || '').split(/[；;\n]+/).map((part) => {
      const pair = String(part || '').split(/[：:]/);
      return { relation: pair[0] || '', name: pair.slice(1).join('：') || '', detail: '' };
    });
    return parsed.map((entry) => ({
      relation: String(entry?.relation || '').trim().slice(0, 60),
      name: String(entry?.name || '').trim().slice(0, 60),
      detail: String(entry?.detail || entry?.context || '').trim().slice(0, 1000),
    })).filter((entry) => entry.relation || entry.name || entry.detail);
  },

  relationshipEntriesText(entries = null) {
    return this.normalizeRelationshipEntries(entries || this.playerProfile?.relationshipEntries, this.playerProfile?.relationships)
      .filter((entry) => entry.relation && entry.name)
      .map((entry) => `${entry.relation}：${entry.name}`)
      .join('；');
  },

  relationshipEntriesPrompt(entries = null) {
    const list = this.normalizeRelationshipEntries(entries || this.playerProfile?.relationshipEntries, this.playerProfile?.relationships);
    if (!list.length) return '未填写';
    return list.map((entry, index) => [
      `关系${index + 1}`,
      `关系名=${entry.relation || '未填写'}`,
      `姓名=${entry.name || '未填写'}`,
      `完整设定=${entry.detail || '无'}`,
    ].join('；')).join('\n');
  },

  isWechatPlaceholderName(name = '') {
    const text = String(name || '').trim();
    return !text || /待命名|待AI补全|等待AI补全|等待ai补全|姓名待AI补全/i.test(text)
      || /^(妹妹|姐姐|哥哥|弟弟|父亲|母亲|爸爸|妈妈|女友|男友|妻子|丈夫|联系人)$/.test(text)
      || /^(双胞胎|三胞胎|多胞胎)?(妹妹|姐姐|哥哥|弟弟|兄弟|姐妹|联系人)(之一|之二|之三|其一|其二|其三)$/.test(text);
  },

  inferRoleCardUsersFromRelationshipEntries() {
    const entries = this.normalizeRelationshipEntries(this.playerProfile?.relationshipEntries, this.playerProfile?.relationships);
    const selfName = String(this.playerProfile?.name || this.playerName || '').trim();
    return entries.filter((entry) => entry.relation || entry.name).flatMap((entry, index) => {
      const relation = String(entry.relation || '关系联系人').trim().slice(0, 18);
      const name = String(entry.name || relation).trim().slice(0, 24);
      if (!name || name === selfName) return [];
      const needsNameAi = !entry.name || this.isWechatPlaceholderName(name);
      const context = [`关系名：${relation}`, `姓名：${entry.name || '未填写'}`, `设定：${entry.detail || '无'}`].join('\n');
      const id = `rel-ai-${window.GameModules.rpgState.seed(`${relation}-${name}-${index}`)}`;
      return [{ id, characterId: id, name, relation, latest: `${relation}资料已从玩家人际关系同步。`, source: 'relationships-structured', context, needsNameAi }];
    });
  },

  inferActivationRoleCardUsers() {
    const structured = this.inferRoleCardUsersFromRelationshipEntries();
    if (structured.length) return structured;
    const wechat = window.GameModules.wechatActions;
    if (typeof wechat?.inferWechatUsersFromProfile === 'function') return wechat.inferWechatUsersFromProfile.call(this);
    if (typeof wechat?.inferWechatUsersFromRelationships === 'function') {
      return wechat.inferWechatUsersFromRelationships.call(this, this.playerProfile?.relationships || '');
    }
    return [];
  },

  syncRelationshipTextFromEntries() {
    this.playerProfile.relationshipEntries = this.normalizeRelationshipEntries(this.playerProfile.relationshipEntries, this.playerProfile.relationships);
    this.playerProfile.relationships = this.relationshipEntriesText(this.playerProfile.relationshipEntries);
  },

  addPlayerRelationshipEntry() {
    this.playerProfile.relationshipEntries = [...this.normalizeRelationshipEntries(this.playerProfile.relationshipEntries, this.playerProfile.relationships), { relation: '', name: '', detail: '' }];
  },

  removePlayerRelationshipEntry(index) {
    this.playerProfile.relationshipEntries = this.normalizeRelationshipEntries(this.playerProfile.relationshipEntries, this.playerProfile.relationships).filter((_, i) => i !== index);
    this.syncRelationshipTextFromEntries();
  },

  backActivationChoice() {
    this.phoneActivationChoice = '';
  },

  async useExistingAccountSetup() {
    await this.completePlayerSetup();
  },

  playerAgeFromBirthday(birthday) {
    const birth = new Date(`${birthday}T00:00:00`);
    const now = new Date('2026-06-12T00:00:00');
    if (Number.isNaN(birth.getTime())) return '';
    let age = now.getFullYear() - birth.getFullYear();
    const passed = now.getMonth() > birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
    if (!passed) age -= 1;
    return Math.max(0, age);
  },

  async completePlayerSetup(options = {}) {
    if (this.profileSetupBusy) return;
    const name = (this.playerProfile.name || this.playerName || '').trim();
    const birthday = (this.playerProfile.birthday || '').trim();
    if (!name || !birthday) return;
    this.profileSetupBusy = true;
    const activationChoice = this.phoneActivationChoice || 'new';
    const usePredefined = Boolean(this.roleCardSetup?.usePredefinedPlayerCard);
    try {
      this.setupError = '';
      await this.ensureNewGameAssetsReady?.();
      await window.GameModules.assetLoader?.ensureChunks?.(['wechat'], this);
      window.GameModules.remergeGameStore?.();
      this.syncRelationshipTextFromEntries();
      const base = this.normalizePlayerSetupBase(name, birthday);
      if (options.skipAi) throw new Error('玩家个人资料必须由AI补全并给出原因，不能跳过AI。');
      if (!this.startActivationRoleCardLoading) throw new Error('角色卡进度模块未加载，请刷新页面后重试');
      this.startActivationRoleCardLoading(name, { includeRoleCards: !usePredefined });
      let enriched = null;
      try {
        this.updateRoleCardLoadingStep?.('activation-identity', 'identity', 'running');
        enriched = await this.enrichPlayerProfile(base);
        this.updateRoleCardLoadingStep?.('activation-identity', 'identity', 'done');
        this.updateRoleCardLoading?.('activation-identity', { status: 'done', finishedAt: Date.now() });
      } catch (err) {
        console.warn('[玩家身份] AI补全失败，拒绝使用本地资料继续激活:', err.code, err.message, err.stack);
        this.failRoleCardLoading?.('activation-identity', err.message || '身份补全失败');
        if (err?.code === 'AUTH_REQUIRED') {
          throw new Error('请先在激活首页填写 DeepSeek API Key');
        }
        throw new Error(`AI身份补全失败，不能使用本地兜底资料：${err.message || '请稍后重试'}`);
      }
      this.playerProfile = this.normalizeEnrichedPlayerProfile(base, enriched);
      this.phoneFixedTime = new Date(this.playerProfile.initializedAt || Date.now()).getTime();
      await this.syncPlayerProfileLexicon();
      this.playerName = name;
      this.desktopUnlocked = false;
      if (usePredefined) await window.GameModules.predefinedRoleCards?.saveSelectedRoleCardStates?.(this);
      else await this.runActivationRoleCardsParallel?.();
      this.phoneSetupDone = true;
      this.phoneActivationChoice = '';
      await this.syncKnownProfessionsFromProfile?.(this.playerProfile.knownProfessions);
      await this.save();
      this.finishActivationFlow?.();
    } catch (err) {
      console.error('[玩家身份] 激活失败:', err.code, err.message, err.stack);
      this.phoneActivationChoice = activationChoice;
      this.setupError = err.message || '激活失败';
    } finally {
      this.profileSetupBusy = false;
    }
  },

  normalizePlayerSetupBase(name, birthday) {
    const p = this.playerProfile || {};
    return {
      ...p,
      name,
      birthday,
      age: this.playerAgeFromBirthday(birthday),
      gender: (p.gender || '').trim(),
      city: (p.city || '').trim(),
      dailyRole: (p.dailyRole || '').trim(),
      workplace: (p.workplace || '').trim(), position: (p.position || '').trim(),
      livingStatus: (p.livingStatus || '').trim(),
      parents: (p.parents || '').trim(),
      relationshipEntries: this.normalizeRelationshipEntries(p.relationshipEntries, p.relationships),
      relationships: this.relationshipEntriesText(p.relationshipEntries) || (p.relationships || '').trim(),
      notes: (p.notes || '').trim(),
      initializedAt: p.initializedAt || new Date().toISOString(),
    };
  },

  async runActivationRoleCardsParallel() {
    this.markActivationRoleCardsRunning?.();
    await this.syncRelationshipWechatUsers?.({ save: false, generateProfile: false });
    const contacts = (this.wechatUsers || []).filter((contact) => contact && !contact.group);
    await Promise.all([
      this.ensurePlayerRpgState?.(true),
      ...contacts.map((contact) => this.ensureWechatUserProfile?.(contact)),
    ]);
  },

  async enrichPlayerProfile(base) {
    const providerId = window.GameModules.aiProvider?.currentProviderId?.() || 'deepseek';
    const provider = window.GameModules.aiProvider?.currentProvider?.();
    if (!provider || typeof provider.complete !== 'function') {
      throw new Error(`文本 AI 提供方 ${providerId} 未就绪，请先在激活首页配置模型`);
    }
    const prompt = await window.GameModules.renderPrompt('player-profile-enrichment', {
      年龄: base.age,
      性别: base.gender || '未填写',
      relationshipRule: base.relationshipRule || '无额外规则。',
      输入: JSON.stringify(base),
    });
    return await Promise.race([
      window.GameModules.jsonUtils.generateJsonWithRetry({ source: 'player-profile-enrichment', promptId: 'player-profile-enrichment', model: this.modelId, timeoutMs: 60000, prompt, format: prompt, max: 2 }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('身份补全超时')), 60000)),
    ]);
  },

  normalizeEnrichedPlayerProfile(base, data = {}) {
    const city = this.ensurePreciseAddress(data?.refinedCity || base.city);
    const role = String(data?.refinedRole || this.fallbackRefinedRole(base.dailyRole, base.age, city)).slice(0, 80);
    const social = window.GameModules.socialPosition || {};
    const workplace = String(data?.workplace || base.workplace || social.workplace?.(role, city) || '').slice(0, 80);
    const position = String(data?.position || base.position || social.position?.(role) || '').slice(0, 60);
    const noParents = !base.parents;
    const status = String(data?.parentStatus || (noParents ? '父母已故' : base.parents)).slice(0, 80);
    const cause = String(data?.parentDeathCause || (noParents ? this.fallbackParentDeathCause(base.age) : '')).slice(0, 120);
    return {
      ...base,
      refinedCity: city,
      refinedRole: role, workplace, position,
      refinedLivingStatus: String(data?.refinedLivingStatus || base.livingStatus || `${city}，长期居住地址已登记`).slice(0, 100),
      relationshipEntries: this.normalizeRelationshipEntries(base.relationshipEntries?.length ? base.relationshipEntries : null, data?.relationships || base.relationships),
      relationships: window.GameModules.characterProfile.formatRelationships(data?.relationships || base.relationships),
      parentStatus: noParents ? (status.includes('已故') ? status : '父母已故') : status,
      parentDeathCause: noParents ? cause : cause,
      worldbuildingNote: String(data?.worldbuildingNote || `${base.age}岁的${role}，就职/活动于${workplace}，地位为${position}。`).slice(0, 120),
      knownProfessions: this.normalizeKnownProfessionHints(data?.knownProfessions),
      items: this.normalizeCarryHints(data?.items, '物品'),
      wearing: this.normalizeWearingHints(data?.wearing),
      profileEnrichedAt: new Date().toISOString(),
    };
  },

};


;// ---- player-wealth-actions.js ----
window.GameModules = window.GameModules || {};
window.GameModules.playerSetupActions = window.GameModules.playerSetupActions || {};
const setupActions = window.GameModules.playerSetupActions;
const basePlayerProfileLexiconFields = setupActions.playerProfileLexiconFields;
const baseNormalizePlayerSetupBase = setupActions.normalizePlayerSetupBase;
const baseNormalizeEnrichedPlayerProfile = setupActions.normalizeEnrichedPlayerProfile;
Object.assign(setupActions, {
  playerWealthOptions() {
    return [
      { tier: '流浪', amount: 0 },
      { tier: '贫穷', amount: 10000 },
      { tier: '中产', amount: 500000 },
      { tier: '富裕', amount: 5000000 },
      { tier: '富豪', amount: 100000000 },
    ];
  },

  playerWealthDefaultAmount(tier = '') {
    return this.playerWealthOptions().find((item) => item.tier === tier)?.amount || 0;
  },

  playerCompanyFixedIncome(profile = {}) {
    const company = this.currentCompany?.() || this.companyState?.companies?.find((item) => item.id === this.companyState?.currentCompanyId) || null;
    const active = this.companyState?.employment?.active !== false;
    const name = profile.workplace || company?.name || '';
    const monthlyBase = Number(company?.salary?.monthlyBase || 0);
    const performanceMonths = Number(company?.salary?.performanceMonths || 0);
    const isEmployee = company?.workMode?.type === '员工' || /员工|工程师|程序|开发|运营|经理|主管/.test(`${profile.position || ''}${profile.refinedRole || profile.dailyRole || ''}`);
    if (!name || !active || !isEmployee) return { label: '公司员工薪酬绩效', amount: 0, text: '暂无固定员工收入。' };
    const text = `${name}员工固定收入：月基础薪酬${monthlyBase || '待确认'}元，年底绩效${performanceMonths || 0}个月底薪。`;
    return { label: `${name}员工薪酬绩效`, amount: 0, monthlyBase, performanceMonths, text };
  },

  playerWealthBreakdown(tier = '', amount = 0, profile = {}) {
    const total = Number(amount) || this.playerWealthDefaultAmount(tier);
    const company = this.playerCompanyFixedIncome(profile);
    if (total <= 0) return { parentInheritance: 0, previousWorkIncome: 0, companySalaryPerformance: 0, companyIncomeLabel: company.label, fixedIncome: company.text };
    if (tier === '富裕' || tier === '富豪') return { parentInheritance: Math.max(0, total - 50000), previousWorkIncome: 50000, companySalaryPerformance: 0, companyIncomeLabel: company.label, fixedIncome: company.text };
    if (tier === '中产') return { parentInheritance: Math.max(0, total - 50000), previousWorkIncome: 50000, companySalaryPerformance: 0, companyIncomeLabel: company.label, fixedIncome: company.text };
    const previous = Math.min(50000, Math.floor(total / 2));
    return { parentInheritance: Math.max(0, total - previous), previousWorkIncome: previous, companySalaryPerformance: 0, companyIncomeLabel: company.label, fixedIncome: company.text };
  },

  playerWealthSource(tier = '', amount = 0, source = '', breakdown = null) {
    const b = breakdown || this.playerWealthBreakdown(tier, amount, this.playerProfile || {});
    const parts = [`父母遗产(${b.parentInheritance || 0})`, `本人之前打工挣钱(${b.previousWorkIncome || 0})`, `${b.companyIncomeLabel || '公司员工薪酬绩效'}(${b.companySalaryPerformance || 0})`];
    const suffix = tier === '富裕' || tier === '富豪' ? '；富裕/富豪级别的父母遗产来自父母公司濒临破产时出售后的清算余款。' : '';
    return `${parts.join('，')}${suffix}`;
  },

  normalizePlayerWealth(profile = {}) {
    const tier = this.playerWealthOptions().some((item) => item.tier === profile.wealthTier) ? profile.wealthTier : '中产';
    const hasAmount = profile.wealthAmount !== '' && profile.wealthAmount !== null && profile.wealthAmount !== undefined;
    const amount = hasAmount && Number.isFinite(Number(profile.wealthAmount)) ? Number(profile.wealthAmount) : this.playerWealthDefaultAmount(tier);
    const breakdown = this.playerWealthBreakdown(tier, amount, profile);
    const result = { wealthTier: tier, wealthAmount: amount, wealthBreakdown: breakdown, wealthFixedIncome: breakdown.fixedIncome, wealthSource: this.playerWealthSource(tier, amount, profile.wealthSource, breakdown) };
    try {
      window.GameModules.orgTerritoryActions?.syncPlayerWealthAsset?.(this, result);
    } catch (err) {
      console.warn('[玩家财富] 政体资产同步跳过:', err?.message || err);
    }
    return result;
  },

  syncPlayerWealthDefaults() {
    const tier = this.playerProfile?.wealthTier || '中产';
    const amount = this.playerWealthDefaultAmount(tier);
    Object.assign(this.playerProfile, this.normalizePlayerWealth({ ...this.playerProfile, wealthTier: tier, wealthAmount: amount, wealthSource: '' }));
  },

  playerWealthText(profile = this.playerProfile || {}) {
    const wealth = this.normalizePlayerWealth(profile);
    return `${wealth.wealthTier}｜${wealth.wealthAmount.toLocaleString('zh-CN')}元｜${wealth.wealthSource}`;
  },

  playerProfileLexiconFields() {
    const rows = basePlayerProfileLexiconFields.call(this);
    const p = { ...(this.playerProfile || {}), ...this.normalizePlayerWealth(this.playerProfile || {}) };
    const worldTag = window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';
    const row = (name, value, desc) => window.GameModules.playerProfileLexicon.row(name, value, desc, worldTag);
    const insertAt = Math.max(0, rows.findIndex((item) => item.label === '居住状态') + 1);
    rows.splice(insertAt, 0,
      row('财富等级', p.wealthTier, '玩家当前财富阶层。'),
      row('当前财富', `${Number(p.wealthAmount || 0).toLocaleString('zh-CN')}元`, '玩家当前可支配现金资产。'),
      row('财富来源', p.wealthSource, '玩家财富来源的量化构成。'),
      row('固定收入', p.wealthFixedIncome, '玩家作为公司员工时的固定薪酬与绩效来源。'),
    );
    return rows;
  },

  async migrateCurrentSaveWealthToOneHundredMillion() {
    if (!this.phoneSetupDone || this.playerProfile?.wealthSaveBoostedTo100M) return false;
    if ((this.playerProfile?.name || this.playerName) !== '刘悠') return false;
    if (this.playerProfile?.wealthTier === '中产' && Number(this.playerProfile?.wealthAmount || 0) === 500000) return false;
    const profile = { ...this.playerProfile, wealthTier: '富豪', wealthAmount: 100000000, wealthSource: '' };
    Object.assign(this.playerProfile, this.normalizePlayerWealth(profile), { wealthSaveBoostedTo100M: true });
    await this.save?.();
    return true;
  },

  normalizePlayerSetupBase(name, birthday) {
    const base = baseNormalizePlayerSetupBase.call(this, name, birthday);
    return { ...base, ...this.normalizePlayerWealth(base) };
  },

  normalizeEnrichedPlayerProfile(base, data = {}) {
    const profile = baseNormalizeEnrichedPlayerProfile.call(this, base, data);
    return { ...profile, ...this.normalizePlayerWealth(profile) };
  },
});


;// ---- player-setup-extra-actions.js ----
window.GameModules = window.GameModules || {};

Object.assign(window.GameModules.playerSetupActions, {
  normalizeKnownProfessionHints(value) {
    const world = window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';
    if (typeof value === 'string') return value.split(/[、,，;；\n]+/).map((name) => ({ name: String(name || '').trim().slice(0, 24), worldTag: world, sourceReason: '玩家现实身份上下文表明其知道该职业。' })).filter((item) => item.name).slice(0, 5);
    if (!Array.isArray(value)) return [];
    return value.map((item) => ({ name: String(item?.name || item || '').trim().slice(0, 24), worldTag: String(item?.worldTag || world).trim().slice(0, 32), sourceReason: String(item?.sourceReason || '玩家现实身份上下文表明其知道该职业。').trim().slice(0, 120) })).filter((item) => item.name).slice(0, 5);
  },
  recoverCarryArray(text, key) { return window.GameModules.jsonUtils.pickObjectArrayNames(text, key).map((name) => ({ name })); },
  recoverWearingArray(text) { return window.GameModules.jsonUtils.pickObjectArrayNames(text, 'wearing').map((name, index) => ({ slot: index === 0 ? '上衣' : '装备', name })); },
  normalizeCarryHints(value, kind) {
    const list = Array.isArray(value) ? value : String(value || '').split(/[、,，;；\n]+/).map((name) => ({ name }));
    return list.map((item) => window.GameModules.progression.normalizeCarryItem(item, kind)).filter((item) => item.name && item.name !== '未命名物品').slice(0, 20);
  },
  normalizeWearingHints(value) {
    const raw = Array.isArray(value) ? value : String(value || '').split(/[、,，;；\n]+/).map((name) => ({ name }));
    const p = window.GameModules.progression;
    return raw.map((item, index) => {
      const name = String(item?.name || item || '未穿戴').slice(0, 32);
      const slot = String(item?.slot || p.inferEquipSlots?.({ name }, '装备')?.[0] || (index === 0 ? '上衣' : '装备')).slice(0, 12);
      return { slot, name, type: '穿着', description: String(item?.description || '').slice(0, 80), level: -1 };
    }).filter((item) => item.slot && item.name !== '未穿戴');
  },
  async syncKnownProfessionsFromProfile(items) {
    if (!Array.isArray(items) || !items.length || typeof this.knowProfession !== 'function') return;
    this.initKnownProfessionApp?.();
    for (const item of items) await this.knowProfession(item.name, item.worldTag, { sourceReason: item.sourceReason, characterName: this.playerProfile?.name || this.playerName, role: this.playerProfile?.refinedRole || this.playerProfile?.dailyRole, detail: this.playerProfile?.worldbuildingNote || this.playerProfile?.notes });
  },
  ensurePreciseAddress(address) {
    const value = String(address || '').trim();
    const vague = !value || /某|一处|普通|未知|附近|片区|等/.test(value);
    const precise = /省.+(市|州).+(区|县|市).+(镇|街道).+(社区|小区|家属院|公寓|花园).+(栋|号楼).+(号|室)/.test(value);
    return !vague && precise ? value.slice(0, 100) : this.fallbackPreciseAddress(value).slice(0, 100);
  },
  fallbackPreciseAddress(address) {
    if (/四川/.test(address || '')) return '四川省成都市武侯区玉林街道玉林北路社区锦苑小区3栋2单元601号';
    if (/北京/.test(address || '')) return '北京市朝阳区望京街道花家地社区望京西园一区6号楼2单元502号';
    if (/上海/.test(address || '')) return '上海市浦东新区花木街道牡丹社区牡丹苑小区12号楼1单元803号';
    if (/广东|广州/.test(address || '')) return '广东省广州市天河区石牌街道龙口西社区天誉花园8栋1单元701号';
    return `${address || '四川省成都市武侯区'}玉林街道玉林北路社区锦苑小区3栋2单元601号`;
  },
  fallbackRefinedRole(role, age, city) {
    const place = (city || '本地').replace(/(省|市|县|区|镇|街道|社区|小区|家属院|公寓|花园|栋|号楼|单元|号|室)/g, '').slice(-4) || '本地';
    if (/高中|学生/.test(role || '') && age) return `${place}第一中学${age <= 16 ? '高一年级' : (age >= 18 ? '高三年级' : '高二年级')}学生`;
    return role || `${age || ''}岁现代都市居民`;
  },
  async syncPlayerProfileLexicon() {
    const worldTag = window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';
    const p = this.playerProfile || {};
    const manual = ['姓名', '性别', '生日', '年龄', '人际关系', '备注'];
    const reasonFor = (field) => manual.includes(field.label)
      ? `${field.label}来自玩家激活手机时主动填写的表单值。`
      : `${field.label}由AI结合玩家姓名、生日、城市、身份、居住状态和备注补全为当前值。`;
    await window.GameModules.rpgLexicon.saveMany(this.playerProfileFieldsForView().map((field) => ({ worldTag, kind: '玩家设定', name: field.label, value: field.raw || field.value, summary: field.value, description: field.desc, reason: reasonFor(field), nameAiGenerated: false, valueAiGenerated: !manual.includes(field.label), changeMode: manual.includes(field.label) ? '用户主动填写' : 'AI补全玩家设定', source: 'ai', meta: { targetType: '非角色', commonField: true, playerName: p.name || this.playerName } })));
  },
  fallbackParentDeathCause(age) { return age && age < 18 ? '数年前因一场夜间交通事故相继离世，具体细节由后续剧情逐步揭开。' : '多年前因突发交通事故离世，留下的生活痕迹仍影响玩家的现实处境。'; },
  reopenPlayerSetup() { this.phoneSetupDone = false; this.phoneActivationChoice = ''; },
});


;// ---- player-setup-defaults.js ----
window.GameModules = window.GameModules || {};
window.GameModules.playerSetupActions = window.GameModules.playerSetupActions || {};
Object.assign(window.GameModules.playerSetupActions, {
  defaultProfileData() {
    const text = window.GameModules.inlineMd?.defaultExistingProfile || '';
    if (!text.trim()) throw new Error('默认资料快照未加载：需要 config/default-existing-profile.js');
    const data = this.parseDefaultProfileMd(text);
    if (!data?.name || !data?.birthday) throw new Error('默认资料快照缺少 姓名 或 生日');
    return { ...data, source: 'config/default-existing-profile.js' };
  },

  parseDefaultProfileMd(text = '') {
    const map = {};
    const relationshipEntries = [];
    let currentRelationship = null;
    String(text).split('\n').forEach((line) => {
      const relationItem = line.match(/^\s*-\s*关系名\s*[：:]\s*(.+?)\s*$/);
      if (relationItem) {
        currentRelationship = { relation: relationItem[1].trim(), name: '', detail: '' };
        relationshipEntries.push(currentRelationship);
        return;
      }
      const relationField = line.match(/^\s*(姓名|设定)\s*[：:]\s*(.+?)\s*$/);
      if (currentRelationship && relationField) {
        if (relationField[1] === '姓名') currentRelationship.name = relationField[2].trim();
        if (relationField[1] === '设定') currentRelationship.detail = relationField[2].trim();
        return;
      }
      const match = line.match(/^\s*([^：:]+)\s*[：:]\s*(.*?)\s*$/);
      if (match) {
        currentRelationship = null;
        map[match[1].trim()] = match[2].trim();
      }
    });
    const relationships = relationshipEntries.length ? relationshipEntries.map((entry) => `${entry.relation}：${entry.name}`).join('；') : (map['人际关系'] || '');
    return {
      name: map['姓名'] || '',
      gender: map['性别'] || '',
      birthday: map['生日'] || '',
      city: map['具体地址'] || map['地址'] || '',
      dailyRole: map['现实身份'] || '',
      livingStatus: map['居住状态'] || '',
      parents: map['父母信息'] || '',
      parentDeathCause: map['父母去世原因'] || '',
      wealthTier: map['财富等级'] || '中产',
      wealthAmount: map['当前财富'] || '',
      wealthSource: map['财富来源'] || '',
      relationships,
      relationshipEntries: this.normalizeRelationshipEntries ? this.normalizeRelationshipEntries(relationshipEntries, relationships) : relationshipEntries,
      notes: map['备注'] || '',
    };
  },

  async defaultExistingAccountProfile() {
    const data = await this.defaultProfileData();
    console.log('[玩家身份] 默认资料来源:', data.source, data.name, data.birthday);
    return { ...data, ...this.normalizePlayerWealth?.(data), age: this.playerAgeFromBirthday(data.birthday), initializedAt: new Date().toISOString() };
  },

  async debugDefaultProfileSource() {
    const data = await this.defaultProfileData();
    const report = { source: data.source, name: data.name, birthday: data.birthday };
    console.log('[玩家身份] 默认资料读取自检:', report);
    return report;
  },

  async chooseExistingAccountSetup() {
    if (this.profileSetupBusy) return;
    this.profileSetupBusy = true;
    try {
      this.setupError = '';
      this.playerProfile = { ...this.playerProfile, ...await this.defaultExistingAccountProfile() };
      this.playerProfile.relationshipEntries = this.normalizeRelationshipEntries(this.playerProfile.relationshipEntries, this.playerProfile.relationships);
      try {
        await this.ensureNewGameAssetsReady?.();
        window.GameModules.remergeGameStore?.();
        await this.initPredefinedRoleCards?.();
      } catch (err) {
        console.warn('[玩家身份] 预定义角色卡加载跳过:', err?.message || err);
      }
      this.roleCardSetup.usePredefinedPlayerCard = true;
      this.applySelectedPlayerRoleCard?.();
      this.applySelectedRelationshipRoleCards?.();
      this.existingProfileExpanded = false;
      this.phoneActivationChoice = 'existing';
    } catch (err) {
      console.error('[玩家身份] 已有账号默认资料读取失败:', err.message, err.stack);
      this.setupError = err.message || '已有账号默认资料读取失败';
    } finally {
      this.profileSetupBusy = false;
    }
  },

  async chooseNewAccountSetup() {
    if (this.profileSetupBusy) return;
    this.profileSetupBusy = true;
    this.existingProfileExpanded = true;
    this.phoneActivationChoice = 'new';
    try {
      this.setupError = '';
      if (this.roleCardSetup) this.roleCardSetup.usePredefinedPlayerCard = false;
      const example = await this.defaultExistingAccountProfile();
      this.playerProfile = {
        ...this.playerProfile,
        name: this.playerProfile.name || example.name || '',
        gender: this.playerProfile.gender || example.gender || '',
        birthday: this.playerProfile.birthday || example.birthday || '',
        city: this.playerProfile.city || example.city || '',
        dailyRole: this.playerProfile.dailyRole || example.dailyRole || '',
        livingStatus: this.playerProfile.livingStatus || example.livingStatus || '',
        ...this.normalizePlayerWealth?.(this.playerProfile),
        parents: this.playerProfile.parents || example.parents || '',
        parentDeathCause: this.playerProfile.parentDeathCause || example.parentDeathCause || '',
        relationships: this.playerProfile.relationships || example.relationships || '',
        relationshipEntries: this.playerProfile.relationshipEntries?.length ? this.playerProfile.relationshipEntries : example.relationshipEntries || [],
        notes: this.playerProfile.notes || example.notes || '',
      };
      this.playerProfile.relationshipEntries = this.normalizeRelationshipEntries(this.playerProfile.relationshipEntries, this.playerProfile.relationships);
    } catch (err) {
      console.error('[玩家身份] 新账号默认资料读取失败:', err.message, err.stack);
      this.setupError = err.message || '新账号默认资料读取失败';
    } finally {
      this.profileSetupBusy = false;
    }
  },

  async completePredefinedPlayerSetup() {
    if (this.profileSetupBusy) return;
    const p = this.playerProfile || {}, name = (p.name || this.playerName || '').trim(), birthday = (p.birthday || '').trim();
    if (!name || !birthday) return;
    this.profileSetupBusy = true;
    try {
      this.setupError = '';
      this.syncRelationshipTextFromEntries?.();
      const age = this.playerAgeFromBirthday(birthday);
      this.playerProfile = { ...p, name, birthday, age, refinedCity: p.refinedCity || p.city, refinedRole: p.refinedRole || p.dailyRole || `${age || ''}岁现代都市居民`, refinedLivingStatus: p.refinedLivingStatus || p.livingStatus, parentStatus: p.parentStatus || p.parents || '父母已故', parentDeathCause: p.parentDeathCause || '', initializedAt: p.initializedAt || new Date().toISOString() };
      this.phoneFixedTime = new Date(this.playerProfile.initializedAt).getTime();
      await this.syncPlayerProfileLexicon?.();
      this.playerName = name; this.phoneActivationChoice = ''; this.phoneSetupDone = true; this.desktopUnlocked = false;
      await window.GameModules.predefinedRoleCards.saveSelectedRoleCardStates(this);
      await this.syncKnownProfessionsFromProfile?.(this.playerProfile.knownProfessions);
      await this.save?.();
      this.finishActivationFlow?.();
    } catch (err) {
      console.error('[玩家身份] 激活失败:', err.code, err.message, err.stack);
      this.setupError = err.message || '激活失败';
    } finally {
      this.profileSetupBusy = false;
    }
  },
});


;// ---- player-setup-guard.js ----
window.GameModules = window.GameModules || {};

(function guardPlayerSetupActions() {
  const actions = window.GameModules.playerSetupActions = window.GameModules.playerSetupActions || {};
  const worldLabel = () => window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';
  const runPredefinedPlayerSetup = async function runPredefinedPlayerSetup(options = {}) {
    return this.completePredefinedPlayerSetup(options);
  };
  const fallbackCompletePlayerSetup = async function completePlayerSetup(options = {}) {
    if (this.profileSetupBusy) return;
    const p = this.playerProfile || {}, name = (p.name || this.playerName || '').trim(), birthday = (p.birthday || '').trim();
    if (!name || !birthday) return;
    this.profileSetupBusy = true;
    try {
      const age = this.playerAgeFromBirthday(birthday);
      this.playerProfile = { ...p, name, birthday, age, refinedCity: p.refinedCity || p.city, refinedRole: p.refinedRole || p.dailyRole || `${age || ''}岁现代都市居民`, refinedLivingStatus: p.refinedLivingStatus || p.livingStatus, parentStatus: p.parentStatus || p.parents || '父母已故', parentDeathCause: p.parentDeathCause || '', initializedAt: p.initializedAt || new Date().toISOString() };
      this.phoneFixedTime = new Date(this.playerProfile.initializedAt).getTime();
      await this.syncPlayerProfileLexicon?.();
      this.playerName = name; this.phoneActivationChoice = ''; this.phoneSetupDone = true; this.desktopUnlocked = false;
      await this.ensurePlayerRpgState?.(true); await this.save?.();
    } finally { this.profileSetupBusy = false; }
  };
  const shouldUsePredefinedSetup = (store) => Boolean(
    store?.roleCardSetup?.usePredefinedPlayerCard
      && window.GameModules.predefinedRoleCards?.saveSelectedRoleCardStates
      && typeof store.completePredefinedPlayerSetup === 'function'
  );
  const wrapCompletePlayerSetup = (fn) => {
    const wrapped = async function completePlayerSetup(options = {}) {
      if (shouldUsePredefinedSetup(this)) return runPredefinedPlayerSetup.call(this, options);
      return fn.call(this, options);
    };
    wrapped.predefinedRoleCardGuard = true;
    return wrapped;
  };
  const fallbacks = {
    playerProfileLexiconFields() {
      const p = this.playerProfile || {}, worldTag = worldLabel();
      const row = (name, value, desc) => window.GameModules.playerProfileLexicon.row(name, value, desc, worldTag);
      return [
        row('所属世界', worldTag, '玩家当前所在的现实世界。'),
        row('姓名', p.name || this.playerName, '玩家登记的姓名或代号。'),
        row('性别', p.gender, '玩家登记的性别。'),
        row('生日', p.birthday, '玩家登记生日，用于计算年龄与现实身份。'),
        row('年龄', p.age ? `${p.age}岁` : '', '由生日按2026-06-12计算得到。'),
        row('具体地址', p.refinedCity || p.city, '玩家当前登记住址。'),
        row('现实身份', p.refinedRole || p.dailyRole, '玩家在2026现实世界中的日常身份。'),
        row('势力地位', [p.workplace, p.position].filter(Boolean).join(' / '), '玩家当前工作、学习或组织势力及其内部地位。'),
        row('社群角色', [p.refinedCity || p.city, '居民'].filter(Boolean).join(' / '), '玩家当前居住社群及其中承担的社会角色。'),
        row('居住状态', p.refinedLivingStatus || p.livingStatus, '玩家当前居住与生活状态。'),
        row('父母状态', p.parentStatus || p.parents || '父母已故', '玩家父母当前状态。'),
        row('父母去世原因', p.parentDeathCause || '待生成', '父母已故时的入库死因。'),
        row('人际关系', p.relationships || '由玩家自行设定，暂无补充', '玩家明确填写的人际关系。'),
        row('世界观补全', p.worldbuildingNote || '暂无', 'AI围绕玩家资料补全的现实背景。'),
        row('备注', p.notes || '无', '玩家补充设定。'),
      ];
    },
    playerSetupSummary() {
      return this.playerProfileLexiconFields().map((x) => `${x.label}：${x.value}`).join('\n');
    },
    async defaultExistingAccountProfile() {
      throw new Error('默认资料读取模块未加载：需要 player-setup-defaults.js 读取 config/default-existing-profile.md');
    },
    async chooseExistingAccountSetup() { if (this.profileSetupBusy) return; this.profileSetupBusy = true; try { this.setupError = ''; this.playerProfile = { ...this.playerProfile, ...await this.defaultExistingAccountProfile() }; this.existingProfileExpanded = false; this.phoneActivationChoice = 'existing'; } catch (err) { console.error('[玩家身份] 已有账号默认资料读取失败:', err.message, err.stack); this.setupError = err.message || '已有账号默认资料读取失败'; } finally { this.profileSetupBusy = false; } },
    chooseNewAccountSetup() { this.existingProfileExpanded = true; this.phoneActivationChoice = 'new'; },
    backActivationChoice() { this.phoneActivationChoice = ''; },
    playerAgeFromBirthday(birthday) {
      const birth = new Date(`${birthday}T00:00:00`), now = new Date('2026-06-12T00:00:00');
      if (Number.isNaN(birth.getTime())) return '';
      let age = now.getFullYear() - birth.getFullYear();
      if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age -= 1;
      return Math.max(0, age);
    },
    async useExistingAccountSetup() {
      await this.completePlayerSetup?.();
    },
    completePlayerSetup: fallbackCompletePlayerSetup,
    async syncPlayerProfileLexicon() {
      try {
        if (!window.GameModules.rpgLexicon?.saveMany) return;
        await window.GameModules.rpgLexicon.saveMany(this.playerProfileLexiconFields().map((field) => ({ worldTag: worldLabel(), kind: '玩家设定', name: field.label, value: field.raw || field.value, summary: field.value, description: field.desc, nameAiGenerated: false, valueAiGenerated: false, changeMode: '用户主动', source: 'fallback', meta: { targetType: '非角色', commonField: true } })));
      } catch (err) { console.warn('[玩家身份] 兜底词条同步失败:', err.message, err.stack); }
    },
    reopenPlayerSetup() {
      this.playerProfile.relationshipEntries = this.normalizeRelationshipEntries?.(this.playerProfile.relationshipEntries, this.playerProfile.relationships) || this.playerProfile.relationshipEntries || [];
      this.phoneSetupDone = false;
      this.phoneActivationChoice = '';
    },
  };
  Object.entries(fallbacks).forEach(([key, fn]) => {
    if (typeof actions[key] !== 'function') actions[key] = key === 'completePlayerSetup' ? wrapCompletePlayerSetup(fn) : fn;
  });
  if (actions.completePlayerSetup?.predefinedRoleCardGuard !== true) {
    actions.completePlayerSetup = wrapCompletePlayerSetup(actions.completePlayerSetup || fallbackCompletePlayerSetup);
    actions.completePlayerSetup.predefinedRoleCardGuard = true;
  }
})();


;// ---- player-identity-actions.js ----
window.GameModules = window.GameModules || {};
window.GameModules.playerIdentityActions = {
  playerCharacterBase() {
    const p = this.playerProfile || {};
    const world = window.GameModules.realWorld2026 || {};
    const name = p.name || this.playerName || '手机主人';
    const city = p.refinedCity || p.city || world.defaults?.city || '未设定城市';
    const role = p.refinedRole || p.dailyRole || world.defaults?.dailyRole || '现代都市居民';
    const living = p.refinedLivingStatus || p.livingStatus || world.defaults?.livingStatus || '生活状态未设定';
    const parents = p.parentStatus || p.parents || '父母已故';
    const workplace = p.workplace || window.GameModules.socialPosition?.workplace(role, city) || city;
    const position = p.position || window.GameModules.socialPosition?.position(role) || living;
    const deathCause = p.parentDeathCause || '父母去世原因未记录';
    const relations = p.relationships || '人际关系由玩家自行设定，当前未填写';
    const notes = [p.worldbuildingNote, p.notes].filter(Boolean).join('；') || '暂无补充设定';
    return {
      id: 'player-self', name, age: p.age || '', birthday: p.birthday || '', gender: p.gender || '', work: world.label || '2026 现代都市现实世界', role, job: role,
      rank: position, faction: workplace, city, workplace, position, importance: 'main', isPlayer: true,
      items: p.items || [], wearing: p.wearing || [],
      detail: `性别：${p.gender || '未知'}；年龄：${p.age || '未知'}；生日：${p.birthday || '未知'}；具体地址：${city}；势力地位：${workplace}/${position}；社群角色：${city}/居民；居住：${living}；父母：${parents}；去世原因：${deathCause}；关系：${relations}；备注：${notes}`,
      personality: notes,
      skills: [
        { name: '手机操作', desc: '能够使用智能手机完成通讯、检索、拍摄、设置、应用切换和信息处理等操作。', reason: '玩家通过新手机激活和现实应用入口获得该基础操作能力。' },
        { name: '现实观察', desc: '通过细节、环境变化和他人反应判断局势的能力。', reason: '玩家在现实身份与环境交互中需要观察地点、联系人和系统反馈。' },
      ],
    };
  },
  playerDisplayCharacter() {
    const saved = this.playerIdentityState?.()?.profile;
    if (saved?.roleCard) return saved;
    return { ...this.playerCharacterBase(), name: this.playerName || this.playerProfile?.name || '手机主人', pendingAiProfile: true };
  },
  playerCharacter() {
    const saved = this.playerIdentityState?.()?.profile;
    if (!saved?.roleCard) throw new Error('玩家本人个人资料尚未由AI生成，不能读取本地兜底模板。');
    window.GameModules.characterProfile.requireRpgFieldReasons(saved, saved.worldAttributes, saved.name || '玩家本人');
    return saved;
  },
  playerIdentityState() { return this.rpgStates['player-self'] || null; },
  identityTargetState() { return this.rpgStates[this.identityTargetId || 'player-self'] || null; },
  identityTargetProfile() {
    const id = this.identityTargetId || 'player-self';
    if (id === 'player-self') return this.playerDisplayCharacter();
    return this.identityTargetState()?.profile || (id === this.character.id ? this.character : { name: '未知角色', work: '未知世界', role: '身份未知', detail: '暂无角色卡。', personality: '', pendingAiProfile: true });
  },
  essentialPreferenceLayersForState(state = null) {
    const prefTool = window.GameModules.playerAspirationPreferenceLayers;
    if (!prefTool) return null;
    const resolved = state || this.identityTargetState();
    const id = resolved?.id || this.identityTargetId || 'player-self';
    if (id === 'player-self') {
      const fromAspiration = this.playerAspiration?.essentialPreferenceLayers
        || prefTool.buildFromPlayerAspiration?.(this.playerAspiration);
      if (fromAspiration?.layer1) return prefTool.normalizeLayers(fromAspiration);
      const profile = resolved?.profile;
      if (profile) return prefTool.ensureOnProfile(profile);
      return null;
    }
    const profile = resolved?.profile || (id === (this.identityTargetId || '') ? this.identityTargetProfile() : null);
    if (!profile || typeof profile !== 'object') return null;
    return prefTool.ensureOnProfile(profile);
  },

  essentialPreferenceViewFromPlayerAspiration(view = null) {
    const data = view || this.playerAspirationView?.();
    if (!data) return null;
    return {
      alignmentLabel: data.alignmentLabel,
      rationality: data.rationality,
      rationalityLabel: data.rationalityLabel,
      axes: data.axes || [],
      guiltLines: data.guiltLines || [],
      psychGroups: (data.psychCategories || []).flatMap((category) => category.groups || []),
      footnote: '来自人生取向向导的选择；本质偏好五层固化后推演不可修改。',
    };
  },

  essentialPreferenceViewForState(state = null) {
    const resolved = state || this.identityTargetState();
    const id = resolved?.id || this.identityTargetId || 'player-self';
    if (id === 'player-self' && this.hasPlayerAspiration?.()) {
      return this.essentialPreferenceViewFromPlayerAspiration?.();
    }
    const prefTool = window.GameModules.playerAspirationPreferenceLayers;
    const layers = this.essentialPreferenceLayersForState?.(resolved);
    const view = prefTool?.viewFromLayers?.(layers);
    if (view) view.footnote = '角色本质偏好五层在角色卡生成时固化，推演不可修改。';
    return view || null;
  },

  identityEssentialPreferenceLayers() {
    return this.essentialPreferenceLayersForState?.(this.identityTargetState());
  },

  identityEssentialPreferenceView() {
    return this.essentialPreferenceViewForState?.(this.identityTargetState());
  },

  identityTargetFields() {
    const p = this.identityTargetProfile();
    const worldTag = p.work || this.identityTargetState()?.worldTag || '原创世界';
    const reasonFor = this.roleCardReasonGetter(p);
    const row = (key, label, value, desc, extra = {}) => ({ key: `id-${this.identityTargetId}-${key}`, stateId: this.identityTargetId || 'player-self', label, kind: '角色卡', value: value || '未记录', raw: value || '', desc, reason: reasonFor(label, key), worldTag, targetType: '角色', commonField: true, ...extra });
    const fields = [
      row('name', '姓名', p.name, '角色卡固化姓名。'),
      row('work', '所属世界', worldTag, '角色出身作品或世界。'),
      row('role', '身份', p.role, '角色卡固化身份。'),
      row('appearance', '外貌', p.appearance, '角色卡固化外貌。'),
      row('preferences', '喜好', p.preferences, '角色稳定喜好和穿着偏好。'),
      row('personality', '性格', p.personality, '角色卡固化性格。'),
      row('job', '职业', p.job, '角色真实职业、训练身份或社会功能。'),
    ];
    const prefTool = window.GameModules.playerAspirationPreferenceLayers;
    const layerSource = this.essentialPreferenceLayersForState?.(this.identityTargetState());
    prefTool?.toLines?.(layerSource).forEach((line, index) => {
      const label = line.split(':')[0]?.trim() || '本质偏好';
      const desc = (this.identityTargetId || 'player-self') === 'player-self'
        ? '玩家本质偏好层；仅玩家可在人生取向向导中修改，推演不可更改。'
        : '角色本质偏好五层；角色卡固化后永久不可被推演修改。';
      fields.push(row(`pref-${index}`, label, line, desc, { profileGroup: '本质偏好', immutable: true }));
    });
    if ((this.identityTargetId || 'player-self') === 'player-self') {
      fields.push(...(this.playerAspirationLexiconFields?.().filter((item) => !prefTool?.isImmutableFieldName?.(item.label)) || []));
    }
    return fields;
  },

  playerIdentitySummary() {
    const v = this.playerIdentityState()?.values || {};
    if (!v.level) return '玩家本人属性尚未生成。';
    const names = (list) => (list || []).map((item) => item?.slot ? `${item.slot}:${item.name || '未穿戴'}` : (item?.name || item)).slice(0, 16).join('、') || '无';
    return `性别${this.playerProfile.gender || '未知'}｜年龄${v.age ?? this.playerProfile.age ?? '未知'}｜等级${v.level}｜经验${v.exp?.current || 0}/${v.exp?.next || 'max'}｜力量${v.strength}｜敏捷${v.agility}｜体质${v.constitution}｜智力${v.intelligence}｜感知${v.perception}｜意志${v.willpower}｜魅力${v.charisma}｜物品${names(v.items)}｜穿着${names(v.wearing)}`;
  },
  playerMemory() { return window.GameModules.characterMemory.ensure('player-self'); },
  playerMemoryItems(kind) {
    const memory = this.playerMemory();
    if (kind === 'shortTerm') return [...(memory.shortTerm.recent || []), ...(memory.shortTerm.summarized || [])];
    if (kind === 'longTerm') return [...(memory.longTerm.vivid || []), ...(memory.longTerm.permanent || [])];
    return [];
  },
  playerMemoryStatus(kind) {
    const memory = this.playerMemory();
    const m = window.GameModules.characterMemory;
    if (kind === 'shortTerm') return [m.statLine('刚发生记忆', m.stats(memory.shortTerm.recent, m.limits.recent)), m.statLine('近发生记忆', m.stats(memory.shortTerm.summarized, m.limits.summarized)), m.statLine('遗忘区', m.stats(memory.shortTerm.forgotten, m.limits.forgotten))].join('｜');
    return [m.statLine('难以忘记', m.stats(memory.longTerm.vivid, m.limits.vivid)), m.statLine('不可忘记', m.stats(memory.longTerm.permanent, m.limits.permanent))].join('｜');
  },
  realWorldMemoryTargetId() {
    return this.sharedControlState?.()?.id || 'player-self';
  },
  realWorldMemory() {
    return window.GameModules.characterMemory.ensure(this.realWorldMemoryTargetId());
  },
  realWorldMemoryShortLabel() {
    return ({ recent: '刚发生记忆', summarized: '近发生记忆', forgotten: '遗忘区' })[this.realWorldMemoryShortTab] || '刚发生记忆';
  },
  realWorldMemoryLongLabel() {
    return ({ vivid: '难以忘记', permanent: '不可忘记' })[this.realWorldMemoryLongTab] || '难以忘记';
  },
  realWorldMemoryItems(kind) {
    const memory = this.realWorldMemory();
    if (kind === 'shortTerm') return memory.shortTerm?.[this.realWorldMemoryShortTab || 'recent'] || [];
    if (kind === 'longTerm') return memory.longTerm?.[this.realWorldMemoryLongTab || 'vivid'] || [];
    return [];
  },
  realWorldMemoryStatus(kind) {
    const m = window.GameModules.characterMemory;
    if (kind === 'shortTerm') return m.statLine(this.realWorldMemoryShortLabel(), m.stats(this.realWorldMemoryItems('shortTerm'), m.limits[this.realWorldMemoryShortTab || 'recent'] || m.limits.recent));
    return m.statLine(this.realWorldMemoryLongLabel(), m.stats(this.realWorldMemoryItems('longTerm'), m.limits[this.realWorldMemoryLongTab || 'vivid'] || m.limits.vivid));
  },
  async addPlayerManualMemory() {
    const text = this.realWorldMemoryInput.trim();
    if (!text) return;
    const realStore = { ...this, sceneTitle: this.realWorldSceneTitle || '现实世界' };
    await window.GameModules.characterMemory.addManual(this.realWorldMemoryTargetId(), text, realStore);
    this.realWorldMemoryInput = '';
  },
  async searchPlayerMemoryArchive() {
    const query = this.realWorldMemoryArchiveQuery.trim();
    if (!query) return;
    this.realWorldMemoryArchiveResults = await window.GameModules.characterMemory.queryArchive(this.realWorldMemoryTargetId(), query);
  },
  async ensurePlayerRpgState(refresh = false, forceRoleCardRegenerate = false, retrySource = null) {
    if (!window.GameModules.sqliteSave.db) return this.playerIdentityState();
    const existing = this.playerIdentityState();
    if (!refresh && existing) {
      let changed = false;
      const expectedName = this.playerProfile?.name || this.playerName || '';
      if (expectedName && existing.profile?.name !== expectedName) {
        existing.name = expectedName;
        existing.profile = { ...(existing.profile || {}), id: 'player-self', name: expectedName, isPlayer: true };
        changed = true;
      }
      try {
        window.GameModules.characterProfile.requireRpgFieldReasons(existing.profile, existing.profile?.worldAttributes, existing.profile?.name || '玩家本人');
      } catch (err) {
        console.warn('[玩家身份] 已保存个人资料缺少AI变化原因，拒绝使用本地兜底:', err.message, err.stack);
        this.setupError = `玩家本人资料需要重新生成：${err.message || '缺少AI变化原因'}`;
        throw err;
      }
      if (window.GameModules.progression.ensureStateMechanics(existing, existing.profile)) changed = true;
      if (window.GameModules.initPromptRegistry?.ensureTemplateState?.('intimacyBody', existing)) changed = true;
      if (this.hasPlayerAspiration?.()) {
        const tool = window.GameModules.playerAspirationPreferenceLayers;
        const layers = tool?.buildFromPlayerAspiration?.(this.playerAspiration);
        if (layers?.layer1 && !existing.profile?.essentialPreferenceLayers?.layer1) {
          tool.applyToProfile(existing.profile, layers, { locked: true });
          changed = true;
        }
      }
      if (changed) await window.GameModules.sqliteSave.saveCharacterState(existing);
      return existing;
    }
    let character;
    if (this.roleCardSetup?.usePredefinedPlayerCard && window.GameModules.predefinedRoleCards) {
      const predefined = await window.GameModules.predefinedRoleCards.ensurePlayerState(this);
      if (predefined) return predefined;
    }
    try {
      const base = { ...this.playerCharacterBase(), ...(retrySource || {}), forceRoleCardRegenerate: forceRoleCardRegenerate || Boolean(retrySource?.forceRoleCardRegenerate) };
      const playerCard = {
        id: 'player-self',
        name: base.name || this.playerName || '玩家',
        type: '玩家卡',
        source: base,
        context: this.playerSetupSummary?.() || '玩家本人资料',
      };
      if ((this.roleCardLoadingState?.cards || []).some((card) => card.id === 'player-self')) {
        this.updateRoleCardLoading?.('player-self', { source: base, context: playerCard.context, status: 'running', startedAt: Date.now() });
      } else {
        this.startRoleCardLoadingBatch?.([playerCard]);
      }
      character = await window.GameModules.characterProfile.ensure(base, this, this.playerSetupSummary?.() || '玩家本人资料');
    } catch (err) {
      console.warn('[玩家身份] 个人资料生成失败，拒绝使用本地原因兜底:', err.code, err.message, err.stack);
      this.setupError = `玩家本人资料生成失败：${err.message || 'AI暂时不可用'}`;
      throw err;
    }
    character.id = 'player-self';
    character.name = this.playerProfile?.name || this.playerName || character.name;
    character.isPlayer = true;
    this.initFactionSystem?.();
    this.updateRoleCardLoadingStep?.('player-self', 'state', 'running', '', { done: 0, total: 1 });
    const state = await window.GameModules.rpgState.ensureCharacter(character, this);
    state.profile = character;
    state.note = character.detail;
    state.values.age = Number.isFinite(Number(character.age)) ? Number(character.age) : state.values.age;
    state.values.status_tags = ['玩家本人', '手机主人', character.work, character.role];
    if (!state.values.items?.length) state.values.items = character.items || [];
    window.GameModules.progression.syncInventoryFromProfile?.(state, character);
    state.values.factions = window.GameModules.socialPosition.playerItems({ ...this.playerProfile, workplace: character.workplace, position: character.position });
    state.values.force_positions = window.GameModules.socialPosition.playerForceItems({ ...this.playerProfile, workplace: character.workplace, position: character.position }, this);
    state.values.memberships = window.GameModules.socialPosition.membershipItems({ ...this.playerProfile, workplace: character.workplace, position: character.position }, this);
    window.GameModules.orgTerritory?.syncCharacterOrgMemberships?.(state, this);
    window.GameModules.progression.ensureStateMechanics(state, character);
    window.GameModules.initPromptRegistry?.ensureTemplateState?.('intimacyBody', state);
    const prefTool = window.GameModules.playerAspirationPreferenceLayers;
    if (prefTool && this.playerAspiration?.alignment && state.profile) {
      prefTool.applyToProfile(state.profile, prefTool.buildFromPlayerAspiration(this.playerAspiration), { locked: true });
    }
    this.rpgStates = { ...this.rpgStates, [state.id]: state };
    await window.GameModules.sqliteSave.saveCharacterState(state);
    this.finishRoleCardLoading?.('player-self', state.profile || character);
    return state;
  },

  syncIdentityMetricNotes(state, profile) {
    if (!state?.metrics || !profile?.initialMetrics) return false;
    const before = JSON.stringify(state.metrics.notes || {});
    state.metrics.notes = state.metrics.notes || {};
    const sync = (items, values, keys, group) => (Array.isArray(items) ? items : []).forEach((item) => {
      if (!keys.includes(item?.key)) return;
      const value = window.GameModules.metrics.clamp(values?.[item.key] ?? item.value);
      const rawStatus = String(item.status || '').trim();
      const rawReason = String(item.reason || '').trim();
      const status = window.GameModules.metrics.resolveMetricStatus(item.key, value, rawStatus).slice(0, 180);
      const statusFromAi = Boolean(rawStatus) && status === window.GameModules.metrics.cleanMetricStatus(rawStatus) && !window.GameModules.metrics.isGenericMetricStatus(rawStatus, item.key);
      const sources = window.GameModules.characterProfile?.metricSources?.(item, '系统') || { 数值: '系统', 解释: '系统', 原因: '系统' };
      const noteKey = `${group}:${item.key}`;
      const previous = state.metrics.notes[noteKey] || {};
      const previousSources = previous.metricSources || {};
      const statusIsGeneric = window.GameModules.metrics.isGenericMetricStatus(previous.status, item.key);
      if (previous.reason && previousSources.原因 === 'AI' && !statusIsGeneric) return;
      state.metrics.notes[noteKey] = {
        stage: window.GameModules.metrics.stageFor(item.key, value),
        status,
        reason: rawReason.slice(0, 180),
        description: String(window.GameModules.metrics.descriptions[item.key] || item.key).slice(0, 120),
        metricSources: { 数值: sources.数值, 解释: statusFromAi || sources.解释 === 'AI' ? 'AI' : '系统', 原因: sources.原因 === 'AI' && rawReason ? 'AI' : '系统' },
      };
    });
    sync(profile.initialMetrics.emotions, state.metrics.emotions, window.GameModules.metrics.emotionKeys, 'emotion');
    sync(profile.initialMetrics.playerFeelings, state.metrics.playerFeelings, window.GameModules.metrics.playerKeys, 'player');
    return before !== JSON.stringify(state.metrics.notes || {});
  },

  async ensureIdentityMetricSources(targetId = 'player-self') {
    if (!window.GameModules.sqliteSave?.db) return;
    const id = targetId || 'player-self';
    const state = this.rpgStates?.[id] || window.GameModules.sqliteSave.getCharacterState(id);
    const tool = window.GameModules.characterProfile;
    if (!state?.profile || !tool?.ensureInitialMetricSources) return;
    const before = JSON.stringify(state.profile.initialMetrics || {});
    const previousProfile = state.profile;
    const context = [state.profile.detail, state.profile.personality, state.note].filter(Boolean).join('；');
    try {
      state.profile = await tool.ensureInitialMetricSources(state.profile, state.profile, context, this);
      const profileChanged = before !== JSON.stringify(state.profile.initialMetrics || {});
      if (profileChanged) window.GameModules.rpgProfileMetrics?.rebase?.(state, state.profile, previousProfile);
      const notesChanged = this.syncIdentityMetricNotes(state, state.profile);
      if (!profileChanged && !notesChanged) return;
      state.id = state.id || id;
      await window.GameModules.sqliteSave.saveCharacterState(state);
      this.rpgStates = { ...(this.rpgStates || {}), [state.id]: state };
      if (id === this.character?.id) this.character = state.profile;
    } catch (err) {
      console.warn('[身份证] 角色数值来源检查失败:', err.code, err.message, err.stack);
    }
  },


};


;// ---- identity-memory-actions.js ----
window.GameModules = window.GameModules || {};

window.GameModules.identityMemoryActions = {
  identityMemoryTargetId() {
    return this.identityTargetId || 'player-self';
  },

  identityMemory() {
    return window.GameModules.characterMemory.ensure(this.identityMemoryTargetId());
  },

  identityMemoryItems(kind) {
    const memory = this.identityMemory();
    if (kind === 'shortTerm') return this.identityMemorySubItems(memory.shortTerm, this.identityMemoryShortTab);
    if (kind === 'longTerm') return this.identityMemorySubItems(memory.longTerm, this.identityMemoryLongTab);
    return [];
  },

  identityMemorySubItems(scope = {}, tab = '') {
    return scope?.[tab] || [];
  },

  identityMemorySubStatus(kind) {
    const memory = this.identityMemory();
    const m = window.GameModules.characterMemory;
    if (kind === 'shortTerm') return m.statLine(this.identityMemoryShortLabel(), m.stats(this.identityMemoryItems('shortTerm'), m.limits[this.identityMemoryShortTab] || m.limits.forgotten));
    return m.statLine(this.identityMemoryLongLabel(), m.stats(this.identityMemoryItems('longTerm'), m.limits[this.identityMemoryLongTab]));
  },

  identityMemoryShortLabel() {
    return ({ recent: '刚发生记忆', summarized: '近发生记忆', forgotten: '遗忘区' })[this.identityMemoryShortTab] || '刚发生记忆';
  },

  identityMemoryLongLabel() {
    return ({ vivid: '难以忘记', permanent: '不可忘记' })[this.identityMemoryLongTab] || '难以忘记';
  },

  identityMemoryStatus(kind) {
    const memory = this.identityMemory();
    const m = window.GameModules.characterMemory;
    if (kind === 'shortTerm') return [m.statLine('刚发生记忆', m.stats(memory.shortTerm.recent, m.limits.recent)), m.statLine('近发生记忆', m.stats(memory.shortTerm.summarized, m.limits.summarized)), m.statLine('遗忘区', m.stats(memory.shortTerm.forgotten, m.limits.forgotten))].join('｜');
    return [m.statLine('难以忘记', m.stats(memory.longTerm.vivid, m.limits.vivid)), m.statLine('不可忘记', m.stats(memory.longTerm.permanent, m.limits.permanent))].join('｜');
  },

  async searchIdentityMemoryArchive() {
    const query = String(this.identityMemoryArchiveQuery || '').trim();
    if (!query) return;
    this.identityMemoryArchiveResults = await window.GameModules.characterMemory.queryArchive(this.identityMemoryTargetId(), query);
  },
};


;// ---- identity-app-actions.js ----
window.GameModules = window.GameModules || {};
window.GameModules.identityAppActions = {
  async openIdentityApp(targetId = 'player-self', returnTo = '') {
    this.identityReturnTo = returnTo;
    this.wechatAppOpen = false; this.saveAppOpen = false; this.roleCardJsonAppOpen = false; this.worldlineAppOpen = false;
    if (this.companyState) this.companyState.open = false;
    if (this.bossState) this.bossState.open = false;
    if (this.calendarState) this.calendarState.open = false;
    if (this.factionState) this.factionState.open = false;
    if (this.skillsState) this.skillsState.open = false;
    if (this.knownProfessionState) this.knownProfessionState.open = false;
    if (this.promptState) this.promptState.open = false; if (this.tokenStatsState) this.tokenStatsState.open = false;
    this.identityTargetId = targetId || 'player-self'; this.identityAppOpen = true;
    this.desktopUnlocked = true;
    this.ensureIdentityMetricSources(this.identityTargetId);
  },
  closeIdentityApp() { this.identityReturnTo = ''; this.closeAppToDesktop(); },
  backFromIdentityApp() {
    if (this.identityReturnTo !== 'wechat') return this.closeIdentityApp();
    this.identityAppOpen = false;
    this.identityReturnTo = '';
    this.wechatAppOpen = true;
    this.desktopUnlocked = true;
  },
  ensureWechatId() {
    if (!this.playerProfile.wechatId) {
      this.playerProfile.wechatId = `wx${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
      this.save?.();
    }
    return this.playerProfile.wechatId;
  },
};


;// ---- inventory-actions.js ----
window.GameModules = window.GameModules || {};

window.GameModules.inventoryActions = {
  inventoryTargetState() {
    return this.realWorldOpen ? this.playerIdentityState?.() : this.currentRpgState;
  },

  inventoryValues(state = this.inventoryTargetState()) {
    const values = state?.values || {};
    window.GameModules.progression.ensureInventoryFields?.(values, state?.id || '');
    return values;
  },

  inventoryItems(state = this.inventoryTargetState()) {
    const v = this.inventoryValues(state);
    const tag = (kind, list) => (Array.isArray(list) ? list : []).map((item) => (typeof item === 'string' ? { name: item, kind } : { kind, ...item }));
    return [...tag('物品', v.items)];
  },

  wearingItems(state = this.inventoryTargetState()) {
    const values = this.inventoryValues(state);
    window.GameModules.progression.ensureInventoryFields?.(values, state?.id || '');
    return values.wearing || [];
  },

  inventoryName(item) {
    return String(item?.name || item || '未命名物品');
  },

  inventoryDetail(item) {
    if (!item || typeof item === 'string') return '暂无详细说明';
    const slots = (item.equipSlots || []).length ? `可装备：${item.equipSlots.join('、')}` : '';
    return [item.kind || item.type, item.slot, slots, item.quantity ? `数量${item.quantity}` : '', item.description, item.source, item.changeMode].filter(Boolean).join('｜') || '暂无详细说明';
  },

  isEmptyWear(item) {
    return !item?.name || item.name === '未穿戴' || item.name === '未记录';
  },

  wearingName(item) {
    return this.isEmptyWear(item) ? '未穿戴' : item.name;
  },

  wearingDetail(item) {
    const position = item?.clothing_position;
    const label = item?.slotLabel || position || item?.slot;
    const slot = item?.slot ? `槽位：${item.slot}${label && label !== item.slot ? `（${label}）` : ''}` : '';
    const part = position ? `人体着装部位：${position}` : '';
    if (this.isEmptyWear(item)) return [slot, part, item?.reason || '该槽位当前未穿戴，表示对应部位空置。'].filter(Boolean).join('｜');
    return [item.type || '穿着', slot, part, item.description, item.reason, item.source].filter(Boolean).join('｜');
  },

  async addWearSlot(base = '装备', state = this.inventoryTargetState()) {
    if (!state?.values) return '';
    const slot = this.ensureWearSlot(state.values, base, true, state.id || '');
    await this.persistInventoryState(state);
    return slot;
  },

  ensureWearSlot(values, slot, alwaysNew = false, ownerId = '') {
    const p = window.GameModules.progression;
    p.ensureInventoryFields?.(values, ownerId);
    const raw = String(slot || '装备').trim();
    const base = p.slotBase(raw);
    const dynamic = ['饰品', '装备'].includes(base) && !/\d+$/.test(raw);
    const empty = (item) => !item?.name || this.isEmptyWear(item);
    let target = !alwaysNew && dynamic ? values.wearing.find((item) => p.slotBase(item.slot) === base && empty(item))?.slot : '';
    target = target || (dynamic || alwaysNew ? p.nextSlot(values.wearing, base) : raw);
    if (!values.wearing.some((item) => item.slot === target)) values.wearing.push({ id: ownerId ? p.itemId?.(ownerId, '穿着', target, '未穿戴') : '', ownerId, characterId: ownerId, slot: target, name: '未穿戴', type: '穿着', description: '玩家或AI新增的可穿戴槽位。', reason: `${target}槽位由装备/饰品操作新增，当前尚未穿戴物品。`, changeMode: `${target}槽位由装备/饰品操作新增，当前尚未穿戴物品。`, level: -1 });
    return target;
  },

  canEquipToSlot(item, slot) {
    const slots = item?.equipSlots || [];
    if (!slots.length) return false;
    const p = window.GameModules.progression;
    const base = p.slotBase(slot);
    const canonical = p.canonicalWearSlot?.(slot) || slot;
    const targets = slots.map((entry) => p.canonicalWearSlot?.(entry) || entry);
    return slots.includes(slot) || slots.includes(base) || targets.includes(canonical) || targets.includes(base);
  },

  async equipItemToSlot(itemName, slot, state = this.inventoryTargetState()) {
    if (!state?.values || !itemName || !slot) return false;
    const v = this.inventoryValues(state);
    const index = v.items.findIndex((entry) => this.inventoryName(entry) === itemName);
    const item = index >= 0 ? v.items[index] : null;
    if (!item) return false;
    const target = this.ensureWearSlot(v, slot, false, state.id || '');
    if (!this.canEquipToSlot(item, target)) return false;
    const current = v.wearing.find((entry) => entry.slot === target);
    if (current && !this.isEmptyWear(current)) v.items.push({ ...current, type: '装备', kind: '装备' });
    v.items.splice(index, 1);
    this.writeWearingItem(v, { ...item, slot: target }, state.id || '');
    await this.persistInventoryState(state);
    return true;
  },

  async unequipSlot(slot, state = this.inventoryTargetState()) {
    if (!state?.values || !slot) return false;
    const item = state.values.wearing?.find((entry) => entry.slot === slot);
    if (!item) return false;
    Object.assign(item, { name: '未穿戴', type: '穿着', description: '该槽位暂无已记录穿着。', reason: `${slot}槽位的原穿戴物被卸下，因此当前为空置状态。`, changeMode: `${slot}槽位的原穿戴物被卸下，因此当前为空置状态。`, level: -1 });
    await this.persistInventoryState(state);
    return true;
  },

  writeWearingItem(values, item, ownerId = '') {
    const target = this.ensureWearSlot(values, item.slot || item.equipSlots?.[0] || '装备', false, ownerId);
    const finalOwnerId = item.ownerId || item.characterId || ownerId;
    const worn = { ...item, id: item.id || (finalOwnerId ? window.GameModules.progression.itemId?.(finalOwnerId, '穿着', target, item.name || '未穿戴') : ''), ownerId: finalOwnerId, characterId: finalOwnerId, slot: target, type: '穿着', level: -1 };
    const index = values.wearing.findIndex((entry) => entry.slot === target);
    if (index >= 0) values.wearing[index] = { ...values.wearing[index], ...worn };
    else values.wearing.push(worn);
  },

  async applyInventoryUpdatesToState(state, updates = []) {
    const values = state?.values;
    if (!values) return;
    window.GameModules.progression.ensureInventoryFields?.(values, state.id || '');
    let changed = false;
    const upsert = (list, item) => {
      const name = this.inventoryName(item);
      const index = list.findIndex((old) => this.inventoryName(old) === name);
      if (index >= 0) list[index] = { ...(typeof list[index] === 'string' ? { name: list[index] } : list[index]), ...item };
      else list.push(item);
      changed = true;
    };
    for (const raw of updates || []) {
      const kind = raw?.kind;
      const value = raw?.value && typeof raw.value === 'object' ? raw.value : {};
      const item = window.GameModules.progression.normalizeCarryItem({ ...value, name: raw?.name || value.name, slot: raw?.slot || value.slot, description: raw?.description || raw?.summary || value.description, changeMode: raw?.reason || raw?.changeMode || 'AI演算' }, kind, state.id || '');
      if (kind === '物品' || kind === '装备') upsert(values.items, item);
      if (kind === '穿着') { this.writeWearingItem(values, item, state.id || ''); changed = true; }
    }
    if (changed) await this.persistInventoryState(state);
  },

  async persistInventoryState(state) {
    if (!state?.id) return;
    window.GameModules.progression.ensureInventoryFields?.(state.values, state.id || '');
    this.rpgStates = { ...this.rpgStates, [state.id]: state };
    await window.GameModules.sqliteSave.saveCharacterState(state);
  },

  realWorldInventoryItems() { return this.inventoryItems(this.playerIdentityState?.()); },
  realWorldWearingItems() { return this.wearingItems(this.playerIdentityState?.()); },
  realWorldInventoryName(item) { return this.inventoryName(item); },
  realWorldInventoryDetail(item) { return this.inventoryDetail(item); },
  realWorldWearingName(item) { return this.wearingName(item); },
  realWorldWearingDetail(item) { return this.wearingDetail(item); },
};


;// ---- inventory-equip-actions.js ----
window.GameModules = window.GameModules || {};

window.GameModules.inventoryEquipActions = {
  equipOptionsForSlot(slot, state = this.inventoryTargetState()) {
    return this.inventoryItems(state).filter((item) => this.canEquipToSlot(item, slot));
  },

  canEquipInventoryItem(item) {
    return Array.isArray(item?.equipSlots) && item.equipSlots.length > 0;
  },

  firstEquipSlot(item, state = this.inventoryTargetState()) {
    const slots = item?.equipSlots || [];
    const wearing = this.wearingItems(state);
    return slots.find((slot) => wearing.some((entry) => this.canEquipToSlot(item, entry.slot))) || slots[0] || '';
  },

  async equipInventoryItem(item, slot = '', state = this.inventoryTargetState()) {
    if (!item || !state?.values) return false;
    const targetSlot = slot || this.firstEquipSlot(item, state);
    if (!targetSlot) return false;
    return this.equipItemToSlot(this.inventoryName(item), targetSlot, state);
  },

  async chooseEquipForSlot(slot, state = this.inventoryTargetState()) {
    const options = this.equipOptionsForSlot(slot, state);
    if (!options.length) {
      this.taobaoState = this.taobaoState || {};
      this.taobaoState.message = `${slot}暂无可替换物品。`;
      return false;
    }
    const text = options.map((item, index) => `${index + 1}. ${this.inventoryName(item)}`).join('\n');
    const picked = window.prompt(`选择要替换到${slot}的物品：\n${text}\n输入序号`);
    const index = Number(picked) - 1;
    const item = options[index];
    if (!item) return false;
    return this.equipInventoryItem(item, slot, state);
  },
};


;// ---- item-skill-actions.js ----
window.GameModules = window.GameModules || {};

window.GameModules.itemSkillActions = {
  itemSkillWorldTag() {
    return window.GameModules.realWorld2026?.label || this.character?.work || '2026 现代都市现实世界';
  },

  itemSkillState(target = 'player-self') {
    if (!target || target === 'player' || target === '玩家' || target === '玩家本人') target = 'player-self';
    const key = String(target || 'player-self').trim();
    return this.rpgStates?.[key] || window.GameModules.sqliteSave.getCharacterState?.(key) || window.GameModules.sqliteSave.getCharacterStateByName?.(key) || (key === 'player-self' ? this.playerIdentityState?.() : null);
  },

  itemSkillStateLabel(state = null) {
    return state?.profile?.name || state?.name || state?.id || '未知角色';
  },

  itemSkillKnownEntries(keyword = '') {
    const key = String(keyword || '').trim();
    const kinds = ['物品', '装备'];
    const rows = kinds.flatMap((kind) => window.GameModules.sqliteSave.listLexiconEntries?.(this.itemSkillWorldTag(), kind) || []);
    return rows.filter((entry) => !key || this.itemSkillEntryText(entry).includes(key) || String(entry.name || '').includes(key));
  },

  itemSkillEntryText(entry = {}) {
    return `${entry.name || ''}\n${entry.summary || ''}\n${entry.description || ''}\n${JSON.stringify(entry.value || {})}\n${(entry.aliases || []).join('、')}`;
  },

  searchKnownItem(keyword = '') {
    const rows = this.itemSkillKnownEntries(keyword).slice(0, 8);
    return rows.length ? rows.map((entry) => this.itemSkillKnownLine(entry)).join('\n') : '未命中世界已知物品。';
  },

  itemSkillKnownLine(entry = {}) {
    const value = entry.value && typeof entry.value === 'object' ? entry.value : {};
    const slots = (value.equipSlots || entry.equipSlots || []).join?.('、') || '';
    return `- ${entry.name || '未命名物品'}｜${entry.kind || value.kind || '物品'}｜${entry.summary || entry.description || value.description || '暂无说明'}${slots ? `｜可装备：${slots}` : ''}`;
  },

  listCharacterItems(target = 'player-self') {
    const state = this.itemSkillState(target);
    if (!state?.values) return '未找到目标角色物品。';
    const items = this.inventoryItems(state).map((item) => `- ${this.inventoryName(item)}｜${this.inventoryDetail(item)}`).join('\n') || '背包暂无物品。';
    const wearing = this.wearingItems(state).filter((item) => !this.isEmptyWear(item)).map((item) => `- ${item.slot}：${this.wearingName(item)}｜${this.wearingDetail(item)}`).join('\n') || '当前无明确穿戴物。';
    return `目标：${this.itemSkillStateLabel(state)}\n持有物：\n${items}\n穿着：\n${wearing}`;
  },

  async generateItemSkill(payload = {}) {
    const known = this.itemSkillKnownEntries(payload.name || payload.keyword || '')[0];
    if (known) return { ok: true, reused: true, item: known.value || known, message: `已复用世界已知物品：${known.name}` };
    const item = this.normalizeItemSkillPayload(payload);
    await this.saveKnownItemSkill(item, payload.reason || '现实推演生成新物品。');
    return { ok: true, reused: false, item, message: `已生成世界已知物品：${item.name}` };
  },

  normalizeItemSkillPayload(payload = {}) {
    const detailed = payload.detailed !== false && !payload.briefOnly;
    const name = String(payload.name || payload.keyword || '未命名物品').slice(0, 32);
    const kind = String(payload.kind || payload.type || '物品') === '装备' ? '装备' : '物品';
    const description = detailed ? String(payload.description || payload.summary || `${name}是现实推演中确认出现的物品。`).slice(0, 240) : `${name}（仅作为文本中出现的物品名，未被玩家检查或实际到手，细节未知）`;
    return { name, kind, type: kind, quantity: Math.max(1, Number(payload.quantity) || 1), description, summary: String(payload.summary || description).slice(0, 80), equipSlots: Array.isArray(payload.equipSlots) ? payload.equipSlots.slice(0, 8).map(String) : [], price: Math.max(0, Math.floor(Number(payload.price) || 0)), source: payload.source || '现实推演', reason: String(payload.reason || '现实推演确认该物品。').slice(0, 120) };
  },

  async saveKnownItemSkill(item = {}, reason = '') {
    const kind = item.kind === '装备' ? '装备' : '物品';
    const entry = { worldTag: this.itemSkillWorldTag(), kind, name: item.name, value: item, summary: item.summary || item.description, description: item.description, reason, source: 'ai', aiGenerated: true, meta: { scope: 'real-world-item', modifyReason: reason } };
    await window.GameModules.rpgLexicon.saveMany?.([entry]);
    return entry;
  },

  async addItemToTarget(target = 'player-self', payload = {}) {
    const state = this.itemSkillState(target) || (target === 'player-self' ? await this.ensurePlayerRpgState?.() : null);
    if (!state?.values) return { ok: false, message: '未找到目标角色，无法新增物品。' };
    const generated = await this.generateItemSkill(payload);
    await this.applyInventoryUpdatesToState(state, [{ kind: generated.item.kind || '物品', name: generated.item.name, value: generated.item, reason: payload.reason || '现实推演新增物品' }]);
    return { ok: true, item: generated.item, message: `已给${this.itemSkillStateLabel(state)}新增${generated.item.name}` };
  },

  async transferItemSkill(fromTarget = 'player-self', toTarget = '', itemName = '', quantity = 1, reason = '') {
    const from = this.itemSkillState(fromTarget);
    const to = this.itemSkillState(toTarget) || (toTarget === 'player-self' ? await this.ensurePlayerRpgState?.() : null);
    if (!from?.values || !to?.values || !itemName) return { ok: false, message: '转移失败：缺少来源、目标或物品名。' };
    const item = this.removeInventoryItem(from, itemName, quantity, reason || '物品转移');
    if (!item) return { ok: false, message: `转移失败：${this.itemSkillStateLabel(from)}未持有${itemName}` };
    await this.persistInventoryState(from);
    await this.applyInventoryUpdatesToState(to, [{ kind: item.kind || item.type || '物品', name: item.name, value: { ...item, quantity }, reason: reason || '物品转移' }]);
    return { ok: true, item, message: `已将${item.name}从${this.itemSkillStateLabel(from)}转移给${this.itemSkillStateLabel(to)}` };
  },

  async deleteItemSkill(target = 'player-self', itemName = '', quantity = 1, reason = '') {
    const state = this.itemSkillState(target);
    if (!state?.values || !itemName) return { ok: false, message: '删除失败：缺少目标或物品名。' };
    const item = this.removeInventoryItem(state, itemName, quantity, reason || '物品删除');
    if (!item) return { ok: false, message: `删除失败：未持有${itemName}` };
    await this.persistInventoryState(state);
    return { ok: true, item, message: `已从${this.itemSkillStateLabel(state)}移除${item.name}` };
  },

  removeInventoryItem(state, itemName = '', quantity = 1) {
    const values = this.inventoryValues(state);
    const index = values.items.findIndex((entry) => this.inventoryName(entry) === itemName);
    if (index < 0) return null;
    const item = values.items[index];
    const count = Math.max(1, Number(quantity) || 1);
    const current = Math.max(1, Number(item.quantity) || 1);
    if (current > count) values.items[index] = { ...item, quantity: current - count };
    else values.items.splice(index, 1);
    return { ...(typeof item === 'string' ? { name: item } : item), quantity: Math.min(count, current) };
  },

  async purchaseItemSkill(target = 'player-self', payload = {}) {
    const price = Math.max(1, Math.floor(Number(payload.price) || 1));
    const money = Number(this.playerProfile?.wealthAmount || 0);
    if (money < price) return { ok: false, message: `余额不足：当前${money.toLocaleString('zh-CN')}元，需要${price.toLocaleString('zh-CN')}元。` };
    const result = await this.addItemToTarget(target, { ...payload, price, reason: payload.reason || '现实购物获得物品' });
    if (!result.ok) return result;
    this.playerProfile.wealthAmount = money - price;
    window.GameModules.orgTerritoryActions?.syncPlayerWealthAsset?.(this);
    await this.save?.();
    return { ...result, paid: price, balance: this.playerProfile.wealthAmount, message: `${result.message}，扣除${price.toLocaleString('zh-CN')}元。` };
  },

  normalizeItemActionType(raw = {}) {
    const action = String(raw?.actionType || raw?.action || raw?.type || '').trim();
    const map = { remove: 'delete', removed: 'delete', use: 'delete', consume: 'delete', consumed: 'delete', create: 'generate' };
    return map[action] || action;
  },

  itemActionName(raw = {}) {
    return String(raw?.item?.name || raw?.itemName || raw?.name || (typeof raw?.item === 'string' ? raw.item : '')).trim();
  },

  itemActionTarget(raw = {}) {
    return window.GameModules.realWorldTargetUpdates?.targetKey?.(raw) || 'player-self';
  },

  itemActionRecordedResult(raw = {}, action = '') {
    const name = this.itemActionName(raw);
    const result = String(raw?.result || raw?.summary || raw?.description || raw?.reason || '').trim();
    if (!action && !name && !result) return null;
    return { ok: false, applied: false, action, name: name || action || '物品变化', itemName: name, target: this.itemActionTarget(raw), result: result || '未执行，仅记录', reason: raw?.reason || action || '未知物品动作未执行。' };
  },

  async applyRealWorldItemActions(actions = []) {
    const results = [];
    for (const raw of (Array.isArray(actions) ? actions : []).slice(0, 20)) {
      const action = this.normalizeItemActionType(raw);
      if (action === 'add') results.push({ ...await this.addItemToTarget(raw.target || 'player-self', raw.item || raw), target: this.itemActionTarget(raw) });
      else if (action === 'transfer') results.push({ ...await this.transferItemSkill(raw.from || 'player-self', raw.to || raw.target || '', raw.itemName || raw.name || raw.item?.name, raw.quantity, raw.reason), target: raw.to || raw.target || '' });
      else if (action === 'delete') results.push({ ...await this.deleteItemSkill(raw.target || 'player-self', this.itemActionName(raw), raw.quantity, raw.reason), target: this.itemActionTarget(raw) });
      else if (action === 'purchase') results.push({ ...await this.purchaseItemSkill(raw.target || 'player-self', raw.item || raw), target: this.itemActionTarget(raw) });
      else if (action === 'generate') results.push(await this.generateItemSkill(raw.item || raw));
      else {
        const recorded = this.itemActionRecordedResult(raw, action);
        if (recorded) results.push(recorded);
      }
    }
    return results;
  },
};


;// ---- features/settings/settings-actions.js ----
window.GameModules = window.GameModules || {};

window.GameModules.settingsActions = {
  async openSettingsApp() {
    this.closeDesktopApps?.();
    this.ensureAiOutputLimitSettings?.();
    this.settingsState.open = true;
    this.desktopUnlocked = true;
    this.prepareActivationModelSetup?.();
  },

  closeSettingsApp() {
    if (this.settingsState) this.settingsState.open = false;
    this.closeAppToDesktop?.();
  },

  withTimeout(promise, ms = 12000, label = '请求') {
    const task = Promise.resolve(promise);
    return Promise.race([
      task,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`${label}超时（${Math.round(ms / 1000)}s）`)), ms);
      }),
    ]);
  },

  prepareActivationModelSetup() {
    this.ensureAiOutputLimitSettings?.();
    if (!Array.isArray(this.settingsState?.textModels) || !this.settingsState.textModels.length) {
      this.applyStartupTextModels();
    }
  },

  async fetchTextModelCatalog() {
    await this.loadSettingsModels(true);
  },

  async testTextModelConnection() {
    const s = this.settingsState;
    if (!s) return;
    s.modelTestLoading = true;
    s.modelTestMessage = '';
    s.modelTestOk = null;
    const providerId = s.textProvider || window.GameModules.aiProvider?.currentProviderId?.() || 'deepseek';
    try {
      if (providerId === 'deepseek' && !String(s.deepseekApiKey || '').trim()) {
        throw new Error('请先填写 DeepSeek API Key');
      }
      const provider = window.GameModules.aiProvider?.get?.(providerId);
      if (!provider?.complete) throw new Error('当前提供方不支持连接测试');
      const model = this.modelId || s.textModelId || provider.normalizeModel?.() || window.GameModules.aiProvider?.providerDefaultModel?.(providerId);
      await this.withTimeout(
        provider.complete({
          model,
          messages: [{ role: 'user', content: 'ping' }],
          maxTokens: 8,
        }),
        15000,
        '连接测试',
      );
      s.modelTestOk = true;
      s.modelTestMessage = '连接正常，模型可响应。';
    } catch (err) {
      console.warn('[设置] 模型连接测试失败:', err?.message || err);
      s.modelTestOk = false;
      s.modelTestMessage = err?.message || '连接测试失败，请检查 API Key 与网络。';
    } finally {
      s.modelTestLoading = false;
    }
  },

  async loadSettingsModels(force = false) {
    const s = this.settingsState;
    if (!s || (s.loaded && !force)) return;
    this.ensureAiOutputLimitSettings?.();
    const providerId = s.textProvider || window.GameModules.aiProvider?.currentProviderId?.() || 'deepseek';
    if (providerId === 'deepseek' && !String(s.deepseekApiKey || '').trim()) {
      if (!force) {
        if (!Array.isArray(s.textModels) || !s.textModels.length) this.applyStartupTextModels();
        return;
      }
      s.error = '请先填写 DeepSeek API Key，再获取模型列表。';
      return;
    }
    s.loading = true;
    s.error = '';
    try {
      const provider = window.GameModules.aiProvider?.get?.(providerId);
      const [textResult, drawResult] = await Promise.all([
        this.withTimeout(provider?.listTextModels?.(), 12000, '模型列表'),
        this.withTimeout(window.dzmm?.draw?.generateModels?.(), 12000, '绘图模型').catch(() => null),
      ]);
      s.textModels = this.enrichTextModelsWithThinking(textResult);
      s.drawModels = Array.isArray(drawResult?.models) && drawResult.models.length ? drawResult.models : this.fallbackDrawModels();
      window.GameModules.tokenStats?.syncModelPrices?.(textResult);
      this.modelId = this.resolvePreferredTextModel(s.textModels, this.modelId || s.textModelId || textResult?.defaultModel);
      s.textModelId = this.modelId;
      s.drawModelId = s.drawModelId || drawResult?.defaultModel || s.drawModels[0]?.id || 'anime';
      s.loaded = true;
      s.modelTestOk = null;
      s.modelTestMessage = '';
    } catch (err) {
      console.warn('[设置] 模型列表加载失败:', err.code, err.message, err.stack);
      const missingKey = err?.code === 'AUTH_REQUIRED' && providerId === 'deepseek';
      s.error = missingKey ? '请先填写 DeepSeek API Key，再获取模型列表。' : (err?.message || '模型列表加载失败，请稍后重试。');
      if (!s.textModels.length) s.textModels = this.fallbackTextModels();
      if (!s.drawModels.length) s.drawModels = this.fallbackDrawModels();
      s.textModelId = this.resolvePreferredTextModel(s.textModels, this.modelId || s.textModelId);
      s.drawModelId = s.drawModelId || 'anime';
      s.loaded = false;
    } finally {
      s.loading = false;
    }
  },

  resolvePreferredTextModel(models = [], current = '') {
    const ids = (Array.isArray(models) ? models : []).map((model) => model?.internalName).filter(Boolean);
    const currentId = String(current || '');
    const config = window.GameModules.config || {};
    const providerId = this.settingsState?.textProvider || window.GameModules.aiProvider?.currentProviderId?.() || 'deepseek';
    const providerPreferred = config.textProviders?.[providerId]?.preferredModelIds || [];
    if (currentId && !currentId.startsWith('nalang-medium-') && ids.includes(currentId)) return currentId;
    return providerPreferred.find((id) => ids.includes(id))
      || (config.preferredTextModelIds || []).find((id) => ids.includes(id))
      || currentId
      || window.GameModules.aiProvider?.providerDefaultModel?.(providerId)
      || config.defaultModelId
      || (providerId === 'deepseek' ? 'deepseek-v4-flash' : 'nalang-turbo-0826');
  },

  enrichTextModelsWithThinking(result = {}) {
    const models = Array.isArray(result?.models) && result.models.length ? result.models : this.fallbackTextModels();
    const thinkingByModel = new Map();
    (Array.isArray(result?.categories) ? result.categories : []).forEach((category) => {
      (Array.isArray(category?.modelGroups) ? category.modelGroups : []).forEach((group) => {
        const supported = group?.thinkingSupported === true;
        (Array.isArray(group?.contexts) ? group.contexts : []).forEach((context) => {
          if (context?.internalName) thinkingByModel.set(context.internalName, supported);
        });
      });
    });
    return models.map((model) => ({ ...model, thinkingSupported: thinkingByModel.get(model.internalName) === true }));
  },

  fallbackTextModels() {
    const providerId = this.settingsState?.textProvider || window.GameModules.aiProvider?.currentProviderId?.() || 'deepseek';
    if (providerId === 'deepseek') {
      return [
        { internalName: 'deepseek-v4-flash', displayName: 'DeepSeek V4 Flash', description: 'DeepSeek 默认备用文本模型', thinkingSupported: false },
        { internalName: 'deepseek-v4-pro', displayName: 'DeepSeek V4 Pro', description: 'DeepSeek 高质量文本模型', thinkingSupported: true },
      ];
    }
    return [
      { internalName: 'nalang-turbo-0826', displayName: '快速经济 0826', description: '默认备用文本模型', thinkingSupported: false },
      { internalName: 'nalang-medium-0826', displayName: '均衡性能', description: '默认备用文本模型', thinkingSupported: false },
    ];
  },

  fallbackDrawModels() {
    return [
      { id: 'anime', displayName: 'anime', description: '二次元风格' },
      { id: 'vivid', displayName: 'vivid', description: '写实/鲜明风格' },
    ];
  },

  applyStartupTextModels() {
    const fallbacks = this.fallbackTextModels();
    if (!this.settingsState) return;
    this.settingsState.textModels = fallbacks;
    if (!Array.isArray(this.settingsState.drawModels) || !this.settingsState.drawModels.length) {
      this.settingsState.drawModels = this.fallbackDrawModels();
    }
    this.modelId = this.resolvePreferredTextModel(fallbacks, this.modelId || this.settingsState.textModelId);
    this.settingsState.textModelId = this.modelId;
    this.settingsState.drawModelId = this.settingsState.drawModelId || this.settingsState.drawModels[0]?.id || 'anime';
    this.settingsState.loaded = false;
    this.settingsState.error = '';
  },

  textModelOptionLabel(model = {}) {
    const name = model.displayName || model.internalName || '未知模型';
    const price = model.price || '未知';
    const thinking = model.thinkingSupported === true ? 'true' : 'false';
    const description = String(model.description || '').trim();
    return `${name}｜系数 ${price}｜支持思考: ${thinking}${description ? `｜${description}` : ''}`;
  },

  async selectTextModel(id) {
    if (!id) return;
    this.modelId = id;
    if (this.settingsState) this.settingsState.textModelId = id;
    if (this.settingsState?.textProvider === 'deepseek') this.settingsState.deepseekModel = id;
    await this.save?.();
  },

  async selectTextProvider(id) {
    if (!id || !this.settingsState) return;
    this.settingsState.textProvider = id;
    this.settingsState.loaded = false;
    this.settingsState.textModels = this.fallbackTextModels();
    this.settingsState.error = '';
    this.settingsState.modelTestOk = null;
    this.settingsState.modelTestMessage = '';
    this.modelId = this.resolvePreferredTextModel(this.settingsState.textModels, this.modelId);
    this.settingsState.textModelId = this.modelId;
    await this.save?.();
  },

  async setDeepseekApiKey(value) {
    if (!this.settingsState) return;
    this.settingsState.deepseekApiKey = String(value || '').trim();
    this.settingsState.loaded = false;
    this.settingsState.modelTestOk = null;
    this.settingsState.modelTestMessage = '';
    await this.save?.();
  },

  async setDeepseekBaseUrl(value) {
    if (!this.settingsState) return;
    this.settingsState.deepseekBaseUrl = String(value || '').trim();
    await this.save?.();
  },

  async selectDrawModel(id) {
    if (!id || !this.settingsState) return;
    this.settingsState.drawModelId = id;
    await this.save?.();
  },

  async setStage1MaterialMaxIterations(value) {
    if (!this.settingsState) return;
    const next = Math.max(1, Math.min(8, Math.round(Number(value) || 2)));
    this.settingsState.stage1MaterialMaxIterations = next;
    await this.save?.();
  },

  async setStage1MaterialIterationLimited(value) {
    if (!this.settingsState) return;
    this.settingsState.stage1MaterialIterationLimited = Boolean(value);
    await this.save?.();
  },

  ensureAiOutputLimitSettings() {
    const s = this.settingsState;
    if (!s) return;
    const defaults = {
      aiOutputLimitGlobalMode: 'unlimited',
      aiOutputLimitGlobalMaxTokens: 3000,
      aiOutputLimitStage1Mode: 'global',
      aiOutputLimitStage1MaxTokens: 3000,
      aiOutputLimitStage2Mode: 'global',
      aiOutputLimitStage2MaxTokens: 3000,
      aiOutputLimitStage3Mode: 'limited',
      aiOutputLimitStage3MaxTokens: 3000,
      aiOutputLimitStage4Mode: 'global',
      aiOutputLimitStage4MaxTokens: 3000,
      aiOutputLimitOtherMode: 'global',
      aiOutputLimitOtherMaxTokens: 3000,
    };
    Object.entries(defaults).forEach(([key, value]) => {
      if (s[key] === undefined || s[key] === null || s[key] === '') s[key] = value;
    });
  },

  aiOutputLimitKinds() {
    return [
      { kind: 'global', title: '统一配置', desc: '作为各阶段“跟随统一”时的默认输出限制。' },
      { kind: 'stage1', title: 'Stage1 资料路由', desc: '资料请求规划、人物/地点/记忆加载路由。' },
      { kind: 'stage2', title: 'Stage2 场景锚定', desc: '场景锚定报告 JSON。' },
      { kind: 'stage3', title: 'Stage3 正文阶段', desc: '最终正文生成与正文补全。默认限制 3000。' },
      { kind: 'stage4', title: 'Stage4 结算', desc: '状态更新、滑动结算与更新 JSON。' },
      { kind: 'other', title: '其他 AI 响应', desc: '微信、角色资料、BOSS、势力、标签等未显式归类请求。' },
    ];
  },

  aiOutputLimitPrefix(kind = 'other') {
    return {
      global: 'aiOutputLimitGlobal',
      stage1: 'aiOutputLimitStage1',
      stage2: 'aiOutputLimitStage2',
      stage3: 'aiOutputLimitStage3',
      stage4: 'aiOutputLimitStage4',
      other: 'aiOutputLimitOther',
    }[kind] || 'aiOutputLimitOther';
  },

  aiOutputLimitMode(kind = 'other') {
    this.ensureAiOutputLimitSettings?.();
    const prefix = this.aiOutputLimitPrefix(kind);
    return this.settingsState?.[`${prefix}Mode`] || (kind === 'global' ? 'unlimited' : 'global');
  },

  aiOutputLimitMax(kind = 'other') {
    this.ensureAiOutputLimitSettings?.();
    const prefix = this.aiOutputLimitPrefix(kind);
    return Math.max(16, Math.min(64000, Math.round(Number(this.settingsState?.[`${prefix}MaxTokens`]) || 3000)));
  },

  aiOutputLimitEffectiveText(kind = 'other') {
    const mode = this.aiOutputLimitMode(kind);
    if (mode === 'unlimited') return '无限制';
    if (mode === 'limited') return `限制 ${this.aiOutputLimitMax(kind)} tokens`;
    const globalMode = this.aiOutputLimitMode('global');
    return globalMode === 'limited' ? `跟随统一：限制 ${this.aiOutputLimitMax('global')} tokens` : '跟随统一：无限制';
  },

  async setAiOutputLimitMode(kind = 'other', mode = 'global') {
    if (!this.settingsState) return;
    this.ensureAiOutputLimitSettings?.();
    const prefix = this.aiOutputLimitPrefix(kind);
    const allowed = kind === 'global' ? ['unlimited', 'limited'] : ['global', 'unlimited', 'limited'];
    this.settingsState[`${prefix}Mode`] = allowed.includes(mode) ? mode : allowed[0];
    await this.save?.();
  },

  async setAiOutputLimitMax(kind = 'other', value = 3000) {
    if (!this.settingsState) return;
    this.ensureAiOutputLimitSettings?.();
    const prefix = this.aiOutputLimitPrefix(kind);
    this.settingsState[`${prefix}MaxTokens`] = Math.max(16, Math.min(64000, Math.round(Number(value) || 3000)));
    await this.save?.();
  },

  selectedDrawModelId() {
    return this.settingsState?.drawModelId || 'anime';
  },

  stage1MaterialMaxIterations() {
    return Math.max(1, Math.min(8, Math.round(Number(this.settingsState?.stage1MaterialMaxIterations) || 2)));
  },

  stage1MaterialIterationLimitText() {
    return this.settingsState?.stage1MaterialIterationLimited ? `${this.stage1MaterialMaxIterations()} 次` : '不限制';
  },
};


;// ---- entry-actions.js ----
/**
 * 进入配置动作：选择时机、推进时间、选择操控方式后进入。
 */
window.GameModules = window.GameModules || {};

window.GameModules.entryActions = {
  resetEntryStages() {
    this.entryStages = [
      { key: 'calendar', name: '世界历法', status: 'waiting', detail: '等待固化世界时间规则。' },
      { key: 'time', name: '时间选项', status: 'waiting', detail: '等待生成可选日期。' },
      { key: 'rpg', name: '角色状态', status: 'waiting', detail: '等待准备 RPG 属性。' },
      { key: 'action', name: '当前行动', status: 'waiting', detail: '等待推演角色正在做什么。' },
      { key: 'ready', name: '控制准备', status: 'waiting', detail: '等待进入控制确认。' },
    ];
  },

  setEntryStage(key, status, detail = '') {
    this.entryStages = this.entryStages.map((x) => (x.key === key ? { ...x, status, detail: detail || x.detail } : x));
  },

  async runEntryStage(key, detail, fn) {
    console.log('[进入流程] 阶段开始:', key, detail);
    this.setEntryStage(key, 'running', detail);
    try {
      const result = await fn();
      console.log('[进入流程] 阶段完成:', key);
      this.setEntryStage(key, 'done', detail);
      return result;
    } catch (err) {
      console.warn('[进入流程] 阶段失败:', key, err.message, err.stack);
      this.setEntryStage(key, 'error', `${detail}失败：${err.message || '未知错误'}`);
      throw err;
    }
  },

  entryStageDetail() {
    const current = this.entryStages.find((x) => ['running', 'error'].includes(x.status)) || this.entryStages.find((x) => x.status === 'waiting') || this.entryStages.at(-1);
    return current?.detail || '正在准备进入配置。';
  },

  openEntryIdentityDetail() {
    this.identityTargetId = this.character?.id || 'player-self';
    this.entryIdentityOpen = true;
    this.identityMetricsOpen = false;
    this.ensureIdentityMetricSources?.(this.identityTargetId);
  },

  closeEntryIdentityDetail() {
    this.entryIdentityOpen = false;
  },

  async prepareEntrySetup() {
    if (this.busy) return;
    console.log('[进入流程] 打开进入配置:', this.selectedWork, this.character?.name, this.character?.id);
    this.entrySetupOpen = true;
    this.characterAge = '';
    this.entryTime = { year: '', month: '', day: '', hour: '', minute: '', second: '' };
    this.entryTimeOptions = { years: [], months: [], days: [], hours: [], minutes: [], seconds: [], start: null };
    this.entryCurrentAction = '';
    this.resetEntryStages();
    this.busy = true;
    await new Promise((resolve) => requestAnimationFrame(resolve));
    try {
      await window.GameModules.characterBrief.ensure(this);
      const calendar = await this.runEntryStage('calendar', '正在生成或读取当前世界的固化历法。', () => window.GameModules.entryTime.ensureCalendar(this));
      this.entryCalendar = calendar;
      await this.runEntryStage('time', '正在定位默认进入时间并校正角色出生日期。', async () => this.prepareEntryTimeOptions(calendar));
      await this.runEntryStage('action', '正在推演角色当前行动。', async () => this.generateEntryAction('默认进入时机'));
      this.startRoleCardLoadingBatch?.([{ id: this.character.id, name: this.character.name, type: '角色卡', source: this.character, context: this.entryCurrentAction || this.entryTimeLabel() }]);
      await this.runEntryStage('rpg', '正在生成并固化被控制角色的角色卡与 RPG 数值。', async () => {
        await window.GameModules.entryTime.applyCharacterAge(this);
        await this.ensureRpgForCurrentCharacter({ refresh: true });
      });
      await this.runEntryStage('ready', '进入配置已准备好，可以选择操控方式。', async () => true);
    } finally {
      this.busy = false;
    }
  },

  async prepareEntryTimeOptions(calendar) {
    this.entryTimeOptions = await window.GameModules.entryTime.options(calendar, this);
    this.entryTime = {
      year: this.entryTimeOptions.years[0],
      month: this.entryTimeOptions.months[0],
      day: this.entryTimeOptions.days[0],
      hour: this.entryTimeOptions.hours[9],
      minute: this.entryTimeOptions.minutes[0],
      second: this.entryTimeOptions.seconds[0],
    };
    await window.GameModules.entryTime.applyStart(this);
  },

  entryTimeLabel() {
    return this.entryCalendar ? window.GameModules.entryTime.format(this.entryTime, this.entryCalendar) : '未选择时间';
  },

  async generateEntryAction(reason) {
    this.entryCurrentAction = '正在根据世界观和角色性格推演当前行动…';
    try {
      await window.GameModules.entryTime.applyCharacterAge(this);
      this.entryCurrentAction = await this.requestEntryAction(reason);
    } catch (err) {
      console.warn('进入行动生成失败:', err.code, err.message, err.stack);
      this.entryCurrentAction = `${this.character.name}正在按自己的日常节奏行动，尚未察觉操控者即将介入。`;
    }
  },

  async requestEntryAction(reason) {
    if (!window.dzmm?.completions) return `${this.character.name}正在处理与身份相关的日常事务。`;
    const storyContext = await window.GameModules.entryTime.storyContextFor(this);
    console.log('[进入行动] 请求开始:', reason, this.entryTimeLabel(), this.character.name, this.character.work, 'storyContextLength=', storyContext.length);
    let buffer = '';
    const prompt = await this.entryPrompt(reason, storyContext);
    await window.GameModules.aiRequest.complete({
      source: 'entry-action', model: this.modelId, prompt, timeoutMs: 60000,
      ...(window.GameModules.promptSkills?.completionOptions?.('entry-action') || { jsonMode: false, outputLimitKind: 'other' }),
      onChunk: (chunk, done, info) => {
        buffer = info.buffer;
        const latest = this.cleanEntryAction(buffer);
        if (latest) this.entryCurrentAction = latest;
        if (done) console.log('[进入行动] 生成完成:', { length: buffer.length, text: latest });
      },
    });
    return this.cleanEntryAction(buffer) || `${this.character.name}正在观察周围变化。`;
  },

  mergeStreamText(buffer, chunk) {
    const text = String(chunk || '');
    if (!text) return buffer;
    if (!buffer || text.startsWith(buffer)) return text;
    if (buffer.endsWith(text)) return buffer;
    const overlap = Math.min(buffer.length, text.length);
    for (let size = overlap; size > 0; size -= 1) {
      if (buffer.endsWith(text.slice(0, size))) return buffer + text.slice(size);
    }
    return buffer + text;
  },

  cleanEntryAction(text) {
    let raw = String(text || '').replace(/```[a-z]*|```/gi, '').replace(/[“”"']/g, '').trim();
    raw = raw.split(/\n+/).map((line) => line.trim()).filter(Boolean).find((line) => !/^#|^[-*]|^\d+[.、]/.test(line)) || raw;
    raw = raw
      .replace(/^#+\s*/, '')
      .replace(/^进入时机行动生成\s*/i, '')
      .replace(/^(任务定位|输出|回答|当前行动|行动)\s*[:：]?\s*/i, '')
      .replace(/\s+/g, '');
    raw = raw.replace(/^(.*?)(\1)+/, '$1').slice(0, 120);
    if (this.isInvalidEntryAction(raw)) return '';
    return raw;
  },

  isInvalidEntryAction(text = '') {
    const value = String(text || '').trim();
    if (!value || value.length < 6) return true;
    return /进入时机行动生成|任务定位|模板构成|上下文|原因[:：]|时间[:：]|角色[:：]|世界观[:：]|剧情索引/.test(value);
  },

  entryPrompt(reason, storyContext) {
    const lore = window.GameModules.sqliteSave.getWorldLore(this.character.work || '原创世界');
    return window.GameModules.renderPrompt('entry-action', { 原因: reason, 时间: this.entryTimeLabel(), 角色: `${this.character.name}｜${this.character.role}｜${this.character.personality || ''}`, 世界观: lore?.background || this.character.work, 剧情索引: storyContext });
  },

  async advanceEntryTime() {
    if (this.busy) return;
    const minutes = Math.max(1, Math.min(1440, parseInt(this.entryAdvanceInput, 10) || 10));
    this.busy = true;
    try {
      await this.generateEntryAction(`时间推进${minutes}分钟`);
    } finally {
      this.busy = false;
    }
  },

  async confirmControl() {
    if (this.busy) return;
    this.busy = true;
    try {
      this.started = true;
      this.entrySetupOpen = false;
      this.log = [];
      this.turn = 1;
      this.sceneTitle = this.entryTimeLabel();
      this.online = true;
      this.loadMetricsFromCharacterState();
      const currentAction = this.cleanEntryAction(this.entryCurrentAction) || `${this.character.name}正在按当前时间点的处境行动。`;
      this.entryCurrentAction = currentAction;
      const action = `你在手机上的《我狠狠控制》APP里选中${this.character.name}，按下连接按钮。意识陷入黑暗后，你在${this.entryTimeLabel()}醒来，发现自己已经附身到${this.character.name}身上。当前场景：${currentAction}`;
      const logId = this.addNovelEntry(action, { playerVisible: false });
      console.log('[控制上线] 已创建开场日志，开始生成:', { logId, character: this.character.name });
      const feedbackTask = window.GameModules.characterFeedback.initial(this);
      try {
        await Promise.race([this.refreshRagContext(action), new Promise((_, reject) => setTimeout(() => reject(new Error('资料检索超时')), 8000))]);
      } catch (err) {
        console.warn('[控制上线] 资料检索跳过:', err.message, err.stack);
        this.ragContext = '';
        this.ragResults = [];
      }
      try {
        this.memoryContext = await window.GameModules.characterMemory.contextFor(this, action);
      } catch (err) {
        console.warn('[控制上线] 记忆上下文跳过:', err.message, err.stack);
        this.memoryContext = '暂无人物记忆。';
      }
      const feedback = await feedbackTask;
      this.mindText = feedback.mind;
      this.feedbackSource = feedback.source || 'fallback';
      this.characterIntent = feedback.intent;
      console.debug('[角色反馈] 初始生成结果:', { source: this.feedbackSource, mindLength: String(this.mindText || '').length, intentLength: String(this.characterIntent || '').length });
      this.choices = feedback.choices || this.choices;
      await window.GameModules.characterFeedback.applyExperience(this, feedback);
      await window.GameModules.ai.generate(this, action, logId);
      await this.save();
    } finally {
      this.busy = false;
    }
  },
};


;// ---- control-actions.js ----
/**
 * 控制上线流程：玩家确认连接后的详细调试日志。
 */
window.GameModules = window.GameModules || {};
console.log('[控制上线] control-actions.js 已加载', { hasEntryActions: Boolean(window.GameModules.entryActions) });

Object.assign(window.GameModules.entryActions, {
  async confirmControl() {
    console.log('[控制上线] confirmControl 入口:', { busy: this.busy, started: this.started, entrySetupOpen: this.entrySetupOpen, ready: Boolean(this.entryTimeOptions?.start) });
    if (this.busy) {
      console.warn('[控制上线] confirmControl 被 busy 拦截:', { busy: this.busy });
      return;
    }
    const debug = window.GameModules.debug;
    const flow = debug.start('[控制上线] 总流程', {
      character: this.character?.name,
      characterId: this.character?.id,
      work: this.character?.work,
      slot: this.selectedSlot,
      model: this.modelId,
      controlMode: this.controlMode,
      entryTime: this.entryTimeLabel?.(),
      entryActionLength: String(this.entryCurrentAction || '').length,
    });
    this.busy = true;
    try {
      this.started = true;
      this.entrySetupOpen = false;
      this.log = [];
      this.turn = 1;
      this.sceneTitle = this.entryTimeLabel();
      this.online = true;
      this.loadMetricsFromCharacterState();
      const action = `你在手机上的《我狠狠控制》APP里选中${this.character.name}，按下连接按钮。意识陷入黑暗后，你在${this.entryTimeLabel()}醒来，发现自己已经附身到${this.character.name}身上。当前场景：${this.entryCurrentAction || `${this.character.name}正在行动。`}`;
      const logId = this.addNovelEntry(action, { playerVisible: false });
      debug.step('[控制上线] 开场日志已创建', { logId, actionLength: action.length });

      this.runBestEffortControlTask('世界线生成', () => this.ensureWorldline(action));
      const feedbackTask = this.runLoggedControlTask('角色反馈', () => window.GameModules.characterFeedback.initial(this));
      this.ragContext = '';
      this.ragResults = [];
      this.memoryContext = '由分阶段 Loop Agent 按需动态载入。';

      const feedback = await feedbackTask;
      debug.step('[控制上线] 应用角色反馈', { source: feedback.source, mindLength: String(feedback.mind || '').length, intentLength: String(feedback.intent || '').length });
      this.mindText = feedback.mind;
      this.feedbackSource = feedback.source || 'fallback';
      this.characterIntent = feedback.intent;
      this.choices = feedback.choices || this.choices;
      await this.runLoggedControlTask('上线体验写入', () => window.GameModules.characterFeedback.applyExperience(this, feedback));
      await this.runLoggedControlTask('AI剧情推演', () => window.GameModules.ai.generate(this, action, logId));
      await this.runLoggedControlTask('存档保存', () => this.save());
      debug.done(flow, { logCount: this.log.length, turn: this.turn, source: this.feedbackSource });
    } catch (err) {
      debug.fail(flow, err);
      console.error('[控制上线] 总流程异常:', err.code, err.message, err.stack);
    } finally {
      this.busy = false;
      debug.step('[控制上线] busy 已释放', { busy: this.busy, started: this.started });
    }
  },

  async runLoggedControlTask(name, fn, fallback = null) {
    const debug = window.GameModules.debug;
    const token = debug.start(`[控制上线] ${name}`);
    try {
      const result = await fn();
      debug.done(token, result && typeof result === 'object' ? result : {});
      return result;
    } catch (err) {
      debug.fail(token, err);
      if (fallback) return fallback(err);
      throw err;
    }
  },

  runBestEffortControlTask(name, fn) {
    this.runLoggedControlTask(name, fn, () => null).catch((err) => {
      console.warn(`[控制上线] ${name}已跳过:`, err.code, err.message);
    });
  },
});


;// ---- core-actions.js ----
/**
 * 核心交互动作。
 */
window.GameModules = window.GameModules || {};

window.GameModules.coreActions = {
  selectWork(name) {
    this.selectedWork = name;
    this.selectedCharacterId = window.GameModules.catalog.firstCharacter(name) || this.selectedCharacterId;
    this.resetEntryTime();
    this.resetMetricsForCharacter();
    // 首页只读取本地人物设定/目录资料，不预热 RPG schema，避免选择作品时触发 AI 请求。
    window.GameModules.characterBrief.ensure(this);
  },

  selectCharacter(id) {
    this.selectedCharacterId = id;
    this.resetEntryTime();
    this.resetMetricsForCharacter();
    // 首页只读取本地人物设定/目录资料，不生成完整角色卡，避免选择角色时消耗 token。
    window.GameModules.characterBrief.ensure(this);
  },

  resetMetricsForCharacter() {
    const metrics = window.GameModules.metrics.fresh();
    this.emotions = metrics.emotions;
    this.playerFeelings = metrics.playerFeelings;
    this.temporaryEmotions = {};
    this.temporaryPlayerFeelings = {};
    this.metricsReady = false;
    this.metricNotes = {};
    this.trust = this.playerFeelings.信任;
    this.resistance = this.playerFeelings.反抗;
    this.expandedMetricKey = '';
  },

  resetEntryTime() {
    this.entryCalendar = null;
    this.characterAge = '';
    this.entryTime = { year: '', month: '', day: '', hour: '', minute: '', second: '' };
    this.entryTimeOptions = { years: [], months: [], days: [], hours: [], minutes: [], seconds: [], start: null };
    this.entryCurrentAction = '';
    this.entrySetupOpen = false;
    this.entryIdentityOpen = false;
  },

  controlRoleList() {
    return Object.values(this.rpgStates || {})
      .filter((state) => state?.id && state.id !== 'player-self')
      .map((state) => ({ state, character: window.GameModules.catalog.find(state.id) || state.profile || { id: state.id, name: state.name || state.profile?.name || '未知角色', mark: state.profile?.mark || '控', role: state.profile?.role || '可上线角色', work: state.profile?.work || state.worldTag || '未知世界' } }))
      .sort((a, b) => String(a.character.work || '').localeCompare(String(b.character.work || ''), 'zh-Hans') || String(a.character.name || '').localeCompare(String(b.character.name || ''), 'zh-Hans'));
  },

  async connectControlRole(id) {
    if (!id || this.busy) return;
    const found = window.GameModules.catalog.find(id);
    if (found) {
      this.selectedWork = found.work || this.selectedWork;
      this.selectedCharacterId = found.id;
    } else {
      this.selectedCharacterId = id;
    }
    this.started = false;
    this.controlSelectOpen = false;
    await this.start();
  },

  openControlCharacterAdd() {
    this.started = false;
    this.controlSelectOpen = false;
    this.entrySetupOpen = false;
    window.GameModules.characterBrief.ensure(this);
  },

  openCharacterDetail() {
    window.GameModules.characterBrief.ensure(this);
    this.characterDetailOpen = true;
  },

  backToHome() {
    if (this.busy) return;
    this.entrySetupOpen = false;
    this.controlSelectOpen = true;
    this.entryCurrentAction = '';
  },

  entryAgeLabel() {
    if (this.characterAge) return this.characterAge;
    if (this.busy || !this.entryTimeOptions.start) return '计算中…';
    return '出生日期缺失';
  },

  async start() {
    await this.prepareEntrySetup();
  },

  async setOnline(value) {
    if (this.online === value || this.busy) return;
    this.online = value;
    if (value && this.controlMode === 'possess') {
      this.loadMetricsFromCharacterState();
      const feedback = await window.GameModules.characterFeedback.initial(this);
      this.mindText = feedback.mind;
      this.feedbackSource = feedback.source || 'fallback';
      this.characterIntent = feedback.intent;
      console.debug('[角色反馈] 切换在线生成结果:', { source: this.feedbackSource, mindLength: String(this.mindText || '').length, intentLength: String(this.characterIntent || '').length });
      this.choices = feedback.choices || this.choices;
      await window.GameModules.characterFeedback.applyExperience(this, feedback);
    }
    this.save();
  },

  async submitFreeInput() {
    const action = this.input.trim();
    if (!action) return;
    this.input = '';
    await this.submitAction(action);
  },

  async autoplay() {
    await this.submitAction(this.online ? '按照当前局势做最有效的行动' : '让角色完全自主决定下一步');
  },
};


;// ---- control-link-actions.js ----
window.GameModules = window.GameModules || {};

window.GameModules.controlLinkActions = {
  controlLinkMetricKeys: ['好感', '信任', '依赖', '爱情', '亲情', '友情', '肉欲', '服从'],

  controlLinkState(idOrState) {
    const id = typeof idOrState === 'string' ? idOrState : idOrState?.id;
    return id ? this.rpgStates?.[id] : idOrState;
  },

  controlLinkId(item = {}) { return item.character?.id || item.state?.id || item.id || ''; },

  controlLinkLocationText(state = null) {
    const location = state?.values?.current_location;
    if (typeof location === 'string') return location;
    if (location?.name) return `${location.name}${location.worldTag ? `｜${location.worldTag}` : ''}`;
    return '当前位置未登记';
  },

  ensureControlRoleLocation(state = null, reason = '') {
    if (!state?.values) return false;
    const before = JSON.stringify(state.values.current_location || null);
    const realWorld = window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';
    const isPlayer = state.id === 'player-self';
    const invalid = window.GameModules.rpgState?.isInvalidLocationName?.bind(window.GameModules.rpgState) || ((name) => !String(name || '').trim());
    const currentName = typeof state.values.current_location === 'string' ? state.values.current_location : state.values.current_location?.name;
    const fallback = isPlayer ? (this.realWorldLocationName || this.realWorldMap?.current || '现实当前位置') : '当前位置未知';
    const name = invalid(currentName) ? fallback : currentName;
    state.values.current_location = {
      name,
      worldTag: isPlayer ? realWorld : (state.worldTag || state.profile?.work || '未知世界'),
      updatedAt: this.phoneDateText?.() || '',
      reason: reason || (isPlayer ? '玩家现实当前位置。' : '角色当前位置登记；具体地点不足时保持未知。'),
    };
    const section = (state.schema?.sections || []).find((item) => item.title === '身份信息' || item.fields?.some((field) => field.key === 'world_tag')) || state.schema?.sections?.[0];
    if (section && !section.fields.some((field) => field.key === 'current_location')) section.fields.push({ key: 'current_location', label: '当前所在位置', type: 'text', desc: '用于避免同一人物同时出现在两个地点。' });
    return before !== JSON.stringify(state.values.current_location || null);
  },

  controlLinkHasHighMetric(state = null) {
    const feelings = state?.metrics?.playerFeelings || {};
    return this.controlLinkMetricKeys.some((key) => Number(feelings[key]) >= 90);
  },

  controlLinkHasPlayerIntimacy(state = null) {
    const intimacy = state?.values?.intimacy || {};
    const status = String(intimacy.sexualStatus || intimacy.status || '');
    const partnerText = JSON.stringify([intimacy.sexualPartners, intimacy.partners, intimacy.experiencePeople, intimacy.historyPeople]);
    const names = [this.playerProfile?.name, this.playerName, '玩家', 'player-self'].filter(Boolean);
    const hasPlayer = names.some((name) => partnerText.includes(String(name)));
    const explicitExperienced = /非处女|非童贞|非童真|已破身|破身|有经验|已有经历/.test(status);
    return explicitExperienced || hasPlayer;
  },

  isControlRoleLinked(state = null) {
    const target = this.controlLinkState(state);
    if (!target || target.id === 'player-self') return false;
    return Boolean(target.values?.control_link?.linked || (this.controlLinkHasHighMetric(target) && this.controlLinkHasPlayerIntimacy(target)));
  },

  async refreshControlLinkStates() {
    const save = window.GameModules.sqliteSave;
    for (const state of Object.values(this.rpgStates || {})) {
      if (!state?.values) continue;
      let changed = this.ensureControlRoleLocation(state);
      if (state.id !== 'player-self') {
        const linked = this.controlLinkHasHighMetric(state) && this.controlLinkHasPlayerIntimacy(state);
        const before = JSON.stringify(state.values.control_link || null);
        state.values.control_link = { ...(state.values.control_link || {}), linked, checkedAt: this.phoneDateText?.() || '', reason: linked ? '关系与经历条件已达成。' : '链接条件未达成。' };
        changed = changed || before !== JSON.stringify(state.values.control_link || null);
      }
      if (changed) await save.saveCharacterState?.(state);
    }
  },

  toggleControlLinkMenu(id) {
    if (!id || this.busy) return;
    this.controlLinkMenuId = this.controlLinkMenuId === id ? '' : id;
  },

  isSameWorldControlTarget(state = null) {
    const target = this.controlLinkState(state);
    const realWorld = window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';
    const world = target?.values?.current_location?.worldTag || target?.worldTag || target?.profile?.work || '';
    return Boolean(target && (world === realWorld || /现实|现代都市|2026/.test(world)));
  },

  async summonControlRole(id) {
    const state = this.controlLinkState(id);
    if (!state || !this.isControlRoleLinked(state)) return;
    const realWorld = window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';
    state.values.current_location = { name: this.realWorldLocationName || this.realWorldMap?.current || '玩家面前', worldTag: realWorld, updatedAt: this.phoneDateText?.() || '', reason: '被玩家通过链接召唤到现实当前位置，原地点自然消失。' };
    state.values.control_link = { ...(state.values.control_link || {}), linked: true, summoned: true, lastAction: '召唤', checkedAt: this.phoneDateText?.() || '' };
    await window.GameModules.sqliteSave.saveCharacterState?.(state);
    this.controlLinkMenuId = '';
    this.realWorldLog = [...(this.realWorldLog || []), { id: `summon-${Date.now()}`, type: 'system', text: `${state.name || state.profile?.name || '目标'}已被召唤到你面前。异世界与现实世界相对停止，不会同步推进。`, time: this.phoneTimeText?.() || '' }];
    await window.GameModules.sqliteSave.saveRealWorldLogEntries?.(this.realWorldLog);
    await this.save?.();
  },

  async onlineControlRole(id) {
    const state = this.controlLinkState(id);
    this.controlLinkMenuId = '';
    if (state && this.isSameWorldControlTarget(state)) {
      this.sharedControlTargetId = state.id;
      this.sharedControlActive = true;
      state.values.control_link = { ...(state.values.control_link || {}), linked: true, lastAction: '上线附身控制', checkedAt: this.phoneDateText?.() || '' };
      await window.GameModules.sqliteSave.saveCharacterState?.(state);
      this.realWorldOpen = true;
      this.desktopUnlocked = false;
      this.controlSelectOpen = false;
      this.realWorldLog = [...(this.realWorldLog || []), { id: `possess-${Date.now()}`, type: 'system', text: `你已上线附身控制${state.name || state.profile?.name || '目标'}。你的意识同时操控自己现实身体与被控角色身体，后续现实推演会以你的附身镜头描写被控角色感官、动作与反应。`, time: this.phoneTimeText?.() || '' }];
      await window.GameModules.sqliteSave.saveRealWorldLogEntries?.(this.realWorldLog);
      await this.save?.();
      return;
    }
    await this.connectControlRole(id);
  },

  sharedControlState() { return this.sharedControlActive ? this.rpgStates?.[this.sharedControlTargetId] || null : null; },
  sharedControlLabel() { return this.sharedControlState?.() ? '附身控制中' : ''; },
  realWorldDisplayState() { return this.sharedControlState?.() || this.playerIdentityState?.(); },
  realWorldDisplayCharacter() { return this.sharedControlState?.()?.profile || this.playerDisplayCharacter?.(); },
};


;// ---- app-switch-actions.js ----
window.GameModules = window.GameModules || {};

window.GameModules.appSwitchActions = {
  setDesktopPage(page) { this.desktopPage = Math.max(0, Math.min(2, Number(page) || 0)); },
  startDesktopSwipe(event) { this.desktopSwipeStart = { x: event.clientX, y: event.clientY }; },
  cancelDesktopSwipe() { this.desktopSwipeStart = null; },
  endDesktopSwipe(event) {
    const start = this.desktopSwipeStart;
    this.desktopSwipeStart = null;
    if (!start) return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    if (Math.abs(dx) < 42 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    this.setDesktopPage(this.desktopPage + (dx < 0 ? 1 : -1));
  },

  closeDesktopApps() {
    this.identityAppOpen = false;
    this.identityReturnTo = '';
    this.wechatAppOpen = false;
    this.saveAppOpen = false;
    this.roleCardJsonAppOpen = false;
    this.worldlineAppOpen = false;
    this.savePanelOpen = false;
    this.controlSelectOpen = false;
    this.controlLinkMenuId = '';
    if (this.settingsState) this.settingsState.open = false;
    if (this.systemTestState) this.systemTestState.open = false;
    if (this.companyState) this.companyState.open = false;
    if (this.bossState) this.bossState.open = false;
    if (this.calendarState) this.calendarState.open = false;
    if (this.factionState) this.factionState.open = false;
    if (this.skillsState) Object.assign(this.skillsState, { open: false, detailOpen: false });
    if (this.knownProfessionState) Object.assign(this.knownProfessionState, { open: false, detailOpen: false });
    if (this.taobaoState) Object.assign(this.taobaoState, { open: false, generatingId: '', walletOpen: false });
    if (this.promptState) Object.assign(this.promptState, { open: false, selectedId: '', selectedText: '', loading: false });
    if (this.tokenStatsState) Object.assign(this.tokenStatsState, { open: false, selectedId: '' });
    if (this.alertLogState) Object.assign(this.alertLogState, { open: false, selectedId: '' });
  },

  closeAppToDesktop() {
    this.desktopUnlocked = false;
    this.closeDesktopApps();
  },

  openDesktopApp() {
    this.closeDesktopApps();
    this.desktopUnlocked = true;
    this.controlSelectOpen = true;
    this.entrySetupOpen = false;
    this.refreshControlLinkStates?.().catch?.((err) => console.warn('刷新控制链接状态失败:', err.message, err.stack));
  },

  closeControlApp() {
    this.controlSelectOpen = false;
    this.closeAppToDesktop();
  },

  openSaveApp() {
    this.closeDesktopApps();
    this.saveAppOpen = true;
    this.desktopUnlocked = true;
    this.refreshSaveMetas?.();
  },

  closeSaveApp() {
    this.saveAppOpen = false;
    this.closeAppToDesktop();
  },
};

(function initDesktopPagerFallback() {
  function getGameStore() {
    try { return window.Alpine?.store?.('game') || null; } catch (_) { return null; }
  }

  function applyDesktopPage(page) {
    const pages = document.querySelector('.desktop-pages');
    const dots = Array.from(document.querySelectorAll('.desktop-page-dots button'));
    if (!pages || !dots.length) return;
    const maxPage = Math.max(0, dots.length - 1);
    const nextPage = Math.max(0, Math.min(maxPage, Number(page) || 0));
    const store = getGameStore();
    if (store) store.desktopPage = nextPage;
    pages.style.transform = `translateX(-${nextPage * 100}%)`;
    dots.forEach((dot, index) => dot.classList.toggle('active', index === nextPage));
  }

  function bindDesktopPager() {
    const dots = Array.from(document.querySelectorAll('.desktop-page-dots button'));
    dots.forEach((dot, index) => {
      if (dot.dataset.desktopPagerBound) return;
      dot.dataset.desktopPagerBound = '1';
      dot.addEventListener('click', () => applyDesktopPage(index));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindDesktopPager, { once: true });
  } else {
    bindDesktopPager();
  }
})();


;// ---- current-world-actions.js ----
window.GameModules = window.GameModules || {};

window.GameModules.currentWorldActions = {
  realWorldTag() {
    return window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';
  },

  normalizeCurrentWorldTag(worldTag = '') {
    const text = String(worldTag || '').trim();
    if (!text) return this.realWorldTag();
    if (window.GameModules.characterQuery?.isRealWorldTag?.(text) || ['现实世界', '现代都市现实世界', this.realWorldTag()].includes(text)) return this.realWorldTag();
    return text.slice(0, 40);
  },

  isRealCurrentWorld() {
    return this.normalizeCurrentWorldTag(this.currentWorldTag()) === this.realWorldTag();
  },

  currentWorldTag() {
    if (this.sharedControlActive && this.sharedControlState?.()) return this.realWorldTag();
    if ((this.started || this.entrySetupOpen) && this.character?.work) return this.normalizeCurrentWorldTag(this.character.work);
    return this.realWorldTag();
  },

  currentWorldLabel() {
    return this.isRealCurrentWorld() ? '现实世界' : this.currentWorldTag();
  },

  currentWorldBadgeText() {
    return `当前世界：${this.currentWorldLabel()}`;
  },

  currentWorldActionPlaceholder() {
    return this.isRealCurrentWorld() ? '输入你在现实世界的下一步行动...' : `输入你在${this.currentWorldLabel()}的下一步行动...`;
  },

  enforceCurrentWorldOnCharacter(character = {}) {
    const worldTag = this.currentWorldTag();
    const next = { ...character, work: worldTag, worldTag };
    if (next.profile) next.profile = { ...next.profile, work: worldTag };
    return next;
  },

  async routeCurrentWorldAction() {
    if (this.isRealCurrentWorld()) {
      await this.ensureGameplayAssetsReady?.();
      window.GameModules.remergeGameStore?.();
      return this.openRealWorldPanel?.();
    }
    this.realWorldOpen = false;
    this.desktopUnlocked = true;
    this.closeDesktopApps?.();
    this.controlSelectOpen = false;
    this.entrySetupOpen = false;
    this.profileOpen = false;
    this.scrollLog?.();
  },
};
