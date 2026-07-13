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
    this.eventState.events = Array.isArray(this.eventState.events) ? this.eventState.events.map((item) => window.GameModules.eventSystem.normalizeEvent(item, this)) : [];
    this.eventState.tab = window.GameModules.eventSystem.normalizeType(this.eventState.tab || 'random');
    this.eventState.draft = { ...window.GameModules.eventSystem.defaultDraft(this.eventState.tab), ...(this.eventState.draft || {}) };
  },

  openEventApp() {
    this.initEventSystem();
    this.closeDesktopApps?.();
    this.eventState.open = true;
    this.desktopUnlocked = true;
  },

  closeEventApp() {
    if (this.eventState) this.eventState.open = false;
    this.closeAppToDesktop?.();
  },


  setEventTab(type = 'random') {
    this.initEventSystem();
    this.eventState.tab = window.GameModules.eventSystem.normalizeType(type);
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
    return [
      '【事件机制 - Stage1】',
      '随机事件只在推演前 Stage1 以概率触发；若下方存在已触发随机事件，必须判断它是否符合上下文逻辑与事实，必要时查询资料，禁止无依据强行入场。',
      `本轮已触发随机事件：\n${candidateText}`,
    ].join('\n');
  },

  eventNarrationPromptContext(action = '') {
    const randomEvents = this.activeTriggeredRandomEvents();
    const inferenceEvents = this.relevantEvents('inference', action, 20);
    const periodicEvents = this.relevantEvents('periodic', action, 20);
    const block = (title, list) => list.length ? `${title}\n${list.map((event, index) => `${index + 1}. ${window.GameModules.eventSystem.promptLine(event)}`).join('\n')}` : `${title}\n无`;
    return [
      '【事件上下文】',
      block('随机事件（本轮已概率触发，需由场景锚定决定是否进入正文）', randomEvents),
      block('推演事件（最多20条，和记忆/相关人绑定，可被履约、毁约、变更或取消）', inferenceEvents),
      block('周期事件（最多20条，相关人为所有人，按标签匹配注入）', periodicEvents),
    ].join('\n');
  },

  addEventsFromSettlement(events = [], meta = {}) {
    this.initEventSystem();
    const created = [];
    (Array.isArray(events) ? events : []).forEach((raw) => {
      const event = this.upsertEvent({ ...raw, source: raw.source || 'stage4', sourceLogId: raw.sourceLogId || meta.logId || '' }, { save: false });
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
    return (this.eventState.events || []).map((event) => ({
      id: `event:${event.id}`,
      eventId: event.id,
      title: this.eventName(event),
      time: `${event.startDate || window.GameModules.eventSystem.isoDate(this.phoneDate?.() || new Date())}T00:00:00`,
      endTime: `${event.endDate || event.startDate || window.GameModules.eventSystem.isoDate(this.phoneDate?.() || new Date())}T23:59:59`,
      type: `event-${event.type}`,
      source: 'event-system',
      detail: event.content,
    }));
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
