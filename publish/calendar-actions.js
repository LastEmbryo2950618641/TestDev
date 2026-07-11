window.GameModules = window.GameModules || {};

window.GameModules.calendarActions = {
  initCalendar() {
    const base = window.GameModules.calendarSystem.defaultCalendarState();
    this.calendarState = { ...base, ...(this.calendarState || {}) };
    this.calendarState.events = this.calendarState.events || [];
    this.calendarState.year = Number(this.calendarState.year) || base.year;
    this.calendarState.month = Number.isFinite(Number(this.calendarState.month)) ? Number(this.calendarState.month) : base.month;
  },

  openCalendarApp() {
    this.initCalendar();
    this.identityAppOpen = false;
    this.wechatAppOpen = false;
    this.saveAppOpen = false;
    this.roleCardJsonAppOpen = false;
    this.worldlineAppOpen = false;
    if (this.companyState) this.companyState.open = false;
    if (this.bossState) this.bossState.open = false;
    if (this.factionState) this.factionState.open = false;
    if (this.skillsState) this.skillsState.open = false;
    if (this.knownProfessionState) this.knownProfessionState.open = false;
    if (this.promptState) this.promptState.open = false;
    if (this.tokenStatsState) this.tokenStatsState.open = false;
    this.calendarState.open = true;
    this.desktopUnlocked = true;
  },

  closeCalendarApp() {
    if (this.calendarState) this.calendarState.open = false;
    this.closeAppToDesktop();
  },

  addCalendarEvent(event) {
    this.initCalendar();
    this.calendarState.events.unshift({ ...event, id: event.id || `cal-${Date.now()}`, createdAt: event.createdAt || new Date().toISOString() });
    this.save?.();
  },

  allCalendarEvents() {
    this.initCalendar();
    const base = this.calendarState.events || [];
    const eventItems = this.eventCalendarEntries?.() || [];
    return [...base, ...eventItems];
  },

  sortedCalendarEvents() {
    this.initCalendar();
    return [...this.allCalendarEvents()].sort((a, b) => new Date(a.time) - new Date(b.time));
  },

  calendarMonthTitle() {
    return window.GameModules.ui.calendar.viewHelpers.calendarMonthTitle.call(this);
  },

  changeCalendarMonth(delta) {
    this.initCalendar();
    const date = new Date(this.calendarState.year, this.calendarState.month + delta, 1);
    this.calendarState.year = date.getFullYear();
    this.calendarState.month = date.getMonth();
  },

  calendarDays() {
    return window.GameModules.ui.calendar.viewHelpers.calendarDays.call(this);
  },

  eventsForCalendarDay(day) {
    return window.GameModules.ui.calendar.viewHelpers.eventsForCalendarDay.call(this, day);
  },

  formatCalendarTime(value) {
    return window.GameModules.ui.calendar.viewHelpers.formatCalendarTime.call(this, value);
  },

  calendarPanelView() { return window.GameModules.ui.calendar.viewHelpers.panelView.call(this); },
};
