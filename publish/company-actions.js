window.GameModules = window.GameModules || {};

const companyViewHelperForwarders = {
  companyOrganization: 'companyOrganization',
  companyFields: 'companyFields',
  currentWorkAttendance: 'currentWorkAttendance',
  companyHeaderView: 'companyHeaderView',
  companyAttendanceView: 'companyAttendanceView',
  companyPayPreviewView: 'companyPayPreviewView',
  companyPayPanelView: 'companyPayPanelView',
  companyOrganizationSectionView: 'companyOrganizationSectionView',
  companyFieldSectionView: 'companyFieldSectionView',
  companyContractSectionView: 'companyContractSectionView',
  companyEmploymentRecordSectionView: 'companyEmploymentRecordSectionView',
  workStatusText: 'workStatusText',
  monthlyPayPreview: 'monthlyPayPreview',
};

function callCompanyViewHelper(name, context, ...args) {
  return window.GameModules.ui.company.viewHelpers[name].call(context, ...args);
}
window.GameModules.companyActions = {
  initCompanySystem() {
    if (this._companySystemInitialized && this.companyState?.companies?.length) return this.companyState;
    const base = window.GameModules.companySystem.defaultState(this.playerProfile || {});
    this.companyState = { ...base, ...(this.companyState || {}) };
    this.companyState.employment = { ...base.employment, ...(this.companyState.employment || {}) };
    this.companyState.employmentRecords = this.companyState.employmentRecords?.length ? this.companyState.employmentRecords : base.employmentRecords;
    this.companyState.companies = this.companyState.companies?.length ? this.companyState.companies : base.companies;
    this.normalizeEmploymentRecords();
    this.syncCompanyLexicon();
    this._companySystemInitialized = true;
    return this.companyState;
  },

  currentCompany() {
    if (!this.companyState?.companies?.length) this.companyState = window.GameModules.companySystem.defaultState(this.playerProfile || {});
    const company = this.companyState.companies.find((item) => item.id === this.companyState.currentCompanyId) || this.companyState.companies[0];
    this.normalizeCompanyPolicy(company);
    return company;
  },

  normalizeCompanyPolicy(company) {
    company.workMode = { ...(company.workMode || {}), schedule: '标准工作制', workDays: '周一到周五' };
    company.salary = company.salary || {};
    company.salary.performanceMonths = Number(company.salary.performanceMonths ?? company.salary.commissionMonths ?? 2);
    company.rules = ['遵守公司考勤与保密要求', '按岗位职责完成日常工作', '重大事项需及时汇报', '保持与团队的基础协作'];
    company.organization = company.organization?.length ? company.organization : window.GameModules.companySystem.defaultOrganization(this.playerProfile || {});
  },

  normalizeEmploymentRecords() {
    const c = this.currentCompany();
    const r = this.companyState.employmentRecords[0];
    r.company = r.company || c.name;
    r.status = this.companyState.employment.active === false ? '已离职' : '在职';
    r.startAt = r.startAt || this.companyState.employment.startAt || new Date().toISOString();
    r.endAt = this.companyState.employment.resignedAt || r.endAt || '';
    r.duration = this.employmentDurationText(r.startAt, r.endAt || new Date().toISOString());
  },

  employmentDurationText(start, end) {
    const days = Math.max(0, Math.floor((new Date(end) - new Date(start)) / 86400000));
    const months = Math.floor(days / 30);
    return months ? `${months}个月${days % 30}天` : `${days}天`;
  },

  companyFieldReason(key, label, value) {
    const v = value || '未设置';
    const map = {
      name: '公司名称用于标识当前雇佣记录指向的公司主体：' + v,
      type: '公司类型反映当前公司所属的组织类型：' + v,
      industry: '所属行业说明当前工作环境所在的行业背景：' + v,
      scale: '公司规模体现当前组织的体量与发展阶段：' + v,
      location: '办公地点决定当前通勤与日常上班所在位置：' + v,
      workMode: '用工制度说明玩家当前所处的工作关系类型：' + v,
      schedule: '上班制度描述当前上下班与休息安排：' + v,
      workTime: '上班时间用于说明每日工作时段：' + v,
      baseSalary: '底薪代表当前固定工资基础：' + v,
      workDays: '完整上班天数用于计算当前月份的工作日：' + v,
      dailySalary: '日薪用于反映按底薪和工作日折算后的日收入：' + v,
      annualPerformance: '年底绩效用于说明绩效提成的年度预估：' + v,
    };
    return map[key] || (label + '用于补充说明当前公司信息：' + v);
  },

  syncCompanyLexicon() {
    const c = this.currentCompany();
    c.lexicon = this.companyFields().map((field) => ({ label: field.label, value: field.value, desc: field.desc }));
  },

  companyPromptContext() {
    const c = this.currentCompany();
    const stats = this.companyState?.workStats || {};
    const fields = this.companyFields().map((f) => '- ' + f.label + '：' + f.value + '｜' + f.desc).join('\\n');
    const org = this.companyOrganization().map((d) => '- ' + d.name + '：' + (Array.isArray(d.jobs) ? d.jobs.map((j) => (j.title || '未命名岗位') + '(' + ((Array.isArray(j.people) && j.people.length) ? j.people.join('、') : '暂无') + ')').join('、') : '暂无岗位')).join('\\n');
    return '# 公司词条\\n' + fields + '\\n# 组织结构\\n' + org + '\\n# 工作状态\\n' + '- 迟到次数：' + (stats.lateCount || 0) + '\\n' + '- 旷班次数：' + (stats.absentCount || 0) + '\\n' + '- 当前绩效：' + (stats.performance ?? 100) + '/100\\n' + '- 公司规则：' + ((c.rules || []).join('、'));
  },

  currentMonthWorkDays() {
    const date = this.phoneDate?.() || new Date();
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    let restDays = 0;
    for (let day = 1; day <= days; day += 1) {
      const week = new Date(year, month, day).getDay();
      if (week === 0 || week === 6) restDays += 1;
    }
    return days - restDays;
  },

  decideWorkAttendance(choice) {
    const stats = this.companyState.workStats;
    const key = this.companyDateKey?.() || new Date().toISOString().slice(0, 10);
    if (stats.lastDecisionAt === key) return;
    if (choice === 'delay') { stats.lateCount += 1; stats.performance = Math.max(0, stats.performance - 6); }
    if (choice === 'absent') { stats.absentCount += 1; stats.performance = Math.max(0, stats.performance - 22); }
    stats.lastDecisionAt = key;
    this.companyState.workPromptOpen = false;
    this.companyState.pendingWork = null;
    this.save?.();
  },

  applyRecruitment(type) {
    const c = this.currentCompany();
    const id = `${type}-${Date.now()}`;
    if (type === 'employee') this.companyState.contracts.push({ id, type: '员工岗位', company: c.name, terms: '按照公司制度上班，执行基础岗位职责与考勤要求。', signedAt: this.phoneDateText?.() || '' });
    if (type === 'timed') this.companyState.submissions.push({ id, type: '定时任务', company: c.name, target: '在规定时间内完成指定事项', rewardRule: '合格可获得基础报酬，表现优秀可获得额外奖励', status: '待执行' });
    if (type === 'creator-low') this.companyState.contracts.push({ id, type: '创作者合作（低分成）', company: c.name, terms: '提供稳定基础支持，并按成果给予 5% 分成。', signedAt: this.phoneDateText?.() || '' });
    if (type === 'creator-high') this.companyState.contracts.push({ id, type: '创作者合作（高分成）', company: c.name, terms: '提供较低基础支持，并按成果给予 30% 分成。', signedAt: this.phoneDateText?.() || '' });
    if (type === 'employee') {
      const startAt = new Date().toISOString();
      this.companyState.employment = { active: true, startAt, resignedAt: '', resignedCompany: '' };
      this.companyState.employmentRecords.unshift({ id, company: c.name, status: '在职', startAt, endAt: '', duration: '0天' });
    }
    this.save?.();
  },

  resignCompany() {
    const c = this.currentCompany();
    const endAt = new Date().toISOString();
    this.companyState.employment = { active: false, startAt: this.companyState.employment?.startAt || endAt, resignedAt: endAt, resignedCompany: c.name };
    const record = this.companyState.employmentRecords.find((item) => item.status === '在职') || this.companyState.employmentRecords[0];
    if (record) Object.assign(record, { status: '已离职', endAt, duration: this.employmentDurationText(record.startAt, endAt) });
    this.companyState.workPromptOpen = false;
    this.companyState.pendingWork = null;
    this.companyState.contracts = [];
    this.companyState.submissions = [];
    this.syncCompanyLexicon();
    this.save?.();
  },

  openCompanyApp() {
    this.initCompanySystem();
    this.ensureAllCompanyFactions?.();
    this.identityAppOpen = false;
    this.wechatAppOpen = false;
    this.saveAppOpen = false;
    this.roleCardJsonAppOpen = false;
    this.worldlineAppOpen = false;
    if (this.bossState) this.bossState.open = false;
    if (this.calendarState) this.calendarState.open = false;
    if (this.factionState) this.factionState.open = false;
    if (this.skillsState) this.skillsState.open = false;
    if (this.knownProfessionState) this.knownProfessionState.open = false;
    if (this.promptState) this.promptState.open = false;
    if (this.tokenStatsState) this.tokenStatsState.open = false;
    this.companyState.open = true;
    this.desktopUnlocked = true;
  },

  closeCompanyApp() {
    this.companyState.open = false;
    this.closeAppToDesktop();
  },
};
Object.entries(companyViewHelperForwarders).forEach(([name, helperName]) => {
  window.GameModules.companyActions[name] = function companyViewHelperFacade(...args) {
    return callCompanyViewHelper(helperName, this, ...args);
  };
});
