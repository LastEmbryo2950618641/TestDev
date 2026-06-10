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

  moodScore() {
    return { 冷静: 50, 紧张: 42, 愤怒: 30, 动摇: 38, 信任: 72, 恐惧: 25, 好奇: 60, 坚定: 68 }[this.mood] || 50;
  },

  affection() {
    return Math.max(0, Math.min(100, Math.round(this.trust * 0.8 + (100 - this.resistance) * 0.2)));
  },

  heartbeat() {
    const mood = { 紧张: 12, 动摇: 10, 恐惧: 8, 好奇: 7, 信任: 6, 坚定: 4, 愤怒: 3, 冷静: 0 }[this.mood] || 0;
    return Math.max(0, Math.min(100, Math.round(30 + this.trust * 0.25 + this.resistance * 0.25 + mood)));
  },

  metrics() {
    return [
      ['情绪', this.moodScore()],
      ['信任', this.trust],
      ['反抗', this.resistance],
      ['好感', this.affection()],
      ['心动', this.heartbeat()],
    ];
  },

  summaryMetrics() {
    return this.metrics().slice(0, 5);
  },

  expandedMetrics() {
    return this.metrics().slice(5);
  },

  feedbackText() {
    return this.mindText || '角色正在观察操控者的意图。';
  },

  feedbackPlan() {
    const next = this.choices?.[0] || this.quest || '继续观察当前局势';
    return this.online ? `她心里倾向于：${next}（玩家可无视）` : `她想要：${next}（玩家可建议但不强制）`;
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
