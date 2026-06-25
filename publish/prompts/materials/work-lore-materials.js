window.GameModules = window.GameModules || {};

window.GameModules.workLoreMaterials = {
  items: [
    { id: 'work-readme', title: '作品设定库入口 README', size: 'small', maxChars: 1200, skill: 'worklore.query', method: 'getReadme', paramsHint: {}, when: '确认该作品设定库结构、默认常驻加载与按需入口。' },
    { id: 'work-defaults', title: '作品常驻设定摘要', size: 'medium', maxChars: 2200, skill: 'worklore.query', method: 'getDefaultLoad', paramsHint: {}, when: '需要作品世界观、基础规则、术语和数值规则。' },
    { id: 'work-people', title: '人物索引/人物卡查询', size: 'large', maxChars: 1800, skill: 'worklore.query', method: 'searchPeople', paramsHint: { keyword: '人物名或称号' }, when: '行动涉及原作人物、身份、性格、当前阶段。' },
    { id: 'work-plot', title: '剧情索引/剧情片段查询', size: 'large', maxChars: 2200, skill: 'worklore.query', method: 'searchPlot', paramsHint: { keyword: '事件/章节/时间点' }, when: '需要确认原作剧情阶段、事件前后因果。' },
    { id: 'work-timeline', title: '时间线索引查询', size: 'large', maxChars: 1800, skill: 'worklore.query', method: 'searchTimeline', paramsHint: { keyword: '时间/日期/阶段' }, when: '行动需要按时间点限制资料，避免剧透或后期信息提前。' },
    { id: 'work-ability', title: '能力技能资源查询', size: 'large', maxChars: 1800, skill: 'worklore.query', method: 'searchAbility', paramsHint: { keyword: '能力/宝具/技能/制度' }, when: '行动涉及战斗、能力、资源、规则判定。' },
    { id: 'work-relation', title: '关系资料查询', size: 'large', maxChars: 1600, skill: 'worklore.query', method: 'searchRelationship', paramsHint: { keyword: '两人名或关系名' }, when: '需要确认原作稳定关系、阵营、敌友、亲属。' },
    { id: 'work-location', title: '地点资料查询', size: 'large', maxChars: 1600, skill: 'worklore.query', method: 'searchLocation', paramsHint: { keyword: '地点名' }, when: '行动发生在原作地点或需要地点规则。' },
    { id: 'work-item', title: '物品资料查询', size: 'large', maxChars: 1400, skill: 'worklore.query', method: 'searchItem', paramsHint: { keyword: '物品名' }, when: '行动涉及原作物品、装备、道具、圣遗物。' },
  ],

  skillText() {
    return ['# worklore.query', '按 `assets/{作品名}/AI设定库/README.md` 的设定库结构查询原作资料。', '资源规则：README 是第一入口；small 可直接读；medium 只在必要时读；large 禁止全文加载，必须用 keyword/time/角色名精确查询。', '常用方法：getReadme、getDefaultLoad、searchPeople、searchPlot、searchTimeline、searchAbility、searchRelationship、searchProfession、searchLocation、searchItem、searchByKeyword。', 'params 通常写 `{ "keyword": "关键词" }`；已知剧情时间或阶段时 keyword 必须带时间/阶段，以避免把后期情报提前给早期角色。'].join('\n');
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
