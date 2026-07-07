window.GameModules = window.GameModules || {};

window.GameModules.skillsActions = {
  initSkillsApp() {
    if (this._skillsAppInitialized && this.skillsState) {
      if (!this._skillsDefinitionsLoadPromise && !window.GameModules.skillLoader?.loaded) {
        this._skillsDefinitionsLoadPromise = window.GameModules.skillsApp.loadDefinitions()
          .catch((err) => console.warn('[Skills] load definitions failed', err.message, err.stack))
          .finally(() => { this._skillsDefinitionsLoadPromise = null; });
      }
      return this.skillsState;
    }
    const base = window.GameModules.skillsApp.defaultState();
    this.skillsState = { ...base, ...(this.skillsState || {}) };
    window.GameModules.skillsApp.loadDefinitions().catch((err) => console.warn('[Skills] 初始化动态文档失败:', err.message, err.stack));
    this._skillsAppInitialized = true;
    return this.skillsState;
  },

  openSkillsApp() {
    this.initSkillsApp();
    this.identityAppOpen = false;
    this.wechatAppOpen = false;
    this.saveAppOpen = false;
    this.roleCardJsonAppOpen = false;
    this.worldlineAppOpen = false;
    if (this.companyState) this.companyState.open = false;
    if (this.bossState) this.bossState.open = false;
    if (this.calendarState) this.calendarState.open = false;
    if (this.factionState) this.factionState.open = false;
    if (this.knownProfessionState) this.knownProfessionState.open = false;
    if (this.promptState) this.promptState.open = false;
    if (this.tokenStatsState) this.tokenStatsState.open = false;
    this.skillsState.open = true;
    this.desktopUnlocked = true;
  },

  closeSkillsApp() {
    if (this.skillsState) {
      this.skillsState.open = false;
      this.skillsState.detailOpen = false;
    }
    this.closeAppToDesktop();
  },

  openSkillDetail(id) {
    this.initSkillsApp();
    this.skillsState.selectedSkillId = id;
    this.skillsState.detailOpen = true;
  },

  closeSkillDetail() {
    if (!this.skillsState) return;
    this.skillsState.detailOpen = false;
    this.skillsState.selectedSkillId = '';
  },

  skillsList() {
    this.initSkillsApp();
    const q = String(this.skillsState.query || '').trim().toLowerCase();
    return window.GameModules.skillsApp.definitions().filter((skill) => {
      const matchesCategory = !this.skillsState.category || skill.category === this.skillsState.category;
      const haystack = [skill.name, skill.category, skill.method, skill.description, skill.detail].join(' ').toLowerCase();
      return matchesCategory && (!q || haystack.includes(q));
    });
  },

  skillCategories() {
    return [...new Set(window.GameModules.skillsApp.definitions().map((skill) => skill.category))];
  },

  selectedSkill() {
    this.initSkillsApp();
    if (!this.skillsState.selectedSkillId) return null;
    const list = this.skillsList();
    return list.find((skill) => skill.id === this.skillsState.selectedSkillId) || null;
  },
};
