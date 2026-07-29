window.GameModules = window.GameModules || {};
window.GameModules.ui = window.GameModules.ui || {};
window.GameModules.ui.company = window.GameModules.ui.company || {};

window.GameModules.ui.company.attendanceViewHelpers = {
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
    const stats = typeof this.normalizeCompanyWorkStats === 'function' ? this.normalizeCompanyWorkStats() : (this.companyState.workStats || {});
    const aiStatus = stats.attendanceStatus || {};
    if (aiStatus.dateKey === key && aiStatus.status) {
      const classMap = { 上班: 'work', 迟到: 'late', 旷班: 'absent', 假期: 'holiday', 请假: 'holiday', 出差: 'work', 居家办公: 'work', 加班: 'work' };
      return {
        status: aiStatus.status,
        className: classMap[aiStatus.status] || 'work',
        detail: aiStatus.detail || 'AI 已更新今日上班状态。',
        canCheckIn: typeof aiStatus.canCheckIn === 'boolean' ? aiStatus.canCheckIn : false,
      };
    }
    if (stats.lastDecisionAt === key) return { status: '上班', className: 'work', detail: '今日已记录到岗。', canCheckIn: false };
    const start = this.companyTimePoint(now, work.startTime, '09:00');
    const end = this.companyTimePoint(now, work.endTime, '18:00');
    const fallback = now < start
      ? { status: '上班', className: 'work', detail: `未到上班时间，${work.startTime || '09:00'}开始。`, canCheckIn: true }
      : (now <= end
        ? { status: '迟到', className: 'late', detail: `已迟到 ${this.companyDurationText(now - start)}，仍可到岗。`, canCheckIn: true }
        : { status: '旷班', className: 'absent', detail: `已过下班时间 ${work.endTime || '18:00'}，今日未到岗按旷班。`, canCheckIn: false });
    return fallback;
  },
};
