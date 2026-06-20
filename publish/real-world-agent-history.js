window.GameModules = window.GameModules || {};

Object.assign(window.GameModules.realWorldAgentContext, {
  history(store, method, params = {}) {
    const keyword = String(params.keyword || '').trim();
    if (method === 'getWorldlinePending') return this.worldlinePending(store);
    if (method === 'listWorldlinePlots') return this.worldlinePlots(store);
    if (method === 'getWorldlinePlotRecords') return this.worldlinePlotRecords(store, params);
    const rows = this.allRealWorldRows(store);
    const picked = method === 'searchRealWorldLog' && keyword
      ? rows.filter((entry) => `${entry.text || ''} ${entry.narration || ''} ${entry.locationName || ''}`.includes(keyword)).slice(-8)
      : rows.slice(-5);
    return picked.map((entry) => entry.type === 'user'
      ? `玩家：${entry.text}`
      : `现实：${entry.locationName || '未知地点'}｜${this.limit(entry.narration || '', 320)}`).join('\n') || '未命中现实记录。';
  },

  allRealWorldRows(store) {
    const total = window.GameModules.sqliteSave.countRealWorldLogEntries?.() || 0;
    if (total) return window.GameModules.sqliteSave.listRealWorldLogEntries?.(1, Math.min(total, 200)) || [];
    return (store.realWorldLog || []).filter((entry) => entry.type !== 'system');
  },

  worldlinePending(store) {
    const line = store.realWorldline?.() || {};
    const ids = line.pendingPlot?.recordIds || [];
    if (!ids.length) return '暂无正在记录的现实时间线。';
    return this.eventsByIds(line, ids).map((event) => this.eventLine(event)).join('\n') || '正在记录时间线没有命中具体记录。';
  },

  worldlinePlots(store) {
    const line = store.realWorldline?.() || {};
    return (line.plots || [])
      .map((plot) => `${plot.情节编号 || '未编号'}｜${plot.情节名称 || plot.摘要 || '未命名'}｜${plot.重要记录编号 || ''}`)
      .join('\n') || '暂无已归纳情节。';
  },

  worldlinePlotRecords(store, params = {}) {
    const line = store.realWorldline?.() || {};
    const plotId = String(params.plotId || params.id || params.keyword || '').trim();
    const plot = (line.plots || []).find((item) => String(item.情节编号 || item.id || '').includes(plotId)
      || String(item.情节名称 || item.摘要 || '').includes(plotId));
    if (!plot) return '未命中已归纳情节。';
    const ids = String(plot.重要记录编号 || '').split(/[、,，\s]+/).filter(Boolean);
    const events = this.eventsByIds(line, ids);
    return [
      `情节：${plot.情节编号 || ''}｜${plot.情节名称 || plot.摘要 || ''}`,
      `摘要：${plot.摘要 || plot.情节摘要 || ''}`,
      `关联记录：\n${events.map((event) => this.eventLine(event)).join('\n') || '无关联记录命中。'}`,
    ].join('\n');
  },

  eventsByIds(line = {}, ids = []) {
    const set = new Set(ids);
    return (line.events || []).filter((event) => set.has(event.eventId) || set.has(event.id));
  },

  eventLine(event = {}) {
    return `${event.eventId || event.id || '未知记录'}｜${event.time || ''}｜${event.name || '现实事件'}｜${this.limit(event.detail || event.summary || '', 360)}`;
  },
});
