window.GameModules = window.GameModules || {};

window.GameModules.identityMemoryActions = {
  identityMemoryTargetId() {
    return this.identityTargetId || 'player-self';
  },

  identityMemory() {
    return window.GameModules.characterMemory.ensure(this.identityMemoryTargetId());
  },

  identityMemoryItems(kind) {
    const memory = this.identityMemory();
    if (kind === 'shortTerm') return this.identityMemorySubItems(memory.shortTerm, this.identityMemoryShortTab);
    if (kind === 'longTerm') return this.identityMemorySubItems(memory.longTerm, this.identityMemoryLongTab);
    return [];
  },

  identityMemorySubItems(scope = {}, tab = '') {
    return scope?.[tab] || [];
  },

  identityMemorySubStatus(kind) {
    const memory = this.identityMemory();
    const m = window.GameModules.characterMemory;
    if (kind === 'shortTerm') return m.statLine(this.identityMemoryShortLabel(), m.stats(this.identityMemoryItems('shortTerm'), m.limits[this.identityMemoryShortTab] || m.limits.forgotten));
    return m.statLine(this.identityMemoryLongLabel(), m.stats(this.identityMemoryItems('longTerm'), m.limits[this.identityMemoryLongTab]));
  },

  identityMemoryShortLabel() {
    return ({ recent: '刚发生记忆', summarized: '近发生记忆', forgotten: '遗忘区' })[this.identityMemoryShortTab] || '刚发生记忆';
  },

  identityMemoryLongLabel() {
    return ({ vivid: '难以忘记', permanent: '不可忘记' })[this.identityMemoryLongTab] || '难以忘记';
  },

  identityMemoryStatus(kind) {
    const memory = this.identityMemory();
    const m = window.GameModules.characterMemory;
    if (kind === 'shortTerm') return [m.statLine('刚发生记忆', m.stats(memory.shortTerm.recent, m.limits.recent)), m.statLine('近发生记忆', m.stats(memory.shortTerm.summarized, m.limits.summarized)), m.statLine('遗忘区', m.stats(memory.shortTerm.forgotten, m.limits.forgotten))].join('｜');
    return [m.statLine('难以忘记', m.stats(memory.longTerm.vivid, m.limits.vivid)), m.statLine('不可忘记', m.stats(memory.longTerm.permanent, m.limits.permanent))].join('｜');
  },

  async searchIdentityMemoryArchive() {
    const query = String(this.identityMemoryArchiveQuery || '').trim();
    if (!query) return;
    this.identityMemoryArchiveResults = await window.GameModules.characterMemory.queryArchive(this.identityMemoryTargetId(), query);
  },
};
