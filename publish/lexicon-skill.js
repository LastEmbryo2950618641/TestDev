window.GameModules = window.GameModules || {};

Object.assign(window.GameModules.rpgLexicon, {
  lexiconSkillId: 'lexicon.modify.batch',

  buildSkillEntry(raw = {}) {
    const worldTag = raw.worldTag || raw.world || '原创世界';
    const kind = raw.kind || raw.type || '词条';
    const name = this.normalizeName(raw.name || raw.label);
    if (!name || !kind) return null;
    const old = this.get(worldTag, kind, name);
    const promptInstruction = this.shouldRefreshPromptInstruction(old?.promptInstruction)
      ? (raw.promptInstruction || this.defaultPromptInstruction(kind, name))
      : old?.promptInstruction;
    return this.entry(worldTag, kind, name, {
      ...raw,
      nameAiGenerated: (old?.nameAiGenerated || old?.aiGenerated) ? true : (raw.nameAiGenerated ?? raw.aiGenerated),
      valueAiGenerated: old?.valueAiGenerated ? true : (raw.valueAiGenerated ?? raw.aiGenerated),
      changeMode: old?.changeMode || raw.changeMode,
      hierarchy: old?.hierarchy || raw.hierarchy,
      promptInstruction,
      meta: {
        ...(old?.meta || {}),
        ...(raw.meta || {}),
        modifiedBySkill: this.lexiconSkillId,
        modifyReason: raw.reason || raw.modifyReason || raw.description || '系统词条调整',
      },
    });
  },

  async applyLexiconSkill(payload = {}) {
    const save = window.GameModules.sqliteSave;
    const entries = Array.isArray(payload) ? payload : (payload.entries || payload.updates || []);
    if (!save.db || !Array.isArray(entries) || !entries.length) return [];
    const changed = [];
    const now = new Date().toISOString();
    for (const raw of entries) {
      const entry = this.buildSkillEntry({ source: 'skill', ...raw });
      if (!entry || this.isSameLexiconEntry(this.get(entry.worldTag, entry.kind, entry.name), entry)) continue;
      save.db.run(
        'INSERT OR REPLACE INTO lexicon_entries(world_tag,kind,name,entry_json,source,created_at,updated_at) VALUES (?,?,?,?,?,COALESCE((SELECT created_at FROM lexicon_entries WHERE world_tag=? AND kind=? AND name=?),?),?)',
        [entry.worldTag, entry.kind, entry.name, JSON.stringify(entry), entry.source, entry.worldTag, entry.kind, entry.name, now, now],
      );
      changed.push(entry);
    }
    if (changed.length) await save.persist();
    return changed;
  },

  isSameLexiconEntry(a, b) {
    if (!a || !b) return false;
    return JSON.stringify(a) === JSON.stringify(b);
  },
});
