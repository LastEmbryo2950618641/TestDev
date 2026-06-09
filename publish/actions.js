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
