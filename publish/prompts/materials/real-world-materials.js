window.GameModules = window.GameModules || {};

window.GameModules.realWorldMaterials = {
  items: [
    { id: 'company-list', title: '玩家相关公司列表', skill: 'company.query', method: 'listPlayerCompanies', paramsHint: {}, when: '需要确认玩家有哪些公司、组织或雇主资料时。' },
    { id: 'company-summary', title: '公司摘要', skill: 'company.query', method: 'getCompanySummary', paramsHint: { companyName: '公司名或空' }, when: '需要公司类型、行业、地点、规模、规则或组织概况时。' },
    { id: 'work-context', title: '工作上下文', skill: 'company.query', method: 'getWorkContext', paramsHint: { companyName: '公司名或空' }, when: '行动涉及上班、请假、迟到、工资、岗位、考勤、开会、项目时。' },
    { id: 'company-search', title: '公司资料搜索', skill: 'company.query', method: 'searchCompany', paramsHint: { keyword: '公司或工作关键词' }, when: '只知道关键词，需要在公司资料中查找命中内容时。' },
    { id: 'current-location', title: '当前地点上下文', skill: 'realworld.location.query', method: 'getCurrentLocationContext', paramsHint: {}, when: '需要知道玩家现在所在地点、上级地点、子地点和地点说明时。' },
    { id: 'location-detail', title: '地点详情', skill: 'realworld.location.query', method: 'getLocationDetail', paramsHint: { locationName: '地点名' }, when: '已经知道地点名，需要读取该地点说明、上级和子地点时。' },
    { id: 'location-search', title: '地点搜索', skill: 'realworld.location.query', method: 'searchLocation', paramsHint: { keyword: '地点或人物房间关键词' }, when: '行动涉及去某处、找某人房间、路线或地图未明确命中时。' },
    { id: 'nearby-locations', title: '附近地点', skill: 'realworld.location.query', method: 'getNearbyLocations', paramsHint: { locationName: '当前或目标地点名' }, when: '需要判断周围可去哪里、同级地点或上下级地点时。' },
    { id: 'top-locations', title: '顶层地点列表', skill: 'realworld.location.query', method: 'listTopLocations', paramsHint: {}, when: '需要先了解现实地图有哪些顶层区域时。' },
    { id: 'recent-log', title: '最近现实记录', skill: 'realworld.history.query', method: 'getRecentRealWorldLog', paramsHint: {}, when: '需要确认刚才或最近几次现实推演发生了什么时。' },
    { id: 'history-search', title: '现实记录搜索', skill: 'realworld.history.query', method: 'searchRealWorldLog', paramsHint: { keyword: '历史关键词' }, when: '行动涉及上次、刚才、之前发生过的具体事件时。' },
    { id: 'worldline-pending', title: '正在记录的现实时间线', skill: 'realworld.history.query', method: 'getWorldlinePending', paramsHint: {}, when: '需要读取尚未归纳的现实时间线全文时。' },
    { id: 'worldline-plots', title: '已归纳情节目录', skill: 'realworld.history.query', method: 'listWorldlinePlots', paramsHint: {}, when: '需要先知道有哪些已归纳现实情节时。' },
    { id: 'plot-records', title: '情节关联记录', skill: 'realworld.history.query', method: 'getWorldlinePlotRecords', paramsHint: { plotId: '情节编号或名称' }, when: '需要某个已归纳情节的具体记录，不能只凭目录补细节时。' },
    { id: 'memory-search', title: '玩家本人短期/长期记忆搜索', skill: 'memory.query', method: 'searchCharacterMemory', paramsHint: { keyword: '记忆关键词' }, when: '行动涉及承诺、人物关系、旧经历、照片、物品或人际连续性时。' },
    { id: 'memory-archive-search', title: '玩家本人记忆归档搜索', skill: 'memory.query', method: 'searchMemoryArchive', paramsHint: { keyword: '归档关键词' }, when: '短期/长期记忆不足，需要搜索更旧的归档记忆时。' },
    { id: 'memory-full', title: '玩家本人完整记忆', skill: 'memory.query', method: 'getCharacterMemory', paramsHint: {}, when: '只有明确需要完整玩家记忆上下文时使用。' },
  ],

  list() { return this.items.slice(); },

  keyOf(req = {}) {
    const skill = String(req.skill || '').trim();
    const method = String(req.method || '').trim();
    const params = req.params && typeof req.params === 'object' ? req.params : {};
    return `${skill}:${method}:${JSON.stringify(params)}`;
  },

  optionFor(req = {}) {
    const skill = String(req.skill || '').trim();
    const method = String(req.method || '').trim();
    return this.items.find((item) => item.skill === skill && item.method === method) || null;
  },

  createSession(action = '') {
    return { action: String(action || ''), acquired: [], acquiredKeys: {}, createdAt: Date.now() };
  },

  record(session, req = {}, title = '', text = '') {
    if (!session) return null;
    const key = this.keyOf(req);
    if (!key || session.acquiredKeys[key]) return session;
    const option = this.optionFor(req);
    session.acquiredKeys[key] = true;
    session.acquired.push({ key, optionId: option?.id || '', title: title || `${req.skill}.${req.method}`, skill: req.skill, method: req.method, params: req.params || {}, summary: String(text || '').trim().slice(0, 180) });
    return session;
  },

  remaining(session) {
    const usedPairs = new Set((session?.acquired || []).map((item) => `${item.skill}.${item.method}`));
    return this.items.filter((item) => !usedPairs.has(`${item.skill}.${item.method}`));
  },

  summary(session) {
    const acquired = session?.acquired || [];
    const remaining = this.remaining(session);
    const got = acquired.length ? acquired.map((item, i) => `${i + 1}. ${item.title}｜${item.skill}.${item.method}`).join('\n') : '尚未通过 skills 动态获取额外资料。';
    const left = remaining.map((item) => `- ${item.title}：${item.skill}.${item.method}｜适用：${item.when}｜params：${JSON.stringify(item.paramsHint || {})}`).join('\n');
    return [`当前资料清单说明：request_context 只用于获取能回答本次行动所必需的资料，不用于补全全部世界。`, `已获取资料：\n${got}`, `仍可获取资料：\n${left || '暂无剩余资料选项。'}`].join('\n\n');
  },
};
