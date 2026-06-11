/**
 * 图书馆世界线展示辅助。
 */
window.GameModules = window.GameModules || {};

window.GameModules.worldlineActions = {
  toggleWorldline(lore) {
    if (!this.loreWorldline(lore)) return;
    const tag = lore?.worldTag || '';
    if (!tag) return;
    this.expandedWorldlineTag = this.expandedWorldlineTag === tag ? '' : tag;
  },

  isWorldlineOpen(lore) {
    return Boolean(lore?.worldTag && this.expandedWorldlineTag === lore.worldTag);
  },

  loreWorldline(lore) {
    if (!lore?.worldTag) return null;
    if (!lore.worldline) lore.worldline = window.GameModules.sqliteSave.getWorldline?.(lore.worldTag) || null;
    return lore.worldline;
  },

  timelineItems(lore) {
    const worldline = this.loreWorldline(lore) || {};
    const events = (worldline.events || []).map((event, index) => ({ ...event, kind: 'event', order: index }));
    const indexes = (worldline.storyIndexes || []).map((text, index) => ({ kind: 'story', order: events.length + index, time: '原著剧情', name: `剧情索引 ${index + 1}`, summary: text }));
    return [...events, ...indexes].sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')) || a.order - b.order);
  },

  timelineMeta(item) {
    const parts = [];
    if (item.status) parts.push(item.status);
    if (item.storyIndexes?.length) parts.push(`剧情:${item.storyIndexes.join('、')}`);
    if (item.factionIds?.length) parts.push(`势力:${item.factionIds.join('、')}`);
    return parts.join('｜') || (item.kind === 'story' ? '原著剧情索引' : '世界线事件');
  },

  async ensureWorldline(context = '') {
    const worldTag = this.character?.work || '原创世界';
    const lore = await window.GameModules.worldLore.ensure(worldTag, context || this.entryCurrentAction || this.sceneTitle);
    const line = this.loreWorldline(lore) || window.GameModules.worldLore.worldline(null, lore, worldTag);
    if (!line.events?.length) {
      line.events = [{ eventId: 'connection_start', name: '玩家上线连接', time: this.entryTimeLabel?.() || this.sceneTitle || '当前时间', summary: String(context || this.entryCurrentAction || '玩家接入当前世界线。').slice(0, 90), detail: String(context || this.entryCurrentAction || '玩家首次连接角色，世界线开始记录偏移。').slice(0, 420), storyIndexes: line.storyIndexes || ['默认剧情起点'], factionIds: Object.keys(line.factions || {}).slice(0, 2), status: '进行中' }];
      lore.worldline = line;
      await window.GameModules.sqliteSave.saveWorldLore(worldTag, lore);
    }
    if (!this.expandedWorldlineTag) this.expandedWorldlineTag = worldTag;
    return lore;
  },

  async updateWorldlineFromTurn(result = {}) {
    const worldTag = this.character?.work || '原创世界';
    const lore = await this.ensureWorldline(`${this.entryTimeLabel?.() || this.sceneTitle} ${result.narration || ''}`);
    const line = this.loreWorldline(lore);
    if (!line) return;
    const eventId = `turn_${this.turn}`;
    if (!(line.events || []).some((event) => event.eventId === eventId)) {
      line.events = [...(line.events || []), { eventId, name: result.sceneTitle || this.sceneTitle, time: this.entryTimeLabel?.() || this.sceneTitle, summary: String(result.narration || this.lastAction || '').slice(0, 90), detail: String(result.narration || '').slice(0, 420), storyIndexes: line.storyIndexes || [], factionIds: Object.keys(line.factions || {}).slice(0, 2), status: '进行中' }].slice(-12);
      lore.worldline = line;
      await window.GameModules.sqliteSave.saveWorldLore(worldTag, lore);
    }
  },

  worldlineFactions(lore) {
    const factions = this.loreWorldline(lore)?.factions || {};
    return Object.entries(factions).map(([id, value]) => ({ id, ...value }));
  },

  factionAttrs(faction) {
    return Object.entries(faction?.属性 || {}).map(([key, value]) => `${key}:${value}`).join('；') || '无';
  },

  factionRelations(faction) {
    return Object.entries(faction?.关系网 || {}).map(([key, value]) => `${key}:${value}`).join('；') || '无';
  },
};
