window.GameModules = window.GameModules || {};
window.GameModules.playerSetupActions = window.GameModules.playerSetupActions || {};
const setupActions = window.GameModules.playerSetupActions;
const basePlayerProfileLexiconFields = setupActions.playerProfileLexiconFields;
const baseNormalizePlayerSetupBase = setupActions.normalizePlayerSetupBase;
const baseNormalizeEnrichedPlayerProfile = setupActions.normalizeEnrichedPlayerProfile;
Object.assign(setupActions, {
  playerWealthOptions() {
    return [
      { tier: '流浪', amount: 0 },
      { tier: '贫穷', amount: 10000 },
      { tier: '中产', amount: 500000 },
      { tier: '富裕', amount: 5000000 },
      { tier: '富豪', amount: 100000000 },
    ];
  },

  playerWealthDefaultAmount(tier = '') {
    return this.playerWealthOptions().find((item) => item.tier === tier)?.amount || 0;
  },

  playerCompanyFixedIncome(profile = {}) {
    const company = this.currentCompany?.() || this.companyState?.companies?.find((item) => item.id === this.companyState?.currentCompanyId) || null;
    const active = this.companyState?.employment?.active !== false;
    const name = profile.workplace || company?.name || '';
    const monthlyBase = Number(company?.salary?.monthlyBase || 0);
    const performanceMonths = Number(company?.salary?.performanceMonths || 0);
    const isEmployee = company?.workMode?.type === '员工' || /员工|工程师|程序|开发|运营|经理|主管/.test(`${profile.position || ''}${profile.refinedRole || profile.dailyRole || ''}`);
    if (!name || !active || !isEmployee) return { label: '公司员工薪酬绩效', amount: 0, text: '暂无固定员工收入。' };
    const text = `${name}员工固定收入：月基础薪酬${monthlyBase || '待确认'}元，年底绩效${performanceMonths || 0}个月底薪。`;
    return { label: `${name}员工薪酬绩效`, amount: 0, monthlyBase, performanceMonths, text };
  },

  playerWealthBreakdown(tier = '', amount = 0, profile = {}) {
    const total = Number(amount) || this.playerWealthDefaultAmount(tier);
    const company = this.playerCompanyFixedIncome(profile);
    if (total <= 0) return { parentInheritance: 0, previousWorkIncome: 0, companySalaryPerformance: 0, companyIncomeLabel: company.label, fixedIncome: company.text };
    if (tier === '富裕' || tier === '富豪') return { parentInheritance: Math.max(0, total - 50000), previousWorkIncome: 50000, companySalaryPerformance: 0, companyIncomeLabel: company.label, fixedIncome: company.text };
    if (tier === '中产') return { parentInheritance: Math.max(0, total - 50000), previousWorkIncome: 50000, companySalaryPerformance: 0, companyIncomeLabel: company.label, fixedIncome: company.text };
    const previous = Math.min(50000, Math.floor(total / 2));
    return { parentInheritance: Math.max(0, total - previous), previousWorkIncome: previous, companySalaryPerformance: 0, companyIncomeLabel: company.label, fixedIncome: company.text };
  },

  playerWealthSource(tier = '', amount = 0, source = '', breakdown = null) {
    const b = breakdown || this.playerWealthBreakdown(tier, amount, this.playerProfile || {});
    const parts = [`父母遗产(${b.parentInheritance || 0})`, `本人之前打工挣钱(${b.previousWorkIncome || 0})`, `${b.companyIncomeLabel || '公司员工薪酬绩效'}(${b.companySalaryPerformance || 0})`];
    const suffix = tier === '富裕' || tier === '富豪' ? '；富裕/富豪级别的父母遗产来自父母公司濒临破产时出售后的清算余款。' : '';
    return `${parts.join('，')}${suffix}`;
  },

  normalizePlayerWealth(profile = {}) {
    const tier = this.playerWealthOptions().some((item) => item.tier === profile.wealthTier) ? profile.wealthTier : '流浪';
    const hasAmount = profile.wealthAmount !== '' && profile.wealthAmount !== null && profile.wealthAmount !== undefined;
    const amount = hasAmount && Number.isFinite(Number(profile.wealthAmount)) ? Number(profile.wealthAmount) : this.playerWealthDefaultAmount(tier);
    const breakdown = this.playerWealthBreakdown(tier, amount, profile);
    return { wealthTier: tier, wealthAmount: amount, wealthBreakdown: breakdown, wealthFixedIncome: breakdown.fixedIncome, wealthSource: this.playerWealthSource(tier, amount, profile.wealthSource, breakdown) };
  },

  syncPlayerWealthDefaults() {
    const tier = this.playerProfile?.wealthTier || '流浪';
    const amount = this.playerWealthDefaultAmount(tier);
    Object.assign(this.playerProfile, this.normalizePlayerWealth({ ...this.playerProfile, wealthTier: tier, wealthAmount: amount, wealthSource: '' }));
  },

  playerWealthText(profile = this.playerProfile || {}) {
    const wealth = this.normalizePlayerWealth(profile);
    return `${wealth.wealthTier}｜${wealth.wealthAmount.toLocaleString('zh-CN')}元｜${wealth.wealthSource}`;
  },

  playerProfileLexiconFields() {
    const rows = basePlayerProfileLexiconFields.call(this);
    const p = { ...(this.playerProfile || {}), ...this.normalizePlayerWealth(this.playerProfile || {}) };
    const worldTag = window.GameModules.realWorld2026?.label || '2026 现代都市现实世界';
    const row = (name, value, desc) => window.GameModules.playerProfileLexicon.row(name, value, desc, worldTag);
    const insertAt = Math.max(0, rows.findIndex((item) => item.label === '居住状态') + 1);
    rows.splice(insertAt, 0,
      row('财富等级', p.wealthTier, '玩家当前财富阶层。'),
      row('当前财富', `${Number(p.wealthAmount || 0).toLocaleString('zh-CN')}元`, '玩家当前可支配现金资产。'),
      row('财富来源', p.wealthSource, '玩家财富来源的量化构成。'),
      row('固定收入', p.wealthFixedIncome, '玩家作为公司员工时的固定薪酬与绩效来源。'),
    );
    return rows;
  },

  normalizePlayerSetupBase(name, birthday) {
    const base = baseNormalizePlayerSetupBase.call(this, name, birthday);
    return { ...base, ...this.normalizePlayerWealth(base) };
  },

  normalizeEnrichedPlayerProfile(base, data = {}) {
    const profile = baseNormalizeEnrichedPlayerProfile.call(this, base, data);
    return { ...profile, ...this.normalizePlayerWealth(profile) };
  },
});
