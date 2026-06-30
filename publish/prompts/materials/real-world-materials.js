window.GameModules = window.GameModules || {};

window.GameModules.realWorldMaterials = {
  items: [
    { id: 'character-profile-search', title: '查询角色完整身份资料', size: 'medium', maxChars: 3200, skill: 'character.query', method: 'searchCharacterProfile', paramsHint: { world: '世界名', name: '角色名' }, when: '中文资料请求：角色查询，搜索角色卡，角色全称，世界全称。场景锚定确认强制出场、高优先候选或戏剧候选时查询完整角色卡；角色卡 Top3，优先强制出场，其次高优先候选，最后开放场景戏剧候选。加载角色卡不等于出场或结算；不得输出英文 skill/method。' },
    { id: 'character-known-list', title: '已知角色资料清单', size: 'small', maxChars: 1200, skill: 'character.query', method: 'listKnownCharacters', paramsHint: { world: '世界名' }, when: '需要先了解当前世界已有角色卡和介绍卡。' },
    { id: 'past-event-search', title: '统一查询过去事件', size: 'large', maxChars: 5200, skill: 'past.event.query', method: 'searchPastEvent', paramsHint: { world: '世界名', question: '用户问题', keywords: ['角色名', '事件词', '地点或时间'], characterName: '角色名', timeHint: '几天前/昨天/某日期', contactId: '微信联系人id可选' }, when: '玩家询问几天前、之前、上次、记不记得、旧承诺、图片、地点、物品、微信原文或角色过去经历。' },
    { id: 'company-list', title: '玩家相关公司列表', size: 'small', maxChars: 800, skill: 'company.query', method: 'listPlayerCompanies', paramsHint: { world: '世界名',}, when: '确认玩家有哪些公司、组织或雇主资料。' },
    { id: 'company-summary', title: '公司摘要', size: 'medium', maxChars: 1400, skill: 'company.query', method: 'getCompanySummary', paramsHint: { world: '世界名', companyName: '公司名或空' }, when: '读取公司类型、行业、地点、规模、规则或组织概况。' },
    { id: 'work-context', title: '工作上下文', size: 'medium', maxChars: 1600, skill: 'company.query', method: 'getWorkContext', paramsHint: { world: '世界名', companyName: '公司名或空' }, when: '行动涉及上班、请假、迟到、工资、岗位、考勤、开会、项目。' },
    { id: 'company-search-one', title: '按关键词查询一条公司记录', size: 'small', maxChars: 900, skill: 'company.query', method: 'searchCompanyOne', paramsHint: { world: '世界名', keyword: '公司或工作关键词' }, when: '只需要确认一个公司命中项。' },
    { id: 'company-search-window', title: '按关键词加载公司前后片段', size: 'medium', maxChars: 1600, skill: 'company.query', method: 'searchCompanyWindow', paramsHint: { world: '世界名', keyword: '关键词', beforeChars: 400, afterChars: 800 }, when: '公司资料较长，只加载关键词附近内容。' },
    { id: 'faction-list', title: '势力列表', size: 'small', maxChars: 900, skill: 'faction.query', method: 'listFactions', paramsHint: { world: '世界名',}, when: '确认玩家、角色卡或现实世界已有哪些国家、公司、组织、部门、家庭、学校等势力。' },
    { id: 'faction-search-one', title: '按关键词查询一条势力', size: 'small', maxChars: 1000, skill: 'faction.query', method: 'searchFactionOne', paramsHint: { world: '世界名', keyword: '势力、组织、部门或职位关键词' }, when: '行动涉及某个势力、下属单位、职位、角色地位或组织关系，需要先确认是否已存在。' },
    { id: 'faction-detail', title: '势力详情', size: 'medium', maxChars: 1600, skill: 'faction.query', method: 'getFactionDetail', paramsHint: { world: '世界名', name: '势力名或ID' }, when: '需要读取势力归属、组织架构、职位角色、规则、资源和关系。' },
    { id: 'faction-archive-search', title: '势力资料库搜索', size: 'medium', maxChars: 1800, skill: 'faction.query', method: 'searchFactionArchive', paramsHint: { world: '世界名', keyword: '势力、组织、部门或事件关键词' }, when: '需要读取某个国家、公司、学校、家庭、组织或部门的旧档案记录。' },
    { id: 'faction-upsert', title: '新增或调整势力', size: 'medium', maxChars: 1600, skill: 'faction.query', method: 'upsertFaction', paramsHint: { world: '世界名', name: '势力名', type: '组织类型', parentName: '上级势力名', reason: '新增或调整依据' }, when: '现实推演确认出现新势力、下属单位或已有势力字段需要调整扩大。' },
    { id: 'faction-position-add', title: '新增势力职位角色', size: 'small', maxChars: 1000, skill: 'faction.query', method: 'addFactionPosition', paramsHint: { world: '世界名', factionName: '势力名', position: '职位/地位', characterName: '角色名或未知', reason: '依据' }, when: '确认某势力下存在某个职位或某角色占据该职位；角色未知时写未知。' },
    { id: 'current-location', title: '当前地点上下文', size: 'small', maxChars: 1200, skill: 'realworld.location.query', method: 'getCurrentLocationContext', paramsHint: { world: '世界名',}, when: '中文资料请求：地点查询，当前地点上下文，世界全称。场景锚定需要确认当前地点、空间边界、门口/相邻房间/可听见范围，以及谁具备自然入场条件；不得输出英文 skill/method。' },
    { id: 'location-detail', title: '地点详情', size: 'medium', maxChars: 1500, skill: 'realworld.location.query', method: 'getLocationDetail', paramsHint: { world: '世界名', locationName: '地点名' }, when: '已经知道地点名，需要读取地点说明、上级和子地点。' },
    { id: 'location-search-one', title: '按关键词查询一条地点记录', size: 'small', maxChars: 900, skill: 'realworld.location.query', method: 'searchLocationOne', paramsHint: { world: '世界名', keyword: '地点或人物房间关键词' }, when: '只需要确认一个地点命中项。' },
    { id: 'location-search-window', title: '按关键词加载地点前后片段', size: 'medium', maxChars: 1400, skill: 'realworld.location.query', method: 'searchLocationWindow', paramsHint: { world: '世界名', keyword: '地点关键词', beforeChars: 300, afterChars: 700 }, when: '地点说明较长，只加载关键词附近内容。' },
    { id: 'nearby-locations', title: '附近地点', size: 'small', maxChars: 900, skill: 'realworld.location.query', method: 'getNearbyLocations', paramsHint: { world: '世界名', locationName: '当前或目标地点名' }, when: '中文资料请求：地点查询，查询附近地点，地点全称。场景锚定需要确认邻近空间、候选角色能否合理听见、路过、等待或延迟到场；不得输出英文 skill/method。' },
    { id: 'top-locations', title: '顶层地点列表', size: 'small', maxChars: 800, skill: 'realworld.location.query', method: 'listTopLocations', paramsHint: { world: '世界名',}, when: '先了解现实地图有哪些顶层区域。' },
    { id: 'recent-log', title: '获取最近指定数量现实记录', size: 'medium', maxChars: 1800, skill: 'realworld.history.query', method: 'getRecentRealWorldLog', paramsHint: { world: '世界名', count: 5 }, when: '确认刚才或最近几次现实推演发生了什么。' },
    { id: 'history-search-one', title: '按关键词查询一条现实记录', size: 'small', maxChars: 900, skill: 'realworld.history.query', method: 'searchRealWorldLogOne', paramsHint: { world: '世界名', keyword: '历史关键词' }, when: '只需要确认一条旧现实事件。' },
    { id: 'history-search-window', title: '按关键词加载现实记录前后片段', size: 'medium', maxChars: 1800, skill: 'realworld.history.query', method: 'searchRealWorldLogWindow', paramsHint: { world: '世界名', keyword: '历史关键词', beforeChars: 500, afterChars: 1000 }, when: '现实记录较长，只加载关键词附近内容。' },
    { id: 'worldline-index', title: '世界线清单', size: 'small', maxChars: 1400, skill: 'realworld.history.query', method: 'listWorldlineIndex', paramsHint: { world: '世界名',}, when: '需要先了解正在记录与已归纳现实世界线有哪些记录、情节、时间段和关键词。' },
    { id: 'worldline-keyword-search', title: '按关键词查询世界线资料', size: 'medium', maxChars: 1800, skill: 'realworld.history.query', method: 'searchWorldlineByKeyword', paramsHint: { world: '世界名', keyword: '人物/地点/事件/物品/组织关键词' }, when: '需要根据关键词加载具体世界线记录或归纳情节资料。' },
    { id: 'worldline-time-search', title: '按时间段查询世界线资料', size: 'medium', maxChars: 1800, skill: 'realworld.history.query', method: 'searchWorldlineByTime', paramsHint: { world: '世界名', startTime: 'YYYY-MM-DD HH:mm', endTime: 'YYYY-MM-DD HH:mm', keyword: '可选关键词', time: '无法推断范围时的时间关键词' }, when: '需要根据昨天晚上、三天前、上周五、具体时间段或当天等线索加载具体世界线资料。' },
    { id: 'worldline-plots', title: '已归纳情节目录', size: 'medium', maxChars: 1600, skill: 'realworld.history.query', method: 'listWorldlinePlots', paramsHint: { world: '世界名',}, when: '只需要查看已归纳现实情节目录。' },
    { id: 'plot-records', title: '情节关联记录', size: 'large', maxChars: 2200, skill: 'realworld.history.query', method: 'getWorldlinePlotRecords', paramsHint: { world: '世界名', plotId: '情节编号或名称' }, when: '需要某个已归纳情节的具体记录。' },
    { id: 'memory-search-one', title: '按关键词查询一条人物记忆', size: 'small', maxChars: 900, skill: 'memory.query', method: 'searchCharacterMemoryOne', paramsHint: { world: '世界名', characterId: 'player-self或角色id', keyword: '记忆关键词' }, when: '只需要确认一个人物记忆命中项。' },
    { id: 'memory-search-window', title: '按关键词加载人物记忆前后片段', size: 'medium', maxChars: 1600, skill: 'memory.query', method: 'searchCharacterMemoryWindow', paramsHint: { world: '世界名', characterId: 'player-self或角色id', keyword: '记忆关键词', beforeChars: 400, afterChars: 900 }, when: '人物记忆较长，只加载关键词附近内容。' },
    { id: 'memory-recent', title: '获取最近指定数量人物记忆', size: 'medium', maxChars: 1600, skill: 'memory.query', method: 'getRecentCharacterMemories', paramsHint: { world: '世界名', characterId: 'player-self或角色id', count: 5 }, when: '需要最近几条人物短期/长期记忆。' },
    { id: 'memory-archive-search', title: '玩家本人记忆归档搜索', size: 'large', maxChars: 1800, skill: 'memory.query', method: 'searchMemoryArchive', paramsHint: { world: '世界名', keyword: '归档关键词' }, when: '短期/长期记忆不足，需要搜索更旧归档。' },
    { id: 'term-search-one', title: '按关键词查询一条专用术语', size: 'small', maxChars: 900, skill: 'lexicon.query', method: 'searchTermOne', paramsHint: { world: '世界名', keyword: '术语名或关键词' }, when: '行动或上下文出现 AI 不能确定含义的专用术语、缩写、APP名、功能名、黑话或自定义概念。' },
    { id: 'term-search-window', title: '按关键词加载专用术语前后片段', size: 'medium', maxChars: 1400, skill: 'lexicon.query', method: 'searchTermWindow', paramsHint: { world: '世界名', keyword: '术语关键词', beforeChars: 300, afterChars: 700 }, when: '术语说明较长，只需要加载关键词附近定义和相关设定。' },
    { id: 'term-add', title: '新增专用术语', size: 'small', maxChars: 900, skill: 'lexicon.query', method: 'addSpecialTerm', paramsHint: { world: '世界名', name: '术语名', summary: '一句话含义', description: '根据已有上下文推断出的设定', aliases: ['别名或缩写'] }, when: '查询数据库未命中，但根据已有资料能克制推断术语含义，需要把术语定义固化到词条表。' },
    { id: 'wechat-skills', title: '微信可操作技能清单', size: 'small', maxChars: 1000, skill: 'wechat.query', method: 'listWechatSkills', paramsHint: { world: '世界名',}, when: '角色思念、联系玩家、发送当前或过去微信消息前，确认微信可执行操作。' },
    { id: 'wechat-contacts', title: '微信联系人清单', size: 'small', maxChars: 1000, skill: 'wechat.query', method: 'listContacts', paramsHint: { world: '世界名',}, when: '需要确认角色是否在玩家微信里、联系人ID、关系和未读情况。' },
    { id: 'wechat-thread', title: '微信会话片段', size: 'medium', maxChars: 1600, skill: 'wechat.query', method: 'getThread', paramsHint: { world: '世界名', contactId: '联系人id或角色id', count: 8 }, when: '角色思念事件准备用微信联系玩家，需要查看最近消息口吻与上下文。' },
    { id: 'wechat-send-now', title: '主动发送当前微信消息给玩家', size: 'small', maxChars: 900, skill: 'wechat.message.incoming', method: 'sendIncomingNow', paramsHint: { world: '世界名', contactId: '联系人id或角色id', text: '消息内容' }, when: '思念角色在当前时刻主动给玩家发微信；在 final.wechatActions 中执行。' },
    { id: 'wechat-send-past', title: '主动在过去发送微信消息给玩家', size: 'small', maxChars: 900, skill: 'wechat.message.incoming', method: 'sendIncomingPast', paramsHint: { world: '世界名', contactId: '联系人id或角色id', text: '消息内容', timeIso: '过去时间ISO' }, when: '回溯错过的思念触发，写入过去未读微信；在 final.wechatActions 中执行。' },
    { id: 'character-items', title: '查询玩家或角色物品', size: 'small', maxChars: 1200, skill: 'item.query', method: 'listCharacterItems', paramsHint: { world: '世界名', target: 'player-self或角色id/姓名' }, when: '行动涉及查看、使用、赠送、丢弃、损坏、购买、交给某人或从某人获得物品前。' },
    { id: 'known-item-search', title: '搜索世界已知物品', size: 'small', maxChars: 1000, skill: 'item.query', method: 'searchKnownItem', paramsHint: { world: '世界名', keyword: '物品名或关键词' }, when: '每次需要生成物品细节前必须先搜索；命中则复用已知物品，不要重复生成。' },
    { id: 'item-generate', title: '生成世界已知物品', size: 'small', maxChars: 1000, skill: 'item.query', method: 'generateItemSkill', paramsHint: { world: '世界名', name: '物品名', kind: '物品或装备', detailed: true, description: '玩家检查或到手后的详细信息' }, when: '搜索世界已知物品未命中，且玩家明确检查、接触或实际到手，需要固化物品细节。' },
    { id: 'item-add', title: '新增物品给玩家或角色', size: 'small', maxChars: 1000, skill: 'item.query', method: 'addItemToTarget', paramsHint: { world: '世界名', target: 'player-self或角色id/姓名', item: { name: '物品名', kind: '物品或装备', description: '说明' } }, when: '现实推演确认玩家或角色直接获得物品，且不涉及付款。' },
    { id: 'item-transfer', title: '玩家与角色间转移物品', size: 'small', maxChars: 1000, skill: 'item.query', method: 'transferItemSkill', paramsHint: { world: '世界名', from: '来源角色', to: '目标角色', itemName: '物品名', quantity: 1, reason: '原因' }, when: '现实推演确认玩家赠送、交出、递给某人，或角色把物品给玩家。' },
    { id: 'item-delete', title: '删除玩家或角色物品', size: 'small', maxChars: 1000, skill: 'item.query', method: 'deleteItemSkill', paramsHint: { world: '世界名', target: 'player-self或角色id/姓名', itemName: '物品名', quantity: 1, reason: '损坏/丢弃/消耗原因' }, when: '物品被损坏、丢弃、消耗、遗失或不再持有。' },
    { id: 'item-purchase', title: '购物物品给玩家或角色', size: 'small', maxChars: 1000, skill: 'item.query', method: 'purchaseItemSkill', paramsHint: { world: '世界名', target: 'player-self或角色id/姓名', item: { name: '物品名', price: 100, kind: '物品或装备', description: '说明' } }, when: '现实推演确认购买物品；必须先检查玩家余额，余额足够才扣钱并新增物品。' },
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

  acquiredSummary(session) {
    const acquired = session?.acquired || [];
    return acquired.length ? acquired.map((item, i) => `${i + 1}. ${item.title}｜${item.skill}.${item.method}｜${item.size}｜上限${item.maxChars}字`).join('\n') : '尚未通过 skills 动态获取额外资料。';
  },

  summary(session, options = {}) {
    const step = Number(options.step || 1);
    const remaining = this.remaining(session);
    const highValueReadPairs = new Set([
      'character.query.searchCharacterProfile',
      'character.query.listKnownCharacters',
      'past.event.query.searchPastEvent',
      'company.query.listPlayerCompanies',
      'company.query.getCompanySummary',
      'company.query.getWorkContext',
      'company.query.searchCompanyOne',
      'company.query.searchCompanyWindow',
      'faction.query.listFactions',
      'faction.query.searchFactionOne',
      'faction.query.getFactionDetail',
      'faction.query.searchFactionArchive',
      'realworld.location.query.getCurrentLocationContext',
      'realworld.location.query.getLocationDetail',
      'realworld.location.query.searchLocationOne',
      'realworld.location.query.searchLocationWindow',
      'realworld.location.query.getNearbyLocations',
      'realworld.history.query.getRecentRealWorldLog',
      'realworld.history.query.searchRealWorldLogOne',
      'realworld.history.query.searchRealWorldLogWindow',
      'realworld.history.query.listWorldlineIndex',
      'realworld.history.query.searchWorldlineByKeyword',
      'realworld.history.query.searchWorldlineByTime',
      'realworld.history.query.listWorldlinePlots',
      'realworld.history.query.getWorldlinePlotRecords',
      'memory.query.searchCharacterMemoryOne',
      'memory.query.searchCharacterMemoryWindow',
      'memory.query.getRecentCharacterMemories',
      'memory.query.searchMemoryArchive',
      'lexicon.query.searchTermOne',
      'lexicon.query.searchTermWindow',
      'wechat.query.listWechatSkills',
      'wechat.query.listContacts',
      'wechat.query.getThread',
      'item.query.listCharacterItems',
      'item.query.searchKnownItem',
    ]);
    const candidates = step >= 3 ? remaining.filter((item) => highValueReadPairs.has(`${item.skill}.${item.method}`)) : remaining;
    const left = candidates.map((item) => {
      const base = `- ${item.title}：${item.skill}.${item.method}｜${item.size}｜上限${item.maxChars}字`;
      return step >= 3 ? `${base}｜仅当缺口会直接改变本次行动结果` : `${base}｜适用：${item.when}｜params：${JSON.stringify(item.paramsHint || {})}`;
    }).join('\n');
    return [
      '当前资料清单说明：request_context 只用于获取能回答本次行动所必需的资料，不用于补全全部世界。',
      step >= 3 ? '软收敛说明：后续步骤只保留高价值候选；若缺口不会直接改变本次行动结果、人物反应或旧事实判定，必须 context_done。' : '资料长度规则：small 可直接读取；medium 只在必要时读取；large 禁止一次性完整加载，必须优先用关键词查询一条记录、关键词前后片段或最近指定数量。',
      `已获取资料：\n${this.acquiredSummary(session)}`,
      `仍可获取资料：\n${left || '暂无剩余高价值资料选项；请基于已有资料收敛。'}`,
    ].join('\n\n');
  },
};
