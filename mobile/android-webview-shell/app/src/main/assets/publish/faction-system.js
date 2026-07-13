window.GameModules = window.GameModules || {};

window.GameModules.factionSystem = {
  defaultState(profile = {}) {
    const country = this.countryFaction(profile);
    const company = this.companyFaction(profile, country);
    const factions = [country, company].filter(Boolean);
    return {
      open: false,
      detailOpen: false,
      orgChartOpen: false,
      orgChartMode: 'forest',
      forestTab: 'corp',
      generating: false,
      error: '',
      requestId: 0,
      selectedId: factions[0]?.id || '',
      customPrompt: '',
      showAllStubs: false,
      factions,
    };
  },

  realWorldTag() {
    return window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';
  },

  profileWorldTag(profile = {}) {
    const raw = String(profile.worldTag?.value || profile.worldTag || profile.work || '').trim();
    const normalized = window.GameModules.characterQuery?.normalizeWorldTag?.(raw);
    return String(normalized || raw).trim();
  },

  isRealWorldProfile(profile = {}) {
    const worldTag = this.profileWorldTag(profile);
    if (!worldTag) return false;
    return Boolean(
      window.GameModules.characterQuery?.isRealWorldTag?.(worldTag)
      || ['现实世界', '现代都市现实世界', this.realWorldTag()].includes(worldTag),
    );
  },

  inferTopCountry(profile = {}) {
    const text = [
      profile.country,
      profile.nationality,
      profile.refinedCity,
      profile.city,
      profile.refinedRole,
      profile.dailyRole,
      profile.role,
      profile.work,
      profile.worldbuildingNote,
      profile.notes,
      profile.detail,
    ].filter(Boolean).join(' ');

    const facts = [
      {
        id: 'country-usa',
        name: '美利坚合众国',
        location: '北美',
        hints: /美国|美利坚|USA|U\.S\.|United States|American|纽约|洛杉矶|旧金山|华盛顿|加州/i,
      },
      {
        id: 'country-japan',
        name: '日本国',
        location: '东亚',
        hints: /日本|Japan|Japanese|东京|大阪|京都/i,
      },
      {
        id: 'country-uk',
        name: '大不列颠及北爱尔兰联合王国',
        location: '西欧',
        hints: /英国|英格兰|United Kingdom|Britain|British|伦敦/i,
      },
      {
        id: 'country-france',
        name: '法兰西共和国',
        location: '西欧',
        hints: /法国|France|French|巴黎/i,
      },
      {
        id: 'country-china',
        name: '中华人民共和国',
        location: '东亚',
        hints: /中国|中华人民共和国|中华人民共和國|China|Chinese|北京|上海|广州|深圳|成都/i,
      },
    ];

    const matched = facts.find((item) => item.hints.test(text));
    if (matched) return { id: matched.id, name: matched.name, location: matched.location };
    if (this.isRealWorldProfile(profile)) return { id: 'country-china', name: '中华人民共和国', location: '东亚' };
    return null;
  },

  emptyOverviewPanels() {
    return window.GameModules.orgTerritory?.defaultOverviewPanels?.()
      || { ideology: {}, economy: { entries: {} }, politics: { entries: {} }, military: { entries: {} }, diplomacy: { entries: {} } };
  },

  countryFaction(profile = {}) {
    const top = this.inferTopCountry(profile);
    if (!top?.id || !top?.name) return null;
    return {
      id: top.id,
      name: top.name,
      type: '国家',
      classification: 'country',
      orgDomain: 'country',
      sovereign: true,
      parentId: '',
      parentName: '无势力归属',
      level: '国家级',
      location: top.location || String(profile.refinedCity || profile.city || '').trim(),
      domain: '',
      scale: '',
      stance: '',
      influence: 0,
      description: '初始国家法域 L1 stub，待 AI 与推演补全。',
      resolution: 'L1',
      stub: { oneLine: `${top.name}（国家级法域 stub，待推演补全）` },
      status: 'active',
      solid: { overviewPanels: this.emptyOverviewPanels() },
      structure: [],
      rules: [],
      resources: [],
      relations: [],
      fieldReasons: this.defaultReasons('初始国家法域仅固定骨架；具体内容由 AI 与推演逐步补全。'),
      fixed: true,
      updatedAt: new Date().toISOString(),
    };
  },

  companyFaction(profile = {}, country = null) {
    const name = String(profile.workplace || profile.companyName || profile.company || '').trim();
    if (!name) return null;
    const parentCountry = country || this.countryFaction(profile);
    const forest = window.GameModules.factionOrgForest;
    const corpParentId = parentCountry?.id ? (forest?.domainRootId?.(parentCountry.id, 'corp') || parentCountry.id) : '';
    const corpParentName = corpParentId ? (forest?.DOMAIN_LABELS?.corp || '经济组织') : '无势力归属';
    return {
      id: 'company-main',
      name,
      type: /工作室|studio/i.test(name) ? '工作室' : '公司',
      classification: 'faction',
      orgDomain: 'corp',
      ownership: 'private',
      foundingType: 'independent',
      parentId: corpParentId,
      parentName: corpParentName,
      level: '公司级',
      location: String(profile.refinedCity || profile.city || '').trim(),
      domain: '',
      scale: '',
      stance: '',
      influence: 0,
      description: '当前组织 L1 stub，待公司上下文、AI 与推演补全。',
      resolution: 'L1',
      stub: { oneLine: `${name}（组织 stub，待推演补全）` },
      status: 'active',
      solid: { overviewPanels: this.emptyOverviewPanels() },
      structure: [],
      rules: [],
      resources: [],
      relations: [],
      fieldReasons: this.defaultReasons('当前组织仅固定骨架；具体内容由 AI、公司上下文与推演补全。'),
      fixed: true,
      updatedAt: new Date().toISOString(),
    };
  },

  defaultReasons(text) {
    return [
      'name', 'type', 'classification', 'parentId', 'parentName', 'level', 'location', 'domain', 'scale',
      'stance', 'influence', 'description', 'structure', 'rules', 'resources', 'relations',
    ].reduce((out, key) => {
      out[key] = text;
      return out;
    }, {});
  },
};
