window.GameModules = window.GameModules || {};

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
    company.workMode = { ...(company.workMode || {}), schedule: '双休制', workDays: '周一至周五' };
    company.salary = company.salary || {};
    company.salary.performanceMonths = Number(company.salary.performanceMonths ?? company.salary.commissionMonths ?? 2);
    company.rules = ['以底薪为每月收入核心', '休息日为每月周六和周日', '日薪=底薪÷当月完整上班天数', '年底绩效=公司绩效月数×底薪×绩效提成'];
    company.organization = company.organization?.length ? company.organization : window.GameModules.companySystem.defaultOrganization(this.playerProfile || {});
  },

  companyOrganization() {
    return this.companyState?.employment?.active === false ? [] : (this.currentCompany().organization || []);
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
    const v = value || '未设定';
    const map = { name: `当前雇佣记录指向“${v}”，玩家上班、薪资和组织互动都围绕这家公司展开。`, type: `组织类型为“${v}”，决定玩家面对的是企业、机构还是个体经营场景。`, industry: `所属行业为“${v}”，玩家近期工作任务和职业压力会从这个行业产生。`, scale: `组织规模为“${v}”，影响玩家日常接触的人数、流程复杂度和晋升压力。`, location: `办公地点为“${v}”，玩家通勤、迟到风险和现实地图移动都围绕这里计算。`, workMode: `招聘制度为“${v}”，说明玩家当前工作关系和收入稳定性的来源。`, schedule: `上班制度为“${v}”，玩家最近作息、休息日和疲劳累积都按这个节奏推进。`, workTime: `上班时间为“${v}”，会触发迟到、旷班和下班后的现实行动窗口。`, baseSalary: `底薪为“${v}”，这是玩家当月生活压力、消费能力和收入预期的核心依据。`, workDays: `本月完整上班天数为“${v}”，由当前月份周末休息日扣除后用于结算日薪。`, dailySalary: `日薪为“${v}”，直接说明玩家请假、迟到或缺勤时承受的收入影响。`, annualPerformance: `年底绩效为“${v}”，反映玩家长期工作表现和年底收入期待。` };
    return map[key] || `${label}当前为“${v}”，会影响玩家最近现实行动和工作动机。`;
  },

  companyFields() {
    if (this.companyState?.employment?.active === false) return [];
    const c = this.currentCompany();
    const salary = c.salary || {};
    const work = c.workMode || {};
    const pay = this.monthlyPayPreview();
    const row = (key, label, value, desc) => ({ key: `company-${key}`, label, kind: '公司词条', value: value || '未设定', raw: value || '', desc, reason: this.companyFieldReason(key, label, value), worldTag: '2026 现代都市现实世界', targetType: '非角色', commonField: true });
    return [
      row('name', '公司名称', c.name, '固化公司名称，避免现实推演前后不一致。'),
      row('type', '公司类型', c.type, '公司、工作室、个体户、学校/机构等组织类型。'),
      row('industry', '所属行业', c.industry, '公司主营行业，用于限定任务和收益来源。'),
      row('scale', '组织规模', c.scale, '公司规模影响制度严格程度与任务容量。'),
      row('location', '办公地点', c.location, '现实办公地点或登记地址。'),
      row('workMode', '招聘制度', work.type, '员工、定时工、创作者模式三类制度。'),
      row('schedule', '上班制度', `${work.schedule || '双休制'}｜${work.workDays || '周一至周五'}`, '员工制上班规则，双休制每月休息日为该月周六和周日。'),
      row('workTime', '上班时间', `${work.startTime}-${work.endTime}`, '到点后触发上班提示。'),
      row('baseSalary', '底薪', `${salary.monthlyBase || 0}${salary.currency || 'CNY'}`, '薪酬制度以底薪为核心，每月收入就是底薪。'),
      row('workDays', '本月完整上班天数', `${pay.workDays}天`, '该月天数减去该月周六、周日休息日。'),
      row('dailySalary', '日薪', `${pay.daily}元/天`, '日薪=底薪÷本月完整上班天数。'),
      row('annualPerformance', '年底绩效', `${pay.performanceMonths}个月底薪 × ${Math.round(pay.rate * 100)}% = ${pay.annualPerformance}元`, '年底绩效=公司绩效月数×底薪×绩效提成。'),
    ];
  },

  syncCompanyLexicon() {
    const c = this.currentCompany();
    c.lexicon = this.companyFields().map((field) => ({ label: field.label, value: field.value, desc: field.desc }));
  },

  companyPromptContext() {
    const c = this.currentCompany();
    const stats = this.companyState?.workStats || {};
    const fields = this.companyFields().map((f) => `- ${f.label}：${f.value}（${f.desc}）`).join('\n');
    const org = this.companyOrganization().map((d) => `- ${d.name}：${d.jobs.map((j) => `${j.title}(${j.people.join('、')})`).join('；')}`).join('\n');
    return `# 【公司系统词条】\n${fields}\n# 【组织架构】\n${org}\n# 【本月上班状态】\n- 迟到：${stats.lateCount || 0}次\n- 旷班：${stats.absentCount || 0}次\n- 当前绩效：${stats.performance ?? 100}/100\n- 公司规则：${(c.rules || []).join('；')}`;
  },

  workStatusText() {
    if (this.companyState?.employment?.active === false) return `已从${this.companyState.employment.resignedCompany || '公司'}离职`;
    const stats = this.companyState?.workStats || {};
    const pay = this.monthlyPayPreview();
    return `本月绩效${stats.performance ?? 100}/100｜迟到${stats.lateCount || 0}次｜旷班${stats.absentCount || 0}次｜本月收入${pay.total}元`;
  },

  monthlyPayPreview() {
    const c = this.currentCompany();
    const s = c.salary || {};
    const stats = this.companyState?.workStats || {};
    const base = Number(s.monthlyBase) || 0;
    const rate = Number(stats.commissionRate) || Math.max(0, Math.min(Number(s.maxRate) || 0, (stats.performance ?? 100) / 100 * 0.18));
    const performanceMonths = Number(s.performanceMonths ?? s.commissionMonths) || 0;
    const workDays = this.currentMonthWorkDays();
    const daily = workDays ? Math.round(base / workDays) : 0;
    const annualPerformance = Math.round(performanceMonths * base * rate);
    return { base, rate, performanceMonths, workDays, daily, annualPerformance, total: base };
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
    if (type === 'employee') this.companyState.contracts.push({ id, type: '员工', company: c.name, terms: '底薪作为每月收入，年底按公司绩效月数×底薪×绩效提成结算', signedAt: this.phoneDateText?.() || '' });
    if (type === 'timed') this.companyState.submissions.push({ id, type: '定时工', company: c.name, target: '规定时间内完成单项任务', rewardRule: '不合格0，合格100%，超预期额外奖励', status: '待执行' });
    if (type === 'creator-low') this.companyState.contracts.push({ id, type: '创作者稳定合约', company: c.name, terms: '每月固定稿酬 + 5%作品收益分成', signedAt: this.phoneDateText?.() || '' });
    if (type === 'creator-high') this.companyState.contracts.push({ id, type: '创作者高分成合约', company: c.name, terms: '少量月钱 + 30%作品收益分成', signedAt: this.phoneDateText?.() || '' });
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
