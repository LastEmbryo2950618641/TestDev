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
    const hit = this.playerWealthOptions().find((item) => item.tier === tier);
    return hit ? hit.amount : 0;
  },

  playerWealthSource(tier = '', amount = 0, source = '') {
    const current = String(source || '').trim();
    if (current) return current;
    const money = Number(amount) || this.playerWealthDefaultAmount(tier);
    if (tier === '富裕' || tier === '富豪') return `父母留下的全部遗产：父母公司濒临破产时被出售，清算后留下约${money}元现金资产。`;
    if (tier === '中产') return `主要来自父母遗产与本人长期工作/学习期间积累，当前可支配资产约${money}元。`;
    if (tier === '贫穷') return `少量父母遗产或家庭余款，加上本人零散收入，当前可支配资产约${money}元。`;
    return '无稳定财富积累，父母遗产与本人收入均不足以形成可支配资产。';
  },

  normalizePlayerWealth(profile = {}) {
    const options = this.playerWealthOptions();
    const tier = options.some((item) => item.tier === profile.wealthTier) ? profile.wealthTier : '流浪';
    const hasAmount = profile.wealthAmount !== '' && profile.wealthAmount !== null && profile.wealthAmount !== undefined;
    const amount = hasAmount && Number.isFinite(Number(profile.wealthAmount)) ? Number(profile.wealthAmount) : this.playerWealthDefaultAmount(tier);
    return {
      wealthTier: tier,
      wealthAmount: amount,
      wealthSource: this.playerWealthSource(tier, amount, profile.wealthSource),
    };
  },

  syncPlayerWealthDefaults() {
    const tier = this.playerProfile?.wealthTier || '流浪';
    const amount = this.playerWealthDefaultAmount(tier);
    Object.assign(this.playerProfile, { wealthTier: tier, wealthAmount: amount, wealthSource: this.playerWealthSource(tier, amount, '') });
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
      row('财富来源', p.wealthSource, '玩家财富来自父母遗产与本人收入的构成说明。'),
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
