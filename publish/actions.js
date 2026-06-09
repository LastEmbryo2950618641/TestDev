/**
 * Store 行为扩展：资料查询与存档。
 */
window.GameModules = window.GameModules || {};

window.GameModules.actions = {
  async refreshRagContext(action) {
    const aliases = (this.character.aliases || []).join(' ');
    const query = `${action} ${this.sceneTitle} ${this.quest} ${this.character.work || ''} ${this.character.name} ${aliases}`;
    const results = await window.GameModules.rag.search(query, { limit: 3, sourceHint: this.character.work, strictSource: true });
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

  async searchLore() {
    const query = this.ragQuery.trim();
    if (!query || this.ragBusy) return;
    this.ragBusy = true;
    this.ragError = '';
    try {
      const results = await window.GameModules.rag.search(query, { limit: 5 });
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
    await window.GameModules.storage.remove();
    location.reload();
  },
};
