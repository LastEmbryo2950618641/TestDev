window.GameModules = window.GameModules || {};

window.GameModules.factionSystem = {
  defaultState(profile = {}) {
    const country = this.countryFaction(profile);
    const company = this.companyFaction(profile, country);
    return { open: false, detailOpen: false, orgChartOpen: false, generating: false, error: '', requestId: 0, selectedId: company.id, customPrompt: '', factions: [country, company] };
  },

  inferTopCountry(profile = {}) {
    const text = [profile.country, profile.nationality, profile.refinedCity, profile.city, profile.refinedRole, profile.dailyRole, profile.role, profile.work, profile.worldbuildingNote, profile.notes, profile.detail].filter(Boolean).join(' ');
    if (/美国|美利坚|USA|U\.S\.|United States|American|纽约|洛杉矶|旧金山|华盛顿|加州/i.test(text)) return { id: 'country-usa', name: '美利坚合众国', location: '北美', gov: '美利坚合众国联邦政府', head: '总统' };
    if (/日本|Japan|Japanese|东京|大阪|京都/i.test(text)) return { id: 'country-japan', name: '日本国', location: '东亚', gov: '日本国政府', head: '内阁总理大臣' };
    if (/英国|英格兰|United Kingdom|Britain|British|伦敦/i.test(text)) return { id: 'country-uk', name: '大不列颠及北爱尔兰联合王国', location: '西欧', gov: '英国政府', head: '首相' };
    if (/法国|France|French|巴黎/i.test(text)) return { id: 'country-france', name: '法兰西共和国', location: '西欧', gov: '法兰西共和国政府', head: '总统' };
    return { id: 'country-china', name: '中华人民共和国', location: '东亚', gov: '中华人民共和国政府', head: '国家主席' };
  },

  countryFaction(profile = {}) {
    const top = this.inferTopCountry(profile);
    return {
      id: top.id, name: top.name, type: '国家', parentId: '', parentName: '无势力归属', level: '国家级',
      location: top.location, domain: '国家治理', scale: '超大型', stance: '现实秩序维护', influence: 95,
      description: '根据玩家/主角现实资料推断出的最高国家级势力，作为公司、学校和组织归属基准。',
      structure: [
        { name: top.gov, level: '国家级别', roles: [{ title: top.head, count: 1, characters: ['未知'] }] },
      ],
      rules: ['公司、学校、工作室等现实组织默认归属于主角所在最高势力。', '国家级规则优先于普通组织规则。'],
      resources: ['法律体系', '行政资源', '公共基础设施'], relations: [], fieldReasons: this.defaultReasons('根据玩家/主角资料推断最高国家级势力；无明确国家证据时默认中华人民共和国。'), fixed: true, updatedAt: new Date().toISOString(),
    };
  },

  companyFaction(profile = {}, country = null) {
    const name = profile.workplace || '成都星河云栈科技有限公司';
    const parent = country || this.countryFaction(profile);
    return {
      id: 'company-main', name, type: /工作室|studio/i.test(name) ? '工作室' : '公司', parentId: parent.id, parentName: parent.name, level: '公司级',
      location: profile.refinedCity || profile.city || '现实城市未登记', domain: '现代服务业', scale: '中小型', stance: '雇佣与经营', influence: 35,
      description: '玩家当前工作或默认关联的公司势力，归属于主角/玩家所在最高国家级势力。',
      structure: [], rules: ['内部组织结构由AI按现实合理性生成后固化。'], resources: ['雇佣关系', '薪酬制度', '工作任务'], relations: [], fieldReasons: this.defaultReasons('当前公司上下文初始化字段，后续由AI全量检视补全理由与组织构成。'), fixed: true, updatedAt: new Date().toISOString(),
    };
  },

  defaultReasons(text) {
    return ['name', 'type', 'parentId', 'parentName', 'level', 'location', 'domain', 'scale', 'stance', 'influence', 'description', 'structure', 'rules', 'resources', 'relations'].reduce((out, key) => {
      out[key] = text;
      return out;
    }, {});
  },
};
