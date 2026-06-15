/**
 * Store 行为扩展：资料查询与存档。
 */
window.GameModules = window.GameModules || {};

window.GameModules.actions = {
  async refreshRagContext(action) {
    const aliases = (this.character.aliases || []).join(' ');
    const query = `${action} ${this.sceneTitle} ${this.quest} ${this.character.work || ''} ${this.character.name} ${aliases}`;
    console.log('[资料检索] 回合检索开始:', { query, sourceHint: this.character.work });
    const results = await window.GameModules.rag.search(query, { limit: 3, sourceHint: this.character.work, strictSource: true });
    console.log('[资料检索] 回合检索完成:', results.map((x) => ({ title: x.title, score: x.ragScore, length: String(x.text || '').length })));
    this.ragResults = results;
    this.ragContext = window.GameModules.rag.formatContext(results);
  },

  metricGroups(state = null) {
    if (!state || state.id === this.character?.id) {
      window.GameModules.metrics.ensure(this);
      return [{ title: '情绪', type: 'emotion', values: this.emotions, ready: this.metricsReady }, { title: '其余', type: 'player', values: this.playerFeelings, ready: this.metricsReady }];
    }
    const metrics = this.ensureStateMetrics(state);
    return [{ title: '情绪', type: 'emotion', values: metrics.emotions, ready: true }, { title: '其余', type: 'player', values: metrics.playerFeelings, ready: true }];
  },

  ensureStateMetrics(state) {
    const fresh = window.GameModules.metrics.fresh();
    state.metrics = state.metrics || {};
    state.metrics.emotions = window.GameModules.metrics.fill(state.metrics.emotions, window.GameModules.metrics.emotionKeys, fresh.emotions);
    state.metrics.playerFeelings = window.GameModules.metrics.fill(state.metrics.playerFeelings, window.GameModules.metrics.playerKeys, fresh.playerFeelings);
    state.metrics.notes = state.metrics.notes || {};
    return state.metrics;
  },

  metricEntries(group) { return Object.entries(group.values).map(([key, value]) => ({ key, value, text: this.metricValueText(value, group.ready) })); },

  metricValueText(value, ready = this.metricsReady) { return ready && Number.isFinite(Number(value)) ? value : '--'; },

  metricCollapsedItems() {
    window.GameModules.metrics.ensure(this);
    const list = window.GameModules.metrics.emotionKeys.map((key) => ({ key, value: this.emotions[key], text: this.metricValueText(this.emotions[key]) }));
    return list.slice(0, Math.max(1, this.metricSummaryLimit || 3));
  },

  installMetricSummaryObserver(el) {
    if (!window.ResizeObserver || !el) return;
    if (this.metricSummaryObserver) this.metricSummaryObserver.disconnect();
    let frame = 0;
    const update = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = 0;
        this.refreshMetricSummaryLimit(el);
      });
    };
    this.metricSummaryObserver = new ResizeObserver(update);
    this.metricSummaryObserver.observe(el);
    update();
  },

  refreshMetricSummaryLimit(el) {
    const line = el?.querySelector?.('.metrics-collapsed-line');
    if (!line) return;
    const available = Math.max(40, line.clientWidth - 82);
    let used = 0;
    let count = 0;
    for (const key of window.GameModules.metrics.emotionKeys) {
      const text = `${key}${this.metricValueText(this.emotions[key])}`;
      const width = Array.from(text).length * 12 + 10;
      if (used + width > available) break;
      used += width + 5;
      count += 1;
    }
    const next = Math.max(1, count);
    if (this.metricSummaryLimit !== next) this.metricSummaryLimit = next;
  },

  metricNote(type, key) {
    if (!this.metricsReady) return '阶段: 未知\n状态: 等待推演\n原因: 数值正在刷新，尚未完成初始推演。\n说明: ' + (window.GameModules.metrics.descriptions[key] || key);
    const value = type === 'emotion' ? this.emotions[key] : this.playerFeelings[key];
    const raw = this.metricNotes?.[`${type}:${key}`];
    const stage = raw?.stage || window.GameModules.metrics.stageFor(key, value);
    const actor = window.GameModules.ai?.actorPronoun?.(this) || '她/他';
    const fallbackStatus = window.GameModules.ai?.fallbackMetricStatus?.(actor, key, stage, type) || `${actor}的${key}处于“${stage}”状态。`;
    const fallbackReason = type === 'emotion'
      ? `${actor}受到当前场景、你的行动、自身处境和关系证据影响，因此${key}情绪发生变化。`
      : `${actor}根据你的表现、两人的关系证据、当下处境和自身动机，重新调整了对你的${key}。`;
    const oldStageText = window.GameModules.metrics.stageStatus(key, stage);
    const status = raw?.status && raw.status !== oldStageText ? raw.status : fallbackStatus;
    const oldReason = /本回合没有直接触发变化|保持原值|保持原址/.test(String(raw?.reason || ''));
    const reason = raw?.reason && !oldReason ? raw.reason : fallbackReason;
    const description = raw?.description || window.GameModules.metrics.descriptions[key] || key;
    return `阶段: ${stage}\n状态: ${status}\n原因: ${reason}\n说明: ${description}`;
  },

  toggleMetric(type, key) {
    const id = `${type}:${key}`;
    this.expandedMetricKey = this.expandedMetricKey === id ? '' : id;
  },

  isMetricOpen(type, key) {
    return this.expandedMetricKey === `${type}:${key}`;
  },

  feedbackText() {
    return this.feedbackSource === 'ai' ? (this.mindText || '--') : '--';
  },

  feedbackPlan() {
    return this.feedbackSource === 'ai' ? (this.characterIntent || '--') : '--';
  },

  feedbackSourceText() {
    return this.feedbackSource === 'ai' ? 'AI生成' : '本地兜底';
  },

  feedbackSummary() {
    const text = this.feedbackText();
    const summary = text.length > 18 ? `${text.slice(0, 18)}…` : text;
    return `【${this.feedbackSourceText()}】${summary} / ${this.feedbackPlan()}`;
  },

  loreNames(list, key) {
    return (Array.isArray(list) ? list : []).map((item) => item?.[key] || '').filter(Boolean).join('、') || '无';
  },

  async searchLore() {
    const query = this.ragQuery.trim();
    if (!query || this.ragBusy) return;
    this.ragBusy = true;
    this.ragError = '';
    try {
      const results = await window.GameModules.rag.search(query, { limit: 5, sourceHint: this.character.work });
      this.ragResults = results;
      this.ragContext = window.GameModules.rag.formatContext(results);
    } catch (err) {
      console.error('资料查询失败:', err.message, err.stack);
      this.ragError = '资料查询失败，请稍后重试';
    } finally {
      this.ragBusy = false;
    }
  },

  addLog(type, speaker, text) {
    this.log.push({ id: this.nextId++, type, speaker, text });
    if (this.log.length > 40) this.log.shift();
    this.scrollLog();
  },

  scrollLog() {
    queueMicrotask(() => {
      const el = document.querySelector('.app-window .story-log') || document.querySelector('.story-log');
      if (el) el.scrollTop = el.scrollHeight;
    });
  },

  async save() {
    await window.GameModules.storage.put(window.GameModules.storage.snapshot(this));
    if (this.refreshSaveMetas) await this.refreshSaveMetas();
  },

  async resetGame() {
    if (this.busy) return;
    this.busy = true;
    try {
      await window.GameModules.storage.remove(this.selectedSlot);
      await window.GameModules.storage.open(this.selectedSlot);
      this.started = false;
      this.turn = 1;
      this.sceneTitle = '裂隙前厅';
      this.mood = '冷静';
      this.trust = 45;
      this.resistance = 20;
      const metrics = window.GameModules.metrics.fresh();
      this.emotions = metrics.emotions;
      this.playerFeelings = metrics.playerFeelings;
      this.metricsReady = false;
      this.metricNotes = {};
      this.expandedMetricKey = '';
      this.quest = '确认操控连接';
      this.mindText = '';
      this.feedbackSource = 'pending';
      this.characterIntent = '';
      this.choices = window.GameModules.config.openingChoices;
      this.log = [];
      this.nextId = 1;
      this.ragContext = '';
      this.memoryContext = '';
      this.ragResults = [];
      this.rpgStates = {};
      this.rpgPanelCharacterId = this.selectedCharacterId;
      this.profileOpen = false;
      this.metricsOpen = false;
      this.feedbackOpen = false;
      this.savePanelOpen = false;
      await this.refreshSaveMetas();
    } finally {
      this.busy = false;
    }
  },
};
