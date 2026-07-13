window.GameModules = window.GameModules || {};

window.GameModules.realWorldThinkingActions = {
  toggleRealWorldThinking(entry) {
    if (!entry) return;
    const id = String(entry.id || '');
    this.realWorldLog = (this.realWorldLog || []).map((item) => (
      item?.id === id ? { ...item, thinkingOpen: !item.thinkingOpen } : item
    ));
  },

  toggleRealWorldThinkingSection(entry, sectionId) {
    this.toggleRealWorldThinkingStageGroup(entry, sectionId);
  },

  toggleRealWorldThinkingStageGroup(entry, groupId) {
    if (!entry || !groupId) return;
    const id = String(entry.id || '');
    const key = String(groupId);
    this.realWorldLog = (this.realWorldLog || []).map((item) => {
      if (item?.id !== id) return item;
      const groups = this.realWorldThinkingStageGroups(item);
      const index = groups.findIndex((group) => group.id === key);
      const stageOpen = { ...(item.thinkingStageOpen || {}) };
      const currentlyOpen = this.realWorldThinkingStageOpen(item, key, index);
      stageOpen[key] = !currentlyOpen;
      return { ...item, thinkingStageOpen: stageOpen };
    });
  },

  realWorldThinkingStageOpen(entry, groupId, index = 0) {
    const key = String(groupId || '');
    const stageOpen = entry?.thinkingStageOpen && typeof entry.thinkingStageOpen === 'object' ? entry.thinkingStageOpen : {};
    if (Object.prototype.hasOwnProperty.call(stageOpen, key)) return stageOpen[key] !== false;
    if (index < 0) return false;
    const total = this.realWorldThinkingStageGroups(entry).length;
    return total > 0 && index === total - 1;
  },

  realWorldThinkingStageGroupKey(meta = {}) {
    return window.GameModules.realWorldAgentLoop?.reasoningStageGroupKey?.(meta) || String(meta.phase || 'unknown');
  },

  cleanRealWorldThinkingText(value = '') {
    const text = String(value || '').trim();
    if (!text || /^[=\-_*#~`|/\\]+$/u.test(text)) return '';
    return text;
  },

  realWorldThinkingStageGroups(entry = {}) {
    const loop = window.GameModules.realWorldAgentLoop;
    const groupMap = new Map();
    const ensureGroup = (meta = {}) => {
      const key = this.realWorldThinkingStageGroupKey(meta);
      const existing = groupMap.get(key) || {
        id: key,
        phase: meta.phase || 'unknown',
        step: Number(meta.step) || 0,
        label: meta.label || '鏈煡闃舵',
        reasoningParts: [],
        traceLines: [],
      };
      groupMap.set(key, existing);
      return existing;
    };

    const assigned = loop?.assignReasoningSectionMetas?.(entry?.thinkingSections || [], entry) || [];
    assigned.forEach(({ meta, section }) => {
      const text = this.cleanRealWorldThinkingText(section?.text);
      if (!text) return;
      ensureGroup(meta).reasoningParts.push(text);
    });

    const legacyText = this.cleanRealWorldThinkingText(entry?.thinking);
    if (!assigned.length && legacyText) {
      ensureGroup({ phase: 'unknown', step: 0, label: '鐜板疄鎺ㄦ紨', id: 'legacy-thinking' }).reasoningParts.push(legacyText);
    }

    (Array.isArray(entry?.agentTrace) ? entry.agentTrace : []).forEach((item) => {
      const step = Number(item?.step) || 1;
      const group = ensureGroup({ phase: 'stage1', step, label: `Stage1 - ${step}`, id: `stage1-${step}` });
      group.traceLines.push(...this.realWorldTraceItemLines(item).map((line) => this.cleanRealWorldThinkingText(line)).filter(Boolean));
    });

    const order = { stage1: 10, stage2: 20, stage3: 30, stage4: 40, stage5: 50, unknown: 90 };
    return [...groupMap.values()]
      .map((group) => ({
        ...group,
        reasoning: group.reasoningParts.join('\n\n').trim(),
        traceText: group.traceLines.map((line, index) => `${index + 1}. ${line}`).join('\n'),
        hasContent: Boolean(group.reasoningParts.length || group.traceLines.length),
      }))
      .filter((group) => group.hasContent)
      .sort((a, b) => (order[a.phase] - order[b.phase]) || (a.step - b.step));
  },

  collapseRealWorldThinking() {
    this.realWorldLog = (this.realWorldLog || []).map((entry) => (entry?.thinkingOpen ? { ...entry, thinkingOpen: false } : entry));
  },

  hasRealWorldThinking(entry) {
    if (entry?.transientError) return false;
    return this.realWorldThinkingStageGroups(entry).length > 0 || Boolean(entry?.streaming);
  },

  realWorldThinkingLines(entry = {}) {
    const groups = this.realWorldThinkingStageGroups(entry);
    return groups.map((group, index) => ({
      id: group.id,
      label: group.label,
      text: [group.reasoning, group.traceText].filter(Boolean).join('\n\n'),
      open: this.realWorldThinkingStageOpen(entry, group.id, index),
    }));
  },

  realWorldSystemTraceLines(entry = {}) {
    return this.realWorldTraceLines(entry).map((text) => ({ label: '绯荤粺鎻愮ず', text }));
  },

  realWorldEntryCacheText(entry = {}) {
    const cache = entry?.deepseekCache || entry?.cacheStats || {};
    const hit = Math.max(0, Math.round(Number(cache.promptCacheHitTokens ?? cache.hitTokens) || 0));
    const miss = Math.max(0, Math.round(Number(cache.promptCacheMissTokens ?? cache.missTokens) || 0));
    const requests = Math.max(0, Math.round(Number(cache.requestCount) || 0));
    if (!hit && !miss && !requests) return '';
    const total = hit + miss;
    if (!total) return `缂撳瓨鍛戒腑锛?{hit} tokens`;
    const ratio = Math.round((hit / total) * 100);
    return `缂撳瓨鍛戒腑锛?{hit} / ${total} tokens锛?{ratio}%锛塦;
  },

  realWorldEntryPlayerText(entry = {}) {
    if (entry?.type !== 'ai') return '';
    const previousId = String(entry.id || '').replace(/-ai$/, '-user');
    const hasUserEntry = (this.realWorldLog || []).some((item) => item.id === previousId && item.type === 'user');
    return hasUserEntry ? '' : String(entry.playerText || entry.actionText || '').trim();
  },

  realWorldDisplayLog(log = this.realWorldLog || []) {
    const rows = Array.isArray(log) ? log : [];
    const result = [];
    let activeActionText = '';
    let activeActionPending = false;
    rows.forEach((entry) => {
      if (entry?.type === 'user') {
        const text = String(entry.text || entry.playerText || entry.actionText || '').trim();
        const prev = result[result.length - 1];
        const prevText = String(prev?.text || prev?.playerText || prev?.actionText || '').trim();
        if (prev?.type === 'user' && text && text === prevText) return;
        if (activeActionPending && text && text === activeActionText) return;
        activeActionText = text;
        activeActionPending = Boolean(text);
        result.push(entry);
        return;
      }
      if (entry?.transientError) {
        const text = String(entry.narration || entry.statusText || entry.text || '').trim();
        const prev = result[result.length - 1];
        const prevText = String(prev?.narration || prev?.statusText || prev?.text || '').trim();
        if (prev?.transientError && text && text === prevText) return;
        activeActionPending = Boolean(activeActionText);
        result.push(entry);
        return;
      }
      activeActionText = '';
      activeActionPending = false;
      result.push(entry);
    });
    return result;
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
        thinkingStageOpen: entry?.thinkingStageOpen && typeof entry.thinkingStageOpen === 'object' ? { ...entry.thinkingStageOpen } : {},
        cardChangesOpen: Boolean(entry?.cardChangesOpen),
        settlementTab: entry?.settlementTab || '',
        thinkingSections: Array.isArray(entry?.thinkingSections)
          ? entry.thinkingSections.map((item) => {
            const label = String(item?.label || '');
            const parsed = window.GameModules.realWorldAgentLoop?.parseReasoningLabel?.(label);
            return {
              ...item,
              id: String(item?.id || ''),
              phase: String(item?.phase || parsed?.phase || ''),
              step: Number.isFinite(Number(item?.step)) ? Number(item.step) : (parsed?.step || 0),
              label: parsed?.label || label || '鐜板疄鎺ㄦ紨',
              open: item?.open !== false,
            };
          })
          : [],
        characterCardChanges: Array.isArray(entry?.characterCardChanges) ? entry.characterCardChanges : [],
        solidifyCards,
        solidifyUserClosed: Boolean(entry?.solidifyUserClosed),
        solidifyOpen: Boolean(entry?.solidifyOpen),
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
      const match = label.match(/(\d{4})骞?\d{1,2})鏈?\d{1,2})鏃?*?(\d{1,2}):(\d{1,2}):(\d{1,2})/);
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

  patchRealWorldLogEntry(id, patch = {}, options = {}) {
    const key = String(id || '');
    if (!key) return false;
    let found = false;
    const current = this.realWorldLog || [];
    if (options.live) {
      const entry = current.find((item) => item?.id === key);
      if (!entry) return false;
      Object.assign(entry, patch);
      this.realWorldLog = current.slice();
      return true;
    }
    const patched = current.map((entry) => {
      if (entry?.id !== key) return entry;
      found = true;
      return { ...entry, ...patch };
    });
    if (!found) {
      const saved = window.GameModules.realWorldLogStore?.get?.(key);
      if (!saved) return false;
      patched.push({ ...saved, ...patch });
    }
    this.realWorldLog = this.normalizeRealWorldLog(patched).slice(-Math.max(1, Number(this.realWorldLogPageSize) || 12));
    return true;
  },

  refreshRealWorldLogPage(page = this.realWorldLogPage || 1) {
    const total = window.GameModules.realWorldLogStore?.count?.() || 0;
    if (!total) {
      this.realWorldLog = this.normalizeRealWorldLog(this.realWorldLog || []);
      this.realWorldLogTotal = this.realWorldLog.length;
      this.realWorldLogPage = 1;
      return;
    }
    const maxPage = Math.max(1, Math.ceil(total / this.realWorldLogPageSize));
    this.realWorldLogTotal = total;
    this.realWorldLogPage = Math.max(1, Math.min(maxPage, Number(page) || 1));
    let rows = window.GameModules.realWorldLogStore?.list?.(this.realWorldLogPage, this.realWorldLogPageSize) || [];
    if (rows[0]?.type === 'ai' && this.realWorldLogPage > 1) {
      const prevRows = window.GameModules.realWorldLogStore?.list?.(this.realWorldLogPage - 1, this.realWorldLogPageSize) || [];
      const prev = prevRows[prevRows.length - 1];
      if (prev?.type === 'user' && rows[0]?.id?.startsWith(String(prev.id || '').replace(/-user$/, '-ai'))) rows = [prev, ...rows];
    }
    const last = rows[rows.length - 1];
    if (last?.type === 'user' && this.realWorldLogPage < maxPage) {
      const nextRows = window.GameModules.realWorldLogStore?.list?.(this.realWorldLogPage + 1, this.realWorldLogPageSize) || [];
      const next = nextRows[0];
      if (next?.type === 'ai' && next.id?.startsWith(String(last.id || '').replace(/-user$/, '-ai'))) rows = [...rows, next];
    }
    this.realWorldLog = this.normalizeRealWorldLog(rows);
  },

  realWorldLogMaxPage() {
    return Math.max(1, Math.ceil((this.realWorldLogTotal || this.realWorldLog.length || 0) / this.realWorldLogPageSize));
  },

  realWorldLogPageLabel() {
    return `绗?${this.realWorldLogPage || 1} / ${this.realWorldLogMaxPage()} 椤碉紝鍏?${this.realWorldLogTotal || this.realWorldLog.length} 鏉;
  },

  changeRealWorldLogPage(delta) {
    this.refreshRealWorldLogPage((this.realWorldLogPage || 1) + delta);
  },

  scrollRealWorldLogBottom() {
    const run = () => {
      const el = document.querySelector('[data-section-title="鐜板疄璁板綍鍒楄〃"]') || document.querySelector('.real-world-dialog .story-log');
      if (el) el.scrollTop = el.scrollHeight;
    };
    requestAnimationFrame(run);
    setTimeout(run, 60);
  },

  realWorldTraceLines(entry) {
    const stream = Array.isArray(entry?.streamTrace) ? entry.streamTrace : [];
    const trace = Array.isArray(entry?.agentTrace) ? entry.agentTrace : [];
    const fallback = entry?.streaming && !entry?.thinking && !stream.length && !trace.length ? ['姝ラ杩涜涓綔姝ｅ湪鎺ㄦ紨', '姝ｅ湪鎺ユ敹鐜板疄 AI 鐨勬帹婕斿唴瀹广€?] : [];
    return stream.concat(fallback, trace.flatMap((item) => this.realWorldTraceItemLines(item))).map((line, index) => `${index + 1}. ${line}`);
  },

  realWorldTraceItemLines(item = {}) {
    const head = [`闃舵 ${item.step || '?'}锝?{this.realWorldTraceType(item.type)}`];
    if (item.reason) head.push(`reason锛?{item.reason}`);
    const requests = (item.requests || []).map((req) => {
      const params = req.params ? JSON.stringify(req.params) : '{}';
      return `璋冪敤锛?{req.skill || 'unknown'}.${req.method || 'unknown'} ${params}`;
    });
    const loaded = (item.loaded || []).map((ctx) => `杞藉叆锛?{ctx.title}`);
    if (!requests.length && !loaded.length && item.raw) head.push(`杩斿洖锛?{item.raw}`);
    return head.concat(requests, loaded);
  },

  realWorldTraceType(type) {
    if (type === 'request_context') return '璇锋眰澶栭儴璧勬枡';
    if (type === 'context_done') return '璧勬枡宸茶冻澶?;
    if (type === 'final') return '鐢熸垚鏈€缁堝唴瀹?;
    if (type === 'parse_failed') return '瑙ｆ瀽澶辫触';
    return type || '鏈煡姝ラ';
  },
};
