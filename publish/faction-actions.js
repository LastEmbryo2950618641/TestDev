window.GameModules = window.GameModules || {};

window.GameModules.factionActions = {
  initFactionSystem() {
    const base = window.GameModules.factionSystem.defaultState(this.playerProfile || {});
    this.factionState = { ...base, ...(this.factionState || {}) };
    this.factionState.factions = this.factionState.factions?.length ? this.factionState.factions : base.factions;
    this.factionState.factions = this.factionState.factions.map((faction) => {
      const normalized = window.GameModules.orgTerritory?.normalizeFaction?.(
        this.normalizeFactionStructure({ ...faction, fieldReasons: this.completeFactionReasons?.(faction, faction.fieldReasons) || faction.fieldReasons || {} }),
        this,
      ) || this.normalizeFactionStructure({ ...faction, fieldReasons: this.completeFactionReasons?.(faction, faction.fieldReasons) || faction.fieldReasons || {} });
      return normalized;
    });
    window.GameModules.factionOrgForest?.migrateFactionForest?.(this);
    this.syncAllCharacterMemberships?.();
    window.GameModules.orgTerritory?.validateWorldConsistency?.(this);
    window.GameModules.orgTerritoryActions?.syncPlayerWealthAsset?.(this);
    const top = base.factions[0];
    if (top && !this.factionState.factions.some((faction) => faction.id === top.id || faction.name === top.name)) this.factionState.factions.unshift(top);
    if (top) this.factionState.factions.sort((a, b) => (a.id === top.id ? -1 : b.id === top.id ? 1 : 0));
    this.syncCompanyFaction?.();
    this.ensureAllCompanyFactions?.();
    this.syncRoleCardFactionPositions?.();
  },

  syncCompanyFaction() {
    if (!this.factionState) return;
    const c = this.currentCompany?.() || this.companyState?.companies?.[0];
    if (!c) return;
    const item = this.factionState.factions.find((x) => x.id === 'company-main');
    if (!item) return;
    const expectedTop = window.GameModules.factionSystem.countryFaction(this.playerProfile || {});
    const top = this.factionState.factions.find((x) => x.id === expectedTop.id || x.name === expectedTop.name) || this.factionState.factions.find((x) => x.type === '国家' && !x.parentId) || expectedTop;
    const forest = window.GameModules.factionOrgForest;
    const corpRootId = forest?.domainRootId?.(top.id, 'corp') || top.id;
    const corpRoot = this.factionState.factions.find((x) => x.id === corpRootId);
    const updates = {
      name: c.name,
      type: c.type || item.type,
      location: c.location || item.location,
      domain: c.industry || item.domain,
      orgDomain: 'corp',
      ownership: item.ownership || 'private',
      foundingType: item.foundingType || 'independent',
      parentId: corpRootId,
      parentName: corpRoot?.name || forest?.DOMAIN_LABELS?.corp || '经济组织',
    };
    const changed = Object.keys(updates).filter((key) => updates[key] !== item[key]);
    Object.assign(item, updates);
    if (changed.length) item.changeLog = [{ field: changed.join('、'), reason: '根据当前公司系统上下文同步公司势力基础字段。', at: new Date().toISOString(), action: 'adjust' }, ...(item.changeLog || [])];
    item.fieldReasons = this.completeFactionReasons?.(item, item.fieldReasons, '根据当前公司系统上下文同步并固化。') || item.fieldReasons || {};
  },

  normalizeFactionStructure(faction = {}) {
    const ot = window.GameModules.orgTerritory;
    faction.structure = (faction.structure || []).map((node, index) => {
      const name = node.name === '角色卡势力地位' ? this.factionPositionNodeName(faction, node.roles?.[0]?.title) : node.name;
      const base = { ...node, name, roles: node.roles };
      return ot?.normalizeStructureNode?.(base, faction, index, this) || { ...base, roles: this.normalizeFactionRoles(node.roles) };
    });
    return faction;
  },

  factionPositionNodeName(faction = {}, title = '') {
    if (faction.name === '中华人民共和国' && String(title || '').includes('公民')) return '国家法定身份';
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

  syncRoleCardFactionPositions() {
    if (!this.factionState) return;
    this.collectRoleCardForcePositions().forEach((item) => this.ensureFactionPosition(item));
  },

  collectRoleCardForcePositions() {
    const cards = [];
    try { cards.push(this.playerCharacter?.()); } catch (_) { /* 玩家角色卡未生成时跳过 */ }
    cards.push(this.selectedPlayerRoleCard?.(), ...(this.selectedRelationRoleCards?.() || []));
    const validCards = cards.filter(Boolean);
    const rows = [];
    const blockedForce = /^(现实社会|现代社会|现实世界|社会|国家|中华人民共和国)$/;
    const blockedPosition = /^(公民|居民|成年人|成年学生|成员)$/;
    const push = (entry, characterName = '未知') => {
      const force = String(entry?.force || entry?.faction || entry?.name || '').split('/')[0].trim();
      const position = String(entry?.position || entry?.role || entry?.rank || '').trim();
      if (force && position && !blockedForce.test(force) && !blockedPosition.test(position)) rows.push({ force, position, characterName, reason: entry.reason || '由玩家或角色卡势力地位确认。' });
    };
    validCards.forEach((card) => (card.force_positions || card.forcePositions || []).forEach((entry) => push(entry, card.name || card.id || '未知')));
    return rows;
  },

  factionIdByName(name = '') {
    const slug = String(name || 'faction').replace(/\s+/g, '-').slice(0, 28);
    return `force-${slug}`;
  },

  ensureFactionPosition(item = {}) {
    const name = String(item.force || '').trim();
    const position = String(item.position || '成员').trim();
    if (!name) return null;
    const now = new Date().toISOString();
    let faction = this.factionState.factions.find((x) => x.name === name || x.id === this.factionIdByName(name));
    if (!faction) {
      const top = this.factionState.factions.find((x) => x.type === '国家' && !x.parentId) || window.GameModules.factionSystem.countryFaction(this.playerProfile || {});
      const isTopCountry = name === top.name;
      faction = this.normalizeFactionStructure({ id: isTopCountry ? top.id : this.factionIdByName(name), name, type: isTopCountry ? '国家' : '组织', parentId: isTopCountry ? '' : top.id, parentName: isTopCountry ? '无势力归属' : top.name, level: isTopCountry ? '国家级' : '组织级', location: this.playerProfile?.refinedCity || this.playerProfile?.city || '未知', domain: '现实组织关系', scale: '未知', stance: '与角色卡势力地位相关', influence: 30, description: `由角色卡势力地位确认的现实势力：${name}。`, structure: [], rules: [], resources: [], relations: [], fixed: true, updatedAt: now });
      faction.fieldReasons = this.completeFactionReasons?.(faction, {}, '角色卡势力地位只可新增不可移除，系统据此初始化势力。') || {};
      faction.changeLog = [{ field: 'all', reason: item.reason || '角色卡已有势力地位，追加进入势力系统。', at: now, action: 'add' }];
      this.factionState.factions.push(faction);
    }
    this.addFactionRoleOccupant(faction, position, item.characterName || '未知', item.reason || '由角色卡势力地位确认。', now);
    return faction;
  },

  addFactionRoleOccupant(faction, title, character, reason, at = new Date().toISOString()) {
    faction.structure = faction.structure || [];
    const nodeName = this.factionPositionNodeName(faction, title);
    let node = faction.structure.find((x) => x.name === nodeName || x.name === '角色卡势力地位');
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
        window.GameModules.sqliteSave?.saveCharacterState?.(charState);
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
    if (!this.factionState) this.initFactionSystem();
    return this.factionState.factions.find((x) => x.id === this.factionState.selectedId) || this.factionState.factions[0];
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
    if (!this.factionState.orgChartMode) this.factionState.orgChartMode = 'forest';
    if (!this.factionState.forestTab) this.factionState.forestTab = 'corp';
    this.refreshFactionOrgCache?.();
    this.factionState.orgChartOpen = true;
  },

  closeFactionOrgChart() {
    if (this.factionState) this.factionState.orgChartOpen = false;
  },

  factionRoleText(roles = []) {
    return this.normalizeFactionRoles(roles).map((role) => `${role.title}：${(role.characters || ['未知']).join('、')}`).join('；') || '职位未记录';
  },

  factionOrgNodes() {
    const faction = this.selectedFaction();
    const nodes = (faction?.structure || []).map((node, index) => ({
      key: `s-${index}-${node.name}`,
      name: node.name,
      roles: this.factionRoleText(node.roles),
      children: this.normalizeFactionRoles(node.roles).map((role, roleIndex) => ({ key: `r-${index}-${roleIndex}-${role.title}`, name: role.title, roles: `角色：${(role.characters || ['未知']).join('、')}` })),
    }));
    const children = this.factionChildren(faction?.id).map((child) => ({ key: `c-${child.id}`, name: child.name, roles: `${child.type}｜${child.level}`, children: [] }));
    return [...nodes, ...children];
  },

  factionParentName(faction) {
    const forest = window.GameModules.factionOrgForest;
    const affiliated = forest?.resolveAffiliatedFaction?.(faction, this.factionState?.factions || []);
    if (forest) {
      if (affiliated?.name) return affiliated.name;
      if (!faction?.parentId) return '无势力归属';
      if (faction?.foundingType === 'independent') return '独立组织';
      return '无势力归属';
    }
    if (!faction?.parentId) return '无势力归属';
    return this.factionState.factions.find((x) => x.id === faction.parentId)?.name || faction.parentName || '未知势力';
  },

  selectedFactionAffiliatedLabel() {
    const faction = this.selectedFaction?.();
    if (!faction) return '';
    return window.GameModules.factionOrgForest?.affiliatedFactionLabel?.(faction, this.factionState?.factions || []) || '';
  },
  factionChildren(id) {
    if (!id || !this.factionState?.factions) return [];
    return this.factionState.factions.filter((x) => x.parentId === id);
  },

  orgTerritoryConsistencyNotice() {
    const report = this.orgTerritoryConsistency;
    if (!report || report.dismissed) return '';
    const lines = [];
    const failed = Object.entries(report.compliance?.checks || {}).filter(([, ok]) => ok === false).map(([key]) => key);
    if (failed.length) lines.push(`原则合规未通过：${failed.join('、')}`);
    lines.push(...(report.fixes || []), ...(report.warnings || []));
    if (!lines.length) return '';
    const preview = lines.slice(0, 4).join('；');
    return lines.length > 4 ? `存档一致性：${preview}…（共 ${lines.length} 条）` : `存档一致性：${preview}`;
  },

  dismissOrgTerritoryConsistencyNotice() {
    if (this.orgTerritoryConsistency) this.orgTerritoryConsistency.dismissed = true;
  },

  hasOrgTerritoryReconciliationLog() {
    return (Array.isArray(this.orgTerritoryReconciliationLog) ? this.orgTerritoryReconciliationLog : []).length > 0;
  },

  orgTerritoryReconciliationEntries() {
    return (Array.isArray(this.orgTerritoryReconciliationLog) ? this.orgTerritoryReconciliationLog : []).slice().reverse().slice(0, 15);
  },

  orgTerritoryReconciliationText(entry = {}) {
    const kind = String(entry?.kind || '').trim();
    const at = String(entry?.at || '').slice(0, 19).replace('T', ' ');
    if (kind === 'territory-control-dedupe') {
      return `${at} 控势去重 · ${entry.location || '—'} · 保留 ${entry.keptSummary || '—'}，丢弃 ${entry.droppedSummary || '—'}`;
    }
    if (kind === 'story-world-skip') {
      return `${at} 异世界跳过 · ${entry.count || 0} 条（${entry.types || ''}）`;
    }
    if (kind === 'settlement-truncated') {
      return `${at} 结算截断 · 保留 ${entry.kept || 0} 丢弃 ${entry.dropped || 0}`;
    }
    return `${at} ${kind || '记录'}`;
  },

  toggleFactionReconciliationLog() {
    if (!this.factionState) return;
    this.factionState.reconciliationOpen = !this.factionState.reconciliationOpen;
  },

  visibleFactions() {
    if (this.factionState?.showAllStubs) return this.factionState?.factions || [];
    return (this.factionState?.factions || []).filter((f) => (window.GameModules.orgTerritory?.factionExposureScore?.(f, this) || 0) > 0);
  },

  toggleFactionStubIndex() {
    if (!this.factionState) return;
    this.factionState.showAllStubs = !this.factionState.showAllStubs;
  },

  selectedFactionStubNotice() {
    const faction = this.selectedFaction();
    if (!faction) return '';
    const resolution = String(faction.resolution || 'L1').toUpperCase();
    if (resolution === 'L1' && !(faction.structure || []).length) return '尚未接触，无法审计结构；仅显示 stub。';
    return '';
  },
};
