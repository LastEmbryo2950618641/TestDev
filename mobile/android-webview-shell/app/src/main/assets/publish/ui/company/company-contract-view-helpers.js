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
      showEmpty: !this.hasActiveCareerProfile?.(),
      emptyText: '暂无薪酬绩效信息',
      contractRows,
      submissionRows,
    };
  },

  companyPayPanelView() {
    const stats = typeof this.currentCareerStats === 'function' ? this.currentCareerStats() : (typeof this.normalizeCompanyWorkStats === 'function' ? this.normalizeCompanyWorkStats() : (this.companyState?.workStats || {}));
    const attendance = this.currentWorkAttendance();
    const leader = stats.leaderReview || {};
    const employee = stats.employeeReview || {};
    const contributions = (Array.isArray(stats.contributionItems) ? stats.contributionItems : []).map((item = {}, index) => ({
      key: item.id || `${item.type || 'contribution'}-${index}`,
      title: item.title || item.type || '贡献价值',
      body: item.detail || '暂无描述。',
      meta: item.valueText || '',
    }));
    return {
      summary: this.companyPayPreviewView(),
      performance: {
        title: '工作与绩效',
        nextReviewAt: stats.nextPerformanceReviewAt || '',
        attendanceStatus: attendance.status || '未更新',
        attendanceDetail: attendance.detail || '暂无上班状态说明。',
        leaderSummary: leader.summary || '暂无领导评价。',
        leaderDetail: leader.detail || '',
        leaderScore: leader.score ?? 0,
        employeeSummary: employee.summary || '暂无员工评价。',
        employeeDetail: employee.detail || '',
        contributionItems: contributions,
      },
      section: this.companyContractSectionView(),
    };
  },
};
