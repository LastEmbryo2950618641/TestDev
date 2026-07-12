window.GameModules = window.GameModules || {};
window.GameModules.ui = window.GameModules.ui || {};
window.GameModules.ui.company = window.GameModules.ui.company || {};

window.GameModules.ui.company.contractViewHelpers = {
  companyContractSectionView() {
    const contractRows = (Array.isArray(this.companyState?.contracts) ? this.companyState.contracts : []).map((item = {}) => ({
      key: item.id || `${item.type || 'contract'}-${item.signedAt || ''}`,
      title: item.type || '未命名合同',
      body: item.terms || '',
      meta: item.signedAt || '',
    }));

    const submissionRows = (Array.isArray(this.companyState?.submissions) ? this.companyState.submissions : []).map((item = {}) => ({
      key: item.id || `${item.type || 'submission'}-${item.status || ''}`,
      title: item.type || '未命名投稿',
      body: `${item.target || ''}｜${item.rewardRule || ''}`,
      meta: item.status || '',
    }));

    return {
      emptyText: '暂无薪酬绩效信息',
      contractRows,
      submissionRows,
    };
  },
};
