window.GameModules = window.GameModules || {};

window.GameModules.bossAiActions = {
  async generateBossJobsByAI(page = this.bossState?.page || 1) {
    this.initBossRecruitment();
    if (this.bossState.generating) return;
    const targetPage = Math.max(Number(page) || 1, 1);
    const key = this.bossCacheKey(targetPage);
    if ((this.bossState.jobCache[key] || []).length >= this.bossState.pageSize) return;
    this.bossState.generating = true;
    this.bossState.generationError = '';
    const requestId = (this.bossState.requestId || 0) + 1;
    this.bossState.requestId = requestId;
    try {
      const text = await this.requestBossJobsText(targetPage);
      if (requestId !== this.bossState.requestId) return;
      const jobs = this.parseBossJobs(text).slice(0, this.bossState.pageSize);
      if (!jobs.length) throw new Error('AI未返回可用岗位');
      this.cacheBossJobs(targetPage, jobs);
      this.bossState.selectedJobId = this.pagedBossJobs()[0]?.id || '';
      this.save?.();
    } catch (err) {
      if (requestId !== this.bossState.requestId) return;
      console.error('AI生成招聘岗位失败:', err.code, err.message, err.stack);
      this.bossState.generationError = 'AI生成失败，请稍后重试。';
    } finally {
      if (requestId === this.bossState.requestId) this.bossState.generating = false;
    }
  },

  async requestBossJobsText(page) {
    let buffer = '';
    await window.dzmm.completions({
      model: this.modelId || 'nalang-turbo-0826',
      maxTokens: 2200,
      messages: [{ role: 'user', content: this.bossJobsPrompt(page) }],
    }, (content, done) => {
      if (this.bossState.requestId) buffer += content;
      if (done) this.bossState.generationDoneAt = this.phoneDateText?.() || '';
    });
    return buffer;
  },

  bossJobsPrompt(page) {
    const f = this.bossState.filters;
    const count = Number(this.bossState.pageSize) || 10;
    return `请模拟现实中的BOSS招聘，生成第${page}页的${count}个岗位。只返回严格JSON数组，不要Markdown，不要注释，不要尾逗号，所有键名和字符串必须使用双引号。字段：id,title,company,industry,scale,address,payType,base,performanceMonths,creatorPay,level,royalty,buyout,hourly,desc。筛选：公司领域=${f.industry || '不限'}；规模=${f.scale || '不限'}；地址=${[f.province, f.city, f.county, f.town].filter(Boolean).join(' ') || '不限'}；薪酬类型=${f.payType || '不限'}；底薪=${f.baseMin || '不限'}-${f.baseMax || '不限'}；年底提成月数=${f.performanceMonths || '不限'}；创作者薪酬=${f.creatorPay || '不限'}；签约等级=${f.creatorLevel || '不限'}。规则：员工有底薪和performanceMonths；创作者提成制度有level、base、royalty；买断有buyout；定时工有hourly。`;
  },

  bossCacheKey(page) {
    const f = this.bossState.filters || {};
    return `${page}|${['industry', 'scale', 'province', 'city', 'county', 'town', 'payType', 'baseMin', 'baseMax', 'performanceMonths', 'creatorPay', 'creatorLevel'].map((k) => f[k] || '').join('|')}`;
  },

  cacheBossJobs(page, jobs) {
    const key = this.bossCacheKey(page);
    const normalized = jobs.map((job, index) => this.normalizeBossJob(job, `${page}-${index}`)).filter(Boolean);
    this.bossState.jobCache[key] = normalized;
    const seen = new Set();
    this.bossState.jobs = Object.values(this.bossState.jobCache).flat().filter((job) => {
      if (seen.has(job.id)) return false;
      seen.add(job.id);
      return true;
    });
  },

  parseBossJobs(text) {
    const source = String(text || '').replace(/```(?:json)?|```/g, '').trim();
    const start = source.indexOf('[');
    const end = source.lastIndexOf(']');
    const body = start >= 0 && end >= start ? source.slice(start, end + 1) : source;
    const variants = [body, body.replace(/([{,]\s*)([A-Za-z_][\w]*)(\s*:)/g, '$1"$2"$3').replace(/,\s*([}\]])/g, '$1').replace(/'/g, '"')];
    for (const item of variants) {
      try {
        const raw = JSON.parse(item);
        return Array.isArray(raw) ? raw : [];
      } catch (err) {
        console.error('解析AI招聘岗位失败:', err.message, err.stack);
      }
    }
    return [];
  },

  normalizeBossJob(job, index) {
    if (!job?.title || !job?.company) return null;
    const idSeed = `${job.company}-${job.title}-${index}`.replace(/\s+/g, '-');
    return {
      id: String(job.id || `ai-job-${idSeed}`), title: String(job.title), company: String(job.company),
      industry: String(job.industry || this.bossState.filters.industry || '现代服务业'),
      scale: String(job.scale || this.bossState.filters.scale || '20-50人'),
      address: String(job.address || '四川省 成都市 武侯区 玉林街道'), payType: String(job.payType || this.bossState.filters.payType || '员工'),
      base: Number(job.base) || 0, performanceMonths: Number(job.performanceMonths) || 0,
      creatorPay: job.creatorPay || '', level: job.level || '', royalty: job.royalty || '', buyout: job.buyout || '', hourly: Number(job.hourly) || 0,
      desc: String(job.desc || '岗位详情待面谈。'),
    };
  },
};
