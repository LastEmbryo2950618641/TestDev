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
    if (kind === 'shortTerm') return [...(memory.shortTerm.recent || []), ...(memory.shortTerm.summarized || [])];
    if (kind === 'longTerm') return [...(memory.longTerm.vivid || []), ...(memory.longTerm.permanent || [])];
    return [];
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
