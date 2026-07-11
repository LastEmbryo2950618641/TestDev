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
  timelineMeta: 'timelineMeta',
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
    return callWorldlineQueryService('connectionWorldlineEvent', this, line, context);
  },

  async updateWorldlineFromTurn(result = {}) {
    return callWorldlineStateService('updateWorldlineFromTurn', this, result);
  },

  worldlineTurnEventId(result = {}) {
    return callWorldlineQueryService('worldlineTurnEventId', this, result);
  },

  worldlineSafeId(value = '') {
    return callWorldlineQueryService('worldlineSafeId', this, value);
  },

  worldlineTurnDetail(result = {}) {
    return callWorldlineQueryService('worldlineTurnDetail', this, result);
  },

  async appendWorldlineEvent(line, event, prefix = '情节') {
    return callWorldlineStateService('appendWorldlineEvent', this, line, event, prefix);
  },

  worldlineFactions(lore) {
    return callWorldlineQueryService('worldlineFactions', this, lore);
  },

  factionAttrs(faction) {
    return callWorldlineQueryService('factionAttrs', this, faction);
  },

  factionRelations(faction) {
    return callWorldlineQueryService('factionRelations', this, faction);
  },
};
Object.entries(worldlineViewHelperForwarders).forEach(([name, helperName]) => {
  window.GameModules.worldlineActions[name] = function worldlineViewHelperFacade(...args) {
    return callWorldlineViewHelper(helperName, this, ...args);
  };
});
