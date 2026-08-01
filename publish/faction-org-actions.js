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

  refreshFactionOrgCache() {
    if (!this.factionState) return;
    const faction = this.selectedFaction();
    this.factionState.orgCacheSelectedId = faction?.id || '';
    this.factionState.structureCards = this.buildFactionStructureCards(faction);
    this.factionState.orgTree = this.buildFactionOrgTree(faction);
    this.factionState.orgNodes = this.factionState.orgTree?.children || [];
    this.factionState.capabilityCards = this.buildFactionCapabilityCards(faction);
    this.factionState.territoryEntries = this.buildFactionTerritoryEntries(faction);
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
    return this.buildFactionOrgTree(faction);
  },

  factionOrgTreeRows() {
    return this.flattenFactionOrgTree(this.factionOrgTreeRoot(), 0, []);
  },

  buildFactionOrgNodes(faction = this.selectedFaction(), cards = this.buildFactionStructureCards(faction)) {
    return this.buildFactionOrgTree(faction)?.children || this.buildStructureBranchNodes(faction);
  },

  factionOrgNodes() {
    const faction = this.selectedFaction();
    if (this.factionState?.orgCacheSelectedId === faction?.id && this.factionState?.orgNodes) return this.factionState.orgNodes;
    return this.buildFactionOrgTree(faction)?.children || [];
  },

  factionOverviewModeMeta(faction = this.selectedFaction()) {
    const ot = window.GameModules.orgTerritory;
    const structuralCountry = faction?.sovereign === true
      || String(faction?.orgDomain || '').trim() === 'country'
      || String(faction?.type || '').trim() === '国家'
      || String(faction?.level || '').includes('国家');
    const classification = ot?.deriveClassification?.(faction)
      || ot?.normalizeClassification?.(faction?.classification)
      || (structuralCountry ? 'country' : String(faction?.maturityClass || '').trim())
      || 'community';
    const ideologyCore = String(faction?.solid?.overviewPanels?.ideology?.core?.value || '').trim();
    const gestalt = String(faction?.type || '').includes('格式塔意识') || ideologyCore === '格式塔意识';
    if (gestalt) {
      return {
        eyebrow: 'GESTALT PROFILE',
        labels: { ideology: '格式塔意识', economy: '资源', politics: '统一个体', military: '军事', diplomacy: '外交' },
        ideologyLabels: { core: '核心', reason: '形成原因', description: '当前说明', base: '意识基底', legitimacy: '统一度' },
        economyLabels: window.GameModules.orgTerritory?.economyFieldLabels?.() || {},
        politicsLabels: window.GameModules.orgTerritory?.politicsFieldLabels?.() || {},
        militaryLabels: window.GameModules.orgTerritory?.militaryFieldLabels?.() || {},
        empty: { ideology: '尚未记录统一意识说明', economy: '尚未记录资源事实', politics: '尚未记录统一个体事实', military: '尚未记录军事事实', diplomacy: '尚未记录外交事实' },
        hideMilitaryWhenEmpty: false,
      };
    }
    if (classification === 'country') {
      return {
        eyebrow: 'COUNTRY PROFILE',
        labels: { ideology: '国体', economy: '经济', politics: '政治', military: '军事', diplomacy: '外交' },
        ideologyLabels: { core: '国体核心', reason: '形成原因', description: '当前说明', base: '法理基础', legitimacy: '合法性' },
        economyLabels: window.GameModules.orgTerritory?.economyFieldLabels?.() || {},
        politicsLabels: window.GameModules.orgTerritory?.politicsFieldLabels?.() || {},
        militaryLabels: window.GameModules.orgTerritory?.militaryFieldLabels?.() || {},
        empty: { ideology: '国家事实尚未展开', economy: '经济事实尚未展开', politics: '政治事实尚未展开', military: '军事事实尚未展开', diplomacy: '外交事实尚未展开' },
        hideMilitaryWhenEmpty: false,
      };
    }
    if (classification === 'claim') {
      return {
        eyebrow: 'CLAIM PROFILE',
        labels: { ideology: '宣称基础', economy: '可用资源', politics: '组织化程度', military: '武力宣称', diplomacy: '外部回应' },
        ideologyLabels: { core: '宣称核心', reason: '宣称原因', description: '当前说明', base: '参与基础', legitimacy: '可信度' },
        economyLabels: window.GameModules.orgTerritory?.economyFieldLabels?.() || {},
        politicsLabels: window.GameModules.orgTerritory?.politicsFieldLabels?.() || {},
        militaryLabels: window.GameModules.orgTerritory?.militaryFieldLabels?.() || {},
        empty: { ideology: '尚未记录宣称基础', economy: '尚未记录可用资源', politics: '尚未记录组织化事实', military: '尚未记录武力事实', diplomacy: '尚未记录外部回应' },
        hideMilitaryWhenEmpty: true,
      };
    }
    if (classification === 'community') {
      return {
        eyebrow: 'COMMUNITY PROFILE',
        labels: { ideology: '凝聚原因', economy: '可用资源', politics: '管理', military: '军事', diplomacy: '联谊' },
        ideologyLabels: { core: '核心', reason: '形成原因', description: '当前说明', base: '参与基础', legitimacy: '凝聚力' },
        economyLabels: window.GameModules.orgTerritory?.economyFieldLabels?.() || {},
        politicsLabels: window.GameModules.orgTerritory?.politicsFieldLabels?.() || {},
        militaryLabels: window.GameModules.orgTerritory?.militaryFieldLabels?.() || {},
        empty: { ideology: '尚未记录凝聚原因', economy: '尚未记录可用资源', politics: '默认按沟通协同处理', military: '社群态默认隐藏军事面板', diplomacy: '尚未记录联谊关系' },
        hideMilitaryWhenEmpty: true,
      };
    }
    return {
      eyebrow: 'CORE PROFILE',
      labels: { ideology: '意识形态', economy: '经济', politics: '政治', military: '军事', diplomacy: '外交' },
      ideologyLabels: { core: '核心', reason: '原因', description: '说明', base: '基础', legitimacy: '合法性' },
      economyLabels: window.GameModules.orgTerritory?.economyFieldLabels?.() || {},
        politicsLabels: window.GameModules.orgTerritory?.politicsFieldLabels?.() || {},
        militaryLabels: window.GameModules.orgTerritory?.militaryFieldLabels?.() || {},
      empty: { ideology: '尚未记录意识形态事实', economy: '尚未记录经济事实', politics: '尚未记录政治事实', military: '尚未记录军事事实', diplomacy: '尚未记录外交事实' },
      hideMilitaryWhenEmpty: false,
    };
  },

  factionOverviewFieldLabel(panelKey = '', fieldKey = '', faction = this.selectedFaction()) {
    const meta = this.factionOverviewModeMeta(faction);
    if (panelKey === 'ideology') return meta.ideologyLabels?.[fieldKey] || fieldKey;
    if (panelKey === 'economy') {
      return meta.economyLabels?.[fieldKey]
        || window.GameModules.orgTerritory?.economyFieldLabels?.()?.[fieldKey]
        || fieldKey;
    }
    if (panelKey === 'politics') {
      return meta.politicsLabels?.[fieldKey]
        || window.GameModules.orgTerritory?.politicsFieldLabels?.()?.[fieldKey]
        || fieldKey;
    }
    if (panelKey === 'military') {
      return meta.militaryLabels?.[fieldKey]
        || window.GameModules.orgTerritory?.militaryFieldLabels?.()?.[fieldKey]
        || fieldKey;
    }
    if (panelKey === 'diplomacy') {
      return meta.diplomacyLabels?.[fieldKey]
        || window.GameModules.orgTerritory?.diplomacyFieldLabels?.()?.[fieldKey]
        || fieldKey;
    }
    if (panelKey === 'territory') {
      return meta.territoryLabels?.[fieldKey]
        || window.GameModules.orgTerritory?.territoryFieldLabels?.()?.[fieldKey]
        || fieldKey;
    }
    return fieldKey;
  },

  factionOverviewEntryValue(entry = {}, panelKey = '', fieldKey = '') {
    if (['economy', 'politics', 'military', 'diplomacy', 'territory'].includes(panelKey)) {
      return window.GameModules.orgTerritory?.formatOverviewEntryDisplay?.(panelKey, fieldKey, entry) || '待推演补全';
    }
    const raw = entry?.value;
    if (typeof raw === 'number') return `${raw}${entry?.unit || ''}`;
    const text = String(raw ?? '').trim();
    return `${text}${entry?.unit || ''}`.trim();
  },

  factionOverviewPanelSkin(panelKey = '') {
    const map = {
      ideology: { icon: '🜁', tone: 'gold', entryIcons: { core: '⚑', reason: '✦', description: '☷', base: '⬡', legitimacy: '♛' } },
      economy: {
        icon: '◇',
        tone: 'green',
        entryIcons: {
          gdp: '▣',
          income: '▲',
          expenditure: '▼',
          assets: '⌂',
          resources: '◆',
          production: '↻',
          system: '☰',
          institutions: '🏛',
          laws: '📜',
          works: '✉',
        },
      },
      politics: {
        icon: '⚖',
        tone: 'blue',
        entryIcons: {
          regime: '🏛',
          powerStructure: '⚖',
          rulemaking: '✎',
          adjudication: '◆',
          execution: '▶',
          participation: '▣',
          leadership: '♛',
          institutions: '⌂',
          laws: '📜',
          works: '✉',
        },
      },
      military: {
        icon: '⚔',
        tone: 'red',
        entryIcons: {
          posture: '⚑',
          forces: '⚔',
          personnel: '▣',
          quality: '◆',
          sustainment: '⌂',
          projection: '▶',
          equipment: '⚒',
          institutions: '🏛',
          laws: '📜',
          works: '✉',
        },
      },
      diplomacy: {
        icon: '✉',
        tone: 'cyan',
        entryIcons: {
          posture: '⚑',
          orientation: '◈',
          allies: '🤝',
          rivals: '⚔',
          memberships: '◉',
          treaties: '📜',
          presence: '⌂',
          institutions: '🏛',
          laws: '⚖',
          works: '✉',
        },
      },
    };
    return map[panelKey] || { icon: '◆', tone: 'blue', entryIcons: {} };
  },

  factionOverviewPanelMeter(panelKey = '', entries = [], faction = null) {
    if (panelKey === 'ideology') {
      const value = Number(faction?.solid?.overviewPanels?.ideology?.legitimacy?.value);
      if (Number.isFinite(value)) return Math.max(0, Math.min(100, value));
    }
    if (panelKey === 'economy' || panelKey === 'politics' || panelKey === 'military' || panelKey === 'diplomacy') {
      const filled = entries.filter((entry) => entry?.filled).length;
      const total = Math.max(1, entries.length || 10);
      return Math.max(0, Math.min(100, Math.round((filled / total) * 100)));
    }
    return Math.max(0, Math.min(100, entries.length * 28));
  },

  factionOverviewRankLabel(meter = 0, count = 0) {
    if (!count) return '迷雾未展开';
    if (meter >= 75) return '核心态势稳固';
    if (meter >= 45) return '已形成可观测态势';
    return '初步确立';
  },

  factionOverviewEffectiveCount(panelKey = '', entries = []) {
    if (panelKey === 'ideology') {
      return entries.filter((entry) => String(entry?.name || '') !== 'legitimacy' && entry?.filled).length;
    }
    if (panelKey === 'economy' || panelKey === 'politics' || panelKey === 'military' || panelKey === 'diplomacy') {
      return entries.filter((entry) => entry?.filled).length;
    }
    return entries.length;
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
    return ['ideology', 'politics', 'economy', 'military', 'diplomacy'].map((panelKey) => {
      const skin = this.factionOverviewPanelSkin(panelKey);
      if (panelKey === 'ideology') {
        const ideology = panels.ideology || {};
        const entries = ['core', 'reason', 'description', 'base', 'legitimacy'].map((fieldKey) => {
          const field = ideology[fieldKey] || {};
          const value = field?.value;
          const hasValue = typeof value === 'number'
            ? Number.isFinite(value)
            : Boolean(String(value ?? '').trim());
          return {
            key: `ideology-${fieldKey}`,
            name: fieldKey,
            label: this.factionOverviewFieldLabel('ideology', fieldKey, faction),
            value,
            unit: field?.unit || '',
            icon: skin.entryIcons[fieldKey] || skin.icon,
            display: hasValue
              ? this.factionOverviewEntryValue(field, 'ideology', fieldKey)
              : (fieldKey === 'legitimacy' ? '0/100' : '待推演补全'),
            reason: String(field?.reason || '').trim(),
            stateBadge: hasValue ? '已记录' : '待填',
            filled: hasValue,
            multiline: false,
            parentLabel: '',
          };
        });
        const meter = this.factionOverviewPanelMeter(panelKey, entries, faction);
        const effectiveCount = this.factionOverviewEffectiveCount(panelKey, entries);
        const filledCount = entries.filter((entry) => entry.filled).length;
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
          rankLabel: this.factionOverviewRankLabel(meter, effectiveCount),
          statusLabel: `${filledCount}/5项`,
          entries,
        };
      }
      if (panelKey === 'economy') {
        const economyEntries = panels.economy?.entries || {};
        const keys = window.GameModules.orgTerritory?.economyFixedKeys?.()
          || ['gdp', 'income', 'expenditure', 'assets', 'resources', 'production', 'system', 'institutions', 'laws', 'works'];
        const listKeys = new Set(window.GameModules.orgTerritory?.economyListKeys?.() || ['institutions', 'laws', 'works']);
        const entries = keys.map((fieldKey) => {
          const field = economyEntries[fieldKey] || {};
          const hasValue = window.GameModules.orgTerritory?.economyEntryHasValue?.(fieldKey, field)
            || Boolean(String(field?.value ?? '').trim());
          return {
            key: `economy-${fieldKey}`,
            name: fieldKey,
            label: this.factionOverviewFieldLabel('economy', fieldKey, faction),
            value: field?.value,
            unit: field?.unit || '',
            icon: skin.entryIcons[fieldKey] || skin.icon,
            display: this.factionOverviewEntryValue(field, 'economy', fieldKey),
            reason: String(field?.reason || '').trim(),
            stateBadge: hasValue ? '已记录' : '待填',
            filled: hasValue,
            multiline: listKeys.has(fieldKey),
            parentLabel: '',
          };
        });
        const meter = this.factionOverviewPanelMeter(panelKey, entries, faction);
        const effectiveCount = this.factionOverviewEffectiveCount(panelKey, entries);
        const filledCount = entries.filter((entry) => entry.filled).length;
        return {
          key: 'cap-economy',
          dim: 'economy',
          label: meta.labels.economy,
          eyebrow: meta.eyebrow,
          emptyText: meta.empty.economy,
          icon: skin.icon,
          tone: skin.tone,
          meter,
          meterStyle: `--meter:${meter};`,
          rankLabel: this.factionOverviewRankLabel(meter, effectiveCount),
          statusLabel: `${filledCount}/${keys.length}项`,
          entries,
        };
      }
      if (panelKey === 'politics') {
        const politicsEntries = panels.politics?.entries || {};
        const keys = window.GameModules.orgTerritory?.politicsFixedKeys?.()
          || ['regime', 'powerStructure', 'rulemaking', 'adjudication', 'execution', 'participation', 'leadership', 'institutions', 'laws', 'works'];
        const listKeys = new Set(window.GameModules.orgTerritory?.politicsListKeys?.() || ['institutions', 'laws', 'works']);
        const entries = keys.map((fieldKey) => {
          const field = politicsEntries[fieldKey] || {};
          const hasValue = window.GameModules.orgTerritory?.politicsEntryHasValue?.(fieldKey, field)
            || Boolean(String(field?.value ?? '').trim());
          return {
            key: `politics-${fieldKey}`,
            name: fieldKey,
            label: this.factionOverviewFieldLabel('politics', fieldKey, faction),
            value: field?.value,
            unit: field?.unit || '',
            icon: skin.entryIcons[fieldKey] || skin.icon,
            display: this.factionOverviewEntryValue(field, 'politics', fieldKey),
            reason: String(field?.reason || '').trim(),
            stateBadge: hasValue ? '已记录' : '待填',
            filled: hasValue,
            multiline: listKeys.has(fieldKey),
            parentLabel: '',
          };
        });
        const meter = this.factionOverviewPanelMeter(panelKey, entries, faction);
        const effectiveCount = this.factionOverviewEffectiveCount(panelKey, entries);
        const filledCount = entries.filter((entry) => entry.filled).length;
        return {
          key: 'cap-politics',
          dim: 'politics',
          label: meta.labels.politics,
          eyebrow: meta.eyebrow,
          emptyText: meta.empty.politics,
          icon: skin.icon,
          tone: skin.tone,
          meter,
          meterStyle: `--meter:${meter};`,
          rankLabel: this.factionOverviewRankLabel(meter, effectiveCount),
          statusLabel: `${filledCount}/${keys.length}项`,
          entries,
        };
      }
      if (panelKey === 'military') {
        const militaryEntries = panels.military?.entries || {};
        const keys = window.GameModules.orgTerritory?.militaryFixedKeys?.()
          || ['posture', 'forces', 'personnel', 'quality', 'sustainment', 'projection', 'equipment', 'institutions', 'laws', 'works'];
        const listKeys = new Set([
          ...(window.GameModules.orgTerritory?.militaryMapKeys?.() || ['forces']),
          ...(window.GameModules.orgTerritory?.militaryListKeys?.() || ['institutions', 'laws', 'works']),
        ]);
        const entries = keys.map((fieldKey) => {
          const field = militaryEntries[fieldKey] || {};
          const hasValue = window.GameModules.orgTerritory?.militaryEntryHasValue?.(fieldKey, field) === true;
          return {
            key: `military-${fieldKey}`,
            name: fieldKey,
            label: this.factionOverviewFieldLabel('military', fieldKey, faction),
            value: field?.value,
            unit: field?.unit || '',
            icon: skin.entryIcons[fieldKey] || skin.icon,
            display: this.factionOverviewEntryValue(field, 'military', fieldKey),
            reason: String(field?.reason || '').trim(),
            stateBadge: hasValue ? '已记录' : '待填',
            filled: hasValue,
            multiline: listKeys.has(fieldKey) || fieldKey === 'equipment' || fieldKey === 'personnel' || fieldKey === 'quality' || fieldKey === 'sustainment' || fieldKey === 'projection' || fieldKey === 'posture',
            parentLabel: '',
          };
        });
        const meter = this.factionOverviewPanelMeter(panelKey, entries, faction);
        const effectiveCount = this.factionOverviewEffectiveCount(panelKey, entries);
        const filledCount = entries.filter((entry) => entry.filled).length;
        return {
          key: 'cap-military',
          dim: 'military',
          label: meta.labels.military,
          eyebrow: meta.eyebrow,
          emptyText: meta.empty.military,
          icon: skin.icon,
          tone: skin.tone,
          meter,
          meterStyle: `--meter:${meter};`,
          rankLabel: this.factionOverviewRankLabel(meter, effectiveCount),
          statusLabel: `${filledCount}/${keys.length}项`,
          entries,
        };
      }
      if (panelKey === 'diplomacy') {
        const diplomacyEntries = panels.diplomacy?.entries || {};
        const keys = window.GameModules.orgTerritory?.diplomacyFixedKeys?.()
          || ['posture', 'orientation', 'allies', 'rivals', 'memberships', 'treaties', 'presence', 'institutions', 'laws', 'works'];
        const listKeys = new Set(window.GameModules.orgTerritory?.diplomacyListKeys?.()
          || ['allies', 'rivals', 'memberships', 'treaties', 'institutions', 'laws', 'works']);
        const entries = keys.map((fieldKey) => {
          const field = diplomacyEntries[fieldKey] || {};
          const hasValue = window.GameModules.orgTerritory?.diplomacyEntryHasValue?.(fieldKey, field) === true;
          return {
            key: `diplomacy-${fieldKey}`,
            name: fieldKey,
            label: this.factionOverviewFieldLabel('diplomacy', fieldKey, faction),
            value: field?.value,
            unit: field?.unit || '',
            icon: skin.entryIcons[fieldKey] || skin.icon,
            display: hasValue
              ? this.factionOverviewEntryValue(field, 'diplomacy', fieldKey)
              : '待推演补全',
            reason: String(field?.reason || '').trim(),
            stateBadge: hasValue ? '已记录' : '待填',
            filled: hasValue,
            multiline: listKeys.has(fieldKey) || fieldKey === 'posture' || fieldKey === 'orientation' || fieldKey === 'presence',
            parentLabel: '',
          };
        });
        const meter = this.factionOverviewPanelMeter(panelKey, entries, faction);
        const effectiveCount = this.factionOverviewEffectiveCount(panelKey, entries);
        const filledCount = entries.filter((entry) => entry.filled).length;
        return {
          key: 'cap-diplomacy',
          dim: 'diplomacy',
          label: meta.labels.diplomacy,
          eyebrow: meta.eyebrow,
          emptyText: meta.empty.diplomacy,
          icon: skin.icon,
          tone: skin.tone,
          meter,
          meterStyle: `--meter:${meter};`,
          rankLabel: this.factionOverviewRankLabel(meter, effectiveCount),
          statusLabel: `${filledCount}/${keys.length}项`,
          entries,
        };
      }
      const entries = Object.entries(panels[panelKey]?.entries || {}).map(([key, entry]) => ({
        ...(entry && typeof entry === 'object' ? entry : { value: entry }),
        key: `${panelKey}-${key}`,
        name: key,
        label: this.factionOverviewFieldLabel(panelKey, key, faction),
        icon: skin.entryIcons[key] || skin.icon,
        display: this.factionOverviewEntryValue(entry && typeof entry === 'object' ? entry : { value: entry }, panelKey, key),
        reason: String(entry?.reason || '').trim(),
        stateBadge: entry?.state ? (ot?.stateBadge?.(entry.state) || '') : '',
        filled: true,
        multiline: false,
        parentLabel: '',
      }));
      const meter = this.factionOverviewPanelMeter(panelKey, entries, faction);
      const effectiveCount = this.factionOverviewEffectiveCount(panelKey, entries);
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
        rankLabel: this.factionOverviewRankLabel(meter, effectiveCount),
        statusLabel: `${entries.length}项`,
        entries,
      };
    }).filter((card) => !(card.dim === 'military' && meta.hideMilitaryWhenEmpty && !card.entries.some((entry) => entry.filled)));
  },

  buildFactionTerritoryEntries(faction = this.selectedFaction()) {
    const ot = window.GameModules.orgTerritory;
    const panels = ot?.normalizeOverviewPanels?.(faction?.solid?.overviewPanels || {})
      || ot?.defaultOverviewPanels?.()
      || {};
    const territoryEntries = panels.territory?.entries || {};
    const keys = ot?.territoryFixedKeys?.() || ['capital', 'area', 'population', 'adminDivision', 'regions'];
    const icons = {
      capital: '⌖',
      area: '▣',
      population: '◉',
      adminDivision: '☰',
      regions: '🗺',
    };
    return keys.map((fieldKey) => {
      const field = territoryEntries[fieldKey] || {};
      const hasValue = ot?.territoryEntryHasValue?.(fieldKey, field) === true;
      return {
        key: `territory-${fieldKey}`,
        name: fieldKey,
        label: this.factionOverviewFieldLabel('territory', fieldKey, faction),
        value: field?.value,
        unit: field?.unit || '',
        icon: icons[fieldKey] || '◆',
        display: hasValue
          ? this.factionOverviewEntryValue(field, 'territory', fieldKey)
          : '待推演补全',
        reason: String(field?.reason || '').trim(),
        stateBadge: hasValue ? '已记录' : '待填',
        filled: hasValue,
        multiline: ot?.overviewFieldIsList?.('territory', fieldKey)
          || fieldKey === 'adminDivision'
          || fieldKey === 'area'
          || fieldKey === 'population',
      };
    });
  },

  factionTerritoryEntries() {
    const faction = this.selectedFaction();
    if (this.factionState?.orgCacheSelectedId === faction?.id && this.factionState?.territoryEntries) {
      return this.factionState.territoryEntries;
    }
    return this.buildFactionTerritoryEntries(faction);
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
