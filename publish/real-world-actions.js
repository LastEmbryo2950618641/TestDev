/**
 * 手机时间与现实世界推演界面。
 */
window.GameModules = window.GameModules || {};

window.GameModules.realWorldActions = {
  startPhoneClock() {
    this.ensurePhoneFixedTime();
  },

  ensurePhoneFixedTime() {
    const initialized = new Date(this.playerProfile?.initializedAt || Date.now()).getTime();
    const base = Number.isFinite(initialized) && initialized > 946684800000 ? initialized : Date.now();
    const current = Number(this.phoneFixedTime);
    if (!Number.isFinite(current) || current <= 946684800000) this.phoneFixedTime = base;
  },

  advancePhoneTime(seconds = 60) {
    this.ensurePhoneFixedTime();
    const delta = Math.max(0, Math.min(2592000, Math.round(Number(seconds) || 0))) * 1000;
    this.phoneFixedTime += delta;
  },

  phoneDate() {
    this.ensurePhoneFixedTime();
    return new Date(this.phoneFixedTime);
  },

  phoneTimeText() {
    const d = this.phoneDate();
    return [d.getHours(), d.getMinutes(), d.getSeconds()].map((x) => String(x).padStart(2, '0')).join(':');
  },

  phoneDateText() {
    const d = this.phoneDate();
    const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${week}`;
  },

  openRealWorldPanel() {
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    this.collapseRealWorldThinking?.();
    this.realWorldOpen = true;
    this.checkWorkReminder?.();
    window.GameModules.sqliteSave.saveRealWorldLogEntries?.(this.realWorldLog).then(() => this.refreshRealWorldLogPage?.(999999)).catch((err) => console.warn('[现实日志] 分页刷新失败:', err.message, err.stack));
    this.refreshRealWorldLogPage?.(999999);
    if (!this.realWorldLog.length) {
      if (map.current) this.seedRealWorldLog();
      else this.submitRealWorldAction('根据我的现实资料确认当前所在的具体地点，并建立电子地图根节点');
    }
  },

  closeRealWorldPanel() {
    this.collapseRealWorldThinking?.();
    this.realWorldOpen = false;
    this.realWorldFunctionOpen = false;
  },

  openRealWorldFunctionPanel(view = 'menu') {
    this.realWorldFunctionView = view;
    this.realWorldFunctionOpen = true;
  },

  closeRealWorldFunctionPanel() {
    this.realWorldFunctionOpen = false;
    this.realWorldFunctionView = 'menu';
  },

  openPhoneFromRealWorld() {
    this.realWorldFunctionOpen = false;
    this.closeRealWorldPanel();
  },

  realWorldFunctionTitle() {
    return { inventory: '背包', wearing: '穿着', map: '电子地图' }[this.realWorldFunctionView] || '现实功能';
  },

  realWorldFunctionEyebrow() {
    return { inventory: 'INVENTORY', wearing: 'WEARING', map: 'E-MAP' }[this.realWorldFunctionView] || 'REAL WORLD';
  },

  realWorldFunctionHint() {
    return { inventory: '查看玩家本人当前持有或可调用的装备与物品。', wearing: '查看内衣、上衣、下衣、鞋子、饰品和装备槽位等当前穿戴。', map: '查看当前现实地点树，展开子地点或查看地点说明。' }[this.realWorldFunctionView] || '选择现实世界中要执行的功能。';
  },

  seedRealWorldLog() {
    const map = window.GameModules.realWorldMap.ensure(this, this.playerProfile || {});
    if (!map.current) return;
    const entry = {
      id: this.nextId++, type: 'system', locationName: map.current, time: { label: `${this.phoneDateText()} ${this.phoneTimeText()}` },
      narration: '你把手机屏幕压暗，现实世界的声音重新浮上来。熟悉的空间仍保持着原本的秩序，但那台新手机带来的异常感并没有消失。',
      thinking: '现实世界推演已接入玩家本人资料，只追踪手机外的现实行动。',
    };
    this.assignRealWorldlineEntry(entry);
    this.realWorldLog = [entry];
    window.GameModules.sqliteSave.saveRealWorldLogEntry?.(entry).then(() => this.refreshRealWorldLogPage?.(999999)).catch((err) => console.warn('[现实日志] 初始记录保存失败:', err.message, err.stack));
  },

  async submitRealWorldAction(action = '') {
    const rawText = String(action || this.realWorldInput || '').trim();
    const text = this.realWorldActionWithMatter?.(rawText) || rawText;
    if (!rawText || this.realWorldBusy) return;
    this.realWorldInput = '';
    this.realWorldBusy = true;
    const start = this.phoneDate();
    const startMs = start.getTime();
    const baseId = `real-${startMs}-${Math.random().toString(36).slice(2, 8)}`;
    const startTime = { label: `${this.phoneDateText()} ${this.phoneTimeText()}`, iso: start.toISOString() };
    const userEntry = { id: `${baseId}-user`, type: 'user', text: rawText, matter: this.activeRealWorldMatter?.() || null, time: startTime, createdAt: start.toISOString() };
    const entry = { id: `${baseId}-ai`, type: 'ai', narration: '现实世界正在推演…', thinking: '', streaming: true, time: startTime, createdAt: start.toISOString() };
    entry.promptPack = { systemPrompt: '现实世界 Loop Agent 将按步骤动态载入上下文。', userPrompt: text, model: this.modelId, promptTokens: 0 };
    this.realWorldLog = this.normalizeRealWorldLog([...(this.realWorldLog || []), userEntry, entry]).slice(-Math.max(1, Number(this.realWorldLogPageSize) || 12));
    this.realWorldLogTotal = Math.max(this.realWorldLogTotal || 0, window.GameModules.sqliteSave.countRealWorldLogEntries?.() || 0) + 2;
    this.realWorldLogPage = this.realWorldLogMaxPage?.() || this.realWorldLogPage || 1;
    this.scrollRealWorldLogBottom?.();
    try {
      await window.GameModules.sqliteSave.saveRealWorldLogEntry?.(userEntry);
      await window.GameModules.sqliteSave.saveRealWorldLogEntry?.(entry);
      const savedTotal = window.GameModules.sqliteSave.countRealWorldLogEntries?.() || this.realWorldLogTotal;
      this.realWorldLogTotal = savedTotal;
      this.realWorldLogPage = this.realWorldLogMaxPage?.() || this.realWorldLogPage || 1;
      this.scrollRealWorldLogBottom?.();
      const result = await window.GameModules.realWorldAi.generate(this, '', text, entry.id);
      if (result.promptPack) entry.promptPack = result.promptPack;
      await this.applyRealWorldResult(entry.id, result);
      await this.recordPlayerRealWorldMemory(text, result);
      await this.save();
    } finally {
      this.realWorldBusy = false;
    }
  },

  async applyRealWorldResult(id, result) {
    const state = this.playerIdentityState?.();
    await this.applyMetricUpdatesToState?.(state, result.metricUpdates);
    result.characterCardChanges = await window.GameModules.characterCardLexicon?.applyToState?.(state, result.lexiconUpdates || []) || [];
    await window.GameModules.rpgLexicon.applyLexiconSkill?.((result.lexiconUpdates || []).filter((item) => item?.kind !== '角色卡' && item?.kind !== '角色技能'));
    await this.applyInventoryUpdatesToState(state, result.lexiconUpdates || []);
    const elapsedSeconds = window.GameModules.ai.clampElapsed?.(result.elapsedSeconds, 300) || 300;
    result.elapsedSeconds = elapsedSeconds;
    result.vitalUpdates = window.GameModules.realWorldAi.normalizeVitalUpdates(result.vitalUpdates, elapsedSeconds, result.narration || '');
    await this.applyRealWorldVitalUpdates(state, result.vitalUpdates);
    const startedAt = this.phoneDate().toISOString();
    this.advancePhoneTime(elapsedSeconds);
    this.refreshRealWorldMatterStatus?.();
    this.checkWorkReminder?.();
    window.GameModules.realWorldMap.update(this, result.locationName || this.realWorldLocationName, result);
    await this.applyRealWorldFactionUpdates?.(result.factionUpdates || []);
    this.realWorldSceneTitle = result.sceneTitle || this.realWorldSceneTitle;
    this.realWorldQuest = result.quest || this.realWorldQuest;
    this.realWorldStatus = result.status || this.realWorldStatus;
    this.realWorldChoices = result.choices || this.realWorldChoices;
    const time = { label: `${this.phoneDateText()} ${this.phoneTimeText()}`, iso: this.phoneDate().toISOString(), startedAt, elapsedSeconds };
    const next = { ...this.realWorldLog.find((entry) => entry.id === id), ...result, type: 'ai', streaming: false, time, agentTrace: result.agentTrace || [] };
    await this.assignRealWorldlineEntry(next);
    await window.GameModules.sqliteSave.saveRealWorldLogEntry?.(next);
    this.realWorldLog = this.realWorldLog.map((entry) => (entry.id === id ? next : entry));
    this.refreshRealWorldLogPage?.(999999);
    this.scrollRealWorldLogBottom?.();
  },

  async applyRealWorldVitalUpdates(state, updates = []) {
    if (!state?.values || !Array.isArray(updates)) return;
    const values = state.values;
    window.GameModules.progression.ensureStateMechanics(state, state.profile || {});
    values.vital_update_notes = values.vital_update_notes || {};
    const apply = (key, delta) => {
      const pool = values[key];
      if (!pool?.max) return null;
      const before = window.GameModules.progression.percent(pool);
      window.GameModules.progression.deltaPool(pool, delta);
      return { before, after: window.GameModules.progression.percent(pool) };
    };
    for (const item of updates) {
      const key = String(item?.key || '');
      if (!['stamina_pool', 'satiety', 'hydration', 'fatigue', 'mental_stability'].includes(key)) continue;
      const changed = apply(key, Number(item.delta) || 0);
      if (!changed) continue;
      values.vital_update_notes[key] = { ...changed, delta: Math.round(Number(item.delta) || 0), reason: String(item.reason || '').slice(0, 120), at: this.phoneDate().toISOString() };
    }
    values.health = window.GameModules.progression.percent(values.vitality);
    values.stamina = window.GameModules.progression.percent(values.stamina_pool);
    this.rpgStates = { ...this.rpgStates, [state.id]: state };
    await window.GameModules.sqliteSave.saveCharacterState(state);
  },

  async assignRealWorldlineEntry(entry) {
    this.realWorldlineState = this.realWorldlineState || { events: [], plots: [], pendingPlot: null };
    const event = { eventId: `real_${entry.id}`, name: entry.sceneTitle || entry.locationName || this.realWorldSceneTitle || '现实事件', time: entry.time?.label || '', detail: String(entry.narration || entry.thinking || entry.text || ''), status: entry.streaming ? '记录中' : '已记录' };
    this.realWorldlineState.events = [...(this.realWorldlineState.events || []).filter((item) => item.eventId !== event.eventId), event].slice(-40);
    const assigned = window.GameModules.worldlinePlots.assign(this, this.realWorldlineState, event, '现实情节');
    entry.plotId = event.plotId;
    await assigned;
  },

  async recordPlayerRealWorldMemory(action, result) {
    const text = [`现实行动：${action}`, `发生：${result.narration || ''}`, result.thinking ? `推演：${result.thinking}` : '', `目标：${result.quest || this.realWorldQuest}`].filter(Boolean).join('\n');
    const store = { ...this, sceneTitle: result.sceneTitle || this.realWorldSceneTitle, entryTime: null, entryTimeLabel: () => `${this.phoneDateText()} ${this.phoneTimeText()}` };
    const memory = window.GameModules.characterMemory.ensure('player-self');
    const item = window.GameModules.characterMemory.memoryItem(store, { text, source: 'real-world', impression: 55 });
    memory.shortTerm.recent.push(item);
    window.GameModules.characterMemory.promote(memory, item);
    await window.GameModules.characterMemory.compact('player-self', memory);
  },

  openRealWorldPrompt(id) {
    const entry = this.realWorldLog.find((item) => item.id === id);
    if (!entry?.promptPack) return;
    this.promptDialogEntry = entry;
    this.promptDialogTab = 'system';
    this.promptDialogOpen = true;
  },
};
