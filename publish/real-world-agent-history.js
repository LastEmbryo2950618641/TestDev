window.GameModules = window.GameModules || {};

Object.assign(window.GameModules.realWorldAgentContext, {
  history(store, method, params = {}) {
    const keyword = String(params.keyword || '').trim();
    if (method === 'getWorldlinePending') return this.worldlinePending(store);
    if (method === 'listWorldlineIndex') return this.worldlineIndex(store);
    if (method === 'searchWorldlineByKeyword') return this.searchWorldline(store, keyword, '鍏抽敭璇?);
    if (method === 'searchWorldlineByTime') return this.searchWorldlineByTime(store, params);
    if (method === 'listWorldlinePlots') return this.worldlinePlots(store);
    if (method === 'getWorldlinePlotRecords') return this.worldlinePlotRecords(store, params);
    const rows = this.allRealWorldRows(store);
    const picked = method === 'searchRealWorldLog' && keyword
      ? rows.filter((entry) => `${entry.text || ''} ${entry.narration || ''} ${entry.locationName || ''}`.includes(keyword)).slice(-8)
      : rows.slice(-5);
    return picked.map((entry) => entry.type === 'user'
      ? `鐜╁锛?{entry.text}`
      : `鐜板疄锛?{entry.locationName || '鏈煡鍦扮偣'}锝?{this.limit(entry.narration || '', 320)}`).join('\n') || '鏈懡涓幇瀹炶褰曘€?;
  },

  allRealWorldRows(store) {
    const total = window.GameModules.realWorldLogStore?.count?.() || 0;
    if (total) return window.GameModules.realWorldLogStore?.list?.(1, Math.min(total, 200)) || [];
    return (store.realWorldLog || []).filter((entry) => entry.type !== 'system');
  },

  worldlinePending(store) {
    const line = store.realWorldline?.() || {};
    const ids = line.pendingPlot?.recordIds || [];
    if (!ids.length) return '鏆傛棤姝ｅ湪璁板綍鐨勭幇瀹炴椂闂寸嚎銆?;
    return this.eventsByIds(line, ids).map((event) => this.eventLine(event)).join('\n') || '姝ｅ湪璁板綍鏃堕棿绾挎病鏈夊懡涓叿浣撹褰曘€?;
  },

  worldlineIndex(store) {
    const line = store.realWorldline?.() || {};
    const pending = line.pendingPlot ? `璁板綍涓綔${line.pendingPlot.startedAt || ''}-${line.pendingPlot.endedAt || ''}锝滆褰曟暟:${(line.pendingPlot.recordIds || []).length}` : '璁板綍涓綔鏆傛棤';
    const plots = (line.plots || []).slice(-12).map((plot) => `鎯呰妭锝?{plot.鎯呰妭缂栧彿 || plot.id || '鏈紪鍙?}锝?{plot.鎯呰妭鏍囬 || plot.鎯呰妭鍚嶇О || plot.鎽樿 || '鏈懡鍚?}锝?{plot.鎯呰妭鏃堕棿娈?|| ''}锝滆褰?${plot.閲嶈璁板綍缂栧彿 || plot.recordIds || ''}`);
    const events = (line.events || []).slice(-12).map((event) => `浜嬩欢锝?{event.eventId || event.id || '鏈煡'}锝?{event.time || ''}锝?{event.name || '鐜板疄浜嬩欢'}锝滄儏鑺?${event.plotId || event.summary || '鏈綊绾?}锝?{this.limit(event.detail || event.summary || '', 80)}`);
    return ['涓栫晫绾挎竻鍗?, pending, ...plots, ...events].join('\n') || '鏆傛棤涓栫晫绾胯祫鏂欍€?;
  },

  searchWorldline(store, query = '', label = '鍏抽敭璇?) {
    const key = String(query || '').trim();
    if (!key) return this.worldlineIndex(store);
    const line = store.realWorldline?.() || {};
    const plots = (line.plots || []).filter((plot) => this.worldlinePlotText(plot).includes(key)).slice(-6);
    const events = (line.events || []).filter((event) => this.worldlineEventText(event).includes(key)).slice(-8);
    const plotText = plots.map((plot) => this.worldlinePlotDetail(line, plot)).join('\n\n');
    const eventText = events.map((event) => this.eventLine(event)).join('\n');
    return this.limit([`${label}鏌ヨ锛?{key}`, plotText ? `鍛戒腑鎯呰妭锛歕n${plotText}` : '', eventText ? `鍛戒腑浜嬩欢锛歕n${eventText}` : ''].filter(Boolean).join('\n\n') || '鏈懡涓笘鐣岀嚎璧勬枡銆?, 1800);
  },

  searchWorldlineByTime(store, params = {}) {
    const start = this.parseHistoryTime(params.startTime || params.start || params.minTime || params.from);
    const end = this.parseHistoryTime(params.endTime || params.end || params.maxTime || params.to);
    const keyword = String(params.keyword || '').trim();
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) return this.searchWorldline(store, String(params.time || params.keyword || '').trim(), '鏃堕棿');
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
    const title = `鏃堕棿娈垫煡璇細${params.startTime || params.start || ''} - ${params.endTime || params.end || ''}${keyword ? `锝滃叧閿瘝锛?{keyword}` : ''}`;
    return this.limit([title, plotText ? `鍛戒腑鎯呰妭锛歕n${plotText}` : '', eventText ? `鍛戒腑浜嬩欢锛歕n${eventText}` : '鏈懡涓鏃堕棿娈典笘鐣岀嚎璧勬枡銆?].filter(Boolean).join('\n\n'), 1800);
  },

  parseHistoryTime(value = '') {
    const text = String(value || '').trim();
    const match = text.match(/(\d{4})[-/.骞碷(\d{1,2})[-/.鏈圿(\d{1,2})鏃?(?:[ T]+(\d{1,2})[:锛歖(\d{1,2})(?::(\d{1,2}))?)?/u);
    if (!match) return NaN;
    const [, y, m, d, hh = '0', mm = '0', ss = '0'] = match;
    return new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss)).getTime();
  },

  plotOverlapsRange(plot = {}, start, end) {
    const times = String(plot.鎯呰妭鏃堕棿娈?|| plot.timeRange || plot.time || '').match(/\d{4}[-/.骞碷\d{1,2}[-/.鏈圿\d{1,2}鏃?(?:[ T]+\d{1,2}[:锛歖\d{1,2}(?::\d{1,2})?)?/gu) || [];
    const parsed = times.map((item) => this.parseHistoryTime(item)).filter(Number.isFinite);
    if (!parsed.length) return false;
    const min = Math.min(...parsed), max = Math.max(...parsed);
    return max >= start && min <= end;
  },

  worldlinePlots(store) {
    const line = store.realWorldline?.() || {};
    return (line.plots || [])
      .map((plot) => `${plot.鎯呰妭缂栧彿 || '鏈紪鍙?}锝?{plot.鎯呰妭鍚嶇О || plot.鎽樿 || '鏈懡鍚?}锝?{plot.閲嶈璁板綍缂栧彿 || ''}`)
      .join('\n') || '鏆傛棤宸插綊绾虫儏鑺傘€?;
  },

  worldlinePlotRecords(store, params = {}) {
    const line = store.realWorldline?.() || {};
    const plotId = String(params.plotId || params.id || params.keyword || '').trim();
    const plot = (line.plots || []).find((item) => String(item.鎯呰妭缂栧彿 || item.id || '').includes(plotId)
      || String(item.鎯呰妭鍚嶇О || item.鎯呰妭鏍囬 || item.鎽樿 || '').includes(plotId));
    if (!plot) return '鏈懡涓凡褰掔撼鎯呰妭銆?;
    return this.worldlinePlotDetail(line, plot);
  },

  worldlinePlotDetail(line = {}, plot = {}) {
    const ids = String(plot.閲嶈璁板綍缂栧彿 || plot.recordIds || '').split(/[銆?锛孿s]+/).filter(Boolean);
    const events = this.eventsByIds(line, ids);
    return [
      `鎯呰妭锛?{plot.鎯呰妭缂栧彿 || plot.id || ''}锝?{plot.鎯呰妭鏍囬 || plot.鎯呰妭鍚嶇О || plot.鎽樿 || ''}`,
      `鏃堕棿锛?{plot.鎯呰妭鏃堕棿娈?|| ''}`,
      `鎽樿锛?{plot.鎯呰妭鎬荤粨 || plot.鎽樿 || plot.鎯呰妭鎽樿 || ''}`,
      `鍏抽敭鐗囨锛?{plot.閲嶈鐗囨 || ''}`,
      `鍏宠仈璁板綍锛歕n${events.map((event) => this.eventLine(event)).join('\n') || ids.join('銆?) || '鏃犲叧鑱旇褰曞懡涓€?}`,
    ].join('\n');
  },

  worldlineEventText(event = {}) {
    return `${event.eventId || event.id || ''}\n${event.time || ''}\n${event.name || ''}\n${event.summary || ''}\n${event.plotId || ''}\n${event.detail || ''}\n${JSON.stringify(event)}`;
  },

  worldlinePlotText(plot = {}) {
    return `${plot.鎯呰妭缂栧彿 || plot.id || ''}\n${plot.鎯呰妭鏍囬 || ''}\n${plot.鎯呰妭鍚嶇О || ''}\n${plot.鎯呰妭鏃堕棿娈?|| ''}\n${plot.鎯呰妭鎬荤粨 || ''}\n${plot.鎽樿 || ''}\n${plot.閲嶈鐗囨 || ''}\n${plot.閲嶈璁板綍缂栧彿 || plot.recordIds || ''}\n${JSON.stringify(plot)}`;
  },

  eventsByIds(line = {}, ids = []) {
    const set = new Set(ids);
    return (line.events || []).filter((event) => set.has(event.eventId) || set.has(event.id));
  },

  eventLine(event = {}) {
    return `${event.eventId || event.id || '鏈煡璁板綍'}锝?{event.time || ''}锝?{event.name || '鐜板疄浜嬩欢'}锝?{this.limit(event.detail || event.summary || '', 360)}`;
  },
});

