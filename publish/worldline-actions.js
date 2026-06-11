/**
 * 图书馆世界线展示辅助。
 */
window.GameModules = window.GameModules || {};

window.GameModules.worldlineActions = {
  loreWorldline(lore) {
    return lore?.worldline || window.GameModules.sqliteSave.getWorldline?.(lore?.worldTag) || null;
  },

  worldlineEvents(lore) {
    return this.timelineItems(lore).filter((item) => item.kind === 'event');
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
