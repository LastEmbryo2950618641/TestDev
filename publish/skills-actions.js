window.GameModules = window.GameModules || {};

window.GameModules.skillsActions = {
  initSkillsApp() {
    const base = window.GameModules.skillsApp.defaultState();
    this.skillsState = { ...base, ...(this.skillsState || {}) };
  },

  openSkillsApp() {
    this.initSkillsApp();
    this.identityAppOpen = false;
    this.wechatAppOpen = false;
    if (this.companyState) this.companyState.open = false;
    if (this.bossState) this.bossState.open = false;
    if (this.calendarState) this.calendarState.open = false;
    if (this.factionState) this.factionState.open = false;
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
    if (this.skillsState) this.skillsState.detailOpen = false;
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
    const list = this.skillsList();
    return list.find((skill) => skill.id === this.skillsState.selectedSkillId) || list[0] || null;
  },
};
