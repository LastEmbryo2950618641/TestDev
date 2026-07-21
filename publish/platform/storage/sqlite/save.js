/**
 * SQLite 瀛樻。锛氭瘡涓?slot 涓€涓?sqlite 鏁版嵁搴擄紝搴忓垪鍖栧悗鍐欏叆 dzmm.kv/localStorage銆?
 */
window.GameModules = window.GameModules || {};

window.GameModules.sqliteSave = {
  SQL: null,
  db: null,
  fallback: false,
  fallbackState: null,
  activeSlot: 'slot-1',

  async init() {
    if (this.SQL || this.fallback) return this.SQL;
    if (window.location?.protocol === 'file:') {
      this.fallback = true;
      return null;
    }
    try {
      if (!window.initSqlJs && window.GameBoot?.loadScript) {
        try {
          await window.GameBoot.loadScript('vendor/sql-wasm.js');
        } catch (_) { /* ignore and fallback below */ }
      }
      if (!window.initSqlJs) throw new Error('sql.js 未加载');
      this.SQL = await window.initSqlJs({ locateFile: (f) => `vendor/${f}` });
      return this.SQL;
    } catch (err) {
      console.warn('SQLite 初始化失败，改用基础 JSON 存档:', err.message, err.stack);
      this.fallback = true;
      return null;
    }
  },

  async open(slot, options = {}) {
    this.activeSlot = slot || this.activeSlot;
    await this.init();
    const raw = await this.readRaw(this.activeSlot);
    if (this.fallback) {
      this.db = null;
      this.fallbackState = this.readFallbackState(raw);
      return;
    }
    this.db = raw ? new this.SQL.Database(this.fromBase64(raw)) : new this.SQL.Database();
    this.migrate();
    if (!options.deferPersist) await this.persist();
  },

  async inspectSlot(slot) {
    await this.init();
    const raw = await this.readRaw(slot);
    if (!raw) return { slot, exists: false, savedAt: '', playerName: '', phoneSetupDone: false };
    let savedAt = '';
    let playerName = '';
    let phoneSetupDone = false;
    if (this.fallback) {
      const state = this.readFallbackState(raw);
      const main = state?.main || {};
      savedAt = state?.updatedAt || '';
      playerName = String(main.playerName || main.playerProfile?.name || '').trim();
      phoneSetupDone = Boolean(main.phoneSetupDone);
      return { slot, exists: Boolean(state?.main), savedAt, playerName, phoneSetupDone };
    }
    const db = new this.SQL.Database(this.fromBase64(raw));
    try {
      const row = db.exec('SELECT value, updated_at FROM game_state WHERE key="main" LIMIT 1')?.[0]?.values?.[0];
      if (row) {
        savedAt = row[1] || '';
        try {
          const main = JSON.parse(String(row[0] || '{}'));
          playerName = String(main.playerName || main.playerProfile?.name || '').trim();
          phoneSetupDone = Boolean(main.phoneSetupDone);
        } catch (_) { /* 蹇界暐 */ }
      }
    } catch (_) { /* 蹇界暐 */ }
    db.close();
    return { slot, exists: true, savedAt, playerName, phoneSetupDone };
  },

  migrate() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS game_state(key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS world_lore(world_tag TEXT PRIMARY KEY, lore_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS world_attributes(world_tag TEXT PRIMARY KEY, attrs_json TEXT NOT NULL, source TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS rpg_schema(world_tag TEXT PRIMARY KEY, schema_json TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS profession_info(world_tag TEXT NOT NULL, name TEXT NOT NULL, info_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(world_tag,name));
      CREATE TABLE IF NOT EXISTS lexicon_entries(world_tag TEXT NOT NULL, kind TEXT NOT NULL, name TEXT NOT NULL, entry_json TEXT NOT NULL, source TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(world_tag,kind,name));
      CREATE TABLE IF NOT EXISTS character_world(character_id TEXT PRIMARY KEY, world_tag TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS character_state(character_id TEXT PRIMARY KEY, name TEXT NOT NULL, world_tag TEXT NOT NULL, state_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS character_intro(world_tag TEXT NOT NULL, name TEXT NOT NULL, intro_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(world_tag,name));
      CREATE TABLE IF NOT EXISTS character_memory(character_id TEXT PRIMARY KEY, memory_json TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS memory_archive(id TEXT PRIMARY KEY, character_id TEXT NOT NULL, text TEXT NOT NULL, vector_json TEXT NOT NULL, meta_json TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS wechat_history(id TEXT PRIMARY KEY, contact_id TEXT NOT NULL, message_json TEXT NOT NULL, created_at TEXT NOT NULL);
    `);
    this.db.run('INSERT OR REPLACE INTO metadata(key,value) VALUES (?,?)', ['version', '1']);
  },

  async readRaw(slot) {
    const key = this.key(slot);
    try {
      if (window.dzmm?.kv) return (await window.dzmm.kv.get(key))?.value || null;
    } catch (err) {
      console.warn('SQLite 瀛樻。璇诲彇 KV 澶辫触:', err.code, err.message);
    }
    return window.GameModules.platform.core.storage.sqliteSlotSource.read(key);
  },

  async writeRaw(slot, value) {
    const key = this.key(slot);
    try {
      if (window.dzmm?.kv) {
        await window.dzmm.kv.put(key, value);
        return;
      }
    } catch (err) {
      console.warn('SQLite 瀛樻。鍐欏叆 KV 澶辫触:', err.code, err.message);
    }
    window.GameModules.platform.core.storage.sqliteSlotSource.write(key, value);
  },

  async deleteSlot(slot) {
    const key = this.key(slot);
    try { if (window.dzmm?.kv) await window.dzmm.kv.delete(key); } catch (_) { /* 蹇界暐 */ }
    window.GameModules.platform.core.storage.sqliteSlotSource.remove(key);
  },

  key(slot) {
    return `control-rpg-sqlite-${slot}`;
  },

  async persist() {
    if (this.fallback) {
      await this.writeRaw(this.activeSlot, JSON.stringify(this.fallbackState || { version: 1, main: null, updatedAt: '' }));
      return;
    }
    if (!this.db) return;
    await this.writeRaw(this.activeSlot, this.toBase64(this.db.export()));
  },

  readFallbackState(raw) {
    if (!raw) return { version: 1, main: null, updatedAt: '', characterStates: {}, characterWorlds: {}, characterIntros: {} };
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object'
        ? { version: 1, main: parsed.main || null, updatedAt: parsed.updatedAt || '', characterStates: parsed.characterStates || {}, characterWorlds: parsed.characterWorlds || {}, characterIntros: parsed.characterIntros || {} }
        : { version: 1, main: null, updatedAt: '', characterStates: {}, characterWorlds: {}, characterIntros: {} };
    } catch (_) {
      return { version: 1, main: null, updatedAt: '', characterStates: {}, characterWorlds: {}, characterIntros: {} };
    }
  },

  getJson(sql, params = []) {
    if (!this.db) return null;
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    const row = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    return row ? JSON.parse(row.value || row.lore_json || row.worldline_json || row.attrs_json || row.schema_json || row.info_json || row.entry_json || row.state_json || row.intro_json || row.memory_json || row.meta_json || row.vector_json) : null;
  },

  async saveGameState(value) {
    const now = new Date().toISOString();
    if (!this.db && !this.fallback) {
      await this.open(this.activeSlot);
    }
    if (this.fallback) {
      this.fallbackState = { ...(this.fallbackState || {}), version: 1, main: value, updatedAt: now };
      await this.persist();
      return;
    }
    if (!this.db) return;
    this.db.run('INSERT OR REPLACE INTO game_state(key,value,updated_at) VALUES (?,?,?)', ['main', JSON.stringify(value), now]);
    await this.persist();
  },

  loadGameState() {
    if (this.fallback) return this.fallbackState?.main || null;
    if (!this.db) return null;
    return this.getJson('SELECT value FROM game_state WHERE key=?', ['main']);
  },

  getMetaJson(key) {
    if (this.fallback) return null;
    if (!this.db) return null;
    const stmt = this.db.prepare('SELECT value FROM metadata WHERE key=?');
    stmt.bind([key]);
    const row = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    try { return row ? JSON.parse(row.value) : null; } catch (_) { return null; }
  },

  async saveMetaJson(key, value, options = {}) {
    if (!this.db) return;
    this.db.run('INSERT OR REPLACE INTO metadata(key,value) VALUES (?,?)', [key, JSON.stringify(value)]);
    if (!options.deferPersist) await this.persist();
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
    if (!this.db) return;
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
    if (!this.db) return;
    this.db.run('INSERT OR REPLACE INTO rpg_schema(world_tag,schema_json,created_at) VALUES (?,?,?)', [worldTag, JSON.stringify(schema), new Date().toISOString()]);
    await this.persist();
  },

  getCharacterState(characterId) {
    if (this.fallback) return this.fallbackState?.characterStates?.[characterId] || null;
    return this.db ? this.getJson('SELECT state_json FROM character_state WHERE character_id=?', [characterId]) : null;
  },

  realWorldAliases() {
    const label = window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';
    return [label, '2026 现代都市现实世界', '现代都市现实世界', '现实世界', '2026 鐜颁唬閮藉競鐜板疄涓栫晫', '鐜颁唬閮藉競鐜板疄涓栫晫', '鐜板疄涓栫晫'];
  },

  normalizeQueryWorldTag(worldTag = '') {
    const text = String(worldTag || '').trim();
    return this.realWorldAliases().includes(text) ? (window.GameModules.realWorld2026?.label || '2026 现代都市现实世界') : text;
  },

  worldTagMatchesQuery(stateWorld = '', queryWorld = '') {
    const state = this.normalizeQueryWorldTag(stateWorld);
    const query = this.normalizeQueryWorldTag(queryWorld);
    return !query || state === query;
  },

  getCharacterStateByName(name, worldTag = '') {
    if (!name) return null;
    const queryWorld = this.normalizeQueryWorldTag(worldTag);
    if (this.fallback) {
      const states = Object.values(this.fallbackState?.characterStates || {}).filter((state) => state?.name === name && this.worldTagMatchesQuery(state.worldTag || state.profile?.work, queryWorld));
      return states.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))[0] || null;
    }
    if (!this.db) return null;
    if (queryWorld) {
      const aliases = this.realWorldAliases().includes(queryWorld) ? this.realWorldAliases() : [queryWorld];
      const placeholders = aliases.map(() => '?').join(',');
      return this.getJson(`SELECT state_json FROM character_state WHERE name=? AND world_tag IN (${placeholders}) ORDER BY updated_at DESC LIMIT 1`, [name, ...aliases]);
    }
    return this.getJson('SELECT state_json FROM character_state WHERE name=? ORDER BY updated_at DESC LIMIT 1', [name]);
  },

  listCharacterStates() {
    if (this.fallback) return Object.values(this.fallbackState?.characterStates || {});
    if (!this.db) return [];
    const rows = [];
    const stmt = this.db.prepare('SELECT state_json FROM character_state ORDER BY created_at');
    while (stmt.step()) rows.push(JSON.parse(stmt.getAsObject().state_json));
    stmt.free(); return rows;
  },



  introKey(worldTag, name) {
    return `${worldTag || '鏈煡涓栫晫'}::${name || '鏈煡瑙掕壊'}`;
  },

  getCharacterIntro(name, worldTag = '') {
    if (!name) return null;
    const queryWorld = this.normalizeQueryWorldTag(worldTag);
    if (this.fallback) {
      const rows = Object.values(this.fallbackState?.characterIntros || {}).filter((card) => card?.name === name && this.worldTagMatchesQuery(card.worldTag || card.work, queryWorld));
      return rows.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))[0] || null;
    }
    if (!this.db) return null;
    if (queryWorld) {
      const aliases = this.realWorldAliases().includes(queryWorld) ? this.realWorldAliases() : [queryWorld];
      const placeholders = aliases.map(() => '?').join(',');
      return this.getJson(`SELECT intro_json FROM character_intro WHERE name=? AND world_tag IN (${placeholders}) ORDER BY updated_at DESC LIMIT 1`, [name, ...aliases]);
    }
    return this.getJson('SELECT intro_json FROM character_intro WHERE name=? ORDER BY updated_at DESC LIMIT 1', [name]);
  },

  listCharacterIntros() {
    if (this.fallback) return Object.values(this.fallbackState?.characterIntros || {});
    if (!this.db) return [];
    const rows = [];
    const stmt = this.db.prepare('SELECT intro_json FROM character_intro ORDER BY updated_at DESC');
    while (stmt.step()) rows.push(JSON.parse(stmt.getAsObject().intro_json));
    stmt.free(); return rows;
  },

  async saveCharacterIntro(card) {
    if (!card?.name) return null;
    const now = new Date().toISOString();
    const intro = { ...card, worldTag: this.normalizeQueryWorldTag(card.worldTag || card.work || '鏈煡涓栫晫'), updatedAt: now, createdAt: card.createdAt || now };
    if (this.fallback) {
      this.fallbackState = this.fallbackState || { version: 1, main: null, updatedAt: '', characterIntros: {} };
      this.fallbackState.characterIntros = { ...(this.fallbackState.characterIntros || {}), [this.introKey(intro.worldTag, intro.name)]: intro };
      this.fallbackState.updatedAt = now;
      await this.persist();
      return intro;
    }
    if (!this.db) return intro;
    this.db.run(
      'INSERT OR REPLACE INTO character_intro(world_tag,name,intro_json,created_at,updated_at) VALUES (?,?,?,COALESCE((SELECT created_at FROM character_intro WHERE world_tag=? AND name=?),?),?)',
      [intro.worldTag, intro.name, JSON.stringify(intro), intro.worldTag, intro.name, now, now],
    );
    await this.persist();
    return intro;
  },

  async saveCharacterState(character) {
    if (!character) return;
    const now = new Date().toISOString();
    const worldTag = this.normalizeQueryWorldTag(character.worldTag || character.profile?.work || '鏈煡涓栫晫');
    character.worldTag = worldTag;
    if (character.values) character.values.world_tag = worldTag;
    if (character.profile?.work) character.profile.work = worldTag;
    const normalized = { ...character, worldTag, values: character.values ? { ...character.values, world_tag: worldTag } : character.values, updatedAt: now };
    if (normalized.profile?.work) normalized.profile = { ...normalized.profile, work: worldTag };
    if (this.fallback) {
      this.fallbackState = this.fallbackState || { version: 1, main: null, updatedAt: '' };
      this.fallbackState.characterStates = { ...(this.fallbackState.characterStates || {}), [normalized.id]: normalized };
      this.fallbackState.characterWorlds = { ...(this.fallbackState.characterWorlds || {}), [normalized.id]: worldTag };
      this.fallbackState.updatedAt = now;
      await this.persist();
      return;
    }
    if (!this.db) return;
    await this.saveCharacterWorld(normalized.id, worldTag);
    this.db.run(
      'INSERT OR REPLACE INTO character_state(character_id,name,world_tag,state_json,created_at,updated_at) VALUES (?,?,?,?,COALESCE((SELECT created_at FROM character_state WHERE character_id=?),?),?)',
      [normalized.id, normalized.name, worldTag, JSON.stringify(normalized), normalized.id, now, now],
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
