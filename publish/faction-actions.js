window.GameModules = window.GameModules || {};

window.GameModules.factionActions = {
  initFactionSystem() {
    const base = window.GameModules.factionSystem.defaultState(this.playerProfile || {});
    this.factionState = { ...base, ...(this.factionState || {}) };
    this.factionState.factions = this.factionState.factions?.length ? this.factionState.factions : base.factions;
    this.factionState.factions = this.factionState.factions.map((faction) => ({ ...faction, fieldReasons: this.completeFactionReasons?.(faction, faction.fieldReasons) || faction.fieldReasons || {} }));
    this.syncCompanyFaction?.();
  },

  syncCompanyFaction() {
    if (!this.factionState) return;
    const c = this.companyState?.companies?.[0] || this.currentCompany?.();
    if (!c) return;
    const item = this.factionState.factions.find((x) => x.id === 'company-main');
    if (!item) return;
    const updates = { name: c.name, type: c.type || item.type, location: c.location || item.location, domain: c.industry || item.domain, parentId: 'country-china', parentName: '中华人民共和国' };
    Object.assign(item, updates);
    item.fieldReasons = this.completeFactionReasons?.(item, item.fieldReasons, '根据当前公司系统上下文同步并固化。') || item.fieldReasons || {};
  },

  openFactionApp() {
    this.initFactionSystem();
    this.identityAppOpen = false; this.wechatAppOpen = false; this.saveAppOpen = false;
    if (this.companyState) this.companyState.open = false;
    if (this.bossState) this.bossState.open = false;
    if (this.calendarState) this.calendarState.open = false;
    if (this.skillsState) this.skillsState.open = false;
    if (this.knownProfessionState) this.knownProfessionState.open = false;
    if (this.promptState) this.promptState.open = false;
    if (this.tokenStatsState) this.tokenStatsState.open = false;
    this.factionState.open = true;
    this.desktopUnlocked = true;
  },

  closeFactionApp() {
    if (this.factionState) {
      this.factionState.open = false;
      this.factionState.detailOpen = false;
      this.factionState.orgChartOpen = false;
    }
    this.closeAppToDesktop();
  },

  selectedFaction() {
    if (!this.factionState) this.initFactionSystem();
    return this.factionState.factions.find((x) => x.id === this.factionState.selectedId) || this.factionState.factions[0];
  },

  selectFaction(id) {
    if (!this.factionState) this.initFactionSystem();
    this.factionState.selectedId = id;
    this.factionState.detailOpen = true;
  },

  closeFactionDetail() {
    if (!this.factionState) return;
    this.factionState.detailOpen = false;
    this.factionState.orgChartOpen = false;
  },

  openFactionOrgChart() {
    if (!this.factionState) this.initFactionSystem();
    this.factionState.orgChartOpen = true;
  },

  closeFactionOrgChart() {
    if (this.factionState) this.factionState.orgChartOpen = false;
  },

  factionOrgNodes() {
    const faction = this.selectedFaction();
    const nodes = (faction?.structure || []).map((node, index) => ({ key: `s-${index}-${node.name}`, name: node.name, roles: (node.roles || []).join('、') || '职责未记录' }));
    const children = this.factionChildren(faction?.id).map((child) => ({ key: `c-${child.id}`, name: child.name, roles: `${child.type}｜${child.level}` }));
    return [...nodes, ...children];
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
