window.GameModules = window.GameModules || {};

window.GameModules.realWorldThinkingActions = {
  toggleRealWorldThinking(entry) {
    if (!entry) return;
    entry.thinkingOpen = !entry.thinkingOpen;
    this.realWorldLog = [...(this.realWorldLog || [])];
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
    }));
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
    const rows = window.GameModules.sqliteSave.listRealWorldLogEntries?.(this.realWorldLogPage, this.realWorldLogPageSize) || [];
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

  realWorldTraceLines(entry) {
    const stream = Array.isArray(entry?.streamTrace) ? entry.streamTrace : [];
    const trace = Array.isArray(entry?.agentTrace) ? entry.agentTrace : [];
    const fallback = entry?.streaming && !stream.length ? ['步骤进行中｜正在推演', '正在接收现实 AI 的推演内容。'] : [];
    return stream.concat(fallback, trace.flatMap((item) => this.realWorldTraceItemLines(item)));
  },

  realWorldTraceItemLines(item = {}) {
    const head = [`步骤 ${item.step || '?'}｜${this.realWorldTraceType(item.type)}`];
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
