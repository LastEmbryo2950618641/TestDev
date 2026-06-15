window.GameModules = window.GameModules || {};

Object.assign(window.GameModules.rpgLexicon, {
  async applyAiUpdates(updates = []) {
    if (!Array.isArray(updates)) return [];
    const entries = updates.map((patch) => this.mergeAiPatch(patch)).filter(Boolean);
    return this.applyLexiconSkill?.(entries) || [];
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
    next.nameAiGenerated = Boolean(existing.nameAiGenerated || existing.aiGenerated || patch.nameAiGenerated || patch.aiGenerated || patch.source === 'ai');
    next.valueAiGenerated = Boolean(existing.valueAiGenerated || patch.valueAiGenerated || patch.aiGenerated || patch.source === 'ai');
    next.changeMode = existing.changeMode;
    next.hierarchy = existing.hierarchy;
    next.meta.modifyReason = this.cleanSkillReason?.(patch.reason || patch.modifyReason || patch.meta?.modifyReason, patch, existing);
    next.promptInstruction = this.shouldRefreshPromptInstruction(existing.promptInstruction) ? this.defaultPromptInstruction(kind, name) : existing.promptInstruction;
    next.source = patch.source || 'ai';
    return this.entry(worldTag, kind, name, next);
  },
});
