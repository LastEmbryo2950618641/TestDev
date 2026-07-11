/**
 * 图书馆世界线展示辅助。
 */
window.GameModules = window.GameModules || {};

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

  selectWorldlineDebugSection(name) {
    return window.GameModules.ui.worldline.viewHelpers.selectDebugSection.call(this, name);
  },

  isWorldlineDebugSection(name) {
    return window.GameModules.ui.worldline.viewHelpers.isDebugSection.call(this, name);
  },

  toggleWorldline(lore) {
    return window.GameModules.ui.worldline.viewHelpers.toggleLore.call(this, lore);
  },

  isWorldlineOpen(lore) {
    return window.GameModules.ui.worldline.viewHelpers.isLoreOpen.call(this, lore);
  },

  controlWorldLores() {
    return window.GameModules.ui.worldline.viewHelpers.controlLores.call(this);
  },

  realWorldTag() {
    return window.GameModules.ui.worldline.viewHelpers.realTag.call(this);
  },

  realWorldLore() {
    return window.GameModules.ui.worldline.viewHelpers.realLore.call(this);
  },

  realWorldline() {
    const state = this.realWorldlineState || { events: [], plots: [], pendingPlot: null };
    const logEvents = (this.realWorldLog || []).filter((entry) => entry.type === 'ai' || entry.type === 'system').map((entry, index) => ({
      eventId: 'real_' + (entry.id || index),
      name: entry.sceneTitle || entry.locationName || this.realWorldSceneTitle || '现实事件',
      time: entry.time?.label || entry.createdAt || ((this.phoneDateText?.() || '') + ' ' + (this.phoneTimeText?.() || '')).trim(),
      summary: entry.plotId || '未分配情节',
      plotId: entry.plotId || '',
      detail: String(entry.narration || entry.thinking || entry.text || ''),
      status: entry.streaming ? '记录中' : '已记录',
      kind: 'event',
    }));
    const byId = new Map([...(state.events || []), ...logEvents].map((event) => [event.eventId, { ...event, kind: 'event' }]));
    const events = [...byId.values()];
    return {
      timeRange: (this.phoneDateText?.() || '现实时间') + ' - 现在',
      events,
      plots: state.plots || [],
      pendingPlot: state.pendingPlot || null,
      storyIndexes: ['现实世界独立记录，不并入被操控世界线'],
      factions: {},
    };
  },

  loreWorldline(lore) {
    if (!lore?.worldTag) return null;
    if (!lore.worldline) lore.worldline = window.GameModules.sqliteSave.getWorldline?.(lore.worldTag) || null;
    return lore.worldline;
  },

  timelineItems(lore) {
    return window.GameModules.ui.worldline.viewHelpers.timelineItems.call(this, lore);
  },

  worldlineEventsNewestFirst(events = []) {
    return window.GameModules.ui.worldline.viewHelpers.worldlineEventsNewestFirst.call(this, events);
  },

  worldlinePlots(lore) {
    return window.GameModules.worldlinePlots.items(this.loreWorldline(lore) || {});
  },

  realWorldSummarizedPlots() {
    return window.GameModules.ui.worldline.viewHelpers.summarizedPlots.call(this);
  },

  selectRealWorldPlot(plotId) {
    return window.GameModules.ui.worldline.viewHelpers.selectRealWorldPlot.call(this, plotId);
  },

  realWorldSelectedPlot() {
    return window.GameModules.ui.worldline.viewHelpers.selectedPlot.call(this);
  },

  realWorldPlotEvents(plot = null) {
    return window.GameModules.ui.worldline.viewHelpers.selectedPlotEvents.call(this, plot);
  },

  realWorldRecordingEvents() {
    return window.GameModules.ui.worldline.viewHelpers.recordingEvents.call(this);
  },

  timelineMeta(item) {
    return window.GameModules.ui.worldline.viewHelpers.timelineMeta.call(this, item);
  },

  connectionWorldlineEvent(line = {}, context = '') {
    return window.GameModules.domain.worldline.formatHelpers.connectionWorldlineEvent.call(this, line, context);
  },

  async updateWorldlineFromTurn(result = {}) {
    const worldTag = this.character?.work || '原创世界';
    const lore = await this.ensureWorldline(`${this.entryTimeLabel?.() || this.sceneTitle} ${result.narration || ''}`);
    const line = this.loreWorldline(lore);
    if (!line) return;
    const eventId = this.worldlineTurnEventId(result);
    if (!(line.events || []).some((event) => event.eventId === eventId)) {
      const event = { eventId, name: result.sceneTitle || this.sceneTitle, time: this.entryTimeLabel?.() || this.sceneTitle, detail: this.worldlineTurnDetail(result), storyIndexes: line.storyIndexes || [], factionIds: Object.keys(line.factions || {}).slice(0, 2), status: '进行中' };
      line.events = [...(line.events || []), event];
      await this.appendWorldlineEvent(line, event);
      lore.worldline = line;
      await window.GameModules.sqliteSave.saveWorldLore(worldTag, lore);
    }
  },

  worldlineTurnEventId(result = {}) {
    return window.GameModules.domain.worldline.formatHelpers.worldlineTurnEventId.call(this, result);
  },

  worldlineSafeId(value = '') {
    return window.GameModules.domain.worldline.formatHelpers.worldlineSafeId.call(this, value);
  },

  worldlineTurnDetail(result = {}) {
    return window.GameModules.domain.worldline.formatHelpers.worldlineTurnDetail.call(this, result);
  },

  async appendWorldlineEvent(line, event, prefix = '情节') {
    await window.GameModules.worldlinePlots.assign(this, line, event, prefix);
  },

  worldlineFactions(lore) {
    const factions = this.loreWorldline(lore)?.factions || {};
    return Object.entries(factions).map(([id, value]) => ({ id, ...value }));
  },

  factionAttrs(faction) {
    return window.GameModules.domain.worldline.formatHelpers.factionAttrs.call(this, faction);
  },

  factionRelations(faction) {
    return window.GameModules.domain.worldline.formatHelpers.factionRelations.call(this, faction);
  },
};