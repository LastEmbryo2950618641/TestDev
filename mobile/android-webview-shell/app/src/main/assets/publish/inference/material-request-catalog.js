window.GameModules = window.GameModules || {};
window.GameModules.realWorldAgentContextParts = window.GameModules.realWorldAgentContextParts || {};

window.GameModules.realWorldAgentContextParts.materialRequestCatalog = {
  worldLabel() {
    return window.GameModules.realWorld2026?.label || '2026现代都市现实世界';
  },


  splitChineseRequestLine(line = '') {
    const body = String(line || '').replace(/^资料请求\d+\s*[：:]/u, '').trim();
    return body.split(/[，,、；;]/u).map((part) => part.trim()).filter(Boolean);
  },


  guidedMaterialRequestCatalog(mode = 'real') {
    const world = () => this.worldLabel();
    return [
      { mode: 'both', category: '角色查询', action: '搜索角色卡', skill: 'character.query', method: 'searchCharacterProfile', requiredParams: ['name'], buildParams: (p) => ({ name: p[0] || '', world: p[1] || world() }) },
      { mode: 'both', category: '角色查询', action: '已知角色列表', skill: 'character.query', method: 'listKnownCharacters', requiredParams: [], buildParams: (p) => ({ world: p[0] || world() }) },
      { mode: 'real', category: '地点查询', action: '当前地点上下文', skill: 'realworld.location.query', method: 'getCurrentLocationContext', requiredParams: [], buildParams: (p) => ({ world: p[0] || world() }) },
      { mode: 'real', category: '地点查询', action: '查询附近地点', skill: 'realworld.location.query', method: 'getNearbyLocations', requiredParams: ['locationName'], buildParams: (p) => ({ locationName: p[0] || '', world: p[1] || world() }) },
      { mode: 'real', category: '地点查询', action: '搜索地点', skill: 'realworld.location.query', method: 'searchLocationOne', requiredParams: ['keyword'], buildParams: (p) => ({ keyword: p[0] || '', world: p[1] || world() }) },
      { mode: 'both', category: '世界线查询', action: '按关键词搜索', skill: 'realworld.history.query', method: 'searchWorldlineByKeyword', requiredParams: ['keyword'], buildParams: (p) => ({ keyword: p[0] || '', world: p[1] || world() }) },
      { mode: 'both', category: '世界线查询', action: '按时间搜索', skill: 'realworld.history.query', method: 'searchWorldlineByTime', requiredParams: ['time'], buildParams: (p) => ({ time: p[0] || '', keyword: p[1] || '', world: p[2] || world() }) },
      { mode: 'real', category: '新闻查询', action: '最新热榜', skill: 'news.query', method: 'getLatestHotlist', requiredParams: [], buildParams: (p) => ({ world: p[0] || world() }) },
      { mode: 'both', category: '记忆查询', action: '搜索角色记忆窗口', skill: 'memory.query', method: 'searchCharacterMemoryWindow', requiredParams: ['keyword'], buildParams: (p) => ({ characterId: p[0] || '', keyword: p[1] || '' }) },
      { mode: 'real', category: '微信查询', action: '联系人列表', skill: 'wechat.query', method: 'listContacts', requiredParams: [], buildParams: (p) => ({ world: p[0] || world() }) },
      { mode: 'real', category: '微信查询', action: '会话片段', skill: 'wechat.query', method: 'getThread', requiredParams: ['contactId'], buildParams: (p) => ({ contactId: p[0] || '', count: Number(p[1]) || 5 }) },
      { mode: 'real', category: '公司查询', action: '工作上下文', skill: 'company.query', method: 'getWorkContext', requiredParams: [], buildParams: (p) => ({ companyName: p[0] || '' }) },
      { mode: 'real', category: '势力查询', action: '势力列表', skill: 'faction.query', method: 'listFactions', requiredParams: [], buildParams: (p) => ({ world: p[0] || world() }) },
      { mode: 'real', category: '势力查询', action: '搜索势力', skill: 'faction.query', method: 'searchFactionOne', requiredParams: ['keyword'], buildParams: (p) => ({ keyword: p[0] || '' }) },
      { mode: 'real', category: '势力查询', action: '势力字段', skill: 'faction.query', method: 'getFactionField', requiredParams: ['id'], buildParams: (p) => ({ id: p[0] || '', panel: p[1] || '', field: p[2] || '', world: p[3] || world() }) },
      { mode: 'real', category: '势力查询', action: '势力档案', skill: 'faction.query', method: 'searchFactionArchive', requiredParams: ['keyword'], buildParams: (p) => ({ keyword: p[0] || '', world: p[1] || world() }) },
      { mode: 'real', category: '势力查询', action: '人事归属', skill: 'faction.query', method: 'listMemberships', requiredParams: [], buildParams: (p) => ({ name: p[0] || '', world: p[1] || world() }) },
      { mode: 'real', category: '势力查询', action: '势力详情', skill: 'faction.query', method: 'getFactionDetail', requiredParams: ['name'], buildParams: (p) => ({ name: p[0] || '', world: p[1] || world() }) },
      {
        mode: 'real',
        category: '势力查询',
        action: '创建势力',
        skill: 'faction.query',
        method: 'createFaction',
        requiredParams: ['name'],
        buildParams: (p) => {
          const name = p[0] || '';
          const type = p[1] || (/公司|有限|集团|工作室|企业/.test(name) ? '公司' : (/学校|大学|学院|中学/.test(name) ? '学校' : '组织'));
          const classification = p[2] || (/国家|政府|机关/.test(type) ? 'country' : 'community');
          return {
            name,
            type,
            classification,
            worldTag: p[3] || world(),
            level: '组织级',
            description: `Stage1 据上下文补全创建的现实势力：${name}`,
            reason: 'Stage1：上下文出现且势力列表未收录的现实势力，按已有资料与常识补全创建。',
          };
        },
      },
      { mode: 'real', category: '控势查询', action: '控势摘要', skill: 'faction.query', method: 'resolveTerritoryBrief', requiredParams: [], buildParams: (p) => ({ locationName: p[0] || '', world: p[1] || world() }) },
      { mode: 'real', category: '控势查询', action: '地点控势详情', skill: 'faction.query', method: 'getTerritoryControl', requiredParams: ['locationName'], buildParams: (p) => ({ locationName: p[0] || '', world: p[1] || world() }) },
      { mode: 'both', category: '物品查询', action: '角色物品', skill: 'item.query', method: 'listCharacterItems', requiredParams: ['target'], buildParams: (p) => ({ target: p[0] || '' }) },
      { mode: 'both', category: '物品查询', action: '搜索已知物品', skill: 'item.query', method: 'searchKnownItem', requiredParams: ['keyword'], buildParams: (p) => ({ keyword: p[0] || '' }) },
    ];
  },


  stage1MaterialCatalogText(mode = 'real') {
    const lines = [];
    const seen = new Map();
    this.guidedMaterialRequestCatalog(mode).forEach((item) => {
      if (!(item.mode === 'both' || item.mode === mode)) return;
      const list = seen.get(item.category) || [];
      if (!list.includes(item.action)) list.push(item.action);
      seen.set(item.category, list);
    });
    seen.forEach((actions, category) => lines.push(`${category}：${actions.join('、')}`));
    return lines.join('\n') || '无可请求资料';
  },


  parseChineseMaterialRequest(line = '', options = {}) {
    const mode = options.mode || 'real';
    const parts = this.splitChineseRequestLine(line);
    if (parts.length < 2) return null;
    let [category, action, ...params] = parts;
    if (category === '地点查询' && /^查询[^附近]/u.test(action)) {
      params = [action.replace(/^查询/u, '').trim(), ...params];
      action = '搜索地点';
    }
    const entry = this.guidedMaterialRequestCatalog(mode).find((item) => (item.mode === 'both' || item.mode === mode) && item.category === category && item.action === action);
    if (!entry) return null;
    const built = entry.buildParams(params, options);
    const required = Array.isArray(entry.requiredParams) ? entry.requiredParams : Object.keys(built).filter((key) => key !== 'world');
    if (required.some((key) => built[key] === '' || built[key] === undefined)) return null;
    return { skill: entry.skill, method: entry.method, params: built, sourceText: String(line || '').trim() };
  },


  participantProfileRequests(data = {}) {
    const forbidden = new Set((data.forbiddenParticipants || []).map((item) => String(item?.name || item || '').trim()).filter(Boolean));
    const seen = new Set();
    const requests = [];
    const add = (items = []) => {
      for (const item of items || []) {
        const name = String(item?.name || item || '').trim();
        if (!name || forbidden.has(name) || seen.has(name) || requests.length >= 3) continue;
        seen.add(name);
        requests.push({ skill: 'character.query', method: 'searchCharacterProfile', params: { name, world: this.worldLabel() } });
      }
    };
    add(data.forcedParticipants);
    add(data.priorityCandidates);
    add(data.dramaCandidates);
    return requests;
  },


  sceneAnchorRequests(data = {}) {
    const queries = data.sceneQueries || {};
    const requests = [{ skill: 'realworld.location.query', method: 'getCurrentLocationContext', params: { world: this.worldLabel() } }];
    (queries.location || []).forEach((keyword) => {
      const text = String(keyword || '').trim();
      if (text) requests.push({ skill: 'realworld.location.query', method: 'searchLocationOne', params: { keyword: text, world: this.worldLabel() } });
    });
    (queries.causality || []).forEach((keyword) => {
      const text = String(keyword || '').trim();
      if (text) requests.push({ skill: 'realworld.history.query', method: 'searchWorldlineByKeyword', params: { keyword: text, world: this.worldLabel() } });
    });
    (queries.conflict || []).forEach((keyword) => {
      const text = String(keyword || '').trim();
      if (text) requests.push({ skill: 'memory.query', method: 'searchCharacterMemoryWindow', params: { characterId: '', keyword: text } });
    });
    return requests.slice(0, 4);
  },

};
