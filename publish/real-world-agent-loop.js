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

    for (let step = 1; step <= this.maxSteps; step += 1) {
      const prompt = await this.buildConfiguredPrompt({ store, action, base, loaded, skills, step, materialSession, config });
      lastPrompt = prompt;
      this.markConfiguredStep(store, logId, this.stepText(step, config), config);
      const raw = await this.completeConfiguredParsedStep(store, prompt, logId, true, false, config);
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

      if (data.type === 'request_context' && results.length && step < this.maxSteps) continue;
      if (step < this.minSteps && data.type !== 'context_done') continue;
      break;
    }
    return await this.generateConfiguredFinal({ store, action, base, loaded, skills, trace, materialSession, logId, prompt: lastPrompt, raw: lastRaw, config });
  },

  async generatePhasedFinal(args) {
    return await this.generateConfiguredFinal({ ...args, config: this.realConfig() });
  },

  async generateConfiguredFinal({ store, action, base, loaded, skills, trace, materialSession, logId, config = this.realConfig() }) {
    const narrationPrompt = await this.buildConfiguredNarrationPrompt({ store, action, base, loaded, skills, materialSession, config });
    this.markConfiguredStep(store, logId, `${config.label}资料已足够，正在生成正文…`, config);
    const narrationRaw = await this.completeConfiguredStep(store, narrationPrompt, logId, true, config);
    const narration = await this.ensureConfiguredNarrationLength(store, action, narrationPrompt, this.cleanPhasedNarration(narrationRaw), logId, config);
    if (!narration) throw new Error(`${config.label}正文为空`);
    this.showConfiguredNarration(store, logId, narration, config);

    const skillPrompt = await this.buildConfiguredSkillSelectionPrompt({ store, action, base, loaded, materialSession, narration, config });
    this.markConfiguredStep(store, logId, `${config.label}正文已完成，正在判断需要结算的 Skills…`, config, { keepNarration: true });
    const selectedSkills = await this.completeConfiguredSkillSelection(store, skillPrompt, logId, config);

    const jsonPrompt = await this.buildConfiguredUpdateJsonPrompt({ store, action, base, loaded, skills, materialSession, narration, selectedSkills, config });
    this.markConfiguredStep(store, logId, '已选定结算 Skills，正在生成状态更新…', config, { keepNarration: true });
    const jsonRaw = await this.completeConfiguredUpdateJson(store, jsonPrompt, logId, config);
    const updates = this.parseUpdateJson(jsonRaw) || {};
    const result = config.mode === 'story' ? this.mergeStoryNarrationAndUpdates(store, narration, updates) : this.mergeNarrationAndUpdates(store, narration, updates);
    return { result, prompt: `---NARRATION---\n${narrationPrompt}\n\n---SKILL_SELECTION---\n${skillPrompt}\n\n---UPDATE_JSON---\n${jsonPrompt}`, loaded, raw: `${narrationRaw}\n\n${JSON.stringify(selectedSkills)}\n\n${jsonRaw}`, trace };
  },

  async loadStepContext(ctx, store, action, data, loadedKeys, loaded, memoryIds, step, materialSession = null, materials = window.GameModules.realWorldMaterials) {
    const out = [];
    if (data.type === 'request_context') {
      const autoLoaded = await ctx.autoLoadForStep?.(store, action, loadedKeys, materialSession, materials, memoryIds, step, loaded, out) || [];
      out.push(...autoLoaded);
      const requested = await ctx.loadRequests(store, action, data.requests || [], loadedKeys, materialSession, materials, memoryIds, loaded, out);
      out.push(...requested);
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
    const outputJson = JSON.stringify(config.mode === 'story' ? this.storyOutputSchema(store) : this.outputSchema(store));
    const loadedText = config.ctx.buildLoadedText(loaded);
    const materialText = config.materials?.summary?.(materialSession) || '';
    const vars = {
      基础上下文: base,
      动态载入资料: [loadedText, materialText].filter(Boolean).join('\n\n'),
      本次行动: action || (config.mode === 'story' ? '继续推进操控剧情' : '继续观察现实世界'),
      当前步骤: forceFinal ? '收敛/final' : `${step}/${this.maxSteps}`,
      最大步骤: this.maxSteps,
      动态Skills: skills,
      小说笔风: store.writingStylePrompt?.() || '正文采用小说文风，重视画面、动作、感官和心理反应，避免复述玩家指令。',
      推演自由度规则: config.mode === 'story' ? this.storyFreedomRule(store) : (store.realWorldFreedomRule?.() || '推演自由度：行动范围内。只推演玩家本次输入行动自然抵达的直接结果。'),
      当前步骤输出要求: this.stepOutputRule(step, forceFinal),
      输出示例: outputJson,
    };
    const basePrompt = await window.GameModules.promptTemplates.render(config.templateId, vars);
    return step !== 1 || forceFinal ? basePrompt : `${basePrompt}\n\n${await window.GameModules.promptTemplates.render(config.firstTemplateId, vars)}`;
  },

  storyFreedomRule(store) {
    return store.online ? '操控剧情自由度：玩家输入是本回合对被操控者身体或行动方向的控制；正文只能推进到本次行动自然抵达的结果点，不替玩家完成后续长期行动。' : '离线剧情自由度：玩家输入是建议或态度；角色按性格、记忆、处境自主行动。';
  },

  stepOutputRule(step, forceFinal = false) {
    if (forceFinal) return '当前为收敛步骤：禁止继续请求资料，只返回 {"type":"context_done","reason":"资料已足够"}。';
    if (step === 1) return '当前是第1步：必须返回 request_context，用于识别相关角色与必要资料。';
    return '当前只负责判断是否继续收集资料：仍缺关键资料就返回 request_context；资料足够或无法继续获取时返回 {"type":"context_done","reason":"资料已足够"}。不要输出正文，不要输出 final JSON。';
  },

  async buildNarrationPrompt(args) {
    return await this.buildConfiguredNarrationPrompt({ ...args, config: this.realConfig() });
  },

  async buildConfiguredNarrationPrompt({ store, action, base, loaded, skills, materialSession = null, config = this.realConfig() }) {
    const loadedText = config.ctx.buildLoadedText(loaded);
    const materialText = config.materials?.acquiredSummary?.(materialSession) || '';
    if (config.mode === 'story') return [
      '# 操控剧情阶段2：只生成玩家可见正文',
      '你只输出操控剧情正文，不要 JSON，不要 Markdown，不要标题，不要分隔符。',
      `本次行动：${action || '继续推进操控剧情'}`,
      `小说笔风：${store.writingStylePrompt?.() || '正文采用小说文风，重视画面、动作、感官和心理反应，避免复述玩家指令。'}`,
      `推演自由度：${this.storyFreedomRule(store)}`,
      `基础上下文：\n${base}`,
      `已动态载入资料：\n${[loadedText, materialText].filter(Boolean).join('\n\n') || '无'}`,
      '要求：使用第二人称“你”称呼玩家；玩家不是角色本人，而是操控/影响被操控者行动的存在；写出动作过程、环境变化、其他人物反应、被操控者身体与心理张力、直接结果；正文至少2000个中文汉字，目标2000-3000字；不要替玩家完成后续行动。',
    ].join('\n\n');
    return [
      '# 现实推演阶段2：只生成玩家可见正文',
      '你只输出现实推演正文，不要 JSON，不要 Markdown，不要标题，不要分隔符。',
      `本次行动：${action || '继续观察现实世界'}`,
      `小说笔风：${store.writingStylePrompt?.() || '正文采用小说文风，重视画面、动作、感官和心理反应，避免复述玩家指令。'}`,
      `推演自由度：${store.realWorldFreedomRule?.() || '只推演玩家本次输入行动自然抵达的直接结果。'}`,
      `基础上下文：\n${base}`,
      `已动态载入资料：\n${[loadedText, materialText].filter(Boolean).join('\n\n') || '无'}`,
      '要求：使用第二人称“你”；写出行动过程、环境变化、人物反应和直接结果；无论推演自由度是行动范围内还是AI自由推演，正文必须至少2000个中文汉字，目标2000-3000字；少于2000字视为不合格；不要替玩家完成后续行动。',
    ].join('\n\n');
  },

  async buildSkillSelectionPrompt(args) {
    return await this.buildConfiguredSkillSelectionPrompt({ ...args, config: this.realConfig() });
  },

  async buildConfiguredSkillSelectionPrompt({ store, action, base, loaded, materialSession = null, narration, config = this.realConfig() }) {
    const loadedText = config.ctx.buildLoadedText(loaded);
    const materialText = config.mode === 'story' ? (config.materials?.acquiredSummary?.(materialSession) || '') : (config.materials?.summary?.(materialSession) || '');
    const updateSkills = window.GameModules.updateRegistry?.skillSummaries?.() || '';
    const initSkills = window.GameModules.initPromptRegistry?.skillSummaries?.(store) || '';
    return [
      `# ${config.label}阶段3A：选择需要结算的 Skills`,
      '你只输出合法 JSON，不要正文，不要 Markdown，不要代码块，不要解释。',
      `本次行动：${action || (config.mode === 'story' ? '继续推进操控剧情' : '继续观察现实世界')}`,
      `基础上下文：\n${base}`,
      `已动态载入资料：\n${[loadedText, materialText].filter(Boolean).join('\n\n') || '无'}`,
      `阶段2正文：\n${narration}`,
      updateSkills ? `## 更新 Skills 元数据\n\n${updateSkills}` : '',
      initSkills ? `## 初始化 Skills 元数据\n\n${initSkills}` : '',
      '根据正文中已经确认的事实，选择后续生成更新 JSON 必须用到的 skills。只选需要更改数值、描述、状态或记录的 skills；无变化不要选择。',
      '选择顺序：先检查是否已有情绪、感觉、生命体征、物品、地图、势力、关系、角色卡等专用更新 skill；有专用 skill 时不要选 generic；只有稳定事实没有对应专用 skill，或属于新分类/状态标签/跨系统字段时才选择 generic。',
      '若正文确认了类似但未列入清单的稳定事实，不要忽略；在没有更精确 skill 时选择 generic 兜底固化。',
      '返回格式：{"updateSkills":["skill-name"],"initSkills":["skill-name"],"reason":"选择依据"}',
    ].filter(Boolean).join('\n\n');
  },

  async completeSkillSelection(store, prompt, logId) {
    return await this.completeConfiguredSkillSelection(store, prompt, logId, this.realConfig());
  },

  async completeConfiguredSkillSelection(store, prompt, logId, config = this.realConfig()) {
    const raw = await this.completeConfiguredStep(store, prompt, logId, false, config);
    try {
      const data = window.GameModules.jsonUtils.parseLoose(raw) || {};
      return { updateSkills: Array.isArray(data.updateSkills) ? data.updateSkills.slice(0, 12) : [], initSkills: Array.isArray(data.initSkills) ? data.initSkills.slice(0, 8) : [], reason: String(data.reason || '').slice(0, 160) };
    } catch (err) {
      console.warn(`${config.label}结算 Skills 选择解析失败:`, err.message);
      return { updateSkills: [], initSkills: [], reason: '选择解析失败，使用基础结算。' };
    }
  },

  async buildUpdateJsonPrompt(args) {
    return await this.buildConfiguredUpdateJsonPrompt({ ...args, config: this.realConfig() });
  },

  async buildConfiguredUpdateJsonPrompt({ store, action, base, loaded, skills, materialSession = null, narration, selectedSkills = {}, config = this.realConfig() }) {
    const loadedText = config.ctx.buildLoadedText(loaded);
    const materialText = config.mode === 'story' ? (config.materials?.acquiredSummary?.(materialSession) || '') : (config.materials?.summary?.(materialSession) || '');
    const updateSkillText = window.GameModules.updateRegistry?.skillText?.(selectedSkills.updateSkills || []) || '';
    const updateSchema = window.GameModules.updateRegistry?.schemaFor?.(selectedSkills.updateSkills || []) || {};
    const initSkillText = window.GameModules.initPromptRegistry?.skillText?.(selectedSkills.initSkills || [], store) || '';
    const initSchema = window.GameModules.initPromptRegistry?.schema?.(selectedSkills.initSkills || [], store) || {};
    const storyRule = '输出最小补丁 JSON：必须包含 type、sceneTitle、elapsedSeconds、mood、quest、choices。其他字段只有明确变化才输出，否则省略或用空数组。choices 必须4个。metricUpdates 只写当前被操控角色的情绪和对玩家感觉；genericUpdates 用于没有专用 skill 的稳定角色卡关系、身份、状态标签、新分类或跨系统字段。';
    const realRule = '输出最小补丁 JSON：必须包含 type、sceneTitle、locationName、elapsedSeconds、status、quest、choices、vitalUpdates。其他字段只有明确变化才输出，否则省略或用空数组；没有专用 skill 的稳定事实写 genericUpdates。';
    return [
      `# ${config.label}阶段3B：只生成更新JSON`,
      '你只输出一个合法 JSON 对象，不要正文，不要 Markdown，不要代码块，不要解释。',
      `本次行动：${action || (config.mode === 'story' ? '继续推进操控剧情' : '继续观察现实世界')}`,
      `基础上下文：\n${base}`,
      `已动态载入资料：\n${[loadedText, materialText].filter(Boolean).join('\n\n') || '无'}`,
      `阶段2正文：\n${narration}`,
      `已选择更新 Skills：${JSON.stringify(selectedSkills.updateSkills || [])}`,
      `已选择初始化 Skills：${JSON.stringify(selectedSkills.initSkills || [])}`,
      config.mode === 'story' ? storyRule : realRule,
      config.mode === 'story' ? '所有 reason/status 不超过32个汉字。lexiconUpdates/itemActions/genericUpdates 只写正文确认的稳定事实变化。' : 'vitalUpdates 必须覆盖 stamina_pool、satiety、hydration、fatigue、mental_stability。choices 必须4个。所有 reason/status 不超过24个汉字。characterMetricUpdates 最多3个角色，每个角色最多2条 emotions 和2条 playerFeelings。lexiconUpdates/itemActions/factionUpdates 只写稳定事实变化。',
      updateSkillText ? `## 更新 Skills\n\n${updateSkillText}` : '',
      initSkillText ? `## 初始化 Skills\n\n${initSkillText}` : '',
      `最小示例：${JSON.stringify({ ...(config.mode === 'story' ? this.storyUpdateJsonSchema() : this.updateJsonSchema()), ...updateSchema, ...initSchema })}`,
    ].filter(Boolean).join('\n\n');
  },

  updateJsonSchema() {
    return {
      type: 'final', sceneTitle: '标题', locationName: '具体地点', elapsedSeconds: 300, status: '状态', quest: '目标',
      choices: ['行动一', '行动二', '行动三', '行动四'],
      vitalUpdates: [{ key: 'stamina_pool', delta: -1, reason: '行动消耗。' }, { key: 'satiety', delta: 0, reason: '基本不变。' }, { key: 'hydration', delta: 0, reason: '基本不变。' }, { key: 'fatigue', delta: 1, reason: '稍感疲劳。' }, { key: 'mental_stability', delta: 0, reason: '基本稳定。' }],
      characterMetricUpdates: [], lexiconUpdates: [], itemActions: [], factionUpdates: [], wechatActions: [],
    };
  },

  storyUpdateJsonSchema() {
    return { type: 'final', sceneTitle: '标题', elapsedSeconds: 120, mood: '紧张', quest: '下一步目标', choices: ['观察四周', '尝试行动', '与人交谈', '隐藏异样'], mind: '被操控者第一人称内心', characterIntent: '被操控者当前意图', controlFeeling: '疑惑', controlAdaptation: 5, controlExperienceSummary: '本次操控体验摘要', metricUpdates: { emotions: [{ key: '恐惧', delta: 3, status: '状态', reason: '证据' }], playerFeelings: [{ key: '警惕', delta: 2, status: '状态', reason: '证据' }] }, statChanges: { health: 0, stamina: -1, mental_stability: -1 }, lexiconUpdates: [], genericUpdates: [], itemActions: [] };
  },

  outputSchema(store) {
    const realWorld = window.GameModules.realWorld2026 || {};
    return { type: 'final', sceneTitle: '现实场景标题', locationName: '具体地点名', parentLocationName: '上级地点名', locationDescription: '当前地点本次新认识的事实', mapNodes: [{ name: '子地点名', parentName: '上级地点名', descriptionFacts: ['玩家已知地点事实'] }], newLocations: [{ name: '新增地点名', parentName: '', descriptionFacts: ['玩家已知事实'] }], locationDescriptionUpdates: [{ locationName: '地点名', action: 'add', text: '新增或更新的玩家已知事实' }], elapsedSeconds: 60, status: '现实状态简述', quest: '新的现实目标', choices: ['处理现实事务', '联系某个人', '观察周围', '暂时休息'], vitalUpdates: [{ key: 'stamina_pool', delta: -1, reason: '本次行动消耗少量精力。' }, { key: 'satiety', delta: 0, reason: '本次行动时间较短，饱食度基本不变。' }, { key: 'hydration', delta: 0, reason: '本次行动时间较短，水分基本不变。' }, { key: 'fatigue', delta: 1, reason: '持续行动带来轻微疲劳。' }, { key: 'mental_stability', delta: 0, reason: '本次行动没有直接冲击精神稳定。' }], metricUpdates: { target: 'player-self', emotions: [{ key: '情绪名', delta: 0, status: '变化后的状态含义', reason: '现实触发原因' }], playerFeelings: [{ key: '感觉名', delta: 0, status: '变化后的状态含义', reason: '现实触发原因' }] }, characterMetricUpdates: [{ target: '相关角色id或姓名', emotions: [{ key: '情绪名', delta: 0, status: '变化后的状态含义', reason: '该角色受本回合事件影响的原因' }], playerFeelings: [{ key: '感觉名', delta: 0, status: '该角色对玩家的新态度', reason: '该角色对玩家感觉变化或维持的具体证据' }] }], wechatActions: [{ action: 'sendIncomingNow/sendIncomingPast', contactId: '联系人id或角色id', text: '角色发给玩家的微信消息', timeIso: '过去消息必填ISO时间', reason: '思念触发原因' }], factionUpdates: [{ action: 'addFactionPosition', factionName: '势力名', position: '职位或地位', characterName: '角色名或未知', reason: '现实确认依据' }], itemActions: [{ action: 'add/transfer/delete/purchase/generate', target: 'player-self或角色id/姓名', from: '来源角色', to: '目标角色', itemName: '已有物品名', quantity: 1, item: { name: '物品名', kind: '物品或装备', price: 0, description: '说明' }, reason: '现实确认依据' }], lexiconUpdates: [{ worldTag: realWorld.label || '2026 现代都市现实世界', kind: '玩家设定/装备/物品/穿着/角色卡/角色技能', field: '角色卡字段名', name: '词条名或skills', value: '新值或对象', summary: '摘要', description: '说明', reason: '现实证据、触发行动、状态来源或动机' }] };
  },

  storyOutputSchema(store) {
    return { type: 'final', sceneTitle: '剧情场景标题', elapsedSeconds: 60, mood: '当前情绪', quest: '新的剧情目标', choices: ['可点击行动一', '可点击行动二', '可点击行动三', '可点击行动四'], mind: `${store.character?.name || '被操控者'}第一人称内心独白`, characterIntent: '被操控者当前意图', controlFeeling: '被上线感受', controlAdaptation: 0, controlExperienceSummary: '上线经历摘要', metricUpdates: { emotions: [{ key: '情绪名', delta: 0, status: '变化后的状态含义', reason: '剧情证据' }], playerFeelings: [{ key: '感觉名', delta: 0, status: '变化后的状态含义', reason: '剧情证据' }] }, statChanges: { health: 0, stamina: 0, mental_stability: 0 }, appearedCharacters: [{ name: '出场人物', role: '身份', detail: '本回合可确认事实', work: store.character?.work || '作品名', isMinor: false, importance: 'support' }], lexiconUpdates: [], genericUpdates: [], itemActions: [] };
  },

  async completeParsedStep(store, prompt, logId, streamToUi = false, allowProseFinal = false) {
    return await this.completeConfiguredParsedStep(store, prompt, logId, streamToUi, allowProseFinal, this.realConfig());
  },

  async completeConfiguredParsedStep(store, prompt, logId, streamToUi = false, allowProseFinal = false, config = this.realConfig()) {
    let lastRaw = '';
    let bestRaw = '';
    let lastErr = null;
    for (let i = 0; i < 2; i += 1) {
      lastRaw = await this.completeConfiguredStep(store, prompt, logId, streamToUi, config);
      if (this.fallbackScore(lastRaw) >= this.fallbackScore(bestRaw)) bestRaw = lastRaw;
      try {
        const data = this.parseStep(lastRaw, config);
        if (data || i === 1) return { raw: lastRaw, data: data || (allowProseFinal ? this.proseFinal(store, bestRaw || lastRaw) : null) };
        console.warn(`${config.label}格式不完整，自动重试一次`);
      } catch (err) {
        lastErr = err;
        if (!this.isRetryableParseError(err) || i === 1) break;
        console.warn(`${config.label}解析异常，自动重试一次:`, err.message);
      }
    }
    if (allowProseFinal) return { raw: bestRaw || lastRaw, data: this.proseFinal(store, bestRaw || lastRaw) };
    if (lastErr) throw lastErr;
    return { raw: lastRaw, data: null };
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
      characterMetricUpdates: Array.isArray(repaired.characterMetricUpdates) ? repaired.characterMetricUpdates : [],
      wechatActions: Array.isArray(repaired.wechatActions) ? repaired.wechatActions : [],
      factionUpdates: Array.isArray(repaired.factionUpdates) ? repaired.factionUpdates : [],
      itemActions: Array.isArray(repaired.itemActions) ? repaired.itemActions : [],
      lexiconUpdates: Array.isArray(repaired.lexiconUpdates) ? repaired.lexiconUpdates : [],
      genericUpdates: Array.isArray(repaired.genericUpdates) ? repaired.genericUpdates : [],
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
    const text = String(raw || '').trim();
    if (!text) return '';
    const sepAt = text.indexOf(this.finalSeparator);
    const prose = sepAt >= 0 ? text.slice(0, sepAt) : text;
    return prose.replace(/```[\s\S]*?```/g, '').trim();
  },

  async completeUpdateJson(store, prompt, logId) {
    return await this.completeConfiguredUpdateJson(store, prompt, logId, this.realConfig());
  },

  async completeConfiguredUpdateJson(store, prompt, logId, config = this.realConfig()) {
    let nextPrompt = prompt, lastErr = null;
    for (let i = 0; i < 3; i += 1) {
      const raw = await this.completeConfiguredStep(store, nextPrompt, logId, false, config);
      try { return this.parseCompleteUpdateJson(raw); }
      catch (err) {
        lastErr = err;
        if (i === 2) break;
        console.warn(`${config.label}更新 JSON 不完整，自动重试:`, err.message);
        nextPrompt = this.updateJsonRetryPrompt(prompt, raw, err);
      }
    }
    throw lastErr || new Error(`${config.label}更新 JSON 生成失败`);
  },

  parseCompleteUpdateJson(raw) {
    const text = String(raw || '').replace(/```(?:json)?|```/g, '').trim();
    if (window.GameModules.aiRequest?.outputTailLooksTruncated?.(text)) throw new Error('现实更新 JSON 疑似被截断');
    const extracted = window.GameModules.jsonUtils.extractJson(text);
    const data = JSON.parse(window.GameModules.jsonUtils.repairJson(extracted));
    if (!data || typeof data !== 'object') throw new Error('现实更新 JSON 不是对象');
    return data;
  },

  updateJsonRetryPrompt(prompt, raw, err) {
    return [
      prompt,
      '# 上次输出无效，必须重新完整输出',
      `错误：${err?.message || 'JSON不完整'}`,
      `上次输出尾部：${String(raw || '').slice(-800)}`,
      '请重新输出一个完整合法 JSON 对象。不要续写上次内容，不要 Markdown，不要省略结尾。',
    ].join('\n\n');
  },

  parseUpdateJson(raw) {
    return raw && typeof raw === 'object' ? raw : this.parseCompleteUpdateJson(raw);
  },

  mergeNarrationAndUpdates(store, narration, updates = {}) {
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
      choices: Array.isArray(updates.choices) && updates.choices.length ? updates.choices.slice(0, 4) : (store.realWorldChoices || ['观察手机异常', '处理现实事务', '联系熟人', '暂时休息']),
      vitalUpdates: Array.isArray(updates.vitalUpdates) ? updates.vitalUpdates : [],
      metricUpdates: updates.metricUpdates && typeof updates.metricUpdates === 'object' ? updates.metricUpdates : {},
      characterMetricUpdates: Array.isArray(updates.characterMetricUpdates) ? updates.characterMetricUpdates : [],
      wechatActions: Array.isArray(updates.wechatActions) ? updates.wechatActions : [],
      factionUpdates: Array.isArray(updates.factionUpdates) ? updates.factionUpdates : [],
      itemActions: Array.isArray(updates.itemActions) ? updates.itemActions : [],
      lexiconUpdates: Array.isArray(updates.lexiconUpdates) ? updates.lexiconUpdates : [],
      genericUpdates: Array.isArray(updates.genericUpdates) ? updates.genericUpdates : [],
      initUpdates: Array.isArray(updates.initUpdates) ? updates.initUpdates : [],
    };
  },

  mergeStoryNarrationAndUpdates(store, narration, updates = {}) {
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
      appearedCharacters: Array.isArray(updates.appearedCharacters) ? updates.appearedCharacters.slice(0, 6).map((x) => window.GameModules.ai.normalizeCharacter(x, store)).filter(Boolean) : [],
      statChanges: { health: window.GameModules.ai.clampVitalDelta?.(updates.statChanges?.health) || 0, stamina: window.GameModules.ai.clampVitalDelta?.(updates.statChanges?.stamina) || 0, mental_stability: window.GameModules.ai.clampVitalDelta?.(updates.statChanges?.mental_stability) || 0 },
      combatEvent: window.GameModules.ai.normalizeCombatEvent?.(updates.combatEvent) || null,
      lexiconUpdates: window.GameModules.ai.normalizeLexiconUpdates?.(updates.lexiconUpdates, store) || [],
      genericUpdates: window.GameModules.updateRegistry?.normalizeUpdates?.(updates, store) || (Array.isArray(updates.genericUpdates) ? updates.genericUpdates.slice(0, 80) : []),
      itemActions: Array.isArray(updates.itemActions) ? updates.itemActions.slice(0, 20) : [],
    };
  },

  cleanPhasedNarration(raw) {
    return String(raw || '').replace(/```[\s\S]*?```/g, '').replace(this.finalSeparator, '').trim();
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
    for (let i = 0; i < 3 && (this.chineseCharCount(text) < 2000 || this.narrationTailLooksIncomplete(text)); i += 1) {
      this.markConfiguredStep(store, logId, `正文${this.chineseCharCount(text) < 2000 ? '不足2000字' : '尾部不完整'}，正在自动补足细节…`, config, { keepNarration: true });
      const supplementPrompt = [
        `# ${config.label}阶段2补写：只补足正文`,
        '你只输出续写正文，不要 JSON，不要 Markdown，不要标题。',
        `本次行动：${action || (config.mode === 'story' ? '继续推进操控剧情' : '继续观察现实世界')}`,
        `原阶段2提示：\n${String(prompt || '').slice(0, 5000)}`,
        `已有正文（不要重写，不要摘要，只从末尾自然续写）：\n${text}`,
        `当前已有中文汉字约${this.chineseCharCount(text)}个；请从上一句末尾自然续写，补足直接过程、环境细节、人物反应和结果落点，使合并后至少2000个中文汉字，并以完整句子结束。`,
      ].join('\n\n');
      const extraRaw = await this.completeConfiguredStep(store, supplementPrompt, logId, false, config);
      const extra = this.cleanPhasedNarration(extraRaw);
      if (!extra) break;
      text = this.cleanPhasedNarration(`${text}\n\n${extra}`);
    }
    if (this.chineseCharCount(text) < 2000 || this.narrationTailLooksIncomplete(text)) throw new Error(`${config.label}正文疑似被截断`);
    return text;
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
      return await window.GameModules.aiRequest.complete({
        source: streamToUi ? (config.mode === 'story' ? 'story-agent-engine' : 'real-world-engine') : `${config.mode}-agent-context`,
        model: store.modelId,
        prompt,
        timeoutMs: 240000,
        requireDone: true,
        maxTokens: 3000,
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
      });
    } catch (err) {
      console.warn(`${config.label} Loop Agent 请求未完成，拒绝使用未完成内容:`, { code: err.code, message: err.message, doneSeen, length: buffer.length, stack: err.stack });
      throw err;
    }
  },

  parseStep(raw, config = this.realConfig()) {
    try {
      const text = String(raw || '');
      const sepAt = text.indexOf(this.finalSeparator);
      const jsonRaw = sepAt >= 0 ? text.slice(sepAt + this.finalSeparator.length).trim() : text;
      if (sepAt >= 0 && !jsonRaw) throw new Error(`${config.label} final 分隔符后缺少 JSON`);
      if (window.GameModules.aiRequest?.outputTailLooksTruncated?.(jsonRaw)) throw new Error(`${config.label}返回疑似被截断`);
      const data = window.GameModules.jsonUtils.parseLoose(jsonRaw);
      if (!data || typeof data !== 'object') return null;
      const type = String(data.type || '').trim();
      if (type !== 'request_context' && type !== 'context_done' && type !== 'final') return null;
      if (type === 'final' && sepAt >= 0) {
        data.narration = text.slice(0, sepAt).trim() || data.narration || '';
        if (!data.narration) throw new Error(`${config.label} final 缺少正文`);
      }
      data.requests = Array.isArray(data.requests) ? data.requests.slice(0, 3) : [];
      data.characters = Array.isArray(data.characters) ? data.characters.slice(0, 8) : [];
      return data;
    } catch (err) {
      console.warn(`${config.label} Loop Agent 步骤解析失败:`, err.message);
      if (this.isRetryableParseError(err)) throw err;
      return null;
    }
  },

  isRetryableParseError(err) {
    return ['截断', '分隔符后缺少 JSON', '缺少正文', 'JSON missing'].some((text) => String(err?.message || '').includes(text));
  },
  traceItem(step, data, raw, ctx = window.GameModules.realWorldAgentContext) {
    return { step, type: data?.type || 'parse_failed', thinking: data?.thinking || '', reason: data?.reason || '', characters: data?.characters || [], requests: data?.requests || [], raw: ctx.limit(raw, 1200), loaded: [] };
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
    store.realWorldLog = (store.realWorldLog || []).map((entry) => entry.id === logId ? { ...entry, agentTrace: trace.slice(), streaming: true } : entry);
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
    store.realWorldLog = (store.realWorldLog || []).map((entry) => entry.id === logId ? { ...entry, narration, streaming: true, streamTrace: [] } : entry);
    store.scrollRealWorldLogBottom?.();
  },
  markStep(store, logId, text, options = {}) {
    this.markConfiguredStep(store, logId, text, this.realConfig(), options);
  },
  markConfiguredStep(store, logId, text, config = this.realConfig(), options = {}) {
    if (!logId) return;
    if (config.mode === 'story') {
      const patch = { streaming: true, statusText: text };
      if (!options.keepNarration) patch.storyText = text;
      store.updateNovelEntry?.(logId, patch);
      return;
    }
    store.realWorldLog = (store.realWorldLog || []).map((entry) => {
      if (entry.id !== logId) return entry;
      const patch = { streaming: true, statusText: text };
      if (!options.keepNarration) patch.narration = text;
      return { ...entry, ...patch };
    });
    store.scrollRealWorldLogBottom?.();
  },
  loadedContextText(data = {}, loaded = [], step = 1, config = this.realConfig()) {
    const fallback = config.mode === 'story' ? '被操控角色' : '玩家本人';
    const chars = (data.characters || []).map((item) => item.name || item.id || item).filter(Boolean).join('、') || fallback;
    const titles = loaded.map((item) => item.title).join('、') || '角色记忆';
    return `${step === 1 ? '已识别相关角色' : '已追加资料'}：${chars}；已载入${titles}${data.reason ? `：${data.reason}` : ''}`;
  },
};
