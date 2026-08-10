window.GameModules = window.GameModules || {};
window.GameModules.ui = window.GameModules.ui || {};
window.GameModules.ui.company = window.GameModules.ui.company || {};

window.GameModules.ui.company.payViewHelpers = {
  monthlyPayPreview() {
    const c = this.currentCompany();
    const s = c.salary || {};
    const work = c.workMode || {};
    const stats = this.currentCareerStats?.() || this.companyState?.workStats || {};
    if (work.type === '自由职业') {
      const total = Number(s.monthlyExpectedIncome ?? s.expectedMonthlyIncome ?? s.monthlyBase ?? 0);
      return {
        mode: 'freelance',
        base: 0,
        rate: 0,
        performanceMonths: 0,
        workDays: 0,
        daily: 0,
        annualPerformance: 0,
        total,
        orderIncomeText: s.orderIncomeText || '',
        performance: stats.performance ?? 100,
      };
    }
    const base = Number(s.monthlyBase ?? s.base ?? 0);
    const performanceMonths = Number(s.performanceMonths ?? s.commissionMonths) || 0;
    const workDays = this.currentMonthWorkDays();
    const daily = workDays ? Math.round(base / workDays) : 0;
    const absentCount = Math.max(0, Number(stats.absentCount) || 0);
    const payableWorkDays = Math.max(0, workDays - absentCount);
    const payableTotal = payableWorkDays * daily;
    const performance = Math.max(0, Math.min(100, Number(stats.performance ?? 100)));
    const rate = performance / 100;
    const annualPackage = Number(s.annualPackage ?? s.annualTotalPackage ?? s.totalAnnualPackage ?? s.yearlyPackage ?? 0)
      || Math.round(base * (12 + performanceMonths));
    const annualPerformance = Math.round(annualPackage * rate);
    return { base, rate, performanceMonths, workDays, daily, absentCount, payableWorkDays, payableTotal, annualPackage, annualPerformance, total: payableTotal, performance };
  },

  workStatusText() {
    if (!this.hasActiveCareerProfile?.()) return '当前没有活跃职业生涯。';
    const pay = this.monthlyPayPreview();
    const stats = this.companyState?.workStats || {};
    if (pay.mode === 'freelance') return `本月预计接单收入 ${pay.total}，迟到 0 次，旷班 0 次，绩效 ${stats.performance ?? 100}`;
    return `本月预计收入 ${pay.total}，日薪 ${pay.daily}，迟到 ${stats.lateCount || 0} 次，旷班 ${stats.absentCount || 0} 次，绩效 ${stats.performance ?? 100}`;
  },
};
