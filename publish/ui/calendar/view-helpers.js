window.GameModules = window.GameModules || {};
window.GameModules.ui = window.GameModules.ui || {};
window.GameModules.ui.calendar = window.GameModules.ui.calendar || {};

window.GameModules.ui.calendar.viewHelpers = {
  weekdayLabels() {
    return ['日', '一', '二', '三', '四', '五', '六'];
  },

  dayCellRows() {
    return (this.calendarDays?.() || []).map((cell) => ({
      key: cell.key,
      blank: !!cell.blank,
      day: cell.blank ? '' : cell.day,
      holiday: cell.holiday || '',
      marked: Array.isArray(cell.events) && cell.events.length > 0,
      events: (Array.isArray(cell.events) ? cell.events : []).map((event) => ({
        key: event.id || `${event.title || 'event'}-${event.time || ''}`,
        title: event.title || '未命名日程',
        isSystemEvent: event.source === 'event-system',
      })),
    }));
  },

  panelView() {
    return {
      eyebrow: 'CALENDAR',
      title: '日历',
      subtitle: '面试、投稿通知、到岗上班约定',
      closeLabel: '回到桌面',
      toolbar: {
        prevLabel: '上个月',
        title: this.calendarMonthTitle?.() || '',
        nextLabel: '下个月',
      },
      weekdays: this.weekdayLabels(),
      cells: this.dayCellRows(),
    };
  },
};
window.GameModules.ui.calendar.viewHelpers = Object.assign(window.GameModules.ui.calendar.viewHelpers || {}, {
  calendarMonthTitle() {
    this.initCalendar?.();
    return `${this.calendarState?.year || ''}年${(this.calendarState?.month ?? 0) + 1}月`;
  },

  eventsForCalendarDay(day) {
    const y = this.calendarState?.year;
    const m = this.calendarState?.month;
    return (this.allCalendarEvents?.() || []).filter((event) => {
      const d = new Date(event.time);
      const start = Number.isNaN(d.getTime()) ? null : d;
      const end = event.endTime ? new Date(event.endTime) : start;
      const cell = new Date(y, m, day, 12, 0, 0);
      if (!start) return false;
      return cell >= new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0)
        && cell <= new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59);
    });
  },

  calendarDays() {
    this.initCalendar?.();
    const y = this.calendarState?.year;
    const m = this.calendarState?.month;
    const first = new Date(y, m, 1).getDay();
    const total = new Date(y, m + 1, 0).getDate();
    const cells = Array.from({ length: first }, (_, i) => ({ key: `blank-${i}`, blank: true }));
    for (let day = 1; day <= total; day += 1) {
      const date = new Date(y, m, day);
      const events = this.eventsForCalendarDay?.(day) || [];
      const holiday = this.companyHolidayName?.(date) || '';
      cells.push({ key: `${y}-${m}-${day}`, day, events, holiday, blank: false });
    }
    while (cells.length % 7) cells.push({ key: `blank-end-${cells.length}`, blank: true });
    return cells;
  },

  formatCalendarTime(value) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '时间待确认' : d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  },
});
