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
    return this.companyState.companies.find((item) => item.id === this.companyState.currentCompanyId) || this.companyState.companies[0];
  },

  companyFields() {
    const c = this.currentCompany();
    const salary = c.salary || {};
    const work = c.workMode || {};
    const row = (key, label, value, desc) => ({ key: `company-${key}`, label, kind: '公司词条', value: value || '未设定', raw: value || '', desc, worldTag: '2026 现代都市现实世界', targetType: '非角色', commonField: true });
    return [
      row('name', '公司名称', c.name, '固化公司名称，避免现实推演前后不一致。'),
      row('type', '公司类型', c.type, '公司、工作室、个体户、学校/机构等组织类型。'),
      row('industry', '所属行业', c.industry, '公司主营行业，用于限定任务和收益来源。'),
      row('scale', '组织规模', c.scale, '公司规模影响制度严格程度与任务容量。'),
      row('location', '办公地点', c.location, '现实办公地点或登记地址。'),
      row('workMode', '招聘制度', work.type, '员工、定时工、创作者模式三类制度。'),
      row('schedule', '上班制度', `${work.schedule}｜${work.workDays}`, '员工制上班规则。'),
      row('workTime', '上班时间', `${work.startTime}-${work.endTime}`, '到点后触发上班提示。'),
      row('baseSalary', '每月工资', `${salary.monthlyBase || 0}${salary.currency || 'CNY'}`, '每月固定工资。'),
      row('commission', '月底提成', `${salary.commissionMonths || 0}月薪 × 绩效百分比`, '月底按 AI 评价与代码扣减后的绩效计算提成。'),
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
    return `本月绩效${stats.performance ?? 100}/100｜迟到${stats.lateCount || 0}次｜旷班${stats.absentCount || 0}次｜预计收入${pay.total}元`;
  },

  monthlyPayPreview() {
    const c = this.currentCompany();
    const s = c.salary || {};
    const stats = this.companyState?.workStats || {};
    const base = Number(s.monthlyBase) || 0;
    const rate = Number(stats.commissionRate) || Math.max(0, Math.min(Number(s.maxRate) || 0, (stats.performance ?? 100) / 100 * 0.18));
    const commission = Math.round(base * (Number(s.commissionMonths) || 0) * rate);
    return { base, rate, commission, total: base + commission };
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
    if (type === 'employee') this.companyState.contracts.push({ id, type: '员工', company: c.name, terms: '固定月薪 + 月底绩效提成', signedAt: this.phoneDateText?.() || '' });
    if (type === 'timed') this.companyState.submissions.push({ id, type: '定时工', company: c.name, target: '规定时间内完成单项任务', rewardRule: '不合格0，合格100%，超预期额外奖励', status: '待执行' });
    if (type === 'creator-low') this.companyState.contracts.push({ id, type: '创作者稳定合约', company: c.name, terms: '每月固定稿酬 + 5%作品收益分成', signedAt: this.phoneDateText?.() || '' });
    if (type === 'creator-high') this.companyState.contracts.push({ id, type: '创作者高分成合约', company: c.name, terms: '少量月钱 + 30%作品收益分成', signedAt: this.phoneDateText?.() || '' });
    this.save?.();
  },

  openCompanyApp() {
    this.initCompanySystem();
    this.identityAppOpen = false;
    this.wechatAppOpen = false;
    this.companyState.open = true;
    this.desktopUnlocked = true;
  },

  closeCompanyApp() {
    this.companyState.open = false;
    this.closeAppToDesktop();
  },
};
