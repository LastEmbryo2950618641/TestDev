window.GameModules = window.GameModules || {};

window.GameModules.promptActions = {
  initPromptApp() { this.promptState = { ...window.GameModules.promptTemplates.defaultState(), ...(this.promptState || {}) }; },
  openPromptApp() {
    this.initPromptApp();
    this.identityAppOpen = false; this.wechatAppOpen = false; this.saveAppOpen = false; this.roleCardJsonAppOpen = false; this.worldlineAppOpen = false;
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
  promptDrawItems() {
    return [
      { id: 'draw-wechat-album-natural', title: '微信相册图片生成｜自然状态', category: '图片生成', file: 'prompts/picture_generate/wechat-album-photo.md', summary: '按当前选中联系人替换 {角色身份信息} 与 {自然状态部位描述}。', drawKind: 'natural' },
      { id: 'draw-wechat-album-dressed', title: '微信相册图片生成｜盛装状态', category: '图片生成', file: 'prompts/picture_generate/wechat-album-photo.md', summary: '按当前选中联系人替换 {角色身份信息} 与 {盛装部位描述}。', drawKind: 'dressed' },
    ];
  },
  promptRuntimeItems() {
    return (window.GameModules.tokenStats?.records || []).filter((record) => record.kind === 'draw').map((record) => ({
      id: `runtime-${record.id}`,
      title: record.title || '运行时 AI 请求',
      category: record.category || '图片生成',
      file: record.file || '运行时请求',
      summary: record.summary || '运行时生成的完整提示词。',
      runtimeRecordId: record.id,
    }));
  },
  promptAllItems() {
    return [...window.GameModules.promptTemplates.list(), ...this.promptDrawItems(), ...this.promptRuntimeItems()];
  },
  promptList() {
    this.initPromptApp();
    const q = String(this.promptState.query || '').trim().toLowerCase();
    return this.promptAllItems().filter((item) => {
      const inCategory = !this.promptState.category || item.category === this.promptState.category;
      const haystack = [item.title, item.category, item.summary, item.file].join(' ').toLowerCase();
      return inCategory && (!q || haystack.includes(q));
    });
  },
  promptCategories() {
    return [...new Set(this.promptAllItems().map((item) => item.category).filter(Boolean))];
  },
  promptCategoryLabel() { return this.promptState?.category || '全部分类'; },
  selectPromptCategory(category = '') {
    this.initPromptApp();
    this.promptState.category = category;
    this.promptState.categoryMenuOpen = false;
  },
  isPromptOpen(id) { return this.promptState?.selectedId === id; },
  currentPromptItem() {
    const id = this.promptState?.selectedId || '';
    return this.promptAllItems().find((item) => item.id === id) || window.GameModules.promptTemplates.find(id);
  },
  closePromptDetail() { if (this.promptState) { this.promptState.selectedId = ''; this.promptState.selectedText = ''; this.promptState.error = ''; } },
  promptDrawDetailText(contact, kind) {
    const template = this.wechatAlbumDrawTagTemplate?.() || window.GameModules.pictureGeneratePrompts?.drawTagPrompt || '';
    const finalPrompt = this.wechatAlbumPhotoPrompt?.(contact, kind) || '微信相册图片生成提示词函数未加载。';
    return [`【绘画标签生成模板】\n${template || '绘画标签生成模板未加载。'}`, `【当前联系人替换后】\n${finalPrompt}`].join('\n\n---\n\n');
  },
  async togglePromptDetail(id) {
    this.initPromptApp();
    if (this.promptState.selectedId === id) { this.promptState.selectedId = ''; this.promptState.selectedText = ''; return; }
    this.promptState.selectedId = id; this.promptState.loading = true; this.promptState.error = '';
    const drawItem = this.promptDrawItems().find((item) => item.id === id);
    if (drawItem) {
      const contact = this.wechatProfileContact?.() || this.wechatSelected?.() || { id: 'player-self', name: this.playerName || '联系人', mark: '联' };
      this.promptState.selectedText = this.promptDrawDetailText(contact, drawItem.drawKind);
      this.promptState.loading = false;
      return;
    }
    const runtimeItem = this.promptRuntimeItems().find((item) => item.id === id);
    if (runtimeItem) {
      this.promptState.selectedText = window.GameModules.tokenStats.item(runtimeItem.runtimeRecordId)?.text || '暂无运行时提示词。';
      this.promptState.loading = false;
      return;
    }
    this.promptState.selectedText = window.GameModules.promptTemplates.snapshot(id);
    try { this.promptState.selectedText = await window.GameModules.promptTemplates.load(id); }
    catch (err) { console.error('提示词模板读取失败:', err.message, err.stack); this.promptState.error = err.message || '读取失败'; this.promptState.selectedText = ''; }
    finally { this.promptState.loading = false; }
  },
};
