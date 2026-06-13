window.GameModules = window.GameModules || {};

window.GameModules.bossAiActions = {
  async generateBossJobsByAI() {
    this.initBossRecruitment();
    if (this.bossState.generating) return;
    this.bossState.generating = true;
    this.bossState.generationError = '';
    const requestId = (this.bossState.requestId || 0) + 1;
    this.bossState.requestId = requestId;
    try {
      const text = await this.requestBossJobsText();
      if (requestId !== this.bossState.requestId) return;
      const jobs = this.parseBossJobs(text);
      this.bossState.jobs = jobs.length ? jobs : window.GameModules.bossRecruitment.defaultBossJobs(this.playerProfile || {});
      this.bossState.selectedJobId = this.bossState.jobs[0]?.id || '';
      this.setBossPage(1);
      this.save?.();
    } catch (err) {
      if (requestId !== this.bossState.requestId) return;
      console.error('AI生成招聘岗位失败:', err.code, err.message, err.stack);
      this.bossState.generationError = 'AI生成失败，请稍后重试，当前保留已有岗位。';
    } finally {
      if (requestId === this.bossState.requestId) this.bossState.generating = false;
    }
  },

  async requestBossJobsText() {
    let buffer = '';
    await window.dzmm.completions({
      model: this.modelId || 'nalang-turbo-0826',
      maxTokens: 1800,
      messages: [{ role: 'user', content: this.bossJobsPrompt() }],
    }, (content, done) => {
      buffer += content;
      if (done) this.bossState.generationDoneAt = this.phoneDateText?.() || '';
    });
    return buffer;
  },

  bossJobsPrompt() {
    const f = this.bossState.filters;
    return `请模拟现实中的BOSS招聘，根据筛选条件生成12个岗位，只返回JSON数组，不要Markdown。字段：id,title,company,industry,scale,address,payType,base,performanceMonths,creatorPay,level,royalty,buyout,hourly,desc。筛选：公司领域=${f.industry || '不限'}；规模=${f.scale || '不限'}；地址=${[f.province, f.city, f.county, f.town].filter(Boolean).join(' ') || '不限'}；薪酬类型=${f.payType || '不限'}；底薪=${f.baseMin || '不限'}-${f.baseMax || '不限'}；年底提成月数=${f.performanceMonths || '不限'}；创作者薪酬=${f.creatorPay || '不限'}；签约等级=${f.creatorLevel || '不限'}。规则：员工有底薪和performanceMonths；创作者提成制度有level、base、royalty；买断有buyout；定时工有hourly。`;
  },

  parseBossJobs(text) {
    try {
      const clean = String(text || '').replace(/```json|```/g, '').trim();
      const start = clean.indexOf('[');
      const end = clean.lastIndexOf(']');
      const raw = JSON.parse(start >= 0 && end >= start ? clean.slice(start, end + 1) : clean);
      return Array.isArray(raw) ? raw.map((job, index) => this.normalizeBossJob(job, index)).filter(Boolean) : [];
    } catch (err) {
      console.error('解析AI招聘岗位失败:', err.message, err.stack);
      return [];
    }
  },

  normalizeBossJob(job, index) {
    if (!job?.title || !job?.company) return null;
    return {
      id: String(job.id || `ai-job-${Date.now()}-${index}`), title: String(job.title), company: String(job.company),
      industry: String(job.industry || this.bossState.filters.industry || '现代服务业'),
      scale: String(job.scale || this.bossState.filters.scale || '20-50人'),
      address: String(job.address || '四川省 成都市 武侯区 玉林街道'), payType: String(job.payType || this.bossState.filters.payType || '员工'),
      base: Number(job.base) || 0, performanceMonths: Number(job.performanceMonths) || 0,
      creatorPay: job.creatorPay || '', level: job.level || '', royalty: job.royalty || '', buyout: job.buyout || '', hourly: Number(job.hourly) || 0,
      desc: String(job.desc || '岗位详情待面谈。'),
    };
  },
};
