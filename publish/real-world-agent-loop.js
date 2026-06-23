window.GameModules = window.GameModules || {};

window.GameModules.realWorldAgentLoop = {
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
      const raw = await this.completeParsedStep(store, prompt, logId, true);
      lastRaw = raw.raw;
      const data = raw.data;
      if (!data) throw new Error('现实推演返回格式错误');
      const traceItem = this.traceItem(step, data, raw.raw);
      trace.push(traceItem);

      const results = await this.loadStepContext(ctx, store, action, data, loadedKeys, loaded, memoryIds, step, materialSession);
      traceItem.loaded = results.map((item) => ({ title: item.title, text: ctx.limit(item.text, 800) }));
      if (results.length) {
        loaded.push(...results);
        this.markStep(store, logId, this.loadedContextText(data, results, step));
      }

      if (step < this.minSteps) continue;
      if (data.type === 'final') return { result: data, prompt, loaded, raw: raw.raw, trace };
      if (data.type === 'request_context' && results.length && step < this.maxSteps) continue;
      return await this.forceFinal({ store, action, base, loaded, skills, trace, materialSession, logId, prompt, raw: raw.raw });
    }
    return await this.forceFinal({ store, action, base, loaded, skills, trace, materialSession, logId, prompt: lastPrompt, raw: lastRaw });
  },

  async forceFinal({ store, action, base, loaded, skills, trace, materialSession, logId, prompt, raw }) {
    const finalPrompt = await this.buildPrompt({ store, action, base, loaded, skills, step: '收敛', materialSession, forceFinal: true });
    this.markStep(store, logId, '现实资料已足够，正在整理最终结果…');
    const finalRaw = await this.completeParsedStep(store, finalPrompt, logId, true);
    const finalData = finalRaw.data;
    if (finalData?.type === 'final') return { result: finalData, prompt: finalPrompt, loaded, raw: finalRaw.raw, trace };
    throw new Error('现实推演最终结果格式错误');
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
    if (step !== 1 || forceFinal) return basePrompt;
    const firstPrompt = await window.GameModules.promptTemplates.render('real-world-engine-first', vars);
    return `${basePrompt}\n\n${firstPrompt}`;
  },

  stepOutputRule(step, forceFinal = false) {
    if (forceFinal) return '当前为收敛步骤：禁止 request_context，必须把已有资料整理为 final。资料不完整时也要基于已有资料做克制推理，不要继续请求资料。';
    if (step === 1) return '当前是第1步：必须返回 request_context，用于识别相关角色与必要资料。';
    return '当前可直接 final；只有仍能获取到回答本次行动所必需的新资料时，才允许 request_context。若请求不到新资料或只是想补全世界，必须 final。';
  },

  outputSchema(store) {
    const realWorld = window.GameModules.realWorld2026 || {};
    return { type: 'final', sceneTitle: '现实场景标题', locationName: '具体地点名', parentLocationName: '上级地点名', locationDescription: '当前地点本次新认识的事实', mapNodes: [{ name: '子地点名', parentName: '上级地点名', descriptionFacts: ['玩家已知地点事实'] }], newLocations: [{ name: '新增地点名', parentName: '', descriptionFacts: ['玩家已知事实'] }], locationDescriptionUpdates: [{ locationName: '地点名', action: 'add', text: '新增或更新的玩家已知事实' }], elapsedSeconds: 60, narration: store.realWorldNarrationHint?.() || '以第二人称续写现实世界中的行动结果，不少于300字且不设字数上限，现实、克制、细节充分，并体现精力、饱食、水分、疲劳或精神稳定对行动的影响', status: '现实状态简述', quest: '新的现实目标', choices: ['处理现实事务', '联系某个人', '观察周围', '暂时休息'], vitalUpdates: [{ key: 'stamina_pool', delta: -1, reason: '本次行动消耗少量精力。' }, { key: 'satiety', delta: 0, reason: '本次行动时间较短，饱食度基本不变。' }, { key: 'hydration', delta: 0, reason: '本次行动时间较短，水分基本不变。' }, { key: 'fatigue', delta: 1, reason: '持续行动带来轻微疲劳。' }, { key: 'mental_stability', delta: 0, reason: '本次行动没有直接冲击精神稳定。' }], metricUpdates: { target: 'player-self', emotions: [{ key: '情绪名', delta: 0, status: '变化后的状态含义', reason: '现实触发原因' }], playerFeelings: [{ key: '感觉名', delta: 0, status: '变化后的状态含义', reason: '现实触发原因' }] }, characterMetricUpdates: [{ target: '相关角色id或姓名', emotions: [{ key: '情绪名', delta: 0, status: '变化后的状态含义', reason: '该角色受本回合事件影响的原因' }], playerFeelings: [{ key: '感觉名', delta: 0, status: '该角色对玩家的新态度', reason: '该角色对玩家感觉变化或维持的具体证据' }] }], factionUpdates: [{ action: 'addFactionPosition', factionName: '势力名', position: '职位或地位', characterName: '角色名或未知', reason: '现实确认依据' }], itemActions: [{ action: 'add/transfer/delete/purchase/generate', target: 'player-self或角色id/姓名', from: '来源角色', to: '目标角色', itemName: '已有物品名', quantity: 1, item: { name: '物品名', kind: '物品或装备', price: 0, description: '说明' }, reason: '现实确认依据' }], lexiconUpdates: [{ worldTag: realWorld.label || '2026 现代都市现实世界', kind: '玩家设定/装备/物品/穿着/角色卡/角色技能', field: '角色卡字段名', name: '词条名或skills', value: '新值或对象', summary: '摘要', description: '说明', reason: '现实证据、触发行动、状态来源或动机' }] };
  },

  async completeParsedStep(store, prompt, logId, streamToUi = false) {
    let lastRaw = '';
    for (let i = 0; i < 2; i += 1) {
      lastRaw = await this.completeStep(store, prompt, logId, streamToUi);
      try { return { raw: lastRaw, data: this.parseStep(lastRaw) }; }
      catch (err) {
        if (!String(err.message || '').includes('截断') || i === 1) throw err;
        console.warn('现实推演疑似截断，自动重试一次:', err.message);
      }
    }
    return { raw: lastRaw, data: null };
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
      if (window.GameModules.aiRequest?.outputTailLooksTruncated?.(raw)) throw new Error('现实推演返回疑似被截断');
      const data = window.GameModules.jsonUtils.parseLoose(raw);
      if (!data || typeof data !== 'object') return null;
      const type = String(data.type || '').trim();
      if (type !== 'request_context' && type !== 'final') return null;
      data.requests = Array.isArray(data.requests) ? data.requests.slice(0, 3) : [];
      data.characters = Array.isArray(data.characters) ? data.characters.slice(0, 8) : [];
      return data;
    } catch (err) {
      console.warn('现实 Loop Agent 步骤解析失败:', err.message);
      if (String(err.message || '').includes('截断')) throw err;
      return null;
    }
  },

  defaultStep(step) {
    return { type: step === 1 ? 'request_context' : 'final', reason: '解析失败，使用默认上下文。', requests: [], characters: ['player-self'] };
  },

  traceItem(step, data, raw) {
    const ctx = window.GameModules.realWorldAgentContext;
    return { step, type: data?.type || 'parse_failed', thinking: data?.thinking || '', reason: data?.reason || '', characters: data?.characters || [], requests: data?.requests || [], raw: ctx.limit(raw, 1200), loaded: [] };
  },

  stepText(step) {
    if (step === 1) return `现实世界正在识别相关角色与资料需求…（${step}/${this.maxSteps}）`;
    return `现实世界正在推演…（${step}/${this.maxSteps}）`;
  },

  markStep(store, logId, text) {
    if (!logId) return;
    store.realWorldLog = (store.realWorldLog || []).map((entry) => entry.id === logId ? { ...entry, narration: text, streaming: true } : entry);
    store.scrollRealWorldLogBottom?.();
  },
  loadedContextText(data = {}, loaded = [], step = 1) {
    const chars = (data.characters || []).map((item) => item.name || item.id || item).filter(Boolean).join('、') || '玩家本人';
    const titles = loaded.map((item) => item.title).join('、') || '角色记忆';
    const reason = data.reason ? `：${data.reason}` : '';
    return `${step === 1 ? '已识别相关角色' : '已追加资料'}：${chars}；已载入${titles}${reason}`;
  },
};
