window.GameModules = window.GameModules || {};

window.GameModules.bossActions = {
  initBossRecruitment() {
    const base = window.GameModules.bossRecruitment.defaultBossState(this.playerProfile || {});
    this.bossState = { ...base, ...(this.bossState || {}) };
    this.bossState.filters = { ...base.filters, ...(this.bossState.filters || {}) };
    this.bossState.jobCache = this.bossState.jobCache || {};
    this.bossState.jobs = this.bossState.jobs || [];
    this.bossState.pageSize = Number(this.bossState.pageSize) || 10;
    this.bossState.page = Math.max(Number(this.bossState.page) || 1, 1);
  },

  openBossApp() {
    this.initBossRecruitment();
    this.identityAppOpen = false;
    this.wechatAppOpen = false;
    if (this.companyState) this.companyState.open = false;
    this.bossState.open = true;
    this.desktopUnlocked = true;
    this.generateBossJobsByAI?.(this.bossState.page);
  },

  closeBossApp() {
    if (this.bossState) this.bossState.open = false;
    this.closeAppToDesktop();
  },

  bossOptions(key) {
    this.initBossRecruitment();
    const values = this.bossState.jobs.map((job) => this.bossValueFor(job, key)).filter(Boolean);
    return [...new Set(values)];
  },

  bossValueFor(job, key) {
    if (['province', 'city', 'county', 'town'].includes(key)) return this.bossAddressParts(job.address)[key];
    if (key === 'creatorLevel') return job.level;
    if (key === 'creatorPay') return job.creatorPay;
    return job[key];
  },

  bossAddressParts(address = '') {
    const parts = String(address).split(/\s+/).filter(Boolean);
    return { province: parts[0] || '', city: parts[1] || '', county: parts[2] || '', town: parts[3] || '' };
  },

  filteredBossJobs() {
    this.initBossRecruitment();
    return this.bossState.jobs.filter((job) => this.bossMatchesJob(job, this.bossState.filters));
  },

  pagedBossJobs() {
    const key = this.bossCacheKey?.(this.bossState.page);
    const cached = key ? this.bossState.jobCache[key] || [] : [];
    return cached.filter((job) => this.bossMatchesJob(job, this.bossState.filters));
  },

  bossPageCount() {
    return Math.max(1, Number(this.bossState?.page) || 1);
  },

  bossPageNumbers() {
    return [1];
  },

  setBossPage(page) {
    this.initBossRecruitment();
    this.bossState.page = Math.max(Number(page) || 1, 1);
    this.bossState.selectedJobId = this.pagedBossJobs()[0]?.id || '';
    this.generateBossJobsByAI?.(this.bossState.page);
  },

  bossHasMorePages() {
    return true;
  },

  bossMatchesJob(job, f) {
    if (f.industry && job.industry !== f.industry) return false;
    if (f.scale && job.scale !== f.scale) return false;
    if (f.payType && job.payType !== f.payType) return false;
    if (!this.bossAddressMatches(job, f)) return false;
    if (f.payType === '员工' && !this.bossEmployeeMatches(job, f)) return false;
    if (f.payType === '创作者' && !this.bossCreatorMatches(job, f)) return false;
    return true;
  },

  bossAddressMatches(job, f) {
    const p = this.bossAddressParts(job.address);
    return (!f.province || p.province === f.province) && (!f.city || p.city === f.city)
      && (!f.county || p.county === f.county) && (!f.town || p.town === f.town);
  },

  bossEmployeeMatches(job, f) {
    const min = Number(f.baseMin) || 0;
    const max = Number(f.baseMax) || Infinity;
    if (job.base < min || job.base > max) return false;
    return !f.performanceMonths || Number(job.performanceMonths) === Number(f.performanceMonths);
  },

  bossCreatorMatches(job, f) {
    if (f.creatorPay && job.creatorPay !== f.creatorPay) return false;
    return !f.creatorLevel || job.level === f.creatorLevel;
  },

  selectBossJob(id) {
    this.bossState.selectedJobId = id;
  },

  openBossCompanyDetail(id) {
    this.bossState.detailJobId = id;
    this.bossState.companyDetailOpen = true;
    this.selectBossJob(id);
  },

  selectedBossJob() {
    this.initBossRecruitment();
    return this.bossState.jobs.find((job) => job.id === this.bossState.selectedJobId) || this.pagedBossJobs()[0] || null;
  },

  selectedBossCompanyJob() {
    return this.bossState.jobs.find((job) => job.id === this.bossState.detailJobId) || this.selectedBossJob();
  },

  bossCompanyFields(job = this.selectedBossCompanyJob()) {
    if (!job) return [];
    const row = (key, label, value, desc) => ({ key: `boss-company-${key}`, label, value: value || '未设定', desc });
    return [
      row('name', '公司名称', job.company, '招聘岗位所属公司名称。'),
      row('industry', '所属行业', job.industry, '公司主营行业，与岗位筛选一致。'),
      row('scale', '组织规模', job.scale, '公司人数规模，影响制度与岗位容量。'),
      row('location', '办公地点', job.address, '现实办公地点或登记地址。'),
      row('workMode', '招聘制度', job.payType, '员工、创作者、定时工三类制度。'),
      row('salary', '薪酬制度', this.bossJobPayText(job), '按当前招聘岗位给出的薪酬规则。'),
    ];
  },

  bossJobPayText(job) {
    if (!job) return '未选择职位';
    if (job.payType === '员工') return `底薪${job.base}元｜年底${job.performanceMonths}个月底薪绩效`;
    if (job.creatorPay === '提成制度') return `${job.level}｜全勤底薪${job.base}元｜提成${job.royalty}`;
    if (job.creatorPay === '一次性买断') return `买断价${job.buyout}`;
    return `${job.hourly}元/小时｜做完即走`;
  },
};
