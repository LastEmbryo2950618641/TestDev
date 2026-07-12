window.GameModules = window.GameModules || {};
window.GameModules.ui = window.GameModules.ui || {};
window.GameModules.ui.worldline = window.GameModules.ui.worldline || {};

window.GameModules.ui.worldline.timelineViewHelpers = {
  worldlineEventsNewestFirst(events = []) {
    return (Array.isArray(events) ? events : []).map((event, index) => ({ ...event, order: index })).sort((a, b) => String(b.time || '').localeCompare(String(a.time || '')) || b.order - a.order);
  },
};
