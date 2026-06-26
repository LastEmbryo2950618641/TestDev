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

  realWorldSummarizedPlots() {
    return this.realWorldline().plots || [];
  },

  selectRealWorldPlot(plotId) {
    this.selectedRealWorldPlotId = plotId || '';
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
    return (this.realWorldline().events || []).filter((event) => (event.plotId || event.summary) === id || recordIds.includes(event.eventId));
  },

  realWorldRecordingEvents() {
    const ids = this.realWorldline().pendingPlot?.recordIds || [];
    if (!ids.length) return [];
    return (this.realWorldline().events || []).filter((event) => ids.includes(event.eventId));
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
    const shouldRecordConnection = !line.events?.length || /按下连接按钮|玩家上线连接|附身到|进入异世界|操控连接/u.test(String(context || ''));
    if (shouldRecordConnection) {
      const event = this.connectionWorldlineEvent(line, context);
      if (!(line.events || []).some((item) => item.eventId === event.eventId)) {
        line.events = [...(line.events || []), event];
        await window.GameModules.worldlinePlots.assign(this, line, event);
        lore.worldline = line;
        await window.GameModules.sqliteSave.saveWorldLore(worldTag, lore);
      }
    }
    if (!this.expandedWorldlineTag) this.expandedWorldlineTag = worldTag;
    return lore;
  },

  connectionWorldlineEvent(line = {}, context = '') {
    const eventId = `connection_${this.worldlineSafeId(this.character?.id || this.character?.name || 'character')}_${this.worldlineSafeId(this.entryTimeLabel?.() || this.sceneTitle || 'time')}_${this.turn || 1}`.slice(0, 120);
    return {
      eventId,
      name: '玩家上线连接',
      time: this.entryTimeLabel?.() || this.sceneTitle || '当前时间',
      detail: [
        `玩家：${this.playerName || this.playerProfile?.name || '玩家'}`,
        `操控对象：${this.character?.name || '未知角色'}｜作品：${this.character?.work || '原创世界'}｜模式：${this.online ? 'online' : 'offline'}｜${this.controlMode || 'possess'}`,
        `进入上下文：${String(context || this.entryCurrentAction || '玩家连接角色，世界线开始记录偏移。')}`,
      ].join('\n'),
      storyIndexes: line.storyIndexes || ['默认剧情起点'],
      factionIds: Object.keys(line.factions || {}).slice(0, 2),
      status: '进行中',
    };
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
    const time = this.worldlineSafeId(this.entryTimeLabel?.() || this.sceneTitle || 'time').slice(0, 40) || 'time';
    const name = this.worldlineSafeId(this.character?.id || this.character?.name || 'character').slice(0, 24) || 'character';
    const title = this.worldlineSafeId(result.sceneTitle || this.sceneTitle || 'scene').slice(0, 24) || 'scene';
    return `turn_${name}_${time}_${title}_${this.turn || 1}`.slice(0, 120);
  },

  worldlineSafeId(value = '') {
    return String(value || '').replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '');
  },

  worldlineTurnDetail(result = {}) {
    return [
      `玩家：${this.playerName || this.playerProfile?.name || '玩家'}`,
      `操控对象：${this.character?.name || '未知角色'}｜作品：${this.character?.work || '原创世界'}｜模式：${this.online ? 'online' : 'offline'}｜${this.controlMode || 'possess'}`,
      `玩家行动：${this.lastAction || this.entryCurrentAction || ''}`,
      `正文：${String(result.narration || '')}`,
      result.mind ? `被操控者心理：${result.mind}` : '',
      result.quest ? `结果目标：${result.quest}` : '',
    ].filter(Boolean).join('\n');
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
