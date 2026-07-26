window.GameModules = window.GameModules || {};

const eventViewHelperForwarders = {
  eventTypeTabs: 'eventTypeTabs',
  currentEventList: 'currentEventList',
  selectedEvent: 'selectedEvent',
  eventMeta: 'eventMeta',
  eventStatusLabel: 'eventStatusLabel',
  eventListEmptyText: 'eventListEmptyText',
  eventStatusFieldLabel: 'eventStatusFieldLabel',
  eventTriggeredCountFieldLabel: 'eventTriggeredCountFieldLabel',
  eventHeaderDescription: 'eventHeaderDescription',
  eventProbabilityFieldLabel: 'eventProbabilityFieldLabel',
  eventBackButtonText: 'eventBackButtonText',
  selectedEventEmptyText: 'selectedEventEmptyText',
  selectedEventDetailView: 'selectedEventDetailView',
  eventPanelView: 'eventPanelView',
};

function callEventViewHelper(name, context, ...args) {
  return window.GameModules.ui.event.viewHelpers[name].call(context, ...args);
}
window.GameModules.eventActions = {
  initEventSystem() {
    const base = window.GameModules.eventSystem.defaultState();
    this.eventState = { ...base, ...(this.eventState || {}) };
    this.eventState.randomProbability = Math.max(0, Math.min(100, Math.round(Number(this.eventState.randomProbability ?? 10) || 0)));
    this.eventState.events = Array.isArray(this.eventState.events)
      ? this.eventState.events.map((item) => window.GameModules.eventSystem.normalizeEvent(item, this))
      : [];
    this.eventState.tab = window.GameModules.eventSystem.normalizeWritableType(this.eventState.tab || 'random');
    this.eventState.draft = { ...window.GameModules.eventSystem.defaultDraft(this.eventState.tab), ...(this.eventState.draft || {}) };
    const primary = String(this.eventState.primaryTab || 'events');
    this.eventState.primaryTab = ['inbox', 'events', 'tempo'].includes(primary) ? primary : 'events';
    const filter = String(this.eventState.inboxFilter || 'pending');
    this.eventState.inboxFilter = ['pending', 'prepared', 'consumed', 'all'].includes(filter) ? filter : 'pending';
    this.eventState.inboxSelectedId = String(this.eventState.inboxSelectedId || '');
    this.eventState.inboxBudgetTiers = window.GameModules.socialInbox?.normalizeBudgetTiers?.(this.eventState.inboxBudgetTiers)
      || base.inboxBudgetTiers;
    // 去掉旧档里已持久化的 event-system 副本，避免与读时投影重复
    this.syncEventCalendarEntries?.();
  },

  openEventApp() {
    this.initEventSystem();
    this.closeDesktopApps?.();
    const inbox = Array.isArray(this.socialInbox) ? this.socialInbox : [];
    const hasPending = inbox.some((item) => item && item.status === 'pending');
    const hasPrepared = inbox.some((item) => item && item.status === 'prepared');
    if (hasPending) {
      this.eventState.primaryTab = 'inbox';
      this.eventState.inboxFilter = 'pending';
    } else if (hasPrepared) {
      this.eventState.primaryTab = 'inbox';
      this.eventState.inboxFilter = 'prepared';
    } else {
      this.eventState.primaryTab = 'events';
    }
    this.eventState.open = true;
    this.desktopUnlocked = true;
  },

  closeEventApp() {
    if (this.eventState) this.eventState.open = false;
    this.closeAppToDesktop?.();
  },

  setDrivePrimaryTab(tab = 'events') {
    this.initEventSystem();
    const next = String(tab || 'events');
    this.eventState.primaryTab = ['inbox', 'events', 'tempo'].includes(next) ? next : 'events';
  },

  drivePrimaryTabs() {
    this.initEventSystem();
    const inboxCount = (this.socialInbox || []).filter((item) => item && (item.status === 'pending' || item.status === 'prepared')).length;
    return [
      { id: 'inbox', label: '日常队列', count: inboxCount, showCount: true },
      { id: 'events', label: '事件库', count: (this.eventState.events || []).length, showCount: false },
      { id: 'tempo', label: '节奏参数', count: 0, showCount: false },
    ];
  },

  setInboxFilter(filter = 'pending') {
    this.initEventSystem();
    const next = String(filter || 'pending');
    this.eventState.inboxFilter = ['pending', 'prepared', 'consumed', 'all'].includes(next) ? next : 'pending';
    const selected = this.selectedInboxItem?.();
    if (!selected) this.eventState.inboxSelectedId = '';
  },

  inboxFilterTabs() {
    return [
      { id: 'pending', label: '待处理' },
      { id: 'prepared', label: '已备稿' },
      { id: 'consumed', label: '已消耗' },
      { id: 'all', label: '全部' },
    ];
  },

  currentInboxList() {
    this.initEventSystem();
    const filter = this.eventState.inboxFilter || 'pending';
    const list = Array.isArray(this.socialInbox) ? this.socialInbox.slice() : [];
    const filtered = filter === 'all'
      ? list
      : list.filter((item) => item && item.status === filter);
    return filtered.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  },

  inboxListEmptyText() {
    this.initEventSystem();
    const filter = this.eventState.inboxFilter || 'pending';
    if (filter === 'prepared') return '暂无已备稿日常入队。';
    if (filter === 'consumed') return '暂无已消耗日常入队。';
    if (filter === 'all') return '日常队列为空。';
    return '暂无待处理日常入队。';
  },

  selectInboxItem(id = '') {
    this.initEventSystem();
    this.eventState.inboxSelectedId = String(id || '');
  },

  selectedInboxItem() {
    this.initEventSystem();
    const list = this.currentInboxList();
    const id = this.eventState.inboxSelectedId || list[0]?.id || '';
    return list.find((item) => item.id === id) || null;
  },

  inboxChannelLabel(channel = '') {
    const map = { wechat: '微信', call: '电话', scene: '当面' };
    return map[String(channel || '')] || '电话';
  },

  inboxStatusLabel(status = '') {
    const map = { pending: '待处理', prepared: '已备稿', consumed: '已消耗', expired: '已过期' };
    return map[String(status || '')] || '待处理';
  },

  inboxUrgencyDots(urgency = 0) {
    const n = Math.max(0, Math.min(1, Number(urgency) || 0));
    const filled = n >= 0.75 ? 4 : n >= 0.5 ? 3 : n >= 0.25 ? 2 : n > 0 ? 1 : 0;
    return { filled, total: 4, label: filled >= 4 ? '高' : filled >= 3 ? '中高' : filled >= 2 ? '中' : filled >= 1 ? '低' : '无' };
  },

  inboxRelativeTime(iso = '') {
    const t = Date.parse(String(iso || ''));
    if (!Number.isFinite(t)) return '';
    const now = (this.phoneDate?.() || new Date()).getTime();
    const diff = Math.max(0, now - t);
    if (diff < 60 * 1000) return '刚刚';
    if (diff < 3600 * 1000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 48 * 3600 * 1000) return `${Math.floor(diff / 3600000)} 小时前`;
    return `${Math.floor(diff / 86400000)} 天前`;
  },

  inboxBudgetTiersView() {
    this.initEventSystem();
    return window.GameModules.socialInbox?.normalizeBudgetTiers?.(this.eventState.inboxBudgetTiers)
      || this.eventState.inboxBudgetTiers
      || [];
  },

  setInboxBudgetTier(index = 0, key = '', value) {
    this.initEventSystem();
    const tiers = window.GameModules.socialInbox.normalizeBudgetTiers(this.eventState.inboxBudgetTiers);
    const i = Math.max(0, Math.min(tiers.length - 1, Number(index) || 0));
    if (key === 'expected') {
      tiers[i].expected = Math.max(0, Math.min(20, Math.round((Number(value) || 0) * 100) / 100));
    } else if (key === 'hardCap') {
      tiers[i].hardCap = Math.max(0, Math.min(20, Math.round(Number(value) || 0)));
    }
    this.eventState.inboxBudgetTiers = window.GameModules.socialInbox.normalizeBudgetTiers(tiers);
    this.eventState.message = '入队人数阶梯已更新';
    this.save?.();
  },

  resetInboxBudgetTiers() {
    this.initEventSystem();
    this.eventState.inboxBudgetTiers = window.GameModules.socialInbox.defaultBudgetTiers();
    this.eventState.message = '已恢复默认入队阶梯';
    this.save?.();
  },

  setEventTab(type = 'random') {
    this.initEventSystem();
    this.eventState.tab = window.GameModules.eventSystem.normalizeWritableType(type);
    this.eventState.draft = { ...window.GameModules.eventSystem.defaultDraft(this.eventState.tab), type: this.eventState.tab };
  },

  eventsByType(type = this.eventState?.tab || 'random') {
    return callEventViewHelper('eventsByType', this, type);
  },


  eventName(event = {}) {
    return callEventViewHelper('eventName', this, event);
  },


  setEventRandomProbability(value = 10) {
    this.initEventSystem();
    this.eventState.randomProbability = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
    this.eventState.message = `随机事件发生概率已设置为 ${this.eventState.randomProbability}%`;
    this.save?.();
  },

  eventDraftValue(key = '') {
    this.initEventSystem();
    return this.eventState.draft?.[key] ?? '';
  },

  setEventDraft(key = '', value = '') {
    this.initEventSystem();
    this.eventState.draft = { ...(this.eventState.draft || {}), [key]: value };
  },

  addEventFromDraft() {
    this.initEventSystem();
    const draft = this.eventState.draft || {};
    const event = window.GameModules.eventSystem.normalizeEvent({
      ...draft,
      type: this.eventState.tab,
      people: draft.peopleText,
      tags: draft.tagsText,
      source: 'manual',
    }, this);
    if (!String(event.title || '').trim() || !String(event.content || '').trim()) {
      this.eventState.message = '事件名和事件内容不能为空。';
      return;
    }
    this.upsertEvent(event, { save: true });
    this.eventState.selectedId = event.id;
    this.eventState.draft = window.GameModules.eventSystem.defaultDraft(this.eventState.tab);
    this.eventState.message = `已新增：${this.eventName(event)}`;
  },

  upsertEvent(raw = {}, options = {}) {
    this.initEventSystem();
    const event = window.GameModules.eventSystem.normalizeEvent(raw, this);
    const list = this.eventState.events || [];
    const index = list.findIndex((item) => item.id === event.id);
    if (index >= 0) list[index] = { ...list[index], ...event, updatedAt: new Date().toISOString() };
    else list.unshift(event);
    this.eventState.events = list;
    this.syncEventCalendarEntries();
    if (options.save !== false) this.save?.();
    return event;
  },

  removeEvent(id = '') {
    this.initEventSystem();
    this.eventState.events = (this.eventState.events || []).filter((event) => event.id !== id);
    if (this.eventState.selectedId === id) this.eventState.selectedId = '';
    this.syncEventCalendarEntries();
    this.save?.();
  },

  setRandomEventProbability(event = {}, value = 0) {
    if (!event?.id) return;
    event.probability = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
    event.updatedAt = new Date().toISOString();
    this.eventState.events = [...(this.eventState.events || [])];
    this.save?.();
  },

  eventPromptContextBase(action = '') {
    const state = this.playerIdentityState?.();
    const people = [
      this.playerName,
      state?.profile?.name,
      ...(Object.values(this.rpgStates || {}).map((item) => item?.profile?.name || item?.name)),
    ].filter(Boolean);
    return {
      action,
      people,
      location: this.realWorldLocationName || this.realWorldMap?.current || '',
      sceneTitle: this.realWorldSceneTitle || '',
      tags: [this.realWorldSceneTitle, this.realWorldLocationName, this.realWorldStatus].filter(Boolean),
    };
  },

  prepareEventsForRealWorldAction(action = '', logId = '') {
    this.initEventSystem();
    const now = this.phoneDate?.() || new Date();
    const context = this.eventPromptContextBase(action);
    const triggered = [];
    const probability = Math.max(0, Math.min(100, Number(this.eventState.randomProbability ?? 10) || 0));
    (this.eventState.events || []).forEach((event) => {
      if (event.type !== 'random') return;
      if (!window.GameModules.eventSystem.dateInRange(now, event)) return;
      if (window.GameModules.eventSystem.isExpired(event, now)) return;
      const score = window.GameModules.eventSystem.scoreEvent(event, context);
      const effective = Math.max(0, Math.min(100, probability + Math.min(25, score * 2)));
      if (Math.random() * 100 > effective) return;
      event.triggeredCount = Math.max(0, Number(event.triggeredCount) || 0) + 1;
      event.lastTriggeredAt = now.toISOString();
      triggered.push(event.id);
    });
    this.eventState.currentContext = { logId, action, at: now.toISOString(), triggeredRandomEventIds: triggered };
    this.eventState.events = [...(this.eventState.events || [])];
    if (triggered.length) this.save?.();
    return triggered;
  },

  activeTriggeredRandomEvents() {
    this.initEventSystem();
    const ids = new Set(this.eventState.currentContext?.triggeredRandomEventIds || []);
    return (this.eventState.events || []).filter((event) => ids.has(event.id));
  },

  relevantEvents(type = 'inference', action = '', limit = 20) {
    this.initEventSystem();
    const normalized = window.GameModules.eventSystem.normalizeType(type);
    if (!window.GameModules.eventSystem.isWritableType(normalized)) return [];
    const now = this.phoneDate?.() || new Date();
    const context = this.eventPromptContextBase(action);
    return (this.eventState.events || [])
      .filter((event) => event.type === normalized)
      .filter((event) => normalized === 'periodic' ? window.GameModules.eventSystem.dateInRange(now, event) : !window.GameModules.eventSystem.isExpired(event, now))
      .map((event) => ({ event, score: window.GameModules.eventSystem.scoreEvent(event, context) }))
      .sort((a, b) => b.score - a.score || Math.random() - 0.5)
      .slice(0, limit)
      .map((item) => item.event);
  },

  eventStage1PromptContext(action = '') {
    const randomEvents = this.activeTriggeredRandomEvents();
    const candidateText = randomEvents.length ? randomEvents.map((event, index) => `${index + 1}. ${window.GameModules.eventSystem.promptLine(event)}`).join('\n') : '无';
    const lead = window.GameModules.socialEventBoundary?.eventStage1Lead?.()
      || '【事件机制 - Stage1】\n随机事件只在推演前以概率触发；禁止无依据强行入场。';
    return [
      lead,
      `本轮已触发随机事件：\n${candidateText}`,
    ].join('\n');
  },

  eventNarrationPromptContext(action = '') {
    const randomEvents = this.activeTriggeredRandomEvents();
    const mapEvents = this.relevantEvents('inference', action, 20);
    const periodicEvents = this.relevantEvents('periodic', action, 20);
    const block = (title, list) => list.length ? `${title}\n${list.map((event, index) => `${index + 1}. ${window.GameModules.eventSystem.promptLine(event)}`).join('\n')}` : `${title}\n无`;
    const lead = window.GameModules.socialEventBoundary?.eventNarrationLead?.()
      || '【事件上下文】\n大地图/周期/随机与 Social Inbox 互补，禁止重复。';
    return [
      lead,
      block('随机事件（本轮已概率触发，需由场景锚定决定是否进入正文）', randomEvents),
      block('大地图事件（最多20条：活动/比赛/市政/限运等，按地点与标签匹配）', mapEvents),
      block('周期事件（最多20条，影响范围为所有人，按标签匹配注入）', periodicEvents),
    ].join('\n');
  },

  addEventsFromSettlement(events = [], meta = {}) {
    this.initEventSystem();
    const created = [];
    (Array.isArray(events) ? events : []).forEach((raw) => {
      const type = window.GameModules.eventSystem.normalizeType(raw?.type || raw?.eventType || raw?.['事件类型']);
      if (!window.GameModules.eventSystem.isWritableType(type)) return;
      const event = this.upsertEvent({
        ...raw,
        type,
        source: raw.source || 'stage4',
        sourceLogId: raw.sourceLogId || meta.logId || '',
      }, { save: false });
      created.push(event);
    });
    if (created.length) {
      this.syncEventCalendarEntries();
      this.save?.();
    }
    return created;
  },

  eventCalendarEntries() {
    this.initEventSystem();
    const calYear = Number(this.calendarState?.year);
    const year = Number.isFinite(calYear) ? calYear : (this.phoneDate?.() || new Date()).getFullYear();
    const now = this.phoneDate?.() || new Date();
    return (this.eventState.events || []).flatMap((event) => {
      if (!event) return [];
      // 非周期：已过期的不进日历主视图（仍保留在事件 App）
      if (event.type !== 'periodic' && window.GameModules.eventSystem.isExpired(event, now)) return [];
      let startDate = event.startDate || window.GameModules.eventSystem.isoDate(now);
      let endDate = event.endDate || startDate;
      // 周期 yearly：投影到当前日历年的月日，否则跨年看不到
      if (event.type === 'periodic' && (event.recurrence || 'yearly') === 'yearly' && startDate.length >= 10) {
        const startMd = startDate.slice(5);
        const endMd = (endDate || startDate).slice(5);
        startDate = `${year}-${startMd}`;
        endDate = `${year}-${endMd}`;
        // 跨年段（如 12-20 ~ 01-05）：拆成当年末与次年初两段在当月视图内能命中
        if (endMd < startMd) {
          return [{
            id: `event:${event.id}:y${year}a`,
            eventId: event.id,
            title: this.eventName(event),
            time: `${year}-${startMd}T00:00:00`,
            endTime: `${year}-12-31T23:59:59`,
            type: `event-${event.type}`,
            source: 'event-system',
            detail: event.content,
          }, {
            id: `event:${event.id}:y${year}b`,
            eventId: event.id,
            title: this.eventName(event),
            time: `${year}-01-01T00:00:00`,
            endTime: `${year}-${endMd}T23:59:59`,
            type: `event-${event.type}`,
            source: 'event-system',
            detail: event.content,
          }];
        }
      }
      return [{
        id: `event:${event.id}`,
        eventId: event.id,
        title: this.eventName(event),
        time: `${startDate}T00:00:00`,
        endTime: `${endDate}T23:59:59`,
        type: `event-${event.type}`,
        source: 'event-system',
        detail: event.content,
      }];
    });
  },

  syncEventCalendarEntries() {
    if (!this.calendarState) return;
    this.calendarState.events = (this.calendarState.events || []).filter((event) => event.source !== 'event-system');
  },
};
Object.entries(eventViewHelperForwarders).forEach(([name, helperName]) => {
  window.GameModules.eventActions[name] = function eventViewHelperFacade(...args) {
    return callEventViewHelper(helperName, this, ...args);
  };
});
