window.GameModules = window.GameModules || {};

window.GameModules.factionActions = {
  initFactionSystem(options = {}) {
    if (this._initFactionSystemRunning) return this.factionState;
    const force = options?.force === true;
    const hasUsableState = Array.isArray(this.factionState?.factions);
    if (this._factionSystemInitialized && hasUsableState && !force) return this.factionState;
    this._initFactionSystemRunning = true;
    try {
      const base = window.GameModules.factionSystem.defaultState(this.playerProfile || {});
      this.factionState = { ...base, ...(this.factionState || {}) };
      this.factionState.factions = Array.isArray(this.factionState.factions) ? this.factionState.factions : [];
      this.factionState.factions = this.factionState.factions.map((faction) => {
        const normalized = window.GameModules.orgTerritory?.normalizeFaction?.(
          this.normalizeFactionStructure({ ...faction, fieldReasons: this.completeFactionReasons?.(faction, faction.fieldReasons) || faction.fieldReasons || {} }),
          this,
        ) || this.normalizeFactionStructure({ ...faction, fieldReasons: this.completeFactionReasons?.(faction, faction.fieldReasons) || faction.fieldReasons || {} });
        return normalized;
      });
      window.GameModules.factionOrgForest?.migrateFactionForest?.(this);
      this.syncAllCharacterMemberships?.();
      if (!this._orgTerritoryValidationRunning) window.GameModules.orgTerritory?.validateWorldConsistency?.(this);
      window.GameModules.app?.orgTerritory?.economyActions?.syncPlayerWealthAsset?.(this);
      // Only refresh fields on AI-created company-main if it already exists — never seed.
      this.syncCompanyFaction?.();
      this._factionSystemInitialized = true;
      return this.factionState;
    } finally {
      this._initFactionSystemRunning = false;
    }
  },

  syncCompanyFaction() {
    if (!this.factionState) return;
    const c = this.currentCompany?.() || this.companyState?.companies?.[0];
    if (!c) return;
    const item = this.factionState.factions.find((x) => x.id === 'company-main');
    if (!item) return;
    // Parent only from AI-created sovereign already in DB — never invent a country.
    const top = this.factionState.factions.find((x) => x.type === '国家' && !x.parentId) || null;
    const forest = window.GameModules.factionOrgForest;
    const corpRootId = top?.id ? forest?.domainRootId?.(top.id, 'corp') || '' : '';
    const corpRoot = corpRootId ? this.factionState.factions.find((x) => x.id === corpRootId) : null;
    const updates = {
      name: c.name,
      type: c.type || item.type,
      location: c.location || item.location,
      domain: c.industry || item.domain,
      orgDomain: 'corp',
      ownership: item.ownership || 'private',
      foundingType: item.foundingType || 'independent',
      // Only attach under an AI-created corp domain root — never invent parent ids.
      parentId: corpRoot ? corpRootId : (item.parentId || ''),
      parentName: corpRoot?.name || item.parentName || '无势力归属',
    };
    const changed = Object.keys(updates).filter((key) => updates[key] !== item[key]);
    Object.assign(item, updates);
    if (changed.length) item.changeLog = [{ field: changed.join('、'), reason: '根据当前公司系统上下文同步公司势力基础字段。', at: new Date().toISOString(), action: 'adjust' }, ...(item.changeLog || [])];
    item.fieldReasons = this.completeFactionReasons?.(item, item.fieldReasons, '根据当前公司系统上下文同步并固化。') || item.fieldReasons || {};
  },

  normalizeFactionStructure(faction = {}) {
    const ot = window.GameModules.orgTerritory;
    faction.structure = (faction.structure || []).map((node, index) => {
      const name = node.name === '角色卡人事归属' ? this.factionPositionNodeName(faction, node.roles?.[0]?.title) : node.name;
      const base = { ...node, name, roles: node.roles };
      return ot?.normalizeStructureNode?.(base, faction, index, this) || { ...base, roles: this.normalizeFactionRoles(node.roles) };
    });
    return faction;
  },

  factionPositionNodeName(faction = {}, title = '') {
    if ((faction.classification === 'country' || faction.orgDomain === 'country' || faction.sovereign) && String(title || '').includes('公民')) {
      return '国家法定身份';
    }
    return '已确认职位';
  },

  normalizeFactionRoles(roles = []) {
    const ot = window.GameModules.orgTerritory;
    if (ot?.normalizeRole) return (Array.isArray(roles) ? roles : []).map((role) => ot.normalizeRole(role, this));
    return (Array.isArray(roles) ? roles : []).map((role) => {
      if (typeof role === 'string') return { title: role, characters: ['未知'] };
      const title = String(role?.title || role?.name || role?.position || '未命名职位').trim();
      const chars = Array.isArray(role?.characters) ? role.characters : (role?.character ? [role.character] : []);
      return { title, characters: chars.map(String).filter(Boolean).length ? chars.map(String).filter(Boolean) : ['未知'] };
    });
  },

  syncRoleCardMemberships() {
    if (!this.factionState) return;
    // Only attach roles to factions that AI already created — never invent orgs from cards.
    this.collectRoleCardMemberships().forEach((item) => this.ensureFactionMembership(item, { createIfMissing: false }));
  },

  collectRoleCardMemberships() {
    const cards = [];
    try { cards.push(this.playerCharacter?.()); } catch (_) { /* skip */ }
    cards.push(this.selectedPlayerRoleCard?.(), ...(this.selectedInitialRoleCards?.() || []));
    const validCards = cards.filter(Boolean);
    const rows = [];
    const push = (entry, characterName = '未知') => {
      const orgName = String(entry?.orgName || entry?.name || '').split('/')[0].trim();
      const title = String(entry?.title || '').trim();
      if (orgName && title) rows.push({ orgName, title, characterName, reason: entry.reason || '由玩家或角色卡人事归属确认。' });
    };
    validCards.forEach((card) => (card.memberships || []).forEach((entry) => push(entry, card.name || card.id || '未知')));
    return rows;
  },

  factionIdByName(name = '') {
    const slug = String(name || 'faction').replace(/\s+/g, '-').slice(0, 28);
    return `force-${slug}`;
  },

  ensureFactionMembership(item = {}, _options = {}) {
    const name = String(item.orgName || '').trim();
    const title = String(item.title || '成员').trim();
    if (!name) return null;
    const now = new Date().toISOString();
    // Never invent factions from membership sync — AI / upsertFaction must create them first.
    const faction = this.factionState.factions.find((x) => x.name === name || x.id === this.factionIdByName(name));
    if (!faction) return null;
    this.addFactionRoleOccupant(faction, title, item.characterName || '未知', item.reason || '由角色卡人事归属确认。', now);
    return faction;
  },

  addFactionRoleOccupant(faction, title, character, reason, at = new Date().toISOString()) {
    faction.structure = faction.structure || [];
    const nodeName = this.factionPositionNodeName(faction, title);
    let node = faction.structure.find((x) => x.name === nodeName || x.name === '角色卡人事归属');
    if (!node) {
      node = { name: nodeName, roles: [] };
      faction.structure.push(node);
    }
    node.name = nodeName;
    node.roles = this.normalizeFactionRoles(node.roles);
    let role = node.roles.find((x) => x.title === title);
    let changed = false;
    if (!role) {
      role = { title, characters: [] };
      node.roles.push(role);
      changed = true;
    }
    const before = role.characters?.length || 0;
    role.characters = Array.from(new Set([...(role.characters || []), character || '未知'].filter(Boolean)));
    changed = changed || role.characters.length !== before;
    if (!changed) return;
    faction.updatedAt = at;
    faction.changeLog = [{ field: 'structure', reason, at, action: 'add-position' }, ...(faction.changeLog || [])].slice(0, 50);
    if (character && character !== '未知') {
      const charState = window.GameModules.orgTerritory?.findCharacterStateByName?.(this, character);
      if (charState) {
        window.GameModules.orgTerritory?.upsertCharacterMembership?.(charState, {
          orgId: faction.id,
          orgName: faction.name,
          title,
          department: nodeName,
          departmentFog: false,
          since: at,
          reason,
        }, this);
        this.rpgStates = { ...(this.rpgStates || {}), [charState.id]: charState };
        window.GameModules.characterStateStore?.save?.(charState);
      }
    }
  },

  openFactionApp() {
    this.initFactionSystem();
    this.identityAppOpen = false; this.wechatAppOpen = false; this.saveAppOpen = false; this.roleCardJsonAppOpen = false; this.worldlineAppOpen = false;
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
    if (!this.factionState?.factions?.length) this.initFactionSystem?.();
    const factions = Array.isArray(this.factionState?.factions) ? this.factionState.factions : [];
    if (!factions.length) return null;
    const index = factions.findIndex((x) => x.id === this.factionState?.selectedId);
    const rawIndex = index >= 0 ? index : 0;
    const raw = factions[rawIndex] || null;
    if (!raw) return null;
    const normalized = window.GameModules.orgTerritory?.normalizeFaction?.(raw, this) || raw;
    if (normalized !== raw || normalized.classification !== raw.classification || normalized.maturityLabel !== raw.maturityLabel) {
      this.factionState.factions.splice(rawIndex, 1, normalized);
    }
    return normalized;
  },

  selectFaction(id) {
    if (!this.factionState) this.initFactionSystem();
    this.factionState.selectedId = id;
    this.factionState.orgCacheSelectedId = '';
    this.factionState.detailOpen = true;
    if (this.factionState.orgChartOpen) this.refreshFactionOrgCache?.();
  },
  closeFactionDetail() {
    if (!this.factionState) return;
    this.factionState.detailOpen = false;
    this.factionState.orgChartOpen = false;
    this.factionState.selectedArchiveDocId = '';
  },

  openFactionOrgChart() {
    if (!this.factionState) this.initFactionSystem();
    this.refreshFactionOrgCache?.();
    this.factionState.orgChartOpen = true;
    document.querySelectorAll('.faction-org-backdrop[data-fallback-closed="true"], .faction-modal-backdrop[data-fallback-closed="true"]').forEach((backdrop) => {
      if (!backdrop.querySelector('.faction-org-modal')) return;
      backdrop.style.removeProperty('display');
      backdrop.removeAttribute('data-fallback-closed');
    });
  },

  closeFactionOrgChart() {
    if (this.factionState) this.factionState.orgChartOpen = false;
  },

  backFactionOrgChart() {
    if (!this.factionState) return;
    this.closeFactionOrgChart();
  },

  factionRoleText(roles = []) { return window.GameModules.ui.faction.overviewViewHelpers.roleText.call(this, roles); },

  factionOrgNodes() { return window.GameModules.ui.faction.overviewViewHelpers.orgNodes.call(this); },

  factionParentName(faction) { return window.GameModules.ui.faction.overviewViewHelpers.parentName.call(this, faction); },

  selectedFactionAffiliatedLabel() { return window.GameModules.ui.faction.overviewViewHelpers.affiliatedLabel.call(this); },
  selectedFactionDetailDescription() { return window.GameModules.ui.faction.overviewViewHelpers.detailDescription.call(this); },
  factionOrgChartTitle() { return window.GameModules.ui.faction.overviewViewHelpers.orgChartTitle.call(this); },
  factionOrgChartDescription() { return window.GameModules.ui.faction.overviewViewHelpers.orgChartDescription.call(this); },
  factionOrgChartBreadcrumbText() { return window.GameModules.ui.faction.overviewViewHelpers.orgChartBreadcrumb.call(this); },
  factionOrgChartEmptyText() { return window.GameModules.ui.faction.overviewViewHelpers.orgChartEmptyText.call(this); },
  factionOrgChartBackButtonText() { return window.GameModules.ui.faction.overviewViewHelpers.orgChartBackButtonText.call(this); },
  factionOrgChartCloseDetailButtonText() { return window.GameModules.ui.faction.overviewViewHelpers.orgChartCloseDetailButtonText.call(this); },
  factionListRow(faction) { return window.GameModules.ui.faction.overviewViewHelpers.listRow.call(this, faction); },
  selectedFactionTagList() { return window.GameModules.ui.faction.overviewViewHelpers.tagList.call(this); },
  factionStructureRoleRows(node) { return window.GameModules.ui.faction.overviewViewHelpers.structureRoleRows.call(this, node); },
  factionStructureEmptyText() { return window.GameModules.ui.faction.overviewViewHelpers.structureEmptyText.call(this); },
  selectedFactionChangeLogRows() { return window.GameModules.ui.faction.overviewViewHelpers.changeLogRows.call(this); },
  selectedFactionChangeLogEmptyText() { return window.GameModules.ui.faction.overviewViewHelpers.changeLogEmptyText.call(this); },
  selectedFactionArchiveCountLabel() { return window.GameModules.ui.faction.overviewViewHelpers.archiveCountLabel.call(this); },
  selectedFactionArchiveParagraphRows() { return window.GameModules.ui.faction.overviewViewHelpers.archiveParagraphRows.call(this); },
  selectedFactionArchiveListRows() { return window.GameModules.ui.faction.overviewViewHelpers.archiveListRows.call(this); },
  selectedFactionArchiveEmptyText() { return window.GameModules.ui.faction.overviewViewHelpers.archiveEmptyText.call(this); },
  selectedFactionArchiveSectionView() { return window.GameModules.ui.faction.overviewViewHelpers.archiveSectionView.call(this); },
  factionChildren(id) {
    if (!id || !this.factionState?.factions) return [];
    return this.factionState.factions.filter((x) => x.parentId === id);
  },

  orgTerritoryConsistencyNotice() { return window.GameModules.ui.faction.overviewViewHelpers.consistencyNotice.call(this); },

  dismissOrgTerritoryConsistencyNotice() {
    if (this.orgTerritoryConsistency) this.orgTerritoryConsistency.dismissed = true;
  },

  hasOrgTerritoryReconciliationLog() {
    return (Array.isArray(this.orgTerritoryReconciliationLog) ? this.orgTerritoryReconciliationLog : []).length > 0;
  },

  orgTerritoryReconciliationEntries() {
    return (Array.isArray(this.orgTerritoryReconciliationLog) ? this.orgTerritoryReconciliationLog : []).slice().reverse().slice(0, 15);
  },

  orgTerritoryReconciliationText(entry = {}) { return window.GameModules.ui.faction.overviewViewHelpers.reconciliationText.call(this, entry); },

  toggleFactionReconciliationLog() {
    if (!this.factionState) return;
    this.factionState.reconciliationOpen = !this.factionState.reconciliationOpen;
  },

  selectedFactionStubNotice() { return window.GameModules.ui.faction.overviewViewHelpers.stubNotice.call(this); },
  selectedFactionStructureSectionView() { return window.GameModules.ui.faction.overviewViewHelpers.structureSectionView.call(this); },
  selectedFactionOverviewView() { return window.GameModules.ui.faction.overviewViewHelpers.selectedFactionOverviewView.call(this); },
  visibleFactions() {
    if (this.factionState?.showAllStubs) return this.factionState?.factions || [];
    return (this.factionState?.factions || []).filter((f) => (window.GameModules.orgTerritory?.factionExposureScore?.(f, this) || 0) > 0);
  },

  toggleFactionStubIndex() {
    if (!this.factionState) return;
    this.factionState.showAllStubs = !this.factionState.showAllStubs;
  },
};
