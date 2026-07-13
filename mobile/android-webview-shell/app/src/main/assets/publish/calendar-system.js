window.GameModules = window.GameModules || {};

window.GameModules.calendarSystem = {
  defaultCalendarState() {
    const now = new Date();
    return { open: false, events: [], year: now.getFullYear(), month: now.getMonth() };
  },
};
