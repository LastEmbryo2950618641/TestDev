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
};
