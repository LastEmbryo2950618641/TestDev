/**
 * SQLite 存档：每个 slot 一个 sqlite 数据库，序列化后写入 dzmm.kv/localStorage。
 */
window.GameModules = window.GameModules || {};

window.GameModules.sqliteSave = {
  SQL: null,
  db: null,
  activeSlot: 'slot-1',

  async init() {
    if (this.SQL) return this.SQL;
    if (!window.initSqlJs) throw new Error('sql.js 未加载');
    this.SQL = await window.initSqlJs({ locateFile: (f) => `https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/${f}` });
    return this.SQL;
  },

  async open(slot) {
    await this.init();
    this.activeSlot = slot || this.activeSlot;
    const raw = await this.readRaw(this.activeSlot);
    this.db = raw ? new this.SQL.Database(this.fromBase64(raw)) : new this.SQL.Database();
    this.migrate();
    await this.persist();
  },

  async inspectSlot(slot) {
    await this.init();
    const raw = await this.readRaw(slot);
    if (!raw) return { slot, exists: false, savedAt: '' };
    const db = new this.SQL.Database(this.fromBase64(raw));
    let savedAt = '';
    try {
      const row = db.exec('SELECT updated_at FROM game_state WHERE key="main" LIMIT 1')?.[0]?.values?.[0];
      savedAt = row?.[0] || '';
    } catch (_) { /* 忽略 */ }
    db.close(); return { slot, exists: true, savedAt };
  },

  migrate() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS game_state(key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS world_lore(world_tag TEXT PRIMARY KEY, lore_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS world_attributes(world_tag TEXT PRIMARY KEY, attrs_json TEXT NOT NULL, source TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS rpg_schema(world_tag TEXT PRIMARY KEY, schema_json TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS profession_info(world_tag TEXT NOT NULL, name TEXT NOT NULL, info_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(world_tag,name));
      CREATE TABLE IF NOT EXISTS character_world(character_id TEXT PRIMARY KEY, world_tag TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS character_state(character_id TEXT PRIMARY KEY, name TEXT NOT NULL, world_tag TEXT NOT NULL, state_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS character_memory(character_id TEXT PRIMARY KEY, memory_json TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS memory_archive(id TEXT PRIMARY KEY, character_id TEXT NOT NULL, text TEXT NOT NULL, vector_json TEXT NOT NULL, meta_json TEXT NOT NULL, created_at TEXT NOT NULL);
    `);
    this.db.run('INSERT OR REPLACE INTO metadata(key,value) VALUES (?,?)', ['version', '1']);
  },

  async readRaw(slot) {
    const key = this.key(slot);
    try {
      if (window.dzmm?.kv) return (await window.dzmm.kv.get(key))?.value || null;
    } catch (err) {
      console.warn('SQLite 存档读取 KV 失败:', err.code, err.message);
    }
    try { return localStorage.getItem(key); } catch (_) { return null; }
  },

  async writeRaw(slot, value) {
    const key = this.key(slot);
    try {
      if (window.dzmm?.kv) {
        await window.dzmm.kv.put(key, value);
        return;
      }
    } catch (err) {
      console.warn('SQLite 存档写入 KV 失败:', err.code, err.message);
    }
    try { localStorage.setItem(key, value); } catch (_) { /* 忽略 */ }
  },

  async deleteSlot(slot) {
    const key = this.key(slot);
    try { if (window.dzmm?.kv) await window.dzmm.kv.delete(key); } catch (_) { /* 忽略 */ }
    try { localStorage.removeItem(key); } catch (_) { /* 忽略 */ }
  },

  key(slot) {
    return `control-rpg-sqlite-${slot}`;
  },

  async persist() {
    if (!this.db) return;
    await this.writeRaw(this.activeSlot, this.toBase64(this.db.export()));
  },

  getJson(sql, params = []) {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    const row = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    return row ? JSON.parse(row.value || row.lore_json || row.attrs_json || row.schema_json || row.info_json || row.state_json || row.memory_json || row.meta_json || row.vector_json) : null;
  },

  async saveGameState(value) {
    this.db.run('INSERT OR REPLACE INTO game_state(key,value,updated_at) VALUES (?,?,?)', ['main', JSON.stringify(value), new Date().toISOString()]);
    await this.persist();
  },

  loadGameState() {
    if (!this.db) return null;
    return this.getJson('SELECT value FROM game_state WHERE key=?', ['main']);
  },

  getWorldLore(worldTag) {
    return this.db ? this.getJson('SELECT lore_json FROM world_lore WHERE world_tag=?', [worldTag]) : null;
  },

  listWorldLores() {
    if (!this.db) return [];
    const rows = [];
    const stmt = this.db.prepare('SELECT lore_json FROM world_lore ORDER BY updated_at DESC');
    while (stmt.step()) rows.push(JSON.parse(stmt.getAsObject().lore_json));
    stmt.free(); return rows;
  },

  async saveWorldLore(worldTag, lore) {
    const now = new Date().toISOString();
    this.db.run(
      'INSERT OR REPLACE INTO world_lore(world_tag,lore_json,created_at,updated_at) VALUES (?,?,COALESCE((SELECT created_at FROM world_lore WHERE world_tag=?),?),?)',
      [worldTag, JSON.stringify(lore), worldTag, now, now],
    );
    await this.persist();
  },


  getSchema(worldTag) {
    return this.db ? this.getJson('SELECT schema_json FROM rpg_schema WHERE world_tag=?', [worldTag]) : null;
  },

  async saveSchema(worldTag, schema) {
    this.db.run('INSERT OR REPLACE INTO rpg_schema(world_tag,schema_json,created_at) VALUES (?,?,?)', [worldTag, JSON.stringify(schema), new Date().toISOString()]);
    await this.persist();
  },

  getCharacterState(characterId) {
    return this.db ? this.getJson('SELECT state_json FROM character_state WHERE character_id=?', [characterId]) : null;
  },

  listCharacterStates() {
    if (!this.db) return [];
    const rows = [];
    const stmt = this.db.prepare('SELECT state_json FROM character_state ORDER BY created_at');
    while (stmt.step()) rows.push(JSON.parse(stmt.getAsObject().state_json));
    stmt.free(); return rows;
  },


  async saveCharacterState(character) {
    const now = new Date().toISOString();
    await this.saveCharacterWorld(character.id, character.worldTag);
    this.db.run(
      'INSERT OR REPLACE INTO character_state(character_id,name,world_tag,state_json,created_at,updated_at) VALUES (?,?,?,?,COALESCE((SELECT created_at FROM character_state WHERE character_id=?),?),?)',
      [character.id, character.name, character.worldTag, JSON.stringify(character), character.id, now, now],
    );
    await this.persist();
  },


  toBase64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(binary);
  },

  fromBase64(raw) {
    const binary = atob(raw); const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  },
};
