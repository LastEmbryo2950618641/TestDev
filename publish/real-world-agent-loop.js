window.GameModules = window.GameModules || {};

window.GameModules.realWorldAgentLoop = {
  finalSeparator: '<!--REAL_WORLD_JSON-->',
  minSteps: 2,
  maxSteps: 8,
  kvCacheSeq: 0,

  async run(store, action, logId = null) {
    return await this.runConfigured(store, action, logId, this.realConfig());
  },

  async runStory(store, action, logId = null) {
    return await this.runConfigured(store, action, logId, this.storyConfig());
  },

  realConfig() {
    return { mode: 'real', label: '鐜板疄', ctx: window.GameModules.realWorldAgentContext, materials: window.GameModules.realWorldMaterials, templateId: 'inference-stage3-narration', firstTemplateId: 'inference-stage1-guided-query' };
  },

  storyConfig() {
    return { mode: 'story', label: '鎿嶆帶鍓ф儏', ctx: window.GameModules.storyAgentContext, materials: window.GameModules.workLoreMaterials, templateId: 'inference-stage3-narration', firstTemplateId: 'inference-stage1-guided-query' };
  },

  renderPrompt(id, vars) {
    const renderer = window.GameModules.renderPrompt || ((templateId, templateVars) => window.GameModules.promptTemplates?.render?.(templateId, templateVars));
    return renderer(id, vars);
  },

  snapshotKvMessages(session) {
    if (!session?.messages?.length) return [];
    return session.messages.map((item) => ({ role: String(item.role || 'user'), content: String(item.content || '') }));
  },

  forkKvCacheSession(parentSession, messagesSnapshot = null) {
    if (!parentSession) return null;
    return {
      id: `${parentSession.id}-fork-${Date.now()}`,
      providerId: parentSession.providerId,
      enabled: true,
      trackCache: parentSession.trackCache,
      persist: false,
      fork: true,
      messages: (messagesSnapshot || parentSession.messages || []).slice(),
      requestCount: 0,
      promptCacheHitTokens: 0,
      promptCacheMissTokens: 0,
    };
  },

  loadPersistedAgentMessages(store, mode = 'real') {
    const bucket = store?.realWorldAgentKvByMode?.[mode];
    const messages = Array.isArray(bucket?.messages) ? bucket.messages : [];
    return messages
      .filter((item) => item && ['user', 'assistant', 'system'].includes(String(item.role || '')))
      .map((item) => ({ role: String(item.role || 'user'), content: String(item.content || '') }))
      .filter((item) => item.content.trim());
  },

  persistAgentConversation(store, session, mode = 'real') {
    if (session?.persist === false || session?.fork) return;
    if (!session?.messages?.length) return;
    store.realWorldAgentKvByMode = store.realWorldAgentKvByMode || {};
    store.realWorldAgentKvByMode[mode] = {
      messages: session.messages.map((item) => ({ role: String(item.role || 'user'), content: String(item.content || '') })),
      updatedAt: Date.now(),
      requestCount: Math.max(0, Math.round(Number(session.requestCount) || 0)),
    };
  },

  createDeepSeekKvCacheSession(store, config = this.realConfig()) {
    const providerId = window.GameModules.aiProvider?.currentProviderId?.();
    const mode = config.mode || 'real';
    const priorMessages = this.loadPersistedAgentMessages(store, mode);
    const deepseek = providerId === 'deepseek';
    if (!deepseek && !priorMessages.length) return null;
    return {
      id: `${mode}-kv-${Date.now()}-${++this.kvCacheSeq}`,
      providerId,
      enabled: true,
      trackCache: deepseek,
      messages: priorMessages.slice(),
      restoredMessageCount: priorMessages.length,
      requestCount: 0,
      promptCacheHitTokens: 0,
      promptCacheMissTokens: 0,
    };
  },

  withDeepSeekKvCacheSession(store, config = this.realConfig()) {
    if (Object.prototype.hasOwnProperty.call(config || {}, 'kvCacheSession')) return config;
    const session = this.createDeepSeekKvCacheSession(store, config);
    return session ? { ...config, kvCacheSession: session } : config;
  },

  activeKvCacheSession(store = null, mode = 'real') {
    return store?.realWorldAgentActiveKvByMode?.[mode] || null;
  },

  promptToMessages(prompt) {
    return Array.isArray(prompt)
      ? prompt.map((msg) => ({ role: msg?.role || 'user', content: String(msg?.content || '') }))
      : [{ role: 'user', content: String(prompt || '') }];
  },

  messagesForDeepSeekKvCache(session, prompt) {
    if (!session) return null;
    const current = this.promptToMessages(prompt);
    if (!session.messages?.length) return current;
    return [...session.messages, ...current];
  },

  rememberDeepSeekKvCache(session, messages, assistantText = '', info = {}) {
    if (!session) return;
    if (session.trackCache) {
      const cache = info?.deepseekCache || {};
      session.promptCacheHitTokens += Number(cache.promptCacheHitTokens) || 0;
      session.promptCacheMissTokens += Number(cache.promptCacheMissTokens) || 0;
    }
    session.messages = [
      ...(Array.isArray(messages) ? messages : this.promptToMessages(messages)),
      { role: 'assistant', content: String(assistantText || '') },
    ];
    session.requestCount += 1;
  },

  inferReasoningPhase(config = {}) {
    if (config.reasoningPhase) return String(config.reasoningPhase);
    const promptId = String(config.promptId || config.firstTemplateId || '');
    const match = promptId.match(/inference-stage([1-5])/iu);
    if (match) return `stage${match[1]}`;
    if (config.guidedStep) return 'stage1';
    const sourceTitle = String(config.sourceTitle || '');
    if (sourceTitle.includes('鍦烘櫙閿氬畾')) return 'stage2';
    if (sourceTitle.includes('Stage5') || sourceTitle.includes('鐩涜')) return 'stage5';
    if (sourceTitle.includes('Stage4') || sourceTitle.includes('婊戝姩缁撶畻')) return 'stage4';
    if (config.streamToUi) return 'stage3';
    return '';
  },

  reasoningSectionMeta(config = {}) {
    const phase = this.inferReasoningPhase(config);
    const stage1Step = Math.max(1, Number(config.guidedStep) || 1);
    const stage4Attempt = Number(config.settlementAttempt);
    if (phase === 'stage1') {
      return { phase, step: stage1Step, label: `Stage1 - ${stage1Step}`, id: `stage1-${stage1Step}` };
    }
    if (phase === 'stage2') {
      return { phase, step: 0, label: 'Stage2', id: 'stage2' };
    }
    if (phase === 'stage3') {
      return { phase, step: 0, label: 'Stage3', id: 'stage3' };
    }
    if (phase === 'stage4') {
      const attempt = Number.isFinite(stage4Attempt) ? stage4Attempt : 0;
      return {
        phase,
        step: attempt,
        label: attempt > 0 ? `Stage4 - ${attempt + 1}` : 'Stage4',
        id: attempt > 0 ? `stage4-${attempt}` : 'stage4',
      };
    }
    if (phase === 'stage5') {
      return { phase, step: 0, label: 'Stage5', id: 'stage5' };
    }
    return { phase: 'unknown', step: 0, label: '鏈煡闃舵', id: `reasoning-${Date.now()}` };
  },

  reasoningStageGroupKey(meta = {}) {
    const phase = String(meta.phase || 'unknown');
    const step = Number(meta.step) || 0;
    if (phase === 'stage1') return `${phase}-${Math.max(1, step || 1)}`;
    if (phase === 'stage4') return `${phase}-${step}`;
    return phase;
  },

  parseReasoningLabel(label = '') {
    const match = String(label || '').trim().match(/^Stage\s*([1-4])(?:\s*[-鈥撯€擼\s*(\d+))?/iu);
    if (!match) return null;
    const phase = `stage${match[1]}`;
    const step = Number(match[2]) || 0;
    if (phase === 'stage1') {
      const n = Math.max(1, step || 1);
      return { phase, step: n, label: `Stage1 - ${n}`, id: `stage1-${n}` };
    }
    if (phase === 'stage4' && step > 0) {
      return { phase, step, label: `Stage4 - ${step + 1}`, id: `stage4-${step}` };
    }
    return {
      phase,
      step,
      label: phase === 'stage2' ? 'Stage2' : phase === 'stage3' ? 'Stage3' : 'Stage4',
      id: phase === 'stage4' ? 'stage4' : phase,
    };
  },

  directReasoningSectionMeta(section = {}) {
    const id = String(section?.id || '');
    const storedPhase = String(section?.phase || '');
    const storedStep = Number(section?.step);
    if (storedPhase && storedPhase !== 'unknown') {
      const step = Number.isFinite(storedStep) ? storedStep : 0;
      if (storedPhase === 'stage1') {
        const n = Math.max(1, step || 1);
        return { phase: storedPhase, step: n, label: String(section?.label || `Stage1 - ${n}`), id: id || `stage1-${n}` };
      }
      if (storedPhase === 'stage4') {
        return { phase: storedPhase, step, label: String(section?.label || (step > 0 ? `Stage4 - ${step + 1}` : 'Stage4')), id: id || (step > 0 ? `stage4-${step}` : 'stage4') };
      }
      return {
        phase: storedPhase,
        step,
        label: String(section?.label || (storedPhase === 'stage2' ? 'Stage2' : storedPhase === 'stage3' ? 'Stage3' : 'Stage4')),
        id: id || storedPhase,
      };
    }
    const stage1Match = id.match(/^stage1-(?:step-)?(\d+)$/iu);
    if (stage1Match) {
      const step = Number(stage1Match[1]) || 1;
      return { phase: 'stage1', step, label: `Stage1 - ${step}`, id: `stage1-${step}` };
    }
    if (id === 'stage2') return { phase: 'stage2', step: 0, label: 'Stage2', id: 'stage2' };
    if (id === 'stage3') return { phase: 'stage3', step: 0, label: 'Stage3', id: 'stage3' };
    if (/^stage4(?:-attempt-|-)?(\d+)?$/iu.test(id) || id === 'stage4') {
      const attempt = Number(id.match(/(\d+)/u)?.[1]) || 0;
      return { phase: 'stage4', step: attempt, label: attempt > 0 ? `Stage4 - ${attempt + 1}` : 'Stage4', id: attempt > 0 ? `stage4-${attempt}` : 'stage4' };
    }
    return this.parseReasoningLabel(section?.label);
  },

  reasoningPipelineFromEntry(entry = {}) {
    const agentTrace = Array.isArray(entry?.agentTrace) ? entry.agentTrace : [];
    const steps = [];
    agentTrace.forEach((item, index) => {
      const step = Number(item?.step) || index + 1;
      if (!steps.includes(step)) steps.push(step);
    });
    if (!steps.length) steps.push(1);
    const pipeline = steps.map((step) => ({ phase: 'stage1', step, label: `Stage1 - ${step}`, id: `stage1-${step}` }));
    // Stage2 / Stage4 榛樿 JSON 妯″紡锛屼笉浜х敓娣卞害鎬濊€冿紱鏈煡娈佃惤鎸夋祦姘寸嚎鍙ˉ Stage3銆?
    pipeline.push({ phase: 'stage3', step: 0, label: 'Stage3', id: 'stage3' });
    return pipeline;
  },

  assignReasoningSectionMetas(sections = [], entry = {}) {
    const pipeline = this.reasoningPipelineFromEntry(entry);
    const occupied = new Map();
    const assigned = [];

    const occupy = (meta, section) => {
      const key = this.reasoningStageGroupKey(meta);
      const sectionId = String(section?.id || '');
      const existing = occupied.get(key);
      if (existing && existing.sectionId && sectionId && existing.sectionId !== sectionId) return false;
      occupied.set(key, { sectionId, meta });
      assigned.push({ meta, section });
      return true;
    };

    const pending = [];
    (Array.isArray(sections) ? sections : []).forEach((section) => {
      const text = String(section?.text || '').trim();
      if (!text) return;
      const direct = this.directReasoningSectionMeta(section);
      if (direct && occupy(direct, section)) return;
      pending.push(section);
    });

    let pipeIdx = 0;
    pending.forEach((section) => {
      while (pipeIdx < pipeline.length && occupied.has(this.reasoningStageGroupKey(pipeline[pipeIdx]))) pipeIdx += 1;
      const meta = pipeIdx < pipeline.length
        ? { ...pipeline[pipeIdx++] }
        : { phase: 'unknown', step: assigned.length, label: String(section?.label || '鐜板疄鎺ㄦ紨'), id: String(section?.id || `legacy-${assigned.length}`) };
      occupy(meta, section);
    });

    return assigned;
  },

  reasoningSectionMetaFromStored(section = {}, index = 0, entry = {}) {
    const assigned = this.assignReasoningSectionMetas([section], entry);
    return assigned[0]?.meta || { phase: 'unknown', step: index, label: '鐜板疄鎺ㄦ紨', id: String(section?.id || `legacy-${index}`) };
  },

  patchConfiguredReasoning(store, logId, reasoningText = '', config = this.realConfig()) {
    const text = String(reasoningText || '').trim();
    if (!text || !logId) return;
    if (config.mode === 'story') {
      store.updateNovelEntry?.(logId, { thinking: text });
      return;
    }
    const entry = (store.realWorldLog || []).find((item) => item.id === logId) || window.GameModules.realWorldLogStore?.get?.(logId) || {};
    const meta = this.reasoningSectionMeta(config);
    const key = String(config.reasoningKey || meta.id);
    const sections = this.mergeThinkingSection(entry, {
      id: key,
      phase: meta.phase,
      step: meta.step,
      label: meta.label,
      text,
      open: true,
      collapseOthers: Boolean(config.livePatch),
    });
    store.patchRealWorldLogEntry?.(logId, { thinkingSections: sections, thinking: this.joinThinkingSections(sections) }, { live: Boolean(config.livePatch) });
  },

  mergeThinkingSection(entry = {}, section = {}) {
    const sections = Array.isArray(entry.thinkingSections)
      ? entry.thinkingSections.map((item) => ({
        id: String(item?.id || ''),
        phase: String(item?.phase || ''),
        step: Number(item?.step) || 0,
        label: String(item?.label || '鐜板疄鎺ㄦ紨'),
        text: String(item?.text || ''),
        open: item?.open !== false,
      })).filter((item) => item.text.trim())
      : [];
    if (!sections.length && String(entry.thinking || '').trim()) {
      sections.push({ id: 'legacy-thinking', phase: 'unknown', step: 0, label: '鐜板疄鎺ㄦ紨', text: String(entry.thinking || '').trim(), open: true });
    }
    const next = {
      id: String(section.id || `reasoning-${Date.now()}`),
      phase: String(section.phase || ''),
      step: Number(section.step) || 0,
      label: String(section.label || '鐜板疄鎺ㄦ紨'),
      text: String(section.text || '').trim(),
      open: section.open !== false,
    };
    if (!next.text) return sections;
    const index = sections.findIndex((item) => item.id === next.id);
    if (index >= 0) {
      sections[index] = { ...sections[index], ...next, open: sections[index].open !== false || next.open !== false };
      return sections;
    }
    if (section.collapseOthers) sections.forEach((item) => { item.open = false; });
    sections.push(next);
    return sections;
  },

  joinThinkingSections(sections = []) {
    return (Array.isArray(sections) ? sections : [])
      .map((item) => String(item?.text || '').trim())
      .filter(Boolean)
      .join('\n\n');
  },

  deepSeekKvCacheSummary(session) {
    if (!session?.enabled) return null;
    return {
      promptCacheHitTokens: Math.max(0, Math.round(Number(session.promptCacheHitTokens) || 0)),
      promptCacheMissTokens: Math.max(0, Math.round(Number(session.promptCacheMissTokens) || 0)),
      requestCount: Math.max(0, Math.round(Number(session.requestCount) || 0)),
    };
  },

  async runConfigured(store, action, logId = null, config = this.realConfig()) {
    config = this.withDeepSeekKvCacheSession(store, config);
    store.realWorldAgentActiveKvByMode = store.realWorldAgentActiveKvByMode || {};
    store.realWorldAgentActiveKvByMode[config.mode] = config.kvCacheSession || null;
    const ctx = config.ctx;
    if (!ctx) throw new Error(`${config.label || 'Loop'}涓婁笅鏂囨湭鍔犺浇`);
    try {
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
        const prompt = await this.buildConfiguredPrompt({ store, action, base, loaded, skills, step, materialSession, config, guidance: lastGuidance, logId });
        lastPrompt = prompt;
        this.markConfiguredStep(store, logId, this.stepText(step, config), config);
        const raw = await this.completeConfiguredParsedStep(store, prompt, logId, false, false, { ...config, guidedStep: step }, step > 1);
        lastRaw = raw.raw;
        const data = raw.data;
        if (!data) throw new Error(`${config.label || 'Loop'}杩斿洖鏍煎紡閿欒`);
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
      const final = await this.generateConfiguredFinal({ store, action, base, loaded, skills, trace, materialSession, logId, prompt: lastPrompt, raw: lastRaw, config });
      this.persistAgentConversation(store, config.kvCacheSession, config.mode);
      return final;
    } finally {
      if (store.realWorldAgentActiveKvByMode?.[config.mode] === (config.kvCacheSession || null)) {
        delete store.realWorldAgentActiveKvByMode[config.mode];
      }
    }
  },

  async generatePhasedFinal(args) {
    return await this.generateConfiguredFinal({ ...args, config: this.realConfig() });
  },

  async generateConfiguredFinal({ store, action, base, loaded, skills, trace, materialSession, logId, config = this.realConfig() }) {
    const effectiveSceneLayers = this.resolveEffectiveSceneLayers(trace, store, config);
    const sceneAnchorPrompt = await this.buildConfiguredSceneAnchorPrompt({ store, action, base, loaded, trace, effectiveSceneLayers, materialSession, config });
    this.markConfiguredStep(store, logId, `${config.label}璧勬枡宸茶浇鍏ワ紝姝ｅ湪鐢熸垚鍦烘櫙閿氬畾鎶ュ憡鈥, config);
    const sceneAnchor = await this.completeSceneAnchorReport(store, sceneAnchorPrompt, logId, config);
    const sceneAnchorReport = sceneAnchor.text;
    const narrationPrompt = await this.buildConfiguredNarrationPrompt({ store, action, base, loaded, skills, materialSession, sceneAnchorReport, config });
    const narrationMessages = this.buildConfiguredNarrationMessages({ store, action, prompt: narrationPrompt, config });
    this.markConfiguredStep(store, logId, `${config.label}鍦烘櫙閿氬畾瀹屾垚锛屾鍦ㄧ敓鎴愭鏂団€, config);
    const narrationRaw = await this.completeConfiguredStep(store, narrationMessages, logId, true, { ...config, promptId: config.templateId, streamToUi: true });
    const narration = await this.ensureConfiguredNarrationLength(store, action, narrationPrompt, this.cleanPhasedNarration(narrationRaw), logId, config);
    if (!narration) throw new Error(`${config.label}姝ｆ枃涓虹┖`);
    this.showConfiguredNarration(store, logId, narration, config);

    const postStage3Checkpoint = this.snapshotKvMessages(config.kvCacheSession);
    const stage5KvConfig = {
      ...config,
      kvCacheSession: this.forkKvCacheSession(config.kvCacheSession, postStage3Checkpoint),
    };

    let settlementPrompt = 'Stage4 绱у噾 JSON 婊戝姩缁撶畻', settlementRaw = '', updates = {}, profilePatches = [];
    const participants = this.mergeNarrationParticipants(this.stageParticipants(effectiveSceneLayers, loaded, store), narration, store, sceneAnchor.data);
    try {
      this.markConfiguredStep(store, logId, `${config.label}姝ｆ枃宸插畬鎴愶紝姝ｅ湪骞惰缁撶畻涓庣洓瑁呭瑙傛洿鏂扳€, config, { keepNarration: true });
      const stage4Promise = (async () => {
        try {
          const settled = await this.completeConfiguredSettlementKvWindow({ store, action, base, loaded, skills, materialSession, narration, trace, participants, logId, config });
          return { ...settled, type: settled.type || 'final' };
        } catch (err) {
          console.warn(`${config.label}鐘舵€佹洿鏂扮敓鎴愬け璐ワ紝淇濈暀宸茬敓鎴愭鏂囧苟浣跨敤鏈€灏忕粨绠?`, err.message);
          return this.fallbackUpdateJson(store, action, config);
        }
      })();
      const stage5 = window.GameModules.realWorldProfileStage5;
      const stage5Result = stage5?.runParallelWithStage4
        ? await stage5.runParallelWithStage4({ store, narration, participants, logId, config: stage5KvConfig, loop: this, stage4Promise })
        : { updates: await stage4Promise, patches: [], skipped: true };
      updates = stage5Result.updates || await stage4Promise;
      updates = { ...updates, type: updates.type || 'final' };
      profilePatches = Array.isArray(stage5Result.patches) ? stage5Result.patches : [];
      settlementPrompt = 'Stage4 绱у噾 JSON 婊戝姩缁撶畻 + Stage5 鐩涜澶栬锛堝苟琛岋級';
      settlementRaw = JSON.stringify({ settlement: updates, stage5Gate: stage5Result.gate || null, profilePatches: profilePatches.map((item) => ({ subject: item.subject, parts: item.parts })) });
    } catch (err) {
      console.warn(`${config.label}骞惰缁撶畻澶辫触锛屼繚鐣欏凡鐢熸垚姝ｆ枃骞朵娇鐢ㄦ渶灏忕粨绠?`, err.message);
      updates = this.fallbackUpdateJson(store, action, config);
      settlementRaw = JSON.stringify(updates);
    }
    const resultPayload = { ...updates, profilePatches };
    const result = config.mode === 'story' ? this.mergeStoryNarrationAndUpdates(store, narration, resultPayload, config) : this.mergeNarrationAndUpdates(store, narration, resultPayload, config);
    const anchoredTrace = trace.map((item, index) => index === trace.length - 1 ? { ...item, anchorReport: sceneAnchor.data } : item);
    return { result, prompt: `---SCENE_ANCHOR---\n${sceneAnchorPrompt}\n\n---NARRATION---\n${narrationPrompt}\n\n---SETTLEMENT_JSON---\n${settlementPrompt}`, loaded, raw: `${sceneAnchor.raw}\n\n${narrationRaw}\n\n${settlementRaw}`, trace: anchoredTrace, deepseekCache: this.deepSeekKvCacheSummary(config.kvCacheSession) };
  },

  async loadStepContext(ctx, store, action, data, loadedKeys, loaded, memoryIds, step, materialSession = null, materials = window.GameModules.realWorldMaterials) {
    const out = [];
    if (data.type === 'request_context') {
      const autoLoaded = await ctx.autoLoadForStep?.(store, action, loadedKeys, materialSession, materials, memoryIds, step, loaded, out) || [];
      out.push(...autoLoaded);
      const load = async (requests, limit) => {
        if (!Array.isArray(requests) || !requests.length) return [];
        return await ctx.loadRequests(store, action, requests, loadedKeys, materialSession, materials, memoryIds, loaded, out, { limit, step });
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

  async buildConfiguredPrompt({ store, action, base, loaded, skills, step, materialSession = null, forceFinal = false, config = this.realConfig(), guidance = null, logId = null }) {
    const actionText = this.actionText(action, config.mode === 'story' ? '缁х画鎺ㄨ繘鎿嶆帶鍓ф儏' : '缁х画瑙傚療鐜板疄涓栫晫');
    const loadedText = config.ctx.buildLoadedText(loaded);
    const materialText = config.materials?.summary?.(materialSession, { step }) || '';
    const randomOptions = { mode: config.mode };
    ['forcedParticipants', 'priorityCandidates', 'dramaCandidates', 'forbiddenParticipants'].forEach((key) => {
      if (Array.isArray(guidance?.[key])) randomOptions[key] = guidance[key];
    });
    const randomActiveCandidates = !forceFinal ? (config.ctx.randomActiveEventCandidates?.(store, action, randomOptions) || []) : [];
    const randomActiveCandidateText = randomActiveCandidates.length
      ? randomActiveCandidates.map((item, index) => `${index + 1}. ${item.name || item.id}`).join('锛?)
      : '鏃?;
    const eventStage1Context = store.eventStage1PromptContext?.(actionText) || '';
    const configuredControlPerspectiveRule = this.configuredControlPerspectiveRule(store, config);
    const commonVars = {
      鏈琛屽姩: actionText,
      褰撳墠姝ラ: forceFinal ? '鏀舵暃/final' : this.guidedStepText(store, step, config),
      鏈€澶ф楠? this.guidedMaxStepText(store, config),
      鎺ㄦ紨鑷敱搴﹁鍒? [config.mode === 'story' ? this.storyFreedomRule(store) : (store.realWorldFreedomRule?.() || '鎺ㄦ紨鑷敱搴︼細琛屽姩鑼冨洿鍐呫€傚彧鎺ㄦ紨鐜╁鏈杈撳叆琛屽姩鑷劧鎶佃揪鐨勭洿鎺ョ粨鏋溿€?), configuredControlPerspectiveRule].filter(Boolean).join('\n'),
      褰撳墠姝ラ杈撳嚭瑕佹眰: this.stepOutputRule(step, forceFinal),
      闅忔満鍦哄瑙掕壊鍊欓€? randomActiveCandidateText,
      ['\u8d44\u6599\u8fed\u4ee3\u9650\u5236\u89c4\u5219']: this.stage1IterationRule(store),
    };
    if (!forceFinal) {
      const stage1RoutingContext = config.ctx.buildStage1RoutingContext?.({ store, action: actionText, loaded, materialSession, config }) || [
        `妯″紡锛?{config.label}`,
        `鏈琛屽姩锛?{actionText}`,
        '宸插姞杞借祫鏂欐憳瑕侊細鏃?,
        '鍙姹傝祫鏂欑洰褰曪細鏃?,
      ].join('\n');
      const previousGuidance = this.previousGuidanceSummary(guidance);
      const loadedRoutingSummary = config.ctx.loadedRoutingSummary?.(loaded) || '鏃?;
      const materialCatalog = config.ctx.stage1MaterialCatalogText?.(config.mode) || '鏃?;
      const rulesText = [
        '# Stage1 鏌ヨ瑙勫垝锛氱揣鍑?JSON 璧勬枡璺敱',
        '浠诲姟锛氬彧杈撳嚭涓€涓悎娉?JSON 瀵硅薄锛屼笉杈撳嚭涓枃 K:V銆丮arkdown銆佹鏂囨垨瑙ｉ噴銆?,
        '浣犲彧璐熻矗鍒ゆ柇鏈琛屽姩鐢熸垚姝ｆ枃鍓嶈繕闇€瑕佸摢浜涘凡鏈夎祫鏂欙紱涓嶅緱鍐欐鏂囷紝涓嶅緱閿氬畾鍦烘櫙锛屼笉寰楃粨绠楃姸鎬侊紝涓嶅緱鎺ㄨ繘鍚庣画缁撴灉銆?,
        '璧勬枡璇锋眰瑙勫垯锛?,
        '- 浣跨敤涓枃璧勬枡璇锋眰锛屼笉寰楄緭鍑鸿嫳鏂?skill/method銆?,
        '- 璧勬枡璇锋眰鏈€澶?Top3锛涜秴杩?Top3 鐨勫€欓€夊繀椤讳涪寮冿紝涓嶅緱杈撳嚭璧勬枡璇锋眰4鎴栨洿澶氱紪鍙枫€?,
        '- 瑙掕壊鍗¤姹傚彧浠ｈ〃鍙綔涓哄弬鑰冭祫鏂欙紱涓嶅緱鍥犳鎶婅鑹插啓鍏ュ己鍒跺嚭鍦恒€?,
        '- 宸插姞杞借祫鏂欐憳瑕佸凡缁忚鐩栫殑浜虹墿銆佸湴鐐广€佽矾绾夸笉寰楅噸澶嶈姹傘€?,
        '- 涓嶅緱璇锋眰琛ｇ潃銆侀瀷琚溿€侀殢韬墿鍝佺瓑缁嗚妭锛涜繖浜涚粏鑺備笉灞炰簬鏈樁娈靛繀瑕佽祫鏂欍€?,
        '- 涓嶅緱鐓ф妱绀轰緥涓殑鍗犱綅璇嶏紱瑙掕壊鍏ㄧО銆佷笘鐣屽叏绉般€佸湴鐐瑰叏绉般€佷汉鐗╁叏绉般€佷綔鍝佸叏绉伴兘蹇呴』鏇挎崲涓烘湰娆¤鍔ㄤ腑鐨勭湡瀹炲悕绉般€?,
        '- 璧勬枡璇锋眰绀轰緥锛氳祫鏂欒姹?锛氳鑹叉煡璇紝鎼滅储瑙掕壊鍗★紝鍒樻€濈惇锛?026鐜颁唬閮藉競鐜板疄涓栫晫',
        '- 璧勬枡璇锋眰绀轰緥锛氳祫鏂欒姹?锛氬湴鐐规煡璇紝鏌ヨ闄勮繎鍦扮偣锛岄敠鑻戝皬鍖?鏍?鍗曞厓',
        '- 璧勬枡璇锋眰绀轰緥锛氳祫鏂欒姹?锛氫綔鍝佽瀹氭煡璇紝鎼滅储浜虹墿锛岄樋灏旀墭鑾夐泤路娼樺痉鎷夎础锛孎ate/stay night',
        '闅忔満浜嬩欢瑙勫垯锛?,
        '- 闅忔満涓诲姩浜嬩欢榛樿鏄満澶栬儗鏅紝涓嶈嚜鍔ㄥ叆鍦恒€?,
        '- 闅忔満鍦哄瑙掕壊鍊欓€変笉绛変簬绂佹鍑哄満锛涗笉寰椾粎鍥犺鑹插嚭鐜板湪闅忔満鍦哄瑙掕壊鍊欓€変腑锛屽氨鍐欏叆绂佹鍑哄満銆?,
        '- 鑻ラ殢鏈鸿鑹插凡鍦ㄥ己鍒跺嚭鍦恒€侀珮浼樺厛鍊欓€夈€佹垙鍓у€欓€夋垨绂佹鍑哄満涓紝蹇呴』绉婚櫎璇ラ殢鏈轰簨浠躲€?,
        '- 鏃犳槑纭嚜鐒堕棷鍏ユ潯浠舵椂锛岄殢鏈轰簨浠堕棷鍏ユ潯浠跺繀椤诲啓鈥滄棤鏄庣‘鏉′欢鍒欑姝㈤棷鍏モ€濄€?,
        '鍑哄満杈圭晫瑙勫垯锛?,
        '- 鏈疆蹇呴』鍩轰簬涓婁竴杞煡璇㈣鍒掓憳瑕佺户缁敹鏁涳紱鑻ュ€欓€夊眰鍙戠敓鍙樺寲锛屼互鏈疆瀛楁浣滀负褰撳墠鍒ゆ柇锛屼笉瑕佹棤鐞嗙敱閲嶇疆鍊欓€夊眰銆?,
        '- 鐜╁/褰撳墠琚帶涓讳綋鐢辩郴缁熸渶缁堝厹搴曚负寮哄埗鍑哄満锛涘己鍒跺嚭鍦哄厑璁稿浜猴紝琛ㄧず鏈琛屽姩蹇呯劧娑夊強銆佸嚭鐜般€佸洖搴旀垨鍙楀奖鍝嶇殑浜虹墿闆嗗悎銆?,
        '- 涓嶅己鍒跺嚭鍦轰笉绛変簬绂佹鍑哄満锛涚姝㈠嚭鍦哄彧鐢ㄤ簬鏄庣‘鍦哄銆佹槑纭笉鍙埌杈炬垨琚敤鎴?璧勬枡瑙勫垯鏄庣‘绂佹杩涘叆褰撳墠鍦烘櫙鐨勮鑹层€?,
        '- 鍚屽湴鐐?鍚屼綇/鐩搁偦鍊欓€変笉寰椾粎鍥犳湭寮哄埗鍑哄満鑰屽啓鍏ョ姝㈠嚭鍦猴紱鍙寜鐩稿叧鎬ф斁鍏ラ珮浼樺厛鍊欓€夋垨鎴忓墽鍊欓€夛紝鎴栧啓鈥滄棤鈥濄€?,
        '- 鐜╁琛屽姩鏄庣‘鐩爣涓嶅緱鍐欏叆绂佹鍑哄満锛岄櫎闈炲凡鍔犺浇璧勬枡鏄庣‘鏄剧ず鍏跺満澶栥€佷笉鍙埌杈炬垨琚鍒欑姝㈣繘鍏ュ綋鍓嶅満鏅€?,
      ].join('\n');
      const contextText = [
        `鏈琛屽姩锛?{actionText}`,
        `褰撳墠姝ラ锛?{commonVars.褰撳墠姝ラ} / ${commonVars.鏈€澶ф楠`,
        '璺敱涓婁笅鏂囷細',
        stage1RoutingContext,
        '鏈疆涓婁竴杞煡璇㈣鍒掓憳瑕侊紙鍚岃疆 Stage1 姝ラ闂达級锛?,
        previousGuidance,
        '宸插姞杞借祫鏂欐憳瑕侊細',
        loadedRoutingSummary,
        '鍙姹傝祫鏂欑洰褰曪細',
        materialCatalog,
        eventStage1Context,
        '鎺ㄦ紨鑷敱搴﹁鍒欙細',
        commonVars.鎺ㄦ紨鑷敱搴﹁鍒?
        `闅忔満鍦哄瑙掕壊鍊欓€夛細${randomActiveCandidateText}`,
      ].join('\n');
      const requestText = [
        '褰撳墠姝ラ杈撳嚭瑕佹眰锛?,
        commonVars.褰撳墠姝ラ杈撳嚭瑕佹眰,
        '鍥哄畾杈撳嚭瑙勫垯锛?,
        '- 鍙緭鍑轰竴涓揣鍑?JSON 瀵硅薄锛岄瀛楃蹇呴』鏄?{锛屾湯瀛楃蹇呴』鏄?}銆?,
        '- 涓嶈 Markdown锛屼笉瑕?```json 浠ｇ爜鍧楋紝涓嶈鎹㈣瑙ｉ噴銆?,
        '- status 鍙兘浜岄€変竴锛氳祫鏂欏凡瓒冲 / 缁х画璇锋眰璧勬枡銆?,
        '- sceneQueries.location / sceneQueries.causality / sceneQueries.conflict 蹇呴』鏄瓧绗︿覆鏁扮粍锛涙病鏈夊垯 []銆?,
        '- 鑻?status 涓衡€滅户缁姹傝祫鏂欌€濓紝浼樺厛杈撳嚭 materialRequests锛屾渶澶?3 鏉★紱娌℃湁鍙墽琛岃祫鏂欒姹傛椂 materialRequests 杈撳嚭 []锛屼絾蹇呴』淇濈暀 sceneQueries 鐞嗙敱鎴栨槑纭弬涓庤€呭€欓€夈€?,
        this.stage1IterationRule(store),
        '- participants.forced / priority / drama / forbidden 閮藉繀椤绘槸瀛楃涓叉暟缁勶紱娌℃湁鍒?[]銆?,
        '- randomEvents 蹇呴』鏄瓧绗︿覆鏁扮粍锛況andomIntrusionCondition 娌℃湁鏄庣‘鏉′欢鏃跺啓鈥滄棤鏄庣‘鏉′欢鍒欑姝㈤棷鍏モ€濄€?,
        '- 璧勬枡璇锋眰鍙兘浣跨敤涓枃缁撴瀯锛屼笉寰楄緭鍑鸿嫳鏂?skill/method銆?,
        'JSON schema锛?,
        '{"plan":"鏌ヨ瑙勫垝鎽樿","status":"缁х画璇锋眰璧勬枡|璧勬枡宸茶冻澶?,"sceneQueries":{"location":["鍦扮偣鏌ヨ鐞嗙敱"],"causality":["鍥犳灉鏌ヨ鐞嗙敱"],"conflict":["鍐茬獊鏌ヨ鐞嗙敱"]},"participants":{"forced":["濮撳悕"],"priority":["濮撳悕"],"drama":["濮撳悕"],"forbidden":["濮撳悕"]},"randomEvents":["鍊欓€変簨浠?],"randomIntrusionCondition":"鏃犳槑纭潯浠跺垯绂佹闂叆","materialRequests":["瑙掕壊鏌ヨ锛屾悳绱㈣鑹插崱锛屽垬鎬濈惇锛?026鐜颁唬閮藉競鐜板疄涓栫晫"]}',
        '銆怉I鑷銆戯細',
        '- 杈撳嚭鍓嶅繀椤昏嚜妫€ status 涓?materialRequests銆乻ceneQueries銆乸articipants 鏄惁涓€鑷淬€?,
        '- 鑻?materialRequests銆乻ceneQueries銆乸articipants.forced銆乸articipants.priority銆乸articipants.drama 鍏ㄤ负绌猴紝status 蹇呴』涓衡€滆祫鏂欏凡瓒冲鈥濄€?,
        '- 涓嶅緱杈撳嚭鏃?K:V 瀛楁锛屼緥濡傗€滆祫鏂欑姸鎬侊細鈥濃€滆祫鏂欒姹?锛氣€濄€?,
      ].join('\n');
      return [
        { role: 'user', content: rulesText },
        { role: 'assistant', content: contextText },
        { role: 'user', content: requestText },
      ];
    }
    return this.renderPrompt(config.templateId, {
      ...commonVars,
      鍩虹涓婁笅鏂? base,
      鍔ㄦ€佽浇鍏ヨ祫鏂? [loadedText, materialText].filter(Boolean).join('\n\n'),
      鍔ㄦ€丼kills: skills,
    });
  },

  guidedMaxSteps(store = {}, config = this.realConfig()) {
    if (!store?.settingsState?.stage1MaterialIterationLimited) return this.maxSteps;
    const configured = Math.max(1, Math.min(8, Math.round(Number(store?.settingsState?.stage1MaterialMaxIterations) || 2)));
    return configured;
  },

  guidedMaxStepText(store = {}, config = this.realConfig()) {
    return store?.settingsState?.stage1MaterialIterationLimited ? String(this.guidedMaxSteps(store, config)) : '涓嶉檺鍒?;
  },

  guidedStepText(store = {}, step, config = this.realConfig()) {
    return `${step}/${this.guidedMaxStepText(store, config)}`;
  },

  stage1IterationRule(store = {}) {
    if (!store?.settingsState?.stage1MaterialIterationLimited) {
      return '- 璧勬枡鏀堕泦杩唬榛樿涓嶉檺鍒讹紱鍙浠嶆湁蹇呰涓旀湁鍙墽琛岃祫鏂欒姹傦紝鍙互缁х画璇锋眰璧勬枡銆傝嫢璧勬枡瓒冲銆佹棤娉曠户缁幏鍙栨垨璇锋眰寮€濮嬮噸澶嶏紝蹇呴』杩涘叆鍦烘櫙閿氬畾銆?;
    }
    const max = Math.max(1, Math.min(8, Math.round(Number(store?.settingsState?.stage1MaterialMaxIterations) || 2)));
    return `- 鏈€澶?{max}姝ュ悗杩涘叆鍦烘櫙閿氬畾锛涚${max}姝ヤ笉寰椾负浜嗛噸澶嶇‘璁よ€岀户缁墿灞曡祫鏂欏惊鐜€俙;
  },

  storyFreedomRule(store) {
    return store.online ? '鎿嶆帶鍓ф儏鑷敱搴︼細鐜╁杈撳叆鏄湰鍥炲悎瀵硅鎿嶆帶鑰呰韩浣撴垨琛屽姩鏂瑰悜鐨勬帶鍒讹紱姝ｆ枃鍙兘鎺ㄨ繘鍒版湰娆¤鍔ㄨ嚜鐒舵姷杈剧殑缁撴灉鐐癸紝涓嶆浛鐜╁瀹屾垚鍚庣画闀挎湡琛屽姩銆? : '绂荤嚎鍓ф儏鑷敱搴︼細鐜╁杈撳叆鏄缓璁垨鎬佸害锛涜鑹叉寜鎬ф牸銆佽蹇嗐€佸澧冭嚜涓昏鍔ㄣ€?;
  },

  configuredControlPerspectiveRule(store = null, config = this.realConfig()) {
    const isStoryOnline = config?.mode === 'story' && Boolean(store?.online);
    const shared = config?.mode === 'real' ? store?.sharedControlState?.() : null;
    if (!isStoryOnline && !shared) return '';
    const target = config?.mode === 'real'
      ? String(shared?.profile?.name || shared?.name || '琚帶鑰?).trim()
      : String(store?.character?.name || '琚帶鑰?).trim();
    const player = '鎱庝簩';
    return [
      '涓婄嚎闄勮韩鎺у埗瑙嗚瑙勫垯锛堥珮浼樺厛绾э級锛?,
      `- ${player}鍙互涓€蹇冧簩鐢細鍚屼竴鎰忚瘑鑳藉悓鏃舵帶鍒惰嚜宸辩殑鐜板疄鏈綋涓?{target}鐨勮韩浣擄紝骞跺悓鏃舵帴鏀朵袱涓倝浣撶殑瑙嗚銆佸惉瑙夈€佽Е瑙夈€佺棝瑙夈€佺柌鍔炽€佸懠鍚搞€佸钩琛＄瓑鎰熷畼鍙嶉銆俙,
      `- ${target}鐨勮韩浣撹鍔ㄦ潈琚?{player}鎺ョ锛涢櫎闈炵郴缁熸垨鍓ф儏鏄庣‘瑙ｉ櫎鎺у埗锛?{target}涓嶈兘鑷富澶哄洖韬綋銆佷笉鑳借韬綋杩濊儗鐜╁鏈鎺у埗琛屽姩銆俙,
      `- ${target}鐨勬剰璇嗕粛娓呴啋瀛樺湪锛岃兘澶熷畬鏁存劅瑙夎嚜宸辫韩浣撶殑鎵€鏈夋劅瀹樺弽棣堬紝涔熶細浜х敓鎶楁嫆銆佸洶鎯戙€佺緸鑰汇€佹劋鎬掋€佹亹鎯с€佽瘯鎺㈡垨椤轰粠绛夊唴蹇冨弽搴旓紱姝ｆ枃蹇呴』淇濈暀涓€閮ㄥ垎${target}鐨勫績鐞嗘兂娉曘€佹儏缁拰韬綋鎰熷彈銆俙,
      `- AI鐢熸垚鐨勬鏂囧繀椤讳互鐜╁鍦?{target}韬綋鍐呯殑绗簩浜虹О瑙嗚涓轰富鏉ユ弿缁樿鍔紝涔熷氨鏄互鐜╁鍦ㄨ鎺ц€呰韩浣撳唴鐨勯檮韬綋楠屾帹杩涳細閲嶇偣鍐欌€滀綘鈥濆浣曢€氳繃琚帶韬綋鐪嬭銆佺Щ鍔ㄣ€佽Е纰般€佸彂澹般€佹劅鍙楄倢鑲変笌鐜鍙嶉锛涘悓鏃剁┛鎻?{target}鎰忚瘑閲岀殑鎯虫硶鍜屾劅鍙椼€俙,
      `- 闄勮韩瑙嗚鍔ㄤ綔褰掑睘瑙勫垯锛氬彧瑕佺帺瀹舵病鏈夋槑纭啓鈥?{player}鏈綋鈥濃€滅幇瀹炶韩浣撯€濃€滃閮ㄧ殑鎴戔€濇垨鈥滆鍏朵粬浜烘墽琛屸€濓紝鎵€鏈夆€滀綘/鎴?鎵?韬綋/浼告墜/瑙︾/鎹?鎸?绉诲姩/璇磋瘽鈥濈瓑琛屽姩閮介粯璁ゆ槸${target}鐨勮韩浣撲翰鑷墽琛岋紱涓嶈鍐欐垚${player}鐨勭幇瀹炴湰浣撲粠澶栭儴瀵?{target}琛屽姩銆俙,
      `- 涓嶈鎶?{target}鍐欐垚澶卞幓鎰忚瘑銆佹柇鐗囥€佸畬鍏ㄦ棤鎰熸垨鍙嚜鐢辨搷鎺ц嚜宸辫韩浣擄紱涔熶笉瑕佹妸姝ｆ枃涓昏瑙掑垏鍥炵函鏃佽鎴栧彧鍐欑帺瀹剁幇瀹炴湰浣撱€俙,
    ].join('\n');
  },

  stepOutputRule(step, forceFinal = false) {
    if (forceFinal) {
      return '褰撳墠涓烘敹鏁涙楠わ細绂佹缁х画璇锋眰璧勬枡銆傚彧杈撳嚭涓€涓揣鍑?JSON 瀵硅薄锛泂tatus 蹇呴』涓衡€滆祫鏂欏凡瓒冲鈥濓紝materialRequests 蹇呴』涓?[]锛宻ceneQueries 涓?participants 鎸夊凡纭浜嬪疄濉啓锛涗笉寰楄緭鍑烘鏂囥€佹梺鐧姐€丮arkdown銆佷唬鐮佸潡鎴?final JSON銆?;
    }
    if (step === 1) {
      return '褰撳墠鏄1姝ワ細浣犳槸涓婁笅鏂囪矾鐢卞櫒锛屽彧鍒ゆ柇涓轰簡鍑嗙‘鐢熸垚鏈琛屽姩鑼冨洿鍐呮鏂囬渶瑕佽浇鍏ュ摢浜涘凡鏈夎祫鏂欙紝骞跺敖鍙兘澶氳€屽叏鍦板垪鍑?sceneQueries 涓殑鍦扮偣/鍥犳灉/鍐茬獊鏌ヨ鐞嗙敱銆傚彧杈撳嚭 Stage1 JSON schema锛涗笉瑕佸啓姝ｆ枃锛屼笉瑕佺粨绠楃姸鎬侊紝涓嶈鎺ㄦ紨鍚庣画缁撴灉銆?;
    }
    if (step >= 2) {
      return `褰撳墠鏄${step}姝?鍚庣画璧勬枡璺敱姝ラ锛氱户缁娇鐢?Stage1 JSON schema 鏀舵暃璧勬枡闇€姹傘€傝揪鍒拌缃殑璧勬枡鏀堕泦杩唬鏈€澶ф鏁板悗锛岀郴缁熶細甯︾潃宸插姞杞借祫鏂欎笌 sceneQueries 杩涘叆鍦烘櫙閿氬畾锛涜嫢娌℃湁鍙墽琛?materialRequests锛屽厑璁?materialRequests 涓?[] 浣嗕繚鐣?sceneQueries 鎴?participants 鍊欓€夈€備笉瑕佽緭鍑轰腑鏂?K:V銆佹鏂囥€佹梺鐧姐€丮arkdown銆佷唬鐮佸潡鍜?final JSON銆俙;
    }
    return '褰撳墠鍙礋璐ｅ垽鏂槸鍚︾户缁敹闆嗚祫鏂欙細鍙緭鍑?Stage1 JSON schema銆備粛缂哄叧閿祫鏂欏氨鍐?status鈥滅户缁姹傝祫鏂欌€濆苟鍒楀嚭 materialRequests锛涜祫鏂欒冻澶熸垨鏃犳硶缁х画鑾峰彇鏃跺啓 status鈥滆祫鏂欏凡瓒冲鈥濅笖 materialRequests 涓?[]銆備笉瑕佽緭鍑轰腑鏂?K:V銆佹鏂囥€佹梺鐧姐€丮arkdown銆佷唬鐮佸潡鍜?final JSON銆?;
  },

  stage1JsonRetryInstruction(err = {}, semanticSelfCheckFailed = false) {
    const droppedSummary = this.summarizeDroppedMaterialRequests(err.parseResult?.droppedMaterialRequests || []);
    const parseDetail = err.parseResult
      ? `score=${err.parseResult.score}/${err.parseResult.maxScore} successRate=${err.parseResult.successRate} missing=${err.parseResult.missing?.join('銆?) || '鏃?} droppedMaterialRequests=${droppedSummary}`
      : '';
    return [
      `涓婃 Stage1 JSON ${semanticSelfCheckFailed ? '璇箟鑷澶辫触' : '瑙ｆ瀽澶辫触'}锛?{err.message}${parseDetail ? `锛?{parseDetail}锛塦 : ''}`,
      `宸茬‘璁ゅ瓧娈碉細${err.parseResult?.keyHits?.join('銆?) || '鏃?}`,
      `宸茬‘璁ゅ瓧娈靛€硷細\n${this.confirmedKvValuesText(err.parseResult)}`,
      `缂哄け瀛楁锛?{err.parseResult?.missing?.join('銆?) || '鏈煡'}`,
      `宸蹭涪寮冭祫鏂欒姹傦細${droppedSummary}`,
      '璇烽噸鏂拌緭鍑哄畬鏁?Stage1 JSON 瀵硅薄锛涘繀椤讳繚鐣欏凡纭瀛楁鍊硷紝鍙ˉ榻愭垨淇缂哄け/閿欒瀛楁锛涗笉寰楀垹闄ょ敤鎴锋槑纭害鏉熴€乫orbidden 鎴栧凡纭 forced锛涗笉瑕侀噸澶嶈緭鍑哄凡涓㈠純 materialRequests銆?,
      '銆怉I鑷銆戣嫢 status 涓衡€滅户缁姹傝祫鏂欌€濓紝浼樺厛杈撳嚭鏈€澶?3 鏉?materialRequests 鎴栨槑纭?participants 鍊欓€夛紱鑻ユ病鏈夊彲鎵ц materialRequests锛屽繀椤讳繚鐣欏敖鍙兘澶氳€屽叏鐨?sceneQueries锛岀郴缁熶細甯︾潃杩欎簺鐞嗙敱杩涘叆鍦烘櫙閿氬畾銆備笉寰楄緭鍑轰腑鏂?K:V 鎴栨棫瀛楁鈥滆祫鏂欑姸鎬侊細鈥濃€滆祫鏂欒姹?锛氣€濄€?,
    ].join('\n\n');
  },

  previousGuidanceSummary(guidance = null) {
    const ctx = window.GameModules.realWorldAgentContext;
    if (ctx?.stage1GuidanceSummary) return ctx.stage1GuidanceSummary(guidance);
    if (!guidance) return '鏃?;
    const names = (group = [], reasonLabel = '鐞嗙敱') => (Array.isArray(group) ? group : []).map((item) => {
      const name = item.name || item.idOrName || item.id || item.characterName;
      return `${name}${item.reason ? `锛?{reasonLabel}锛?{item.reason}锛塦 : ''}`;
    }).join('銆?) || '鏃?;
    const random = (Array.isArray(guidance.randomActiveEvents) ? guidance.randomActiveEvents : [])
      .map((item) => `${item.characterName || item.name}锛?{item.eventType || item.actionMethod || '鑳屾櫙琛屽姩'}锝?{item.motivation || item.reason || ''}`)
      .join('锛?) || '鏃?;
    const queryReasons = (label, key) => {
      const items = [...new Set(Array.isArray(guidance.sceneQueries?.[key]) ? guidance.sceneQueries[key] : [])];
      return items.length ? items.map((item, index) => `${label}${index + 1}锛?{item}`).join('\n') : `${label}1锛氭棤`;
    };
    return [
      `璧勬枡鐘舵€侊細${guidance.type === 'context_done' ? '璧勬枡宸茶冻澶? : '缁х画璇锋眰璧勬枡'}`,
      queryReasons('鍦扮偣鏌ヨ鐞嗙敱', 'location'),
      queryReasons('鍥犳灉鏌ヨ鐞嗙敱', 'causality'),
      queryReasons('鍐茬獊鏌ヨ鐞嗙敱', 'conflict'),
      `寮哄埗鍑哄満锛?{names(guidance.forcedParticipants, '鍑哄満鐞嗙敱')}`,
      `楂樹紭鍏堝€欓€夛細${names(guidance.priorityCandidates, '鍊欓€夌悊鐢?)}`,
      `鎴忓墽鍊欓€夛細${names(guidance.dramaCandidates, '鍊欓€夌悊鐢?)}`,
      `绂佹鍑哄満锛?{names(guidance.forbiddenParticipants, '涓嶅湪鍦虹悊鐢?)}`,
      `闅忔満涓诲姩浜嬩欢锛?{random}`,
      `闅忔満浜嬩欢闂叆鏉′欢锛?{guidance.randomIntrusionCondition || '鏃犳槑纭潯浠跺垯绂佹闂叆'}`,
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
    return '杩炵画鎬у厹搴曡鍒欙紙鏈€楂樹紭鍏堢骇锛夛細濡傛灉鈥滄湰娆¤鍔ㄢ€濅负绌恒€佹棤鏁堛€佹槑鏄炬槸 [object Object]銆乽ndefined銆乶ull銆丣SON瀵硅薄鎴栨棤娉曡В閲婁负鐜╁鎰忓浘锛屽垯涓嶈鍙﹁捣鏂板満鏅紝涓嶈鍙戞槑鏂拌鍔紱搴旀妸鏈琛屽姩瑙嗕负鈥滅户缁壙鎺ユ渶杩戜笘鐣岀嚎鈥濓紝涓ユ牸浠庢渶杩戜笘鐣岀嚎鏈€鍚庝竴骞曘€佸綋鍓嶄汉鐗╀綅缃€佸姩浣滅姸鎬佸拰瀵硅瘽鐘舵€佽嚜鐒剁画鍐欍€傝嫢鏈琛屽姩鏄湁鏁堣嚜鐒惰瑷€锛屽嵆浣夸笌鍓嶆枃寮辩浉鍏筹紝涔熷繀椤诲厛鎵挎帴褰撳墠鍦烘櫙锛屽啀鑷劧鎵ц璇ヨ鍔ㄣ€?;
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
    return '杩斿洖蹇呴』绱у噾锛氫笉瑕丮arkdown銆佷笉瑕佹爣棰樸€佷笉瑕佷换鍔¤鏄庛€佷笉瑕佹崲琛岀銆佷笉瑕佸埗琛ㄧ銆佷笉瑕佷笉鍙瀛楃锛屽彧杈撳嚭鍗曡姝ｆ枃鏂囨湰銆?;
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
        reason: '鐜╁褰撳墠鎺у埗涓讳綋',
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
    const systemForced = this.currentForcedParticipants(store, config).map((item) => ({ ...item, role: item.role || 'actor', canSettle: true, reason: item.reason || '绯荤粺鍥哄畾寮哄埗鍑哄満' }));
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
    const latestCondition = [...items].reverse().find((item) => item?.randomIntrusionCondition)?.randomIntrusionCondition || '鏃犳槑纭潯浠跺垯绂佹闂叆';
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
    const names = (group = [], reasonLabel = '鐞嗙敱') => group.map((item) => {
      const name = item.name || item.idOrName || item.id || item.characterName;
      return `${name}${item.reason ? `锛?{reasonLabel}锛?{item.reason}锛塦 : `锛?{reasonLabel}锛氶渶鍦ㄥ満鏅敋瀹氫腑鏄庣‘锛塦}`;
    }).join('銆?) || '鏃?;
    const random = (layers.randomActiveEvents || []).map((item) => `${item.characterName || item.name}锛?{item.eventType || item.actionMethod || '鑳屾櫙琛屽姩'}锝?{item.motivation || item.reason || ''}`).join('锛?) || '鏃?;
    const query = (label, key) => {
      const items = [...new Set(Array.isArray(layers.sceneQueries?.[key]) ? layers.sceneQueries[key] : [])];
      return items.length ? items.map((item, index) => `${label}${index + 1}锛?{item}`).join('\n') : `${label}1锛氭棤`;
    };
    return [`寮哄埗鍑哄満锛?{names(layers.forcedParticipants, '鍑哄満鐞嗙敱')}`, `楂樹紭鍏堝€欓€夛細${names(layers.priorityCandidates, '鍑哄満鎴栦笉鍑哄満鐞嗙敱')}`, `鎴忓墽鍊欓€夛細${names(layers.dramaCandidates, '鍑哄満鎴栦笉鍑哄満鐞嗙敱')}`, `绂佹鍑哄満锛?{names(layers.forbiddenParticipants, '涓嶅嚭鍦虹悊鐢?)}`, query('鍦扮偣鏌ヨ鐞嗙敱', 'location'), query('鍥犳灉鏌ヨ鐞嗙敱', 'causality'), query('鍐茬獊鏌ヨ鐞嗙敱', 'conflict'), `闅忔満涓诲姩浜嬩欢锛?{random}`, `闅忔満浜嬩欢闂叆鏉′欢锛?{layers.randomIntrusionCondition || '鏃犳槑纭潯浠跺垯绂佹闂叆'}`].join('\n');
  },

  async buildConfiguredSceneAnchorPrompt({ store, action, base, loaded, trace = [], effectiveSceneLayers = null, materialSession = null, config = this.realConfig() }) {
    const actionText = this.actionText(action, config.mode === 'story' ? '缁х画鎺ㄨ繘鎿嶆帶鍓ф儏' : '缁х画瑙傚療鐜板疄涓栫晫');
    const layers = effectiveSceneLayers || this.resolveEffectiveSceneLayers(trace, store, config);
    const eventNarrationContext = store.eventNarrationPromptContext?.(actionText) || '';
    const anchorContext = config.ctx.buildSceneAnchorContext?.({ store, action: actionText, loaded, trace, effectiveSceneLayers: layers, materialSession, config }) || [
      `妯″紡锛?{config.label}`,
      `鏈琛屽姩锛?{actionText}`,
      `鍙備笌鑰呰竟鐣岋細\n${this.sceneLayerSummary(layers, store, config)}`,
    ].join('\n');
    const controlPerspectiveContext = this.configuredControlPerspectiveRule(store, config);
    const anchorContextWithEvents = [anchorContext, eventNarrationContext, controlPerspectiveContext].filter(Boolean).join('\n');
    const body = await this.renderPrompt('inference-stage2-scene-anchor', {
      妯″紡鏍囩: config.label,
      鏈琛屽姩: actionText,
      鍦烘櫙閿氬畾涓婁笅鏂? anchorContextWithEvents,
      绱у噾杩斿洖瑙勫垯: this.compactReturnRule('prose'),
    });
    return body;
  },

  parseSceneAnchorReport(raw, config = this.realConfig()) {
    const jsonData = this.parseSceneAnchorJson(raw, config);
    if (jsonData) return jsonData;
    const parsed = this.parseChineseKvBlock(raw, this.sceneAnchorFields(), { config });
    const hardAnchors = ['褰撳墠鍦扮偣', '褰撳墠鏃堕棿', '绌洪棿鐘舵€?, '褰撳墠鍔ㄤ綔'];
    const missingHardAnchor = hardAnchors.some((key) => !String(parsed.values?.[key] || '').trim());
    if (parsed.successRate < 0.8 || missingHardAnchor) throw new Error('鍦烘櫙閿氬畾鎶ュ憡瑙ｆ瀽閿欒璇烽噸璇?);
    const v = parsed.values;
    this.assertSceneParticipantBoundary(v);
    const currentSceneImpactObjects = v['褰撳墠鍦烘櫙褰卞搷瀵硅薄'] || '';
    const orderedText = this.sceneAnchorFields().map((key) => `${key}锛?{v[key] || ''}`).join('\n');
    return { text: orderedText, currentLocation: v['褰撳墠鍦扮偣'] || '', currentTime: v['褰撳墠鏃堕棿'] || '', writingFocus: v['姝ｆ枃鍐欎綔閲嶇偣'] || '', currentSceneImpactObjects, settlementBoundary: currentSceneImpactObjects, values: v, parseScore: { score: parsed.score, maxScore: parsed.maxScore, successRate: parsed.successRate }, parseDegraded: parsed.successRate < 1 };
  },

  parseSceneAnchorJson(raw, config = this.realConfig()) {
    const data = this.parseCompactSettlementJson(raw);
    if (!data || Array.isArray(data) || typeof data !== 'object') return null;
    const pick = (...keys) => {
      for (const key of keys) {
        const value = data[key];
        const text = this.sceneAnchorJsonText(value);
        if (text) return text;
      }
      return '';
    };
    const impactValue = data.currentSceneImpactObjects ?? data.impactObjects ?? data.settlementBoundary ?? data['褰撳墠鍦烘櫙褰卞搷瀵硅薄'];
    const sceneImpactObjects = this.sceneAnchorImpactGroups(impactValue);
    const values = {
      '鍦烘櫙閿氬畾鎶ュ憡': pick('sceneAnchorReport', 'report', '鍦烘櫙閿氬畾鎶ュ憡'),
      '褰撳墠鍦扮偣': pick('currentLocation', 'location', '褰撳墠鍦扮偣'),
      '褰撳墠鏃堕棿': pick('currentTime', 'time', '褰撳墠鏃堕棿'),
      '绌洪棿鐘舵€?: pick('spatialState', 'spaceState', '绌洪棿鐘舵€?),
      '褰撳墠鍔ㄤ綔': pick('currentAction', 'action', '褰撳墠鍔ㄤ綔'),
      '寮哄埗鍑哄満': pick('forcedParticipants', 'forced', '寮哄埗鍑哄満'),
      '楂樹紭鍏堝€欓€?: pick('priorityCandidates', 'priority', '楂樹紭鍏堝€欓€?),
      '鎴忓墽鍊欓€?: pick('dramaCandidates', 'drama', '鎴忓墽鍊欓€?),
      '绂佹鍑哄満': pick('forbiddenParticipants', 'forbidden', '绂佹鍑哄満'),
      '闅忔満浜嬩欢褰卞搷': pick('randomEventImpact', 'randomEvent', '闅忔満浜嬩欢褰卞搷'),
      '姝ｆ枃鍐欎綔閲嶇偣': pick('writingFocus', 'focus', '姝ｆ枃鍐欎綔閲嶇偣'),
      '褰撳墠鍦烘櫙褰卞搷瀵硅薄': this.sceneAnchorJsonText(impactValue) || pick('currentSceneImpactObjects', 'impactObjects', 'settlementBoundary', '褰撳墠鍦烘櫙褰卞搷瀵硅薄'),
    };
    const hardAnchors = ['褰撳墠鍦扮偣', '褰撳墠鏃堕棿', '绌洪棿鐘舵€?, '褰撳墠鍔ㄤ綔'];
    const missingHardAnchor = hardAnchors.some((key) => !String(values[key] || '').trim());
    if (missingHardAnchor || !values['姝ｆ枃鍐欎綔閲嶇偣'] || !values['褰撳墠鍦烘櫙褰卞搷瀵硅薄']) throw new Error('鍦烘櫙閿氬畾鎶ュ憡瑙ｆ瀽閿欒璇烽噸璇?);
    this.assertSceneParticipantBoundary(values);
    const orderedText = this.sceneAnchorFields().map((key) => `${key}锛?{values[key] || ''}`).join('\n');
    const currentSceneImpactObjects = values['褰撳墠鍦烘櫙褰卞搷瀵硅薄'] || '';
    return { text: orderedText, currentLocation: values['褰撳墠鍦扮偣'] || '', currentTime: values['褰撳墠鏃堕棿'] || '', writingFocus: values['姝ｆ枃鍐欎綔閲嶇偣'] || '', currentSceneImpactObjects, settlementBoundary: currentSceneImpactObjects, sceneImpactObjects, values, parseScore: { score: this.sceneAnchorFields().length, maxScore: this.sceneAnchorFields().length, successRate: 1 }, parseDegraded: false, format: 'json' };
  },

  sceneAnchorJsonText(value) {
    if (value === undefined || value === null) return '';
    if (Array.isArray(value)) return value.map((item) => this.sceneAnchorJsonText(item)).filter(Boolean).join('銆?);
    if (typeof value === 'object') {
      const direct = value.name || value.characterName || value.idOrName || value.id || value.text || value.value || value.summary || value.description;
      const reason = value.reason || value.evidence || value.rationale || value['鐞嗙敱'];
      if (direct && !this.sceneAnchorHasImpactGroups(value)) return reason ? `${String(direct).trim()}锛?{String(reason).trim()}锛塦 : String(direct).trim();
      const groups = [
        ['people', '浜虹墿'], ['persons', '浜虹墿'], ['characters', '浜虹墿'],
        ['locations', '鍦扮偣'], ['places', '鍦扮偣'],
        ['items', '鐗╁搧'], ['objects', '鐗╁搧'],
        ['systems', '绯荤粺'], ['facts', '浜嬪疄'],
      ].map(([key, label]) => {
        const text = this.sceneAnchorJsonText(value[key]);
        return text ? `${label}锛?{text}` : '';
      }).filter(Boolean);
      const summary = this.sceneAnchorJsonText(value.summary || value.description);
      if (summary && !groups.some((item) => item.includes(summary))) groups.push(`鎽樿锛?{summary}`);
      return groups.join('锛?) || JSON.stringify(value);
    }
    return String(value ?? '').trim();
  },

  sceneAnchorHasImpactGroups(value = {}) {
    return ['people', 'persons', 'characters', 'locations', 'places', 'items', 'objects', 'systems', 'facts'].some((key) => Array.isArray(value?.[key]) || String(value?.[key] ?? '').trim());
  },

  sceneAnchorImpactGroups(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const read = (...keys) => keys.flatMap((key) => {
      const raw = value[key];
      if (raw === undefined || raw === null) return [];
      return (Array.isArray(raw) ? raw : [raw]).map((item) => this.sceneAnchorJsonText(item)).filter(Boolean);
    });
    const groups = {
      people: read('people', 'persons', 'characters'),
      locations: read('locations', 'places'),
      items: read('items', 'objects'),
      systems: read('systems'),
      facts: read('facts'),
      summary: this.sceneAnchorJsonText(value.summary || value.description),
    };
    return Object.values(groups).some((item) => Array.isArray(item) ? item.length : Boolean(item)) ? groups : null;
  },

  sceneAnchorNameSet(value = '') {
    return new Set(this.splitNameList(value).map((item) => String(this.parseParticipantToken(item)?.name || item || '').replace(/[锛?].*$/u, '').trim()).filter(Boolean));
  },

  assertSceneParticipantBoundary(values = {}) {
    const forbidden = this.sceneAnchorNameSet(values['绂佹鍑哄満']);
    if (!forbidden.size) return;
    const conflicted = ['寮哄埗鍑哄満', '楂樹紭鍏堝€欓€?, '鎴忓墽鍊欓€?].flatMap((key) => [...this.sceneAnchorNameSet(values[key])].filter((name) => forbidden.has(name)));
    if (conflicted.length) throw new Error(`鍚屼竴瑙掕壊涓嶈兘鍚屾椂鍑虹幇鍦ㄥ€欓€?寮哄埗鍑哄満鍜岀姝㈠嚭鍦猴細${[...new Set(conflicted)].join('銆?)}`);
  },

  async completeSceneAnchorReport(store, prompt, logId, config = this.realConfig()) {
    let best = null;
    let lastErr = null;
    for (let i = 0; i < 2; i += 1) {
      const raw = await this.completeConfiguredStep(store, prompt, logId, false, { ...config, sourceTitle: `${config.label}鍦烘櫙閿氬畾`, promptId: 'inference-stage2-scene-anchor' });
      try {
        const data = this.parseSceneAnchorReport(raw, config);
        if (!best || data.parseScore.successRate >= best.data.parseScore.successRate) best = { raw, data, text: data.text };
        return best;
      } catch (err) {
        lastErr = err;
        prompt = `${prompt}\n\n涓婃鍦烘櫙閿氬畾 JSON 瑙ｆ瀽澶辫触锛?{err.message}銆傝閲嶆柊杈撳嚭涓€涓悎娉?JSON object锛屽繀椤诲寘鍚?currentLocation銆乧urrentTime銆乻patialState銆乧urrentAction銆亀ritingFocus銆乧urrentSceneImpactObjects銆俙;
      }
    }
    if (best) return best;
    throw lastErr || new Error('鍦烘櫙閿氬畾鎶ュ憡瑙ｆ瀽閿欒璇烽噸璇?);
  },

  buildConfiguredNarrationMessages({ store, action, prompt = '', config = this.realConfig() }) {
    const actionText = this.actionText(action, config.mode === 'story' ? '缁х画鎺ㄨ繘鎿嶆帶鍓ф儏' : '缁х画瑙傚療鐜板疄涓栫晫');
    const priorKvCount = config.kvCacheSession?.messages?.length || 0;
    const recent = priorKvCount ? '' : this.recentNarrationForMessages(store, config);
    const messages = [{ role: 'user', content: String(prompt || '') }];
    if (recent) messages.push({ role: 'assistant', content: recent });
    messages.push({ role: 'user', content: `鏍规嵁鍓嶉潰鐨勮鍒欎笌璧勬枡锛屾帹婕斺€滄湰娆¤鍔ㄢ€濓紝瀛楁暟蹇呴』鍦?000 - 1400瀛椾箣闂淬€俓n鏈琛屽姩锛?{actionText}` });
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
      return [`鏈€杩戝凡鍙戠敓姝ｆ枃${index + 1}锛歚, action ? `瀵瑰簲琛屽姩锛?{action}` : '', limitText(body)].filter(Boolean).join('\n');
    }).join('\n---\n');
    return text || '鏆傛棤鏈€杩戝凡鍙戠敓姝ｆ枃锛涜浠ョ涓€鏉?user 娑堟伅涓殑鎽樿鍜岃祫鏂欎负鍑嗐€?;
  },

  async buildConfiguredNarrationPrompt({ store, action, base, loaded, skills, materialSession = null, sceneAnchorReport = '', config = this.realConfig() }) {
    const actionText = this.actionText(action, config.mode === 'story' ? '缁х画鎺ㄨ繘鎿嶆帶鍓ф儏' : '缁х画瑙傚療鐜板疄涓栫晫');
    const narrationContext = config.ctx.buildNarrationContext?.({ store, action: actionText, config }) || this.compactUpdatePromptText(base, 1600);
    const loadedText = config.ctx.loadedNarrationSummary?.(loaded) || config.ctx.buildLoadedText(loaded) || '鏃?;
    const writingStyle = store.selectedWritingStylePrompt?.() || store.writingStylePrompt?.() || '姝ｆ枃閲囩敤灏忚鏂囬锛岄噸瑙嗙敾闈€佸姩浣溿€佹劅瀹樺拰蹇冪悊鍙嶅簲锛岄伩鍏嶅杩扮帺瀹舵寚浠ゃ€?;
    const eventNarrationContext = store.eventNarrationPromptContext?.(actionText) || '';
    const controlPerspectiveRule = this.configuredControlPerspectiveRule(store, config);
    const modeRule = config.mode === 'story'
      ? `鎺ㄦ紨鑷敱搴︼細${this.storyFreedomRule(store)}\n鐜╁涓嶆槸瑙掕壊鏈汉锛岃€屾槸鎿嶆帶/褰卞搷琚搷鎺ц€呰鍔ㄧ殑瀛樺湪锛涙鏂囧繀椤诲啓鍑烘湰娆¤鍔ㄧ殑鍔ㄤ綔杩囩▼銆佺幆澧冨彉鍖栥€佸叾浠栦汉鐗╁弽搴斻€佽鎿嶆帶鑰呰韩浣撲笌蹇冪悊寮犲姏銆佺洿鎺ョ粨鏋溿€俙
      : `鎺ㄦ紨鑷敱搴︼細${store.realWorldFreedomRule?.() || '鍙帹婕旂帺瀹舵湰娆¤緭鍏ヨ鍔ㄨ嚜鐒舵姷杈剧殑鐩存帴缁撴灉銆?}`;
    const narrationRules = '琛屽姩鑼冨洿鍐呭厖鍒嗘帹婕旓細鍐欏嚭鏈琛屽姩鐨勫姩浣滆繃绋嬨€佽韩浣撴劅鍙椼€佸懆鍥寸幆澧冨彉鍖栥€佸彲瑙佺粏鑺傘€佷粬浜哄弽搴斻€佸璇濆洖搴斿拰鐩存帴鐭湡杩為攣褰卞搷锛涘満鏅敋瀹氭姤鍛婁腑鐨勫己鍒跺嚭鍦哄繀椤诲湪姝ｆ枃涓疄闄呭嚭鐜般€佽鍔ㄦ垨鍥炲簲锛涗笉鏇跨帺瀹舵墽琛屼笅涓€姝ユ柊琛屽姩锛涗笉鎶婁翰鍚汇€佹姎鎽搞€佹懇鎿︺€佹寜浣忕瓑琛屼负鑷姩鎵╁睍涓鸿劚琛ｃ€佽浆绉诲湴鐐广€佹彃鍏ャ€侀珮娼瓑鏈緭鍏ョ殑鏂伴樁娈点€?;
    const completenessRules = [
      '姝ｆ枃瀹屾暣鎬ц鍒欙細',
      '- 姝ｆ枃蹇呴』褰㈡垚瀹屾暣灏忔钀斤細杩涘叆鍔ㄤ綔 鈫?鐜板満鍙嶉 鈫?瀵规柟鍙嶅簲 鈫?鐭湡缁撴灉钀界偣銆?,
      '- 鍗充娇鏈琛屽姩鍥犺竟鐣屻€乧onsent銆佸勾榫勩€佸叧绯绘垨瀹夊叏闄愬埗涓嶈兘缁х画鎻忓啓锛屼篃涓嶅緱鐭緭鍑恒€?,
      '- 鑻ヤ笉鑳芥弿鍐欑帺瀹惰緭鍏ヤ腑鐨勬煇浜涜偄浣撴垨鎬у寲缁嗚妭锛屽繀椤绘敼鍐欎负鍏佽鎻忓啓鐨勭幇鍦哄弽搴旓細瑙掕壊瀵熻銆佸埗姝€佸悗閫€銆佽川闂€佹矇榛樸€佹儏缁彉鍖栥€佹埧闂寸幆澧冨０鍝嶅彉鍖栥€佽繘鍏ユ柟寮忋€佽Е鍙戝弽搴斻€佸弻鏂硅窛绂诲彉鍖栥€佽瑷€/娌夐粯銆佽韩浣撳Э鎬侊紝浣嗗繀椤绘牴鎹凡鏈夎祫鏂欑鍚堥€昏緫銆?,
      '- 涓嶈鍙啓鈥滃ス鍦ㄦ埧闂撮噷鈥濇垨鍙啓鍦烘櫙寮€澶达紱蹇呴』鎶婃湰娆¤鍔ㄦ帹婕斿埌涓€涓槑纭殑鍗虫椂钀界偣銆?,
      '- 鐩爣闀垮害 1000-1400 涓枃瀛楃锛涗綆浜?1000 姹夊瓧瑙嗕负涓嶅悎鏍硷紝涓嶈鎻愬墠鍋滄銆?,
      '- 寮哄埗杈撳嚭缁撴瀯鍙綔涓哄唴閮ㄥ啓浣滈厤姣旓紝鏈€缁堟鏂囦粛蹇呴』鏄棤鏍囬銆佹棤缂栧彿銆佹棤鎹㈣鐨勫崟娈靛皬璇存鏂囥€?,
      '- 鐜浜旀劅娓叉煋绾?00-150瀛楋細鍐欏嚭姝ゅ埢鍦烘櫙涓殑姘斿懗銆佸厜绾裤€佽Е鎰熴€?,
      '- 瑙掕壊鍐呭績鐙櫧绾?00-250瀛楋細鍥寸粫涓婁竴杞簨浠舵垨鏈琛屽姩甯︽潵鐨勫績鐞嗘專鎵庛€佽瘯鎺㈡垨绠楄灞曞紑锛屽繀椤讳娇鐢ㄦ瘮鍠诲彞銆?,
      '- 瀵硅瘽涓庡姩浣滅粏鑺傜害400-450瀛楋細鏀炬參鍔ㄤ綔锛屽啓娓呮琛ｆ枡鎽╂摝澹般€佺溂绁炲亸绉汇€佹墜閮ㄥ皬鍔ㄤ綔銆佽窛绂诲彉鍖栧拰瀵硅瘽鍥炲簲銆?,
      '- 鎮康/鍐崇瓥閽╁瓙绾?50瀛楋細鏈疆缁撴潫鏃跺啓鍑哄績鐞嗚浆鍚戞垨涓嬩竴姝ュ帇鍔涳紝浣嗕笉鏇跨帺瀹舵墽琛屼笅涓€姝ヨ鍔ㄣ€?,
      '- 鑻ュ姩浣滄湰韬緢鐭紝灏辨寜涓婅堪鍥涘潡鎵╁睍褰撳墠闃舵鍐呴儴缁嗚妭锛岃€屼笉鏄紑鍚笅涓€姝ユ柊琛屽姩銆?,
      '- 绂佹鎶娾€淣PC鍙嶉棶鐜╁/绛夊緟鐜╁璇存槑鏉ユ剰/闂ㄥ彛鍒氭墦寮€鈥濆綋浣滄渶缁堣惤鐐癸紱蹇呴』缁х画鍐欏埌杩涘叆銆佽鎷掋€佽惤搴с€佸宄欍€佽窛绂诲彉鍖栨垨鍏崇郴寮犲姏鍙樺寲绛夋湰娆¤鍔ㄧ殑鐩存帴缁撴灉銆?,
      '绂佹瓒婄晫涓嶆槸绂佹鍐欓暱锛氫笉鍏佽涓轰簡瀛楁暟鎺ㄨ繘鍒版柊闃舵锛涗絾蹇呴』鍏呭垎鎻忓啓褰撳墠闃舵鍐呴儴缁嗚妭銆?,
    ].join('\n');
    return this.renderPrompt('inference-stage3-narration', {
      妯″紡鏍囩: config.label,
      鏈琛屽姩: actionText,
      鍩虹涓婁笅鏂? [this.continuityFallbackRule(), `灏忚绗旈锛?{writingStyle}`, modeRule, controlPerspectiveRule, narrationRules, completenessRules, eventNarrationContext, narrationContext].filter(Boolean).join('\n'),
      鍦烘櫙閿氬畾鎶ュ憡: sceneAnchorReport || '鏃?,
      宸插姩鎬佽浇鍏ヨ祫鏂? loadedText || '鏃?,
      绱у噾杩斿洖瑙勫垯: this.compactReturnRule('prose'),
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
    const name = String(store?.playerName || store?.playerProfile?.name || store?.realWorldPlayerSettlementName?.() || '鐜╁').trim() || '鐜╁';
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
    const fields = ['寮哄埗鍑哄満', '褰撳墠鍦烘櫙褰卞搷瀵硅薄'];
    return fields.flatMap((key) => this.splitNameList(values[key] || '').map((raw) => {
      const parsed = this.parseParticipantToken(raw);
      const name = String(parsed?.name || raw || '').replace(/[锛?].*$/u, '').trim();
      return name && !['鏃?, '鐜╁', '绯荤粺', playerName].includes(name) ? { type: 'character', idOrName: name, name, role: 'current-scene', canSettle: true } : null;
    }).filter(Boolean));
  },

  characterParticipants(characters = [], store = null) {
    return (Array.isArray(characters) ? characters : []).map((item) => this.characterParticipant(item, store)).filter(Boolean);
  },

  characterParticipant(item = {}, store = null) {
    const raw = typeof item === 'string' ? { name: item } : item;
    const id = String(raw?.id || raw?.idOrName || '').trim();
    const name = String(raw?.name || raw?.id || raw?.idOrName || '').trim();
    if (id === 'player-self') return { type: 'player', id: 'player-self', name: name || '鐜╁', role: 'actor' };
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
      if (!/瑙掕壊鍗?u.test(text)) return [];
      const id = text.match(/瑙掕壊ID[:锛歖\s*([^\s锝渱锛?锛?\n]+)/u)?.[1] || '';
      const name = text.match(/濮撳悕[:锛歖\s*([^\s锝渱锛?锛?\n]+)/u)?.[1] || text.match(/鑷姩璧勬枡[:锛歖\s*([^\s锝渱锛?锛?\n]+?)瑙掕壊鍗?u)?.[1] || '';
      const target = id || name;
      if (!target) return [];
      return [{ type: 'character', id: target, name, role: 'loaded-role-card' }];
    });
  },

  compactUpdatePromptText(text = '', limit = 1600, keepTail = false) {
    const raw = String(text || '').replace(/\s+/g, ' ').trim();
    if (raw.length <= limit) return raw;
    if (keepTail) return `鈥?{raw.slice(-limit)}`;
    const head = Math.ceil(limit * 0.65);
    const tail = Math.max(0, limit - head - 1);
    return `${raw.slice(0, head)}鈥?{tail ? raw.slice(-tail) : ''}`;
  },

  eventSettlementType() {
    return '浜嬩欢';
  },

  normalizeSettlementEventEntry(entry = {}, store = null, config = this.realConfig()) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
    const text = (value) => String(value ?? '').trim();
    const rawType = text(entry.type ?? entry.eventType ?? entry['浜嬩欢绫诲瀷'] ?? entry.category ?? '');
    const type = /random|闅忔満/u.test(rawType) ? 'random' : (/periodic|cycle|鍛ㄦ湡/u.test(rawType) ? 'periodic' : 'inference');
    const title = text(entry.title ?? entry.name ?? entry.eventName ?? entry['浜嬩欢鍚?] ?? '');
    const content = text(entry.content ?? entry.detail ?? entry.summary ?? entry['浜嬩欢鍐呭'] ?? '');
    if (!title || !content) return null;
    return window.GameModules.eventSystem?.normalizeEvent?.({
      ...entry,
      type,
      title,
      content,
      startDate: entry.startDate ?? entry.start ?? entry.timeStart ?? entry['寮€濮嬫椂闂?] ?? entry['浜嬩欢寮€濮嬫椂闂?] ?? entry['浜嬩欢鍙戠敓鏃堕棿娈?],
      endDate: entry.endDate ?? entry.end ?? entry.timeEnd ?? entry['缁撴潫鏃堕棿'] ?? entry['浜嬩欢缁撴潫鏃堕棿'],
      location: entry.location ?? entry.place ?? entry['浜嬩欢鍙戠敓鍦扮偣'],
      people: entry.people ?? entry.relatedPeople ?? entry.participants ?? entry['浜嬩欢鐩稿叧浜?] ?? (type === 'periodic' ? ['鎵€鏈変汉'] : []),
      tags: entry.tags ?? entry.eventTags ?? entry['浜嬩欢鏍囩'] ?? [],
      probability: entry.probability ?? entry.chance ?? entry['鍙戠敓姒傜巼'],
      source: entry.source || 'stage4',
      status: entry.status || 'active',
    }, store) || null;
  },

  settlementTypeQueue(config = this.realConfig()) {
    const base = ['鍩虹缁撶畻', '鎯呯华', '鎰熻', '鐢熷懡浣撳緛', '韬綋鐘舵€?, '绌跨潃鐘舵€?, '鎬х粡鍘?, '鎬у巻鍙?, '鍏崇郴', '瑙掕壊鍗?, '鐗╁搧', '鍦板浘', '棰嗗湡鎺у娍', '浜轰簨瀹夋帓', '鍔垮姏鎬昏', '鏀夸綋鐘舵€?, '鍔垮姏缁撴瀯', '缁勭粐鑳藉姏', '浜轰簨褰掑睘', '绯荤粺璁板綍', '閫氱敤鍥哄寲'];
    base.push(this.eventSettlementType());
    return config.mode === 'story' ? base.concat(['鎿嶆帶浣撻獙']) : base;
  },

  settlementTypeWindows(allTypes = []) {
    const types = (Array.isArray(allTypes) ? allTypes : []).filter(Boolean);
    return types.length ? [types] : [];
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
      [this.eventSettlementType()]: { title: '浜嬩欢缁撶畻', format: '鏁扮粍锛涙瘡椤?{"type":"random|inference|periodic","title":"浜嬩欢鍚?,"startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD","location":"鍦扮偣","content":"鍐呭","people":["鐩稿叧浜?],"tags":["鏍囩"],"probability":25,"status":"active"}锛涙棤浜嬩欢 []' },
      '鍩虹缁撶畻': { title: '鍩虹缁撶畻', format: '缁忚繃鏃堕棿锛氱鏁癨n褰撳墠鐘舵€侊細鐘舵€佹枃鏈琝n褰撳墠鐩爣锛氱洰鏍囨枃鏈琝n鍦烘櫙鏍囬锛氭爣棰榎n鍦扮偣鍚嶇О锛氬湴鐐瑰叏绉癨n澶囬€夎鍔?锛氳鍔ㄦ枃鏈琝n澶囬€夎鍔?锛氳鍔ㄦ枃鏈琝n澶囬€夎鍔?锛氳鍔ㄦ枃鏈琝n澶囬€夎鍔?锛氳鍔ㄦ枃鏈? },
      '鎯呯华': { title: '鎯呯华缁撶畻', format: '鏇存柊N锛氱粨绠椾富浣擄紝鎯呯华鍚嶏紝+/-鏁板€硷紝鍙樺寲鍘熷洜' },
      '鎰熻': { title: '鎰熻缁撶畻', format: '鏇存柊N锛氱粨绠椾富浣擄紝鎰熻鍚嶏紝+/-鏁板€硷紝鍙樺寲鍘熷洜' },
      '鐢熷懡浣撳緛': { title: '鐢熷懡浣撳緛缁撶畻', format: '鏇存柊N锛氱粨绠椾富浣擄紝瀛楁鍚嶏紝+/-鏁板€硷紝鍙樺寲鍘熷洜' },
      '韬綋鐘舵€?: { title: '韬綋鐘舵€佺粨绠?, format: '鏇存柊N锛氱粨绠椾富浣擄紝閮ㄤ綅鎴栫姸鎬侀敭锛屾柊鐘舵€侊紝鍙樺寲鍘熷洜' },
      '绌跨潃鐘舵€?: { title: '绌跨潃鐘舵€佺粨绠?, format: '鏇存柊N锛氱粨绠椾富浣擄紝绌跨潃閮ㄤ綅锛岃。鐗╁悕绉帮紝褰撳墠鐘舵€侊紝鍙樺寲鍘熷洜' },
      '鎬х粡鍘?: { title: '鎬х粡鍘嗙粨绠?, format: '鏇存柊N锛氱粨绠椾富浣擄紝鍒嗙被锛?/-鏁板€硷紝鍙樺寲鍘熷洜' },
      '鎬у巻鍙?: { title: '鎬у巻鍙茬粨绠?, format: '鏇存柊N锛氱粨绠椾富浣擄紝鐘舵€佽浆绉伙紝鎬у璞★紝鍘熷洜涓庤瘉鎹? },
      '鍏崇郴': { title: '鍏崇郴缁撶畻', format: '鏇存柊N锛氱粨绠椾富浣擄紝鐢叉柟(绉拌皳)锛屼箼鏂?绉拌皳)锛岀淮搴︼紝褰撳墠鐘舵€侊紝鍙樺寲鍘熷洜锛屾牴鎹€ф牸閫犳垚缁撴灉' },
      '瑙掕壊鍗?: { title: '瑙掕壊鍗＄粨绠?, format: '鏇存柊N锛氱粨绠椾富浣擄紝瀛楁锛屾浛鎹?澧炲姞锛屾柊鍊硷紝鍘熷洜锛屾牴鎹€ф牸閫犳垚缁撴灉' },
      '鐗╁搧': { title: '鐗╁搧缁撶畻', format: '鏇存柊N锛氱粨绠椾富浣擄紝鐗╁搧绫诲瀷锛岀墿鍝佸悕锛屼簨瀹炴垨鍙樺寲锛屽彉鍖栧師鍥? },
      '鍦板浘': { title: '鍦板浘缁撶畻', format: '鏇存柊N锛氱粨绠椾富浣擄紝褰撳墠浣嶇疆/涓婄骇鍦扮偣/鍦扮偣浜嬪疄/鍦板浘鑺傜偣/璺嚎浜嬪疄锛屼簨瀹烇紝鍘熷洜' },
      '棰嗗湡鎺у娍': { title: '棰嗗湡鎺у娍缁撶畻', format: '鏇存柊N锛氬湴鐐瑰悕锛屽疄鎺х粍缁?瀹ｇО缁勭粐/鎺у娍鐘舵€侊紝浜嬪疄锛屽師鍥? },
      '浜轰簨瀹夋帓': { title: '浜轰簨瀹夋帓缁撶畻', format: '鏇存柊N锛氱粨绠椾富浣擄紝褰撳墠鍦扮偣/褰撳墠琛屽姩/鍙敤鐘舵€侊紝鏂板€硷紝鍙樺寲鍘熷洜' },
      '鍔垮姏鎬昏': { title: '鍔垮姏鎬昏缁撶畻', format: '鏇存柊N锛氱粨绠椾富浣擄紝鏂板鍔垮姏/涓婂眰鍔垮姏褰掑睘/鍔垮姏APP褰掑睘锛屼簨瀹烇紝鍘熷洜' },
      '鏀夸綋鐘舵€?: { title: '鏀夸綋鐘舵€佺粨绠?, format: '鏇存柊N锛氱粍缁囧悕锛宻tatus/legitimacy/successorId锛屼簨瀹烇紝鍘熷洜' },
      '鍔垮姏缁撴瀯': { title: '鍔垮姏缁撴瀯缁撶畻', format: '鏇存柊N锛氱粨绠椾富浣擄紝閮ㄩ棬瑙掕壊/鑱屼綅/鎴愬憳鍦颁綅锛屼簨瀹烇紝鍘熷洜' },
      '缁勭粐鑳藉姏': { title: '缁勭粐鑳藉姏缁撶畻', format: '鏇存柊N锛氱粨绠椾富浣擄紝鑳藉姏缁村害/鏉＄洰鍚嶇О/鏉＄洰鐘舵€?涓婄骇褰掑睘锛屼簨瀹烇紝鍘熷洜' },
      '浜轰簨褰掑睘': { title: '浜轰簨褰掑睘缁撶畻', format: '鏇存柊N锛氳鑹插悕锛岀粍缁?閮ㄩ棬/鑱屼綅锛屼簨瀹烇紝鍘熷洜' },
      '绯荤粺璁板綍': { title: '绯荤粺璁板綍缁撶畻', format: '鏇存柊N锛氱粨绠椾富浣擄紝浜嬩欢/璁板綍/閫氫俊娑堟伅/鍓ф儏璁板綍/鐘舵€侊紝浜嬪疄锛屽師鍥? },
      '閫氱敤鍥哄寲': { title: '閫氱敤鍥哄寲缁撶畻', format: '鏇存柊N锛氱粨绠椾富浣擄紝瀛楁锛岀ǔ瀹氫簨瀹烇紝鍙樺寲鍘熷洜' },
      '鎿嶆帶浣撻獙': { title: '鎿嶆帶浣撻獙缁撶畻', format: '鏇存柊N锛氭搷鎺ф劅瑙?閫傚簲搴︼紝瀛楁锛?/-鏁板€兼垨鏂板€硷紝鍙樺寲鍘熷洜' },
    };
  },

  settlementUpdateCatalog() {
    return {
      '鎯呯华': { updateType: 'emotion', fieldPrefix: 'metrics.emotions' },
      '鎰熻': { updateType: 'feeling', fieldPrefix: 'metrics.playerFeelings' },
      '鐢熷懡浣撳緛': { updateType: 'vital', fieldMap: { '鐢熷懡鍔?: 'vitals.vitality', '绮惧姏': 'vitals.stamina_pool', '楗遍搴?: 'vitals.satiety', '姘村垎': 'vitals.hydration', '鐤插姵': 'vitals.fatigue', '绮剧绋冲畾': 'vitals.mental_stability' } },
      '韬綋鐘舵€?: { updateType: 'body-status', fieldPrefix: 'bodyStatus' },
      '绌跨潃鐘舵€?: { updateType: 'wearing-state', fieldPrefix: 'values.wearing' },
      '鎬х粡鍘?: { updateType: 'sexual-experience', fieldPrefix: 'intimacy.sexualExperienceParts' },
      '鎬у巻鍙?: { updateType: 'sexual-history', fieldPrefix: 'intimacy.sexualHistory' },
      '鍏崇郴': { updateType: 'relationship', fieldPrefix: 'relationships' },
      '瑙掕壊鍗?: { updateType: 'role-card', fieldPrefix: 'profile' },
      '鐗╁搧': { updateType: 'item', fieldPrefix: 'inventory' },
      '鍦板浘': { updateType: 'map', fieldMap: { '褰撳墠浣嶇疆': 'current', '涓婄骇鍦扮偣': 'parent', '鍦扮偣浜嬪疄': 'descriptionFacts', '鍦板浘鑺傜偣': 'mapNodes', '璺嚎浜嬪疄': 'routeLinks' } },
      '棰嗗湡鎺у娍': { updateType: 'territory-control', fieldPrefix: 'control' },
      '鍔垮姏鎬昏': { updateType: 'faction-overview', fieldPrefix: 'overview.factions' },
      '鏀夸綋鐘舵€?: { updateType: 'org-status', fieldPrefix: 'status' },
      '鍔垮姏缁撴瀯': { updateType: 'faction-structure', fieldPrefix: 'structure' },
      '????': { updateType: 'org-overview-panel', fieldPrefix: 'overviewPanels' },
      '浜轰簨褰掑睘': { updateType: 'membership', fieldPrefix: 'values.memberships' },
      '绯荤粺璁板綍': { updateType: 'system', fieldPrefix: 'events' },
      '閫氱敤鍥哄寲': { updateType: 'generic', fieldPrefix: 'status_tags' },
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
    let parts = String(line || '').replace(/^鏇存柊(?:\d+|N)\s*[锛?]/u, '').split(/[锛?]/u).map((x) => x.trim());
    const catalog = this.settlementUpdateCatalog();
    if (!catalog[parts[0]] && parts.length >= 4) {
      const inlineSubject = this.subjectForSettlement(parts[0], participants);
      if (inlineSubject) {
        subject = inlineSubject;
        parts = [typeName, ...parts.slice(1)];
      }
    }
    const [label, key, rawValue, reason, statusPart] = parts;
    const type = label || typeName;
    const entry = catalog[type];
    if (!subject || !key || !rawValue || !reason) return null;
    if (!entry) return this.parseGenericSettlementLine(typeName, line, subject, { requireExplicitGeneric: true });
    let normalizedKey = type === '鐢熷懡浣撳緛' ? this.vitalFieldAlias(key) : key;
    const rawValueText = String(rawValue).trim();
    const delta = Number(rawValueText.replace(/[^-+\d.]/gu, ''));
    const hasSignedDelta = Number.isFinite(delta) && /^[+-]\d/u.test(rawValueText) && delta !== 0;
    if (['鎯呯华', '鎰熻'].includes(type)) {
      const allowedKeys = this.settlementMetricKeysForSubject(store, subject, type);
      normalizedKey = this.metricAliasForSettlement(type, normalizedKey);
      if (!allowedKeys.includes(normalizedKey) || !hasSignedDelta) return null;
    }
    if (entry.fieldMap && !entry.fieldMap[normalizedKey]) return null;
    if (type === '鐢熷懡浣撳緛' && !hasSignedDelta) return null;
    const field = entry.fieldMap?.[normalizedKey] || `${entry.fieldPrefix}.${normalizedKey}`;
    const change = hasSignedDelta ? { mode: 'delta', value: delta } : { mode: 'set', value: rawValue };
    const status = String(statusPart || '').trim();
    if (status && ['鎯呯华', '鎰熻'].includes(type)) change.status = status;
    return { updateType: entry.updateType, subject, field, change, reasons: [{ trigger: type, evidence: reason, confidence: 'confirmed' }] };
  },

  parseMetricSettlementJsonEntry(typeName = '', entry = {}, subject = null, participants = [], store = null) {
    if (!subject || !entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
    const catalog = this.settlementUpdateCatalog();
    const entryCat = catalog[typeName];
    if (!entryCat) return null;
    const field = this.metricAliasForSettlement(typeName, String(entry.field ?? entry.瀛楁 ?? entry.key ?? '').trim());
    const rawValueText = String(entry.value ?? entry.鍙樺寲 ?? entry.delta ?? entry.鏁板€??? '').trim();
    const delta = Number(rawValueText.replace(/[^-+\d.]/gu, ''));
    const hasSignedDelta = Number.isFinite(delta) && /^[+-]\d/u.test(rawValueText) && delta !== 0;
    const reason = this.settlementJsonText(entry.reason ?? entry.鍘熷洜 ?? entry.evidence ?? entry.璇佹嵁 ?? '');
    const status = this.settlementJsonText(entry.status ?? entry.绋嬪害 ?? entry.瑙ｉ噴 ?? entry.绋嬪害璇存槑 ?? '');
    const allowedKeys = this.settlementMetricKeysForSubject(store, subject, typeName);
    if (!field || !hasSignedDelta || !reason || !allowedKeys.includes(field)) return null;
    const change = { mode: 'delta', value: delta };
    if (status) change.status = status;
    return { updateType: entryCat.updateType, subject, field: `${entryCat.fieldPrefix}.${field}`, change, reasons: [{ trigger: typeName, evidence: reason, confidence: 'confirmed' }] };
  },

  parseGenericSettlementLine(typeName = '', line = '', subject = null, options = {}) {
    const parts = String(line || '').replace(/^鏇存柊(?:\d+|N)\s*[锛?]/u, '').split(/[锛?]/u).map((x) => x.trim());
    const [label, key, rawValue, reason] = parts;
    if (!subject || !key || !rawValue || !reason) return null;
    if (options.requireExplicitGeneric && !/^(?:鏈煡绋冲畾浜嬪疄|绋冲畾浜嬪疄|閫氱敤鍥哄寲|閫氱敤浜嬪疄)$/u.test(label || '')) return null;
    return { updateType: 'generic', subject, field: `status_tags.${key}`, change: { mode: 'append', value: { label: label || typeName, value: rawValue, reason } }, reasons: [{ trigger: label || typeName, evidence: reason, confidence: 'confirmed' }] };
  },

  settlementAlias(value = '', aliases = {}) {
    const clean = String(value || '').trim();
    return aliases[clean] || clean;
  },

  metricAliasForSettlement(type = '', key = '') {
    return window.GameModules.metrics.settlementAlias(type, key);
  },

  vitalFieldAlias(field = '') {
    return this.settlementAlias(field, { 鐢熷懡鍔? '鐢熷懡鍔?, 鐢熷懡鍊? '鐢熷懡鍔?, 鍋ュ悍: '鐢熷懡鍔?, health: '鐢熷懡鍔?, 绮惧姏: '绮惧姏', 绮惧姏姹? '绮惧姏', 浣撳姏: '绮惧姏', stamina: '绮惧姏', 楗遍搴? '楗遍搴?, 楗遍: '楗遍搴?, satiety: '楗遍搴?, 姘村垎: '姘村垎', 鍙ｆ复: '姘村垎', 姘村悎: '姘村垎', hydration: '姘村垎', 鐤插姵: '鐤插姵', 鐤插姵搴? '鐤插姵', fatigue: '鐤插姵', 绮剧绋冲畾: '绮剧绋冲畾', 绮剧绋冲畾搴? '绮剧绋冲畾', mental_stability: '绮剧绋冲畾' });
  },

  allowedBodyPartKeys() { return ['overall', 'mouth', 'chest', 'genital', 'anus', 'hips', 'limbs', 'skin', 'other']; },

  allowedWearingSlots() { return ['bra', 'top', 'outerwear', 'bottom', 'legwear', 'shoes', 'panties', '楗板搧']; },

  allowedSexualPartKeys() { return ['genital', 'chest', 'lips', 'mouth', 'oralAction', 'oralSex', 'oralInternalFinish', 'genitalEntry', 'vaginalInsertion', 'vaginalInternalFinish', 'anus', 'analEntry', 'analSex', 'analInternalFinish', 'legs', 'hips', 'hands', 'skin', 'other']; },

  isFullBodyWearingPart(part = '') {
    const clean = String(part || '').trim();
    return /^(?:鍏ㄨ韩|鏁翠綋|鏁磋韩|鍏ㄤ綋|鍏ㄥ|鍏ㄨ韩琛ｇ墿|鍏ㄨ韩绌跨潃|鏁翠綋绌跨潃)$/u.test(clean);
  },

  wearingSlotAlias(part = '', itemName = '') {
    const clean = String(part || '').trim();
    const item = String(itemName || '').trim();
    if (this.isFullBodyWearingPart(clean)) return 'outerwear';
    if (/鑵垮湀|椤瑰湀|鎵嬬幆|鑴氱幆|鎴掓寚|鑰崇幆|楗板搧/u.test(item)) return '楗板搧';
    if (/鑳搁儴|鑳稿彛|涔虫埧|鑳哥僵|鍐呰。涓?u.test(clean)) return 'bra';
    if (/涓婅韩|涓婅。|琛～|鐫¤。涓?u.test(clean)) return 'top';
    if (/澶栧|缃╄～|杩炶。瑁檤鐫¤|瑁欒/u.test(clean)) return 'outerwear';
    if (/涓嬭韩|瑁欏瓙|瑁ゅ瓙|鐭￥/u.test(clean)) return 'bottom';
    if (/鑵块儴|澶ц吙|涓濊|琚滆￥|瑁よ/u.test(clean)) return 'legwear';
    if (/瓒抽儴|鑴氶儴|闉媩琚?u.test(clean)) return 'shoes';
    if (/鍐呰￥|搴曡￥/u.test(clean)) return 'panties';
    if (/楗板搧|棣栭グ|閰嶉グ/u.test(clean)) return '楗板搧';
    return this.settlementAlias(clean, { 鑳搁儴: 'bra', 鑳稿彛: 'bra', 涔虫埧: 'bra', 涓婅韩: 'top', 澶栧: 'outerwear', 涓嬭韩: 'bottom', 鑵块儴: 'legwear', 澶ц吙: 'legwear', 瓒抽儴: 'shoes', 鑴氶儴: 'shoes', 鍐呰￥: 'panties', 楗板搧: '楗板搧' });
  },

  bodyPartAlias(part = '') {
    return this.settlementAlias(part, { 鏁翠綋: 'overall', 鍏ㄨ韩: 'overall', 鍙ｉ儴: 'mouth', 鍢村攪: 'mouth', 鍢撮儴: 'mouth', 鑳搁儴: 'chest', 鑳稿彛: 'chest', 涔虫埧: 'chest', 闃撮儴: 'genital', 绉佸: 'genital', 鑲涢儴: 'anus', 鑷€閮? 'hips', 灞佽偂: 'hips', 鍥涜偄: 'limbs', 鎵嬭噦: 'limbs', 鑵块儴: 'limbs', 鐨偆: 'skin', 鍏朵粬: 'other' });
  },

  bodyPartName(part = '', key = '') {
    const names = { overall: '鏁翠綋', mouth: '鍙ｉ儴', chest: '鑳搁儴', genital: '闃撮儴', anus: '鑲涢儴', hips: '鑷€閮?, limbs: '鍥涜偄', skin: '鐨偆', other: '鍏朵粬' };
    return names[key] || String(part || '').trim();
  },

  sexualPartAlias(part = '') {
    return this.settlementAlias(part, { 闃撮儴: 'genital', 鑳搁儴: 'chest', 鑳稿彛: 'chest', 涔虫埧: 'chest', 鍞囬儴: 'lips', 鎺ュ惢: 'lips', 鍙ｉ儴: 'mouth', 鍢撮儴: 'mouth', 鍙ｉ儴琛屼负: 'oralAction', 鍙ｄ氦: 'oralSex', 鍙ｄ氦涓嚭: 'oralInternalFinish', 闃撮儴杩涘叆: 'genitalEntry', 闃撮亾鎻掑叆: 'vaginalInsertion', 闃撮亾涓嚭: 'vaginalInternalFinish', 鑲涢儴: 'anus', 鑲涢棬: 'anus', 鑲涢儴杩涘叆: 'analEntry', 鑲涗氦: 'analSex', 鑲涗氦涓嚭: 'analInternalFinish', 鑵块儴: 'legs', 澶ц吙: 'legs', 鑷€閮? 'hips', 灞佽偂: 'hips', 鎵嬮儴: 'hands', 鎵? 'hands', 鐨偆: 'skin', 鍏朵粬: 'other' });
  },

  parseWearingSettlementLine(line = '', subject = null, participants = []) {
    let parts = String(line || '').replace(/^鏇存柊(?:\d+|N)\s*[锛?]/u, '').split(/[锛?]/u).map((x) => x.trim());
    if (parts[0] !== '绌跨潃鐘舵€?) {
      const inlineSubject = this.subjectForSettlement(parts[0], participants);
      if (inlineSubject) {
        subject = inlineSubject;
        parts = ['绌跨潃鐘舵€?, ...parts.slice(1)];
      }
    }
    const [label, part, itemName, state, reason] = parts;
    if (label !== '绌跨潃鐘舵€? || !subject || !part || !itemName || !state || !reason) return null;
    const slot = this.wearingSlotAlias(part, itemName);
    if (!this.allowedWearingSlots().includes(slot)) return null;
    return { updateType: 'wearing-state', subject, field: 'values.wearing', change: { mode: 'upsert', value: { slot, part, name: itemName, state, reason, fullBody: this.isFullBodyWearingPart(part) } }, reasons: [{ trigger: '绌跨潃鐘舵€?, evidence: reason, confidence: 'confirmed' }] };
  },

  parseBodyStatusSettlementLine(line = '', subject = null, participants = []) {
    let parts = String(line || '').replace(/^鏇存柊(?:\d+|N)\s*[锛?]/u, '').split(/[锛?]/u).map((x) => x.trim());
    if (parts[0] !== '韬綋鐘舵€?) {
      const inlineSubject = this.subjectForSettlement(parts[0], participants);
      if (inlineSubject) {
        subject = inlineSubject;
        parts = ['韬綋鐘舵€?, ...parts.slice(1)];
      }
    }
    const [label, part, status, reason] = parts;
    if (label !== '韬綋鐘舵€? || !subject || !part || !status || !reason) return null;
    const aliasKey = this.bodyPartAlias(part);
    const partKey = this.allowedBodyPartKeys().includes(aliasKey) ? aliasKey : part;
    return { updateType: 'body-status', subject, field: `bodyStatus.${partKey}`, change: { mode: 'merge', value: { partKey, part: this.bodyPartName(part, partKey), status, description: status, reason } }, reasons: [{ trigger: '韬綋鐘舵€?, evidence: reason, confidence: 'confirmed' }] };
  },

  parseSexualExperienceSettlementLine(line = '', subject = null, participants = []) {
    let parts = String(line || '').replace(/^鏇存柊(?:\d+|N)\s*[锛?]/u, '').split(/[锛?]/u).map((x) => x.trim());
    if (parts[0] !== '鎬х粡鍘?) {
      const inlineSubject = this.subjectForSettlement(parts[0], participants);
      if (inlineSubject) {
        subject = inlineSubject;
        parts = ['鎬х粡鍘?, ...parts.slice(1)];
      }
    }
    const [label, part, rawValue, reason] = parts;
    if (label !== '鎬х粡鍘? || !subject || !part || !rawValue || !reason) return null;
    const rawValueText = String(rawValue).trim();
    const delta = Number(rawValueText.replace(/[^-+\d.]/gu, ''));
    if (!Number.isFinite(delta) || !/^[+-]\d/u.test(rawValueText) || delta === 0) return null;
    if (/^(?:鎬绘鏁皘鎬绘暟|鍏ㄩ儴|鎬讳綋|鍚堣)$/u.test(String(part || '').trim())) {
      const value = { totalDelta: delta, parts: {} };
      return { updateType: 'sexual-experience', subject, field: 'intimacy.sexualExperienceCount', change: { mode: 'delta', value }, reasons: [{ trigger: '鎬х粡鍘?, evidence: reason, confidence: 'confirmed' }] };
    }
    const aliasKey = this.sexualPartAlias(part);
    const key = this.allowedSexualPartKeys().includes(aliasKey) ? aliasKey : part;
    const value = { totalDelta: 0, parts: { [key]: delta } };
    return { updateType: 'sexual-experience', subject, field: `intimacy.sexualExperienceParts.${key}`, change: { mode: 'delta', value }, reasons: [{ trigger: '鎬х粡鍘?, evidence: reason, confidence: 'confirmed' }] };
  },

  parseScheduleSettlementLine(line = '', subject = null, participants = []) {
    // 鍚堝悓杈圭晫锛氭槑纭€氫俊/绉诲姩/绾﹀畾娑夊強鐨勪汉蹇呴』鍏堢敱涓婃父鍔犲叆 participants锛涢潪 participants 浠嶄細琚粨绠楀璞?gate 鎷掔粷銆?
    let parts = String(line || '').replace(/^鏇存柊(?:\d+|N)\s*[锛?]/u, '').split(/[锛?]/u).map((x) => x.trim());
    if (parts[0] !== '浜轰簨瀹夋帓') {
      const inlineSubject = this.subjectForSettlement(parts[0], participants);
      if (inlineSubject) {
        subject = inlineSubject;
        parts = ['浜轰簨瀹夋帓', ...parts.slice(1)];
      }
    }
    const [label, key, rawValue, reason] = parts;
    const subjectType = String(subject?.type || '').trim();
    if (label !== '浜轰簨瀹夋帓' || !subject || !['character', 'player'].includes(subjectType) || !key || !rawValue || !reason) return null;
    const value = {};
    const availabilityValues = ['鍦ㄥ満', '鍦哄', '鏈煡', '鏆備笉鍙敤'];
    if (key === '褰撳墠鍦扮偣') value.currentLocation = rawValue;
    else if (key === '褰撳墠琛屽姩') value.currentAction = rawValue;
    else if (key === '鍙敤鐘舵€?) {
      value.availability = availabilityValues.includes(rawValue) ? rawValue : '鏈煡';
      if (reason && reason.length >= 4 && !/^(?:姝ｆ枃|璇佹嵁|鏄庣‘|鏃犲彉鍖?/u.test(reason)) value.currentAction = reason;
    } else if (/褰撳墠鍦扮偣|褰撳墠琛屽姩|鍙敤鐘舵€?u.test(rawValue) && availabilityValues.includes(reason)) {
      if (rawValue === '褰撳墠鍦扮偣') value.currentLocation = key;
      else if (rawValue === '褰撳墠琛屽姩') value.currentAction = key;
      else if (rawValue === '鍙敤鐘舵€?) value.availability = availabilityValues.includes(reason) ? reason : '鏈煡';
    } else if (key.length >= 2 && !availabilityValues.includes(key)) {
      value.currentAction = [key, rawValue].filter(Boolean).join('锛?);
      value.availability = availabilityValues.includes(rawValue) ? rawValue : '鍦ㄥ満';
    } else return null;
    value.reason = reason;
    return { updateType: 'character-schedule', subject, field: 'characterSchedules', change: { mode: 'merge', value }, reasons: [{ trigger: `浜轰簨瀹夋帓${key}`, evidence: reason, confidence: 'confirmed' }] };
  },

  parseSystemSettlementLine(line = '', subject = null, participants = []) {
    let parts = String(line || '').replace(/^鏇存柊(?:\d+|N)\s*[锛?]/u, '').split(/[锛?]/u).map((x) => x.trim());
    if (parts[0] !== '绯荤粺璁板綍') {
      if (parts[0] === '绯荤粺') {
        parts = ['绯荤粺璁板綍', ...parts.slice(1)];
      } else if (this.subjectForSettlement(parts[0], participants)) {
        parts = ['绯荤粺璁板綍', ...parts.slice(1)];
      }
    }
    subject = { type: 'system', id: '绯荤粺', name: '绯荤粺' };
    const [label, key, rawValue, reason] = parts;
    if (label !== '绯荤粺璁板綍' || !subject || !key || !rawValue || !reason) return null;
    const allowed = ['浜嬩欢', '璁板綍', '閫氫俊娑堟伅', '鍓ф儏璁板綍', '鐘舵€?];
    if (!allowed.includes(key)) return null;
    return { updateType: 'system', subject, field: `events.${key}`, change: { mode: 'append', value: { key, value: rawValue, reason } }, reasons: [{ trigger: `绯荤粺璁板綍${key}`, evidence: reason, confidence: 'confirmed' }] };
  },

  parseSpecialSettlementLine(typeName = '', line = '', subject = null, participants = []) {
    let parts = String(line || '').replace(/^鏇存柊(?:\d+|N)\s*[锛?]/u, '').split(/[锛?]/u).map((x) => x.trim());
    if (parts[0] !== typeName) {
      const inlineSubject = this.subjectForSettlement(parts[0], participants);
      if (inlineSubject) {
        subject = inlineSubject;
        parts = [typeName, ...parts.slice(1)];
      }
    }
    if (!subject || parts[0] !== typeName) return this.parseGenericSettlementLine(typeName, line, subject, { requireExplicitGeneric: true });
    if (typeName === '鎬у巻鍙?) {
      const [, transition, partner, evidence] = parts;
      if (!transition || !partner || !evidence) return null;
      return { updateType: 'sexual-history', subject, field: 'intimacy.sexualHistory', change: { mode: 'merge', value: { transition, partner: { type: 'character', id: partner, name: partner }, evidence, historyText: [transition, partner, evidence].join('锛?) } }, reasons: [{ trigger: '鎬у巻鍙茬姸鎬佽浆绉?, evidence, confidence: 'confirmed' }] };
    }
    if (typeName === '鍏崇郴') {
      const [, left, right, dimension, status, reason, result] = parts;
      if (!left || !right || !dimension || !status || !reason || !result) return null;
      if (/^(?:濂芥劅|濂芥劅搴淇′换|渚濊禆|璀︽儠|鐣忔儳|鍙嶆劅|鎰ゆ€抾鎭愭儳|绱у紶|瀹夊績|鎮蹭激|寮€蹇億楂樺叴)$/u.test(dimension) || /^[-+]?\d/u.test(status)) return null;
      return { updateType: 'relationship', subject, field: `relationships.${dimension}`, change: { mode: 'upsert', value: { left, right, dimension, status, reason, result } }, reasons: [{ trigger: '鍏崇郴鍙樺寲', evidence: reason, confidence: 'confirmed' }] };
    }
    if (typeName === '瑙掕壊鍗?) {
      const [, field, op, value, reason, result] = parts;
      const allowed = ['褰撳墠鐘舵€?, '韬唤', '鑱屼笟', '鎶€鑳?, '鐭ヨ瘑', '澶栬矊', '鎬ф牸', '鍠滃ソ', '浜虹墿璇存槑', '绀剧兢瑙掕壊', '浜轰簨褰掑睘', '浜洪檯鍏崇郴'];
      if (!field || !op || !value || !['鏇挎崲', '澧炲姞'].includes(op) || !allowed.includes(field)) return null;
      return { updateType: 'role-card', subject, field: field === '褰撳墠鐘舵€? ? 'status_tags' : `profile.${field}`, change: { mode: op === '鏇挎崲' ? 'set' : 'append', value: { value, reason, result } }, reasons: [{ trigger: `瑙掕壊鍗?{op}`, evidence: reason || value, confidence: 'confirmed' }] };
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
    const rawName = entry?.subject ?? entry?.涓讳綋 ?? entry?.name ?? entry?.鍚嶇О ?? '';
    const name = String(rawName || '').trim();
    const participant = this.subjectForSettlement(name, participants);
    if (participant) return participant;
    const defaults = {
      '鍦板浘': { type: '鍦扮偣', id: name || '褰撳墠鍦扮偣', name: name || '褰撳墠鍦扮偣' },
      '鍔垮姏鎬昏': { type: '鍔垮姏', id: name || '鍔垮姏', name: name || '鍔垮姏' },
      '鍔垮姏缁撴瀯': { type: '鍔垮姏', id: name || '鍔垮姏', name: name || '鍔垮姏' },
      '绯荤粺璁板綍': { type: 'system', id: name || '绯荤粺', name: name || '绯荤粺' },
      '閫氱敤鍥哄寲': { type: 'system', id: name || '绯荤粺', name: name || '绯荤粺' },
      '鐗╁搧': { type: '鐗╁搧', id: name || '鐗╁搧', name: name || '鐗╁搧' },
    };
    return defaults[type] || null;
  },

  settlementJsonText(value = '') {
    return String(value ?? '').trim().replace(/[锛?]/gu, '锛?);
  },

  settlementJsonUpdateLine(type = '', entry = {}) {
    const t = (value) => this.settlementJsonText(value);
    const field = t(entry.field ?? entry.瀛楁 ?? entry.key ?? entry.绫诲瀷 ?? entry.part ?? entry.閮ㄤ綅 ?? '');
    const value = t(entry.value ?? entry.鍙樺寲 ?? entry.鏂板€??? entry.delta ?? entry.鏁板€??? entry.status ?? entry.state ?? entry.浜嬪疄 ?? '');
    const reason = t(entry.reason ?? entry.鍘熷洜 ?? entry.evidence ?? entry.璇佹嵁 ?? '');
    if (type === '绌跨潃鐘舵€?) return `鏇存柊N锛氱┛鐫€鐘舵€侊紝${t(entry.part ?? entry.閮ㄤ綅)}锛?{t(entry.item ?? entry.itemName ?? entry.琛ｇ墿 ?? entry.琛ｇ墿鍚嶇О)}锛?{t(entry.state ?? entry.status ?? entry.鐘舵€?}锛?{reason}`;
    if (type === '韬綋鐘舵€?) return `鏇存柊N锛氳韩浣撶姸鎬侊紝${t(entry.part ?? entry.閮ㄤ綅)}锛?{t(entry.status ?? entry.value ?? entry.鐘舵€?}锛?{reason}`;
    if (type === '鎬х粡鍘?) return `鏇存柊N锛氭€х粡鍘嗭紝${t(entry.part ?? entry.閮ㄤ綅)}锛?{t(entry.delta ?? entry.value ?? entry.鍙樺寲)}锛?{reason}`;
    if (type === '鎬у巻鍙?) return `鏇存柊N锛氭€у巻鍙诧紝${t(entry.transition ?? entry.鐘舵€佽浆绉??? entry.field ?? entry.瀛楁)}锛?{t(entry.partner ?? entry.瀵硅薄 ?? entry.value)}锛?{t(entry.evidence ?? entry.reason ?? entry.璇佹嵁)}`;
    if (type === '鍏崇郴') return `鏇存柊N锛氬叧绯伙紝${t(entry.left ?? entry.宸︽柟 ?? entry.subject ?? entry.涓讳綋)}锛?{t(entry.right ?? entry.鍙虫柟 ?? entry.target ?? entry.瀵硅薄)}锛?{t(entry.dimension ?? entry.缁村害 ?? entry.field)}锛?{t(entry.status ?? entry.鐘舵€??? entry.value)}锛?{reason}锛?{t(entry.result ?? entry.缁撴灉 ?? entry.value)}`;
    if (type === '瑙掕壊鍗?) return `鏇存柊N锛氳鑹插崱锛?{field}锛?{t(entry.op ?? entry.鎿嶄綔 ?? '澧炲姞')}锛?{value}锛?{reason}锛?{t(entry.result ?? entry.缁撴灉 ?? value)}`;
    return `鏇存柊N锛?{type}锛?{field}锛?{value}锛?{reason}`;
  },

  parseRelationshipJsonEntry(entry = {}, subject = null, participants = []) {
    const t = (value) => this.settlementJsonText(value);
    const player = (participants || []).find((p) => p?.type === 'player');
    const left = t(entry.left ?? entry.宸︽柟 ?? entry.actor ?? entry.鐢叉柟 ?? player?.name ?? player?.id ?? '');
    const right = t(entry.right ?? entry.鍙虫柟 ?? entry.target ?? entry.瀵硅薄 ?? entry.涔欐柟 ?? subject?.name ?? subject?.id ?? '');
    const dimension = t(entry.dimension ?? entry.缁村害 ?? entry.field ?? entry.瀛楁 ?? '');
    const status = t(entry.status ?? entry.鐘舵€??? entry.value ?? entry.鍏崇郴鐘舵€??? '');
    const reason = t(entry.reason ?? entry.鍘熷洜 ?? entry.evidence ?? entry.璇佹嵁 ?? '');
    const result = t(entry.result ?? entry.缁撴灉 ?? status);
    if (!subject || !left || !right || !dimension || !status || !reason || !result) return null;
    if (/^(?:濂芥劅|濂芥劅搴淇′换|渚濊禆|璀︽儠|鐣忔儳|鍙嶆劅|鎰ゆ€抾鎭愭儳|绱у紶|瀹夊績|鎮蹭激|寮€蹇億楂樺叴)$/u.test(dimension) || /^[-+]?\d/u.test(status)) return null;
    return { updateType: 'relationship', subject, field: `relationships.${dimension}`, change: { mode: 'upsert', value: { left, right, dimension, status, reason, result } }, reasons: [{ trigger: '鍏崇郴鍙樺寲', evidence: reason, confidence: 'confirmed' }] };
  },

  parseSettlementJson(raw, { requestedTypes = [], participants = [], store = null, config = this.realConfig() } = {}) {
    const data = this.parseCompactSettlementJson(raw);
    if (!data || Array.isArray(data) || typeof data !== 'object') return null;
    const patchesByType = {};
    const completeTypes = [];
    const incompleteTypes = [];
    const baseFields = {};
    const baseKeys = ['缁忚繃鏃堕棿', '褰撳墠鐘舵€?, '褰撳墠鐩爣', '鍦烘櫙鏍囬', '鍦扮偣鍚嶇О', '澶囬€夎鍔?', '澶囬€夎鍔?', '澶囬€夎鍔?', '澶囬€夎鍔?'];
    const specialParsers = {
      '浜轰簨瀹夋帓': (line, subject) => this.parseScheduleSettlementLine(line, subject, participants),
      '绯荤粺璁板綍': (line, subject) => this.parseSystemSettlementLine(line, subject, participants),
      '绌跨潃鐘舵€?: (line, subject) => this.parseWearingSettlementLine(line, subject, participants),
      '韬綋鐘舵€?: (line, subject) => this.parseBodyStatusSettlementLine(line, subject, participants),
      '鎬х粡鍘?: (line, subject) => this.parseSexualExperienceSettlementLine(line, subject, participants),
    };
    requestedTypes.forEach((type) => {
      const value = data[type];
      const patch = { genericUpdates: [], events: [], baseFields: {}, __updateLines: 0, __parsedUpdates: 0, __lines: [JSON.stringify({ [type]: value })], __closedByBrace: value !== undefined };
      if (value === undefined) {
        incompleteTypes.push(type);
        patchesByType[type] = patch;
        return;
      }
      if (type === this.eventSettlementType()) {
        if (Array.isArray(value)) {
          value.forEach((entry) => {
            if (entry !== undefined && entry !== null) patch.__updateLines += 1;
            const event = this.normalizeSettlementEventEntry(entry, store, config);
            if (event) {
              patch.__parsedUpdates += 1;
              patch.events.push(event);
            }
          });
        }
      } else if (type === '鍩虹缁撶畻') {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          ['缁忚繃鏃堕棿', '褰撳墠鐘舵€?, '褰撳墠鐩爣', '鍦烘櫙鏍囬', '鍦扮偣鍚嶇О'].forEach((key) => { if (value[key] !== undefined) patch.baseFields[key] = String(value[key]).trim(); });
          const choices = Array.isArray(value['澶囬€夎鍔?]) ? value['澶囬€夎鍔?] : [];
          [1, 2, 3, 4].forEach((index) => {
            const key = `澶囬€夎鍔?{index}`;
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
          let update = null;
          if (type === '鍏崇郴') update = this.parseRelationshipJsonEntry(entry, subject, participants);
          else if (['鎯呯华', '鎰熻'].includes(type)) update = this.parseMetricSettlementJsonEntry(type, entry, subject, participants, store);
          else if (specialParsers[type]) update = specialParsers[type](line, subject);
          else if (['鎬у巻鍙?, '瑙掕壊鍗?].includes(type)) update = this.parseSpecialSettlementLine(type, line, subject, participants);
          else update = this.parseStandardSettlementLine(type, line, subject, participants, store);
          if (update) {
            patch.__parsedUpdates += 1;
            patch.genericUpdates.push(update);
          }
        });
      }
      const hasParsedAllUpdates = !patch.__updateLines || patch.__parsedUpdates === patch.__updateLines;
      const hasRequiredBaseFields = type !== '鍩虹缁撶畻' || baseKeys.every((key) => String(patch.baseFields[key] || '').trim());
      patchesByType[type] = patch;
      if (hasParsedAllUpdates && hasRequiredBaseFields && (type === '鍩虹缁撶畻' || Array.isArray(value))) {
        completeTypes.push(type);
        if (type === '鍩虹缁撶畻') Object.assign(baseFields, patch.baseFields);
      } else incompleteTypes.push(type);
    });
    const genericUpdates = completeTypes.flatMap((type) => patchesByType[type]?.genericUpdates || []);
    const events = completeTypes.flatMap((type) => patchesByType[type]?.events || []);
    return { format: 'json', patchesByType, completeTypes, incompleteTypes, genericUpdates, events, baseFields };
  },

  parseSettlementKv(raw, { requestedTypes = [], participants = [], store = null, config = this.realConfig() } = {}) {
    const contracts = this.settlementTypeContracts();
    const labelsForType = ([type, c]) => [c.title, type];
    const headingPrefix = (line = '') => Object.entries(contracts).find((entry) => labelsForType(entry).some((label) => line === `${label}锛歚 || line === `${label}:` || line === `${label}{` || line === `${label} {` || line.startsWith(`${label}锛歚) || line.startsWith(`${label}:`)));
    const lines = String(raw || '').replace(/锛?gu, '\n').split(/\r?\n/u).map((line) => line.trim()).filter(Boolean).flatMap((line) => {
      const hit = headingPrefix(line);
      if (!hit) return [line];
      const labels = labelsForType(hit);
      const braceLabel = labels.find((item) => line === `${item}{` || line === `${item} {`);
      if (braceLabel) return [`${hit[1].title}{`];
      const label = labels.find((item) => line.startsWith(`${item}锛歚) || line.startsWith(`${item}:`));
      const rest = line.slice(String(label || '').length + 1).trim();
      return rest ? [`${hit[1].title}锛歚, rest] : [`${hit[1].title}锛歚];
    });
    const patchesByType = {};
    const completeTypes = [];
    const incompleteTypes = [];
    const baseFields = {};
    const blocksByType = {};
    let currentBlock = null;
    const baseKeys = ['缁忚繃鏃堕棿', '褰撳墠鐘舵€?, '褰撳墠鐩爣', '鍦烘櫙鏍囬', '鍦扮偣鍚嶇О', '澶囬€夎鍔?', '澶囬€夎鍔?', '澶囬€夎鍔?', '澶囬€夎鍔?'];
    const settlementTypeFromHeading = (line) => Object.entries(contracts).find((entry) => labelsForType(entry).some((label) => line === `${label}锛歚 || line === `${label}:` || line === `${label}{` || line === `${label} {`));
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
      const subjectFallbackTypes = ['鎯呯华', '鎰熻', '鐢熷懡浣撳緛', '韬綋鐘舵€?, '绌跨潃鐘舵€?, '鎬х粡鍘?, '鎬у巻鍙?, '鍏崇郴', '瑙掕壊鍗?, '鐗╁搧'];
      const defaultSubject = subjectFallbackTypes.includes(type) ? this.defaultSubjectForSettlement(participants) : null;
      const normalizeLegacySubjectLine = (line) => {
        const match = String(line || '').match(/^([^锛?]+)[锛?]\s*(.+)$/u);
        if (!match || /^缁撶畻鐘舵€?/u.test(match[1])) return null;
        const subject = this.subjectForSettlement(match[1].trim(), participants);
        if (!subject) return null;
        const rest = match[2].trim();
        const first = rest.split(/[锛?]/u)[0]?.trim();
        if (!first || (first !== type && first !== contracts[type]?.title?.replace(/缁撶畻$/u, ''))) return null;
        return { subject, line: `鏇存柊N锛?{rest}` };
      };
      blockLines.slice(1).forEach((line) => {
        if (type === '鍩虹缁撶畻') {
          const base = this.splitKvLine(line);
          if (base && baseKeys.includes(base.key)) {
            patch.baseFields[base.key] = base.value;
            return;
          }
        }
        if (/^(?:缁撶畻瀵硅薄|鍙備笌鑰?[锛?]/u.test(line)) {
          const [name, objectType, allowed] = line.replace(/^(?:缁撶畻瀵硅薄|鍙備笌鑰?[锛?]/u, '').split(/[锝渱]/u).map((x) => x.trim());
          const isSceneParticipant = this.participantAllowedForSettlement(name, participants);
          const isScheduleSubject = type === '浜轰簨瀹夋帓' && ['瑙掕壊', '鐜╁'].includes(objectType);
          const isNonCharacterSystem = type !== '浜轰簨瀹夋帓' && ['鍦扮偣', '鍔垮姏', '涓栫晫', '绯荤粺'].includes(objectType);
          currentSubject = allowed === '鍏佽缁撶畻' && ((type === '浜轰簨瀹夋帓' && isScheduleSubject && isSceneParticipant) || (type !== '浜轰簨瀹夋帓' && (isSceneParticipant || isNonCharacterSystem))) ? (this.subjectForSettlement(name, participants) || { type: objectType || 'system', id: name, name }) : null;
          return;
        }
        const legacy = normalizeLegacySubjectLine(line);
        const updateLine = legacy?.line || line;
        const updateSubject = legacy?.subject || currentSubject || defaultSubject;
        if (/^鏇存柊(?:\d+|N)[锛?]/u.test(updateLine)) {
          patch.__updateLines += 1;
          const specialParsers = {
            '浜轰簨瀹夋帓': () => this.parseScheduleSettlementLine(updateLine, updateSubject, participants),
            '绯荤粺璁板綍': () => this.parseSystemSettlementLine(updateLine, updateSubject, participants),
            '绌跨潃鐘舵€?: () => this.parseWearingSettlementLine(updateLine, updateSubject, participants),
            '韬綋鐘舵€?: () => this.parseBodyStatusSettlementLine(updateLine, updateSubject, participants),
            '鎬х粡鍘?: () => this.parseSexualExperienceSettlementLine(updateLine, updateSubject, participants),
          };
          const update = specialParsers[type]
            ? specialParsers[type]()
            : (['鎬у巻鍙?, '鍏崇郴', '瑙掕壊鍗?].includes(type) ? this.parseSpecialSettlementLine(type, updateLine, updateSubject, participants) : this.parseStandardSettlementLine(type, updateLine, updateSubject, participants, store));
          if (update) {
            patch.__parsedUpdates += 1;
            patch.genericUpdates.push(update);
          }
          return;
        }
        if (/^绫诲瀷瀹屾垚[锛?]鏄?/u.test(line)) { patch.__typeDone = true; return; }
        if (/^缁撶畻缁撴潫[锛?]鏄?/u.test(line)) patch.__settlementDone = true;
      });
      return patch;
    };
    const patchIsComplete = (type, patch) => {
      const hasParsedAllUpdates = !patch?.__updateLines || patch.__parsedUpdates === patch.__updateLines;
      const hasRequiredBaseFields = type !== '鍩虹缁撶畻' || baseKeys.every((key) => String(patch?.baseFields?.[key] || '').trim());
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
        if (type === '鍩虹缁撶畻') Object.assign(baseFields, patch.baseFields);
      } else incompleteTypes.push(type);
    });
    const genericUpdates = completeTypes.flatMap((type) => patchesByType[type]?.genericUpdates || []);
    return { patchesByType, completeTypes, incompleteTypes, genericUpdates, baseFields };
  },

  settlementTypeShortRule(type = '') {
    const contracts = this.settlementTypeContracts();
    const c = contracts[type] || { title: `${type}缁撶畻`, format: '鏇存柊N锛氱被鍨嬶紝瀛楁锛屽彉鍖栵紝鍘熷洜' };
    if (type === this.eventSettlementType()) {
      return [
        `${c.title}瑙勫垯锛歚,
        '鍙彁鍙栨鏂囦腑宸茬粡鏄庣‘鍑虹幇鎴栬兘鐢辨鏂囩ǔ瀹氭帹鍑虹殑浜嬩欢锛涙櫘閫氳鍔ㄧ姸鎬佷笉瑕佸啓鎴愪簨浠躲€?,
        '鎺ㄦ紨浜嬩欢鐢ㄤ簬鏈潵绾﹀畾銆佽鍒掋€佹壙璇恒€佹瘉绾﹂闄╃瓑锛涘懆鏈熶簨浠剁敤浜庤妭鏃ャ€佸浐瀹氳禌绋嬨€佸畾鏈熷緛鏂囩瓑閲嶅鍙戠敓浜嬮」锛涢殢鏈轰簨浠朵粎鐢ㄤ簬闇€瑕佸湪鏈潵姒傜巼瑙﹀彂鐨勫満澶栧彉鍔ㄣ€?,
        '鍛ㄦ湡浜嬩欢 people 鍥哄畾鍐?["鎵€鏈変汉"]锛屽繀椤诲啓 tags锛涙棤浜嬩欢杈撳嚭 []銆?,
      ].join('\n');
    }
    const rules = {
      '鎯呯华': '瀛楁鍙兘浣跨敤鏈疆鈥滃綋鍓嶆儏缁熀绾库€濋噷宸叉湁鎸囨爣鍚嶏紱value 蹇呴』鏄?+N/-N 涓斾笉鑳戒负 0锛涘彲鎶婃剦鎮?寮€蹇冩槧灏勪负楂樺叴銆佹儕鎱屾槧灏勪负鎭愭儳銆佷笉瀹夋槧灏勪负绱у紶锛涙病鏈夊搴斿凡鏈夋寚鏍囨垨鏃犵ǔ瀹氬彉鍖栨椂杈撳嚭绌烘暟缁勩€傚瓧娈靛惈涔夛細field=鎯呯华鎸囨爣鍚嶏紝value=鏈洖鍚堝彉鍖栭噺锛宻tatus=鍙樺寲鍚庤鎯呯华鍦ㄥ綋鍓嶆暟鍊间笅鐨勫叿浣撹〃鐜帮紙绂佹鍐欌€滈珮鍏?0锛氣€濊繖绫诲墠缂€锛夛紝reason=姝ｆ枃涓殑鍏蜂綋琛屼负/瀵硅瘽璇佹嵁銆?,
      '鎰熻': '涓讳綋鍙兘鏄嚭鍦?NPC锛屼笉鑳芥槸鐜╁锛涘瓧娈靛彧鑳戒娇鐢ㄢ€滃嚭鍦鸿鑹插鐜╁鎰熻鍩虹嚎鈥濋噷宸叉湁鎸囨爣鍚嶏紱value 蹇呴』鏄?+N/-N 涓斾笉鑳戒负 0锛涘彲鎶婁俊璧栨槧灏勪负淇′换銆佷翰杩戞槧灏勪负濂芥劅銆佸鎬曟槧灏勪负鐣忔儳銆佸帉鎭舵槧灏勪负鍙嶆劅銆傚瓧娈靛惈涔夛細field=鎰熻鎸囨爣鍚嶏紝value=鏈洖鍚堝彉鍖栭噺锛宻tatus=鍙樺寲鍚庤鎰熻鍦ㄥ綋鍓嶆暟鍊间笅鐨勫叿浣撹〃鐜帮紙绂佹鍐欌€滀俊浠?0锛氣€濊繖绫诲墠缂€锛夛紝reason=姝ｆ枃涓瘉鏄庤 NPC 瀵圭帺瀹舵€佸害鍙樺寲鐨勫叿浣撹瘉鎹€?,
      '鐢熷懡浣撳緛': '瀛楁鍙兘鏄細鐢熷懡鍔涖€佺簿鍔涖€侀ケ椋熷害銆佹按鍒嗐€佺柌鍔炽€佺簿绁炵ǔ瀹氾紱鍏佽鍒悕杈撳叆浣嗘渶缁堝瓧娈靛啓杩?6 涓腑鏂囧悕锛涚姝㈠績鐜囥€佷綋娓┿€佸懠鍚搁鐜囥€佽鍘嬨€佽姘с€佺灣瀛斻€佹縺绱犮€佽鍔ㄨ兘鍔涖€佽倢鑲夌揣寮犲害绛夋柊鎸囨爣锛涘彉鍖栧繀椤绘槸 +N/-N 涓斾笉鑳戒负 0锛涘仴搴锋甯告垨鏃犵ǔ瀹氬彉鍖栨椂杈撳嚭绌烘暟缁勩€?,
      '韬綋鐘舵€?: '閮ㄤ綅鍙兘鏄細鏁翠綋/鍏ㄨ韩銆佸彛閮?鍢撮儴/鍢村攪銆佽兏閮?鑳稿彛/涔虫埧銆侀槾閮?绉佸銆佽倹閮ㄣ€佽噣閮?灞佽偂銆佸洓鑲?鎵嬭噦/鑵块儴銆佺毊鑲ゃ€佸叾浠栵紱鏁翠綋/鍏ㄨ韩涓庡眬閮ㄩ儴浣嶄簰涓嶅啿绐侊紝鍚岃疆鍚屼汉鍙啓澶氭潯锛屾鏂囦腑鏈夊氨搴斿叏閮ㄥ啓鍏ワ紱鏁翠綋鍐欏叏韬患鍚堢姸鎬侊紝灞€閮ㄥ啓瀵瑰簲閮ㄤ綅缁嗚妭锛涚姝㈡妸鍧愬Э銆佸彲鐢ㄧ姸鎬併€佹墜鎸囧姩浣滅瓑鍐欐垚鏂伴儴浣嶅瓧娈碉紱鍏ㄨ韩鍙戦ⅳ/鑲岃倝鍙嶅簲绛夊啓鏁翠綋鎴栧洓鑲紝涓嶈鍐欒繘鐢熷懡浣撳緛銆?,
      '绌跨潃鐘舵€?: '绌跨潃閮ㄤ綅鍙兘鏄細鍏ㄨ韩/鏁翠綋銆佽兏閮?鑳稿彛/涔虫埧銆佷笂韬€佸濂椼€佷笅韬€佽吙閮?澶ц吙銆佽冻閮?鑴氶儴銆佸唴瑁ゃ€侀グ鍝侊紱鍏ㄨ韩/鏁翠綋浼氭寜澶栧澶勭悊骞舵竻绌哄叾浠栬。鐗╂Ы锛涘悓杞嫢杩樻湁灞€閮ㄩ儴浣嶏紝鍏堝簲鐢ㄥ叏韬啀瑕嗙洊灞€閮ㄩ儴浣嶏紱绂佹鑲╅儴銆佽叞閮ㄣ€佽。棰嗐€佸悐甯︿綅缃瓑闈炴Ы浣嶅瓧娈碉紱蹇呴』鍖呭惈琛ｇ墿鍚嶇О鍜屽綋鍓嶇姸鎬併€?,
      '鎬х粡鍘?: '鍒嗙被鍙兘鏄細闃撮儴銆佽兏閮?鑳稿彛/涔虫埧銆佸攪閮?鎺ュ惢銆佸彛閮?鍢撮儴銆佸彛閮ㄨ涓恒€佸彛浜ゃ€佸彛浜や腑鍑恒€侀槾閮ㄨ繘鍏ャ€侀槾閬撴彃鍏ャ€侀槾閬撲腑鍑恒€佽倹閮?鑲涢棬銆佽倹閮ㄨ繘鍏ャ€佽倹浜ゃ€佽倹浜や腑鍑恒€佽吙閮?澶ц吙銆佽噣閮?灞佽偂銆佹墜閮?鎵嬨€佺毊鑲ゃ€佸叾浠栵紱delta 蹇呴』鏄?+N/-N 涓斾笉鑳戒负 0锛涚姝㈠啓鎬绘鏁?鎬绘暟/鍏ㄩ儴锛涙棤鐩稿叧琛屼负鏃惰緭鍑虹┖鏁扮粍銆?,
      '鍏崇郴': '鍙褰曠ǔ瀹氬叧绯荤淮搴︼紝濡備翰灞炪€佹湅鍙嬨€佸悓浜嬨€佸笀鐢熴€侀泧浣ｃ€佹晫瀵广€佸悓灞呫€佹亱浜猴紱濂芥劅銆佷俊浠汇€佷緷璧栥€佽鎯曠瓑鏁板€兼€佸害鍐欌€滄劅瑙夆€濓紝涓嶈鍐欏叧绯汇€?,
      '瑙掕壊鍗?: '鍙啓绋冲畾瑙掕壊鍗″瓧娈碉細褰撳墠鐘舵€併€佽韩浠姐€佽亴涓氥€佹妧鑳姐€佺煡璇嗐€佸璨屻€佹€ф牸銆佸枩濂姐€佷汉鐗╄鏄庛€佺ぞ缇よ鑹层€佷汉浜嬪綊灞炪€佷汉闄呭叧绯伙紱涓存椂鎯呯华銆佺敓鍛戒綋寰併€佽韩浣撱€佺┛鐫€銆佸叧绯汇€佺墿鍝佹湁涓撻棬绫诲瀷鏃朵笉寰楀啓瑙掕壊鍗°€?,
      '鍦板浘': '瀛楁鍙兘鏄細褰撳墠浣嶇疆銆佷笂绾у湴鐐广€佸湴鐐逛簨瀹炪€佸湴鍥捐妭鐐广€佽矾绾夸簨瀹烇紱瑙掕壊褰撳墠鎵€鍦ㄥ湴浼樺厛鍐欎汉浜嬪畨鎺掞紝涓嶈鎶婅鑹茶鍔ㄥ啓鎴愬湴鍥句簨瀹炪€傚湴鍥捐妭鐐规渶灏忛绮掑害涓哄缓绛戠墿锛堝3鏍?鍗曞厓锛夋垨灏忓尯绾OI锛堝叕鍥€佸晢搴楋級锛涜蛋寤娿€佹ゼ姊棿銆佸崟涓埧闂村彧鍐欏綋鍓嶄綅缃紝涓嶈浣滀负鍦板浘鑺傜偣銆傜姝㈠湪鏈被鍨嬪啓 effectiveOrgId/鎺у娍锛岄偅灞炰簬棰嗗湡鎺у娍銆?,
      '棰嗗湡鎺у娍': '浠呭綋姝ｆ枃纭宸叉彮绀哄湴鐐圭殑澶烘帶銆佽В鏀俱€佺Щ浜ゃ€佸崰棰嗘垨浜夎鐘舵€佹椂鏇存柊锛涘瓧娈碉細鍦扮偣鍚嶃€佸疄鎺х粍缁囥€佸绉扮粍缁囥€佹帶鍔跨姸鎬侊紱鏈?revealed 鍦扮偣涓嶅緱鍐欙紱鍚岃疆鍚屼竴鍦扮偣鏈€澶氫竴鏉★紱鏅€氬埌杈?鐪嬭涓嶅啓鏈被鍨嬨€?,
      '浜轰簨瀹夋帓': '鍙洿鏂版湰鍥炲悎 participants 涓殑鍙備笌鑰咃紱field 鍙兘鏄?褰撳墠鍦扮偣銆佸綋鍓嶈鍔ㄣ€佸彲鐢ㄧ姸鎬侊紱姝ｅ湪鍋氫粈涔堝繀椤诲啓 褰撳墠琛屽姩锛寁alue 鐢ㄧ煭鍙ュ啓鍏蜂綋鍔ㄤ綔锛堝銆屼粠鑳屽悗鎶变綇鍒樻€濈惇骞舵弶鎹忚兏閮ㄣ€嶏級锛涘彲鐢ㄧ姸鎬?value 鍙兘鏄?鍦ㄥ満/鍦哄/鏆備笉鍙敤/鏈煡锛岀姝㈡妸鍔ㄤ綔鎴栬韩浣撳弽搴斿啓杩涘彲鐢ㄧ姸鎬侊紱reason 鍙啓姝ｆ枃璇佹嵁锛屼笉瑕侀噸澶?value锛涘悓涓€浜哄彲鍐欏鏉★紙鍦扮偣銆佽鍔ㄣ€佸彲鐢ㄧ姸鎬佸悇涓€鏉★級锛涘急鎺ㄦ祴涓嶆洿鏂般€?,
      '鍔垮姏鎬昏': '瀛楁鍙兘鏄細鏂板鍔垮姏銆佷笂灞傚娍鍔涘綊灞炪€佸娍鍔汚PP褰掑睘锛涚粍缁囧唴閮ㄩ儴闂ㄣ€佽亴浣嶃€佹垚鍛樺湴浣嶅啓鍔垮姏缁撴瀯銆?,
      '鏀夸綋鐘舵€?: '瀛楁锛氱粍缁囧悕銆乻tatus锛坅ctive/rebel/independent/dissolved/merged锛夈€乴egitimacy銆乻uccessorId锛涘悎骞?瑙ｆ暎椤诲啓 successor锛涘湴鍥炬帶鍔垮彟鍐欓鍦熸帶鍔裤€?,
      '鍔垮姏缁撴瀯': '瀛楁鍙兘鏄細閮ㄩ棬瑙掕壊銆佽亴浣嶃€佹垚鍛樺湴浣嶏紱鍔垮姏鏄惁瀛樺湪鎴栭毝灞炲叧绯诲啓鍔垮姏鎬昏銆傛柊寤?fog 鑺傜偣鍙啓鍚嶇О涓庢剰鍥撅紝涓婄骇鏈槑鍐欍€岃糠闆俱€嶏紝绂佹鐚滃浗闃查儴绛夈€?,
      '缁勭粐鑳藉姏': '瀛楁锛氳兘鍔涚淮搴︼紙鏀挎不/缁忔祹/璧勪骇/鍐涗簨锛夈€佹潯鐩悕绉般€佹潯鐩姸鎬併€佷笂绾у綊灞烇紱鏂拌鏉＄洰鏃犺崏妗堟椂 state=fog 涓斾笂绾?杩烽浘锛涢儴闂?鑱屼綅/浠昏亴鍐欏娍鍔涚粨鏋勶紝涓嶈娣风敤銆?,
      '浜轰簨褰掑睘': '瀛楁锛氱粍缁囧悕/orgId銆侀儴闂ㄣ€佽亴浣嶏紱瀵瑰簲 values.memberships锛涢儴闂ㄦ湭鏄庡啓 departmentFog锛涗笌鍔垮姏 structure 鍗犲潙鍙悓鏃跺瓨鍦ㄤ絾闇€涓€鑷达紱鎶借薄銆屽叕姘?灞呮皯銆嶄笉寰楀啓銆?,
      '绯荤粺璁板綍': '鍙啓绯荤粺绾с€佽法瑙掕壊銆佷笖娌℃湁涓撻棬绫诲瀷鎵胯浇鐨勯暱鏈熶簨瀹烇細鏃ュ巻鍙樻洿銆佸井淇?鐭俊閫氫俊銆佷笘鐣岀嚎鑺傜偣銆佷笉鍙€嗗叕鍏变簨浠躲€佸叏灞€鐘舵€併€傜姝㈡妸瑙掕壊褰撳墠琛屽姩銆佹墍鍦ㄥ湴鐐广€佽韩浣撳弽搴斻€佹劅瑙夈€佸叧绯汇€佸満鏅弿鍐欏杩板啓杩涚郴缁熻褰曪紱杩欎簺蹇呴』鍒嗗埆鍐欎汉浜嬪畨鎺掋€佽韩浣撶姸鎬併€佹劅瑙夈€佸叧绯汇€傝嫢姝ｆ枃浜嬪疄宸茶涓栫晫绾胯褰曡鐩栵紝绯荤粺璁板綍鍐欑┖鏁扮粍 []銆?,
      '閫氱敤鍥哄寲': '鍙兘鍐欐病鏈変笓闂ㄧ被鍨嬫壙杞界殑闀挎湡绋冲畾鏍囩锛涙儏缁€佹劅瑙夈€佺敓鍛戒綋寰併€佽韩浣撱€佺┛鐫€銆佹€х粡鍘嗐€佹€у巻鍙层€佸叧绯汇€佺墿鍝併€佸湴鍥俱€佷汉浜嬨€佸娍鍔涖€佺郴缁熻褰曟湁涓撻棬绫诲瀷鏃朵笉寰楀啓閫氱敤鍥哄寲銆?,
    };
    return [
      `${c.title}瑙勫垯锛歚,
      rules[type] || '鍙湁鏈疆绋冲畾浜嬪疄鏄庣‘鏀寔鏃舵墠鏇存柊锛涘急姘涘洿銆佺寽娴嬫垨鏈‘璁ゅ彉鍖栦笉鏇存柊銆?,
    ].join('\n');
  },

  settlementMetricExample(store = {}, participants = [], metricType = '') {
    const rows = (Array.isArray(participants) ? participants : []).filter((p) => metricType !== '鎰熻' || p?.type === 'character');
    for (const participant of rows) {
      const keys = this.settlementMetricKeysForSubject(store, participant, metricType);
      if (keys.length) return { subject: participant.name || participant.id, field: keys[0] };
    }
    return null;
  },

  settlementTypeJsonExample(type = '', participants = [], store = {}) {
    const chars = (Array.isArray(participants) ? participants : []).filter((p) => p?.type === 'character');
    const player = (Array.isArray(participants) ? participants : []).find((p) => p?.type === 'player');
    const subject = chars[0]?.name || chars[0]?.id || player?.name || player?.id || '瑙掕壊鍚?;
    const playerName = player?.name || player?.id || '鐜╁鍚?;
    const otherName = chars[1]?.name || chars[1]?.id || subject;
    if (type === this.eventSettlementType()) return '"浜嬩欢":[{"type":"inference","title":"鏈潵绾﹀畾","startDate":"2026-07-10","endDate":"2026-07-10","location":"鍦扮偣","content":"姝ｆ枃鏄庣‘绾﹀畾鐨勬湭鏉ヤ簨椤?,"people":["鐩稿叧浜?],"tags":["绾﹀畾"],"status":"active"}]';
    if (type === '鍩虹缁撶畻') return '"鍩虹缁撶畻":{"缁忚繃鏃堕棿":60,"褰撳墠鐘舵€?:"褰撳墠绋冲畾鐘舵€?,"褰撳墠鐩爣":"涓嬩竴姝ョ洰鏍?,"鍦烘櫙鏍囬":"鍦烘櫙鏍囬","鍦扮偣鍚嶇О":"鍦扮偣鍚?,"澶囬€夎鍔?:["琛屽姩涓€","琛屽姩浜?,"琛屽姩涓?,"琛屽姩鍥?]}';
    if (type === '鎯呯华') {
      const ex = this.settlementMetricExample(store, participants, '鎯呯华');
      return ex ? `"鎯呯华":[{"subject":"${ex.subject}","field":"${ex.field}","value":"+1","status":"鍙樺寲鍚庤鎯呯华鐨勫叿浣撹〃鐜?,"reason":"姝ｆ枃涓殑鏄庣‘琛屼负鎴栧璇濊瘉鎹?}]` : '"鎯呯华":[]';
    }
    if (type === '鎰熻') {
      const ex = this.settlementMetricExample(store, participants, '鎰熻');
      return ex ? `"鎰熻":[{"subject":"${ex.subject}","field":"${ex.field}","value":"+1","status":"鍙樺寲鍚庤鎰熻鐨勫叿浣撹〃鐜?,"reason":"璇?NPC 瀵圭帺瀹舵€佸害鍙樺寲鐨勬槑纭瘉鎹?}]` : '"鎰熻":[]';
    }
    if (type === '鐢熷懡浣撳緛') return `"鐢熷懡浣撳緛":[{"subject":"${subject}","field":"鐤插姵","value":"+1","reason":"姝ｆ枃鏄庣‘鍑虹幇鎸佺画娑堣€楁垨鐤叉儷璇佹嵁"}]`;
    if (type === '韬綋鐘舵€?) return `"韬綋鐘舵€?:[{"subject":"${subject}","part":"鏁翠綋","status":"鍏ㄨ韩缁煎悎鐘舵€?,"reason":"姝ｆ枃鏄庣‘鍏ㄨ韩鐘舵€佽瘉鎹?},{"subject":"${subject}","part":"鑳搁儴","status":"灞€閮ㄩ儴浣嶇姸鎬?,"reason":"姝ｆ枃鏄庣‘璇ラ儴浣嶈瘉鎹?}]`;
    if (type === '绌跨潃鐘舵€?) return `"绌跨潃鐘舵€?:[{"subject":"${subject}","part":"澶栧","item":"琛ｇ墿鍚嶇О","state":"褰撳墠鐘舵€?,"reason":"姝ｆ枃鏄庣‘绌跨潃鍙樺寲璇佹嵁"}]`;
    if (type === '鎬х粡鍘?) return `"鎬х粡鍘?:[{"subject":"${subject}","part":"鍒嗙被","delta":"+1","reason":"姝ｆ枃鏄庣‘鎬х浉鍏宠涓鸿瘉鎹?}]`;
    if (type === '鎬у巻鍙?) return `"鎬у巻鍙?:[{"subject":"${subject}","transition":"鐘舵€佽浆绉?,"partner":"瀵硅薄","evidence":"姝ｆ枃鏄庣‘璇佹嵁"}]`;
    if (type === '鍏崇郴') return `"鍏崇郴":[{"subject":"${subject}","left":"${playerName}","right":"${subject}","dimension":"浜插睘鍏崇郴","status":"绋冲畾浜插瘑","reason":"姝ｆ枃涓兘璇佹槑鍏崇郴鐘舵€佺殑鍏蜂綋璇佹嵁","result":"缁存寔绋冲畾浜插瘑鍏崇郴"}]`;
    if (type === '瑙掕壊鍗?) return `"瑙掕壊鍗?:[{"subject":"${subject}","field":"褰撳墠鐘舵€?,"op":"澧炲姞","value":"绋冲畾鐘舵€佹爣绛?,"reason":"姝ｆ枃鏄庣‘涓斿彲闀挎湡鍥哄寲鐨勮瘉鎹?,"result":"鍔犲叆鐘舵€佹爣绛?}]`;
    if (type === '鐗╁搧') return `"鐗╁搧":[{"subject":"${subject}","field":"鎸佹湁鐗?,"value":"鐗╁搧鐘舵€?,"reason":"姝ｆ枃鏄庣‘鐗╁搧鍙樺寲璇佹嵁"}]`;
    if (type === '鍦板浘') return '"鍦板浘":[{"subject":"鍦扮偣鍚?,"field":"鍦扮偣浜嬪疄","value":"绋冲畾鍦扮偣浜嬪疄","reason":"姝ｆ枃鏄庣‘鍦扮偣璇佹嵁"}]';
    if (type === '浜轰簨瀹夋帓') return `"浜轰簨瀹夋帓":[{"subject":"${subject}","field":"褰撳墠琛屽姩","value":"姝ｅ湪鍋氱殑鍏蜂綋鍔ㄤ綔","reason":"姝ｆ枃鏄庣‘琛屽姩璇佹嵁"},{"subject":"${subject}","field":"鍙敤鐘舵€?,"value":"鍦ㄥ満","reason":"姝ｆ枃鏄庣‘鍦ㄥ満璇佹嵁"}]`;
    if (type === '鍔垮姏鎬昏') return '"鍔垮姏鎬昏":[{"subject":"鍔垮姏鍚?,"field":"鏂板鍔垮姏","value":"鍔垮姏浜嬪疄","reason":"姝ｆ枃鏄庣‘鍔垮姏璇佹嵁"}]';
    if (type === '鍔垮姏缁撴瀯') return `"鍔垮姏缁撴瀯":[{"subject":"鍔垮姏鍚?,"field":"鎴愬憳鍦颁綅","value":"${subject}鐨勭ǔ瀹氬湴浣?,"reason":"姝ｆ枃鏄庣‘缁勭粐璇佹嵁"}]`;
    if (type === '绯荤粺璁板綍') return '"绯荤粺璁板綍":[{"subject":"绯荤粺","field":"閫氫俊娑堟伅","value":"宸茬‘璁ょ殑绯荤粺绾ч€氫俊鎴栨棩绋嬩簨瀹?,"reason":"姝ｆ枃鏄庣‘涓斾笉灞炰簬瑙掕壊鍗?浜轰簨瀹夋帓鐨勮瘉鎹?}]';
    if (type === '閫氱敤鍥哄寲') return `"閫氱敤鍥哄寲":[{"subject":"${subject}","field":"闀挎湡鏍囩","value":"绋冲畾鏍囩","reason":"姝ｆ枃鏄庣‘涓旀棤涓撻棬绫诲瀷鎵胯浇"}]`;
    if (type === '鎿嶆帶浣撻獙') return '"鎿嶆帶浣撻獙":[{"subject":"绯荤粺","field":"浣撻獙","value":"绋冲畾浣撻獙鍙樺寲","reason":"姝ｆ枃鏄庣‘浣撻獙璇佹嵁"}]';
    return `"${type}":[]`;
  },

  settlementTypeAntiExample(type = '') {
    const map = {
      '鎯呯华': '鍙嶄緥锛歿"field":"鎯婃厡","value":"+0"}锛堟柊閫犲瓧娈垫垨 0 鍙樺寲锛夛紱姝ｇ‘锛氱敤鍩虹嚎宸叉湁瀛楁涓?+N/-N锛屾垨 []銆?,
      '鎰熻': '鍙嶄緥锛歿"subject":"鐜╁","field":"璀︽垝"}锛堢帺瀹朵笉鑳芥槸鎰熻涓讳綋锛岃鎴掍笉鏄熀绾垮瓧娈碉級锛涙纭細NPC subject + 鍩虹嚎宸叉湁瀛楁锛屾垨 []銆?,
      '鐢熷懡浣撳緛': '鍙嶄緥锛歿"field":"蹇冪巼","value":"98/100"}銆亄"field":"绮剧绋冲畾","value":"+0"}锛涙纭細鍏釜鍏佽瀛楁 + 闈為浂澧炲噺锛屾垨 []銆?,
      '韬綋鐘舵€?: '鍙嶄緥锛氭鏂囧悓鏃舵湁鍏ㄨ韩鍙戦ⅳ鍜岃兏閮ㄨ瑙︾锛屽嵈鍙啓涓€鏉℃垨鐪佺暐鏁翠綋锛涙纭細鏁翠綋涓庡眬閮ㄥ悇鍐欎竴鏉★紙鎴栧鏉″眬閮級锛屾垨纭疄鏃犲彉鍖栨椂 []銆?,
      '鎬х粡鍘?: '鍙嶄緥锛氭妸鍏卞銆佹嫢鎶便€佺収椤惧啓鎴愭€х粡鍘嗭紱姝ｇ‘锛氭病鏈夋槑纭€х浉鍏宠涓哄氨 []銆?,
      '鍏崇郴': '鍙嶄緥锛歿"dimension":"濂芥劅","status":"+5"}銆佺己 right/result锛涙纭細dimension 鍐欎翰灞?鏈嬪弸/鎭嬩汉/鏁屽绛夌ǔ瀹氬叧绯伙紝status 鍐欏叧绯荤姸鎬併€?,
      '瑙掕壊鍗?: '鍙嶄緥锛歿"op":"淇濇寔"}銆佹妸涓存椂鎯呯华/绌跨潃鍐欏叆瑙掕壊鍗★紱姝ｇ‘锛歰p 鍙兘 鏇挎崲/澧炲姞锛屼笖蹇呴』鏄暱鏈熺ǔ瀹氬瓧娈点€?,
      '绯荤粺璁板綍': '鍙嶄緥锛歿"field":"浜嬩欢","value":"鍒樻偁杩涘叆鎴块棿骞舵姳浣忓鏂?}锛堣繖鏄汉浜?鎰熻/姝ｆ枃澶嶈堪锛夛紱姝ｇ‘锛氬啓寰俊娑堟伅銆佹棩鍘嗕簨椤广€佷笘鐣岀嚎鑺傜偣锛屾垨 []銆?,
    };
    return map[type] || '';
  },

  settlementParticipantMetrics(store = {}, participant = {}) {
    const state = participant?.type === 'player'
      ? store?.playerIdentityState?.()
      : (store?.itemSkillState?.(participant.id) || store?.itemSkillState?.(participant.idOrName) || store?.rpgStates?.[participant.id]);
    return state?.metrics || (state ? store?.ensureStateMetrics?.(state) : null) || {};
  },

  settlementMetricKeysForSubject(store = {}, subject = {}, metricType = '') {
    if (metricType === '鎰熻' && subject?.type === 'player') return [];
    const participant = { type: subject?.type, id: subject?.id, idOrName: subject?.id, name: subject?.name };
    const metrics = this.settlementParticipantMetrics(store, participant);
    const group = metricType === '鎰熻' ? metrics.playerFeelings : metrics.emotions;
    return Object.keys(group || {}).filter((key) => String(key || '').trim());
  },

  settlementParticipantContextText(store = {}, participants = []) {
    const playerName = String(store?.playerName || store?.playerProfile?.name || store?.realWorldPlayerSettlementName?.() || '鐜╁').trim() || '鐜╁';
    const chars = (Array.isArray(participants) ? participants : []).filter((p) => p?.type === 'character');
    const roleRows = chars.map((participant) => {
      const state = store?.itemSkillState?.(participant.id) || store?.itemSkillState?.(participant.idOrName) || store?.rpgStates?.[participant.id];
      const profile = state?.profile || {};
      const facts = [profile.role || state?.role, profile.relationship || profile.identity, profile.age ? `${profile.age}宀乣 : ''].filter(Boolean).join('锛?) || '瑙掕壊鍗″凡鍔犺浇';
      return `${participant.name || participant.id}锛?{facts}`;
    }).join('\n') || '鏃?;
    const bindings = [`浣?${playerName}锛堢帺瀹讹級`].concat(chars.map((p) => `${p.name || p.id}=鍑哄満瑙掕壊锛岀粨绠椾富浣撳繀椤荤洿鎺ュ啓濮撳悕`)).join('\n');
    return [
      '鐜╁涓庡嚭鍦轰汉鐗╂爣娉細',
      `鐜╁锛?{playerName}`,
      `鍑哄満瑙掕壊锛?{chars.map((p) => p.name || p.id).filter(Boolean).join('銆?) || '鏃?}`,
      '鎸囦唬缁戝畾锛?,
      bindings,
      '鍑哄満浜虹墿瑙掕壊鍗℃憳瑕侊細',
      roleRows,
    ].join('\n');
  },

  settlementMetricBaselineText(store = {}, participants = []) {
    const emotionKeys = new Set();
    const feelingKeys = new Set();
    const format = (group = {}, keySet = null) => Object.entries(group || {}).filter(([, value]) => value !== undefined && value !== null && value !== '').map(([key, value]) => {
      if (keySet) keySet.add(key);
      return `${key}=${value}`;
    }).join('銆?) || '鏃?;
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
    const emotionRows = characterRows.map((row) => `${row.label}锛氭儏缁細${row.emotions}`).join('\n') || '鏃?;
    const playerEmotionRows = playerRows.map((row) => `${row.label}锛氱帺瀹惰嚜鎴戞儏缁細${row.emotions}`).join('\n') || '鏃?;
    const feelingRows = characterRows.map((row) => `${row.label}锛氬鐜╁鎰熻锛?{row.playerFeelings}`).join('\n') || '鏃?;
    const emotionWhitelist = [...emotionKeys].join('銆?) || '鏃?;
    const feelingWhitelist = [...feelingKeys].join('銆?) || '鏃?;
    return [
      '鍑哄満瑙掕壊褰撳墠鎯呯华鍩虹嚎锛?,
      emotionRows,
      '鐜╁鑷垜鐘舵€佸熀绾匡細',
      playerEmotionRows,
      `鎯呯华鎸囨爣鍙兘浣跨敤涓婅堪鎯呯华鍩虹嚎涓凡缁忓瓨鍦ㄧ殑鎸囨爣鍚嶏細${emotionWhitelist}`,
      '鍑哄満瑙掕壊瀵圭帺瀹舵劅瑙夊熀绾匡細',
      feelingRows,
      `鎰熻鎸囨爣鍙兘浣跨敤鍑哄満瑙掕壊瀵圭帺瀹舵劅瑙夊熀绾夸腑宸茬粡瀛樺湪鐨勬寚鏍囧悕锛?{feelingWhitelist}`,
      '鑻ョǔ瀹氫簨瀹炰笉瀵瑰簲涓婅堪宸叉湁鎸囨爣鍚嶏紝蹇呴』鍐欌€滄棤鍙樺寲鈥濓紝涓嶅緱鏂伴€犳儏缁?鎰熻鎸囨爣銆?,
      '杈圭晫锛氭儏缁槸瀵瑰簲涓讳綋褰撳墠鍐呭湪鎯呯华锛涙劅瑙夊彧琛ㄧず鍑哄満瑙掕壊瀵圭帺瀹剁殑鎰熻锛岀帺瀹舵湰浜轰笉寰椾綔涓衡€滃鐜╁鎰熻鈥濈殑缁撶畻涓讳綋銆?,
    ].join('\n');
  },

  async buildSettlementTypeWindowMessages({ requestedTypes = [], completedTypes = [], incompleteTypes = [], partialByType = {}, store, action, base, loaded, materialSession = null, narration, trace = [], participants = [], config = this.realConfig() }) {
    const contracts = this.settlementTypeContracts();
    const totalTypes = requestedTypes.length;
    const jsonContracts = requestedTypes.map((type) => {
      const c = contracts[type];
      if (type === '鍩虹缁撶畻') return '鍩虹缁撶畻锛氬璞★紝蹇呴』鍚?keys锛氱粡杩囨椂闂淬€佸綋鍓嶇姸鎬併€佸綋鍓嶇洰鏍囥€佸満鏅爣棰樸€佸湴鐐瑰悕绉般€佸閫夎鍔紱澶囬€夎鍔ㄥ繀椤绘槸 4 涓瓧绗︿覆鏁扮粍銆?;
      if (type === '绌跨潃鐘舵€?) return '绌跨潃鐘舵€侊細鏁扮粍锛涙瘡椤?{"subject":"濮撳悕","part":"閮ㄤ綅","item":"琛ｇ墿鍚嶇О","state":"褰撳墠鐘舵€?,"reason":"璇佹嵁"}锛涙棤鍙樺寲 []銆?;
      if (type === '韬綋鐘舵€?) return '韬綋鐘舵€侊細鏁扮粍锛涙瘡椤?{"subject":"濮撳悕","part":"閮ㄤ綅","status":"鐘舵€?,"reason":"璇佹嵁"}锛涘悓杞彲鏈夊鏉★紝鏁翠綋/鍏ㄨ韩涓庡眬閮ㄩ儴浣嶄簰涓嶅啿绐侊紱鏃犲彉鍖?[]銆?;
      if (type === '鎬х粡鍘?) return '鎬х粡鍘嗭細鏁扮粍锛涙瘡椤?{"subject":"濮撳悕","part":"鍒嗙被","delta":"+N/-N","reason":"璇佹嵁"}锛涙棤鍙樺寲 []銆?;
      if (type === '鎬у巻鍙?) return '鎬у巻鍙诧細鏁扮粍锛涙瘡椤?{"subject":"濮撳悕","transition":"鐘舵€佽浆绉?,"partner":"瀵硅薄","evidence":"璇佹嵁"}锛涙棤鍙樺寲 []銆?;
      if (type === '鎯呯华') return '鎯呯华锛氭暟缁勶紱姣忛」 {"subject":"濮撳悕","field":"鎯呯华鎸囨爣鍚?,"value":"+N/-N","status":"鍙樺寲鍚庤鎯呯华鐨勫叿浣撹〃鐜?,"reason":"姝ｆ枃涓殑鍏蜂綋琛屼负鎴栧璇濊瘉鎹?}锛涙棤鍙樺寲 []銆俿tatus 鍐欑▼搴﹁〃鐜帮紝涓嶈鍐欐寚鏍囧悕+鏁板€煎墠缂€锛涚己鐪佹椂绯荤粺浼氭寜鏂版暟鍊艰ˉ妯℃澘瑙ｉ噴銆?;
      if (type === '鎰熻') return '鎰熻锛氭暟缁勶紱姣忛」 {"subject":"鍑哄満NPC濮撳悕","field":"鎰熻鎸囨爣鍚?,"value":"+N/-N","status":"鍙樺寲鍚庤鎰熻鐨勫叿浣撹〃鐜?,"reason":"姝ｆ枃璇佹嵁璇佹槑璇PC瀵圭帺瀹舵€佸害鍙樺寲"}锛涙棤鍙樺寲 []銆俿tatus 鍐欑▼搴﹁〃鐜帮紝涓嶈鍐欐寚鏍囧悕+鏁板€煎墠缂€锛涚己鐪佹椂绯荤粺浼氭寜鏂版暟鍊艰ˉ妯℃澘瑙ｉ噴銆?;
      if (type === '鍏崇郴') return '鍏崇郴锛氭暟缁勶紱姣忛」 {"subject":"濮撳悕","left":"鍏崇郴宸︽柟","right":"鍏崇郴鍙虫柟","dimension":"绋冲畾鍏崇郴缁村害","status":"鍏崇郴鐘舵€?,"reason":"璇佹嵁","result":"缁撶畻缁撴灉"}锛涙棤鍙樺寲 []銆?;
      if (type === '瑙掕壊鍗?) return '瑙掕壊鍗★細鏁扮粍锛涙瘡椤?{"subject":"濮撳悕","field":"瀛楁","op":"鏇挎崲/澧炲姞","value":"鍐呭","reason":"璇佹嵁","result":"缁撴灉"}锛涙棤鍙樺寲 []銆?;
      if (type === this.eventSettlementType()) return '浜嬩欢锛氭暟缁勶紱姣忛」 {"type":"random|inference|periodic","title":"浜嬩欢鍚?,"startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD","location":"鍦扮偣","content":"鍐呭","people":["鐩稿叧浜?],"tags":["鏍囩"],"probability":25,"status":"active"}锛涙棤浜嬩欢 []銆?;
      return `${type}锛氭暟缁勶紱姣忛」 {"subject":"缁撶畻涓讳綋","field":"瀛楁","value":"鍙樺寲鎴栨柊鍊?,"reason":"璇佹嵁"}锛涙棤鍙樺寲 []銆傚師鍚堢害锛?{c?.format || '鏇存柊N锛氱粨绠椾富浣擄紝瀛楁锛屽彉鍖栵紝鍘熷洜'}`;
    }).join('\n');
    const globalShortReason = String(partialByType.__shortOutputReason || '').trim();
    const incompleteReason = [globalShortReason, incompleteTypes.map((type) => {
      const detail = String(partialByType[type] || '').trim();
      const safeDetail = /(?:缁撶畻鐘舵€亅缁撶畻瀵硅薄|鏇存柊\d*|鏇存柊N|缁撶畻缁撴潫|绫诲瀷瀹屾垚|[{}\n\r])/u.test(detail) ? '' : detail;
      return `${type}锛?{safeDetail || '涓婅疆 JSON 缂哄け鎴栧瓧娈垫湭閫氳繃瑙ｆ瀽锛屾湰杞繀椤婚噸鏂拌緭鍑鸿 key 鐨勫畬鏁?JSON 鍊?}`;
    }).join('锛?)].filter(Boolean).join('\n') || '鏃?;
    const stableFactRules = [
      '鍐呴儴鎻愬彇鈥滄湰杞ǔ瀹氫簨瀹炩€濓細鍙湪鍐呴儴瀹屾垚锛屼笉杈撳嚭浜嬪疄鍒楄〃銆?,
      '鏄庣‘浜嬪疄锛氬彲鐩存帴缁撶畻銆?,
      '寮烘殫绀轰簨瀹烇細鍙繚瀹堢粨绠楋紝浣嗗繀椤绘湁鏄庣‘琛屼负銆佸璇濇垨杩炵画鍔ㄤ綔鏀拺銆?,
      '寮辨皼鍥存殫绀猴細涓嶅緱缁撶畻銆?,
    ].join('\n');
    const requiredKeyOrder = requestedTypes.join(' 鈫?');
    const jsonExamples = `{${requestedTypes.map((type) => this.settlementTypeJsonExample(type, participants, store)).join(',')}}`;
    const antiExamples = requestedTypes.map((type) => this.settlementTypeAntiExample(type)).filter(Boolean).join('\n') || '鏃?;
    const rulesText = [
      '浣犳鍦ㄦ墽琛?Stage4 绱у噾 JSON 婊戝姩缁撶畻銆?,
      '鍙緭鍑轰竴涓悎娉?JSON 瀵硅薄锛涗笉瑕?Markdown锛涗笉瑕?```json 浠ｇ爜鍧楋紱涓嶈鎹㈣锛涗笉瑕佽В閲婏紱涓嶈鍐呴儴鍒嗘瀽銆?,
      '涓婁竴鏉?assistant 娑堟伅鏄湰杞鏂囨潗鏂欙紱鍙兘渚濇嵁璇ユ鏂囧拰鏈潯瑕佹眰涓殑鏉愭枡缁撶畻銆?,
      'JSON 椤跺眰 key 鍙兘鏄€滄湰娆″繀椤昏繑鍥炵殑绫诲瀷鈥濆垪鍑虹殑绫诲瀷锛涘凡瀹屾垚绫诲瀷涓嶅緱閲嶅杈撳嚭锛涙湭鍒楀叆绫诲瀷涓嶅緱杈撳嚭銆?,
      '鏃犵ǔ瀹氬彉鍖栫殑闈炲熀纭€绫诲瀷蹇呴』杈撳嚭绌烘暟缁?[]锛屼笉瑕佸啓鈥滄棤鍙樺寲鈥濄€?,
      '鎯呯华銆佹劅瑙夈€佺敓鍛戒綋寰併€佹€х粡鍘嗙殑 value/delta 蹇呴』鍐?+N 鎴?-N锛涚姝㈠啓 0銆?0銆?00銆?8/100銆佹甯搞€佹棤鍙樺寲銆?,
      '瀛楁鍚嶅繀椤讳娇鐢ㄥ悎绾︿腑鐨勪腑鏂?key锛涚姝㈣緭鍑鸿嫳鏂囬《灞?key锛屼緥濡?life_signs銆乺elationship銆乺ole_card銆?,
      '鎰熻涓讳綋鍙兘鏄嚭鍦?NPC锛涚帺瀹舵湰浜轰笉寰楄緭鍑烘劅瑙夋洿鏂般€?,
      '鍏崇郴 dimension 蹇呴』鏄ǔ瀹氬叧绯荤被鍒紝绂佹鍐欏ソ鎰熴€佷俊浠汇€佷緷璧栥€佽鎯曘€佸紑蹇冦€佹亹鎯х瓑鏁板€兼€佸害鎴栨儏缁€?,
      '姣忔潯鏇存柊鍙兘鍐欎竴涓瓧娈碉紝绂佹鎶婂瓧娈靛悎骞舵垚鈥滃綋鍓嶅湴鐐?褰撳墠琛屽姩/鍙敤鐘舵€佲€濇垨鈥滀簨浠?璁板綍/鐘舵€佲€濄€?,
    ].join('\n');
    const requestText = [
      '浠诲姟锛氳緭鍑?Stage4 缁撶畻绱у噾 JSON銆?,
      `鏈蹇呴』杩斿洖鐨勭被鍨嬶細${requestedTypes.join('銆?)}`,
      `宸插畬鎴愮被鍨嬶細${completedTypes.join('銆?) || '鏃?}`,
      `鏈畬鎴愮被鍨嬶細${incompleteTypes.join('銆?) || '鏃?}`,
      `蹇呴』杈撳嚭 key 鏁伴噺锛?{totalTypes}`,
      `蹇呴』杈撳嚭 key 椤哄簭锛?{requiredKeyOrder || '鏃?}`,
      `鏈畬鎴愮被鍨嬪師鍥狅細${incompleteReason}`,
      `鏈洖鍚堝弬涓庤€咃細${JSON.stringify(participants)}`,
      '鏈疆缁撶畻鏉愭枡锛?,
      [`琛屽姩锛?{this.actionText(action)}`, this.settlementParticipantContextText(store, participants), this.settlementMetricBaselineText(store, participants), stableFactRules].join('\n'),
      '绫诲瀷鐭鍒欙細',
      requestedTypes.map((type) => this.settlementTypeShortRule(type)).join('\n\n'),
      'JSON 鍚堢害锛?,
      jsonContracts,
      '鏈绐楀彛鍚堟硶 JSON 绀轰緥锛屽彧鑳藉弬鑰冪粨鏋勶紱娌℃湁姝ｆ枃璇佹嵁鏃跺搴旀暟缁勫繀椤绘敼鎴?[]锛?,
      jsonExamples,
      '鏈绐楀彛甯歌閿欒鍙嶄緥锛屽繀椤婚伩鍏嶏細',
      antiExamples,
      '杈撳嚭纭鍒欙細',
      '- 鍙緭鍑轰竴涓揣鍑?JSON 瀵硅薄锛岄瀛楃蹇呴』鏄?{锛屾湯瀛楃蹇呴』鏄?}銆?,
      '- 椤跺眰 key 蹇呴』涓斿彧鑳藉寘鍚湰娆″繀椤昏繑鍥炵殑绫诲瀷锛涙寜蹇呴』杈撳嚭 key 椤哄簭鎺掑垪銆?,
      '- 鍩虹缁撶畻蹇呴』杈撳嚭瀹屾暣瀵硅薄锛涢潪鍩虹绫诲瀷蹇呴』杈撳嚭鏁扮粍锛屾湁鍙樺寲鍐欏璞℃暟缁勶紝鏃犲彉鍖栧啓 []銆?,
      '- subject 蹇呴』鐩存帴鍐欐湰鍥炲悎鍙備笌鑰呭鍚嶃€佹槑纭湴鐐瑰悕銆佹槑纭娍鍔涘悕鎴栤€滅郴缁熲€濓紱涓嶈鍐欎唬璇嶃€?,
      '- reason/evidence 蹇呴』鍐欏叿浣撹涓恒€佸璇濇垨杩炵画鍔ㄤ綔璇佹嵁锛涘急姘涘洿鏆楃ず涓嶅緱缁撶畻銆?,
      '- 鎯呯华銆佹劅瑙夈€佺敓鍛戒綋寰併€佹€х粡鍘嗙殑 value/delta 蹇呴』鏄甫绗﹀彿闈為浂鍙樺寲锛屼緥濡?+2 鎴?-1锛涙病鏈夊彉鍖栬緭鍑?[]銆?,
      '- 鎯呯华/鎰熻姣忔潯蹇呴』鍚?field銆乿alue銆乺eason锛泂tatus 鍐欏彉鍖栧悗绋嬪害琛ㄧ幇锛堢姝⑩€滄寚鏍囧悕+鏁板€硷細鈥濆墠缂€锛夛紝缂虹渷鍒欑郴缁熸寜鏂版暟鍊肩敓鎴愭ā鏉胯В閲娿€?,
      '- 鎰熻鏁扮粍涓?subject 鍙兘鍐欏嚭鍦?NPC锛屼笉鑳藉啓鐜╁濮撳悕銆?,
      '- 鍏崇郴鏁扮粍涓?left/right/dimension/status/reason/result 閮藉繀椤绘湁锛沝imension 涓嶈兘鏄ソ鎰?淇′换/渚濊禆/璀︽儠绛夋劅瑙夋寚鏍囥€?,
      '- 瑙掕壊鍗?op 鍙兘鍐欌€滄浛鎹⑩€濇垨鈥滃鍔犫€濓紱涓嶈兘鍐欎繚鎸併€佹棤鍙樺寲銆佹洿鏂般€?,
      '- 瀛楃涓蹭腑涓嶈浣跨敤鑻辨枃閫楀彿鎴栦腑鏂囬€楀彿鍒嗛殧澶氬瓧娈碉紱蹇呰鏃剁敤椤垮彿鎴栧垎鍙枫€?,
      '- 涓嶈涓轰簡鍑戦暱搴﹀垱閫犳洿鏂帮紱绌烘暟缁勬槸鍚堟硶瀹屾暣杈撳嚭銆?,
      '鍚堟硶褰㈡€佺ず渚嬶細{"鎯呯华":[],"韬綋鐘舵€?:[{"subject":"瑙掕壊鍚?,"part":"鏁翠綋","status":"鍏ㄨ韩鐘舵€?,"reason":"璇佹嵁"},{"subject":"瑙掕壊鍚?,"part":"鑳搁儴","status":"灞€閮ㄧ姸鎬?,"reason":"璇佹嵁"}],"绯荤粺璁板綍":[]}',
    ].join('\n');
    return [
      { role: 'user', content: rulesText },
      { role: 'assistant', content: `鏈疆姝ｆ枃锛歕n${this.compactUpdatePromptText(narration, 1800, true)}` },
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
      const raw = await this.completeConfiguredStep(store, messages, logId, false, { ...config, sourceTitle: `${config.label}Stage4婊戝姩缁撶畻`, promptId: 'inference-stage4-settlement-window', settlementAttempt: attempt });
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
        partialByType.__shortOutputReason = `涓婅疆杩斿洖杩囩煭锛?{compactRawLength}/${shortOutputThreshold}锛涙暣杞凡涓㈠純锛屽繀椤绘寜鏈蹇呴』杩斿洖鐨勭被鍨嬮『搴忓畬鏁撮噸杈撳叏閮ㄧ被鍨嬨€俙;
        if (shortOutputRetries > 1) throw new Error(`Stage4婊戝姩缁撶畻杩斿洖杩囩煭涓旀棤瀹屾暣绫诲瀷锛?{compactRawLength}/${shortOutputThreshold}锛屾湭瀹屾垚绫诲瀷锛?{requestedTypes.join('銆?)}`);
        requestedTypes.forEach((type) => { partialByType[type] = '涓婅疆杩斿洖杩囩煭涓旀棤瀹屾暣绫诲瀷锛涙湰杞繀椤婚噸鏂拌緭鍑鸿 key 鐨勫畬鏁?JSON 鍊笺€?; });
        continue;
      }
      shortOutputRetries = 0;
      const acceptedShortReason = hasCompleteBlocksInShortOutput
        ? `涓婅疆杩斿洖杩囩煭锛?{compactRawLength}/${shortOutputThreshold}锛涢暱搴︿笉瓒筹紝浣嗗凡楠屾敹瀹屾暣鍧楋細${parsed.completeTypes.join('銆?)}锛涘墿浣欑被鍨嬪繀椤诲畬鏁磋ˉ榻愩€俙
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
          ? `瀛楁鏈€氳繃瑙ｆ瀽锛?{parsedCount}/${updateCount} 鏉℃湁鏁堬紱璇锋鏌?subject銆乫ield銆乿alue 涓庡悎绾︺€俙
          : '涓婅疆 JSON 缂哄け鎴栧瓧娈垫湭閫氳繃瑙ｆ瀽銆?;
        partialByType[type] = parsedLines.length ? `${cause} 鏈疆蹇呴』閲嶆柊杈撳嚭璇?key 鐨勫畬鏁?JSON 鍊笺€俙 : `${cause} 鏈疆鏈繑鍥炶绫诲瀷銆俙;
      });
      if (acceptedShortReason && parsed.incompleteTypes.length) partialByType.__shortOutputReason = acceptedShortReason;
      requestedTypes = this.nextSettlementWindow(allTypes, completedTypes, parsed.incompleteTypes);
    }
    requestedTypes = this.nextSettlementWindow(allTypes, completedTypes, []);
    if (requestedTypes.length) throw new Error(`Stage4缁撶畻绫诲瀷鏈畬鎴愶細${requestedTypes.join('銆?)}`);
    return this.mergeGroupedUpdatePatches(Object.values(patchesByType), {});
  },

  mergeGroupedUpdatePatches(patches = [], route = {}) {
    const merged = { type: 'final', genericUpdates: [], events: [] };
    const applyBaseFields = (baseFields = {}) => {
      const choices = ['澶囬€夎鍔?', '澶囬€夎鍔?', '澶囬€夎鍔?', '澶囬€夎鍔?'].map((key) => String(baseFields[key] || '').trim()).filter(Boolean);
      const elapsed = Number(baseFields['缁忚繃鏃堕棿']);
      if (Number.isFinite(elapsed) && elapsed > 0) merged.elapsedSeconds = Math.max(1, Math.round(elapsed));
      if (baseFields['褰撳墠鐘舵€?]) merged.status = String(baseFields['褰撳墠鐘舵€?]).slice(0, 60);
      if (baseFields['褰撳墠鐩爣']) merged.quest = String(baseFields['褰撳墠鐩爣']).slice(0, 40);
      if (baseFields['鍦烘櫙鏍囬']) merged.sceneTitle = String(baseFields['鍦烘櫙鏍囬']).slice(0, 40);
      if (baseFields['鍦扮偣鍚嶇О']) merged.locationName = String(baseFields['鍦扮偣鍚嶇О']).slice(0, 60);
      if (choices.length === 4) merged.choices = choices.slice(0, 4);
    };
    ['sceneTitle', 'locationName', 'status', 'quest', 'elapsedSeconds', 'choices'].forEach((key) => {
      if (route[key] !== undefined && route[key] !== null && route[key] !== '') merged[key] = route[key];
    });
    (Array.isArray(patches) ? patches : []).forEach((patch) => {
      if (!patch || typeof patch !== 'object') return;
      applyBaseFields(patch.baseFields || {});
      if (Array.isArray(patch.genericUpdates)) merged.genericUpdates.push(...patch.genericUpdates);
      if (Array.isArray(patch.events)) merged.events.push(...patch.events);
    });
    return merged;
  },

  fallbackUpdateJson(store, action = '', config = this.realConfig()) {
    if (config.mode === 'story') {
      return {
        type: 'final',
        sceneTitle: store.sceneTitle || '鍓ф儏缁х画',
        elapsedSeconds: 60,
        mood: store.mood || '鍐烽潤',
        quest: store.quest || '缁х画瑙傚療',
        choices: Array.isArray(store.choices) && store.choices.length ? store.choices.slice(0, 4) : ['瑙傚療鍥涘懆', '灏濊瘯琛屽姩', '涓庝汉浜よ皥', '闅愯棌寮傛牱'],
        statChanges: { health: 0, stamina: 0, mental_stability: 0 },
        metricUpdates: { emotions: [], playerFeelings: [] },
      };
    }
    return {
      type: 'final',
      sceneTitle: store.realWorldSceneTitle || '鐜板疄涓栫晫',
      locationName: store.realWorldLocationName || store.realWorldMap?.current || '',
      elapsedSeconds: 300,
      status: store.realWorldStatus || '鐜板疄鎺ㄦ紨缁х画涓?,
      quest: store.realWorldQuest || '纭鐜板疄澶勫',
      choices: Array.isArray(store.realWorldChoices) && store.realWorldChoices.length ? store.realWorldChoices.slice(0, 4) : ['瑙傚療鎵嬫満寮傚父', '澶勭悊鐜板疄浜嬪姟', '鑱旂郴鐔熶汉', '鏆傛椂浼戞伅'],
      vitalUpdates: [
        { key: 'vitality', delta: 0, reason: '缁撶畻淇濈暀銆? },
        { key: 'stamina_pool', delta: 0, reason: '缁撶畻淇濈暀銆? },
        { key: 'satiety', delta: 0, reason: '缁撶畻淇濈暀銆? },
        { key: 'hydration', delta: 0, reason: '缁撶畻淇濈暀銆? },
        { key: 'fatigue', delta: 0, reason: '缁撶畻淇濈暀銆? },
        { key: 'mental_stability', delta: 0, reason: '缁撶畻淇濈暀銆? },
      ],
    };
  },

  guidedStepFields() {
    return ['鏌ヨ瑙勫垝', '璧勬枡鐘舵€?, '鍦扮偣鏌ヨ鐞嗙敱', '鍥犳灉鏌ヨ鐞嗙敱', '鍐茬獊鏌ヨ鐞嗙敱', '寮哄埗鍑哄満', '楂樹紭鍏堝€欓€?, '鎴忓墽鍊欓€?, '绂佹鍑哄満', '闅忔満浜嬩欢鍊欓€?, '闅忔満浜嬩欢闂叆鏉′欢', '璧勬枡璇锋眰', '璧勬枡璇锋眰缁撴潫', '鍦扮偣鏌ヨ', '鍥犳灉鏌ヨ', '鍐茬獊鏌ヨ'];
  },

  sceneAnchorFields() {
    return ['鍦烘櫙閿氬畾鎶ュ憡', '褰撳墠鍦扮偣', '褰撳墠鏃堕棿', '绌洪棿鐘舵€?, '褰撳墠鍔ㄤ綔', '寮哄埗鍑哄満', '楂樹紭鍏堝€欓€?, '鎴忓墽鍊欓€?, '绂佹鍑哄満', '闅忔満浜嬩欢褰卞搷', '姝ｆ枃鍐欎綔閲嶇偣', '褰撳墠鍦烘櫙褰卞搷瀵硅薄'];
  },

  settlementBaseFields() {
    return ['鍩虹缁撶畻', '缁撶畻鐘舵€?, '缁忚繃鏃堕棿', '褰撳墠鐘舵€?, '褰撳墠鐩爣', '鍦烘櫙鏍囬', '鍦扮偣鍚嶇О', '澶囬€夎鍔?', '澶囬€夎鍔?', '澶囬€夎鍔?', '澶囬€夎鍔?', '缁撶畻缁撴潫'];
  },

  kvFieldAliases() {
    return {
      '蹇呴』鍑哄満': '寮哄埗鍑哄満',
      '褰撳墠鍙備笌鑰?: '寮哄埗鍑哄満',
      '涓嶈兘鍑哄満': '绂佹鍑哄満',
      '绂佹瑙掕壊': '绂佹鍑哄満',
      '鍦哄闅忔満浜嬩欢': '闅忔満浜嬩欢鍊欓€?,
      '闅忔満涓诲姩浜嬩欢': '闅忔満浜嬩欢鍊欓€?,
      '闅忔満涓诲姩浜嬩欢褰卞搷': '闅忔満浜嬩欢褰卞搷',
      '鍐欎綔閲嶇偣': '姝ｆ枃鍐欎綔閲嶇偣',
      '姝ｆ枃閲嶇偣': '姝ｆ枃鍐欎綔閲嶇偣',
      '缁撶畻闄愬埗': '褰撳墠鍦烘櫙褰卞搷瀵硅薄',
      '缁撶畻杈圭晫': '褰撳墠鍦烘櫙褰卞搷瀵硅薄',
      '璧勬枡鏄惁瓒冲': '璧勬枡鐘舵€?,
    };
  },

  normalizeKvKey(key = '', allowed = []) {
    const clean = String(key || '').trim().replace(/[\s銆€]+/gu, '');
    const numberedReason = clean.replace(/^(鍦扮偣鏌ヨ鐞嗙敱|鍥犳灉鏌ヨ鐞嗙敱|鍐茬獊鏌ヨ鐞嗙敱)\d+$/u, '$1');
    const direct = allowed.find((item) => item === clean || item === numberedReason);
    if (direct) return direct;
    const alias = this.kvFieldAliases()[clean];
    return allowed.includes(alias) ? alias : '';
  },

  splitKvLine(line = '') {
    const text = String(line || '').trim();
    const match = text.match(/^([^锛?\n]{1,40})[锛?]\s*([\s\S]*)$/u);
    return match ? { key: match[1].trim(), value: match[2].trim() } : null;
  },

  requiredKvFields(allowed = []) {
    const sceneAnchorRequired = ['鍦烘櫙閿氬畾鎶ュ憡', '褰撳墠鍦扮偣', '褰撳墠鏃堕棿', '绌洪棿鐘舵€?, '褰撳墠鍔ㄤ綔', '寮哄埗鍑哄満', '绂佹鍑哄満', '闅忔満浜嬩欢褰卞搷', '姝ｆ枃鍐欎綔閲嶇偣', '褰撳墠鍦烘櫙褰卞搷瀵硅薄'];
    if (sceneAnchorRequired.every((key) => allowed.includes(key))) return sceneAnchorRequired;
    const preferred = ['璧勬枡鐘舵€?, '寮哄埗鍑哄満', '绂佹鍑哄満', '闅忔満浜嬩欢闂叆鏉′欢', '姝ｆ枃鍐欎綔閲嶇偣', '缁撶畻杈圭晫'];
    const required = preferred.filter((key) => allowed.includes(key));
    return required.length ? required : allowed.slice(0, Math.min(allowed.length, 6));
  },

  materialRequestPlaceholderReason(line = '') {
    const placeholders = ['瑙掕壊鍏ㄧО', '涓栫晫鍏ㄧО', '鍦扮偣鍏ㄧО', '浜虹墿鍏ㄧО', '浣滃搧鍏ㄧО'];
    const body = String(line || '').replace(/^璧勬枡璇锋眰\d+\s*[锛?]/u, '').trim();
    const parts = body.split(/[锛?銆侊紱;]/u).map((part) => part.trim()).filter(Boolean).slice(2);
    const hit = parts.find((part) => placeholders.includes(part));
    return hit ? `璧勬枡璇锋眰鍖呭惈鏈浛鎹㈠崰浣嶈瘝锛?{hit}` : '';
  },

  fallbackChineseMaterialRequest(line = '', options = {}) {
    if (this.materialRequestPlaceholderReason(line)) return null;
    const ctx = options.config?.ctx || window.GameModules.realWorldAgentContext;
    if (typeof ctx?.parseChineseMaterialRequest === 'function') return ctx.parseChineseMaterialRequest(line, { mode: options.config?.mode, store: options.store });
    const body = String(line || '').replace(/^璧勬枡璇锋眰\d+\s*[锛?]/u, '').trim();
    const parts = body.split(/[锛?銆侊紱;]/u).map((part) => part.trim()).filter(Boolean);
    if (parts[0] === '瑙掕壊鏌ヨ' && parts[1] === '鎼滅储瑙掕壊鍗? && parts[2]) {
      return { skill: 'character.query', method: 'searchCharacterProfile', params: { name: parts[2], world: parts[3] || window.GameModules.realWorld2026?.label || '2026鐜颁唬閮藉競鐜板疄涓栫晫' }, sourceText: String(line || '').trim() };
    }
    return null;
  },

  scoreChineseKvParse(values = {}, allowed = [], materialLines = [], materialRequests = []) {
    const required = this.requiredKvFields(allowed);
    const isGuidedStep = this.guidedStepFields().every((key) => allowed.includes(key));
    const hasCoreGuidedValues = isGuidedStep && ['璧勬枡鐘舵€?, '闅忔満浜嬩欢闂叆鏉′欢'].every((key) => String(values[key] || '').trim());
    const hasUsefulValue = (key) => {
      const value = String(values[key] || '').trim();
      if (value) return true;
      return hasCoreGuidedValues && ['寮哄埗鍑哄満', '绂佹鍑哄満'].includes(key) && Object.prototype.hasOwnProperty.call(values, key);
    };
    const criticalHits = required.filter((key) => Object.prototype.hasOwnProperty.call(values, key) && hasUsefulValue(key));
    const uniqueValidRequests = [...new Set((materialRequests || []).map((item) => JSON.stringify([item.skill, item.method, item.params])))];
    const maxScore = Math.max(1, required.length + uniqueValidRequests.length);
    const score = criticalHits.length + uniqueValidRequests.length;
    return { score, maxScore, successRate: score / maxScore, criticalHits };
  },

  summarizeDroppedMaterialRequests(lines = [], limit = 3) {
    const unique = [...new Set((lines || []).map((line) => String(line || '').trim()).filter(Boolean))];
    if (!unique.length) return '鏃?;
    const shown = unique.slice(0, limit).join('锛?);
    return unique.length > limit ? `${shown}锛涚瓑${unique.length}鏉 : shown;
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
      if (/^璧勬枡璇锋眰\d+$/u.test(parsed.key)) {
        materialLines.push(`${parsed.key}锛?{parsed.value}`);
        return;
      }
      const key = this.normalizeKvKey(parsed.key, allowed);
      if (!key) return;
      const existing = String(values[key] || '').trim();
      const next = String(parsed.value || '').trim();
      values[key] = existing && next && existing !== '鏃? ? `${existing}锛?{next}` : parsed.value;
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
      .map((key) => `${key}锛?{String(values[key] ?? '').trim()}`)
      .filter((line) => line.trim());
    return lines.length ? lines.join('\n') : '鏃?;
  },

  mergeGuidedParseResults(primary = {}, secondary = {}) {
    const values = { ...(primary.values || {}) };
    const mergeConflicts = [...(primary.mergeConflicts || [])];
    Object.entries(secondary.values || {}).forEach(([key, value]) => {
      const primaryValue = String(values[key] || '').trim();
      const secondaryValue = String(value || '').trim();
      if (!Object.prototype.hasOwnProperty.call(values, key) || !primaryValue || (primaryValue === '鏃? && secondaryValue && secondaryValue !== '鏃?)) values[key] = value;
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
    const materialLines = [...(primary.lines || []), ...(secondary.lines || [])].filter((line) => /^璧勬枡璇锋眰\d+[锛?]/u.test(String(line || '').trim()));
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
      const stageStep = Math.max(1, Number(config.guidedStep) || 1);
      lastRaw = await this.completeConfiguredStep(store, prompt, logId, streamToUi, { ...config, guidedStep: stageStep, promptId: config.firstTemplateId || 'inference-stage1-guided-query' });
      if (this.fallbackScore(lastRaw) >= this.fallbackScore(bestRaw)) bestRaw = lastRaw;
      if (allowContextDoneOnProse && this.looksLikeProseInsteadOfStepJson(lastRaw)) {
        console.warn(`${config.label}璧勬枡闃舵璇繑鍥炴鏂囷紝瑙嗕负璧勬枡宸茶冻澶熷苟杩涘叆姝ｆ枃闃舵銆俙);
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
        console.warn(`${config.label}鏍煎紡涓嶅畬鏁达紝鑷姩閲嶈瘯涓€娆);
      } catch (err) {
        lastErr = err;
        if (err.parseResult && !err.skipMerge && !this.isGuidedStepSemanticSelfCheckError(err)) parseResults.push({ raw: lastRaw, parsed: err.parseResult });
        if (allowContextDoneOnProse && this.looksLikeProseInsteadOfStepJson(lastRaw)) {
          console.warn(`${config.label}璧勬枡闃舵瑙ｆ瀽鍒版鏂囧唴瀹癸紝瑙嗕负璧勬枡宸茶冻澶熷苟杩涘叆姝ｆ枃闃舵銆俙);
          return { raw: lastRaw, data: this.contextDoneFromProse(lastRaw) };
        }
        if (!this.isRetryableParseError(err) || i === 1) break;
        const semanticSelfCheckFailed = this.isGuidedStepSemanticSelfCheckError(err);
        const parseDetail = err.parseResult ? `score=${err.parseResult.score}/${err.parseResult.maxScore} successRate=${err.parseResult.successRate} missing=${err.parseResult.missing?.join('銆?) || '鏃?} droppedMaterialRequests=${this.summarizeDroppedMaterialRequests(err.parseResult?.droppedMaterialRequests || [])}` : '';
        console.warn(`${config.label}${semanticSelfCheckFailed ? '璇箟鑷澶辫触' : '瑙ｆ瀽寮傚父'}锛岃嚜鍔ㄩ噸璇曚竴娆?`, err.message, parseDetail);
        const retryInstruction = this.stage1JsonRetryInstruction(err, semanticSelfCheckFailed);
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
          // 鍚堝苟鍚庝粛鏈€氳繃璇箟鑷锛岀户缁蛋鍘熷け璐ヨ矾寰勩€?
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
    return text.length >= 80 && /[銆傦紒锛??]/u.test(text);
  },

  contextDoneFromProse() {
    return {
      type: 'context_done',
      reason: '妯″瀷鍦ㄨ祫鏂欐敹闆嗛樁娈佃杩斿洖姝ｆ枃锛屽仠姝㈣姹傝祫鏂欏苟杩涘叆姝ｆ枃鎺ㄦ紨',
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
    const base = {
      type: 'final',
      sceneTitle: repaired.sceneTitle || store.realWorldSceneTitle || '鐜板疄涓栫晫',
      locationName: repaired.locationName || store.realWorldLocationName || store.realWorldMap?.current || '',
      parentLocationName: repaired.parentLocationName || '',
      locationDescription: repaired.locationDescription || '',
      mapNodes: Array.isArray(repaired.mapNodes) ? repaired.mapNodes : [],
      newLocations: Array.isArray(repaired.newLocations) ? repaired.newLocations : [],
      locationDescriptionUpdates: Array.isArray(repaired.locationDescriptionUpdates) ? repaired.locationDescriptionUpdates : [],
      narration,
      elapsedSeconds: Math.max(1, Number(repaired.elapsedSeconds) || 300),
      status: repaired.status || store.realWorldStatus || '鐜板疄鎺ㄦ紨缁х画涓?,
      quest: repaired.quest || store.realWorldQuest || '纭鐜板疄澶勫',
      choices: Array.isArray(repaired.choices) && repaired.choices.length ? repaired.choices.slice(0, 4) : (store.realWorldChoices || ['瑙傚療鎵嬫満寮傚父', '澶勭悊鐜板疄浜嬪姟', '鑱旂郴鐔熶汉', '鏆傛椂浼戞伅']),
      vitalUpdates: Array.isArray(repaired.vitalUpdates) ? repaired.vitalUpdates : [],
      metricUpdates: repaired.metricUpdates && typeof repaired.metricUpdates === 'object' ? repaired.metricUpdates : {},
      wechatActions: Array.isArray(repaired.wechatActions) ? repaired.wechatActions : [],
      itemActions: Array.isArray(repaired.itemActions) ? repaired.itemActions : [],
      lexiconUpdates: Array.isArray(repaired.lexiconUpdates) ? repaired.lexiconUpdates : [],
      genericUpdates: Array.isArray(repaired.genericUpdates) ? repaired.genericUpdates : [],
    };
    return window.GameModules.updateRegistry?.finalizeGenericUpdates?.(base, repaired, store)
      || window.GameModules.updateRegistry?.migrateLegacyFactionUpdates?.(base) || base;
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
      const raw = await this.completeConfiguredStep(store, nextPrompt, logId, false, { ...config, promptId: 'inference-stage4-settlement-window' });
      const merged = partial ? this.mergeJsonContinuation(partial, raw) : raw;
      try { return this.parseCompleteUpdateJson(merged); }
      catch (err) {
        lastErr = err;
        partial = merged;
        if (i === 2) break;
        console.warn(`${config.label}鏇存柊 JSON 涓嶅畬鏁达紝鑷姩閲嶈瘯:`, err.message);
        nextPrompt = this.updateJsonRetryPrompt('', partial, err);
      }
    }
    throw lastErr || new Error(`${config.label}鏇存柊 JSON 鐢熸垚澶辫触`);
  },

  mergeJsonContinuation(partial = '', continuation = '') {
    const base = this.compactJsonReturn(partial);
    const next = this.compactJsonReturn(continuation);
    if (!next) return base;
    return this.compactJsonReturn(window.GameModules.jsonUtils?.mergeStreamText?.(base, next) || `${base}${next}`);
  },

  parseCompleteUpdateJson(raw) {
    const text = this.compactJsonReturn(raw);
    if (window.GameModules.aiRequest?.outputTailLooksTruncated?.(text)) throw new Error('鐜板疄鏇存柊 JSON 鐤戜技琚埅鏂?);
    const extracted = window.GameModules.jsonUtils.extractJson(text);
    const data = JSON.parse(window.GameModules.jsonUtils.repairJson(extracted));
    if (!data || typeof data !== 'object') throw new Error('鐜板疄鏇存柊 JSON 涓嶆槸瀵硅薄');
    return data;
  },

  updateJsonRetryPrompt(prompt, raw, err) {
    const tail = String(raw || '').replace(/\s+/gu, '').slice(-900);
    return `涓婃JSON鏈畬鎴?${err?.message || 'JSON涓嶅畬鏁?}銆傚凡杈撳嚭灏鹃儴:${tail}銆備粎杈撳嚭浠庡熬閮ㄦ渶鍚庝竴涓瓧绗︿箣鍚庣户缁殑JSON鍚庣画鍐呭suffix锛涚姝㈤噸澶嶅凡杈撳嚭鍓嶇紑锛涚姝arkdown锛涚姝㈣В閲婏紱绂佹鎹㈣銆佺┖鏍笺€佸埗琛ㄧ鍜屼笉鍙瀛楃銆俙;
  },

  parseUpdateJson(raw) {
    return raw && typeof raw === 'object' ? raw : this.parseCompleteUpdateJson(raw);
  },

  configuredCharacterWorld(store, config = this.realConfig()) {
    if (config.mode === 'real') return window.GameModules.realWorld2026?.label || '2026 鐜颁唬閮藉競鐜板疄涓栫晫';
    return store.currentWorldTag?.() || store.character?.work || store.selectedWork || '鍘熷垱涓栫晫';
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
    const payload = {
      type: 'final',
      sceneTitle: updates.sceneTitle || store.realWorldSceneTitle || '鐜板疄涓栫晫',
      locationName: updates.locationName || store.realWorldLocationName || store.realWorldMap?.current || '',
      parentLocationName: updates.parentLocationName || '',
      locationDescription: updates.locationDescription || '',
      mapNodes: Array.isArray(updates.mapNodes) ? updates.mapNodes : [],
      newLocations: Array.isArray(updates.newLocations) ? updates.newLocations : [],
      locationDescriptionUpdates: Array.isArray(updates.locationDescriptionUpdates) ? updates.locationDescriptionUpdates : [],
      narration: this.formatConfiguredNarration(narration),
      elapsedSeconds: Math.max(1, Number(updates.elapsedSeconds) || 300),
      status: updates.status || store.realWorldStatus || '鐜板疄鎺ㄦ紨缁х画涓?,
      quest: updates.quest || store.realWorldQuest || '纭鐜板疄澶勫',
      choices: window.GameModules.ai.normalizeChoices?.(updates.choices, store.realWorldChoices || ['瑙傚療鎵嬫満寮傚父', '澶勭悊鐜板疄浜嬪姟', '鑱旂郴鐔熶汉', '鏆傛椂浼戞伅']) || [],
      vitalUpdates: Array.isArray(updates.vitalUpdates) ? updates.vitalUpdates : [],
      metricUpdates: updates.metricUpdates && typeof updates.metricUpdates === 'object' ? updates.metricUpdates : {},
      appearedCharacters: this.normalizeConfiguredCharacters(updates.appearedCharacters, store, config),
      solidifiableCharacters: this.normalizeConfiguredSolidifiableCharacters(updates.solidifiableCharacters, updates.appearedCharacters, store, config),
      wechatActions: Array.isArray(updates.wechatActions) ? updates.wechatActions : [],
      itemActions: Array.isArray(updates.itemActions) ? updates.itemActions : [],
      lexiconUpdates: Array.isArray(updates.lexiconUpdates) ? updates.lexiconUpdates : [],
      genericUpdates: Array.isArray(updates.genericUpdates) ? updates.genericUpdates : [],
      events: Array.isArray(updates.events) ? updates.events : [],
      profilePatches: Array.isArray(updates.profilePatches) ? updates.profilePatches : [],
    };
    return window.GameModules.updateRegistry?.finalizeGenericUpdates?.({
      ...payload,
      factionUpdates: Array.isArray(updates.factionUpdates) ? updates.factionUpdates : [],
    }, { ...updates, genericUpdates: payload.genericUpdates }, store) || payload;
  },

  mergeStoryNarrationAndUpdates(store, narration, updates = {}, config = this.storyConfig()) {
    const fallback = window.GameModules.createFallbackResult?.(store, store.lastAction || '') || {};
    const payload = {
      type: 'final',
      sceneTitle: String(updates.sceneTitle || fallback.sceneTitle || store.sceneTitle || '鍓ф儏缁х画').slice(0, 12),
      narration: this.formatConfiguredNarration(narration),
      elapsedSeconds: Math.max(1, Number(updates.elapsedSeconds) || fallback.elapsedSeconds || 60),
      thinking: store.thinkingMode ? String(updates.thinking || '').slice(0, 220) : '',
      speech: String(updates.speech || ''),
      mind: String(updates.mind || fallback.mind || ''),
      mood: String(updates.mood || fallback.mood || store.mood || '鍐烽潤').slice(0, 12),
      trust: Number.isFinite(updates.trust) ? updates.trust : store.trust,
      resistance: Number.isFinite(updates.resistance) ? updates.resistance : store.resistance,
      quest: String(updates.quest || fallback.quest || store.quest || '').slice(0, 24),
      characterIntent: String(updates.characterIntent || '').slice(0, 80),
      controlFeeling: String(updates.controlFeeling || fallback.controlFeeling || '鐤戞儜').slice(0, 40),
      controlAdaptation: window.GameModules.ai.clampNumber?.(updates.controlAdaptation, fallback.controlAdaptation || 0) ?? 0,
      controlExperienceSummary: String(updates.controlExperienceSummary || fallback.controlExperienceSummary || '').slice(0, 80),
      metricUpdates: window.GameModules.ai.normalizeMetricUpdates?.(updates.metricUpdates) || {},
      choices: window.GameModules.ai.normalizeChoices?.(updates.choices, fallback.choices) || fallback.choices || [],
      appearedCharacters: this.normalizeConfiguredCharacters(updates.appearedCharacters, store, config),
      solidifiableCharacters: this.normalizeConfiguredSolidifiableCharacters(updates.solidifiableCharacters, updates.appearedCharacters, store, config),
      statChanges: { health: window.GameModules.ai.clampVitalDelta?.(updates.statChanges?.health) || 0, stamina: window.GameModules.ai.clampVitalDelta?.(updates.statChanges?.stamina) || 0, mental_stability: window.GameModules.ai.clampVitalDelta?.(updates.statChanges?.mental_stability) || 0 },
      combatEvent: window.GameModules.ai.normalizeCombatEvent?.(updates.combatEvent) || null,
      lexiconUpdates: window.GameModules.ai.normalizeLexiconUpdates?.(updates.lexiconUpdates, store) || [],
      itemActions: Array.isArray(updates.itemActions) ? updates.itemActions.slice(0, 20) : [],
    };
    const migrated = window.GameModules.updateRegistry?.finalizeGenericUpdates?.(payload, updates, store) || payload;
    migrated.genericUpdates = window.GameModules.orgTerritory?.filterUpdatesForStoryWorld?.(migrated.genericUpdates || [], store) || migrated.genericUpdates;
    return migrated;
  },

  cleanPhasedNarration(raw) {
    return this.stripNarrationInstructionLeak(this.compactAiReturn(String(raw || '').replace(this.finalSeparator, ''))).trim();
  },

  formatConfiguredNarration(raw, limit = 100) {
    return window.GameModules.realWorldAi?.formatNarration?.(raw, limit) || String(raw || '').trim();
  },

  stripNarrationInstructionLeak(text = '') {
    return String(text || '')
      .replace(/<\/?姝ｆ枃灏鹃儴>/gu, '')
      .replace(/\n*\s*(?:浣犺兘)?璇蜂粠涓婅堪姝ｆ枃鏈€鍚庝竴涓瓧绗︿箣鍚庣户缁璠\s\S]*?瀹屾暣鍙ュ彿銆侀棶鍙枫€佹劅鍙瑰彿鎴栧彸寮曞彿缁撴潫銆?/gu, '')
      .replace(/\n*\s*鐜板湪浠呰緭鍑烘鏂囧悗缁璼uffix銆?\s*$/gu, '')
      .trim();
  },

  chineseCharCount(text = '') {
    return (String(text || '').match(/[\u3400-\u9fff]/gu) || []).length;
  },

  narrationTailLooksIncomplete(text = '') {
    const raw = String(text || '').trim();
    if (!raw) return true;
    const tail = raw.slice(-80);
    const quoteCount = (raw.match(/[鈥溾€?銆庛€忋€屻€峕/g) || []).length;
    return /[锛屻€侊細:锛?锛?銆娿€屻€庘€溾€斺€?]$/u.test(tail) || quoteCount % 2 === 1 || !/[銆傦紒锛??銆嶃€忊€濓級)]$/u.test(tail);
  },

  trimIncompleteNarrationTail(text = '') {
    const raw = String(text || '').trim();
    if (!raw || !this.narrationTailLooksIncomplete(raw)) return raw;
    const quotePairs = { '鈥?: '鈥?, '銆?: '銆?, '銆?: '銆?, '"': '"' };
    const stack = [];
    for (let i = 0; i < raw.length; i += 1) {
      const ch = raw[i];
      if (ch === '鈥? && stack.at(-1)?.ch === '鈥?) stack.pop();
      else if (ch === '銆? && stack.at(-1)?.ch === '銆?) stack.pop();
      else if (ch === '銆? && stack.at(-1)?.ch === '銆?) stack.pop();
      else if (ch === '"' && stack.at(-1)?.ch === '"') stack.pop();
      else if (quotePairs[ch]) stack.push({ ch, index: i });
    }
    const openQuoteIndex = stack.length ? stack[stack.length - 1].index : -1;
    const sentenceEndPattern = /[銆傦紒锛??]/gu;
    let lastEnd = -1;
    let match;
    while ((match = sentenceEndPattern.exec(raw))) {
      if (openQuoteIndex >= 0 && match.index > openQuoteIndex) continue;
      lastEnd = match.index + match[0].length;
      while (/[鈥濄€嶃€忥級)]/u.test(raw[lastEnd] || '')) lastEnd += 1;
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
    if (trimmed !== text) console.warn(`${config.label}姝ｆ枃鐤戜技鎴柇锛屽凡鏈湴涓㈠純鏈€鍚庢湭瀹屾暣鍙ユ銆俙, { beforeLength: text.length, afterLength: trimmed.length, tail: text.slice(-80) });
    return this.formatConfiguredNarration(trimmed);
  },

  mergeNarrationContinuation(text = '', continuation = '') {
    const base = this.compactAiReturn(text);
    const next = this.cleanPhasedNarration(continuation);
    if (!next) return base;
    return (window.GameModules.jsonUtils?.mergeStreamText?.(base, next) || `${base}${next}`).trim();
  },

  async completeConfiguredNarrationContinuation(store, action, prompt, narration, logId, reason = {}, config = this.realConfig()) {
    const actionText = this.actionText(action, config.mode === 'story' ? '缁х画鎺ㄨ繘鎿嶆帶鍓ф儏' : '缁х画瑙傚療鐜板疄涓栫晫');
    const continuationPrompt = [
      '# 鐜板疄鎺ㄦ紨姝ｆ枃琛ュ叏浠诲姟',
      reason.shortOutput
        ? `浠诲姟:鍙緭鍑鸿ˉ鍏ㄦ枃鏈湰韬紱浠?姝ｆ枃灏鹃儴>鏈€鍚庝竴涓瓧绗︿箣鍚庣户缁紝鎶婃湰娆¤鍔ㄨ寖鍥村唴鐨勭幆澧冦€佸姩浣滆繃绋嬨€佸彲瑙佸弽搴斻€佺煭鏈熺粨鏋滆ˉ鍐欏畬鏁达紱绂佹閲嶅姝ｆ枃灏鹃儴锛涚姝㈣緭鍑轰换浣曚换鍔¤鏄庛€丣SON銆丮arkdown銆佹爣棰橈紱${this.compactReturnRule('prose')}缁撳熬蹇呴』鏄€傦紒锛熸垨鍙冲紩鍙枫€俙
        : `浠诲姟:鍙緭鍑鸿ˉ鍏ㄦ枃鏈湰韬紱浠?姝ｆ枃灏鹃儴>鏈€鍚庝竴涓瓧绗︿箣鍚庣户缁紱鍙ˉ瀹屽綋鍓嶆埅鏂彞骞惰嚜鐒舵敹鏉燂紱绂佹閲嶅姝ｆ枃灏鹃儴锛涚姝㈣緭鍑轰换浣曚换鍔¤鏄庛€丣SON銆丮arkdown銆佹爣棰橈紱${this.compactReturnRule('prose')}缁撳熬蹇呴』鏄€傦紒锛熸垨鍙冲紩鍙枫€俙,
      `鏈琛屽姩:${actionText}`,
      this.continuityFallbackRule(),
      reason.shortOutput ? '杈圭晫:琛ヨ冻宸茬粡寮€濮嬬殑鏈琛屽姩鐩存帴杩囩▼锛屼笉寮€鍚笅涓€姝ユ柊琛屽姩锛屼笉杞Щ鍦扮偣锛屼笉鎵╁睍鍒版湭杈撳叆鐨勬柊闃舵锛涘鏋滃師鍔ㄤ綔鍥犺竟鐣屻€乧onsent銆佸勾榫勩€佸叧绯绘垨瀹夊叏闄愬埗涓嶈兘缁х画鎻忓啓锛屾敼鍐欎负瑙掕壊瀵熻銆佸埗姝€佸悗閫€銆佽川闂€佹矇榛樸€佹儏缁彉鍖栥€佺幆澧冨０鍝嶅彉鍖栥€佸弻鏂硅窛绂诲彉鍖栥€佽瑷€/娌夐粯銆佽韩浣撳Э鎬佸拰鍗虫椂钀界偣銆? : '杈圭晫:鍙ˉ褰撳墠鍙ユ垨鏀舵潫褰撳墠鍔ㄤ綔锛屼笉鎵╁睍鏂板姩浣滈樁娈碉紝涓嶄负浜嗗瓧鏁拌拷鍔犳柊鎯呰妭锛屼笉鏇跨帺瀹舵墽琛屼笅涓€姝ャ€?,
      `闂:姹夊瓧鏁?${reason.count || 0};鏈€浣庣洰鏍?${reason.minChars || 0};姝ｆ枃杩囩煭=${reason.shortOutput ? '鏄? : '鍚?};鍙ュ熬鏈畬鎴?${reason.tailIncomplete ? '鏄? : '鍚?}`,
      `<姝ｆ枃灏鹃儴>${String(narration || '').slice(-1600)}</姝ｆ枃灏鹃儴>`,
      '鐜板湪浠呰緭鍑烘鏂囧悗缁璼uffix銆?,
    ].join('\n');
    const output = await this.completeConfiguredStep(store, continuationPrompt, logId, false, {
      ...config,
      promptId: 'inference-stage3-narration',
      sourceTitle: `${config.label}Stage3姝ｆ枃琛ュ叏`,
      jsonMode: false,
      outputLimitKind: 'stage3',
      maxAttempts: 2,
      maxTokens: 900,
      timeoutMs: 120000,
    });
    return this.cleanPhasedNarration(output);
  },

  async completeStep(store, prompt, logId, streamToUi = false) {
    return await this.completeConfiguredStep(store, prompt, logId, streamToUi, this.realConfig());
  },

  async completeCachedJsonPrompt(store, options = {}) {
    const promptId = String(options.promptId || options.source || 'cached-json-prompt');
    const baseConfig = {
      ...this.realConfig(),
      promptId,
      sourceTitle: options.sourceTitle || options.source || promptId,
      jsonMode: options.jsonMode !== false,
      responseFormat: options.responseFormat || (options.jsonMode === false ? undefined : { type: 'json_object' }),
      outputLimitKind: options.outputLimitKind || 'stage4',
      model: options.model,
      maxTokens: options.maxTokens,
      maxAttempts: options.maxAttempts,
      timeoutMs: options.timeoutMs,
    };
    const active = this.activeKvCacheSession(store, 'real');
    let config = active ? { ...baseConfig, kvCacheSession: active } : this.withDeepSeekKvCacheSession(store, baseConfig);
    const shouldPersist = !active && config.kvCacheSession && config.kvCacheSession.persist !== false && !config.kvCacheSession.fork;
    const output = await this.completeConfiguredStep(store, options.prompt || '', null, false, config);
    if (shouldPersist) this.persistAgentConversation(store, config.kvCacheSession, 'real');
    return output;
  },

  configuredCompletionOptions(config = this.realConfig(), streamToUi = false) {
    const promptId = config.promptId || (streamToUi ? config.templateId : '');
    const has = (key) => Object.prototype.hasOwnProperty.call(config || {}, key);
    const overrides = {};
    if (has('jsonMode')) overrides.jsonMode = config.jsonMode;
    if (has('responseFormat')) overrides.responseFormat = config.responseFormat;
    if (has('outputLimitKind')) overrides.outputLimitKind = config.outputLimitKind;
    if (promptId && window.GameModules.promptSkills?.completionOptions) {
      return window.GameModules.promptSkills.completionOptions(promptId, overrides);
    }
    const jsonMode = has('jsonMode') ? Boolean(config.jsonMode) : false;
    return {
      jsonMode,
      responseFormat: has('responseFormat') ? config.responseFormat : (jsonMode ? { type: 'json_object' } : undefined),
      outputLimitKind: config.outputLimitKind || (streamToUi ? 'stage3' : 'other'),
    };
  },

  async completeConfiguredStep(store, prompt, logId, streamToUi = false, config = this.realConfig()) {
    const requestId = config.mode === 'story' ? window.GameModules.ai.latestRequestId : window.GameModules.realWorldAi.latestRequestId;
    const kvCacheSession = config.kvCacheSession || null;
    const currentMessages = Array.isArray(prompt) ? prompt : null;
    const kvMessages = kvCacheSession ? this.messagesForDeepSeekKvCache(kvCacheSession, prompt) : null;
    let buffer = '';
    let doneSeen = false;
    let doneInfo = {};
    let lastPaint = 0;
    let lastReasoningPaint = 0;
    const reasoningMeta = this.reasoningSectionMeta(config);
    const reasoningKey = String(config.reasoningKey || reasoningMeta.id);
    try {
      const completionOptions = this.configuredCompletionOptions(config, streamToUi);
      const isJsonMode = Boolean(completionOptions.jsonMode);
      const requestOptions = {
        source: config.sourceTitle || (streamToUi ? `${config.mode}-agent-loop` : `${config.mode}-agent-context`),
        model: config.model || store.modelId,
        ...(kvMessages ? { messages: kvMessages } : (currentMessages ? { messages: currentMessages } : { prompt })),
        deepThinking: !isJsonMode,
        deepThinkingEffort: 'high',
        jsonMode: isJsonMode,
        responseFormat: completionOptions.responseFormat,
        stream: !isJsonMode,
        timeoutMs: Number(config.timeoutMs) || 240000,
        requireDone: true,
        outputLengthThreshold: 2600,
        outputLimitKind: completionOptions.outputLimitKind,
        maxAttempts: Number(config.maxAttempts) || 3,
        onChunk: async (chunk, done, info) => {
          const latest = config.mode === 'story' ? window.GameModules.ai.latestRequestId : window.GameModules.realWorldAi.latestRequestId;
          if (requestId !== latest) return;
          buffer = info.buffer;
          doneSeen = info.doneSeen;
          doneInfo = info || doneInfo;
          const now = performance.now();
          const reasoningText = info.deepseekReasoning?.text || '';
          if (reasoningText && (done || now - lastReasoningPaint > 180)) {
            lastReasoningPaint = now;
            this.patchConfiguredReasoning(store, logId, reasoningText, { ...config, ...reasoningMeta, reasoningKey, livePatch: true });
          }
          if (!streamToUi || !logId) return;
          if (!done && now - lastPaint <= 120) return;
          lastPaint = now;
          const changed = config.mode === 'story' ? store.updateStoryAgentStream?.(logId, buffer) : store.updateRealWorldStream?.(logId, buffer, { live: true });
          if (changed) {
            lastPaint = performance.now();
            await new Promise((resolve) => (window.requestAnimationFrame || setTimeout)(resolve));
          }
        },
      };
      if (config.maxTokens !== undefined && config.maxTokens !== null) requestOptions.maxTokens = config.maxTokens;
      const output = await window.GameModules.aiRequest.complete(requestOptions);
      if (streamToUi && logId && buffer) {
        if (config.mode === 'story') store.updateStoryAgentStream?.(logId, buffer);
        else store.updateRealWorldStream?.(logId, buffer, { live: true });
      }
      if (kvMessages) this.rememberDeepSeekKvCache(kvCacheSession, kvMessages, output, doneInfo);
      return output;
    } catch (err) {
      console.warn(`${config.label} Loop Agent 璇锋眰鏈畬鎴愶紝鎷掔粷浣跨敤鏈畬鎴愬唴瀹?`, { code: err.code, message: err.message, doneSeen, length: buffer.length, stack: err.stack });
      throw err;
    }
  },

  splitNameList(value = '') {
    return String(value || '').split(/[锛?銆?锛寍锝淽/u).map((name) => name.trim()).filter((name) => name && name !== '鏃?).slice(0, 12);
  },

  isUsefulQueryReason(value = '') {
    const text = String(value || '').trim();
    if (!text || text === '鏃?) return false;
    return !/(?:鏃犻渶|涓嶉渶瑕亅涓嶇敤|宸叉槑纭畖鏃犻渶杩涗竴姝鏃犲洜鏋渱鏃犳綔鍦ㄥ啿绐亅鏃犲啿绐亅褰撳墠璺嚎鏃爘娌℃湁蹇呰)/u.test(text);
  },

  splitQueryReasonList(value = '') {
    return String(value || '').split(/[锛?|锝淺n]/u).map((item) => item.trim()).filter((item) => this.isUsefulQueryReason(item)).slice(0, 12);
  },

  parseParticipantToken(value = '') {
    const text = String(value || '').trim();
    if (!text || text === '鏃?) return null;
    const paren = text.match(/^(.+?)[锛?]([^锛堬級()]*)[锛?]$/u);
    const dashed = text.match(/^(.+?)\s*(?:[-鈥旓紞]|锛殀:)\s*(.+)$/u);
    const name = String((paren || dashed)?.[1] || text).trim().replace(/^\d+[.銆乚\s*/u, '').slice(0, 80);
    const reason = String((paren || dashed)?.[2] || '').trim().slice(0, 160);
    return name && name !== '鏃? ? { name, reason } : null;
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
    const parts = Array.isArray(value) ? value : String(value || '').split(/[锛?\n]/u);
    const seen = new Set();
    return parts.map((raw) => {
      const text = typeof raw === 'string' ? raw.trim() : `${raw?.characterName || raw?.name || ''}锝?{raw?.eventType || raw?.actionMethod || ''}锝?{raw?.motivation || raw?.reason || ''}`;
      if (!text || text === '鏃?) return null;
      const segs = text.split(/[锝渱]/u).map((x) => x.trim()).filter(Boolean);
      const characterName = segs[0]?.replace(/[锛?].*$/u, '').trim();
      return { characterName, eventType: segs[1] || 'background_only', motivation: segs[2] || text, actionMethod: segs[1] || '鑳屾櫙琛屽姩', impactTiming: 'background', canEnterCurrentScene: false, canSettleCurrentScene: false };
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
    const forcedParticipants = this.normalizeParticipantList(v['寮哄埗鍑哄満'], 'forced');
    const priorityCandidates = this.normalizeParticipantList(v['楂樹紭鍏堝€欓€?], 'priority-candidate').map((item) => ({ ...item, canSettle: false }));
    const dramaCandidates = this.normalizeParticipantList(v['鎴忓墽鍊欓€?], 'drama-candidate').map((item) => ({ ...item, canSettle: false }));
    const forbiddenParticipants = this.normalizeParticipantList(v['绂佹鍑哄満'], 'forbidden').map((item) => ({ ...item, canLoadRoleCard: false, canEnterNarration: false, canSettle: false }));
    const blocked = this.participantNameSet(forcedParticipants, priorityCandidates, dramaCandidates, forbiddenParticipants);
    const status = String(v['璧勬枡鐘舵€?] || '').trim();
    const requestText = String(v['璧勬枡璇锋眰'] || '').trim();
    const sceneQueries = {
      location: this.splitQueryReasonList(v['鍦扮偣鏌ヨ鐞嗙敱'] || v['鍦扮偣鏌ヨ']),
      causality: this.splitQueryReasonList(v['鍥犳灉鏌ヨ鐞嗙敱'] || v['鍥犳灉鏌ヨ']),
      conflict: this.splitQueryReasonList(v['鍐茬獊鏌ヨ鐞嗙敱'] || v['鍐茬獊鏌ヨ']),
    };
    const hasActionableRequests = Array.isArray(parsed.materialRequests) && parsed.materialRequests.length > 0;
    const hasRoleCardCandidates = forcedParticipants.length > 0 || priorityCandidates.length > 0 || dramaCandidates.length > 0;
    const hasSceneQueryReasons = Object.values(sceneQueries).some((items) => items.length > 0);
    const hasDeclaredRequests = Boolean(requestText && requestText !== '鏃? && !/^鏃??:\s*\/\s*0)?$/u.test(requestText));
    if (status === '缁х画璇锋眰璧勬枡' && hasDeclaredRequests && !hasActionableRequests && !hasRoleCardCandidates && !hasSceneQueryReasons) {
      const err = new Error('瑙ｆ瀽閿欒璇烽噸璇?);
      err.parseResult = parsed;
      err.skipMerge = true;
      throw err;
    }
    const isContextDone = status === '璧勬枡宸茶冻澶? || (!hasRoleCardCandidates && !hasActionableRequests && !hasSceneQueryReasons && (!requestText || requestText === '鏃?));
    return {
      type: isContextDone ? 'context_done' : 'request_context',
      guidanceText: String(raw || '').trim(),
      reason: v['鏌ヨ瑙勫垝'] || '',
      requests: parsed.materialRequests || [],
      needed: [],
      characters: [],
      participants: forcedParticipants,
      forcedParticipants,
      priorityCandidates,
      dramaCandidates,
      forbiddenParticipants,
      randomActiveEvents: this.normalizeRandomActiveEvents(v['闅忔満浜嬩欢鍊欓€?], blocked),
      sceneQueries,
      sceneQueriesAreReasons: true,
      randomIntrusionCondition: v['闅忔満浜嬩欢闂叆鏉′欢'] || '鏃犳槑纭潯浠跺垯绂佹闂叆',
      parseScore: { score: parsed.score, maxScore: parsed.maxScore, successRate: parsed.successRate },
      parseDegraded: parsed.successRate < 1,
      droppedMaterialRequests: parsed.droppedMaterialRequests || [],
      mergeConflicts: parsed.mergeConflicts || [],
      missingContext: status === '缁х画璇锋眰璧勬枡' && (hasActionableRequests || hasRoleCardCandidates),
    };
  },

  parseGuidedStepJson(raw, config = this.realConfig()) {
    const data = this.parseCompactSettlementJson(raw);
    if (!data || Array.isArray(data) || typeof data !== 'object') return null;
    const sceneQueries = data.sceneQueries && typeof data.sceneQueries === 'object' ? data.sceneQueries : {};
    const participants = data.participants && typeof data.participants === 'object' ? data.participants : {};
    const arrayText = (value, sep = '锛?) => (Array.isArray(value) ? value : this.splitQueryReasonList(value)).map((item) => String(item || '').trim()).filter(Boolean).join(sep) || '鏃?;
    const nameText = (value) => (Array.isArray(value) ? value : this.splitNameList(value)).map((item) => typeof item === 'string' ? item : (item?.name || item?.characterName || item?.idOrName || item?.id || '')).map((item) => String(item || '').trim()).filter(Boolean).join('銆?) || '鏃?;
    const requestRows = (Array.isArray(data.materialRequests) ? data.materialRequests : []).map((item, index) => {
      const body = typeof item === 'string'
        ? item
        : [item?.type || item?.skill || item?.kind, item?.method, item?.name || item?.target || item?.keyword, item?.world || item?.scope].filter(Boolean).join('锛?);
      return `璧勬枡璇锋眰${index + 1}锛?{String(body || '').trim()}`;
    }).filter((line) => !/^璧勬枡璇锋眰\d+[锛?]\s*$/u.test(line)).slice(0, 3);
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
      '鏌ヨ瑙勫垝': String(data.plan || data['鏌ヨ瑙勫垝'] || 'JSON璧勬枡璺敱').trim(),
      '璧勬枡鐘舵€?: String(data.status || data['璧勬枡鐘舵€?] || '').trim(),
      '鍦扮偣鏌ヨ鐞嗙敱': arrayText(sceneQueries.location ?? data.locationReasons ?? data['鍦扮偣鏌ヨ鐞嗙敱']),
      '鍥犳灉鏌ヨ鐞嗙敱': arrayText(sceneQueries.causality ?? data.causalityReasons ?? data['鍥犳灉鏌ヨ鐞嗙敱']),
      '鍐茬獊鏌ヨ鐞嗙敱': arrayText(sceneQueries.conflict ?? data.conflictReasons ?? data['鍐茬獊鏌ヨ鐞嗙敱']),
      '寮哄埗鍑哄満': nameText(participants.forced ?? data.forcedParticipants ?? data['寮哄埗鍑哄満']),
      '楂樹紭鍏堝€欓€?: nameText(participants.priority ?? data.priorityCandidates ?? data['楂樹紭鍏堝€欓€?]),
      '鎴忓墽鍊欓€?: nameText(participants.drama ?? data.dramaCandidates ?? data['鎴忓墽鍊欓€?]),
      '绂佹鍑哄満': nameText(participants.forbidden ?? data.forbiddenParticipants ?? data['绂佹鍑哄満']),
      '闅忔満浜嬩欢鍊欓€?: arrayText(data.randomEvents ?? data.randomActiveEvents ?? data['闅忔満浜嬩欢鍊欓€?]),
      '闅忔満浜嬩欢闂叆鏉′欢': String(data.randomIntrusionCondition || data['闅忔満浜嬩欢闂叆鏉′欢'] || '鏃犳槑纭潯浠跺垯绂佹闂叆').trim(),
      '璧勬枡璇锋眰': requestRows.length ? `${requestRows.length}鏉 : '鏃?,
      '璧勬枡璇锋眰缁撴潫': '鏄?,
    };
    if (!values['璧勬枡鐘舵€?]) {
      const hasQueryReason = ['鍦扮偣鏌ヨ鐞嗙敱', '鍥犳灉鏌ヨ鐞嗙敱', '鍐茬獊鏌ヨ鐞嗙敱'].some((key) => this.isUsefulQueryReason(values[key]));
      const hasParticipants = ['寮哄埗鍑哄満', '楂樹紭鍏堝€欓€?, '鎴忓墽鍊欓€?].some((key) => String(values[key] || '').trim() && values[key] !== '鏃?);
      values['璧勬枡鐘舵€?] = requestRows.length || hasQueryReason || hasParticipants ? '缁х画璇锋眰璧勬枡' : '璧勬枡宸茶冻澶?;
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
    const hasGuidedField = fields.some((key) => Object.prototype.hasOwnProperty.call(values, key)) || lines.some((line) => /^璧勬枡璇锋眰\d+[锛?]/u.test(line));
    if (!hasGuidedField) return text;
    const out = lines.slice();
    const addIfMissing = (key, value) => {
      if (!Object.prototype.hasOwnProperty.call(values, key)) {
        values[key] = value;
        out.push(`${key}锛?{value}`);
      }
    };
    const isNone = (value) => !String(value || '').trim() || String(value || '').trim() === '鏃?;
    const numberedRequests = lines.filter((line) => /^璧勬枡璇锋眰\d+[锛?]/u.test(line));
    const hasExplicitRequestField = Object.prototype.hasOwnProperty.call(values, '璧勬枡璇锋眰') || numberedRequests.length > 0;
    const requestText = String(values['璧勬枡璇锋眰'] || '').trim();
    const hasQueryReason = ['鍦扮偣鏌ヨ鐞嗙敱', '鍥犳灉鏌ヨ鐞嗙敱', '鍐茬獊鏌ヨ鐞嗙敱'].some((key) => this.isUsefulQueryReason(values[key]));
    if (!hasExplicitRequestField) return out.join('\n');
    addIfMissing('鏌ヨ瑙勫垝', requestText === '鏃? && !hasQueryReason ? '璧勬枡宸茶冻澶燂紝杩涘叆姝ｆ枃鎺ㄦ紨' : '琛ラ綈璧勬枡璺敱瀛楁');
    if (!Object.prototype.hasOwnProperty.call(values, '璧勬枡鐘舵€?)) {
      const shouldContinue = numberedRequests.length > 0 || hasQueryReason || (requestText && requestText !== '鏃? && !/^鏃??:\s*\/\s*0)?$/u.test(requestText));
      addIfMissing('璧勬枡鐘舵€?, shouldContinue ? '缁х画璇锋眰璧勬枡' : '璧勬枡宸茶冻澶?);
    }
    ['鍦扮偣鏌ヨ鐞嗙敱', '鍥犳灉鏌ヨ鐞嗙敱', '鍐茬獊鏌ヨ鐞嗙敱', '寮哄埗鍑哄満', '楂樹紭鍏堝€欓€?, '鎴忓墽鍊欓€?, '绂佹鍑哄満', '闅忔満浜嬩欢鍊欓€?].forEach((key) => addIfMissing(key, '鏃?));
    addIfMissing('闅忔満浜嬩欢闂叆鏉′欢', '鏃犳槑纭潯浠跺垯绂佹闂叆');
    if (!Object.prototype.hasOwnProperty.call(values, '璧勬枡璇锋眰')) addIfMissing('璧勬枡璇锋眰', `${numberedRequests.length}鏉);
    addIfMissing('璧勬枡璇锋眰缁撴潫', '鏄?);
    return out.join('\n');
  },

  parseGuidedStepKv(raw, config = this.realConfig(), options = {}) {
    const normalized = options.normalized ? String(raw || '').trim() : this.normalizeGuidedStepText(raw);
    const parsed = this.parseChineseKvBlock(normalized, this.guidedStepFields(), { parseMaterialRequests: true, config });
    if (parsed.materialRequestErrors?.length || parsed.successRate < 0.8) {
      const detail = parsed.materialRequestErrors?.[0] || '瑙ｆ瀽閿欒璇烽噸璇?;
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
    if (!/鏌ヨ瑙勫垝[锛?]|璧勬枡鐘舵€乕锛?]/u.test(text)) {
      throw new Error(`${config.label}杩斿洖缂哄皯 Stage1 JSON 鎴栦腑鏂?K:V 鏌ヨ瑙勫垝瀛楁`);
    }
    return this.parseGuidedStepKv(text, config, { normalized: true });
  },

  isGuidedStepSemanticSelfCheckError(err) {
    return String(err?.message || '').includes('璧勬枡鐘舵€佷负缁х画璇锋眰璧勬枡鏃讹紝蹇呴』杈撳嚭鍙墽琛岀殑璧勬枡璇锋眰1銆佺粨鏋勫寲鏌ヨ鎴栨槑纭弬涓庤€呭€欓€?);
  },

  isRetryableParseError(err) {
    return this.isGuidedStepSemanticSelfCheckError(err) || ['鎴柇', '鍒嗛殧绗﹀悗缂哄皯 JSON', '缂哄皯姝ｆ枃', 'JSON missing', '瑙ｆ瀽閿欒璇烽噸璇?].some((text) => String(err?.message || '').includes(text));
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
    return step === 1 ? `${config.label}姝ｅ湪璇嗗埆鐩稿叧瑙掕壊涓庤祫鏂欓渶姹傗€︼紙${step}/${this.maxSteps}锛塦 : `${config.label}姝ｅ湪鎺ㄦ紨鈥︼紙${step}/${this.maxSteps}锛塦;
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
    const formatted = this.formatConfiguredNarration(narration);
    if (config.mode === 'story') {
      store.updateNovelEntry?.(logId, { storyText: formatted, streaming: true, streamTrace: [] });
      return;
    }
    store.patchRealWorldLogEntry?.(logId, { narration: formatted, streaming: true, streamTrace: [] });
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
    const entry = (store.realWorldLog || []).find((item) => item.id === logId) || window.GameModules.realWorldLogStore?.get?.(logId) || {};
    const patch = { streaming: true, statusText: text };
    if (!options.keepNarration && this.shouldUseStatusAsRealNarration(entry)) patch.narration = text;
    store.patchRealWorldLogEntry?.(logId, patch);
    store.scrollRealWorldLogBottom?.();
  },

  shouldUseStatusAsStoryText(entry = {}) {
    const text = String(entry?.storyText || '').trim();
    return !text || /^浣滆€呮鍦ㄧ画鍐欒繖涓€娈靛墽鎯厊鎿嶆帶鍓ф儏姝ｅ湪璇嗗埆|鎿嶆帶鍓ф儏姝ｅ湪鎺ㄦ紨|宸茶瘑鍒浉鍏宠鑹瞸宸茶拷鍔犺祫鏂?u.test(text);
  },

  shouldUseStatusAsRealNarration(entry = {}) {
    const text = String(entry?.narration || '').trim();
    return !text || /^鐜板疄涓栫晫姝ｅ湪鎺ㄦ紨|鐜板疄姝ｅ湪璇嗗埆|鐜板疄姝ｅ湪鎺ㄦ紨|宸茶瘑鍒浉鍏宠鑹瞸宸茶拷鍔犺祫鏂?u.test(text);
  },
  loadedContextText(data = {}, loaded = [], step = 1, config = this.realConfig()) {
    const fallback = config.mode === 'story' ? '琚搷鎺ц鑹? : '鐜╁鏈汉';
    const chars = (data.characters || []).map((item) => item.name || item.id || item).filter(Boolean).join('銆?) || fallback;
    const titles = loaded.map((item) => item.title).join('銆?) || '瑙掕壊璁板繂';
    return `${step === 1 ? '宸茶瘑鍒浉鍏宠鑹? : '宸茶拷鍔犺祫鏂?}锛?{chars}锛涘凡杞藉叆${titles}${data.reason ? `锛?{data.reason}` : ''}`;
  },
};

