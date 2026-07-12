window.GameModules = window.GameModules || {};
window.GameModules.ui = window.GameModules.ui || {};
window.GameModules.ui.company = window.GameModules.ui.company || {};

window.GameModules.ui.company.payViewHelpers = {
  monthlyPayPreview() {
    const c = this.currentCompany();
    const s = c.salary || {};
    const base = Number(s.base || 0);
    const rate = Number(s.performanceRate || 0);
    const performanceMonths = Number(s.performanceMonths ?? s.commissionMonths) || 0;
    const workDays = this.currentMonthWorkDays();
    const daily = workDays ? Math.round(base / workDays) : 0;
    const annualPerformance = Math.round(performanceMonths * base * rate);
    return { base, rate, performanceMonths, workDays, daily, annualPerformance, total: base };
  },

  workStatusText() {
    if (this.companyState?.employment?.active === false) return '当前未处于在职状态。';
    const pay = this.monthlyPayPreview();
    const stats = this.companyState?.workStats || {};
    return `本月预计收入 ${pay.total}，日薪 ${pay.daily}，迟到 ${stats.lateCount || 0} 次，旷班 ${stats.absentCount || 0} 次，绩效 ${stats.performance ?? 100}`;
  },
};