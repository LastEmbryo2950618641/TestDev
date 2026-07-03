window.GameModules = window.GameModules || {};

window.GameModules.realWorldAgentLoop = {
  finalSeparator: '<!--REAL_WORLD_JSON-->',
  minSteps: 2,
  maxSteps: 8,

  async run(store, action, logId = null) {
    return await this.runConfigured(store, action, logId, this.realConfig());
  },

  async runStory(store, action, logId = null) {
    return await this.runConfigured(store, action, logId, this.storyConfig());
  },

  realConfig() {
    return { mode: 'real', label: '现实', ctx: window.GameModules.realWorldAgentContext, materials: window.GameModules.realWorldMaterials, templateId: 'inference-stage3-narration', firstTemplateId: 'inference-stage1-guided-query' };
  },

  storyConfig() {
    return { mode: 'story', label: '操控剧情', ctx: window.GameModules.storyAgentContext, materials: window.GameModules.workLoreMaterials, templateId: 'inference-stage3-narration', firstTemplateId: 'inference-stage1-guided-query' };
  },

  async runConfigured(store, action, logId = null, config = this.realConfig()) {
    const ctx = config.ctx;
    if (!ctx) throw new Error(`${config.label || 'Loop'}上下文未加载`);
    const loaded = [];
    const trace = [];
    const loadedKeys = new Set();
    const memoryIds = new Set();
    const skills = await ctx.skillText(store);
    const base = ctx.baseSnapshot(store, action);
    const materialSession = config.materials?.createSession?.(action) || null;
    let lastPrompt = '';
    let lastRaw = '';
    let lastGuidance = null;

    const guidedMaxSteps = this.guidedMaxSteps(store, config);
    for (let step = 1; step <= guidedMaxSteps; step += 1) {
      const prompt = await this.buildConfiguredPrompt({ store, action, base, loaded, skills, step, materialSession, config, guidance: lastGuidance });
      lastPrompt = prompt;
      this.markConfiguredStep(store, logId, this.stepText(step, config), config);
      const raw = await this.completeConfiguredParsedStep(store, prompt, logId, false, false, config, step > 1);
      lastRaw = raw.raw;
      const data = raw.data;
      if (!data) throw new Error(`${config.label || 'Loop'}返回格式错误`);
      lastGuidance = data;
      const traceItem = this.traceItem(step, data, raw.raw, ctx);
      trace.push(traceItem);

      const results = await this.loadStepContext(ctx, store, action, data, loadedKeys, loaded, memoryIds, step, materialSession, config.materials);
      traceItem.loaded = results.map((item) => ({ title: item.title, text: ctx.limit(item.text, 800) }));
      this.updateConfiguredTrace(store, logId, trace, config);
      if (results.length) {
        loaded.push(...results);
        this.markConfiguredStep(store, logId, this.loadedContextText(data, results, step, config), config);
      }

      if (data.type === 'request_context' && step < guidedMaxSteps) continue;
      if (step < this.minSteps && data.type !== 'context_done') continue;
      break;
    }
    return await this.generateConfiguredFinal({ store, action, base, loaded, skills, trace, materialSession, logId, prompt: lastPrompt, raw: lastRaw, config });
  },

  async generatePhasedFinal(args) {
    return await this.generateConfiguredFinal({ ...args, config: this.realConfig() });
  },

  async generateConfiguredFinal({ store, action, base, loaded, skills, trace, materialSession, logId, config = this.realConfig() }) {
    const effectiveSceneLayers = this.resolveEffectiveSceneLayers(trace, store, config);
    const sceneAnchorPrompt = await this.buildConfiguredSceneAnchorPrompt({ store, action, base, loaded, trace, effectiveSceneLayers, materialSession, config });
    this.markConfiguredStep(store, logId, `${config.label}资料已载入，正在生成场景锚定报告…`, config);
    const sceneAnchor = await this.completeSceneAnchorReport(store, sceneAnchorPrompt, logId, config);
    const sceneAnchorReport = sceneAnchor.text;
    const narrationPrompt = await this.buildConfiguredNarrationPrompt({ store, action, base, loaded, skills, materialSession, sceneAnchorReport, config });
    const narrationMessages = this.buildConfiguredNarrationMessages({ store, action, prompt: narrationPrompt, config });
    this.markConfiguredStep(store, logId, `${config.label}场景锚定完成，正在生成正文…`, config);
    const narrationRaw = await this.completeConfiguredStep(store, narrationMessages, logId, true, config);
    const narration = await this.ensureConfiguredNarrationLength(store, action, narrationPrompt, this.cleanPhasedNarration(narrationRaw), logId, config);
    if (!narration) throw new Error(`${config.label}正文为空`);
    this.showConfiguredNarration(store, logId, narration, config);

    let settlementPrompt = 'Stage4 中文 K:V 滑动结算', settlementRaw = '', updates = {};
    try {
      const participants = this.mergeNarrationParticipants(this.stageParticipants(effectiveSceneLayers, loaded, store), narration, store, sceneAnchor.data);
      this.markConfiguredStep(store, logId, `${config.label}正文已完成，正在生成中文 K:V 滑动结算…`, config, { keepNarration: true });
      updates = await this.completeConfiguredSettlementKvWindow({ store, action, base, loaded, skills, materialSession, narration, trace, participants, logId, config });
      updates = { ...updates, type: updates.type || 'final' };
      settlementRaw = JSON.stringify(updates);
    } catch (err) {
      console.warn(`${config.label}状态更新生成失败，保留已生成正文并使用最小结算:`, err.message);
      updates = this.fallbackUpdateJson(store, action, config);
      settlementRaw = JSON.stringify(updates);
    }
    const result = config.mode === 'story' ? this.mergeStoryNarrationAndUpdates(store, narration, updates, config) : this.mergeNarrationAndUpdates(store, narration, updates, config);
    const anchoredTrace = trace.map((item, index) => index === trace.length - 1 ? { ...item, anchorReport: sceneAnchor.data } : item);
    return { result, prompt: `---SCENE_ANCHOR---\n${sceneAnchorPrompt}\n\n---NARRATION---\n${narrationPrompt}\n\n---SETTLEMENT_KV---\n${settlementPrompt}`, loaded, raw: `${sceneAnchor.raw}\n\n${narrationRaw}\n\n${settlementRaw}`, trace: anchoredTrace };
  },

  async loadStepContext(ctx, store, action, data, loadedKeys, loaded, memoryIds, step, materialSession = null, materials = window.GameModules.realWorldMaterials) {
    const out = [];
    if (data.type === 'request_context') {
      const autoLoaded = await ctx.autoLoadForStep?.(store, action, loadedKeys, materialSession, materials, memoryIds, step, loaded, out) || [];
      out.push(...autoLoaded);
      const load = async (requests, limit) => {
        if (!Array.isArray(requests) || !requests.length) return [];
        return await ctx.loadRequests(store, action, requests, loadedKeys, materialSession, materials, memoryIds, loaded, out, { limit });
      };
      const profileRequests = ctx.participantProfileRequests?.(data, { store, mode: data.mode }) || [];
      out.push(...await load(profileRequests, 3));
      const anchorRequests = data.sceneQueriesAreReasons ? [] : (ctx.sceneAnchorRequests?.(data, store, { mode: data.mode }) || []);
      out.push(...await load(anchorRequests, 4));
      const requestList = Array.isArray(data.requests) && data.requests.length ? data.requests : (Array.isArray(data.needed) ? data.needed : []);
      out.push(...await load(requestList, 2));
    }
    const locationItem = await ctx.actionLocationForStep?.(store, action, data.characters || data.relatedCharacters || [], data.reason || '', loadedKeys);
    if (locationItem?.text) {
      materials?.record?.(materialSession, { skill: 'realworld.location.query', method: 'searchLocation', params: { keyword: 'autoCharacterRoute' } }, locationItem.title, locationItem.text);
      out.push(locationItem);
    }
    const memoryItem = ctx.characterMemoriesForStep?.(store, action, data.characters || data.relatedCharacters || [], [...loaded, ...out], memoryIds, step === 1);
    if (memoryItem?.text) {
      (memoryItem.ids || []).forEach((id) => memoryIds.add(id));
      materials?.record?.(materialSession, { skill: 'memory.query', method: 'searchCharacterMemory', params: { keyword: 'characterMemoriesForStep' } }, memoryItem.title, memoryItem.text);
      out.push(memoryItem);
    }
    return out;
  },

  async buildPrompt(args) {
    return await this.buildConfiguredPrompt({ ...args, config: this.realConfig() });
  },

  async buildConfiguredPrompt({ store, action, base, loaded, skills, step, materialSession = null, forceFinal = false, config = this.realConfig(), guidance = null }) {
    const actionText = this.actionText(action, config.mode === 'story' ? '继续推进操控剧情' : '继续观察现实世界');
    const loadedText = config.ctx.buildLoadedText(loaded);
    const materialText = config.materials?.summary?.(materialSession, { step }) || '';
    const randomOptions = { mode: config.mode };
    ['forcedParticipants', 'priorityCandidates', 'dramaCandidates', 'forbiddenParticipants'].forEach((key) => {
      if (Array.isArray(guidance?.[key])) randomOptions[key] = guidance[key];
    });
    const randomActiveCandidates = !forceFinal ? (config.ctx.randomActiveEventCandidates?.(store, action, randomOptions) || []) : [];
    const randomActiveCandidateText = randomActiveCandidates.length
      ? randomActiveCandidates.map((item, index) => `${index + 1}. ${item.name || item.id}`).join('；')
      : '无';
    const commonVars = {
      本次行动: actionText,
      当前步骤: forceFinal ? '收敛/final' : `${step}/${this.guidedMaxSteps(store, config)}`,
      最大步骤: this.guidedMaxSteps(store, config),
      推演自由度规则: config.mode === 'story' ? this.storyFreedomRule(store) : (store.realWorldFreedomRule?.() || '推演自由度：行动范围内。只推演玩家本次输入行动自然抵达的直接结果。'),
      当前步骤输出要求: this.stepOutputRule(step, forceFinal),
      随机场外角色候选: randomActiveCandidateText,
    };
    if (!forceFinal) {
      const stage1RoutingContext = config.ctx.buildStage1RoutingContext?.({ store, action: actionText, loaded, materialSession, config }) || [
        `模式：${config.label}`,
        `本次行动：${actionText}`,
        '已加载资料摘要：无',
        '可请求资料目录：无',
      ].join('\n');
      const previousGuidance = this.previousGuidanceSummary(guidance);
      const loadedRoutingSummary = config.ctx.loadedRoutingSummary?.(loaded) || '无';
      const materialCatalog = config.ctx.stage1MaterialCatalogText?.(config.mode) || '无';
      const rulesText = [
        '# Stage1 查询规划：紧凑 JSON 资料路由',
        '任务：只输出一个合法 JSON 对象，不输出中文 K:V、Markdown、正文或解释。',
        '你只负责判断本次行动生成正文前还需要哪些已有资料；不得写正文，不得锚定场景，不得结算状态，不得推进后续结果。',
        '资料请求规则：',
        '- 使用中文资料请求，不得输出英文 skill/method。',
        '- 资料请求最多 Top3；超过 Top3 的候选必须丢弃，不得输出资料请求4或更多编号。',
        '- 角色卡请求只代表可作为参考资料；不得因此把角色写入强制出场。',
        '- 已加载资料摘要已经覆盖的人物、地点、路线不得重复请求。',
        '- 不得请求衣着、鞋袜、随身物品等细节；这些细节不属于本阶段必要资料。',
        '- 不得照抄示例中的占位词；角色全称、世界全称、地点全称、人物全称、作品全称都必须替换为本次行动中的真实名称。',
        '- 资料请求示例：资料请求1：角色查询，搜索角色卡，刘思琪，2026现代都市现实世界',
        '- 资料请求示例：资料请求1：地点查询，查询附近地点，锦苑小区3栋2单元',
        '- 资料请求示例：资料请求1：作品设定查询，搜索人物，阿尔托莉雅·潘德拉贡，Fate/stay night',
        '随机事件规则：',
        '- 随机主动事件默认是场外背景，不自动入场。',
        '- 随机场外角色候选不等于禁止出场；不得仅因角色出现在随机场外角色候选中，就写入禁止出场。',
        '- 若随机角色已在强制出场、高优先候选、戏剧候选或禁止出场中，必须移除该随机事件。',
        '- 无明确自然闯入条件时，随机事件闯入条件必须写“无明确条件则禁止闯入”。',
        '出场边界规则：',
        '- 本轮必须基于上一轮查询规划摘要继续收敛；若候选层发生变化，以本轮字段作为当前判断，不要无理由重置候选层。',
        '- 玩家/当前被控主体由系统最终兜底为强制出场；强制出场允许多人，表示本次行动必然涉及、出现、回应或受影响的人物集合。',
        '- 不强制出场不等于禁止出场；禁止出场只用于明确场外、明确不可到达或被用户/资料规则明确禁止进入当前场景的角色。',
        '- 同地点/同住/相邻候选不得仅因未强制出场而写入禁止出场；可按相关性放入高优先候选或戏剧候选，或写“无”。',
        '- 玩家行动明确目标不得写入禁止出场，除非已加载资料明确显示其场外、不可到达或被规则禁止进入当前场景。',
      ].join('\n');
      const contextText = [
        `本次行动：${actionText}`,
        `当前步骤：${commonVars.当前步骤} / ${commonVars.最大步骤}`,
        '路由上下文：',
        stage1RoutingContext,
        '上一轮查询规划摘要：',
        previousGuidance,
        '已加载资料摘要：',
        loadedRoutingSummary,
        '可请求资料目录：',
        materialCatalog,
        '推演自由度规则：',
        commonVars.推演自由度规则,
        `随机场外角色候选：${randomActiveCandidateText}`,
      ].join('\n');
      const requestText = [
        '当前步骤输出要求：',
        commonVars.当前步骤输出要求,
        '固定输出规则：',
        '- 只输出一个紧凑 JSON 对象，首字符必须是 {，末字符必须是 }。',
        '- 不要 Markdown，不要 ```json 代码块，不要换行解释。',
        '- status 只能二选一：资料已足够 / 继续请求资料。',
        '- sceneQueries.location / sceneQueries.causality / sceneQueries.conflict 必须是字符串数组；没有则 []。',
        '- 若 status 为“继续请求资料”，优先输出 materialRequests，最多 3 条；没有可执行资料请求时 materialRequests 输出 []，但必须保留 sceneQueries 理由或明确参与者候选。',
        '- 最多2步后进入场景锚定；第2步不得为了重复确认而继续扩展资料循环。',
        '- participants.forced / priority / drama / forbidden 都必须是字符串数组；没有则 []。',
        '- randomEvents 必须是字符串数组；randomIntrusionCondition 没有明确条件时写“无明确条件则禁止闯入”。',
        '- 资料请求只能使用中文结构，不得输出英文 skill/method。',
        'JSON schema：',
        '{"plan":"查询规划摘要","status":"继续请求资料|资料已足够","sceneQueries":{"location":["地点查询理由"],"causality":["因果查询理由"],"conflict":["冲突查询理由"]},"participants":{"forced":["姓名"],"priority":["姓名"],"drama":["姓名"],"forbidden":["姓名"]},"randomEvents":["候选事件"],"randomIntrusionCondition":"无明确条件则禁止闯入","materialRequests":["角色查询，搜索角色卡，刘思琪，2026现代都市现实世界"]}',
        '【AI自检】：',
        '- 输出前必须自检 status 与 materialRequests、sceneQueries、participants 是否一致。',
        '- 若 materialRequests、sceneQueries、participants.forced、participants.priority、participants.drama 全为空，status 必须为“资料已足够”。',
        '- 不得输出旧 K:V 字段，例如“资料状态：”“资料请求1：”。',
      ].join('\n');
      return [
        { role: 'user', content: rulesText },
        { role: 'assistant', content: contextText },
        { role: 'user', content: requestText },
      ];
    }
    return window.GameModules.promptTemplates.render(config.templateId, {
      ...commonVars,
      基础上下文: base,
      动态载入资料: [loadedText, materialText].filter(Boolean).join('\n\n'),
      动态Skills: skills,
    });
  },

  guidedMaxSteps(store = {}, config = this.realConfig()) {
    const configured = Math.max(1, Math.min(8, Math.round(Number(store?.settingsState?.stage1MaterialMaxIterations) || 2)));
    return configured;
  },

  storyFreedomRule(store) {
    return store.online ? '操控剧情自由度：玩家输入是本回合对被操控者身体或行动方向的控制；正文只能推进到本次行动自然抵达的结果点，不替玩家完成后续长期行动。' : '离线剧情自由度：玩家输入是建议或态度；角色按性格、记忆、处境自主行动。';
  },

  stepOutputRule(step, forceFinal = false) {
    if (forceFinal) return `当前为收敛步骤：禁止继续请求资料。只输出完整中文 K:V 查询规划字段；必须从“查询规划：”开始，资料状态必须为“资料已足够”，资料请求写“无”，资料请求结束写“是”，固定输出顺序中的字段不得省略。不要输出 JSON、正文、旁白、Markdown、代码块和 final JSON。`;
    if (step === 1) return `当前是第1步：你是上下文路由器，只判断为了准确生成本次行动范围内正文需要载入哪些已有资料，并尽可能多而全地列出地点/因果/冲突查询理由。具体输出格式以 Stage1 中文 K:V 查询规划模板为准；不要写正文，不要结算状态，不要推演后续结果。`;
    if (step >= 2) return `当前是第${step}步/后续资料路由步骤：继续使用完整 Stage1 中文 K:V 查询规划格式。达到设置的资料收集迭代最大次数后，系统会带着已加载资料与查询理由进入场景锚定；若没有可执行资料请求，允许只保留查询理由并写“资料请求：无”。不要输出 JSON、正文、旁白、Markdown、代码块和 final JSON。`;
    return `当前只负责判断是否继续收集资料：继续使用完整 Stage1 中文 K:V 查询规划格式，必须从“查询规划：”开始，并逐行输出固定输出顺序中的所有字段。仍缺关键资料就写“资料状态：继续请求资料”并列出中文资料请求；资料足够或无法继续获取时写“资料状态：资料已足够”“资料请求：无”“资料请求结束：是”。不要输出 JSON、正文、旁白、Markdown、代码块和 final JSON。`;
  },

  previousGuidanceSummary(guidance = null) {
    if (!guidance) return '无';
    const names = (group = [], reasonLabel = '理由') => (Array.isArray(group) ? group : []).map((item) => {
      const name = item.name || item.idOrName || item.id || item.characterName;
      return `${name}${item.reason ? `（${reasonLabel}：${item.reason}）` : ''}`;
    }).join('、') || '无';
    const random = (Array.isArray(guidance.randomActiveEvents) ? guidance.randomActiveEvents : [])
      .map((item) => `${item.characterName || item.name}：${item.eventType || item.actionMethod || '背景行动'}｜${item.motivation || item.reason || ''}`)
      .join('；') || '无';
    const queryReasons = (label, key) => {
      const items = [...new Set(Array.isArray(guidance.sceneQueries?.[key]) ? guidance.sceneQueries[key] : [])];
      return items.length ? items.map((item, index) => `${label}${index + 1}：${item}`).join('\n') : `${label}1：无`;
    };
    return [
      `资料状态：${guidance.type === 'context_done' ? '资料已足够' : '继续请求资料'}`,
      queryReasons('地点查询理由', 'location'),
      queryReasons('因果查询理由', 'causality'),
      queryReasons('冲突查询理由', 'conflict'),
      `强制出场：${names(guidance.forcedParticipants, '出场理由')}`,
      `高优先候选：${names(guidance.priorityCandidates, '候选理由')}`,
      `戏剧候选：${names(guidance.dramaCandidates, '候选理由')}`,
      `禁止出场：${names(guidance.forbiddenParticipants, '不在场理由')}`,
      `随机主动事件：${random}`,
      `随机事件闯入条件：${guidance.randomIntrusionCondition || '无明确条件则禁止闯入'}`,
    ].join('\n');
  },

  async buildNarrationPrompt(args) {
    return await this.buildConfiguredNarrationPrompt({ ...args, config: this.realConfig() });
  },

  actionText(action, fallback = '') {
    if (action && typeof action === 'object') return String(window.GameModules.ai?.choiceText?.(action) || '').trim() || fallback;
    const text = String(action || '').trim();
    if (!text || /^\[object Object\]?$/u.test(text) || /^(?:undefined|null)$/iu.test(text) || /^[\[{][\s\S]*[\]}]$/u.test(text)) return fallback;
    return text;
  },

  continuityFallbackRule() {
    return '连续性兜底规则（最高优先级）：如果“本次行动”为空、无效、明显是 [object Object]、undefined、null、JSON对象或无法解释为玩家意图，则不要另起新场景，不要发明新行动；应把本次行动视为“继续承接最近世界线”，严格从最近世界线最后一幕、当前人物位置、动作状态和对话状态自然续写。若本次行动是有效自然语言，即使与前文弱相关，也必须先承接当前场景，再自然执行该行动。';
  },

  invisibleCharsPattern() {
    return /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/gu;
  },

  compactAiReturn(text = '', options = {}) {
    const raw = String(text || '')
      .replace(this.invisibleCharsPattern(), '')
      .replace(/```(?:json)?|```/giu, '')
      .trim();
    if (!raw) return '';
    if (options.json) return this.compactJsonWhitespace(raw);
    return raw.replace(/[\r\n\t]+/gu, '').replace(/ {2,}/gu, ' ').trim();
  },

  compactJsonWhitespace(text = '') {
    const raw = String(text || '').trim();
    if (!raw) return '';
    try {
      const extracted = window.GameModules.jsonUtils?.extractJson ? window.GameModules.jsonUtils.extractJson(raw) : raw;
      const repaired = window.GameModules.jsonUtils?.repairJson ? window.GameModules.jsonUtils.repairJson(extracted) : extracted;
      return JSON.stringify(JSON.parse(repaired));
    } catch (_) {
      return raw.replace(/[\r\n\t]+/gu, '').trim();
    }
  },

  compactJsonReturn(text = '') {
    return this.compactAiReturn(text, { json: true });
  },

  compactReturnRule() {
    return '返回必须紧凑：不要Markdown、不要标题、不要任务说明、不要换行符、不要制表符、不要不可见字符，只输出单行正文文本。';
  },

  participantDisplayName(item = {}) {
    if (typeof item === 'string') return item.trim();
    return String(item?.name || item?.characterName || item?.idOrName || item?.id || '').trim();
  },

  participantKey(item = {}) {
    if (typeof item === 'string') return item.trim();
    return String(item?.id || item?.idOrName || item?.name || item?.characterName || '').trim();
  },

  dedupeParticipants(items = [], options = {}) {
    const seen = new Set();
    const blockedNames = options.blockedNames || new Set();
    return (Array.isArray(items) ? items : []).filter((item) => {
      const name = this.participantDisplayName(item);
      const key = this.participantKey(item) || name;
      if (!name || blockedNames.has(name) || blockedNames.has(key) || seen.has(key) || seen.has(name)) return false;
      seen.add(key);
      seen.add(name);
      return true;
    });
  },

  currentForcedParticipants(store = null, config = this.realConfig()) {
    const forced = [this.currentPlayerParticipant(store)];
    const shared = store?.sharedControlState?.();
    const sharedName = String(shared?.profile?.name || shared?.name || '').trim();
    const sharedId = String(shared?.id || shared?.characterId || sharedName || '').trim();
    if (sharedName || sharedId) {
      forced.push({
        type: 'character',
        id: sharedId || sharedName,
        name: sharedName || sharedId,
        role: config?.mode === 'story' ? 'controlled-subject' : 'shared-control-subject',
        canSettle: true,
        reason: '玩家当前控制主体',
      });
    }
    return this.dedupeParticipants(forced);
  },

  latestLayer(items = [], key) {
    for (let i = items.length - 1; i >= 0; i -= 1) {
      if (Array.isArray(items[i]?.[key])) return items[i][key];
    }
    return [];
  },

  isEffectiveSceneLayers(value = null) {
    return !!value && !Array.isArray(value) && ['forcedParticipants', 'priorityCandidates', 'dramaCandidates', 'forbiddenParticipants', 'randomActiveEvents'].some((key) => Array.isArray(value?.[key]));
  },

  resolveEffectiveSceneLayers(trace = [], store = null, config = this.realConfig()) {
    const items = Array.isArray(trace) ? trace : (trace ? [trace] : []);
    const forcedBase = this.latestLayer(items, 'forcedParticipants').map((item) => ({ ...item, role: item.role || 'forced', canSettle: item.canSettle === false ? false : true }));
    const systemForced = this.currentForcedParticipants(store, config).map((item) => ({ ...item, role: item.role || 'actor', canSettle: true, reason: item.reason || '系统固定强制出场' }));
    const forcedParticipants = this.dedupeParticipants([...forcedBase, ...systemForced]);
    const forcedNames = new Set(forcedParticipants.flatMap((item) => [this.participantDisplayName(item), this.participantKey(item)]).filter(Boolean));

    const forbiddenRaw = this.latestLayer(items, 'forbiddenParticipants').map((item) => ({ ...item, role: item.role || 'forbidden', canLoadRoleCard: false, canEnterNarration: false, canSettle: false }));
    const forbiddenParticipants = this.dedupeParticipants(forbiddenRaw, { blockedNames: forcedNames });
    const forbiddenNames = new Set(forbiddenParticipants.flatMap((item) => [this.participantDisplayName(item), this.participantKey(item)]).filter(Boolean));

    const priorityBlocked = new Set([...forcedNames, ...forbiddenNames]);
    const priorityCandidates = this.dedupeParticipants(this.latestLayer(items, 'priorityCandidates').map((item) => ({ ...item, role: item.role || 'priority-candidate', canSettle: false })), { blockedNames: priorityBlocked });
    const priorityNames = new Set(priorityCandidates.flatMap((item) => [this.participantDisplayName(item), this.participantKey(item)]).filter(Boolean));

    const dramaBlocked = new Set([...priorityBlocked, ...priorityNames]);
    const dramaCandidates = this.dedupeParticipants(this.latestLayer(items, 'dramaCandidates').map((item) => ({ ...item, role: item.role || 'drama-candidate', canSettle: false })), { blockedNames: dramaBlocked });
    const dramaNames = new Set(dramaCandidates.flatMap((item) => [this.participantDisplayName(item), this.participantKey(item)]).filter(Boolean));

    const randomBlocked = new Set([...dramaBlocked, ...dramaNames]);
    const randomActiveEvents = this.dedupeParticipants(this.latestLayer(items, 'randomActiveEvents'), { blockedNames: randomBlocked });
    const latestCondition = [...items].reverse().find((item) => item?.randomIntrusionCondition)?.randomIntrusionCondition || '无明确条件则禁止闯入';
    const query = (key) => [...new Set(items.flatMap((item) => Array.isArray(item?.sceneQueries?.[key]) ? item.sceneQueries[key] : []))];

    return {
      forcedParticipants,
      priorityCandidates,
      dramaCandidates,
      forbiddenParticipants,
      randomActiveEvents,
      randomIntrusionCondition: latestCondition,
      sceneQueries: { location: query('location'), causality: query('causality'), conflict: query('conflict') },
    };
  },

  sceneLayerSummary(trace = [], store = null, config = this.realConfig()) {
    const layers = this.isEffectiveSceneLayers(trace) ? trace : this.resolveEffectiveSceneLayers(trace, store, config);
    const names = (group = [], reasonLabel = '理由') => group.map((item) => {
      const name = item.name || item.idOrName || item.id || item.characterName;
      return `${name}${item.reason ? `（${reasonLabel}：${item.reason}）` : `（${reasonLabel}：需在场景锚定中明确）`}`;
    }).join('、') || '无';
    const random = (layers.randomActiveEvents || []).map((item) => `${item.characterName || item.name}：${item.eventType || item.actionMethod || '背景行动'}｜${item.motivation || item.reason || ''}`).join('；') || '无';
    const query = (label, key) => {
      const items = [...new Set(Array.isArray(layers.sceneQueries?.[key]) ? layers.sceneQueries[key] : [])];
      return items.length ? items.map((item, index) => `${label}${index + 1}：${item}`).join('\n') : `${label}1：无`;
    };
    return [`强制出场：${names(layers.forcedParticipants, '出场理由')}`, `高优先候选：${names(layers.priorityCandidates, '出场或不出场理由')}`, `戏剧候选：${names(layers.dramaCandidates, '出场或不出场理由')}`, `禁止出场：${names(layers.forbiddenParticipants, '不出场理由')}`, query('地点查询理由', 'location'), query('因果查询理由', 'causality'), query('冲突查询理由', 'conflict'), `随机主动事件：${random}`, `随机事件闯入条件：${layers.randomIntrusionCondition || '无明确条件则禁止闯入'}`].join('\n');
  },

  async buildConfiguredSceneAnchorPrompt({ store, action, base, loaded, trace = [], effectiveSceneLayers = null, materialSession = null, config = this.realConfig() }) {
    const actionText = this.actionText(action, config.mode === 'story' ? '继续推进操控剧情' : '继续观察现实世界');
    const layers = effectiveSceneLayers || this.resolveEffectiveSceneLayers(trace, store, config);
    const anchorContext = config.ctx.buildSceneAnchorContext?.({ store, action: actionText, loaded, trace, effectiveSceneLayers: layers, materialSession, config }) || [
      `模式：${config.label}`,
      `本次行动：${actionText}`,
      `参与者边界：\n${this.sceneLayerSummary(layers, store, config)}`,
    ].join('\n');
    return window.GameModules.promptTemplates.render('inference-stage2-scene-anchor', {
      模式标签: config.label,
      本次行动: actionText,
      场景锚定上下文: anchorContext,
      紧凑返回规则: this.compactReturnRule('prose'),
    });
  },

  parseSceneAnchorReport(raw, config = this.realConfig()) {
    const parsed = this.parseChineseKvBlock(raw, this.sceneAnchorFields(), { config });
    const hardAnchors = ['当前地点', '当前时间', '空间状态', '当前动作'];
    const missingHardAnchor = hardAnchors.some((key) => !String(parsed.values?.[key] || '').trim());
    if (parsed.successRate < 0.8 || missingHardAnchor) throw new Error('场景锚定报告解析错误请重试');
    const v = parsed.values;
    this.assertSceneParticipantBoundary(v);
    const currentSceneImpactObjects = v['当前场景影响对象'] || '';
    const orderedText = this.sceneAnchorFields().map((key) => `${key}：${v[key] || ''}`).join('\n');
    return { text: orderedText, currentLocation: v['当前地点'] || '', currentTime: v['当前时间'] || '', writingFocus: v['正文写作重点'] || '', currentSceneImpactObjects, settlementBoundary: currentSceneImpactObjects, values: v, parseScore: { score: parsed.score, maxScore: parsed.maxScore, successRate: parsed.successRate }, parseDegraded: parsed.successRate < 1 };
  },

  sceneAnchorNameSet(value = '') {
    return new Set(this.splitNameList(value).map((item) => String(this.parseParticipantToken(item)?.name || item || '').replace(/[（(].*$/u, '').trim()).filter(Boolean));
  },

  assertSceneParticipantBoundary(values = {}) {
    const forbidden = this.sceneAnchorNameSet(values['禁止出场']);
    if (!forbidden.size) return;
    const conflicted = ['强制出场', '高优先候选', '戏剧候选'].flatMap((key) => [...this.sceneAnchorNameSet(values[key])].filter((name) => forbidden.has(name)));
    if (conflicted.length) throw new Error(`同一角色不能同时出现在候选/强制出场和禁止出场：${[...new Set(conflicted)].join('、')}`);
  },

  async completeSceneAnchorReport(store, prompt, logId, config = this.realConfig()) {
    let best = null;
    let lastErr = null;
    for (let i = 0; i < 2; i += 1) {
      const raw = await this.completeConfiguredStep(store, prompt, logId, false, { ...config, sourceTitle: `${config.label}场景锚定` });
      try {
        const data = this.parseSceneAnchorReport(raw, config);
        if (!best || data.parseScore.successRate >= best.data.parseScore.successRate) best = { raw, data, text: data.text };
        return best;
      } catch (err) {
        lastErr = err;
        prompt = `${prompt}\n\n上次场景锚定报告解析失败：${err.message}。请重新输出完整中文 K:V，必须包含正文写作重点和结算边界。`;
      }
    }
    if (best) return best;
    throw lastErr || new Error('场景锚定报告解析错误请重试');
  },

  buildConfiguredNarrationMessages({ store, action, prompt = '', config = this.realConfig() }) {
    const actionText = this.actionText(action, config.mode === 'story' ? '继续推进操控剧情' : '继续观察现实世界');
    const recent = this.recentNarrationForMessages(store, config);
    const messages = [{ role: 'user', content: String(prompt || '') }];
    if (recent) messages.push({ role: 'assistant', content: recent });
    messages.push({ role: 'user', content: `根据前面的规则与资料，推演“本次行动”，字数必须在1000 - 1400字之间。\n本次行动：${actionText}` });
    return messages;
  },

  recentNarrationForMessages(store = null, config = this.realConfig()) {
    const limitText = (text = '', max = 900) => String(text || '').trim().slice(0, max);
    const rows = config.mode === 'story'
      ? (store?.log || []).filter((entry) => entry.kind === 'novel' && String(entry.storyText || '').trim()).slice(-3)
      : (store?.realWorldLog || []).filter((entry) => entry.type === 'ai' && !entry.streaming && String(entry.narration || entry.text || '').trim()).slice(-3);
    const text = rows.map((entry, index) => {
      const body = config.mode === 'story' ? entry.storyText : (entry.narration || entry.text || '');
      const action = entry.playerText || entry.actionText || '';
      return [`最近已发生正文${index + 1}：`, action ? `对应行动：${action}` : '', limitText(body)].filter(Boolean).join('\n');
    }).join('\n---\n');
    return text || '暂无最近已发生正文；请以第一条 user 消息中的摘要和资料为准。';
  },

  async buildConfiguredNarrationPrompt({ store, action, base, loaded, skills, materialSession = null, sceneAnchorReport = '', config = this.realConfig() }) {
    const actionText = this.actionText(action, config.mode === 'story' ? '继续推进操控剧情' : '继续观察现实世界');
    const narrationContext = config.ctx.buildNarrationContext?.({ store, action: actionText, config }) || this.compactUpdatePromptText(base, 1600);
    const loadedText = config.ctx.loadedNarrationSummary?.(loaded) || config.ctx.buildLoadedText(loaded) || '无';
    const writingStyle = store.selectedWritingStylePrompt?.() || store.writingStylePrompt?.() || '正文采用小说文风，重视画面、动作、感官和心理反应，避免复述玩家指令。';
    const modeRule = config.mode === 'story'
      ? `推演自由度：${this.storyFreedomRule(store)}\n玩家不是角色本人，而是操控/影响被操控者行动的存在；正文必须写出本次行动的动作过程、环境变化、其他人物反应、被操控者身体与心理张力、直接结果。`
      : `推演自由度：${store.realWorldFreedomRule?.() || '只推演玩家本次输入行动自然抵达的直接结果。'}${store.sharedControlState?.() ? '\n同世界附身控制规则：玩家意识附身接管被控角色身体，同时玩家现实本体仍由同一个意识维持控制；正文以第二人称“你”的附身镜头为主，不要让同一角色在两个地点同时出现。' : ''}`;
    const narrationRules = '行动范围内充分推演：写出本次行动的动作过程、身体感受、周围环境变化、可见细节、他人反应、对话回应和直接短期连锁影响；场景锚定报告中的强制出场必须在正文中实际出现、行动或回应；不替玩家执行下一步新行动；不把亲吻、抚摸、摩擦、按住等行为自动扩展为脱衣、转移地点、插入、高潮等未输入的新阶段。';
    const completenessRules = [
      '正文完整性规则：',
      '- 正文必须形成完整小段落：进入动作 → 现场反馈 → 对方反应 → 短期结果落点。',
      '- 即使本次行动因边界、consent、年龄、关系或安全限制不能继续描写，也不得短输出。',
      '- 若不能描写玩家输入中的某些肢体或性化细节，必须改写为允许描写的现场反应：角色察觉、制止、后退、质问、沉默、情绪变化、房间环境声响变化、进入方式、触发反应、双方距离变化、语言/沉默、身体姿态，但必须根据已有资料符合逻辑。',
      '- 不要只写“她在房间里”或只写场景开头；必须把本次行动推演到一个明确的即时落点。',
      '- 目标长度 1000-1400 中文字符；低于 1000 汉字视为不合格，不要提前停止。',
      '- 强制输出结构只作为内部写作配比，最终正文仍必须是无标题、无编号、无换行的单段小说正文。',
      '- 环境五感渲染约100-150字：写出此刻场景中的气味、光线、触感。',
      '- 角色内心独白约200-250字：围绕上一轮事件或本次行动带来的心理挣扎、试探或算计展开，必须使用比喻句。',
      '- 对话与动作细节约400-450字：放慢动作，写清楚衣料摩擦声、眼神偏移、手部小动作、距离变化和对话回应。',
      '- 悬念/决策钩子约150字：本轮结束时写出心理转向或下一步压力，但不替玩家执行下一步行动。',
      '- 若动作本身很短，就按上述四块扩展当前阶段内部细节，而不是开启下一步新行动。',
      '- 禁止把“NPC反问玩家/等待玩家说明来意/门口刚打开”当作最终落点；必须继续写到进入、被拒、落座、对峙、距离变化或关系张力变化等本次行动的直接结果。',
      '禁止越界不是禁止写长：不允许为了字数推进到新阶段；但必须充分描写当前阶段内部细节。',
    ].join('\n');
    return window.GameModules.promptTemplates.render('inference-stage3-narration', {
      模式标签: config.label,
      本次行动: actionText,
      基础上下文: [this.continuityFallbackRule(), `小说笔风：${writingStyle}`, modeRule, narrationRules, completenessRules, narrationContext].join('\n'),
      场景锚定报告: sceneAnchorReport || '无',
      已动态载入资料: loadedText || '无',
      紧凑返回规则: this.compactReturnRule('prose'),
    });
  },

  settlementEligibleParticipant(p = {}) {
    if (!p || p.canSettle === false) return false;
    const role = String(p.role || '').toLowerCase();
    if (/loaded-role-card|priority-candidate|drama-candidate|candidate|forbidden|background|random/u.test(role)) return false;
    if (p.type === 'player') return true;
    if (p.canSettle === true) return true;
    return /actor|direct|forced|participant|current-scene/u.test(role);
  },

  currentPlayerParticipant(store = null) {
    const name = String(store?.playerName || store?.playerProfile?.name || store?.realWorldPlayerSettlementName?.() || '玩家').trim() || '玩家';
    return { type: 'player', id: 'player-self', name, role: 'actor', canSettle: true };
  },

  stageParticipants(trace = [], loaded = [], store = null) {
    const sourceItems = Array.isArray(trace) ? trace : (trace ? [{ ...trace, participants: [], characters: [] }] : []);
    const seen = new Set();
    const blocked = new Set();
    const forced = new Set();
    const forbidden = new Set();
    const out = [];
    const nameOf = (p = {}) => String(p?.name || p?.characterName || p?.idOrName || p?.id || '').trim();
    sourceItems.forEach((item) => {
      (Array.isArray(item?.forcedParticipants) ? item.forcedParticipants : []).forEach((p) => { const name = nameOf(p); if (name) forced.add(name); });
      (Array.isArray(item?.forbiddenParticipants) ? item.forbiddenParticipants : []).forEach((p) => { const name = nameOf(p); if (name) forbidden.add(name); });
      ['priorityCandidates', 'dramaCandidates', 'backgroundParticipants'].forEach((key) => {
        (Array.isArray(item?.[key]) ? item[key] : []).forEach((p) => { const name = nameOf(p); if (name) blocked.add(name); });
      });
      (Array.isArray(item?.randomActiveEvents) ? item.randomActiveEvents : []).forEach((p) => { const name = nameOf(p); if (name) blocked.add(name); });
    });
    const add = (p = {}) => {
      if (out.length >= 12 || !this.settlementEligibleParticipant(p)) return;
      const target = p.id || p.idOrName || p.name;
      const targetText = String(target || '').trim();
      const name = nameOf(p);
      const isForced = forced.has(targetText) || (name && forced.has(name));
      if (!target || forbidden.has(targetText) || (name && forbidden.has(name))) return;
      if (!isForced && (blocked.has(targetText) || (name && blocked.has(name)))) return;
      const key = `${p.type || ''}:${target}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push(p);
    };
    sourceItems.forEach((item) => {
      (Array.isArray(item?.participants) ? item.participants : []).forEach(add);
      (Array.isArray(item?.forcedParticipants) ? item.forcedParticipants : []).forEach((p) => add({ ...p, role: p.role || 'forced', canSettle: p.canSettle === false ? false : true }));
      this.characterParticipants(item?.characters, store).forEach((p) => add({ ...p, canSettle: true }));
    });
    add(this.currentPlayerParticipant(store));
    return out.slice(0, 12);
  },

  mergeNarrationParticipants(participants = [], narration = '', store = null, sceneAnchor = null) {
    const out = Array.isArray(participants) ? participants.slice() : [];
    const seen = new Set(out.map((p) => `${p?.type || ''}:${p?.id || p?.idOrName || p?.name || ''}`));
    const text = String(narration || '');
    const addCharacter = (id = '', name = '', role = 'narration-mentioned') => {
      const p = this.characterParticipant({ id, name }, store);
      const key = `${p?.type || ''}:${p?.id || p?.idOrName || p?.name || ''}`;
      if (p && !seen.has(key) && this.settlementEligibleParticipant({ ...p, canSettle: true })) {
        seen.add(key);
        out.push({ ...p, role, canSettle: true });
      }
    };
    this.sceneAnchorParticipants(sceneAnchor, store).forEach((item) => addCharacter(item.id || item.idOrName, item.name, 'current-scene'));
    Object.values(store?.rpgStates || {}).forEach((state) => {
      const name = String(state?.profile?.name || state?.name || '').trim();
      if (!name || !text.includes(name)) return;
      addCharacter(state.id, name, 'narration-mentioned');
    });
    return out.slice(0, 12);
  },

  sceneAnchorParticipants(sceneAnchor = null, store = null) {
    const values = sceneAnchor?.values || sceneAnchor || {};
    const playerName = String(store?.playerName || store?.playerProfile?.name || store?.realWorldPlayerSettlementName?.() || '').trim();
    const fields = ['强制出场', '当前场景影响对象'];
    return fields.flatMap((key) => this.splitNameList(values[key] || '').map((raw) => {
      const parsed = this.parseParticipantToken(raw);
      const name = String(parsed?.name || raw || '').replace(/[（(].*$/u, '').trim();
      return name && !['无', '玩家', '系统', playerName].includes(name) ? { type: 'character', idOrName: name, name, role: 'current-scene', canSettle: true } : null;
    }).filter(Boolean));
  },

  characterParticipants(characters = [], store = null) {
    return (Array.isArray(characters) ? characters : []).map((item) => this.characterParticipant(item, store)).filter(Boolean);
  },

  characterParticipant(item = {}, store = null) {
    const raw = typeof item === 'string' ? { name: item } : item;
    const id = String(raw?.id || raw?.idOrName || '').trim();
    const name = String(raw?.name || raw?.id || raw?.idOrName || '').trim();
    if (id === 'player-self') return { type: 'player', id: 'player-self', name: name || '玩家', role: 'actor' };
    const state = this.findParticipantState(store, id, name);
    if (!state) return null;
    return { type: 'character', id: state.id || id || name, name: state.profile?.name || state.name || name || id, role: 'character-role-card' };
  },

  findParticipantState(store = null, id = '', name = '') {
    if (!store) return null;
    const candidates = [id, name].map((value) => String(value || '').trim()).filter(Boolean);
    for (const key of candidates) {
      const byId = store.itemSkillState?.(key) || store.rpgStates?.[key];
      if (byId) return byId;
      const byName = store.sqliteSave?.getCharacterStateByName?.(key) || store.getCharacterStateByName?.(key) || window.GameModules.sqliteSave?.getCharacterStateByName?.(key);
      if (byName) return byName;
    }
    const states = Object.values(store.rpgStates || {});
    return states.find((state) => candidates.includes(String(state?.profile?.name || state?.name || '').trim())) || null;
  },

  loadedRoleCardParticipants(loaded = []) {
    return (Array.isArray(loaded) ? loaded : []).flatMap((item) => {
      if (Array.isArray(item?.participants) && item.participants.length) return item.participants;
      const text = [item?.title, item?.text, item?.content, item?.summary].map((part) => String(part || '').trim()).filter(Boolean).join('\n');
      if (!/角色卡/u.test(text)) return [];
      const id = text.match(/角色ID[:：]\s*([^\s｜|，,；;\n]+)/u)?.[1] || '';
      const name = text.match(/姓名[:：]\s*([^\s｜|，,；;\n]+)/u)?.[1] || text.match(/自动资料[:：]\s*([^\s｜|，,；;\n]+?)角色卡/u)?.[1] || '';
      const target = id || name;
      if (!target) return [];
      return [{ type: 'character', id: target, name, role: 'loaded-role-card' }];
    });
  },

  compactUpdatePromptText(text = '', limit = 1600, keepTail = false) {
    const raw = String(text || '').replace(/\s+/g, ' ').trim();
    if (raw.length <= limit) return raw;
    if (keepTail) return `…${raw.slice(-limit)}`;
    const head = Math.ceil(limit * 0.65);
    const tail = Math.max(0, limit - head - 1);
    return `${raw.slice(0, head)}…${tail ? raw.slice(-tail) : ''}`;
  },

  settlementTypeQueue(config = this.realConfig()) {
    const base = ['基础结算', '情绪', '感觉', '生命体征', '身体状态', '穿着状态', '性经历', '性历史', '关系', '角色卡', '物品', '地图', '人事安排', '势力总览', '势力结构', '系统记录', '通用固化'];
    return config.mode === 'story' ? base.concat(['操控体验']) : base;
  },

  settlementTypeWindows(allTypes = []) {
    const typeSet = new Set(allTypes);
    const groups = [
      ['基础结算'],
      ['情绪', '感觉', '生命体征', '身体状态', '穿着状态'],
      ['性经历', '性历史', '关系', '角色卡'],
      ['物品', '地图', '人事安排'],
      ['势力总览', '势力结构', '系统记录', '通用固化', '操控体验'],
    ];
    const windows = groups.map((group) => group.filter((type) => typeSet.has(type))).filter((group) => group.length);
    const grouped = new Set(windows.flat());
    const extras = allTypes.filter((type) => !grouped.has(type));
    if (extras.length) windows.push(extras);
    return windows;
  },

  nextSettlementWindow(allTypes = [], completedTypes = [], currentIncompleteTypes = []) {
    const completed = new Set(completedTypes);
    const unfinished = allTypes.filter((type) => !completed.has(type));
    const retry = (currentIncompleteTypes || []).filter((type) => unfinished.includes(type));
    if (retry.length) return retry;
    return this.settlementTypeWindows(allTypes).find((group) => group.some((type) => unfinished.includes(type)))?.filter((type) => unfinished.includes(type)) || [];
  },

  settlementTypeContracts() {
    return {
      '基础结算': { title: '基础结算', format: '经过时间：秒数\n当前状态：状态文本\n当前目标：目标文本\n场景标题：标题\n地点名称：地点全称\n备选行动1：行动文本\n备选行动2：行动文本\n备选行动3：行动文本\n备选行动4：行动文本' },
      '情绪': { title: '情绪结算', format: '更新N：结算主体，情绪名，+/-数值，变化原因' },
      '感觉': { title: '感觉结算', format: '更新N：结算主体，感觉名，+/-数值，变化原因' },
      '生命体征': { title: '生命体征结算', format: '更新N：结算主体，字段名，+/-数值，变化原因' },
      '身体状态': { title: '身体状态结算', format: '更新N：结算主体，部位或状态键，新状态，变化原因' },
      '穿着状态': { title: '穿着状态结算', format: '更新N：结算主体，穿着部位，衣物名称，当前状态，变化原因' },
      '性经历': { title: '性经历结算', format: '更新N：结算主体，分类，+/-数值，变化原因' },
      '性历史': { title: '性历史结算', format: '更新N：结算主体，状态转移，性对象，原因与证据' },
      '关系': { title: '关系结算', format: '更新N：结算主体，甲方(称谓)，乙方(称谓)，维度，当前状态，变化原因，根据性格造成结果' },
      '角色卡': { title: '角色卡结算', format: '更新N：结算主体，字段，替换/增加，新值，原因，根据性格造成结果' },
      '物品': { title: '物品结算', format: '更新N：结算主体，物品类型，物品名，事实或变化，变化原因' },
      '地图': { title: '地图结算', format: '更新N：结算主体，当前位置/上级地点/地点事实/地图节点/路线事实，事实，原因' },
      '人事安排': { title: '人事安排结算', format: '更新N：结算主体，当前地点/当前行动/可用状态，新值，变化原因' },
      '势力总览': { title: '势力总览结算', format: '更新N：结算主体，新增势力/上层势力归属/势力APP归属，事实，原因' },
      '势力结构': { title: '势力结构结算', format: '更新N：结算主体，部门角色/职位/成员地位，事实，原因' },
      '系统记录': { title: '系统记录结算', format: '更新N：结算主体，事件/记录/通信消息/剧情记录/状态，事实，原因' },
      '通用固化': { title: '通用固化结算', format: '更新N：结算主体，字段，稳定事实，变化原因' },
      '操控体验': { title: '操控体验结算', format: '更新N：操控感觉/适应度，字段，+/-数值或新值，变化原因' },
    };
  },

  settlementUpdateCatalog() {
    return {
      '情绪': { updateType: 'emotion', fieldPrefix: 'metrics.emotions' },
      '感觉': { updateType: 'feeling', fieldPrefix: 'metrics.playerFeelings' },
      '生命体征': { updateType: 'vital', fieldMap: { '生命力': 'vitals.vitality', '精力': 'vitals.stamina_pool', '饱食度': 'vitals.satiety', '水分': 'vitals.hydration', '疲劳': 'vitals.fatigue', '精神稳定': 'vitals.mental_stability' } },
      '身体状态': { updateType: 'body-status', fieldPrefix: 'bodyStatus' },
      '穿着状态': { updateType: 'wearing-state', fieldPrefix: 'values.wearing' },
      '性经历': { updateType: 'sexual-experience', fieldPrefix: 'intimacy.sexualExperienceParts' },
      '性历史': { updateType: 'sexual-history', fieldPrefix: 'intimacy.sexualHistory' },
      '关系': { updateType: 'relationship', fieldPrefix: 'relationships' },
      '角色卡': { updateType: 'role-card', fieldPrefix: 'profile' },
      '物品': { updateType: 'item', fieldPrefix: 'inventory' },
      '地图': { updateType: 'map', fieldMap: { '当前位置': 'current', '上级地点': 'parent', '地点事实': 'descriptionFacts', '地图节点': 'mapNodes', '路线事实': 'routeLinks' } },
      '势力总览': { updateType: 'faction-overview', fieldPrefix: 'overview.factions' },
      '势力结构': { updateType: 'faction-structure', fieldPrefix: 'structure' },
      '系统记录': { updateType: 'system', fieldPrefix: 'events' },
      '通用固化': { updateType: 'generic', fieldPrefix: 'status_tags' },
    };
  },

  participantAllowedForSettlement(name = '', participants = []) {
    const clean = String(name || '').trim();
    return Boolean(clean) && participants.some((p) => [p.name, p.id, p.idOrName].map((x) => String(x || '').trim()).includes(clean));
  },

  subjectForSettlement(name = '', participants = []) {
    const clean = String(name || '').trim();
    const found = participants.find((p) => [p.name, p.id, p.idOrName].map((x) => String(x || '').trim()).includes(clean));
    return found ? { type: found.type || 'character', id: found.id || found.idOrName || found.name, name: found.name || clean } : null;
  },

  defaultSubjectForSettlement(participants = []) {
    const people = (Array.isArray(participants) ? participants : []).filter((p) => ['character', 'player'].includes(p?.type));
    const names = [...new Set(people.map((p) => String(p?.name || p?.id || p?.idOrName || '').trim()).filter(Boolean))];
    const characterNames = [...new Set(people.filter((p) => p.type === 'character').map((p) => String(p?.name || p?.id || p?.idOrName || '').trim()).filter(Boolean))];
    if (characterNames.length === 1) return this.subjectForSettlement(characterNames[0], participants);
    if (names.length === 1) return this.subjectForSettlement(names[0], participants);
    return null;
  },

  parseStandardSettlementLine(typeName = '', line = '', subject = null, participants = [], store = null) {
    let parts = String(line || '').replace(/^更新(?:\d+|N)\s*[：:]/u, '').split(/[，,]/u).map((x) => x.trim());
    const catalog = this.settlementUpdateCatalog();
    if (!catalog[parts[0]] && parts.length >= 4) {
      const inlineSubject = this.subjectForSettlement(parts[0], participants);
      if (inlineSubject) {
        subject = inlineSubject;
        parts = [typeName, ...parts.slice(1)];
      }
    }
    const [label, key, rawValue, reason] = parts;
    const type = label || typeName;
    const entry = catalog[type];
    if (!subject || !key || !rawValue || !reason) return null;
    if (!entry) return this.parseGenericSettlementLine(typeName, line, subject, { requireExplicitGeneric: true });
    let normalizedKey = type === '生命体征' ? this.vitalFieldAlias(key) : key;
    const rawValueText = String(rawValue).trim();
    const delta = Number(rawValueText.replace(/[^-+\d.]/gu, ''));
    const hasSignedDelta = Number.isFinite(delta) && /^[+-]\d/u.test(rawValueText) && delta !== 0;
    if (['情绪', '感觉'].includes(type)) {
      const allowedKeys = this.settlementMetricKeysForSubject(store, subject, type);
      normalizedKey = this.metricAliasForSettlement(type, normalizedKey);
      if (!allowedKeys.includes(normalizedKey) || !hasSignedDelta) return null;
    }
    if (entry.fieldMap && !entry.fieldMap[normalizedKey]) return null;
    if (type === '生命体征' && !hasSignedDelta) return null;
    const field = entry.fieldMap?.[normalizedKey] || `${entry.fieldPrefix}.${normalizedKey}`;
    const change = hasSignedDelta ? { mode: 'delta', value: delta } : { mode: 'set', value: rawValue };
    return { updateType: entry.updateType, subject, field, change, reasons: [{ trigger: type, evidence: reason, confidence: 'confirmed' }] };
  },

  parseGenericSettlementLine(typeName = '', line = '', subject = null, options = {}) {
    const parts = String(line || '').replace(/^更新(?:\d+|N)\s*[：:]/u, '').split(/[，,]/u).map((x) => x.trim());
    const [label, key, rawValue, reason] = parts;
    if (!subject || !key || !rawValue || !reason) return null;
    if (options.requireExplicitGeneric && !/^(?:未知稳定事实|稳定事实|通用固化|通用事实)$/u.test(label || '')) return null;
    return { updateType: 'generic', subject, field: `status_tags.${key}`, change: { mode: 'append', value: { label: label || typeName, value: rawValue, reason } }, reasons: [{ trigger: label || typeName, evidence: reason, confidence: 'confirmed' }] };
  },

  settlementAlias(value = '', aliases = {}) {
    const clean = String(value || '').trim();
    return aliases[clean] || clean;
  },

  metricAliasForSettlement(type = '', key = '') {
    const clean = String(key || '').trim();
    const emotionAliases = {
      平静: '冷静', 镇定: '冷静', 理智: '冷静', 安定: '冷静', 淡定: '冷静', 安心: '冷静',
      害怕: '恐惧', 惊恐: '恐惧', 惊惧: '恐惧', 惧怕: '恐惧', 惊慌: '恐惧', 惶恐: '恐惧', 胆怯: '恐惧', 畏缩: '恐惧',
      忧虑: '担忧', 忧心: '担忧', 不安: '担忧', 顾虑: '担忧', 焦虑: '担忧', 挂念: '担忧', 牵挂: '担忧',
      开心: '高兴', 愉悦: '高兴', 快乐: '高兴', 欣喜: '高兴', 喜悦: '高兴', 满足: '高兴', 轻松: '高兴',
      紧绷: '紧张', 慌张: '紧张', 局促: '紧张', 压迫感: '紧张', 忐忑: '紧张',
      生气: '愤怒', 恼怒: '愤怒', 怒意: '愤怒', 怨怒: '愤怒', 气愤: '愤怒', 暴躁: '愤怒',
      羞愧: '羞耻', 害羞: '羞耻', 难堪: '羞耻', 尴尬: '羞耻', 屈辱: '羞耻', 羞辱: '羞耻',
      难过: '悲伤', 哀伤: '悲伤', 伤心: '悲伤', 失落: '悲伤', 痛苦: '悲伤', 悲痛: '悲伤',
      兴趣: '好奇', 探究: '好奇', 疑惑: '好奇', 困惑: '好奇', 在意: '好奇',
      空洞: '麻木', 呆滞: '麻木', 迟钝: '麻木', 冷漠: '麻木', 恍惚: '麻木',
      吃醋: '嫉妒', 妒忌: '嫉妒', 醋意: '嫉妒', 酸涩: '嫉妒',
      无望: '绝望', 崩溃: '绝望', 灰心: '绝望', 走投无路: '绝望',
    };
    const feelingAliases = {
      知晓: '了解', 理解: '了解', 熟悉: '了解', 认识: '了解', 洞悉: '了解', 知情: '了解',
      信赖: '信任', 相信: '信任', 放心: '信任', 可靠感: '信任',
      抵抗: '反抗', 抗拒: '反抗', 逆反: '反抗', 拒绝: '反抗', 不服: '反抗',
      亲近: '好感', 喜欢: '好感', 接纳: '好感', 善意: '好感', 顺眼: '好感',
      友好: '友情', 友谊: '友情', 伙伴感: '友情', 同伴感: '友情',
      家人感: '亲情', 亲近依附: '亲情', 亲缘: '亲情', 庇护感: '亲情',
      恋慕: '爱情', 爱慕: '爱情', 心动: '爱情', 倾心: '爱情', 眷恋: '爱情', 深爱: '爱情',
      欲望: '肉欲', 情欲: '肉欲', 渴望: '肉欲', 冲动: '肉欲', 身体吸引: '肉欲',
      害怕: '畏惧', 惧怕: '畏惧', 恐惧: '畏惧', 惧意: '畏惧', 怕: '畏惧',
      敬重: '尊敬', 敬意: '尊敬', 认可: '尊敬', 钦佩: '尊敬', 佩服: '尊敬',
      仰慕: '崇拜', 崇敬: '崇拜', 神化: '崇拜', 狂热: '崇拜',
      厌恶: '讨厌', 反感: '讨厌', 排斥: '讨厌', 嫌恶: '讨厌', 憎恶: '讨厌',
      依恋: '依赖', 依附: '依赖', 需要: '依赖', 离不开: '依赖',
      戒备: '警惕', 防备: '警惕', 怀疑: '警惕', 提防: '警惕', 疑心: '警惕',
      控制欲: '支配欲', 掌控欲: '支配欲', 主导欲: '支配欲', 控制: '支配欲',
      独占欲: '占有欲', 独占: '占有欲', 占有: '占有欲', 垄断欲: '占有欲',
      顺从: '服从', 听话: '服从', 臣服: '服从', 屈从: '服从', 驯服: '服从',
    };
    return (type === '感觉' ? feelingAliases : emotionAliases)[clean] || clean;
  },

  vitalFieldAlias(field = '') {
    return this.settlementAlias(field, { 生命力: '生命力', 生命值: '生命力', 健康: '生命力', health: '生命力', 精力: '精力', 精力池: '精力', 体力: '精力', stamina: '精力', 饱食度: '饱食度', 饱食: '饱食度', satiety: '饱食度', 水分: '水分', 口渴: '水分', 水合: '水分', hydration: '水分', 疲劳: '疲劳', 疲劳度: '疲劳', fatigue: '疲劳', 精神稳定: '精神稳定', 精神稳定度: '精神稳定', mental_stability: '精神稳定' });
  },

  allowedBodyPartKeys() { return ['overall', 'mouth', 'chest', 'genital', 'anus', 'hips', 'limbs', 'skin', 'other']; },

  allowedWearingSlots() { return ['bra', 'top', 'outerwear', 'bottom', 'legwear', 'shoes', 'panties', '饰品']; },

  allowedSexualPartKeys() { return ['genital', 'chest', 'lips', 'mouth', 'oralAction', 'oralSex', 'oralInternalFinish', 'genitalEntry', 'vaginalInsertion', 'vaginalInternalFinish', 'anus', 'analEntry', 'analSex', 'analInternalFinish', 'legs', 'hips', 'hands', 'skin', 'other']; },

  isFullBodyWearingPart(part = '') {
    const clean = String(part || '').trim();
    return /^(?:全身|整体|整身|全体|全套|全身衣物|全身穿着|整体穿着)$/u.test(clean);
  },

  wearingSlotAlias(part = '', itemName = '') {
    const clean = String(part || '').trim();
    const item = String(itemName || '').trim();
    if (this.isFullBodyWearingPart(clean)) return 'outerwear';
    if (/腿圈|项圈|手环|脚环|戒指|耳环|饰品/u.test(item)) return '饰品';
    if (/胸部|胸口|乳房|胸罩|内衣上/u.test(clean)) return 'bra';
    if (/上身|上衣|衬衫|睡衣上/u.test(clean)) return 'top';
    if (/外套|罩衫|连衣裙|睡裙|裙装/u.test(clean)) return 'outerwear';
    if (/下身|裙子|裤子|短裤/u.test(clean)) return 'bottom';
    if (/腿部|大腿|丝袜|袜裤|裤袜/u.test(clean)) return 'legwear';
    if (/足部|脚部|鞋|袜/u.test(clean)) return 'shoes';
    if (/内裤|底裤/u.test(clean)) return 'panties';
    if (/饰品|首饰|配饰/u.test(clean)) return '饰品';
    return this.settlementAlias(clean, { 胸部: 'bra', 胸口: 'bra', 乳房: 'bra', 上身: 'top', 外套: 'outerwear', 下身: 'bottom', 腿部: 'legwear', 大腿: 'legwear', 足部: 'shoes', 脚部: 'shoes', 内裤: 'panties', 饰品: '饰品' });
  },

  bodyPartAlias(part = '') {
    return this.settlementAlias(part, { 整体: 'overall', 全身: 'overall', 口部: 'mouth', 嘴唇: 'mouth', 嘴部: 'mouth', 胸部: 'chest', 胸口: 'chest', 乳房: 'chest', 阴部: 'genital', 私处: 'genital', 肛部: 'anus', 臀部: 'hips', 屁股: 'hips', 四肢: 'limbs', 手臂: 'limbs', 腿部: 'limbs', 皮肤: 'skin', 其他: 'other' });
  },

  bodyPartName(part = '', key = '') {
    const names = { overall: '整体', mouth: '口部', chest: '胸部', genital: '阴部', anus: '肛部', hips: '臀部', limbs: '四肢', skin: '皮肤', other: '其他' };
    return names[key] || String(part || '').trim();
  },

  sexualPartAlias(part = '') {
    return this.settlementAlias(part, { 阴部: 'genital', 胸部: 'chest', 胸口: 'chest', 乳房: 'chest', 唇部: 'lips', 接吻: 'lips', 口部: 'mouth', 嘴部: 'mouth', 口部行为: 'oralAction', 口交: 'oralSex', 口交中出: 'oralInternalFinish', 阴部进入: 'genitalEntry', 阴道插入: 'vaginalInsertion', 阴道中出: 'vaginalInternalFinish', 肛部: 'anus', 肛门: 'anus', 肛部进入: 'analEntry', 肛交: 'analSex', 肛交中出: 'analInternalFinish', 腿部: 'legs', 大腿: 'legs', 臀部: 'hips', 屁股: 'hips', 手部: 'hands', 手: 'hands', 皮肤: 'skin', 其他: 'other' });
  },

  parseWearingSettlementLine(line = '', subject = null, participants = []) {
    let parts = String(line || '').replace(/^更新(?:\d+|N)\s*[：:]/u, '').split(/[，,]/u).map((x) => x.trim());
    if (parts[0] !== '穿着状态') {
      const inlineSubject = this.subjectForSettlement(parts[0], participants);
      if (inlineSubject) {
        subject = inlineSubject;
        parts = ['穿着状态', ...parts.slice(1)];
      }
    }
    const [label, part, itemName, state, reason] = parts;
    if (label !== '穿着状态' || !subject || !part || !itemName || !state || !reason) return null;
    const slot = this.wearingSlotAlias(part, itemName);
    if (!this.allowedWearingSlots().includes(slot)) return null;
    return { updateType: 'wearing-state', subject, field: 'values.wearing', change: { mode: 'upsert', value: { slot, part, name: itemName, state, reason, fullBody: this.isFullBodyWearingPart(part) } }, reasons: [{ trigger: '穿着状态', evidence: reason, confidence: 'confirmed' }] };
  },

  parseBodyStatusSettlementLine(line = '', subject = null, participants = []) {
    let parts = String(line || '').replace(/^更新(?:\d+|N)\s*[：:]/u, '').split(/[，,]/u).map((x) => x.trim());
    if (parts[0] !== '身体状态') {
      const inlineSubject = this.subjectForSettlement(parts[0], participants);
      if (inlineSubject) {
        subject = inlineSubject;
        parts = ['身体状态', ...parts.slice(1)];
      }
    }
    const [label, part, status, reason] = parts;
    if (label !== '身体状态' || !subject || !part || !status || !reason) return null;
    const partKey = this.bodyPartAlias(part);
    if (!this.allowedBodyPartKeys().includes(partKey)) return null;
    return { updateType: 'body-status', subject, field: `bodyStatus.${partKey}`, change: { mode: 'merge', value: { partKey, part: this.bodyPartName(part, partKey), status, description: status, reason } }, reasons: [{ trigger: '身体状态', evidence: reason, confidence: 'confirmed' }] };
  },

  parseSexualExperienceSettlementLine(line = '', subject = null, participants = []) {
    let parts = String(line || '').replace(/^更新(?:\d+|N)\s*[：:]/u, '').split(/[，,]/u).map((x) => x.trim());
    if (parts[0] !== '性经历') {
      const inlineSubject = this.subjectForSettlement(parts[0], participants);
      if (inlineSubject) {
        subject = inlineSubject;
        parts = ['性经历', ...parts.slice(1)];
      }
    }
    const [label, part, rawValue, reason] = parts;
    if (label !== '性经历' || !subject || !part || !rawValue || !reason) return null;
    const rawValueText = String(rawValue).trim();
    const delta = Number(rawValueText.replace(/[^-+\d.]/gu, ''));
    if (!Number.isFinite(delta) || !/^[+-]\d/u.test(rawValueText) || delta === 0) return null;
    const key = this.sexualPartAlias(part);
    if (!this.allowedSexualPartKeys().includes(key)) return null;
    const value = { totalDelta: 0, parts: { [key]: delta } };
    return { updateType: 'sexual-experience', subject, field: `intimacy.sexualExperienceParts.${key}`, change: { mode: 'delta', value }, reasons: [{ trigger: '性经历', evidence: reason, confidence: 'confirmed' }] };
  },

  parseScheduleSettlementLine(line = '', subject = null, participants = []) {
    // 合同边界：明确通信/移动/约定涉及的人必须先由上游加入 participants；非 participants 仍会被结算对象 gate 拒绝。
    let parts = String(line || '').replace(/^更新(?:\d+|N)\s*[：:]/u, '').split(/[，,]/u).map((x) => x.trim());
    if (parts[0] !== '人事安排') {
      const inlineSubject = this.subjectForSettlement(parts[0], participants);
      if (inlineSubject) {
        subject = inlineSubject;
        parts = ['人事安排', ...parts.slice(1)];
      }
    }
    const [label, key, rawValue, reason] = parts;
    const subjectType = String(subject?.type || '').trim();
    if (label !== '人事安排' || !subject || !['character', 'player'].includes(subjectType) || !key || !rawValue || !reason) return null;
    const value = {};
    if (key === '当前地点') value.currentLocation = rawValue;
    else if (key === '当前行动') value.currentAction = rawValue;
    else if (key === '可用状态') value.availability = ['在场', '场外', '未知', '暂不可用'].includes(rawValue) ? rawValue : '未知';
    else return null;
    value.reason = reason;
    return { updateType: 'character-schedule', subject, field: 'characterSchedules', change: { mode: 'merge', value }, reasons: [{ trigger: `人事安排${key}`, evidence: reason, confidence: 'confirmed' }] };
  },

  parseSystemSettlementLine(line = '', subject = null, participants = []) {
    let parts = String(line || '').replace(/^更新(?:\d+|N)\s*[：:]/u, '').split(/[，,]/u).map((x) => x.trim());
    if (parts[0] !== '系统记录') {
      if (parts[0] === '系统') {
        subject = { type: 'system', id: '系统', name: '系统' };
        parts = ['系统记录', ...parts.slice(1)];
      } else {
        const inlineSubject = this.subjectForSettlement(parts[0], participants);
        if (inlineSubject) {
          subject = inlineSubject;
          parts = ['系统记录', ...parts.slice(1)];
        }
      }
    }
    const [label, key, rawValue, reason] = parts;
    if (label !== '系统记录' || !subject || !key || !rawValue || !reason) return null;
    const allowed = ['事件', '记录', '通信消息', '剧情记录', '状态'];
    if (!allowed.includes(key)) return null;
    return { updateType: 'system', subject, field: `events.${key}`, change: { mode: 'append', value: { key, value: rawValue, reason } }, reasons: [{ trigger: `系统记录${key}`, evidence: reason, confidence: 'confirmed' }] };
  },

  parseSpecialSettlementLine(typeName = '', line = '', subject = null, participants = []) {
    let parts = String(line || '').replace(/^更新(?:\d+|N)\s*[：:]/u, '').split(/[，,]/u).map((x) => x.trim());
    if (parts[0] !== typeName) {
      const inlineSubject = this.subjectForSettlement(parts[0], participants);
      if (inlineSubject) {
        subject = inlineSubject;
        parts = [typeName, ...parts.slice(1)];
      }
    }
    if (!subject || parts[0] !== typeName) return this.parseGenericSettlementLine(typeName, line, subject, { requireExplicitGeneric: true });
    if (typeName === '性历史') {
      const [, transition, partner, evidence] = parts;
      if (!transition || !partner || !evidence) return null;
      return { updateType: 'sexual-history', subject, field: 'intimacy.sexualHistory', change: { mode: 'merge', value: { transition, partner: { type: 'character', id: partner, name: partner }, evidence, historyText: [transition, partner, evidence].join('，') } }, reasons: [{ trigger: '性历史状态转移', evidence, confidence: 'confirmed' }] };
    }
    if (typeName === '关系') {
      const [, left, right, dimension, status, reason, result] = parts;
      if (!left || !right || !dimension || !status || !reason || !result) return null;
      if (/^(?:好感|好感度|信任|依赖|警惕|畏惧|反感|愤怒|恐惧|紧张|安心|悲伤|开心|高兴)$/u.test(dimension) || /^[-+]?\d/u.test(status)) return null;
      return { updateType: 'relationship', subject, field: `relationships.${dimension}`, change: { mode: 'upsert', value: { left, right, dimension, status, reason, result } }, reasons: [{ trigger: '关系变化', evidence: reason, confidence: 'confirmed' }] };
    }
    if (typeName === '角色卡') {
      const [, field, op, value, reason, result] = parts;
      const allowed = ['当前状态', '身份', '职业', '技能', '知识', '外貌', '性格', '喜好', '人物说明', '社群角色', '势力地位', '人际关系'];
      if (!field || !op || !value || !['替换', '增加'].includes(op) || !allowed.includes(field)) return null;
      return { updateType: 'role-card', subject, field: field === '当前状态' ? 'status_tags' : `profile.${field}`, change: { mode: op === '替换' ? 'set' : 'append', value: { value, reason, result } }, reasons: [{ trigger: `角色卡${op}`, evidence: reason || value, confidence: 'confirmed' }] };
    }
    return null;
  },

  parseCompactSettlementJson(raw = '') {
    const text = String(raw || '').trim().replace(/^```(?:json)?\s*/iu, '').replace(/```$/u, '').trim();
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    try { return JSON.parse(text.slice(start, end + 1)); } catch { return null; }
  },

  settlementJsonSubject(type = '', entry = {}, participants = []) {
    const rawName = entry?.subject ?? entry?.主体 ?? entry?.name ?? entry?.名称 ?? '';
    const name = String(rawName || '').trim();
    const participant = this.subjectForSettlement(name, participants);
    if (participant) return participant;
    const defaults = {
      '地图': { type: '地点', id: name || '当前地点', name: name || '当前地点' },
      '势力总览': { type: '势力', id: name || '势力', name: name || '势力' },
      '势力结构': { type: '势力', id: name || '势力', name: name || '势力' },
      '系统记录': { type: 'system', id: name || '系统', name: name || '系统' },
      '通用固化': { type: 'system', id: name || '系统', name: name || '系统' },
      '物品': { type: '物品', id: name || '物品', name: name || '物品' },
    };
    return defaults[type] || null;
  },

  settlementJsonText(value = '') {
    return String(value ?? '').trim().replace(/[，,]/gu, '；');
  },

  settlementJsonUpdateLine(type = '', entry = {}) {
    const t = (value) => this.settlementJsonText(value);
    const field = t(entry.field ?? entry.字段 ?? entry.key ?? entry.类型 ?? entry.part ?? entry.部位 ?? '');
    const value = t(entry.value ?? entry.变化 ?? entry.新值 ?? entry.delta ?? entry.数值 ?? entry.status ?? entry.state ?? entry.事实 ?? '');
    const reason = t(entry.reason ?? entry.原因 ?? entry.evidence ?? entry.证据 ?? '');
    if (type === '穿着状态') return `更新N：穿着状态，${t(entry.part ?? entry.部位)}，${t(entry.item ?? entry.itemName ?? entry.衣物 ?? entry.衣物名称)}，${t(entry.state ?? entry.status ?? entry.状态)}，${reason}`;
    if (type === '身体状态') return `更新N：身体状态，${t(entry.part ?? entry.部位)}，${t(entry.status ?? entry.value ?? entry.状态)}，${reason}`;
    if (type === '性经历') return `更新N：性经历，${t(entry.part ?? entry.部位)}，${t(entry.delta ?? entry.value ?? entry.变化)}，${reason}`;
    if (type === '性历史') return `更新N：性历史，${t(entry.transition ?? entry.状态转移 ?? entry.field ?? entry.字段)}，${t(entry.partner ?? entry.对象 ?? entry.value)}，${t(entry.evidence ?? entry.reason ?? entry.证据)}`;
    if (type === '关系') return `更新N：关系，${t(entry.left ?? entry.左方 ?? entry.subject ?? entry.主体)}，${t(entry.right ?? entry.右方 ?? entry.target ?? entry.对象)}，${t(entry.dimension ?? entry.维度 ?? entry.field)}，${t(entry.status ?? entry.状态 ?? entry.value)}，${reason}，${t(entry.result ?? entry.结果 ?? entry.value)}`;
    if (type === '角色卡') return `更新N：角色卡，${field}，${t(entry.op ?? entry.操作 ?? '增加')}，${value}，${reason}，${t(entry.result ?? entry.结果 ?? value)}`;
    return `更新N：${type}，${field}，${value}，${reason}`;
  },

  parseRelationshipJsonEntry(entry = {}, subject = null, participants = []) {
    const t = (value) => this.settlementJsonText(value);
    const player = (participants || []).find((p) => p?.type === 'player');
    const left = t(entry.left ?? entry.左方 ?? entry.actor ?? entry.甲方 ?? player?.name ?? player?.id ?? '');
    const right = t(entry.right ?? entry.右方 ?? entry.target ?? entry.对象 ?? entry.乙方 ?? subject?.name ?? subject?.id ?? '');
    const dimension = t(entry.dimension ?? entry.维度 ?? entry.field ?? entry.字段 ?? '');
    const status = t(entry.status ?? entry.状态 ?? entry.value ?? entry.关系状态 ?? '');
    const reason = t(entry.reason ?? entry.原因 ?? entry.evidence ?? entry.证据 ?? '');
    const result = t(entry.result ?? entry.结果 ?? status);
    if (!subject || !left || !right || !dimension || !status || !reason || !result) return null;
    if (/^(?:好感|好感度|信任|依赖|警惕|畏惧|反感|愤怒|恐惧|紧张|安心|悲伤|开心|高兴)$/u.test(dimension) || /^[-+]?\d/u.test(status)) return null;
    return { updateType: 'relationship', subject, field: `relationships.${dimension}`, change: { mode: 'upsert', value: { left, right, dimension, status, reason, result } }, reasons: [{ trigger: '关系变化', evidence: reason, confidence: 'confirmed' }] };
  },

  parseSettlementJson(raw, { requestedTypes = [], participants = [], store = null, config = this.realConfig() } = {}) {
    const data = this.parseCompactSettlementJson(raw);
    if (!data || Array.isArray(data) || typeof data !== 'object') return null;
    const patchesByType = {};
    const completeTypes = [];
    const incompleteTypes = [];
    const baseFields = {};
    const baseKeys = ['经过时间', '当前状态', '当前目标', '场景标题', '地点名称', '备选行动1', '备选行动2', '备选行动3', '备选行动4'];
    const specialParsers = {
      '人事安排': (line, subject) => this.parseScheduleSettlementLine(line, subject, participants),
      '系统记录': (line, subject) => this.parseSystemSettlementLine(line, subject, participants),
      '穿着状态': (line, subject) => this.parseWearingSettlementLine(line, subject, participants),
      '身体状态': (line, subject) => this.parseBodyStatusSettlementLine(line, subject, participants),
      '性经历': (line, subject) => this.parseSexualExperienceSettlementLine(line, subject, participants),
    };
    requestedTypes.forEach((type) => {
      const value = data[type];
      const patch = { genericUpdates: [], baseFields: {}, __updateLines: 0, __parsedUpdates: 0, __lines: [JSON.stringify({ [type]: value })], __closedByBrace: value !== undefined };
      if (value === undefined) {
        incompleteTypes.push(type);
        patchesByType[type] = patch;
        return;
      }
      if (type === '基础结算') {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          ['经过时间', '当前状态', '当前目标', '场景标题', '地点名称'].forEach((key) => { if (value[key] !== undefined) patch.baseFields[key] = String(value[key]).trim(); });
          const choices = Array.isArray(value['备选行动']) ? value['备选行动'] : [];
          [1, 2, 3, 4].forEach((index) => {
            const key = `备选行动${index}`;
            const choice = value[key] ?? choices[index - 1];
            if (choice !== undefined) patch.baseFields[key] = String(choice).trim();
          });
        }
      } else if (Array.isArray(value)) {
        value.forEach((entry) => {
          if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            if (entry !== undefined && entry !== null) patch.__updateLines += 1;
            return;
          }
          patch.__updateLines += 1;
          const subject = this.settlementJsonSubject(type, entry, participants) || this.defaultSubjectForSettlement(participants);
          const line = this.settlementJsonUpdateLine(type, entry);
          const update = type === '关系'
            ? this.parseRelationshipJsonEntry(entry, subject, participants)
            : (specialParsers[type]
              ? specialParsers[type](line, subject)
              : (['性历史', '角色卡'].includes(type) ? this.parseSpecialSettlementLine(type, line, subject, participants) : this.parseStandardSettlementLine(type, line, subject, participants, store)));
          if (update) {
            patch.__parsedUpdates += 1;
            patch.genericUpdates.push(update);
          }
        });
      }
      const hasParsedAllUpdates = !patch.__updateLines || patch.__parsedUpdates === patch.__updateLines;
      const hasRequiredBaseFields = type !== '基础结算' || baseKeys.every((key) => String(patch.baseFields[key] || '').trim());
      patchesByType[type] = patch;
      if (hasParsedAllUpdates && hasRequiredBaseFields && (type === '基础结算' || Array.isArray(value))) {
        completeTypes.push(type);
        if (type === '基础结算') Object.assign(baseFields, patch.baseFields);
      } else incompleteTypes.push(type);
    });
    const genericUpdates = completeTypes.flatMap((type) => patchesByType[type]?.genericUpdates || []);
    return { format: 'json', patchesByType, completeTypes, incompleteTypes, genericUpdates, baseFields };
  },

  parseSettlementKv(raw, { requestedTypes = [], participants = [], store = null, config = this.realConfig() } = {}) {
    const contracts = this.settlementTypeContracts();
    const labelsForType = ([type, c]) => [c.title, type];
    const headingPrefix = (line = '') => Object.entries(contracts).find((entry) => labelsForType(entry).some((label) => line === `${label}：` || line === `${label}:` || line === `${label}{` || line === `${label} {` || line.startsWith(`${label}：`) || line.startsWith(`${label}:`)));
    const lines = String(raw || '').replace(/；/gu, '\n').split(/\r?\n/u).map((line) => line.trim()).filter(Boolean).flatMap((line) => {
      const hit = headingPrefix(line);
      if (!hit) return [line];
      const labels = labelsForType(hit);
      const braceLabel = labels.find((item) => line === `${item}{` || line === `${item} {`);
      if (braceLabel) return [`${hit[1].title}{`];
      const label = labels.find((item) => line.startsWith(`${item}：`) || line.startsWith(`${item}:`));
      const rest = line.slice(String(label || '').length + 1).trim();
      return rest ? [`${hit[1].title}：`, rest] : [`${hit[1].title}：`];
    });
    const patchesByType = {};
    const completeTypes = [];
    const incompleteTypes = [];
    const baseFields = {};
    const blocksByType = {};
    let currentBlock = null;
    const baseKeys = ['经过时间', '当前状态', '当前目标', '场景标题', '地点名称', '备选行动1', '备选行动2', '备选行动3', '备选行动4'];
    const settlementTypeFromHeading = (line) => Object.entries(contracts).find((entry) => labelsForType(entry).some((label) => line === `${label}：` || line === `${label}:` || line === `${label}{` || line === `${label} {`));
    for (const line of lines) {
      const typeHit = settlementTypeFromHeading(line);
      if (typeHit) {
        if (currentBlock) currentBlock.closedByNextHeading = true;
        const type = typeHit[0];
        currentBlock = { type, lines: [line], closedByNextHeading: false, closedByBrace: false };
        blocksByType[type] = blocksByType[type] || [];
        blocksByType[type].push(currentBlock);
        continue;
      }
      if (line === '}') {
        if (currentBlock) currentBlock.closedByBrace = true;
        currentBlock = null;
        continue;
      }
      if (currentBlock) currentBlock.lines.push(line);
    }
    const parseBlock = (type, block = { lines: [] }, blockCount = 1) => {
      const blockLines = block.lines || [];
      const patch = { genericUpdates: [], baseFields: {}, __updateLines: 0, __parsedUpdates: 0, __lines: blockLines.slice(), __headingCount: blockCount, __closedByNextHeading: Boolean(block.closedByNextHeading), __closedByBrace: Boolean(block.closedByBrace) };
      let currentSubject = null;
      const subjectFallbackTypes = ['情绪', '感觉', '生命体征', '身体状态', '穿着状态', '性经历', '性历史', '关系', '角色卡', '物品'];
      const defaultSubject = subjectFallbackTypes.includes(type) ? this.defaultSubjectForSettlement(participants) : null;
      const normalizeLegacySubjectLine = (line) => {
        const match = String(line || '').match(/^([^：:]+)[：:]\s*(.+)$/u);
        if (!match || /^结算状态$/u.test(match[1])) return null;
        const subject = this.subjectForSettlement(match[1].trim(), participants);
        if (!subject) return null;
        const rest = match[2].trim();
        const first = rest.split(/[，,]/u)[0]?.trim();
        if (!first || (first !== type && first !== contracts[type]?.title?.replace(/结算$/u, ''))) return null;
        return { subject, line: `更新N：${rest}` };
      };
      blockLines.slice(1).forEach((line) => {
        if (type === '基础结算') {
          const base = this.splitKvLine(line);
          if (base && baseKeys.includes(base.key)) {
            patch.baseFields[base.key] = base.value;
            return;
          }
        }
        if (/^(?:结算对象|参与者)[：:]/u.test(line)) {
          const [name, objectType, allowed] = line.replace(/^(?:结算对象|参与者)[：:]/u, '').split(/[｜|]/u).map((x) => x.trim());
          const isSceneParticipant = this.participantAllowedForSettlement(name, participants);
          const isScheduleSubject = type === '人事安排' && ['角色', '玩家'].includes(objectType);
          const isNonCharacterSystem = type !== '人事安排' && ['地点', '势力', '世界', '系统'].includes(objectType);
          currentSubject = allowed === '允许结算' && ((type === '人事安排' && isScheduleSubject && isSceneParticipant) || (type !== '人事安排' && (isSceneParticipant || isNonCharacterSystem))) ? (this.subjectForSettlement(name, participants) || { type: objectType || 'system', id: name, name }) : null;
          return;
        }
        const legacy = normalizeLegacySubjectLine(line);
        const updateLine = legacy?.line || line;
        const updateSubject = legacy?.subject || currentSubject || defaultSubject;
        if (/^更新(?:\d+|N)[：:]/u.test(updateLine)) {
          patch.__updateLines += 1;
          const specialParsers = {
            '人事安排': () => this.parseScheduleSettlementLine(updateLine, updateSubject, participants),
            '系统记录': () => this.parseSystemSettlementLine(updateLine, updateSubject, participants),
            '穿着状态': () => this.parseWearingSettlementLine(updateLine, updateSubject, participants),
            '身体状态': () => this.parseBodyStatusSettlementLine(updateLine, updateSubject, participants),
            '性经历': () => this.parseSexualExperienceSettlementLine(updateLine, updateSubject, participants),
          };
          const update = specialParsers[type]
            ? specialParsers[type]()
            : (['性历史', '关系', '角色卡'].includes(type) ? this.parseSpecialSettlementLine(type, updateLine, updateSubject, participants) : this.parseStandardSettlementLine(type, updateLine, updateSubject, participants, store));
          if (update) {
            patch.__parsedUpdates += 1;
            patch.genericUpdates.push(update);
          }
          return;
        }
        if (/^类型完成[：:]是$/u.test(line)) { patch.__typeDone = true; return; }
        if (/^结算结束[：:]是$/u.test(line)) patch.__settlementDone = true;
      });
      return patch;
    };
    const patchIsComplete = (type, patch) => {
      const hasParsedAllUpdates = !patch?.__updateLines || patch.__parsedUpdates === patch.__updateLines;
      const hasRequiredBaseFields = type !== '基础结算' || baseKeys.every((key) => String(patch?.baseFields?.[key] || '').trim());
      const hasBraceCompletion = Boolean(patch?.__closedByBrace);
      return Boolean(hasBraceCompletion && hasParsedAllUpdates && hasRequiredBaseFields);
    };
    const patchScore = (type, patch) => {
      const malformedUpdates = Math.max(0, (patch?.__updateLines || 0) - (patch?.__parsedUpdates || 0));
      return (patchIsComplete(type, patch) ? 10000 : 0)
        + (patch?.__closedByBrace ? 300 : 0)
        + (patch?.__typeDone ? 100 : 0)
        + (patch?.__settlementDone ? 100 : 0)
        + ((patch?.__parsedUpdates || 0) * 100)
        + (Object.keys(patch?.baseFields || {}).length * 20)
        + ((!patch?.__updateLines || patch.__parsedUpdates === patch.__updateLines) ? 50 : 0)
        - (malformedUpdates * 200);
    };
    requestedTypes.forEach((type) => {
      const blocks = blocksByType[type] || [];
      const candidates = blocks.map((block) => parseBlock(type, block, blocks.length));
      let patch = null;
      if (candidates.length > 1 && candidates.every((item) => patchIsComplete(type, item))) {
        patch = candidates.reduce((merged, item) => ({
          ...merged,
          baseFields: { ...(merged.baseFields || {}), ...(item.baseFields || {}) },
          genericUpdates: [...(merged.genericUpdates || []), ...(item.genericUpdates || [])],
          __parsedUpdates: (merged.__parsedUpdates || 0) + (item.__parsedUpdates || 0),
          __updateLines: (merged.__updateLines || 0) + (item.__updateLines || 0),
          __lines: [...(merged.__lines || []), ...(item.__lines || [])],
          __closedByBrace: true,
        }), { genericUpdates: [], baseFields: {}, __updateLines: 0, __parsedUpdates: 0, __lines: [], __headingCount: candidates.length, __closedByBrace: true });
      } else {
        patch = candidates.sort((a, b) => patchScore(type, b) - patchScore(type, a))[0];
      }
      if (patch) patchesByType[type] = patch;
      if (patchIsComplete(type, patch)) {
        completeTypes.push(type);
        if (type === '基础结算') Object.assign(baseFields, patch.baseFields);
      } else incompleteTypes.push(type);
    });
    const genericUpdates = completeTypes.flatMap((type) => patchesByType[type]?.genericUpdates || []);
    return { patchesByType, completeTypes, incompleteTypes, genericUpdates, baseFields };
  },

  settlementTypeShortRule(type = '') {
    const contracts = this.settlementTypeContracts();
    const c = contracts[type] || { title: `${type}结算`, format: '更新N：类型，字段，变化，原因' };
    const rules = {
      '情绪': '字段只能使用本轮“当前情绪基线”里已有指标名；value 必须是 +N/-N 且不能为 0；可把愉悦/开心映射为高兴、惊慌映射为恐惧、不安映射为紧张；没有对应已有指标或无稳定变化时输出空数组。',
      '感觉': '主体只能是出场 NPC，不能是玩家；字段只能使用“出场角色对玩家感觉基线”里已有指标名；value 必须是 +N/-N 且不能为 0；可把信赖映射为信任、亲近映射为好感、害怕映射为畏惧、厌恶映射为反感。',
      '生命体征': '字段只能是：生命力、精力、饱食度、水分、疲劳、精神稳定；允许别名输入但最终字段写这 6 个中文名；禁止心率、体温、呼吸频率、血压、血氧、瞳孔、激素、行动能力、肌肉紧张度等新指标；变化必须是 +N/-N 且不能为 0；健康正常或无稳定变化时输出空数组。',
      '身体状态': '部位只能是：整体/全身、口部/嘴部/嘴唇、胸部/胸口/乳房、阴部/私处、肛部、臀部/屁股、四肢/手臂/腿部、皮肤、其他；禁止坐姿、手指动作、肌肉紧张度等新部位字段。',
      '穿着状态': '穿着部位只能是：全身/整体、胸部/胸口/乳房、上身、外套、下身、腿部/大腿、足部/脚部、内裤、饰品；全身/整体会按外套处理并清空其他衣物槽；同轮若还有局部部位，先应用全身再覆盖局部部位；禁止肩部、腰部、衣领、吊带位置等非槽位字段；必须包含衣物名称和当前状态。',
      '性经历': '分类只能是：阴部、胸部/胸口/乳房、唇部/接吻、口部/嘴部、口部行为、口交、口交中出、阴部进入、阴道插入、阴道中出、肛部/肛门、肛部进入、肛交、肛交中出、腿部/大腿、臀部/屁股、手部/手、皮肤、其他；delta 必须是 +N/-N 且不能为 0；禁止写总次数/总数/全部；无相关行为时输出空数组。',
      '关系': '只记录稳定关系维度，如亲属、朋友、同事、师生、雇佣、敌对、同居、恋人；好感、信任、依赖、警惕等数值态度写“感觉”，不要写关系。',
      '角色卡': '只写稳定角色卡字段：当前状态、身份、职业、技能、知识、外貌、性格、喜好、人物说明、社群角色、势力地位、人际关系；临时情绪、生命体征、身体、穿着、关系、物品有专门类型时不得写角色卡。',
      '地图': '字段只能是：当前位置、上级地点、地点事实、地图节点、路线事实；角色当前所在地优先写人事安排，不要把角色行动写成地图事实。',
      '人事安排': '只更新本回合 participants 中的参与者；明确通信/移动/约定涉及的人必须先由上游加入 participants 后才可结算；只记录当前地点、当前行动、可用状态；不得全角色批量刷新；弱推测不更新。',
      '势力总览': '字段只能是：新增势力、上层势力归属、势力APP归属；组织内部部门、职位、成员地位写势力结构。',
      '势力结构': '字段只能是：部门角色、职位、成员地位；势力是否存在或隶属关系写势力总览。',
      '系统记录': '字段只能是：事件、记录、通信消息、剧情记录、状态；角色自身状态不要写系统记录。',
      '通用固化': '只能写没有专门类型承载的长期稳定标签；情绪、感觉、生命体征、身体、穿着、性经历、性历史、关系、物品、地图、人事、势力、系统记录有专门类型时不得写通用固化。',
    };
    return [
      `${c.title}规则：`,
      rules[type] || '只有本轮稳定事实明确支持时才更新；弱氛围、猜测或未确认变化不更新。',
    ].join('\n');
  },

  settlementParticipantMetrics(store = {}, participant = {}) {
    const state = participant?.type === 'player'
      ? store?.playerIdentityState?.()
      : (store?.itemSkillState?.(participant.id) || store?.itemSkillState?.(participant.idOrName) || store?.rpgStates?.[participant.id]);
    return state?.metrics || (state ? store?.ensureStateMetrics?.(state) : null) || {};
  },

  settlementMetricKeysForSubject(store = {}, subject = {}, metricType = '') {
    if (metricType === '感觉' && subject?.type === 'player') return [];
    const participant = { type: subject?.type, id: subject?.id, idOrName: subject?.id, name: subject?.name };
    const metrics = this.settlementParticipantMetrics(store, participant);
    const group = metricType === '感觉' ? metrics.playerFeelings : metrics.emotions;
    return Object.keys(group || {}).filter((key) => String(key || '').trim());
  },

  settlementParticipantContextText(store = {}, participants = []) {
    const playerName = String(store?.playerName || store?.playerProfile?.name || store?.realWorldPlayerSettlementName?.() || '玩家').trim() || '玩家';
    const chars = (Array.isArray(participants) ? participants : []).filter((p) => p?.type === 'character');
    const roleRows = chars.map((participant) => {
      const state = store?.itemSkillState?.(participant.id) || store?.itemSkillState?.(participant.idOrName) || store?.rpgStates?.[participant.id];
      const profile = state?.profile || {};
      const facts = [profile.role || state?.role, profile.relationship || profile.identity, profile.age ? `${profile.age}岁` : ''].filter(Boolean).join('；') || '角色卡已加载';
      return `${participant.name || participant.id}：${facts}`;
    }).join('\n') || '无';
    const bindings = [`你=${playerName}（玩家）`].concat(chars.map((p) => `${p.name || p.id}=出场角色，结算主体必须直接写姓名`)).join('\n');
    return [
      '玩家与出场人物标注：',
      `玩家：${playerName}`,
      `出场角色：${chars.map((p) => p.name || p.id).filter(Boolean).join('、') || '无'}`,
      '指代绑定：',
      bindings,
      '出场人物角色卡摘要：',
      roleRows,
    ].join('\n');
  },

  settlementMetricBaselineText(store = {}, participants = []) {
    const emotionKeys = new Set();
    const feelingKeys = new Set();
    const format = (group = {}, keySet = null) => Object.entries(group || {}).filter(([, value]) => value !== undefined && value !== null && value !== '').map(([key, value]) => {
      if (keySet) keySet.add(key);
      return `${key}=${value}`;
    }).join('、') || '无';
    const rows = (Array.isArray(participants) ? participants : []).map((participant) => {
      const metrics = this.settlementParticipantMetrics(store, participant);
      const state = participant?.type === 'player'
        ? store?.playerIdentityState?.()
        : (store?.itemSkillState?.(participant.id) || store?.itemSkillState?.(participant.idOrName) || store?.rpgStates?.[participant.id]);
      const label = participant?.name || state?.profile?.name || participant?.id || '';
      if (!label) return null;
      return { type: participant?.type, label, emotions: format(metrics.emotions, emotionKeys), playerFeelings: format(metrics.playerFeelings, participant?.type === 'character' ? feelingKeys : null) };
    }).filter(Boolean);
    const characterRows = rows.filter((row) => row.type === 'character');
    const playerRows = rows.filter((row) => row.type === 'player');
    const emotionRows = characterRows.map((row) => `${row.label}：情绪：${row.emotions}`).join('\n') || '无';
    const playerEmotionRows = playerRows.map((row) => `${row.label}：玩家自我情绪：${row.emotions}`).join('\n') || '无';
    const feelingRows = characterRows.map((row) => `${row.label}：对玩家感觉：${row.playerFeelings}`).join('\n') || '无';
    const emotionWhitelist = [...emotionKeys].join('、') || '无';
    const feelingWhitelist = [...feelingKeys].join('、') || '无';
    return [
      '出场角色当前情绪基线：',
      emotionRows,
      '玩家自我状态基线：',
      playerEmotionRows,
      `情绪指标只能使用上述情绪基线中已经存在的指标名：${emotionWhitelist}`,
      '出场角色对玩家感觉基线：',
      feelingRows,
      `感觉指标只能使用出场角色对玩家感觉基线中已经存在的指标名：${feelingWhitelist}`,
      '若稳定事实不对应上述已有指标名，必须写“无变化”，不得新造情绪/感觉指标。',
      '边界：情绪是对应主体当前内在情绪；感觉只表示出场角色对玩家的感觉，玩家本人不得作为“对玩家感觉”的结算主体。',
    ].join('\n');
  },

  async buildSettlementTypeWindowMessages({ requestedTypes = [], completedTypes = [], incompleteTypes = [], partialByType = {}, store, action, base, loaded, materialSession = null, narration, trace = [], participants = [], config = this.realConfig() }) {
    const contracts = this.settlementTypeContracts();
    const totalTypes = requestedTypes.length;
    const jsonContracts = requestedTypes.map((type) => {
      const c = contracts[type];
      if (type === '基础结算') return '基础结算：对象，必须含 keys：经过时间、当前状态、当前目标、场景标题、地点名称、备选行动；备选行动必须是 4 个字符串数组。';
      if (type === '穿着状态') return '穿着状态：数组；每项 {"subject":"姓名","part":"部位","item":"衣物名称","state":"当前状态","reason":"证据"}；无变化 []。';
      if (type === '身体状态') return '身体状态：数组；每项 {"subject":"姓名","part":"部位","status":"状态","reason":"证据"}；无变化 []。';
      if (type === '性经历') return '性经历：数组；每项 {"subject":"姓名","part":"分类","delta":"+N/-N","reason":"证据"}；无变化 []。';
      if (type === '性历史') return '性历史：数组；每项 {"subject":"姓名","transition":"状态转移","partner":"对象","evidence":"证据"}；无变化 []。';
      if (type === '关系') return '关系：数组；每项 {"subject":"姓名","left":"关系左方","right":"关系右方","dimension":"稳定关系维度","status":"关系状态","reason":"证据","result":"结算结果"}；无变化 []。';
      if (type === '角色卡') return '角色卡：数组；每项 {"subject":"姓名","field":"字段","op":"替换/增加","value":"内容","reason":"证据","result":"结果"}；无变化 []。';
      return `${type}：数组；每项 {"subject":"结算主体","field":"字段","value":"变化或新值","reason":"证据"}；无变化 []。原合约：${c?.format || '更新N：结算主体，字段，变化，原因'}`;
    }).join('\n');
    const globalShortReason = String(partialByType.__shortOutputReason || '').trim();
    const incompleteReason = [globalShortReason, incompleteTypes.map((type) => {
      const detail = String(partialByType[type] || '').trim();
      return `${type}：${detail || '上轮 JSON 缺失或字段未通过解析，本轮必须重新输出该 key 的完整 JSON 值'}`;
    }).join('；')].filter(Boolean).join('\n') || '无';
    const stableFactRules = [
      '内部提取“本轮稳定事实”：只在内部完成，不输出事实列表。',
      '明确事实：可直接结算。',
      '强暗示事实：可保守结算，但必须有明确行为、对话或连续动作支撑。',
      '弱氛围暗示：不得结算。',
    ].join('\n');
    const requiredKeyOrder = requestedTypes.join(' → ');
    const rulesText = [
      '你正在执行 Stage4 紧凑 JSON 滑动结算。',
      '只输出一个合法 JSON 对象；不要 Markdown；不要 ```json 代码块；不要换行；不要解释；不要内部分析。',
      '上一条 assistant 消息是本轮正文材料；只能依据该正文和本条要求中的材料结算。',
      'JSON 顶层 key 只能是“本次必须返回的类型”列出的类型；已完成类型不得重复输出；未列入类型不得输出。',
      '无稳定变化的非基础类型必须输出空数组 []，不要写“无变化”。',
      '情绪、感觉、生命体征、性经历的 value/delta 必须写 +N 或 -N；禁止写 0、+0、100、98/100、正常、无变化。',
      '感觉主体只能是出场 NPC；玩家本人不得输出感觉更新。',
      '每条更新只能写一个字段，禁止把字段合并成“当前地点/当前行动/可用状态”或“事件/记录/状态”。',
    ].join('\n');
    const requestText = [
      '任务：输出 Stage4 结算紧凑 JSON。',
      `本次必须返回的类型：${requestedTypes.join('、')}`,
      `已完成类型：${completedTypes.join('、') || '无'}`,
      `未完成类型：${incompleteTypes.join('、') || '无'}`,
      `必须输出 key 数量：${totalTypes}`,
      `必须输出 key 顺序：${requiredKeyOrder || '无'}`,
      `未完成类型原因：${incompleteReason}`,
      `本回合参与者：${JSON.stringify(participants)}`,
      '本轮结算材料：',
      [`行动：${this.actionText(action)}`, this.settlementParticipantContextText(store, participants), this.settlementMetricBaselineText(store, participants), stableFactRules].join('\n'),
      '类型短规则：',
      requestedTypes.map((type) => this.settlementTypeShortRule(type)).join('\n\n'),
      'JSON 合约：',
      jsonContracts,
      '输出硬规则：',
      '- 只输出一个紧凑 JSON 对象，首字符必须是 {，末字符必须是 }。',
      '- 顶层 key 必须且只能包含本次必须返回的类型；按必须输出 key 顺序排列。',
      '- 基础结算必须输出完整对象；非基础类型必须输出数组，有变化写对象数组，无变化写 []。',
      '- subject 必须直接写本回合参与者姓名、明确地点名、明确势力名或“系统”；不要写代词。',
      '- reason/evidence 必须写具体行为、对话或连续动作证据；弱氛围暗示不得结算。',
      '- 情绪、感觉、生命体征、性经历的 value/delta 必须是带符号非零变化，例如 +2 或 -1；没有变化输出 []。',
      '- 感觉数组中 subject 只能写出场 NPC，不能写玩家姓名。',
      '- 字符串中不要使用英文逗号或中文逗号分隔多字段；必要时用顿号或分号。',
      '- 不要为了凑长度创造更新；空数组是合法完整输出。',
      '合法形态示例：{"情绪":[],"身体状态":[{"subject":"角色名","part":"整体","status":"状态","reason":"证据"}],"系统记录":[]}',
    ].join('\n');
    return [
      { role: 'user', content: rulesText },
      { role: 'assistant', content: `本轮正文：\n${this.compactUpdatePromptText(narration, 1800, true)}` },
      { role: 'user', content: requestText },
    ];
  },

  async completeConfiguredSettlementKvWindow({ store, action, base, loaded, materialSession = null, narration, trace = [], participants = [], logId = null, config = this.realConfig() }) {
    const allTypes = this.settlementTypeQueue(config);
    const completedTypes = [];
    const partialByType = {};
    const patchesByType = {};
    let requestedTypes = this.nextSettlementWindow(allTypes, completedTypes, []);
    let shortOutputRetries = 0;
    const maxAttempts = Math.max(8, allTypes.length + 2);
    for (let attempt = 0; attempt < maxAttempts && requestedTypes.length; attempt += 1) {
      const messages = await this.buildSettlementTypeWindowMessages({ requestedTypes, completedTypes, incompleteTypes: requestedTypes.filter((type) => partialByType[type]), partialByType, store, action, base, loaded, materialSession, narration, trace, participants, config });
      const raw = await this.completeConfiguredStep(store, messages, logId, false, { ...config, sourceTitle: `${config.label}Stage4滑动结算` });
      const jsonParsed = this.parseSettlementJson(raw, { requestedTypes, participants, store, config });
      const parsed = jsonParsed && (jsonParsed.completeTypes.length || jsonParsed.incompleteTypes.length)
        ? jsonParsed
        : this.parseSettlementKv(raw, { requestedTypes, participants, store, config });
      const compactRawLength = String(raw || '').replace(/\s+/gu, '').length;
      const isFinalBatch = requestedTypes.length <= 1 || parsed.incompleteTypes.length === 0;
      const shortOutputThreshold = parsed.format === 'json' ? 0 : 300;
      const isShortPartial = shortOutputThreshold > 0 && !isFinalBatch && compactRawLength < shortOutputThreshold;
      const hasCompleteBlocksInShortOutput = isShortPartial && parsed.completeTypes.length > 0;
      if (isShortPartial && !hasCompleteBlocksInShortOutput) {
        shortOutputRetries += 1;
        partialByType.__shortOutputReason = `上轮返回过短：${compactRawLength}/${shortOutputThreshold}；整轮已丢弃，必须按本次必须返回的类型顺序完整重输全部类型。`;
        if (shortOutputRetries > 1) throw new Error(`Stage4滑动结算返回过短且无完整类型：${compactRawLength}/${shortOutputThreshold}，未完成类型：${requestedTypes.join('、')}`);
        requestedTypes.forEach((type) => { partialByType[type] = '上轮返回过短且无完整类型；本轮必须重新输出该 key 的完整 JSON 值。'; });
        continue;
      }
      shortOutputRetries = 0;
      const acceptedShortReason = hasCompleteBlocksInShortOutput
        ? `上轮返回过短：${compactRawLength}/${shortOutputThreshold}；长度不足，但已验收完整块：${parsed.completeTypes.join('、')}；剩余类型必须完整补齐。`
        : '';
      delete partialByType.__shortOutputReason;
      parsed.completeTypes.forEach((type) => {
        if (!completedTypes.includes(type)) completedTypes.push(type);
        patchesByType[type] = parsed.patchesByType[type];
        delete partialByType[type];
      });
      parsed.incompleteTypes.forEach((type) => {
        const parsedLines = parsed.patchesByType[type]?.__lines || [];
        const parsedCount = parsed.patchesByType[type]?.__parsedUpdates || 0;
        const updateCount = parsed.patchesByType[type]?.__updateLines || 0;
        const cause = updateCount && parsedCount !== updateCount
          ? `字段未通过解析：${parsedCount}/${updateCount} 条有效；请检查 subject、field、value 与合约。`
          : '上轮 JSON 缺失或字段未通过解析。';
        partialByType[type] = parsedLines.length ? `${cause} 本轮必须重新输出该 key 的完整 JSON 值。` : `${cause} 本轮未返回该类型。`;
      });
      if (acceptedShortReason && parsed.incompleteTypes.length) partialByType.__shortOutputReason = acceptedShortReason;
      requestedTypes = this.nextSettlementWindow(allTypes, completedTypes, parsed.incompleteTypes);
    }
    requestedTypes = this.nextSettlementWindow(allTypes, completedTypes, []);
    if (requestedTypes.length) throw new Error(`Stage4结算类型未完成：${requestedTypes.join('、')}`);
    return this.mergeGroupedUpdatePatches(Object.values(patchesByType), {});
  },

  mergeGroupedUpdatePatches(patches = [], route = {}) {
    const merged = { type: 'final', genericUpdates: [] };
    const applyBaseFields = (baseFields = {}) => {
      const choices = ['备选行动1', '备选行动2', '备选行动3', '备选行动4'].map((key) => String(baseFields[key] || '').trim()).filter(Boolean);
      const elapsed = Number(baseFields['经过时间']);
      if (Number.isFinite(elapsed) && elapsed > 0) merged.elapsedSeconds = Math.max(1, Math.round(elapsed));
      if (baseFields['当前状态']) merged.status = String(baseFields['当前状态']).slice(0, 60);
      if (baseFields['当前目标']) merged.quest = String(baseFields['当前目标']).slice(0, 40);
      if (baseFields['场景标题']) merged.sceneTitle = String(baseFields['场景标题']).slice(0, 40);
      if (baseFields['地点名称']) merged.locationName = String(baseFields['地点名称']).slice(0, 60);
      if (choices.length === 4) merged.choices = choices.slice(0, 4);
    };
    ['sceneTitle', 'locationName', 'status', 'quest', 'elapsedSeconds', 'choices'].forEach((key) => {
      if (route[key] !== undefined && route[key] !== null && route[key] !== '') merged[key] = route[key];
    });
    (Array.isArray(patches) ? patches : []).forEach((patch) => {
      if (!patch || typeof patch !== 'object') return;
      applyBaseFields(patch.baseFields || {});
      if (Array.isArray(patch.genericUpdates)) merged.genericUpdates.push(...patch.genericUpdates);
    });
    return merged;
  },

  fallbackUpdateJson(store, action = '', config = this.realConfig()) {
    if (config.mode === 'story') {
      return {
        type: 'final',
        sceneTitle: store.sceneTitle || '剧情继续',
        elapsedSeconds: 60,
        mood: store.mood || '冷静',
        quest: store.quest || '继续观察',
        choices: Array.isArray(store.choices) && store.choices.length ? store.choices.slice(0, 4) : ['观察四周', '尝试行动', '与人交谈', '隐藏异样'],
        statChanges: { health: 0, stamina: 0, mental_stability: 0 },
        metricUpdates: { emotions: [], playerFeelings: [] },
      };
    }
    return {
      type: 'final',
      sceneTitle: store.realWorldSceneTitle || '现实世界',
      locationName: store.realWorldLocationName || store.realWorldMap?.current || '',
      elapsedSeconds: 300,
      status: store.realWorldStatus || '现实推演继续中',
      quest: store.realWorldQuest || '确认现实处境',
      choices: Array.isArray(store.realWorldChoices) && store.realWorldChoices.length ? store.realWorldChoices.slice(0, 4) : ['观察手机异常', '处理现实事务', '联系熟人', '暂时休息'],
      vitalUpdates: [
        { key: 'vitality', delta: 0, reason: '结算保留。' },
        { key: 'stamina_pool', delta: 0, reason: '结算保留。' },
        { key: 'satiety', delta: 0, reason: '结算保留。' },
        { key: 'hydration', delta: 0, reason: '结算保留。' },
        { key: 'fatigue', delta: 0, reason: '结算保留。' },
        { key: 'mental_stability', delta: 0, reason: '结算保留。' },
      ],
    };
  },

  guidedStepFields() {
    return ['查询规划', '资料状态', '地点查询理由', '因果查询理由', '冲突查询理由', '强制出场', '高优先候选', '戏剧候选', '禁止出场', '随机事件候选', '随机事件闯入条件', '资料请求', '资料请求结束', '地点查询', '因果查询', '冲突查询'];
  },

  sceneAnchorFields() {
    return ['场景锚定报告', '当前地点', '当前时间', '空间状态', '当前动作', '强制出场', '高优先候选', '戏剧候选', '禁止出场', '随机事件影响', '正文写作重点', '当前场景影响对象'];
  },

  settlementBaseFields() {
    return ['基础结算', '结算状态', '经过时间', '当前状态', '当前目标', '场景标题', '地点名称', '备选行动1', '备选行动2', '备选行动3', '备选行动4', '结算结束'];
  },

  kvFieldAliases() {
    return {
      '必须出场': '强制出场',
      '当前参与者': '强制出场',
      '不能出场': '禁止出场',
      '禁止角色': '禁止出场',
      '场外随机事件': '随机事件候选',
      '随机主动事件': '随机事件候选',
      '随机主动事件影响': '随机事件影响',
      '写作重点': '正文写作重点',
      '正文重点': '正文写作重点',
      '结算限制': '当前场景影响对象',
      '结算边界': '当前场景影响对象',
      '资料是否足够': '资料状态',
    };
  },

  normalizeKvKey(key = '', allowed = []) {
    const clean = String(key || '').trim().replace(/[\s　]+/gu, '');
    const numberedReason = clean.replace(/^(地点查询理由|因果查询理由|冲突查询理由)\d+$/u, '$1');
    const direct = allowed.find((item) => item === clean || item === numberedReason);
    if (direct) return direct;
    const alias = this.kvFieldAliases()[clean];
    return allowed.includes(alias) ? alias : '';
  },

  splitKvLine(line = '') {
    const text = String(line || '').trim();
    const match = text.match(/^([^：:\n]{1,40})[：:]\s*([\s\S]*)$/u);
    return match ? { key: match[1].trim(), value: match[2].trim() } : null;
  },

  requiredKvFields(allowed = []) {
    const sceneAnchorRequired = ['场景锚定报告', '当前地点', '当前时间', '空间状态', '当前动作', '强制出场', '禁止出场', '随机事件影响', '正文写作重点', '当前场景影响对象'];
    if (sceneAnchorRequired.every((key) => allowed.includes(key))) return sceneAnchorRequired;
    const preferred = ['资料状态', '强制出场', '禁止出场', '随机事件闯入条件', '正文写作重点', '结算边界'];
    const required = preferred.filter((key) => allowed.includes(key));
    return required.length ? required : allowed.slice(0, Math.min(allowed.length, 6));
  },

  materialRequestPlaceholderReason(line = '') {
    const placeholders = ['角色全称', '世界全称', '地点全称', '人物全称', '作品全称'];
    const body = String(line || '').replace(/^资料请求\d+\s*[：:]/u, '').trim();
    const parts = body.split(/[，,、；;]/u).map((part) => part.trim()).filter(Boolean).slice(2);
    const hit = parts.find((part) => placeholders.includes(part));
    return hit ? `资料请求包含未替换占位词：${hit}` : '';
  },

  fallbackChineseMaterialRequest(line = '', options = {}) {
    if (this.materialRequestPlaceholderReason(line)) return null;
    const ctx = options.config?.ctx || window.GameModules.realWorldAgentContext;
    if (typeof ctx?.parseChineseMaterialRequest === 'function') return ctx.parseChineseMaterialRequest(line, { mode: options.config?.mode, store: options.store });
    const body = String(line || '').replace(/^资料请求\d+\s*[：:]/u, '').trim();
    const parts = body.split(/[，,、；;]/u).map((part) => part.trim()).filter(Boolean);
    if (parts[0] === '角色查询' && parts[1] === '搜索角色卡' && parts[2]) {
      return { skill: 'character.query', method: 'searchCharacterProfile', params: { name: parts[2], world: parts[3] || window.GameModules.realWorld2026?.label || '2026现代都市现实世界' }, sourceText: String(line || '').trim() };
    }
    return null;
  },

  scoreChineseKvParse(values = {}, allowed = [], materialLines = [], materialRequests = []) {
    const required = this.requiredKvFields(allowed);
    const isGuidedStep = this.guidedStepFields().every((key) => allowed.includes(key));
    const hasCoreGuidedValues = isGuidedStep && ['资料状态', '随机事件闯入条件'].every((key) => String(values[key] || '').trim());
    const hasUsefulValue = (key) => {
      const value = String(values[key] || '').trim();
      if (value) return true;
      return hasCoreGuidedValues && ['强制出场', '禁止出场'].includes(key) && Object.prototype.hasOwnProperty.call(values, key);
    };
    const criticalHits = required.filter((key) => Object.prototype.hasOwnProperty.call(values, key) && hasUsefulValue(key));
    const uniqueValidRequests = [...new Set((materialRequests || []).map((item) => JSON.stringify([item.skill, item.method, item.params])))];
    const maxScore = Math.max(1, required.length + uniqueValidRequests.length);
    const score = criticalHits.length + uniqueValidRequests.length;
    return { score, maxScore, successRate: score / maxScore, criticalHits };
  },

  summarizeDroppedMaterialRequests(lines = [], limit = 3) {
    const unique = [...new Set((lines || []).map((line) => String(line || '').trim()).filter(Boolean))];
    if (!unique.length) return '无';
    const shown = unique.slice(0, limit).join('；');
    return unique.length > limit ? `${shown}；等${unique.length}条` : shown;
  },

  parseChineseKvBlock(raw, fields = [], options = {}) {
    const allowed = fields.slice();
    const values = {};
    const keyHits = new Set();
    const lines = String(raw || '').replace(/```[\s\S]*?```/gu, (block) => block.replace(/```(?:text|markdown|json)?|```/gu, '')).split(/\r?\n/u);
    const materialLines = [];
    const droppedMaterialRequests = [];
    lines.forEach((line) => {
      const parsed = this.splitKvLine(line);
      if (!parsed) return;
      if (/^资料请求\d+$/u.test(parsed.key)) {
        materialLines.push(`${parsed.key}：${parsed.value}`);
        return;
      }
      const key = this.normalizeKvKey(parsed.key, allowed);
      if (!key) return;
      const existing = String(values[key] || '').trim();
      const next = String(parsed.value || '').trim();
      values[key] = existing && next && existing !== '无' ? `${existing}；${next}` : parsed.value;
      keyHits.add(key);
    });
    const materialRequestErrors = [];
    const materialRequests = options.parseMaterialRequests ? materialLines.map((line) => {
      const placeholderReason = this.materialRequestPlaceholderReason(line);
      const req = this.fallbackChineseMaterialRequest(line, options);
      if (!req) {
        droppedMaterialRequests.push(line);
        if (placeholderReason) materialRequestErrors.push(placeholderReason);
      }
      return req;
    }).filter(Boolean) : [];
    const scored = this.scoreChineseKvParse(values, allowed, materialLines, materialRequests);
    return { values, lines, missing: allowed.filter((key) => !keyHits.has(key)), score: scored.score, maxScore: scored.maxScore, successRate: scored.successRate, keyHits: [...keyHits], criticalHits: scored.criticalHits, parseDegraded: scored.successRate < 1, droppedMaterialRequests, materialRequestErrors, materialRequests };
  },

  confirmedKvValuesText(parsed = {}) {
    const values = parsed.values || {};
    const keys = parsed.keyHits || Object.keys(values);
    const lines = keys
      .filter((key) => Object.prototype.hasOwnProperty.call(values, key))
      .map((key) => `${key}：${String(values[key] ?? '').trim()}`)
      .filter((line) => line.trim());
    return lines.length ? lines.join('\n') : '无';
  },

  mergeGuidedParseResults(primary = {}, secondary = {}) {
    const values = { ...(primary.values || {}) };
    const mergeConflicts = [...(primary.mergeConflicts || [])];
    Object.entries(secondary.values || {}).forEach(([key, value]) => {
      const primaryValue = String(values[key] || '').trim();
      const secondaryValue = String(value || '').trim();
      if (!Object.prototype.hasOwnProperty.call(values, key) || !primaryValue || (primaryValue === '无' && secondaryValue && secondaryValue !== '无')) values[key] = value;
      else if (value && values[key] !== value) mergeConflicts.push({ key, primary: values[key], secondary: value });
    });
    const requests = [...(primary.materialRequests || [])];
    const seenRequests = new Set(requests.map((item) => JSON.stringify([item.skill, item.method, item.params])));
    (secondary.materialRequests || []).forEach((item) => {
      const key = JSON.stringify([item.skill, item.method, item.params]);
      if (!seenRequests.has(key)) {
        seenRequests.add(key);
        requests.push(item);
      }
    });
    const fields = [...new Set([...(primary.keyHits || []), ...(primary.missing || []), ...(secondary.keyHits || []), ...(secondary.missing || [])])];
    const materialLines = [...(primary.lines || []), ...(secondary.lines || [])].filter((line) => /^资料请求\d+[：:]/u.test(String(line || '').trim()));
    const scored = this.scoreChineseKvParse(values, fields, materialLines, requests);
    return { ...primary, values, materialRequests: requests, droppedMaterialRequests: [...(primary.droppedMaterialRequests || []), ...(secondary.droppedMaterialRequests || [])], keyHits: fields.filter((key) => Object.prototype.hasOwnProperty.call(values, key)), missing: fields.filter((key) => !Object.prototype.hasOwnProperty.call(values, key)), score: scored.score, maxScore: scored.maxScore, successRate: scored.successRate, criticalHits: scored.criticalHits, parseDegraded: scored.successRate < 1, mergeConflicts };
  },

  bestGuidedParseResult(results = []) {
    return results.filter(Boolean).sort((a, b) => (b.successRate - a.successRate) || (b.score - a.score))[0] || null;
  },

  async completeParsedStep(store, prompt, logId, streamToUi = false, allowProseFinal = false) {
    return await this.completeConfiguredParsedStep(store, prompt, logId, streamToUi, allowProseFinal, this.realConfig());
  },

  async completeConfiguredParsedStep(store, prompt, logId, streamToUi = false, allowProseFinal = false, config = this.realConfig(), allowContextDoneOnProse = false) {
    let lastRaw = '';
    let bestRaw = '';
    let lastErr = null;
    const parseResults = [];
    for (let i = 0; i < 2; i += 1) {
      lastRaw = await this.completeConfiguredStep(store, prompt, logId, streamToUi, config);
      if (this.fallbackScore(lastRaw) >= this.fallbackScore(bestRaw)) bestRaw = lastRaw;
      if (allowContextDoneOnProse && this.looksLikeProseInsteadOfStepJson(lastRaw)) {
        console.warn(`${config.label}资料阶段误返回正文，视为资料已足够并进入正文阶段。`);
        return { raw: lastRaw, data: this.contextDoneFromProse(lastRaw) };
      }
      try {
        const data = this.parseStep(lastRaw, config);
        if (data) {
          if (!parseResults.length) return { raw: lastRaw, data };
          const current = this.parseChineseKvBlock(lastRaw, this.guidedStepFields(), { parseMaterialRequests: true, config });
          const mergedParsed = [...parseResults.map((item) => item.parsed), current].reduce((merged, item) => this.mergeGuidedParseResults(merged, item));
          return { raw: [...parseResults.map((item) => item.raw), lastRaw].join('\n\n'), data: this.guidedStepDataFromParsed(mergedParsed, [...parseResults.map((item) => item.raw), lastRaw].join('\n\n')) };
        }
        if (i === 1) return { raw: lastRaw, data: allowProseFinal ? this.proseFinal(store, bestRaw || lastRaw) : null };
        console.warn(`${config.label}格式不完整，自动重试一次`);
      } catch (err) {
        lastErr = err;
        if (err.parseResult && !err.skipMerge && !this.isGuidedStepSemanticSelfCheckError(err)) parseResults.push({ raw: lastRaw, parsed: err.parseResult });
        if (allowContextDoneOnProse && this.looksLikeProseInsteadOfStepJson(lastRaw)) {
          console.warn(`${config.label}资料阶段解析到正文内容，视为资料已足够并进入正文阶段。`);
          return { raw: lastRaw, data: this.contextDoneFromProse(lastRaw) };
        }
        if (!this.isRetryableParseError(err) || i === 1) break;
        const droppedSummary = this.summarizeDroppedMaterialRequests(err.parseResult?.droppedMaterialRequests || []);
        const parseDetail = err.parseResult ? `score=${err.parseResult.score}/${err.parseResult.maxScore} successRate=${err.parseResult.successRate} missing=${err.parseResult.missing?.join('、') || '无'} droppedMaterialRequests=${droppedSummary}` : '';
        const semanticSelfCheckFailed = this.isGuidedStepSemanticSelfCheckError(err);
        console.warn(`${config.label}${semanticSelfCheckFailed ? '语义自检失败' : '解析异常'}，自动重试一次:`, err.message, parseDetail);
        const retryInstruction = [
          `上次中文 K:V ${semanticSelfCheckFailed ? '语义自检失败' : '解析失败'}：${err.message}`,
          `已成功字段：${err.parseResult?.keyHits?.join('、') || '无'}`,
          `已确认字段值：\n${this.confirmedKvValuesText(err.parseResult)}`,
          `缺失字段：${err.parseResult?.missing?.join('、') || '未知'}`,
          `已丢弃资料请求：${droppedSummary}`,
          '请重新输出完整中文 K:V；必须保留已确认字段值，只补齐或修正缺失/错误字段；不得删除用户明确约束、禁止出场、已确认强制出场；不要重复输出已丢弃资料请求。',
          '【AI自检】若资料状态为“继续请求资料”，优先输出可执行资料请求1/2/3或明确参与者候选；若没有可执行资料请求，必须保留尽可能多而全的地点/因果/冲突查询理由，系统会带着这些理由进入场景锚定。不得输出单独的地点查询/因果查询/冲突查询字段。',
        ].join('\n\n');
        prompt = Array.isArray(prompt)
          ? [...prompt, { role: 'user', content: retryInstruction }]
          : [prompt, retryInstruction].join('\n\n');
      }
    }
    const mergeableParseResults = lastErr?.parseResult && !lastErr?.skipMerge ? [...parseResults, { raw: lastRaw, parsed: lastErr.parseResult }] : parseResults;
    if (mergeableParseResults.length >= 2) {
      const merged = mergeableParseResults.map((item) => item.parsed).reduce((out, item) => this.mergeGuidedParseResults(out, item));
      if (merged.successRate >= 0.8) {
        const raw = mergeableParseResults.map((item) => item.raw).join('\n\n');
        try {
          return { raw, data: this.guidedStepDataFromParsed(merged, raw) };
        } catch (_) {
          // 合并后仍未通过语义自检，继续走原失败路径。
        }
      }
    }
    if (allowProseFinal) return { raw: bestRaw || lastRaw, data: this.proseFinal(store, bestRaw || lastRaw) };
    if (lastErr) throw lastErr;
    return { raw: lastRaw, data: null };
  },

  looksLikeProseInsteadOfStepJson(raw = '') {
    const text = String(raw || '').trim();
    if (!text || text.startsWith('{') || text.startsWith('```')) return false;
    if (text.includes(this.finalSeparator)) return false;
    if (/"type"\s*:\s*"(?:request_context|context_done|final)"/u.test(text)) return false;
    return text.length >= 80 && /[。！？!?]/u.test(text);
  },

  contextDoneFromProse() {
    return {
      type: 'context_done',
      reason: '模型在资料收集阶段误返回正文，停止请求资料并进入正文推演',
      requests: [],
      characters: [],
    };
  },

  fallbackScore(raw) {
    const text = String(raw || '').trim();
    if (!text) return 0;
    const sepAt = text.indexOf(this.finalSeparator);
    return text.length + (sepAt >= 0 ? 10000 : 0);
  },

  proseFinal(store, raw) {
    const narration = this.cleanProseNarration(raw);
    if (!narration) return null;
    const repaired = this.repairedFinalJson(raw) || {};
    return {
      type: 'final',
      sceneTitle: repaired.sceneTitle || store.realWorldSceneTitle || '现实世界',
      locationName: repaired.locationName || store.realWorldLocationName || store.realWorldMap?.current || '',
      parentLocationName: repaired.parentLocationName || '',
      locationDescription: repaired.locationDescription || '',
      mapNodes: Array.isArray(repaired.mapNodes) ? repaired.mapNodes : [],
      newLocations: Array.isArray(repaired.newLocations) ? repaired.newLocations : [],
      locationDescriptionUpdates: Array.isArray(repaired.locationDescriptionUpdates) ? repaired.locationDescriptionUpdates : [],
      narration,
      elapsedSeconds: Math.max(1, Number(repaired.elapsedSeconds) || 300),
      status: repaired.status || store.realWorldStatus || '现实推演继续中',
      quest: repaired.quest || store.realWorldQuest || '确认现实处境',
      choices: Array.isArray(repaired.choices) && repaired.choices.length ? repaired.choices.slice(0, 4) : (store.realWorldChoices || ['观察手机异常', '处理现实事务', '联系熟人', '暂时休息']),
      vitalUpdates: Array.isArray(repaired.vitalUpdates) ? repaired.vitalUpdates : [],
      metricUpdates: repaired.metricUpdates && typeof repaired.metricUpdates === 'object' ? repaired.metricUpdates : {},
      wechatActions: Array.isArray(repaired.wechatActions) ? repaired.wechatActions : [],
      factionUpdates: Array.isArray(repaired.factionUpdates) ? repaired.factionUpdates : [],
      itemActions: Array.isArray(repaired.itemActions) ? repaired.itemActions : [],
      lexiconUpdates: Array.isArray(repaired.lexiconUpdates) ? repaired.lexiconUpdates : [],
      genericUpdates: window.GameModules.updateRegistry?.normalizeUpdates?.(repaired, store) || (Array.isArray(repaired.genericUpdates) ? repaired.genericUpdates : []),
    };
  },

  repairedFinalJson(raw) {
    const text = String(raw || '');
    const sepAt = text.indexOf(this.finalSeparator);
    if (sepAt < 0) return null;
    const jsonRaw = text.slice(sepAt + this.finalSeparator.length).trim();
    if (!jsonRaw || window.GameModules.aiRequest?.outputTailLooksTruncated?.(jsonRaw)) return null;
    try { return window.GameModules.jsonUtils.parseLoose(jsonRaw); }
    catch (_) { return null; }
  },

  cleanProseNarration(raw) {
    const text = this.compactAiReturn(raw);
    if (!text) return '';
    const sepAt = text.indexOf(this.finalSeparator);
    const prose = sepAt >= 0 ? text.slice(0, sepAt) : text;
    return this.compactAiReturn(prose);
  },

  async completeUpdateJson(store, prompt, logId) {
    return await this.completeConfiguredUpdateJson(store, prompt, logId, this.realConfig());
  },

  async completeConfiguredUpdateJson(store, prompt, logId, config = this.realConfig()) {
    let nextPrompt = prompt, lastErr = null, partial = '';
    for (let i = 0; i < 3; i += 1) {
      const raw = await this.completeConfiguredStep(store, nextPrompt, logId, false, config);
      const merged = partial ? this.mergeJsonContinuation(partial, raw) : raw;
      try { return this.parseCompleteUpdateJson(merged); }
      catch (err) {
        lastErr = err;
        partial = merged;
        if (i === 2) break;
        console.warn(`${config.label}更新 JSON 不完整，自动重试:`, err.message);
        nextPrompt = this.updateJsonRetryPrompt('', partial, err);
      }
    }
    throw lastErr || new Error(`${config.label}更新 JSON 生成失败`);
  },

  mergeJsonContinuation(partial = '', continuation = '') {
    const base = this.compactJsonReturn(partial);
    const next = this.compactJsonReturn(continuation);
    if (!next) return base;
    return this.compactJsonReturn(window.GameModules.jsonUtils?.mergeStreamText?.(base, next) || `${base}${next}`);
  },

  parseCompleteUpdateJson(raw) {
    const text = this.compactJsonReturn(raw);
    if (window.GameModules.aiRequest?.outputTailLooksTruncated?.(text)) throw new Error('现实更新 JSON 疑似被截断');
    const extracted = window.GameModules.jsonUtils.extractJson(text);
    const data = JSON.parse(window.GameModules.jsonUtils.repairJson(extracted));
    if (!data || typeof data !== 'object') throw new Error('现实更新 JSON 不是对象');
    return data;
  },

  updateJsonRetryPrompt(prompt, raw, err) {
    const tail = String(raw || '').replace(/\s+/gu, '').slice(-900);
    return `上次JSON未完成:${err?.message || 'JSON不完整'}。已输出尾部:${tail}。仅输出从尾部最后一个字符之后继续的JSON后续内容suffix；禁止重复已输出前缀；禁止Markdown；禁止解释；禁止换行、空格、制表符和不可见字符。`;
  },

  parseUpdateJson(raw) {
    return raw && typeof raw === 'object' ? raw : this.parseCompleteUpdateJson(raw);
  },

  configuredCharacterWorld(store, config = this.realConfig()) {
    if (config.mode === 'real') return window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';
    return store.currentWorldTag?.() || store.character?.work || store.selectedWork || '原创世界';
  },

  normalizeConfiguredCharacters(items = [], store, config = this.realConfig()) {
    const world = this.configuredCharacterWorld(store, config);
    return (Array.isArray(items) ? items : []).slice(0, 8).map((item) => window.GameModules.ai.normalizeCharacter(item, store, world)).filter(Boolean);
  },

  normalizeConfiguredSolidifiableCharacters(items = [], appeared = [], store, config = this.realConfig()) {
    const appearedByName = new Map(this.normalizeConfiguredCharacters(appeared, store, config).map((item) => [item.name, item]));
    return (Array.isArray(items) ? items : []).slice(0, 8).map((item) => {
      if (typeof item === 'string') return appearedByName.get(item.slice(0, 16)) || window.GameModules.ai.normalizeCharacter(item, store, this.configuredCharacterWorld(store, config));
      return window.GameModules.ai.normalizeCharacter(item, store, this.configuredCharacterWorld(store, config));
    }).filter(Boolean);
  },

  mergeNarrationAndUpdates(store, narration, updates = {}, config = this.realConfig()) {
    return {
      type: 'final',
      sceneTitle: updates.sceneTitle || store.realWorldSceneTitle || '现实世界',
      locationName: updates.locationName || store.realWorldLocationName || store.realWorldMap?.current || '',
      parentLocationName: updates.parentLocationName || '',
      locationDescription: updates.locationDescription || '',
      mapNodes: Array.isArray(updates.mapNodes) ? updates.mapNodes : [],
      newLocations: Array.isArray(updates.newLocations) ? updates.newLocations : [],
      locationDescriptionUpdates: Array.isArray(updates.locationDescriptionUpdates) ? updates.locationDescriptionUpdates : [],
      narration,
      elapsedSeconds: Math.max(1, Number(updates.elapsedSeconds) || 300),
      status: updates.status || store.realWorldStatus || '现实推演继续中',
      quest: updates.quest || store.realWorldQuest || '确认现实处境',
      choices: window.GameModules.ai.normalizeChoices?.(updates.choices, store.realWorldChoices || ['观察手机异常', '处理现实事务', '联系熟人', '暂时休息']) || [],
      vitalUpdates: Array.isArray(updates.vitalUpdates) ? updates.vitalUpdates : [],
      metricUpdates: updates.metricUpdates && typeof updates.metricUpdates === 'object' ? updates.metricUpdates : {},
      appearedCharacters: this.normalizeConfiguredCharacters(updates.appearedCharacters, store, config),
      solidifiableCharacters: this.normalizeConfiguredSolidifiableCharacters(updates.solidifiableCharacters, updates.appearedCharacters, store, config),
      wechatActions: Array.isArray(updates.wechatActions) ? updates.wechatActions : [],
      factionUpdates: Array.isArray(updates.factionUpdates) ? updates.factionUpdates : [],
      itemActions: Array.isArray(updates.itemActions) ? updates.itemActions : [],
      lexiconUpdates: Array.isArray(updates.lexiconUpdates) ? updates.lexiconUpdates : [],
      genericUpdates: Array.isArray(updates.genericUpdates) ? updates.genericUpdates : [],
    };
  },

  mergeStoryNarrationAndUpdates(store, narration, updates = {}, config = this.storyConfig()) {
    const fallback = window.GameModules.createFallbackResult?.(store, store.lastAction || '') || {};
    return {
      type: 'final',
      sceneTitle: String(updates.sceneTitle || fallback.sceneTitle || store.sceneTitle || '剧情继续').slice(0, 12),
      narration,
      elapsedSeconds: Math.max(1, Number(updates.elapsedSeconds) || fallback.elapsedSeconds || 60),
      thinking: store.thinkingMode ? String(updates.thinking || '').slice(0, 220) : '',
      speech: String(updates.speech || ''),
      mind: String(updates.mind || fallback.mind || ''),
      mood: String(updates.mood || fallback.mood || store.mood || '冷静').slice(0, 12),
      trust: Number.isFinite(updates.trust) ? updates.trust : store.trust,
      resistance: Number.isFinite(updates.resistance) ? updates.resistance : store.resistance,
      quest: String(updates.quest || fallback.quest || store.quest || '').slice(0, 24),
      characterIntent: String(updates.characterIntent || '').slice(0, 80),
      controlFeeling: String(updates.controlFeeling || fallback.controlFeeling || '疑惑').slice(0, 40),
      controlAdaptation: window.GameModules.ai.clampNumber?.(updates.controlAdaptation, fallback.controlAdaptation || 0) ?? 0,
      controlExperienceSummary: String(updates.controlExperienceSummary || fallback.controlExperienceSummary || '').slice(0, 80),
      metricUpdates: window.GameModules.ai.normalizeMetricUpdates?.(updates.metricUpdates) || {},
      choices: window.GameModules.ai.normalizeChoices?.(updates.choices, fallback.choices) || fallback.choices || [],
      appearedCharacters: this.normalizeConfiguredCharacters(updates.appearedCharacters, store, config),
      solidifiableCharacters: this.normalizeConfiguredSolidifiableCharacters(updates.solidifiableCharacters, updates.appearedCharacters, store, config),
      statChanges: { health: window.GameModules.ai.clampVitalDelta?.(updates.statChanges?.health) || 0, stamina: window.GameModules.ai.clampVitalDelta?.(updates.statChanges?.stamina) || 0, mental_stability: window.GameModules.ai.clampVitalDelta?.(updates.statChanges?.mental_stability) || 0 },
      combatEvent: window.GameModules.ai.normalizeCombatEvent?.(updates.combatEvent) || null,
      lexiconUpdates: window.GameModules.ai.normalizeLexiconUpdates?.(updates.lexiconUpdates, store) || [],
      genericUpdates: window.GameModules.updateRegistry?.normalizeUpdates?.(updates, store) || (Array.isArray(updates.genericUpdates) ? updates.genericUpdates.slice(0, 80) : []),
      itemActions: Array.isArray(updates.itemActions) ? updates.itemActions.slice(0, 20) : [],
    };
  },

  cleanPhasedNarration(raw) {
    return this.stripNarrationInstructionLeak(this.compactAiReturn(String(raw || '').replace(this.finalSeparator, ''))).trim();
  },

  stripNarrationInstructionLeak(text = '') {
    return String(text || '')
      .replace(/<\/?正文尾部>/gu, '')
      .replace(/\n*\s*(?:你能)?请从上述正文最后一个字符之后继续[\s\S]*?完整句号、问号、感叹号或右引号结束。?/gu, '')
      .replace(/\n*\s*现在仅输出正文后续suffix。?\s*$/gu, '')
      .trim();
  },

  chineseCharCount(text = '') {
    return (String(text || '').match(/[\u3400-\u9fff]/gu) || []).length;
  },

  narrationTailLooksIncomplete(text = '') {
    const raw = String(text || '').trim();
    if (!raw) return true;
    const tail = raw.slice(-80);
    const quoteCount = (raw.match(/[“”"『』「」]/g) || []).length;
    return /[，、：:；;（(《「『“—…-]$/u.test(tail) || quoteCount % 2 === 1 || !/[。！？!?」』”）)]$/u.test(tail);
  },

  trimIncompleteNarrationTail(text = '') {
    const raw = String(text || '').trim();
    if (!raw || !this.narrationTailLooksIncomplete(raw)) return raw;
    const quotePairs = { '“': '”', '「': '」', '『': '』', '"': '"' };
    const stack = [];
    for (let i = 0; i < raw.length; i += 1) {
      const ch = raw[i];
      if (ch === '”' && stack.at(-1)?.ch === '“') stack.pop();
      else if (ch === '」' && stack.at(-1)?.ch === '「') stack.pop();
      else if (ch === '』' && stack.at(-1)?.ch === '『') stack.pop();
      else if (ch === '"' && stack.at(-1)?.ch === '"') stack.pop();
      else if (quotePairs[ch]) stack.push({ ch, index: i });
    }
    const openQuoteIndex = stack.length ? stack[stack.length - 1].index : -1;
    const sentenceEndPattern = /[。！？!?]/gu;
    let lastEnd = -1;
    let match;
    while ((match = sentenceEndPattern.exec(raw))) {
      if (openQuoteIndex >= 0 && match.index > openQuoteIndex) continue;
      lastEnd = match.index + match[0].length;
      while (/[”」』）)]/u.test(raw[lastEnd] || '')) lastEnd += 1;
    }
    const cutIndex = Math.max(lastEnd, openQuoteIndex > 0 ? openQuoteIndex : -1);
    if (cutIndex <= 0) return raw;
    const trimmed = raw.slice(0, cutIndex).trim();
    return trimmed || raw;
  },

  async ensurePhasedNarrationLength(store, action, prompt, narration, logId) {
    return await this.ensureConfiguredNarrationLength(store, action, prompt, narration, logId, this.realConfig());
  },

  async ensureConfiguredNarrationLength(store, action, prompt, narration, logId, config = this.realConfig()) {
    const text = this.cleanPhasedNarration(narration);
    const trimmed = this.trimIncompleteNarrationTail(text);
    if (trimmed !== text) console.warn(`${config.label}正文疑似截断，已本地丢弃最后未完整句段。`, { beforeLength: text.length, afterLength: trimmed.length, tail: text.slice(-80) });
    return trimmed;
  },

  mergeNarrationContinuation(text = '', continuation = '') {
    const base = this.compactAiReturn(text);
    const next = this.cleanPhasedNarration(continuation);
    if (!next) return base;
    return (window.GameModules.jsonUtils?.mergeStreamText?.(base, next) || `${base}${next}`).trim();
  },

  async completeConfiguredNarrationContinuation(store, action, prompt, narration, logId, reason = {}, config = this.realConfig()) {
    const actionText = this.actionText(action, config.mode === 'story' ? '继续推进操控剧情' : '继续观察现实世界');
    const continuationPrompt = [
      '# 现实推演正文补全任务',
      reason.shortOutput
        ? `任务:只输出补全文本本身；从<正文尾部>最后一个字符之后继续，把本次行动范围内的环境、动作过程、可见反应、短期结果补写完整；禁止重复正文尾部；禁止输出任何任务说明、JSON、Markdown、标题；${this.compactReturnRule('prose')}结尾必须是。！？或右引号。`
        : `任务:只输出补全文本本身；从<正文尾部>最后一个字符之后继续；只补完当前截断句并自然收束；禁止重复正文尾部；禁止输出任何任务说明、JSON、Markdown、标题；${this.compactReturnRule('prose')}结尾必须是。！？或右引号。`,
      `本次行动:${actionText}`,
      this.continuityFallbackRule(),
      reason.shortOutput ? '边界:补足已经开始的本次行动直接过程，不开启下一步新行动，不转移地点，不扩展到未输入的新阶段；如果原动作因边界、consent、年龄、关系或安全限制不能继续描写，改写为角色察觉、制止、后退、质问、沉默、情绪变化、环境声响变化、双方距离变化、语言/沉默、身体姿态和即时落点。' : '边界:只补当前句或收束当前动作，不扩展新动作阶段，不为了字数追加新情节，不替玩家执行下一步。',
      `问题:汉字数=${reason.count || 0};最低目标=${reason.minChars || 0};正文过短=${reason.shortOutput ? '是' : '否'};句尾未完成=${reason.tailIncomplete ? '是' : '否'}`,
      `<正文尾部>${String(narration || '').slice(-1600)}</正文尾部>`,
      '现在仅输出正文后续suffix。',
    ].join('\n');
    const output = await window.GameModules.aiRequest.complete({
      source: `${config.mode}-agent-narration-continuation`,
      model: store.modelId,
      prompt: continuationPrompt,
      timeoutMs: 120000,
      requireDone: true,
      maxAttempts: 2,
      maxTokens: 900,
      outputLengthThreshold: 1200,
    });
    return this.cleanPhasedNarration(output);
  },

  async completeStep(store, prompt, logId, streamToUi = false) {
    return await this.completeConfiguredStep(store, prompt, logId, streamToUi, this.realConfig());
  },

  async completeConfiguredStep(store, prompt, logId, streamToUi = false, config = this.realConfig()) {
    const requestId = config.mode === 'story' ? window.GameModules.ai.latestRequestId : window.GameModules.realWorldAi.latestRequestId;
    const messages = Array.isArray(prompt) ? prompt : null;
    let buffer = '';
    let doneSeen = false;
    let lastPaint = 0;
    try {
      const requestOptions = {
        source: config.sourceTitle || (streamToUi ? `${config.mode}-agent-loop` : `${config.mode}-agent-context`),
        model: store.modelId,
        ...(messages ? { messages } : { prompt }),
        timeoutMs: 240000,
        requireDone: true,
        outputLengthThreshold: 2600,
        maxAttempts: 3,
        onChunk: async (chunk, done, info) => {
          const latest = config.mode === 'story' ? window.GameModules.ai.latestRequestId : window.GameModules.realWorldAi.latestRequestId;
          if (requestId !== latest) return;
          buffer = info.buffer;
          doneSeen = info.doneSeen;
          if (!streamToUi || !logId) return;
          const changed = config.mode === 'story' ? store.updateStoryAgentStream?.(logId, buffer) : store.updateRealWorldStream?.(logId, buffer);
          if (changed && performance.now() - lastPaint > 50) {
            lastPaint = performance.now();
            await new Promise((resolve) => (window.requestAnimationFrame || setTimeout)(resolve));
          }
        },
      };
      requestOptions.maxTokens = 3000;
      return await window.GameModules.aiRequest.complete(requestOptions);
    } catch (err) {
      console.warn(`${config.label} Loop Agent 请求未完成，拒绝使用未完成内容:`, { code: err.code, message: err.message, doneSeen, length: buffer.length, stack: err.stack });
      throw err;
    }
  },

  splitNameList(value = '') {
    return String(value || '').split(/[；;、,，|｜]/u).map((name) => name.trim()).filter((name) => name && name !== '无').slice(0, 12);
  },

  isUsefulQueryReason(value = '') {
    const text = String(value || '').trim();
    if (!text || text === '无') return false;
    return !/(?:无需|不需要|不用|已明确|无需进一步|无因果|无潜在冲突|无冲突|当前路线无|没有必要)/u.test(text);
  },

  splitQueryReasonList(value = '') {
    return String(value || '').split(/[；;|｜\n]/u).map((item) => item.trim()).filter((item) => this.isUsefulQueryReason(item)).slice(0, 12);
  },

  parseParticipantToken(value = '') {
    const text = String(value || '').trim();
    if (!text || text === '无') return null;
    const paren = text.match(/^(.+?)[（(]([^（）()]*)[）)]$/u);
    const dashed = text.match(/^(.+?)\s*(?:[-—－]|：|:)\s*(.+)$/u);
    const name = String((paren || dashed)?.[1] || text).trim().replace(/^\d+[.、]\s*/u, '').slice(0, 80);
    const reason = String((paren || dashed)?.[2] || '').trim().slice(0, 160);
    return name && name !== '无' ? { name, reason } : null;
  },

  normalizeParticipantList(value = [], defaultRole = 'mentioned') {
    const list = Array.isArray(value) ? value : this.splitNameList(value);
    return list.map((item) => {
      if (typeof item === 'string') {
        const parsed = this.parseParticipantToken(item);
        return parsed ? { type: 'character', idOrName: parsed.name, name: parsed.name, role: defaultRole, reason: parsed.reason || undefined } : null;
      }
      const parsed = this.parseParticipantToken(item?.name || item?.characterName || item?.idOrName || item?.id || '');
      const name = parsed?.name || '';
      return name ? { type: String(item?.type || 'character').slice(0, 20), id: item?.id, idOrName: item?.idOrName || name, name, role: String(item?.role || defaultRole).slice(0, 40), reason: item?.reason ? String(item.reason).slice(0, 160) : parsed.reason || undefined, canLoadRoleCard: item?.canLoadRoleCard === false ? false : undefined, canEnterNarration: item?.canEnterNarration === false ? false : undefined, canSettle: typeof item?.canSettle === 'boolean' ? item.canSettle : undefined } : null;
    }).filter(Boolean).slice(0, 12);
  },

  normalizeRandomActiveEvents(value = '', blockedNames = new Set()) {
    const parts = Array.isArray(value) ? value : String(value || '').split(/[；;\n]/u);
    const seen = new Set();
    return parts.map((raw) => {
      const text = typeof raw === 'string' ? raw.trim() : `${raw?.characterName || raw?.name || ''}｜${raw?.eventType || raw?.actionMethod || ''}｜${raw?.motivation || raw?.reason || ''}`;
      if (!text || text === '无') return null;
      const segs = text.split(/[｜|]/u).map((x) => x.trim()).filter(Boolean);
      const characterName = segs[0]?.replace(/[：:].*$/u, '').trim();
      return { characterName, eventType: segs[1] || 'background_only', motivation: segs[2] || text, actionMethod: segs[1] || '背景行动', impactTiming: 'background', canEnterCurrentScene: false, canSettleCurrentScene: false };
    }).filter((item) => {
      if (!item?.characterName || blockedNames.has(item.characterName) || seen.has(item.characterName)) return false;
      seen.add(item.characterName);
      return true;
    }).slice(0, 3);
  },

  participantNameSet(...groups) {
    const set = new Set();
    groups.flat().forEach((item) => { const name = String(item?.name || item?.characterName || item?.idOrName || item?.id || '').trim(); if (name) set.add(name); });
    return set;
  },

  guidedStepDataFromParsed(parsed = {}, raw = '') {
    const v = parsed.values || {};
    const forcedParticipants = this.normalizeParticipantList(v['强制出场'], 'forced');
    const priorityCandidates = this.normalizeParticipantList(v['高优先候选'], 'priority-candidate').map((item) => ({ ...item, canSettle: false }));
    const dramaCandidates = this.normalizeParticipantList(v['戏剧候选'], 'drama-candidate').map((item) => ({ ...item, canSettle: false }));
    const forbiddenParticipants = this.normalizeParticipantList(v['禁止出场'], 'forbidden').map((item) => ({ ...item, canLoadRoleCard: false, canEnterNarration: false, canSettle: false }));
    const blocked = this.participantNameSet(forcedParticipants, priorityCandidates, dramaCandidates, forbiddenParticipants);
    const status = String(v['资料状态'] || '').trim();
    const requestText = String(v['资料请求'] || '').trim();
    const sceneQueries = {
      location: this.splitQueryReasonList(v['地点查询理由'] || v['地点查询']),
      causality: this.splitQueryReasonList(v['因果查询理由'] || v['因果查询']),
      conflict: this.splitQueryReasonList(v['冲突查询理由'] || v['冲突查询']),
    };
    const hasActionableRequests = Array.isArray(parsed.materialRequests) && parsed.materialRequests.length > 0;
    const hasRoleCardCandidates = forcedParticipants.length > 0 || priorityCandidates.length > 0 || dramaCandidates.length > 0;
    const hasSceneQueryReasons = Object.values(sceneQueries).some((items) => items.length > 0);
    const hasDeclaredRequests = Boolean(requestText && requestText !== '无' && !/^无(?:\s*\/\s*0)?$/u.test(requestText));
    if (status === '继续请求资料' && hasDeclaredRequests && !hasActionableRequests && !hasRoleCardCandidates && !hasSceneQueryReasons) {
      const err = new Error('解析错误请重试');
      err.parseResult = parsed;
      err.skipMerge = true;
      throw err;
    }
    const isContextDone = status === '资料已足够' || (!hasRoleCardCandidates && !hasActionableRequests && !hasSceneQueryReasons && (!requestText || requestText === '无'));
    return {
      type: isContextDone ? 'context_done' : 'request_context',
      guidanceText: String(raw || '').trim(),
      reason: v['查询规划'] || '',
      requests: parsed.materialRequests || [],
      needed: [],
      characters: [],
      participants: forcedParticipants,
      forcedParticipants,
      priorityCandidates,
      dramaCandidates,
      forbiddenParticipants,
      randomActiveEvents: this.normalizeRandomActiveEvents(v['随机事件候选'], blocked),
      sceneQueries,
      sceneQueriesAreReasons: true,
      randomIntrusionCondition: v['随机事件闯入条件'] || '无明确条件则禁止闯入',
      parseScore: { score: parsed.score, maxScore: parsed.maxScore, successRate: parsed.successRate },
      parseDegraded: parsed.successRate < 1,
      droppedMaterialRequests: parsed.droppedMaterialRequests || [],
      mergeConflicts: parsed.mergeConflicts || [],
      missingContext: status === '继续请求资料' && (hasActionableRequests || hasRoleCardCandidates),
    };
  },

  parseGuidedStepJson(raw, config = this.realConfig()) {
    const data = this.parseCompactSettlementJson(raw);
    if (!data || Array.isArray(data) || typeof data !== 'object') return null;
    const sceneQueries = data.sceneQueries && typeof data.sceneQueries === 'object' ? data.sceneQueries : {};
    const participants = data.participants && typeof data.participants === 'object' ? data.participants : {};
    const arrayText = (value, sep = '；') => (Array.isArray(value) ? value : this.splitQueryReasonList(value)).map((item) => String(item || '').trim()).filter(Boolean).join(sep) || '无';
    const nameText = (value) => (Array.isArray(value) ? value : this.splitNameList(value)).map((item) => typeof item === 'string' ? item : (item?.name || item?.characterName || item?.idOrName || item?.id || '')).map((item) => String(item || '').trim()).filter(Boolean).join('、') || '无';
    const requestRows = (Array.isArray(data.materialRequests) ? data.materialRequests : []).map((item, index) => {
      const body = typeof item === 'string'
        ? item
        : [item?.type || item?.skill || item?.kind, item?.method, item?.name || item?.target || item?.keyword, item?.world || item?.scope].filter(Boolean).join('，');
      return `资料请求${index + 1}：${String(body || '').trim()}`;
    }).filter((line) => !/^资料请求\d+[：:]\s*$/u.test(line)).slice(0, 3);
    const materialRequestErrors = [];
    const droppedMaterialRequests = [];
    const materialRequests = requestRows.map((line) => {
      const placeholderReason = this.materialRequestPlaceholderReason(line);
      const req = this.fallbackChineseMaterialRequest(line, { config });
      if (!req) {
        droppedMaterialRequests.push(line);
        if (placeholderReason) materialRequestErrors.push(placeholderReason);
      }
      return req;
    }).filter(Boolean);
    const values = {
      '查询规划': String(data.plan || data['查询规划'] || 'JSON资料路由').trim(),
      '资料状态': String(data.status || data['资料状态'] || '').trim(),
      '地点查询理由': arrayText(sceneQueries.location ?? data.locationReasons ?? data['地点查询理由']),
      '因果查询理由': arrayText(sceneQueries.causality ?? data.causalityReasons ?? data['因果查询理由']),
      '冲突查询理由': arrayText(sceneQueries.conflict ?? data.conflictReasons ?? data['冲突查询理由']),
      '强制出场': nameText(participants.forced ?? data.forcedParticipants ?? data['强制出场']),
      '高优先候选': nameText(participants.priority ?? data.priorityCandidates ?? data['高优先候选']),
      '戏剧候选': nameText(participants.drama ?? data.dramaCandidates ?? data['戏剧候选']),
      '禁止出场': nameText(participants.forbidden ?? data.forbiddenParticipants ?? data['禁止出场']),
      '随机事件候选': arrayText(data.randomEvents ?? data.randomActiveEvents ?? data['随机事件候选']),
      '随机事件闯入条件': String(data.randomIntrusionCondition || data['随机事件闯入条件'] || '无明确条件则禁止闯入').trim(),
      '资料请求': requestRows.length ? `${requestRows.length}条` : '无',
      '资料请求结束': '是',
    };
    if (!values['资料状态']) {
      const hasQueryReason = ['地点查询理由', '因果查询理由', '冲突查询理由'].some((key) => this.isUsefulQueryReason(values[key]));
      const hasParticipants = ['强制出场', '高优先候选', '戏剧候选'].some((key) => String(values[key] || '').trim() && values[key] !== '无');
      values['资料状态'] = requestRows.length || hasQueryReason || hasParticipants ? '继续请求资料' : '资料已足够';
    }
    const keyHits = Object.keys(values).filter((key) => String(values[key] || '').trim());
    const scored = this.scoreChineseKvParse(values, this.guidedStepFields(), requestRows, materialRequests);
    const parsed = { values, lines: requestRows, missing: this.guidedStepFields().filter((key) => !keyHits.includes(key)), score: scored.score, maxScore: scored.maxScore, successRate: scored.successRate, keyHits, criticalHits: scored.criticalHits, parseDegraded: scored.successRate < 1, droppedMaterialRequests, materialRequestErrors, materialRequests };
    if (materialRequestErrors.length) {
      const err = new Error(materialRequestErrors[0]);
      err.parseResult = parsed;
      throw err;
    }
    return this.guidedStepDataFromParsed(parsed, JSON.stringify(data));
  },

  normalizeGuidedStepText(raw = '') {
    const text = String(raw || '').replace(this.invisibleCharsPattern(), '').replace(/```(?:text|markdown|json)?|```/giu, '').trim();
    if (!text) return '';
    const fields = this.guidedStepFields();
    const allowed = fields.slice();
    const values = {};
    const lines = text.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
    lines.forEach((line) => {
      const parsed = this.splitKvLine(line);
      const key = parsed ? this.normalizeKvKey(parsed.key, allowed) : '';
      if (key && !Object.prototype.hasOwnProperty.call(values, key)) values[key] = parsed.value;
    });
    const hasGuidedField = fields.some((key) => Object.prototype.hasOwnProperty.call(values, key)) || lines.some((line) => /^资料请求\d+[：:]/u.test(line));
    if (!hasGuidedField) return text;
    const out = lines.slice();
    const addIfMissing = (key, value) => {
      if (!Object.prototype.hasOwnProperty.call(values, key)) {
        values[key] = value;
        out.push(`${key}：${value}`);
      }
    };
    const isNone = (value) => !String(value || '').trim() || String(value || '').trim() === '无';
    const numberedRequests = lines.filter((line) => /^资料请求\d+[：:]/u.test(line));
    const hasExplicitRequestField = Object.prototype.hasOwnProperty.call(values, '资料请求') || numberedRequests.length > 0;
    const requestText = String(values['资料请求'] || '').trim();
    const hasQueryReason = ['地点查询理由', '因果查询理由', '冲突查询理由'].some((key) => this.isUsefulQueryReason(values[key]));
    if (!hasExplicitRequestField) return out.join('\n');
    addIfMissing('查询规划', requestText === '无' && !hasQueryReason ? '资料已足够，进入正文推演' : '补齐资料路由字段');
    if (!Object.prototype.hasOwnProperty.call(values, '资料状态')) {
      const shouldContinue = numberedRequests.length > 0 || hasQueryReason || (requestText && requestText !== '无' && !/^无(?:\s*\/\s*0)?$/u.test(requestText));
      addIfMissing('资料状态', shouldContinue ? '继续请求资料' : '资料已足够');
    }
    ['地点查询理由', '因果查询理由', '冲突查询理由', '强制出场', '高优先候选', '戏剧候选', '禁止出场', '随机事件候选'].forEach((key) => addIfMissing(key, '无'));
    addIfMissing('随机事件闯入条件', '无明确条件则禁止闯入');
    if (!Object.prototype.hasOwnProperty.call(values, '资料请求')) addIfMissing('资料请求', `${numberedRequests.length}条`);
    addIfMissing('资料请求结束', '是');
    return out.join('\n');
  },

  parseGuidedStepKv(raw, config = this.realConfig(), options = {}) {
    const normalized = options.normalized ? String(raw || '').trim() : this.normalizeGuidedStepText(raw);
    const parsed = this.parseChineseKvBlock(normalized, this.guidedStepFields(), { parseMaterialRequests: true, config });
    if (parsed.materialRequestErrors?.length || parsed.successRate < 0.8) {
      const detail = parsed.materialRequestErrors?.[0] || '解析错误请重试';
      const err = new Error(detail);
      err.parseResult = parsed;
      throw err;
    }
    return this.guidedStepDataFromParsed(parsed, normalized);
  },

  parseStep(raw, config = this.realConfig()) {
    const jsonData = this.parseGuidedStepJson(raw, config);
    if (jsonData) return jsonData;
    const text = this.normalizeGuidedStepText(raw);
    if (!/查询规划[：:]|资料状态[：:]/u.test(text)) {
      throw new Error(`${config.label}返回缺少 Stage1 JSON 或中文 K:V 查询规划字段`);
    }
    return this.parseGuidedStepKv(text, config, { normalized: true });
  },

  isGuidedStepSemanticSelfCheckError(err) {
    return String(err?.message || '').includes('资料状态为继续请求资料时，必须输出可执行的资料请求1、结构化查询或明确参与者候选');
  },

  isRetryableParseError(err) {
    return this.isGuidedStepSemanticSelfCheckError(err) || ['截断', '分隔符后缺少 JSON', '缺少正文', 'JSON missing', '解析错误请重试'].some((text) => String(err?.message || '').includes(text));
  },
  traceItem(step, data, raw, ctx = window.GameModules.realWorldAgentContext) {
    const limiter = typeof ctx?.limit === 'function' ? ctx.limit.bind(ctx) : (text, max = 1200) => String(text || '').slice(0, max);
    return {
      step,
      type: data?.type || 'parse_failed',
      thinking: data?.thinking || '',
      reason: data?.reason || '',
      characters: data?.characters || [],
      participants: data?.participants || [],
      forcedParticipants: data?.forcedParticipants || [],
      priorityCandidates: data?.priorityCandidates || [],
      dramaCandidates: data?.dramaCandidates || [],
      forbiddenParticipants: data?.forbiddenParticipants || [],
      randomActiveEvents: data?.randomActiveEvents || [],
      sceneQueries: data?.sceneQueries || { location: [], causality: [], conflict: [] },
      sceneQueriesAreReasons: data?.sceneQueriesAreReasons ?? false,
      randomIntrusionCondition: data?.randomIntrusionCondition || '',
      parseScore: data?.parseScore || null,
      parseDegraded: data?.parseDegraded ?? false,
      droppedMaterialRequests: data?.droppedMaterialRequests || [],
      requests: data?.requests || [],
      needed: data?.needed || [],
      missingContext: data?.missingContext ?? false,
      raw: limiter(raw, 1200),
      loaded: [],
    };
  },
  stepText(step, config = this.realConfig()) {
    return step === 1 ? `${config.label}正在识别相关角色与资料需求…（${step}/${this.maxSteps}）` : `${config.label}正在推演…（${step}/${this.maxSteps}）`;
  },
  updateAgentTrace(store, logId, trace = []) {
    this.updateConfiguredTrace(store, logId, trace, this.realConfig());
  },
  updateConfiguredTrace(store, logId, trace = [], config = this.realConfig()) {
    if (!logId) return;
    if (config.mode === 'story') {
      store.updateNovelEntry?.(logId, { agentTrace: trace.slice(), streaming: true });
      return;
    }
    store.patchRealWorldLogEntry?.(logId, { agentTrace: trace.slice(), streaming: true });
  },
  showFinalNarration(store, logId, narration) {
    this.showConfiguredNarration(store, logId, narration, this.realConfig());
  },
  showConfiguredNarration(store, logId, narration, config = this.realConfig()) {
    if (!logId || !narration) return;
    if (config.mode === 'story') {
      store.updateNovelEntry?.(logId, { storyText: narration, streaming: true, streamTrace: [] });
      return;
    }
    store.patchRealWorldLogEntry?.(logId, { narration, streaming: true, streamTrace: [] });
    store.scrollRealWorldLogBottom?.();
  },
  markStep(store, logId, text, options = {}) {
    this.markConfiguredStep(store, logId, text, this.realConfig(), options);
  },
  markConfiguredStep(store, logId, text, config = this.realConfig(), options = {}) {
    if (!logId) return;
    if (config.mode === 'story') {
      const entry = (store.log || []).find((item) => item.id === logId);
      const patch = { streaming: true, statusText: text };
      if (!options.keepNarration && this.shouldUseStatusAsStoryText(entry)) patch.storyText = text;
      store.updateNovelEntry?.(logId, patch);
      return;
    }
    const entry = (store.realWorldLog || []).find((item) => item.id === logId) || window.GameModules.sqliteSave.getRealWorldLogEntry?.(logId) || {};
    const patch = { streaming: true, statusText: text };
    if (!options.keepNarration && this.shouldUseStatusAsRealNarration(entry)) patch.narration = text;
    store.patchRealWorldLogEntry?.(logId, patch);
    store.scrollRealWorldLogBottom?.();
  },

  shouldUseStatusAsStoryText(entry = {}) {
    const text = String(entry?.storyText || '').trim();
    return !text || /^作者正在续写这一段剧情|操控剧情正在识别|操控剧情正在推演|已识别相关角色|已追加资料/u.test(text);
  },

  shouldUseStatusAsRealNarration(entry = {}) {
    const text = String(entry?.narration || '').trim();
    return !text || /^现实世界正在推演|现实正在识别|现实正在推演|已识别相关角色|已追加资料/u.test(text);
  },
  loadedContextText(data = {}, loaded = [], step = 1, config = this.realConfig()) {
    const fallback = config.mode === 'story' ? '被操控角色' : '玩家本人';
    const chars = (data.characters || []).map((item) => item.name || item.id || item).filter(Boolean).join('、') || fallback;
    const titles = loaded.map((item) => item.title).join('、') || '角色记忆';
    return `${step === 1 ? '已识别相关角色' : '已追加资料'}：${chars}；已载入${titles}${data.reason ? `：${data.reason}` : ''}`;
  },
};
