window.GameModules = window.GameModules || {};

window.GameModules.realWorldAgentLoop = {
  maxSteps: 3,

  async run(store, action, logId = null) {
    const ctx = window.GameModules.realWorldAgentContext;
    const loaded = [];
    const loadedKeys = new Set();
    const skills = await ctx.skillText();
    const base = ctx.baseSnapshot(store, action);
    let lastRaw = '';
    for (let step = 1; step <= this.maxSteps; step += 1) {
      const prompt = await this.buildPrompt({ store, action, base, loaded, skills, step });
      this.markStep(store, logId, `现实世界正在分析行动…（${step}/${this.maxSteps}）`);
      const raw = await this.completeStep(store, prompt, logId, step === this.maxSteps);
      lastRaw = raw;
      const data = this.parseStep(raw);
      if (data?.type === 'request_context' && step < this.maxSteps) {
        const results = await ctx.loadRequests(store, action, data.requests || [], loadedKeys);
        if (!results.length) continue;
        loaded.push(...results);
        this.markStep(store, logId, `已载入${results.map((item) => item.title).join('、')}，继续推演…`);
        continue;
      }
      if (data?.type === 'final') return { result: data, prompt, loaded, raw };
      if (step === this.maxSteps && data) return { result: { ...data, type: 'final' }, prompt, loaded, raw };
    }
    return { result: window.GameModules.realWorldAi.fallback(store, action), prompt: lastRaw, loaded, raw: lastRaw };
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
    return {
      type: 'final',
      sceneTitle: '现实场景标题',
      locationName: '具体地点名',
      parentLocationName: '上级地点名',
      locationDescription: '当前地点本次新认识的事实',
      mapNodes: [{ name: '子地点名', parentName: '上级地点名', descriptionFacts: ['玩家已知地点事实'] }],
      newLocations: [{ name: '新增地点名', parentName: '', descriptionFacts: ['玩家已知事实'] }],
      locationDescriptionUpdates: [{ locationName: '地点名', action: 'add', text: '新增或更新的玩家已知事实' }],
      elapsedSeconds: 60,
      thinking: '60到140字，概括现实推演依据，不写隐藏推理',
      narration: '以第二人称续写现实世界中的行动结果，180到360字，现实、克制、细节充分',
      status: '现实状态简述',
      quest: '新的现实目标',
      choices: ['处理现实事务', '联系某个人', '观察周围', '暂时休息'],
      metricUpdates: { emotions: [{ key: '情绪名', delta: 0, status: '变化后的状态含义', reason: '现实触发原因' }], playerFeelings: [{ key: '感觉名', delta: 0, status: '变化后的状态含义', reason: '现实触发原因' }] },
      lexiconUpdates: [{ worldTag: realWorld.label || '2026 现代都市现实世界', kind: '玩家设定/装备/物品/穿着/角色卡/角色技能', field: '角色卡字段名', name: '词条名或skills', value: '新值或对象', summary: '摘要', description: '说明', reason: '现实证据、触发行动、状态来源或动机' }],
    };
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
      if (type === 'request_context') data.requests = Array.isArray(data.requests) ? data.requests.slice(0, 3) : [];
      return data;
    } catch (err) {
      console.warn('现实 Loop Agent 步骤解析失败:', err.message);
      return null;
    }
  },

  markStep(store, logId, text) {
    if (!logId) return;
    store.realWorldLog = (store.realWorldLog || []).map((entry) => entry.id === logId ? { ...entry, narration: text, streaming: true } : entry);
  },
};
