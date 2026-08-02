window.GameModules = window.GameModules || {};

window.GameModules.companySystem = {
  defaultState() {
    return {
      open: false,
      panelTab: 'profile',
      workPromptOpen: false,
      pendingWork: null,
      generating: false,
      generationError: '',
      promotionMessage: '',
      currentCompanyId: '',
      activeCareerApp: 'work',
      careerProfile: null,
      workUnitProfile: null,
      freelanceProfile: null,
      freelanceProfiles: [],
      selectedFreelanceId: '',
      freelancePicker: { open: false, query: '', results: [], searched: false, loading: false, error: '' },
      workStats: this.defaultWorkStats(),
      freelanceStats: this.defaultWorkStats(),
      freelanceStatsById: {},
      companies: [],
      contracts: [],
      submissions: [],
      employment: { active: false, activeCompanyId: '', startAt: '', resignedAt: '', resignedCompany: '' },
      employmentRecords: [],
    };
  },

  defaultWorkStats() {
    const now = new Date('2026-07-29T10:46:47.000+08:00');
    const nextReview = new Date('2026-07-31T18:00:00.000+08:00');
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return {
      month,
      lateCount: 0,
      absentCount: 0,
      performance: 100,
      commissionRate: 0,
      lastDecisionAt: '',
      nextPerformanceReviewAt: nextReview.toISOString(),
      attendanceStatus: { dateKey: '', status: '', detail: '', source: 'system', updatedAt: '' },
      leaderReview: { score: 100, summary: '暂无领导评价。', detail: '', updatedAt: '' },
      employeeReview: { summary: '暂无员工自评。', detail: '', updatedAt: '' },
      contributionItems: [],
      performanceHistory: [],
    };
  },

  defaultEmploymentRecord(unitName = '') {
    return { id: `job-${Date.now()}`, company: unitName, status: '在职', startAt: new Date().toISOString(), endAt: '', duration: '' };
  },

  emptyUnit(unitName = '') {
    return {
      id: '',
      factionId: '',
      name: unitName,
      type: '',
      industry: '',
      scale: '',
      location: '',
      workMode: {},
      salary: {},
      rules: [],
      openings: [],
      promotionRoutes: [],
      lexicon: [],
      generatedAt: '',
      source: 'empty',
      currentProjects: [],
      directLeader: { name: '', title: '' },
    };
  },
};
