/**
 * SQLite 世界线扩展：保存世界范围时间、异世界事件、原著剧情索引与势力对象。
 */
window.GameModules = window.GameModules || {};

(() => {
  const save = window.GameModules.sqliteSave;
  const baseMigrate = save.migrate.bind(save);
  const baseSaveWorldLore = save.saveWorldLore.bind(save);

  save.worldlineFieldDocs = {
    世界线: {
      时间: '当前世界线覆盖的世界范围时间，格式为 [时间1 - 时间2]。',
      异世界事件: '当前世界线内已经确认或正在发生的原创/异世界事件列表。',
      原著剧情: '关联到 md 文档“剧情索引”的剧情索引条目。',
      势力: 'key=势力ID，value=势力对象的键值对集合。',
    },
    事件: {
      事件ID: '事件唯一 ID。', 名称: '事件显示名称。', 时间: '事件发生或持续时间。', 摘要: '短摘要。',
      详细信息: '事件背景、经过、影响、可推进方向。', 剧情索引: '关联原著剧情索引 ID/标题。', 关联势力: '参与或受影响的势力ID。', 状态: '未触发/进行中/已结束/改变原著。',
    },
    势力: {
      势力ID: '与对象 key 相同，便于解析。', 名称: '显示名称。', 类型: '国家/组织/种族/个人。', 属性: '固化 key:value 属性表。',
      关系网: 'key=目标势力ID，value=关系值(-100到100)。', 当前目标: '当前主要行动意图。', 近期决策: '最近几个时间步的决策记录。', 状态: '正常/危机/扩张/衰退。',
    },
  };

  save.migrate = function migrate() {
    baseMigrate();
    this.db.run(`
      CREATE TABLE IF NOT EXISTS worldline_state(world_tag TEXT PRIMARY KEY, worldline_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS worldline_events(world_tag TEXT NOT NULL, event_id TEXT NOT NULL, event_json TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(world_tag,event_id));
      CREATE TABLE IF NOT EXISTS worldline_factions(world_tag TEXT NOT NULL, faction_id TEXT NOT NULL, faction_json TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(world_tag,faction_id));
    `);
    this.db.run('INSERT OR REPLACE INTO metadata(key,value) VALUES (?,?)', ['worldline_field_docs', JSON.stringify(this.worldlineFieldDocs)]);
  };

  save.getWorldline = function getWorldline(worldTag) {
    if (!this.db) return null;
    const stmt = this.db.prepare('SELECT worldline_json FROM worldline_state WHERE world_tag=?');
    stmt.bind([worldTag]);
    const row = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    return row ? JSON.parse(row.worldline_json) : null;
  };

  save.listWorldlineEvents = function listWorldlineEvents(worldTag = '') {
    if (!this.db) return [];
    const sql = worldTag
      ? 'SELECT event_json FROM worldline_events WHERE world_tag=? ORDER BY updated_at'
      : 'SELECT event_json FROM worldline_events ORDER BY updated_at';
    const stmt = this.db.prepare(sql);
    if (worldTag) stmt.bind([worldTag]);
    const events = [];
    while (stmt.step()) events.push(JSON.parse(stmt.getAsObject().event_json));
    stmt.free();
    return events;
  };

  save.saveWorldline = async function saveWorldline(worldTag, worldline) {
    if (!this.db || !worldline) return;
    const now = new Date().toISOString();
    const worldlineJson = JSON.stringify(worldline);
    const oldJson = this.getJson('SELECT worldline_json FROM worldline_state WHERE world_tag=?', [worldTag]);
    if (JSON.stringify(oldJson) === worldlineJson) return;
    this.db.run(
      'INSERT OR REPLACE INTO worldline_state(world_tag,worldline_json,created_at,updated_at) VALUES (?,?,COALESCE((SELECT created_at FROM worldline_state WHERE world_tag=?),?),?)',
      [worldTag, worldlineJson, worldTag, now, now],
    );
    const eventIds = [];
    for (const event of worldline.events || []) {
      const id = event.eventId || event.事件ID || event.id;
      if (id) {
        eventIds.push(id);
        this.db.run('INSERT OR REPLACE INTO worldline_events(world_tag,event_id,event_json,updated_at) VALUES (?,?,?,?)', [worldTag, id, JSON.stringify(event), now]);
      }
    }
    this.pruneWorldlineRows('worldline_events', 'event_id', worldTag, eventIds);
    const factionIds = Object.keys(worldline.factions || {});
    for (const [id, faction] of Object.entries(worldline.factions || {})) {
      this.db.run('INSERT OR REPLACE INTO worldline_factions(world_tag,faction_id,faction_json,updated_at) VALUES (?,?,?,?)', [worldTag, id, JSON.stringify(faction), now]);
    }
    this.pruneWorldlineRows('worldline_factions', 'faction_id', worldTag, factionIds);
    await this.persist();
  };

  save.pruneWorldlineRows = function pruneWorldlineRows(table, column, worldTag, ids) {
    if (!ids.length) {
      this.db.run(`DELETE FROM ${table} WHERE world_tag=?`, [worldTag]);
      return;
    }
    const marks = ids.map(() => '?').join(',');
    this.db.run(`DELETE FROM ${table} WHERE world_tag=? AND ${column} NOT IN (${marks})`, [worldTag, ...ids]);
  };

  save.saveWorldLore = async function saveWorldLore(worldTag, lore) {
    await baseSaveWorldLore(worldTag, lore);
    if (lore?.worldline) await this.saveWorldline(worldTag, lore.worldline);
  };
})();
