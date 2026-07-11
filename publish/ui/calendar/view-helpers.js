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
