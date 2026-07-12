window.GameModules = window.GameModules || {};
window.GameModules.ui = window.GameModules.ui || {};
window.GameModules.ui.company = window.GameModules.ui.company || {};

window.GameModules.ui.company.summaryViewHelpers = {
  companyHeaderView() {
    return {
      eyebrow: 'COMPANY',
      title: this.companyState?.employment?.active === false ? '暂无在职公司' : this.currentCompany().name,
      subtitle: this.workStatusText(),
      closeLabel: '回到桌面',
    };
  },

  companyAttendanceView() {
    const attendance = this.currentWorkAttendance();
    return {
      ...attendance,
      label: '今日上班状态',
      actionLabel: '记录到岗',
    };
  },

  companyPayPreviewView() {
    const pay = this.monthlyPayPreview();
    return {
      title: '薪酬绩效预览',
      summaryLine: `底薪：${pay.base}元｜本月完整上班天数：${pay.workDays}天｜日薪：${pay.daily}元`,
      performanceLine: `每月收入：${pay.total}元｜年底绩效：${pay.annualPerformance}元｜绩效提成：${Math.round(pay.rate * 100)}%`,
    };
  },
};
