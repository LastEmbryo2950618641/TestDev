window.GameModules = window.GameModules || {};
window.GameModules.platform = window.GameModules.platform || {};
window.GameModules.platform.core = window.GameModules.platform.core || {};
window.GameModules.platform.storage = window.GameModules.platform.storage || {};

window.GameModules.platform.storage.wechatHistorySource = {
  ensure() {
    const save = window.GameModules.sqliteSave;
    if (!save?.db) return false;
    save.db.run('CREATE TABLE IF NOT EXISTS wechat_history(id TEXT PRIMARY KEY, contact_id TEXT NOT NULL, message_json TEXT NOT NULL, created_at TEXT NOT NULL)');
    return true;
  },

  async append(entry = {}) {
    const save = window.GameModules.sqliteSave;
    if (!entry.id || !entry.contactId || !entry.message || !entry.createdAt || !this.ensure()) return;
    save.db.run(
      'INSERT OR REPLACE INTO wechat_history(id,contact_id,message_json,created_at) VALUES (?,?,?,?)',
      [entry.id, entry.contactId, JSON.stringify(entry.message), entry.createdAt],
    );
    await save.persist();
  },

  list(contactId = '', limit = 12) {
    const save = window.GameModules.sqliteSave;
    if (!contactId || !this.ensure()) return [];
    const rows = [];
    const stmt = save.db.prepare('SELECT message_json FROM wechat_history WHERE contact_id=? ORDER BY created_at DESC LIMIT ?');
    stmt.bind([contactId, limit]);
    while (stmt.step()) {
      try { rows.push(JSON.parse(stmt.getAsObject().message_json)); }
      catch (_) { /* Ignore malformed legacy rows. */ }
    }
    stmt.free();
    return rows.reverse();
  },

  listRecent(contactId = '', limit = 300) {
    if (!this.ensure()) return [];
    const save = window.GameModules.sqliteSave;
    const size = Math.max(1, Math.min(300, Number(limit) || 300));
    const sql = contactId
      ? 'SELECT contact_id,message_json,created_at FROM wechat_history WHERE contact_id=? ORDER BY created_at DESC LIMIT ?'
      : 'SELECT contact_id,message_json,created_at FROM wechat_history ORDER BY created_at DESC LIMIT ?';
    const stmt = save.db.prepare(sql);
    stmt.bind(contactId ? [contactId, size] : [size]);
    const rows = [];
    while (stmt.step()) {
      try {
        const row = stmt.getAsObject();
        rows.push({ contactId: row.contact_id, message: JSON.parse(row.message_json), createdAt: row.created_at });
      } catch (_) { /* Ignore malformed legacy rows. */ }
    }
    stmt.free();
    return rows;
  },
};

window.GameModules.platform.core.storage = window.GameModules.platform.core.storage || {};
window.GameModules.platform.core.storage.wechatHistorySource = window.GameModules.platform.storage.wechatHistorySource;
