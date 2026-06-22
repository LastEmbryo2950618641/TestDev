window.GameModules = window.GameModules || {};

(() => {
  const save = window.GameModules.sqliteSave;
  const baseMigrate = save.migrate.bind(save);
  const baseReadFallbackState = save.readFallbackState.bind(save);

  save.readFallbackState = function readFallbackState(raw) {
    const state = baseReadFallbackState(raw);
    try {
      const parsed = raw ? JSON.parse(raw) : null;
      state.realWorldLogEntries = parsed?.realWorldLogEntries || {};
    } catch (_) {
      state.realWorldLogEntries = {};
    }
    return state;
  };

  save.migrate = function migrate() {
    baseMigrate();
    this.db.run(`
      CREATE TABLE IF NOT EXISTS real_world_log(
        id TEXT PRIMARY KEY,
        entry_json TEXT NOT NULL,
        entry_type TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_real_world_log_created ON real_world_log(created_at);
    `);
  };

  save.saveRealWorldLogEntry = async function saveRealWorldLogEntry(entry = {}) {
    if (!entry.id) return;
    const now = new Date().toISOString();
    if (this.fallback) {
      this.fallbackState = this.fallbackState || { version: 1, main: null, updatedAt: '' };
      this.fallbackState.realWorldLogEntries = { ...(this.fallbackState.realWorldLogEntries || {}), [entry.id]: { ...entry, updatedAt: now } };
      await this.persist();
      return;
    }
    if (!this.db) return;
    const createdAt = entry.createdAt || entry.time?.iso || now;
    const next = { ...entry, createdAt, updatedAt: now };
    this.db.run(
      'INSERT OR REPLACE INTO real_world_log(id,entry_json,entry_type,created_at,updated_at) VALUES (?,?,?,?,?)',
      [String(next.id), JSON.stringify(next), String(next.type || 'ai'), createdAt, now],
    );
    await this.persist();
  };

  save.saveRealWorldLogEntries = async function saveRealWorldLogEntries(entries = []) {
    if (!Array.isArray(entries) || !entries.length) return;
    const baseTime = Date.now();
    if (this.fallback) {
      this.fallbackState = this.fallbackState || { version: 1, main: null, updatedAt: '' };
      const old = this.fallbackState.realWorldLogEntries || {};
      const rows = entries.filter((entry) => entry?.id).map((entry, index) => {
        const now = new Date(baseTime + index).toISOString();
        return [entry.id, { ...entry, createdAt: entry.createdAt || entry.time?.iso || now, updatedAt: now }];
      });
      this.fallbackState.realWorldLogEntries = { ...old, ...Object.fromEntries(rows) };
      await this.persist();
      return;
    }
    if (!this.db) return;
    for (const [index, entry] of entries.entries()) {
      if (!entry?.id) continue;
      const now = new Date(baseTime + index).toISOString();
      const createdAt = entry.createdAt || entry.time?.iso || now;
      const next = { ...entry, createdAt, updatedAt: now };
      this.db.run(
        'INSERT OR REPLACE INTO real_world_log(id,entry_json,entry_type,created_at,updated_at) VALUES (?,?,?,?,?)',
        [String(next.id), JSON.stringify(next), String(next.type || 'ai'), createdAt, now],
      );
    }
    await this.persist();
  };

  save.deleteRealWorldLogEntry = async function deleteRealWorldLogEntry(id = '') {
    const key = String(id || '');
    if (!key) return;
    if (this.fallback) {
      const old = this.fallbackState?.realWorldLogEntries || {};
      const { [key]: _removed, ...rest } = old;
      this.fallbackState.realWorldLogEntries = rest;
      await this.persist();
      return;
    }
    if (!this.db) return;
    this.db.run('DELETE FROM real_world_log WHERE id=?', [key]);
    await this.persist();
  };

  save.countRealWorldLogEntries = function countRealWorldLogEntries() {
    if (this.fallback) return Object.keys(this.fallbackState?.realWorldLogEntries || {}).length;
    if (!this.db) return 0;
    const row = this.db.exec('SELECT COUNT(*) FROM real_world_log')?.[0]?.values?.[0];
    return Number(row?.[0] || 0);
  };

  save.listRealWorldLogEntries = function listRealWorldLogEntries(page = 1, pageSize = 12) {
    const size = Math.max(1, Math.min(30, Number(pageSize) || 12));
    const offset = Math.max(0, ((Number(page) || 1) - 1) * size);
    if (this.fallback) {
      return Object.values(this.fallbackState?.realWorldLogEntries || {})
        .sort((a, b) => String(a.createdAt || a.time?.label || a.id).localeCompare(String(b.createdAt || b.time?.label || b.id)))
        .slice(offset, offset + size);
    }
    if (!this.db) return [];
    const rows = [];
    const stmt = this.db.prepare('SELECT entry_json FROM real_world_log ORDER BY created_at ASC, id ASC LIMIT ? OFFSET ?');
    stmt.bind([size, offset]);
    while (stmt.step()) rows.push(JSON.parse(stmt.getAsObject().entry_json));
    stmt.free();
    return rows;
  };
})();
