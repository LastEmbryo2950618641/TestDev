window.GameModules = window.GameModules || {};

window.GameModules.realWorldAgentLoop = {
  minSteps: 2,
  maxSteps: 4,

  async run(store, action, logId = null) {
    const ctx = window.GameModules.realWorldAgentContext;
    const loaded = [];
    const trace = [];
    const loadedKeys = new Set();
    const memoryIds = new Set();
    const skills = await ctx.skillText();
    const base = ctx.baseSnapshot(store, action);
    let lastPrompt = '';
    let lastRaw = '';

    for (let step = 1; step <= this.maxSteps; step += 1) {
      const prompt = await this.buildPrompt({ store, action, base, loaded, skills, step });
      lastPrompt = prompt;
      this.markStep(store, logId, this.stepText(step));
      const raw = await this.completeStep(store, prompt, logId, true);
      lastRaw = raw;
      const data = this.parseStep(raw) || this.defaultStep(step);
      const traceItem = this.traceItem(step, data, raw);
      trace.push(traceItem);

      const results = await this.loadStepContext(ctx, store, action, data, loadedKeys, loaded, memoryIds, step);
      traceItem.loaded = results.map((item) => ({ title: item.title, text: ctx.limit(item.text, 800) }));
      if (results.length) {
        loaded.push(...results);
        this.markStep(store, logId, this.loadedContextText(data, results, step));
      }

      if (step < this.minSteps) continue;
      if (data.type === 'final') return { result: data, prompt, loaded, raw, trace };
      if (data.type === 'request_context' && step < this.maxSteps) continue;
      return { result: window.GameModules.realWorldAi.fallback(store, action), prompt, loaded, raw, trace };
    }
    return { result: window.GameModules.realWorldAi.fallback(store, action), prompt: lastPrompt, loaded, raw: lastRaw, trace };
  },

  async loadStepContext(ctx, store, action, data, loadedKeys, loaded, memoryIds, step) {
    const out = [];
    if (data.type === 'request_context') {
      const requested = await ctx.loadRequests(store, action, data.requests || [], loadedKeys);
      out.push(...requested);
    }
    const locationItem = await ctx.actionLocationForStep?.(store, action, data.characters || data.relatedCharacters || [], data.reason || '', loadedKeys);
    if (locationItem?.text) out.push(locationItem);
    const memoryItem = ctx.characterMemoriesForStep?.(store, action, data.characters || data.relatedCharacters || [], [...loaded, ...out], memoryIds, step === 1);
    if (memoryItem?.text) {
      (memoryItem.ids || []).forEach((id) => memoryIds.add(id));
      out.push(memoryItem);
    }
    return out;
  },

  async buildPrompt({ store, action, base, loaded, skills, step }) {
    const outputJson = JSON.stringify(this.outputSchema(store));
    return window.GameModules.promptTemplates.render('real-world-engine', {
      基础上下文: base,
      动态载入资料: window.GameModules.realWorldAgentContext.buildLoadedText(loaded),
      本次行动: action || '继续观察现实世界',
      当前步骤: `${step}/${this.maxSteps}`,
      最大步骤: this.maxSteps,
      动态Skills: skills,
      输出示例: outputJson,
    });
  },

  outputSchema(store) {
    const realWorld = window.GameModules.realWorld2026 || {};
    return { type: 'final', sceneTitle: '现实场景标题', locationName: '具体地点名', parentLocationName: '上级地点名', locationDescription: '当前地点本次新认识的事实', mapNodes: [{ name: '子地点名', parentName: '上级地点名', descriptionFacts: ['玩家已知地点事实'] }], newLocations: [{ name: '新增地点名', parentName: '', descriptionFacts: ['玩家已知事实'] }], locationDescriptionUpdates: [{ locationName: '地点名', action: 'add', text: '新增或更新的玩家已知事实' }], elapsedSeconds: 60, thinking: '60到140字，概括现实推演依据，不写隐藏推理', narration: '以第二人称续写现实世界中的行动结果，180到360字，现实、克制、细节充分', status: '现实状态简述', quest: '新的现实目标', choices: ['处理现实事务', '联系某个人', '观察周围', '暂时休息'], metricUpdates: { emotions: [{ key: '情绪名', delta: 0, status: '变化后的状态含义', reason: '现实触发原因' }], playerFeelings: [{ key: '感觉名', delta: 0, status: '变化后的状态含义', reason: '现实触发原因' }] }, lexiconUpdates: [{ worldTag: realWorld.label || '2026 现代都市现实世界', kind: '玩家设定/装备/物品/穿着/角色卡/角色技能', field: '角色卡字段名', name: '词条名或skills', value: '新值或对象', summary: '摘要', description: '说明', reason: '现实证据、触发行动、状态来源或动机' }] };
  },

  async completeStep(store, prompt, logId, streamToUi = false) {
    const requestId = window.GameModules.realWorldAi.latestRequestId;
    let buffer = '';
    let lastPaint = 0;
    await window.GameModules.aiRequest.complete({
      source: streamToUi ? 'real-world-engine' : 'real-world-agent-context',
      model: store.modelId,
      prompt,
      timeoutMs: 60000,
      requireDone: true,
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
    return buffer;
  },

  parseStep(raw) {
    try {
      const data = window.GameModules.jsonUtils.parseLoose(raw);
      if (!data || typeof data !== 'object') return null;
      const type = String(data.type || '').trim();
      if (type !== 'request_context' && type !== 'final') return null;
      data.requests = Array.isArray(data.requests) ? data.requests.slice(0, 3) : [];
      data.characters = Array.isArray(data.characters) ? data.characters.slice(0, 8) : [];
      return data;
    } catch (err) {
      console.warn('现实 Loop Agent 步骤解析失败:', err.message);
      return null;
    }
  },

  defaultStep(step) {
    return { type: step === 1 ? 'request_context' : 'final', reason: '解析失败，使用默认上下文。', requests: [], characters: ['player-self'] };
  },

  traceItem(step, data, raw) {
    const ctx = window.GameModules.realWorldAgentContext;
    return { step, type: data?.type || 'parse_failed', reason: data?.reason || '', characters: data?.characters || [], requests: data?.requests || [], raw: ctx.limit(raw, 1200), loaded: [] };
  },

  stepText(step) {
    if (step === 1) return `现实世界正在识别相关角色与资料需求…（${step}/${this.maxSteps}）`;
    return `现实世界正在推演…（${step}/${this.maxSteps}）`;
  },

  markStep(store, logId, text) {
    if (!logId) return;
    store.realWorldLog = (store.realWorldLog || []).map((entry) => entry.id === logId ? { ...entry, narration: text, streaming: true } : entry);
  },

  loadedContextText(data = {}, loaded = [], step = 1) {
    const chars = (data.characters || []).map((item) => item.name || item.id || item).filter(Boolean).join('、') || '玩家本人';
    const titles = loaded.map((item) => item.title).join('、') || '角色记忆';
    const reason = data.reason ? `：${data.reason}` : '';
    return `${step === 1 ? '已识别相关角色' : '已追加资料'}：${chars}；已载入${titles}${reason}`;
  },
};
