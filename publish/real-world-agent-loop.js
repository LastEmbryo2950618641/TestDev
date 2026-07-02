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
    this.markConfiguredStep(store, logId, `${config.label}场景锚定完成，正在生成正文…`, config);
    const narrationRaw = await this.completeConfiguredStep(store, narrationPrompt, logId, true, config);
    const narration = await this.ensureConfiguredNarrationLength(store, action, narrationPrompt, this.cleanPhasedNarration(narrationRaw), logId, config);
    if (!narration) throw new Error(`${config.label}正文为空`);
    this.showConfiguredNarration(store, logId, narration, config);

    let settlementPrompt = 'Stage4 中文 K:V 滑动结算', settlementRaw = '', updates = {};
    try {
      const participants = this.mergeNarrationParticipants(this.stageParticipants(effectiveSceneLayers, loaded, store), narration, store);
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
      const anchorRequests = ctx.sceneAnchorRequests?.(data, store, { mode: data.mode }) || [];
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
      return window.GameModules.promptTemplates.render(config.firstTemplateId || 'inference-stage1-guided-query', {
        ...commonVars,
        路由上下文: stage1RoutingContext,
        上一轮查询规划摘要: this.previousGuidanceSummary(guidance),
        已加载资料摘要: config.ctx.loadedRoutingSummary?.(loaded) || '无',
        可请求资料目录: config.ctx.stage1MaterialCatalogText?.(config.mode) || '无',
      });
    }
    return window.GameModules.promptTemplates.render(config.templateId, {
      ...commonVars,
      基础上下文: base,
      动态载入资料: [loadedText, materialText].filter(Boolean).join('\n\n'),
      动态Skills: skills,
    });
  },

  guidedMaxSteps(store = {}, config = this.realConfig()) {
    if (config.mode !== 'story') return 3;
    const text = [store.character?.work, store.selectedWork, store.quest, store.sceneTitle, store.log?.slice?.(-3)?.map?.((entry) => `${entry.playerText || ''}${entry.storyText || ''}`).join(' ')].filter(Boolean).join(' ');
    return /(战争|阴谋|多线|群像|复杂|决战|圣杯|政治|势力|迷宫|案件|推理|时间线|世界线|剧情线)/u.test(text) ? 4 : 3;
  },

  storyFreedomRule(store) {
    return store.online ? '操控剧情自由度：玩家输入是本回合对被操控者身体或行动方向的控制；正文只能推进到本次行动自然抵达的结果点，不替玩家完成后续长期行动。' : '离线剧情自由度：玩家输入是建议或态度；角色按性格、记忆、处境自主行动。';
  },

  stepOutputRule(step, forceFinal = false) {
    if (forceFinal) return `当前为收敛步骤：禁止继续请求资料。只输出中文 K:V 查询规划字段；资料状态必须为“资料已足够”，资料请求写“无”，资料请求结束写“是”。不要输出 JSON、正文、旁白、Markdown、代码块和 final JSON。`;
    if (step === 1) return `当前是第1步：你是上下文路由器，只判断为了准确生成本次行动范围内正文需要载入哪些已有资料。具体输出格式以 Stage1 中文 K:V 查询规划模板为准；不要写正文，不要结算状态，不要推演后续结果。`;
    if (step >= 3) return `当前是软收敛步骤：继续使用 Stage1 中文 K:V 查询规划格式；只有缺失资料会直接改变本次行动结果、人物反应、地点/物品/旧事实判定时，资料状态才写“继续请求资料”；衣着细节、氛围、情绪微调、背景补全、重复确认、无效 skill 替代查询都必须写“资料已足够”。不要输出 JSON、正文、旁白、Markdown、代码块和 final JSON。`;
    return `当前只负责判断是否继续收集资料：继续使用 Stage1 中文 K:V 查询规划格式。仍缺关键资料就写“资料状态：继续请求资料”并列出中文资料请求；资料足够或无法继续获取时写“资料状态：资料已足够”“资料请求：无”“资料请求结束：是”。不要输出 JSON、正文、旁白、Markdown、代码块和 final JSON。`;
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
    const query = (key) => [...new Set(Array.isArray(guidance.sceneQueries?.[key]) ? guidance.sceneQueries[key] : [])].join('；') || '无';
    return [
      `资料状态：${guidance.type === 'context_done' ? '资料已足够' : '继续请求资料'}`,
      `地点查询：${query('location')}`,
      `因果查询：${query('causality')}`,
      `冲突查询：${query('conflict')}`,
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
    const query = (key) => [...new Set(Array.isArray(layers.sceneQueries?.[key]) ? layers.sceneQueries[key] : [])].join('；') || '无';
    return [`强制出场：${names(layers.forcedParticipants, '出场理由')}`, `高优先候选：${names(layers.priorityCandidates, '出场或不出场理由')}`, `戏剧候选：${names(layers.dramaCandidates, '出场或不出场理由')}`, `禁止出场：${names(layers.forbiddenParticipants, '不出场理由')}`, `地点查询：${query('location')}`, `因果查询：${query('causality')}`, `冲突查询：${query('conflict')}`, `随机主动事件：${random}`, `随机事件闯入条件：${layers.randomIntrusionCondition || '无明确条件则禁止闯入'}`].join('\n');
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

  async buildConfiguredNarrationPrompt({ store, action, base, loaded, skills, materialSession = null, sceneAnchorReport = '', config = this.realConfig() }) {
    const actionText = this.actionText(action, config.mode === 'story' ? '继续推进操控剧情' : '继续观察现实世界');
    const narrationContext = config.ctx.buildNarrationContext?.({ store, action: actionText, config }) || this.compactUpdatePromptText(base, 1600);
    const loadedText = config.ctx.loadedNarrationSummary?.(loaded) || config.ctx.buildLoadedText(loaded) || '无';
    const writingStyle = store.selectedWritingStylePrompt?.() || store.writingStylePrompt?.() || '正文采用小说文风，重视画面、动作、感官和心理反应，避免复述玩家指令。';
    const modeRule = config.mode === 'story'
      ? `推演自由度：${this.storyFreedomRule(store)}\n玩家不是角色本人，而是操控/影响被操控者行动的存在；正文必须写出本次行动的动作过程、环境变化、其他人物反应、被操控者身体与心理张力、直接结果。`
      : `推演自由度：${store.realWorldFreedomRule?.() || '只推演玩家本次输入行动自然抵达的直接结果。'}${store.sharedControlState?.() ? '\n同世界附身控制规则：玩家意识附身接管被控角色身体，同时玩家现实本体仍由同一个意识维持控制；正文以第二人称“你”的附身镜头为主，不要让同一角色在两个地点同时出现。' : ''}`;
    const narrationRules = '行动范围内充分推演：写出本次行动的动作过程、身体感受、周围环境变化、可见细节、他人反应、对话回应和直接短期连锁影响；场景锚定报告中的强制出场必须在正文中实际出现、行动或回应；不替玩家执行下一步新行动；不把亲吻、抚摸、摩擦、按住等行为自动扩展为脱衣、转移地点、插入、高潮等未输入的新阶段。';
    return window.GameModules.promptTemplates.render('inference-stage3-narration', {
      模式标签: config.label,
      本次行动: actionText,
      基础上下文: [this.continuityFallbackRule(), `小说笔风：${writingStyle}`, modeRule, narrationRules, narrationContext].join('\n'),
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

  mergeNarrationParticipants(participants = [], narration = '', store = null) {
    const out = Array.isArray(participants) ? participants.slice() : [];
    const seen = new Set(out.map((p) => `${p?.type || ''}:${p?.id || p?.idOrName || p?.name || ''}`));
    const text = String(narration || '');
    Object.values(store?.rpgStates || {}).forEach((state) => {
      const name = String(state?.profile?.name || state?.name || '').trim();
      if (!name || !text.includes(name)) return;
      const p = this.characterParticipant({ id: state.id, name }, store);
      const key = `${p?.type || ''}:${p?.id || p?.idOrName || p?.name || ''}`;
      if (p && !seen.has(key) && this.settlementEligibleParticipant({ ...p, canSettle: true })) {
        seen.add(key);
        out.push({ ...p, role: 'narration-mentioned', canSettle: true });
      }
    });
    return out.slice(0, 12);
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

  settlementTypeContracts() {
    return {
      '基础结算': { title: '基础结算', format: '经过时间：秒数\n当前状态：状态文本\n当前目标：目标文本\n场景标题：标题\n地点名称：地点全称\n备选行动1：行动文本\n备选行动2：行动文本\n备选行动3：行动文本\n备选行动4：行动文本' },
      '情绪': { title: '情绪结算', format: '更新N：情绪，情绪名，+/-数值，变化原因' },
      '感觉': { title: '感觉结算', format: '更新N：感觉，感觉名，+/-数值，变化原因' },
      '生命体征': { title: '生命体征结算', format: '更新N：生命体征，字段名，+/-数值，变化原因' },
      '身体状态': { title: '身体状态结算', format: '更新N：身体状态，部位或状态键，新状态，变化原因' },
      '穿着状态': { title: '穿着状态结算', format: '更新N：穿着状态，穿着部位，衣物名称，当前状态，变化原因' },
      '性经历': { title: '性经历结算', format: '更新N：性经历，分类，+/-数值，变化原因' },
      '性历史': { title: '性历史结算', format: '更新N：性历史，状态转移，性对象，原因与证据' },
      '关系': { title: '关系结算', format: '更新N：关系，甲方(称谓)，乙方(称谓)，维度，当前状态，变化原因，根据性格造成结果' },
      '角色卡': { title: '角色卡结算', format: '更新N：角色卡，字段，替换/增加，新值，原因，根据性格造成结果' },
      '物品': { title: '物品结算', format: '更新N：物品，物品类型，物品名，事实或变化，变化原因' },
      '地图': { title: '地图结算', format: '更新N：地图，当前位置/上级地点/地点事实/地图节点/路线事实，事实，原因' },
      '人事安排': { title: '人事安排结算', format: '更新N：人事安排，当前地点/当前行动/可用状态，新值，变化原因' },
      '势力总览': { title: '势力总览结算', format: '更新N：势力总览，新增势力/上层势力归属/势力APP归属，事实，原因' },
      '势力结构': { title: '势力结构结算', format: '更新N：势力结构，部门角色/职位/成员地位，事实，原因' },
      '系统记录': { title: '系统记录结算', format: '更新N：系统记录，事件/记录/通信消息/剧情记录/状态，事实，原因' },
      '通用固化': { title: '通用固化结算', format: '更新N：通用固化，字段，稳定事实，变化原因' },
      '操控体验': { title: '操控体验结算', format: '更新N：操控感觉/适应度，字段，+/-数值或新值，变化原因' },
    };
  },

  settlementUpdateCatalog() {
    return {
      '情绪': { updateType: 'emotion', fieldPrefix: 'metrics.emotions' },
      '感觉': { updateType: 'feeling', fieldPrefix: 'metrics.playerFeelings' },
      '生命体征': { updateType: 'vital', fieldMap: { '精力': 'vitals.stamina_pool', '饱食度': 'vitals.satiety', '水分': 'vitals.hydration', '疲劳': 'vitals.fatigue', '精神稳定': 'vitals.mental_stability' } },
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

  parseStandardSettlementLine(typeName = '', line = '', subject = null) {
    const parts = String(line || '').replace(/^更新(?:\d+|N)\s*[：:]/u, '').split(/[，,]/u).map((x) => x.trim());
    const [label, key, rawValue, reason] = parts;
    const entry = this.settlementUpdateCatalog()[label || typeName];
    if (!subject || !key || !rawValue || !reason) return null;
    if (!entry) return this.parseGenericSettlementLine(typeName, line, subject, { requireExplicitGeneric: true });
    const delta = Number(String(rawValue).replace(/[^-+\d.]/gu, ''));
    const field = entry.fieldMap?.[key] || `${entry.fieldPrefix}.${key}`;
    const change = Number.isFinite(delta) && /^[+-]?\d/u.test(String(rawValue)) ? { mode: 'delta', value: delta } : { mode: 'set', value: rawValue };
    return { updateType: entry.updateType, subject, field, change, reasons: [{ trigger: label || typeName, evidence: reason, confidence: 'confirmed' }] };
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

  wearingSlotAlias(part = '', itemName = '') {
    const item = String(itemName || '').trim();
    if (/腿圈|项圈|手环|脚环|戒指|耳环|饰品/u.test(item)) return '饰品';
    return this.settlementAlias(part, { 胸部: 'bra', 胸口: 'bra', 乳房: 'bra', 上身: 'top', 外套: 'outerwear', 下身: 'bottom', 腿部: 'legwear', 大腿: 'legwear', 足部: 'shoes', 脚部: 'shoes', 内裤: 'panties' });
  },

  bodyPartAlias(part = '') {
    return this.settlementAlias(part, { 整体: 'overall', 全身: 'overall', 口部: 'mouth', 嘴唇: 'mouth', 嘴部: 'mouth', 胸部: 'chest', 胸口: 'chest', 乳房: 'chest', 阴部: 'genital', 私处: 'genital', 肛部: 'anus', 臀部: 'hips', 屁股: 'hips', 四肢: 'limbs', 手臂: 'limbs', 腿部: 'limbs', 皮肤: 'skin' });
  },

  bodyPartName(part = '', key = '') {
    const names = { overall: '整体', mouth: '口部', chest: '胸部', genital: '阴部', anus: '肛部', hips: '臀部', limbs: '四肢', skin: '皮肤' };
    return names[key] || String(part || '').trim();
  },

  sexualPartAlias(part = '') {
    return this.settlementAlias(part, { 总次数: 'total', 总数: 'total', 全部: 'total', 阴部: 'genital', 胸部: 'chest', 胸口: 'chest', 乳房: 'chest', 唇部: 'lips', 接吻: 'lips', 口部: 'mouth', 嘴部: 'mouth', 腿部: 'legs', 大腿: 'legs', 臀部: 'hips', 屁股: 'hips', 手部: 'hands', 手: 'hands', 皮肤: 'skin' });
  },

  parseWearingSettlementLine(line = '', subject = null) {
    const parts = String(line || '').replace(/^更新(?:\d+|N)\s*[：:]/u, '').split(/[，,]/u).map((x) => x.trim());
    const [label, part, itemName, state, reason] = parts;
    if (label !== '穿着状态' || !subject || !part || !itemName || !state || !reason) return null;
    return { updateType: 'wearing-state', subject, field: 'values.wearing', change: { mode: 'upsert', value: { slot: this.wearingSlotAlias(part, itemName), part, name: itemName, state, reason } }, reasons: [{ trigger: '穿着状态', evidence: reason, confidence: 'confirmed' }] };
  },

  parseBodyStatusSettlementLine(line = '', subject = null) {
    const parts = String(line || '').replace(/^更新(?:\d+|N)\s*[：:]/u, '').split(/[，,]/u).map((x) => x.trim());
    const [label, part, status, reason] = parts;
    if (label !== '身体状态' || !subject || !part || !status || !reason) return null;
    const partKey = this.bodyPartAlias(part);
    return { updateType: 'body-status', subject, field: `bodyStatus.${partKey}`, change: { mode: 'merge', value: { partKey, part: this.bodyPartName(part, partKey), status, description: status, reason } }, reasons: [{ trigger: '身体状态', evidence: reason, confidence: 'confirmed' }] };
  },

  parseSexualExperienceSettlementLine(line = '', subject = null) {
    const parts = String(line || '').replace(/^更新(?:\d+|N)\s*[：:]/u, '').split(/[，,]/u).map((x) => x.trim());
    const [label, part, rawValue, reason] = parts;
    if (label !== '性经历' || !subject || !part || !rawValue || !reason) return null;
    const delta = Number(String(rawValue).replace(/[^-+\d.]/gu, ''));
    if (!Number.isFinite(delta)) return null;
    const key = this.sexualPartAlias(part);
    const value = key === 'total' ? { totalDelta: delta, parts: {} } : { totalDelta: 0, parts: { [key]: delta } };
    return { updateType: 'sexual-experience', subject, field: key === 'total' ? 'intimacy.sexualExperienceCount' : `intimacy.sexualExperienceParts.${key}`, change: { mode: 'delta', value }, reasons: [{ trigger: '性经历', evidence: reason, confidence: 'confirmed' }] };
  },

  parseScheduleSettlementLine(line = '', subject = null) {
    // 合同边界：明确通信/移动/约定涉及的人必须先由上游加入 participants；非 participants 仍会被结算对象 gate 拒绝。
    const parts = String(line || '').replace(/^更新(?:\d+|N)\s*[：:]/u, '').split(/[，,]/u).map((x) => x.trim());
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

  parseSpecialSettlementLine(typeName = '', line = '', subject = null) {
    const parts = String(line || '').replace(/^更新(?:\d+|N)\s*[：:]/u, '').split(/[，,]/u).map((x) => x.trim());
    if (!subject || parts[0] !== typeName) return this.parseGenericSettlementLine(typeName, line, subject, { requireExplicitGeneric: true });
    if (typeName === '性历史') {
      const [, transition, partner, evidence] = parts;
      if (!transition || !partner || !evidence) return null;
      return { updateType: 'sexual-history', subject, field: 'intimacy.sexualHistory', change: { mode: 'merge', value: { transition, partner: { type: 'character', id: partner, name: partner }, evidence, historyText: [transition, partner, evidence].join('，') } }, reasons: [{ trigger: '性历史状态转移', evidence, confidence: 'confirmed' }] };
    }
    if (typeName === '关系') {
      const [, left, right, dimension, status, reason, result] = parts;
      if (!left || !right || !dimension || !status || !reason || !result) return null;
      return { updateType: 'relationship', subject, field: `relationships.${dimension}`, change: { mode: 'upsert', value: { left, right, dimension, status, reason, result } }, reasons: [{ trigger: '关系变化', evidence: reason, confidence: 'confirmed' }] };
    }
    if (typeName === '角色卡') {
      const [, field, op, value, reason, result] = parts;
      if (!field || !op || !value || !['替换', '增加'].includes(op)) return null;
      return { updateType: 'role-card', subject, field: field === '当前状态' ? 'status_tags' : `profile.${field}`, change: { mode: op === '替换' ? 'set' : 'append', value: { value, reason, result } }, reasons: [{ trigger: `角色卡${op}`, evidence: reason || value, confidence: 'confirmed' }] };
    }
    return null;
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
        if (/^更新(?:\d+|N)[：:]/u.test(line)) {
          patch.__updateLines += 1;
          const specialParsers = {
            '人事安排': () => this.parseScheduleSettlementLine(line, currentSubject),
            '穿着状态': () => this.parseWearingSettlementLine(line, currentSubject),
            '身体状态': () => this.parseBodyStatusSettlementLine(line, currentSubject),
            '性经历': () => this.parseSexualExperienceSettlementLine(line, currentSubject),
          };
          const update = specialParsers[type]
            ? specialParsers[type]()
            : (['性历史', '关系', '角色卡'].includes(type) ? this.parseSpecialSettlementLine(type, line, currentSubject) : this.parseStandardSettlementLine(type, line, currentSubject));
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
      const hasSafeBlockEnd = Boolean(patch?.__closedByBrace || patch?.__settlementDone || patch?.__closedByNextHeading);
      return Boolean(patch?.__typeDone && hasSafeBlockEnd && hasParsedAllUpdates && hasRequiredBaseFields);
    };
    const patchScore = (type, patch) => {
      const malformedUpdates = Math.max(0, (patch?.__updateLines || 0) - (patch?.__parsedUpdates || 0));
      return (patchIsComplete(type, patch) ? 10000 : 0)
        + (patch?.__typeDone ? 200 : 0)
        + (patch?.__settlementDone ? 200 : 0)
        + ((patch?.__parsedUpdates || 0) * 100)
        + (Object.keys(patch?.baseFields || {}).length * 20)
        + ((!patch?.__updateLines || patch.__parsedUpdates === patch.__updateLines) ? 50 : 0)
        - (malformedUpdates * 200);
    };
    requestedTypes.forEach((type) => {
      const blocks = blocksByType[type] || [];
      const candidates = blocks.map((block) => parseBlock(type, block, blocks.length));
      const patch = candidates.sort((a, b) => patchScore(type, b) - patchScore(type, a))[0];
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
      '人事安排': '只更新本回合 participants 中的参与者；明确通信/移动/约定涉及的人必须先由上游加入 participants 后才可结算；只记录当前地点、当前行动、可用状态；不得全角色批量刷新；弱推测不更新。',
    };
    return [
      `${c.title}规则：`,
      rules[type] || '只有本轮稳定事实明确支持时才更新；弱氛围、猜测或未确认变化不更新。',
      `格式：${c.format}`,
    ].join('\n');
  },

  settlementMetricBaselineText(store = {}, participants = []) {
    const rows = (Array.isArray(participants) ? participants : []).map((participant) => {
      const state = participant?.type === 'player'
        ? store?.playerIdentityState?.()
        : (store?.itemSkillState?.(participant.id) || store?.itemSkillState?.(participant.idOrName) || store?.rpgStates?.[participant.id]);
      const metrics = state?.metrics || (state ? store?.ensureStateMetrics?.(state) : null) || {};
      const label = participant?.name || state?.profile?.name || participant?.id || '';
      const format = (group = {}) => Object.entries(group || {}).filter(([, value]) => value !== undefined && value !== null && value !== '').map(([key, value]) => `${key}=${value}`).join('、') || '无';
      if (!label) return '';
      return `${label}：情绪：${format(metrics.emotions)}\n${label}：对玩家感觉：${format(metrics.playerFeelings)}`;
    }).filter(Boolean).join('\n') || '无';
    return [`当前情绪基线：`, rows, `对玩家感觉基线：`, rows, '边界：情绪是角色当前内在情绪；感觉只表示该角色对玩家的感觉，不是泛化身体感觉、氛围感觉或普通心情。'].join('\n');
  },

  buildSettlementTypeWindowPrompt({ requestedTypes = [], completedTypes = [], incompleteTypes = [], partialByType = {}, store, action, base, loaded, materialSession = null, narration, trace = [], participants = [], config = this.realConfig() }) {
    const contracts = this.settlementTypeContracts();
    const totalTypes = requestedTypes.length;
    const typeText = requestedTypes.map((type, index) => {
      const c = contracts[type];
      const title = c?.title || `${type}结算`;
      return [`[${String(index + 1).padStart(2, '0')}/${String(totalTypes).padStart(2, '0')}] ${type}合约说明（实际输出标题必须严格写“${title}{”，不得带索引）`, `${title}{`, '结算状态：需要更新 / 无变化', '参与者为空时：直接写“结算状态：无变化”“类型完成：是”“}”；禁止输出结算对象和更新行。', '若无变化：直接写“结算状态：无变化”，然后写“类型完成：是”“}”，不要编造结算对象或更新行。', '若需要更新：结算对象：显示名全称｜角色/玩家/地点/势力/世界/系统｜允许结算', c?.format || '', '结算对象结束：显示名全称', '类型完成：是', '}', '→ 继续输出下个类型，直到本次必须返回的类型全部完成'].join('\n');
    }).join('\n\n');
    const incompleteReason = incompleteTypes.map((type) => {
      const title = contracts[type]?.title || `${type}结算`;
      const shortReason = /^上轮返回过短/u.test(String(partialByType[type] || '')) ? `；${partialByType[type]}` : '';
      return `${type}：需从“${title}{”开始整块重输，并用“}”闭合${shortReason}`;
    }).join('；') || '无';
    const stableFactRules = [
      '内部提取“本轮稳定事实”：只在内部完成，不输出事实列表。',
      '明确事实：可直接结算。',
      '强暗示事实：可保守结算，但必须有明确行为、对话或连续动作支撑。',
      '弱氛围暗示：不得结算。',
    ].join('\n');
    const requiredBlockOrder = requestedTypes.map((type) => `${contracts[type]?.title || `${type}结算`}{`).join(' → ');
    return window.GameModules.promptTemplates.render('inference-stage4-settlement-window', {
      本次必须返回的类型: requestedTypes.join('、'),
      已完成类型: completedTypes.join('、') || '无',
      未完成类型: incompleteTypes.join('、') || '无',
      当前窗口起始类型: requestedTypes[0] || '无',
      当前窗口结束类型: requestedTypes[requestedTypes.length - 1] || '无',
      必须输出块顺序: requiredBlockOrder || '无',
      必须输出块数量: String(requestedTypes.length),
      未完成类型原因: incompleteReason,
      本回合参与者: JSON.stringify(participants),
      本轮结算材料: [`行动：${this.actionText(action)}`, `正文：${this.compactUpdatePromptText(narration, 1800, true)}`, this.settlementMetricBaselineText(store, participants), stableFactRules].join('\n'),
      类型短规则: requestedTypes.map((type) => this.settlementTypeShortRule(type)).join('\n\n'),
      类型合约: typeText,
    });
  },

  async completeConfiguredSettlementKvWindow({ store, action, base, loaded, materialSession = null, narration, trace = [], participants = [], logId = null, config = this.realConfig() }) {
    const allTypes = this.settlementTypeQueue(config);
    const completedTypes = [];
    const partialByType = {};
    const patchesByType = {};
    let requestedTypes = allTypes.slice();
    let shortOutputRetries = 0;
    const maxAttempts = Math.max(4, allTypes.length + 1);
    for (let attempt = 0; attempt < maxAttempts && requestedTypes.length; attempt += 1) {
      const prompt = await this.buildSettlementTypeWindowPrompt({ requestedTypes, completedTypes, incompleteTypes: requestedTypes.filter((type) => partialByType[type]), partialByType, store, action, base, loaded, materialSession, narration, trace, participants, config });
      const raw = await this.completeConfiguredStep(store, prompt, logId, false, { ...config, sourceTitle: `${config.label}Stage4滑动结算` });
      const parsed = this.parseSettlementKv(raw, { requestedTypes, participants, store, config });
      const compactRawLength = String(raw || '').replace(/\s+/gu, '').length;
      const isFinalBatch = requestedTypes.length <= 1 || parsed.incompleteTypes.length === 0;
      const isShortPartial = !isFinalBatch && compactRawLength < 1000;
      if (isShortPartial) shortOutputRetries += 1;
      else shortOutputRetries = 0;
      parsed.completeTypes.forEach((type) => {
        if (!completedTypes.includes(type)) completedTypes.push(type);
        patchesByType[type] = parsed.patchesByType[type];
        delete partialByType[type];
      });
      parsed.incompleteTypes.forEach((type) => {
        const lines = parsed.patchesByType[type]?.__lines || [];
        partialByType[type] = lines.length ? lines.join('\n') : '本轮未返回该类型，需补齐完整类型块。';
      });
      if (isShortPartial) {
        const remaining = parsed.incompleteTypes.filter((type) => !completedTypes.includes(type));
        const shortReason = `上轮返回过短：${compactRawLength}/1000；疑似只输出了单个类型，必须在同一轮按顺序补齐所有未完成类型：${remaining.join('、') || requestedTypes.join('、')}`;
        remaining.forEach((type) => { partialByType[type] = shortReason; });
        if (shortOutputRetries > 1) throw new Error(`Stage4滑动结算返回过短：${compactRawLength}/1000，未完成类型：${remaining.join('、')}`);
      }
      requestedTypes = allTypes.filter((type) => !completedTypes.includes(type));
    }
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
        { key: 'stamina_pool', delta: 0, reason: '结算保留。' },
        { key: 'satiety', delta: 0, reason: '结算保留。' },
        { key: 'hydration', delta: 0, reason: '结算保留。' },
        { key: 'fatigue', delta: 0, reason: '结算保留。' },
        { key: 'mental_stability', delta: 0, reason: '结算保留。' },
      ],
    };
  },

  guidedStepFields() {
    return ['查询规划', '资料状态', '地点查询', '地点查询理由', '因果查询', '因果查询理由', '冲突查询', '冲突查询理由', '强制出场', '高优先候选', '戏剧候选', '禁止出场', '随机事件候选', '随机事件闯入条件', '资料请求', '资料请求结束'];
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
    const direct = allowed.find((item) => item === clean);
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
      values[key] = parsed.value;
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
      if (!Object.prototype.hasOwnProperty.call(values, key) || !values[key]) values[key] = value;
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
        if (err.parseResult && !this.isGuidedStepSemanticSelfCheckError(err)) parseResults.push({ raw: lastRaw, parsed: err.parseResult });
        if (allowContextDoneOnProse && this.looksLikeProseInsteadOfStepJson(lastRaw)) {
          console.warn(`${config.label}资料阶段解析到正文内容，视为资料已足够并进入正文阶段。`);
          return { raw: lastRaw, data: this.contextDoneFromProse(lastRaw) };
        }
        if (!this.isRetryableParseError(err) || i === 1) break;
        const droppedSummary = this.summarizeDroppedMaterialRequests(err.parseResult?.droppedMaterialRequests || []);
        const parseDetail = err.parseResult ? `score=${err.parseResult.score}/${err.parseResult.maxScore} successRate=${err.parseResult.successRate} missing=${err.parseResult.missing?.join('、') || '无'} droppedMaterialRequests=${droppedSummary}` : '';
        const semanticSelfCheckFailed = this.isGuidedStepSemanticSelfCheckError(err);
        console.warn(`${config.label}${semanticSelfCheckFailed ? '语义自检失败' : '解析异常'}，自动重试一次:`, err.message, parseDetail);
        prompt = [
          prompt,
          `上次中文 K:V ${semanticSelfCheckFailed ? '语义自检失败' : '解析失败'}：${err.message}`,
          `已成功字段：${err.parseResult?.keyHits?.join('、') || '无'}`,
          `已确认字段值：\n${this.confirmedKvValuesText(err.parseResult)}`,
          `缺失字段：${err.parseResult?.missing?.join('、') || '未知'}`,
          `已丢弃资料请求：${droppedSummary}`,
          '请重新输出完整中文 K:V；必须保留已确认字段值，只补齐或修正缺失/错误字段；不得删除用户明确约束、禁止出场、已确认强制出场；不要重复输出已丢弃资料请求。',
          '【AI自检】若资料状态为“继续请求资料”，必须至少输出一条可执行资料请求1/2/3、结构化查询或明确参与者候选；若资料请求、地点查询、因果查询、冲突查询、参与者候选全为“无”，必须改为“资料状态：资料已足够”。不得输出“继续请求资料 + 资料请求：无 + 全部查询/候选为无”。',
        ].join('\n\n');
      }
    }
    if (parseResults.length >= 2) {
      const merged = parseResults.map((item) => item.parsed).reduce((out, item) => this.mergeGuidedParseResults(out, item));
      if (merged.successRate >= 0.8) return { raw: parseResults.map((item) => item.raw).join('\n\n'), data: this.guidedStepDataFromParsed(merged, parseResults.map((item) => item.raw).join('\n\n')) };
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
    return String(text || '').replace(/\n*\s*(?:你能)?请从上述正文最后一个字符之后继续[\s\S]*?完整句号、问号、感叹号或右引号结束。?/gu, '').trim();
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

  async ensurePhasedNarrationLength(store, action, prompt, narration, logId) {
    return await this.ensureConfiguredNarrationLength(store, action, prompt, narration, logId, this.realConfig());
  },

  async ensureConfiguredNarrationLength(store, action, prompt, narration, logId, config = this.realConfig()) {
    let text = this.cleanPhasedNarration(narration);
    const count = this.chineseCharCount(text);
    let tailIncomplete = this.narrationTailLooksIncomplete(text);
    if (!tailIncomplete) return text;

    console.warn(`${config.label}正文句尾疑似截断，正在补全当前句:`, { count, tailIncomplete, tail: text.slice(-80) });
    try {
      const continuation = await this.completeConfiguredNarrationContinuation(store, action, prompt, text, logId, { count, tailIncomplete }, config);
      if (continuation) {
        text = this.mergeNarrationContinuation(text, continuation);
        tailIncomplete = this.narrationTailLooksIncomplete(text);
      }
    } catch (err) {
      console.warn(`${config.label}正文补全失败，保留原正文继续流程:`, { code: err.code, message: err.message });
    }
    if (tailIncomplete) console.warn(`${config.label}正文补全后句尾仍疑似截断:`, { count: this.chineseCharCount(text), tailIncomplete, tail: text.slice(-80) });
    return text;
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
      `任务:只输出补全文本本身；从<正文尾部>最后一个字符之后继续；只补完当前截断句并自然收束；禁止重复正文尾部；禁止输出任何任务说明、JSON、Markdown、标题；${this.compactReturnRule('prose')}结尾必须是。！？或右引号。`,
      `本次行动:${actionText}`,
      this.continuityFallbackRule(),
      '边界:只补当前句或收束当前动作，不扩展新动作阶段，不为了字数追加新情节，不替玩家执行下一步。',
      `问题:汉字数=${reason.count || 0};句尾未完成=${reason.tailIncomplete ? '是' : '否'}`,
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
    let buffer = '';
    let doneSeen = false;
    let lastPaint = 0;
    try {
      const requestOptions = {
        source: config.sourceTitle || (streamToUi ? `${config.mode}-agent-loop` : `${config.mode}-agent-context`),
        model: store.modelId,
        prompt,
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
    const sceneQueries = { location: this.splitNameList(v['地点查询']), causality: this.splitNameList(v['因果查询']), conflict: this.splitNameList(v['冲突查询']) };
    const hasActionableRequests = Array.isArray(parsed.materialRequests) && parsed.materialRequests.length > 0;
    const hasRoleCardCandidates = forcedParticipants.length > 0 || priorityCandidates.length > 0 || dramaCandidates.length > 0;
    const hasExecutableSceneQueries = Object.values(sceneQueries).some((items) => items.length > 0);
    if (status === '继续请求资料' && !hasActionableRequests && !hasRoleCardCandidates && !hasExecutableSceneQueries) {
      const err = new Error('资料状态为继续请求资料时，必须输出可执行的资料请求1、结构化查询或明确参与者候选');
      err.parseResult = parsed;
      throw err;
    }
    const isContextDone = status === '资料已足够' || (!hasRoleCardCandidates && !hasActionableRequests && !hasExecutableSceneQueries && (!requestText || requestText === '无'));
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
      randomIntrusionCondition: v['随机事件闯入条件'] || '无明确条件则禁止闯入',
      parseScore: { score: parsed.score, maxScore: parsed.maxScore, successRate: parsed.successRate },
      parseDegraded: parsed.successRate < 1,
      droppedMaterialRequests: parsed.droppedMaterialRequests || [],
      mergeConflicts: parsed.mergeConflicts || [],
      missingContext: !isContextDone,
    };
  },

  parseGuidedStepKv(raw, config = this.realConfig()) {
    const parsed = this.parseChineseKvBlock(raw, this.guidedStepFields(), { parseMaterialRequests: true, config });
    if (parsed.materialRequestErrors?.length || parsed.successRate < 0.8) {
      const detail = parsed.materialRequestErrors?.[0] || '解析错误请重试';
      const err = new Error(detail);
      err.parseResult = parsed;
      throw err;
    }
    return this.guidedStepDataFromParsed(parsed, raw);
  },

  parseStep(raw, config = this.realConfig()) {
    const text = String(raw || '').replace(this.invisibleCharsPattern(), '').replace(/```(?:text|markdown|json)?|```/giu, '').trim();
    if (!/查询规划[：:]|资料状态[：:]/u.test(text)) {
      throw new Error(`${config.label}返回缺少中文 K:V 查询规划字段`);
    }
    return this.parseGuidedStepKv(text, config);
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
