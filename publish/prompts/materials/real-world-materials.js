window.GameModules = window.GameModules || {};

window.GameModules.realWorldMaterials = {
  items: [
    { id: 'company-list', title: '玩家相关公司列表', size: 'small', maxChars: 800, skill: 'company.query', method: 'listPlayerCompanies', paramsHint: {}, when: '确认玩家有哪些公司、组织或雇主资料。' },
    { id: 'company-summary', title: '公司摘要', size: 'medium', maxChars: 1400, skill: 'company.query', method: 'getCompanySummary', paramsHint: { companyName: '公司名或空' }, when: '读取公司类型、行业、地点、规模、规则或组织概况。' },
    { id: 'work-context', title: '工作上下文', size: 'medium', maxChars: 1600, skill: 'company.query', method: 'getWorkContext', paramsHint: { companyName: '公司名或空' }, when: '行动涉及上班、请假、迟到、工资、岗位、考勤、开会、项目。' },
    { id: 'company-search-one', title: '按关键词查询一条公司记录', size: 'small', maxChars: 900, skill: 'company.query', method: 'searchCompanyOne', paramsHint: { keyword: '公司或工作关键词' }, when: '只需要确认一个公司命中项。' },
    { id: 'company-search-window', title: '按关键词加载公司前后片段', size: 'medium', maxChars: 1600, skill: 'company.query', method: 'searchCompanyWindow', paramsHint: { keyword: '关键词', beforeChars: 400, afterChars: 800 }, when: '公司资料较长，只加载关键词附近内容。' },
    { id: 'faction-list', title: '势力列表', size: 'small', maxChars: 900, skill: 'faction.query', method: 'listFactions', paramsHint: {}, when: '确认玩家、角色卡或现实世界已有哪些国家、公司、组织、部门、家庭、学校等势力。' },
    { id: 'faction-search-one', title: '按关键词查询一条势力', size: 'small', maxChars: 1000, skill: 'faction.query', method: 'searchFactionOne', paramsHint: { keyword: '势力、组织、部门或职位关键词' }, when: '行动涉及某个势力、下属单位、职位、角色地位或组织关系，需要先确认是否已存在。' },
    { id: 'faction-detail', title: '势力详情', size: 'medium', maxChars: 1600, skill: 'faction.query', method: 'getFactionDetail', paramsHint: { name: '势力名或ID' }, when: '需要读取势力归属、组织架构、职位角色、规则、资源和关系。' },
    { id: 'faction-upsert', title: '新增或调整势力', size: 'medium', maxChars: 1600, skill: 'faction.query', method: 'upsertFaction', paramsHint: { name: '势力名', type: '组织类型', parentName: '上级势力名', reason: '新增或调整依据' }, when: '现实推演确认出现新势力、下属单位或已有势力字段需要调整扩大。' },
    { id: 'faction-position-add', title: '新增势力职位角色', size: 'small', maxChars: 1000, skill: 'faction.query', method: 'addFactionPosition', paramsHint: { factionName: '势力名', position: '职位/地位', characterName: '角色名或未知', reason: '依据' }, when: '确认某势力下存在某个职位或某角色占据该职位；角色未知时写未知。' },
    { id: 'current-location', title: '当前地点上下文', size: 'small', maxChars: 1200, skill: 'realworld.location.query', method: 'getCurrentLocationContext', paramsHint: {}, when: '确认玩家现在所在地点、上级地点、子地点和说明。' },
    { id: 'location-detail', title: '地点详情', size: 'medium', maxChars: 1500, skill: 'realworld.location.query', method: 'getLocationDetail', paramsHint: { locationName: '地点名' }, when: '已经知道地点名，需要读取地点说明、上级和子地点。' },
    { id: 'location-search-one', title: '按关键词查询一条地点记录', size: 'small', maxChars: 900, skill: 'realworld.location.query', method: 'searchLocationOne', paramsHint: { keyword: '地点或人物房间关键词' }, when: '只需要确认一个地点命中项。' },
    { id: 'location-search-window', title: '按关键词加载地点前后片段', size: 'medium', maxChars: 1400, skill: 'realworld.location.query', method: 'searchLocationWindow', paramsHint: { keyword: '地点关键词', beforeChars: 300, afterChars: 700 }, when: '地点说明较长，只加载关键词附近内容。' },
    { id: 'nearby-locations', title: '附近地点', size: 'small', maxChars: 900, skill: 'realworld.location.query', method: 'getNearbyLocations', paramsHint: { locationName: '当前或目标地点名' }, when: '判断周围、同级地点或上下级地点。' },
    { id: 'top-locations', title: '顶层地点列表', size: 'small', maxChars: 800, skill: 'realworld.location.query', method: 'listTopLocations', paramsHint: {}, when: '先了解现实地图有哪些顶层区域。' },
    { id: 'recent-log', title: '获取最近指定数量现实记录', size: 'medium', maxChars: 1800, skill: 'realworld.history.query', method: 'getRecentRealWorldLog', paramsHint: { count: 5 }, when: '确认刚才或最近几次现实推演发生了什么。' },
    { id: 'history-search-one', title: '按关键词查询一条现实记录', size: 'small', maxChars: 900, skill: 'realworld.history.query', method: 'searchRealWorldLogOne', paramsHint: { keyword: '历史关键词' }, when: '只需要确认一条旧现实事件。' },
    { id: 'history-search-window', title: '按关键词加载现实记录前后片段', size: 'medium', maxChars: 1800, skill: 'realworld.history.query', method: 'searchRealWorldLogWindow', paramsHint: { keyword: '历史关键词', beforeChars: 500, afterChars: 1000 }, when: '现实记录较长，只加载关键词附近内容。' },
    { id: 'worldline-plots', title: '已归纳情节目录', size: 'medium', maxChars: 1600, skill: 'realworld.history.query', method: 'listWorldlinePlots', paramsHint: {}, when: '先知道有哪些已归纳现实情节。' },
    { id: 'plot-records', title: '情节关联记录', size: 'large', maxChars: 2200, skill: 'realworld.history.query', method: 'getWorldlinePlotRecords', paramsHint: { plotId: '情节编号或名称' }, when: '需要某个已归纳情节的具体记录。' },
    { id: 'memory-search-one', title: '按关键词查询一条人物记忆', size: 'small', maxChars: 900, skill: 'memory.query', method: 'searchCharacterMemoryOne', paramsHint: { characterId: 'player-self或角色id', keyword: '记忆关键词' }, when: '只需要确认一个人物记忆命中项。' },
    { id: 'memory-search-window', title: '按关键词加载人物记忆前后片段', size: 'medium', maxChars: 1600, skill: 'memory.query', method: 'searchCharacterMemoryWindow', paramsHint: { characterId: 'player-self或角色id', keyword: '记忆关键词', beforeChars: 400, afterChars: 900 }, when: '人物记忆较长，只加载关键词附近内容。' },
    { id: 'memory-recent', title: '获取最近指定数量人物记忆', size: 'medium', maxChars: 1600, skill: 'memory.query', method: 'getRecentCharacterMemories', paramsHint: { characterId: 'player-self或角色id', count: 5 }, when: '需要最近几条人物短期/长期记忆。' },
    { id: 'memory-archive-search', title: '玩家本人记忆归档搜索', size: 'large', maxChars: 1800, skill: 'memory.query', method: 'searchMemoryArchive', paramsHint: { keyword: '归档关键词' }, when: '短期/长期记忆不足，需要搜索更旧归档。' },
    { id: 'term-search-one', title: '按关键词查询一条专用术语', size: 'small', maxChars: 900, skill: 'lexicon.query', method: 'searchTermOne', paramsHint: { keyword: '术语名或关键词' }, when: '行动或上下文出现 AI 不能确定含义的专用术语、缩写、APP名、功能名、黑话或自定义概念。' },
    { id: 'term-search-window', title: '按关键词加载专用术语前后片段', size: 'medium', maxChars: 1400, skill: 'lexicon.query', method: 'searchTermWindow', paramsHint: { keyword: '术语关键词', beforeChars: 300, afterChars: 700 }, when: '术语说明较长，只需要加载关键词附近定义和相关设定。' },
    { id: 'term-add', title: '新增专用术语', size: 'small', maxChars: 900, skill: 'lexicon.query', method: 'addSpecialTerm', paramsHint: { name: '术语名', summary: '一句话含义', description: '根据已有上下文推断出的设定', aliases: ['别名或缩写'] }, when: '查询数据库未命中，但根据已有资料能克制推断术语含义，需要把术语定义固化到词条表。' },
    { id: 'character-items', title: '查询玩家或角色物品', size: 'small', maxChars: 1200, skill: 'item.query', method: 'listCharacterItems', paramsHint: { target: 'player-self或角色id/姓名' }, when: '行动涉及查看、使用、赠送、丢弃、损坏、购买、交给某人或从某人获得物品前。' },
    { id: 'known-item-search', title: '搜索世界已知物品', size: 'small', maxChars: 1000, skill: 'item.query', method: 'searchKnownItem', paramsHint: { keyword: '物品名或关键词' }, when: '每次需要生成物品细节前必须先搜索；命中则复用已知物品，不要重复生成。' },
    { id: 'item-generate', title: '生成世界已知物品', size: 'small', maxChars: 1000, skill: 'item.query', method: 'generateItemSkill', paramsHint: { name: '物品名', kind: '物品或装备', detailed: true, description: '玩家检查或到手后的详细信息' }, when: '搜索世界已知物品未命中，且玩家明确检查、接触或实际到手，需要固化物品细节。' },
    { id: 'item-add', title: '新增物品给玩家或角色', size: 'small', maxChars: 1000, skill: 'item.query', method: 'addItemToTarget', paramsHint: { target: 'player-self或角色id/姓名', item: { name: '物品名', kind: '物品或装备', description: '说明' } }, when: '现实推演确认玩家或角色直接获得物品，且不涉及付款。' },
    { id: 'item-transfer', title: '玩家与角色间转移物品', size: 'small', maxChars: 1000, skill: 'item.query', method: 'transferItemSkill', paramsHint: { from: '来源角色', to: '目标角色', itemName: '物品名', quantity: 1, reason: '原因' }, when: '现实推演确认玩家赠送、交出、递给某人，或角色把物品给玩家。' },
    { id: 'item-delete', title: '删除玩家或角色物品', size: 'small', maxChars: 1000, skill: 'item.query', method: 'deleteItemSkill', paramsHint: { target: 'player-self或角色id/姓名', itemName: '物品名', quantity: 1, reason: '损坏/丢弃/消耗原因' }, when: '物品被损坏、丢弃、消耗、遗失或不再持有。' },
    { id: 'item-purchase', title: '购物物品给玩家或角色', size: 'small', maxChars: 1000, skill: 'item.query', method: 'purchaseItemSkill', paramsHint: { target: 'player-self或角色id/姓名', item: { name: '物品名', price: 100, kind: '物品或装备', description: '说明' } }, when: '现实推演确认购买物品；必须先检查玩家余额，余额足够才扣钱并新增物品。' },
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
    session.acquired.push({ key, optionId: option?.id || '', title: title || `${req.skill}.${req.method}`, skill: req.skill, method: req.method, params: req.params || {}, size: option?.size || 'unknown', maxChars: option?.maxChars || 1200, summary: String(text || '').trim().slice(0, 180) });
    return session;
  },

  remaining(session) {
    const usedPairs = new Set((session?.acquired || []).map((item) => `${item.skill}.${item.method}`));
    return this.items.filter((item) => !usedPairs.has(`${item.skill}.${item.method}`));
  },

  summary(session) {
    const acquired = session?.acquired || [];
    const remaining = this.remaining(session);
    const got = acquired.length ? acquired.map((item, i) => `${i + 1}. ${item.title}｜${item.skill}.${item.method}｜${item.size}｜上限${item.maxChars}字`).join('\n') : '尚未通过 skills 动态获取额外资料。';
    const left = remaining.map((item) => `- ${item.title}：${item.skill}.${item.method}｜${item.size}｜上限${item.maxChars}字｜适用：${item.when}｜params：${JSON.stringify(item.paramsHint || {})}`).join('\n');
    return [
      '当前资料清单说明：request_context 只用于获取能回答本次行动所必需的资料，不用于补全全部世界。',
      '资料长度规则：small 可直接读取；medium 只在必要时读取；large 禁止一次性完整加载，必须优先用关键词查询一条记录、关键词前后片段或最近指定数量。',
      `已获取资料：\n${got}`,
      `仍可获取资料：\n${left || '暂无剩余资料选项。'}`,
    ].join('\n\n');
  },
};
