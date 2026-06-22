window.GameModules = window.GameModules || {};

window.GameModules.realWorldThinkingActions = {
  toggleRealWorldThinking(entry) {
    if (!entry) return;
    entry.thinkingOpen = !entry.thinkingOpen;
    this.realWorldLog = [...(this.realWorldLog || [])];
  },

  collapseRealWorldThinking() {
    this.realWorldLog = (this.realWorldLog || []).map((entry) => (entry?.thinkingOpen ? { ...entry, thinkingOpen: false } : entry));
  },

  hasRealWorldThinking(entry) {
    return Boolean(entry?.thinking) || Boolean(entry?.streaming) || (Array.isArray(entry?.streamTrace) && entry.streamTrace.length > 0) || (Array.isArray(entry?.agentTrace) && entry.agentTrace.length > 0);
  },

  normalizeRealWorldLog(log = []) {
    return (Array.isArray(log) ? log : []).map((entry, index) => ({
      id: entry?.id || `real-log-${index}`,
      type: entry?.type || 'ai',
      thinkingOpen: Boolean(entry?.thinkingOpen),
      cardChangesOpen: Boolean(entry?.cardChangesOpen),
      characterCardChanges: Array.isArray(entry?.characterCardChanges) ? entry.characterCardChanges : [],
      streamTrace: Array.isArray(entry?.streamTrace) ? entry.streamTrace : [],
      agentTrace: Array.isArray(entry?.agentTrace) ? entry.agentTrace : [],
      ...entry,
    })).sort((a, b) => this.realWorldLogSortKey(a).localeCompare(this.realWorldLogSortKey(b)));
  },

  realWorldLogSortKey(entry = {}) {
    if (entry.createdAt || entry.time?.iso) return String(entry.createdAt || entry.time.iso);
    const label = String(entry.time?.label || '');
    const match = label.match(/(\d{4})年(\d{1,2})月(\d{1,2})日.*?(\d{1,2}):(\d{1,2}):(\d{1,2})/);
    if (match) {
      const [, year, month, day, hour, minute, second] = match;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}`;
    }
    return String(entry.id || '');
  },

  refreshRealWorldLogPage(page = this.realWorldLogPage || 1) {
    const total = window.GameModules.sqliteSave.countRealWorldLogEntries?.() || 0;
    if (!total) {
      this.realWorldLog = this.normalizeRealWorldLog(this.realWorldLog || []);
      this.realWorldLogTotal = this.realWorldLog.length;
      this.realWorldLogPage = 1;
      return;
    }
    const maxPage = Math.max(1, Math.ceil(total / this.realWorldLogPageSize));
    this.realWorldLogTotal = total;
    this.realWorldLogPage = Math.max(1, Math.min(maxPage, Number(page) || 1));
    let rows = window.GameModules.sqliteSave.listRealWorldLogEntries?.(this.realWorldLogPage, this.realWorldLogPageSize) || [];
    if (this.realWorldLogPage === maxPage && rows[0]?.type === 'ai' && total > rows.length) {
      const prevRows = window.GameModules.sqliteSave.listRealWorldLogEntries?.(this.realWorldLogPage - 1, this.realWorldLogPageSize) || [];
      const prev = prevRows[prevRows.length - 1];
      if (prev?.type === 'user' && rows[0]?.id?.startsWith(String(prev.id || '').replace(/-user$/, '-ai'))) rows = [prev, ...rows];
    }
    this.realWorldLog = this.normalizeRealWorldLog(rows);
  },

  realWorldLogMaxPage() {
    return Math.max(1, Math.ceil((this.realWorldLogTotal || this.realWorldLog.length || 0) / this.realWorldLogPageSize));
  },

  realWorldLogPageLabel() {
    return `第 ${this.realWorldLogPage || 1} / ${this.realWorldLogMaxPage()} 页，共 ${this.realWorldLogTotal || this.realWorldLog.length} 条`;
  },

  changeRealWorldLogPage(delta) {
    this.refreshRealWorldLogPage((this.realWorldLogPage || 1) + delta);
  },

  scrollRealWorldLogBottom() {
    const run = () => {
      const el = document.querySelector('[data-section-title="现实记录列表"]') || document.querySelector('.real-world-dialog .story-log');
      if (el) el.scrollTop = el.scrollHeight;
    };
    requestAnimationFrame(run);
    setTimeout(run, 60);
  },

  realWorldTraceLines(entry) {
    if (this.realWorldThinkMode) return [];
    const stream = Array.isArray(entry?.streamTrace) ? entry.streamTrace : [];
    const trace = Array.isArray(entry?.agentTrace) ? entry.agentTrace : [];
    const fallback = entry?.streaming && !entry?.thinking && !stream.length ? ['步骤进行中｜正在推演', '正在接收现实 AI 的推演内容。'] : [];
    return stream.concat(fallback, trace.flatMap((item) => this.realWorldTraceItemLines(item)));
  },

  realWorldTraceItemLines(item = {}) {
    const head = [`步骤 ${item.step || '?'}｜${this.realWorldTraceType(item.type)}`];
    if (item.thinking) head.push(`思考：${item.thinking}`);
    if (item.reason) head.push(`原因：${item.reason}`);
    const requests = (item.requests || []).map((req) => {
      const params = req.params ? JSON.stringify(req.params) : '{}';
      return `调用：${req.skill || 'unknown'}.${req.method || 'unknown'} ${params}`;
    });
    const loaded = (item.loaded || []).map((ctx) => `载入：${ctx.title}\n${ctx.text || ''}`);
    if (!requests.length && !loaded.length && item.raw) head.push(`返回：${item.raw}`);
    return head.concat(requests, loaded);
  },

  realWorldTraceType(type) {
    if (type === 'request_context') return '请求外部资料';
    if (type === 'final') return '生成最终内容';
    if (type === 'parse_failed') return '解析失败';
    return type || '未知步骤';
  },
};
