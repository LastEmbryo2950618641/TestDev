window.GameModules = window.GameModules || {};

window.GameModules.tokenStats = {
  records: [],
  seq: 0,
  maxRecords: 120,
  modelPrices: {},
  defaultState() { return { open: false, query: '', category: '', selectedId: '' }; },
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
  templateIdForSource(promptId) {
    const id = String(promptId || '');
    if (/^character-profile-(emotions|playerFeelings)(?:-|$)/.test(id)) return 'character-profile-metric-group';
    return id;
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
      title: item?.title || promptId,
      category: item?.category || '未分类',
      summary: item?.summary || '',
      file: item?.file || '',
      createdAt,
      updatedAt: new Date(createdAt).toLocaleString('zh-CN'),
    };
    this.records.unshift(record);
    if (this.records.length > this.maxRecords) this.records.length = this.maxRecords;
    return text;
  },
  item(recordId) { return this.records.find((item) => item.id === recordId) || null; },
  categories() { return [...new Set(window.GameModules.promptTemplates.list().map((item) => item.category))]; },
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
    this.identityAppOpen = false; this.wechatAppOpen = false; this.saveAppOpen = false; this.worldlineAppOpen = false;
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
    return window.GameModules.tokenStats.list({ query: this.tokenStatsState.query, category: this.tokenStatsState.category });
  },
  tokenPromptCategories() { return window.GameModules.tokenStats.categories(); },
  openTokenPromptDetail(id) { this.initTokenStatsApp(); this.tokenStatsState.selectedId = id; },
  closeTokenPromptDetail() { if (this.tokenStatsState) this.tokenStatsState.selectedId = ''; },
  currentTokenPromptRecord() { return window.GameModules.tokenStats.item(this.tokenStatsState?.selectedId); },
  tokenPromptText(id) { return window.GameModules.tokenStats.item(id)?.text || '暂无请求记录。先触发对应 AI 生成流程后，这里会显示变量已替换的完整提示词。'; },
  tokenPromptCostText(id) { const stat = window.GameModules.tokenStats.item(id); return stat ? `输入${stat.inputTokens || stat.tokens} + 预留输出${stat.outputTokens || 0} token｜模型${stat.model || '未知'}×${stat.price || 1}｜约 ${stat.credits} 积分` : '未生成'; },
};
