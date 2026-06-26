window.GameModules = window.GameModules || {};

window.GameModules.workLoreMaterials = {
  items: [
    { id: 'character-profile-search', title: '查询角色完整身份资料', size: 'medium', maxChars: 3200, skill: 'character.query', method: 'searchCharacterProfile', paramsHint: { world: '世界名/作品名', name: '角色名' }, when: '正文涉及某个具体人物，需先确认完整角色卡、身份、关系、状态、穿着和物品。' },
    { id: 'character-known-list', title: '已知角色资料清单', size: 'small', maxChars: 1200, skill: 'character.query', method: 'listKnownCharacters', paramsHint: { world: '世界名/作品名' }, when: '需要先了解当前世界已有角色卡和介绍卡。' },
    { id: 'past-event-search', title: '统一查询过去事件', size: 'large', maxChars: 5200, skill: 'past.event.query', method: 'searchPastEvent', paramsHint: { world: '世界名/作品名', question: '用户问题', keywords: ['角色名', '事件词', '地点或时间'], characterName: '角色名', timeHint: '几天前/昨天/某日期' }, when: '玩家询问几天前、之前、上次、记不记得、旧承诺、图片、地点、物品、世界线、时间线或角色过去经历。' },
    { id: 'worldline-index', title: '当前作品世界线清单', size: 'small', maxChars: 1400, skill: 'realworld.history.query', method: 'listWorldlineIndex', paramsHint: { world: '世界名/作品名' }, when: '需要先了解当前作品世界线正在记录与已归纳情节索引。' },
    { id: 'worldline-keyword-search', title: '按关键词查询当前作品世界线', size: 'medium', maxChars: 1800, skill: 'realworld.history.query', method: 'searchWorldlineByKeyword', paramsHint: { world: '世界名/作品名', keyword: '人物/地点/事件/物品/组织关键词' }, when: '需要根据关键词加载当前作品世界线具体记录或归纳情节。' },
    { id: 'worldline-time-search', title: '按时间段查询当前作品世界线', size: 'medium', maxChars: 1800, skill: 'realworld.history.query', method: 'searchWorldlineByTime', paramsHint: { world: '世界名/作品名', startTime: 'YYYY-MM-DD HH:mm', endTime: 'YYYY-MM-DD HH:mm', keyword: '可选关键词', time: '无法推断范围时的时间关键词' }, when: '玩家提到昨天晚上、三天前、上周五、某时间段或午饭后等旧事件时间线索。' },
    { id: 'worldline-plot-records', title: '当前作品情节关联记录', size: 'large', maxChars: 2200, skill: 'realworld.history.query', method: 'getWorldlinePlotRecords', paramsHint: { world: '世界名/作品名', plotId: '情节编号或名称' }, when: '需要某个已归纳情节的具体世界线记录。' },
    { id: 'work-readme', title: '作品 README.md / 设定库入口', size: 'small', maxChars: 1200, skill: 'worklore.query', method: 'getReadme', paramsHint: { world: '世界名/作品名' }, when: '第一阶段默认入口；确认该作品设定库结构、默认常驻加载与按需入口。' },
    { id: 'work-defaults', title: '作品常驻设定摘要', size: 'medium', maxChars: 2200, skill: 'worklore.query', method: 'getDefaultLoad', paramsHint: { world: '世界名/作品名' }, when: '需要作品世界观、基础规则、术语和数值规则。' },
    { id: 'work-people', title: '人物索引/人物卡查询', size: 'large', maxChars: 1800, skill: 'worklore.query', method: 'searchPeople', paramsHint: { world: '世界名/作品名', keyword: '人物名或称号' }, when: '行动涉及原作人物、身份、性格、当前阶段。' },
    { id: 'work-plot', title: '剧情索引/剧情片段查询', size: 'large', maxChars: 2200, skill: 'worklore.query', method: 'searchPlot', paramsHint: { world: '世界名/作品名', keyword: '事件/章节/时间点' }, when: '需要确认原作剧情阶段、事件前后因果。' },
    { id: 'work-timeline', title: '时间线索引查询', size: 'large', maxChars: 1800, skill: 'worklore.query', method: 'searchTimeline', paramsHint: { world: '世界名/作品名', keyword: '时间/日期/阶段' }, when: '行动需要按时间点限制资料，避免剧透或后期信息提前。' },
    { id: 'work-ability', title: '能力技能资源查询', size: 'large', maxChars: 1800, skill: 'worklore.query', method: 'searchAbility', paramsHint: { world: '世界名/作品名', keyword: '能力/宝具/技能/制度' }, when: '行动涉及战斗、能力、资源、规则判定。' },
    { id: 'work-profession', title: '职业身份资料查询', size: 'large', maxChars: 1600, skill: 'worklore.query', method: 'searchProfession', paramsHint: { world: '世界名/作品名', keyword: '职业/职阶/身份/职位' }, when: '行动涉及职业身份、职阶、职位、阶层、组织身份或身份制度。' },
    { id: 'work-relation', title: '关系资料查询', size: 'large', maxChars: 1600, skill: 'worklore.query', method: 'searchRelationship', paramsHint: { world: '世界名/作品名', keyword: '两人名或关系名' }, when: '需要确认原作稳定关系、阵营、敌友、亲属。' },
    { id: 'work-location', title: '地点资料查询', size: 'large', maxChars: 1600, skill: 'worklore.query', method: 'searchLocation', paramsHint: { world: '世界名/作品名', keyword: '地点名' }, when: '行动发生在原作地点或需要地点规则。' },
    { id: 'work-item', title: '物品资料查询', size: 'large', maxChars: 1400, skill: 'worklore.query', method: 'searchItem', paramsHint: { world: '世界名/作品名', keyword: '物品名' }, when: '行动涉及原作物品、装备、道具、圣遗物。' },
  ],

  skillText() {
    return ['# worklore.query', '按 `assets/{作品名}/AI设定库/README.md` 的设定库结构查询原作资料。', '跨世界规则：params.world/worldTag 写目标作品名或世界名；未写时默认当前角色作品。现实推演需要查询异世界/作品资料时也可使用本 skill。', '资源规则：README 是第一入口；small 可直接读；medium 只在必要时读；large 禁止全文加载，必须用 keyword/time/角色名精确查询。', '常用方法：getReadme、getDefaultLoad、searchPeople、searchPlot、searchTimeline、searchAbility、searchRelationship、searchProfession、searchLocation、searchItem、searchByKeyword。', '当前作品世界线资料通过 realworld.history.query 查询；遇到模糊时间先推断 startTime/endTime，无法推断再退化为 time/keyword。', 'params 通常写 `{ "world": "作品名", "keyword": "关键词" }`；已知剧情时间或阶段时 keyword 必须带时间/阶段，以避免把后期情报提前给早期角色。'].join('\n');
  },

  list() { return this.items.slice(); },
  keyOf(req = {}) { return `${req.skill || ''}:${req.method || ''}:${JSON.stringify(req.params || {})}`; },
  optionFor(req = {}) { return this.items.find((item) => item.skill === req.skill && item.method === req.method) || null; },
  createSession(action = '') { return { action: String(action || ''), acquired: [], acquiredKeys: {}, createdAt: Date.now() }; },
  record(session, req = {}, title = '', text = '') {
    if (!session) return session;
    const key = this.keyOf(req);
    if (!key || session.acquiredKeys[key]) return session;
    const option = this.optionFor(req);
    session.acquiredKeys[key] = true;
    session.acquired.push({ key, optionId: option?.id || '', title: title || `${req.skill}.${req.method}`, skill: req.skill, method: req.method, params: req.params || {}, size: option?.size || 'unknown', maxChars: option?.maxChars || 1600, summary: String(text || '').trim().slice(0, 180) });
    return session;
  },
  remaining(session) {
    const used = new Set((session?.acquired || []).map((item) => `${item.skill}.${item.method}`));
    return this.items.filter((item) => !used.has(`${item.skill}.${item.method}`));
  },
  acquiredSummary(session) {
    const acquired = session?.acquired || [];
    return acquired.length ? acquired.map((item, i) => `${i + 1}. ${item.title}｜${item.skill}.${item.method}｜${item.size}｜上限${item.maxChars}字`).join('\n') : '尚未通过 worklore.query 动态获取原作资料。';
  },
  summary(session) {
    const left = this.remaining(session).map((item) => `- ${item.title}：${item.skill}.${item.method}｜${item.size}｜上限${item.maxChars}字｜适用：${item.when}｜params：${JSON.stringify(item.paramsHint || {})}`).join('\n');
    return ['当前作品设定资料清单：request_context 只获取本次行动必需资料，不补完整个原作。', '资料边界：优先 README、常驻设定、索引；large 资料必须用关键词、人物名、地点、时间或阶段精确查询。', `已获取资料：\n${this.acquiredSummary(session)}`, `仍可获取资料：\n${left || '暂无剩余资料选项。'}`].join('\n\n');
  },
};
