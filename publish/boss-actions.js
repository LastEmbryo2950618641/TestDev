window.GameModules = window.GameModules || {};

window.GameModules.bossActions = {
  initBossRecruitment() {
    const base = window.GameModules.bossRecruitment.defaultBossState(this.playerProfile || {});
    this.bossState = { ...base, ...(this.bossState || {}) };
    this.bossState.filters = { ...base.filters, ...(this.bossState.filters || {}) };
    this.bossState.jobs = this.bossState.jobs || [];
    this.bossState.pageSize = Number(this.bossState.pageSize) || 10;
    this.bossState.randomSeed = Number(this.bossState.randomSeed) || 0;
    this.bossState.customPrompt = this.bossState.customPrompt || '';
    this.bossState.usePlayerFit = Boolean(this.bossState.usePlayerFit);
  },

  openBossApp() {
    this.initBossRecruitment();
    this.identityAppOpen = false; this.wechatAppOpen = false; this.saveAppOpen = false;
    if (this.companyState) this.companyState.open = false;
    if (this.calendarState) this.calendarState.open = false;
    if (this.factionState) this.factionState.open = false;
    if (this.skillsState) this.skillsState.open = false;
    if (this.knownProfessionState) this.knownProfessionState.open = false;
    if (this.promptState) this.promptState.open = false;
    if (this.tokenStatsState) this.tokenStatsState.open = false;
    Object.assign(this.bossState, { companyDetailOpen: false, detailJobId: '', applyMessage: '', generating: false, open: true });
    this.desktopUnlocked = true;
    if (!this.currentBossJobs().length) this.randomBossJobs();
  },

  closeBossApp() {
    if (this.bossState) {
      this.bossState.open = false;
      this.clearBossCache();
      this.save?.();
    }
    this.closeAppToDesktop();
  },

  clearBossCache() {
    Object.assign(this.bossState, { companyDetailOpen: false, detailJobId: '', applyMessage: '', generating: false, jobs: [], selectedJobId: '' });
    this.bossState.requestId = (this.bossState.requestId || 0) + 1;
  },

  randomBossJobs() {
    this.initBossRecruitment();
    if (this.bossState.generating) return;
    this.bossState.randomSeed = Date.now();
    Object.assign(this.bossState, { jobs: [], selectedJobId: '', companyDetailOpen: false, detailJobId: '', applyMessage: '' });
    this.generateBossJobsByAI?.();
  },

  toggleBossPlayerFit() {
    this.initBossRecruitment();
    this.bossState.usePlayerFit = !this.bossState.usePlayerFit;
    this.randomBossJobs();
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

  bossAddressParts(address = '') { const parts = String(address).split(/\s+/).filter(Boolean); return { province: parts[0] || '', city: parts[1] || '', county: parts[2] || '', town: parts[3] || '' }; },
  filteredBossJobs() { this.initBossRecruitment(); return this.bossState.jobs.filter((job) => this.bossMatchesJob(job, this.bossState.filters)); },
  currentBossJobs() { return this.bossState.jobs.filter((job) => this.bossMatchesJob(job, this.bossState.filters)); },

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
    this.bossState.applyMessage = '';
    this.selectBossJob(id);
  },

  closeBossCompanyDetail() {
    if (!this.bossState) return;
    this.bossState.companyDetailOpen = false;
    this.bossState.detailJobId = '';
    this.bossState.applyMessage = '';
  },

  selectedBossJob() {
    this.initBossRecruitment();
    return this.bossState.jobs.find((job) => job.id === this.bossState.selectedJobId) || this.currentBossJobs()[0] || null;
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
      row('workMode', '岗位类型', job.payType, '员工、创作者、定时工三类岗位类型。'),
      row('jobTitle', '招聘职位', job.title, '具体岗位名称，例如软件开发工程师、前端开发工程师。'),
      row('skills', '职业技能要求', (job.skills || []).join('、'), '申请该岗位需要具备的技能或职业才能。'),
      row('matchProfessions', '匹配玩家职业', this.bossMatchText(job, 'matchProfessions'), 'AI根据玩家已有职业推断出的岗位匹配项；没有匹配则为空。'),
      row('matchSkills', '匹配玩家技能', this.bossMatchText(job, 'matchSkills'), 'AI根据玩家已有技能推断出的岗位匹配项；没有匹配则为空。'),
      row('matchKnowledge', '匹配玩家知识', this.bossMatchText(job, 'matchKnowledge'), 'AI根据玩家已有知识推断出的岗位匹配项；没有匹配则为空。'),
      row('salary', '薪酬制度', this.bossJobPayText(job), '按当前招聘岗位给出的薪酬规则。'),
    ];
  },

  bossMatchText(job, key) {
    const list = Array.isArray(job?.[key]) ? job[key] : [];
    return list.length ? list.join('、') : '';
  },

  bossMatchSummary(job) {
    const items = [this.bossMatchText(job, 'matchProfessions'), this.bossMatchText(job, 'matchSkills'), this.bossMatchText(job, 'matchKnowledge')].filter(Boolean);
    return items.length ? `匹配：${items.join('｜')}` : '';
  },

  bossApplyButtonText(job = this.selectedBossCompanyJob()) {
    if (!job) return '申请岗位';
    if (job.payType === '创作者') return '投稿并约定通知时间';
    if (job.payType === '定时工') return '提交小时工到岗预约';
    return '申请岗位并约定面试';
  },

  bossApplyHint(job = this.selectedBossCompanyJob()) {
    if (!job) return '';
    if (job.payType === '创作者') return '投递作品后，系统会约定通知时间。';
    if (job.payType === '定时工') return '填写需要工作小时数，并约定正式到岗上班时间。';
    return '投递简历后，系统会约定面试时间。';
  },

  applyBossJob() {
    const job = this.selectedBossCompanyJob();
    if (!job) return;
    const event = this.createBossAppointment(job);
    this.addCalendarEvent?.(event);
    this.bossState.applyMessage = `已录入日历：${event.title}`;
    this.save?.();
  },

  createBossAppointment(job) {
    const now = this.phoneDate?.() || new Date();
    const hours = Math.max(Number(this.bossState.applyHours) || 1, 1);
    const time = new Date(now.getTime() + (job.payType === '创作者' ? 48 : 24) * 60 * 60 * 1000);
    const type = job.payType === '创作者' ? '投稿通知' : job.payType === '定时工' ? '到岗上班' : '面试';
    const title = `${job.company}｜${job.title}｜${type}`;
    const note = job.payType === '定时工' ? `预约${hours}小时，${this.bossJobPayText(job)}` : this.bossJobPayText(job);
    return { title, type, time: time.toISOString(), company: job.company, jobTitle: job.title, note };
  },

  bossJobPayText(job) {
    if (!job) return '未选择职位';
    if (job.payType === '员工') return `底薪${job.base}元｜年底${job.performanceMonths}个月底薪绩效`;
    if (job.creatorPay === '提成制度') return `${job.level}｜全勤底薪${job.base}元｜提成${job.royalty}`;
    if (job.creatorPay === '一次性买断') return `买断价${job.buyout}`;
    return `${job.hourly}元/小时｜做完即走`;
  },
};
