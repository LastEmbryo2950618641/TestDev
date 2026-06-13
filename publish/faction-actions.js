window.GameModules = window.GameModules || {};

window.GameModules.factionActions = {
  initFactionSystem() {
    const base = window.GameModules.factionSystem.defaultState(this.playerProfile || {});
    this.factionState = { ...base, ...(this.factionState || {}) };
    this.factionState.factions = this.factionState.factions?.length ? this.factionState.factions : base.factions;
    this.syncCompanyFaction?.();
  },

  syncCompanyFaction() {
    if (!this.factionState) return;
    const c = this.companyState?.companies?.[0] || this.currentCompany?.();
    if (!c) return;
    const item = this.factionState.factions.find((x) => x.id === 'company-main');
    if (!item) return;
    Object.assign(item, { name: c.name, type: c.type || item.type, location: c.location || item.location, domain: c.industry || item.domain, parentId: 'country-china', parentName: '中华人民共和国' });
  },

  openFactionApp() {
    this.initFactionSystem();
    this.identityAppOpen = false; this.wechatAppOpen = false;
    if (this.companyState) this.companyState.open = false;
    if (this.bossState) this.bossState.open = false;
    if (this.calendarState) this.calendarState.open = false;
    if (this.skillsState) this.skillsState.open = false;
    this.factionState.open = true;
    this.desktopUnlocked = true;
  },

  closeFactionApp() {
    if (this.factionState) this.factionState.open = false;
    this.closeAppToDesktop();
  },

  selectedFaction() {
    this.initFactionSystem();
    return this.factionState.factions.find((x) => x.id === this.factionState.selectedId) || this.factionState.factions[0];
  },

  selectFaction(id) {
    this.factionState.selectedId = id;
  },

  factionParentName(faction) {
    if (!faction?.parentId) return '无势力归属';
    return this.factionState.factions.find((x) => x.id === faction.parentId)?.name || faction.parentName || '未知势力';
  },

  factionChildren(id) {
    this.initFactionSystem();
    return this.factionState.factions.filter((x) => x.parentId === id);
  },
};
