window.GameModules = window.GameModules || {};

window.GameModules.tokenStats = {
  records: [],
  seq: 0,
  maxRecords: 120,
  defaultState() { return { open: false, query: '', category: '', selectedId: '' }; },
  estimateCredits(tokens) { return Math.max(1, Math.ceil((Number(tokens) || 0) / 1000)); },
  record(promptId, text) {
    if (!promptId) return text;
    const item = window.GameModules.promptTemplates?.find?.(promptId);
    const createdAt = Date.now();
    const fullText = String(text || '');
    const tokens = window.GameModules.characterMemory?.estimateTokens?.(fullText) || Math.ceil(fullText.length / 2);
    const record = {
      id: `${createdAt}-${++this.seq}-${promptId}`,
      promptId,
      text: fullText,
      tokens,
      credits: this.estimateCredits(tokens),
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
    this.identityAppOpen = false; this.wechatAppOpen = false;
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
  tokenPromptCostText(id) { const stat = window.GameModules.tokenStats.item(id); return stat ? `${stat.tokens} token｜约 ${stat.credits} 积分` : '未生成'; },
};
