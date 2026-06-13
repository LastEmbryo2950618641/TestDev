window.GameModules = window.GameModules || {};

window.GameModules.calendarActions = {
  initCalendar() {
    const base = window.GameModules.calendarSystem.defaultCalendarState();
    this.calendarState = { ...base, ...(this.calendarState || {}) };
    this.calendarState.events = this.calendarState.events || [];
  },

  openCalendarApp() {
    this.initCalendar();
    this.identityAppOpen = false;
    this.wechatAppOpen = false;
    if (this.companyState) this.companyState.open = false;
    if (this.bossState) this.bossState.open = false;
    this.calendarState.open = true;
    this.desktopUnlocked = true;
  },

  closeCalendarApp() {
    if (this.calendarState) this.calendarState.open = false;
    this.closeAppToDesktop();
  },

  addCalendarEvent(event) {
    this.initCalendar();
    this.calendarState.events.unshift({ id: `cal-${Date.now()}`, createdAt: new Date().toISOString(), ...event });
    this.save?.();
  },

  sortedCalendarEvents() {
    this.initCalendar();
    return [...this.calendarState.events].sort((a, b) => new Date(a.time) - new Date(b.time));
  },

  formatCalendarTime(value) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '时间待确认' : d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  },
};
