window.GameModules = window.GameModules || {};
window.GameModules.realWorldAgentContextParts = window.GameModules.realWorldAgentContextParts || {};

window.GameModules.realWorldAgentContextParts.materialRequestCatalog = {
  worldLabel() {
    return window.GameModules.realWorld2026?.label || '2026现代都市现实世界';
  },
  looksLikeCharacterIdToken(value = '') {
    const text = String(value || '').trim();
    return /^(?:player-self|rel-ai-|force-|npc-|boss-|c\\d+|[a-z][a-z0-9_-]{3,})/iu.test(text);
  },

  normalizeMemoryWindowParams(params = []) {
    const first = String(params?.[0] || '').trim();
    const second = String(params?.[1] || '').trim();
    if (!second) return { characterId: '', keyword: first };
    if (this.looksLikeCharacterIdToken(first)) {
      return { characterId: first, keyword: second };
    }
    return { characterId: '', keyword: [first, second].filter(Boolean).join(' ') };
  },

  factionRequestReason(name = '', type = '') {
    const typeText = String(type || '').trim() || '组织';
    return `Stage1：上下文出现且势力列表未收录的现实${typeText}“${name || '未命名势力'}”，按已有资料与常识补全创建。`;
  },

  inferFactionType(name = '', rawType = '') {
    const text = String(rawType || '').trim();
    if (text) return text;
    const source = String(name || '');
    if (/家庭|家族/.test(source)) return '家庭';
    if (/学校|大学|学院|中学|小学|幼儿园/.test(source)) return '学校';
    if (/政府|机关|委员会|办事处|公安|法院|检察院/.test(source)) return '机关';
    if (/公司|有限|集团|工作室|企业|科技|科创/.test(source)) return '公司';
    return '组织';
  },

  inferFactionLocation(name = '', store = null) {
    const text = String(name || '').trim();
    const match = text.match(/[（(]([^()（）]{2,40})[)）]/u);
    const bracketLocation = String(match?.[1] || '').replace(/[-—–_]+$/u, '').replace(/\s+/gu, '').trim();
    if (bracketLocation) return bracketLocation;
    const current = String(store?.realWorldLocationName || store?.realWorldSceneLocation || '').trim();
    return current || '未知';
  },

  defaultFactionStructure(name = '', type = '') {
    const typeText = this.inferFactionType(name, type);
    if (typeText === '公司') {
      return [
        { name: '管理层', roles: [{ title: '负责人', characters: ['未知'] }] },
        { name: '执行层', roles: [{ title: '成员', characters: ['未知'] }] },
      ];
    }
    if (typeText === '家庭') {
      return [
        { name: '家庭成员', roles: [{ title: '家庭成员', characters: ['未知'] }] },
      ];
    }
    if (typeText === '学校') {
      return [
        { name: '校方管理', roles: [{ title: '负责人', characters: ['未知'] }] },
        { name: '教学与学生', roles: [{ title: '教师', characters: ['未知'] }, { title: '学生', characters: ['未知'] }] },
      ];
    }
    if (typeText === '机关') {
      return [
        { name: '负责人', roles: [{ title: '负责人', characters: ['未知'] }] },
        { name: '执行部门', roles: [{ title: '工作人员', characters: ['未知'] }] },
      ];
    }
    return [
      { name: '核心成员', roles: [{ title: '成员', characters: ['未知'] }] },
    ];
  },

  overviewField(value, reason = '', unit = '') {
    return { value, reason, unit };
  },

  overviewList(value = [], reason = '') {
    return { value, reason };
  },

  defaultFactionOverview(name = '', type = '', location = '', worldTag = '') {
    const typeText = this.inferFactionType(name, type);
    const reason = this.factionRequestReason(name, typeText);
    const ideologyReason = typeText === '家庭'
      ? '围绕共同生活、亲缘关系与家庭责任形成。'
      : (typeText === '公司'
        ? '围绕经营、雇佣、项目推进与工作协作形成。'
        : (typeText === '学校'
          ? '围绕教学、管理、校园秩序与学习活动形成。'
          : (typeText === '机关'
            ? '围绕行政管理、公共事务执行与组织层级形成。'
            : '围绕持续协作、共同事务或稳定互动形成。')));
    const base = typeText === '家庭'
      ? '以共同生活成员、亲缘与家庭分工参与。'
      : (typeText === '公司'
        ? '以岗位、雇佣关系、项目分工与日常工作参与。'
        : (typeText === '学校'
          ? '以教师、学生与校方管理关系参与。'
          : (typeText === '机关'
            ? '以岗位、层级与事务职责参与。'
            : '以成员身份、分工与持续互动参与。')));
    const econAssets = typeText === '家庭'
      ? '以家庭成员、住房条件与日常财物为主要资产基础。'
      : (typeText === '公司'
        ? '以人员、办公条件、业务资料与经营资源为主要资产基础。'
        : (typeText === '学校'
          ? '以校舍、师资、教学资源与学生规模为主要资产基础。'
          : '以成员、人力、活动条件与日常资源为主要资产基础。'));
    const econSystem = typeText === '公司'
      ? '按经营、项目推进、岗位分工与收益支出运作。'
      : (typeText === '家庭'
        ? '按共同生活、家庭开支与成员协作运作。'
        : (typeText === '学校'
          ? '按教学安排、校务管理与校园日程运作。'
          : (typeText === '机关'
            ? '按职责分工、流程审批与事务执行运作。'
            : '按成员协作与日常事务安排运作。')));
    const regime = typeText === '家庭'
      ? '以家庭内部分工与共同生活规则维持秩序。'
      : (typeText === '公司'
        ? '以负责人决策、岗位分工与项目协同维持秩序。'
        : (typeText === '学校'
          ? '以校方管理、教学安排与学生管理维持秩序。'
          : (typeText === '机关'
            ? '以层级管理、职责分工与事务流程维持秩序。'
            : '以核心成员协调与共同规则维持秩序。')));
    const diplomacy = typeText === '家庭'
      ? '以亲属、邻里与日常社会接触为主。'
      : (typeText === '公司'
        ? '以业务往来、招聘协作与对外沟通为主。'
        : (typeText === '学校'
          ? '以校内外教学管理、家校与社会联系为主。'
          : (typeText === '机关'
            ? '以对内协调与对外事务沟通为主。'
            : '以成员互动与外部接触为主。')));
    return {
      ideology: {
        core: this.overviewField(`${name}作为${typeText}已在当前现实上下文中被识别为独立组织单元。`, reason),
        reason: this.overviewField(ideologyReason, reason),
        description: this.overviewField(`当前已确认存在“${name}”这一${typeText}${location && location !== '未知' ? `，活动位置与“${location}”有关` : ''}。`, reason),
        base: this.overviewField(base, reason),
        legitimacy: this.overviewField(typeText === '家庭' ? 65 : 45, reason, '/100'),
      },
      economy: {
        entries: {
          assets: this.overviewField(econAssets, reason),
          system: this.overviewField(econSystem, reason),
          institutions: this.overviewList([{ name: typeText === '家庭' ? '家庭事务' : (typeText === '公司' ? '日常经营' : (typeText === '学校' ? '校务管理' : '组织事务')), description: `${name}当前已确认存在的基础运作单元。` }], reason),
        },
      },
      politics: {
        entries: {
          regime: this.overviewField(regime, reason),
          powerStructure: this.overviewField(typeText === '家庭' ? '以家庭核心成员与共同分工协调。' : '以负责人—成员结构协调。', reason),
          leadership: this.overviewField('当前已确认存在负责人或核心成员，但具体人名待后续正文确认。', reason),
          institutions: this.overviewList([{ name: typeText === '家庭' ? '家庭分工' : '基础管理', description: `${name}当前已确认存在最小管理结构。` }], reason),
        },
      },
      military: {
        entries: {
          posture: this.overviewField(typeText in { '家庭':1, '公司':1, '学校':1 } ? '无正式武装，默认按日常安保/自保处理。' : '未见正式武装迹象，默认按非军事组织处理。', reason),
          personnel: this.overviewField('未确认专门武装人员。', reason),
          quality: this.overviewField('当前未见成体系军事能力。', reason),
        },
      },
      diplomacy: {
        entries: {
          posture: this.overviewField('以现实日常接触与组织边界互动为主。', reason),
          orientation: this.overviewField(diplomacy, reason),
          presence: this.overviewField(location && location !== '未知' ? `当前主要活动痕迹与“${location}”有关。` : `${name}已在当前现实世界上下文中出现。`, reason),
        },
      },
      territory: {
        entries: {
          adminDivision: this.overviewField(location || '未知', reason),
        },
      },
    };
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
      {
        mode: 'both',
        category: '记忆查询',
        action: '搜索角色记忆窗口',
        skill: 'memory.query',
        method: 'searchCharacterMemoryWindow',
        requiredParams: ['keyword'],
        buildParams: (p) => this.normalizeMemoryWindowParams(p),
        validateParams: (built) => Boolean(String(built?.characterId || '').trim() || String(built?.keyword || '').trim()),
      },
      { mode: 'real', category: '微信查询', action: '联系人列表', skill: 'wechat.query', method: 'listContacts', requiredParams: [], buildParams: (p) => ({ world: p[0] || world() }) },
      { mode: 'real', category: '微信查询', action: '会话片段', skill: 'wechat.query', method: 'getThread', requiredParams: ['contactId'], buildParams: (p) => ({ contactId: p[0] || '', count: Number(p[1]) || 5 }) },
      { mode: 'real', category: '工作查询', action: '工作上下文', skill: 'company.query', method: 'getWorkContext', requiredParams: [], buildParams: (p) => ({ companyName: p[0] || '' }) },
      { mode: 'real', category: '势力查询', action: '势力列表', skill: 'faction.query', method: 'listFactions', requiredParams: [], buildParams: (p) => ({ world: p[0] || world() }) },
      { mode: 'real', category: '势力查询', action: '搜索势力', skill: 'faction.query', method: 'searchFactionOne', requiredParams: ['keyword'], buildParams: (p) => ({ keyword: p[0] || '' }) },
      { mode: 'real', category: '势力查询', action: '势力字段', skill: 'faction.query', method: 'getFactionField', requiredParams: ['id'], buildParams: (p) => ({ id: p[0] || '', panel: p[1] || '', field: p[2] || '', world: p[3] || world() }) },
      { mode: 'real', category: '势力查询', action: '势力档案', skill: 'faction.query', method: 'searchFactionArchive', requiredParams: ['keyword'], buildParams: (p) => ({ keyword: p[0] || '', world: p[1] || world() }) },
      { mode: 'real', category: '势力查询', action: '人事归属', skill: 'faction.query', method: 'listMemberships', requiredParams: [], buildParams: (p) => ({ name: p[0] || '', world: p[1] || world() }) },
      { mode: 'real', category: '势力查询', action: '势力详情', skill: 'faction.query', method: 'getFactionDetail', requiredParams: ['name'], buildParams: (p) => ({ name: p[0] || '', world: p[1] || world() }) },
      { mode: 'real', category: '控势查询', action: '控势摘要', skill: 'faction.query', method: 'resolveTerritoryBrief', requiredParams: [], buildParams: (p) => ({ locationName: p[0] || '', world: p[1] || world() }) },
      { mode: 'real', category: '控势查询', action: '地点控势详情', skill: 'faction.query', method: 'getTerritoryControl', requiredParams: ['locationName'], buildParams: (p) => ({ locationName: p[0] || '', world: p[1] || world() }) },
      { mode: 'both', category: '物品查询', action: '角色物品', skill: 'item.query', method: 'listCharacterItems', requiredParams: ['target'], buildParams: (p) => ({ target: p[0] || '' }) },
      { mode: 'both', category: '物品查询', action: '搜索已知物品', skill: 'item.query', method: 'searchKnownItem', requiredParams: ['keyword'], buildParams: (p) => ({ keyword: p[0] || '' }) },
    ];
  },


  stage1MaterialCatalogText(mode = 'real') {
    const visible = this.guidedMaterialRequestCatalog(mode)
      .filter((item) => (item.mode === 'both' || item.mode === mode) && !/^创建|新增|写入|修改|删除|发送|转移|patch|create|upsert|add|set|delete/u.test(`${item.action} ${item.method}`));
    const lines = visible.map((item) => {
      const params = Array.isArray(item.requiredParams) ? item.requiredParams : [];
      return `- type=${item.category}；action=${item.action}；params顺序=${params.length ? params.join('、') : '无必填参数'}`;
    });
    return lines.join('\n') || '无可请求资料';
  },

  parseJsonMaterialRequest(request = null, options = {}) {
    if (!request || typeof request !== 'object' || Array.isArray(request)) return null;
    const mode = options.mode || 'real';
    const category = String(request.type || '').trim();
    const action = String(request.action || '').trim();
    const params = (Array.isArray(request.params) ? request.params : [])
      .map((item) => String(item || '').trim())
      .filter(Boolean);
    const placeholders = new Set(['角色全称', '世界全称', '地点全称', '人物全称', '作品全称', '参数1', '参数2', '参数3']);
    if (params.some((item) => placeholders.has(item))) return null;
    if (!category || !action) return null;
    const entry = this.guidedMaterialRequestCatalog(mode)
      .find((item) => (item.mode === 'both' || item.mode === mode) && item.category === category && item.action === action);
    if (!entry) return null;
    const built = entry.buildParams(params, options);
    const required = Array.isArray(entry.requiredParams) ? entry.requiredParams : Object.keys(built).filter((key) => key !== 'world');
    const valid = typeof entry.validateParams === 'function'
      ? entry.validateParams(built, params, options)
      : !required.some((key) => built[key] === '' || built[key] === undefined);
    if (!valid) return null;
    return {
      skill: entry.skill,
      method: entry.method,
      params: built,
      sourceJson: { type: category, action, params },
    };
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

