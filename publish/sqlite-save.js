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

  migrate() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS game_state(key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS rpg_schema(world_tag TEXT PRIMARY KEY, schema_json TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS character_state(character_id TEXT PRIMARY KEY, name TEXT NOT NULL, world_tag TEXT NOT NULL, state_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
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
    return row ? JSON.parse(row.value || row.schema_json || row.state_json) : null;
  },

  async saveGameState(value) {
    this.db.run('INSERT OR REPLACE INTO game_state(key,value,updated_at) VALUES (?,?,?)', ['main', JSON.stringify(value), new Date().toISOString()]);
    await this.persist();
  },

  loadGameState() {
    if (!this.db) return null;
    return this.getJson('SELECT value FROM game_state WHERE key=?', ['main']);
  },

  getSchema(worldTag) {
    if (!this.db) return null;
    return this.getJson('SELECT schema_json FROM rpg_schema WHERE world_tag=?', [worldTag]);
  },

  async saveSchema(worldTag, schema) {
    this.db.run('INSERT OR REPLACE INTO rpg_schema(world_tag,schema_json,created_at) VALUES (?,?,?)', [worldTag, JSON.stringify(schema), new Date().toISOString()]);
    await this.persist();
  },

  getCharacterState(characterId) {
    if (!this.db) return null;
    return this.getJson('SELECT state_json FROM character_state WHERE character_id=?', [characterId]);
  },

  listCharacterStates() {
    if (!this.db) return [];
    const rows = [];
    const stmt = this.db.prepare('SELECT state_json FROM character_state ORDER BY created_at');
    while (stmt.step()) rows.push(JSON.parse(stmt.getAsObject().state_json));
    stmt.free();
    return rows;
  },

  async saveCharacterState(character) {
    const now = new Date().toISOString();
    this.db.run(
      'INSERT OR REPLACE INTO character_state(character_id,name,world_tag,state_json,created_at,updated_at) VALUES (?,?,?,?,COALESCE((SELECT created_at FROM character_state WHERE character_id=?),?),?)',
      [character.id, character.name, character.worldTag, JSON.stringify(character), character.id, now, now],
    );
    await this.persist();
  },

  toBase64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
  },

  fromBase64(raw) {
    const binary = atob(raw);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  },
};
