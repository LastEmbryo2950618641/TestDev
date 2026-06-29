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

  sortedCalendarEvents() {
    this.initCalendar();
    return [...this.calendarState.events].sort((a, b) => new Date(a.time) - new Date(b.time));
  },

  calendarMonthTitle() {
    this.initCalendar();
    return `${this.calendarState.year}年${this.calendarState.month + 1}月`;
  },

  changeCalendarMonth(delta) {
    this.initCalendar();
    const date = new Date(this.calendarState.year, this.calendarState.month + delta, 1);
    this.calendarState.year = date.getFullYear();
    this.calendarState.month = date.getMonth();
  },

  calendarDays() {
    this.initCalendar();
    const y = this.calendarState.year;
    const m = this.calendarState.month;
    const first = new Date(y, m, 1).getDay();
    const total = new Date(y, m + 1, 0).getDate();
    const cells = Array.from({ length: first }, (_, i) => ({ key: `blank-${i}`, blank: true }));
    for (let day = 1; day <= total; day += 1) {
      const date = new Date(y, m, day);
      const events = this.eventsForCalendarDay(day);
      const holiday = this.companyHolidayName?.(date) || '';
      cells.push({ key: `${y}-${m}-${day}`, day, events, holiday, blank: false });
    }
    while (cells.length % 7) cells.push({ key: `blank-end-${cells.length}`, blank: true });
    return cells;
  },

  eventsForCalendarDay(day) {
    const y = this.calendarState.year;
    const m = this.calendarState.month;
    return this.calendarState.events.filter((event) => {
      const d = new Date(event.time);
      return d.getFullYear() === y && d.getMonth() === m && d.getDate() === day;
    });
  },

  formatCalendarTime(value) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '时间待确认' : d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  },
};
