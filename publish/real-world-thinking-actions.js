window.GameModules = window.GameModules || {};

window.GameModules.realWorldThinkingActions = {
  toggleRealWorldThinking(entry) {
    if (!entry) return;
    entry.thinkingOpen = !entry.thinkingOpen;
    this.realWorldLog = [...(this.realWorldLog || [])];
  },

  hasRealWorldThinking(entry) {
    return Boolean(entry?.thinking) || (Array.isArray(entry?.agentTrace) && entry.agentTrace.length > 0);
  },

  normalizeRealWorldLog(log = []) {
    return (Array.isArray(log) ? log : []).map((entry, index) => ({
      id: entry?.id || `real-log-${index}`,
      type: entry?.type || 'ai',
      thinkingOpen: Boolean(entry?.thinkingOpen),
      cardChangesOpen: Boolean(entry?.cardChangesOpen),
      characterCardChanges: Array.isArray(entry?.characterCardChanges) ? entry.characterCardChanges : [],
      agentTrace: Array.isArray(entry?.agentTrace) ? entry.agentTrace : [],
      ...entry,
    }));
  },

  realWorldTraceLines(entry) {
    const trace = Array.isArray(entry?.agentTrace) ? entry.agentTrace : [];
    return trace.flatMap((item) => this.realWorldTraceItemLines(item));
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
