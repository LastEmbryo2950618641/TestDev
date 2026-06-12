window.GameModules = window.GameModules || {};

Object.assign(window.GameModules.rpgLexicon, {
  async applyAiUpdates(updates = []) {
    const save = window.GameModules.sqliteSave;
    if (!save.db || !Array.isArray(updates)) return [];
    const changed = [];
    for (const patch of updates) {
      const next = this.mergeAiPatch(patch);
      if (!next) continue;
      await save.saveLexiconEntry(next);
      changed.push(next);
    }
    return changed;
  },

  mergeAiPatch(patch) {
    const worldTag = patch?.worldTag || '原创世界';
    const kind = patch?.kind;
    const name = this.normalizeName(patch?.name);
    if (!kind || !name) return null;
    const existing = this.get(worldTag, kind, name) || this.entry(worldTag, kind, name, { source: 'ai' });
    const next = { ...existing, meta: { ...(existing.meta || {}) } };
    for (const key of ['summary', 'description', 'value', 'aliases', 'related', 'meta']) {
      if (!Object.prototype.hasOwnProperty.call(patch, key) || patch[key] === undefined || patch[key] === null) continue;
      next[key] = Array.isArray(patch[key]) ? patch[key].map(String) : patch[key];
    }
    next.nameAiGenerated = existing.nameAiGenerated;
    next.valueAiGenerated = existing.valueAiGenerated;
    next.changeMode = existing.changeMode;
    next.promptInstruction = this.shouldRefreshPromptInstruction(existing.promptInstruction) ? this.defaultPromptInstruction(kind, name) : existing.promptInstruction;
    next.source = patch.source || 'ai';
    return this.entry(worldTag, kind, name, next);
  },
});
