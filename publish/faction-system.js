window.GameModules = window.GameModules || {};

window.GameModules.factionSystem = {
  defaultState(profile = {}) {
    const country = this.countryFaction(profile);
    const company = this.companyFaction(profile, country.id);
    return { open: false, detailOpen: false, orgChartOpen: false, generating: false, error: '', requestId: 0, selectedId: company.id, customPrompt: '', factions: [country, company] };
  },

  countryFaction(profile = {}) {
    return {
      id: 'country-china', name: '中华人民共和国', type: '国家', parentId: '', parentName: '无势力归属', level: '国家级',
      location: '东亚', domain: '国家治理', scale: '超大型', stance: '现实秩序维护', influence: 95,
      description: '玩家所在现代现实世界的国家级势力，提供法律、行政区划、公共服务和节假日规则。',
      structure: [
        { name: '中华人民共和国政府', level: '国家级别', roles: [{ title: '国家主席', count: 1, characters: ['未知'] }] },
        { name: '全国人民代表大会', level: '中央级别', roles: [{ title: '会议主席', count: 1, characters: ['未知'] }, { title: '代表', count: '未知', characters: ['未知'] }] },
        { name: '最高人民法院', level: '中央级别', roles: [{ title: '院长', count: 1, characters: ['未知'] }, { title: '法官', count: '未知', characters: ['未知'] }] },
        { name: profile.refinedCity || profile.city || '玩家所在地政府', level: '地方级别', roles: [{ title: '地方行政负责人', count: 1, characters: ['未知'] }] },
      ],
      rules: ['所有公司、学校、工作室等现实组织默认归属于所在国家。', '国家级规则优先于普通组织规则。'],
      resources: ['法律体系', '行政资源', '公共基础设施'], relations: [], fieldReasons: this.defaultReasons('国家级上下文初始化字段，作为公司等现实组织归属基准。'), fixed: true, updatedAt: new Date().toISOString(),
    };
  },

  companyFaction(profile = {}, parentId = 'country-china') {
    const name = profile.workplace || '成都星河云栈科技有限公司';
    return {
      id: 'company-main', name, type: /工作室|studio/i.test(name) ? '工作室' : '公司', parentId, parentName: '中华人民共和国', level: '公司级',
      location: profile.refinedCity || profile.city || '现实城市未登记', domain: '现代服务业', scale: '中小型', stance: '雇佣与经营', influence: 35,
      description: '玩家当前工作或默认关联的公司势力，归属于国家级势力。',
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
