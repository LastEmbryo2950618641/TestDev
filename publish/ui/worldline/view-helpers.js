window.GameModules = window.GameModules || {};
window.GameModules.ui = window.GameModules.ui || {};
window.GameModules.ui.worldline = window.GameModules.ui.worldline || {};

window.GameModules.ui.worldline.viewHelpers = {
  selectDebugSection(name) {
    this.worldlineDebugSection = name || '世界线APP主面板';
  },

  isDebugSection(name) {
    return this.worldlineDebugSection === name;
  },

  toggleLore(lore) { return window.GameModules.ui.worldline.loreViewHelpers.toggleLore.call(this, lore); },

  isLoreOpen(lore) { return window.GameModules.ui.worldline.loreViewHelpers.isLoreOpen.call(this, lore); },

  controlLores() { return window.GameModules.ui.worldline.loreViewHelpers.controlLores.call(this); },

  realTag() { return window.GameModules.ui.worldline.loreViewHelpers.realTag.call(this); },

  realLore() { return window.GameModules.ui.worldline.loreViewHelpers.realLore.call(this); },

  worldlineEventsNewestFirst(events = []) { return window.GameModules.ui.worldline.timelineViewHelpers.worldlineEventsNewestFirst.call(this, events); },

  summarizedPlots() { return window.GameModules.ui.worldline.plotViewHelpers.summarizedPlots.call(this); },

  selectRealWorldPlot(plotId) {
    this.selectedRealWorldPlotId = plotId || '';
  },

  selectedPlot() { return window.GameModules.ui.worldline.plotViewHelpers.selectedPlot.call(this); },

  selectedPlotEvents(plot = null) { return window.GameModules.ui.worldline.plotViewHelpers.selectedPlotEvents.call(this, plot); },

  recordingEvents() { return window.GameModules.ui.worldline.plotViewHelpers.recordingEvents.call(this); },

  timelineRow(item = {}) { return window.GameModules.ui.worldline.timelinePanelViewHelpers.timelineRow.call(this, item); },

  realWorldTimelineRow(item = {}) { return window.GameModules.ui.worldline.timelinePanelViewHelpers.realWorldTimelineRow.call(this, item); },

  loreTimelinePanelView(lore = null) { return window.GameModules.ui.worldline.timelinePanelViewHelpers.loreTimelinePanelView.call(this, lore); },

  realWorldTimelinePanelView() { return window.GameModules.ui.worldline.timelinePanelViewHelpers.realWorldTimelinePanelView.call(this); },
};
