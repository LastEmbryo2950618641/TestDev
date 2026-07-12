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
  timelineItems: 'timelineItems',
  worldlineEventsNewestFirst: 'worldlineEventsNewestFirst',
  realWorldSummarizedPlots: 'summarizedPlots',
  selectRealWorldPlot: 'selectRealWorldPlot',
  realWorldSelectedPlot: 'selectedPlot',
  realWorldPlotEvents: 'selectedPlotEvents',
  realWorldRecordingEvents: 'recordingEvents',
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

  worldlinePlots(lore) {
    return callWorldlineQueryService('worldlinePlots', this, lore);
  },

  connectionWorldlineEvent(line = {}, context = '') {
    return callWorldlineFormatHelper('connectionWorldlineEvent', this, line, context);
  },

  async updateWorldlineFromTurn(result = {}) {
    return callWorldlineStateService('updateWorldlineFromTurn', this, result);
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

  timelineMeta(item) {
    return window.GameModules.ui.worldline.timelinePanelViewHelpers.timelineMeta.call(this, item);
  },
};
Object.entries(worldlineViewHelperForwarders).forEach(([name, helperName]) => {
  window.GameModules.worldlineActions[name] = function worldlineViewHelperFacade(...args) {
    return callWorldlineViewHelper(helperName, this, ...args);
  };
});
