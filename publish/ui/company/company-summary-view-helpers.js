window.GameModules = window.GameModules || {};
window.GameModules.ui = window.GameModules.ui || {};
window.GameModules.ui.company = window.GameModules.ui.company || {};

window.GameModules.ui.company.summaryViewHelpers = {
  companyHeaderView() {
    const company = this.currentCompany();
    const title = !this.hasActiveCareerProfile?.()
      ? (this.isFreelanceCareer?.() ? '暂无自由职业者' : '暂无工作单位')
      : (this.isFreelanceCareer?.()
        ? (company.name || company.positionTitle || '自由职业者')
        : (company.careerSummary || company.name || '未生成职业生涯'));
    return {
      eyebrow: 'CAREER',
      title,
      subtitle: this.workStatusText(),
      closeLabel: '回到桌面',
    };
  },

  companyAttendanceView() {
    const attendance = this.currentWorkAttendance();
    return {
      ...attendance,
      label: this.isFreelanceCareer?.() ? '今日接单状态' : '今日上班状态',
      actionLabel: '记录到岗',
    };
  },

  companyPayPreviewView() {
    const pay = this.monthlyPayPreview();
    if (pay.mode === 'freelance') {
      return {
        title: '接单收入预览',
        summaryLine: `本月预计接单收入：${pay.total}元｜收入方式：${pay.orderIncomeText || '按订单/项目结算'}`,
        performanceLine: `绩效 ${pay.performance}｜自由职业无固定底薪、日薪和上班天数。`,
      };
    }
    return {
      title: '薪酬绩效预览',
      summaryLine: `底薪：${pay.base}元｜本月完整上班天数：${pay.workDays}天｜日薪：${pay.daily}元`,
      performanceLine: `每月收入：${pay.total}元｜年收入总包：${pay.annualPackage}元｜当前绩效：${pay.performance}/100｜年底绩效：${pay.annualPerformance}元｜绩效提成：${Math.round(pay.rate * 100)}%`,
    };
  },
};
