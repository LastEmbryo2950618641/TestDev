window.GameModules = window.GameModules || {};

window.GameModules.companyActions = {
  initCompanySystem() {
    const base = window.GameModules.companySystem.defaultState(this.playerProfile || {});
    this.companyState = { ...base, ...(this.companyState || {}) };
    this.companyState.companies = this.companyState.companies?.length ? this.companyState.companies : base.companies;
    this.syncCompanyLexicon();
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
  },

  companyFields() {
    const c = this.currentCompany();
    const salary = c.salary || {};
    const work = c.workMode || {};
    const pay = this.monthlyPayPreview();
    const row = (key, label, value, desc) => ({ key: `company-${key}`, label, kind: '公司词条', value: value || '未设定', raw: value || '', desc, worldTag: '2026 现代都市现实世界', targetType: '非角色', commonField: true });
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
    return `# 【公司系统词条】\n${fields}\n# 【本月上班状态】\n- 迟到：${stats.lateCount || 0}次\n- 旷班：${stats.absentCount || 0}次\n- 当前绩效：${stats.performance ?? 100}/100\n- 公司规则：${(c.rules || []).join('；')}`;
  },

  workStatusText() {
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

  checkWorkReminder() {
    this.initCompanySystem();
    const c = this.currentCompany();
    const work = c.workMode || {};
    if (work.type !== '员工' || this.companyState.workPromptOpen) return;
    const now = this.phoneDate?.() || new Date();
    const key = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    if (this.companyState.workStats?.lastDecisionAt === key) return;
    const [h, m] = String(work.startTime || '09:00').split(':').map(Number);
    const start = new Date(now); start.setHours(h || 9, m || 0, 0, 0);
    if (now >= start) {
      this.companyState.pendingWork = { dateKey: key, companyId: c.id, startTime: work.startTime, companyName: c.name };
      this.companyState.workPromptOpen = true;
    }
  },

  decideWorkAttendance(choice) {
    const stats = this.companyState.workStats;
    const key = this.companyState.pendingWork?.dateKey || new Date().toISOString().slice(0, 10);
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
    this.save?.();
  },

  openCompanyApp() {
    this.initCompanySystem();
    this.identityAppOpen = false;
    this.wechatAppOpen = false;
    if (this.bossState) this.bossState.open = false;
    this.companyState.open = true;
    this.desktopUnlocked = true;
  },

  closeCompanyApp() {
    this.companyState.open = false;
    this.closeAppToDesktop();
  },
};
