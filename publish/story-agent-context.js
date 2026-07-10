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
    const controlExperienceRules = window.GameModules.controlExperienceStage?.renderPromptBlock?.({
      config: store.controlExperienceConfigState || window.GameModules.controlExperienceConfig?.defaultConfig?.(),
      experience: exp,
      variables: {
        被控制者: c.name || '未知角色',
        角色性格: c.personality || '',
        角色身份: c.role || '',
        当前场景: store.sceneTitle || action || '',
      },
    }) || '';
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
      controlExperienceRules ? `上线体验阶段：\n${controlExperienceRules}` : '',
      `目标状态快照：\n${window.GameModules.promptSections?.stateSnapshot?.(store, state) || '暂无角色卡快照。'}`,
      `## 最近发送的世界线\n需严格跟着世界线续写，保证正文对最新世界线连续性。\n${recentWorldline}`,
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

  worldLabel(store = null) {
    return store?.character?.work || store?.selectedWork || '原创世界';
  },

  splitChineseRequestLine(line = '') {
    const shared = window.GameModules.realWorldAgentContext?.splitChineseRequestLine;
    if (typeof shared === 'function') return shared(line);
    const catalog = window.GameModules.realWorldAgentContextParts?.materialRequestCatalog?.splitChineseRequestLine;
    if (typeof catalog === 'function') return catalog.call(window.GameModules.realWorldAgentContextParts.materialRequestCatalog, line);
    const body = String(line || '').replace(/^资料请求\d+\s*[：:]/u, '').trim();
    return body.split(/[，、；;]/u).map((part) => part.trim()).filter(Boolean);
  },

  guidedMaterialRequestCatalog(mode = 'story') {
    const sharedCatalog = window.GameModules.realWorldAgentContext?.guidedMaterialRequestCatalog;
    const fallbackCatalog = window.GameModules.realWorldAgentContextParts?.materialRequestCatalog?.guidedMaterialRequestCatalog;
    const baseSource = typeof sharedCatalog === 'function'
      ? sharedCatalog.call(window.GameModules.realWorldAgentContext, mode)
      : (typeof fallbackCatalog === 'function'
        ? fallbackCatalog.call(window.GameModules.realWorldAgentContextParts.materialRequestCatalog, mode)
        : []);
    const base = baseSource.filter((item) => item.mode === 'both');
    const work = (p, store) => p[1] || this.worldLabel(store);
    return [
      ...base,
      { mode: 'story', category: '作品设定查询', action: '入口说明', skill: 'worklore.query', method: 'getReadme', buildParams: (p, options) => ({ world: p[0] || this.worldLabel(options.store) }) },
      { mode: 'story', category: '作品设定查询', action: '常驻设定', skill: 'worklore.query', method: 'getDefaultLoad', buildParams: (p, options) => ({ world: p[0] || this.worldLabel(options.store) }) },
      { mode: 'story', category: '作品设定查询', action: '搜索人物', skill: 'worklore.query', method: 'searchPeople', buildParams: (p, options) => ({ keyword: p[0] || '', world: work(p, options.store) }) },
      { mode: 'story', category: '作品设定查询', action: '搜索剧情', skill: 'worklore.query', method: 'searchPlot', buildParams: (p, options) => ({ keyword: p[0] || '', world: work(p, options.store) }) },
      { mode: 'story', category: '作品设定查询', action: '搜索时间线', skill: 'worklore.query', method: 'searchTimeline', buildParams: (p, options) => ({ keyword: p[0] || '', world: work(p, options.store) }) },
      { mode: 'story', category: '作品设定查询', action: '搜索能力', skill: 'worklore.query', method: 'searchAbility', buildParams: (p, options) => ({ keyword: p[0] || '', world: work(p, options.store) }) },
      { mode: 'story', category: '作品设定查询', action: '搜索关系', skill: 'worklore.query', method: 'searchRelationship', buildParams: (p, options) => ({ keyword: p[0] || '', world: work(p, options.store) }) },
      { mode: 'story', category: '作品设定查询', action: '搜索地点', skill: 'worklore.query', method: 'searchLocation', buildParams: (p, options) => ({ keyword: p[0] || '', world: work(p, options.store) }) },
      { mode: 'story', category: '作品设定查询', action: '搜索物品', skill: 'worklore.query', method: 'searchItem', buildParams: (p, options) => ({ keyword: p[0] || '', world: work(p, options.store) }) },
    ];
  },

  stage1MaterialCatalogText(mode = 'story') {
    const lines = [];
    const seen = new Map();
    this.guidedMaterialRequestCatalog(mode).forEach((item) => {
      if (!(item.mode === 'both' || item.mode === mode || mode === 'story')) return;
      const list = seen.get(item.category) || [];
      if (!list.includes(item.action)) list.push(item.action);
      seen.set(item.category, list);
    });
    seen.forEach((actions, category) => lines.push(`${category}：${actions.join('、')}`));
    return lines.join('\n') || '无可请求资料';
  },

  redactPromptPollution(text = '') {
    return window.GameModules.realWorldAgentContext.redactPromptPollution(text);
  },

  loadedRoutingSummary(items = []) {
    return window.GameModules.realWorldAgentContext.loadedRoutingSummary(items);
  },

  buildStage1RoutingContext({ store, action, loaded = [], config = null } = {}) {
    const work = this.worldLabel(store);
    const character = store?.character?.name || '未知角色';
    const scene = store?.sceneTitle || '未知场景';
    return [
      `模式：${config?.label || '操控剧情'}`,
      `本次行动：${action || '继续推进操控剧情'}`,
      `当前位置：${scene}`,
      `当前时间：${store?.entryTimeLabel?.() || '未知时间'}`,
      `当前对象线索：${character}｜作品：${work}`,
      `已加载资料摘要：\n${this.loadedRoutingSummary(loaded)}`,
      `可请求资料目录：\n${this.stage1MaterialCatalogText('story')}`,
    ].join('\n');
  },

  loadedAnchorSummary(items = []) {
    return window.GameModules.realWorldAgentContext.loadedAnchorSummary(items);
  },

  sceneParticipantBoundary(trace = [], effectiveSceneLayers = null) {
    return window.GameModules.realWorldAgentContext.sceneParticipantBoundary(trace, effectiveSceneLayers);
  },

  buildSceneAnchorContext({ store, action, loaded = [], trace = [], effectiveSceneLayers = null, config = null } = {}) {
    const work = this.worldLabel(store);
    const character = store?.character?.name || '未知角色';
    const scene = store?.sceneTitle || '未知场景';
    return [
      `模式：${config?.label || '操控剧情'}`,
      `本次行动：${action || '继续推进操控剧情'}`,
      `当前场景位置：${scene}`,
      `当前时间提示：${store?.entryTimeLabel?.() || '未知时间'}`,
      `空间边界线索：仅保留当前作品《${work}》中地点、相邻空间、移动路径、自然介入条件。`,
      `参与者边界：\n${this.sceneParticipantBoundary(trace, effectiveSceneLayers)}`,
      `已加载锚定事实：\n${this.loadedAnchorSummary(loaded)}`,
      `当前对象线索：${character}｜作品：${work}`,
    ].join('\n');
  },

  redactNarrationPollution(text = '') {
    return window.GameModules.realWorldAgentContext.redactNarrationPollution(text);
  },

  safeNarrationTitle(title = '', index = 0) {
    return window.GameModules.realWorldAgentContext.safeNarrationTitle(title, index);
  },

  loadedNarrationSummary(items = []) {
    return window.GameModules.realWorldAgentContext.loadedNarrationSummary(items);
  },

  buildNarrationContext({ store, action, config = null } = {}) {
    const work = this.worldLabel(store);
    const character = store?.character?.name || '未知角色';
    const recent = this.redactNarrationPollution(this.recentLog(store, 4));
    return [
      `模式：${config?.label || '操控剧情'}`,
      `本次行动：${action || '继续推进操控剧情'}`,
      `作品：${work}`,
      `被操控角色：${character}`,
      `当前场景：${store?.sceneTitle || '未知场景'}`,
      `当前时间提示：${store?.entryTimeLabel?.() || '未知时间'}`,
      `当前目标：${store?.quest || '确认操控连接'}`,
      `最近事实连续性：正文承接最近已发生事实，不改写已发送内容；只写本次行动直接结果。`,
      `最近剧情摘要：\n${recent || '无'}`,
    ].join('\n');
  },

  parseChineseMaterialRequest(line = '', options = {}) {
    const parts = this.splitChineseRequestLine(line);
    if (parts.length < 2) return null;
    const [category, action, ...params] = parts;
    const entry = this.guidedMaterialRequestCatalog('story').find((item) => item.category === category && item.action === action);
    if (!entry) return null;
    const built = entry.buildParams(params, { ...options, store: options.store });
    if (Object.values(built).some((value) => value === '')) return null;
    return { skill: entry.skill, method: entry.method, params: built, sourceText: String(line || '').trim() };
  },

  participantProfileRequests(data = {}, options = {}) {
    const store = options.store || {};
    const world = this.worldLabel(store);
    const forbidden = new Set((data.forbiddenParticipants || []).map((item) => String(item?.name || item || '').trim()).filter(Boolean));
    const seen = new Set();
    const requests = [];
    const add = (items = []) => {
      for (const item of items || []) {
        const name = String(item?.name || item || '').trim();
        if (!name || forbidden.has(name) || seen.has(name) || requests.length >= 3) continue;
        seen.add(name);
        requests.push({ skill: 'worklore.query', method: 'searchPeople', params: { keyword: name, name, world } });
      }
    };
    add(data.forcedParticipants);
    add(data.priorityCandidates);
    add(data.dramaCandidates);
    return requests;
  },

  sceneAnchorRequests(data = {}, store = {}) {
    const queries = data.sceneQueries || {};
    const world = this.worldLabel(store);
    const requests = [];
    (queries.location || []).forEach((keyword) => {
      const text = String(keyword || '').trim();
      if (text) requests.push({ skill: 'worklore.query', method: 'searchLocation', params: { keyword: text, world } });
    });
    (queries.causality || []).forEach((keyword) => {
      const text = String(keyword || '').trim();
      if (text) requests.push({ skill: 'worklore.query', method: 'searchTimeline', params: { keyword: text, world } });
    });
    (queries.conflict || []).forEach((keyword) => {
      const text = String(keyword || '').trim();
      if (text) requests.push({ skill: 'worklore.query', method: 'searchPlot', params: { keyword: text, world } });
    });
    return requests.slice(0, 4);
  },

  randomActiveEventCandidates(store, action = '', options = {}) {
    const rng = typeof options.rng === 'function' ? options.rng : Math.random;
    const blocked = new Set(String(action || '').match(/[\p{Script=Han}A-Za-z0-9_]{2,}/gu) || []);
    ['forcedParticipants', 'priorityCandidates', 'dramaCandidates', 'forbiddenParticipants'].forEach((key) => {
      (Array.isArray(options[key]) ? options[key] : []).forEach((item) => {
        const name = String(item?.name || item?.characterName || item?.idOrName || item?.id || item || '').trim();
        if (name) blocked.add(name);
      });
    });
    const pool = (store.knownCharacters || []).map((item) => ({ id: item.id || item.name, name: item.name || item.id })).filter((item) => item.name && !blocked.has(item.name));
    if (!pool.length) return [];
    const roll = rng();
    const count = roll < 0.5 ? 0 : (roll < 0.8 ? 1 : (roll < 0.95 ? 2 : 3));
    return pool.slice(0, count);
  },

  stage1BlockedMaterialText(skill = '', method = '', policy = 'deny', step = 1) {
    const loader = window.GameModules.realWorldAgentContextParts?.materialLoader;
    if (loader?.stage1BlockedMaterialText) {
      const text = loader.stage1BlockedMaterialText(skill, method, policy, step);
      if (policy === 'deep' && skill === 'worklore.query') {
        return text.replace('控势摘要 resolveTerritoryBrief 或势力列表/档案搜索等浅读 skill', 'getReadme、searchPeople、searchTimeline 等浅读 skill');
      }
      return text;
    }
    return `资料请求未执行：${skill}.${method}`;
  },

  async loadRequests(store, action, requests = [], loadedKeys = new Set(), materialSession = null, materials = window.GameModules.workLoreMaterials, memoryIds = new Set(), loaded = [], current = [], options = {}) {
    const step = Number(options?.step || 1);
    const out = [];
    for (const req of requests.slice(0, options.limit || 3)) {
      const skill = String(req?.skill || '').trim();
      const method = String(req?.method || '').trim();
      const params = req?.params && typeof req.params === 'object' ? req.params : {};
      if (!skill || !method) continue;
      if (materials?.isStage1Eligible && !materials.isStage1Eligible({ skill, method }, step)) {
        const policy = materials.stage1PolicyFor?.({ skill, method }) || 'deny';
        materials.recordStage1Block?.(materialSession, store, { skill, method, params }, policy, step);
        out.push({
          title: `blocked:${skill}.${method}`,
          text: this.stage1BlockedMaterialText(skill, method, policy, step),
          max: 260,
        });
        continue;
      }
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
    if (skill === 'character.query') return 3200;
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
