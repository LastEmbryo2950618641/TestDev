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
    return { mode: 'story', label: '操控剧情', ctx: window.GameModules.storyAgentContext, materials: window.GameModules.workLoreMaterials, templateId: 'inference-stage3-narration', firstTemplateId: 'inference-stage1-guided-query' };
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

  /**
   * 把外部事件（如微信对话）追加进持久推演上下文。
   * 存档字段 realWorldAgentKvByMode 会随存档恢复；缓存失效时仍保留对话链。
   */
  appendExternalContextMessage(store, content = '', mode = 'real', role = 'user') {
    const text = String(content || '').trim();
    if (!store || !text) return null;
    const message = { role: role === 'assistant' ? 'assistant' : 'user', content: text };
    const live = this.activeKvCacheSession(store, mode) || this.pendingKvCacheSession(store, mode);
    if (live && Array.isArray(live.messages)) {
      live.messages = [...live.messages, message];
      this.persistAgentConversation(store, live, mode);
      return message;
    }
    const prior = this.loadPersistedAgentMessages(store, mode);
    prior.push(message);
    store.realWorldAgentKvByMode = store.realWorldAgentKvByMode || {};
    const prev = store.realWorldAgentKvByMode[mode] || {};
    store.realWorldAgentKvByMode[mode] = {
      messages: prior,
      updatedAt: Date.now(),
      requestCount: Math.max(0, Math.round(Number(prev.requestCount) || 0)),
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
    const byPromptId = {
      'inference-stage1-guided-query': 'stage1',
      'inference-stage2-scene-anchor': 'stage2',
      'inference-stage3-narration': 'stage3',
      'inference-stage4-settlement-window': 'stage4',
      'inference-stage5-profile-gate': 'stage5',
      'inference-stage5-body-profile-patch': 'stage6',
      'inference-stage5-dressed-profile-patch': 'stage7',
      'inference-stage6-faction-update': 'stage8',
      'inference-stage10-life-energy-exp': 'stage10',
      'real-world-map-surround-unlock': 'stage9',
    };
    if (byPromptId[promptId]) return byPromptId[promptId];
    if (config.guidedStep) return 'stage1';
    const sourceTitle = String(config.sourceTitle || '');
    if (/Stage\s*10|生命层次/iu.test(sourceTitle)) return 'stage10';
    if (/Stage\s*9|周围解锁/iu.test(sourceTitle)) return 'stage9';
    if (/Stage\s*8|势力更新/iu.test(sourceTitle)) return 'stage8';
    if (/Stage\s*7|盛装外观补丁/iu.test(sourceTitle)) return 'stage7';
    if (/Stage\s*6|自然外观补丁/iu.test(sourceTitle)) return 'stage6';
    if (/Stage\s*5|外观判定/iu.test(sourceTitle)) return 'stage5';
    if (sourceTitle.includes('场景锚定') || /Stage\s*2/iu.test(sourceTitle)) return 'stage2';
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
      stage5: 'Stage5 外观判定',
      stage6: 'Stage6 自然外观补丁',
      stage7: 'Stage7 盛装外观补丁',
      stage8: 'Stage8 势力更新',
      stage9: 'Stage9 电子地图周围解锁',
      stage10: 'Stage10 经验结算',
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
    if (/^stage(?:[2-9]|10)$/u.test(phase)) {
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
    const match = String(label || '').trim().match(/^Stage\s*([1-9])(?:\s*[^\d-]*?)?(?:\s*[-–—]\s*(\d+))?/iu);
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
      const fallbackLabels = {
        stage2: 'Stage2 场景锚定',
        stage3: 'Stage3 正文生成',
        stage5: 'Stage5 外观判定',
        stage6: 'Stage6 自然外观补丁',
        stage7: 'Stage7 盛装外观补丁',
        stage8: 'Stage8 势力更新',
        stage9: 'Stage9 电子地图周围解锁',
        stage10: 'Stage10 经验结算',
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
    return /^(stage[4-9])$/u.test(phase);
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
      settlementThinkingOpen: entry.settlementThinkingOpen !== false,
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
    store.realWorldAgentActiveKvByMode[config.mode] = config.kvCacheSession || null;
    const ctx = config.ctx;
    if (!ctx) throw new Error(`${config.label || 'Loop'}上下文未加载`);
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
        if (!data) throw new Error(`${config.label || 'Loop'}返回格式错误`);
        lastGuidance = data;
        const traceItem = this.traceItem(step, data, raw.raw, ctx);
        trace.push(traceItem);

        const results = await this.loadStepContext(ctx, store, action, data, loadedKeys, loaded, memoryIds, step, materialSession, config.materials, config);
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
      // 主循环结束后把本轮 KV 暂存为 pending，供 Stage9 地图周围解锁继续追加命中前缀缓存。
      if (store.realWorldAgentActiveKvByMode?.[config.mode] === (config.kvCacheSession || null)) {
        store.realWorldAgentPendingKvByMode = store.realWorldAgentPendingKvByMode || {};
        if (config.kvCacheSession) store.realWorldAgentPendingKvByMode[config.mode] = config.kvCacheSession;
        delete store.realWorldAgentActiveKvByMode[config.mode];
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
        this.markConfiguredStep?.(store, logId, `${config.label}Stage1后批量建卡 ${batch.count} 人…`, config);
        console.info('[characterIdEnsure] Stage1后批量建卡:', batch.ensured);
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
      console.warn('[characterIdEnsure] Stage1后批量建卡失败:', err?.message || err);
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

    const postStage3Checkpoint = this.snapshotKvMessages(config.kvCacheSession);
    const stage5KvConfig = {
      ...config,
      kvCacheSession: this.forkKvCacheSession(config.kvCacheSession, postStage3Checkpoint),
    };

    let settlementPrompt = 'Stage4 状态结算', settlementRaw = '', updates = {}, profilePatches = [];
    const participants = this.mergeNarrationParticipants(this.stageParticipants(effectiveSceneLayers, loaded, store), narration, store, sceneAnchor.data);
    try {
      this.markConfiguredStep(store, logId, `${config.label}正文已完成，正在串行结算…`, config, { keepNarration: true });
      this.patchConfiguredSettlementThinking(store, logId, '正文已完成，正在串行结算（Stage4 状态结算 → Stage5–7 外观 → Stage8 势力更新 → Stage10 经验结算 → Stage11 新闻热榜；地图周围解锁为 Stage9）。', { ...config, settlementThinking: true, settlementThinkingKey: 'settlement-status', settlementThinkingLabel: '结算状态', livePatch: true });
      let stage4Updates;
      try {
        const settled = await this.completeConfiguredSettlementKvWindow({ store, action, base, loaded, skills, materialSession, narration, trace, participants, logId, config });
        stage4Updates = { ...settled, type: settled.type || 'final' };
      } catch (err) {
        console.warn(`${config.label}状态更新生成失败，保留已生成正文并使用最小结算:`, err.message);
        stage4Updates = this.fallbackUpdateJson(store, action, config);
      }
      const stage5 = window.GameModules.realWorldProfileStage5;
      const stage5Result = stage5?.runAfterStage4
        ? await stage5.runAfterStage4({ store, narration, participants, logId, config: stage5KvConfig, loop: this, updates: stage4Updates })
        : (stage5?.runParallelWithStage4
          ? await stage5.runParallelWithStage4({
            store,
            narration,
            participants,
            logId,
            config: stage5KvConfig,
            loop: this,
            stage4Promise: Promise.resolve(stage4Updates),
          })
          : { updates: stage4Updates, patches: [], skipped: true });
      updates = stage5Result.updates || stage4Updates;
      updates = { ...updates, type: updates.type || 'final' };
      profilePatches = Array.isArray(stage5Result.patches) ? stage5Result.patches : [];
      const stage6 = window.GameModules.inferenceFactionStageUpdate;
      let factionOps = [];
      if (stage6?.runAfterSettlement) {
        const stage6Result = await stage6.runAfterSettlement({
          store,
          action,
          narration,
          updates,
          participants,
          logId,
          config,
          loop: this,
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
          config,
          loop: this,
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
          config,
          loop: this,
        });
        newsOps = Array.isArray(newsResult?.ops) ? newsResult.ops : [];
        if (newsResult?.lines?.length) {
          updates = {
            ...updates,
            characterCardChanges: [...(updates.characterCardChanges || []), ...newsResult.lines],
          };
        }
      }
      this.patchConfiguredSettlementThinking(store, logId, '结算完成，正在写入本回合状态与日志。', { ...config, settlementThinking: true, settlementThinkingKey: 'settlement-status', settlementThinkingLabel: '结算状态', livePatch: true });
      settlementPrompt = 'Stage4 状态结算 → Stage5–7 外观 → Stage8 势力更新 → Stage10 经验结算 → Stage11 新闻热榜（Stage9 地图周围解锁在落库后）';
      settlementRaw = JSON.stringify({
        settlement: updates,
        stage5Gate: stage5Result.gate || null,
        profilePatches: profilePatches.map((item) => ({ subject: item.subject, parts: item.parts })),
        factionOps,
        lifeEnergyGains,
        learnedGains,
        newsOps,
      });
    } catch (err) {
      console.warn(`${config.label}串行结算失败，保留已生成正文并使用最小结算:`, err.message);
      this.patchConfiguredSettlementThinking(store, logId, `结算失败，已保留正文并使用最小结算：${err.message || '未知错误'}`, { ...config, settlementThinking: true, settlementThinkingKey: 'settlement-status', settlementThinkingLabel: '结算状态', livePatch: true });
      updates = this.fallbackUpdateJson(store, action, config);
      settlementRaw = JSON.stringify(updates);
    }
    const resultPayload = { ...updates, profilePatches };
    const result = config.mode === 'story' ? this.mergeStoryNarrationAndUpdates(store, narration, resultPayload, config) : this.mergeNarrationAndUpdates(store, narration, resultPayload, config);
    const anchoredTrace = trace.map((item, index) => index === trace.length - 1 ? { ...item, anchorReport: sceneAnchor.data } : item);
    return { result, prompt: `---SCENE_ANCHOR---\n${sceneAnchorPrompt}\n\n---NARRATION---\n${narrationPrompt}\n\n---SETTLEMENT_JSON---\n${settlementPrompt}`, loaded, raw: `${sceneAnchor.raw}\n\n${narrationRaw}\n\n${settlementRaw}`, trace: anchoredTrace, deepseekCache: this.deepSeekKvCacheSummary(config.kvCacheSession) };
  },

  async loadStepContext(ctx, store, action, data, loadedKeys, loaded, memoryIds, step, materialSession = null, materials = window.GameModules.realWorldMaterials, config = this.realConfig()) {
    const out = [];
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
      out.push(...await load(requestList, 2));
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
    const eventStage1Context = store.eventStage1PromptContext?.(actionText) || '';
    const configuredControlPerspectiveRule = this.configuredControlPerspectiveRule(store, config);
    const commonVars = {
      本次行动: actionText,
      当前步骤: forceFinal ? '收敛/final' : this.guidedStepText(store, step, config),
      最大步骤: this.guidedMaxStepText(store, config),
      推演自由度规则: [config.mode === 'story' ? this.storyFreedomRule(store) : (store.realWorldFreedomRule?.() || '推演自由度：行动范围内。只推演玩家本次输入行动自然抵达的直接结果。'), configuredControlPerspectiveRule].filter(Boolean).join('\n'),
      当前步骤输出要求: this.stepOutputRule(step, forceFinal),
      随机场外角色候选: randomActiveCandidateText,
      ['\u8d44\u6599\u8fed\u4ee3\u9650\u5236\u89c4\u5219']: this.stage1IterationRule(store),
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
      const rulesText = [
        '# Stage1 资料查询',
        '任务：只输出一个合法 JSON 对象，不输出中文 K:V、Markdown、正文或解释。',
        '你只负责判断本次行动生成正文前还需要哪些已有资料；不得写正文，不得锚定场景，不得结算状态，不得推进后续结果。',
        '资料请求规则：',
        '- 使用中文资料请求，不得输出英文 skill/method。地点查询未命中时，不要请求地点图补全；基于上下文进行符合逻辑的保守推演，地图持久化交给 Stage4 地图更新 / Stage9 电子地图周围解锁。',
        '- 资料请求最多 Top3；超过 Top3 的候选必须丢弃，不得输出资料请求4或更多编号。',
        '- 角色卡请求只代表可作为参考资料；不得因此把角色写入强制出场。',
        '- 资料是否够用由你综合判断：对话链里的旧资料 + 之后的结算/正文变更 + 当前桌面时间 + 本次行动。不要机械“见过就不请求”，也不要仅因发生过结算/时间推进就强制重载。',
        '- 需要重新请求的情况：关键出场对象/地点/路线在上下文中缺失；或旧资料与后续变更互相冲突、碎片化，无法可靠还原出支撑本次正文的最新状态；或切换被控者后上下文里根本没有该角色可用资料。',
        '- 可跳过重复请求的情况：把旧资料与后续变更合在一起后，已能稳定支撑本次行动正文，且无明显缺口或冲突。',
        '- 不得请求衣着、鞋袜、随身物品等细节；这些细节不属于本阶段必要资料。',
        '- 不得照抄提示词中的占位词；角色全称、世界全称、地点全称、出场对象全称、作品全称都必须替换为本次行动中的真实名称。',
        '- 资料请求格式：资料请求N：资料类型，查询动作，查询对象全称，世界或范围全称。',
        '随机事件规则：',
        '- 随机主动事件默认是场外背景，不自动入场。',
        '- 随机场外角色候选不等于禁止出场；不得仅因角色出现在随机场外角色候选中，就写入禁止出场。',
        '- 若随机角色已在强制出场、高优先候选、戏剧候选或禁止出场中，必须移除该随机事件。',
        '- 无明确自然闯入条件时，随机事件闯入条件必须写“无明确条件则禁止闯入”。',
        window.GameModules.socialEventBoundary?.stage1Ops?.() || '',
        '势力资料规则：',
        '- 系统已自动载入全部势力名/ID与组织架构；先对照该列表，不要重复请求势力列表。',
        '- 若行动/资料/角色卡中出现现实世界真实组织、公司、学校、机关、社群等势力名，且不在已知列表中：必须请求「势力查询，创建势力，势力名，公司」。',
        '- 创建时按上下文与常识补全可知字段；禁止因“本轮未打电话/未拜访/未改字段”而跳过创建。',
        '- 禁止抽象身份（现实社会/公民）造势力；禁止批量灌库无关势力。',
        '- 已存在势力只查询，不要重复创建。',
        '自然出场规则：',
        '- 不要只在玩家明确点名角色时才判断出场；任何现实或设定世界中的行动，都可能自然牵涉其他存在。',
        '- 自然出现不是固定清单，而是根据当前世界状态推导；候选不限定为人类，只要符合世界规则并与本次行动形成合理关联，就可以进入候选。',
        '- 有合理候选写入高优先候选或戏剧候选；只有本次行动必然涉及、出现、回应或受影响的存在才写入强制出场。',
        '- 禁止为了热闹强行塞候选；每个候选都必须能被当前世界状态解释。',
        '出场边界规则：',
        '- 本轮必须基于上一轮查询规划摘要继续收敛；若候选层发生变化，以本轮字段作为当前判断，不要无理由重置候选层。',
        '- 玩家/当前被控主体由系统最终兜底为强制出场；强制出场允许多个存在，表示本次行动必然涉及、出现、回应或受影响的集合。',
        '- 不强制出场不等于禁止出场；禁止出场只用于明确场外、明确不可到达或被用户/资料规则明确禁止进入当前场景的存在。',
        '- 同地点/同住/相邻候选不得仅因未强制出场而写入禁止出场；可按相关性放入高优先候选或戏剧候选，或写“无”。',
        '- 玩家行动明确目标不得写入禁止出场，除非已加载资料明确显示其场外、不可到达或被规则禁止进入当前场景。',
        '角色唯一标识与介绍卡：',
        '- participants 每一项必须是可区分称呼(ID)；已知用真实ID，首次无真实ID写可区分称呼(待建卡)。',
        '- Stage1整段结束后系统一次性批量分配 rel-ai-* 共享ID：先写同ID介绍卡再写空壳；不是完整角色卡，完整卡仅玩家手动升格（同一ID）。',
        '- 称呼必须可区分：禁止无名纯「路人」、空泛“某人/某物”或不可追踪占位；一类存在/团体原型按群体意识理解。',
        '- 角色查询可命中完整角色卡或介绍卡；不得因查到资料就强制写入出场。',
      ].filter(Boolean).join('\n');
      const contextText = [
        `本次行动：${actionText}`,
        `当前步骤：${commonVars.当前步骤} / ${commonVars.最大步骤}`,
        '路由上下文：',
        stage1RoutingContext,
        '本轮上一轮查询规划摘要（同轮 Stage1 步骤间）：',
        previousGuidance,
        '已加载资料摘要：',
        loadedRoutingSummary,
        '可请求资料目录：',
        materialCatalog,
        eventStage1Context,
        '推演自由度规则：',
        commonVars.推演自由度规则,
        `随机场外角色候选：${randomActiveCandidateText}`,
      ].join('\n');
      const requestText = [
        '当前步骤输出要求：',
        commonVars.当前步骤输出要求,
        '固定输出规则：',
        '- 只输出一个紧凑 JSON 对象，首字符必须是 {，末字符必须是 }。',
        '- 不要 Markdown，不要 ```json 代码块，不要换行解释。',
        '- status 只能二选一：资料已足够 / 继续请求资料。',
        '- sceneQueries.location / sceneQueries.causality / sceneQueries.conflict 必须是字符串数组；没有则 []。',
        '- 若 status 为“继续请求资料”，优先输出 materialRequests，最多 3 条；没有可执行资料请求时 materialRequests 输出 []，但必须保留 sceneQueries 理由或明确参与者候选。',
        this.stage1IterationRule(store),
        '- participants.forced / priority / drama / forbidden 都必须是字符串数组；没有则 []。',
        '- 【强制】participants 每一项必须是可区分称呼(ID)。已知用真实ID（角色卡/介绍卡均可）；首次无真实ID写可区分称呼(待建卡)。禁止裸姓名或裸称呼。',
        '- Stage1整段结束后系统一次性批量：分配 rel-ai-* 共享ID，先写同ID介绍卡再写空壳（不是完整角色卡；完整卡仅玩家手动升格且仍用同一ID）。禁止Stage1多轮逐个申请建卡或编造完整角色卡。',
        '- 称呼必须可区分：禁止无名纯「路人」、空泛“某人/某物”或不可追踪占位。一类存在/团体原型按群体意识与团队行动理解（presenceKind=group）。',
        '- randomEvents 必须是字符串数组；randomIntrusionCondition 没有明确条件时写“无明确条件则禁止闯入”。',
        '- 资料请求只能使用中文结构，不得输出英文 skill/method；不得在 Stage1 请求地点图新增、地点图补全或 ensure。',
        'JSON schema：',
        '{"plan":"查询规划摘要","status":"继续请求资料|资料已足够","sceneQueries":{"location":["地点查询理由"],"causality":["因果查询理由"],"conflict":["冲突查询理由"]},"participants":{"forced":["玩家名(player-self)","已知出场对象名(真实ID)"],"priority":["可区分候选称呼(待建卡)"],"drama":[],"forbidden":[]},"randomEvents":["候选事件"],"randomIntrusionCondition":"无明确条件则禁止闯入","materialRequests":["角色查询，搜索角色卡，角色全称，世界全称","势力查询，创建势力，势力全称，势力类型"]}',
        '【AI自检】：',
        '- 输出前必须自检 status 与 materialRequests、sceneQueries、participants 是否一致。',
        '- 输出前必须自检 participants 每一项都是可区分称呼(ID)，没有裸姓名或裸称呼。',
        '- 输出前必须自检：本次行动相关关键资料是否已能从「本轮已加载摘要 / materialRequests / 对话链中的旧资料+后续变更」可靠覆盖；若仍有缺口或冲突会影响正文，不得写“资料已足够”。',
        '- 输出前必须自检：行动/资料/角色卡中出现的现实组织/公司/学校等势力名，若已载入势力列表未收录，须在 materialRequests 写「势力查询，创建势力，势力名，类型」；不得因本轮未互动/无字段更新而跳过。',
        '- 若 materialRequests、sceneQueries、participants.forced、participants.priority、participants.drama 全为空，status 必须为“资料已足够”。',
        '- 不得输出旧 K:V 字段，例如“资料状态：”“资料请求1：”。',
      ].join('\n');
      return [
        { role: 'user', content: rulesText },
        { role: 'assistant', content: contextText },
        { role: 'user', content: requestText },
      ];
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
    const configured = Math.max(1, Math.min(8, Math.round(Number(store?.settingsState?.stage1MaterialMaxIterations) || 2)));
    return configured;
  },

  guidedMaxStepText(store = {}, config = this.realConfig()) {
    return store?.settingsState?.stage1MaterialIterationLimited ? String(this.guidedMaxSteps(store, config)) : '不限制';
  },

  guidedStepText(store = {}, step, config = this.realConfig()) {
    return `${step}/${this.guidedMaxStepText(store, config)}`;
  },

  stage1IterationRule(store = {}) {
    if (!store?.settingsState?.stage1MaterialIterationLimited) {
      return '- 资料收集迭代默认不限制；只要仍有必要且有可执行资料请求，可以继续请求资料。若资料足够、无法继续获取或请求开始重复，必须进入场景锚定。';
    }
    const max = Math.max(1, Math.min(8, Math.round(Number(store?.settingsState?.stage1MaterialMaxIterations) || 2)));
    return `- 最多${max}步后进入场景锚定；第${max}步不得为了重复确认而继续扩展资料循环。`;
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
      return '当前是第1步：你是上下文路由器，只判断为了准确生成本次行动范围内正文需要载入哪些已有资料，并尽可能多而全地列出 sceneQueries 中的地点/因果/冲突查询理由。只输出 Stage1 JSON schema；不要写正文，不要结算状态，不要推演后续结果。';
    }
    if (step >= 2) {
      return `当前是第${step}步/后续资料路由步骤：继续使用 Stage1 JSON schema 收敛资料需求。达到设置的资料收集迭代最大次数后，系统会带着已加载资料与 sceneQueries 进入场景锚定；若没有可执行 materialRequests，允许 materialRequests 为 [] 但保留 sceneQueries 或 participants 候选。不要输出中文 K:V、正文、旁白、Markdown、代码块和 final JSON。`;
    }
    return '当前只负责判断是否继续收集资料：只输出 Stage1 JSON schema。仍缺关键资料就写 status“继续请求资料”并列出 materialRequests；资料足够或无法继续获取时写 status“资料已足够”且 materialRequests 为 []。不要输出中文 K:V、正文、旁白、Markdown、代码块和 final JSON。';
  },

  stage1JsonRetryInstruction(err = {}, semanticSelfCheckFailed = false) {
    const droppedSummary = this.summarizeDroppedMaterialRequests(err.parseResult?.droppedMaterialRequests || []);
    const parseDetail = err.parseResult
      ? `score=${err.parseResult.score}/${err.parseResult.maxScore} successRate=${err.parseResult.successRate} missing=${err.parseResult.missing?.join('、') || '无'} droppedMaterialRequests=${droppedSummary}`
      : '';
    return [
      `上次 Stage1 JSON ${semanticSelfCheckFailed ? '语义自检失败' : '解析失败'}：${err.message}${parseDetail ? `（${parseDetail}）` : ''}`,
      `已确认字段：${err.parseResult?.keyHits?.join('、') || '无'}`,
      `已确认字段值：\n${this.confirmedKvValuesText(err.parseResult)}`,
      `缺失字段：${err.parseResult?.missing?.join('、') || '未知'}`,
      `已丢弃资料请求：${droppedSummary}`,
      '请重新输出完整 Stage1 JSON 对象；必须保留已确认字段值，只补齐或修正缺失/错误字段；不得删除用户明确约束、forbidden 或已确认 forced；不要重复输出已丢弃 materialRequests。',
      '【AI自检】若 status 为“继续请求资料”，优先输出最多 3 条 materialRequests 或明确 participants 候选；若没有可执行 materialRequests，必须保留尽可能多而全的 sceneQueries，系统会带着这些理由进入场景锚定。不得输出中文 K:V 或旧字段“资料状态：”“资料请求1：”。',
    ].join('\n\n');
  },

  previousGuidanceSummary(guidance = null) {
    const ctx = window.GameModules.realWorldAgentContext;
    if (ctx?.stage1GuidanceSummary) return ctx.stage1GuidanceSummary(guidance);
    if (!guidance) return '无';
    const names = (group = [], reasonLabel = '理由') => (Array.isArray(group) ? group : []).map((item) => {
      const name = item.name || item.idOrName || item.id || item.characterName;
      return `${name}${item.reason ? `（${reasonLabel}：${item.reason}）` : ''}`;
    }).join('、') || '无';
    const random = (Array.isArray(guidance.randomActiveEvents) ? guidance.randomActiveEvents : [])
      .map((item) => `${item.characterName || item.name}：${item.eventType || item.actionMethod || '背景行动'}｜${item.motivation || item.reason || ''}`)
      .join('；') || '无';
    const queryReasons = (label, key) => {
      const items = [...new Set(Array.isArray(guidance.sceneQueries?.[key]) ? guidance.sceneQueries[key] : [])];
      return items.length ? items.map((item, index) => `${label}${index + 1}：${item}`).join('\n') : `${label}1：无`;
    };
    return [
      `资料状态：${guidance.type === 'context_done' ? '资料已足够' : '继续请求资料'}`,
      queryReasons('地点查询理由', 'location'),
      queryReasons('因果查询理由', 'causality'),
      queryReasons('冲突查询理由', 'conflict'),
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
    const impactValue = data.currentSceneImpactObjects ?? data.impactObjects ?? data.settlementBoundary ?? data['当前场景影响对象'];
    const sceneImpactObjects = this.sceneAnchorImpactGroups(impactValue);
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
      '当前场景影响对象': this.sceneAnchorJsonText(impactValue) || pick('currentSceneImpactObjects', 'impactObjects', 'settlementBoundary', '当前场景影响对象'),
    };
    const hardAnchors = ['当前地点', '当前时间', '空间状态', '当前动作'];
    const missingHardAnchor = hardAnchors.some((key) => !String(values[key] || '').trim());
    if (missingHardAnchor || !values['正文写作重点'] || !values['当前场景影响对象']) throw new Error('场景锚定报告解析错误请重试');
    this.assertSceneParticipantBoundary(values);
    const orderedText = this.sceneAnchorFields().map((key) => `${key}：${values[key] || ''}`).join('\n');
    const currentSceneImpactObjects = values['当前场景影响对象'] || '';
    return { text: orderedText, currentLocation: values['当前地点'] || '', currentTime: values['当前时间'] || '', writingFocus: values['正文写作重点'] || '', currentSceneImpactObjects, settlementBoundary: currentSceneImpactObjects, sceneImpactObjects, values, parseScore: { score: this.sceneAnchorFields().length, maxScore: this.sceneAnchorFields().length, successRate: 1 }, parseDegraded: false, format: 'json' };
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
    messages.push({ role: 'user', content: `根据前面的规则与资料，推演“本次行动”，字数必须在1000 - 1400字之间。\n本次行动：${actionText}` });
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
    const narrationRules = '行动范围内充分推演：写出本次行动的动作过程、身体感受、周围环境变化、可见细节、他人反应、对话回应和直接短期连锁影响；场景锚定报告中的强制出场必须在正文中实际出现、行动或回应；不替玩家执行下一步新行动；不把亲吻、抚摸、摩擦、按住等行为自动扩展为脱衣、转移地点、插入、高潮等未输入的新阶段。除“你”外每次写角色姓名必须使用 <role id="真实ID">姓名</role>。';
    const completenessRules = [
      '正文完整性规则：',
      '- 正文必须形成完整小段落：进入动作 → 现场反馈 → 对方反应 → 短期结果落点。',
      '- 即使本次行动因边界、consent、年龄、关系或安全限制不能继续描写，也不得短输出。',
      '- 若不能描写玩家输入中的某些肢体或性化细节，必须改写为允许描写的现场反应：角色察觉、制止、后退、质问、沉默、情绪变化、房间环境声响变化、进入方式、触发反应、双方距离变化、语言/沉默、身体姿态，但必须根据已有资料符合逻辑。',
      '- 不要只写“她在房间里”或只写场景开头；必须把本次行动推演到一个明确的即时落点。',
      '- 目标长度 1000-1400 中文字符；低于 1000 汉字视为不合格，不要提前停止。',
      '- 强制输出结构只作为内部写作配比，最终正文仍必须是无标题、无编号、无换行的单段小说正文；唯一允许的标记是 <role id="…">姓名</role> 与 <force id="…">势力名</force>。',
      '- 每一次写出势力/组织/公司正式名称时，必须使用势力标签 <force id="真实ID">势力名</force>；id 必须来自势力标签清单。',
      '- 环境五感渲染约100-150字：写出此刻场景中的气味、光线、触感。',
      '- 角色内心独白约200-250字：围绕上一轮事件或本次行动带来的心理挣扎、试探或算计展开，必须使用比喻句。',
      '- 对话与动作细节约400-450字：放慢动作，写清楚衣料摩擦声、眼神偏移、手部小动作、距离变化和对话回应。',
      '- 悬念/决策钩子约150字：本轮结束时写出心理转向或下一步压力，但不替玩家执行下一步行动。',
      '- 若动作本身很短，就按上述四块扩展当前阶段内部细节，而不是开启下一步新行动。',
      '- 禁止把“NPC反问玩家/等待玩家说明来意/门口刚打开”当作最终落点；必须继续写到进入、被拒、落座、对峙、距离变化或关系张力变化等本次行动的直接结果。',
      '禁止越界不是禁止写长：不允许为了字数推进到新阶段；但必须充分描写当前阶段内部细节。',
    ].join('\n');
    const roleTagGuide = window.GameModules.narrationRoleMarkup?.buildRoleTagGuide?.(effectiveSceneLayers, store)
      || '无合法角色标签清单；除“你”外不得引入未建卡角色姓名。';
    return this.renderPrompt('inference-stage3-narration', {
      模式标签: config.label,
      本次行动: actionText,
      基础上下文: [this.continuityFallbackRule(), `小说笔风：${writingStyle}`, modeRule, controlPerspectiveRule, narrationRules, completenessRules, eventNarrationContext, newsNarrationContext, narrationContext].filter(Boolean).join('\n'),
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
    const playerName = String(store?.playerName || store?.playerProfile?.name || store?.realWorldPlayerSettlementName?.() || '').trim();
    const fields = ['强制出场', '当前场景影响对象'];
    return fields.flatMap((key) => this.splitNameList(values[key] || '').map((raw) => {
      const parsed = this.parseParticipantToken(raw);
      const name = String(parsed?.name || raw || '').replace(/[（(].*$/u, '').trim();
      const id = String(parsed?.id || '').trim();
      return name && !['无', '玩家', '系统', playerName].includes(name)
        ? { type: 'character', id: id || undefined, idOrName: id || name, name, role: 'current-scene', canSettle: true }
        : null;
    }).filter(Boolean));
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
    const type = /random|随机/u.test(rawType)
      ? 'random'
      : (/periodic|cycle|周期/u.test(rawType)
        ? 'periodic'
        : (/inference|推演|大地图|地图事件|活动事件|map|world/u.test(rawType) ? 'inference' : ''));
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
      probability: entry.probability ?? entry.chance ?? entry['发生概率'],
      source: entry.source || 'stage4',
      status: entry.status || 'active',
    }, store) || null;
  },

  settlementTypeQueue(config = this.realConfig(), store = null) {
    const base = ['基础结算', '情绪', '感觉', '生命体征', '身体状态', '穿着状态', '性经历', '性历史', '关系', '角色卡', '长期目标', '物品', '地图', '领土控势', '人事安排', '政体状态', '人事归属', '系统记录', '通用固化'];
    base.push(this.eventSettlementType());
    const story = config.mode === 'story';
    const realPossessed = config.mode === 'real' && Boolean(store?.sharedControlState?.());
    return (story || realPossessed) ? base.concat(['操控体验']) : base;
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
      [this.eventSettlementType()]: { title: '事件结算', format: '数组；每项 {"type":"random|inference|periodic","title":"事件名","startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD","location":"地点","content":"内容","people":["所有人或受众标签"],"tags":["标签"],"probability":25,"status":"active"}；inference=大地图/活动；无事件 []' },
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
      '穿着状态': { updateType: 'wearing-state', fieldPrefix: 'values.wearing' },
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
      '人事归属': { updateType: 'membership', fieldPrefix: 'values.memberships' },
      '系统记录': { updateType: 'system', fieldPrefix: 'events' },
      '通用固化': { updateType: 'generic', fieldPrefix: 'status_tags' },
      '操控体验': { updateType: 'control-experience', fieldPrefix: 'values.control_experience' },
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
      const allowedKeys = this.settlementMetricKeysForSubject(store, subject, type);
      normalizedKey = this.metricAliasForSettlement(type, normalizedKey);
      if (!allowedKeys.includes(normalizedKey) || !hasSignedDelta) return null;
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
    const allowedKeys = this.settlementMetricKeysForSubject(store, subject, typeName);
    if (!field || !hasSignedDelta || !reason || !allowedKeys.includes(field)) return null;
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
    return { updateType: 'wearing-state', subject, field: 'values.wearing', change: { mode: 'upsert', value: { slot, part, name: itemName, state, reason, fullBody: this.isFullBodyWearingPart(part) } }, reasons: [{ trigger: '穿着状态', evidence: reason, confidence: 'confirmed' }] };
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
      人事归属: 'values.memberships',
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
    if (field === '社群角色') {
      const item = this.normalizeFactionRoleSettlementValue(value, reason);
      if (!item) return null;
      return {
        updateType: 'role-card',
        subject,
        field: 'profile.factions',
        change: { mode, value: mode === 'set' ? (Array.isArray(item) ? item : [item]) : item },
        reasons: [{ trigger: `角色卡${op}`, evidence: reason || value, confidence: 'confirmed' }],
      };
    }
    if (field === '人事归属') {
      const patch = this.normalizeMembershipSettlementValue(value, reason);
      if (!patch) return null;
      return {
        updateType: 'membership',
        subject,
        field: 'values.memberships',
        change: { mode: 'upsert', value: patch },
        reasons: [{ trigger: `角色卡${op}`, evidence: reason || value, confidence: 'confirmed' }],
      };
    }
    if (field === '证书' || field === '称号') {
      const item = field === '证书'
        ? this.normalizeCertificateSettlementValue(value, reason)
        : this.normalizeTitleSettlementValue(value, reason);
      if (!item) return null;
      return {
        updateType: 'role-card',
        subject,
        field: field === '证书' ? 'profile.certificates' : 'profile.titles',
        change: { mode, value: mode === 'set' ? [item] : item },
        reasons: [{ trigger: `角色卡${op}`, evidence: reason || value, confidence: 'confirmed' }],
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
      field: 'values.memberships',
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
      field: 'values.control_experience',
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
                // 非法字段（如当前地点）若未能改写：计为已处理，避免滑动窗口死循环重试。
                patch.__parsedUpdates += 1;
                console.warn('[Stage4] 跳过无效角色卡字段:', entry?.field || entry?.字段 || entry);
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
        '构成要素：完整组织名/orgId + 具体职位、学籍或成员身份 + 部门（确无依据才写 departmentFog）；对应 values.memberships。',
        '触发：正文或资料确认的入职、任职、调岗、离职、升学/转学、入籍或其它稳定组织身份变化均可写，不要把门槛收得过死。',
        '完备性：有事实或背景依据时必须完整补全；缺少次要细节时依据世界观、年代、地区、教育与职业经历作最小充分推演；完全没有依据时才输出空数组。',
        '禁止使用某公司、未知学校、相关机构、普通职员、初中生、成员等模糊占位规避完整名称和具体身份；求全优先于过严过滤。',
        '与势力 structure 占坑可同时存在但需一致；无组织名的空壳「现实社会/成年人」不要写；具体国家下的公民/国民有依据时可写。',
      ].join(''),
      '系统记录': '只写系统级、跨角色、且没有专门类型承载的长期事实：日历变更、微信/短信通信、世界线节点、不可逆公共事件、全局状态。禁止把角色当前行动、所在地点、身体反应、感觉、关系、场景描写复述写进系统记录；这些必须分别写人事安排、身体状态、感觉、关系。若正文事实已被世界线记录覆盖，系统记录写空数组 []。',
      '通用固化': '只能写没有专门类型承载的长期稳定标签；情绪、感觉、生命体征、身体、穿着、性经历、性历史、关系、物品、地图、人事、势力、长期目标、系统记录有专门类型时不得写通用固化。',
      '操控体验': [
        '只结算当前被控角色的上线体验（values.control_experience）。',
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

  async buildSettlementTypeWindowMessages({ requestedTypes = [], completedTypes = [], incompleteTypes = [], partialByType = {}, store, action, base, loaded, materialSession = null, narration, trace = [], participants = [], config = this.realConfig() }) {
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
      if (type === '长期目标') return '长期目标：数组；每项 {"subject":"姓名","short|medium|long":{"content":"目标","deadline":"YYYY-MM-DD","progress":0-100,"detail":"进度描述"},"achievement":"阶段成果","reason":"证据"}；完成某档必须换同档新 content 并重置较低 progress；玩家明确改目标且旧档未完成须融合改写；可只写变化字段；无变化 []。';
      if (type === '操控体验') return '操控体验：数组；每项先输出 needUpdate 与 updateFields。needUpdate=false 时可不填字段值；needUpdate=true 时必须含 subject、updateFields、reason，以及 updateFields 对应值。adaptation 只写 +N/-N 增量；feeling/summary/controllerAwarenessLevel/controllerAwareness 基于基线生成完整新文本直接覆盖；禁止输出 onlineCount。无变化 [{"subject":"被控角色名","needUpdate":false}] 或 []。';
      if (type === '人事归属') return '人事归属：数组；每项 {"subject":"姓名","orgName":"组织名","title":"职位","department":"部门或空","departmentFog":true/false,"state":"fog|sketch|established","reason":"证据"}；可带 orgId；无变化 []。';
      if (type === this.eventSettlementType()) return '事件：数组；每项 {"type":"random|inference|periodic","title":"事件名","startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD","location":"地点","content":"内容","people":["所有人或受众标签"],"tags":["标签"],"probability":25,"status":"active"}；inference 仅大地图/活动，禁止私人约定；无事件 []。';
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
    ].join('\n');
    const requiredKeyOrder = requestedTypes.join(' → ');
    const jsonExamples = `{${requestedTypes.map((type) => this.settlementTypeJsonExample(type, participants, store, config)).join(',')}}`;
    const antiExamples = requestedTypes.map((type) => this.settlementTypeAntiExample(type)).filter(Boolean).join('\n') || '无';
    const rulesText = [
      '你正在执行 Stage4 状态结算。',
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
      '任务：输出 Stage4 状态结算紧凑 JSON。',
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

  async completeConfiguredSettlementKvWindow({ store, action, base, loaded, materialSession = null, narration, trace = [], participants = [], logId = null, config = this.realConfig() }) {
    const allTypes = this.settlementTypeQueue(config, store);
    const completedTypes = [];
    const partialByType = {};
    const patchesByType = {};
    let requestedTypes = this.nextSettlementWindow(allTypes, completedTypes, []);
    let shortOutputRetries = 0;
    const maxAttempts = Math.max(8, allTypes.length + 2);
    for (let attempt = 0; attempt < maxAttempts && requestedTypes.length; attempt += 1) {
      this.patchConfiguredSettlementThinking(store, logId, `Stage4 状态结算：正在结算 ${requestedTypes.join('、')}。`, { ...config, settlementThinking: true, settlementThinkingKey: 'settlement-status', settlementThinkingLabel: '结算状态', livePatch: true });
      const messages = await this.buildSettlementTypeWindowMessages({ requestedTypes, completedTypes, incompleteTypes: requestedTypes.filter((type) => partialByType[type]), partialByType, store, action, base, loaded, materialSession, narration, trace, participants, config });
      const raw = await this.completeConfiguredStep(store, messages, logId, false, { ...config, sourceTitle: `${config.label}Stage4 状态结算`, promptId: 'inference-stage4-settlement-window', settlementAttempt: attempt });
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
        partialByType.__shortOutputReason = `上轮返回过短：${compactRawLength}/${shortOutputThreshold}；整轮已丢弃，必须按本次必须返回的类型顺序完整重输全部类型。`;
        if (shortOutputRetries > 1) throw new Error(`Stage4 状态结算返回过短且无完整类型：${compactRawLength}/${shortOutputThreshold}，未完成类型：${requestedTypes.join('、')}`);
        requestedTypes.forEach((type) => { partialByType[type] = '上轮返回过短且无完整类型；本轮必须重新输出该 key 的完整 JSON 值。'; });
        continue;
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
        const parsedLines = parsed.patchesByType[type]?.__lines || [];
        const parsedCount = parsed.patchesByType[type]?.__parsedUpdates || 0;
        const updateCount = parsed.patchesByType[type]?.__updateLines || 0;
        const cause = updateCount && parsedCount !== updateCount
          ? `字段未通过解析：${parsedCount}/${updateCount} 条有效；请检查 subject、field、value 与合约。`
          : '上轮 JSON 缺失或字段未通过解析。';
        partialByType[type] = parsedLines.length ? `${cause} 本轮必须重新输出该 key 的完整 JSON 值。` : `${cause} 本轮未返回该类型。`;
      });
      if (acceptedShortReason && parsed.incompleteTypes.length) partialByType.__shortOutputReason = acceptedShortReason;
      requestedTypes = this.nextSettlementWindow(allTypes, completedTypes, parsed.incompleteTypes);
    }
    requestedTypes = this.nextSettlementWindow(allTypes, completedTypes, []);
    if (requestedTypes.length) throw new Error(`Stage4 状态结算类型未完成：${requestedTypes.join('、')}`);
    this.patchConfiguredSettlementThinking(store, logId, 'Stage4 状态结算：所有结算窗口已完成。', { ...config, settlementThinking: true, settlementThinkingKey: 'settlement-status', settlementThinkingLabel: '结算状态', livePatch: true });
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

  guidedStepFields() {
    return ['查询规划', '资料状态', '地点查询理由', '因果查询理由', '冲突查询理由', '强制出场', '高优先候选', '戏剧候选', '禁止出场', '随机事件候选', '随机事件闯入条件', '资料请求', '资料请求结束', '地点查询', '因果查询', '冲突查询'];
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
    const numberedReason = clean.replace(/^(地点查询理由|因果查询理由|冲突查询理由)\d+$/u, '$1');
    const direct = allowed.find((item) => item === clean || item === numberedReason);
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
      const existing = String(values[key] || '').trim();
      const next = String(parsed.value || '').trim();
      values[key] = existing && next && existing !== '无' ? `${existing}；${next}` : parsed.value;
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
      const primaryValue = String(values[key] || '').trim();
      const secondaryValue = String(value || '').trim();
      if (!Object.prototype.hasOwnProperty.call(values, key) || !primaryValue || (primaryValue === '无' && secondaryValue && secondaryValue !== '无')) values[key] = value;
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
        if (err.parseResult && !err.skipMerge && !this.isGuidedStepSemanticSelfCheckError(err)) parseResults.push({ raw: lastRaw, parsed: err.parseResult });
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
    const mergeableParseResults = lastErr?.parseResult && !lastErr?.skipMerge ? [...parseResults, { raw: lastRaw, parsed: lastErr.parseResult }] : parseResults;
    if (mergeableParseResults.length >= 2) {
      const merged = mergeableParseResults.map((item) => item.parsed).reduce((out, item) => this.mergeGuidedParseResults(out, item));
      if (merged.successRate >= 0.8) {
        const raw = mergeableParseResults.map((item) => item.raw).join('\n\n');
        try {
          return { raw, data: this.guidedStepDataFromParsed(merged, raw) };
        } catch (_) {
          // 合并后仍未通过语义自检，继续走原失败路径。
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
      // 推演 KV 路径默认开深度思考；JSON 仍靠 prompt + parseLoose（DeepSeek 的 response_format 与 thinking 互斥）。
      deepThinking: options.deepThinking !== false,
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
    const shouldPersist = !session && config.kvCacheSession && config.kvCacheSession.persist !== false && !config.kvCacheSession.fork;
    const logId = options.logId || null;
    if (logId && this.isSettlementReasoning(config)) {
      this.patchConfiguredSettlementThinking(store, logId, `${this.stagePhaseLabel(this.inferReasoningPhase(config))}：深度思考中…`, {
        ...config,
        settlementThinking: true,
        livePatch: true,
      });
    }
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
      const expectsJson = Boolean(completionOptions.jsonMode);
      const providerId = window.GameModules.aiProvider?.currentProviderId?.() || '';
      // 推演正文前/后思考面板都需要深度思考。DeepSeek 在 response_format=json_object 时会强制关闭 thinking，
      // 因此开深度思考时不向 API 传 response_format；JSON 仍由 prompt 约束 + parseLoose 解析。同路径也利于前缀缓存。
      const wantsDeepThinking = config.deepThinking !== false;
      const apiJsonMode = expectsJson && !wantsDeepThinking;
      const shouldStream = !apiJsonMode || providerId === 'deepseek' || wantsDeepThinking;
      const defaultTimeoutMs = streamToUi ? 240000 : 90000;
      const requestOptions = {
        source: config.sourceTitle
          || (reasoningMeta.phase && reasoningMeta.phase !== 'unknown'
            ? `${config.label || ''}${reasoningMeta.label}`
            : (streamToUi ? `${config.mode}-agent-loop` : `${config.mode}-agent-context`)),
        model: config.model || store.modelId,
        ...(kvMessages ? { messages: kvMessages } : (currentMessages ? { messages: currentMessages } : { prompt })),
        deepThinking: wantsDeepThinking,
        deepThinkingEffort: 'high',
        jsonMode: apiJsonMode,
        responseFormat: apiJsonMode ? (completionOptions.responseFormat || { type: 'json_object' }) : undefined,
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
      if (streamToUi && logId && buffer) {
        if (config.mode === 'story') store.updateStoryAgentStream?.(logId, buffer);
        else store.updateRealWorldStream?.(logId, buffer, { live: true });
      }
      if (kvMessages) this.rememberDeepSeekKvCache(kvCacheSession, kvMessages, output, doneInfo);
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

  guidedStepDataFromParsed(parsed = {}, raw = '') {
    const v = parsed.values || {};
    const forcedParticipants = this.normalizeParticipantList(v['强制出场'], 'forced');
    const priorityCandidates = this.normalizeParticipantList(v['高优先候选'], 'priority-candidate').map((item) => ({ ...item, canSettle: false }));
    const dramaCandidates = this.normalizeParticipantList(v['戏剧候选'], 'drama-candidate').map((item) => ({ ...item, canSettle: false }));
    const forbiddenParticipants = this.normalizeParticipantList(v['禁止出场'], 'forbidden').map((item) => ({ ...item, canLoadRoleCard: false, canEnterNarration: false, canSettle: false }));
    this.assertParticipantIdTokens(forcedParticipants, 'forced');
    this.assertParticipantIdTokens(priorityCandidates, 'priority');
    this.assertParticipantIdTokens(dramaCandidates, 'drama');
    this.assertParticipantIdTokens(forbiddenParticipants, 'forbidden');
    const blocked = this.participantNameSet(forcedParticipants, priorityCandidates, dramaCandidates, forbiddenParticipants);
    const status = String(v['资料状态'] || '').trim();
    const requestText = String(v['资料请求'] || '').trim();
    const sceneQueries = {
      location: this.splitQueryReasonList(v['地点查询理由'] || v['地点查询']),
      causality: this.splitQueryReasonList(v['因果查询理由'] || v['因果查询']),
      conflict: this.splitQueryReasonList(v['冲突查询理由'] || v['冲突查询']),
    };
    const hasActionableRequests = Array.isArray(parsed.materialRequests) && parsed.materialRequests.length > 0;
    const hasRoleCardCandidates = forcedParticipants.length > 0 || priorityCandidates.length > 0 || dramaCandidates.length > 0;
    const hasSceneQueryReasons = Object.values(sceneQueries).some((items) => items.length > 0);
    const hasDeclaredRequests = Boolean(requestText && requestText !== '无' && !/^无(?:\s*\/\s*0)?$/u.test(requestText));
    if (status === '继续请求资料' && hasDeclaredRequests && !hasActionableRequests && !hasRoleCardCandidates && !hasSceneQueryReasons) {
      const err = new Error('解析错误请重试');
      err.parseResult = parsed;
      err.skipMerge = true;
      throw err;
    }
    const isContextDone = status === '资料已足够' || (!hasRoleCardCandidates && !hasActionableRequests && !hasSceneQueryReasons && (!requestText || requestText === '无'));
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
      sceneQueriesAreReasons: true,
      randomIntrusionCondition: v['随机事件闯入条件'] || '无明确条件则禁止闯入',
      parseScore: { score: parsed.score, maxScore: parsed.maxScore, successRate: parsed.successRate },
      parseDegraded: parsed.successRate < 1,
      droppedMaterialRequests: parsed.droppedMaterialRequests || [],
      mergeConflicts: parsed.mergeConflicts || [],
      missingContext: status === '继续请求资料' && (hasActionableRequests || hasRoleCardCandidates),
    };
  },

  parseGuidedStepJson(raw, config = this.realConfig()) {
    const data = this.parseCompactSettlementJson(raw);
    if (!data || Array.isArray(data) || typeof data !== 'object') return null;
    const sceneQueries = data.sceneQueries && typeof data.sceneQueries === 'object' ? data.sceneQueries : {};
    const participants = data.participants && typeof data.participants === 'object' ? data.participants : {};
    const arrayText = (value, sep = '；') => (Array.isArray(value) ? value : this.splitQueryReasonList(value)).map((item) => String(item || '').trim()).filter(Boolean).join(sep) || '无';
    const nameText = (value) => (Array.isArray(value) ? value : this.splitNameList(value)).map((item) => {
      if (typeof item === 'string') return String(item || '').trim();
      const name = String(item?.name || item?.characterName || '').trim();
      const id = String(item?.id || '').trim();
      if (name && id) return `${name}(${id})`;
      return name || String(item?.idOrName || item?.id || '').trim();
    }).map((item) => String(item || '').trim()).filter(Boolean).join('、') || '无';
    const rawMaterialRequestItems = (Array.isArray(data.materialRequests) ? data.materialRequests : []).slice(0, 3).filter((item) => typeof item === 'string');
    const directMaterialRequests = rawMaterialRequestItems.map(() => null);
    const requestRows = rawMaterialRequestItems.map((item, index) => {
      const body = typeof item === 'string'
        ? item
        : directMaterialRequests[index]
          ? [directMaterialRequests[index].skill, directMaterialRequests[index].method].filter(Boolean).join('，')
          : [item?.type || item?.skill || item?.kind, item?.method, item?.name || item?.target || item?.keyword, item?.world || item?.scope].filter(Boolean).join('，');
      return `资料请求${index + 1}：${String(body || '').trim()}`;
    }).filter((line) => !/^资料请求\d+[：:]\s*$/u.test(line)).slice(0, 3);
    const materialRequestErrors = [];
    const droppedMaterialRequests = [];
    const materialRequests = [];
    requestRows.forEach((line, index) => {
      if (directMaterialRequests[index]) {
        materialRequests.push(directMaterialRequests[index]);
        return;
      }
      const placeholderReason = this.materialRequestPlaceholderReason(line);
      const req = this.fallbackChineseMaterialRequest(line, { config });
      if (!req) {
        droppedMaterialRequests.push(line);
        if (placeholderReason) materialRequestErrors.push(placeholderReason);
        return;
      }
      materialRequests.push(req);
    });
    const values = {
      '查询规划': String(data.plan || data['查询规划'] || 'JSON资料路由').trim(),
      '资料状态': String(data.status || data['资料状态'] || '').trim(),
      '地点查询理由': arrayText(sceneQueries.location ?? data.locationReasons ?? data['地点查询理由']),
      '因果查询理由': arrayText(sceneQueries.causality ?? data.causalityReasons ?? data['因果查询理由']),
      '冲突查询理由': arrayText(sceneQueries.conflict ?? data.conflictReasons ?? data['冲突查询理由']),
      '强制出场': nameText(participants.forced ?? data.forcedParticipants ?? data['强制出场']),
      '高优先候选': nameText(participants.priority ?? data.priorityCandidates ?? data['高优先候选']),
      '戏剧候选': nameText(participants.drama ?? data.dramaCandidates ?? data['戏剧候选']),
      '禁止出场': nameText(participants.forbidden ?? data.forbiddenParticipants ?? data['禁止出场']),
      '随机事件候选': arrayText(data.randomEvents ?? data.randomActiveEvents ?? data['随机事件候选']),
      '随机事件闯入条件': String(data.randomIntrusionCondition || data['随机事件闯入条件'] || '无明确条件则禁止闯入').trim(),
      '资料请求': requestRows.length ? `${requestRows.length}条` : '无',
      '资料请求结束': '是',
    };
    if (!values['资料状态']) {
      const hasQueryReason = ['地点查询理由', '因果查询理由', '冲突查询理由'].some((key) => this.isUsefulQueryReason(values[key]));
      const hasParticipants = ['强制出场', '高优先候选', '戏剧候选'].some((key) => String(values[key] || '').trim() && values[key] !== '无');
      values['资料状态'] = requestRows.length || hasQueryReason || hasParticipants ? '继续请求资料' : '资料已足够';
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
    const hasGuidedField = fields.some((key) => Object.prototype.hasOwnProperty.call(values, key)) || lines.some((line) => /^资料请求\d+[：:]/u.test(line));
    if (!hasGuidedField) return text;
    const out = lines.slice();
    const addIfMissing = (key, value) => {
      if (!Object.prototype.hasOwnProperty.call(values, key)) {
        values[key] = value;
        out.push(`${key}：${value}`);
      }
    };
    const isNone = (value) => !String(value || '').trim() || String(value || '').trim() === '无';
    const numberedRequests = lines.filter((line) => /^资料请求\d+[：:]/u.test(line));
    const hasExplicitRequestField = Object.prototype.hasOwnProperty.call(values, '资料请求') || numberedRequests.length > 0;
    const requestText = String(values['资料请求'] || '').trim();
    const hasQueryReason = ['地点查询理由', '因果查询理由', '冲突查询理由'].some((key) => this.isUsefulQueryReason(values[key]));
    if (!hasExplicitRequestField) return out.join('\n');
    addIfMissing('查询规划', requestText === '无' && !hasQueryReason ? '资料已足够，进入正文推演' : '补齐资料路由字段');
    if (!Object.prototype.hasOwnProperty.call(values, '资料状态')) {
      const shouldContinue = numberedRequests.length > 0 || hasQueryReason || (requestText && requestText !== '无' && !/^无(?:\s*\/\s*0)?$/u.test(requestText));
      addIfMissing('资料状态', shouldContinue ? '继续请求资料' : '资料已足够');
    }
    ['地点查询理由', '因果查询理由', '冲突查询理由', '强制出场', '高优先候选', '戏剧候选', '禁止出场', '随机事件候选'].forEach((key) => addIfMissing(key, '无'));
    addIfMissing('随机事件闯入条件', '无明确条件则禁止闯入');
    if (!Object.prototype.hasOwnProperty.call(values, '资料请求')) addIfMissing('资料请求', `${numberedRequests.length}条`);
    addIfMissing('资料请求结束', '是');
    return out.join('\n');
  },

  parseGuidedStepKv(raw, config = this.realConfig(), options = {}) {
    const normalized = options.normalized ? String(raw || '').trim() : this.normalizeGuidedStepText(raw);
    const parsed = this.parseChineseKvBlock(normalized, this.guidedStepFields(), { parseMaterialRequests: true, config });
    if (parsed.materialRequestErrors?.length || parsed.successRate < 0.8) {
      const detail = parsed.materialRequestErrors?.[0] || '解析错误请重试';
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
    if (!/查询规划[：:]|资料状态[：:]/u.test(text)) {
      throw new Error(`${config.label}返回缺少 Stage1 JSON 或中文 K:V 查询规划字段`);
    }
    return this.parseGuidedStepKv(text, config, { normalized: true });
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
      || /资料已载入|场景锚定|正在生成正文|正文已完成|批量建卡|正在推演|正在识别|正在结算/u.test(text);
  },

  shouldUseStatusAsRealNarration(entry = {}) {
    const text = String(entry?.narration || '').trim();
    if (!text) return true;
    // 真实正文通常很长；短进度文案应允许被后续状态覆盖（含“正在生成场景锚定报告”→“正在生成正文”）。
    if (text.length >= 200) return false;
    return /^(?:现实世界正在推演|现实正在识别|现实正在推演|已识别相关角色|已追加资料)/u.test(text)
      || /资料已载入|场景锚定|正在生成正文|正文已完成|批量建卡|正在推演|正在识别|正在结算|正在写入/u.test(text);
  },
  loadedContextText(data = {}, loaded = [], step = 1, config = this.realConfig()) {
    const fallback = config.mode === 'story' ? '被操控角色' : '玩家本人';
    const chars = (data.characters || []).map((item) => item.name || item.id || item).filter(Boolean).join('、') || fallback;
    const titles = loaded.map((item) => item.title).join('、') || '角色记忆';
    return `${step === 1 ? '已识别相关角色' : '已追加资料'}：${chars}；已载入${titles}${data.reason ? `：${data.reason}` : ''}`;
  },
};
