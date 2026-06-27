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

  realWorldEntryPlayerText(entry = {}) {
    if (entry?.type !== 'ai') return '';
    const previousId = String(entry.id || '').replace(/-ai$/, '-user');
    const hasUserEntry = (this.realWorldLog || []).some((item) => item.id === previousId && item.type === 'user');
    return hasUserEntry ? '' : String(entry.playerText || entry.actionText || '').trim();
  },

  normalizeRealWorldLog(log = []) {
    const raw = Array.isArray(log) ? log : [];
    const ids = new Set(raw.map((entry) => String(entry?.id || '')));
    const expanded = raw.flatMap((entry) => {
      const id = String(entry?.id || '');
      const userId = id.replace(/-ai$/, '-user');
      const playerText = String(entry?.playerText || entry?.actionText || '').trim();
      if (entry?.type === 'ai' && /-ai$/u.test(id) && playerText && !ids.has(userId)) {
        return [{ id: userId, type: 'user', text: playerText, time: entry.time, createdAt: entry.createdAt }, entry];
      }
      return [entry];
    });
    return expanded.map((entry, index) => {
      const solidifyCards = Array.isArray(entry?.solidifyCards) ? entry.solidifyCards : [];
      return {
        ...entry,
        id: entry?.id || `real-log-${index}`,
        type: entry?.type || 'ai',
        thinkingOpen: Boolean(entry?.thinkingOpen),
        cardChangesOpen: Boolean(entry?.cardChangesOpen),
        settlementTab: entry?.settlementTab || '',
        characterCardChanges: Array.isArray(entry?.characterCardChanges) ? entry.characterCardChanges : [],
        solidifyCards,
        solidifyUserClosed: Boolean(entry?.solidifyUserClosed),
        solidifyOpen: solidifyCards.length > 0 && !entry?.solidifyUserClosed,
        solidifySelectedKey: entry?.solidifySelectedKey || this.solidifyKey?.(solidifyCards[0]) || '',
        streamTrace: Array.isArray(entry?.streamTrace) ? entry.streamTrace : [],
        agentTrace: Array.isArray(entry?.agentTrace) ? entry.agentTrace : [],
      };
    }).sort((a, b) => this.realWorldLogSortKey(a).localeCompare(this.realWorldLogSortKey(b)));
  },

  realWorldLogPairSortKey(entry = {}) {
    const id = String(entry.id || '');
    const match = id.match(/^(real-(\d+)-[a-z0-9]+)-(user|ai)$/u);
    if (!match) return '';
    const [, base, ms, kind] = match;
    return `${String(ms).padStart(16, '0')}-${base}-${kind === 'user' ? '0' : '1'}`;
  },

  realWorldLogSortKey(entry = {}) {
    const timeKey = () => {
      const parsed = Date.parse(entry.createdAt || entry.time?.iso || '');
      if (Number.isFinite(parsed)) return String(parsed).padStart(16, '0');
      const label = String(entry.time?.label || '');
      const match = label.match(/(\d{4})年(\d{1,2})月(\d{1,2})日.*?(\d{1,2}):(\d{1,2}):(\d{1,2})/);
      if (match) {
        const [, year, month, day, hour, minute, second] = match;
        const at = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)).getTime();
        if (Number.isFinite(at)) return String(at).padStart(16, '0');
      }
      const idNumber = Number(entry.id);
      if (Number.isFinite(idNumber)) return String(idNumber).padStart(16, '0');
      return `zzzz-${String(entry.id || '')}`;
    };
    if (entry.type === 'system' && entry.narration && !entry.text) return `0000-${timeKey()}-${String(entry.id || '')}`;
    const pairKey = this.realWorldLogPairSortKey(entry);
    if (pairKey) return `1000-${pairKey}`;
    return `1000-${timeKey()}-2-${String(entry.id || '')}`;
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
    if (rows[0]?.type === 'ai' && this.realWorldLogPage > 1) {
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
    const stream = Array.isArray(entry?.streamTrace) ? entry.streamTrace : [];
    const trace = Array.isArray(entry?.agentTrace) ? entry.agentTrace : [];
    const fallback = entry?.streaming && !entry?.thinking && !stream.length && !trace.length ? ['步骤进行中｜正在推演', '正在接收现实 AI 的推演内容。'] : [];
    return stream.concat(fallback, trace.flatMap((item) => this.realWorldTraceItemLines(item))).map((line, index) => `${index + 1}. ${line}`);
  },

  realWorldTraceItemLines(item = {}) {
    const head = [`阶段 ${item.step || '?'}｜${this.realWorldTraceType(item.type)}`];
    if (item.reason) head.push(`reason：${item.reason}`);
    const requests = (item.requests || []).map((req) => {
      const params = req.params ? JSON.stringify(req.params) : '{}';
      return `调用：${req.skill || 'unknown'}.${req.method || 'unknown'} ${params}`;
    });
    const loaded = (item.loaded || []).map((ctx) => `载入：${ctx.title}`);
    if (!requests.length && !loaded.length && item.raw) head.push(`返回：${item.raw}`);
    return head.concat(requests, loaded);
  },

  realWorldTraceType(type) {
    if (type === 'request_context') return '请求外部资料';
    if (type === 'context_done') return '资料已足够';
    if (type === 'final') return '生成最终内容';
    if (type === 'parse_failed') return '解析失败';
    return type || '未知步骤';
  },
};
