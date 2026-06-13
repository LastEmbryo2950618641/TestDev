window.GameModules = window.GameModules || {};

window.GameModules.bossAiActions = {
  async generateBossJobsByAI(page = 1, force = false) {
    this.initBossRecruitment();
    if (this.bossState.generating) return;
    this.bossState.generating = true;
    this.bossState.generationError = '';
    const requestId = (this.bossState.requestId || 0) + 1;
    this.bossState.requestId = requestId;
    try {
      const text = await Promise.race([
        this.requestBossJobsText(page),
        new Promise((resolve) => setTimeout(() => resolve(''), 35000)),
      ]);
      if (requestId !== this.bossState.requestId) return;
      const jobs = this.parseBossJobs(text).slice(0, this.bossState.pageSize);
      if (!jobs.length) jobs.push(...this.fallbackBossJobsFromAI(text || 'AI响应超时，已本地补齐岗位'));
      this.cacheBossJobs(page, jobs);
      this.bossState.selectedJobId = this.currentBossJobs()[0]?.id || '';
      this.save?.();
    } catch (err) {
      if (requestId !== this.bossState.requestId) return;
      console.error('AI生成招聘岗位失败:', err.code, err.message, err.stack);
      this.cacheBossJobs(page, this.fallbackBossJobsFromAI(err.message || 'AI生成失败，已本地补齐岗位'));
      this.bossState.selectedJobId = this.currentBossJobs()[0]?.id || '';
      this.bossState.generationError = 'AI生成暂时不可用，已用本地岗位补齐当前随机列表。';
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

  bossJobsPrompt() {
    const f = this.bossState.filters;
    const count = Number(this.bossState.pageSize) || 10;
    const area = [f.province, f.city, f.county, f.town].filter(Boolean).join(' ') || '不限';
    const player = this.bossState.usePlayerFit ? this.bossPlayerFitPrompt() : '不按玩家能力定向，保持市场随机性。';
    const custom = String(this.bossState.customPrompt || '').trim() || '无';
    return `请模拟现实中的BOSS招聘，随机生成${count}个互不重复的岗位。只返回严格JSON数组，不要Markdown，不要注释，不要尾逗号，所有键名和字符串必须使用双引号。字段：id,title,company,industry,scale,address,payType,base,performanceMonths,creatorPay,level,royalty,buyout,hourly,skills,desc。必须覆盖多个合理领域：互联网/软件/AI/数据、医疗/医院/健康、教育/培训、法律/合规、金融/会计、制造/工程、物流/供应链、零售/本地生活、内容/文娱、酒店/旅游/公共服务；若筛选指定公司领域，则只生成该领域。title必须是具体职位名称，禁止“岗位1/员工岗位/创作者岗位/定时工岗位”等泛称。行业匹配必须严格合理：互联网/软件/科技只生成开发、测试、产品、设计、运维、数据等；医疗/医院/健康才可生成医生、护士、药师、康复、检验等；法律才可生成律师、法务、合规；教育才可生成教师、教研、课程顾问；金融才可生成会计、审计、风控、理财顾问；制造才可生成机械、电气、质检、工艺工程师；内容/文娱可生成小说签约作者、短视频编导、漫画主笔。筛选：公司领域=${f.industry || '不限'}；规模=${f.scale || '不限'}；地址=${area}；薪酬类型=${f.payType || '不限'}；底薪=${f.baseMin || '不限'}-${f.baseMax || '不限'}；年底绩效月数=${f.performanceMonths || '不限'}；创作者薪酬=${f.creatorPay || '不限'}；签约等级=${f.creatorLevel || '不限'}。玩家适配要求：${player}。玩家自定义要求：${custom}。规则：员工必须有base和performanceMonths；创作者提成制度必须有level、base、royalty；一次性买断必须有buyout；定时工必须有hourly；skills数组给出3-5项真实技能；desc说明职责、工作方式和合理薪酬原因。随机种子=${this.bossState.randomSeed || Date.now()}。`;
  },

  bossPlayerFitPrompt() {
    const p = this.playerProfile || {};
    const fields = this.playerProfileLexiconFields?.().filter((x) => ['现实身份', '工作阵营', '阵营地位', '世界观补全', '备注'].includes(x.label)).map((x) => `${x.label}:${x.value}`).join('；') || '';
    return `优先生成与玩家知识、技能、职业相匹配的可选职位，但仍保留少量跨领域机会。玩家资料：姓名=${p.name || this.playerName || '玩家'}；职业/身份=${p.refinedRole || p.dailyRole || '未知'}；所在地=${p.refinedCity || p.city || '未知'}；${fields}`;
  },

  cacheBossJobs(page, jobs) {
    this.bossState.jobs = jobs.map((job, index) => this.normalizeBossJob(job, `${page}-${index}`)).filter(Boolean);
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
    const industries = f.industry ? [f.industry] : ['互联网软件', '医疗健康', '教育培训', '法律合规', '金融会计', '智能制造', '物流供应链', '本地生活', '内容文娱', '酒店旅游'];
    const payTypes = f.payType ? [f.payType] : ['员工', '创作者', '定时工'];
    return Array.from({ length: count }, (_, i) => {
      const industry = industries[(i + (this.bossState.randomSeed || 0)) % industries.length];
      const payType = payTypes[i % payTypes.length];
      const title = this.fallbackBossTitle(industry, payType, i);
      return { id: `ai-fallback-${Date.now()}-${i}`, title, company: `${industry}优选公司${i + 1}`, industry, scale: f.scale || ['20-50人', '50-150人', '150-500人'][i % 3], address: [f.province || '四川省', f.city || '成都市', f.county || '武侯区', f.town || '玉林街道'].join(' '), payType, base: Number(f.baseMin) || 5000 + i * 700, performanceMonths: Number(f.performanceMonths) || 1 + (i % 3), creatorPay: f.creatorPay || (payType === '创作者' ? (i % 2 ? '一次性买断' : '提成制度') : ''), level: f.creatorLevel || ['C级', 'B级', 'A级'][i % 3], royalty: '8%-18%', buyout: '800-6000元/篇', hourly: 22 + i * 2, desc: source.slice(0, 80) || 'AI暂不可用，已按真实行业与筛选随机补齐岗位。' };
    });
  },

  fallbackBossTitle(industry, payType, index) {
    const map = { 创作者: ['小说签约作者', '短视频编导', '漫画主笔', '课程脚本作者'], 定时工: ['展会协助员', '仓库分拣员', '门店临时导购', '酒店宴会小时工'] };
    if (map[payType]) return map[payType][index % map[payType].length];
    const pairs = [[/医疗|医院|健康/, ['护士', '药师', '康复治疗师', '医学检验员']], [/教育|培训/, ['数学教师', '教研员', '课程顾问', '助教']], [/法律|合规/, ['法务专员', '合规专员', '律师助理']], [/金融|会计/, ['会计', '审计助理', '风控专员']], [/制造|工程/, ['机械工程师', '电气工程师', '质检工程师']], [/物流|供应链/, ['物流调度员', '供应链专员', '仓储主管']]];
    const found = pairs.find(([re]) => re.test(industry))?.[1] || ['软件开发工程师', '前端开发工程师', '数据分析师', '产品经理', '测试工程师'];
    return found[index % found.length];
  },

  normalizeBossTitle(job, index) {
    const raw = String(job.title || '').trim();
    const invalid = /^(员工|创作者|定时工)?岗位\d*$/.test(raw) || this.titleMismatchesIndustry(raw, job.industry);
    if (raw && !invalid) return raw;
    const titles = this.industryBossTitles(job);
    return titles[Number(String(index).split('-').pop()) % titles.length];
  },

  titleMismatchesIndustry(title, industry = '') {
    const text = `${industry} ${this.bossState.filters?.industry || ''}`;
    if (/互联网|软件|科技|数字|营销/.test(text) && /医生|护士|药师|教师|律师|会计|机械|电气/.test(title)) return true;
    if (/医疗|医院|健康/.test(text)) return !/医生|护士|药师|康复|检验/.test(title);
    if (/法律|律所|法务|合规/.test(text)) return !/律师|法务|合规|法律/.test(title);
    if (/教育|学校|培训/.test(text)) return !/教师|教研|课程|助教/.test(title);
    if (/金融|会计|银行|证券/.test(text)) return !/会计|审计|风控|理财|金融/.test(title);
    if (/制造|工程|工厂/.test(text)) return !/机械|电气|质检|工艺|工程师/.test(title);
    return false;
  },

  industryBossTitles(job) {
    const industry = `${job.industry || ''} ${this.bossState.filters?.industry || ''}`;
    if (job.payType === '创作者') return ['小说签约作者', '短视频编导', '漫画主笔', '剧情策划'];
    if (job.payType === '定时工') return ['展会协助员', '资料整理员', '仓库分拣员', '活动执行助理'];
    if (/医疗|医院|健康/.test(industry)) return ['医生', '护士', '药师', '医学检验员'];
    if (/法律|律所|法务|合规/.test(industry)) return ['法务专员', '律师助理', '合规专员'];
    if (/教育|学校|培训/.test(industry)) return ['教师', '课程顾问', '教研员'];
    if (/金融|会计|银行|证券/.test(industry)) return ['会计', '审计助理', '风控专员', '理财顾问'];
    if (/制造|工程|工厂/.test(industry)) return ['机械工程师', '电气工程师', '质检工程师', '工艺工程师'];
    if (/物流|供应链/.test(industry)) return ['物流调度员', '供应链专员', '仓储主管'];
    return ['软件开发工程师', '前端开发工程师', '大数据开发工程师', '产品经理', '测试工程师'];
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
