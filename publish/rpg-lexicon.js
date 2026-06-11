window.GameModules = window.GameModules || {};

window.GameModules.rpgLexicon = {
  normalizeName(name) {
    return String(name || '').trim().slice(0, 32);
  },

  entry(worldTag, kind, name, data = {}) {
    const clean = this.normalizeName(name);
    if (!clean) return null;
    return {
      worldTag: worldTag || '原创世界',
      kind,
      name: clean,
      summary: String(data.summary || data.desc || data.description || '').slice(0, 80),
      description: String(data.description || data.desc || data.summary || '').slice(0, 240),
      aliases: Array.isArray(data.aliases) ? data.aliases.slice(0, 6).map(String) : [],
      related: Array.isArray(data.related) ? data.related.slice(0, 12).map(String) : [],
      meta: data.meta || {},
      source: data.source || 'runtime',
    };
  },

  get(worldTag, kind, name) {
    return window.GameModules.sqliteSave.getLexiconEntry?.(worldTag || '原创世界', kind, this.normalizeName(name));
  },

  async save(worldTag, kind, name, data) {
    const entry = this.entry(worldTag, kind, name, data);
    if (!entry) return null;
    await window.GameModules.sqliteSave.saveLexiconEntry?.(entry);
    return entry;
  },

  async saveMany(entries) {
    const save = window.GameModules.sqliteSave;
    if (!save.db || !entries.length) return;
    const now = new Date().toISOString();
    for (const raw of entries) {
      const entry = this.entry(raw.worldTag, raw.kind, raw.name, raw);
      if (!entry) continue;
      save.db.run(
        'INSERT OR REPLACE INTO lexicon_entries(world_tag,kind,name,entry_json,source,created_at,updated_at) VALUES (?,?,?,?,?,COALESCE((SELECT created_at FROM lexicon_entries WHERE world_tag=? AND kind=? AND name=?),?),?)',
        [entry.worldTag, entry.kind, entry.name, JSON.stringify(entry), entry.source, entry.worldTag, entry.kind, entry.name, now, now],
      );
    }
    await save.persist();
  },
};
