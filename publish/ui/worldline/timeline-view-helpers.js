window.GameModules = window.GameModules || {};
window.GameModules.ui = window.GameModules.ui || {};
window.GameModules.ui.worldline = window.GameModules.ui.worldline || {};

window.GameModules.ui.worldline.timelineViewHelpers = {
  timelineItems(lore) {
    const worldline = this.loreWorldline(lore) || {};
    const events = this.worldlineEventsNewestFirst(worldline.events || []).map((event, index) => ({ ...event, kind: 'event', order: index }));
    const indexes = (worldline.storyIndexes || []).map((text, index) => ({ kind: 'story', order: events.length + index, time: '原著剧情', name: `剧情索引 ${index + 1}`, summary: text }));
    return [...events, ...indexes];
  },

  worldlineEventsNewestFirst(events = []) {
    return (Array.isArray(events) ? events : []).map((event, index) => ({ ...event, order: index })).sort((a, b) => String(b.time || '').localeCompare(String(a.time || '')) || b.order - a.order);
  },
};
