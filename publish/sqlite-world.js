/**
 * SQLite 世界属性与角色-世界关联扩展。
 */
window.GameModules = window.GameModules || {};
Object.assign(window.GameModules.sqliteSave, {
  getWorldAttributes(worldTag) {
    return this.db ? this.getJson('SELECT attrs_json FROM world_attributes WHERE world_tag=?', [worldTag]) : null;
  },

  async saveWorldAttributes(worldTag, attrs) {
    const now = new Date().toISOString();
    this.db.run(
      'INSERT OR REPLACE INTO world_attributes(world_tag,attrs_json,source,created_at,updated_at) VALUES (?,?,?,COALESCE((SELECT created_at FROM world_attributes WHERE world_tag=?),?),?)',
      [worldTag, JSON.stringify(attrs), attrs.source || 'runtime', worldTag, now, now],
    );
    await this.persist();
  },

  getCharacterWorld(characterId) {
    if (!this.db) return null;
    const stmt = this.db.prepare('SELECT world_tag FROM character_world WHERE character_id=?');
    stmt.bind([characterId]);
    const row = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    return row?.world_tag || null;
  },

  async saveCharacterWorld(characterId, worldTag) {
    this.db.run('INSERT OR REPLACE INTO character_world(character_id,world_tag,updated_at) VALUES (?,?,?)', [characterId, worldTag, new Date().toISOString()]);
    await this.persist();
  },
});
