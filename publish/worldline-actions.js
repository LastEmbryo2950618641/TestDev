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
    this.worldlineDebugSection = name || '世界线APP主面板';
  },

  isWorldlineDebugSection(name) {
    return this.worldlineDebugSection === name;
  },

  toggleWorldline(lore) {
    if (!this.loreWorldline(lore)) return;
    const tag = lore?.worldTag || '';
    if (!tag) return;
    this.expandedWorldlineTag = this.expandedWorldlineTag === tag ? '' : tag;
  },

  isWorldlineOpen(lore) {
    return Boolean(lore?.worldTag && this.expandedWorldlineTag === lore.worldTag);
  },

  controlWorldLores() {
    const realTag = this.realWorldTag();
    return (this.savedWorldLores || []).filter((lore) => lore.worldTag !== realTag);
  },

  realWorldTag() {
    return window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';
  },

  realWorldLore() {
    const tag = this.realWorldTag();
    const saved = (this.savedWorldLores || []).find((lore) => lore.worldTag === tag) || {};
    return { worldTag: tag, background: saved.background || this.playerProfile?.worldbuildingNote || '玩家所在的现代都市现实世界。', factions: saved.factions || [], specialJobs: saved.specialJobs || [], jobRanks: saved.jobRanks || [], specialFields: saved.specialFields || [], worldline: this.realWorldline() };
  },

  realWorldline() {
    const state = this.realWorldlineState || { events: [], plots: [], pendingPlot: null };
    const logEvents = (this.realWorldLog || []).filter((entry) => entry.type === 'ai' || entry.type === 'system').map((entry, index) => ({
      eventId: `real_${entry.id || index}`, name: entry.sceneTitle || entry.locationName || this.realWorldSceneTitle || '现实事件', time: entry.time?.label || entry.createdAt || `${this.phoneDateText?.() || ''} ${this.phoneTimeText?.() || ''}`.trim(), summary: entry.plotId || '未分配情节', plotId: entry.plotId || '', detail: String(entry.narration || entry.thinking || entry.text || ''), status: entry.streaming ? '记录中' : '已记录', kind: 'event',
    }));
    const byId = new Map([...(state.events || []), ...logEvents].map((event) => [event.eventId, { ...event, kind: 'event' }]));
    const events = [...byId.values()];
    return { timeRange: `${this.phoneDateText?.() || '现实时间'} - 现在`, events, plots: state.plots || [], pendingPlot: state.pendingPlot || null, storyIndexes: ['现实世界独立记录，不并入被操控世界线'], factions: {} };
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

  worldlinePlots(lore) {
    return window.GameModules.worldlinePlots.items(this.loreWorldline(lore) || {});
  },

  timelineMeta(item) {
    const parts = [];
    if (item.status) parts.push(item.status);
    if (item.kind === 'event' && (item.plotId || item.summary)) parts.push(`情节:${item.plotId || item.summary}`);
    if (item.storyIndexes?.length) parts.push(`剧情:${item.storyIndexes.join('、')}`);
    if (item.factionIds?.length) parts.push(`势力:${item.factionIds.join('、')}`);
    return parts.join('｜') || (item.kind === 'story' ? '原著剧情索引' : '世界线事件');
  },

  async ensureWorldline(context = '') {
    const worldTag = this.character?.work || '原创世界';
    const lore = await window.GameModules.worldLore.ensure(worldTag, context || this.entryCurrentAction || this.sceneTitle);
    const line = this.loreWorldline(lore) || window.GameModules.worldLore.worldline(null, lore, worldTag);
    if (!line.events?.length) {
      const event = { eventId: 'connection_start', name: '玩家上线连接', time: this.entryTimeLabel?.() || this.sceneTitle || '当前时间', detail: String(context || this.entryCurrentAction || '玩家首次连接角色，世界线开始记录偏移。'), storyIndexes: line.storyIndexes || ['默认剧情起点'], factionIds: Object.keys(line.factions || {}).slice(0, 2), status: '进行中' };
      line.events = [event];
      await window.GameModules.worldlinePlots.assign(this, line, event);
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
      const event = { eventId, name: result.sceneTitle || this.sceneTitle, time: this.entryTimeLabel?.() || this.sceneTitle, detail: String(result.narration || ''), storyIndexes: line.storyIndexes || [], factionIds: Object.keys(line.factions || {}).slice(0, 2), status: '进行中' };
      line.events = [...(line.events || []), event].slice(-12);
      await this.appendWorldlineEvent(line, event);
      lore.worldline = line;
      await window.GameModules.sqliteSave.saveWorldLore(worldTag, lore);
    }
  },

  async appendWorldlineEvent(line, event, prefix = '情节') {
    await window.GameModules.worldlinePlots.assign(this, line, event, prefix);
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
