window.GameModules = window.GameModules || {};
window.GameModules.domain = window.GameModules.domain || {};
window.GameModules.domain.worldline = window.GameModules.domain.worldline || {};

window.GameModules.domain.worldline.stateService = {
  realWorldlineLogEvents() {
    return (this.realWorldLog || [])
      .filter((entry) => entry.type === 'ai' || entry.type === 'system')
      .map((entry, index) => ({
        eventId: 'real_' + (entry.id || index),
        name: entry.sceneTitle || entry.locationName || this.realWorldSceneTitle || '现实事件',
        time: entry.time?.label || entry.createdAt || ((this.phoneDateText?.() || '') + ' ' + (this.phoneTimeText?.() || '')).trim(),
        summary: entry.plotId || '未分配情节',
        plotId: entry.plotId || '',
        detail: String(entry.narration || entry.thinking || entry.text || ''),
        status: entry.streaming ? '记录中' : '已记录',
        kind: 'event',
      }));
  },

  realWorldlineMergedEvents(state = this.realWorldlineState || { events: [] }, logEvents = this.realWorldlineLogEvents()) {
    const byId = new Map([...(state.events || []), ...logEvents].map((event) => [event.eventId, { ...event, kind: 'event' }]));
    return [...byId.values()];
  },

  realWorldlineTimeRange() {
    return (this.phoneDateText?.() || '现实时间') + ' - 现在';
  },

  realWorldline() {
    const state = this.realWorldlineState || { events: [], plots: [], pendingPlot: null };
    const logEvents = this.realWorldlineLogEvents();
    const events = this.realWorldlineMergedEvents(state, logEvents);
    return {
      timeRange: this.realWorldlineTimeRange(),
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

  async appendWorldlineEvent(line, event, prefix = '情节') {
    await window.GameModules.worldlinePlots.assign(this, line, event, prefix);
  },

  async updateWorldlineFromTurn(result = {}) {
    const worldTag = this.character?.work || '原创世界';
    const lore = await this.ensureWorldline(`${this.entryTimeLabel?.() || this.sceneTitle} ${result.narration || ''}`);
    const line = this.loreWorldline(lore);
    if (!line) return;
    const eventId = this.worldlineTurnEventId(result);
    if (!(line.events || []).some((event) => event.eventId === eventId)) {
      const event = {
        eventId,
        name: result.sceneTitle || this.sceneTitle,
        time: this.entryTimeLabel?.() || this.sceneTitle,
        detail: this.worldlineTurnDetail(result),
        storyIndexes: line.storyIndexes || [],
        factionIds: Object.keys(line.factions || {}).slice(0, 2),
        status: '进行中',
      };
      line.events = [...(line.events || []), event];
      await this.appendWorldlineEvent(line, event);
      lore.worldline = line;
      await window.GameModules.worldLoreStore?.save?.(worldTag, lore);
    }
  },
};
