window.GameModules = window.GameModules || {};

window.GameModules.companyAttendanceActions = {
  companyDateKey(date = this.phoneDate?.() || new Date()) {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  },

  companyHolidayName(date = this.phoneDate?.() || new Date()) {
    const md = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const ranges = [
      ['01-01', '01-03', '元旦假期'], ['02-15', '02-23', '春节假期'], ['04-04', '04-06', '清明假期'],
      ['05-01', '05-05', '劳动节假期'], ['06-19', '06-21', '端午假期'], ['09-25', '09-27', '中秋假期'],
      ['10-01', '10-07', '国庆假期'],
    ];
    const hit = ranges.find(([start, end]) => md >= start && md <= end);
    if (hit) return hit[2];
    if (date.getDay() === 0 || date.getDay() === 6) return '双休日';
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

  currentWorkAttendance() {
    this.initCompanySystem();
    const c = this.currentCompany();
    const work = c.workMode || {};
    const now = this.phoneDate?.() || new Date();
    const holiday = this.companyHolidayName(now);
    const inactive = this.companyState.employment?.active === false || work.type !== '员工';
    if (inactive) return { status: '假期', className: 'holiday', detail: '当前没有员工制上班要求。', canCheckIn: false };
    if (holiday) return { status: '假期', className: 'holiday', detail: `${holiday}，无需到岗。`, canCheckIn: false };
    const key = this.companyDateKey(now);
    const stats = this.companyState.workStats || {};
    if (stats.lastDecisionAt === key) return { status: '上班', className: 'work', detail: '今日已记录到岗。', canCheckIn: false };
    const start = this.companyTimePoint(now, work.startTime, '09:00');
    const end = this.companyTimePoint(now, work.endTime, '18:00');
    if (now < start) return { status: '上班', className: 'work', detail: `未到上班时间，${work.startTime || '09:00'}开始。`, canCheckIn: true };
    if (now <= end) return { status: '迟到', className: 'late', detail: `已迟到 ${this.companyDurationText(now - start)}，仍可到岗。`, canCheckIn: true };
    return { status: '旷班', className: 'absent', detail: `已过下班时间 ${work.endTime || '18:00'}，今日未到岗按旷班。`, canCheckIn: false };
  },

  checkWorkReminder() {
    const attendance = this.currentWorkAttendance();
    this.companyState.workPromptOpen = false;
    this.companyState.pendingWork = null;
    if (attendance.status === '旷班') this.decideWorkAttendance('absent');
  },

  checkInWork() {
    const attendance = this.currentWorkAttendance();
    if (!attendance.canCheckIn) return;
    this.decideWorkAttendance(attendance.status === '迟到' ? 'delay' : 'work');
  },
};
