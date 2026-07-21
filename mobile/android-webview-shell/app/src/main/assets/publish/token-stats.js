window.GameModules = window.GameModules || {};

window.GameModules.tokenStats = {
  records: [],
  seq: 0,
  maxRecords: 120,
  modelPrices: {},
  defaultState() { return { open: false, query: '', category: '', categoryMenuOpen: false, selectedId: '', selectedTab: 'prompt', version: 0 }; },
  notifyChange() {
    const store = window.Alpine?.store?.('game');
    if (!store?.tokenStatsState) return;
    store.tokenStatsState.version = (Number(store.tokenStatsState.version) || 0) + 1;
  },
  priceValue(price) {
    const match = String(price ?? '').match(/[\d.]+/);
    const value = match ? Number(match[0]) : Number(price);
    return Number.isFinite(value) && value > 0 ? value : 1;
  },
  syncModelPrices(result) {
    const prices = {};
    (result?.models || []).forEach((model) => { if (model?.internalName) prices[model.internalName] = this.priceValue(model.price); });
    (result?.categories || []).forEach((category) => (category.modelGroups || []).forEach((group) => (group.contexts || []).forEach((ctx) => {
      if (ctx?.internalName && group?.price !== undefined) prices[ctx.internalName] = this.priceValue(group.price);
    })));
    this.modelPrices = { ...this.modelPrices, ...prices };
  },
  estimateCredits(tokens, model = '') {
    const price = this.modelPrices?.[model] || 1;
    return Math.max(1, Math.ceil(((Number(tokens) || 0) / 1000) * price));
  },
  normalizeUsage(meta = {}) {
    const usage = meta?.usage && typeof meta.usage === 'object' ? meta.usage : {};
    const cache = meta?.deepseekCache && typeof meta.deepseekCache === 'object' ? meta.deepseekCache : {};
    const numberOf = (...values) => {
      for (const value of values) {
        const num = Number(value);
        if (Number.isFinite(num) && num > 0) return Math.round(num);
      }
      return 0;
    };
    const promptTokens = numberOf(usage.prompt_tokens, usage.promptTokens, meta.promptTokens);
    const completionTokens = numberOf(usage.completion_tokens, usage.completionTokens, meta.completionTokens);
    const totalTokens = numberOf(usage.total_tokens, usage.totalTokens, promptTokens + completionTokens);
    const promptCacheHitTokens = numberOf(cache.promptCacheHitTokens, cache.hitTokens, usage.prompt_cache_hit_tokens, usage.promptCacheHitTokens);
    const promptCacheMissTokens = numberOf(cache.promptCacheMissTokens, cache.missTokens, usage.prompt_cache_miss_tokens, usage.promptCacheMissTokens);
    return { usage, promptTokens, completionTokens, totalTokens, promptCacheHitTokens, promptCacheMissTokens };
  },
  formatDuration(ms = 0) {
    const value = Math.max(0, Math.round(Number(ms) || 0));
    if (!value) return '';
    if (value < 1000) return `${value}ms`;
    return `${(value / 1000).toFixed(value < 10000 ? 1 : 0)}s`;
  },
  cacheText(record = {}) {
    const hit = Math.max(0, Math.round(Number(record.promptCacheHitTokens) || 0));
    const miss = Math.max(0, Math.round(Number(record.promptCacheMissTokens) || 0));
    const total = hit + miss;
    if (!hit && !miss) return '';
    if (!total) return `缓存命中${hit} token`;
    return `缓存命中${hit}/${total} token（${Math.round((hit / total) * 100)}%）`;
  },
  rowCostText(record = {}) {
    if (!record) return '未生成';
    const total = Math.max(0, Math.round(Number(record.actualTotalTokens) || 0));
    const estimate = Math.max(0, Math.round(Number(record.tokens) || 0));
    const completed = Boolean(record.completedAt || record.status === 'completed');
    const tokenText = total ? `实耗 ${total} token` : `${completed ? '未返回用量' : '请求中'}，估算 ${estimate} token`;
    const cache = this.cacheText(record);
    const duration = this.formatDuration(record.durationMs);
    const parts = [tokenText, cache, duration ? `耗时${duration}` : '', `约 ${record.credits || this.estimateCredits(total || estimate, record.model)} 积分`];
    return parts.filter(Boolean).join('｜');
  },
  templateIdForSource(promptId) {
    const id = String(promptId || '');
    if (/^character-profile-(emotions|playerFeelings)(?:-|$)/.test(id)) return 'character-profile-metric-group';
    if (/^character-profile-part4-csv-fix$/.test(id)) return 'character-profile-part4-inventory-wearing-rpg';
    return id;
  },
  titleForSource(promptId, item) {
    const id = String(promptId || '');
    const names = {
      'character-profile-part2-csv-fix': '角色卡 Part2 情感数值 CSV 修复',
      'character-profile-part3-csv-fix': '角色卡 Part3 能力职业 CSV 修复',
      'character-profile-part4-csv-fix': '角色卡 Part4 物品穿着 CSV 修复',
      'character-profile-part5-csv-fix': '角色卡 Part5 身体原貌 CSV 修复',
      'character-profile-part6-csv-fix': '角色卡 Part6 盛装状态 CSV 修复',
      'real-stage3-router': '现实阶段3A-更新分组判断',
      'real-stage3-update-init': '现实阶段3B-初始化更新',
      'real-stage3-update-metrics': '现实阶段3B-情绪与感觉更新',
      'real-stage3-update-bodySex': '现实阶段3B-身体与性经历更新',
      'real-stage3-update-survival': '现实阶段3B-生命体征与系统更新',
      'real-stage3-update-worldSocial': '现实阶段3B-世界关系与势力更新',
      'real-stage3-update-inventory': '现实阶段3B-物品更新',
    };
    return names[id] || item?.title || id;
  },
  record(promptId, text, meta = {}) {
    if (!promptId) return text;
    const templateId = meta.templateId || this.templateIdForSource(promptId);
    const item = window.GameModules.promptTemplates?.items?.find((tpl) => tpl.id === templateId);
    const createdAt = Date.now();
    const fullText = String(text || '');
    const inputTokens = window.GameModules.characterMemory?.estimateTokens?.(fullText) || Math.ceil(fullText.length / 2);
    const outputTokens = Math.max(0, Number(meta.maxTokens) || 0);
    const tokens = inputTokens + outputTokens;
    const model = meta.model || '';
    const title = meta.title || this.titleForSource(promptId, item);
    const category = meta.category || item?.category || '未分类';
    const summary = meta.summary || item?.summary || '';
    const file = meta.file || item?.file || '';
    const record = {
      id: `${createdAt}-${++this.seq}-${promptId}`,
      promptId,
      text: fullText,
      inputTokens,
      outputTokens,
      tokens,
      model,
      price: this.modelPrices?.[model] || 1,
      credits: this.estimateCredits(tokens, model),
      title,
      category,
      summary,
      file,
      kind: meta.kind || 'completion',
      responseText: String(meta.responseText || ''),
      responseImages: Array.isArray(meta.responseImages) ? meta.responseImages.filter(Boolean) : [],
      providerUsage: null,
      actualInputTokens: 0,
      actualOutputTokens: 0,
      actualTotalTokens: 0,
      promptCacheHitTokens: 0,
      promptCacheMissTokens: 0,
      queueWaitMs: 0,
      durationMs: 0,
      chunkCount: 0,
      status: 'pending',
      createdAt,
      updatedAt: new Date(createdAt).toLocaleString('zh-CN'),
    };
    this.records.unshift(record);
    if (this.records.length > this.maxRecords) this.records.length = this.maxRecords;
    this.notifyChange();
    return record.id;
  },
  recordResponse(recordId, responseText, responseImages = [], meta = {}) {
    const record = this.item(recordId);
    if (!record) return;
    if (!Array.isArray(responseImages) && responseImages && typeof responseImages === 'object') {
      meta = responseImages;
      responseImages = [];
    }
    record.responseText = String(responseText || '');
    record.status = 'completed';
    if (Array.isArray(responseImages)) record.responseImages = responseImages.filter(Boolean);
    const usage = this.normalizeUsage(meta);
    record.providerUsage = Object.keys(usage.usage || {}).length ? usage.usage : record.providerUsage;
    record.actualInputTokens = usage.promptTokens || record.actualInputTokens || 0;
    record.actualOutputTokens = usage.completionTokens || record.actualOutputTokens || 0;
    record.actualTotalTokens = usage.totalTokens || record.actualTotalTokens || 0;
    record.promptCacheHitTokens = usage.promptCacheHitTokens || record.promptCacheHitTokens || 0;
    record.promptCacheMissTokens = usage.promptCacheMissTokens || record.promptCacheMissTokens || 0;
    record.deepseekCache = { promptCacheHitTokens: record.promptCacheHitTokens, promptCacheMissTokens: record.promptCacheMissTokens };
    record.queueWaitMs = Math.max(0, Math.round(Number(meta.queueWaitMs) || record.queueWaitMs || 0));
    record.durationMs = Math.max(0, Math.round(Number(meta.durationMs) || record.durationMs || 0));
    record.chunkCount = Math.max(0, Math.round(Number(meta.chunkCount) || record.chunkCount || 0));
    if (meta.completedAt) record.completedAt = Number(meta.completedAt) || record.completedAt;
    if (record.completedAt) record.completedAtText = new Date(record.completedAt).toLocaleString('zh-CN');
    this.notifyChange();
  },
  recordProgress(recordId, meta = {}) {
    const record = this.item(recordId);
    if (!record) return;
    if (meta.status) record.status = String(meta.status);
    const usage = this.normalizeUsage(meta);
    record.providerUsage = Object.keys(usage.usage || {}).length ? usage.usage : record.providerUsage;
    record.actualInputTokens = usage.promptTokens || record.actualInputTokens || 0;
    record.actualOutputTokens = usage.completionTokens || record.actualOutputTokens || 0;
    record.actualTotalTokens = usage.totalTokens || record.actualTotalTokens || 0;
    record.promptCacheHitTokens = usage.promptCacheHitTokens || record.promptCacheHitTokens || 0;
    record.promptCacheMissTokens = usage.promptCacheMissTokens || record.promptCacheMissTokens || 0;
    record.deepseekCache = { promptCacheHitTokens: record.promptCacheHitTokens, promptCacheMissTokens: record.promptCacheMissTokens };
    record.queueWaitMs = Math.max(0, Math.round(Number(meta.queueWaitMs) || record.queueWaitMs || 0));
    record.durationMs = Math.max(0, Math.round(Number(meta.durationMs) || record.durationMs || 0));
    record.chunkCount = Math.max(0, Math.round(Number(meta.chunkCount) || record.chunkCount || 0));
    if (meta.responseText && String(meta.responseText).length <= 120000) record.responseText = String(meta.responseText || '');
    this.notifyChange();
  },
  recordError(recordId, err = {}, meta = {}) {
    const record = this.item(recordId);
    if (!record) return;
    record.status = 'failed';
    const completedAt = Number(meta.completedAt) || Date.now();
    record.completedAt = completedAt;
    record.completedAtText = new Date(completedAt).toLocaleString('zh-CN');
    const message = String(err?.message || err || 'AI request failed');
    const code = String(err?.code || '').trim();
    const partial = String(meta.responseText || '').trim();
    const errorText = `AI请求失败${code ? `（${code}）` : ''}: ${message}`;
    record.responseText = partial ? `${partial}\n\n---\n${errorText}` : errorText;
    this.recordProgress(recordId, {
      ...meta,
      status: 'failed',
      durationMs: Math.max(0, Math.round(Number(meta.durationMs) || (completedAt - record.createdAt))),
      responseText: record.responseText,
    });
  },
  item(recordId) { return this.records.find((item) => item.id === recordId) || null; },
  categories() {
    const templateCategories = window.GameModules.promptTemplates.list().map((item) => item.category);
    const recordCategories = this.records.map((item) => item.category);
    return [...new Set([...templateCategories, ...recordCategories].filter(Boolean))];
  },
  list({ query = '', category = '' } = {}) {
    const q = String(query || '').trim().toLowerCase();
    return this.records.filter((item) => {
      const inCategory = !category || item.category === category;
      const haystack = [item.title, item.category, item.summary, item.file, item.updatedAt].join(' ').toLowerCase();
      return inCategory && (!q || haystack.includes(q));
    });
  },
};

window.GameModules.tokenStatsActions = {
  initTokenStatsApp() { this.tokenStatsState = { ...window.GameModules.tokenStats.defaultState(), ...(this.tokenStatsState || {}) }; },
  openTokenStatsApp() {
    this.initTokenStatsApp();
    this.tokenStatsState.selectedId = '';
    this.identityAppOpen = false; this.wechatAppOpen = false; this.saveAppOpen = false; this.roleCardJsonAppOpen = false; this.worldlineAppOpen = false;
    if (this.companyState) this.companyState.open = false;
    if (this.bossState) this.bossState.open = false;
    if (this.calendarState) this.calendarState.open = false;
    if (this.factionState) this.factionState.open = false;
    if (this.skillsState) this.skillsState.open = false;
    if (this.promptState) this.promptState.open = false;
    if (this.knownProfessionState) this.knownProfessionState.open = false;
    this.tokenStatsState.open = true; this.desktopUnlocked = true;
  },
  closeTokenStatsApp() { if (this.tokenStatsState) Object.assign(this.tokenStatsState, { open: false, selectedId: '' }); this.closeAppToDesktop(); },
  tokenPromptList() {
    this.initTokenStatsApp();
    this.tokenStatsState.version;
    return window.GameModules.tokenStats.list({ query: this.tokenStatsState.query, category: this.tokenStatsState.category });
  },
  tokenPromptCategories() { return window.GameModules.tokenStats.categories(); },
  tokenCategoryLabel() { return this.tokenStatsState?.category || '全部分类'; },
  selectTokenCategory(category = '') {
    this.initTokenStatsApp();
    this.tokenStatsState.category = category;
    this.tokenStatsState.categoryMenuOpen = false;
  },
  openTokenPromptDetail(id) { this.initTokenStatsApp(); this.tokenStatsState.selectedId = id; this.tokenStatsState.selectedTab = 'prompt'; },
  closeTokenPromptDetail() { if (this.tokenStatsState) this.tokenStatsState.selectedId = ''; },
  currentTokenPromptRecord() { return window.GameModules.tokenStats.item(this.tokenStatsState?.selectedId); },
  tokenPromptText(id) { return window.GameModules.tokenStats.item(id)?.text || '暂无请求记录。先触发对应 AI 生成流程后，这里会显示变量已替换的完整提示词。'; },
  tokenResponseText(id) { return window.GameModules.tokenStats.item(id)?.responseText || '暂无 AI 返回值。请求完成后这里会显示原始返回内容。'; },
  tokenResponseImages(id) { return window.GameModules.tokenStats.item(id)?.responseImages || []; },
  tokenPromptDetailText() { const id = this.tokenStatsState?.selectedId; return this.tokenStatsState?.selectedTab === 'response' ? this.tokenResponseText(id) : this.tokenPromptText(id); },
  tokenPromptRowCostText(item) {
    this.tokenStatsState?.version;
    return window.GameModules.tokenStats.rowCostText(item);
  },
  tokenPromptCostText(id) {
    this.tokenStatsState?.version;
    const stat = window.GameModules.tokenStats.item(id);
    if (!stat) return '未生成';
    const completed = Boolean(stat.completedAt || stat.status === 'completed');
    const usage = stat.actualTotalTokens
      ? `实耗输入${stat.actualInputTokens || 0} + 输出${stat.actualOutputTokens || 0} token`
      : `${completed ? '未返回用量' : '请求中'}：输入${stat.inputTokens || stat.tokens} + 预留输出${stat.outputTokens || 0} token`;
    const cache = window.GameModules.tokenStats.cacheText(stat);
    const duration = window.GameModules.tokenStats.formatDuration(stat.durationMs);
    const queue = stat.queueWaitMs > 300 ? `排队${window.GameModules.tokenStats.formatDuration(stat.queueWaitMs)}` : '';
    return [usage, cache, duration ? `耗时${duration}` : '', queue, `模型${stat.model || '未知'}×${stat.price || 1}`, `约 ${stat.credits} 积分`].filter(Boolean).join('｜');
  },
};
