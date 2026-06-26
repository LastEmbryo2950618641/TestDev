window.GameModules = window.GameModules || {};

window.GameModules.storyAgentContext = {
  materialBudgetChars: 5500,
  autoLimits: { readme: 700, people: 1300, timeline: 1000 },

  limit(text, max = 1200) { return String(text || '').trim().slice(0, max); },

  baseSnapshot(store, action = '') {
    const c = store.character || {};
    const state = store.characterRpgState || {};
    const exp = state.values?.control_experience || {};
    const work = c.work || store.selectedWork || '原创世界';
    const recentWorldline = this.recentWorldlineRecords(store, work, 5000, 6000);
    return [
      `界面：《我狠狠操控》主剧情/被操控角色推演`,
      `背景：正在操控作品《${work}》所在的异世界/原作世界，不是玩家现实世界；现实资料只作为操控者身份与动机背景。`,
      `玩家：${store.playerName || store.playerProfile?.name || '玩家'}`,
      `玩家现实资料：${store.playerSetupSummary?.() || '玩家资料未完成。'}`,
      `被操控角色：${c.name || '未知角色'}｜作品：${work}｜身份：${c.role || '未知'}`,
      `角色设定：${this.limit(c.detail || c.personality || '暂无角色简介。', 1000)}`,
      `角色技能：${Array.isArray(c.skills) ? c.skills.map((s) => `${s.name || '技能'}:${s.desc || s.description || ''}`).join('；') : '无'}`,
      `当前模式：${store.online ? 'online' : 'offline'}｜控制方式：${store.controlMode || 'possess'}`,
      `游戏内时间：${store.entryTimeLabel?.() || '未知'}｜场景：${store.sceneTitle || '剧情现场'}｜回合：${store.turn || 1}`,
      `当前目标：${store.quest || '确认操控连接'}`,
      `当前情绪/关系：情绪=${store.mood || '冷静'}｜信任=${store.trust ?? '--'}｜反抗=${store.resistance ?? '--'}`,
      `角色当前数值：\n${store.metricGroups?.(state).map((group) => `${group.title}：${Object.entries(group.values || {}).map(([k, v]) => `${k}${v}`).join('、')}`).join('\n') || '暂无数值。'}`,
      `上线体验：次数=${exp.onlineCount || 0}｜感觉=${exp.feeling || '未知'}｜适应=${exp.adaptation || 0}/100｜摘要=${exp.summary || '尚无经历'}`,
      `目标状态快照：\n${window.GameModules.promptSections?.stateSnapshot?.(store, state) || '暂无角色卡快照。'}`,
      `最近世界线记录：\n${recentWorldline}`,
      `最近剧情：\n${this.recentLog(store, 4)}`,
      `本次行动：${action || '继续推进操控剧情'}`,
    ].join('\n');
  },

  recentLog(store, limit = 4) {
    const rows = (store.log || []).filter((entry) => entry.kind === 'novel').slice(-limit);
    return rows.map((entry) => [`玩家行动：${entry.playerText || ''}`, `剧情：${this.limit(entry.storyText || '', 320)}`, entry.mind ? `角色心理：${this.limit(entry.mind, 160)}` : ''].filter(Boolean).join('\n')).join('\n---\n') || '暂无主剧情记录。';
  },

  worldlineRecordText(event = {}) {
    return [
      `记录编号：${event.eventId || event.id || '未知记录'}`,
      `时间：${event.time || '未知'}`,
      `标题：${event.name || '异世界事件'}`,
      `情节：${event.plotId || event.summary || '未归纳'}`,
      `状态：${event.status || '已记录'}`,
      `详细：${String(event.detail || '').trim()}`,
    ].filter(Boolean).join('\n');
  },

  recentWorldlineRecords(store, worldTag = '', targetChars = 5000, maxChars = 6000) {
    const lore = (store.savedWorldLores || []).find((item) => item.worldTag === worldTag) || {};
    const line = lore.worldline || window.GameModules.sqliteSave.getWorldline?.(worldTag) || {};
    const events = (line.events || []).filter((event) => String(event.detail || '').trim());
    const picked = [];
    let total = 0;
    const separator = '\n\n---\n\n';
    for (const event of events.slice().reverse()) {
      const text = this.worldlineRecordText(event);
      const nextTotal = total + text.length + (picked.length ? separator.length : 0);
      if (nextTotal > maxChars) break;
      picked.push(text);
      total = nextTotal;
      if (total >= targetChars) break;
    }
    return picked.length ? picked.reverse().join(separator) : '暂无符合长度上限的最近世界线记录。';
  },

  buildLoadedText(items = []) {
    if (!items.length) return '本轮尚未动态载入额外资料。';
    return items.map((item, index) => `### 资料${index + 1}｜${item.title}\n${this.limit(item.text, item.max || 1600)}`).join('\n\n');
  },

  async skillText(store) {
    const ids = ['emotion.feeling.wearing.assess', 'memory.query', 'character.query', 'past.event.query', 'lexicon.query', 'item.query', 'company.query', 'faction.query', 'realworld.location.query', 'realworld.history.query'];
    const texts = await Promise.all(ids.map((id) => window.GameModules.skillLoader?.instruction?.(id) || ''));
    const crossWorld = ['# 跨世界资料查询', '每个 request.params 可写 world/worldTag 指定资料所属世界；默认当前操控作品。需要玩家现实资料时写现实世界名，需要其它作品资料时写作品名。', '当前作品世界线用 realworld.history.query 查询；作品原作设定用 worklore.query 查询；玩家现实资料可用 company.query、faction.query、realworld.location.query。'].join('\n');
    return [crossWorld, window.GameModules.workLoreMaterials?.skillText?.() || '', ...texts.filter(Boolean)].join('\n\n');
  },

  async loadRequests(store, action, requests = [], loadedKeys = new Set(), materialSession = null, materials = window.GameModules.workLoreMaterials, memoryIds = new Set(), loaded = [], current = []) {
    const out = [];
    for (const req of requests.slice(0, 3)) {
      const skill = String(req?.skill || '').trim();
      const method = String(req?.method || '').trim();
      const params = req?.params && typeof req.params === 'object' ? req.params : {};
      const memoryTarget = skill === 'memory.query' ? String(params.characterId || params.id || store.character?.id || '').trim() : '';
      const broadMemory = memoryTarget && this.isBroadMemoryRequest(method, params);
      if (broadMemory && memoryIds.has(memoryTarget)) continue;
      const key = `${skill}:${method}:${JSON.stringify(params)}`;
      if (!skill || !method || loadedKeys.has(key)) continue;
      loadedKeys.add(key);
      const material = materials?.optionFor?.({ skill, method, params });
      const max = material?.maxChars || this.maxFor(skill);
      if (!this.hasBudget(loaded, current, out, max)) continue;
      const text = await this.dispatch(store, action, skill, method, { ...params, maxChars: max });
      if (!text) continue;
      if (broadMemory) memoryIds.add(memoryTarget);
      const title = `${skill}.${method}`;
      materials?.record?.(materialSession, { skill, method, params }, title, text);
      out.push({ title, text, max });
    }
    return out;
  },

  isBroadMemoryRequest(method = '', params = {}) {
    const keyword = String(params.keyword || '').trim();
    return !keyword || ['getRecentCharacterMemories', 'getCharacterMemory', 'searchCharacterMemory'].includes(method);
  },

  async autoLoadForStep(store, action, loadedKeys, materialSession, materials, memoryIds, step, loaded = [], current = []) {
    if (step !== 1) return [];
    const out = [];
    const add = async (method, params, title, max) => {
      if (!this.hasBudget(loaded, current, out, max)) return;
      const req = { skill: 'worklore.query', method, params };
      const key = materials?.keyOf?.(req) || `${req.skill}:${req.method}:${JSON.stringify(req.params || {})}`;
      if (loadedKeys.has(key) || this.hasSimilarWorkLore([...loaded, ...current, ...out], method, params)) return;
      loadedKeys.add(key);
      const text = await window.GameModules.workLoreQuery.dispatch(store, action, method, { ...params, auto: true, maxChars: max });
      if (!text) return;
      materials?.record?.(materialSession, req, title, text);
      out.push({ title, text, max });
    };
    await add('getReadme', {}, '自动资料：作品 README 结构', this.autoLimits.readme);
    const characterName = String(store.character?.name || '').trim();
    if (characterName) await add('searchPeople', { keyword: characterName }, '自动资料：当前角色人物卡', this.autoLimits.people);
    if (this.shouldAutoTimeline(store, action)) await add('searchTimeline', { keyword: this.timelineKeyword(store, action) }, '自动资料：当前阶段时间线', this.autoLimits.timeline);
    return out;
  },

  hasBudget(loaded = [], current = [], pending = [], nextMax = 0) {
    const used = [...loaded, ...current, ...pending].reduce((sum, item) => sum + String(item.text || '').length, 0);
    return used + nextMax <= this.materialBudgetChars;
  },

  hasSimilarWorkLore(items = [], method = '', params = {}) {
    const keyword = String(params.keyword || '').trim();
    return items.some((item) => {
      const title = String(item.title || '');
      const text = String(item.text || '');
      if (!title.includes(`worklore.query.${method}`) && !title.includes(method) && !text.includes(method)) return false;
      return !keyword || text.includes(keyword);
    });
  },

  shouldAutoTimeline(store, action = '') {
    const text = `${store.entryTimeLabel?.() || ''} ${store.sceneTitle || ''} ${store.quest || ''} ${action || ''}`;
    return !/未知/.test(text) && /(第\s*\d+|\d+年|\d+月|\d+日|夜|昼|晨|晚|阶段|章节|圣杯战争|开战|决战|当前时间|时间线)/.test(text);
  },

  timelineKeyword(store, action = '') {
    return [store.entryTimeLabel?.(), store.sceneTitle, store.quest, store.character?.name, action].filter(Boolean).join(' ');
  },

  history(store, method, params = {}) {
    const worldTag = String(params.world || params.worldTag || store.character?.work || store.selectedWork || '原创世界').trim();
    const keyword = String(params.keyword || '').trim();
    if (method === 'listWorldlineIndex') return this.worldlineIndex(store, worldTag);
    if (method === 'searchWorldlineByKeyword') return this.searchWorldline(store, worldTag, keyword, '关键词');
    if (method === 'searchWorldlineByTime') return this.searchWorldlineByTime(store, worldTag, params);
    if (method === 'listWorldlinePlots') return this.worldlinePlots(store, worldTag);
    if (method === 'getWorldlinePlotRecords') return this.worldlinePlotRecords(store, worldTag, params);
    return window.GameModules.realWorldAgentContext.history(store, method, params);
  },

  worldlineFor(store, worldTag = '') {
    const tag = String(worldTag || store.character?.work || store.selectedWork || '原创世界').trim();
    const lore = (store.savedWorldLores || []).find((item) => item.worldTag === tag) || {};
    return lore.worldline || window.GameModules.sqliteSave.getWorldline?.(tag) || { events: [], plots: [], pendingPlot: null };
  },

  worldlineIndex(store, worldTag = '') {
    const line = this.worldlineFor(store, worldTag);
    const pending = line.pendingPlot ? `记录中｜${line.pendingPlot.startedAt || ''}-${line.pendingPlot.endedAt || ''}｜记录数:${(line.pendingPlot.recordIds || []).length}` : '记录中｜暂无';
    const plots = (line.plots || []).slice(-12).map((plot) => `情节｜${plot.情节编号 || plot.id || '未编号'}｜${plot.情节标题 || plot.情节名称 || plot.摘要 || '未命名'}｜${plot.情节时间段 || ''}｜记录:${plot.重要记录编号 || plot.recordIds || ''}`);
    const events = (line.events || []).slice(-12).map((event) => this.eventLine(event));
    return [`世界线清单：${worldTag || store.character?.work || '当前作品'}`, pending, ...plots, ...events].join('\n') || '暂无世界线资料。';
  },

  searchWorldline(store, worldTag = '', query = '', label = '关键词') {
    const key = String(query || '').trim();
    if (!key) return this.worldlineIndex(store, worldTag);
    const line = this.worldlineFor(store, worldTag);
    const events = (line.events || []).filter((event) => this.worldlineEventText(event).includes(key)).slice(-8);
    const plots = (line.plots || []).filter((plot) => this.worldlinePlotText(plot).includes(key)).slice(-6);
    const eventText = events.map((event) => this.eventLine(event)).join('\n');
    const plotText = plots.map((plot) => this.worldlinePlotDetail(line, plot)).join('\n\n');
    return this.limit([`${label}查询：${key}`, plotText ? `命中情节：\n${plotText}` : '', eventText ? `命中事件：\n${eventText}` : ''].filter(Boolean).join('\n\n') || '未命中世界线资料。', 1800);
  },

  searchWorldlineByTime(store, worldTag = '', params = {}) {
    const start = this.parseHistoryTime(params.startTime || params.start || params.minTime || params.from);
    const end = this.parseHistoryTime(params.endTime || params.end || params.maxTime || params.to);
    const keyword = String(params.keyword || '').trim();
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) return this.searchWorldline(store, worldTag, String(params.time || params.keyword || '').trim(), '时间');
    const line = this.worldlineFor(store, worldTag);
    const keywordHit = (text) => !keyword || text.includes(keyword);
    const inRange = (value) => {
      const at = this.parseHistoryTime(value);
      return Number.isFinite(at) && at >= start && at <= end;
    };
    const events = (line.events || []).filter((event) => inRange(event.time) && keywordHit(this.worldlineEventText(event))).slice(-8);
    const plots = (line.plots || []).filter((plot) => this.plotOverlapsRange(plot, start, end) && keywordHit(this.worldlinePlotText(plot))).slice(-6);
    const eventText = events.map((event) => this.eventLine(event)).join('\n');
    const plotText = plots.map((plot) => this.worldlinePlotDetail(line, plot)).join('\n\n');
    const title = `时间段查询：${params.startTime || params.start || ''} - ${params.endTime || params.end || ''}${keyword ? `｜关键词：${keyword}` : ''}`;
    return this.limit([title, plotText ? `命中情节：\n${plotText}` : '', eventText ? `命中事件：\n${eventText}` : '未命中该时间段世界线资料。'].filter(Boolean).join('\n\n'), 1800);
  },

  parseHistoryTime(value = '') {
    const text = String(value || '').trim();
    const match = text.match(/(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?(?:[ T]+(\d{1,2})[:：](\d{1,2})(?::(\d{1,2}))?)?/u);
    if (!match) return NaN;
    const [, y, m, d, hh = '0', mm = '0', ss = '0'] = match;
    return new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss)).getTime();
  },

  plotOverlapsRange(plot = {}, start, end) {
    const times = String(plot.情节时间段 || plot.timeRange || plot.time || '').match(/\d{4}[-/.年]\d{1,2}[-/.月]\d{1,2}日?(?:[ T]+\d{1,2}[:：]\d{1,2}(?::\d{1,2})?)?/gu) || [];
    const parsed = times.map((item) => this.parseHistoryTime(item)).filter(Number.isFinite);
    if (!parsed.length) return false;
    const min = Math.min(...parsed), max = Math.max(...parsed);
    return max >= start && min <= end;
  },

  worldlinePlots(store, worldTag = '') {
    const line = this.worldlineFor(store, worldTag);
    return (line.plots || []).map((plot) => `${plot.情节编号 || '未编号'}｜${plot.情节名称 || plot.情节标题 || plot.摘要 || '未命名'}｜${plot.重要记录编号 || ''}`).join('\n') || '暂无已归纳情节。';
  },

  worldlinePlotRecords(store, worldTag = '', params = {}) {
    const line = this.worldlineFor(store, worldTag);
    const plotId = String(params.plotId || params.id || params.keyword || '').trim();
    const plot = (line.plots || []).find((item) => String(item.情节编号 || item.id || '').includes(plotId) || String(item.情节名称 || item.情节标题 || item.摘要 || '').includes(plotId));
    return plot ? this.worldlinePlotDetail(line, plot) : '未命中已归纳情节。';
  },

  worldlinePlotDetail(line = {}, plot = {}) {
    const ids = String(plot.重要记录编号 || plot.recordIds || '').split(/[、,，\s]+/).filter(Boolean);
    const events = (line.events || []).filter((event) => ids.includes(event.eventId) || ids.includes(event.id));
    return [`情节：${plot.情节编号 || plot.id || ''}｜${plot.情节标题 || plot.情节名称 || plot.摘要 || ''}`, `时间：${plot.情节时间段 || ''}`, `总结：${plot.情节总结 || plot.摘要 || plot.情节摘要 || ''}`, `关键片段：${plot.重要片段 || ''}`, `关联记录：\n${events.map((event) => this.eventLine(event)).join('\n') || ids.join('、') || '无'}`].join('\n');
  },

  worldlineEventText(event = {}) {
    return `${event.eventId || event.id || ''}\n${event.time || ''}\n${event.name || ''}\n${event.summary || ''}\n${event.plotId || ''}\n${event.detail || ''}\n${JSON.stringify(event)}`;
  },

  worldlinePlotText(plot = {}) {
    return `${plot.情节编号 || plot.id || ''}\n${plot.情节标题 || ''}\n${plot.情节名称 || ''}\n${plot.情节时间段 || ''}\n${plot.情节总结 || ''}\n${plot.摘要 || ''}\n${plot.重要片段 || ''}\n${plot.重要记录编号 || plot.recordIds || ''}\n${JSON.stringify(plot)}`;
  },

  eventLine(event = {}) {
    return `${event.eventId || event.id || '未知记录'}｜${event.time || ''}｜${event.name || '异世界事件'}｜${this.limit(event.detail || event.summary || '', 360)}`;
  },

  maxFor(skill) {
    if (skill === 'worklore.query') return 2200;
    if (skill === 'memory.query') return 1800;
    if (skill === 'past.event.query') return 5200;
    if (skill === 'character.query') return 1200;
    if (skill === 'item.query') return 1400;
    if (skill === 'lexicon.query') return 1200;
    return 1000;
  },

  async dispatch(store, action, skill, method, params) {
    const realCtx = window.GameModules.realWorldAgentContext;
    if (skill === 'worklore.query') return await window.GameModules.workLoreQuery.dispatch(store, action, method, params);
    if (skill === 'memory.query') return await realCtx.memory(store, action, method, { characterId: params.characterId || store.character?.id, ...params });
    if (skill === 'character.query') return window.GameModules.characterQuery?.query?.(store, method, { worldTag: params.worldTag || params.world || params.work || store.character?.work, ...params }) || '';
    if (skill === 'past.event.query') return window.GameModules.pastEventQuery?.query?.(store, method, { question: action, characterId: store.character?.id, characterName: store.character?.name, worldTag: store.character?.work, ...params }) || '';
    if (skill === 'lexicon.query') return await realCtx.lexicon(store, method, params);
    if (skill === 'item.query') return await realCtx.itemQuery(store, method, { target: params.target || store.character?.id, ...params });
    if (skill === 'company.query') return realCtx.company(store, method, params);
    if (skill === 'faction.query') return realCtx.faction(store, method, params);
    if (skill === 'realworld.location.query') return realCtx.location(store, method, params, action);
    if (skill === 'realworld.history.query') return this.history(store, method, { ...params, world: params.world || params.worldTag || store.character?.work });
    return '';
  },

  characterMemoriesForStep(store, action, characters = [], loaded = [], memoryIds = new Set(), first = false) {
    const ids = [store.character?.id, ...characters.map((item) => item.id || item.characterId).filter(Boolean)].filter(Boolean);
    const unique = [...new Set(ids)].filter((id) => !memoryIds.has(id)).slice(0, first ? 3 : 1);
    if (!unique.length) return null;
    const realCtx = window.GameModules.realWorldAgentContext;
    const text = unique.map((id) => `## ${id}\n${realCtx.recentCharacterMemoriesText?.(id, 6) || store.getCharacterMemory?.(id) || '暂无记忆。'}`).join('\n\n');
    return { title: '角色记忆', text, ids: unique, max: 1800 };
  },
};
