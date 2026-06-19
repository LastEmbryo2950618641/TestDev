window.GameModules = window.GameModules || {};

window.GameModules.promptActions = {
  initPromptApp() { this.promptState = { ...window.GameModules.promptTemplates.defaultState(), ...(this.promptState || {}) }; },
  openPromptApp() {
    this.initPromptApp();
    this.identityAppOpen = false; this.wechatAppOpen = false; this.saveAppOpen = false; this.worldlineAppOpen = false;
    if (this.companyState) this.companyState.open = false;
    if (this.bossState) this.bossState.open = false;
    if (this.calendarState) this.calendarState.open = false;
    if (this.factionState) this.factionState.open = false;
    if (this.skillsState) this.skillsState.open = false;
    if (this.knownProfessionState) this.knownProfessionState.open = false;
    if (this.tokenStatsState) this.tokenStatsState.open = false;
    this.promptState.open = true; this.desktopUnlocked = true;
  },
  closePromptApp() { if (this.promptState) this.promptState.open = false; this.closeAppToDesktop(); },
  promptList() {
    this.initPromptApp();
    const q = String(this.promptState.query || '').trim().toLowerCase();
    return window.GameModules.promptTemplates.list().filter((item) => {
      const inCategory = !this.promptState.category || item.category === this.promptState.category;
      const haystack = [item.title, item.category, item.summary, item.file].join(' ').toLowerCase();
      return inCategory && (!q || haystack.includes(q));
    });
  },
  promptCategories() { return [...new Set(window.GameModules.promptTemplates.list().map((item) => item.category))]; },
  promptCategoryLabel() { return this.promptState?.category || '全部分类'; },
  selectPromptCategory(category = '') {
    this.initPromptApp();
    this.promptState.category = category;
    this.promptState.categoryMenuOpen = false;
  },
  isPromptOpen(id) { return this.promptState?.selectedId === id; },
  currentPromptItem() { return window.GameModules.promptTemplates.find(this.promptState?.selectedId); },
  closePromptDetail() { if (this.promptState) { this.promptState.selectedId = ''; this.promptState.selectedText = ''; this.promptState.error = ''; } },
  async togglePromptDetail(id) {
    this.initPromptApp();
    if (this.promptState.selectedId === id) { this.promptState.selectedId = ''; this.promptState.selectedText = ''; return; }
    this.promptState.selectedId = id; this.promptState.loading = true; this.promptState.error = '';
    this.promptState.selectedText = window.GameModules.promptTemplates.snapshot(id);
    try { this.promptState.selectedText = await window.GameModules.promptTemplates.load(id); }
    catch (err) { console.error('提示词模板读取失败:', err.message, err.stack); this.promptState.error = err.message || '读取失败'; this.promptState.selectedText = ''; }
    finally { this.promptState.loading = false; }
  },
};
