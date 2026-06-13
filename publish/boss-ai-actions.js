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
    return `请模拟现实中的BOSS招聘，生成第${page}页的${count}个岗位。只返回严格JSON数组，不要Markdown，不要注释，不要尾逗号，所有键名和字符串必须使用双引号。字段：id,title,company,industry,scale,address,payType,base,performanceMonths,creatorPay,level,royalty,buyout,hourly,skills,desc。title必须是现实中的具体职位名称，禁止写“员工岗位1/创作者岗位1/定时工岗位1/岗位1”等泛称；示例：软件开发工程师、前端开发工程师、大数据开发工程师、医生、护士、法务专员、短视频编导、小说签约作者、展会协助员。筛选：公司领域=${f.industry || '不限'}；规模=${f.scale || '不限'}；地址=${[f.province, f.city, f.county, f.town].filter(Boolean).join(' ') || '不限'}；薪酬类型=${f.payType || '不限'}；底薪=${f.baseMin || '不限'}-${f.baseMax || '不限'}；年底提成月数=${f.performanceMonths || '不限'}；创作者薪酬=${f.creatorPay || '不限'}；签约等级=${f.creatorLevel || '不限'}。规则：员工有底薪和performanceMonths；创作者提成制度有level、base、royalty；买断有buyout；定时工有hourly。`;
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
    const source = String(text || '').replace(/```(?:json)?|```/gi, '').trim();
    const candidates = this.bossJsonCandidates(source);
    for (const item of candidates) {
      try {
        const raw = JSON.parse(item);
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.jobs)) return raw.jobs;
      } catch (_) {}
    }
    return this.parseBossTextJobs(source);
  },

  bossJsonCandidates(source) {
    const compact = source.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/，/g, ',').replace(/：/g, ':');
    const start = compact.indexOf('[');
    const end = compact.lastIndexOf(']');
    const arrayText = start >= 0 && end >= start ? compact.slice(start, end + 1) : compact;
    const objectStart = compact.indexOf('{');
    const objectEnd = compact.lastIndexOf('}');
    const objectText = objectStart >= 0 && objectEnd >= objectStart ? compact.slice(objectStart, objectEnd + 1) : '';
    return [arrayText, objectText].filter(Boolean).flatMap((text) => {
      const noComments = text.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
      const fixed = noComments.replace(/([{,]\s*)([A-Za-z_][\w]*)(\s*:)/g, '$1"$2"$3').replace(/,\s*([}\]])/g, '$1').replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"');
      return [noComments, fixed];
    });
  },

  parseBossTextJobs(source) {
    const chunks = source.split(/(?:^|\n)\s*(?:岗位|职位)?\s*\d+\s*[.、：:]?/).map((s) => s.trim()).filter(Boolean);
    const jobs = chunks.map((chunk, index) => this.bossJobFromText(chunk, index)).filter(Boolean);
    return jobs.length ? jobs : this.fallbackBossJobsFromAI(source);
  },

  bossJobFromText(chunk, index) {
    const pick = (...names) => {
      for (const name of names) {
        const m = chunk.match(new RegExp(`${name}\\s*[:：]\\s*([^\\n；;]+)`));
        if (m) return m[1].trim();
      }
      return '';
    };
    const title = pick('title', '岗位', '职位') || chunk.match(/(?:招聘|诚聘)([^\n，,。]{2,18})/)?.[1];
    const company = pick('company', '公司', '企业');
    if (!title || !company) return null;
    return {
      title, company,
      industry: pick('industry', '行业', '领域'), scale: pick('scale', '规模', '人数'),
      address: pick('address', '地址', '地点'), payType: pick('payType', '薪酬类型', '类型'),
      base: Number(pick('base', '底薪').match(/\d+/)?.[0]) || 0,
      performanceMonths: Number(pick('performanceMonths', '绩效月数', '年底提成月数').match(/\d+/)?.[0]) || 0,
      creatorPay: pick('creatorPay', '薪酬制度'), level: pick('level', '签约等级'), royalty: pick('royalty', '提成'),
      buyout: pick('buyout', '买断'), hourly: Number(pick('hourly', '时薪', '小时薪酬').match(/\d+/)?.[0]) || 0,
      desc: pick('desc', '描述', '详情') || chunk.slice(0, 90), id: `ai-text-${Date.now()}-${index}`,
    };
  },

  fallbackBossJobsFromAI(source) {
    const f = this.bossState.filters || {};
    const count = Number(this.bossState.pageSize) || 10;
    const industries = [f.industry || '互联网服务', '内容文娱', '本地生活', '数字营销'];
    const payTypes = f.payType ? [f.payType] : ['员工', '创作者', '定时工'];
    const titles = { 员工: ['软件开发工程师', '前端开发工程师', '大数据开发工程师', '医生', '法务专员'], 创作者: ['小说签约作者', '短视频编导', '漫画主笔', '剧情策划', '游戏文案作者'], 定时工: ['展会协助员', '资料整理员', '门店临时导购', '仓库分拣员', '活动执行助理'] };
    return Array.from({ length: count }, (_, i) => {
      const payType = payTypes[i % payTypes.length];
      const typeTitles = titles[payType] || titles.员工;
      const company = `AI优选${industries[i % industries.length]}公司${i + 1}`;
      const title = typeTitles[i % typeTitles.length];
      return { id: `ai-fallback-${Date.now()}-${i}`, title, company, industry: industries[i % industries.length], scale: f.scale || '20-50人', address: [f.province || '四川省', f.city || '成都市', f.county || '武侯区', f.town || '玉林街道'].join(' '), payType, base: Number(f.baseMin) || 6000 + i * 500, performanceMonths: Number(f.performanceMonths) || 2, creatorPay: f.creatorPay || (payType === '创作者' ? '提成制度' : ''), level: f.creatorLevel || 'A级', royalty: '8%-15%', buyout: '1000-5000元/篇', hourly: 20 + i, desc: source.slice(0, 80) || 'AI已按当前筛选补齐岗位。' };
    });
  },

  normalizeBossTitle(job, index) {
    const raw = String(job.title || '').trim();
    if (raw && !/^(员工|创作者|定时工)?岗位\d*$/.test(raw)) return raw;
    const titles = job.payType === '创作者' ? ['小说签约作者', '短视频编导', '漫画主笔'] : job.payType === '定时工' ? ['展会协助员', '仓库分拣员', '活动执行助理'] : ['软件开发工程师', '前端开发工程师', '大数据开发工程师', '医生', '法务专员'];
    return titles[Number(String(index).split('-').pop()) % titles.length];
  },

  defaultBossSkills(job) {
    const title = String(job.title || '岗位');
    if (/前端|软件|开发|工程师/.test(title)) return ['JavaScript', '页面开发', '问题排查'];
    if (/运营|内容/.test(title)) return ['内容策划', '数据整理', '沟通执行'];
    if (job.payType === '创作者') return ['作品创作', '按要求投稿', '版权沟通'];
    if (job.payType === '定时工') return ['准时到岗', '基础执行', '现场配合'];
    return ['岗位基础技能', '沟通协作'];
  },

  normalizeBossJob(job, index) {
    if (!job?.title || !job?.company) return null;
    const title = this.normalizeBossTitle(job, index);
    const idSeed = `${job.company}-${title}-${index}`.replace(/\s+/g, '-');
    return {
      id: String(job.id || `ai-job-${idSeed}`), title, company: String(job.company),
      industry: String(job.industry || this.bossState.filters.industry || '现代服务业'),
      scale: String(job.scale || this.bossState.filters.scale || '20-50人'),
      address: String(job.address || '四川省 成都市 武侯区 玉林街道'), payType: String(job.payType || this.bossState.filters.payType || '员工'),
      base: Number(job.base) || 0, performanceMonths: Number(job.performanceMonths) || 0,
      skills: Array.isArray(job.skills) ? job.skills.map(String) : this.defaultBossSkills(job),
      creatorPay: job.creatorPay || '', level: job.level || '', royalty: job.royalty || '', buyout: job.buyout || '', hourly: Number(job.hourly) || 0,
      desc: String(job.desc || '岗位详情待面谈。'),
    };
  },
};
