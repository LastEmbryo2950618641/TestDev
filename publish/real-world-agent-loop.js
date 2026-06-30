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
    return { mode: 'real', label: '现实', ctx: window.GameModules.realWorldAgentContext, materials: window.GameModules.realWorldMaterials, templateId: 'real-world-engine', firstTemplateId: 'real-world-engine-first' };
  },

  storyConfig() {
    return { mode: 'story', label: '操控剧情', ctx: window.GameModules.storyAgentContext, materials: window.GameModules.workLoreMaterials, templateId: 'story-agent-engine', firstTemplateId: 'story-agent-engine-first' };
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

    const guidedMaxSteps = this.guidedMaxSteps(store, config);
    for (let step = 1; step <= guidedMaxSteps; step += 1) {
      const prompt = await this.buildConfiguredPrompt({ store, action, base, loaded, skills, step, materialSession, config });
      lastPrompt = prompt;
      this.markConfiguredStep(store, logId, this.stepText(step, config), config);
      const raw = await this.completeConfiguredParsedStep(store, prompt, logId, false, false, config, step > 1);
      lastRaw = raw.raw;
      const data = raw.data;
      if (!data) throw new Error(`${config.label || 'Loop'}返回格式错误`);
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
    const sceneAnchorPrompt = await this.buildConfiguredSceneAnchorPrompt({ store, action, base, loaded, trace, materialSession, config });
    this.markConfiguredStep(store, logId, `${config.label}资料已载入，正在生成场景锚定报告…`, config);
    const sceneAnchor = await this.completeSceneAnchorReport(store, sceneAnchorPrompt, logId, config);
    const sceneAnchorReport = sceneAnchor.text;
    const narrationPrompt = await this.buildConfiguredNarrationPrompt({ store, action, base, loaded, skills, materialSession, sceneAnchorReport, config });
    this.markConfiguredStep(store, logId, `${config.label}场景锚定完成，正在生成正文…`, config);
    const narrationRaw = await this.completeConfiguredStep(store, narrationPrompt, logId, true, config);
    const narration = await this.ensureConfiguredNarrationLength(store, action, narrationPrompt, this.cleanPhasedNarration(narrationRaw), logId, config);
    if (!narration) throw new Error(`${config.label}正文为空`);
    this.showConfiguredNarration(store, logId, narration, config);

    let skillPrompt = '', jsonPrompt = '', selectedSkills = {}, jsonRaw = '', updates = {};
    try {
      const participants = this.stageParticipants(trace, loaded, store);
      skillPrompt = await this.buildConfiguredStage3BasePrompt({ store, action, base, loaded, materialSession, narration, trace, participants, config });
      this.markConfiguredStep(store, logId, `${config.label}正文已完成，正在生成基础结算字段…`, config, { keepNarration: true });
      selectedSkills = await this.completeConfiguredStage3Base(store, skillPrompt, logId, config);

      jsonPrompt = JSON.stringify(selectedSkills);
      this.markConfiguredStep(store, logId, '基础字段已生成，正在执行中文 K:V 滑动结算…', config, { keepNarration: true });
      updates = await this.completeConfiguredSettlementKvWindow({ store, action, base, loaded, materialSession, narration, trace, participants, logId, config });
      jsonRaw = JSON.stringify(updates);
    } catch (err) {
      console.warn(`${config.label}状态更新生成失败，保留已生成正文并使用最小结算:`, err.message);
      updates = this.fallbackUpdateJson(store, action, config);
      jsonRaw = JSON.stringify(updates);
    }
    const result = config.mode === 'story' ? this.mergeStoryNarrationAndUpdates(store, narration, updates, config) : this.mergeNarrationAndUpdates(store, narration, updates, config);
    const anchoredTrace = trace.map((item, index) => index === trace.length - 1 ? { ...item, anchorReport: sceneAnchor.data } : item);
    return { result, prompt: `---SCENE_ANCHOR---\n${sceneAnchorPrompt}\n\n---NARRATION---\n${narrationPrompt}\n\n---STAGE3_BASE---\n${skillPrompt}\n\n---UPDATE_JSON---\n${jsonPrompt}`, loaded, raw: `${sceneAnchor.raw}\n\n${narrationRaw}\n\n${JSON.stringify(selectedSkills)}\n\n${jsonRaw}`, trace: anchoredTrace };
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

  async buildConfiguredPrompt({ store, action, base, loaded, skills, step, materialSession = null, forceFinal = false, config = this.realConfig() }) {
    const actionText = this.actionText(action, config.mode === 'story' ? '继续推进操控剧情' : '继续观察现实世界');
    const outputJson = JSON.stringify(config.mode === 'story' ? this.storyOutputSchema(store) : this.outputSchema(store));
    const loadedText = config.ctx.buildLoadedText(loaded);
    const materialText = config.materials?.summary?.(materialSession, { step }) || '';
    const randomActiveCandidates = step === 1 && !forceFinal ? (config.ctx.randomActiveEventCandidates?.(store, action, { mode: config.mode }) || []) : [];
    const randomActiveCandidateText = randomActiveCandidates.length
      ? randomActiveCandidates.map((item, index) => `${index + 1}. ${item.name || item.id}`).join('；')
      : '无';
    const vars = {
      基础上下文: base,
      动态载入资料: [loadedText, materialText].filter(Boolean).join('\n\n'),
      本次行动: actionText,
      当前步骤: forceFinal ? '收敛/final' : `${step}/${this.guidedMaxSteps(store, config)}`,
      最大步骤: this.guidedMaxSteps(store, config),
      动态Skills: skills,
      推演自由度规则: config.mode === 'story' ? this.storyFreedomRule(store) : (store.realWorldFreedomRule?.() || '推演自由度：行动范围内。只推演玩家本次输入行动自然抵达的直接结果。'),
      当前步骤输出要求: this.stepOutputRule(step, forceFinal),
      输出示例: outputJson,
      随机场外角色候选: randomActiveCandidateText,
    };
    const basePrompt = await window.GameModules.promptTemplates.render(config.templateId, vars);
    const stage1Prompt = !forceFinal
      ? await window.GameModules.promptTemplates.render('inference-stage1-guided-query', vars)
      : '';
    return stage1Prompt ? `${basePrompt}\n\n${stage1Prompt}` : basePrompt;
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

  compactReturnRule(kind = 'JSON') {
    if (kind === 'prose') return '返回必须紧凑：不要Markdown、不要标题、不要任务说明、不要换行符、不要制表符、不要不可见字符，只输出单行正文文本。';
    return '返回必须紧凑：只输出合法JSON；不要Markdown、不要代码块、不要解释、不要缩进、不要换行符、不要制表符、不要不可见字符；字符串值内部也不得包含换行符、制表符或不可见字符。';
  },

  sceneLayerSummary(trace = []) {
    const latest = [...(Array.isArray(trace) ? trace : [])].reverse().find((item) => item?.type === 'request_context') || {};
    const names = (items = []) => (items || []).map((item) => `${item.name || item.idOrName || item.id}${item.reason ? `（${item.reason}）` : ''}`).join('、') || '无';
    const random = (latest.randomActiveEvents || []).map((item) => `${item.characterName || item.name}：${item.eventType || item.actionMethod || '背景行动'}｜${item.motivation || ''}`).join('；') || '无';
    const q = latest.sceneQueries || { location: [], causality: [], conflict: [] };
    return [`强制出场：${names(latest.forcedParticipants)}`, `高优先候选：${names(latest.priorityCandidates)}`, `戏剧候选：${names(latest.dramaCandidates)}`, `禁止出场：${names(latest.forbiddenParticipants)}`, `地点查询：${(q.location || []).join('；') || '无'}`, `因果查询：${(q.causality || []).join('；') || '无'}`, `冲突查询：${(q.conflict || []).join('；') || '无'}`, `随机主动事件：${random}`, `随机事件闯入条件：${latest.randomIntrusionCondition || '无明确条件则禁止闯入'}`].join('\n');
  },

  async buildConfiguredSceneAnchorPrompt({ store, action, base, loaded, trace = [], materialSession = null, config = this.realConfig() }) {
    const actionText = this.actionText(action, config.mode === 'story' ? '继续推进操控剧情' : '继续观察现实世界');
    const loadedText = config.ctx.buildLoadedText(loaded);
    const materialText = config.materials?.summary?.(materialSession) || config.materials?.acquiredSummary?.(materialSession) || '';
    return window.GameModules.promptTemplates.render('inference-stage2-scene-anchor', {
      模式标签: config.label,
      本次行动: actionText,
      基础上下文: this.compactUpdatePromptText(base, 1600),
      参与者分层与查询规划: this.sceneLayerSummary(trace),
      已加载资料摘要: this.compactUpdatePromptText([loadedText, materialText].filter(Boolean).join('\n\n') || '无', 2200),
      紧凑返回规则: this.compactReturnRule('prose'),
    });
  },

  parseSceneAnchorReport(raw, config = this.realConfig()) {
    const parsed = this.parseChineseKvBlock(raw, this.sceneAnchorFields(), { config });
    const hardAnchors = ['当前地点', '当前时间', '空间状态', '当前动作'];
    const missingHardAnchor = hardAnchors.some((key) => !String(parsed.values?.[key] || '').trim());
    if (parsed.successRate < 0.8 || missingHardAnchor) throw new Error('场景锚定报告解析错误请重试');
    const v = parsed.values;
    const orderedText = this.sceneAnchorFields().map((key) => `${key}：${v[key] || ''}`).join('\n');
    return { text: orderedText, currentLocation: v['当前地点'] || '', currentTime: v['当前时间'] || '', writingFocus: v['正文写作重点'] || '', settlementBoundary: v['结算边界'] || '', values: v, parseScore: { score: parsed.score, maxScore: parsed.maxScore, successRate: parsed.successRate }, parseDegraded: parsed.successRate < 1 };
  },

  async completeSceneAnchorReport(store, prompt, logId, config = this.realConfig()) {
    let best = null;
    let lastErr = null;
    for (let i = 0; i < 2; i += 1) {
      const raw = await this.completeConfiguredStep(store, prompt, logId, false, { ...config, sourceTitle: `${config.label}场景锚定` });
      try {
        const data = this.parseSceneAnchorReport(raw, config);
        if (!best || data.parseScore.successRate >= best.data.parseScore.successRate) best = { raw, data, text: data.text };
        if (data.parseScore.successRate >= 1) return best;
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
    const loadedText = config.ctx.buildLoadedText(loaded);
    const materialText = config.materials?.acquiredSummary?.(materialSession) || '';
    const writingStyle = store.selectedWritingStylePrompt?.() || store.writingStylePrompt?.() || '正文采用小说文风，重视画面、动作、感官和心理反应，避免复述玩家指令。';
    const modeRule = config.mode === 'story'
      ? `推演自由度：${this.storyFreedomRule(store)}\n玩家不是角色本人，而是操控/影响被操控者行动的存在；正文必须写出本次行动的动作过程、环境变化、其他人物反应、被操控者身体与心理张力、直接结果。`
      : `推演自由度：${store.realWorldFreedomRule?.() || '只推演玩家本次输入行动自然抵达的直接结果。'}${store.sharedControlState?.() ? '\n同世界附身控制规则：玩家意识附身接管被控角色身体，同时玩家现实本体仍由同一个意识维持控制；正文以第二人称“你”的附身镜头为主，不要让同一角色在两个地点同时出现。' : ''}`;
    const narrationRules = '行动范围内充分推演：写出本次行动的动作过程、身体感受、周围环境变化、可见细节、他人反应、对话回应和直接短期连锁影响；不替玩家执行下一步新行动；不把亲吻、抚摸、摩擦、按住等行为自动扩展为脱衣、转移地点、插入、高潮等未输入的新阶段。';
    return window.GameModules.promptTemplates.render('inference-stage3-narration', {
      模式标签: config.label,
      本次行动: actionText,
      基础上下文: [this.continuityFallbackRule(), `小说笔风：${writingStyle}`, modeRule, narrationRules, this.compactUpdatePromptText(base, 1800)].join('\n'),
      场景锚定报告: sceneAnchorReport || '无',
      已动态载入资料: loadedText || '无',
      可用技能: skills || '无',
      资料摘要: materialText || '无',
      正文规则: narrationRules,
      紧凑返回规则: this.compactReturnRule('prose'),
    });
  },

  async buildSkillSelectionPrompt(args) {
    return await this.buildConfiguredSkillSelectionPrompt({ ...args, config: this.realConfig() });
  },

  async buildConfiguredSkillSelectionPrompt({ store, action, base, loaded, materialSession = null, narration, config = this.realConfig() }) {
    const actionText = this.actionText(action, config.mode === 'story' ? '继续推进操控剧情' : '继续观察现实世界');
    const loadedText = config.ctx.buildLoadedText(loaded);
    const materialText = config.mode === 'story' ? (config.materials?.acquiredSummary?.(materialSession) || '') : (config.materials?.summary?.(materialSession) || '');
    const updateSkills = window.GameModules.updateRegistry?.skillSummaries?.() || '';
    const initSkills = window.GameModules.initPromptRegistry?.skillSummaries?.(store) || '';
    return [
      `# ${config.label}阶段3A：选择需要结算的 Skills`,
      '你只输出合法 JSON，不要正文，不要 Markdown，不要代码块，不要解释。',
      `本次行动：${actionText}`,
      `基础上下文：\n${base}`,
      `已动态载入资料：\n${[loadedText, materialText].filter(Boolean).join('\n\n') || '无'}`,
      `阶段2正文：\n${narration}`,
      updateSkills ? `## 更新 Skills 元数据\n\n${updateSkills}` : '',
      initSkills ? `## 初始化 Skills 元数据\n\n${initSkills}` : '',
      '根据正文中已经确认的事实，选择后续生成更新 JSON 必须用到的 skills。只选需要更改数值、描述、状态或记录的 skills；无变化不要选择。',
      '选择顺序：先检查是否已有情绪、感觉、生命体征、物品、地图、势力、关系、角色卡等专用更新 skill；有专用 skill 时不要选 generic；只有稳定事实没有对应专用 skill，或属于新分类/状态标签/跨系统字段时才选择 generic。',
      '若正文确认了类似但未列入清单的稳定事实，不要忽略；在没有更精确 skill 时选择 generic 兜底固化。',
      '所有 skill 必须返回上方 Skills 元数据中横线前的规范 skill 名；禁止返回 method 名、点号工具名或函数名。',
      'choices、elapsedSeconds、status、quest、sceneTitle、locationName 只允许在本步骤返回；后续各更新分组不得再返回这些基础显示/时间字段。elapsedSeconds 将用于推进桌面时间，choices 将用于展示备选行动。',
      '返回格式：{"groups":{"metrics":["skill-id"],"bodySex":["skill-id"],"survival":[],"worldSocialInventory":[]},"elapsedSeconds":300,"status":"状态","quest":"目标","choices":["行动一","行动二","行动三","行动四"],"reason":"选择依据"}',
    ].filter(Boolean).join('\n\n');
  },

  async buildConfiguredStage3BasePrompt({ store, action, base, loaded, materialSession = null, narration, trace = [], participants = null, config = this.realConfig() }) {
    const actionText = this.actionText(action, config.mode === 'story' ? '继续推进操控剧情' : '继续观察现实世界');
    const loadedText = config.ctx.buildLoadedText(loaded);
    const materialText = config.mode === 'story' ? (config.materials?.acquiredSummary?.(materialSession) || '') : (config.materials?.summary?.(materialSession) || '');
    const stageParticipants = Array.isArray(participants) ? participants : this.stageParticipants(trace, loaded, store);
    const schema = { elapsedSeconds: 180, status: '当前状态', quest: '当前目标', choices: ['行动一', '行动二', '行动三', '行动四'], sceneTitle: '场景标题', locationName: '地点名' };
    return [
      `# ${config.label}阶段3A：基础结算字段`,
      `${this.compactReturnRule('JSON')}只输出 ${JSON.stringify(schema)} 这一类字段；禁止输出技能路由、updateSkills、initSkills、genericUpdates、initUpdates、正文或解释。`,
      `本次行动:${this.compactUpdatePromptText(actionText, 500)}`,
      `基础上下文:${this.compactUpdatePromptText(base, 1200)}`,
      `已动态载入资料:${this.compactUpdatePromptText([loadedText, materialText].filter(Boolean).join(' ') || '无', 1200)}`,
      '结算边界：只允许结算本回合参与者列表中的对象；加载角色卡不等于参与或结算；候选但未入场、随机延迟事件角色、背景提及角色、禁止出场角色都不得结算。',
      `本回合参与者:${JSON.stringify(stageParticipants)}`,
      `阶段2正文:${this.compactUpdatePromptText(narration, 1800, true)}`,
      `返回示例:${JSON.stringify(schema)}`,
    ].filter(Boolean).join('\n');
  },

  settlementEligibleParticipant(p = {}) {
    if (!p || p.canSettle === false) return false;
    const role = String(p.role || '').toLowerCase();
    if (/loaded-role-card|priority-candidate|drama-candidate|candidate|forbidden|background|random/u.test(role)) return false;
    if (p.type === 'player') return true;
    if (p.canSettle === true) return true;
    return /actor|direct|forced|participant|current-scene/u.test(role);
  },

  stageParticipants(trace = [], loaded = [], store = null) {
    const seen = new Set();
    const blocked = new Set();
    const forced = new Set();
    const forbidden = new Set();
    const out = [];
    const nameOf = (p = {}) => String(p?.name || p?.characterName || p?.idOrName || p?.id || '').trim();
    (Array.isArray(trace) ? trace : []).forEach((item) => {
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
    (Array.isArray(trace) ? trace : []).forEach((item) => {
      (Array.isArray(item?.participants) ? item.participants : []).forEach(add);
      (Array.isArray(item?.forcedParticipants) ? item.forcedParticipants : []).forEach((p) => add({ ...p, role: p.role || 'forced', canSettle: p.canSettle === false ? false : true }));
      this.characterParticipants(item?.characters, store).forEach((p) => add({ ...p, canSettle: true }));
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

  normalizeStage3BaseFields(raw = {}, store = null, config = this.realConfig()) {
    const fallbackChoices = config.mode === 'story'
      ? ['观察四周', '尝试行动', '与人交谈', '隐藏异样']
      : (Array.isArray(store?.realWorldChoices) && store.realWorldChoices.length ? store.realWorldChoices.slice(0, 4) : ['观察手机异常', '处理现实事务', '联系熟人', '暂时休息']);
    const choices = Array.isArray(raw?.choices) ? raw.choices.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 4) : [];
    while (choices.length < 4 && fallbackChoices[choices.length]) choices.push(fallbackChoices[choices.length]);
    return {
      elapsedSeconds: Number.isFinite(Number(raw?.elapsedSeconds)) && Number(raw.elapsedSeconds) > 0 ? Math.max(1, Math.round(Number(raw.elapsedSeconds))) : 300,
      status: String(raw?.status || store?.realWorldStatus || '现实推演继续中').slice(0, 60),
      quest: String(raw?.quest || store?.realWorldQuest || '确认现实处境').slice(0, 40),
      choices: choices.slice(0, 4),
      sceneTitle: String(raw?.sceneTitle || store?.realWorldSceneTitle || '现实世界').slice(0, 40),
      locationName: String(raw?.locationName || store?.realWorldLocationName || store?.realWorldMap?.current || '').slice(0, 60),
    };
  },

  async completeConfiguredStage3Base(store, prompt, logId, config = this.realConfig()) {
    const raw = await this.completeConfiguredStep(store, prompt, logId, false, { ...config, sourceTitle: `${config.label}阶段3A-基础结算字段` });
    try {
      const data = window.GameModules.jsonUtils.parseLoose(this.compactJsonReturn(raw)) || {};
      return this.normalizeStage3BaseFields(data, store, config);
    } catch (err) {
      console.warn(`${config.label}阶段3A基础字段解析失败:`, err.message);
      return this.normalizeStage3BaseFields({}, store, config);
    }
  },

  async completeSkillSelection(store, prompt, logId) {
    return await this.completeConfiguredSkillSelection(store, prompt, logId, this.realConfig());
  },

  ensureRequiredUpdateSkills(selected = {}, narration = '') {
    if (selected.groups && typeof selected.groups === 'object') {
      const normalized = this.normalizeStage3Groups(selected, narration);
      const bodySex = new Set(normalized.groups.bodySex || []);
      const text = String(narration || '');
      if (/亲密|性刺激|快感|阴部|胸部|口部|肛部|臀部|接吻|亲吻|抚摸|揉捏|插入|自慰|摩擦|高潮|性爱|发生关系/u.test(text)) {
        bodySex.add('body-status');
        bodySex.add('sexual-experience');
      }
      if (/阴部插入|阴道插入|发生关系|性爱|性交|破处|非处女/u.test(text)) bodySex.add('sexual-history');
      normalized.groups.bodySex = Array.from(bodySex).filter((id) => this.stage3UpdateGroups().bodySex.skills.includes(id)).slice(0, 12);
      return normalized;
    }
    const updateSkills = new Set(this.canonicalUpdateSkillIds(selected.updateSkills));
    const text = String(narration || '');
    if (/亲密|性刺激|快感|阴部|胸部|口部|肛部|臀部|接吻|亲吻|抚摸|揉捏|插入|自慰|摩擦|高潮|性爱|发生关系/u.test(text)) {
      updateSkills.add('body-status');
      updateSkills.add('sexual-experience');
    }
    if (/阴部插入|阴道插入|发生关系|性爱|性交|破处|非处女/u.test(text)) updateSkills.add('sexual-history');
    return { ...selected, updateSkills: Array.from(updateSkills).slice(0, 12), initSkills: this.canonicalInitSkillIds(selected.initSkills).slice(0, 8) };
  },

  canonicalUpdateSkillIds(names = []) {
    const canonical = window.GameModules.updateRegistry?.canonicalSkillIds?.(names);
    if (Array.isArray(canonical)) return canonical;
    return (Array.isArray(names) ? names : []).map((name) => String(name || '').trim()).filter(Boolean);
  },

  canonicalInitSkillIds(names = [], store = null) {
    const canonical = window.GameModules.initPromptRegistry?.canonicalSkillIds?.(names, store);
    if (Array.isArray(canonical)) return canonical;
    return (Array.isArray(names) ? names : []).map((name) => String(name || '').trim()).filter(Boolean);
  },

  stage3UpdateGroups() {
    return {
      metrics: { title: '现实阶段3B-情绪与感觉更新', skills: ['emotion', 'feeling'] },
      bodySex: { title: '现实阶段3B-身体、性经历与穿着更新', skills: ['body-status', 'sexual-experience', 'sexual-history', 'wearing-state'] },
      survival: { title: '现实阶段3B-生命体征与系统更新', skills: ['vital', 'system'] },
      worldSocialInventory: { title: '现实阶段3B-世界、关系与物品更新', skills: ['relationship', 'role-card', 'map', 'faction-overview', 'faction-structure', 'generic', 'item'] },
    };
  },

  stage3GroupRoute(route = {}) {
    const groups = {};
    Object.entries(this.stage3UpdateGroups()).forEach(([key, group]) => {
      groups[key] = [...group.skills];
    });
    return { ...route, groups };
  },

  normalizeStage3Groups(selected = {}, narration = '', store = null) {
    const configs = this.stage3UpdateGroups();
    const groups = Object.fromEntries(Object.keys(configs).map((key) => [key, []]));
    const rawGroups = selected.groups && typeof selected.groups === 'object' ? selected.groups : this.groupsFromFlatSkills(selected, store);
    Object.entries(configs).forEach(([key, group]) => {
      const raw = Array.isArray(rawGroups[key]) ? rawGroups[key] : [];
      const canonical = group.init ? this.canonicalInitSkillIds(raw, store) : this.canonicalUpdateSkillIds(raw);
      const allowed = group.init ? canonical : canonical.filter((id) => group.skills.includes(id));
      groups[key] = [...new Set(allowed)].slice(0, group.init ? 8 : 12);
    });
    return {
      groups,
      elapsedSeconds: Number.isFinite(Number(selected.elapsedSeconds)) && Number(selected.elapsedSeconds) > 0 ? Math.max(1, Number(selected.elapsedSeconds)) : undefined,
      choices: Array.isArray(selected.choices) ? selected.choices.filter((item) => typeof item === 'string').map((item) => item.trim()).filter(Boolean).slice(0, 4) : undefined,
      status: selected.status ? String(selected.status).slice(0, 60) : undefined,
      quest: selected.quest ? String(selected.quest).slice(0, 40) : undefined,
      sceneTitle: selected.sceneTitle ? String(selected.sceneTitle).slice(0, 40) : undefined,
      locationName: selected.locationName ? String(selected.locationName).slice(0, 60) : undefined,
      reason: String(selected.reason || '').slice(0, 160),
    };
  },

  groupsFromFlatSkills(selected = {}, store = null) {
    const configs = this.stage3UpdateGroups();
    const groups = Object.fromEntries(Object.keys(configs).map((key) => [key, []]));
    groups.init = this.canonicalInitSkillIds(selected.initSkills || [], store);
    const updateSkills = this.canonicalUpdateSkillIds(selected.updateSkills || []);
    updateSkills.forEach((id) => {
      const entry = Object.entries(configs).find(([, group]) => !group.init && group.skills.includes(id));
      if (entry) groups[entry[0]].push(id);
    });
    return groups;
  },

  async completeConfiguredSkillSelection(store, prompt, logId, config = this.realConfig()) {
    const raw = await this.completeConfiguredStep(store, prompt, logId, false, config);
    try {
      const data = window.GameModules.jsonUtils.parseLoose(raw) || {};
      if (data.groups && typeof data.groups === 'object') return this.normalizeStage3Groups(data, '', store);
      const updateSkills = this.canonicalUpdateSkillIds(Array.isArray(data.updateSkills) ? data.updateSkills : []).slice(0, 12);
      const initSkills = this.canonicalInitSkillIds(Array.isArray(data.initSkills) ? data.initSkills : [], store).slice(0, 8);
      return { updateSkills, initSkills, reason: String(data.reason || '').slice(0, 160) };
    } catch (err) {
      console.warn(`${config.label}结算 Skills 选择解析失败:`, err.message);
      return { updateSkills: [], initSkills: [], reason: '选择解析失败，使用基础结算。' };
    }
  },

  compactUpdatePromptText(text = '', limit = 1600, keepTail = false) {
    const raw = String(text || '').replace(/\s+/g, ' ').trim();
    if (raw.length <= limit) return raw;
    if (keepTail) return `…${raw.slice(-limit)}`;
    const head = Math.ceil(limit * 0.65);
    const tail = Math.max(0, limit - head - 1);
    return `${raw.slice(0, head)}…${tail ? raw.slice(-tail) : ''}`;
  },

  compactUpdateSchema(schema = {}) {
    const copy = JSON.parse(JSON.stringify(schema || {}));
    ['genericUpdates', 'initUpdates', 'metricUpdates', 'lexiconUpdates', 'itemActions'].forEach((key) => {
      if (Array.isArray(copy[key])) copy[key] = copy[key].slice(0, 4).map((item) => this.compactSchemaValue(item));
    });
    return copy;
  },

  compactSchemaValue(value) {
    if (Array.isArray(value)) return value.slice(0, 4).map((item) => this.compactSchemaValue(item));
    if (!value || typeof value !== 'object') return typeof value === 'string' ? value.slice(0, 80) : value;
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, this.compactSchemaValue(item)]));
  },

  async buildUpdateJsonPrompt(args) {
    return await this.buildConfiguredUpdateJsonPrompt({ ...args, config: this.realConfig() });
  },

  settlementTypeQueue(config = this.realConfig()) {
    const base = ['基础结算', '情绪', '感觉', '生命体征', '身体状态', '穿着状态', '性经历', '性历史', '关系', '角色卡', '物品', '地图', '势力总览', '势力结构', '系统记录', '通用固化'];
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
    const parts = String(line || '').replace(/^更新\d+\s*[：:]/u, '').split(/[，,]/u).map((x) => x.trim());
    const [label, key, rawValue, reason] = parts;
    const entry = this.settlementUpdateCatalog()[label || typeName];
    if (!entry || !subject || !key || !rawValue || !reason) return null;
    const delta = Number(String(rawValue).replace(/[^-+\d.]/gu, ''));
    const field = entry.fieldMap?.[key] || `${entry.fieldPrefix}.${key}`;
    const change = Number.isFinite(delta) && /^[+-]?\d/u.test(String(rawValue)) ? { mode: 'delta', value: delta } : { mode: 'set', value: rawValue };
    return { updateType: entry.updateType, subject, field, change, reasons: [{ trigger: label || typeName, evidence: reason, confidence: 'confirmed' }] };
  },

  parseSpecialSettlementLine(typeName = '', line = '', subject = null) {
    const parts = String(line || '').replace(/^更新\d+\s*[：:]/u, '').split(/[，,]/u).map((x) => x.trim());
    if (!subject || parts[0] !== typeName) return null;
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
    const lines = String(raw || '').split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
    const contracts = this.settlementTypeContracts();
    const patchesByType = {};
    const completeTypes = [];
    const incompleteTypes = [];
    const baseFields = {};
    let currentType = '';
    let currentSubject = null;
    const ensurePatch = (type) => { patchesByType[type] = patchesByType[type] || { genericUpdates: [], baseFields: {}, __updateLines: 0, __parsedUpdates: 0 }; return patchesByType[type]; };
    for (const line of lines) {
      const typeHit = Object.entries(contracts).find(([, c]) => line === `${c.title}：` || line === `${c.title}:`);
      if (typeHit) { currentType = typeHit[0]; currentSubject = null; ensurePatch(currentType); continue; }
      if (!currentType) continue;
      if (currentType === '基础结算') {
        const base = this.splitKvLine(line);
        if (base && ['经过时间', '当前状态', '当前目标', '场景标题', '地点名称', '备选行动1', '备选行动2', '备选行动3', '备选行动4'].includes(base.key)) {
          baseFields[base.key] = base.value;
          ensurePatch(currentType).baseFields[base.key] = base.value;
          continue;
        }
      }
      if (/^结算对象[：:]/u.test(line)) {
        const [name, objectType, allowed] = line.replace(/^结算对象[：:]/u, '').split(/[｜|]/u).map((x) => x.trim());
        const isSceneParticipant = this.participantAllowedForSettlement(name, participants);
        const isNonCharacterSystem = ['地点', '势力', '世界', '系统'].includes(objectType);
        currentSubject = allowed === '允许结算' && (isSceneParticipant || isNonCharacterSystem) ? (this.subjectForSettlement(name, participants) || { type: objectType || 'system', id: name, name }) : null;
        continue;
      }
      if (/^更新\d+[：:]/u.test(line)) {
        const patch = ensurePatch(currentType);
        patch.__updateLines += 1;
        const update = ['性历史', '关系', '角色卡'].includes(currentType) ? this.parseSpecialSettlementLine(currentType, line, currentSubject) : this.parseStandardSettlementLine(currentType, line, currentSubject);
        if (update) {
          patch.__parsedUpdates += 1;
          patch.genericUpdates.push(update);
        }
        continue;
      }
      if (/^类型完成[：:]是$/u.test(line)) { ensurePatch(currentType).__typeDone = true; continue; }
      if (/^结算结束[：:]是$/u.test(line)) ensurePatch(currentType).__settlementDone = true;
    }
    requestedTypes.forEach((type) => {
      const patch = patchesByType[type];
      const hasParsedAllUpdates = !patch?.__updateLines || patch.__parsedUpdates === patch.__updateLines;
      const hasRequiredBaseFields = type !== '基础结算' || ['经过时间', '当前状态', '当前目标', '场景标题', '地点名称', '备选行动1', '备选行动2', '备选行动3', '备选行动4'].every((key) => String(patch?.baseFields?.[key] || '').trim());
      if (patch?.__typeDone && patch?.__settlementDone && hasParsedAllUpdates && hasRequiredBaseFields) completeTypes.push(type);
      else incompleteTypes.push(type);
    });
    const genericUpdates = completeTypes.flatMap((type) => patchesByType[type]?.genericUpdates || []);
    return { patchesByType, completeTypes, incompleteTypes, genericUpdates, baseFields };
  },

  defaultStage3UpdateGroups() {
    return Object.fromEntries(Object.entries(this.stage3UpdateGroups())
      .filter(([, group]) => !group.init)
      .map(([key, group]) => [key, Array.isArray(group.skills) ? group.skills.slice() : []]));
  },

  buildSettlementTypeWindowPrompt({ requestedTypes = [], completedTypes = [], incompleteTypes = [], partialByType = {}, store, action, base, loaded, materialSession = null, narration, trace = [], participants = [], config = this.realConfig() }) {
    const contracts = this.settlementTypeContracts();
    const typeText = requestedTypes.map((type) => {
      const c = contracts[type];
      return [`## ${type}`, `${c?.title || `${type}结算`}：`, '结算状态：需要更新 / 无变化', '结算对象：显示名全称｜角色/玩家/地点/势力/世界/系统｜允许结算', c?.format || '', '结算对象结束：显示名全称', '类型完成：是', '结算结束：是'].join('\n');
    }).join('\n\n');
    const catalog = this.settlementUpdateCatalog();
    const updateIds = requestedTypes.map((type) => catalog[type]?.updateType).filter(Boolean);
    const updatePromptText = window.GameModules.updateRegistry?.skillsText?.(updateIds) || window.GameModules.updateRegistry?.skillText?.(updateIds) || '';
    const initSkillText = window.GameModules.initPromptRegistry?.skillText?.() || '';
    const initSchema = window.GameModules.initPromptRegistry?.schema?.() || {};
    return window.GameModules.promptTemplates.render('inference-stage4-settlement-window', {
      本次必须返回的类型: requestedTypes.join('、'),
      已完成类型摘要: completedTypes.join('、') || '无',
      残缺类型: incompleteTypes.join('、') || '无',
      残缺原因或尾部: Object.entries(partialByType).map(([k, v]) => `${k}:${String(v).slice(-160)}`).join('；') || '无',
      现有Update提示词摘要: updatePromptText || '无',
      现有Init提示词: initSkillText || '无',
      现有Init字段Schema: JSON.stringify(initSchema),
      本回合参与者: JSON.stringify(participants),
      正文: this.compactUpdatePromptText(narration, 1800, true),
      类型合约: typeText,
    });
  },

  async completeConfiguredSettlementKvWindow({ store, action, base, loaded, materialSession = null, narration, trace = [], participants = [], logId = null, config = this.realConfig() }) {
    const allTypes = this.settlementTypeQueue(config);
    const completedTypes = [];
    const partialByType = {};
    const patchesByType = {};
    let requestedTypes = allTypes.slice();
    const maxAttempts = Math.max(4, allTypes.length + 1);
    for (let attempt = 0; attempt < maxAttempts && requestedTypes.length; attempt += 1) {
      const prompt = await this.buildSettlementTypeWindowPrompt({ requestedTypes, completedTypes, incompleteTypes: requestedTypes.filter((type) => partialByType[type]), partialByType, store, action, base, loaded, materialSession, narration, trace, participants, config });
      const raw = await this.completeConfiguredStep(store, prompt, logId, false, { ...config, sourceTitle: `${config.label}Stage4滑动结算` });
      const parsed = this.parseSettlementKv(raw, { requestedTypes, participants, store, config });
      parsed.completeTypes.forEach((type) => {
        if (!completedTypes.includes(type)) completedTypes.push(type);
        patchesByType[type] = parsed.patchesByType[type];
        delete partialByType[type];
      });
      parsed.incompleteTypes.forEach((type) => { partialByType[type] = raw; });
      requestedTypes = allTypes.filter((type) => !completedTypes.includes(type));
    }
    if (requestedTypes.length) throw new Error(`Stage4结算类型未完成：${requestedTypes.join('、')}`);
    return this.mergeGroupedUpdatePatches(Object.values(patchesByType), {});
  },

  async completeGroupedStage3Updates({ store, action, base, loaded, skills = '', materialSession = null, narration, route = {}, logId = null, config = this.realConfig(), trace = [], participants = null }) {
    const patches = [];
    const fixedRoute = this.stage3GroupRoute(route);
    const groups = fixedRoute.groups || {};
    for (const [key, group] of Object.entries(this.stage3UpdateGroups())) {
      const selected = Array.isArray(groups[key]) ? groups[key] : [...group.skills];
      try {
        this.markConfiguredStep(store, logId, `${group.title}…`, config, { keepNarration: true });
        const prompt = await this.buildGroupedUpdateJsonPrompt({ store, action, base, loaded, skills, materialSession, narration, groupKey: key, selectedSkills: selected, config, trace, participants });
        const patch = await this.completeConfiguredUpdateJson(store, prompt, logId, { ...config, sourceTitle: group.title });
        patches.push(this.filterGroupedUpdatePatch(patch, group));
      } catch (err) {
        console.warn(`${group.title}失败，已跳过该组:`, err.message);
      }
    }
    return this.mergeGroupedUpdatePatches(patches, fixedRoute);
  },

  buildUpdateContextPack({ store, action, base, loaded, materialSession = null, narration, trace = [], participants = null, groupKey, config = this.realConfig() }) {
    const actionText = this.actionText(action, config.mode === 'story' ? '继续推进操控剧情' : '继续观察现实世界');
    const stageParticipants = Array.isArray(participants) ? participants : this.stageParticipants(trace, loaded, store);
    const participantText = stageParticipants.length ? JSON.stringify(stageParticipants) : '[]';
    const common = [
      `本次行动:${this.compactUpdatePromptText(actionText, 500)}`,
      `阶段2正文:${this.compactUpdatePromptText(narration, 2400, true)}`,
      `当前地点:${this.compactUpdatePromptText(store?.realWorldLocationName || store?.realWorldMap?.current || '', 120)}`,
      '结算边界:只允许结算本回合参与者列表中的对象；加载角色卡不等于参与或结算；候选但未入场、随机延迟事件角色、背景提及角色、禁止出场角色都不得结算。',
      `本回合参与者:${participantText}`,
    ];
    if (groupKey === 'metrics') return [...common, this.metricsContextText(store, stageParticipants)].filter(Boolean).join('\n');
    if (groupKey === 'bodySex') return [...common, this.bodySexContextText(store, stageParticipants)].filter(Boolean).join('\n');
    if (groupKey === 'survival') return [...common, this.survivalContextText(store, stageParticipants)].filter(Boolean).join('\n');
    return [...common, this.worldSocialInventoryContextText({ store, base, loaded, materialSession, config })].filter(Boolean).join('\n');
  },

  participantStates(store, participants = []) {
    const ids = new Set(['player-self']);
    (Array.isArray(participants) ? participants : []).forEach((p) => {
      const id = p?.id || p?.idOrName || p?.name;
      if (id) ids.add(String(id));
    });
    const states = [];
    ids.forEach((id) => {
      const state = id === 'player-self' ? store?.playerIdentityState?.() : (store?.itemSkillState?.(id) || window.GameModules.updateRegistry?.findStateByNameSuffix?.(store, id));
      if (state && !states.some((item) => item.id === state.id)) states.push(state);
    });
    return states.slice(0, 8);
  },

  metricsContextText(store, participants = []) {
    return this.participantStates(store, participants).map((state) => {
      const metrics = store?.ensureStateMetrics?.(state) || {};
      return `${state.id}:${state.profile?.name || state.name || state.id}:emotions=${JSON.stringify(metrics.emotions || {})};temporaryEmotions=${JSON.stringify(metrics.temporaryEmotions || {})};playerFeelings=${JSON.stringify(metrics.playerFeelings || {})};temporaryPlayerFeelings=${JSON.stringify(metrics.temporaryPlayerFeelings || {})}`;
    }).join('\n');
  },

  bodySexContextText(store, participants = []) {
    return this.participantStates(store, participants).map((state) => {
      const values = state.values || {};
      const wearing = store?.wearingItems?.(state) || values.wearing || [];
      return `${state.id}:${state.profile?.name || state.name || state.id}:bodyStatus=${JSON.stringify(values.bodyStatus || {})};intimacy=${JSON.stringify(values.intimacy || {})};wearing=${JSON.stringify(wearing)}`;
    }).join('\n');
  },

  survivalContextText(store, participants = []) {
    return this.participantStates(store, participants).map((state) => {
      const vitals = store?.rpgVitals?.(state) || [];
      return `${state.id}:${state.profile?.name || state.name || state.id}:vitals=${JSON.stringify(vitals)};system=${JSON.stringify(state.values?.system || {})}`;
    }).join('\n');
  },

  worldSocialInventoryContextText({ store, base, loaded, materialSession = null, config = this.realConfig() }) {
    const loadedText = config.ctx?.buildLoadedText?.(loaded) || '';
    const materialText = config.mode === 'story' ? (config.materials?.acquiredSummary?.(materialSession) || '') : (config.materials?.summary?.(materialSession) || '');
    return `基础上下文摘要:${this.compactUpdatePromptText(base, 1200)}\n已动态载入资料摘要:${this.compactUpdatePromptText([loadedText, materialText].filter(Boolean).join(' ') || '无', 1400)}`;
  },

  async buildGroupedUpdateJsonPrompt({ store, action, base, loaded, skills = '', materialSession = null, narration, groupKey, selectedSkills = [], config = this.realConfig(), trace = [], participants = null }) {
    const group = this.stage3UpdateGroups()[groupKey] || {};
    const selected = Array.isArray(selectedSkills) ? selectedSkills : [];
    const contextPack = this.buildUpdateContextPack({ store, action, base, loaded, materialSession, narration, trace, participants, groupKey, config });
    const updateSkillText = group.init ? '' : this.compactUpdatePromptText(window.GameModules.updateRegistry?.skillText?.(selected) || '', 2200);
    const updateSchema = group.init ? {} : this.compactUpdateSchema(window.GameModules.updateRegistry?.schemaFor?.(selected) || {});
    const initSkillText = group.init ? this.compactUpdatePromptText(window.GameModules.initPromptRegistry?.skillText?.(selected, store) || '', 1600) : '';
    const initSchema = group.init ? this.compactUpdateSchema(window.GameModules.initPromptRegistry?.schema?.(selected, store) || {}) : {};
    return [
      `# ${group.title || `${config.label}阶段3B-分组更新`}`,
      `你只输出本分组最小补丁 JSON；基础显示字段、时间字段、备选行动字段只由阶段3A负责，本组不得输出；${this.compactReturnRule('JSON')}`,
      `紧凑上下文:${contextPack}`,
      `本组允许 Skills：${JSON.stringify(selected)}`,
      groupKey === 'worldSocialInventory' ? 'worldSocialInventory 组禁止输出 metrics.*、intimacy.*、bodyStatus.*、values.wearing、wearing、profile.wearing、profile.wearingItems、亲密相关穿着状态；只允许关系、角色卡非亲密字段、地图、势力、泛用世界变化、物品。' : '',
      groupKey === 'bodySex' ? 'bodySex 组必须完整检查 body-status、sexual-experience、sexual-history、亲密相关穿着/外观状态；同一亲密/性事件若玩家与角色双方都参与，必须双方各自一条 sexual-experience；只根据本回合参与者清单和阶段2正文确认事实判断主体；禁止把接触、摩擦、亲吻升级为插入、高潮或性交记录。' : '',
      '本组必须完整检查本组允许 Skills/更新类型；必须完整检查本组允许的所有更新类型；凡阶段2正文已经确认的变化都必须返回：其中本组允许范围内的变化必须返回对应 genericUpdates，不得因示例为空而省略。输出格式为 {"genericUpdates":[...]}；只有本组无明确变化才返回 {"genericUpdates":[]}；只有完整检查后确认本组无明确变化才允许这样返回。字段名必须用最短标准名；reason/status/intro/definition/evidence 只写必要证据短句。整体 JSON 必须紧凑输出，不要空格、换行、制表符或不可见字符。',
      updateSkillText ? `## 本组更新 Skills\n\n${updateSkillText}` : '',
      initSkillText ? `## 本组初始化 Skills\n\n${initSkillText}` : '',
      `最小示例：${JSON.stringify({ genericUpdates: [], ...updateSchema, ...initSchema })}`,
    ].filter(Boolean).join('\n\n');
  },

  filterGroupedUpdatePatch(patch = {}, group = {}) {
    const allowed = new Set(group.init ? [] : group.skills || []);
    const genericUpdates = (Array.isArray(patch.genericUpdates) ? patch.genericUpdates : [])
      .filter((item) => group.init || allowed.has(String(item?.updateType || '').trim()))
      .filter((item) => this.groupAllowsUpdateField(item, group));
    const filtered = { ...patch, genericUpdates };
    if (!this.isWorldSocialInventoryGroup(group)) {
      this.legacyWorldArrayKeys().forEach((key) => { delete filtered[key]; });
    }
    return filtered;
  },

  isWorldSocialInventoryGroup(group = {}) {
    return String(group.title || '').includes('世界、关系与物品');
  },

  legacyWorldArrayKeys() {
    return ['itemActions', 'lexiconUpdates', 'factionUpdates', 'wechatActions', 'mapNodes', 'newLocations', 'locationDescriptionUpdates'];
  },

  groupAllowsUpdateField(update = {}, group = {}) {
    const field = String(update.field || '');
    if (this.isWorldSocialInventoryGroup(group)) {
      if (/^(?:values\.)?(?:emotionalState|feelingState)$/iu.test(field)) return false;
      if (/^(?:values\.)?(?:metrics|intimacy|bodyStatus|wearing)(?:\.|$)/u.test(field)) return false;
      if (/^profile\.wearing(?:Items)?$/iu.test(field)) return false;
      if (String(update.updateType || '') === 'wearing-state') return false;
    }
    return true;
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
      this.legacyWorldArrayKeys().forEach((key) => {
        if (Array.isArray(patch[key])) merged[key] = (merged[key] || []).concat(patch[key]);
      });
    });
    ['sceneTitle', 'locationName', 'status', 'quest', 'elapsedSeconds', 'choices'].forEach((key) => {
      if (route[key] !== undefined && route[key] !== null && route[key] !== '') merged[key] = route[key];
    });
    return merged;
  },

  async buildConfiguredUpdateJsonPrompt({ store, action, base, loaded, skills, materialSession = null, narration, selectedSkills = {}, config = this.realConfig() }) {
    const actionText = this.actionText(action, config.mode === 'story' ? '继续推进操控剧情' : '继续观察现实世界');
    const loadedText = config.ctx.buildLoadedText(loaded);
    const materialText = config.mode === 'story' ? (config.materials?.acquiredSummary?.(materialSession) || '') : (config.materials?.summary?.(materialSession) || '');
    const updateSkillText = this.compactUpdatePromptText(window.GameModules.updateRegistry?.skillText?.(selectedSkills.updateSkills || []) || '', 2200);
    const updateSchema = this.compactUpdateSchema(window.GameModules.updateRegistry?.schemaFor?.(selectedSkills.updateSkills || []) || {});
    const initSkillText = this.compactUpdatePromptText(window.GameModules.initPromptRegistry?.skillText?.(selectedSkills.initSkills || [], store) || '', 1600);
    const initSchema = this.compactUpdateSchema(window.GameModules.initPromptRegistry?.schema?.(selectedSkills.initSkills || [], store) || {});
    const storyRule = '输出最小补丁 JSON：必须包含 type、sceneTitle、elapsedSeconds、mood、quest、choices。其他字段只有明确变化才输出，否则省略或用空数组。choices 必须4个。metricUpdates 只写当前被操控角色的情绪和对玩家感觉；genericUpdates 用于没有专用 skill 的稳定角色卡关系、身份、状态标签、新分类或跨系统字段。';
    const realRule = '输出最小补丁 JSON：必须包含 type、sceneTitle、locationName、elapsedSeconds、status、quest、choices、genericUpdates。状态变化统一写 genericUpdates；禁止输出 characterMetricUpdates。';
    const unverifiedUpdateRule = '未证实自称固化禁令（最高优先级）：玩家单句自称、玩笑、夸张或幻想表达若没有基础上下文、最近世界线或已载入资料明确证明，只能视为未证实自称；禁止固化为身份、职位、势力、组织、地点、物品、角色卡、介绍卡、词条、genericUpdates、faction、lexicon 或长期世界观。';
    return [
      `# ${config.label}阶段3B：只生成更新JSON`,
      '你只输出一个合法紧凑 JSON 对象；不要正文、Markdown、代码块、解释、缩进或多余空格。',
      `本次行动：${this.compactUpdatePromptText(actionText, 500)}`,
      `基础上下文摘要：\n${this.compactUpdatePromptText(base, 1800)}`,
      `已动态载入资料摘要：\n${this.compactUpdatePromptText([loadedText, materialText].filter(Boolean).join('\n\n') || '无', 1800)}`,
      `阶段2正文：\n${this.compactUpdatePromptText(narration, 2800, true)}`,
      `已选择更新 Skills：${JSON.stringify(selectedSkills.updateSkills || [])}`,
      `已选择初始化 Skills：${JSON.stringify(selectedSkills.initSkills || [])}`,
      config.mode === 'story' ? storyRule : realRule,
      'choices只允许字符串数组，例如["行动一","行动二","行动三","行动四"]；禁止输出对象，禁止priority、description、reason等选择说明字段；选择不是重点，只给可显示行动文本。',
      unverifiedUpdateRule,
      '字段名必须用最短标准名；reason/status/intro/definition/evidence 只写必要证据短句，避免复述正文。每个主体同类变化最多4条；没有明确变化则 genericUpdates 返回空数组。整体 JSON 必须紧凑输出，不要空格、换行、制表符或不可见字符。',
      updateSkillText ? `## 更新 Skills\n\n${updateSkillText}` : '',
      initSkillText ? `## 初始化 Skills\n\n${initSkillText}` : '',
      `最小示例：${JSON.stringify({ ...(config.mode === 'story' ? this.storyUpdateJsonSchema() : this.updateJsonSchema()), ...updateSchema, ...initSchema })}`,
    ].filter(Boolean).join('\n\n');
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

  updateJsonSchema() {
    const realWorld = window.GameModules.realWorld2026 || {};
    return {
      type: 'final', sceneTitle: '标题', locationName: '具体地点', elapsedSeconds: 300, status: '状态', quest: '目标',
      choices: ['行动一', '行动二', '行动三', '行动四'],
      genericUpdates: [],
      appearedCharacters: [{ name: '人物名', role: '身份', intro: '本回合可确认介绍', work: realWorld.label || '2026 现代都市现实世界' }], solidifiableCharacters: [], wechatActions: [],
    };
  },

  storyUpdateJsonSchema() {
    return { type: 'final', sceneTitle: '标题', elapsedSeconds: 120, mood: '紧张', quest: '下一步目标', choices: ['观察四周', '尝试行动', '与人交谈', '隐藏异样'], mind: '被操控者第一人称内心', characterIntent: '被操控者当前意图', controlFeeling: '疑惑', controlAdaptation: 5, controlExperienceSummary: '本次操控体验摘要', metricUpdates: { emotions: [{ key: '恐惧', delta: 3, status: '状态', reason: '证据' }], playerFeelings: [{ key: '警惕', delta: 2, status: '状态', reason: '证据' }] }, statChanges: { health: 0, stamina: -1, mental_stability: -1 }, appearedCharacters: [{ name: '出场人物', role: '身份', intro: '本回合可确认介绍', work: '作品名' }], solidifiableCharacters: [], lexiconUpdates: [], genericUpdates: [], itemActions: [] };
  },

  outputSchema(store) {
    const realWorld = window.GameModules.realWorld2026 || {};
    return { type: 'final', sceneTitle: '现实场景标题', locationName: '具体地点名', parentLocationName: '上级地点名', locationDescription: '当前地点本次新认识的事实', mapNodes: [{ name: '子地点名', parentName: '上级地点名', descriptionFacts: ['玩家已知地点事实'] }], newLocations: [{ name: '新增地点名', parentName: '', descriptionFacts: ['玩家已知事实'] }], locationDescriptionUpdates: [{ locationName: '地点名', action: 'add', text: '新增或更新的玩家已知事实' }], elapsedSeconds: 60, status: '现实状态简述', quest: '新的现实目标', choices: ['处理现实事务', '联系某个人', '观察周围', '暂时休息'], genericUpdates: [{ updateType: 'vital', subject: { type: 'player', id: 'player-self' }, field: 'vitals.stamina_pool', change: { mode: 'delta', value: -1 }, reasons: [{ trigger: '行动消耗', evidence: '本次行动消耗少量精力', confidence: 'confirmed' }] }, { updateType: 'emotion', subject: { type: 'player', id: 'player-self' }, field: 'metrics.emotions.紧张', change: { mode: 'delta', value: 1 }, reasons: [{ trigger: '现实刺激', evidence: '正文确认情绪变化', confidence: 'confirmed' }] }, { updateType: 'feeling', subject: { type: 'character', id: '相关角色id或姓名' }, field: 'metrics.playerFeelings.信任', change: { mode: 'delta', value: 1 }, reasons: [{ trigger: '互动结果', evidence: '正文确认角色对玩家感觉变化', confidence: 'confirmed' }] }], appearedCharacters: [{ name: '出场人物', role: '身份', intro: '本回合可确认介绍', work: realWorld.label || '2026 现代都市现实世界' }], solidifiableCharacters: [], wechatActions: [{ action: 'sendIncomingNow/sendIncomingPast', contactId: '联系人id或角色id', text: '角色发给玩家的微信消息', timeIso: '过去消息必填ISO时间', reason: '思念触发原因' }], factionUpdates: [{ action: 'addFactionPosition', factionName: '势力名', position: '职位或地位', characterName: '角色名或未知', reason: '现实确认依据' }], itemActions: [{ action: 'add/transfer/delete/purchase/generate', target: 'player-self或角色id/姓名', from: '来源角色', to: '目标角色', itemName: '已有物品名', quantity: 1, item: { name: '物品名', kind: '物品或装备', price: 0, description: '说明' }, reason: '现实确认依据' }], lexiconUpdates: [{ worldTag: realWorld.label || '2026 现代都市现实世界', kind: '玩家设定/装备/物品/穿着/角色卡/角色技能', field: '角色卡字段名', name: '词条名或skills', value: '新值或对象', summary: '摘要', description: '说明', reason: '现实证据、触发行动、状态来源或动机' }] };
  },

  storyOutputSchema(store) {
    return { type: 'final', sceneTitle: '剧情场景标题', elapsedSeconds: 60, mood: '当前情绪', quest: '新的剧情目标', choices: ['可点击行动一', '可点击行动二', '可点击行动三', '可点击行动四'], mind: `${store.character?.name || '被操控者'}第一人称内心独白`, characterIntent: '被操控者当前意图', controlFeeling: '被上线感受', controlAdaptation: 0, controlExperienceSummary: '上线经历摘要', metricUpdates: { emotions: [{ key: '情绪名', delta: 0, status: '变化后的状态含义', reason: '剧情证据' }], playerFeelings: [{ key: '感觉名', delta: 0, status: '变化后的状态含义', reason: '剧情证据' }] }, statChanges: { health: 0, stamina: 0, mental_stability: 0 }, appearedCharacters: [{ name: '出场人物', role: '身份', intro: '本回合可确认介绍', work: store.character?.work || '作品名' }], solidifiableCharacters: [], lexiconUpdates: [], genericUpdates: [], itemActions: [] };
  },

  guidedStepFields() {
    return ['查询规划', '资料状态', '地点查询', '地点查询理由', '因果查询', '因果查询理由', '冲突查询', '冲突查询理由', '强制出场', '高优先候选', '戏剧候选', '禁止出场', '随机事件候选', '随机事件闯入条件', '资料请求', '资料请求结束'];
  },

  sceneAnchorFields() {
    return ['场景锚定报告', '当前地点', '当前时间', '空间状态', '当前动作', '强制出场', '高优先候选', '戏剧候选', '禁止出场', '随机事件影响', '正文写作重点', '结算边界'];
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
      '结算限制': '结算边界',
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
    const sceneAnchorRequired = ['场景锚定报告', '当前地点', '当前时间', '空间状态', '当前动作', '强制出场', '禁止出场', '随机事件影响', '正文写作重点', '结算边界'];
    if (sceneAnchorRequired.every((key) => allowed.includes(key))) return sceneAnchorRequired;
    const preferred = ['资料状态', '强制出场', '禁止出场', '随机事件闯入条件', '正文写作重点', '结算边界'];
    const required = preferred.filter((key) => allowed.includes(key));
    return required.length ? required : allowed.slice(0, Math.min(allowed.length, 6));
  },

  fallbackChineseMaterialRequest(line = '', options = {}) {
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
    const hasUsefulValue = (key) => String(values[key] || '').trim().length > 0;
    const criticalHits = required.filter((key) => Object.prototype.hasOwnProperty.call(values, key) && hasUsefulValue(key));
    const uniqueMaterialLines = [...new Set(materialLines.map((line) => String(line || '').trim()).filter(Boolean))];
    const maxScore = Math.max(1, required.length + uniqueMaterialLines.length);
    const score = criticalHits.length + materialRequests.length;
    return { score, maxScore, successRate: score / maxScore, criticalHits };
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
    const materialRequests = options.parseMaterialRequests ? materialLines.map((line) => {
      const req = this.fallbackChineseMaterialRequest(line, options);
      if (!req) droppedMaterialRequests.push(line);
      return req;
    }).filter(Boolean) : [];
    const scored = this.scoreChineseKvParse(values, allowed, materialLines, materialRequests);
    return { values, lines, missing: allowed.filter((key) => !keyHits.has(key)), score: scored.score, maxScore: scored.maxScore, successRate: scored.successRate, keyHits: [...keyHits], criticalHits: scored.criticalHits, parseDegraded: scored.successRate < 1, droppedMaterialRequests, materialRequests };
  },

  mergeGuidedParseResults(primary = {}, secondary = {}) {
    const values = { ...(primary.values || {}) };
    const mergeConflicts = [];
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
        if (data || i === 1) return { raw: lastRaw, data: data || (allowProseFinal ? this.proseFinal(store, bestRaw || lastRaw) : null) };
        console.warn(`${config.label}格式不完整，自动重试一次`);
      } catch (err) {
        lastErr = err;
        if (err.parseResult) parseResults.push({ raw: lastRaw, parsed: err.parseResult });
        if (allowContextDoneOnProse && this.looksLikeProseInsteadOfStepJson(lastRaw)) {
          console.warn(`${config.label}资料阶段解析到正文内容，视为资料已足够并进入正文阶段。`);
          return { raw: lastRaw, data: this.contextDoneFromProse(lastRaw) };
        }
        if (!this.isRetryableParseError(err) || i === 1) break;
        console.warn(`${config.label}解析异常，自动重试一次:`, err.message);
        prompt = [
          prompt,
          `上次中文 K:V 解析失败：${err.message}`,
          `已成功字段：${err.parseResult?.keyHits?.join('、') || '无'}`,
          `缺失字段：${err.parseResult?.missing?.join('、') || '未知'}`,
          `已丢弃资料请求：${err.parseResult?.droppedMaterialRequests?.join('；') || '无'}`,
          '请重新输出完整中文 K:V；必须重新判断资料是否已足够；不得删除用户明确约束、禁止出场、已确认强制出场。',
        ].join('\n\n');
      }
    }
    if (parseResults.length >= 2) {
      const ranked = parseResults.map((item) => item.parsed);
      const best = this.bestGuidedParseResult(ranked);
      const secondary = ranked.find((item) => item !== best) || ranked[0];
      const merged = this.mergeGuidedParseResults(best, secondary);
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
      initUpdates: Array.isArray(updates.initUpdates) ? updates.initUpdates : [],
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
        source: config.sourceTitle || (streamToUi ? (config.mode === 'story' ? 'story-agent-engine' : 'real-world-engine') : `${config.mode}-agent-context`),
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

  normalizeParticipantList(value = [], defaultRole = 'mentioned') {
    const list = Array.isArray(value) ? value : this.splitNameList(value);
    return list.map((item) => {
      if (typeof item === 'string') return { type: 'character', idOrName: item, name: item, role: defaultRole };
      const name = String(item?.name || item?.characterName || item?.idOrName || item?.id || '').trim().slice(0, 80);
      return name ? { type: String(item?.type || 'character').slice(0, 20), id: item?.id, idOrName: item?.idOrName || name, name, role: String(item?.role || defaultRole).slice(0, 40), reason: item?.reason ? String(item.reason).slice(0, 160) : undefined, canLoadRoleCard: item?.canLoadRoleCard === false ? false : undefined, canEnterNarration: item?.canEnterNarration === false ? false : undefined, canSettle: typeof item?.canSettle === 'boolean' ? item.canSettle : undefined } : null;
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
    return {
      type: status === '资料已足够' ? 'context_done' : 'request_context',
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
      sceneQueries: { location: this.splitNameList(v['地点查询']), causality: this.splitNameList(v['因果查询']), conflict: this.splitNameList(v['冲突查询']) },
      randomIntrusionCondition: v['随机事件闯入条件'] || '无明确条件则禁止闯入',
      parseScore: { score: parsed.score, maxScore: parsed.maxScore, successRate: parsed.successRate },
      parseDegraded: parsed.successRate < 1,
      droppedMaterialRequests: parsed.droppedMaterialRequests || [],
      mergeConflicts: parsed.mergeConflicts || [],
      missingContext: status !== '资料已足够',
    };
  },

  parseGuidedStepKv(raw, config = this.realConfig()) {
    const parsed = this.parseChineseKvBlock(raw, this.guidedStepFields(), { parseMaterialRequests: true, config });
    if (parsed.successRate < 0.8) {
      const err = new Error('解析错误请重试');
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

  isRetryableParseError(err) {
    return ['截断', '分隔符后缺少 JSON', '缺少正文', 'JSON missing', '解析错误请重试'].some((text) => String(err?.message || '').includes(text));
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
