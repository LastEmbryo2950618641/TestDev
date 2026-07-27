window.GameModules = window.GameModules || {};

window.GameModules.newsDriverActions = {
  initNewsDriver() {
    const system = window.GameModules.newsDriverSystem;
    if (!system) return;
    const previous = this.newsDriverState || {};
    this.newsDriverState = system.normalizeState({ ...system.defaultState(), ...previous });
    const nowIso = system.nowIso(this);
    this.newsDriverState = system.ensureBaselineMinimum?.(this.newsDriverState, this, nowIso, 5) || this.newsDriverState;
    this.newsDriverState.lastTickAt = this.newsDriverState.lastTickAt || nowIso;
    const currentList = system.filterItems(this.newsDriverState, this.newsDriverState.channelId || 'all', this.newsDriverState.filter || 'all');
    const selected = currentList.find((item) => item.id === this.newsDriverState.selectedId);
    if (!selected) this.newsDriverState.selectedId = currentList[0]?.id || '';
  },

  openNewsApp() {
    this.initNewsDriver?.();
    this.closeDesktopApps?.();
    this.newsDriverState = this.newsDriverState || window.GameModules.newsDriverSystem?.defaultState?.() || { open: false };
    this.newsDriverState.open = true;
    this.desktopUnlocked = true;
    this.save?.();
  },

  closeNewsApp() {
    if (this.newsDriverState) this.newsDriverState.open = false;
    this.closeAppToDesktop?.();
  },

  newsChannelTabs() {
    this.initNewsDriver?.();
    const system = window.GameModules.newsDriverSystem;
    const items = this.newsDriverState?.items || [];
    const activeItems = items.filter((item) => item && item.status !== 'expired');
    return [
      { id: 'all', label: '全部', count: activeItems.length },
      ...(system?.CHANNELS || []).map((channel) => ({
        id: channel.id,
        label: channel.shortLabel || channel.label,
        title: channel.label,
        count: activeItems.filter((item) => item.channelId === channel.id).length,
      })),
    ];
  },

  newsFilterTabs() {
    return [
      { id: 'all', label: '全部' },
      { id: 'local', label: '本地' },
      { id: 'org', label: '组织' },
      { id: 'hot', label: '高热' },
      { id: 'task', label: '可任务' },
    ];
  },

  setNewsChannel(channelId = 'all') {
    this.initNewsDriver?.();
    const system = window.GameModules.newsDriverSystem;
    const next = channelId === 'all' || system?.channelById?.(channelId) ? channelId : 'all';
    this.newsDriverState.channelId = next;
    const first = this.currentNewsList?.()[0];
    this.newsDriverState.selectedId = first?.id || '';
  },

  setNewsFilter(filter = 'all') {
    this.initNewsDriver?.();
    const next = ['all', 'local', 'org', 'hot', 'task'].includes(String(filter || '')) ? String(filter) : 'all';
    this.newsDriverState.filter = next;
    const first = this.currentNewsList?.()[0];
    this.newsDriverState.selectedId = first?.id || '';
  },

  selectNewsItem(id = '') {
    this.initNewsDriver?.();
    this.newsDriverState.selectedId = String(id || '');
  },

  currentNewsList() {
    this.initNewsDriver?.();
    const system = window.GameModules.newsDriverSystem;
    if (!system) return [];
    const channelId = this.newsDriverState?.channelId || 'all';
    const list = system.filterItems(this.newsDriverState, channelId, this.newsDriverState?.filter || 'all');
    if (channelId === 'all') return list.map((item, index) => ({ ...item, displayRank: index + 1, rankMode: 'all' }));
    return list.map((item) => ({ ...item, displayRank: item.rank, rankMode: 'channel' }));
  },

  selectedNewsItem() {
    const list = this.currentNewsList?.() || [];
    const id = String(this.newsDriverState?.selectedId || '').trim();
    return list.find((item) => item.id === id) || list[0] || null;
  },

  newsChannelLabel(channelId = '') {
    return window.GameModules.newsDriverSystem?.channelLabel?.(channelId) || '未知频道';
  },

  newsScopeLabel(scope = '') {
    return window.GameModules.newsDriverSystem?.SCOPE_LABELS?.[scope] || scope || '未知';
  },

  newsTaskPotentialLabel(value = '') {
    return window.GameModules.newsDriverSystem?.TASK_LABELS?.[value] || value || '背景';
  },

  newsTrendLabel(value = '') {
    return window.GameModules.newsDriverSystem?.TREND_LABELS?.[value] || value || '稳定';
  },

  newsHeatClass(item = {}) {
    const heat = Number(item.heat) || 0;
    if (heat >= 80) return 'hot';
    if (heat >= 60) return 'warm';
    return 'cool';
  },

  tickWorldNewsDriver(elapsedSeconds = 0, meta = {}) {
    this.initNewsDriver?.();
    const system = window.GameModules.newsDriverSystem;
    if (!system || !this.newsDriverState?.enabled) return { created: 0, updated: 0, promoted: 0 };
    const nowIso = this.phoneDate?.()?.toISOString?.() || meta.endedAt || new Date().toISOString();
    const before = this.newsDriverState.items || [];
    const seeded = before.length ? before : system.baselineItems(this, nowIso);
    const decayed = system.decayItems(seeded, elapsedSeconds, nowIso);
    this.newsDriverState = system.normalizeState({
      ...this.newsDriverState,
      items: decayed,
      lastTickAt: nowIso,
    });
    const promoted = this.promoteStrongNewsEvents?.(meta) || [];
    this.newsDriverState.message = promoted.length
      ? `新闻热榜已刷新，${promoted.length}条升格为大地图事件`
      : '新闻热榜已刷新';
    this.save?.();
    return {
      created: before.length ? 0 : this.newsDriverState.items.length,
      updated: this.newsDriverState.items.length,
      promoted: promoted.length,
    };
  },

  promoteStrongNewsEvents(meta = {}) {
    this.initNewsDriver?.();
    const system = window.GameModules.newsDriverSystem;
    if (!system) return [];
    const created = [];
    const candidates = (this.newsDriverState.items || [])
      .filter((item) => item && item.status !== 'expired' && item.taskPotential === 'strong')
      .filter((item) => ['local', 'city', 'org', 'community'].includes(item.scope))
      .filter((item) => !this.newsDriverState.promotedEventIds?.includes(item.id))
      .sort((a, b) => (Number(b.heat) || 0) - (Number(a.heat) || 0))
      .slice(0, 2);
    candidates.forEach((item) => {
      const event = this.promoteNewsToEvent?.(item, meta);
      if (event) {
        created.push(event);
        this.newsDriverState.promotedEventIds = [...new Set([...(this.newsDriverState.promotedEventIds || []), item.id])].slice(-200);
      }
    });
    return created;
  },

  promoteNewsToEvent(news = {}, meta = {}) {
    const system = window.GameModules.newsDriverSystem;
    const payload = system?.promoteToEventPayload?.(news, { logId: meta.logId || meta.sourceLogId || '', date: this.phoneDate?.()?.toISOString?.() || '' });
    if (!payload) return null;
    if (typeof this.upsertEvent !== 'function') return payload;
    return this.upsertEvent(payload, { save: false });
  },

  applyNewsDriverOps(ops = [], meta = {}) {
    this.initNewsDriver?.();
    const system = window.GameModules.newsDriverSystem;
    if (!system) return { applied: [], promoted: [] };
    const nowIso = this.phoneDate?.()?.toISOString?.() || new Date().toISOString();
    const result = system.applyOps(this.newsDriverState, ops, { nowIso, logId: meta.logId || '' });
    this.newsDriverState = result.state;
    const promotedEvents = [];
    (result.promoted || []).slice(0, 2).forEach(({ item, reason }) => {
      const event = this.promoteNewsToEvent?.(item, { ...meta, reason });
      if (event) promotedEvents.push(event);
    });
    this.newsDriverState.lastAiSettlementAt = nowIso;
    this.newsDriverState.message = result.applied.length ? `AI已调整${result.applied.length}条新闻` : this.newsDriverState.message;
    return { ...result, promotedEvents };
  },

  newsNarrationPromptContext(action = '') {
    this.initNewsDriver?.();
    const system = window.GameModules.newsDriverSystem;
    if (!system || !this.newsDriverState?.enabled) return '';
    return system.formatPromptContext(this.newsDriverState, { action, limit: 14 });
  },
};
