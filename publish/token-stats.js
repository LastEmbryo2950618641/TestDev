window.GameModules = window.GameModules || {};

window.GameModules.tokenStats = {
  records: {},
  defaultState() { return { open: false, query: '', category: '', selectedId: '' }; },
  estimate(text) {
    const s = String(text || '');
    const han = (s.match(/[\u4e00-\u9fff]/g) || []).length;
    const words = (s.match(/[a-zA-Z0-9_]+/g) || []).reduce((n, w) => n + Math.ceil(w.length / 4), 0);
    return Math.ceil(han * 0.65 + words + s.length / 18);
  },
  record(id, text) {
    if (!id) return text;
    const item = window.GameModules.promptTemplates?.find?.(id);
    this.records[id] = { id, text: String(text || ''), tokens: this.estimate(text), title: item?.title || id, category: item?.category || '未分类', updatedAt: new Date().toLocaleString('zh-CN') };
    return text;
  },
  item(id) { return this.records[id] || null; },
};

window.GameModules.tokenStatsActions = {
  initTokenStatsApp() { this.tokenStatsState = { ...window.GameModules.tokenStats.defaultState(), ...(this.tokenStatsState || {}) }; },
  openTokenStatsApp() {
    this.initTokenStatsApp();
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
  closeTokenStatsApp() { if (this.tokenStatsState) this.tokenStatsState.open = false; this.closeAppToDesktop(); },
  tokenPromptList() {
    this.initTokenStatsApp();
    const q = String(this.tokenStatsState.query || '').trim().toLowerCase();
    return window.GameModules.promptTemplates.list().map((item) => ({ ...item, stat: window.GameModules.tokenStats.item(item.id) })).filter((item) => {
      const inCategory = !this.tokenStatsState.category || item.category === this.tokenStatsState.category;
      const haystack = [item.title, item.category, item.summary, item.file].join(' ').toLowerCase();
      return inCategory && (!q || haystack.includes(q));
    });
  },
  tokenPromptCategories() { return [...new Set(window.GameModules.promptTemplates.list().map((item) => item.category))]; },
  openTokenPromptDetail(id) { this.initTokenStatsApp(); this.tokenStatsState.selectedId = id; },
  closeTokenPromptDetail() { if (this.tokenStatsState) this.tokenStatsState.selectedId = ''; },
  currentTokenPromptItem() { return window.GameModules.promptTemplates.find(this.tokenStatsState?.selectedId); },
  currentTokenPromptRecord() { return window.GameModules.tokenStats.item(this.tokenStatsState?.selectedId); },
  tokenPromptText(id) { return window.GameModules.tokenStats.item(id)?.text || '该提示词本次还没有被 AI 调用。先触发对应生成流程后，这里会显示变量已替换的完整提示词。'; },
  tokenPromptTokenText(id) { const stat = window.GameModules.tokenStats.item(id); return stat ? `${stat.tokens} token` : '未生成'; },
};
