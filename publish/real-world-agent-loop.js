window.GameModules = window.GameModules || {};

window.GameModules.realWorldAgentLoop = {
  finalSeparator: '<!--REAL_WORLD_JSON-->',
  minSteps: 2,
  maxSteps: 8,

  async run(store, action, logId = null) {
    const ctx = window.GameModules.realWorldAgentContext;
    const loaded = [];
    const trace = [];
    const loadedKeys = new Set();
    const memoryIds = new Set();
    const skills = await ctx.skillText();
    const base = ctx.baseSnapshot(store, action);
    const materialSession = window.GameModules.realWorldMaterials?.createSession?.(action) || null;
    let lastPrompt = '';
    let lastRaw = '';

    for (let step = 1; step <= this.maxSteps; step += 1) {
      const prompt = await this.buildPrompt({ store, action, base, loaded, skills, step, materialSession });
      lastPrompt = prompt;
      this.markStep(store, logId, this.stepText(step));
      const raw = await this.completeParsedStep(store, prompt, logId, true, false);
      lastRaw = raw.raw;
      const data = raw.data;
      if (!data) throw new Error('现实推演返回格式错误');
      const traceItem = this.traceItem(step, data, raw.raw);
      trace.push(traceItem);

      const results = await this.loadStepContext(ctx, store, action, data, loadedKeys, loaded, memoryIds, step, materialSession);
      traceItem.loaded = results.map((item) => ({ title: item.title, text: ctx.limit(item.text, 800) }));
      this.updateAgentTrace(store, logId, trace);
      if (results.length) {
        loaded.push(...results);
        this.markStep(store, logId, this.loadedContextText(data, results, step));
      }

      if (data.type === 'request_context' && results.length && step < this.maxSteps) continue;
      if (step < this.minSteps && data.type !== 'context_done') continue;
      break;
    }
    return await this.generatePhasedFinal({ store, action, base, loaded, skills, trace, materialSession, logId, prompt: lastPrompt, raw: lastRaw });
  },

  async generatePhasedFinal({ store, action, base, loaded, skills, trace, materialSession, logId }) {
    const narrationPrompt = await this.buildNarrationPrompt({ store, action, base, loaded, skills, materialSession });
    this.markStep(store, logId, '现实资料已足够，正在生成正文…');
    const narrationRaw = await this.completeStep(store, narrationPrompt, logId, true);
    const narration = this.cleanPhasedNarration(narrationRaw);
    if (!narration) throw new Error('现实推演正文为空');
    this.showFinalNarration(store, logId, narration);

    const skillPrompt = await this.buildSkillSelectionPrompt({ store, action, base, loaded, materialSession, narration });
    this.markStep(store, logId, '现实正文已完成，正在判断需要结算的 Skills…', { keepNarration: true });
    const selectedSkills = await this.completeSkillSelection(store, skillPrompt, logId);

    const jsonPrompt = await this.buildUpdateJsonPrompt({ store, action, base, loaded, skills, materialSession, narration, selectedSkills });
    this.markStep(store, logId, '已选定结算 Skills，正在生成状态更新…', { keepNarration: true });
    const jsonRaw = await this.completeUpdateJson(store, jsonPrompt, logId);
    const updates = this.parseUpdateJson(jsonRaw) || {};
    const result = this.mergeNarrationAndUpdates(store, narration, updates);
    return { result, prompt: `---NARRATION---\n${narrationPrompt}\n\n---SKILL_SELECTION---\n${skillPrompt}\n\n---UPDATE_JSON---\n${jsonPrompt}`, loaded, raw: `${narrationRaw}\n\n${JSON.stringify(selectedSkills)}\n\n${jsonRaw}`, trace };
  },

  async loadStepContext(ctx, store, action, data, loadedKeys, loaded, memoryIds, step, materialSession = null) {
    const out = [];
    if (data.type === 'request_context') {
      const requested = await ctx.loadRequests(store, action, data.requests || [], loadedKeys, materialSession);
      out.push(...requested);
    }
    const locationItem = await ctx.actionLocationForStep?.(store, action, data.characters || data.relatedCharacters || [], data.reason || '', loadedKeys);
    if (locationItem?.text) {
      window.GameModules.realWorldMaterials?.record?.(materialSession, { skill: 'realworld.location.query', method: 'searchLocation', params: { keyword: 'autoCharacterRoute' } }, locationItem.title, locationItem.text);
      out.push(locationItem);
    }
    const memoryItem = ctx.characterMemoriesForStep?.(store, action, data.characters || data.relatedCharacters || [], [...loaded, ...out], memoryIds, step === 1);
    if (memoryItem?.text) {
      (memoryItem.ids || []).forEach((id) => memoryIds.add(id));
      window.GameModules.realWorldMaterials?.record?.(materialSession, { skill: 'memory.query', method: 'searchCharacterMemory', params: { keyword: 'characterMemoriesForStep' } }, memoryItem.title, memoryItem.text);
      out.push(memoryItem);
    }
    return out;
  },

  async buildPrompt({ store, action, base, loaded, skills, step, materialSession = null, forceFinal = false }) {
    const outputJson = JSON.stringify(this.outputSchema(store));
    const loadedText = window.GameModules.realWorldAgentContext.buildLoadedText(loaded);
    const materialText = window.GameModules.realWorldMaterials?.summary?.(materialSession) || '';
    const vars = {
      基础上下文: base,
      动态载入资料: [loadedText, materialText].filter(Boolean).join('\n\n'),
      本次行动: action || '继续观察现实世界',
      当前步骤: forceFinal ? '收敛/final' : `${step}/${this.maxSteps}`,
      最大步骤: this.maxSteps,
      动态Skills: skills,
      小说笔风: store.writingStylePrompt?.() || '正文采用小说文风，重视画面、动作、感官和心理反应，避免复述玩家指令。',
      推演自由度规则: store.realWorldFreedomRule?.() || '推演自由度：行动范围内。只推演玩家本次输入行动自然抵达的直接结果。',
      当前步骤输出要求: this.stepOutputRule(step, forceFinal),
      输出示例: outputJson,
    };
    const basePrompt = await window.GameModules.promptTemplates.render('real-world-engine', vars);
    return step !== 1 || forceFinal ? basePrompt : `${basePrompt}\n\n${await window.GameModules.promptTemplates.render('real-world-engine-first', vars)}`;
  },

  stepOutputRule(step, forceFinal = false) {
    if (forceFinal) return '当前为收敛步骤：禁止继续请求资料，只返回 {"type":"context_done","reason":"资料已足够"}。';
    if (step === 1) return '当前是第1步：必须返回 request_context，用于识别相关角色与必要资料。';
    return '当前只负责判断是否继续收集资料：仍缺关键资料就返回 request_context；资料足够或无法继续获取时返回 {"type":"context_done","reason":"资料已足够"}。不要输出正文，不要输出 final JSON。';
  },

  async buildNarrationPrompt({ store, action, base, loaded, skills, materialSession = null }) {
    const loadedText = window.GameModules.realWorldAgentContext.buildLoadedText(loaded);
    const materialText = window.GameModules.realWorldMaterials?.acquiredSummary?.(materialSession) || '';
    return [
      '# 现实推演阶段2：只生成玩家可见正文',
      '你只输出现实推演正文，不要 JSON，不要 Markdown，不要标题，不要分隔符。',
      `本次行动：${action || '继续观察现实世界'}`,
      `小说笔风：${store.writingStylePrompt?.() || '正文采用小说文风，重视画面、动作、感官和心理反应，避免复述玩家指令。'}`,
      `推演自由度：${store.realWorldFreedomRule?.() || '只推演玩家本次输入行动自然抵达的直接结果。'}`,
      `基础上下文：\n${base}`,
      `已动态载入资料：\n${[loadedText, materialText].filter(Boolean).join('\n\n') || '无'}`,
      '要求：使用第二人称“你”；写出行动过程、环境变化、人物反应和直接结果；不要替玩家完成后续行动；正文建议1000-2600字。',
    ].join('\n\n');
  },

  async buildSkillSelectionPrompt({ store, action, base, loaded, materialSession = null, narration }) {
    const loadedText = window.GameModules.realWorldAgentContext.buildLoadedText(loaded);
    const materialText = window.GameModules.realWorldMaterials?.summary?.(materialSession) || '';
    const updateSkills = window.GameModules.updateRegistry?.skillSummaries?.() || '';
    const initSkills = window.GameModules.initPromptRegistry?.skillSummaries?.(store) || '';
    return [
      '# 现实推演阶段3A：选择需要结算的 Skills',
      '你只输出合法 JSON，不要正文，不要 Markdown，不要代码块，不要解释。',
      `本次行动：${action || '继续观察现实世界'}`,
      `基础上下文：\n${base}`,
      `已动态载入资料：\n${[loadedText, materialText].filter(Boolean).join('\n\n') || '无'}`,
      `阶段2正文：\n${narration}`,
      updateSkills ? `## 更新 Skills 元数据\n\n${updateSkills}` : '',
      initSkills ? `## 初始化 Skills 元数据\n\n${initSkills}` : '',
      '根据正文中已经确认的事实，选择后续生成更新 JSON 必须用到的 skills。只选需要更改数值、描述、状态或记录的 skills；无变化不要选择。',
      '返回格式：{"updateSkills":["skill-name"],"initSkills":["skill-name"],"reason":"选择依据"}',
    ].filter(Boolean).join('\n\n');
  },

  async completeSkillSelection(store, prompt, logId) {
    const raw = await this.completeStep(store, prompt, logId, false);
    try {
      const data = window.GameModules.jsonUtils.parseLoose(raw) || {};
      return { updateSkills: Array.isArray(data.updateSkills) ? data.updateSkills.slice(0, 12) : [], initSkills: Array.isArray(data.initSkills) ? data.initSkills.slice(0, 8) : [], reason: String(data.reason || '').slice(0, 160) };
    } catch (err) {
      console.warn('现实结算 Skills 选择解析失败:', err.message);
      return { updateSkills: [], initSkills: [], reason: '选择解析失败，使用基础结算。' };
    }
  },

  async buildUpdateJsonPrompt({ store, action, base, loaded, skills, materialSession = null, narration, selectedSkills = {} }) {
    const loadedText = window.GameModules.realWorldAgentContext.buildLoadedText(loaded);
    const materialText = window.GameModules.realWorldMaterials?.summary?.(materialSession) || '';
    const updateSkillText = window.GameModules.updateRegistry?.skillText?.(selectedSkills.updateSkills || []) || '';
    const updateSchema = window.GameModules.updateRegistry?.schemaFor?.(selectedSkills.updateSkills || []) || {};
    const initSkillText = window.GameModules.initPromptRegistry?.skillText?.(selectedSkills.initSkills || [], store) || '';
    const initSchema = window.GameModules.initPromptRegistry?.schema?.(selectedSkills.initSkills || [], store) || {};
    return [
      '# 现实推演阶段3B：只生成更新JSON',
      '你只输出一个合法 JSON 对象，不要正文，不要 Markdown，不要代码块，不要解释。',
      `本次行动：${action || '继续观察现实世界'}`,
      `基础上下文：\n${base}`,
      `已动态载入资料：\n${[loadedText, materialText].filter(Boolean).join('\n\n') || '无'}`,
      `阶段2正文：\n${narration}`,
      `已选择更新 Skills：${JSON.stringify(selectedSkills.updateSkills || [])}`,
      `已选择初始化 Skills：${JSON.stringify(selectedSkills.initSkills || [])}`,
      '输出最小补丁 JSON：必须包含 type、sceneTitle、locationName、elapsedSeconds、status、quest、choices、vitalUpdates。其他字段只有明确变化才输出，否则省略或用空数组。',
      'vitalUpdates 必须覆盖 stamina_pool、satiety、hydration、fatigue、mental_stability。choices 必须4个。所有 reason/status 不超过24个汉字。characterMetricUpdates 最多3个角色，每个角色最多2条 emotions 和2条 playerFeelings。lexiconUpdates/itemActions/factionUpdates 只写稳定事实变化。',
      updateSkillText ? `## 更新 Skills\n\n${updateSkillText}` : '',
      initSkillText ? `## 初始化 Skills\n\n${initSkillText}` : '',
      `最小示例：${JSON.stringify({ ...this.updateJsonSchema(), ...updateSchema, ...initSchema })}`,
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

  outputSchema(store) {
    const realWorld = window.GameModules.realWorld2026 || {};
    return { type: 'final', sceneTitle: '现实场景标题', locationName: '具体地点名', parentLocationName: '上级地点名', locationDescription: '当前地点本次新认识的事实', mapNodes: [{ name: '子地点名', parentName: '上级地点名', descriptionFacts: ['玩家已知地点事实'] }], newLocations: [{ name: '新增地点名', parentName: '', descriptionFacts: ['玩家已知事实'] }], locationDescriptionUpdates: [{ locationName: '地点名', action: 'add', text: '新增或更新的玩家已知事实' }], elapsedSeconds: 60, status: '现实状态简述', quest: '新的现实目标', choices: ['处理现实事务', '联系某个人', '观察周围', '暂时休息'], vitalUpdates: [{ key: 'stamina_pool', delta: -1, reason: '本次行动消耗少量精力。' }, { key: 'satiety', delta: 0, reason: '本次行动时间较短，饱食度基本不变。' }, { key: 'hydration', delta: 0, reason: '本次行动时间较短，水分基本不变。' }, { key: 'fatigue', delta: 1, reason: '持续行动带来轻微疲劳。' }, { key: 'mental_stability', delta: 0, reason: '本次行动没有直接冲击精神稳定。' }], metricUpdates: { target: 'player-self', emotions: [{ key: '情绪名', delta: 0, status: '变化后的状态含义', reason: '现实触发原因' }], playerFeelings: [{ key: '感觉名', delta: 0, status: '变化后的状态含义', reason: '现实触发原因' }] }, characterMetricUpdates: [{ target: '相关角色id或姓名', emotions: [{ key: '情绪名', delta: 0, status: '变化后的状态含义', reason: '该角色受本回合事件影响的原因' }], playerFeelings: [{ key: '感觉名', delta: 0, status: '该角色对玩家的新态度', reason: '该角色对玩家感觉变化或维持的具体证据' }] }], wechatActions: [{ action: 'sendIncomingNow/sendIncomingPast', contactId: '联系人id或角色id', text: '角色发给玩家的微信消息', timeIso: '过去消息必填ISO时间', reason: '思念触发原因' }], factionUpdates: [{ action: 'addFactionPosition', factionName: '势力名', position: '职位或地位', characterName: '角色名或未知', reason: '现实确认依据' }], itemActions: [{ action: 'add/transfer/delete/purchase/generate', target: 'player-self或角色id/姓名', from: '来源角色', to: '目标角色', itemName: '已有物品名', quantity: 1, item: { name: '物品名', kind: '物品或装备', price: 0, description: '说明' }, reason: '现实确认依据' }], lexiconUpdates: [{ worldTag: realWorld.label || '2026 现代都市现实世界', kind: '玩家设定/装备/物品/穿着/角色卡/角色技能', field: '角色卡字段名', name: '词条名或skills', value: '新值或对象', summary: '摘要', description: '说明', reason: '现实证据、触发行动、状态来源或动机' }] };
  },

  async completeParsedStep(store, prompt, logId, streamToUi = false, allowProseFinal = false) {
    let lastRaw = '';
    let bestRaw = '';
    let lastErr = null;
    for (let i = 0; i < 2; i += 1) {
      lastRaw = await this.completeStep(store, prompt, logId, streamToUi);
      if (this.fallbackScore(lastRaw) >= this.fallbackScore(bestRaw)) bestRaw = lastRaw;
      try {
        const data = this.parseStep(lastRaw);
        if (data || i === 1) return { raw: lastRaw, data: data || (allowProseFinal ? this.proseFinal(store, bestRaw || lastRaw) : null) };
        console.warn('现实推演格式不完整，自动重试一次');
      } catch (err) {
        lastErr = err;
        if (!this.isRetryableParseError(err) || i === 1) break;
        console.warn('现实推演解析异常，自动重试一次:', err.message);
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
    if (!jsonRaw) return null;
    try { return window.GameModules.jsonUtils.parseLoose(jsonRaw); }
    catch (_) { return this.repairTruncatedJsonObject(jsonRaw); }
  },

  repairTruncatedJsonObject(jsonRaw) {
    const text = String(jsonRaw || '').trim();
    const start = text.indexOf('{');
    if (start < 0) return null;
    let out = text.slice(start), inString = false, escaped = false, stack = [];
    for (let i = 0; i < out.length; i += 1) {
      const ch = out[i];
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{' || ch === '[') stack.push(ch);
      if (ch === '}' || ch === ']') stack.pop();
    }
    if (inString) out += '"';
    out = out.replace(/[\s,]*$/, '');
    while (stack.length) out += stack.pop() === '[' ? ']' : '}';
    try { return JSON.parse(out); }
    catch (_) { return null; }
  },

  cleanProseNarration(raw) {
    const text = String(raw || '').trim();
    if (!text) return '';
    const sepAt = text.indexOf(this.finalSeparator);
    const prose = sepAt >= 0 ? text.slice(0, sepAt) : text;
    return prose.replace(/```[\s\S]*?```/g, '').trim().slice(0, 2400);
  },

  async completeUpdateJson(store, prompt, logId) {
    const raw = await this.completeStep(store, prompt, logId, false);
    try { return window.GameModules.jsonUtils.parseLoose(raw); }
    catch (err) {
      console.warn('现实更新 JSON 解析失败，尝试修复:', err.message);
      try {
        const extracted = window.GameModules.jsonUtils.extractJson(String(raw || '').replace(/```(?:json)?|```/g, '').trim());
        return JSON.parse(window.GameModules.jsonUtils.repairJson(extracted));
      } catch (repairErr) {
        console.warn('现实更新 JSON 二次修复失败:', repairErr.message);
        return this.repairTruncatedJsonObject(raw) || {};
      }
    }
  },

  parseUpdateJson(raw) {
    try { return raw && typeof raw === 'object' ? raw : window.GameModules.jsonUtils.parseLoose(raw); }
    catch (_) { return this.repairTruncatedJsonObject(raw) || {}; }
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

  cleanPhasedNarration(raw) {
    return String(raw || '').replace(/```[\s\S]*?```/g, '').replace(this.finalSeparator, '').trim().slice(0, 5000);
  },

  async completeStep(store, prompt, logId, streamToUi = false) {
    const requestId = window.GameModules.realWorldAi.latestRequestId;
    let buffer = '';
    let lastPaint = 0;
    try {
      await window.GameModules.aiRequest.complete({
        source: streamToUi ? 'real-world-engine' : 'real-world-agent-context',
        model: store.modelId,
        prompt,
        timeoutMs: 240000,
        requireDone: true,
        maxTokens: streamToUi ? 10000 : 5000,
        outputLengthThreshold: streamToUi ? 9000 : 4200,
        maxAttempts: 2,
        onChunk: async (chunk, done, info) => {
          if (requestId !== window.GameModules.realWorldAi.latestRequestId) return;
          buffer = info.buffer;
          if (!streamToUi || !logId) return;
          const changed = store.updateRealWorldStream?.(logId, buffer);
          if (changed && performance.now() - lastPaint > 50) {
            lastPaint = performance.now();
            await new Promise((resolve) => (window.requestAnimationFrame || setTimeout)(resolve));
          }
        },
      });
    } catch (err) {
      if (!buffer.trim()) throw err;
      console.warn('现实 Loop Agent 请求未完成，使用已接收内容:', err.code, err.message, err.stack);
    }
    return buffer;
  },

  parseStep(raw) {
    try {
      const text = String(raw || '');
      const sepAt = text.indexOf(this.finalSeparator);
      const jsonRaw = sepAt >= 0 ? text.slice(sepAt + this.finalSeparator.length).trim() : text;
      if (sepAt >= 0 && !jsonRaw) throw new Error('现实推演 final 分隔符后缺少 JSON');
      if (window.GameModules.aiRequest?.outputTailLooksTruncated?.(jsonRaw)) throw new Error('现实推演返回疑似被截断');
      const data = window.GameModules.jsonUtils.parseLoose(jsonRaw);
      if (!data || typeof data !== 'object') return null;
      const type = String(data.type || '').trim();
      if (type !== 'request_context' && type !== 'context_done' && type !== 'final') return null;
      if (type === 'final' && sepAt >= 0) {
        data.narration = text.slice(0, sepAt).trim() || data.narration || '';
        if (!data.narration) throw new Error('现实推演 final 缺少正文');
      }
      data.requests = Array.isArray(data.requests) ? data.requests.slice(0, 3) : [];
      data.characters = Array.isArray(data.characters) ? data.characters.slice(0, 8) : [];
      return data;
    } catch (err) {
      console.warn('现实 Loop Agent 步骤解析失败:', err.message);
      if (this.isRetryableParseError(err)) throw err;
      return null;
    }
  },

  isRetryableParseError(err) {
    return ['截断', '分隔符后缺少 JSON', '缺少正文', 'JSON missing'].some((text) => String(err?.message || '').includes(text));
  },
  traceItem(step, data, raw) {
    const ctx = window.GameModules.realWorldAgentContext;
    return { step, type: data?.type || 'parse_failed', thinking: data?.thinking || '', reason: data?.reason || '', characters: data?.characters || [], requests: data?.requests || [], raw: ctx.limit(raw, 1200), loaded: [] };
  },
  stepText(step) {
    return step === 1 ? `现实世界正在识别相关角色与资料需求…（${step}/${this.maxSteps}）` : `现实世界正在推演…（${step}/${this.maxSteps}）`;
  },
  updateAgentTrace(store, logId, trace = []) {
    if (!logId) return;
    store.realWorldLog = (store.realWorldLog || []).map((entry) => entry.id === logId ? { ...entry, agentTrace: trace.slice(), streaming: true } : entry);
  },
  showFinalNarration(store, logId, narration) {
    if (!logId || !narration) return;
    store.realWorldLog = (store.realWorldLog || []).map((entry) => entry.id === logId ? { ...entry, narration, streaming: true, streamTrace: [] } : entry);
    store.scrollRealWorldLogBottom?.();
  },
  markStep(store, logId, text, options = {}) {
    if (!logId) return;
    store.realWorldLog = (store.realWorldLog || []).map((entry) => {
      if (entry.id !== logId) return entry;
      const patch = { streaming: true, statusText: text };
      if (!options.keepNarration) patch.narration = text;
      return { ...entry, ...patch };
    });
    store.scrollRealWorldLogBottom?.();
  },
  loadedContextText(data = {}, loaded = [], step = 1) {
    const chars = (data.characters || []).map((item) => item.name || item.id || item).filter(Boolean).join('、') || '玩家本人';
    const titles = loaded.map((item) => item.title).join('、') || '角色记忆';
    return `${step === 1 ? '已识别相关角色' : '已追加资料'}：${chars}；已载入${titles}${data.reason ? `：${data.reason}` : ''}`;
  },
};
