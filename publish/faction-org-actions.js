/**
 * 势力组织图 · 森林 UI 构建
 * 设计依据：docs/schemas/faction-org-forest-design.md v1.3.3
 */
window.GameModules = window.GameModules || {};

const _factionOrgActionsBase = {
  normalizeFactionStructure(faction = {}) {
    const ot = window.GameModules.orgTerritory;
    const forest = window.GameModules.factionOrgForest;
    faction.structure = (faction.structure || []).map((node, index) => {
      const legacy = ['角色卡势力地位', '已确认职位', '国家法定身份'].includes(node.name);
      const name = legacy ? this.factionPositionNodeName(faction) : (node.organizationName || node.orgName || node.name || faction.name);
      const level = node.level || node.rank || this.factionNodeLevel(faction, node.name);
      const base = { ...node, name, level, roles: node.roles };
      return ot?.normalizeStructureNode?.({ ...base, level }, faction, index, this) || { ...base, roles: this.normalizeFactionRoles(node.roles) };
    });
    if (forest?.stripDuplicateStructureRoot) forest.stripDuplicateStructureRoot(faction);
    return faction;
  },

  factionNodeLevel(faction = {}, nodeName = '') {
    if (nodeName === '国家法定身份') return '国家法定身份';
    if (String(nodeName).includes('中央')) return '中央级别';
    if (String(nodeName).includes('地方')) return '地方级别';
    return faction.level || '组织级别';
  },

  factionPositionNodeName(faction = {}) {
    return faction.name || '未命名组织';
  },

  normalizeFactionRoles(roles = []) {
    const ot = window.GameModules.orgTerritory;
    if (ot?.normalizeRole) {
      return (Array.isArray(roles) ? roles : []).map((role) => ot.normalizeRole(role, this));
    }
    return (Array.isArray(roles) ? roles : []).map((role) => {
      if (typeof role === 'string') return this.decorateFactionRole({ title: role, count: '未知', characters: ['未知'] });
      const title = String(role?.title || role?.name || role?.position || '未命名职位').trim();
      const chars = Array.isArray(role?.characters) ? role.characters : (role?.character ? [role.character] : []);
      const characters = chars.map(String).filter(Boolean).length ? chars.map(String).filter(Boolean) : ['未知'];
      const count = role?.count ?? role?.quantity ?? role?.number ?? (characters.includes('未知') ? '未知' : characters.length);
      return this.decorateFactionRole({ ...role, title, count, characters });
    });
  },

  decorateFactionRole(role = {}) {
    const characters = Array.isArray(role.characters) && role.characters.length ? role.characters : ['未知'];
    return { ...role, characters, preview: this.factionRolePreviewText(characters), overflow: characters.length > 4 };
  },

  factionRolePreviewText(characters = []) {
    return characters.slice(0, 4).join('、') + (characters.length > 4 ? '……' : '');
  },

  factionRoleText(roles = []) {
    return this.normalizeFactionRoles(roles).map((role) => `${role.title}｜数量:${role.count}｜角色:${role.preview}`).join('；') || '职位未记录';
  },

  forestDomainTabs() {
    return window.GameModules.factionOrgForest?.DOMAIN_KEYS?.map((key) => ({
      key,
      label: window.GameModules.factionOrgForest.DOMAIN_LABELS[key] || key,
    })) || [];
  },

  factionOrgChartMode() {
    return this.factionState?.orgChartMode || 'forest';
  },

  setFactionOrgChartMode(mode = 'forest') {
    if (!this.factionState) return;
    this.factionState.orgChartMode = mode === 'detail' ? 'detail' : 'forest';
    this.factionState.orgCacheSelectedId = '';
    this.refreshFactionOrgCache?.();
  },

  setFactionForestTab(domain = 'corp') {
    if (!this.factionState) return;
    this.factionState.forestTab = domain;
    this.refreshFactionOrgCache?.();
  },

  factionForestTab() {
    return this.factionState?.forestTab || 'corp';
  },

  refreshFactionOrgCache() {
    if (!this.factionState) return;
    const faction = this.selectedFaction();
    this.factionState.orgCacheSelectedId = faction?.id || '';
    this.factionState.structureCards = this.buildFactionStructureCards(faction);
    const mode = this.factionOrgChartMode();
    if (mode === 'forest') {
      const forestData = this.buildFactionOrgForest();
      this.factionState.forestData = forestData;
      this.factionState.orgTree = forestData?.activeTree || null;
      this.factionState.orgNodes = this.flattenFactionOrgTree(this.factionState.orgTree, 0, []);
    } else {
      this.factionState.orgTree = this.buildFactionOrgTree(faction);
      this.factionState.orgNodes = this.factionState.orgTree?.children || [];
    }
    this.factionState.capabilityCards = this.buildFactionCapabilityCards(faction);
  },

  buildFactionOrgForest() {
    const forest = window.GameModules.factionOrgForest;
    if (!forest) return { viewportRoot: null, domains: [], activeTree: null };
    const factions = this.factionState?.factions || [];
    const viewportRoot = forest.resolveViewportRoot(factions);
    if (!viewportRoot) return { viewportRoot: null, domains: [], activeTree: null };

    const visible = forest.filterForestByExposure(factions, this);
    const domains = forest.DOMAIN_KEYS.map((domainKey) => {
      const rootId = forest.domainRootId(viewportRoot.id, domainKey);
      const domainRoot = visible.find((f) => f.id === rootId) || factions.find((f) => f.id === rootId);
      const label = domainRoot?.name || forest.DOMAIN_LABELS[domainKey];
      const tree = this.buildForestDomainTree(domainKey, rootId, visible, viewportRoot);
      return { domain: domainKey, label, rootId, tree };
    });

    const activeTab = this.factionForestTab();
    const active = domains.find((d) => d.domain === activeTab) || domains.find((d) => d.domain === 'corp') || domains[0];
    return {
      viewportRoot,
      domains,
      activeTree: active?.tree || null,
      breadcrumb: [viewportRoot.name, active?.label].filter(Boolean).join(' / '),
    };
  },

  buildForestDomainTree(domainKey, rootId, factions = [], viewportRoot = {}) {
    const forest = window.GameModules.factionOrgForest;
    const rootFaction = factions.find((f) => f.id === rootId);
    const buildNode = (item, kind = 'faction') => {
      const resolution = String(item.resolution || 'L1').toUpperCase();
      const isFog = resolution === 'L1' && !(item.structure || []).length;
      const children = this.sortFactionHierarchy(
        factions.filter((f) => f.parentId === item.id && !f.isDomainRoot && forest.inferOrgDomain(f) === domainKey),
      ).map((child) => buildNode(child, 'faction'));
      return {
        key: `forest-${item.id}`,
        name: isFog && item.fogLabel ? item.fogLabel : item.name,
        kind: item.isDomainRoot ? 'domain-root' : (isFog ? 'fog' : kind),
        meta: [item.level, item.type, item.resolutionBadge || ''].filter(Boolean).join(' · '),
        factionId: item.id,
        orgDomain: domainKey,
        children,
      };
    };

    if (!rootFaction) {
      return {
        key: `forest-${rootId}`,
        name: forest.DOMAIN_LABELS[domainKey],
        kind: 'domain-root',
        meta: '域根',
        factionId: rootId,
        children: [],
      };
    }
    return buildNode(rootFaction, 'domain-root');
  },

  buildFactionStructureCards(faction = this.selectedFaction()) {
    const ot = window.GameModules.orgTerritory;
    return (faction?.structure || []).map((node, index) => ({
      key: `node-${index}-${node.name}`,
      name: node.name,
      level: node.level || this.factionNodeLevel(faction, node.name),
      stateBadge: node.stateBadge || ot?.stateBadge?.(node.state) || '',
      parentLabel: node.parentLabel || ot?.nodeParentLabel?.(node) || '',
      roles: this.normalizeFactionRoles(node.roles),
    }));
  },

  factionStructureCards() {
    const faction = this.selectedFaction();
    if (this.factionState?.orgCacheSelectedId === faction?.id && this.factionState?.structureCards) return this.factionState.structureCards;
    return this.buildFactionStructureCards(faction);
  },

  factionRoleDisplayTitle(role = {}) {
    return role.displayTitle || role.title || '职位：迷雾';
  },

  factionRoleDisplayDuty(role = {}) {
    return role.displayDuty || '职责：迷雾';
  },

  factionRoleDisplayOccupants(role = {}) {
    return role.displayOccupants || `任职：${role.preview || '未知'}`;
  },

  factionRoleStateBadge(role = {}) {
    return role.stateBadge || window.GameModules.orgTerritory?.stateBadge?.(role.state) || '';
  },

  selectedFactionResolutionBadge() {
    const faction = this.selectedFaction();
    return faction?.resolutionBadge || window.GameModules.orgTerritory?.resolutionBadge?.(faction?.resolution) || '';
  },

  selectedFactionStatusLabel() {
    const faction = this.selectedFaction();
    return window.GameModules.orgTerritory?.orgStatusLabel?.(faction) || '';
  },

  selectedFactionAffiliatedLabel() {
    const faction = this.selectedFaction();
    if (!faction) return '';
    return window.GameModules.factionOrgForest?.affiliatedFactionLabel?.(faction, this.factionState?.factions || []) || '';
  },

  factionRolePreview(role = {}) {
    return role.preview || this.factionRolePreviewText(Array.isArray(role.characters) && role.characters.length ? role.characters : ['未知']);
  },

  factionRoleOverflow(role = {}) {
    return Boolean(role.overflow ?? ((Array.isArray(role.characters) ? role.characters : []).length > 4));
  },

  openFactionRoleDialog(role = {}) {
    const normalized = this.normalizeFactionRoles([role])[0] || { title: '未命名职位', count: '未知', characters: ['未知'] };
    this.factionState.roleDialogOpen = true;
    this.factionState.roleDialog = normalized;
  },

  closeFactionRoleDialog() {
    if (!this.factionState) return;
    this.factionState.roleDialogOpen = false;
    this.factionState.roleDialog = null;
  },

  factionLevelRank(level = '') {
    const map = { 国家级: 0, 国家法定身份: 0, 中央级别: 1, 省级: 2, 省市级: 2, 市级: 3, 公司级: 4, 组织级: 5, 部门级: 6, 家庭级: 7, 域级: 1 };
    const clean = String(level || '').trim();
    return Object.prototype.hasOwnProperty.call(map, clean) ? map[clean] : 50;
  },

  sortFactionHierarchy(list = []) {
    return [...(Array.isArray(list) ? list : [])].sort((a, b) => {
      const rank = this.factionLevelRank(a.level) - this.factionLevelRank(b.level);
      if (rank !== 0) return rank;
      if (a.id === 'company-main') return -1;
      if (b.id === 'company-main') return 1;
      return String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN');
    });
  },

  buildStructureBranchNodes(faction = {}) {
    return this.buildFactionStructureCards(faction).map((node) => ({
      key: node.key,
      name: node.name,
      kind: 'structure',
      meta: node.level,
      children: node.roles.map((role, roleIndex) => ({
        key: `${node.key}-role-${roleIndex}`,
        name: this.factionRoleDisplayTitle(role),
        kind: 'role',
        meta: `${this.factionRoleDisplayDuty(role)} · ${this.factionRoleDisplayOccupants(role)}`,
        role,
        children: [],
      })),
    }));
  },

  buildFactionOrgTree(faction = this.selectedFaction()) {
    if (!faction?.id) return null;
    const forest = window.GameModules.factionOrgForest;
    const factions = this.factionState?.factions || [];
    const corpPath = [];
    let cursor = faction;
    const seen = new Set();
    while (cursor && !seen.has(cursor.id)) {
      seen.add(cursor.id);
      if (cursor.orgDomain === 'corp' || ['公司', '工作室', '企业'].includes(cursor.type)) {
        corpPath.unshift(cursor.name);
      }
      cursor = factions.find((f) => f.id === cursor.parentId);
      if (cursor?.isDomainRoot) break;
    }
    this.factionState.orgBreadcrumb = corpPath.length ? corpPath.join(' / ') : faction.name;

    const buildFactionNode = (item, isRoot = false) => {
      if (isRoot) {
        return {
          key: `faction-${item.id}`,
          name: item.name,
          kind: 'root',
          meta: [item.level, item.type].filter(Boolean).join(' · ') || '势力',
          factionId: item.id,
          children: this.buildStructureBranchNodes(item),
        };
      }
      const subFactions = this.sortFactionHierarchy(this.factionChildren(item.id)).map((child) => buildFactionNode(child, false));
      const structureNodes = this.buildStructureBranchNodes(item);
      return {
        key: `faction-${item.id}`,
        name: item.name,
        kind: 'faction',
        meta: [item.level, item.type].filter(Boolean).join(' · ') || '势力',
        factionId: item.id,
        children: [...subFactions, ...structureNodes],
      };
    };
    return buildFactionNode(faction, true);
  },

  flattenFactionOrgTree(node, depth = 0, list = []) {
    if (!node) return list;
    list.push({ ...node, depth, displayName: node.name });
    (node.children || []).forEach((child) => {
      this.flattenFactionOrgTree(child, depth + 1, list);
    });
    return list;
  },

  factionOrgTreeRoot() {
    const faction = this.selectedFaction();
    if (this.factionState?.orgCacheSelectedId === faction?.id && this.factionState?.orgTree) {
      return this.factionState.orgTree;
    }
    if (this.factionOrgChartMode() === 'forest') {
      return this.buildFactionOrgForest()?.activeTree || null;
    }
    return this.buildFactionOrgTree(faction);
  },

  factionOrgTreeRows() {
    return this.flattenFactionOrgTree(this.factionOrgTreeRoot(), 0, []);
  },

  buildFactionOrgNodes(faction = this.selectedFaction(), cards = this.buildFactionStructureCards(faction)) {
    if (this.factionOrgChartMode() === 'forest') {
      return this.flattenFactionOrgTree(this.factionOrgTreeRoot(), 0, []);
    }
    return this.buildFactionOrgTree(faction)?.children || this.buildStructureBranchNodes(faction);
  },

  factionOrgNodes() {
    const faction = this.selectedFaction();
    if (this.factionState?.orgCacheSelectedId === faction?.id && this.factionState?.orgNodes) return this.factionState.orgNodes;
    if (this.factionOrgChartMode() === 'forest') {
      return this.flattenFactionOrgTree(this.factionOrgTreeRoot(), 0, []);
    }
    return this.buildFactionOrgTree(faction)?.children || [];
  },

  factionForestDomains() {
    return this.factionState?.forestData?.domains || this.buildFactionOrgForest()?.domains || [];
  },

  factionForestViewportTitle() {
    return this.factionState?.forestData?.viewportRoot?.name || window.GameModules.factionOrgForest?.resolveViewportRoot(this.factionState?.factions || [])?.name || '';
  },

  factionOverviewModeMeta(faction = this.selectedFaction()) {
    const maturityClass = String(faction?.maturityClass || '').trim() || 'community';
    const ideologyCore = String(faction?.solid?.overviewPanels?.ideology?.core?.value || '').trim();
    const gestalt = String(faction?.type || '').includes('格式塔意识') || ideologyCore === '格式塔意识';
    if (gestalt) {
      return {
        eyebrow: 'GESTALT PROFILE',
        labels: { ideology: '格式塔意识', economy: '资源', politics: '统一个体', military: '军事', diplomacy: '外交' },
        ideologyLabels: { core: '核心', reason: '形成原因', description: '当前说明', base: '意识基底', legitimacy: '统一度' },
        empty: { ideology: '尚未记录统一意识说明', economy: '尚未记录资源事实', politics: '尚未记录统一个体事实', military: '尚未记录军事事实', diplomacy: '尚未记录外交事实' },
        hideMilitaryWhenEmpty: false,
      };
    }
    if (maturityClass === 'community') {
      return {
        eyebrow: 'COMMUNITY PROFILE',
        labels: { ideology: '凝聚原因', economy: '可用资源', politics: '管理', military: '军事', diplomacy: '联谊' },
        ideologyLabels: { core: '核心', reason: '形成原因', description: '当前说明', base: '参与基础', legitimacy: '凝聚力' },
        empty: { ideology: '尚未记录凝聚原因', economy: '尚未记录可用资源', politics: '默认按沟通协同处理', military: '社群态默认隐藏军事面板', diplomacy: '尚未记录联谊关系' },
        hideMilitaryWhenEmpty: true,
      };
    }
    return {
      eyebrow: 'CORE PROFILE',
      labels: { ideology: '意识形态', economy: '经济', politics: '政治', military: '军事', diplomacy: '外交' },
      ideologyLabels: { core: '核心', reason: '原因', description: '说明', base: '基础', legitimacy: '合法性' },
      empty: { ideology: '尚未记录意识形态事实', economy: '尚未记录经济事实', politics: '尚未记录政治事实', military: '尚未记录军事事实', diplomacy: '尚未记录外交事实' },
      hideMilitaryWhenEmpty: false,
    };
  },

  factionOverviewFieldLabel(panelKey = '', fieldKey = '', faction = this.selectedFaction()) {
    const meta = this.factionOverviewModeMeta(faction);
    if (panelKey === 'ideology') return meta.ideologyLabels?.[fieldKey] || fieldKey;
    return fieldKey;
  },

  factionOverviewEntryValue(entry = {}) {
    const raw = entry?.value;
    if (typeof raw === 'number') return `${raw}${entry?.unit || ''}`;
    const text = String(raw ?? '').trim();
    return `${text}${entry?.unit || ''}`.trim();
  },

  factionOverviewPanelSkin(panelKey = '') {
    const map = {
      ideology: { icon: '🜁', tone: 'gold', entryIcons: { core: '⚑', reason: '✦', description: '☷', base: '⬡', legitimacy: '♛' } },
      economy: { icon: '◇', tone: 'green', entryIcons: {} },
      politics: { icon: '⚖', tone: 'blue', entryIcons: {} },
      military: { icon: '⚔', tone: 'red', entryIcons: {} },
      diplomacy: { icon: '✉', tone: 'cyan', entryIcons: {} },
    };
    return map[panelKey] || { icon: '◆', tone: 'blue', entryIcons: {} };
  },

  factionOverviewPanelMeter(panelKey = '', entries = [], faction = null) {
    if (panelKey === 'ideology') {
      const value = Number(faction?.solid?.overviewPanels?.ideology?.legitimacy?.value);
      if (Number.isFinite(value)) return Math.max(0, Math.min(100, value));
    }
    return Math.max(0, Math.min(100, entries.length * 28));
  },

  factionOverviewRankLabel(meter = 0, count = 0) {
    if (!count) return '迷雾未展开';
    if (meter >= 75) return '核心态势稳固';
    if (meter >= 45) return '已形成可观测态势';
    return '初步确立';
  },

  selectedFactionOverviewSummary() {
    const faction = this.selectedFaction?.();
    if (!faction) return '';
    const summary = window.GameModules.orgTerritory?.overviewSummary?.(faction, 3) || '';
    if (summary) return summary;
    return faction.stub?.oneLine || faction.description || '尚未推演出稳定的宏观总览事实。';
  },

  buildFactionCapabilityCards(faction = this.selectedFaction()) {
    const ot = window.GameModules.orgTerritory;
    const panels = ot?.normalizeOverviewPanels?.(faction?.solid?.overviewPanels || {})
      || ot?.defaultOverviewPanels?.()
      || { ideology: {}, economy: { entries: {} }, politics: { entries: {} }, military: { entries: {} }, diplomacy: { entries: {} } };
    const meta = this.factionOverviewModeMeta(faction);
    return ['ideology', 'economy', 'politics', 'military', 'diplomacy'].map((panelKey) => {
      const skin = this.factionOverviewPanelSkin(panelKey);
      if (panelKey === 'ideology') {
        const ideology = panels.ideology || {};
        const entries = ['core', 'reason', 'description', 'base', 'legitimacy'].map((fieldKey) => {
          const field = ideology[fieldKey] || {};
          const value = field?.value;
          const hasValue = typeof value === 'number' ? Number.isFinite(value) : String(value ?? '').trim();
          if (!hasValue && fieldKey !== 'legitimacy') return null;
          return {
            key: `ideology-${fieldKey}`,
            name: fieldKey,
            label: this.factionOverviewFieldLabel('ideology', fieldKey, faction),
            value,
            unit: field?.unit || '',
            icon: skin.entryIcons[fieldKey] || skin.icon,
            display: this.factionOverviewEntryValue(field),
            reason: String(field?.reason || '').trim(),
            stateBadge: hasValue ? '已记录' : '',
            parentLabel: '',
          };
        }).filter(Boolean);
        const meter = this.factionOverviewPanelMeter(panelKey, entries, faction);
        return {
          key: 'cap-ideology',
          dim: 'ideology',
          label: meta.labels.ideology,
          eyebrow: meta.eyebrow,
          emptyText: meta.empty.ideology,
          icon: skin.icon,
          tone: skin.tone,
          meter,
          meterStyle: `--meter:${meter};`,
          rankLabel: this.factionOverviewRankLabel(meter, entries.length),
          statusLabel: `${entries.length}项`,
          entries,
        };
      }
      const entries = Object.entries(panels[panelKey]?.entries || {}).map(([key, entry]) => ({
        ...(entry && typeof entry === 'object' ? entry : { value: entry }),
        key: `${panelKey}-${key}`,
        name: key,
        label: this.factionOverviewFieldLabel(panelKey, key, faction),
        icon: skin.entryIcons[key] || skin.icon,
        display: this.factionOverviewEntryValue(entry && typeof entry === 'object' ? entry : { value: entry }),
        reason: String(entry?.reason || '').trim(),
        stateBadge: entry?.state ? (ot?.stateBadge?.(entry.state) || '') : '',
        parentLabel: '',
      }));
      const meter = this.factionOverviewPanelMeter(panelKey, entries, faction);
      return {
        key: `cap-${panelKey}`,
        dim: panelKey,
        label: meta.labels[panelKey] || panelKey,
        eyebrow: meta.eyebrow,
        emptyText: meta.empty[panelKey] || '尚未记录',
        icon: skin.icon,
        tone: skin.tone,
        meter,
        meterStyle: `--meter:${meter};`,
        rankLabel: this.factionOverviewRankLabel(meter, entries.length),
        statusLabel: `${entries.length}项`,
        entries,
      };
    }).filter((card) => !(card.dim === 'military' && meta.hideMilitaryWhenEmpty && !card.entries.length));
  },

  factionCapabilityCards() {
    const faction = this.selectedFaction();
    if (this.factionState?.orgCacheSelectedId === faction?.id && this.factionState?.capabilityCards) {
      return this.factionState.capabilityCards;
    }
    return this.buildFactionCapabilityCards(faction);
  },
};

window.GameModules.factionOrgActions = _factionOrgActionsBase;
