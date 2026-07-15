/**
 * 图书馆世界线展示辅助。
 */
window.GameModules = window.GameModules || {};

const worldlineViewHelperForwarders = {
  selectWorldlineDebugSection: 'selectDebugSection',
  isWorldlineDebugSection: 'isDebugSection',
  toggleWorldline: 'toggleLore',
  isWorldlineOpen: 'isLoreOpen',
  controlWorldLores: 'controlLores',
  realWorldTag: 'realTag',
  realWorldLore: 'realLore',
  worldlineEventsNewestFirst: 'worldlineEventsNewestFirst',
  selectRealWorldPlot: 'selectRealWorldPlot',
};

function callWorldlineViewHelper(name, context, ...args) {
  return window.GameModules.ui.worldline.viewHelpers[name].call(context, ...args);
}

function callWorldlineStateService(name, context, ...args) {
  return window.GameModules.domain.worldline.stateService[name].call(context, ...args);
}

function callWorldlineQueryService(name, context, ...args) {
  return window.GameModules.domain.worldline.queryService[name].call(context, ...args);
}

function callWorldlineFormatHelper(name, context, ...args) {
  return window.GameModules.domain.worldline.formatHelpers[name].call(context, ...args);
}

window.GameModules.worldlineActions = {
  openWorldlineApp() {
    this.closeDesktopApps?.();
    this.worldlineAppOpen = true;
    this.desktopUnlocked = true;
  },

  closeWorldlineApp() {
    this.worldlineAppOpen = false;
    this.closeAppToDesktop?.();
  },

  realWorldline() {
    return callWorldlineStateService('realWorldline', this);
  },

  loreWorldline(lore) {
    return callWorldlineStateService('loreWorldline', this, lore);
  },

  timelineItems(lore) {
    const worldline = this.loreWorldline(lore) || {};
    const events = this.worldlineEventsNewestFirst(worldline.events || []).map((event, index) => ({ ...event, kind: 'event', order: index }));
    const indexes = (worldline.storyIndexes || []).map((text, index) => ({ kind: 'story', order: events.length + index, time: '原著剧情', name: `剧情索引 ${index + 1}`, summary: text }));
    return [...events, ...indexes];
  },

  worldlinePlots(lore) {
    return callWorldlineQueryService('worldlinePlots', this, lore);
  },

  realWorldSummarizedPlots() {
    return this.realWorldline().plots || [];
  },

  realWorldSelectedPlot() {
    const plots = this.realWorldSummarizedPlots();
    return plots.find((plot) => plot.情节编号 === this.selectedRealWorldPlotId) || plots[0] || null;
  },

  realWorldPlotEvents(plot = null) {
    const selected = plot || this.realWorldSelectedPlot();
    const id = selected?.情节编号 || '';
    if (!id) return [];
    const recordIds = String(selected?.重要记录编号 || '').split(/[、,，\s]+/).filter(Boolean);
    return this.worldlineEventsNewestFirst(this.realWorldline().events || []).filter((event) => (event.plotId || event.summary) === id || recordIds.includes(event.eventId));
  },

  realWorldRecordingEvents() {
    const ids = this.realWorldline().pendingPlot?.recordIds || [];
    if (!ids.length) return [];
    return this.worldlineEventsNewestFirst(this.realWorldline().events || []).filter((event) => ids.includes(event.eventId));
  },

  timelineMeta(item) {
    const parts = [];
    if (item.status) parts.push(item.status);
    if (item.kind === 'event' && (item.plotId || item.summary)) parts.push(`情节:${item.plotId || item.summary}`);
    if (item.storyIndexes?.length) parts.push(`剧情:${item.storyIndexes.join('、')}`);
    if (item.factionIds?.length) parts.push(`势力:${item.factionIds.join('、')}`);
    return parts.join('｜') || (item.kind === 'story' ? '原著剧情索引' : '世界线事件');
  },

  connectionWorldlineEvent(line = {}, context = '') {
    return callWorldlineFormatHelper('connectionWorldlineEvent', this, line, context);
  },

  async updateWorldlineFromTurn(result = {}) {
    return callWorldlineStateService('updateWorldlineFromTurn', this, result);
  },

  async ensureWorldline(context = '') {
    const worldTag = this.character?.work || this.selectedWork || '原创世界';
    return await window.GameModules.worldLore.ensure(worldTag, context);
  },

  worldlineTurnEventId(result = {}) {
    return callWorldlineFormatHelper('worldlineTurnEventId', this, result);
  },

  worldlineSafeId(value = '') {
    return callWorldlineFormatHelper('worldlineSafeId', this, value);
  },

  worldlineTurnDetail(result = {}) {
    return callWorldlineFormatHelper('worldlineTurnDetail', this, result);
  },

  async appendWorldlineEvent(line, event, prefix = '情节') {
    return callWorldlineStateService('appendWorldlineEvent', this, line, event, prefix);
  },

  worldlineFactions(lore) {
    return callWorldlineQueryService('worldlineFactions', this, lore);
  },

  factionAttrs(faction) {
    return callWorldlineFormatHelper('factionAttrs', this, faction);
  },

  factionRelations(faction) {
    return callWorldlineFormatHelper('factionRelations', this, faction);
  },
};
Object.entries(worldlineViewHelperForwarders).forEach(([name, helperName]) => {
  window.GameModules.worldlineActions[name] = function worldlineViewHelperFacade(...args) {
    return callWorldlineViewHelper(helperName, this, ...args);
  };
});
