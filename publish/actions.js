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

  metricGroups() {
    window.GameModules.metrics.ensure(this);
    return [
      { title: '当前情绪', type: 'emotion', values: this.emotions },
      { title: '对玩家感觉', type: 'player', values: this.playerFeelings },
    ];
  },

  metricEntries(group) {
    return Object.entries(group.values).map(([key, value]) => ({ key, value }));
  },

  metricCollapsedItems() {
    window.GameModules.metrics.ensure(this);
    const list = window.GameModules.metrics.emotionKeys.map((key) => ({ key, value: this.emotions[key] }));
    return list.slice(0, Math.max(1, this.metricSummaryLimit || 3));
  },

  installMetricSummaryObserver(el) {
    if (!window.ResizeObserver || !el) return;
    if (this.metricSummaryObserver) this.metricSummaryObserver.disconnect();
    const update = () => this.refreshMetricSummaryLimit(el);
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
      const text = `${key}${this.emotions[key] ?? 0}`;
      const width = Array.from(text).length * 12 + 10;
      if (used + width > available) break;
      used += width + 5;
      count += 1;
    }
    this.metricSummaryLimit = Math.max(1, count);
  },

  metricNote(type, key) {
    const value = type === 'emotion' ? this.emotions[key] : this.playerFeelings[key];
    const raw = this.metricNotes?.[`${type}:${key}`];
    const stage = raw?.stage || window.GameModules.metrics.stageFor(key, value);
    const status = raw?.status || window.GameModules.metrics.stageStatus(key, stage);
    const reason = raw?.reason || raw || '等待 AI 根据剧情更新解释。';
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
    return this.mindText || '角色正在观察操控者的意图。';
  },

  feedbackPlan() {
    const name = this.character?.name || '角色';
    return this.characterIntent || `${name}下一步想要按自己的处境重新判断。`;
  },

  feedbackSummary() {
    const text = this.feedbackText();
    const summary = text.length > 18 ? `${text.slice(0, 18)}…` : text;
    return `${summary} / ${this.feedbackPlan()}`;
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
      const el = document.querySelector('.story-log');
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
      this.metricNotes = {};
      this.expandedMetricKey = '';
      this.quest = '确认操控连接';
      this.mindText = '';
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
