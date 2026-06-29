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

      if (data.type === 'request_context' && step < this.maxSteps) continue;
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

    let skillPrompt = '', jsonPrompt = '', selectedSkills = {}, jsonRaw = '', updates = {};
    try {
      const participants = this.stageParticipants(trace, loaded, store);
      skillPrompt = await this.buildConfiguredStage3BasePrompt({ store, action, base, loaded, materialSession, narration, trace, participants, config });
      this.markConfiguredStep(store, logId, `${config.label}正文已完成，正在生成基础结算字段…`, config, { keepNarration: true });
      selectedSkills = await this.completeConfiguredStage3Base(store, skillPrompt, logId, config);

      jsonPrompt = JSON.stringify(selectedSkills);
      this.markConfiguredStep(store, logId, '基础字段已生成，正在执行全量状态更新…', config, { keepNarration: true });
      updates = await this.completeGroupedStage3Updates({ store, action, base, loaded, skills, materialSession, narration, route: selectedSkills, logId, config, trace, participants });
      jsonRaw = JSON.stringify(updates);
    } catch (err) {
      console.warn(`${config.label}状态更新生成失败，保留已生成正文并使用最小结算:`, err.message);
      updates = this.fallbackUpdateJson(store, action, config);
      jsonRaw = JSON.stringify(updates);
    }
    const result = config.mode === 'story' ? this.mergeStoryNarrationAndUpdates(store, narration, updates, config) : this.mergeNarrationAndUpdates(store, narration, updates, config);
    return { result, prompt: `---NARRATION---\n${narrationPrompt}\n\n---STAGE3_BASE---\n${skillPrompt}\n\n---UPDATE_JSON---\n${jsonPrompt}`, loaded, raw: `${narrationRaw}\n\n${JSON.stringify(selectedSkills)}\n\n${jsonRaw}`, trace };
  },

  async loadStepContext(ctx, store, action, data, loadedKeys, loaded, memoryIds, step, materialSession = null, materials = window.GameModules.realWorldMaterials) {
    const out = [];
    if (data.type === 'request_context') {
      const autoLoaded = await ctx.autoLoadForStep?.(store, action, loadedKeys, materialSession, materials, memoryIds, step, loaded, out) || [];
      out.push(...autoLoaded);
      const requestList = Array.isArray(data.requests) && data.requests.length ? data.requests : (Array.isArray(data.needed) ? data.needed : []);
      const requested = await ctx.loadRequests(store, action, requestList, loadedKeys, materialSession, materials, memoryIds, loaded, out);
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
    const actionText = this.actionText(action, config.mode === 'story' ? '继续推进操控剧情' : '继续观察现实世界');
    const outputJson = JSON.stringify(config.mode === 'story' ? this.storyOutputSchema(store) : this.outputSchema(store));
    const loadedText = config.ctx.buildLoadedText(loaded);
    const materialText = config.materials?.summary?.(materialSession, { step }) || '';
    const vars = {
      基础上下文: base,
      动态载入资料: [loadedText, materialText].filter(Boolean).join('\n\n'),
      本次行动: actionText,
      当前步骤: forceFinal ? '收敛/final' : `${step}/${this.maxSteps}`,
      最大步骤: this.maxSteps,
      动态Skills: skills,
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
    if (forceFinal) return `当前为收敛步骤：禁止继续请求资料。第一个字符必须是 {，只返回 {"type":"context_done","reason":"资料已足够"}。禁止正文、旁白、Markdown、代码块和 final JSON。${this.compactReturnRule('JSON')}`;
    if (step === 1) return `当前是第1步：你是上下文路由器，只判断为了准确生成本次行动范围内正文需要载入哪些已有资料或补全哪些缺失上下文。只允许返回一个合法 JSON 对象，type 必须是 request_context；必须包含 participants、needed、missingContext、reason。participants 需识别玩家、直接互动对象、旁观者、被提及但未参与对象。needed 只列正文生成前必须载入或补全的最小资料。missingContext 必须是 boolean，表示是否仍缺少无法通过资料加载补全但会影响正文的上下文。requests 仅为兼容旧模板可选；如返回 requests 必须与 needed 一致或更窄。不要写正文，不要结算状态，不要推演后续结果，不要创造未知设定。第一个字符必须是 {。${this.compactReturnRule('JSON')}`;
    if (step >= 3) return `当前是软收敛步骤：只允许返回一个合法 JSON 对象，type 只能是 request_context 或 context_done；第一个字符必须是 {。只有缺失资料会直接改变本次行动结果、人物反应、地点/物品/旧事实判定时，才允许 request_context；衣着细节、氛围、情绪微调、背景补全、重复确认、无效 skill 替代查询都必须 context_done。禁止正文、旁白、Markdown、代码块和 final JSON。${this.compactReturnRule('JSON')}`;
    return `当前只负责判断是否继续收集资料：只允许返回一个合法 JSON 对象，type 只能是 request_context 或 context_done；第一个字符必须是 {。仍缺关键资料就返回 request_context；资料足够或无法继续获取时返回 {"type":"context_done","reason":"资料已足够"}。禁止正文、旁白、Markdown、代码块和 final JSON。${this.compactReturnRule('JSON')}`;
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

  async buildConfiguredNarrationPrompt({ store, action, base, loaded, skills, materialSession = null, config = this.realConfig() }) {
    const actionText = this.actionText(action, config.mode === 'story' ? '继续推进操控剧情' : '继续观察现实世界');
    const loadedText = config.ctx.buildLoadedText(loaded);
    const materialText = config.materials?.acquiredSummary?.(materialSession) || '';
    const writingStyle = store.selectedWritingStylePrompt?.() || store.writingStylePrompt?.() || '正文采用小说文风，重视画面、动作、感官和心理反应，避免复述玩家指令。';
    const unverifiedClaimRule = '未证实自称降级规则（最高优先级）：玩家单句自称、玩笑、夸张或幻想表达在基础上下文、最近世界线和已载入资料没有明确证据时，不能承认为真实身份、真实职位、真实势力或真实世界观；正文只能把它写成“自称/玩笑/疑似角色扮演/待验证说法”，其他人物按性格表现怀疑、调侃、困惑、追问或无视，不得配合承认。';
    if (config.mode === 'story') return [
      '# 操控剧情阶段2：只生成玩家可见正文',
      '你只输出操控剧情正文，不要 JSON，不要 Markdown，不要标题，不要分隔符。',
      `本次行动：${actionText}`,
      this.continuityFallbackRule(),
      `小说笔风：${writingStyle}`,
      `推演自由度：${this.storyFreedomRule(store)}`,
      `基础上下文：\n${base}`,
      `已动态载入资料：\n${[loadedText, materialText].filter(Boolean).join('\n\n') || '无'}`,
      unverifiedClaimRule,
      '最终正文要求（最高优先级）：严格承接基础上下文、最近世界线与已动态载入资料，不改写已发生事实，不新增无证据的身份、关系、地点或原作设定；资料缺口只能做克制的当场合理推演，并保持不确定性。使用第二人称“你”称呼玩家；玩家不是角色本人，而是操控/影响被操控者行动的存在；正文必须写出本次行动的动作过程、环境变化、其他人物反应、被操控者身体与心理张力、直接结果；行动范围内充分推演：必须覆盖本次输入行动的直接动作过程与短期连锁影响，但不把亲吻、抚摸、摩擦、按住等行为自动扩展为脱衣、转移地点、插入、高潮等未输入的新阶段；正文目标1000-1300个中文汉字；不要替玩家完成后续行动，不要越过本次行动给出长期结局。' + this.compactReturnRule('prose'),
    ].join('\n\n');
    return [
      '# 现实推演阶段2：只生成玩家可见正文',
      '你只输出现实推演正文，不要 JSON，不要 Markdown，不要标题，不要分隔符。',
      `本次行动：${actionText}`,
      this.continuityFallbackRule(),
      `小说笔风：${writingStyle}`,
      `推演自由度：${store.realWorldFreedomRule?.() || '只推演玩家本次输入行动自然抵达的直接结果。'}`,
      ...(store.sharedControlState?.() ? ['同世界附身控制规则：玩家与被链接角色处于同一现实世界时，进入现实同世界附身控制；玩家意识附身接管被控角色身体，能直接控制其动作、视线、表情、触觉、嗅觉、味觉、听觉、身体反应与局部行动；玩家现实本体仍由同一个意识维持控制，属于一心多用。正文必须以第二人称“你”的附身镜头为主，着重描写被控角色身体内视角、动作执行、感官回流、心理/身体张力和外界反应；同时保留玩家本体仍可行动的事实。不要写成单纯远程共享感官、旁观监控或玩家完全离开自己身体；不要让同一角色在两个地点同时出现。'] : []),
      `基础上下文：\n${base}`,
      `已动态载入资料：\n${[loadedText, materialText].filter(Boolean).join('\n\n') || '无'}`,
      unverifiedClaimRule,
      '最终正文要求（最高优先级）：严格承接基础上下文、最近世界线与已动态载入资料，不改写已发生事实，不新增无证据的身份、关系、地点或现实背景；资料缺口只能做克制的当场合理推演，并保持不确定性。使用第二人称“你”；正文必须在行动范围内充分推演，写出本次行动的动作过程、身体感受、周围环境变化、可见细节、他人反应、对话回应和直接短期连锁影响。禁止越界：不替玩家执行下一步新行动；不把亲吻、抚摸、摩擦、按住等行为自动扩展为脱衣、转移地点、插入、高潮等未输入的新阶段；不为了字数推进新剧情或新性行为阶段。正文目标900-1200个中文汉字；不要越过本次行动给出长期结局。' + this.compactReturnRule('prose'),
    ].join('\n\n');
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
      `本回合参与者:${JSON.stringify(stageParticipants)}`,
      `阶段2正文:${this.compactUpdatePromptText(narration, 1800, true)}`,
      `返回示例:${JSON.stringify(schema)}`,
    ].filter(Boolean).join('\n');
  },

  stageParticipants(trace = [], loaded = [], store = null) {
    const seen = new Set();
    const out = [];
    const add = (p = {}) => {
      if (out.length >= 12) return;
      const target = p?.id || p?.idOrName || p?.name;
      if (!target) return;
      const key = `${p.type || ''}:${target}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push(p);
    };
    (Array.isArray(trace) ? trace : []).forEach((item) => {
      (Array.isArray(item?.participants) ? item.participants : []).forEach(add);
      this.characterParticipants(item?.characters, store).forEach(add);
    });
    this.loadedRoleCardParticipants(loaded).forEach(add);
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

  defaultStage3UpdateGroups() {
    return Object.fromEntries(Object.entries(this.stage3UpdateGroups())
      .filter(([, group]) => !group.init)
      .map(([key, group]) => [key, Array.isArray(group.skills) ? group.skills.slice() : []]));
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
    ['sceneTitle', 'locationName', 'status', 'quest', 'elapsedSeconds', 'choices'].forEach((key) => {
      if (route[key] !== undefined && route[key] !== null && route[key] !== '') merged[key] = route[key];
    });
    (Array.isArray(patches) ? patches : []).forEach((patch) => {
      if (!patch || typeof patch !== 'object') return;
      if (Array.isArray(patch.genericUpdates)) merged.genericUpdates.push(...patch.genericUpdates);
      this.legacyWorldArrayKeys().forEach((key) => {
        if (Array.isArray(patch[key])) merged[key] = (merged[key] || []).concat(patch[key]);
      });
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

  async completeParsedStep(store, prompt, logId, streamToUi = false, allowProseFinal = false) {
    return await this.completeConfiguredParsedStep(store, prompt, logId, streamToUi, allowProseFinal, this.realConfig());
  },

  async completeConfiguredParsedStep(store, prompt, logId, streamToUi = false, allowProseFinal = false, config = this.realConfig(), allowContextDoneOnProse = false) {
    let lastRaw = '';
    let bestRaw = '';
    let lastErr = null;
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
        if (allowContextDoneOnProse && this.looksLikeProseInsteadOfStepJson(lastRaw)) {
          console.warn(`${config.label}资料阶段解析到正文内容，视为资料已足够并进入正文阶段。`);
          return { raw: lastRaw, data: this.contextDoneFromProse(lastRaw) };
        }
        if (!this.isRetryableParseError(err) || i === 1) break;
        console.warn(`${config.label}解析异常，自动重试一次:`, err.message);
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

  parseStep(raw, config = this.realConfig()) {
    try {
      const text = this.compactAiReturn(raw);
      const sepAt = text.indexOf(this.finalSeparator);
      const jsonRaw = this.compactJsonReturn(sepAt >= 0 ? text.slice(sepAt + this.finalSeparator.length) : text);
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
      data.needed = Array.isArray(data.needed) ? data.needed.slice(0, 12) : [];
      const requests = Array.isArray(data.requests) ? data.requests.slice(0, 3) : [];
      data.requests = requests.length ? requests : data.needed.slice(0, 3);
      data.characters = Array.isArray(data.characters) ? data.characters.slice(0, 8) : [];
      data.participants = Array.isArray(data.participants) ? data.participants.slice(0, 12).map((item) => {
        if (typeof item === 'string') return { type: 'character', idOrName: item, name: item, role: 'mentioned' };
        return {
          type: String(item?.type || 'character').slice(0, 20),
          id: item?.id ? String(item.id).slice(0, 80) : undefined,
          idOrName: item?.idOrName ? String(item.idOrName).slice(0, 80) : undefined,
          name: String(item?.name || item?.id || item?.idOrName || '').slice(0, 80),
          role: String(item?.role || 'mentioned').slice(0, 40),
        };
      }).filter((item) => item.name || item.id || item.idOrName) : [];
      data.missingContext = typeof data.missingContext === 'boolean' ? data.missingContext : (Array.isArray(data.missingContext) ? data.missingContext.length > 0 : Boolean(data.missingContext));
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
    const limiter = typeof ctx?.limit === 'function' ? ctx.limit.bind(ctx) : (text, max = 1200) => String(text || '').slice(0, max);
    return { step, type: data?.type || 'parse_failed', thinking: data?.thinking || '', reason: data?.reason || '', characters: data?.characters || [], participants: data?.participants || [], requests: data?.requests || [], needed: data?.needed || [], missingContext: data?.missingContext ?? false, raw: limiter(raw, 1200), loaded: [] };
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
