window.GameModules = window.GameModules || {};

window.GameModules.companyAttendanceActions = {
  companyDateKey(date = this.phoneDate?.() || new Date()) {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  },

  companyHolidayName(date = this.phoneDate?.() || new Date()) {
    const md = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const ranges = [
      ['01-01', '01-03', '鍏冩棪鍋囨湡'], ['02-15', '02-23', '鏄ヨ妭鍋囨湡'], ['04-04', '04-06', '娓呮槑鍋囨湡'],
      ['05-01', '05-05', '鍔冲姩鑺傚亣鏈?], ['06-19', '06-21', '绔崍鍋囨湡'], ['09-25', '09-27', '涓鍋囨湡'],
      ['10-01', '10-07', '鍥藉簡鍋囨湡'],
    ];
    const hit = ranges.find(([start, end]) => md >= start && md <= end);
    if (hit) return hit[2];
    if (date.getDay() === 0 || date.getDay() === 6) return '鍙屼紤鏃?;
    return '';
  },

  companyTimePoint(date, value, fallback) {
    const [h, m] = String(value || fallback).split(':').map(Number);
    const point = new Date(date);
    point.setHours(h || 0, m || 0, 0, 0);
    return point;
  },

  companyDurationText(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  },

  currentWorkAttendance() { return window.GameModules.ui.company.viewHelpers.currentWorkAttendance.call(this); },

  checkWorkReminder() {
    const attendance = this.currentWorkAttendance();
    this.companyState.workPromptOpen = false;
    this.companyState.pendingWork = null;
    if (attendance.status === '鏃风彮') this.decideWorkAttendance('absent');
  },

  checkInWork() {
    const attendance = this.currentWorkAttendance();
    if (!attendance.canCheckIn) return;
    this.decideWorkAttendance(attendance.status === '杩熷埌' ? 'delay' : 'work');
  },
};
