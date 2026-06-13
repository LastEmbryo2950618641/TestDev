window.GameModules = window.GameModules || {};

window.GameModules.bossActions = {
  initBossRecruitment() {
    const base = window.GameModules.bossRecruitment.defaultBossState(this.playerProfile || {});
    this.bossState = { ...base, ...(this.bossState || {}) };
    this.bossState.filters = { ...base.filters, ...(this.bossState.filters || {}) };
    this.bossState.jobs = this.bossState.jobs?.length ? this.bossState.jobs : base.jobs;
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
    const f = this.bossState.filters;
    return this.bossState.jobs.filter((job) => this.bossMatchesJob(job, f));
  },

  pagedBossJobs() {
    const jobs = this.filteredBossJobs();
    const size = Number(this.bossState.pageSize) || 10;
    const page = Math.min(Math.max(Number(this.bossState.page) || 1, 1), this.bossPageCount());
    if (page !== this.bossState.page) this.bossState.page = page;
    return jobs.slice((page - 1) * size, page * size);
  },

  bossPageCount() {
    const size = Number(this.bossState?.pageSize) || 10;
    const total = this.bossState?.jobs?.filter((job) => this.bossMatchesJob(job, this.bossState.filters || {})).length || 0;
    return Math.max(1, Math.ceil(total / size));
  },

  bossPageNumbers() {
    const count = this.bossPageCount();
    return Array.from({ length: Math.min(5, count) }, (_, i) => i + 1);
  },

  setBossPage(page) {
    this.bossState.page = Math.min(Math.max(Number(page) || 1, 1), this.bossPageCount());
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

  selectedBossJob() {
    this.initBossRecruitment();
    return this.bossState.jobs.find((job) => job.id === this.bossState.selectedJobId) || this.filteredBossJobs()[0] || null;
  },

  bossJobPayText(job) {
    if (!job) return '未选择职位';
    if (job.payType === '员工') return `底薪${job.base}元｜年底${job.performanceMonths}个月底薪绩效`;
    if (job.creatorPay === '提成制度') return `${job.level}｜全勤底薪${job.base}元｜提成${job.royalty}`;
    if (job.creatorPay === '一次性买断') return `买断价${job.buyout}`;
    return `${job.hourly}元/小时｜做完即走`;
  },
};
