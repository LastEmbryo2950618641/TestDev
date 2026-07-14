/**
 * SQLite 角色记忆扩展。
 */
window.GameModules = window.GameModules || {};
Object.assign(window.GameModules.sqliteSave, {
  listCharacterMemories() {
    if (!this.db) return [];
    const rows = [];
    const stmt = this.db.prepare('SELECT character_id,memory_json FROM character_memory');
    while (stmt.step()) {
      const row = stmt.getAsObject();
      rows.push({ characterId: row.character_id, memory: JSON.parse(row.memory_json) });
    }
    stmt.free();
    return rows;
  },

  replaceCharacterMemory(characterId, memory) {
    if (!this.db || !characterId || !memory) return;
    this.db.run('INSERT OR REPLACE INTO character_memory(character_id,memory_json,updated_at) VALUES (?,?,?)', [characterId, JSON.stringify(memory), new Date().toISOString()]);
  },

  getCharacterMemory(characterId) {
    return this.db ? this.getJson('SELECT memory_json FROM character_memory WHERE character_id=?', [characterId]) : null;
  },

  async saveCharacterMemory(characterId, memory) {
    if (!this.db) return;
    this.db.run('INSERT OR REPLACE INTO character_memory(character_id,memory_json,updated_at) VALUES (?,?,?)', [characterId, JSON.stringify(memory), new Date().toISOString()]);
    await this.persist();
  },

  listMemoryArchives(characterId) {
    if (!this.db) return [];
    const rows = [];
    const stmt = this.db.prepare('SELECT id,text,vector_json,meta_json,created_at FROM memory_archive WHERE character_id=? ORDER BY created_at DESC');
    stmt.bind([characterId]);
    while (stmt.step()) {
      const row = stmt.getAsObject();
      rows.push({ id: row.id, text: row.text, vector: JSON.parse(row.vector_json), meta: JSON.parse(row.meta_json), createdAt: row.created_at });
    }
    stmt.free(); return rows;
  },

  listAllMemoryArchives() {
    if (!this.db) return [];
    const rows = [];
    const stmt = this.db.prepare('SELECT id,character_id,text,vector_json,meta_json,created_at FROM memory_archive ORDER BY created_at DESC');
    while (stmt.step()) {
      const row = stmt.getAsObject();
      rows.push({ id: row.id, characterId: row.character_id, text: row.text, vector: JSON.parse(row.vector_json), meta: JSON.parse(row.meta_json), createdAt: row.created_at });
    }
    stmt.free();
    return rows;
  },

  deleteMemoryArchive(id) {
    if (!this.db || !id) return;
    this.db.run('DELETE FROM memory_archive WHERE id=?', [id]);
  },

  async saveMemoryArchive(characterId, item) {
    if (!this.db || !item) return;
    this.db.run(
      'INSERT OR REPLACE INTO memory_archive(id,character_id,text,vector_json,meta_json,created_at) VALUES (?,?,?,?,?,?)',
      [item.id, characterId, item.text, JSON.stringify(item.vector), JSON.stringify(item.meta || {}), item.createdAt || new Date().toISOString()],
    );
    await this.persist();
  },
});
