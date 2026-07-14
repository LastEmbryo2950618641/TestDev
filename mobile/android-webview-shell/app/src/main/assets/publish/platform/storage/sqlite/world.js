/**
 * SQLite 世界属性与角色-世界关联扩展。
 */
window.GameModules = window.GameModules || {};
Object.assign(window.GameModules.sqliteSave, {
  getWorldAttributes(worldTag) {
    return this.db ? this.getJson('SELECT attrs_json FROM world_attributes WHERE world_tag=?', [worldTag]) : null;
  },

  async saveWorldAttributes(worldTag, attrs) {
    if (!this.db) return;
    const now = new Date().toISOString();
    this.db.run(
      'INSERT OR REPLACE INTO world_attributes(world_tag,attrs_json,source,created_at,updated_at) VALUES (?,?,?,COALESCE((SELECT created_at FROM world_attributes WHERE world_tag=?),?),?)',
      [worldTag, JSON.stringify(attrs), attrs.source || 'runtime', worldTag, now, now],
    );
    await this.persist();
  },

  getCharacterWorld(characterId) {
    if (this.fallback) return this.normalizeQueryWorldTag?.(this.fallbackState?.characterWorlds?.[characterId]) || this.fallbackState?.characterWorlds?.[characterId] || null;
    if (!this.db) return null;
    const stmt = this.db.prepare('SELECT world_tag FROM character_world WHERE character_id=?');
    stmt.bind([characterId]);
    const row = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    return this.normalizeQueryWorldTag?.(row?.world_tag) || row?.world_tag || null;
  },

  async saveCharacterWorld(characterId, worldTag) {
    const normalizedWorld = this.normalizeQueryWorldTag?.(worldTag) || worldTag;
    if (this.fallback) {
      this.fallbackState = this.fallbackState || { version: 1, main: null, updatedAt: '' };
      this.fallbackState.characterWorlds = { ...(this.fallbackState.characterWorlds || {}), [characterId]: normalizedWorld };
      this.fallbackState.updatedAt = new Date().toISOString();
      await this.persist();
      return;
    }
    if (!this.db) return;
    this.db.run('INSERT OR REPLACE INTO character_world(character_id,world_tag,updated_at) VALUES (?,?,?)', [characterId, normalizedWorld, new Date().toISOString()]);
    await this.persist();
  },

  getProfessionInfo(worldTag, name) {
    return this.db ? this.getJson('SELECT info_json FROM profession_info WHERE world_tag=? AND name=?', [worldTag, name]) : null;
  },

  async saveProfessionInfo(worldTag, info) {
    if (!this.db || !info) return;
    const now = new Date().toISOString();
    this.db.run(
      'INSERT OR REPLACE INTO profession_info(world_tag,name,info_json,created_at,updated_at) VALUES (?,?,?,COALESCE((SELECT created_at FROM profession_info WHERE world_tag=? AND name=?),?),?)',
      [worldTag, info.name, JSON.stringify(info), worldTag, info.name, now, now],
    );
    await this.persist();
  },

  cleanLexiconReason(entry) {
    const reason = String(entry?.meta?.modifyReason || '').trim();
    if (!reason) return entry;
    const blocked = [entry.description, entry.summary].filter(Boolean).map((x) => String(x).trim());
    const isDescription = blocked.includes(reason) || /词条说明|当前作用|用于记录|暂无详细说明/.test(reason);
    if (!isDescription && !/^(AI演算|系统结算|系统词条调整|用户主动)$/.test(reason)) return entry;
    return { ...entry, meta: { ...(entry.meta || {}), modifyReason: '' } };
  },

  getLexiconEntry(worldTag, kind, name) {
    if (!this.db) return null;
    return this.cleanLexiconReason(this.getJson('SELECT entry_json FROM lexicon_entries WHERE world_tag=? AND kind=? AND name=?', [worldTag, kind, name]));
  },

  listLexiconEntries(worldTag = '', kind = '') {
    if (!this.db) return [];
    const rows = [];
    const where = [];
    const params = [];
    if (worldTag) { where.push('world_tag=?'); params.push(worldTag); }
    if (kind) { where.push('kind=?'); params.push(kind); }
    const stmt = this.db.prepare(`SELECT entry_json FROM lexicon_entries${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY updated_at DESC`);
    stmt.bind(params);
    while (stmt.step()) {
      try { rows.push(this.cleanLexiconReason(JSON.parse(stmt.getAsObject().entry_json))); } catch (_) { /* ignore bad row */ }
    }
    stmt.free();
    return rows.filter(Boolean);
  },

  async saveLexiconEntry(entry) {
    if (!entry) return;
    await this.saveLexiconEntries([entry]);
  },

  async saveLexiconEntries(entries = []) {
    if (!this.db || !Array.isArray(entries) || !entries.length) return;
    const now = new Date().toISOString();
    entries.forEach((entry) => {
      if (!entry) return;
      this.db.run(
        'INSERT OR REPLACE INTO lexicon_entries(world_tag,kind,name,entry_json,source,created_at,updated_at) VALUES (?,?,?,?,?,COALESCE((SELECT created_at FROM lexicon_entries WHERE world_tag=? AND kind=? AND name=?),?),?)',
        [entry.worldTag, entry.kind, entry.name, JSON.stringify(entry), entry.source || 'runtime', entry.worldTag, entry.kind, entry.name, now, now],
      );
    });
    await this.persist();
  },
});
