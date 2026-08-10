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
    return { mode: 'real', label: '现实', ctx: window.GameModules.realWorldAgentContext, materials: window.GameModules.realWorldMaterials, templateId: 'inference-stage3-narration', firstTemplateId: 'inference-stage1-guided-query' };
  },

  storyConfig() {
    return { mode: 'story', kvMode: 'real', label: '操控剧情', ctx: window.GameModules.storyAgentContext, materials: window.GameModules.workLoreMaterials, templateId: 'inference-stage3-narration', firstTemplateId: 'inference-stage1-guided-query' };
  },

  renderPrompt(id, vars) {
    const renderer = window.GameModules.renderPrompt || ((templateId, templateVars) => window.GameModules.promptTemplates?.render?.(templateId, templateVars));
    return renderer(id, vars);
  },

  snapshotKvMessages(session) {
    if (!session?.messages?.length) return [];
    return session.messages.map((item) => this.normalizeAgentMessage(item)).filter(Boolean);
  },

  estimateContextTokens(text = '') {
    return window.GameModules.characterMemory?.estimateTokens?.(String(text || '')) || Math.ceil(String(text || '').length / 2);
  },

  agentMessagesTokenCount(messages = []) {
    return (Array.isArray(messages) ? messages : []).reduce((sum, item) => sum + this.estimateContextTokens(item?.content || ''), 0);
  },

  modelInputWindowTokens(model = '') {
    const id = String(model || window.GameModules.aiProvider?.selectedTextModel?.() || window.GameModules.config?.defaultModelId || '').toLowerCase();
    const windows = window.GameModules.config?.modelInputWindows || {};
    const direct = Number(windows[id]);
    if (Number.isFinite(direct) && direct > 0) return direct;
    const matched = Object.entries(windows).find(([key]) => key && id.includes(String(key).toLowerCase()));
    if (matched && Number(matched[1]) > 0) return Number(matched[1]);
    if (/deepseek/u.test(id)) return 1000000;
    if (/nalang|dzmm|turbo/u.test(id)) return 32000;
    return 32000;
  },

  contextCompactionLimits(store = null, model = '') {
    const inputWindow = this.modelInputWindowTokens(model || store?.modelId || store?.settingsState?.textModelId);
    return { inputWindow, triggerTokens: Math.floor(inputWindow * 0.97), targetTokens: Math.floor(inputWindow * 0.5) };
  },

  normalizeAgentMessage(item = {}, defaults = {}) {
    if (!item) return null;
    const role = String(item.role || defaults.role || 'user');
    if (!['user', 'assistant', 'system'].includes(role)) return null;
    const content = String(item.content || '');
    if (!content.trim()) return null;
    const meta = item.meta && typeof item.meta === 'object' ? item.meta : {};
    return { role, content, meta: { ...meta, ...(defaults.meta || {}) } };
  },

  contextKindForMessage(role = 'user', content = '', meta = {}) {
    const phase = this.normalizeReasoningPhase(meta.phase || '');
    if (phase === 'stage3') return role === 'assistant' ? 'body' : 'stage_prompt';
    if (/本轮正文：|最近已发生正文|^<正文尾部>/u.test(String(content || ''))) return 'body';
    if (/^【(?:微信对话|人物行为)·已写入持久推演上下文】/u.test(String(content || ''))) return 'external';
    if (role === 'assistant') return 'stage_output';
    if (/stage|资料查询|场景锚定|状态结算|JSON|结算|推演|正文生成/iu.test(`${phase}\n${content}`)) return 'stage_prompt';
    return 'meta';
  },

  messagePriorityForCompaction(message = {}, latestRoundId = '') {
    const meta = message.meta || {};
    if (latestRoundId && String(meta.roundId || '') === String(latestRoundId)) return 999;
    const kind = String(meta.kind || this.contextKindForMessage(message.role, message.content, meta));
    const priorities = { stage_prompt: 10, stage_output: 20, trace: 30, meta: 40, external: 50, body: 100 };
    return priorities[kind] || 40;
  },

  compactAgentMessages(messages = [], { store = null, mode = 'real', model = '', latestRoundId = '' } = {}) {
    const list = (Array.isArray(messages) ? messages : []).map((item) => this.normalizeAgentMessage(item)).filter(Boolean);
    const limits = this.contextCompactionLimits(store, model);
    let total = this.agentMessagesTokenCount(list);
    const beforeTokens = total;
    if (total <= limits.triggerTokens) return { messages: list, changed: false, beforeTokens, afterTokens: total, removed: 0, limits };
    const kept = list.map((item, index) => ({ item, index, tokens: this.estimateContextTokens(item.content), removed: false }));
    const removeByPriority = (maxPriority) => {
      const candidates = kept
        .filter((row) => !row.removed && this.messagePriorityForCompaction(row.item, latestRoundId) <= maxPriority)
        .sort((a, b) => a.index - b.index);
      for (const row of candidates) {
        if (total <= limits.targetTokens) break;
        row.removed = true;
        total -= row.tokens;
      }
    };
    removeByPriority(50);
    removeByPriority(100);
    const compacted = kept.filter((row) => !row.removed).map((row) => row.item);
    const removed = kept.length - compacted.length;
    if (removed > 0) console.info('[持久上下文] 已抽取压缩:', { mode, model: model || store?.modelId || '', beforeTokens, afterTokens: total, targetTokens: limits.targetTokens, triggerTokens: limits.triggerTokens, removed, latestRoundId });
    return { messages: compacted, changed: removed > 0, beforeTokens, afterTokens: total, removed, limits };
  },

  latestRoundIdFromMessages(messages = []) {
    const list = Array.isArray(messages) ? messages : [];
    for (let index = list.length - 1; index >= 0; index -= 1) {
      const roundId = String(list[index]?.meta?.roundId || '').trim();
      if (roundId) return roundId;
    }
    return '';
  },

  forkKvCacheSession(parentSession, messagesSnapshot = null) {
    if (!parentSession) return null;
    return {
      id: `${parentSession.id}-fork-${Date.now()}`,
      store: parentSession.store || null,
      mode: parentSession.mode || 'real',
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
      .map((item) => this.normalizeAgentMessage(item))
      .filter(Boolean);
  },

  kvMode(config = this.realConfig()) {
    return String(config?.kvMode || config?.mode || 'real');
  },

  persistAgentConversation(store, session, mode = 'real') {
    if (session?.persist === false || session?.fork) return;
    if (!session?.messages?.length) return;
    store.realWorldAgentKvByMode = store.realWorldAgentKvByMode || {};
    const compacted = this.compactAgentMessages(session.messages, {
      store,
      mode,
      model: session.model || store?.modelId || store?.settingsState?.textModelId,
      latestRoundId: session.currentRoundId || session.latestRoundId || this.latestRoundIdFromMessages(session.messages),
    });
    session.messages = compacted.messages;
    store.realWorldAgentKvByMode[mode] = {
      messages: session.messages.map((item) => this.normalizeAgentMessage(item)).filter(Boolean),
      updatedAt: Date.now(),
      requestCount: Math.max(0, Math.round(Number(session.requestCount) || 0)),
      compaction: compacted.changed ? {
        updatedAt: Date.now(),
        beforeTokens: compacted.beforeTokens,
        afterTokens: compacted.afterTokens,
        removed: compacted.removed,
        triggerTokens: compacted.limits.triggerTokens,
        targetTokens: compacted.limits.targetTokens,
        inputWindow: compacted.limits.inputWindow,
      } : store.realWorldAgentKvByMode[mode]?.compaction || null,
    };
  },

  /**
   * 把外部事件（如微信对话）追加进持久推演上下文。
   * 存档字段 realWorldAgentKvByMode 会随存档恢复；缓存失效时仍保留对话链。
   */
  appendExternalContextMessage(store, content = '', mode = 'real', role = 'user') {
    const text = String(content || '').trim();
    if (!store || !text) return null;
    const message = this.normalizeAgentMessage({
      role: role === 'assistant' ? 'assistant' : 'user',
      content: text,
      meta: { kind: 'external', phase: 'external', roundId: `external-${Date.now()}` },
    });
    const live = this.activeKvCacheSession(store, mode) || this.pendingKvCacheSession(store, mode);
    if (live && Array.isArray(live.messages)) {
      live.messages = [...live.messages, message];
      live.currentRoundId = message?.meta?.roundId || live.currentRoundId || '';
      this.persistAgentConversation(store, live, mode);
      return message;
    }
    const prior = this.loadPersistedAgentMessages(store, mode);
    prior.push(message);
    store.realWorldAgentKvByMode = store.realWorldAgentKvByMode || {};
    const prev = store.realWorldAgentKvByMode[mode] || {};
    const compacted = this.compactAgentMessages(prior, {
      store,
      mode,
      model: store?.modelId || store?.settingsState?.textModelId,
      latestRoundId: message?.meta?.roundId || '',
    });
    store.realWorldAgentKvByMode[mode] = {
      messages: compacted.messages,
      updatedAt: Date.now(),
      requestCount: Math.max(0, Math.round(Number(prev.requestCount) || 0)),
      compaction: compacted.changed ? {
        updatedAt: Date.now(),
        beforeTokens: compacted.beforeTokens,
        afterTokens: compacted.afterTokens,
        removed: compacted.removed,
        triggerTokens: compacted.limits.triggerTokens,
        targetTokens: compacted.limits.targetTokens,
        inputWindow: compacted.limits.inputWindow,
      } : prev.compaction || null,
    };
    return message;
  },

  appendWechatDialogueContext(store, {
    contactName = '',
    contactId = '',
    playerText = '',
    replyText = '',
    timeLabel = '',
    kind = 'exchange',
  } = {}) {
    const name = String(contactName || '微信联系人').trim().slice(0, 40);
    const id = String(contactId || '').trim().slice(0, 80);
    const when = String(timeLabel || '').trim() || '时间未知';
    const player = String(playerText || '').trim().slice(0, 500);
    const reply = String(replyText || '').trim().slice(0, 500);
    const lines = [
      '【微信对话·已写入持久推演上下文】',
      `联系人：${name}${id ? `（id:${id}）` : ''}`,
      `手机时间：${when}`,
    ];
    if (kind === 'incoming' || (!player && reply)) {
      lines.push(`${name}：${reply || player}`);
    } else {
      if (player) lines.push(`玩家：${player}`);
      if (reply) lines.push(`${name}：${reply}`);
    }
    lines.push('说明：以上微信原文已在对话链中。后续推演承接该对话时直接使用本上下文；勿再请求记忆查询、世界线/现实历史或 wechat.getThread 重复拉取同一原文。');
    const message = this.appendExternalContextMessage(store, lines.filter(Boolean).join('\n'), 'real', 'user');
    return message;
  },

  /**
   * 微信往来后的人物行为短推演结果 → 同一条持久推演上下文。
   */
  appendCharacterBehaviorContext(store, {
    contactName = '',
    contactId = '',
    narration = '',
    currentLocation = '',
    currentAction = '',
    availability = '',
    timeLabel = '',
  } = {}) {
    const name = String(contactName || '角色').trim().slice(0, 40);
    const id = String(contactId || '').trim().slice(0, 80);
    const when = String(timeLabel || '').trim() || '时间未知';
    const body = String(narration || '').trim().slice(0, 800);
    if (!body) return null;
    const lines = [
      '【人物行为·已写入持久推演上下文】',
      `角色：${name}${id ? `（id:${id}）` : ''}`,
      `手机时间：${when}`,
    ];
    if (currentLocation) lines.push(`当前地点：${String(currentLocation).trim().slice(0, 120)}`);
    if (currentAction) lines.push(`当前行动：${String(currentAction).trim().slice(0, 160)}`);
    if (availability) lines.push(`可用状态：${String(availability).trim().slice(0, 40)}`);
    lines.push(`短推演：${body}`);
    lines.push('说明：以上为微信往来后的场外人物行为短推演，已在对话链中；打开推演界面时与微信对话一并可见。');
    return this.appendExternalContextMessage(store, lines.filter(Boolean).join('\n'), 'real', 'user');
  },

  /**
   * 把持久上下文条目镜像进 realWorldLog，打开推演面板即可看到。
   */
  async mirrorExternalContextToRealWorldLog(store, {
    content = '',
    kind = 'context',
    contactName = '',
    contactId = '',
    timeLabel = '',
    locationName = '',
  } = {}) {
    const text = String(content || '').trim();
    if (!store || !text) return null;
    const now = store.phoneDate?.() || new Date();
    const label = String(timeLabel || '').trim()
      || `${store.phoneDateText?.() || ''} ${store.phoneTimeText?.() || ''}`.trim()
      || now.toLocaleString();
    const sceneTitle = kind === 'wechat' ? '微信对话'
      : (kind === 'behavior' ? '人物行为' : '持久上下文');
    const entry = {
      id: `real-ctx-${kind}-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'ai',
      systemGenerated: true,
      contextKind: kind,
      narration: text,
      sceneTitle,
      locationName: String(locationName || store.realWorldLocationLabel?.() || store.realWorldMap?.current || '').trim(),
      status: '',
      quest: '',
      choices: [],
      characterCardChanges: [],
      genericUpdates: [],
      thinking: '',
      thinkingSections: [],
      streamTrace: [],
      agentTrace: [],
      promptPack: null,
      streaming: false,
      time: { label, iso: now.toISOString() },
      createdAt: now.toISOString(),
      controlledCharacterId: String(contactId || '').trim(),
      controlledCharacterName: String(contactName || '').trim(),
    };
    try {
      await store.assignRealWorldlineEntry?.(entry);
    } catch (_) { /* worldline optional for context mirror */ }
    await window.GameModules.realWorldLogStore?.append?.(entry);
    const pageSize = Math.max(1, Number(store.realWorldLogPageSize) || 12);
    store.realWorldLog = store.normalizeRealWorldLog?.(
      [...(store.realWorldLog || []), entry],
    ).slice(-pageSize) || [...(store.realWorldLog || []), entry];
    store.realWorldLogTotal = window.GameModules.realWorldLogStore?.count?.()
      || Math.max(store.realWorldLogTotal || 0, store.realWorldLog.length);
    if (store.realWorldOpen) {
      store.refreshRealWorldLogPage?.(store.realWorldLogMaxPage?.() || store.realWorldLogPage || 1);
      store.scrollRealWorldLogBottom?.();
    }
    return entry;
  },

  summarizeWechatInAgentContext(store, mode = 'real', limitMessages = 48) {
    const msgs = this.loadPersistedAgentMessages(store, mode).slice(-limitMessages);
    const ids = new Set();
    const names = new Set();
    let count = 0;
    msgs.forEach((item) => {
      const content = String(item?.content || '');
      if (!content.includes('【微信对话')) return;
      count += 1;
      const idMatch = content.match(/id:([^\s）)]+)/u);
      if (idMatch?.[1]) ids.add(String(idMatch[1]).trim());
      const nameMatch = content.match(/联系人：([^\n（(]+)/u);
      if (nameMatch?.[1]) names.add(String(nameMatch[1]).trim());
    });
    if (!count) return { hasWechat: false, count: 0, ids: [], names: [], hint: '' };
    const idList = [...ids];
    const nameList = [...names];
    return {
      hasWechat: true,
      count,
      ids: idList,
      names: nameList,
      hint: [
        `近期微信对话：对话链中已有 ${count} 段【微信对话】原文（持久上下文，不依赖缓存命中）。`,
        nameList.length ? `涉及联系人：${nameList.join('、')}` : '',
        '资料请求规则：对这些联系人的同一段微信原文，禁止再请求 记忆查询 / 现实历史·世界线 / wechat.query.getThread；上下文已覆盖。仅当需要更早、其它人或未写入对话链的信息时才请求。',
        '若对话链中还有【人物行为】短推演，亦直接承接，勿重复查询同一时段人事安排。',
      ].filter(Boolean).join('\n'),
    };
  },

  shouldSkipMaterialDueToWechatContext(store, request = {}, mode = 'real') {
    const summary = this.summarizeWechatInAgentContext(store, mode);
    if (!summary.hasWechat) return false;
    const skill = String(request.skill || '').trim();
    const method = String(request.method || '').trim();
    const params = request.params && typeof request.params === 'object' ? request.params : {};
    const needle = [
      params.contactId,
      params.characterId,
      params.characterName,
      params.name,
      params.keyword,
      params.question,
    ].map((x) => String(x || '').trim()).filter(Boolean);
    const touchesKnown = !needle.length || needle.some((value) => (
      summary.ids.includes(value)
      || summary.names.some((name) => value.includes(name) || name.includes(value))
    ));
    if (!touchesKnown) return false;
    if (skill === 'wechat.query' && (method === 'getThread' || !method)) return true;
    if (skill === 'memory.query') return true;
    if (skill === 'realworld.history.query') return true;
    if (skill === 'past.event.query' && /微信|聊天|对话|消息/u.test(String(params.question || params.keyword || ''))) return true;
    return false;
  },

  createDeepSeekKvCacheSession(store, config = this.realConfig()) {
    const providerId = window.GameModules.aiProvider?.currentProviderId?.();
    const mode = this.kvMode(config);
    const loadedMessages = this.loadPersistedAgentMessages(store, mode);
    const compacted = this.compactAgentMessages(loadedMessages, {
      store,
      mode,
      model: config.model || store?.modelId || store?.settingsState?.textModelId,
      latestRoundId: this.latestRoundIdFromMessages(loadedMessages),
    });
    const priorMessages = compacted.messages;
    if (compacted.changed) {
      const previous = store.realWorldAgentKvByMode?.[mode] || {};
      store.realWorldAgentKvByMode = store.realWorldAgentKvByMode || {};
      store.realWorldAgentKvByMode[mode] = {
        ...previous,
        messages: priorMessages,
        updatedAt: Date.now(),
        compaction: {
          updatedAt: Date.now(),
          beforeTokens: compacted.beforeTokens,
          afterTokens: compacted.afterTokens,
          removed: compacted.removed,
          triggerTokens: compacted.limits.triggerTokens,
          targetTokens: compacted.limits.targetTokens,
          inputWindow: compacted.limits.inputWindow,
        },
      };
    }
    const deepseek = providerId === 'deepseek';
    if (!deepseek && !priorMessages.length) return null;
    return {
      id: `${mode}-kv-${Date.now()}-${++this.kvCacheSeq}`,
      store,
      mode,
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

  pendingKvCacheSession(store = null, mode = 'real') {
    return store?.realWorldAgentPendingKvByMode?.[mode] || null;
  },

  clearPendingKvCacheSession(store = null, mode = 'real') {
    if (!store?.realWorldAgentPendingKvByMode) return;
    delete store.realWorldAgentPendingKvByMode[mode];
  },

  resolveKvCacheSession(store = null, mode = 'real', explicit = null) {
    return explicit || this.activeKvCacheSession(store, mode) || this.pendingKvCacheSession(store, mode) || null;
  },

  requestContextMeta(config = this.realConfig(), streamToUi = false) {
    const phase = this.normalizeReasoningPhase(config.reasoningPhase || (streamToUi ? 'stage3' : this.inferReasoningPhase(config) || 'unknown'));
    return {
      roundId: String(config.contextRoundId || ''),
      phase,
      promptId: String(config.promptId || config.firstTemplateId || ''),
      sourceTitle: String(config.sourceTitle || ''),
      kind: 'stage_prompt',
    };
  },

  promptToMessages(prompt, defaults = {}) {
    return Array.isArray(prompt)
      ? prompt.map((msg) => {
        const base = this.normalizeAgentMessage(msg, { meta: defaults });
        if (!base) return null;
        const phase = base.meta.phase || defaults.phase || '';
        const roleKind = base.role === 'assistant' && phase === 'stage3' ? 'body'
          : (base.role === 'assistant' ? 'stage_output' : (base.meta.kind || defaults.kind || 'stage_prompt'));
        return this.normalizeAgentMessage(base, { meta: { ...defaults, kind: roleKind } });
      }).filter(Boolean)
      : [this.normalizeAgentMessage({ role: 'user', content: String(prompt || ''), meta: defaults })].filter(Boolean);
  },

  messagesForDeepSeekKvCache(session, prompt, defaults = {}) {
    if (!session) return null;
    const current = this.promptToMessages(prompt, {
      ...defaults,
      roundId: defaults.roundId || session.currentRoundId || '',
      kind: defaults.kind || 'stage_prompt',
    });
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
    const meta = info?.contextMeta && typeof info.contextMeta === 'object' ? info.contextMeta : {};
    const phase = this.normalizeReasoningPhase(meta.phase || '');
    const assistantMeta = {
      ...meta,
      roundId: meta.roundId || session.currentRoundId || '',
      kind: phase === 'stage3' ? 'body' : 'stage_output',
    };
    session.messages = [
      ...(Array.isArray(messages) ? messages.map((item) => this.normalizeAgentMessage(item)).filter(Boolean) : this.promptToMessages(messages)),
      this.normalizeAgentMessage({ role: 'assistant', content: String(assistantText || ''), meta: assistantMeta }),
    ];
    session.requestCount += 1;
    if (assistantMeta.roundId) session.latestRoundId = assistantMeta.roundId;
    const compacted = this.compactAgentMessages(session.messages, {
      store: session.store,
      mode: session.mode || 'real',
      model: session.model || session.store?.modelId || session.store?.settingsState?.textModelId,
      latestRoundId: session.currentRoundId || session.latestRoundId || this.latestRoundIdFromMessages(session.messages),
    });
    session.messages = compacted.messages;
    if (compacted.changed && session.store) this.persistAgentConversation(session.store, session, session.mode || 'real');
  },

  normalizeReasoningPhase(phase = '') {
    const text = String(phase || '').trim();
    const stage4Pass = text.match(/^stage\s*4\s*[-–—]\s*(1[0-7]|[1-9])$/iu);
    if (stage4Pass) return `stage4-${stage4Pass[1]}`;
    const match = text.match(/^stage\s*(1[0-3]|[1-9])$/iu);
    if (match) return `stage${Number(match[1])}`;
    return text.toLowerCase();
  },

  inferReasoningPhase(config = {}) {
    if (config.reasoningPhase) return this.normalizeReasoningPhase(config.reasoningPhase);
    const promptId = String(config.promptId || config.firstTemplateId || '');
    const byPromptId = {
      'inference-stage1-guided-query': 'stage1',
      'inference-stage2-scene-anchor': 'stage2',
      'inference-stage3-narration': 'stage3',
      'inference-stage4-settlement-window': 'stage4',
      'inference-stage4-basic': 'stage4-1',
      'inference-stage4-emotion-feeling': 'stage4-2',
      'inference-stage4-vitals': 'stage4-3',
      'inference-stage4-body-wearing': 'stage4-4',
      'inference-stage4-intimacy-history': 'stage4-5',
      'inference-stage4-relationship-goal': 'stage4-6',
      'inference-stage4-schedule': 'stage4-7',
      'inference-stage4-role-card-profile': 'stage4-8',
      'inference-stage4-role-card-items': 'stage4-9',
      'inference-stage4-system-events': 'stage4-10',
      'inference-stage4-control-experience': 'stage4-11',
      'inference-stage4-role-card-review': 'stage4-12',
      'inference-stage4-social-drive': 'stage4-13',
      'inference-stage4-entity-state': 'stage4-17',
      'inference-stage5-intro-card-update': 'stage5',
      'inference-stage5-profile-gate': 'stage6',
      'inference-stage5-body-profile-patch': 'stage7',
      'inference-stage5-dressed-profile-patch': 'stage8',
      'inference-stage6-faction-update': 'stage9',
      'inference-stage10-life-energy-exp': 'stage11',
      'real-world-map-surround-unlock': 'stage10',
      'inference-stage11-world-news-update': 'stage12',
      'inference-stage13-career-update': 'stage13',
    };
    if (byPromptId[promptId]) return byPromptId[promptId];
    if (config.guidedStep) return 'stage1';
    const sourceTitle = String(config.sourceTitle || '');
    if (/Stage\s*13|职业生涯|工作与绩效|评绩效/iu.test(sourceTitle)) return 'stage13';
    if (/Stage\s*12|新闻热榜/iu.test(sourceTitle)) return 'stage12';
    if (/Stage\s*11|生命层次|经验结算/iu.test(sourceTitle)) return 'stage11';
    if (/Stage\s*10|周围解锁/iu.test(sourceTitle)) return 'stage10';
    if (/Stage\s*9|势力更新/iu.test(sourceTitle)) return 'stage9';
    if (/Stage\s*8|盛装外观补丁/iu.test(sourceTitle)) return 'stage8';
    if (/Stage\s*7|自然外观补丁/iu.test(sourceTitle)) return 'stage7';
    if (/Stage\s*6|外观判定/iu.test(sourceTitle)) return 'stage6';
    if (/Stage\s*5|介绍卡/iu.test(sourceTitle)) return 'stage5';
    if (sourceTitle.includes('场景锚定') || /Stage\s*2/iu.test(sourceTitle)) return 'stage2';
    const stage4Sub = sourceTitle.match(/Stage\s*4\s*[-–—]\s*(1[0-7]|[1-9])/iu);
    if (stage4Sub) return `stage4-${stage4Sub[1]}`;
    if (/Stage\s*4|滑动结算|状态结算/iu.test(sourceTitle)) return 'stage4';
    if (config.streamToUi) return 'stage3';
    return '';
  },

  stagePhaseLabel(phase = '', step = 0) {
    const labels = {
      stage1: step > 0 ? `Stage1 资料查询 - ${step}` : 'Stage1 资料查询',
      stage2: 'Stage2 场景锚定',
      stage3: 'Stage3 正文生成',
      stage4: step > 0 ? `Stage4 状态结算 - ${step + 1}` : 'Stage4 状态结算',
      'stage4-1': 'Stage4-1 基础结算',
      'stage4-2': 'Stage4-2 情绪与感觉',
      'stage4-3': 'Stage4-3 生命体征',
      'stage4-4': 'Stage4-4 身体与穿着',
      'stage4-5': 'Stage4-5 亲密与性经历',
      'stage4-6': 'Stage4-6 关系与长期目标',
      'stage4-7': 'Stage4-7 人事安排',
      'stage4-8': 'Stage4-8 角色卡资料',
      'stage4-9': 'Stage4-9 角色卡物品',
      'stage4-10': 'Stage4-10 系统记录与事件',
      'stage4-11': 'Stage4-11 操控体验',
      'stage4-12': 'Stage4-12 角色卡补充更新',
      'stage4-13': 'Stage4-13 社交驱动',
      'stage4-14': 'Stage4-14 角色想法补足',
      'stage4-15': 'Stage4-15 金钱结算',
      'stage4-16': 'Stage4-16 专用术语结算',
      'stage4-17': 'Stage4-17 实体状态结算',
      stage5: 'Stage5 介绍卡更新',
      stage6: 'Stage6 外观判定',
      stage7: 'Stage7 自然外观补丁',
      stage8: 'Stage8 盛装外观补丁',
      stage9: 'Stage9 势力更新',
      stage10: 'Stage10 电子地图周围解锁',
      stage11: 'Stage11 经验结算',
      stage12: 'Stage12 世界新闻热榜',
      stage13: 'Stage13 职业生涯',
    };
    return labels[phase] || '未知阶段';
  },

  reasoningSectionMeta(config = {}) {
    const phase = this.inferReasoningPhase(config);
    const stage1Step = Math.max(1, Number(config.guidedStep) || 1);
    const stage4Attempt = Number(config.settlementAttempt);
    if (phase === 'stage1') {
      return { phase, step: stage1Step, label: this.stagePhaseLabel(phase, stage1Step), id: `stage1-${stage1Step}` };
    }
    if (phase === 'stage4') {
      const attempt = Number.isFinite(stage4Attempt) ? stage4Attempt : 0;
      return {
        phase,
        step: attempt,
        label: this.stagePhaseLabel(phase, attempt),
        id: attempt > 0 ? `stage4-${attempt}` : 'stage4',
      };
    }
    if (/^stage4-(?:[1-9]|1[0-7])$/u.test(phase)) return { phase, step: 0, label: this.stagePhaseLabel(phase), id: phase };
    if (/^stage(?:[2-9]|1[0-3])$/u.test(phase)) {
      return { phase, step: 0, label: this.stagePhaseLabel(phase), id: phase };
    }
    return { phase: 'unknown', step: 0, label: '未知阶段', id: `reasoning-${Date.now()}` };
  },

  reasoningStageGroupKey(meta = {}) {
    const phase = String(meta.phase || 'unknown');
    const step = Number(meta.step) || 0;
    if (phase === 'stage1') return `${phase}-${Math.max(1, step || 1)}`;
    if (phase === 'stage4') return `${phase}-${step}`;
    return phase;
  },

  parseReasoningLabel(label = '') {
    const stage4Pass = String(label || '').trim().match(/^Stage\s*4\s*[-–—]\s*(1[0-7]|[1-9])/iu);
    if (stage4Pass) {
      const phase = `stage4-${stage4Pass[1]}`;
      return { phase, step: 0, label: this.stagePhaseLabel(phase), id: phase };
    }
    const match = String(label || '').trim().match(/^Stage\s*(1[0-3]|[1-9])(?:\s*[^\d-]*?)?(?:\s*[-–—]\s*(\d+))?/iu);
    if (!match) return null;
    const phase = `stage${match[1]}`;
    const step = Number(match[2]) || 0;
    if (phase === 'stage1') {
      const n = Math.max(1, step || 1);
      return { phase, step: n, label: this.stagePhaseLabel(phase, n), id: `stage1-${n}` };
    }
    if (phase === 'stage4' && step > 0) {
      return { phase, step, label: this.stagePhaseLabel(phase, step), id: `stage4-${step}` };
    }
    return {
      phase,
      step,
      label: this.stagePhaseLabel(phase),
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
        return { phase: storedPhase, step: n, label: String(section?.label || `Stage1 资料查询 - ${n}`), id: id || `stage1-${n}` };
      }
      if (storedPhase === 'stage4') {
        return { phase: storedPhase, step, label: String(section?.label || (step > 0 ? `Stage4 状态结算 - ${step + 1}` : 'Stage4 状态结算')), id: id || (step > 0 ? `stage4-${step}` : 'stage4') };
      }
      if (/^stage4-(?:[1-9]|1[0-7])$/u.test(storedPhase)) {
        return { phase: storedPhase, step: 0, label: String(section?.label || this.stagePhaseLabel(storedPhase)), id: id || storedPhase };
      }
      const fallbackLabels = {
        stage2: 'Stage2 场景锚定',
        stage3: 'Stage3 正文生成',
        stage5: 'Stage5 介绍卡更新',
        stage6: 'Stage6 外观判定',
        stage7: 'Stage7 自然外观补丁',
        stage8: 'Stage8 盛装外观补丁',
        stage9: 'Stage9 势力更新',
        stage10: 'Stage10 电子地图周围解锁',
        stage11: 'Stage11 经验结算',
        stage12: 'Stage12 世界新闻热榜',
        stage13: 'Stage13 职业生涯',
      };
      return {
        phase: storedPhase,
        step,
        label: String(section?.label || fallbackLabels[storedPhase] || this.stagePhaseLabel(storedPhase, step)),
        id: id || storedPhase,
      };
    }
    const stage1Match = id.match(/^stage1-(?:step-)?(\d+)$/iu);
    if (stage1Match) {
      const step = Number(stage1Match[1]) || 1;
      return { phase: 'stage1', step, label: this.stagePhaseLabel('stage1', step), id: `stage1-${step}` };
    }
    if (/^stage4-(?:[1-9]|1[0-7])$/u.test(id)) return { phase: id, step: 0, label: this.stagePhaseLabel(id), id };
    if (/^stage(?:[2-9]|10)$/u.test(id)) {
      return { phase: id, step: 0, label: this.stagePhaseLabel(id), id };
    }
    if (/^stage4(?:-attempt-|-)?(\d+)?$/iu.test(id) || id === 'stage4') {
      const attempt = Number(id.match(/(\d+)/u)?.[1]) || 0;
      return { phase: 'stage4', step: attempt, label: this.stagePhaseLabel('stage4', attempt), id: attempt > 0 ? `stage4-${attempt}` : 'stage4' };
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
    const pipeline = steps.map((step) => ({ phase: 'stage1', step, label: `Stage1 资料查询 - ${step}`, id: `stage1-${step}` }));
    // Stage2 / Stage4 默认 JSON 模式，不产生深度思考；未知段落按流水线只补 Stage3。
    pipeline.push({ phase: 'stage3', step: 0, label: 'Stage3 正文生成', id: 'stage3' });
    return pipeline;
  },

  assignReasoningSectionMetas(sections = [], entry = {}) {
    const pipeline = this.reasoningPipelineFromEntry(entry);
    const occupied = new Map();
    const assigned = [];

    const occupy = (meta, section) => {
      const key = this.reasoningStageGroupKey(meta);
      const sectionId = String(section?.id || '');
      if (!occupied.has(key)) occupied.set(key, { sectionId, meta });
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
        : { phase: 'unknown', step: assigned.length, label: String(section?.label || '现实推演'), id: String(section?.id || `legacy-${assigned.length}`) };
      occupy(meta, section);
    });

    return assigned;
  },

  reasoningSectionMetaFromStored(section = {}, index = 0, entry = {}) {
    const assigned = this.assignReasoningSectionMetas([section], entry);
    return assigned[0]?.meta || { phase: 'unknown', step: index, label: '现实推演', id: String(section?.id || `legacy-${index}`) };
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
    store.patchRealWorldLogEntry?.(logId, {
      thinkingSections: sections,
      thinking: this.joinThinkingSections(sections),
    }, { live: Boolean(config.livePatch) });
  },

  isSettlementReasoning(config = {}) {
    if (config.settlementThinking) return true;
    const phase = this.inferReasoningPhase(config);
    return /^stage4(?:-(?:[1-9]|1[0-7]))?$|^stage(?:[5-9]|1[0-3])$/u.test(phase);
  },

  settlementReasoningLabel(meta = {}, config = {}) {
    if (config.settlementThinkingLabel) return String(config.settlementThinkingLabel);
    if (meta.phase) return this.stagePhaseLabel(meta.phase, meta.step);
    return 'AI结算思考';
  },

  patchConfiguredSettlementThinking(store, logId, reasoningText = '', config = this.realConfig()) {
    const text = String(reasoningText || '').trim();
    if (!text || !logId || config.mode === 'story') return;
    const entry = (store.realWorldLog || []).find((item) => item.id === logId) || window.GameModules.realWorldLogStore?.get?.(logId) || {};
    const meta = this.reasoningSectionMeta(config);
    const key = String(config.settlementThinkingKey || config.reasoningKey || meta.id || 'settlement-thinking');
    const sections = this.mergeSettlementThinkingSection(entry, {
      id: key,
      phase: meta.phase,
      step: meta.step,
      label: this.settlementReasoningLabel(meta, config),
      text,
      open: true,
    });
    store.patchRealWorldLogEntry?.(logId, {
      settlementThinkingSections: sections,
      settlementThinking: this.joinSettlementThinkingSections(sections),
      settlementThinkingOpen: Boolean(entry.settlementThinkingOpen),
    }, { live: Boolean(config.livePatch) });
  },

  mergeSettlementThinkingSection(entry = {}, section = {}) {
    const sections = Array.isArray(entry.settlementThinkingSections)
      ? entry.settlementThinkingSections.map((item) => ({
        id: String(item?.id || ''),
        phase: String(item?.phase || 'stage4'),
        step: Number(item?.step) || 0,
        label: String(item?.label || 'AI结算思考'),
        text: String(item?.text || ''),
        open: item?.open !== false,
      })).filter((item) => item.text.trim())
      : [];
    if (!sections.length && String(entry.settlementThinking || '').trim()) {
      sections.push({ id: 'settlement-thinking', phase: 'stage4', step: 0, label: 'AI结算思考', text: String(entry.settlementThinking || '').trim(), open: true });
    }
    const next = {
      id: String(section.id || `settlement-${Date.now()}`),
      phase: String(section.phase || 'stage4'),
      step: Number(section.step) || 0,
      label: String(section.label || 'AI结算思考'),
      text: String(section.text || '').trim(),
      open: section.open !== false,
    };
    if (!next.text) return sections;
    const index = sections.findIndex((item) => item.id === next.id);
    if (index >= 0) {
      sections[index] = { ...sections[index], ...next, open: sections[index].open !== false || next.open !== false };
      return sections;
    }
    sections.push(next);
    return sections;
  },

  joinSettlementThinkingSections(sections = []) {
    return (Array.isArray(sections) ? sections : [])
      .map((section) => String(section?.text || '').trim())
      .filter(Boolean)
      .join('\n\n');
  },

  mergeThinkingSection(entry = {}, section = {}) {
    const sections = Array.isArray(entry.thinkingSections)
      ? entry.thinkingSections.map((item) => ({
        id: String(item?.id || ''),
        phase: String(item?.phase || ''),
        step: Number(item?.step) || 0,
        label: String(item?.label || '现实推演'),
        text: String(item?.text || ''),
        open: item?.open !== false,
      })).filter((item) => item.text.trim())
      : [];
    if (!sections.length && String(entry.thinking || '').trim()) {
      sections.push({ id: 'legacy-thinking', phase: 'unknown', step: 0, label: '现实推演', text: String(entry.thinking || '').trim(), open: true });
    }
    const next = {
      id: String(section.id || `reasoning-${Date.now()}`),
      phase: String(section.phase || ''),
      step: Number(section.step) || 0,
      label: String(section.label || '现实推演'),
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
    const kvMode = this.kvMode(config);
    const contextRoundId = String(config.contextRoundId || `${kvMode}-round-${Date.now()}-${++this.kvCacheSeq}`);
    config = { ...config, contextRoundId };
    if (config.kvCacheSession) {
      config.kvCacheSession.currentRoundId = contextRoundId;
      config.kvCacheSession.model = config.model || store?.modelId || store?.settingsState?.textModelId || '';
    }
    store.realWorldAgentActiveKvByMode[kvMode] = config.kvCacheSession || null;
    const ctx = config.ctx;
    if (!ctx) throw new Error(`${config.label || 'Loop'}上下文未加载`);
    try {
      this.markConfiguredStep(store, logId, `${config.label}正在加载推演技能资料…`, config);
      const loaded = [];
      const trace = [];
      const loadedKeys = new Set();
      const memoryIds = new Set();
      const skills = await ctx.skillText(store);
      this.markConfiguredStep(store, logId, `${config.label}正在整理当前场景…`, config);
      const base = ctx.baseSnapshot(store, action);
      const materialSession = config.materials?.createSession?.(action) || null;
      let lastPrompt = '';
      let lastRaw = '';
      let lastGuidance = null;

      const guidedMaxSteps = this.guidedMaxSteps(store, config);
      const autoLoadedStart = await ctx.autoLoadForStep?.(store, action, loadedKeys, materialSession, config.materials, memoryIds, 1, loaded, []) || [];
      loaded.push(...autoLoadedStart);
      this.markConfiguredStep(store, logId, `${config.label}正在请求 AI 推演…`, config);
      for (let step = 1; step <= guidedMaxSteps; step += 1) {
        const prompt = await this.buildConfiguredPrompt({ store, action, base, loaded, skills, step, materialSession, config, guidance: lastGuidance, logId });
        lastPrompt = prompt;
        this.markConfiguredStep(store, logId, this.stepText(step, config), config);
        const raw = await this.completeConfiguredParsedStep(store, prompt, logId, false, false, { ...config, guidedStep: step }, step > 1);
        lastRaw = raw.raw;
        const data = raw.data;
        if (!data) throw new Error(`${config.label || 'Loop'}返回格式错误`);
        lastGuidance = data;
        this.recordStage1PendingFactions(materialSession, data.factions, raw.raw);
        const traceItem = this.traceItem(step, data, raw.raw, ctx);
        trace.push(traceItem);

        const results = await this.loadStepContext(ctx, store, action, data, loadedKeys, loaded, memoryIds, step, materialSession, config.materials, config);
        traceItem.factions = data.factions || traceItem.factions;
        traceItem.loaded = results.map((item) => ({ title: item.title, text: ctx.limit(item.text, 800) }));
        this.updateConfiguredTrace(store, logId, trace, config);
        if (results.length) {
          loaded.push(...results);
          this.markConfiguredStep(store, logId, this.loadedContextText(data, results, step, config), config);
        }

        if ((data.type === 'request_context' || results.some((item) => item?.stage1MustReview)) && step < guidedMaxSteps) continue;
        if (step < this.minSteps && data.type !== 'context_done') continue;
        break;
      }
      const final = await this.generateConfiguredFinal({ store, action, base, loaded, skills, trace, materialSession, logId, prompt: lastPrompt, raw: lastRaw, config });
      this.persistAgentConversation(store, config.kvCacheSession, kvMode);
      return final;
    } finally {
      // 主循环结束后把本轮 KV 暂存为 pending，供 Stage9 地图周围解锁继续追加命中前缀缓存。
      if (store.realWorldAgentActiveKvByMode?.[kvMode] === (config.kvCacheSession || null)) {
        store.realWorldAgentPendingKvByMode = store.realWorldAgentPendingKvByMode || {};
        if (config.kvCacheSession) store.realWorldAgentPendingKvByMode[kvMode] = config.kvCacheSession;
        delete store.realWorldAgentActiveKvByMode[kvMode];
      }
    }
  },

  async generatePhasedFinal(args) {
    return await this.generateConfiguredFinal({ ...args, config: this.realConfig() });
  },

  async generateConfiguredFinal({ store, action, base, loaded, skills, trace, materialSession, logId, config = this.realConfig() }) {
    let effectiveSceneLayers = this.resolveEffectiveSceneLayers(trace, store, config);
    try {
      const batch = await window.GameModules.characterIdEnsure?.ensureBatch?.(store, effectiveSceneLayers);
      if (batch?.count) {
        this.markConfiguredStep?.(store, logId, `${config.label}Stage1后批量分配ID ${batch.count} 人…`, config);
        console.info('[characterIdEnsure] Stage1后批量分配ID:', batch.ensured);
      }
      effectiveSceneLayers = this.resolveEffectiveSceneLayers(trace, store, config);
      // Re-apply ensured ids onto latest layer objects by name.
      (batch?.ensured || []).forEach((row) => {
        ['forcedParticipants', 'priorityCandidates', 'dramaCandidates', 'forbiddenParticipants'].forEach((key) => {
          (effectiveSceneLayers[key] || []).forEach((item) => {
            if (String(item?.name || '').trim() === row.name) {
              item.id = row.id;
              item.idOrName = row.id;
            }
          });
        });
      });
    } catch (err) {
      console.warn('[characterIdEnsure] Stage1后批量分配ID失败:', err?.message || err);
    }
    const sceneAnchorPrompt = await this.buildConfiguredSceneAnchorPrompt({ store, action, base, loaded, trace, effectiveSceneLayers, materialSession, config });
    this.markConfiguredStep(store, logId, `${config.label}资料已载入，正在生成场景锚定报告…`, config);
    const sceneAnchor = await this.completeSceneAnchorReport(store, sceneAnchorPrompt, logId, config);
    const sceneAnchorReport = sceneAnchor.text;
    const narrationPrompt = await this.buildConfiguredNarrationPrompt({ store, action, base, loaded, skills, materialSession, sceneAnchorReport, effectiveSceneLayers, config });
    const narrationMessages = this.buildConfiguredNarrationMessages({ store, action, prompt: narrationPrompt, config });
    this.markConfiguredStep(store, logId, `${config.label}场景锚定完成，正在生成正文…`, config);
    const narrationRaw = await this.completeConfiguredStep(store, narrationMessages, logId, true, {
      ...config,
      promptId: config.templateId,
      streamToUi: true,
      sourceTitle: `${config.label}Stage3 正文生成`,
      reasoningPhase: 'stage3',
    });
    let narration = await this.ensureConfiguredNarrationLength(store, action, narrationPrompt, this.cleanPhasedNarration(narrationRaw), logId, config);
    narration = this.enforceNarrationRoleMarkup(narration, effectiveSceneLayers, store);
    if (!narration) throw new Error(`${config.label}正文为空`);
    this.showConfiguredNarration(store, logId, narration, config);
    this.patchConfiguredSettlementThinking(store, logId, '正文已完成，准备进入结算。', { ...config, settlementThinking: true, settlementThinkingKey: 'settlement-status', settlementThinkingLabel: '结算状态', livePatch: true });

    let settlementPrompt = 'Stage4 状态结算', settlementRaw = '', updates = {}, profilePatches = [], moneySettlement = null, entitySettlement = null;
    const participants = this.mergeNarrationParticipants(this.stageParticipants(effectiveSceneLayers, loaded, store), narration, store, sceneAnchor.data);
    try {
      this.markConfiguredStep(store, logId, `${config.label}正文已完成，正在串行结算…`, config, { keepNarration: true });
      const stage4Passes = this.stage4SettlementPasses(config, store);
      const stage4PassFlow = stage4Passes.filter((pass) => (pass.types || []).length).map((pass) => pass.label).join(' → ');
      this.patchConfiguredSettlementThinking(store, logId, `正文已完成，正在串行结算（${stage4PassFlow} → Stage4-13 社交驱动 → Stage4-14 角色想法补足 → Stage4-15 金钱结算 → Stage4-16 专用术语结算 → Stage4-17 实体状态结算 → Stage5 介绍卡 → Stage6–8 外观 → Stage9 势力更新 → Stage11 经验结算 → Stage12 新闻热榜 → Stage13 职业生涯；地图周围解锁为 Stage10）。`, { ...config, settlementThinking: true, settlementThinkingKey: 'settlement-status', settlementThinkingLabel: '结算状态', livePatch: true });
      let stage4Updates;
      try {
        const stage4Results = [];
        stage4Updates = { type: 'final', genericUpdates: [], events: [] };
        for (const pass of stage4Passes) {
          if (!(pass.types || []).length) continue;
          const passConfig = {
            ...config,
            reasoningPhase: pass.id,
            sourceTitle: `${config.label}${pass.label}`,
            settlementStageLabel: pass.label,
            settlementPromptId: pass.promptId || 'inference-stage4-settlement-window',
          };
          let passResult = { type: 'final', genericUpdates: [], events: [] };
          try {
            passResult = await this.completeConfiguredSettlementKvWindow({
              store,
              action,
              base,
              loaded,
              skills,
              materialSession,
              narration,
              trace,
              participants,
              logId,
              config: passConfig,
              types: pass.types,
              priorStageSummary: { stage4Results, stage4Updates },
            });
          } catch (err) {
            console.warn(`${config.label}${pass.label}失败，保留前序结算:`, err.message);
            if (pass.id === 'stage4-1') passResult = this.fallbackUpdateJson(store, action, config);
          }
          stage4Results.push({ id: pass.id, label: pass.label, types: pass.types, result: passResult });
          stage4Updates = {
            ...stage4Updates,
            ...passResult,
            type: 'final',
            genericUpdates: [...(stage4Updates.genericUpdates || []), ...(passResult.genericUpdates || [])],
            events: [...(stage4Updates.events || []), ...(passResult.events || [])],
          };
        }
      } catch (err) {
        console.warn(`${config.label}状态更新生成失败，保留已生成正文并使用最小结算:`, err.message);
        stage4Updates = this.fallbackUpdateJson(store, action, config);
      }
      const postStage4Checkpoint = this.snapshotKvMessages(config.kvCacheSession);
      const postBodyKvConfig = {
        ...config,
        kvCacheSession: this.forkKvCacheSession(config.kvCacheSession, postStage4Checkpoint),
      };
      const socialDriveStage = window.GameModules.inferenceIntroCardStageUpdate;
      const socialDriveResult = socialDriveStage?.runRoleDriveAfterStage4
        ? await socialDriveStage.runRoleDriveAfterStage4({ store, action, narration, participants, logId, config: postBodyKvConfig, loop: this, updates: stage4Updates })
        : { lines: [], skipped: true };
      if (socialDriveResult?.lines?.length) {
        stage4Updates = {
          ...stage4Updates,
          characterCardChanges: [...(stage4Updates.characterCardChanges || []), ...socialDriveResult.lines],
        };
      }
      const moneyStage = window.GameModules.inferenceMoneyStageUpdate;
      if (moneyStage?.runAfterStage4) {
        moneySettlement = await moneyStage.runAfterStage4({
          store,
          action,
          narration,
          updates: stage4Updates,
          participants,
          logId,
          config: postBodyKvConfig,
          loop: this,
          priorStageSummary: { stage4Updates },
        });
        if (moneySettlement?.lines?.length) {
          stage4Updates = {
            ...stage4Updates,
            moneySettlement,
            characterCardChanges: [...(stage4Updates.characterCardChanges || []), ...moneySettlement.lines],
          };
        }
      }
      const lexiconStage = window.GameModules.inferenceLexiconStageUpdate;
      if (lexiconStage?.runAfterStage4) {
        const lexiconSettlement = await lexiconStage.runAfterStage4({
          store,
          action,
          narration,
          updates: stage4Updates,
          participants,
          logId,
          config: postBodyKvConfig,
          loop: this,
        });
        if (lexiconSettlement?.lines?.length) {
          stage4Updates = {
            ...stage4Updates,
            lexiconSettlement,
            characterCardChanges: [...(stage4Updates.characterCardChanges || []), ...lexiconSettlement.lines],
          };
        }
      }
      const entityStage = window.GameModules.inferenceEntityStageUpdate;
      if (entityStage?.runAfterStage4) {
        entitySettlement = await entityStage.runAfterStage4({
          store,
          action,
          narration,
          updates: stage4Updates,
          participants,
          logId,
          config: postBodyKvConfig,
          loop: this,
        });
        if (entitySettlement?.lines?.length) {
          stage4Updates = {
            ...stage4Updates,
            entitySettlement,
            characterCardChanges: [...(stage4Updates.characterCardChanges || []), ...entitySettlement.lines],
          };
        }
      }
      const introStage5 = window.GameModules.inferenceIntroCardStageUpdate;
      const introStage5Result = introStage5?.runAfterSettlement
        ? await introStage5.runAfterSettlement({ store, action, narration, participants, logId, config: postBodyKvConfig, loop: this, updates: stage4Updates, materialSession })
        : { lines: [], skipped: true };
      if (introStage5Result?.lines?.length) {
        stage4Updates = {
          ...stage4Updates,
          characterCardChanges: [...(stage4Updates.characterCardChanges || []), ...introStage5Result.lines],
        };
      }
      const profileStage = window.GameModules.realWorldProfileStage5;
      const stage5Result = profileStage?.runAfterStage4
        ? await profileStage.runAfterStage4({ store, narration, participants, logId, config: postBodyKvConfig, loop: this, updates: stage4Updates })
        : (profileStage?.runParallelWithStage4
          ? await profileStage.runParallelWithStage4({
            store,
            narration,
            participants,
            logId,
            config: postBodyKvConfig,
            loop: this,
            stage4Promise: Promise.resolve(stage4Updates),
          })
          : { updates: stage4Updates, patches: [], skipped: true });
      updates = stage5Result.updates || stage4Updates;
      updates = { ...updates, type: updates.type || 'final' };
      profilePatches = Array.isArray(stage5Result.patches) ? stage5Result.patches : [];
      const factionStage = window.GameModules.inferenceFactionStageUpdate;
      let factionOps = [];
      if (factionStage?.runAfterSettlement) {
        const stage6Result = await factionStage.runAfterSettlement({
          store,
          action,
          narration,
          updates,
          participants,
          logId,
          config: postBodyKvConfig,
          loop: this,
          materialSession,
        });
        factionOps = Array.isArray(stage6Result?.ops) ? stage6Result.ops : [];
        if (stage6Result?.lines?.length) {
          updates = {
            ...updates,
            characterCardChanges: [...(updates.characterCardChanges || []), ...stage6Result.lines],
          };
        }
      }
      const stage10 = window.GameModules.inferenceLifeEnergyStage;
      let lifeEnergyGains = [];
      let learnedGains = [];
      if (stage10?.runAfterSettlement) {
        const stage10Result = await stage10.runAfterSettlement({
          store,
          action,
          narration,
          updates,
          participants,
          logId,
          config: postBodyKvConfig,
          loop: this,
          materialSession,
        });
        lifeEnergyGains = Array.isArray(stage10Result?.gains) ? stage10Result.gains : [];
        learnedGains = Array.isArray(stage10Result?.learnedGains) ? stage10Result.learnedGains : [];
        if (stage10Result?.lines?.length) {
          updates = {
            ...updates,
            characterCardChanges: [...(updates.characterCardChanges || []), ...stage10Result.lines],
          };
        }
      }
      const stageNews = window.GameModules.inferenceNewsDriverStageUpdate;
      let newsOps = [];
      if (stageNews?.runAfterSettlement) {
        const newsResult = await stageNews.runAfterSettlement({
          store,
          action,
          narration,
          updates,
          participants,
          logId,
          config: postBodyKvConfig,
          loop: this,
          materialSession,
        });
        newsOps = Array.isArray(newsResult?.ops) ? newsResult.ops : [];
        if (newsResult?.lines?.length) {
          updates = {
            ...updates,
            characterCardChanges: [...(updates.characterCardChanges || []), ...newsResult.lines],
          };
        }
      }
      const stageWorkPerformance = window.GameModules.inferenceWorkPerformanceStageUpdate;
      let careerUpdate = null;
      if (stageWorkPerformance?.runAfterSettlement) {
        const stage13Result = await stageWorkPerformance.runAfterSettlement({
          store,
          action,
          narration,
          updates,
          participants,
          logId,
          config: postBodyKvConfig,
          loop: this,
          materialSession,
        });
        careerUpdate = stage13Result?.applied || stage13Result?.update || null;
        if (stage13Result?.lines?.length) {
          updates = {
            ...updates,
            characterCardChanges: [...(updates.characterCardChanges || []), ...stage13Result.lines],
          };
        }
      }
      this.patchConfiguredSettlementThinking(store, logId, '结算完成，正在写入本回合状态与日志。', { ...config, settlementThinking: true, settlementThinkingKey: 'settlement-status', settlementThinkingLabel: '结算状态', livePatch: true });
      settlementPrompt = `${stage4PassFlow} → Stage4-13 社交驱动 → Stage4-14 角色想法补足 → Stage4-15 金钱结算 → Stage4-16 专用术语结算 → Stage4-17 实体状态结算 → Stage5 介绍卡 → Stage6–8 外观 → Stage9 势力更新 → Stage11 经验结算 → Stage12 新闻热榜 → Stage13 职业生涯（Stage10 地图周围解锁在落库后）`;
      settlementRaw = JSON.stringify({
        settlement: updates,
        introStage5: { cards: introStage5Result.cards?.map((card) => ({ id: card.id, name: card.name, displayType: card.displayType })) || [] },
        stage5Gate: stage5Result.gate || null,
        profilePatches: profilePatches.map((item) => ({ subject: item.subject, parts: item.parts })),
        factionOps,
        lifeEnergyGains,
        learnedGains,
        newsOps,
        careerUpdate,
        moneySettlement,
        entitySettlement,
      });
    } catch (err) {
      console.warn(`${config.label}串行结算失败，保留已生成正文并使用最小结算:`, err.message);
      this.patchConfiguredSettlementThinking(store, logId, `结算失败，已保留正文并使用最小结算：${err.message || '未知错误'}`, { ...config, settlementThinking: true, settlementThinkingKey: 'settlement-status', settlementThinkingLabel: '结算状态', livePatch: true });
      updates = this.fallbackUpdateJson(store, action, config);
      settlementRaw = JSON.stringify(updates);
    }
    const resultPayload = { ...updates, profilePatches, moneySettlement, entitySettlement };
    const result = config.mode === 'story' ? this.mergeStoryNarrationAndUpdates(store, narration, resultPayload, config) : this.mergeNarrationAndUpdates(store, narration, resultPayload, config);
    const anchoredTrace = trace.map((item, index) => index === trace.length - 1 ? { ...item, anchorReport: sceneAnchor.data } : item);
    return { result, prompt: `---SCENE_ANCHOR---\n${sceneAnchorPrompt}\n\n---NARRATION---\n${narrationPrompt}\n\n---SETTLEMENT_JSON---\n${settlementPrompt}`, loaded, raw: `${sceneAnchor.raw}\n\n${narrationRaw}\n\n${settlementRaw}`, trace: anchoredTrace, deepseekCache: this.deepSeekKvCacheSummary(config.kvCacheSession) };
  },

  async loadStepContext(ctx, store, action, data, loadedKeys, loaded, memoryIds, step, materialSession = null, materials = window.GameModules.realWorldMaterials, config = this.realConfig()) {
    const out = [];
    const factionResolve = this.resolveStage1Factions(materialSession, data.factions, store, loadedKeys, materials);
    if (factionResolve.loaded.length) out.push(...factionResolve.loaded);
    if (data.type === 'request_context') {
      const autoLoaded = await ctx.autoLoadForStep?.(store, action, loadedKeys, materialSession, materials, memoryIds, step, loaded, out) || [];
      out.push(...autoLoaded);
      const load = async (requests, limit) => {
        if (!Array.isArray(requests) || !requests.length) return [];
        return await ctx.loadRequests(store, action, requests, loadedKeys, materialSession, materials, memoryIds, loaded, out, { limit, step, label: config.label || '现实' });
      };
      const profileRequests = ctx.participantProfileRequests?.(data, { store, mode: data.mode }) || [];
      out.push(...await load(profileRequests, 3));
      const anchorRequests = data.sceneQueriesAreReasons ? [] : (ctx.sceneAnchorRequests?.(data, store, { mode: data.mode }) || []);
      out.push(...await load(anchorRequests, 4));
      const requestList = Array.isArray(data.requests) && data.requests.length ? data.requests : (Array.isArray(data.needed) ? data.needed : []);
      out.push(...await load(requestList, 3));
    }
    const memoryItem = ctx.characterMemoriesForStep?.(store, action, data.characters || data.relatedCharacters || [], [...loaded, ...out], memoryIds, step === 1);
    if (memoryItem?.text) {
      (memoryItem.ids || []).forEach((id) => memoryIds.add(id));
      materials?.record?.(materialSession, { skill: 'memory.query', method: 'searchCharacterMemory', params: { keyword: 'characterMemoriesForStep' } }, memoryItem.title, memoryItem.text);
      out.push(memoryItem);
    }
    return out;
  },

  parseFactionToken(raw = "") {
    const text = String(raw || "").trim();
    if (!text || text === "无") return null;
    const match = text.match(/^(.+?)\(([^()]+)\)$/u);
    if (!match) return null;
    const name = String(match[1] || "").trim();
    const id = String(match[2] || "").trim();
    if (!name) return null;
    return { name, id, pending: /待(?:创建|建)|未创建|pending/i.test(id) };
  },

  normalizeFactionReferenceItem(item = null) {
    if (typeof item === 'string') {
      return null;
    }
    if (!item || typeof item !== 'object') return null;
    const name = String(item.name || item.factionName || item['势力名'] || '').trim();
    const id = String(item.id || item.factionId || item['势力ID'] || '').trim();
    const statusRaw = String(item.status || item['状态'] || '').trim();
    if (!name) return null;
    const pending = /待(?:创建|建)|未创建|pending/i.test(statusRaw || id);
    return {
      name,
      id: pending ? '' : id,
      type: String(item.type || item.factionType || item['类型'] || '').trim() || '组织',
      status: pending ? '待创建' : (statusRaw === '已获取' ? '已获取' : (id ? '已获取' : '待创建')),
      pending,
    };
  },

  normalizeFactionReferenceList(value = []) {
    const list = Array.isArray(value) ? value : this.splitNameList(value);
    const seen = new Set();
    return list.map((item) => {
      const parsed = this.normalizeFactionReferenceItem(item);
      if (!parsed) return null;
      const id = parsed.id;
      const pending = parsed.pending || parsed.status === '待创建' || !id;
      const name = parsed.name;
      const key = name + "::" + (pending ? "pending" : id);
      if (seen.has(key)) return null;
      seen.add(key);
      return { name, id: pending ? "" : id, type: parsed.type || "组织", status: pending ? "待创建" : "已获取", pending };
    }).filter(Boolean).slice(0, 12);
  },

  factionReferencesText(value = []) {
    const rows = this.normalizeFactionReferenceList(value);
    return rows.length ? rows.map((item) => item.name + "(" + (item.pending ? "待创建" : item.id) + ")").join("、") : "无";
  },

  recordStage1PendingFactions(materialSession = null, factions = [], sourceText = "") {
    if (!materialSession || !Array.isArray(factions) || !factions.length) return [];
    return (Array.isArray(factions) ? factions : [])
      .filter((item) => item?.pending && item.name)
      .map((item) => window.GameModules.realWorldMaterials?.deferStage1FactionCandidate?.(
        materialSession,
        { id: item.id || "", name: item.name, status: "待创建", type: item.type || "组织", worldTag: window.GameModules.realWorld2026?.label || "2026 现代都市现实世界" },
        sourceText || "Stage1 factions：" + item.name + "(待创建)",
      ))
      .filter(Boolean);
  },

  pendingFactionInferenceContext(materialSession = null, config = this.realConfig()) {
    const materials = config?.materials || window.GameModules.realWorldMaterials;
    const rows = materials?.pendingFactionCandidates?.(materialSession) || [];
    if (!rows.length) return "";
    const candidates = rows.map((item, index) => (index + 1) + ". " + item.name + "｜" + (item.type || "组织") + "｜" + (item.worldTag || "未知世界"));
    return [
      "Stage1 待创建势力推演上下文：",
      candidates.join("\n"),
      "以上势力可以在场景锚定与正文中作为有效背景线索正常使用，并结合上下文合理推演，但不得编造势力ID。Stage9-1 会根据完整上下文统一创建。",
    ].join("\n");
  },

  stage1PendingFactionId(name = '') {
    const text = String(name || '').trim() || 'unknown';
    let hash = 0;
    for (const ch of text) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0;
    return `force-pending-${Math.abs(hash).toString(36)}`;
  },

  resolveStage1Factions(materialSession = null, factions = [], store = null, loadedKeys = null, materials = null) {
    if (!materialSession || !Array.isArray(factions) || !factions.length) return { items: [], loaded: [], statusSummary: "" };
    const ctx = window.GameModules.realWorldAgentContext;
    const items = [];
    const loaded = [];
    const members = materials || window.GameModules.realWorldMaterials;
    factions.forEach((item) => {
      if (!item || !item.name) return;
      const entry = { name: item.name, id: item.id || "", status: "待创建", sourceId: item.id || "" };
      const factionRows = store?.factionState?.factions || [];
      const hit = factionRows.find((f) => (item.id && f.id === item.id) || (item.name && f.name === item.name));
      if (hit) {
        entry.id = hit.id;
        entry.status = "已获取";
        const key = "faction:verified:" + hit.id;
        if (loadedKeys && !loadedKeys.has(key)) {
          loadedKeys.add(key);
          const text = ctx?.factionDetail?.(store, hit.id) || ctx?.factionText?.(store, hit) || "";
          if (text) {
            loaded.push({ title: "势力核验：" + hit.name, text, max: 1600, stage1MustReview: true });
            members?.record?.(materialSession, { skill: "faction.query", method: "getFactionDetail", params: { id: hit.id } }, "势力核验：" + hit.name, text);
          }
        }
      } else {
        entry.id = this.stage1PendingFactionId(item.name);
        entry.status = "待创建";
      }
      members?.deferStage1FactionCandidate?.(materialSession, { ...entry, type: item.type || "组织", worldTag: item.worldTag || "" }, "Stage1 factions 核验");
      items.push(entry);
    });
    if (items.length) factions.splice(0, factions.length, ...items.map((item) => ({ ...item, pending: item.status === "待创建" })));
    const statusSummary = items.map((it) => it.name + "(" + it.id + "，" + it.status + ")").join("、");
    if (statusSummary) loaded.push({ title: "势力核验状态", text: "Stage1 势力核验结果：" + statusSummary, max: 1000 });
    return { items, loaded, statusSummary };
  },

  buildFactionStage9Context({ base = "", loaded = [], trace = [], sceneAnchor = null, updates = {}, participants = [], materialSession = null, config = null } = {}) {
    const loadText = (Array.isArray(loaded) ? loaded : []).map((item, i) => {
      const title = String(item?.title || '').trim();
      const text = String(item?.text || '').trim();
      return (i + 1) + ". " + [title, text].filter(Boolean).join("：").slice(0, 900);
    }).join("\n");
    const factionHints = [];
    (Array.isArray(trace) ? trace : []).forEach((item) => {
      if (Array.isArray(item?.factions)) {
        item.factions.forEach((f) => {
          if (f && f.name) factionHints.push(f.name + (f.id ? "(" + f.id + ")" : "") + (f.reason || item.reason ? " 理由=" + (f.reason || item.reason) : ""));
        });
      }
    });
    const pendingSummary = window.GameModules.realWorldMaterials?.pendingFactionSummary?.(materialSession) || "";
    return [
      base || "",
      "已加载资料摘要：",
      loadText || "无",
      "Stage1势力线索：",
      factionHints.join("\n") || "无",
      pendingSummary ? "Stage1待建候选：\n" + pendingSummary : "",
      "场景锚定：",
      sceneAnchor?.data?.currentLocation || "",
      sceneAnchor?.data?.currentAction || "",
    ].filter(Boolean).join("\n");
  },

  async buildPrompt(args) {
    return await this.buildConfiguredPrompt({ ...args, config: this.realConfig() });
  },

  async buildConfiguredPrompt({ store, action, base, loaded, skills, step, materialSession = null, forceFinal = false, config = this.realConfig(), guidance = null, logId = null }) {
    const actionText = this.actionText(action, config.mode === 'story' ? '继续推进操控剧情' : '继续观察现实世界');
    const loadedText = config.ctx.buildLoadedText(loaded);
    const materialText = config.materials?.summary?.(materialSession, { step }) || '';
    const randomOptions = { mode: config.mode };
    ['forcedParticipants', 'priorityCandidates', 'dramaCandidates', 'forbiddenParticipants'].forEach((key) => {
      if (Array.isArray(guidance?.[key])) randomOptions[key] = guidance[key];
    });
    const randomActiveCandidates = !forceFinal ? (config.ctx.randomActiveEventCandidates?.(store, action, randomOptions) || []) : [];
    const randomActiveCandidateText = randomActiveCandidates.length
      ? randomActiveCandidates.map((item, index) => `${index + 1}. ${item.name || item.id}${item.kind === 'context-event' ? '（由当前上下文生成具体事件）' : ''}`).join('；')
      : '无';
    const configuredControlPerspectiveRule = this.configuredControlPerspectiveRule(store, config);
    const commonVars = {
      本次行动: actionText,
      当前步骤: forceFinal ? '收敛/final' : this.guidedStepText(store, step, config),
      最大步骤: this.guidedMaxStepText(store, config),
      推演自由度规则: [config.mode === 'story' ? this.storyFreedomRule(store) : (store.realWorldFreedomRule?.() || '推演自由度：行动范围内。只推演玩家本次输入行动自然抵达的直接结果。'), configuredControlPerspectiveRule].filter(Boolean).join('\n'),
      当前步骤输出要求: this.stepOutputRule(step, forceFinal),
      随机场外候选: randomActiveCandidateText,
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
      const prompt = await this.renderPrompt(config.firstTemplateId || 'inference-stage1-guided-query', {
        ...commonVars,
        路由上下文: stage1RoutingContext,
        上一轮查询规划摘要: previousGuidance,
        已加载资料摘要: loadedRoutingSummary,
        可请求资料目录: materialCatalog,
      });
      return [{ role: 'user', content: prompt }];
    }
    return this.renderPrompt(config.templateId, {
      ...commonVars,
      基础上下文: base,
      动态载入资料: [loadedText, materialText].filter(Boolean).join('\n\n'),
      动态Skills: skills,
    });
  },

  guidedMaxSteps(store = {}, config = this.realConfig()) {
    if (!store?.settingsState?.stage1MaterialIterationLimited) return this.maxSteps;
    const configured = Math.max(1, Math.min(8, Math.round(Number(store?.settingsState?.stage1MaterialMaxIterations) || 3)));
    return configured;
  },

  guidedMaxStepText(store = {}, config = this.realConfig()) {
    return store?.settingsState?.stage1MaterialIterationLimited ? String(this.guidedMaxSteps(store, config)) : '不限制';
  },

  guidedStepText(store = {}, step, config = this.realConfig()) {
    return String(Math.max(1, Number(step) || 1));
  },

  storyFreedomRule(store) {
    return store.online ? '操控剧情自由度：玩家输入是本回合对被操控者身体或行动方向的控制；正文只能推进到本次行动自然抵达的结果点，不替玩家完成后续长期行动。' : '离线剧情自由度：玩家输入是建议或态度；角色按性格、记忆、处境自主行动。';
  },

  configuredControlPerspectiveRule(store = null, config = this.realConfig()) {
    const isStoryOnline = config?.mode === 'story' && Boolean(store?.online);
    const shared = config?.mode === 'real' ? store?.sharedControlState?.() : null;
    if (!isStoryOnline && !shared) return '';
    const markup = window.GameModules.narrationRoleMarkup;
    const targetState = config?.mode === 'real' ? shared : (store?.rpgStates?.[store?.character?.id] || store?.character);
    const targetName = config?.mode === 'real'
      ? String(shared?.profile?.name || shared?.name || '被控者').trim()
      : String(store?.character?.name || '被控者').trim();
    const targetId = String(targetState?.id || targetState?.profile?.id || store?.character?.id || '').trim();
    const playerName = String(store?.playerName || store?.playerProfile?.name || store?.rpgStates?.['player-self']?.profile?.name || '玩家').trim() || '玩家';
    const playerTag = markup?.roleTag?.('player-self', playerName) || playerName;
    const targetTag = markup?.roleTag?.(targetId, targetName) || targetName;
    const exp = (config?.mode === 'real'
      ? (shared?.values?.control_experience || store?.rpgStates?.[shared?.id]?.values?.control_experience)
      : (store?.characterRpgState?.values?.control_experience || targetState?.values?.control_experience)) || {};
    const awarenessRule = window.GameModules.controlExperienceStage?.controllerAwarenessNarrationRule?.({
      ...exp,
      playerName,
      targetName,
    }) || '';
    return [
      '上线附身控制视角规则（高优先级）：',
      `- ${playerTag}可以一心二用：同一意识能同时控制自己的现实本体与${targetTag}的身体，并同时接收两个肉体的视觉、听觉、触觉、痛觉、疲劳、呼吸、平衡等感官反馈。`,
      `- ${targetTag}的身体行动权被${playerTag}接管；除非系统或剧情明确解除控制，${targetTag}不能自主夺回身体、不能让身体违背玩家本次控制行动。`,
      `- ${targetTag}的意识仍清醒存在，能够完整感觉自己身体的所有感官反馈，也会产生抗拒、困惑、羞耻、愤怒、恐惧、试探或顺从等内心反应；正文必须保留一部分${targetTag}的心理想法、情绪和身体感受。`,
      `- AI生成的正文必须以玩家在${targetTag}身体内的第二人称视角为主来描绘行动，也就是以玩家在被控者身体内的附身体验推进：重点写“你”如何通过被控身体看见、移动、触碰、发声，并即时接收该肉体回传的感官；同时穿插${targetTag}意识里的想法和感受。`,
      `- 附身感官回流（通用）：附身期间，“你”默认站在${targetTag}的肉体感官里体验。凡该身体当下的触碰、受力、温度、疼痛、酸胀、敏感、舒服、发颤、疲惫、呼吸与平衡变化，都应写成“你”能直接感到的身体反馈；若是这具身体自己触碰或刺激自身，也要同时写出执行侧（手/身体如何动）与接收侧（被触部位回传给你的感觉），不要只写外部动作、也不要写成隔空旁观。${targetTag}的意识仍平行感受同一套身体反馈。`,
      `- 附身视角动作归属规则：只要玩家没有明确写“${playerTag}本体”“现实身体”“外部的我”或“让其他人执行”，所有“你/我/手/身体/伸手/触碰/捏/按/移动/说话”等行动都默认是${targetTag}的身体亲自执行；不要写成${playerTag}的现实本体从外部对${targetTag}行动。`,
      `- 正文里除“你”外每次写出角色姓名必须使用角色标签，例如 ${playerTag}、${targetTag}；禁止裸写姓名，禁止自造 id。`,
      `- 不要把${targetTag}写成失去意识、断片、完全无感或可自由操控自己身体；也不要把正文主视角切回纯旁观或只写玩家现实本体。`,
      awarenessRule,
    ].filter(Boolean).join('\n');
  },

  stepOutputRule(step, forceFinal = false) {
    if (forceFinal) {
      return '当前为收敛步骤：禁止继续请求资料。只输出一个紧凑 JSON 对象；status 必须为“资料已足够”，materialRequests 必须为 []，sceneQueries 与 participants 按已确认事实填写；不得输出正文、旁白、Markdown、代码块或 final JSON。';
    }
    if (step === 1) {
      return '当前是第1步：你是上下文路由器，只判断为了准确生成本次行动范围内正文需要载入哪些已有资料，并尽可能多而全地列出 sceneQueries 中的地点/因果/冲突查询理由。只输出符合字段契约的 Stage1 JSON 对象；不要写正文，不要结算状态，不要推演后续结果。';
    }
    if (step >= 2) {
      return `当前是第${step}步/后续资料路由步骤：继续使用 Stage1 字段契约收敛资料需求。达到设置的资料收集迭代最大次数后，系统会带着已加载资料与 sceneQueries 进入场景锚定；若没有可执行 materialRequests，允许 materialRequests 为 [] 但保留 sceneQueries 或 participants 候选。不要输出正文、旁白、Markdown、代码块和 final JSON。`;
    }
    return '当前只负责判断是否继续收集资料：只输出符合字段契约的 Stage1 JSON 对象。仍缺关键资料就写 status“继续请求资料”并列出 materialRequests；资料足够或无法继续获取时写 status“资料已足够”且 materialRequests 为 []。不要输出正文、旁白、Markdown、代码块和 final JSON。';
  },

  stage1JsonRetryInstruction(err = {}, semanticSelfCheckFailed = false) {
    return [
      `上次 Stage1 JSON ${semanticSelfCheckFailed ? '语义自检失败' : '解析失败'}：${err.message}`,
      '请重新输出完整 Stage1 JSON 对象；字段必须符合 Stage1 字段契约；不得删除用户明确约束、participants.forbidden 或已确认 participants.forced。',
      '【AI自检】若 status 为“继续请求资料”，优先输出最多 3 条 materialRequests 对象或明确 participants 候选；若没有可执行 materialRequests，必须保留尽可能多而全的 sceneQueries，系统会带着这些理由进入场景锚定。不得输出 JSON 外解释或 materialRequests 字符串壳。',
    ].join('\n\n');
  },

  previousGuidanceSummary(guidance = null) {
    const ctx = window.GameModules.realWorldAgentContext;
    if (ctx?.stage1GuidanceSummary) return ctx.stage1GuidanceSummary(guidance);
    if (!guidance) return '无';
    const compactParticipant = (item = {}) => ({
      name: String(item.name || item.idOrName || item.characterName || '').trim(),
      id: String(item.id || '').trim(),
      reason: String(item.reason || '').trim(),
    });
    const compactEvent = (item = {}) => ({
      name: String(item.characterName || item.name || '').trim(),
      type: String(item.eventType || item.actionMethod || '背景行动').trim(),
      reason: String(item.motivation || item.reason || '').trim(),
    });
    const uniqueStrings = (items = []) => [...new Set((Array.isArray(items) ? items : []).map((item) => String(item || '').trim()).filter(Boolean))];
    return JSON.stringify({
      status: guidance.type === 'context_done' ? '资料已足够' : '继续请求资料',
      sceneQueries: {
        location: uniqueStrings(guidance.sceneQueries?.location),
        causality: uniqueStrings(guidance.sceneQueries?.causality),
        conflict: uniqueStrings(guidance.sceneQueries?.conflict),
      },
      participants: {
        forced: (guidance.forcedParticipants || []).map(compactParticipant).filter((item) => item.name || item.id),
        priority: (guidance.priorityCandidates || []).map(compactParticipant).filter((item) => item.name || item.id),
        drama: (guidance.dramaCandidates || []).map(compactParticipant).filter((item) => item.name || item.id),
        forbidden: (guidance.forbiddenParticipants || []).map(compactParticipant).filter((item) => item.name || item.id),
      },
      factions: (guidance.factions || []).map((item) => ({
        name: String(item.name || '').trim(),
        id: String(item.id || '').trim(),
        status: String(item.status || (item.pending ? '待创建' : '')).trim(),
      })).filter((item) => item.name),
      randomEvents: (guidance.randomActiveEvents || []).map(compactEvent).filter((item) => item.name || item.type),
      randomIntrusionCondition: String(guidance.randomIntrusionCondition || '无明确条件则禁止闯入').trim(),
    });
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

  compactReturnRule(kind = '') {
    if (kind === 'prose') {
      return '返回必须紧凑：不要Markdown、不要标题、不要任务说明、不要换行符、不要制表符、不要不可见字符；只输出单行正文。唯一允许的标记是角色标签 <role id="真实ID">角色名</role>。';
    }
    return '返回必须紧凑：不要Markdown、不要标题、不要任务说明、不要换行符、不要制表符、不要不可见字符，只输出单行正文文本。';
  },

  participantDisplayName(item = {}) {
    if (typeof item === 'string') {
      const parsed = this.parseParticipantToken(item);
      if (parsed?.name && parsed?.id) return `${parsed.name}(${parsed.id})`;
      return String(item || '').trim();
    }
    const name = String(item?.name || item?.characterName || '').trim();
    const id = String(item?.id || '').trim();
    if (name && id) return `${name}(${id})`;
    return name || String(item?.idOrName || item?.id || '').trim();
  },

  participantKey(item = {}) {
    if (typeof item === 'string') {
      const parsed = this.parseParticipantToken(item);
      return String(parsed?.id || parsed?.name || item || '').trim();
    }
    return String(item?.id || item?.idOrName || item?.name || item?.characterName || '').trim();
  },

  participantRawName(item = {}) {
    if (typeof item === 'string') {
      const parsed = this.parseParticipantToken(item);
      return String(parsed?.name || item || '').trim();
    }
    return String(item?.name || item?.characterName || '').trim();
  },

  dedupeParticipants(items = [], options = {}) {
    const seen = new Set();
    const blockedNames = options.blockedNames || new Set();
    return (Array.isArray(items) ? items : []).filter((item) => {
      const name = this.participantDisplayName(item);
      const rawName = this.participantRawName(item);
      const key = this.participantKey(item) || name;
      if (!name || blockedNames.has(name) || blockedNames.has(rawName) || blockedNames.has(key) || seen.has(key) || seen.has(name) || seen.has(rawName)) return false;
      seen.add(key);
      seen.add(name);
      if (rawName) seen.add(rawName);
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
    const forcedBaseNames = new Set(forcedBase.flatMap((item) => [this.participantDisplayName(item), this.participantRawName(item), this.participantKey(item)]).filter(Boolean));
    const systemForced = this.currentForcedParticipants(store, config)
      .filter((item) => !forcedBaseNames.has(this.participantDisplayName(item)) && !forcedBaseNames.has(this.participantRawName(item)) && !forcedBaseNames.has(this.participantKey(item)))
      .map((item) => ({ ...item, role: item.role || 'actor', canSettle: true, reason: item.reason || '系统固定强制出场' }));
    const forcedParticipants = this.dedupeParticipants([...forcedBase, ...systemForced]);
    const forcedNames = new Set(forcedParticipants.flatMap((item) => [this.participantDisplayName(item), this.participantRawName(item), this.participantKey(item)]).filter(Boolean));

    const forbiddenRaw = this.latestLayer(items, 'forbiddenParticipants').map((item) => ({ ...item, role: item.role || 'forbidden', canLoadRoleCard: false, canEnterNarration: false, canSettle: false }));
    const forbiddenParticipants = this.dedupeParticipants(forbiddenRaw, { blockedNames: forcedNames });
    const forbiddenNames = new Set(forbiddenParticipants.flatMap((item) => [this.participantDisplayName(item), this.participantRawName(item), this.participantKey(item)]).filter(Boolean));

    const priorityBlocked = new Set([...forcedNames, ...forbiddenNames]);
    const priorityCandidates = this.dedupeParticipants(this.latestLayer(items, 'priorityCandidates').map((item) => ({ ...item, role: item.role || 'priority-candidate', canSettle: false })), { blockedNames: priorityBlocked });
    const priorityNames = new Set(priorityCandidates.flatMap((item) => [this.participantDisplayName(item), this.participantRawName(item), this.participantKey(item)]).filter(Boolean));

    const dramaBlocked = new Set([...priorityBlocked, ...priorityNames]);
    const dramaCandidates = this.dedupeParticipants(this.latestLayer(items, 'dramaCandidates').map((item) => ({ ...item, role: item.role || 'drama-candidate', canSettle: false })), { blockedNames: dramaBlocked });
    const dramaNames = new Set(dramaCandidates.flatMap((item) => [this.participantDisplayName(item), this.participantRawName(item), this.participantKey(item)]).filter(Boolean));

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
    const eventNarrationContext = store.eventNarrationPromptContext?.(actionText) || '';
    const newsNarrationContext = store.newsNarrationPromptContext?.(actionText) || '';
    const anchorContext = config.ctx.buildSceneAnchorContext?.({ store, action: actionText, loaded, trace, effectiveSceneLayers: layers, materialSession, config }) || [
      `模式：${config.label}`,
      `本次行动：${actionText}`,
      `参与者边界：\n${this.sceneLayerSummary(layers, store, config)}`,
    ].join('\n');
    const controlPerspectiveContext = this.configuredControlPerspectiveRule(store, config);
    const anchorContextWithEvents = [anchorContext, eventNarrationContext, newsNarrationContext, controlPerspectiveContext].filter(Boolean).join('\n');
    const body = await this.renderPrompt('inference-stage2-scene-anchor', {
      模式标签: config.label,
      本次行动: actionText,
      场景锚定上下文: anchorContextWithEvents,
      日常驱动与事件系统分工: window.GameModules.socialEventBoundary?.divisionBlock?.() || '',
      日常驱动与事件Stage2要点: window.GameModules.socialEventBoundary?.stage2Ops?.() || '',
      紧凑返回规则: this.compactReturnRule('prose'),
    });
    return body;
  },

  parseSceneAnchorReport(raw, config = this.realConfig()) {
    const jsonData = this.parseSceneAnchorJson(raw, config);
    if (jsonData) return jsonData;
    this.sceneAnchorDebug('reject-non-json-scene-anchor', { raw: String(raw || '').slice(0, 400) });
    throw new Error('场景锚定报告必须返回合法 JSON object，且 currentSceneImpactObjects 必须为结构化对象');
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
    const sceneImpactObjects = this.normalizeSceneAnchorImpactObjects(data.currentSceneImpactObjects);
    const values = {
      '场景锚定报告': pick('sceneAnchorReport', 'report', '场景锚定报告'),
      '当前地点': pick('currentLocation', 'location', '当前地点'),
      '当前时间': pick('currentTime', 'time', '当前时间'),
      '空间状态': pick('spatialState', 'spaceState', '空间状态'),
      '当前动作': pick('currentAction', 'action', '当前动作'),
      '强制出场': pick('forcedParticipants', 'forced', '强制出场'),
      '高优先候选': pick('priorityCandidates', 'priority', '高优先候选'),
      '戏剧候选': pick('dramaCandidates', 'drama', '戏剧候选'),
      '禁止出场': pick('forbiddenParticipants', 'forbidden', '禁止出场'),
      '随机事件影响': pick('randomEventImpact', 'randomEvent', '随机事件影响'),
      '正文写作重点': pick('writingFocus', 'focus', '正文写作重点'),
      '当前场景影响对象': this.sceneAnchorJsonText(sceneImpactObjects),
    };
    const hardAnchors = ['当前地点', '当前时间', '空间状态', '当前动作'];
    const missingHardAnchor = hardAnchors.some((key) => !String(values[key] || '').trim());
    if (missingHardAnchor || !values['正文写作重点'] || !values['当前场景影响对象']) throw new Error('场景锚定报告解析错误请重试');
    this.assertSceneParticipantBoundary(values);
    const orderedText = this.sceneAnchorFields().map((key) => `${key}：${values[key] || ''}`).join('\n');
    const currentSceneImpactObjects = values['当前场景影响对象'] || '';
    this.sceneAnchorDebug('accepted-scene-anchor-json', { values, sceneImpactObjects });
    return { text: orderedText, currentLocation: values['当前地点'] || '', currentTime: values['当前时间'] || '', writingFocus: values['正文写作重点'] || '', currentSceneImpactObjects, settlementBoundary: currentSceneImpactObjects, sceneImpactObjects, values, parseScore: { score: this.sceneAnchorFields().length, maxScore: this.sceneAnchorFields().length, successRate: 1 }, parseDegraded: false, format: 'json' };
  },

  sceneAnchorDebug(event = '', payload = null) {
    try {
      if (payload === null || payload === undefined) {
        console.debug(`[场景锚定调试] ${event}`);
        return;
      }
      console.debug(`[场景锚定调试] ${event}`, payload);
    } catch (_) { /* ignore debug logging failures */ }
  },

  normalizeSceneAnchorImpactObjects(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      this.sceneAnchorDebug('invalid-impact-objects-shape', { value });
      throw new Error('currentSceneImpactObjects 必须是 JSON object');
    }
    const allowedKeys = ['people', 'locations', 'items', 'systems', 'summary'];
    const unknownKeys = Object.keys(value).filter((key) => !allowedKeys.includes(key));
    if (unknownKeys.length) {
      this.sceneAnchorDebug('invalid-impact-objects-keys', { unknownKeys, value });
      throw new Error(`currentSceneImpactObjects 只允许 keys: ${allowedKeys.join(', ')}`);
    }
    const normalizeList = (key) => {
      const raw = value[key];
      if (raw === undefined || raw === null) return [];
      if (!Array.isArray(raw)) {
        this.sceneAnchorDebug('invalid-impact-objects-list', { key, value: raw });
        throw new Error(`currentSceneImpactObjects.${key} 必须是数组`);
      }
      const list = raw.map((item, index) => {
        if (typeof item !== 'string') {
          this.sceneAnchorDebug('invalid-impact-objects-item-type', { key, index, value: item });
          throw new Error(`currentSceneImpactObjects.${key}[${index}] 必须是字符串`);
        }
        const text = String(item || '').trim();
        if (!text) {
          this.sceneAnchorDebug('invalid-impact-objects-item-empty', { key, index, value: item });
          throw new Error(`currentSceneImpactObjects.${key}[${index}] 不能为空字符串`);
        }
        return text;
      });
      return [...new Set(list)];
    };
    const summaryRaw = value.summary;
    if (summaryRaw !== undefined && summaryRaw !== null && typeof summaryRaw !== 'string') {
      this.sceneAnchorDebug('invalid-impact-objects-summary-type', { value: summaryRaw });
      throw new Error('currentSceneImpactObjects.summary 必须是字符串');
    }
    const groups = {
      people: normalizeList('people'),
      locations: normalizeList('locations'),
      items: normalizeList('items'),
      systems: normalizeList('systems'),
      summary: String(summaryRaw || '').trim(),
    };
    const hasContent = groups.people.length || groups.locations.length || groups.items.length || groups.systems.length || groups.summary;
    if (!hasContent) {
      this.sceneAnchorDebug('invalid-impact-objects-empty', { value });
      throw new Error('currentSceneImpactObjects 不能为空对象');
    }
    return groups;
  },

  sceneAnchorJsonText(value) {
    if (value === undefined || value === null) return '';
    if (Array.isArray(value)) return value.map((item) => this.sceneAnchorJsonText(item)).filter(Boolean).join('、');
    if (typeof value === 'object') {
      const direct = value.name || value.characterName || value.idOrName || value.id || value.text || value.value || value.summary || value.description;
      const reason = value.reason || value.evidence || value.rationale || value['理由'];
      if (direct && !this.sceneAnchorHasImpactGroups(value)) return reason ? `${String(direct).trim()}（${String(reason).trim()}）` : String(direct).trim();
      const groups = [
        ['people', '人物'], ['persons', '人物'], ['characters', '人物'],
        ['locations', '地点'], ['places', '地点'],
        ['items', '物品'], ['objects', '物品'],
        ['systems', '系统'], ['facts', '事实'],
      ].map(([key, label]) => {
        const text = this.sceneAnchorJsonText(value[key]);
        return text ? `${label}：${text}` : '';
      }).filter(Boolean);
      const summary = this.sceneAnchorJsonText(value.summary || value.description);
      if (summary && !groups.some((item) => item.includes(summary))) groups.push(`摘要：${summary}`);
      return groups.join('；') || JSON.stringify(value);
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
    return new Set(this.splitNameList(value).map((item) => {
      const text = String(item || '').trim();
      if (/^无\s*(?:[（(].*[）)])?\s*$/u.test(text)) return '';
      return String(this.parseParticipantToken(text)?.name || text).replace(/[（(].*$/u, '').trim();
    }).filter(Boolean));
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
      const raw = await this.completeConfiguredStep(store, prompt, logId, false, { ...config, sourceTitle: `${config.label}Stage2 场景锚定`, promptId: 'inference-stage2-scene-anchor' });
      try {
        const data = this.parseSceneAnchorReport(raw, config);
        if (!best || data.parseScore.successRate >= best.data.parseScore.successRate) best = { raw, data, text: data.text };
        return best;
      } catch (err) {
        lastErr = err;
        prompt = `${prompt}\n\n上次场景锚定 JSON 解析失败：${err.message}。请重新输出一个合法 JSON object，必须包含 currentLocation、currentTime、spatialState、currentAction、writingFocus、currentSceneImpactObjects。`;
      }
    }
    if (best) return best;
    throw lastErr || new Error('场景锚定报告解析错误请重试');
  },

  buildConfiguredNarrationMessages({ store, action, prompt = '', config = this.realConfig() }) {
    const actionText = this.actionText(action, config.mode === 'story' ? '继续推进操控剧情' : '继续观察现实世界');
    const priorKvCount = config.kvCacheSession?.messages?.length || 0;
    const recent = priorKvCount ? '' : this.recentNarrationForMessages(store, config);
    const messages = [{ role: 'user', content: String(prompt || '') }];
    if (recent) messages.push({ role: 'assistant', content: recent });
    messages.push({ role: 'user', content: `根据前面的规则与资料，推演“本次行动”，字数必须在2000 - 3000字之间。\n本次行动：${actionText}` });
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

  async buildConfiguredNarrationPrompt({ store, action, base, loaded, skills, materialSession = null, sceneAnchorReport = '', effectiveSceneLayers = null, config = this.realConfig() }) {
    const actionText = this.actionText(action, config.mode === 'story' ? '继续推进操控剧情' : '继续观察现实世界');
    const narrationContext = config.ctx.buildNarrationContext?.({ store, action: actionText, config }) || this.compactUpdatePromptText(base, 1600);
    const loadedText = config.ctx.loadedNarrationSummary?.(loaded) || config.ctx.buildLoadedText(loaded) || '无';
    const writingStyle = store.selectedWritingStylePrompt?.() || store.writingStylePrompt?.() || '正文采用小说文风，重视画面、动作、感官和心理反应，避免复述玩家指令。';
    const eventNarrationContext = store.eventNarrationPromptContext?.(actionText) || '';
    const newsNarrationContext = store.newsNarrationPromptContext?.(actionText) || '';
    const controlPerspectiveRule = this.configuredControlPerspectiveRule(store, config);
    const modeRule = config.mode === 'story'
      ? `推演自由度：${this.storyFreedomRule(store)}\n玩家不是角色本人，而是操控/影响被操控者行动的存在；正文必须写出本次行动的动作过程、环境变化、其他人物反应、被操控者身体与心理张力、直接结果。`
      : `推演自由度：${store.realWorldFreedomRule?.() || '只推演玩家本次输入行动自然抵达的直接结果。'}`;
    const activeRoleRules = [
      '角色主动性推演规则：',
      '- 正文必须把出场角色写成会自主判断和行动的人，而不是等待玩家继续输入才回应的道具。',
      '- 角色反应必须广而全地综合性格、爱好、背景、成长经历、价值取向、当前处境、地点、时间、与玩家关系、好感/信任/依赖/警惕/反感、欲望/肉欲、身体状态、已知信息、近期事件、长期目标和当前压力。',
      '- 主动行为必须基于已有上下文和连续性，不能凭空改写角色性格、关系、记忆、地点或已发生事实。',
      '- 角色认知必须有边界：只能依据自己看见、听见、记得、推断得到或被告知的内容行动；未知秘密不能当作已知，但可以写出误会、试探、猜测、戒备或装作不知道。',
      '- 主动性要有生活真实感：主动不只等于靠近或推进，也包括拒绝、沉默、观察、拖延、逃避、找借口、讲条件、试探、转移话题、整理物品、关灯、看手机、确认时间或压低声音。',
      '- 角色动机可以互相拉扯：亲近与害羞、欲望与矜持、好感与警惕、疲惫与责任、讨好与自尊、依赖与防备都可以同时存在，并通过动作、语气、停顿、眼神或选择体现。',
      '- 情绪和关系必须有惯性：不要让角色因为一句话瞬间完全转向；除非有强触发，否则用细微变化、试探、克制、压抑、犹豫、回避或逐步升级表现变化。',
      '- 主动性不能抢夺玩家控制权：角色可以主动提出、拒绝、靠近、离开、设条件或诱导，但不要替玩家决定下一步新行动。',
      '- 时间很晚、地点不合适、关系不足、好感不够、性格高冷/谨慎/警惕或边界被触碰时，角色应主动设限、要求休息/睡觉、要求离开、拒绝接触、保持距离或明确制止。',
      '- 气氛、关系、好感/信任、欲望/肉欲、私密性、性格主动性与 consent 都支持时，角色可以自然主动靠近、讨好、诱导、表达需求或提出亲密要求；不得跳过必要条件或自动扩展到未输入的新阶段。',
      '- 若角色足够了解玩家，并且性格与关系支持，应让角色利用这份了解主动投其所好、安抚弱点、迎合偏好或用玩家在意的事物讨好/诱导。',
      '- 创造性必须服务于栩栩如生而不是破坏设定：可以补全符合上下文的小动作、停顿、语气、眼神、身体距离、生活物件、惯用表达、临场选择和微妙心理变化。',
    ].join('\n');
    const narrationRules = '行动范围内充分推演：先做一次紧凑内部梗概，不逐句解释或逐 token 分析；梗概要判断玩家意图、行动可行性、关键角色反应、行动是否成立和即时落点。若行动在任何一步被角色、现实条件、能力边界、关系边界或场景因果打断，确定具体打断点，正文只写到打断事实及即时反应；不替玩家执行下一步新行动，也不得替玩家决定继续尝试、解释、道歉、反抗、接受、离开或其它后续选择，等待下一轮玩家行动。行动完整成立时也只写本次输入的直接短期结果，不自动开启下一步新行动。写出本次行动的动作过程、身体感受、周围环境变化、可见细节、他人反应和对话回应；场景锚定报告中的强制出场必须在正文中实际出现、行动或回应；不把亲吻、抚摸、摩擦、按住等行为自动扩展为脱衣、转移地点、插入、高潮等未输入的新阶段。除“你”外每次写角色姓名必须使用 <role id="真实ID">姓名</role>。';
    const completenessRules = [
      '正文完整性规则：',
      '- 正文必须形成完整小段落：进入动作 → 现场反馈 → 对方反应 → 短期结果落点。',
      '- 即使本次行动因边界、consent、年龄、关系或安全限制不能继续描写，也不得短输出。',
      '- 若不能描写玩家输入中的某些肢体或性化细节，必须改写为允许描写的现场反应：角色察觉、制止、后退、质问、沉默、情绪变化、房间环境声响变化、进入方式、触发反应、双方距离变化、语言/沉默、身体姿态，但必须根据已有资料符合逻辑。',
      '- 不要只写“她在房间里”或只写场景开头；必须把本次行动推演到一个明确的即时落点。',
      '- 目标长度 2000 - 3000 字；低于 2000 字视为不合格，不要提前停止。',
      '- 强制输出结构只作为内部写作配比，最终正文仍必须是无标题、无编号、无换行的单段小说正文；唯一允许的标记是 <role id="…">姓名</role> 与 <force id="…">势力名</force>。',
      '- 每一次写出势力/组织/公司正式名称时，必须使用势力标签 <force id="真实ID">势力名</force>；id 必须来自势力标签清单。',
      '- 环境五感渲染约300-400字：写出此刻场景中的气味、光线、触感。',
      '- 角色内心独白约500-700字：围绕上一轮事件或本次行动带来的心理挣扎、试探或算计展开，必须使用比喻句。',
      '- 对话与动作细节约占正文一半：放慢动作，写清楚衣料摩擦声、眼神偏移、手部小动作、距离变化和对话回应。',
      '- 悬念/决策钩子约200-300字：本轮结束时写出心理转向或下一步压力，但不替玩家执行下一步行动。',
      '- 若动作本身很短，就按上述四块扩展当前阶段内部细节，而不是开启下一步新行动。',
      '- 禁止把“NPC反问玩家/等待玩家说明来意/门口刚打开”当作最终落点；必须继续写到进入、被拒、落座、对峙、距离变化或关系张力变化等本次行动的直接结果。',
      '禁止越界不是禁止写长：不允许为了字数推进到新阶段；但必须充分描写当前阶段内部细节。',
    ].join('\n');
    const roleTagGuide = window.GameModules.narrationRoleMarkup?.buildRoleTagGuide?.(effectiveSceneLayers, store)
      || '无合法角色标签清单；除“你”外不得引入未建卡角色姓名。';
    return this.renderPrompt('inference-stage3-narration', {
      模式标签: config.label,
      本次行动: actionText,
      基础上下文: [this.continuityFallbackRule(), `小说笔风：${writingStyle}`, modeRule, controlPerspectiveRule, activeRoleRules, narrationRules, completenessRules, eventNarrationContext, newsNarrationContext, narrationContext].filter(Boolean).join('\n'),
      场景锚定报告: sceneAnchorReport || '无',
      已动态载入资料: loadedText || '无',
      出场角色标签清单: roleTagGuide,
      紧凑返回规则: this.compactReturnRule('prose'),
    });
  },

  enforceNarrationRoleMarkup(narration = '', layers = null, store = null) {
    const markup = window.GameModules.narrationRoleMarkup;
    if (!markup?.enforce) return String(narration || '').trim();
    return markup.enforce(narration, layers, store);
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
    const roleMentions = window.GameModules.narrationRoleMarkup?.extractRoleMentions?.(text) || [];
    roleMentions.forEach((item) => addCharacter(item.id, item.name, 'narration-mentioned'));
    if (!roleMentions.length) {
      Object.values(store?.rpgStates || {}).forEach((state) => {
        const name = String(state?.profile?.name || state?.name || '').trim();
        if (!name || !text.includes(name)) return;
        addCharacter(state.id, name, 'narration-mentioned');
      });
    }
    return out.slice(0, 12);
  },

  sceneAnchorParticipants(sceneAnchor = null, store = null) {
    const values = sceneAnchor?.values || sceneAnchor || {};
    const sceneImpactObjects = sceneAnchor?.sceneImpactObjects || this.sceneAnchorImpactGroups(sceneAnchor?.currentSceneImpactObjects);
    const playerName = String(store?.playerName || store?.playerProfile?.name || store?.realWorldPlayerSettlementName?.() || '').trim();
    const forced = ['强制出场'].flatMap((key) => this.splitNameList(values[key] || '').map((raw) => {
      const parsed = this.parseParticipantToken(raw);
      const name = String(parsed?.name || raw || '').replace(/[（(].*$/u, '').trim();
      const id = String(parsed?.id || '').trim();
      return name && !['无', '玩家', '系统', playerName].includes(name)
        ? { type: 'character', id: id || undefined, idOrName: id || name, name, role: 'current-scene', canSettle: true }
        : null;
    }).filter(Boolean));
    const fromImpactPeople = (Array.isArray(sceneImpactObjects?.people) ? sceneImpactObjects.people : []).map((name) => {
      const clean = String(name || '').trim();
      return clean && !['无', '玩家', '系统', playerName].includes(clean)
        ? { type: 'character', id: undefined, idOrName: clean, name: clean, role: 'current-scene', canSettle: true }
        : null;
    }).filter(Boolean);
    const merged = [...forced, ...fromImpactPeople];
    this.sceneAnchorDebug('scene-anchor-participants', { forced, fromImpactPeople, merged });
    return merged;
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
      const byName = window.GameModules.characterStateStore?.getByName?.(key);
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

  eventSettlementType() {
    return '事件';
  },

  normalizeSettlementEventEntry(entry = {}, store = null, config = this.realConfig()) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
    const text = (value) => String(value ?? '').trim();
    const rawType = text(entry.type ?? entry.eventType ?? entry['事件类型'] ?? entry.category ?? '');
    const type = /periodic|cycle|周期/u.test(rawType)
      ? 'periodic'
      : (/inference|推演|大地图|地图事件|活动事件|map|world/u.test(rawType) ? 'inference' : '');
    // 未知类型不默认写库，避免把人员约定误落成事件
    if (!type) return null;
    const title = text(entry.title ?? entry.name ?? entry.eventName ?? entry['事件名'] ?? '');
    const content = text(entry.content ?? entry.detail ?? entry.summary ?? entry['事件内容'] ?? '');
    if (!title || !content) return null;
    return window.GameModules.eventSystem?.normalizeEvent?.({
      ...entry,
      type,
      title,
      content,
      startDate: entry.startDate ?? entry.start ?? entry.timeStart ?? entry['开始时间'] ?? entry['事件开始时间'] ?? entry['事件发生时间段'],
      endDate: entry.endDate ?? entry.end ?? entry.timeEnd ?? entry['结束时间'] ?? entry['事件结束时间'],
      location: entry.location ?? entry.place ?? entry['事件发生地点'],
      people: entry.people ?? entry.relatedPeople ?? entry.participants ?? entry['事件相关人']
        ?? ((type === 'periodic' || type === 'inference') ? ['所有人'] : []),
      tags: entry.tags ?? entry.eventTags ?? entry['事件标签'] ?? [],
      source: entry.source || 'stage4',
      status: entry.status || 'active',
    }, store) || null;
  },

  stage4SettlementPasses(config = this.realConfig(), store = null) {
    const story = config.mode === 'story';
    const realPossessed = config.mode === 'real' && Boolean(store?.sharedControlState?.());
    const controlTypes = (story || realPossessed) ? ['操控体验'] : [];
    return [
      { id: 'stage4-1', label: 'Stage4-1 基础结算', promptId: 'inference-stage4-basic', types: ['基础结算'] },
      { id: 'stage4-2', label: 'Stage4-2 情绪与感觉', promptId: 'inference-stage4-emotion-feeling', types: ['情绪', '感觉'] },
      { id: 'stage4-3', label: 'Stage4-3 生命体征', promptId: 'inference-stage4-vitals', types: ['生命体征'] },
      { id: 'stage4-4', label: 'Stage4-4 身体与穿着', promptId: 'inference-stage4-body-wearing', types: ['身体状态', '穿着状态'] },
      { id: 'stage4-5', label: 'Stage4-5 亲密与性经历', promptId: 'inference-stage4-intimacy-history', types: ['性经历', '性历史'] },
      { id: 'stage4-6', label: 'Stage4-6 关系与长期目标', promptId: 'inference-stage4-relationship-goal', types: ['关系', '长期目标'] },
      { id: 'stage4-7', label: 'Stage4-7 人事安排', promptId: 'inference-stage4-schedule', types: ['人事安排'] },
      { id: 'stage4-8', label: 'Stage4-8 角色卡资料', promptId: 'inference-stage4-role-card-profile', types: ['角色卡', '人事归属'] },
      { id: 'stage4-9', label: 'Stage4-9 角色卡物品', promptId: 'inference-stage4-role-card-items', types: ['角色卡物品'] },
      { id: 'stage4-10', label: 'Stage4-10 系统记录与事件', promptId: 'inference-stage4-system-events', types: ['系统记录', '通用固化', this.eventSettlementType()] },
      { id: 'stage4-11', label: 'Stage4-11 操控体验', promptId: 'inference-stage4-control-experience', types: controlTypes },
      { id: 'stage4-12', label: 'Stage4-12 角色卡补充更新', promptId: 'inference-stage4-role-card-review', types: ['角色卡复核'] },
    ];
  },

  settlementTypeQueue(config = this.realConfig(), store = null) {
    return this.stage4SettlementPasses(config, store).flatMap((pass) => pass.types || []).filter(Boolean);
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
      [this.eventSettlementType()]: { title: '事件结算', format: '数组；每项 {"type":"inference|periodic","title":"事件名","startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD","location":"地点","content":"内容","people":["所有人或受众标签"],"tags":["标签"],"status":"active"}；inference=大地图/活动；无事件 []' },
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
      '角色卡物品': { title: '角色卡物品结算', format: '数组；每项 {"subject":"姓名","action":"add|update|remove|consume|equip|unequip|transfer|replace","itemName":"物品名","item":{},"quantity":1,"slot":"装备槽","to":"目标角色","reason":"正文证据"}；无变化 []' },
      '角色卡复核': { title: '角色卡补充更新', format: '数组；每项 {"subject":"姓名","field":"标准字段或 profile.* 路径","op":"替换|增加|删除|合并","value":"新值或 JSON 值","reason":"正文、上下文与前序结算后的补充更新证据"}；无变化 []' },
      '长期目标': { title: '长期目标结算', format: '数组；每项可含 subject、short/medium/long（content/deadline/progress/detail）、achievement、reason；无变化 []' },
      '物品': { title: '物品结算', format: '更新N：结算主体，物品类型，物品名，事实或变化，变化原因' },
      '地图': { title: '地图结算', format: '更新N：结算主体，当前位置/上级地点/地点事实/地图节点/路线事实，事实，原因' },
      '领土控势': { title: '领土控势结算', format: '更新N：地点名，实控组织/宣称组织/控势状态，事实，原因' },
      '人事安排': { title: '人事安排结算', format: '更新N：结算主体，当前安排，地点/行动/可用（可省略无变化项），变化原因' },
      '势力总览': { title: '势力总览结算', format: '更新N：结算主体，新增势力/上层势力归属/势力APP归属，事实，原因' },
      '政体状态': { title: '政体状态结算', format: '更新N：组织名，status/legitimacy/successorId，事实，原因' },
      '势力结构': { title: '势力结构结算', format: '更新N：结算主体，部门角色/职位/成员地位，事实，原因' },
      '组织能力': { title: '组织总览五面板结算', format: '更新N：组织名，面板(ideology/economy/politics/military/diplomacy/territory)，字段名，事实，原因；均按固定清单与 value JSON 规范' },
      '人事归属': { title: '人事归属结算', format: '更新N：角色名，组织/部门/职位，事实，原因' },
      '系统记录': { title: '系统记录结算', format: '更新N：结算主体，事件/记录/通信消息/剧情记录/状态，事实，原因' },
      '通用固化': { title: '通用固化结算', format: '更新N：结算主体，字段，稳定事实，变化原因' },
      '操控体验': { title: '操控体验结算', format: '数组；每项先确认 needUpdate 与 updateFields；needUpdate=false 时可不填字段值；needUpdate=true 时 adaptation 写增量(+N/-N)，其余文本字段基于原基线生成完整新文本直接覆盖；上线次数由系统每次+1，AI不要输出 onlineCount' },
    };
  },

  settlementUpdateCatalog() {
    return {
      '情绪': { updateType: 'emotion', fieldPrefix: 'metrics.emotions' },
      '感觉': { updateType: 'feeling', fieldPrefix: 'metrics.playerFeelings' },
      '生命体征': { updateType: 'vital', fieldMap: { '生命力': 'vitals.vitality', '精力': 'vitals.stamina_pool', '饱食度': 'vitals.satiety', '水分': 'vitals.hydration', '疲劳': 'vitals.fatigue', '精神稳定': 'vitals.mental_stability' } },
      '身体状态': { updateType: 'body-status', fieldPrefix: 'bodyStatus' },
      '穿着状态': { updateType: 'wearing-state', fieldPrefix: 'profile.wearingItems' },
      '性经历': { updateType: 'sexual-experience', fieldPrefix: 'intimacy.sexualExperienceParts' },
      '性历史': { updateType: 'sexual-history', fieldPrefix: 'intimacy.sexualHistory' },
      '关系': { updateType: 'relationship', fieldPrefix: 'relationships' },
      '角色卡': { updateType: 'role-card', fieldPrefix: 'profile' },
      '长期目标': { updateType: 'character-goal', fieldPrefix: 'profile.goalSystem' },
      '物品': { updateType: 'item', fieldPrefix: 'inventory' },
      '地图': { updateType: 'map', fieldMap: { '当前位置': 'current', '上级地点': 'parent', '地点事实': 'descriptionFacts', '地图节点': 'mapNodes', '路线事实': 'routeLinks' } },
      '领土控势': { updateType: 'territory-control', fieldPrefix: 'control' },
      '势力总览': { updateType: 'faction-overview', fieldPrefix: 'overview.factions' },
      '政体状态': { updateType: 'org-status', fieldPrefix: 'status' },
      '势力结构': { updateType: 'faction-structure', fieldPrefix: 'structure' },
      '组织能力': { updateType: 'org-overview-panel', fieldPrefix: 'overviewPanels' },
      '人事归属': { updateType: 'membership', fieldPrefix: 'profile.memberships' },
      '系统记录': { updateType: 'system', fieldPrefix: 'events' },
      '通用固化': { updateType: 'generic', fieldPrefix: 'status_tags' },
      '操控体验': { updateType: 'control-experience', fieldPrefix: 'profile.control_experience' },
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
    const [label, key, rawValue, reason, statusPart] = parts;
    const type = label || typeName;
    const entry = catalog[type];
    if (!subject || !key || !rawValue || !reason) return null;
    if (!entry) return this.parseGenericSettlementLine(typeName, line, subject, { requireExplicitGeneric: true });
    let normalizedKey = type === '生命体征' ? this.vitalFieldAlias(key) : key;
    const rawValueText = String(rawValue).trim();
    const delta = Number(rawValueText.replace(/[^-+\d.]/gu, ''));
    const hasSignedDelta = Number.isFinite(delta) && /^[+-]\d/u.test(rawValueText) && delta !== 0;
    if (['情绪', '感觉'].includes(type)) {
      normalizedKey = this.metricAliasForSettlement(type, normalizedKey);
      if (!hasSignedDelta) return null;
    }
    if (entry.fieldMap && !entry.fieldMap[normalizedKey]) return null;
    if (type === '生命体征' && !hasSignedDelta) return null;
    const field = entry.fieldMap?.[normalizedKey] || `${entry.fieldPrefix}.${normalizedKey}`;
    const change = hasSignedDelta ? { mode: 'delta', value: delta } : { mode: 'set', value: rawValue };
    const status = String(statusPart || '').trim();
    if (status && ['情绪', '感觉'].includes(type)) change.status = status;
    return { updateType: entry.updateType, subject, field, change, reasons: [{ trigger: type, evidence: reason, confidence: 'confirmed' }] };
  },

  parseMetricSettlementJsonEntry(typeName = '', entry = {}, subject = null, participants = [], store = null) {
    if (!subject || !entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
    const catalog = this.settlementUpdateCatalog();
    const entryCat = catalog[typeName];
    if (!entryCat) return null;
    const field = this.metricAliasForSettlement(typeName, String(entry.field ?? entry.字段 ?? entry.key ?? '').trim());
    const rawValueText = String(entry.value ?? entry.变化 ?? entry.delta ?? entry.数值 ?? '').trim();
    const delta = Number(rawValueText.replace(/[^-+\d.]/gu, ''));
    const hasSignedDelta = Number.isFinite(delta) && /^[+-]\d/u.test(rawValueText) && delta !== 0;
    const reason = this.settlementJsonText(entry.reason ?? entry.原因 ?? entry.evidence ?? entry.证据 ?? '');
    const status = this.settlementJsonText(entry.status ?? entry.程度 ?? entry.解释 ?? entry.程度说明 ?? '');
    if (!field || !hasSignedDelta || !reason) return null;
    const change = { mode: 'delta', value: delta };
    if (status) change.status = status;
    return { updateType: entryCat.updateType, subject, field: `${entryCat.fieldPrefix}.${field}`, change, reasons: [{ trigger: typeName, evidence: reason, confidence: 'confirmed' }] };
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
    return window.GameModules.metrics.settlementAlias(type, key);
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
    return { updateType: 'wearing-state', subject, field: 'profile.wearingItems', change: { mode: 'upsert', value: { slot, part, name: itemName, state, reason, fullBody: this.isFullBodyWearingPart(part) } }, reasons: [{ trigger: '穿着状态', evidence: reason, confidence: 'confirmed' }] };
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
    const aliasKey = this.bodyPartAlias(part);
    const partKey = this.allowedBodyPartKeys().includes(aliasKey) ? aliasKey : part;
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
    if (/^(?:总次数|总数|全部|总体|合计)$/u.test(String(part || '').trim())) {
      // 总次数由各部位次数求和派生，忽略 AI 单独写入。
      return null;
    }
    const aliasKey = this.sexualPartAlias(part);
    const key = this.allowedSexualPartKeys().includes(aliasKey) ? aliasKey : part;
    const value = { parts: { [key]: delta } };
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
    const availabilityValues = ['在场', '场外', '未知', '暂不可用'];
    if (key === '当前安排' || key === '人事安排' || key === '当前状态') {
      String(rawValue || '').split(/[｜|／/]/u).map((part) => part.trim()).filter(Boolean).forEach((part) => {
        const location = part.match(/^(?:地点|当前地点)\s*[：:]\s*(.+)$/u);
        const action = part.match(/^(?:行动|当前行动)\s*[：:]\s*(.+)$/u);
        const availability = part.match(/^(?:可用|可用状态)\s*[：:]\s*(.+)$/u);
        if (location) value.currentLocation = location[1].trim();
        else if (action) value.currentAction = action[1].trim();
        else if (availability) value.availability = availabilityValues.includes(availability[1].trim()) ? availability[1].trim() : '未知';
        else if (availabilityValues.includes(part)) value.availability = part;
        else if (!value.currentAction) value.currentAction = part;
      });
      if (!value.currentLocation && !value.currentAction && !value.availability) return null;
    } else if (key === '当前地点') value.currentLocation = rawValue;
    else if (key === '当前行动') value.currentAction = rawValue;
    else if (key === '可用状态') {
      value.availability = availabilityValues.includes(rawValue) ? rawValue : '未知';
      if (reason && reason.length >= 4 && !/^(?:正文|证据|明确|无变化)/u.test(reason)) value.currentAction = reason;
    } else if (/当前地点|当前行动|可用状态/u.test(rawValue) && availabilityValues.includes(reason)) {
      if (rawValue === '当前地点') value.currentLocation = key;
      else if (rawValue === '当前行动') value.currentAction = key;
      else if (rawValue === '可用状态') value.availability = availabilityValues.includes(reason) ? reason : '未知';
    } else if (key.length >= 2 && !availabilityValues.includes(key)) {
      value.currentAction = [key, rawValue].filter(Boolean).join('，');
      value.availability = availabilityValues.includes(rawValue) ? rawValue : '在场';
    } else return null;
    value.reason = reason;
    return { updateType: 'character-schedule', subject, field: 'characterSchedules', change: { mode: 'merge', value }, reasons: [{ trigger: '人事安排', evidence: reason, confidence: 'confirmed' }] };
  },

  parseScheduleJsonEntry(entry = {}, subject = null, participants = []) {
    const availabilityValues = ['在场', '场外', '未知', '暂不可用'];
    const t = (value) => this.settlementJsonText(value);
    const resolved = subject || this.settlementJsonSubject('人事安排', entry, participants);
    const subjectType = String(resolved?.type || '').trim();
    if (!resolved || !['character', 'player'].includes(subjectType)) return null;
    const field = t(entry.field ?? entry.字段 ?? entry.key ?? '');
    const rawValue = t(entry.value ?? entry.变化 ?? entry.新值 ?? '');
    const reason = t(entry.reason ?? entry.原因 ?? entry.evidence ?? entry.证据 ?? '');
    const value = {};
    if (entry.currentLocation || entry.地点 || entry.当前地点) value.currentLocation = t(entry.currentLocation ?? entry.地点 ?? entry.当前地点);
    if (entry.currentAction || entry.行动 || entry.当前行动) value.currentAction = t(entry.currentAction ?? entry.行动 ?? entry.当前行动);
    if (entry.availability || entry.可用 || entry.可用状态) {
      const availability = t(entry.availability ?? entry.可用 ?? entry.可用状态);
      value.availability = availabilityValues.includes(availability) ? availability : '未知';
    }
    if (!value.currentLocation && !value.currentAction && !value.availability) {
      if (!field || !rawValue || !reason) return null;
      return this.parseScheduleSettlementLine(`更新N：人事安排，${field}，${rawValue}，${reason}`, resolved, participants);
    }
    if (!reason && !value.reason) {
      // still allow merged objects that only carry schedule fields; reason can come later
    }
    value.reason = reason || t(entry.reason) || '正文明确证据';
    return {
      updateType: 'character-schedule',
      subject: resolved,
      field: 'characterSchedules',
      change: { mode: 'merge', value },
      reasons: [{ trigger: '人事安排', evidence: value.reason, confidence: 'confirmed' }],
    };
  },

  parseGoalJsonEntry(entry = {}, subject = null, participants = []) {
    const t = (value) => this.settlementJsonText(value);
    const resolved = subject || this.settlementJsonSubject('长期目标', entry, participants);
    const subjectType = String(resolved?.type || '').trim();
    if (!resolved || !['character', 'player'].includes(subjectType)) return null;
    const api = window.GameModules.characterGoalSystem;
    const value = {};
    const tiers = api?.resolveTierFromEntry?.(entry) || {};
    ['short', 'medium', 'long'].forEach((key) => {
      const tier = tiers[key] || entry[key];
      if (!tier || typeof tier !== 'object') return;
      const normalized = api?.normalizeTier?.(tier) || tier;
      if (normalized.content || normalized.deadline || normalized.detail || Number(normalized.progress) > 0
        || tier.content !== undefined || tier.deadline !== undefined || tier.progress !== undefined || tier.detail !== undefined) {
        value[key] = {
          content: tier.content !== undefined ? t(tier.content) : undefined,
          deadline: tier.deadline !== undefined ? t(tier.deadline) : undefined,
          progress: tier.progress !== undefined ? tier.progress : undefined,
          detail: (tier.detail ?? tier.progressText ?? tier.progressDesc) !== undefined
            ? t(tier.detail ?? tier.progressText ?? tier.progressDesc)
            : undefined,
        };
        Object.keys(value[key]).forEach((k) => { if (value[key][k] === undefined) delete value[key][k]; });
      }
    });
    const achievements = [];
    if (Array.isArray(entry.achievements)) achievements.push(...entry.achievements.map((item) => t(item?.text || item)).filter(Boolean));
    if (entry.achievement) achievements.push(t(entry.achievement));
    if (entry.阶段成果) {
      if (Array.isArray(entry.阶段成果)) achievements.push(...entry.阶段成果.map((item) => t(item?.text || item)).filter(Boolean));
      else achievements.push(t(entry.阶段成果));
    }
    if (achievements.length === 1) value.achievement = achievements[0];
    else if (achievements.length > 1) value.achievements = achievements;
    const reason = t(entry.reason ?? entry.原因 ?? entry.evidence ?? entry.证据 ?? '');
    if (!Object.keys(value).length) return null;
    value.reason = reason || '正文明确证据';
    return {
      updateType: 'character-goal',
      subject: resolved,
      field: 'profile.goalSystem',
      change: { mode: 'merge', value },
      reasons: [{ trigger: '长期目标', evidence: value.reason, confidence: 'confirmed' }],
    };
  },

  parseSystemSettlementLine(line = '', subject = null, participants = []) {
    let parts = String(line || '').replace(/^更新(?:\d+|N)\s*[：:]/u, '').split(/[，,]/u).map((x) => x.trim());
    if (parts[0] !== '系统记录') {
      if (parts[0] === '系统') {
        parts = ['系统记录', ...parts.slice(1)];
      } else if (this.subjectForSettlement(parts[0], participants)) {
        parts = ['系统记录', ...parts.slice(1)];
      }
    }
    subject = { type: 'system', id: '系统', name: '系统' };
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
      const allowed = ['当前状态', '身份', '职业', '技能', '知识', '外貌', '性格', '喜好', '人物说明', '社群角色', '人事归属', '证书', '称号', '人际关系'];
      if (!field || !op || !value || !['替换', '增加'].includes(op) || !allowed.includes(field)) return null;
      return this.buildRoleCardSettlementUpdate(subject, field, op, value, reason, result);
    }
    return null;
  },

  roleCardFieldPath(field = '') {
    const map = {
      当前状态: 'status_tags',
      身份: 'profile.role',
      职业: 'profile.job',
      技能: 'profile.skills',
      知识: 'profile.knowledge',
      外貌: 'profile.appearance',
      性格: 'profile.personality',
      喜好: 'profile.preferences',
      人物说明: 'profile.detail',
      社群角色: 'profile.factions',
      人事归属: 'profile.memberships',
      证书: 'profile.certificates',
      称号: 'profile.titles',
      人际关系: 'profile.relationships',
    };
    return map[String(field || '').trim()] || '';
  },

  normalizeFactionRoleSettlementValue(raw = '', reason = '') {
    const social = window.GameModules.socialPosition;
    if (Array.isArray(raw)) return raw.map((item) => this.normalizeFactionRoleSettlementValue(item, reason)).filter(Boolean);
    if (raw && typeof raw === 'object') {
      const faction = String(raw.faction || raw.community || raw.name || '').trim();
      const role = String(raw.role || raw.position || '').trim();
      if (!faction || !role) return null;
      return social?.item?.(faction, role, reason || raw.reason || '') || { name: `${faction} / ${role}`, faction, community: faction, role, reason: reason || raw.reason || '' };
    }
    const text = String(raw?.value ?? raw ?? '').trim();
    if (!text) return null;
    const parts = text.split(/[/／]/).map((part) => String(part || '').trim()).filter(Boolean);
    if (parts.length !== 2) return null;
    const [community, title] = parts;
    return social?.item?.(community, title, reason) || { name: `${community} / ${title}`, faction: community, community, role: title, reason };
  },

  normalizeMembershipSettlementValue(raw = '', reason = '') {
    const social = window.GameModules.socialPosition;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const orgName = String(raw.orgName || raw.force || raw.name || raw.组织 || raw.组织名 || '').trim();
      const title = String(raw.title || raw.position || raw.职位 || raw.岗位 || '').trim();
      if (!orgName || !title) return null;
      const department = String(raw.department || raw.部门 || '').trim();
      return social?.membershipItem?.(orgName, title, reason || raw.reason || '', null, {
        department,
        departmentFog: raw.departmentFog !== false && !department,
        state: raw.state || 'sketch',
        orgId: raw.orgId || '',
      }) || {
        orgName,
        orgId: String(raw.orgId || '').trim(),
        title,
        department,
        departmentFog: raw.departmentFog !== false && !department,
        state: raw.state || 'sketch',
        reason: reason || raw.reason || '',
      };
    }
    const text = String(raw?.value ?? raw ?? '').trim();
    if (!text) return null;
    const parts = text.split(/[/／]/).map((part) => String(part || '').trim()).filter(Boolean);
    if (parts.length < 2 || parts.length > 3) return null;
    const orgName = parts[0] || '';
    const title = parts.length === 3 ? parts[2] : parts[1];
    const department = parts.length === 3 ? parts[1] : '';
    if (!orgName || !title) return null;
    return social?.membershipItem?.(orgName, title, reason, null, { department, departmentFog: !department }) || {
      orgName,
      title,
      department,
      departmentFog: !department,
      state: 'sketch',
      reason,
    };
  },

  normalizeCertificateSettlementValue(raw = '', reason = '') {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const orgName = String(raw.orgName || raw.organization || raw.组织 || raw.授予组织 || '').trim();
      const field = String(raw.field || raw.domain || raw.领域 || '').trim();
      const level = String(raw.level || raw.qualification || raw.等级 || raw.资格 || '').trim();
      if (!orgName || !field || !level) return null;
      return { orgName, field, level, reason: reason || raw.reason || '' };
    }
    const parts = String(raw?.value ?? raw ?? '').split(/[/／]/).map((part) => part.trim()).filter(Boolean);
    if (parts.length !== 3) return null;
    return { orgName: parts[0], field: parts[1], level: parts[2], reason };
  },

  normalizeTitleSettlementValue(raw = '', reason = '') {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const society = String(raw.society || raw.community || raw.群体 || raw.认可群体 || '').trim();
      const field = String(raw.field || raw.domain || raw.领域 || '').trim();
      const title = String(raw.title || raw.name || raw.称号 || '').trim();
      if (!society || !field || !title) return null;
      return { society, field, title, reason: reason || raw.reason || '' };
    }
    const parts = String(raw?.value ?? raw ?? '').split(/[/／]/).map((part) => part.trim()).filter(Boolean);
    if (parts.length !== 3) return null;
    return { society: parts[0], field: parts[1], title: parts[2], reason };
  },

  buildRoleCardSettlementUpdate(subject, field = '', op = '增加', value = '', reason = '', result = '') {
    const mode = op === '替换' ? 'set' : 'append';
    const identityFields = ['社群角色', '人事归属', '证书', '称号'];
    const effectiveReason = String(reason || (value && typeof value === 'object' && !Array.isArray(value) ? value.reason : '') || '').trim();
    if (identityFields.includes(field) && !effectiveReason) return null;
    if (field === '社群角色') {
      const item = this.normalizeFactionRoleSettlementValue(value, effectiveReason);
      if (!item) return null;
      return {
        updateType: 'role-card',
        subject,
        field: 'profile.factions',
        change: { mode, value: mode === 'set' ? (Array.isArray(item) ? item : [item]) : item },
        reasons: [{ trigger: `角色卡${op}`, evidence: effectiveReason, confidence: 'confirmed' }],
      };
    }
    if (field === '人事归属') {
      const patch = this.normalizeMembershipSettlementValue(value, effectiveReason);
      if (!patch) return null;
      return {
        updateType: 'membership',
        subject,
        field: 'profile.memberships',
        change: { mode: 'upsert', value: patch },
        reasons: [{ trigger: `角色卡${op}`, evidence: effectiveReason, confidence: 'confirmed' }],
      };
    }
    if (field === '证书' || field === '称号') {
      const item = field === '证书'
        ? this.normalizeCertificateSettlementValue(value, effectiveReason)
        : this.normalizeTitleSettlementValue(value, effectiveReason);
      if (!item) return null;
      return {
        updateType: 'role-card',
        subject,
        field: field === '证书' ? 'profile.certificates' : 'profile.titles',
        change: { mode, value: mode === 'set' ? [item] : item },
        reasons: [{ trigger: `角色卡${op}`, evidence: effectiveReason, confidence: 'confirmed' }],
      };
    }
    const path = this.roleCardFieldPath(field);
    if (!path) return null;
    if (path === 'status_tags') {
      return {
        updateType: 'role-card',
        subject,
        field: 'status_tags',
        change: { mode: op === '替换' ? 'set' : 'append', value: { value, reason, result } },
        reasons: [{ trigger: `角色卡${op}`, evidence: reason || value, confidence: 'confirmed' }],
      };
    }
    const listPaths = new Set(['profile.skills', 'profile.knowledge', 'profile.certificates', 'profile.titles']);
    const text = typeof value === 'object' && value && !Array.isArray(value) && value.value != null
      ? value.value
      : value;
    if (listPaths.has(path)) {
      return {
        updateType: 'role-card',
        subject,
        field: path,
        change: { mode: op === '替换' ? 'set' : 'append', value: text },
        reasons: [{ trigger: `角色卡${op}`, evidence: reason || String(text || ''), confidence: 'confirmed' }],
      };
    }
    // 文本型角色卡字段统一 set；「增加」表示写入/覆盖稳定新值，避免把 {value,reason} 对象写进字符串字段
    return {
      updateType: 'role-card',
      subject,
      field: path,
      change: { mode: 'set', value: String(text ?? '') },
      reasons: [{ trigger: `角色卡${op}`, evidence: reason || String(text || ''), confidence: 'confirmed' }],
    };
  },

  roleCardItemAction(raw = {}) {
    const action = String(raw.action ?? raw.操作 ?? raw.op ?? '').trim().toLowerCase();
    const map = {
      新增: 'add', 增加: 'add', 添加: 'add', add: 'add',
      修改: 'update', 更新: 'update', update: 'update', set: 'update',
      删除: 'remove', 移除: 'remove', 丢弃: 'remove', remove: 'remove', delete: 'remove',
      使用: 'consume', 消耗: 'consume', consume: 'consume', use: 'consume',
      装备: 'equip', equip: 'equip',
      卸下: 'unequip', 脱下: 'unequip', unequip: 'unequip',
      转交: 'transfer', 交给: 'transfer', transfer: 'transfer',
      替换: 'replace', replace: 'replace',
    };
    return map[action] || '';
  },

  parseRoleCardItemJsonEntry(entry = {}, subject = null, participants = []) {
    if (!subject || !entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
    const action = this.roleCardItemAction(entry);
    const item = entry.item && typeof entry.item === 'object' && !Array.isArray(entry.item) ? { ...entry.item } : {};
    const itemName = String(entry.itemName ?? entry['物品名'] ?? entry.name ?? item.name ?? '').trim();
    const reason = this.settlementJsonText(entry.reason ?? entry['原因'] ?? entry.evidence ?? entry['证据'] ?? '');
    const quantity = Math.max(1, Math.floor(Number(entry.quantity ?? entry['数量'] ?? item.quantity ?? 1) || 1));
    const slot = String(entry.slot ?? entry['装备槽'] ?? item.slot ?? '').trim();
    const targetName = String(entry.to ?? entry.target ?? entry['目标角色'] ?? '').trim();
    if (!action || !reason || (action !== 'replace' && !itemName) || (action === 'equip' && !slot) || (action === 'transfer' && !targetName)) return null;
    if (itemName) item.name = itemName;
    if (entry.description ?? entry['描述'] ?? item.description) item.description = String(entry.description ?? entry['描述'] ?? item.description).trim();
    item.quantity = quantity;
    const target = targetName ? this.subjectForSettlement(targetName, participants) : null;
    if (action === 'transfer' && !target) return null;
    return {
      updateType: 'inventory-operation',
      subject,
      field: 'profile.items',
      change: { mode: 'operation', value: { action, itemName, item, quantity, slot, target: target || null, reason, replaceItems: Array.isArray(entry.items) ? entry.items : null } },
      reasons: [{ trigger: `角色卡物品${action}`, evidence: reason, confidence: 'confirmed' }],
    };
  },

  roleCardReviewFieldPath(field = '') {
    const text = String(field || '').trim();
    const standard = this.roleCardFieldPath(text);
    if (standard) return standard;
    if (text === 'status_tags') return text;
    if (!/^profile\.[A-Za-z0-9_\u4e00-\u9fff.-]+(?:\.[A-Za-z0-9_\u4e00-\u9fff.-]+)*$/u.test(text)) return '';
    if (/(?:__proto__|prototype|constructor|roleCardUpdatedAt|roleCardInputSignature)$/iu.test(text)) return '';
    return text;
  },

  parseRoleCardReviewJsonEntry(entry = {}, subject = null, participants = []) {
    if (!subject || !entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
    const field = this.roleCardReviewFieldPath(entry.field ?? entry['字段'] ?? entry.path ?? entry['路径'] ?? '');
    const rawOp = String(entry.op ?? entry['操作'] ?? entry.mode ?? '替换').trim();
    const op = { 替换: 'set', 增加: 'append', 删除: 'remove', 合并: 'merge', set: 'set', append: 'append', remove: 'remove', merge: 'merge' }[rawOp] || '';
    const value = entry.value ?? entry['新值'] ?? entry.data ?? entry['变化'];
    const reason = this.settlementJsonText(entry.reason ?? entry['原因'] ?? entry.evidence ?? entry['证据'] ?? '');
    if (!field || !op || !reason || (value === undefined && op !== 'remove')) return null;
    return {
      updateType: 'role-card',
      subject,
      field,
      change: { mode: op, value: value === undefined ? null : value },
      reasons: [{ trigger: `角色卡复核${rawOp}`, evidence: reason, confidence: 'confirmed' }],
    };
  },

  parseRoleCardJsonEntry(entry = {}, subject = null, participants = []) {
    if (!subject || !entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
    const field = String(entry.field ?? entry.字段 ?? entry.key ?? '').trim();
    const op = String(entry.op ?? entry.操作 ?? '增加').trim();
    const value = entry.value ?? entry.新值 ?? entry.变化 ?? '';
    const reason = this.settlementJsonText(entry.reason ?? entry.原因 ?? entry.evidence ?? entry.证据 ?? '');
    const result = this.settlementJsonText(entry.result ?? entry.结果 ?? value);
    const allowed = ['当前状态', '身份', '职业', '技能', '知识', '外貌', '性格', '喜好', '人物说明', '社群角色', '人事归属', '人际关系'];
    if (!field || !['替换', '增加'].includes(op) || !allowed.includes(field)) return null;
    if (value === undefined || value === null || value === '') return null;
    if (!reason) return null;
    return this.buildRoleCardSettlementUpdate(subject, field, op, value, reason, result);
  },

  parseMembershipJsonEntry(entry = {}, subject = null, participants = []) {
    if (!subject || !entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
    const t = (value) => this.settlementJsonText(value);
    let orgName = t(entry.orgName ?? entry.组织 ?? entry.组织名 ?? entry.force ?? '');
    let title = t(entry.title ?? entry.职位 ?? entry.岗位 ?? entry.position ?? '');
    let department = t(entry.department ?? entry.部门 ?? '');
    let orgId = t(entry.orgId ?? entry.组织ID ?? '');
    const state = t(entry.state ?? entry.状态 ?? 'sketch') || 'sketch';
    let reason = t(entry.reason ?? entry.原因 ?? entry.evidence ?? entry.证据 ?? '');
    if (!orgName || !title) {
      const field = t(entry.field ?? entry.字段 ?? entry.key ?? '');
      const value = t(entry.value ?? entry.新值 ?? entry.事实 ?? entry.变化 ?? '');
      const parts = value.split(/[/／]/).map((part) => String(part || '').trim()).filter(Boolean);
      if (parts.length >= 2) {
        orgName = orgName || parts[0];
        if (parts.length >= 3) {
          department = department || parts[1];
          title = title || parts[2];
        } else {
          title = title || parts[1];
        }
      } else if (field && value) {
        orgName = orgName || field;
        title = title || value;
      }
    }
    if (!reason) reason = t(entry.reason ?? entry.原因 ?? '正文确认人事归属变化');
    if (!orgName || !title || !reason) return null;
    const patch = this.normalizeMembershipSettlementValue({
      orgId,
      orgName,
      title,
      department,
      departmentFog: entry.departmentFog !== false && !department,
      state,
      reason,
    }, reason);
    if (!patch) return null;
    return {
      updateType: 'membership',
      subject,
      field: 'profile.memberships',
      change: { mode: 'upsert', value: patch },
      reasons: [{ trigger: '人事归属', evidence: reason, confidence: 'confirmed' }],
    };
  },

  /**
   * 模型常把「当前地点/行动/可用」误写入角色卡；这些属于人事安排。
   * 能改写则改写，避免 Stage4 滑动窗口因解析失败反复重试同一条。
   */
  remapRoleCardEntryToSchedule(entry = {}, subject = null, participants = []) {
    const field = String(entry?.field ?? entry?.字段 ?? entry?.key ?? '').trim();
    const value = String(entry?.value ?? entry?.新值 ?? entry?.变化 ?? '').trim();
    const reason = String(entry?.reason ?? entry?.原因 ?? entry?.evidence ?? entry?.证据 ?? '').trim();
    if (!subject || !value) return null;
    const payload = { subject: entry.subject ?? subject.name ?? subject.id, reason };
    if (/^(?:当前地点|当前位置|所在地点|地点)$/u.test(field)) payload.currentLocation = value;
    else if (/^(?:当前行动|当前动作|行动)$/u.test(field)) payload.currentAction = value;
    else if (/^(?:可用状态|可用|在场状态)$/u.test(field)) payload.availability = value;
    else if (/^(?:当前安排|人事安排)$/u.test(field)) {
      payload.currentAction = value;
      payload.availability = '在场';
    } else return null;
    return this.parseScheduleJsonEntry(payload, subject, participants);
  },

  isRoleCardScheduleField(field = '') {
    return /^(?:当前地点|当前位置|所在地点|地点|当前行动|当前动作|行动|可用状态|可用|在场状态|当前安排|人事安排)$/u.test(String(field || '').trim());
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
      '组织能力': { type: '势力', id: name || '势力', name: name || '势力' },
      '政体状态': { type: '势力', id: name || '势力', name: name || '势力' },
      '领土控势': { type: '地点', id: name || '地点', name: name || '地点' },
      '人事归属': { type: 'character', id: name || '角色', name: name || '角色' },
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
    if (type === '人事归属') {
      const org = t(entry.orgName ?? entry.组织名 ?? entry.field ?? '');
      const title = t(entry.title ?? entry.职位 ?? entry.value ?? '');
      const dept = t(entry.department ?? entry.部门 ?? '');
      return `更新N：人事归属，${org}${dept ? `/${dept}` : ''}，${title}，${reason}`;
    }
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

  parseOrgOverviewPanelJsonEntry(entry = {}, subject = null) {
    if (!subject || !entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
    const t = (value) => this.settlementJsonText(value);
    const panelAliases = {
      ideology: 'ideology',
      意识形态: 'ideology',
      国体: 'ideology',
      凝聚原因: 'ideology',
      economy: 'economy',
      经济: 'economy',
      可用资源: 'economy',
      politics: 'politics',
      政治: 'politics',
      管理: 'politics',
      military: 'military',
      军事: 'military',
      diplomacy: 'diplomacy',
      外交: 'diplomacy',
      联谊: 'diplomacy',
      territory: 'territory',
      统治区域: 'territory',
      领土: 'territory',
    };
    const fieldRaw = t(entry.field ?? entry.字段 ?? entry.key ?? entry.name ?? entry.条目 ?? '');
    const panelRaw = t(entry.panel ?? entry.面板 ?? entry.维度 ?? entry.subject?.panel ?? '');
    let panel = panelAliases[panelRaw] || '';
    let fieldKey = fieldRaw;
    const pathMatch = fieldRaw.match(/overviewPanels\.(ideology|economy|politics|military|diplomacy|territory)(?:\.(?:entries\.)?(.+))?$/u);
    if (pathMatch) {
      panel = pathMatch[1];
      fieldKey = t(pathMatch[2] || fieldKey);
    }
    if (!panel) {
      const ideologyKeys = ['core', 'reason', 'description', 'base', 'legitimacy', '国体核心', '形成原因', '当前说明', '法理基础', '合法性', '核心', '凝聚力'];
      if (ideologyKeys.includes(fieldKey)) panel = 'ideology';
      const territoryAlias = window.GameModules.orgTerritory?.territoryFieldAlias?.(fieldKey);
      if (territoryAlias) panel = 'territory';
      const diplomacyAlias = window.GameModules.orgTerritory?.diplomacyFieldAlias?.(fieldKey);
      if (diplomacyAlias) panel = 'diplomacy';
      const militaryAlias = window.GameModules.orgTerritory?.militaryFieldAlias?.(fieldKey);
      if (militaryAlias) panel = 'military';
      const politicsAlias = window.GameModules.orgTerritory?.politicsFieldAlias?.(fieldKey);
      if (politicsAlias) panel = 'politics';
      const economyAlias = window.GameModules.orgTerritory?.economyFieldAlias?.(fieldKey);
      if (economyAlias) panel = 'economy';
    }
    if (!panel || !fieldKey) return null;
    const ideologyMap = {
      core: 'core',
      国体核心: 'core',
      核心: 'core',
      reason: 'reason',
      形成原因: 'reason',
      原因: 'reason',
      description: 'description',
      当前说明: 'description',
      说明: 'description',
      base: 'base',
      法理基础: 'base',
      参与基础: 'base',
      基础: 'base',
      legitimacy: 'legitimacy',
      合法性: 'legitimacy',
      凝聚力: 'legitimacy',
      统一度: 'legitimacy',
      可信度: 'legitimacy',
    };
    if (panel === 'ideology') fieldKey = ideologyMap[fieldKey] || fieldKey;
    if (panel === 'economy') {
      fieldKey = window.GameModules.orgTerritory?.economyFieldAlias?.(fieldKey) || fieldKey;
      if (!window.GameModules.orgTerritory?.economyFixedKeys?.().includes(fieldKey)) return null;
    }
    if (panel === 'politics') {
      fieldKey = window.GameModules.orgTerritory?.politicsFieldAlias?.(fieldKey) || fieldKey;
      if (!window.GameModules.orgTerritory?.politicsFixedKeys?.().includes(fieldKey)) return null;
    }
    if (panel === 'military') {
      fieldKey = window.GameModules.orgTerritory?.militaryFieldAlias?.(fieldKey) || fieldKey;
      if (!window.GameModules.orgTerritory?.militaryFixedKeys?.().includes(fieldKey)) return null;
    }
    if (panel === 'diplomacy') {
      fieldKey = window.GameModules.orgTerritory?.diplomacyFieldAlias?.(fieldKey) || fieldKey;
      if (!window.GameModules.orgTerritory?.diplomacyFixedKeys?.().includes(fieldKey)) return null;
    }
    if (panel === 'territory') {
      fieldKey = window.GameModules.orgTerritory?.territoryFieldAlias?.(fieldKey) || fieldKey;
      if (!window.GameModules.orgTerritory?.territoryFixedKeys?.().includes(fieldKey)) return null;
    }
    const reason = t(entry.reason ?? entry.原因 ?? entry.evidence ?? entry.证据 ?? '上下文或常识推演');
    const rawValue = entry.value;
    const ot = window.GameModules.orgTerritory;
    if (rawValue === undefined || rawValue === null) return null;
    const value = ['ideology', 'economy', 'politics', 'military', 'diplomacy', 'territory'].includes(panel)
      ? ot?.normalizeOverviewEntryValue?.(panel, fieldKey, rawValue)
      : t(rawValue);
    if (!ot?.overviewEntryHasValue?.(panel, fieldKey, { value })) return null;
    const unit = t(entry.unit ?? entry.单位 ?? (fieldKey === 'legitimacy' ? '/100' : ''));
    const patch = {
      key: fieldKey,
      field: fieldKey,
      name: fieldKey,
      value,
      items: Array.isArray(value) ? value : undefined,
      unit,
      state: t(entry.state ?? entry.状态 ?? 'sketch') || 'sketch',
      reason,
      panel,
    };
    const fieldPath = panel === 'ideology'
      ? `overviewPanels.ideology.${fieldKey}`
      : `overviewPanels.${panel}.entries.${fieldKey}`;
    return {
      updateType: 'org-overview-panel',
      subject: { ...subject, panel, type: subject.type || 'faction' },
      field: fieldPath,
      change: { mode: 'upsert', value: patch },
      reasons: [{ trigger: '组织总览五面板', evidence: reason, confidence: 'inferred' }],
    };
  },

  parseControlExperienceJsonEntry(entry = {}, subject = null, participants = []) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
    const needUpdate = entry.needUpdate === true || entry.needUpdate === 'true' || entry['需要更新'] === true;
    const reason = this.settlementJsonText(entry.reason ?? entry.原因 ?? entry.evidence ?? entry.证据 ?? '');
    const updateFieldsRaw = Array.isArray(entry.updateFields)
      ? entry.updateFields
      : (Array.isArray(entry['更新字段']) ? entry['更新字段'] : []);
    const fieldAliases = {
      feeling: 'feeling',
      操控感觉: 'feeling',
      感觉: 'feeling',
      adaptation: 'adaptation',
      适应度: 'adaptation',
      summary: 'summary',
      体验摘要: 'summary',
      摘要: 'summary',
      controllerAwarenessLevel: 'controllerAwarenessLevel',
      对控制者了解等级: 'controllerAwarenessLevel',
      controllerAwareness: 'controllerAwareness',
      对控制者了解: 'controllerAwareness',
    };
    const updateFields = [...new Set(
      updateFieldsRaw
        .map((key) => fieldAliases[String(key || '').trim()] || String(key || '').trim())
        .filter((key) => ['feeling', 'adaptation', 'summary', 'controllerAwarenessLevel', 'controllerAwareness'].includes(key)),
    )];
    if (needUpdate && !updateFields.length) return null;
    if (needUpdate && !reason) return null;
    if (needUpdate) {
      const missing = updateFields.some((field) => {
        if (field === 'feeling') return entry.feeling === undefined && entry['操控感觉'] === undefined;
        if (field === 'adaptation') return entry.adaptation === undefined && entry['适应度'] === undefined;
        if (field === 'summary') return entry.summary === undefined && entry['体验摘要'] === undefined;
        if (field === 'controllerAwarenessLevel') return entry.controllerAwarenessLevel === undefined && entry['对控制者了解等级'] === undefined;
        if (field === 'controllerAwareness') return entry.controllerAwareness === undefined && entry['对控制者了解'] === undefined;
        return true;
      });
      if (missing) return null;
      const adaptationRaw = entry.adaptation ?? entry['适应度'];
      if (updateFields.includes('adaptation')) {
        const text = String(adaptationRaw ?? '').trim();
        if (!/^[+\-]\d+$/u.test(text) || Number(text) === 0) return null;
      }
    }
    const resolvedSubject = subject || this.defaultSubjectForSettlement(participants);
    if (!resolvedSubject) return null;
    return {
      updateType: 'control-experience',
      subject: resolvedSubject,
      field: 'profile.control_experience',
      change: {
        mode: 'merge',
        value: {
          needUpdate,
          updateFields,
          feeling: entry.feeling ?? entry['操控感觉'],
          adaptation: entry.adaptation ?? entry['适应度'],
          summary: entry.summary ?? entry['体验摘要'],
          controllerAwarenessLevel: entry.controllerAwarenessLevel ?? entry['对控制者了解等级'],
          controllerAwareness: entry.controllerAwareness ?? entry['对控制者了解'],
          reason,
        },
      },
      reasons: [{ trigger: '操控体验变化', evidence: reason || '本轮无需更新操控体验', confidence: 'confirmed' }],
    };
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
      } else if (type === '基础结算') {
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
          let update = null;
          if (type === '关系') update = this.parseRelationshipJsonEntry(entry, subject, participants);
          else if (type === '操控体验') update = this.parseControlExperienceJsonEntry(entry, subject, participants);
          else if (type === '角色卡物品') update = this.parseRoleCardItemJsonEntry(entry, subject, participants);
          else if (type === '角色卡复核') update = this.parseRoleCardReviewJsonEntry(entry, subject, participants);
          else if (type === '组织能力') update = this.parseOrgOverviewPanelJsonEntry(entry, subject);
          else if (type === '人事安排') update = this.parseScheduleJsonEntry(entry, subject, participants);
          else if (type === '长期目标') update = this.parseGoalJsonEntry(entry, subject, participants);
          else if (type === '人事归属') update = this.parseMembershipJsonEntry(entry, subject, participants);
          else if (['情绪', '感觉'].includes(type)) update = this.parseMetricSettlementJsonEntry(type, entry, subject, participants, store);
          else if (specialParsers[type]) update = specialParsers[type](line, subject);
          else if (type === '角色卡') {
            update = this.parseRoleCardJsonEntry(entry, subject, participants)
              || this.parseSpecialSettlementLine(type, line, subject, participants);
            if (!update) {
              update = this.remapRoleCardEntryToSchedule(entry, subject, participants);
              if (!update) {
                const field = String(entry?.field ?? entry?.字段 ?? entry?.key ?? '').trim();
                if (['社群角色', '人事归属', '证书', '称号'].includes(field)) {
                  console.warn('[Stage4] 角色卡身份字段结构不完整，保留为未完成以触发重试:', field);
                  return;
                }
                // 非法字段（如当前地点）若未能改写：计为已处理，避免滑动窗口死循环重试。
                patch.__parsedUpdates += 1;
                console.warn('[Stage4] 跳过无效角色卡字段:', field || entry);
                return;
              }
            }
          }
          else if (type === '性历史') update = this.parseSpecialSettlementLine(type, line, subject, participants);
          else update = this.parseStandardSettlementLine(type, line, subject, participants, store);
          if (update) {
            patch.__parsedUpdates += 1;
            patch.genericUpdates.push(update);
          }
        });
        if (type === '人事安排' || type === '角色卡') {
          patch.genericUpdates = window.GameModules.characterScheduleUpdates?.coalesce?.(patch.genericUpdates) || patch.genericUpdates;
        }
        if (type === '长期目标') {
          patch.genericUpdates = window.GameModules.characterGoalUpdates?.coalesce?.(patch.genericUpdates) || patch.genericUpdates;
        }
      }
      const hasParsedAllUpdates = !patch.__updateLines || patch.__parsedUpdates === patch.__updateLines;
      const hasRequiredBaseFields = type !== '基础结算' || baseKeys.every((key) => String(patch.baseFields[key] || '').trim());
      patchesByType[type] = patch;
      if (hasParsedAllUpdates && hasRequiredBaseFields && (type === '基础结算' || Array.isArray(value))) {
        completeTypes.push(type);
        if (type === '基础结算') Object.assign(baseFields, patch.baseFields);
      } else incompleteTypes.push(type);
    });
    const genericUpdates = window.GameModules.characterScheduleUpdates?.coalesce?.(
      completeTypes.flatMap((type) => patchesByType[type]?.genericUpdates || []),
    ) || completeTypes.flatMap((type) => patchesByType[type]?.genericUpdates || []);
    const events = completeTypes.flatMap((type) => patchesByType[type]?.events || []);
    return { format: 'json', patchesByType, completeTypes, incompleteTypes, genericUpdates, events, baseFields };
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
          } else if (type === '角色卡') {
            const parts = String(updateLine || '').replace(/^更新(?:\d+|N)[：:]\s*/u, '').split(/[，,]/u).map((x) => x.trim());
            const field = parts[1] || '';
            const value = parts[3] || parts[2] || '';
            const reason = parts[4] || '';
            const remapped = this.remapRoleCardEntryToSchedule({ field, value, reason, subject: updateSubject?.name }, updateSubject, participants);
            if (remapped) {
              patch.__parsedUpdates += 1;
              patch.genericUpdates.push(remapped);
            } else {
              if (['社群角色', '人事归属', '证书', '称号'].includes(field)) {
                console.warn('[Stage4] 角色卡身份字段结构不完整，保留为未完成以触发重试(KV):', field);
                return;
              }
              patch.__parsedUpdates += 1;
              console.warn('[Stage4] 跳过无效角色卡字段(KV):', field || updateLine);
            }
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
    const genericUpdates = window.GameModules.characterScheduleUpdates?.coalesce?.(
      completeTypes.flatMap((type) => patchesByType[type]?.genericUpdates || []),
    ) || completeTypes.flatMap((type) => patchesByType[type]?.genericUpdates || []);
    return { patchesByType, completeTypes, incompleteTypes, genericUpdates, baseFields };
  },

  settlementTypeShortRule(type = '') {
    const contracts = this.settlementTypeContracts();
    const c = contracts[type] || { title: `${type}结算`, format: '更新N：类型，字段，变化，原因' };
    if (type === this.eventSettlementType()) {
      const eventLines = window.GameModules.socialEventBoundary?.stage4EventSettlementLines?.() || [
        '只提取正文中已经明确出现或能由正文稳定推出的事件；无事件输出 []。',
      ];
      return [`${c.title}规则：`, ...eventLines].join('\n');
    }
    const rules = {
      '情绪': '字段只能使用本轮“当前情绪基线”里已有指标名；value 必须是 +N/-N 且不能为 0；可把愉悦/开心映射为高兴、惊慌映射为恐惧、不安映射为紧张；没有对应已有指标或无稳定变化时输出空数组。字段含义：field=情绪指标名，value=本回合变化量，status=变化后该情绪在当前数值下的具体表现（禁止写“高兴40：”这类前缀），reason=正文中的具体行为/对话证据。',
      '感觉': '主体只能是出场 NPC，不能是玩家；字段只能使用“出场角色对玩家感觉基线”里已有指标名；value 必须是 +N/-N 且不能为 0；可把信赖映射为信任、亲近映射为好感、害怕映射为畏惧、厌恶映射为反感。字段含义：field=感觉指标名，value=本回合变化量，status=变化后该感觉在当前数值下的具体表现（禁止写“信任40：”这类前缀），reason=正文中证明该 NPC 对玩家态度变化的具体证据。',
      '生命体征': '字段只能是：生命力、精力、饱食度、水分、疲劳、精神稳定；允许别名输入但最终字段写这 6 个中文名；禁止心率、体温、呼吸频率、血压、血氧、瞳孔、激素、行动能力、肌肉紧张度等新指标；变化必须是 +N/-N 且不能为 0；健康正常或无稳定变化时输出空数组。',
      '身体状态': '部位只能是：整体/全身、口部/嘴部/嘴唇、胸部/胸口/乳房、阴部/私处、肛部、臀部/屁股、四肢/手臂/腿部、皮肤、其他；整体/全身与局部部位互不冲突，同轮同人可写多条，正文中有就应全部写入；整体写全身综合状态，局部写对应部位细节；禁止把坐姿、可用状态、手指动作等写成新部位字段；全身发颤/肌肉反应等写整体或四肢，不要写进生命体征。',
      '穿着状态': '穿着部位只能是：全身/整体、胸部/胸口/乳房、上身、外套、下身、腿部/大腿、足部/脚部、内裤、饰品；全身/整体会按外套处理并清空其他衣物槽；同轮若还有局部部位，先应用全身再覆盖局部部位；禁止肩部、腰部、衣领、吊带位置等非槽位字段；必须包含衣物名称和当前状态。',
      '性经历': '分类只能是：阴部、胸部/胸口/乳房、唇部/接吻、口部/嘴部、口部行为、口交、口交中出、阴部进入、阴道插入、阴道中出、肛部/肛门、肛部进入、肛交、肛交中出、腿部/大腿、臀部/屁股、手部/手、皮肤、其他；delta 必须是 +N/-N 且不能为 0；禁止写总次数/总数/全部（总次数由系统按各部位次数求和自动计算）；无相关行为时输出空数组。',
      '性历史': '只写身份状态转移与经历对象名单；transition 建议如 未知→非处女、处女→非处女；partner 写姓名；经历人数由系统按去重后的经历对象名单自动计算，禁止单独写人数；当前未知时禁止无依据写成处女：妻子/丈夫/配偶/已婚/已育→非处女/非处男；守贞或以失贞为耻、古老部落童贞规范下无特殊说明的少女/少年→处女/处男；童贞可耻或性开放常态且已成年融入→可非处；现代都市未婚无插入证据可保持未知输出 []；仅阴部插入后才把对象写入名单；evidence 写身份或正文依据。',
      '关系': '只记录稳定关系维度，如亲属、朋友、同事、师生、雇佣、敌对、同居、恋人；好感、信任、依赖、警惕等数值态度写“感觉”，不要写关系。',
      '角色卡': [
        '只写稳定角色卡字段：当前状态、身份、职业、技能、知识、外貌、性格、喜好、人物说明、社群角色、人事归属、证书、称号、人际关系。',
        '仅处理本轮新确认或发生变化的稳定事实，不扫描或补写本轮未变化的旧存档字段。',
        '只更新已有完整角色卡；空壳 stub 或仅介绍卡人物不要当完整角色卡硬改（完整卡仅玩家手动升格）。',
        '禁止写当前地点/当前位置/当前行动/可用状态（那些必须写人事安排）；禁止写短中长期目标进度与阶段成果（那些必须写长期目标）；临时情绪、生命体征、身体、穿着、关系、物品有专门类型时不得写角色卡。',
        '四类格式：社群角色=完整社群名/具体角色；人事归属=完整组织名/具体职位、学籍或成员身份；证书=完整授予组织/具体领域/具体资格或等级；称号=完整认可群体/具体领域/具体称号。',
        '本轮有事实或背景依据时必须完整补全；缺少次要细节时依据世界观、年代、地区、教育与职业经历作最小充分推演；完全没有依据时才输出空数组。',
        '禁止模糊占位：不得写某公司/普通职员、未知学校/初中生、相关机构/资格、某群体/称号等可由上下文补全的上位概念。',
        '求全优先于过严过滤，禁止因分类犹豫判成“都不是”；输出前逐项自检本轮变化是否遗漏、留空、简写或模糊化。',
      ].join(''),
      '角色卡物品': [
        '只编辑本回合参与者已有完整角色卡的 profile.items 与穿着/装备槽；空壳 stub 和仅介绍卡人物不编辑。',
        'action 必须精确选择：add 新增，update 修改已有物品，remove 丢弃，consume 消耗数量，equip 从物品栏装备到 slot，unequip 从 slot 卸下，transfer 转给另一位本回合参与者，replace 仅在正文明确整体清点或整体替换时使用。',
        '所有物品编辑途径都已开放，但每项都必须有正文中的明确证据；不要为了整理背包而凭空移动、增加或删除物品。',
        'item 至少含 name、description、quantity；装备物品还应给 type=equipment 与 equipSlots。transfer 必须写 to，equip 必须写 slot；无变化输出 []。',
      ].join(''),
      '角色卡复核': [
        '这是 Stage4-12 角色卡补充更新，不是格式审核；可编辑角色卡全部可更新业务字段。field 可用标准中文字段名，或直接写 profile.* 完整路径；op 只能是 替换、增加、删除、合并。',
        '必须结合正文、完整上下文、角色卡完整基线，以及 Stage4-1～Stage4-11 的待应用结果逐项检查；发现前序结算遗漏、矛盾、过时或仍未覆盖的角色卡变化时必须输出。',
        '可以更新身份、职业、技能、知识、外貌、性格、喜好、人物说明、社群、人事归属、证书、称号、关系、物品、穿着、职业资料和其他已有角色卡业务字段；不得写技术字段。',
        '无遗漏或无变化时输出 []；不允许为了凑条目重复前序阶段已经正确覆盖的更新。',
      ].join(''),
      '长期目标': '只更新本回合 participants 的角色卡长期目标系统。可写 short/medium/long（content、deadline YYYY-MM-DD、progress 0-100、detail）与 achievement/achievements。规则：①任一档完成（progress=100 或正文确认达成）必须追加阶段成果，并基于当前上下文生成同档下一条新目标，progress 重置为较低起点（通常 0-20）；禁止只写 100% 不换 content。②玩家目标表达特别明确（点名短/中/长期，或「近期完成」「几个月内达成」等）且旧目标未完成时，新 content 必须融合旧未完部分与新目标，progress 通常适当下调并在 detail 说明；模糊愿望不触发。③未点名档位时按难易/耗时判定 short≈数天~数周、medium≈数月、long≈数年或人生方向。④即时下一步仍写基础结算「当前目标」；弱推测不更新。',
      '地图': '字段只能是：当前位置、上级地点、地点事实、地图节点、路线事实；角色当前所在地优先写人事安排，不要把角色行动写成地图事实。地图节点最小颗粒度为建筑物（如锦苑小区3栋）或小区级POI（公园、商店）；走廊、楼梯间、单个房间只写当前位置，不要作为地图节点。禁止在本类型写 effectiveOrgId/控势，那属于领土控势。',
      '领土控势': '仅当正文确认已揭示地点的夺控、解放、移交、占领或争议状态时更新；字段：地点名、实控组织、宣称组织、控势状态；未 revealed 地点不得写；同轮同一地点最多一条；普通到达/看见不写本类型。',
      '人事安排': '只更新本回合 participants 中的参与者；同一人每回合最多一条当前人事安排。把当前地点、当前行动、可用状态合并进同一条（无变化字段可省略）；正在做什么必须写 当前行动，value 用短句写具体动作；可用状态 value 只能是 在场/场外/暂不可用/未知，禁止把动作或身体反应写进可用状态；reason 只写正文证据；禁止同一人拆成地点/行动/可用多条；禁止把地点写进角色卡；弱推测不更新。',
      '势力总览': '字段只能是：新增势力、上层势力归属、势力APP归属；组织内部部门、职位、成员地位写势力结构。',
      '政体状态': '字段：组织名、status（active/rebel/independent/dissolved/merged）、legitimacy、successorId；合并/解散须写 successor；地图控势另写领土控势。',
      '势力结构': '字段只能是：部门角色、职位、成员地位；势力是否存在或隶属关系写势力总览。新建 fog 节点只写名称与意图，上级未明写「迷雾」，禁止猜国防部等。',
      '组织能力': [
        '写总览面板：ideology/economy/politics/military/diplomacy/territory。',
        '可依据本轮正文、已有上下文，以及模型对已知现实/设定组织的常识直接填写，不要因正文未逐字确认就整面板留空。',
        'ideology 尽量补齐 core、reason、description、base、legitimacy（合法性数值配 /100）；国家/已知势力不要只写 legitimacy。',
        'economy 必须按固定清单输出：gdp、income、expenditure、assets、resources、production、system、institutions、laws、works。',
        'GDP/收入/支出格式：XXX元 <国际通用统计货币单位>（XXX 元 <国家货币单位>）（组成部分）；机构/法案/作品必须用列表（name+description）。',
        'politics 必须按固定清单输出：regime、powerStructure、rulemaking、adjudication、execution、participation、leadership、institutions、laws、works；政治机构/法案/作品用列表；不写意识形态（归 ideology）。',
        'military/diplomacy/economy/politics/territory 的 value 必须符合 org-overview-panel 的 value JSON 规范（text / nameDescList / relationList / groupItemsList / regionList），禁止用 Markdown 列表字符串代替结构化 value。',
        'territory 固定清单：capital、area、population、adminDivision、regions；regions 为最高行政区列表（含 capital/area/controlRate/population/description/garrison）。',
        '部门/职位/任职写势力结构，不要混用。',
      ].join(''),
      '人事归属': [
        '含义：可指认组织中的正式或准正式身份（编制/学籍/职级/成员等），不是软性圈子角色。',
        '仅处理本轮新确认或发生变化的稳定事实，不扫描或补写本轮未变化的旧归属。',
        '构成要素：完整组织名/orgId + 具体职位、学籍或成员身份 + 部门（确无依据才写 departmentFog）；对应 profile.memberships。',
        '触发：正文或资料确认的入职、任职、调岗、离职、升学/转学、入籍或其它稳定组织身份变化均可写，不要把门槛收得过死。',
        '完备性：有事实或背景依据时必须完整补全；缺少次要细节时依据世界观、年代、地区、教育与职业经历作最小充分推演；完全没有依据时才输出空数组。',
        '禁止使用某公司、未知学校、相关机构、普通职员、初中生、成员等模糊占位规避完整名称和具体身份；求全优先于过严过滤。',
        '与势力 structure 占坑可同时存在但需一致；无组织名的空壳「现实社会/成年人」不要写；具体国家下的公民/国民有依据时可写。',
      ].join(''),
      '系统记录': '只写系统级、跨角色、且没有专门类型承载的长期事实：日历变更、微信/短信通信、世界线节点、不可逆公共事件、全局状态。禁止把角色当前行动、所在地点、身体反应、感觉、关系、场景描写复述写进系统记录；这些必须分别写人事安排、身体状态、感觉、关系。若正文事实已被世界线记录覆盖，系统记录写空数组 []。',
      '通用固化': '只能写没有专门类型承载的长期稳定标签；情绪、感觉、生命体征、身体、穿着、性经历、性历史、关系、物品、地图、人事、势力、长期目标、系统记录有专门类型时不得写通用固化。',
      '操控体验': [
        '只结算当前被控角色的上线体验（profile.control_experience）。',
        '流程：1）先确认本轮是否需要更新（needUpdate）以及要更新哪些字段（updateFields）；2）再生成对应字段值。',
        '可更新字段仅限：feeling（操控感觉）、adaptation（适应度）、summary（体验摘要）、controllerAwarenessLevel（unknown|traitKnown|identityGuessed）、controllerAwareness（≤20字）。',
        'adaptation 只写本回合增量，如 +3 或 -1，禁止写绝对值；其余文本字段基于“操控体验基线”生成完整新文本并直接覆盖。',
        '上线次数（onlineCount）不要输出；系统在 needUpdate=true 时自动 +1，且无上限。',
        '正文无明确被控体验变化时输出 [{"subject":"被控角色名","needUpdate":false}] 或 []。',
      ].join(''),
    };
    return [
      `${c.title}规则：`,
      rules[type] || '只有本轮稳定事实明确支持时才更新；弱氛围、猜测或未确认变化不更新。',
    ].join('\n');
  },

  settlementMetricExample(store = {}, participants = [], metricType = '') {
    const rows = (Array.isArray(participants) ? participants : []).filter((p) => metricType !== '感觉' || p?.type === 'character');
    for (const participant of rows) {
      const keys = this.settlementMetricKeysForSubject(store, participant, metricType);
      if (keys.length) return { subject: participant.name || participant.id, field: keys[0] };
    }
    return null;
  },

  settlementTypeJsonExample(type = '', participants = [], store = {}, config = this.realConfig()) {
    const chars = (Array.isArray(participants) ? participants : []).filter((p) => p?.type === 'character');
    const player = (Array.isArray(participants) ? participants : []).find((p) => p?.type === 'player');
    const subject = chars[0]?.name || chars[0]?.id || player?.name || player?.id || '角色名';
    const playerName = player?.name || player?.id || '玩家名';
    const otherName = chars[1]?.name || chars[1]?.id || subject;
    if (type === this.eventSettlementType()) return '"事件":[{"type":"inference","title":"市级马拉松","startDate":"2026-07-12","endDate":"2026-07-12","location":"天府大道沿线","content":"周末举行市级马拉松，沿线临时交通管制","people":["所有人"],"tags":["比赛","交通"],"status":"active"}]';
    if (type === '基础结算') return '"基础结算":{"经过时间":60,"当前状态":"当前稳定状态","当前目标":"下一步目标","场景标题":"场景标题","地点名称":"地点名","备选行动":["行动一","行动二","行动三","行动四"]}';
    if (type === '情绪') {
      const ex = this.settlementMetricExample(store, participants, '情绪');
      return ex ? `"情绪":[{"subject":"${ex.subject}","field":"${ex.field}","value":"+1","status":"变化后该情绪的具体表现","reason":"正文中的明确行为或对话证据"}]` : '"情绪":[]';
    }
    if (type === '感觉') {
      const ex = this.settlementMetricExample(store, participants, '感觉');
      return ex ? `"感觉":[{"subject":"${ex.subject}","field":"${ex.field}","value":"+1","status":"变化后该感觉的具体表现","reason":"该 NPC 对玩家态度变化的明确证据"}]` : '"感觉":[]';
    }
    if (type === '生命体征') return `"生命体征":[{"subject":"${subject}","field":"疲劳","value":"+1","reason":"正文明确出现持续消耗或疲惫证据"}]`;
    if (type === '身体状态') return `"身体状态":[{"subject":"${subject}","part":"整体","status":"全身综合状态","reason":"正文明确全身状态证据"},{"subject":"${subject}","part":"胸部","status":"局部部位状态","reason":"正文明确该部位证据"}]`;
    if (type === '穿着状态') return `"穿着状态":[{"subject":"${subject}","part":"外套","item":"衣物名称","state":"当前状态","reason":"正文明确穿着变化证据"}]`;
    if (type === '性经历') return `"性经历":[{"subject":"${subject}","part":"分类","delta":"+1","reason":"正文明确性相关行为证据"}]`;
    if (type === '性历史') return `"性历史":[{"subject":"${subject}","transition":"状态转移","partner":"对象","evidence":"正文明确证据"}]`;
    if (type === '关系') return `"关系":[{"subject":"${subject}","left":"${playerName}","right":"${subject}","dimension":"亲属关系","status":"稳定亲密","reason":"正文中能证明关系状态的具体证据","result":"维持稳定亲密关系"}]`;
    if (type === '角色卡') return `"角色卡":[{"subject":"${subject}","field":"社群角色","op":"增加","value":"刘家/长兄","reason":"本轮明确家庭身份证据","result":"写入社群角色"},{"subject":"${subject}","field":"人事归属","op":"增加","value":"成都悠云科技有限公司/程序工程师","reason":"本轮明确任职事实","result":"写入人事归属"},{"subject":"${subject}","field":"证书","op":"增加","value":"四川大学/计算机科学与技术/工学硕士学位","reason":"本轮确认学历学位","result":"写入证书"},{"subject":"${subject}","field":"称号","op":"增加","value":"成都程序员社区/开源贡献/年度贡献者","reason":"本轮确认稳定社会认可","result":"写入称号"}]`;
    if (type === '角色卡物品') return `"角色卡物品":[{"subject":"${subject}","action":"add","itemName":"新物品","item":{"name":"新物品","description":"正文明确获得的物品","quantity":1,"type":"item"},"quantity":1,"reason":"正文明确获得该物品"}]`;
    if (type === '角色卡复核') return `"角色卡复核":[{"subject":"${subject}","field":"profile.detail","op":"替换","value":"结合本轮正文确认后的完整人物说明","reason":"正文、上下文与前序结算共同确认"}]`;
    if (type === '长期目标') return `"长期目标":[{"subject":"${subject}","short":{"content":"短期目标内容","deadline":"2026-08-01","progress":40,"detail":"进度说明"},"achievement":"已完成的阶段成果","reason":"正文明确证据"}]`;
    if (type === '物品') return `"物品":[{"subject":"${subject}","field":"持有物","value":"物品状态","reason":"正文明确物品变化证据"}]`;
    if (type === '地图') return '"地图":[{"subject":"地点名","field":"地点事实","value":"稳定地点事实","reason":"正文明确地点证据"}]';
    if (type === '人事安排') return `"人事安排":[{"subject":"${subject}","currentLocation":"地点","currentAction":"正在做的具体动作","availability":"在场","reason":"正文明确证据"}]`;
    if (type === '势力总览') return '"势力总览":[{"subject":"势力名","field":"新增势力","value":"势力事实","reason":"正文明确势力证据"}]';
    if (type === '势力结构') return `"势力结构":[{"subject":"势力名","field":"成员地位","value":"${subject}的稳定地位","reason":"正文明确组织证据"}]`;
    if (type === '组织能力') return '"组织能力":[{"subject":"中华人民共和国","panel":"military","field":"forces","value":[{"name":"陆军","items":["第一集团军：规模约10万人；训练率约70%"]}],"reason":"groupItemsList"},{"subject":"中华人民共和国","panel":"diplomacy","field":"allies","value":[{"name":"俄罗斯","description":"全面战略协作伙伴","viewOfSelf":"视我为可靠协作方"}],"reason":"relationList"}]';
    if (type === '人事归属') return `"人事归属":[{"subject":"${subject}","orgName":"组织名","orgId":"","title":"职位","department":"部门","departmentFog":false,"state":"sketch","reason":"正文明确入职、调岗或学籍证据"}]`;
    if (type === '系统记录') return '"系统记录":[{"subject":"系统","field":"通信消息","value":"已确认的系统级通信或日程事实","reason":"正文明确且不属于角色卡/人事安排的证据"}]';
    if (type === '通用固化') return `"通用固化":[{"subject":"${subject}","field":"长期标签","value":"稳定标签","reason":"正文明确且无专门类型承载"}]`;
    if (type === '操控体验') {
      const target = this.settlementControlExperienceTarget(store, participants, config)?.name || subject;
      return `"操控体验":[{"subject":"${target}","needUpdate":true,"updateFields":["feeling","adaptation","summary","controllerAwarenessLevel","controllerAwareness"],"feeling":"紧绷抗拒","adaptation":"+5","summary":"被迫旁观身体失控。","controllerAwarenessLevel":"traitKnown","controllerAwareness":"感到操控者冷静强势但不知是谁","reason":"正文明确被控体验证据"}]`;
    }
    return `"${type}":[]`;
  },

  settlementTypeAntiExample(type = '') {
    const map = {
      '情绪': '反例：{"field":"惊慌","value":"+0"}（新造字段或 0 变化）；正确：用基线已有字段且 +N/-N，或 []。',
      '感觉': '反例：{"subject":"玩家","field":"警戒"}（玩家不能是感觉主体，警戒不是基线字段）；正确：NPC subject + 基线已有字段，或 []。',
      '生命体征': '反例：{"field":"心率","value":"98/100"}、{"field":"精神稳定","value":"+0"}；正确：六个允许字段 + 非零增减，或 []。',
      '身体状态': '反例：正文同时有全身发颤和胸部被触碰，却只写一条或省略整体；正确：整体与局部各写一条（或多条局部），或确实无变化时 []。',
      '性经历': '反例：把共处、拥抱、照顾写成性经历；正确：没有明确性相关行为就 []。',
      '关系': '反例：{"dimension":"好感","status":"+5"}、缺 right/result；正确：dimension 写亲属/朋友/恋人/敌对等稳定关系，status 写关系状态。',
      '角色卡': '反例：{"field":"当前地点","op":"替换","value":"…房间"}（地点属于人事安排）、{"op":"保持"}、{"field":"人事归属","value":"某公司/普通职员"}、{"field":"人事归属","value":"未知学校/初中生"}、证书或称号缺少三段结构；正确：op 只能替换/增加，四类身份按完整格式填写，且必须是本轮新确认或变化的长期稳定字段。',
      '角色卡物品': '反例：{"action":"equip","itemName":"手机"}（装备缺 slot）、{"action":"transfer","itemName":"书","to":"场外人物"}（目标不是本回合参与者）；正确：操作、物品名、数量/槽位/目标和正文证据完整，或 []。',
      '角色卡复核': '反例：{"field":"profile.roleCardUpdatedAt","op":"替换"}（技术字段）、{"field":"profile.__proto__","op":"合并"}（非法路径）；正确：只写角色卡业务字段，且有复核证据。',
      '系统记录': '反例：{"field":"事件","value":"刘悠进入房间并抱住对方"}（这是人事/感觉/正文复述）；正确：写微信消息、日历事项、世界线节点，或 []。',
      '操控体验': '反例：{"adaptation":"45"}（写成绝对值）、输出 onlineCount、needUpdate=true 却缺 updateFields/reason；正确：adaptation 写 +N/-N，文本字段覆盖，或 needUpdate=false。',
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

  settlementControlExperienceTarget(store = {}, participants = [], config = this.realConfig()) {
    if (config?.mode === 'real') {
      const shared = store?.sharedControlState?.();
      if (shared) {
        return {
          id: shared.id,
          name: String(shared.profile?.name || shared.name || '').trim(),
          state: shared,
        };
      }
    }
    if (config?.mode === 'story') {
      const state = store?.characterRpgState
        || store?.rpgStates?.[store?.character?.id]
        || store?.character;
      if (state) {
        return {
          id: state.id || store?.character?.id,
          name: String(state.profile?.name || state.name || store?.character?.name || '').trim(),
          state,
        };
      }
    }
    const chars = (Array.isArray(participants) ? participants : []).filter((p) => p?.type === 'character');
    const first = chars[0];
    if (!first) return null;
    const state = store?.itemSkillState?.(first.id)
      || store?.itemSkillState?.(first.idOrName)
      || store?.rpgStates?.[first.id]
      || null;
    return {
      id: first.id || state?.id,
      name: String(first.name || state?.profile?.name || first.id || '').trim(),
      state,
    };
  },

  settlementControlExperienceBaselineText(store = {}, participants = [], config = this.realConfig()) {
    const target = this.settlementControlExperienceTarget(store, participants, config);
    const exp = target?.state?.values?.control_experience || {};
    const stage = window.GameModules.controlExperienceStage;
    const awareness = stage?.normalizeControllerAwareness?.(exp) || {
      controllerAwarenessLevel: exp.controllerAwarenessLevel || 'unknown',
      controllerAwareness: exp.controllerAwareness || '尚不知晓控制者是谁',
    };
    const name = target?.name || '被控角色';
    return [
      '操控体验基线（仅被控角色；文本字段覆盖时必须基于此改写）：',
      `主体：${name}`,
      `上线次数：${Math.max(0, Math.floor(Number(exp.onlineCount) || 0))}（系统在 needUpdate=true 时自动+1；AI不要输出）`,
      `feeling：${String(exp.feeling || '未知').trim() || '未知'}`,
      `adaptation：${Math.max(0, Math.min(100, Math.floor(Number(exp.adaptation) || 0)))}`,
      `summary：${String(exp.summary || '尚未经历上线操控。').trim() || '尚未经历上线操控。'}`,
      `controllerAwarenessLevel：${awareness.controllerAwarenessLevel}`,
      `controllerAwareness：${awareness.controllerAwareness}`,
    ].join('\n');
  },

  roleCardInventorySettlementContext(store = {}, participants = []) {
    const rows = (Array.isArray(participants) ? participants : []).filter((person) => ['character', 'player'].includes(person?.type)).map((person) => {
      const id = person.id || person.idOrName || person.name;
      const state = store?.itemSkillState?.(id) || store?.rpgStates?.[id] || (id === 'player-self' ? store?.playerIdentityState?.() : null);
      const profile = state?.profile || {};
      const items = Array.isArray(profile.items) ? profile.items : [];
      const wearing = Array.isArray(profile.wearingItems) ? profile.wearingItems : (Array.isArray(profile.wearing) ? profile.wearing : []);
      return `${person.name || id}(${id})\n随身物品：${JSON.stringify(items.slice(0, 40))}\n穿着/装备槽：${JSON.stringify(wearing.slice(0, 40))}`;
    });
    return `角色卡物品当前基线（Stage4-9 可编辑全部物品途径）：\n${rows.join('\n') || '无'}`;
  },

  roleCardReviewSettlementContext(store = {}, participants = [], priorStageSummary = null) {
    const rows = (Array.isArray(participants) ? participants : []).filter((person) => ['character', 'player'].includes(person?.type)).map((person) => {
      const id = person.id || person.idOrName || person.name;
      const state = store?.itemSkillState?.(id) || store?.rpgStates?.[id] || (id === 'player-self' ? store?.playerIdentityState?.() : null);
      return `${person.name || id}(${id})：${JSON.stringify(state?.profile || {})}`;
    });
    const pending = priorStageSummary ? JSON.stringify(priorStageSummary).slice(0, 12000) : '无';
    return `角色卡补充更新基线（Stage4-12）：\n${rows.join('\n') || '无'}\n前序 Stage4 待应用结果（必须结合上下文查漏补全，不要机械重复）：${pending}`;
  },

  async buildSettlementTypeWindowMessages({ requestedTypes = [], completedTypes = [], incompleteTypes = [], partialByType = {}, store, action, base, loaded, materialSession = null, narration, trace = [], participants = [], config = this.realConfig(), priorStageSummary = null }) {
    const contracts = this.settlementTypeContracts();
    const totalTypes = requestedTypes.length;
    const jsonContracts = requestedTypes.map((type) => {
      const c = contracts[type];
      if (type === '基础结算') return '基础结算：对象，必须含 keys：经过时间、当前状态、当前目标、场景标题、地点名称、备选行动；备选行动必须是 4 个字符串数组。';
      if (type === '穿着状态') return '穿着状态：数组；每项 {"subject":"姓名","part":"部位","item":"衣物名称","state":"当前状态","reason":"证据"}；无变化 []。';
      if (type === '身体状态') return '身体状态：数组；每项 {"subject":"姓名","part":"部位","status":"状态","reason":"证据"}；同轮可有多条，整体/全身与局部部位互不冲突；无变化 []。';
      if (type === '性经历') return '性经历：数组；每项 {"subject":"姓名","part":"分类","delta":"+N/-N","reason":"证据"}；无变化 []。';
      if (type === '性历史') return '性历史：数组；每项 {"subject":"姓名","transition":"状态转移","partner":"对象","evidence":"证据"}；无变化 []。';
      if (type === '情绪') return '情绪：数组；每项 {"subject":"姓名","field":"情绪指标名","value":"+N/-N","status":"变化后该情绪的具体表现","reason":"正文中的具体行为或对话证据"}；无变化 []。status 写程度表现，不要写指标名+数值前缀；缺省时系统会按新数值补模板解释。';
      if (type === '感觉') return '感觉：数组；每项 {"subject":"出场NPC姓名","field":"感觉指标名","value":"+N/-N","status":"变化后该感觉的具体表现","reason":"正文证据证明该NPC对玩家态度变化"}；无变化 []。status 写程度表现，不要写指标名+数值前缀；缺省时系统会按新数值补模板解释。';
      if (type === '关系') return '关系：数组；每项 {"subject":"姓名","left":"关系左方","right":"关系右方","dimension":"稳定关系维度","status":"关系状态","reason":"证据","result":"结算结果"}；无变化 []。';
      if (type === '角色卡') return '角色卡：数组；每项 {"subject":"姓名","field":"字段","op":"替换/增加","value":"内容","reason":"证据","result":"结果"}；四类格式：社群角色「完整社群名/具体角色」、人事归属「完整组织名/具体职位、学籍或成员身份」（也可改走人事归属类型）、证书「完整授予组织/具体领域/具体资格或等级」、称号「完整认可群体/具体领域/具体称号」；仅处理本轮新确认或变化的稳定事实；完全无依据或无变化时 []。';
      if (type === '角色卡物品') return '角色卡物品：数组；每项 {"subject":"姓名","action":"add|update|remove|consume|equip|unequip|transfer|replace","itemName":"物品名","item":{"name":"物品名","description":"完整描述","quantity":1,"type":"item|equipment","equipSlots":["槽位"]},"quantity":1,"slot":"装备槽","to":"目标角色","reason":"正文证据"}；add 新增，update 修改字段，remove 丢弃，consume 消耗，equip 装备，unequip 卸下，transfer 转交，replace 整体替换；无变化 []。';
      if (type === '角色卡复核') return '角色卡补充更新：数组；每项 {"subject":"姓名","field":"标准字段名或 profile.* 路径","op":"替换|增加|删除|合并","value":"完整新值或 JSON 值","reason":"正文、上下文与前序结算后的补充更新证据"}；可编辑角色卡任意可更新业务字段；无变化 []。';
      if (type === '长期目标') return '长期目标：数组；每项 {"subject":"姓名","short|medium|long":{"content":"目标","deadline":"YYYY-MM-DD","progress":0-100,"detail":"进度描述"},"achievement":"阶段成果","reason":"证据"}；完成某档必须换同档新 content 并重置较低 progress；玩家明确改目标且旧档未完成须融合改写；可只写变化字段；无变化 []。';
      if (type === '操控体验') return '操控体验：数组；每项先输出 needUpdate 与 updateFields。needUpdate=false 时可不填字段值；needUpdate=true 时必须含 subject、updateFields、reason，以及 updateFields 对应值。adaptation 只写 +N/-N 增量；feeling/summary/controllerAwarenessLevel/controllerAwareness 基于基线生成完整新文本直接覆盖；禁止输出 onlineCount。无变化 [{"subject":"被控角色名","needUpdate":false}] 或 []。';
      if (type === '人事归属') return '人事归属：数组；每项 {"subject":"姓名","orgName":"组织名","title":"职位","department":"部门或空","departmentFog":true/false,"state":"fog|sketch|established","reason":"证据"}；可带 orgId；无变化 []。';
      if (type === this.eventSettlementType()) return '事件：数组；每项 {"type":"inference|periodic","title":"事件名","startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD","location":"地点","content":"内容","people":["所有人或受众标签"],"tags":["标签"],"status":"active"}；inference 仅大地图/活动，禁止私人约定；无事件 []。';
      return `${type}：数组；每项 {"subject":"结算主体","field":"字段","value":"变化或新值","reason":"证据"}；无变化 []。原合约：${c?.format || '更新N：结算主体，字段，变化，原因'}`;
    }).join('\n');
    const globalShortReason = String(partialByType.__shortOutputReason || '').trim();
    const incompleteReason = [globalShortReason, incompleteTypes.map((type) => {
      const detail = String(partialByType[type] || '').trim();
      const safeDetail = /(?:结算状态|结算对象|更新\d*|更新N|结算结束|类型完成|[{}\n\r])/u.test(detail) ? '' : detail;
      return `${type}：${safeDetail || '上轮 JSON 缺失或字段未通过解析，本轮必须重新输出该 key 的完整 JSON 值'}`;
    }).join('；')].filter(Boolean).join('\n') || '无';
    const stableFactRules = [
      '内部提取“本轮稳定事实”：只在内部完成，不输出事实列表。',
      '明确事实：可直接结算。',
      '强暗示事实：可保守结算，但必须有明确行为、对话或连续动作支撑。',
      '弱氛围暗示：不得结算。',
      '玩家输入可信度与可行性规则：玩家输入中的行动意图照常推演；夹带的既成结果、背景改写、状态突变或超出当前因果能力的宣称，只有在已加载上下文、角色设定、世界规则或可核验资料支持时，才可当作真实事实进入结算；若缺少支持，不得当真落库，只能结算正文中实际成立的可观察后果。',
    ].join('\n');
    const requiredKeyOrder = requestedTypes.join(' → ');
    const jsonExamples = `{${requestedTypes.map((type) => this.settlementTypeJsonExample(type, participants, store, config)).join(',')}}`;
    const antiExamples = requestedTypes.map((type) => this.settlementTypeAntiExample(type)).filter(Boolean).join('\n') || '无';
    const rulesText = [
      `你正在执行 ${config.settlementStageLabel || 'Stage4 状态结算'}。`,
      '只输出一个合法 JSON 对象；不要 Markdown；不要 ```json 代码块；不要换行；不要解释；不要内部分析。',
      '上一条 assistant 消息是本轮正文材料；只能依据该正文和本条要求中的材料结算。',
      'JSON 顶层 key 只能是“本次必须返回的类型”列出的类型；已完成类型不得重复输出；未列入类型不得输出。',
      '无稳定变化的非基础类型必须输出空数组 []，不要写“无变化”。',
      '情绪、感觉、生命体征、性经历的 value/delta 必须写 +N 或 -N；禁止写 0、+0、100、98/100、正常、无变化。',
      '字段名必须使用合约中的中文 key；禁止输出英文顶层 key，例如 life_signs、relationship、role_card。',
      '感觉主体只能是出场 NPC；玩家本人不得输出感觉更新。',
      '关系 dimension 必须是稳定关系类别，禁止写好感、信任、依赖、警惕、开心、恐惧等数值态度或情绪。',
      '每条更新只能写一个字段，禁止把字段合并成“当前地点/当前行动/可用状态”或“事件/记录/状态”。',
      '角色卡与人事归属仅处理本轮新确认或变化的稳定事实；有背景依据时必须完整补全四类身份格式，完全没有依据或本轮无变化时才输出 []；禁止模糊占位。',
    ].join('\n');
    const requestText = [
      `任务：输出 ${config.settlementStageLabel || 'Stage4 状态结算'}紧凑 JSON。`,
      `本次必须返回的类型：${requestedTypes.join('、')}`,
      `已完成类型：${completedTypes.join('、') || '无'}`,
      `未完成类型：${incompleteTypes.join('、') || '无'}`,
      `必须输出 key 数量：${totalTypes}`,
      `必须输出 key 顺序：${requiredKeyOrder || '无'}`,
      `未完成类型原因：${incompleteReason}`,
      `本回合参与者：${JSON.stringify(participants)}`,
      '本轮结算材料：',
      [
        `行动：${this.actionText(action)}`,
        this.settlementParticipantContextText(store, participants),
        this.settlementMetricBaselineText(store, participants),
        requestedTypes.includes('操控体验') ? this.settlementControlExperienceBaselineText(store, participants, config) : '',
        requestedTypes.includes('角色卡物品') ? this.roleCardInventorySettlementContext(store, participants) : '',
        requestedTypes.includes('角色卡复核') ? this.roleCardReviewSettlementContext(store, participants, priorStageSummary) : '',
        stableFactRules,
      ].filter(Boolean).join('\n'),
      '类型短规则：',
      requestedTypes.map((type) => this.settlementTypeShortRule(type)).join('\n\n'),
      'JSON 合约：',
      jsonContracts,
      '本次窗口合法 JSON 示例，只能参考结构；没有正文证据时对应数组必须改成 []：',
      jsonExamples,
      '本次窗口常见错误反例，必须避免：',
      antiExamples,
      '输出硬规则：',
      '- 只输出一个紧凑 JSON 对象，首字符必须是 {，末字符必须是 }。',
      '- 顶层 key 必须且只能包含本次必须返回的类型；按必须输出 key 顺序排列。',
      '- 基础结算必须输出完整对象；非基础类型必须输出数组，有变化写对象数组，无变化写 []。',
      '- subject 必须直接写本回合参与者姓名、明确地点名、明确势力名或“系统”；不要写代词。',
      '- reason/evidence 必须写具体行为、对话或连续动作证据；弱氛围暗示不得结算。',
      '- 情绪、感觉、生命体征、性经历的 value/delta 必须是带符号非零变化，例如 +2 或 -1；没有变化输出 []。',
      '- 情绪/感觉每条必须含 field、value、reason；status 写变化后程度表现（禁止“指标名+数值：”前缀），缺省则系统按新数值生成模板解释。',
      '- 感觉数组中 subject 只能写出场 NPC，不能写玩家姓名。',
      '- 关系数组中 left/right/dimension/status/reason/result 都必须有；dimension 不能是好感/信任/依赖/警惕等感觉指标。',
      '- 角色卡 op 只能写“替换”或“增加”；不能写保持、无变化、更新。',
      '- 角色卡禁止写当前地点/当前位置/当前行动/可用状态；这些只能写「人事安排」。',
      '- 操控体验必须先写 needUpdate 与 updateFields；adaptation 只写增量；文本字段覆盖；不要输出 onlineCount。',
      '- 字符串中不要使用英文逗号或中文逗号分隔多字段；必要时用顿号或分号。',
      '- 不要为了凑长度创造更新；空数组是合法完整输出。',
      '合法形态示例：{"情绪":[],"身体状态":[{"subject":"角色名","part":"整体","status":"全身状态","reason":"证据"},{"subject":"角色名","part":"胸部","status":"局部状态","reason":"证据"}],"系统记录":[]}',
    ].join('\n');
    return [
      { role: 'user', content: rulesText },
      { role: 'assistant', content: `本轮正文：\n${this.compactUpdatePromptText(narration, 1800, true)}` },
      { role: 'user', content: requestText },
    ];
  },

  async completeConfiguredSettlementKvWindow({ store, action, base, loaded, materialSession = null, narration, trace = [], participants = [], logId = null, config = this.realConfig(), types = null, priorStageSummary = null }) {
    const allTypes = Array.isArray(types) ? types.filter(Boolean) : this.settlementTypeQueue(config, store);
    const completedTypes = [];
    const partialByType = {};
    const patchesByType = {};
    let requestedTypes = this.nextSettlementWindow(allTypes, completedTypes, []);
    let shortOutputRetries = 0;
    const maxAttempts = 1;
    for (let attempt = 0; attempt < maxAttempts && requestedTypes.length; attempt += 1) {
      const stageLabel = config.settlementStageLabel || 'Stage4 状态结算';
      this.patchConfiguredSettlementThinking(store, logId, `${stageLabel}：正在结算 ${requestedTypes.join('、')}。`, { ...config, settlementThinking: true, settlementThinkingKey: 'settlement-status', settlementThinkingLabel: '结算状态', livePatch: true });
      const messages = await this.buildSettlementTypeWindowMessages({ requestedTypes, completedTypes, incompleteTypes: requestedTypes.filter((type) => partialByType[type]), partialByType, store, action, base, loaded, materialSession, narration, trace, participants, config, priorStageSummary });
      const raw = await this.completeConfiguredStep(store, messages, logId, false, { ...config, sourceTitle: config.sourceTitle || `${config.label}${stageLabel}`, promptId: config.settlementPromptId || 'inference-stage4-settlement-window', settlementAttempt: attempt });
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
        requestedTypes.forEach((type) => {
          if (!completedTypes.includes(type)) completedTypes.push(type);
          patchesByType[type] = patchesByType[type] || {};
          delete partialByType[type];
        });
        requestedTypes = [];
        break;
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
        if (!completedTypes.includes(type)) completedTypes.push(type);
        patchesByType[type] = patchesByType[type] || {};
        delete partialByType[type];
      });
      if (acceptedShortReason && parsed.incompleteTypes.length) partialByType.__shortOutputReason = acceptedShortReason;
      requestedTypes = this.nextSettlementWindow(allTypes, completedTypes, parsed.incompleteTypes);
    }
    requestedTypes = this.nextSettlementWindow(allTypes, completedTypes, []);
    if (requestedTypes.length) throw new Error(`Stage4 状态结算类型未完成：${requestedTypes.join('、')}`);
    this.patchConfiguredSettlementThinking(store, logId, `${config.settlementStageLabel || 'Stage4 状态结算'}：结算窗口已完成。`, { ...config, settlementThinking: true, settlementThinkingKey: 'settlement-status', settlementThinkingLabel: '结算状态', livePatch: true });
    return this.mergeGroupedUpdatePatches(Object.values(patchesByType), {});
  },

  mergeGroupedUpdatePatches(patches = [], route = {}) {
    const merged = { type: 'final', genericUpdates: [], events: [] };
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
      if (Array.isArray(patch.events)) merged.events.push(...patch.events);
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

  sceneAnchorFields() {
    return ['场景锚定报告', '当前地点', '当前时间', '空间状态', '当前动作', '强制出场', '高优先候选', '戏剧候选', '禁止出场', '随机事件影响', '正文写作重点', '当前场景影响对象'];
  },

  settlementBaseFields() {
    return ['基础结算', '结算状态', '经过时间', '当前状态', '当前目标', '场景标题', '地点名称', '备选行动1', '备选行动2', '备选行动3', '备选行动4', '结算结束'];
  },

  splitKvLine(line = '') {
    const text = String(line || '').trim();
    const match = text.match(/^([^：:\n]{1,40})[：:]\s*([\s\S]*)$/u);
    return match ? { key: match[1].trim(), value: match[2].trim() } : null;
  },

  parseJsonMaterialRequest(item = null, options = {}) {
    const ctx = options.config?.ctx || window.GameModules.realWorldAgentContext;
    if (typeof ctx?.parseJsonMaterialRequest === 'function') return ctx.parseJsonMaterialRequest(item, { mode: options.config?.mode, store: options.store });
    return null;
  },

  summarizeDroppedMaterialRequests(lines = [], limit = 3) {
    const unique = [...new Set((lines || []).map((line) => String(line || '').trim()).filter(Boolean))];
    if (!unique.length) return '无';
    const shown = unique.slice(0, limit).join('；');
    return unique.length > limit ? `${shown}；等${unique.length}条` : shown;
  },

  async completeParsedStep(store, prompt, logId, streamToUi = false, allowProseFinal = false) {
    return await this.completeConfiguredParsedStep(store, prompt, logId, streamToUi, allowProseFinal, this.realConfig());
  },

  async completeConfiguredParsedStep(store, prompt, logId, streamToUi = false, allowProseFinal = false, config = this.realConfig(), allowContextDoneOnProse = false) {
    let lastRaw = '';
    let bestRaw = '';
    let lastErr = null;
    for (let i = 0; i < 2; i += 1) {
      const stageStep = Math.max(1, Number(config.guidedStep) || 1);
      lastRaw = await this.completeConfiguredStep(store, prompt, logId, streamToUi, {
        ...config,
        guidedStep: stageStep,
        promptId: config.firstTemplateId || 'inference-stage1-guided-query',
        sourceTitle: config.sourceTitle || `${config.label}${this.stagePhaseLabel('stage1', stageStep)}`,
        reasoningPhase: 'stage1',
      });
      if (this.fallbackScore(lastRaw) >= this.fallbackScore(bestRaw)) bestRaw = lastRaw;
      if (allowContextDoneOnProse && this.looksLikeProseInsteadOfStepJson(lastRaw)) {
        console.warn(`${config.label}资料阶段误返回正文，视为资料已足够并进入正文阶段。`);
        return { raw: lastRaw, data: this.contextDoneFromProse(lastRaw) };
      }
      try {
        const data = this.parseStep(lastRaw, config);
        if (data) return { raw: lastRaw, data };
        if (i === 1) return { raw: lastRaw, data: allowProseFinal ? this.proseFinal(store, bestRaw || lastRaw) : null };
        console.warn(`${config.label}格式不完整，自动重试一次`);
      } catch (err) {
        lastErr = err;
        if (allowContextDoneOnProse && this.looksLikeProseInsteadOfStepJson(lastRaw)) {
          console.warn(`${config.label}资料阶段解析到正文内容，视为资料已足够并进入正文阶段。`);
          return { raw: lastRaw, data: this.contextDoneFromProse(lastRaw) };
        }
        if (!this.isRetryableParseError(err) || i === 1) break;
        const semanticSelfCheckFailed = this.isGuidedStepSemanticSelfCheckError(err);
        const parseDetail = err.parseResult ? `score=${err.parseResult.score}/${err.parseResult.maxScore} successRate=${err.parseResult.successRate} missing=${err.parseResult.missing?.join('、') || '无'} droppedMaterialRequests=${this.summarizeDroppedMaterialRequests(err.parseResult?.droppedMaterialRequests || [])}` : '';
        console.warn(`${config.label}${semanticSelfCheckFailed ? '语义自检失败' : '解析异常'}，自动重试一次:`, err.message, parseDetail);
        const retryInstruction = this.stage1JsonRetryInstruction(err, semanticSelfCheckFailed);
        prompt = Array.isArray(prompt)
          ? [...prompt, { role: 'user', content: retryInstruction }]
          : [prompt, retryInstruction].join('\n\n');
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
    const base = {
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
      const raw = await this.completeConfiguredStep(store, nextPrompt, logId, false, {
        ...config,
        promptId: 'inference-stage4-settlement-window',
        sourceTitle: config.sourceTitle || `${config.label}Stage4 状态结算`,
        reasoningPhase: 'stage4',
      });
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
    const payload = {
      type: 'final',
      sceneTitle: updates.sceneTitle || store.realWorldSceneTitle || '现实世界',
      locationName: updates.locationName || store.realWorldLocationName || store.realWorldMap?.current || '',
      parentLocationName: updates.parentLocationName || '',
      locationDescription: updates.locationDescription || '',
      mapNodes: Array.isArray(updates.mapNodes) ? updates.mapNodes : [],
      newLocations: Array.isArray(updates.newLocations) ? updates.newLocations : [],
      locationDescriptionUpdates: Array.isArray(updates.locationDescriptionUpdates) ? updates.locationDescriptionUpdates : [],
      narration: this.formatConfiguredNarration(narration),
      elapsedSeconds: Math.max(1, Number(updates.elapsedSeconds) || 300),
      status: updates.status || store.realWorldStatus || '现实推演继续中',
      quest: updates.quest || store.realWorldQuest || '确认现实处境',
      choices: window.GameModules.ai.normalizeChoices?.(updates.choices, store.realWorldChoices || ['观察手机异常', '处理现实事务', '联系熟人', '暂时休息']) || [],
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
      moneySettlement: updates.moneySettlement || null,
      entitySettlement: updates.entitySettlement || null,
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
      sceneTitle: String(updates.sceneTitle || fallback.sceneTitle || store.sceneTitle || '剧情继续').slice(0, 12),
      narration: this.formatConfiguredNarration(narration),
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
      .replace(/<\/?正文尾部>/gu, '')
      .replace(/\n*\s*(?:你能)?请从上述正文最后一个字符之后继续[\s\S]*?完整句号、问号、感叹号或右引号结束。?/gu, '')
      .replace(/\n*\s*现在仅输出正文后续suffix。?\s*$/gu, '')
      .trim();
  },

  chineseCharCount(text = '') {
    const plain = window.GameModules.narrationRoleMarkup?.stripRoleMarkup?.(text) || String(text || '');
    return (plain.match(/[\u3400-\u9fff]/gu) || []).length;
  },

  narrationTailLooksIncomplete(text = '') {
    const raw = window.GameModules.narrationRoleMarkup?.stripRoleTags?.(text) || String(text || '').trim();
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
    return this.formatConfiguredNarration(trimmed);
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
    const output = await this.completeConfiguredStep(store, continuationPrompt, logId, false, {
      ...config,
      promptId: config.templateId || 'inference-stage3-narration',
      sourceTitle: `${config.label}Stage3 正文生成｜补全`,
      reasoningPhase: 'stage3',
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
      reasoningPhase: options.reasoningPhase,
      // JSON 阶段统一开启 API JSON mode，并默认关闭思考模式，避免与 DeepSeek JSON 返回互斥。
      deepThinking: false,
      jsonMode: options.jsonMode !== false,
      responseFormat: options.responseFormat || (options.jsonMode === false ? undefined : { type: 'json_object' }),
      outputLimitKind: options.outputLimitKind || 'stage4',
      model: options.model,
      maxTokens: options.maxTokens,
      maxAttempts: options.maxAttempts,
      timeoutMs: options.timeoutMs,
      tokenMeta: options.tokenMeta,
    };
    const session = this.resolveKvCacheSession(store, 'real', options.kvCacheSession || null);
    let config = session ? { ...baseConfig, kvCacheSession: session } : this.withDeepSeekKvCacheSession(store, baseConfig);
    const shouldPersist = config.kvCacheSession && config.kvCacheSession.persist !== false && !config.kvCacheSession.fork;
    const logId = options.logId || null;
    const output = await this.completeConfiguredStep(store, options.prompt || '', logId, false, config);
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
    if (has('deepThinking')) overrides.deepThinking = config.deepThinking;
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
    if (!config.contextRoundId) {
      const kvMode = this.kvMode(config);
      const contextRoundId = kvCacheSession?.currentRoundId || `${kvMode}-round-${Date.now()}-${++this.kvCacheSeq}`;
      config = { ...config, contextRoundId };
    }
    if (kvCacheSession) {
      kvCacheSession.currentRoundId = config.contextRoundId;
      kvCacheSession.model = config.model || store?.modelId || store?.settingsState?.textModelId || '';
    }
    let buffer = '';
    let doneSeen = false;
    let doneInfo = {};
    let lastPaint = 0;
    let lastReasoningPaint = 0;
    const reasoningMeta = this.reasoningSectionMeta(config);
    const reasoningKey = String(config.reasoningKey || reasoningMeta.id);
    const normalizedPhase = this.normalizeReasoningPhase(config.reasoningPhase || (streamToUi ? 'stage3' : 'unknown'));
    const contextMeta = this.requestContextMeta({ ...config, reasoningPhase: normalizedPhase }, streamToUi);
    const currentMessages = this.promptToMessages(prompt, contextMeta);
    const kvMessages = kvCacheSession ? this.messagesForDeepSeekKvCache(kvCacheSession, prompt, contextMeta) : null;
    try {
      const completionOptions = this.configuredCompletionOptions(config, streamToUi);
      const expectsJson = Boolean(completionOptions.jsonMode);
      // 仅 Stage3 正文启用思考模式；其余阶段无论是否 JSON 都明确关闭。
      const requestJsonMode = expectsJson;
      const wantsDeepThinking = normalizedPhase === 'stage3'
        && !requestJsonMode
        && completionOptions.deepThinking !== false
        && config.deepThinking !== false;
      // JSON mode 与思考模式互斥，但不与流式响应互斥；Stage1/Stage2 等 JSON 阶段仍实时接收 JSON 文本。
      const shouldStream = true;
      const defaultTimeoutMs = normalizedPhase === 'stage3'
        ? (streamToUi ? 480000 : 180000)
        : (streamToUi ? 240000 : 90000);
      const requestOptions = {
        source: config.sourceTitle
          || (reasoningMeta.phase && reasoningMeta.phase !== 'unknown'
            ? `${config.label || ''}${reasoningMeta.label}`
            : (streamToUi ? `${config.mode}-agent-loop` : `${config.mode}-agent-context`)),
        model: config.model || store.modelId,
        ...(kvMessages ? { messages: kvMessages } : (currentMessages ? { messages: currentMessages } : { prompt })),
        deepThinking: wantsDeepThinking,
        deepThinkingEffort: config.deepThinkingEffort || (normalizedPhase === 'stage3' ? 'low' : 'high'),
        jsonMode: requestJsonMode,
        responseFormat: requestJsonMode ? (completionOptions.responseFormat || { type: 'json_object' }) : undefined,
        stream: shouldStream,
        timeoutMs: Number(config.timeoutMs) || defaultTimeoutMs,
        requireDone: true,
        outputLengthThreshold: 2600,
        outputLimitKind: completionOptions.outputLimitKind,
        maxAttempts: Number(config.maxAttempts) || 3,
        onTokenRecord: (tokenRecordId) => {
          if (!tokenRecordId || !logId) return;
          const patchPromptPack = (entry = {}) => ({
            ...(entry.promptPack || {}),
            runtimeRecordId: tokenRecordId,
            tokenRecordId,
            model: config.model || store.modelId,
          });
          if (config.mode === 'story') {
            const entry = (store.novel || []).find((item) => item?.id === logId) || {};
            store.attachNovelPrompt?.(logId, patchPromptPack(entry));
            return;
          }
          const entry = (store.realWorldLog || []).find((item) => item?.id === logId)
            || window.GameModules.realWorldLogStore?.get?.(logId)
            || {};
          store.patchRealWorldLogEntry?.(logId, { promptPack: patchPromptPack(entry) }, { live: true });
        },
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
            if (this.isSettlementReasoning(config)) {
              this.patchConfiguredSettlementThinking(store, logId, reasoningText, { ...config, ...reasoningMeta, reasoningKey: `settlement-${reasoningKey}`, livePatch: true });
            } else {
              this.patchConfiguredReasoning(store, logId, reasoningText, { ...config, ...reasoningMeta, reasoningKey, livePatch: true });
            }
          }
          if (requestJsonMode && info.buffer && (done || now - lastPaint > 120)) {
            const liveJson = `正在接收 JSON：\n${info.buffer}`;
            if (this.isSettlementReasoning(config)) {
              this.patchConfiguredSettlementThinking(store, logId, liveJson, {
                ...config,
                ...reasoningMeta,
                settlementThinkingKey: `settlement-${reasoningKey}-json`,
                livePatch: true,
              });
            } else {
              this.patchConfiguredReasoning(store, logId, liveJson, {
                ...config,
                ...reasoningMeta,
                reasoningKey: `${reasoningKey}-json`,
                livePatch: true,
              });
            }
            lastPaint = now;
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
      if (config.tokenMeta) requestOptions.tokenMeta = config.tokenMeta;
      const output = await window.GameModules.aiRequest.complete(requestOptions);
      const latestRequestId = config.mode === 'story' ? window.GameModules.ai.latestRequestId : window.GameModules.realWorldAi.latestRequestId;
      if (requestId !== latestRequestId) {
        const err = new Error(`${config.label}推演请求已被停止`);
        err.code = 'AI_REQUEST_SUPERSEDED';
        throw err;
      }
      if (streamToUi && logId && buffer) {
        if (config.mode === 'story') store.updateStoryAgentStream?.(logId, buffer);
        else store.updateRealWorldStream?.(logId, buffer, { live: true });
      }
      if (kvMessages) this.rememberDeepSeekKvCache(kvCacheSession, kvMessages, output, { ...doneInfo, contextMeta });
      return output;
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
    const inner = String((paren || dashed)?.[2] || '').trim().slice(0, 160);
    const idApi = window.GameModules.characterIdEnsure;
    const looksLikeId = Boolean(
      inner
      && (
        idApi?.isRealCharacterId?.(inner)
        || idApi?.isPendingId?.(inner)
        || /^(?:pending|new|待建卡|\?)$/iu.test(inner)
        || /^(?:player-self|rel-ai-[\w-]+)$/iu.test(inner)
      ),
    );
    const id = looksLikeId ? inner : '';
    const reason = looksLikeId ? '' : inner;
    return name && name !== '无' ? { name, id: id || undefined, reason: reason || undefined } : null;
  },

  assertParticipantIdTokens(list = [], label = 'participants') {
    const rows = Array.isArray(list) ? list : [];
    rows.forEach((item) => {
      if (!item || typeof item !== 'object') return;
      if (!String(item.id || '').trim()) {
        item.id = '待建卡';
        item.idOrName = item.idOrName || '待建卡';
        console.warn(`[Stage1] ${label}缺少ID，已临时补为待建卡：`, item.name || item.idOrName);
      }
    });
  },

  normalizeParticipantList(value = [], defaultRole = 'mentioned') {
    const list = Array.isArray(value) ? value : this.splitNameList(value);
    return list.map((item) => {
      if (typeof item === 'string') {
        const parsed = this.parseParticipantToken(item);
        if (!parsed) return null;
        const id = parsed.id || '待建卡';
        return {
          type: 'character',
          id,
          idOrName: id,
          name: parsed.name,
          role: defaultRole,
          reason: parsed.reason || undefined,
        };
      }
      const parsed = this.parseParticipantToken(item?.name || item?.characterName || item?.idOrName || '');
      const name = parsed?.name || String(item?.name || item?.characterName || '').trim();
      const id = String(item?.id || parsed?.id || '').trim() || '待建卡';
      return name ? {
        type: String(item?.type || 'character').slice(0, 20),
        id,
        idOrName: id || item?.idOrName || name,
        name,
        role: String(item?.role || defaultRole).slice(0, 40),
        reason: item?.reason ? String(item.reason).slice(0, 160) : parsed?.reason || undefined,
        canLoadRoleCard: item?.canLoadRoleCard === false ? false : undefined,
        canEnterNarration: item?.canEnterNarration === false ? false : undefined,
        canSettle: typeof item?.canSettle === 'boolean' ? item.canSettle : undefined,
      } : null;
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

  guidedStepDataFromJson(data = {}, raw = '', config = this.realConfig()) {
    const sceneQueriesRaw = data.sceneQueries || {};
    const participantsRaw = data.participants || {};
    const forcedParticipants = this.normalizeParticipantList(participantsRaw.forced || [], 'forced');
    const priorityCandidates = this.normalizeParticipantList(participantsRaw.priority || [], 'priority-candidate').map((item) => ({ ...item, canSettle: false }));
    const dramaCandidates = this.normalizeParticipantList(participantsRaw.drama || [], 'drama-candidate').map((item) => ({ ...item, canSettle: false }));
    const forbiddenParticipants = this.normalizeParticipantList(participantsRaw.forbidden || [], 'forbidden').map((item) => ({ ...item, canLoadRoleCard: false, canEnterNarration: false, canSettle: false }));
    const factions = this.normalizeFactionReferenceList(data.factions || []);
    this.assertParticipantIdTokens(forcedParticipants, 'forced');
    this.assertParticipantIdTokens(priorityCandidates, 'priority');
    this.assertParticipantIdTokens(dramaCandidates, 'drama');
    this.assertParticipantIdTokens(forbiddenParticipants, 'forbidden');
    const materialRequestErrors = [];
    const materialRequests = (data.materialRequests || []).slice(0, 3).map((item) => {
      const req = this.parseJsonMaterialRequest(item, { config });
      if (!req) materialRequestErrors.push(`Stage1 materialRequests 无法映射到可用资料目录：${JSON.stringify(item)}`);
      return req;
    }).filter(Boolean);
    if (materialRequestErrors.length) {
      const err = new Error(materialRequestErrors[0]);
      err.skipMerge = true;
      throw err;
    }
    const sceneQueries = {
      location: Array.isArray(sceneQueriesRaw.location) ? sceneQueriesRaw.location.map((item) => String(item || '').trim()).filter((item) => this.isUsefulQueryReason(item)).slice(0, 12) : [],
      causality: Array.isArray(sceneQueriesRaw.causality) ? sceneQueriesRaw.causality.map((item) => String(item || '').trim()).filter((item) => this.isUsefulQueryReason(item)).slice(0, 12) : [],
      conflict: Array.isArray(sceneQueriesRaw.conflict) ? sceneQueriesRaw.conflict.map((item) => String(item || '').trim()).filter((item) => this.isUsefulQueryReason(item)).slice(0, 12) : [],
    };
    const blocked = this.participantNameSet(forcedParticipants, priorityCandidates, dramaCandidates, forbiddenParticipants);
    const status = String(data.status || '').trim();
    const hasActionableRequests = materialRequests.length > 0;
    const hasRoleCardCandidates = forcedParticipants.length > 0 || priorityCandidates.length > 0 || dramaCandidates.length > 0;
    const hasSceneQueryReasons = Object.values(sceneQueries).some((items) => items.length > 0);
    const isContextDone = status === '资料已足够' || (!hasRoleCardCandidates && !hasActionableRequests && !hasSceneQueryReasons);
    return {
      type: isContextDone ? 'context_done' : 'request_context',
      guidanceText: String(raw || '').trim(),
      reason: String(data.plan || '').trim(),
      requests: materialRequests,
      needed: [],
      characters: [],
      participants: forcedParticipants,
      forcedParticipants,
      priorityCandidates,
      dramaCandidates,
      forbiddenParticipants,
      factions,
      randomActiveEvents: this.normalizeRandomActiveEvents(data.randomEvents || [], blocked),
      sceneQueries,
      sceneQueriesAreReasons: true,
      randomIntrusionCondition: String(data.randomIntrusionCondition || '').trim() || '无明确条件则禁止闯入',
      parseScore: { score: 1, maxScore: 1, successRate: 1 },
      parseDegraded: false,
      droppedMaterialRequests: [],
      mergeConflicts: [],
      missingContext: status === '继续请求资料' && (hasActionableRequests || hasRoleCardCandidates),
    };
  },

  parseGuidedStepJson(raw, config = this.realConfig()) {
    const data = this.parseStrictStage1Json(raw);
    if (!data || Array.isArray(data) || typeof data !== 'object') return null;
    return this.guidedStepDataFromJson(data, JSON.stringify(data), config);
  },

  parseStrictStage1Json(raw = '') {
    const text = String(raw || '').replace(this.invisibleCharsPattern(), '').trim();
    if (!text || text[0] !== '{' || text[text.length - 1] !== '}') return null;
    try {
      const data = JSON.parse(text);
      if (!data || Array.isArray(data) || typeof data !== 'object') return null;
      const requiredKeys = ['plan', 'status', 'sceneQueries', 'participants', 'factions', 'randomEvents', 'randomIntrusionCondition', 'materialRequests'];
      const missingKey = requiredKeys.find((key) => !Object.prototype.hasOwnProperty.call(data, key));
      if (missingKey) throw new Error(`Stage1 JSON 缺少必要字段：${missingKey}`);
      if (!data.sceneQueries || typeof data.sceneQueries !== 'object' || Array.isArray(data.sceneQueries)) throw new Error('Stage1 sceneQueries 必须是 JSON object');
      if (!data.participants || typeof data.participants !== 'object' || Array.isArray(data.participants)) throw new Error('Stage1 participants 必须是 JSON object');
      if (!Array.isArray(data.factions)) throw new Error('Stage1 factions 必须是标准 JSON 对象数组，禁止使用“势力名(ID)”字符串壳');
      if (!Array.isArray(data.randomEvents)) throw new Error('Stage1 randomEvents 必须是字符串数组');
      if (!Array.isArray(data.materialRequests)) throw new Error('Stage1 materialRequests 必须是标准 JSON 对象数组，禁止使用字符串壳');
      if (data.factions.some((item) => !item || typeof item !== 'object' || Array.isArray(item))) {
        throw new Error('Stage1 factions 必须是标准 JSON 对象数组，禁止使用“势力名(ID)”字符串壳');
      }
      if (data.materialRequests.some((item) => !item || typeof item !== 'object' || Array.isArray(item))) {
        throw new Error('Stage1 materialRequests 必须是标准 JSON 对象数组，禁止使用字符串壳');
      }
      if (data.materialRequests.some((item) => typeof item.type !== 'string' || typeof item.action !== 'string' || !Array.isArray(item.params))) {
        throw new Error('Stage1 materialRequests 每项必须包含 type/action/params，且 params 必须是数组');
      }
      return data;
    } catch (err) {
      const error = new Error(`Stage1 JSON 解析失败：${err?.message || '未知错误'}`);
      error.skipMerge = true;
      throw error;
    }
  },

  parseStep(raw, config = this.realConfig()) {
    const jsonData = this.parseGuidedStepJson(raw, config);
    if (jsonData) return jsonData;
    throw new Error(`${config.label}Stage1 必须返回标准 JSON 对象，禁止 JSON 外壳文本`);
  },

  isGuidedStepSemanticSelfCheckError(err) {
    return String(err?.message || '').includes('资料状态为继续请求资料时，必须输出可执行的 materialRequests 对象、结构化查询或明确参与者候选');
  },

  isRetryableParseError(err) {
    return this.isGuidedStepSemanticSelfCheckError(err) || ['截断', '分隔符后缺少 JSON', '缺少正文', 'JSON missing', '解析错误请重试', 'Stage1 JSON', '必须返回标准 JSON'].some((text) => String(err?.message || '').includes(text));
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
      factions: data?.factions || [],
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
    const formatted = this.formatConfiguredNarration(narration);
    if (config.mode === 'story') {
      store.updateNovelEntry?.(logId, { storyText: formatted, streaming: true, streamTrace: [] });
      return;
    }
    store.patchRealWorldLogEntry?.(logId, { narration: formatted, streaming: true, streamTrace: [] });
    const entry = (store.realWorldLog || []).find((item) => item?.id === logId);
    if (entry) store.persistRealWorldLogEntries?.([{ ...entry, narration: formatted, streaming: true, streamTrace: [] }]);
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
    if (!text) return true;
    if (text.length >= 200) return false;
    return /^(?:作者正在续写这一段剧情|操控剧情正在识别|操控剧情正在推演|已识别相关角色|已追加资料)/u.test(text)
      || /资料已载入|场景锚定|正在生成正文|正文已完成|批量分配ID|正在推演|正在识别|正在结算/u.test(text);
  },

  shouldUseStatusAsRealNarration(entry = {}) {
    const text = String(entry?.narration || '').trim();
    if (!text) return true;
    // 真实正文通常很长；短进度文案应允许被后续状态覆盖（含“正在生成场景锚定报告”→“正在生成正文”）。
    if (text.length >= 200) return false;
    return /^(?:现实世界正在推演|现实正在识别|现实正在推演|已识别相关角色|已追加资料)/u.test(text)
      || /资料已载入|场景锚定|正在生成正文|正文已完成|批量分配ID|正在推演|正在识别|正在结算|正在写入/u.test(text);
  },
  loadedContextText(data = {}, loaded = [], step = 1, config = this.realConfig()) {
    const fallback = config.mode === 'story' ? '被操控角色' : '玩家本人';
    const chars = (data.characters || []).map((item) => item.name || item.id || item).filter(Boolean).join('、') || fallback;
    const titles = loaded.map((item) => item.title).join('、') || '角色记忆';
    return `${step === 1 ? '已识别相关角色' : '已追加资料'}：${chars}；已载入${titles}${data.reason ? `：${data.reason}` : ''}`;
  },
};
