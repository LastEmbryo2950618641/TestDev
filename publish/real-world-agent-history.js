window.GameModules = window.GameModules || {};

Object.assign(window.GameModules.realWorldAgentContext, {
  history(store, method, params = {}) {
    const keyword = String(params.keyword || '').trim();
    if (method === 'getWorldlinePending') return this.worldlinePending(store);
    if (method === 'listWorldlineIndex') return this.worldlineIndex(store);
    if (method === 'searchWorldlineByKeyword') return this.searchWorldline(store, keyword, '关键词');
    if (method === 'searchWorldlineByTime') return this.searchWorldlineByTime(store, params);
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
    const total = window.GameModules.realWorldLogStore?.count?.() || 0;
    if (total) return window.GameModules.realWorldLogStore?.list?.(1, Math.min(total, 200)) || [];
    return (store.realWorldLog || []).filter((entry) => entry.type !== 'system');
  },

  worldlinePending(store) {
    const line = store.realWorldline?.() || {};
    const ids = line.pendingPlot?.recordIds || [];
    if (!ids.length) return '暂无正在记录的现实时间线。';
    return this.eventsByIds(line, ids).map((event) => this.eventLine(event)).join('\n') || '正在记录时间线没有命中具体记录。';
  },

  worldlineIndex(store) {
    const line = store.realWorldline?.() || {};
    const pending = line.pendingPlot ? `记录中｜${line.pendingPlot.startedAt || ''}-${line.pendingPlot.endedAt || ''}｜记录数:${(line.pendingPlot.recordIds || []).length}` : '记录中｜暂无';
    const plots = (line.plots || []).slice(-12).map((plot) => `情节｜${plot.情节编号 || plot.id || '未编号'}｜${plot.情节标题 || plot.情节名称 || plot.摘要 || '未命名'}｜${plot.情节时间段 || ''}｜记录:${plot.重要记录编号 || plot.recordIds || ''}`);
    const events = (line.events || []).slice(-12).map((event) => `事件｜${event.eventId || event.id || '未知'}｜${event.time || ''}｜${event.name || '现实事件'}｜情节:${event.plotId || event.summary || '未归纳'}｜${this.limit(event.detail || event.summary || '', 80)}`);
    return ['世界线清单', pending, ...plots, ...events].join('\n') || '暂无世界线资料。';
  },

  searchWorldline(store, query = '', label = '关键词') {
    const key = String(query || '').trim();
    if (!key) return this.worldlineIndex(store);
    const line = store.realWorldline?.() || {};
    const plots = (line.plots || []).filter((plot) => this.worldlinePlotText(plot).includes(key)).slice(-6);
    const events = (line.events || []).filter((event) => this.worldlineEventText(event).includes(key)).slice(-8);
    const plotText = plots.map((plot) => this.worldlinePlotDetail(line, plot)).join('\n\n');
    const eventText = events.map((event) => this.eventLine(event)).join('\n');
    return this.limit([`${label}查询：${key}`, plotText ? `命中情节：\n${plotText}` : '', eventText ? `命中事件：\n${eventText}` : ''].filter(Boolean).join('\n\n') || '未命中世界线资料。', 1800);
  },

  searchWorldlineByTime(store, params = {}) {
    const start = this.parseHistoryTime(params.startTime || params.start || params.minTime || params.from);
    const end = this.parseHistoryTime(params.endTime || params.end || params.maxTime || params.to);
    const keyword = String(params.keyword || '').trim();
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) return this.searchWorldline(store, String(params.time || params.keyword || '').trim(), '时间');
    const line = store.realWorldline?.() || {};
    const keywordHit = (text) => !keyword || text.includes(keyword);
    const inRange = (value) => {
      const at = this.parseHistoryTime(value);
      return Number.isFinite(at) && at >= start && at <= end;
    };
    const events = (line.events || []).filter((event) => inRange(event.time) && keywordHit(this.worldlineEventText(event))).slice(-8);
    const plots = (line.plots || []).filter((plot) => this.plotOverlapsRange(plot, start, end) && keywordHit(this.worldlinePlotText(plot))).slice(-6);
    const plotText = plots.map((plot) => this.worldlinePlotDetail(line, plot)).join('\n\n');
    const eventText = events.map((event) => this.eventLine(event)).join('\n');
    const title = `时间段查询：${params.startTime || params.start || ''} - ${params.endTime || params.end || ''}${keyword ? `｜关键词：${keyword}` : ''}`;
    return this.limit([title, plotText ? `命中情节：\n${plotText}` : '', eventText ? `命中事件：\n${eventText}` : '未命中该时间段世界线资料。'].filter(Boolean).join('\n\n'), 1800);
  },

  parseHistoryTime(value = '') {
    const text = String(value || '').trim();
    const match = text.match(/(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?(?:[ T]+(\d{1,2})[:：](\d{1,2})(?::(\d{1,2}))?)?/u);
    if (!match) return NaN;
    const [, y, m, d, hh = '0', mm = '0', ss = '0'] = match;
    return new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss)).getTime();
  },

  plotOverlapsRange(plot = {}, start, end) {
    const times = String(plot.情节时间段 || plot.timeRange || plot.time || '').match(/\d{4}[-/.年]\d{1,2}[-/.月]\d{1,2}日?(?:[ T]+\d{1,2}[:：]\d{1,2}(?::\d{1,2})?)?/gu) || [];
    const parsed = times.map((item) => this.parseHistoryTime(item)).filter(Number.isFinite);
    if (!parsed.length) return false;
    const min = Math.min(...parsed), max = Math.max(...parsed);
    return max >= start && min <= end;
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
      || String(item.情节名称 || item.情节标题 || item.摘要 || '').includes(plotId));
    if (!plot) return '未命中已归纳情节。';
    return this.worldlinePlotDetail(line, plot);
  },

  worldlinePlotDetail(line = {}, plot = {}) {
    const ids = String(plot.重要记录编号 || plot.recordIds || '').split(/[、,，\s]+/).filter(Boolean);
    const events = this.eventsByIds(line, ids);
    return [
      `情节：${plot.情节编号 || plot.id || ''}｜${plot.情节标题 || plot.情节名称 || plot.摘要 || ''}`,
      `时间：${plot.情节时间段 || ''}`,
      `摘要：${plot.情节总结 || plot.摘要 || plot.情节摘要 || ''}`,
      `关键片段：${plot.重要片段 || ''}`,
      `关联记录：\n${events.map((event) => this.eventLine(event)).join('\n') || ids.join('、') || '无关联记录命中。'}`,
    ].join('\n');
  },

  worldlineEventText(event = {}) {
    return `${event.eventId || event.id || ''}\n${event.time || ''}\n${event.name || ''}\n${event.summary || ''}\n${event.plotId || ''}\n${event.detail || ''}\n${JSON.stringify(event)}`;
  },

  worldlinePlotText(plot = {}) {
    return `${plot.情节编号 || plot.id || ''}\n${plot.情节标题 || ''}\n${plot.情节名称 || ''}\n${plot.情节时间段 || ''}\n${plot.情节总结 || ''}\n${plot.摘要 || ''}\n${plot.重要片段 || ''}\n${plot.重要记录编号 || plot.recordIds || ''}\n${JSON.stringify(plot)}`;
  },

  eventsByIds(line = {}, ids = []) {
    const set = new Set(ids);
    return (line.events || []).filter((event) => set.has(event.eventId) || set.has(event.id));
  },

  eventLine(event = {}) {
    return `${event.eventId || event.id || '未知记录'}｜${event.time || ''}｜${event.name || '现实事件'}｜${this.limit(event.detail || event.summary || '', 360)}`;
  },
});
