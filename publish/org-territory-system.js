/**
 * 组织—领土控势：共享 schema 规范化、控势解析、迷雾/草案/已确立展示。
 * 设计依据：docs/schemas/org-territory-system-design.md
 */
window.GameModules = window.GameModules || {};

window.GameModules.orgTerritory = {
  ITEM_STATES: ['fog', 'sketch', 'established'],
  ORG_CLASSIFICATIONS: ['country', 'faction', 'community', 'claim'],

  nowLabel(store) {
    try {
      return store?.phoneDate?.()?.toISOString?.() || new Date().toISOString();
    } catch (_) {
      return new Date().toISOString();
    }
  },

  defaultCountryOrgId(store) {
    const factions = store?.factionState?.factions || [];
    const country = factions.find((f) => f.type === '国家' && !f.parentId);
    return country?.id || '';
  },

  orgNameById(store, orgId = '') {
    const id = String(orgId || '').trim();
    if (!id) return '未知';
    const faction = (store?.factionState?.factions || []).find((f) => f.id === id);
    return faction?.name || id;
  },

  validOrgId(store, orgId = '') {
    const id = String(orgId || '').trim();
    if (!id) return this.defaultCountryOrgId(store);
    if (!store?.factionState?.factions?.length) store?.initFactionSystem?.();
    const factions = store?.factionState?.factions || [];
    if (factions.some((f) => f.id === id)) return this.resolveLiveOrgId(store, id);
    const byName = this.resolveOrgIdByName(store, id);
    if (byName) return this.resolveLiveOrgId(store, byName);
    // No invent / country兜底 — unknown org stays empty until AI creates it.
    return '';
  },

  parentRefFog(label = '迷雾') {
    return { fog: true, orgNodeId: null, label: label || '迷雾' };
  },

  parentRefClear(orgNodeId = null, label = '') {
    return { fog: false, orgNodeId: orgNodeId || null, label: String(label || '未知').trim() || '未知' };
  },

  normalizeParentRef(raw, fallbackLabel = '迷雾') {
    if (!raw || typeof raw !== 'object') return this.parentRefFog(fallbackLabel);
    if (raw.fog === true || (!raw.orgNodeId && !raw.label)) return this.parentRefFog(raw.label || fallbackLabel);
    return {
      fog: false,
      orgNodeId: raw.orgNodeId || null,
      label: String(raw.label || raw.name || '').trim() || '未知',
    };
  },

  normalizeItemState(state, fallback = 'fog') {
    const value = String(state || '').trim();
    return this.ITEM_STATES.includes(value) ? value : fallback;
  },

  stateBadge(state) {
    const map = { fog: '未确立', sketch: '草案', established: '已确立' };
    return map[this.normalizeItemState(state)] || '未确立';
  },

  resolveBindType(store, name = '') {
    const label = String(name || '').trim();
    if (!label || label === '未知') return { bindType: 'unknown', characterId: '' };
    const states = store?.rpgStates || {};
    const found = Object.values(states).find((s) => {
      const n = String(s?.profile?.name || s?.name || '').trim();
      return n && (n === label || n.endsWith(label));
    });
    if (found?.id) return { bindType: 'role', characterId: found.id };
    return { bindType: 'intro', characterId: '' };
  },

  normalizeOccupant(raw, store) {
    if (typeof raw === 'string') {
      const bind = this.resolveBindType(store, raw);
      return {
        name: raw,
        bindType: bind.bindType,
        characterId: bind.characterId,
        occupantFog: false,
        state: 'sketch',
      };
    }
    const name = String(raw?.name || raw?.characterName || '').trim();
    const bindType = raw?.bindType || this.resolveBindType(store, name).bindType;
    return {
      name: name || '未知',
      bindType,
      characterId: raw?.characterId || (bindType === 'role' ? this.resolveBindType(store, name).characterId : ''),
      occupantFog: raw?.occupantFog === true || !name,
      state: this.normalizeItemState(raw?.state, name ? 'sketch' : 'fog'),
      reason: String(raw?.reason || '').trim(),
    };
  },

  normalizeRole(raw, store) {
    if (typeof raw === 'string') {
      return this.decorateRole({ title: raw, titleFog: false, dutyFog: true, occupantFog: true, characters: ['未知'], occupants: [] });
    }
    const title = String(raw?.title || raw?.name || raw?.position || '').trim();
    const titleFog = raw?.titleFog === true || !title;
    const chars = Array.isArray(raw?.characters) ? raw.characters : (raw?.character ? [raw.character] : []);
    let occupants = Array.isArray(raw?.occupants) ? raw.occupants.map((o) => this.normalizeOccupant(o, store)) : [];
    if (!occupants.length && chars.length) {
      occupants = chars.map((c) => this.normalizeOccupant(c, store));
    }
    const occupantFog = raw?.occupantFog === true || (!occupants.length && !chars.filter((c) => c && c !== '未知').length);
    const role = {
      ...raw,
      title: titleFog ? '职位：迷雾' : title,
      titleFog,
      dutyNote: String(raw?.dutyNote || raw?.duty || '').trim(),
      dutyFog: raw?.dutyFog !== false && !String(raw?.dutyNote || raw?.duty || '').trim(),
      count: raw?.count ?? raw?.quantity ?? (occupants.length || (chars.length && !chars.includes('未知') ? chars.length : '未知')),
      state: this.normalizeItemState(raw?.state, titleFog ? 'fog' : 'sketch'),
      occupants,
      occupantFog,
      characters: chars.map(String).filter(Boolean).length ? chars.map(String).filter(Boolean) : (occupants.map((o) => o.name).filter(Boolean).length ? occupants.map((o) => o.name) : ['未知']),
    };
    return this.decorateRole(role);
  },

  decorateRole(role) {
    const occupants = Array.isArray(role.occupants) ? role.occupants : [];
    const chars = Array.isArray(role.characters) ? role.characters : [];
    const previewNames = occupants.filter((o) => !o.occupantFog).map((o) => o.name).filter(Boolean);
    const displayChars = previewNames.length ? previewNames : chars;
    return {
      ...role,
      preview: displayChars.slice(0, 4).join('、') || '未知',
      overflow: displayChars.length > 4,
      displayTitle: role.titleFog ? '职位：迷雾' : role.title,
      displayDuty: role.dutyFog ? '职责：迷雾' : (role.dutyNote || '职责：迷雾'),
      displayOccupants: role.occupantFog ? '任职：迷雾' : `任职：${displayChars.join('、') || '未知'}`,
      stateBadge: this.stateBadge(role.state),
    };
  },

  normalizeStructureNode(raw, faction = {}, index = 0, store) {
    const name = String(raw?.name || raw?.title || `部门${index + 1}`).trim() || `部门${index + 1}`;
    const id = String(raw?.id || `struct-${faction.id || 'faction'}-${index}-${name.replace(/\s+/g, '-')}`).slice(0, 64);
    const state = this.normalizeItemState(raw?.state, raw?.roles?.length ? 'sketch' : 'fog');
    return {
      ...raw,
      id,
      name,
      kind: raw?.kind || 'department',
      state,
      parentRef: this.normalizeParentRef(raw?.parentRef, '迷雾'),
      roles: (Array.isArray(raw?.roles) ? raw.roles : []).map((r) => this.normalizeRole(r, store)),
      sketchNote: String(raw?.sketchNote || '').trim(),
      stateBadge: this.stateBadge(state),
      parentLabel: this.nodeParentLabel({ parentRef: this.normalizeParentRef(raw?.parentRef, '迷雾') }),
    };
  },

  nodeParentLabel(node = {}) {
    const ref = node.parentRef || {};
    if (ref.fog) return '上级：迷雾';
    return ref.label ? `上级：${ref.label}` : '上级：未知';
  },


  defaultOverviewField(value = '', unit = '') {
    return {
      value,
      unit,
      establishedAt: '',
      updatedAt: '',
      reason: '',
    };
  },

  defaultOverviewPanels() {
    return {
      ideology: {
        core: this.defaultOverviewField(''),
        reason: this.defaultOverviewField(''),
        description: this.defaultOverviewField(''),
        base: this.defaultOverviewField(''),
        legitimacy: this.defaultOverviewField(0, '/100'),
      },
      economy: { entries: this.emptyEconomyEntries() },
      politics: { entries: this.emptyPoliticsEntries() },
      military: { entries: this.emptyMilitaryEntries() },
      diplomacy: { entries: this.emptyDiplomacyEntries() },
      territory: { entries: this.emptyTerritoryEntries() },
    };
  },

  /** Standard overview value kinds. Parse accepts only this JSON shape — no markdown / legacy shape compat. */
  overviewValueKinds() {
    return {
      text: {
        empty: () => '',
        parse(raw) {
          if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') return String(raw).trim();
          return '';
        },
        format(value, unit = '') {
          const text = String(value ?? '').trim();
          return text ? `${text}${unit || ''}`.trim() : '待推演补全';
        },
        hasValue(value) {
          return String(value ?? '').trim().length > 0;
        },
      },
      number: {
        empty: () => 0,
        parse(raw) {
          if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
          if (typeof raw === 'string' && raw.trim()) {
            const n = Number(raw.trim());
            return Number.isFinite(n) ? n : null;
          }
          return null;
        },
        format(value, unit = '') {
          if (typeof value !== 'number' || !Number.isFinite(value)) return unit ? `0${unit}` : '待推演补全';
          return `${value}${unit || ''}`;
        },
        hasValue(value) {
          return typeof value === 'number' && Number.isFinite(value);
        },
      },
      nameDescList: {
        empty: () => [],
        parse(raw) {
          if (!Array.isArray(raw)) return [];
          return raw.map((item) => {
            if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
            const name = String(item.name ?? '').trim();
            if (!name) return null;
            return {
              name,
              description: String(item.description ?? '').trim(),
            };
          }).filter(Boolean);
        },
        format(rows) {
          if (!Array.isArray(rows) || !rows.length) return '待推演补全';
          return rows.map((row) => `- ${row.name}${row.description ? `: ${row.description}` : ''}`).join('\n');
        },
        hasValue(rows) {
          return Array.isArray(rows) && rows.length > 0;
        },
      },
      relationList: {
        empty: () => [],
        parse(raw) {
          if (!Array.isArray(raw)) return [];
          return raw.map((item) => {
            if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
            const name = String(item.name ?? '').trim();
            if (!name) return null;
            return {
              name,
              description: String(item.description ?? '').trim(),
              viewOfSelf: String(item.viewOfSelf ?? '').trim(),
            };
          }).filter(Boolean);
        },
        format(rows) {
          if (!Array.isArray(rows) || !rows.length) return '待推演补全';
          return rows.map((row) => {
            const parts = [
              row.description,
              row.viewOfSelf ? `对自己的看法: ${row.viewOfSelf}` : '',
            ].filter(Boolean).join('；');
            return `- ${row.name}${parts ? `: ${parts}` : ''}`;
          }).join('\n');
        },
        hasValue(rows) {
          return Array.isArray(rows) && rows.length > 0;
        },
      },
      groupItemsList: {
        empty: () => [],
        parse(raw) {
          if (!Array.isArray(raw)) return [];
          return raw.map((item) => {
            if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
            const name = String(item.name ?? '').trim();
            if (!name) return null;
            const items = Array.isArray(item.items)
              ? item.items.map((row) => String(row ?? '').trim()).filter(Boolean)
              : [];
            return { name, items };
          }).filter(Boolean);
        },
        format(rows) {
          if (!Array.isArray(rows) || !rows.length) return '待推演补全';
          const lines = [];
          rows.forEach((row) => {
            lines.push(`- ${row.name}`);
            (row.items || []).forEach((item) => lines.push(`-- ${item}`));
          });
          return lines.join('\n');
        },
        hasValue(rows) {
          return Array.isArray(rows) && rows.some((row) => row?.name && Array.isArray(row.items) && row.items.length > 0);
        },
      },
      regionList: {
        empty: () => [],
        parse(raw) {
          if (!Array.isArray(raw)) return [];
          return raw.map((item) => {
            if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
            const name = String(item.name ?? '').trim();
            if (!name) return null;
            return {
              name,
              capital: String(item.capital ?? item.省会 ?? '').trim(),
              area: String(item.area ?? item.面积 ?? '').trim(),
              controlRate: String(item.controlRate ?? item.控制率 ?? '').trim(),
              population: String(item.population ?? item.人数 ?? '').trim(),
              description: String(item.description ?? item.描述 ?? '').trim(),
              garrison: String(item.garrison ?? item.驻军 ?? '').trim(),
            };
          }).filter(Boolean);
        },
        format(rows) {
          if (!Array.isArray(rows) || !rows.length) return '待推演补全';
          return rows.map((row) => {
            const parts = [
              row.capital ? `省会${row.capital}` : '',
              row.area || '',
              row.controlRate ? `控制率${row.controlRate}` : '',
              row.population || '',
              row.description || '',
              row.garrison || '',
            ].filter(Boolean).join('；');
            return `- ${row.name}${parts ? `: ${parts}` : ''}`;
          }).join('\n');
        },
        hasValue(rows) {
          return Array.isArray(rows) && rows.length > 0;
        },
      },
    };
  },

  overviewFieldSchema() {
    return {
      ideology: {
        core: 'text',
        reason: 'text',
        description: 'text',
        base: 'text',
        legitimacy: 'number',
      },
      economy: {
        gdp: 'text',
        income: 'text',
        expenditure: 'text',
        assets: 'text',
        resources: 'text',
        production: 'text',
        system: 'text',
        institutions: 'nameDescList',
        laws: 'nameDescList',
        works: 'nameDescList',
      },
      politics: {
        regime: 'text',
        powerStructure: 'text',
        rulemaking: 'text',
        adjudication: 'text',
        execution: 'text',
        participation: 'text',
        leadership: 'text',
        institutions: 'nameDescList',
        laws: 'nameDescList',
        works: 'nameDescList',
      },
      military: {
        posture: 'text',
        forces: 'groupItemsList',
        personnel: 'text',
        quality: 'text',
        sustainment: 'text',
        projection: 'text',
        equipment: 'text',
        institutions: 'nameDescList',
        laws: 'nameDescList',
        works: 'nameDescList',
      },
      diplomacy: {
        posture: 'text',
        orientation: 'text',
        allies: 'relationList',
        rivals: 'relationList',
        memberships: 'nameDescList',
        treaties: 'nameDescList',
        presence: 'text',
        institutions: 'nameDescList',
        laws: 'nameDescList',
        works: 'nameDescList',
      },
      territory: {
        capital: 'text',
        area: 'text',
        population: 'text',
        adminDivision: 'text',
        regions: 'regionList',
      },
    };
  },

  overviewFieldKind(panelKey = '', fieldKey = '') {
    return this.overviewFieldSchema()?.[panelKey]?.[fieldKey] || '';
  },

  overviewKindApi(kind = '') {
    return this.overviewValueKinds()?.[kind] || null;
  },

  overviewEmptyValue(panelKey = '', fieldKey = '') {
    const api = this.overviewKindApi(this.overviewFieldKind(panelKey, fieldKey));
    return api ? api.empty() : '';
  },

  normalizeOverviewEntryValue(panelKey = '', fieldKey = '', raw) {
    const api = this.overviewKindApi(this.overviewFieldKind(panelKey, fieldKey));
    if (!api) return raw ?? '';
    return api.parse(raw);
  },

  formatOverviewEntryDisplay(panelKey = '', fieldKey = '', entry = {}) {
    const kind = this.overviewFieldKind(panelKey, fieldKey);
    const api = this.overviewKindApi(kind);
    if (!api) {
      const text = String(entry?.value ?? '').trim();
      return text ? `${text}${entry?.unit || ''}`.trim() : '待推演补全';
    }
    if (kind === 'text' || kind === 'number') return api.format(entry?.value, entry?.unit || '');
    return api.format(entry?.value);
  },

  overviewEntryHasValue(panelKey = '', fieldKey = '', entry = {}) {
    const api = this.overviewKindApi(this.overviewFieldKind(panelKey, fieldKey));
    if (!api || !entry || typeof entry !== 'object') return false;
    return api.hasValue(entry.value);
  },

  overviewListKinds() {
    return new Set(['nameDescList', 'relationList', 'groupItemsList', 'regionList']);
  },

  overviewFieldIsList(panelKey = '', fieldKey = '') {
    return this.overviewListKinds().has(this.overviewFieldKind(panelKey, fieldKey));
  },

  economyFixedKeys() {
    return ['gdp', 'income', 'expenditure', 'assets', 'resources', 'production', 'system', 'institutions', 'laws', 'works'];
  },

  economyListKeys() {
    return ['institutions', 'laws', 'works'];
  },

  economyFieldLabels() {
    return {
      gdp: 'GDP',
      income: '收入',
      expenditure: '支出',
      assets: '资产',
      resources: '资源',
      production: '产量',
      system: '经济制度',
      institutions: '经济机构',
      laws: '经济法案/法律',
      works: '经济作品',
    };
  },

  economyFieldAlias(key = '') {
    const text = String(key || '').trim();
    const map = {
      gdp: 'gdp',
      GDP: 'gdp',
      income: 'income',
      收入: 'income',
      revenue: 'income',
      expenditure: 'expenditure',
      支出: 'expenditure',
      expense: 'expenditure',
      spending: 'expenditure',
      assets: 'assets',
      资产: 'assets',
      resources: 'resources',
      资源: 'resources',
      production: 'production',
      产量: 'production',
      output: 'production',
      system: 'system',
      经济制度: 'system',
      economicSystem: 'system',
      institutions: 'institutions',
      经济机构: 'institutions',
      agencies: 'institutions',
      laws: 'laws',
      经济法案: 'laws',
      经济法律: 'laws',
      '经济法案/法律': 'laws',
      bills: 'laws',
      works: 'works',
      经济作品: 'works',
      literature: 'works',
    };
    return map[text] || (this.economyFixedKeys().includes(text) ? text : '');
  },

  emptyEconomyEntries() {
    return Object.fromEntries(this.economyFixedKeys().map((key) => [key, {
      value: this.overviewEmptyValue('economy', key),
      unit: '',
      kind: key,
      state: 'fog',
      note: '',
      reason: '',
      updatedAt: '',
    }]));
  },

  normalizeEconomyListValue(raw) {
    return this.overviewKindApi('nameDescList').parse(raw);
  },

  normalizeEconomyEntryValue(key = '', raw) {
    return this.normalizeOverviewEntryValue('economy', key, raw);
  },

  formatEconomyDisplay(key = '', entry = {}) {
    return this.formatOverviewEntryDisplay('economy', key, entry);
  },

  economyEntryHasValue(key = '', entry = {}) {
    return this.overviewEntryHasValue('economy', key, entry);
  },

  politicsFixedKeys() {
    return ['regime', 'powerStructure', 'rulemaking', 'adjudication', 'execution', 'participation', 'leadership', 'institutions', 'laws', 'works'];
  },

  politicsListKeys() {
    return ['institutions', 'laws', 'works'];
  },

  politicsFieldLabels() {
    return {
      regime: '政体',
      powerStructure: '权力结构',
      rulemaking: '规则制定',
      adjudication: '裁决解释',
      execution: '行政执行',
      participation: '参与与选举',
      leadership: '统治与继承',
      institutions: '政治机构',
      laws: '政治法案/宪法/组织法',
      works: '政治作品',
    };
  },

  politicsFieldAlias(key = '') {
    const text = String(key || '').trim();
    const map = {
      regime: 'regime',
      政体: 'regime',
      powerStructure: 'powerStructure',
      权力结构: 'powerStructure',
      institution: 'powerStructure',
      rulemaking: 'rulemaking',
      规则制定: 'rulemaking',
      rulemakingPower: 'rulemaking',
      adjudication: 'adjudication',
      裁决解释: 'adjudication',
      adjudicationPower: 'adjudication',
      execution: 'execution',
      行政执行: 'execution',
      executionPower: 'execution',
      participation: 'participation',
      参与与选举: 'participation',
      参与: 'participation',
      选举: 'participation',
      leadership: 'leadership',
      统治与继承: 'leadership',
      统治: 'leadership',
      继承: 'leadership',
      institutions: 'institutions',
      政治机构: 'institutions',
      laws: 'laws',
      政治法案: 'laws',
      宪法: 'laws',
      组织法: 'laws',
      '政治法案/宪法/组织法': 'laws',
      works: 'works',
      政治作品: 'works',
    };
    return map[text] || (this.politicsFixedKeys().includes(text) ? text : '');
  },

  emptyPoliticsEntries() {
    return Object.fromEntries(this.politicsFixedKeys().map((key) => [key, {
      value: this.overviewEmptyValue('politics', key),
      unit: '',
      kind: key,
      state: 'fog',
      note: '',
      reason: '',
      updatedAt: '',
    }]));
  },

  normalizePoliticsEntryValue(key = '', raw) {
    return this.normalizeOverviewEntryValue('politics', key, raw);
  },

  formatPoliticsDisplay(key = '', entry = {}) {
    return this.formatOverviewEntryDisplay('politics', key, entry);
  },

  politicsEntryHasValue(key = '', entry = {}) {
    return this.overviewEntryHasValue('politics', key, entry);
  },

  militaryFixedKeys() {
    return ['posture', 'forces', 'personnel', 'quality', 'sustainment', 'projection', 'equipment', 'institutions', 'laws', 'works'];
  },

  militaryListKeys() {
    return ['institutions', 'laws', 'works'];
  },

  /** @deprecated forces uses groupItemsList schema; kept for callers that still check map keys. */
  militaryMapKeys() {
    return ['forces'];
  },

  militaryNestedKeys() {
    return this.militaryMapKeys();
  },

  militaryFieldLabels() {
    return {
      posture: '军事总览',
      forces: '兵力构成',
      personnel: '兵力规模',
      quality: '质量战备',
      sustainment: '持续力/后勤',
      projection: '投送与控制',
      equipment: '装备与武库',
      institutions: '军事机构',
      laws: '军事法案/法规',
      works: '军事作品',
    };
  },

  militaryFieldAlias(key = '') {
    const text = String(key || '').trim();
    const map = {
      posture: 'posture',
      军事总览: 'posture',
      overview: 'posture',
      forces: 'forces',
      兵力构成: 'forces',
      personnel: 'personnel',
      兵力规模: 'personnel',
      quality: 'quality',
      质量战备: 'quality',
      sustainment: 'sustainment',
      持续力: 'sustainment',
      后勤: 'sustainment',
      '持续力/后勤': 'sustainment',
      projection: 'projection',
      投送与控制: 'projection',
      equipment: 'equipment',
      装备与武库: 'equipment',
      装备: 'equipment',
      institutions: 'institutions',
      军事机构: 'institutions',
      laws: 'laws',
      军事法案: 'laws',
      军事法规: 'laws',
      '军事法案/法规': 'laws',
      works: 'works',
      军事作品: 'works',
    };
    return map[text] || (this.militaryFixedKeys().includes(text) ? text : '');
  },

  emptyMilitaryEntries() {
    return Object.fromEntries(this.militaryFixedKeys().map((key) => [key, {
      value: this.overviewEmptyValue('military', key),
      unit: '',
      kind: key,
      state: 'fog',
      note: '',
      reason: '',
      updatedAt: '',
    }]));
  },

  normalizeMilitaryEntryValue(key = '', raw) {
    return this.normalizeOverviewEntryValue('military', key, raw);
  },

  formatMilitaryDisplay(key = '', entry = {}) {
    return this.formatOverviewEntryDisplay('military', key, entry);
  },

  militaryEntryHasValue(key = '', entry = {}) {
    return this.overviewEntryHasValue('military', key, entry);
  },

  emptyDiplomacyEntries() {
    return Object.fromEntries(this.diplomacyFixedKeys().map((key) => [key, {
      value: this.overviewEmptyValue('diplomacy', key),
      unit: '',
      kind: key,
      state: 'fog',
      note: '',
      reason: '',
      updatedAt: '',
    }]));
  },

  normalizeDiplomacyEntryValue(key = '', raw) {
    return this.normalizeOverviewEntryValue('diplomacy', key, raw);
  },

  formatDiplomacyDisplay(key = '', entry = {}) {
    return this.formatOverviewEntryDisplay('diplomacy', key, entry);
  },

  diplomacyEntryHasValue(key = '', entry = {}) {
    return this.overviewEntryHasValue('diplomacy', key, entry);
  },

  diplomacyFixedKeys() {
    return ['posture', 'orientation', 'allies', 'rivals', 'memberships', 'treaties', 'presence', 'institutions', 'laws', 'works'];
  },

  diplomacyListKeys() {
    return ['allies', 'rivals', 'memberships', 'treaties', 'institutions', 'laws', 'works'];
  },

  diplomacyFieldLabels() {
    return {
      posture: '外交总览',
      orientation: '对外取向',
      allies: '盟友与伙伴',
      rivals: '对手与摩擦',
      memberships: '国际组织与机制',
      treaties: '条约与协定',
      presence: '驻外网络',
      institutions: '外交机构',
      laws: '涉外法规',
      works: '外交作品',
    };
  },

  diplomacyFieldAlias(key = '') {
    const text = String(key || '').trim();
    const map = {
      posture: 'posture',
      外交总览: 'posture',
      orientation: 'orientation',
      对外取向: 'orientation',
      allies: 'allies',
      盟友与伙伴: 'allies',
      盟友: 'allies',
      partners: 'allies',
      rivals: 'rivals',
      对手与摩擦: 'rivals',
      对手: 'rivals',
      adversaries: 'rivals',
      memberships: 'memberships',
      国际组织与机制: 'memberships',
      国际组织: 'memberships',
      organizations: 'memberships',
      treaties: 'treaties',
      条约与协定: 'treaties',
      条约: 'treaties',
      presence: 'presence',
      驻外网络: 'presence',
      使领馆: 'presence',
      institutions: 'institutions',
      外交机构: 'institutions',
      laws: 'laws',
      涉外法规: 'laws',
      外交法规: 'laws',
      works: 'works',
      外交作品: 'works',
    };
    return map[text] || (this.diplomacyFixedKeys().includes(text) ? text : '');
  },

  territoryFixedKeys() {
    return ['capital', 'area', 'population', 'adminDivision', 'regions'];
  },

  territoryFieldLabels() {
    return {
      capital: '首都',
      area: '统治面积',
      population: '统治人数',
      adminDivision: '统治行政区划分',
      regions: '统治区域',
    };
  },

  territoryFieldAlias(key = '') {
    const text = String(key || '').trim();
    const map = {
      capital: 'capital',
      首都: 'capital',
      area: 'area',
      统治面积: 'area',
      面积: 'area',
      population: 'population',
      统治人数: 'population',
      人数: 'population',
      adminDivision: 'adminDivision',
      统治行政区划分: 'adminDivision',
      行政区划: 'adminDivision',
      行政区划分: 'adminDivision',
      regions: 'regions',
      统治区域: 'regions',
      行政区: 'regions',
    };
    return map[text] || (this.territoryFixedKeys().includes(text) ? text : '');
  },

  emptyTerritoryEntries() {
    return Object.fromEntries(this.territoryFixedKeys().map((key) => [key, {
      value: this.overviewEmptyValue('territory', key),
      unit: '',
      kind: key,
      state: 'fog',
      note: '',
      reason: '',
      updatedAt: '',
    }]));
  },

  normalizeTerritoryEntryValue(key = '', raw) {
    return this.normalizeOverviewEntryValue('territory', key, raw);
  },

  formatTerritoryDisplay(key = '', entry = {}) {
    return this.formatOverviewEntryDisplay('territory', key, entry);
  },

  territoryEntryHasValue(key = '', entry = {}) {
    return this.overviewEntryHasValue('territory', key, entry);
  },

  normalizeOverviewField(raw, fallbackValue = '', fallbackUnit = '') {
    if (raw && typeof raw === 'object' && Object.prototype.hasOwnProperty.call(raw, 'value')) {
      return {
        value: raw.value,
        unit: raw.unit ?? fallbackUnit,
        establishedAt: String(raw.establishedAt || '').trim(),
        updatedAt: String(raw.updatedAt || '').trim(),
        reason: String(raw.reason || '').trim(),
      };
    }
    return this.defaultOverviewField(raw ?? fallbackValue, fallbackUnit);
  },

  normalizeOverviewEntries(raw, { panelKey = '' } = {}) {
    const base = (() => {
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        if (raw.entries && typeof raw.entries === 'object' && !Array.isArray(raw.entries)) {
          return { ...raw, entries: { ...raw.entries } };
        }
        return { entries: { ...raw } };
      }
      return { entries: {} };
    })();
    const fixedPanel = ['economy', 'politics', 'military', 'diplomacy', 'territory'].includes(panelKey);
    if (!fixedPanel) return base;
    const emptyByPanel = {
      economy: () => this.emptyEconomyEntries(),
      politics: () => this.emptyPoliticsEntries(),
      military: () => this.emptyMilitaryEntries(),
      diplomacy: () => this.emptyDiplomacyEntries(),
      territory: () => this.emptyTerritoryEntries(),
    };
    const aliasByPanel = {
      economy: (key) => this.economyFieldAlias(key),
      politics: (key) => this.politicsFieldAlias(key),
      military: (key) => this.militaryFieldAlias(key),
      diplomacy: (key) => this.diplomacyFieldAlias(key),
      territory: (key) => this.territoryFieldAlias(key),
    };
    const keysByPanel = {
      economy: () => this.economyFixedKeys(),
      politics: () => this.politicsFixedKeys(),
      military: () => this.militaryFixedKeys(),
      diplomacy: () => this.diplomacyFixedKeys(),
      territory: () => this.territoryFixedKeys(),
    };
    const fixed = emptyByPanel[panelKey]();
    const alias = aliasByPanel[panelKey];
    const fixedKeys = keysByPanel[panelKey]();
    const normalizeValue = (key, value) => this.normalizeOverviewEntryValue(panelKey, key, value);
    Object.entries(base.entries || {}).forEach(([key, entry]) => {
      const mapped = alias(key) || key;
      const normalized = entry && typeof entry === 'object' && !Array.isArray(entry)
        ? { ...entry }
        : { value: entry };
      if (fixedKeys.includes(mapped)) {
        normalized.value = normalizeValue(mapped, normalized.value);
        fixed[mapped] = { ...fixed[mapped], ...normalized, kind: mapped };
      }
    });
    return { ...base, entries: fixed };
  },

  normalizeOverviewPanels(raw = {}) {
    const ideology = raw?.ideology || {};
    return {
      ideology: {
        core: this.normalizeOverviewField(ideology.core, ''),
        reason: this.normalizeOverviewField(ideology.reason, ''),
        description: this.normalizeOverviewField(ideology.description, ''),
        base: this.normalizeOverviewField(ideology.base, ''),
        legitimacy: this.normalizeOverviewField(ideology.legitimacy, 0, '/100'),
      },
      economy: this.normalizeOverviewEntries(raw?.economy, { panelKey: 'economy' }),
      politics: this.normalizeOverviewEntries(raw?.politics, { panelKey: 'politics' }),
      military: this.normalizeOverviewEntries(raw?.military, { panelKey: 'military' }),
      diplomacy: this.normalizeOverviewEntries(raw?.diplomacy, { panelKey: 'diplomacy' }),
      territory: this.normalizeOverviewEntries(raw?.territory, { panelKey: 'territory' }),
    };
  },

  overviewFieldHasValue(field) {
    if (!field || typeof field !== 'object') return false;
    const value = field.value;
    if (typeof value === 'number') return Number.isFinite(value) && value !== 0;
    return String(value ?? '').trim().length > 0;
  },

  overviewPanelEstablished(panelKey = '', panels = {}) {
    if (panelKey === 'ideology') {
      const ideology = panels.ideology || {};
      return ['core', 'reason', 'description', 'base', 'legitimacy'].some((key) => this.overviewFieldHasValue(ideology[key]));
    }
    const panel = panels?.[panelKey];
    const entries = panel?.entries;
    return !!(entries && typeof entries === 'object' && Object.keys(entries).length);
  },

  normalizeClassification(value = '') {
    const text = String(value || '').trim();
    const map = {
      国家: 'country',
      主权体: 'country',
      势力: 'faction',
      组织势力: 'faction',
      社群: 'community',
      社区: 'community',
      自称: 'claim',
      宣称: 'claim',
      claim: 'claim',
    };
    const lower = text.toLowerCase();
    return this.ORG_CLASSIFICATIONS.includes(lower) ? lower : (map[text] || '');
  },

  classificationLabel(classification = '') {
    const map = { country: '国家', faction: '势力', community: '社群', claim: '自称' };
    return map[this.normalizeClassification(classification)] || '社群';
  },

  isStructuralCountry(faction = {}) {
    faction = faction || {};
    return faction?.sovereign === true || String(faction?.orgDomain || '').trim() === 'country';
  },

  isKnownRealCountry(faction = {}) {
    faction = faction || {};
    const explicit = this.normalizeClassification(faction?.classification || faction?.classificationClass);
    const type = String(faction?.type || '').trim();
    const level = String(faction?.level || '').trim();
    return explicit === 'country'
      || this.isStructuralCountry(faction)
      || type === '国家'
      || level.includes('国家');
  },

  looksLikeSovereigntyClaim(faction = {}) {
    faction = faction || {};
    if (this.isStructuralCountry(faction)) return false;
    const text = [
      faction.name,
      faction.type,
      faction.description,
      faction.domain,
      faction.stance,
      faction.stub?.oneLine,
      faction.claim,
    ].filter(Boolean).join(' ');
    return /自称|宣称|号称|过家家|玩笑|角色扮演|私人王国|私人国家|家庭国家|独立宣言|宣布独立|自封|伪国/.test(text);
  },

  deriveClassification(faction = {}, overviewPanels = null) {
    faction = faction || {};
    const explicit = this.normalizeClassification(faction?.classification || faction?.classificationClass);
    if (explicit === 'country') {
      return this.looksLikeSovereigntyClaim(faction) ? 'claim' : 'country';
    }
    if (explicit) return explicit;
    if (this.isStructuralCountry(faction)) return 'country';
    if (this.looksLikeSovereigntyClaim(faction)) return 'claim';
    if (this.isKnownRealCountry(faction)) return 'country';
    if (faction?.maturityClass === 'faction' || faction?.maturityClass === 'community') return faction.maturityClass;
    const panels = overviewPanels || this.normalizeOverviewPanels(faction?.solid?.overviewPanels || {});
    const complete = ['ideology', 'economy', 'politics', 'military', 'diplomacy'].every((key) => this.overviewPanelEstablished(key, panels));
    return complete ? 'faction' : 'community';
  },

  deriveMaturityClass(faction = {}, overviewPanels = null) {
    const classification = this.deriveClassification(faction, overviewPanels);
    if (classification === 'country' || classification === 'faction') return 'faction';
    return 'community';
  },

  defaultStub(faction = {}) {
    return {
      oneLine: `${faction.name || '组织'}（${faction.type || '组织'}，尚未推演细化）`,
    };
  },

  /** Top-level「所属世界」; storage key is worldTag. */
  resolveFactionWorldTag(faction = {}, store = null) {
    const raw = faction?.worldTag ?? faction?.所属世界 ?? faction?.world ?? '';
    const text = String(raw || '').trim();
    if (text) return text.slice(0, 40);
    const fromStore = store?.currentWorldTag?.()
      || store?.currentWorldLabel?.()
      || store?.character?.work
      || store?.selectedWork
      || '';
    const fallback = String(fromStore || window.GameModules.realWorld2026?.label || '未知世界').trim();
    return fallback.slice(0, 40) || '未知世界';
  },

  normalizeFaction(faction = {}, store) {
    if (!faction || typeof faction !== 'object') return faction;
    const resolution = faction.resolution || (faction.structure?.length ? 'L2' : 'L1');
    const status = faction.status || 'active';
    const stub = faction.stub && typeof faction.stub === 'object' ? faction.stub : this.defaultStub(faction);
    const solid = faction.solid && typeof faction.solid === 'object'
      ? { overviewPanels: this.normalizeOverviewPanels(faction.solid.overviewPanels || {}) }
      : { overviewPanels: this.defaultOverviewPanels() };
    const structure = (Array.isArray(faction.structure) ? faction.structure : []).map((node, index) => this.normalizeStructureNode(node, faction, index, store));
    const territoryAnchors = (Array.isArray(faction.territoryAnchors) ? faction.territoryAnchors : [])
      .map((id) => String(id || '').trim()).filter(Boolean).slice(0, 8);
    const classification = this.deriveClassification(faction, solid.overviewPanels);
    const maturityClass = this.deriveMaturityClass({ ...faction, classification }, solid.overviewPanels);
    const worldTag = this.resolveFactionWorldTag(faction, store);
    const { 所属世界: _legacyWorldLabel, ...rest } = faction;
    return {
      ...rest,
      worldTag,
      resolution,
      stub,
      status,
      solid,
      structure,
      territoryAnchors,
      classification,
      classificationLabel: this.classificationLabel(classification),
      maturityClass,
      maturityLabel: this.classificationLabel(classification),
      resolutionBadge: this.resolutionBadge(resolution),
    };
  },

  resolutionBadge(resolution = 'L1') {
    const map = { L1: '迷雾', L2: '已接触', L3: '已固化', L4: '已审计' };
    return map[String(resolution || 'L1').toUpperCase()] || '迷雾';
  },

  defaultControl(orgId, store, reason = '默认法域继承') {
    const id = this.validOrgId(store, orgId);
    return {
      effectiveOrgId: id,
      claimOrgId: id,
      ownerOrgId: id,
      status: 'stable',
      since: this.nowLabel(store),
      reason,
      inherit: true,
    };
  },

  normalizeControl(raw, store) {
    if (!raw || typeof raw !== 'object') return this.defaultControl(this.defaultCountryOrgId(store), store);
    const effectiveOrgId = this.validOrgId(store, raw.effectiveOrgId || raw.effective || this.defaultCountryOrgId(store));
    const claimOrgId = this.validOrgId(store, raw.claimOrgId || raw.claim || effectiveOrgId);
    const ownerRaw = raw.ownerOrgId || raw.owner;
    const ownerOrgId = ownerRaw
      ? this.validOrgId(store, ownerRaw)
      : effectiveOrgId;
    return {
      effectiveOrgId,
      claimOrgId,
      ownerOrgId,
      status: ['stable', 'contested', 'transitional', 'disputed'].includes(raw.status) ? raw.status : 'stable',
      since: raw.since || this.nowLabel(store),
      reason: String(raw.reason || '默认法域继承').slice(0, 120),
      inherit: raw.inherit !== false,
    };
  },

  inferDefaultOwnerOrgId(store, node = {}) {
    const text = String(node.name || '').trim();
    if (!text) return null;
    const factions = store?.factionState?.factions || [];
    const companies = factions.filter((f) => f.type === '公司' || f.type === '工作室' || f.kind === 'company' || f.id === 'company-main');
    for (const company of companies) {
      const name = String(company.name || '').trim();
      if (name.length >= 2 && text.includes(name)) return company.id;
    }
    return null;
  },

  normalizeNodeControl(node, map, store) {
    if (!node) return null;
    const mapMod = window.GameModules.realWorldMap;
    if (mapMod?.isInteriorLocationName?.(node.name)) {
      const anchor = mapMod.resolveExteriorAnchorNode(map, node);
      if (anchor && anchor.id !== node.id) {
        node.control = { ...this.resolveControl(map, anchor, store), inherit: true, reason: '继承建筑物控势' };
        return node.control;
      }
    }
    if (!node.control || typeof node.control !== 'object') {
      node.control = this.defaultControl(this.defaultCountryOrgId(store), store);
    } else {
      const hadOwner = Boolean(node.control.ownerOrgId || node.control.owner);
      node.control = this.normalizeControl(node.control, store);
      if (!hadOwner && mapMod?.isMapExteriorNode?.(node.name)) {
        const inferred = this.inferDefaultOwnerOrgId(store, node);
        if (inferred) node.control.ownerOrgId = this.validOrgId(store, inferred);
      }
    }
    if (!Array.isArray(node.controlHistory)) node.controlHistory = [];
    return node.control;
  },

  resolveControl(map, node, store) {
    const mapMod = window.GameModules.realWorldMap;
    if (!node || !map) return this.defaultControl(this.defaultCountryOrgId(store), store);
    const anchor = mapMod.resolveExteriorAnchorNode(map, node) || node;
    let walk = anchor;
    for (let guard = 0; guard < 12 && walk; guard += 1) {
      this.normalizeNodeControl(walk, map, store);
      const control = walk.control;
      if (control && control.inherit === false) return { ...control };
      if (!walk.parentId) break;
      walk = (map.nodes || []).find((item) => item.id === walk.parentId);
    }
    return this.defaultControl(this.defaultCountryOrgId(store), store);
  },

  resolveControlLabel(map, node, store) {
    if (!node?.revealed) return '';
    const control = this.resolveControl(map, node, store);
    const effective = this.orgNameById(store, control.effectiveOrgId);
    const claim = this.orgNameById(store, control.claimOrgId);
    const owner = this.orgNameById(store, control.ownerOrgId || control.effectiveOrgId);
    const mark = control.status === 'contested' ? ' ⚔' : '';
    const ownerPart = owner !== effective ? `产权：${owner}｜管治：${effective}` : `控势：${effective}`;
    if (effective === claim) return `${ownerPart}${mark}`;
    return `${ownerPart}｜宣称：${claim}${mark}`;
  },

  ensureMapControls(map, store) {
    if (!map?.nodes) return map;
    (map.nodes || []).forEach((node) => this.normalizeNodeControl(node, map, store));
    return map;
  },

  findMapNode(map, nameOrId = '') {
    const key = String(nameOrId || '').trim();
    if (!key) return null;
    return (map?.nodes || []).find((node) => node.id === key || node.name === key) || null;
  },

  isChangeMode(update = {}) {
    const mode = String(update.change?.mode || update.mode || '').trim();
    return /^(change|更改|replace|set)$/u.test(mode);
  },

  canMutateEstablished(item, update = {}) {
    if (!item || item.state !== 'established') return true;
    return this.isChangeMode(update) || update.change?.establish === false;
  },

  overviewSummary(faction = {}, maxPerPanel = 2) {
    const panels = this.normalizeOverviewPanels(faction.solid?.overviewPanels || {});
    const lines = [];
    const ideology = panels.ideology || {};
    const core = ideology.core?.value;
    const legitimacy = ideology.legitimacy?.value;
    if (String(core ?? '').trim()) {
      const suffix = String(legitimacy ?? '').trim() ? ' / ' + legitimacy + (ideology.legitimacy?.unit || '') : '';
      lines.push('\u610f\u8bc6\u5f62\u6001\uff1a' + core + suffix);
    }
    const labels = { economy: '\u7ecf\u6d4e', politics: '\u653f\u6cbb', military: '\u519b\u4e8b', diplomacy: '\u5916\u4ea4' };
    ['economy', 'politics', 'military', 'diplomacy'].forEach((key) => {
      const entries = Object.entries(panels[key]?.entries || {}).slice(0, maxPerPanel);
      if (!entries.length) return;
      const brief = entries.map(([name, entry]) => {
        const value = entry && typeof entry === 'object' ? entry.value : entry;
        const unit = entry && typeof entry === 'object' ? (entry.unit || '') : '';
        return name + ':' + (String(value ?? '').trim() || '\u5df2\u786e\u7acb') + unit;
      }).join('\u3001');
      lines.push(labels[key] + '\uff1a' + brief);
    });
    return lines.join('\uff1b');
  },

  orgIndexLine(faction = {}) {
    const stub = faction.stub?.oneLine || `${faction.name || '组织'}（${faction.type || '组织'}）`;
    const badge = faction.resolution || 'L1';
    return `${faction.name}｜${badge}｜${stub}`.slice(0, 140);
  },

  orgIndexText(store, action = '', max = 800) {
    store.initFactionSystem?.();
    const factions = store.factionState?.factions || [];
    if (!factions.length) return '暂无已知组织。';
    const related = window.GameModules.factionArchive?.relatedFactions?.(store, action, []) || [];
    const relatedIds = new Set(related.map((f) => f.id));
    const sorted = [...factions].sort((a, b) => {
      const ar = relatedIds.has(a.id) ? 0 : 1;
      const br = relatedIds.has(b.id) ? 0 : 1;
      if (ar !== br) return ar - br;
      return String(a.resolution || 'L1').localeCompare(String(b.resolution || 'L1'));
    });
    return sorted.map((f) => this.orgIndexLine(f)).join('\n').slice(0, max);
  },

  orgHotBlock(faction = {}, store) {
    const resolution = String(faction.resolution || 'L1').toUpperCase();
    if (resolution === 'L1') return '';
    const parts = [`【${faction.name}】${faction.resolutionBadge || this.resolutionBadge(faction.resolution)}`];
    (faction.structure || []).slice(0, 4).forEach((node) => {
      parts.push(`- ${node.name}｜${this.stateBadge(node.state)}｜${this.nodeParentLabel(node)}`);
      (node.roles || []).slice(0, 2).forEach((role) => {
        const title = role.displayTitle || role.title || '职位：迷雾';
        parts.push(`  · ${title}｜${this.stateBadge(role.state)}`);
      });
    });
    const overview = this.overviewSummary(faction, 2);
    if (overview) parts.push(overview);
    return parts.join('\n');
  },

  orgHotText(store, action = '', max = 1200) {
    store.initFactionSystem?.();
    const seed = `${action} ${store.realWorldLocationName || ''} ${store.realWorldSceneTitle || ''}`;
    const related = window.GameModules.factionArchive?.relatedFactions?.(store, seed, []) || [];
    const candidates = related.length
      ? related
      : (store.factionState?.factions || []).filter((f) => ['L2', 'L3', 'L4'].includes(String(f.resolution || '').toUpperCase()));
    const lines = candidates.map((f) => this.orgHotBlock(f, store)).filter(Boolean);
    return lines.join('\n\n').slice(0, max) || '暂无已接触组织细节。';
  },

  territoryHotText(store, max = 600) {
    const map = window.GameModules.realWorldMap?.ensure?.(store, store.playerProfile || {}) || {};
    const nodes = window.GameModules.realWorldMapFog?.visibleNodes?.(map)
      || (map.nodes || []).filter((n) => n.revealed && window.GameModules.realWorldMap?.isMapDisplayNode?.(n, map));
    const lines = nodes.slice(0, 14).map((node) => {
      const label = this.resolveControlLabel(map, node, store);
      return label ? `${node.name}｜${label}` : null;
    }).filter(Boolean);
    return lines.join('\n').slice(0, max) || '暂无已揭示地点控势。';
  },

  factionExposureScore(faction = {}, store) {
    if (!faction?.id && !faction?.name) return 0;
    if (faction.type === '国家' && !faction.parentId) return 2;
    if (['company-main', 'family-player-home'].includes(faction.id)) return 2;
    const resolution = String(faction.resolution || 'L1').toUpperCase();
    if (['L2', 'L3', 'L4'].includes(resolution)) return 1;
    const key = window.GameModules.factionArchive?.factionKey?.(faction);
    const archives = store?.factionState?.archives?.[key];
    if (archives && Object.keys(archives).length) return 1;
    if (faction.kind === 'admin') return 0;
    return 0;
  },

  hasArchiveExposure(faction = {}, store) {
    const key = window.GameModules.factionArchive?.factionKey?.(faction);
    const archive = store?.factionState?.archives?.[key];
    if (!archive) return false;
    return (archive.docs || []).some((doc) => (doc.paragraphs || []).length > 0);
  },

  settlementSubjectKey(update = {}) {
    const type = String(update?.updateType || '').trim();
    const subject = update.subject || {};
    if (type === 'territory-control') {
      return String(subject.locationName || subject.name || subject.id || '').trim();
    }
    if (/^(org-status|membership|faction-structure|faction-overview|org-overview-panel)$/u.test(type)) {
      return String(subject.name || subject.factionId || subject.id || subject.orgId || '').trim();
    }
    return '';
  },

  isOrgTerritoryUpdate(update = {}) {
    const type = String(update?.updateType || '').trim();
    return /^(territory-control|org-status|org-structure-node|org-overview-panel|membership|faction-structure|faction-overview)$/u.test(type);
  },

  REAL_WORLD_WORK_ALIASES: ['2026现代都市现实世界', '2026 现代都市', '现代都市现实世界'],

  isRealWorldPlaySession(store = {}) {
    const realWorldTag = window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';
    const activeWorld = String(store.character?.work || store.selectedWork || '').trim();
    if (!activeWorld) return true;
    if (activeWorld === realWorldTag) return true;
    return this.REAL_WORLD_WORK_ALIASES.includes(activeWorld);
  },

  consistencySignature(report = {}) {
    return [...(report.warnings || []), ...(report.fixes || [])].join('|');
  },

  trimReconciliationLog(store, max = 30) {
    if (!store?.orgTerritoryReconciliationLog?.length) return;
    if (store.orgTerritoryReconciliationLog.length > max) {
      store.orgTerritoryReconciliationLog = store.orgTerritoryReconciliationLog.slice(-max);
    }
  },

  filterUpdatesForStoryWorld(updates = [], store = {}) {
    if (this.isRealWorldPlaySession(store)) return updates;
    const skipped = [];
    const kept = (Array.isArray(updates) ? updates : []).filter((item) => {
      if (!this.isOrgTerritoryUpdate(item)) return true;
      skipped.push(item);
      return false;
    });
    if (skipped.length) {
      store.orgTerritoryReconciliationLog = Array.isArray(store.orgTerritoryReconciliationLog) ? store.orgTerritoryReconciliationLog : [];
      store.orgTerritoryReconciliationLog.push({
        at: this.nowLabel(store),
        kind: 'story-world-skip',
        count: skipped.length,
        types: [...new Set(skipped.map((x) => x.updateType))].join('、'),
      });
      this.trimReconciliationLog(store);
      console.info('[orgTerritory] 异世界推演跳过组织/控势结算', skipped.length, '条');
    }
    return kept;
  },

  dedupeOrgTerritoryUpdates(updates = [], store = null) {
    const list = Array.isArray(updates) ? updates.slice() : [];
    const byTerritory = new Map();
    const rest = [];
    list.forEach((item) => {
      if (item?.updateType !== 'territory-control') {
        rest.push(item);
        return;
      }
      const loc = this.settlementSubjectKey(item);
      if (!loc) {
        rest.push(item);
        return;
      }
      if (byTerritory.has(loc)) {
        const prev = byTerritory.get(loc);
        if (store) {
          store.orgTerritoryReconciliationLog = Array.isArray(store.orgTerritoryReconciliationLog) ? store.orgTerritoryReconciliationLog : [];
          store.orgTerritoryReconciliationLog.push({
            at: this.nowLabel(store),
            kind: 'territory-control-dedupe',
            location: loc,
            keptSummary: item?.change?.value?.effectiveOrgId || '',
            droppedSummary: prev?.change?.value?.effectiveOrgId || '',
          });
          this.trimReconciliationLog(store);
        }
        console.warn('[orgTerritory] 同轮控势冲突，保留最后一条:', loc);
      }
      byTerritory.set(loc, item);
    });
    return [...rest, ...Array.from(byTerritory.values())];
  },

  archiveEvictedMapNodes(store, droppedNodes = [], map = {}) {
    const archive = window.GameModules.factionArchive;
    if (!store || !archive || !Array.isArray(droppedNodes) || !droppedNodes.length) return 0;
    let count = 0;
    droppedNodes.forEach((node) => {
      if (!node?.name) return;
      const history = Array.isArray(node.controlHistory) ? node.controlHistory : [];
      const hasCustomControl = node.control && (history.length > 0 || node.control.inherit === false);
      if (!node.revealed && !hasCustomControl) return;
      const mapCtx = map?.nodes?.length ? map : { nodes: [node], current: node.name, currentId: node.id };
      const label = this.resolveControlLabel(mapCtx, node, store);
      const parts = [`[地图节点淘汰] ${node.name}`];
      if (label) parts.push(`末态：${label}`);
      history.slice(0, 8).forEach((h) => {
        const eff = this.orgNameById(store, h.effectiveOrgId);
        const snippet = String(h.reason || '').slice(0, 80);
        parts.push(`${String(h.at || '').slice(0, 19).replace('T', ' ')} 实控${eff}${snippet ? `（${snippet}）` : ''}`);
      });
      const text = parts.join('；');
      const orgNames = [
        this.orgNameById(store, node.control?.effectiveOrgId),
        this.orgNameById(store, node.control?.claimOrgId),
        this.orgNameById(store, node.control?.ownerOrgId),
      ].filter(Boolean);
      archive.appendForRelated(store, text, orgNames, '地图控势归档');
      count += 1;
    });
    if (count) console.info('[orgTerritory] 已归档', count, '个淘汰地图节点的控势历史');
    return count;
  },

  validatePrincipleCompliance(store) {
    store?.initFactionSystem?.();
    const notes = [];
    const profile = store?.playerProfile || {};
    const map = window.GameModules.realWorldMap?.ensure?.(store, profile) || store?.realWorldMap || {};

    (store?.factionState?.factions || []).forEach((faction) => {
      const resolution = String(faction.resolution || 'L1').toUpperCase();
      const isAdmin = faction.kind === 'admin' || faction.kind === 'community';
      if (resolution === 'L1' && !isAdmin && !this.hasArchiveExposure(faction, store) && (faction.structure || []).length > 0) {
        notes.push(`C5：L1 未接触组织「${faction.name}」含 structure，audit 应 strip`);
      }
      if (['L2', 'L3', 'L4'].includes(resolution) && !(faction.changeLog || []).length && !this.hasArchiveExposure(faction, store)) {
        notes.push(`C1：「${faction.name}」已 ${resolution} 但无 changeLog 或 archive 追溯`);
      }
      const deptNames = (faction.structure || []).map((n) => String(n.name || '').trim()).filter(Boolean);
      deptNames.forEach((name) => {
        const dupes = (faction.structure || []).filter((n) => n.name === name && String(n.state || 'sketch') === 'sketch');
        if (dupes.length > 1) notes.push(`C4：「${faction.name}」sketch 期部门「${name}」重复 ${dupes.length} 条，应 id upsert 合并`);
      });
      (faction.structure || []).forEach((node) => {
        (node.roles || []).forEach((role) => {
          if (role.state === 'established' && !(faction.changeLog || []).some((c) => /structure|更改|change/u.test(String(c.action || c.field || '')))) {
            notes.push(`C2：「${faction.name}」职位「${role.title || '未知'}」已 established，changeLog 缺更改记录`);
          }
          if (!role.dutyFog && !role.dutyNote && role.state !== 'fog') {
            notes.push(`C3：「${faction.name}」职位「${role.title || '未知'}」duty 未迷雾但无 dutyNote`);
          }
        });
      });
    });

    const hot = this.territoryHotText(store);
    const hotLocationNames = new Set(String(hot || '').split('\n')
      .map((line) => String(line || '').split('｜')[0].trim())
      .filter(Boolean));
    (map.nodes || []).forEach((node) => {
      if (node.revealed || !node.name) return;
      if (hotLocationNames.has(node.name)) notes.push(`C6：未揭示地点「${node.name}」不应出现在 Territory Hot`);
    });

    const checks = {
      C1: !notes.some((n) => n.startsWith('C1')),
      C2: !notes.some((n) => n.startsWith('C2')),
      C3: !notes.some((n) => n.startsWith('C3')),
      C4: !notes.some((n) => n.startsWith('C4')),
      C5: !notes.some((n) => n.startsWith('C5')),
      C6: !notes.some((n) => n.startsWith('C6')),
    };
    return { ok: notes.length === 0, notes, checks };
  },

  sanitizeAuditFaction(faction = {}, store, existing = null) {
    if (!faction?.name) return null;
    const resolution = String(existing?.resolution || faction.resolution || 'L1').toUpperCase();
    const archiveHit = this.hasArchiveExposure(existing || faction, store);
    const lowExposure = resolution === 'L1' && !archiveHit;
    const isAdmin = faction.kind === 'admin' || faction.kind === 'community' || /^admin-|^community-/.test(String(faction.id || ''));

    if (lowExposure || isAdmin) {
      faction.structure = [];
      faction.resolution = 'L1';
      if (!faction.stub?.oneLine) {
        faction.stub = { oneLine: `${faction.name}（stub，尚未推演接触）` };
      }
    }

    if (isAdmin) {
      faction.resolution = 'L1';
      faction.structure = [];
    }

    if (existing?.resolution === 'L3' || existing?.resolution === 'L4') {
      const establishedNodes = (existing.structure || []).filter((n) => n.state === 'established');
      if (establishedNodes.length && JSON.stringify(faction.structure) !== JSON.stringify(existing.structure)) {
        faction.structure = existing.structure;
      }
    }

    return this.normalizeFaction(faction, store);
  },

  bumpOrgExposureOnMapVisit(store, map, node) {
    if (!store || !node?.id) return false;
    store.initFactionSystem?.();
    const anchorIds = new Set([node.id]);
    const chainNames = new Set([String(node.name || '').trim()].filter(Boolean));
    let walk = node;
    const mapMod = window.GameModules.realWorldMap;
    for (let guard = 0; guard < 8 && walk; guard += 1) {
      if (walk.parentId) anchorIds.add(walk.parentId);
      if (walk.name) chainNames.add(String(walk.name).trim());
      if (!walk.parentId) break;
      walk = (map?.nodes || []).find((item) => item.id === walk.parentId);
    }
    const nodeName = String(node.name || '');
    const now = this.nowLabel(store);
    const bump = (faction, reason) => {
      if (String(faction.resolution || 'L1').toUpperCase() !== 'L1') return false;
      faction.resolution = 'L2';
      faction.resolutionBadge = this.resolutionBadge('L2');
      faction.changeLog = [{ field: 'resolution', reason, at: now, action: 'exposure' }, ...(faction.changeLog || [])].slice(0, 50);
      return true;
    };
    let touched = false;
    (store.factionState?.factions || []).forEach((faction) => {
      if (faction.kind === 'community' || faction.type === '社区') {
        const anchored = (faction.territoryAnchors || []).some((id) => anchorIds.has(id));
        const named = faction.name && nodeName.includes(String(faction.name).replace(/小区|社区/u, '').slice(0, 4));
        if ((anchored || named) && bump(faction, '地图 POI 首访接触')) touched = true;
        return;
      }
      if (faction.kind === 'admin' || faction.type === '行政区') {
        const named = chainNames.has(String(faction.name || '').trim())
          || (faction.location && chainNames.has(String(faction.location).trim()));
        if (named && bump(faction, '政区地图链首访接触')) touched = true;
      }
    });
    return touched;
  },

  resolveMapNodeForLocation(store, locationName = '', map = null) {
    const label = String(locationName || '').trim();
    if (!label) return { map: null, node: null };
    const mapMod = window.GameModules.realWorldMap;
    const m = map || mapMod?.ensure?.(store, store?.playerProfile || {}) || store?.realWorldMap || null;
    if (!m?.nodes) return { map: m, node: null };
    let node = this.findMapNode(m, label);
    if (!node) {
      node = (m.nodes || []).find((n) => this.locationsCompatible(n.name, label));
    }
    if (!node) return { map: m, node: null };
    const anchor = mapMod?.resolveExteriorAnchorNode?.(m, node) || node;
    return { map: m, node: anchor };
  },

  bumpOrgExposureOnScheduleLocation(store, locationName = '') {
    if (!store || !locationName) return false;
    store.initFactionSystem?.();
    const { map, node } = this.resolveMapNodeForLocation(store, locationName);
    if (!map || !node) return false;
    return this.bumpOrgExposureOnMapVisit(store, map, node);
  },

  resolveTerritoryBrief(store, params = {}) {
    const profile = store?.playerProfile || {};
    const mapMod = window.GameModules.realWorldMap;
    const map = mapMod?.ensure?.(store, profile) || store.realWorldMap || {};
    const name = String(params.locationName || params.name || params.keyword || map.current || '').trim();
    if (name) {
      const node = this.findMapNode(map, name);
      if (!node) return `未找到地点：${name}`;
      if (!node.revealed) return `地点「${node.name}」尚未揭示，无控势资料。`;
      const anchor = mapMod?.resolveExteriorAnchorNode?.(map, node) || node;
      const control = this.resolveControl(map, anchor, store);
      const label = this.resolveControlLabel(map, anchor, store);
      const lines = [`地点：${anchor.name}`, `控势：${label}`];
      const ownerId = control.ownerOrgId || control.effectiveOrgId;
      if (ownerId !== control.effectiveOrgId) {
        lines.push(`产权：${this.orgNameById(store, ownerId)}｜管治：${this.orgNameById(store, control.effectiveOrgId)}`);
      }
      if (control.status && control.status !== 'stable') lines.push(`状态：${control.status}`);
      const parent = anchor.parentId ? (map.nodes || []).find((n) => n.id === anchor.parentId) : null;
      if (parent?.revealed) {
        const parentLabel = this.resolveControlLabel(map, parent, store);
        if (parentLabel) lines.push(`上级区域：${parent.name}｜${parentLabel}`);
      }
      return lines.join('\n');
    }
    return `控势摘要（已揭示）：\n${this.territoryHotText(store, 800)}`;
  },


  resolveOrgIdByName(store, name = '') {
    store?.initFactionSystem?.();
    const label = String(name || '').trim();
    if (!label) return '';
    const factions = store?.factionState?.factions || [];
    const hit = factions.find((f) => f.name === label || f.id === label);
    if (hit?.id) return hit.id;
    const slug = store?.factionIdByName?.(label);
    if (slug && factions.some((f) => f.id === slug)) return slug;
    return '';
  },

  orgNameByIdOrLabel(store, orgId = '', fallback = '') {
    const id = String(orgId || '').trim();
    if (id) return this.orgNameById(store, id);
    return String(fallback || '').trim() || '未知组织';
  },

  normalizeMembership(raw = {}, store) {
    const orgName = String(raw.orgName || raw.force || raw.faction || '').trim();
    const orgId = String(raw.orgId || '').trim() || this.resolveOrgIdByName(store, orgName);
    const title = String(raw.title || raw.position || '成员').trim();
    const department = String(raw.department || raw.dept || '').trim();
    return {
      ...raw,
      orgId,
      orgName: orgName || this.orgNameByIdOrLabel(store, orgId, ''),
      title,
      department,
      departmentFog: raw.departmentFog === true || !department,
      since: raw.since || '',
      reason: String(raw.reason || '').slice(0, 240),
      state: this.normalizeItemState(raw.state, title ? 'sketch' : 'fog'),
      displayLine: department && !raw.departmentFog
        ? `${orgName || this.orgNameById(store, orgId)} / ${department} / ${title}`
        : `${orgName || this.orgNameById(store, orgId)} / ${title}${raw.departmentFog !== false && !department ? '（部门：迷雾）' : ''}`,
    };
  },

  syncCharacterOrgMemberships(state, store, options = {}) {
    if (!state?.values) return state;
    const list = Array.isArray(state.values.memberships) ? state.values.memberships : [];
    state.values.memberships = list.map((m) => this.normalizeMembership(m, store));
    if (!options.skipSocialSync) {
      window.GameModules.rpgState?.syncSocialFields?.(state, 'values', store, { skipOrgNormalization: true });
    }
    return state;
  },

  upsertCharacterMembership(state, patch = {}, store) {
    if (!state?.values) return null;
    const mem = this.normalizeMembership(patch, store);
    if (!mem.orgId && !mem.orgName) return null;
    const list = Array.isArray(state.values.memberships) ? state.values.memberships : [];
    const idx = list.findIndex((m) => (mem.orgId && m.orgId === mem.orgId) || (m.orgName === mem.orgName && m.title === mem.title));
    if (idx >= 0) list[idx] = { ...list[idx], ...mem };
    else list.push(mem);
    state.values.memberships = list.map((m) => this.normalizeMembership(m, store));
    window.GameModules.rpgState?.syncSocialFields?.(state, 'values', store, { skipOrgNormalization: true });
    return mem;
  },

  findCharacterStateByName(store, name = '') {
    const label = String(name || '').trim();
    if (!label) return null;
    return Object.values(store?.rpgStates || {}).find((s) => {
      const n = String(s?.profile?.name || s?.name || '').trim();
      return n && (n === label || n.endsWith(label));
    }) || null;
  },

  isCohabitantCharacter(name = '', profile = {}) {
    const label = String(name || '').trim();
    if (!label) return false;
    const blob = [profile.livingStatus, profile.relationships, profile.notes, profile.parents].filter(Boolean).join('；');
    if (!blob.includes(label)) return false;
    return /妹妹|兄弟|姐姐|同住|家庭|三胞胎|亲属|家人/.test(blob);
  },

  ensurePresetFamilyMemberships(store) {
    if (!store) return;
    store.initFactionSystem?.();
    // Bind only when AI already created the family org — never invent family-player-home.
    window.GameModules.app?.orgTerritory?.familyActions?.ensureFamilyOrg?.(store);
    const familyId = 'family-player-home';
    const family = (store.factionState?.factions || []).find((f) => f.id === familyId)
      || (store.factionState?.factions || []).find((f) => f.kind === 'family');
    if (!family) return;
    const profile = store.playerProfile || {};
    const playerName = String(profile.name || profile.playerName || '').trim();

    Object.values(store.rpgStates || {}).forEach((state) => {
      const name = String(state.profile?.name || state.name || '').trim();
      if (!name || name === playerName || state.id === 'player-self') return;
      const rel = String(state.profile?.relationships || state.profile?.role || '').trim();
      if (!this.isCohabitantCharacter(name, profile) && !/妹妹|兄弟|姐姐|同住/.test(rel)) return;
      const title = /妹妹/.test(rel) ? '妹妹' : (/兄弟/.test(rel) ? '兄弟' : (/姐姐/.test(rel) ? '姐姐' : '同住家庭成员'));
      this.upsertCharacterMembership(state, {
        orgId: family.id,
        orgName: family.name,
        title,
        department: '家庭',
        state: 'sketch',
        reason: '玩家资料或预置角色卡确认家庭同住关系（不预填 political）。',
        source: 'preset-family',
      }, store);
    });

    const player = store.playerIdentityState?.();
    if (player) {
      this.upsertCharacterMembership(player, {
        orgId: family.id,
        orgName: family.name,
        title: '户主/同住者',
        department: '家庭',
        state: 'sketch',
        reason: '玩家家庭 org 绑定（仅当 AI 已创建家庭势力）。',
        source: 'preset-family',
      }, store);
    }
  },

  collectFactionMemberships(store, faction = {}) {
    store?.initFactionSystem?.();
    const factionId = faction?.id || '';
    const factionName = faction?.name || '';
    if (!factionId && !factionName) return [];
    const rows = [];
    const seen = new Set();
    const push = (row) => {
      const key = `${row.characterName}|${row.orgId}|${row.title}|${row.source}`;
      if (seen.has(key)) return;
      seen.add(key);
      rows.push(row);
    };

    Object.values(store?.rpgStates || {}).forEach((state) => {
      const characterName = String(state?.profile?.name || state?.name || '未知').trim();
      (state.values?.memberships || []).forEach((raw) => {
        const m = this.normalizeMembership(raw, store);
        if (m.orgId !== factionId && m.orgName !== factionName) return;
        push({
          characterName,
          characterId: state.id,
          orgId: m.orgId,
          orgName: m.orgName,
          title: m.title,
          department: m.departmentFog ? '迷雾' : (m.department || '—'),
          since: m.since,
          reason: m.reason,
          stateBadge: this.stateBadge(m.state),
          source: 'membership',
        });
    });
    });

    (faction.structure || []).forEach((node) => {
      (node.roles || []).forEach((role) => {
        (role.occupants || []).forEach((occ) => {
          if (occ.occupantFog || !occ.name || occ.name === '未知') return;
          push({
            characterName: occ.name,
            characterId: occ.characterId || '',
            orgId: factionId,
            orgName: factionName,
            title: role.displayTitle || role.title || '职位',
            department: node.name || '—',
            since: '',
            reason: occ.reason || role.reason || '',
            stateBadge: this.stateBadge(role.state),
            source: 'structure',
          });
        });
        (role.characters || []).filter((c) => c && c !== '未知').forEach((name) => {
          if ((role.occupants || []).some((o) => o.name === name)) return;
          push({
            characterName: name,
            characterId: '',
            orgId: factionId,
            orgName: factionName,
            title: role.title || '职位',
            department: node.name || '—',
            since: '',
            reason: '',
            stateBadge: this.stateBadge(role.state),
            source: 'structure',
          });
        });
      });
    });

    return rows.sort((a, b) => a.characterName.localeCompare(b.characterName, 'zh-CN'));
  },

  formatControlHistoryEntry(store, item = {}) {
    const at = String(item.at || item.since || '').slice(0, 19).replace('T', ' ');
    const effective = this.orgNameById(store, item.effectiveOrgId);
    const claim = this.orgNameById(store, item.claimOrgId);
    const owner = this.orgNameById(store, item.ownerOrgId || item.effectiveOrgId);
    const status = item.status === 'contested' ? '争夺' : (item.status || 'stable');
    let controlText = effective === claim ? effective : `实控${effective}｜宣称${claim}`;
    if (owner !== effective) controlText = `产权${owner}｜管治${effective}${effective === claim ? '' : `｜宣称${claim}`}`;
    return `${at || '未知时间'}｜${controlText}｜${status}${item.reason ? `｜${item.reason}` : ''}`;
  },

  resolveHomeMapNode(store, activeMap = null) {
    const profile = store?.playerProfile || {};
    const mapMod = window.GameModules.realWorldMap;
    const map = activeMap || mapMod?.ensure?.(store, profile) || store.realWorldMap || {};
    const homeName = mapMod?.inferHomeName?.(profile) || '';
    if (!homeName) return null;
    const exact = this.findMapNode(map, homeName);
    if (exact) return exact;
    return (map.nodes || []).find((node) => {
      const name = String(node.name || '');
      return name && (name.includes(homeName) || homeName.includes(name));
    }) || null;
  },

  controlHistoryForNode(map, node, store) {
    if (!node) return [];
    const mapMod = window.GameModules.realWorldMap;
    const anchor = mapMod?.resolveExteriorAnchorNode?.(map, node) || node;
    const history = Array.isArray(anchor.controlHistory) ? anchor.controlHistory : [];
    const current = this.resolveControl(map, anchor, store);
    const lines = history.map((item) => this.formatControlHistoryEntry(store, item));
    if (current?.since) {
      lines.unshift(`当前｜${this.resolveControlLabel(map, anchor, store)}｜自 ${String(current.since).slice(0, 19).replace('T', ' ')}`);
    }
    return lines.slice(0, 12);
  },

  ORG_STATUSES: ['active', 'rebel', 'independent', 'dissolved', 'merged'],
  ORG_STATUS_LABELS: { active: '活跃', rebel: '起义', independent: '独立', dissolved: '解散', merged: '已合并' },

  normalizeOrgStatus(status, fallback = 'active') {
    const value = String(status || '').trim().toLowerCase();
    return this.ORG_STATUSES.includes(value) ? value : fallback;
  },

  orgStatusLabel(faction = {}) {
    const status = this.normalizeOrgStatus(faction.status);
    const base = this.ORG_STATUS_LABELS[status] || status;
    const leg = faction.legitimacy === 'contested' ? '（合法性争议）' : (faction.legitimacy === 'unrecognized' ? '（未获承认）' : '');
    return status === 'active' && !leg ? '' : `${base}${leg}`;
  },

  warnOnce(key = '', ...args) {
    window.GameModules.orgTerritoryWarned = window.GameModules.orgTerritoryWarned || {};
    const id = String(key || args.join('|')).slice(0, 240);
    if (window.GameModules.orgTerritoryWarned[id]) return;
    window.GameModules.orgTerritoryWarned[id] = true;
    console.warn(...args);
  },

  resolveLiveOrgId(store, orgId = '', seen = null) {
    store?.initFactionSystem?.();
    const chain = seen || new Set();
    let current = String(orgId || '').trim();
    if (!current) return this.defaultCountryOrgId(store);
    for (let guard = 0; guard < 8 && current; guard += 1) {
      if (chain.has(current)) break;
      chain.add(current);
      const faction = (store?.factionState?.factions || []).find((f) => f.id === current);
      if (!faction) {
        this.warnOnce(`invalid-org:${current}`, '[orgTerritory] 无效 orgId，不兜底 invent：', current);
        return '';
      }
      if (faction.status === 'dissolved' || faction.status === 'merged') {
        const next = (faction.successorIds || [])[0];
        if (next) {
          current = next;
          continue;
        }
        this.warnOnce(`dissolved-org-no-successor:${faction.id}`, '[orgTerritory] 已解散/合并 org 无 successor，不兜底 invent：', faction.id);
        return '';
      }
      return faction.id;
    }
    return this.defaultCountryOrgId(store);
  },

  validateWorldConsistency(store) {
    if (!store) return { fixes: [], warnings: [], compliance: null, map: {}, at: new Date().toISOString(), dismissed: false, signature: '' };
    if (store._orgTerritoryValidationRunning) {
      return store.orgTerritoryConsistency || { fixes: [], warnings: [], compliance: null, map: store.realWorldMap || {}, at: new Date().toISOString(), dismissed: false, signature: '' };
    }
    store._orgTerritoryValidationRunning = true;
    store?.initFactionSystem?.();
    const fixes = [];
    const warnings = [];
    const profile = store?.playerProfile || {};
    const map = window.GameModules.realWorldMap?.ensure?.(store, profile) || {};
    (map.nodes || []).forEach((node) => {
      this.normalizeNodeControl(node, map, store);
      const control = node.control;
      if (!control) return;
      const eff = this.resolveLiveOrgId(store, control.effectiveOrgId);
      const claim = this.resolveLiveOrgId(store, control.claimOrgId);
      const owner = this.resolveLiveOrgId(store, control.ownerOrgId || control.effectiveOrgId);
      if (eff !== control.effectiveOrgId) {
        fixes.push(`地图「${node.name}」实控 ${control.effectiveOrgId} → ${eff}`);
        control.effectiveOrgId = eff;
      }
      if (claim !== control.claimOrgId) {
        fixes.push(`地图「${node.name}」宣称 ${control.claimOrgId} → ${claim}`);
        control.claimOrgId = claim;
      }
      if (owner !== (control.ownerOrgId || control.effectiveOrgId)) {
        fixes.push(`地图「${node.name}」产权 ${control.ownerOrgId || control.effectiveOrgId} → ${owner}`);
        control.ownerOrgId = owner;
      }
    });
    window.GameModules.orgTerritory?.ensureMapControls?.(map, store);
    (store?.factionState?.factions || []).forEach((faction) => {
      if (faction.parentId) {
        const liveParent = this.resolveLiveOrgId(store, faction.parentId);
        if (liveParent !== faction.parentId && (faction.status === 'active' || !faction.status)) {
          warnings.push(`势力「${faction.name}」上级 ${faction.parentId} 已失效，建议结算改隶`);
        }
      }
      const status = this.normalizeOrgStatus(faction.status);
      if (status === 'rebel' || status === 'independent') {
        const anchors = Array.isArray(faction.territoryAnchors) ? faction.territoryAnchors : [];
        const hasArchive = this.hasArchiveExposure(faction, store);
        if (!anchors.length && !hasArchive) {
          warnings.push(`势力「${faction.name}」${status} 但无 territoryAnchors 或 archive 夺控/独立依据`);
        }
        const hasBreakRelation = (faction.relations || []).some((r) => /hostile|secession/u.test(String(r.type || r.relation || '')));
        if (!hasBreakRelation && faction.parentId) {
          warnings.push(`势力「${faction.name}」${status} 建议补充 hostile/secession 关系`);
        }
      }
    });

    const company = (store?.factionState?.factions || []).find((f) => f.id === 'company-main');
    if (company && ['dissolved', 'merged'].includes(company.status) && store?.companyState?.employment?.active !== false) {
      warnings.push(`公司 org 已${company.status}，但 employment 仍 active；同步离职`);
      window.GameModules.app?.orgTerritory?.economyActions?.syncEmploymentOnOrgDissolved?.(store, company, '读档一致性校验');
    }

    this.validateLocationConsistency(store, map, warnings);

    const compliance = this.validatePrincipleCompliance(store);
    if (compliance.notes?.length) warnings.push(...compliance.notes);

    const at = store?.phoneDate?.()?.toISOString?.() || new Date().toISOString();
    const prev = store?.orgTerritoryConsistency || {};
    const prevSig = prev.signature || this.consistencySignature(prev);
    const nextSig = this.consistencySignature({ warnings, fixes });
    const repeated = Boolean(prevSig) && prevSig === nextSig;
    if (!repeated) {
      if (fixes.length) console.warn('[orgTerritory] 存档一致性修复:', fixes.join('；'));
      if (warnings.length) console.warn('[orgTerritory] 存档一致性警告:', warnings.join('；'));
    }
    const dismissed = Boolean(prev.dismissed) && prevSig === nextSig;
    const report = { fixes, warnings, compliance, map, at, dismissed, signature: nextSig };
    if (store && (!repeated || !store.orgTerritoryConsistency)) store.orgTerritoryConsistency = report;
    store._orgTerritoryValidationRunning = false;
    return repeated && prev.signature ? prev : report;
  },

  normalizeLocationLabel(name = '') {
    return String(name || '').replace(/\s+/g, '').trim();
  },

  locationsCompatible(a = '', b = '') {
    const left = this.normalizeLocationLabel(a);
    const right = this.normalizeLocationLabel(b);
    if (!left || !right) return true;
    const isUnknown = (value) => /^(?:当前位置未知|未知地点|未知位置|现实地点|当前位置)$/u.test(value);
    if (isUnknown(left) || isUnknown(right)) return true;
    if (left === right) return true;
    return left.includes(right) || right.includes(left);
  },

  validateLocationConsistency(store, map = {}, warnings = []) {
    const mapLoc = String(map.current || store?.realWorldLocationName || '').trim();
    if (!mapLoc) return;
    const playerState = store?.playerIdentityState?.() || store?.rpgStates?.['player-self'];
    const playerLoc = String(window.GameModules.currentLocationField?.mapNodeName?.(playerState?.profile?.currentLocation || '') || playerState?.profile?.currentLocation || '').trim();
    const schedule = store?.characterSchedules?.['player-self'] || store?.characterSchedules?.[playerState?.id];
    const scheduleLoc = String(schedule?.currentLocation || '').trim();

    if (playerLoc && !this.locationsCompatible(mapLoc, playerLoc)) {
      warnings.push(`玩家地图位置「${mapLoc}」与角色卡当前位置「${playerLoc}」不一致`);
    }
    if (scheduleLoc && !this.locationsCompatible(mapLoc, scheduleLoc)) {
      warnings.push(`玩家地图位置「${mapLoc}」与人事安排 currentLocation「${scheduleLoc}」不一致`);
    }

    const node = (map.nodes || []).find((item) => item.id === map.currentId || item.name === mapLoc);
    if (!node) return;
    const control = this.resolveControl(map, node, store);
    if (control?.status === 'contested' || control?.status === 'disputed') {
      if (playerLoc && !this.locationsCompatible(mapLoc, playerLoc)) {
        warnings.push(`POI「${node.name}」控势为 ${control.status}，地图/身份/人事位置应一致`);
      }
    }
  },

  inferFamilyOrgName(profile = {}) {
    const name = String(profile.name || profile.playerName || '玩家').trim();
    const home = String(profile.refinedCity || profile.city || '').trim();
    if (name && home) return `${name}家庭（${home.slice(0, 12)}）`;
    if (name) return `${name}家庭`;
    return '玩家家庭';
  },
};
