window.GameModules = window.GameModules || {};

window.GameModules.bossAiActions = {
  async generateBossJobsByAI() {
    this.initBossRecruitment();
    if (this.bossState.generating) return;
    Object.assign(this.bossState, { generating: true, generationError: '', requestId: (this.bossState.requestId || 0) + 1 });
    const requestId = this.bossState.requestId;
    try {
      const text = await Promise.race([this.requestBossJobsText(), new Promise((resolve) => setTimeout(() => resolve(''), 35000))]);
      if (requestId !== this.bossState.requestId) return;
      const jobs = this.parseBossJobs(text).slice(0, this.bossState.pageSize);
      if (!jobs.length) jobs.push(...this.fallbackBossJobsFromAI(text || 'AI响应超时，已本地补齐岗位'));
      this.cacheBossJobs(jobs); this.bossState.selectedJobId = this.currentBossJobs()[0]?.id || ''; this.save?.();
    } catch (err) {
      if (requestId !== this.bossState.requestId) return;
      console.error('AI生成招聘岗位失败:', err.code, err.message, err.stack);
      this.cacheBossJobs(this.fallbackBossJobsFromAI(err.message || 'AI生成失败，已本地补齐岗位'));
      this.bossState.selectedJobId = this.currentBossJobs()[0]?.id || ''; this.bossState.generationError = 'AI生成暂时不可用，已用本地岗位补齐当前随机列表。';
    } finally { if (requestId === this.bossState.requestId) this.bossState.generating = false; }
  },

  async requestBossJobsText() {
    let buffer = '';
    await window.dzmm.completions({
      model: this.modelId || 'nalang-turbo-0826',
      maxTokens: 2600,
      messages: [{ role: 'user', content: await this.bossJobsPrompt() }],
    }, (content, done) => {
      if (this.bossState.requestId) buffer += content;
      if (done) this.bossState.generationDoneAt = this.phoneDateText?.() || '';
    });
    return buffer;
  },

  bossJobsPrompt() {
    const f = this.bossState.filters, count = Number(this.bossState.pageSize) || 10, area = [f.province, f.city, f.county, f.town].filter(Boolean).join(' ') || '不限，优先玩家所在地';
    const player = this.bossState.usePlayerFit ? this.bossPlayerFitPrompt() : '关闭玩家适配：像真实招聘软件一样随机混合热门、冷门、白领、蓝领、创作者、兼职岗位。';
    return window.GameModules.promptTemplates.render('boss-jobs', { 数量: count, 玩家能力: this.bossPlayerAbilitiesPrompt(), 领域: f.industry || '不限', 规模: f.scale || '不限', 地址: area, 类型: f.payType || '不限', 底薪: `${f.baseMin || '不限'}-${f.baseMax || '不限'}`, 绩效: f.performanceMonths || '不限', 创作者薪酬: f.creatorPay || '不限', 等级: f.creatorLevel || '不限', 玩家适配: player, 玩家输入: String(this.bossState.customPrompt || '').trim() || '无', 随机种子: this.bossState.randomSeed || Date.now() });
  },

  bossPlayerFitPrompt() {
    const p = this.playerProfile || {};
    const fields = this.playerProfileLexiconFields?.().filter((x) => ['现实身份', '势力地位', '社群角色', '世界观补全', '备注'].includes(x.label)).map((x) => `${x.label}:${x.value}`).join('；') || '';
    return `开启玩家适配：优先匹配玩家能力，保留约20%跨领域机会。姓名=${p.name || this.playerName || '玩家'}；身份=${p.refinedRole || p.dailyRole || '未知'}；所在地=${p.refinedCity || p.city || '未知'}；能力=${this.bossPlayerAbilitiesPrompt()}；${fields}`;
  },
  bossPlayerAbilitiesPrompt() {
    const values = this.currentRpgState?.values || this.playerIdentityState?.()?.values || {};
    const line = (key, label) => `${label}:${(values[key] || []).slice(0, 12).map((x) => `${x.name || x}lv${x.level || 1}`).join('、') || '无'}`;
    return [line('professions', '职业'), line('skills', '技能'), line('knowledge', '知识')].join('；');
  },

  cacheBossJobs(jobs) {
    const seen = new Set();
    this.bossState.jobs = jobs.map((job, index) => this.normalizeBossJob(job, index)).filter(Boolean).filter((job) => {
      if (seen.has(job.id)) return false;
      seen.add(job.id);
      return true;
    });
    this.bossState.selectedJobId = this.currentBossJobs()[0]?.id || this.bossState.jobs[0]?.id || '';
  },

  parseBossJobs(text) {
    const source = String(text || '').replace(/```(?:json)?|```/gi, '').trim();
    for (const item of this.bossJsonCandidates(source)) try { const raw = JSON.parse(item); if (Array.isArray(raw)) return raw; if (Array.isArray(raw?.jobs)) return raw.jobs; } catch (_) {}
    return this.parseBossTextJobs(source);
  },
  bossJsonCandidates(source) {
    const compact = source.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/，/g, ',').replace(/：/g, ':');
    const start = compact.indexOf('['), end = compact.lastIndexOf(']'), objectStart = compact.indexOf('{'), objectEnd = compact.lastIndexOf('}');
    const arrayText = start >= 0 && end >= start ? compact.slice(start, end + 1) : compact, objectText = objectStart >= 0 && objectEnd >= objectStart ? compact.slice(objectStart, objectEnd + 1) : '';
    return [arrayText, objectText].filter(Boolean).flatMap((text) => { const noComments = text.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''); const fixed = noComments.replace(/([{,]\s*)([A-Za-z_][\w]*)(\s*:)/g, '$1"$2"$3').replace(/,\s*([}\]])/g, '$1').replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"'); return [noComments, fixed]; });
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
    const industries = f.industry ? [f.industry] : ['互联网软件', '人工智能', '医疗医院', '药房健康', '教育培训', '法律合规', '金融银行', '财务会计', '智能制造', '建筑工程', '物流供应链', '电商零售', '餐饮酒店', '旅游会展', '公共服务', '农业食品', '媒体广告', '游戏动漫', '心理咨询', '物业安保'];
    const payTypes = f.payType ? [f.payType] : ['员工', '创作者', '定时工'];
    return Array.from({ length: count }, (_, i) => {
      const industry = industries[(i + (this.bossState.randomSeed || 0)) % industries.length];
      const payType = payTypes[i % payTypes.length];
      const title = this.fallbackBossTitle(industry, payType, i);
      return { id: `ai-fallback-${Date.now()}-${i}`, title, company: `${industry}优选公司${i + 1}`, industry, scale: f.scale || ['10-20人', '20-50人', '50-150人', '150-500人'][i % 4], address: [f.province || '四川省', f.city || '成都市', f.county || '武侯区', f.town || '玉林街道'].join(' '), payType, base: Number(f.baseMin) || 4500 + i * 650, performanceMonths: Number(f.performanceMonths) || 1 + (i % 3), creatorPay: f.creatorPay || (payType === '创作者' ? (i % 2 ? '一次性买断' : '提成制度') : ''), level: f.creatorLevel || ['C级签约', 'B级签约', 'A级签约'][i % 3], royalty: '8%-22%', buyout: '800-8000元/件', hourly: payType === '定时工' ? 24 + i * 3 : 0, skills: this.defaultBossSkills({ title, payType }), desc: source.slice(0, 80) || 'AI暂不可用，已按真实行业与筛选随机补齐岗位。', matchProfessions: [], matchSkills: [], matchKnowledge: [] };
    });
  },

  fallbackBossTitle(industry, payType, index) {
    const map = { 创作者: ['小说签约作者', '短视频编导', '漫画主笔', '课程脚本作者', '广告文案创作者'], 定时工: ['展会协助员', '仓库分拣员', '门店临时导购', '酒店宴会小时工', '社区活动助理'] };
    if (map[payType]) return map[payType][index % map[payType].length];
    const pairs = [[/AI|人工智能|数据/, ['机器学习标注专员', '数据分析师', 'AI产品助理', '算法测试工程师']], [/医疗|医院|健康|药房/, ['护士', '药师', '康复治疗师', '医学检验员']], [/教育|培训/, ['数学教师', '教研员', '课程顾问', '助教']], [/法律|合规/, ['法务专员', '合规专员', '律师助理']], [/金融|会计|财务/, ['会计', '审计助理', '风控专员', '理财顾问']], [/制造|工程|建筑/, ['机械工程师', '电气工程师', '质检工程师', '施工资料员']], [/物流|供应链/, ['物流调度员', '供应链专员', '仓储主管']], [/餐饮|酒店|旅游/, ['酒店前台', '餐厅领班', '旅游顾问']]];
    const found = pairs.find(([re]) => re.test(industry))?.[1] || ['软件开发工程师', '前端开发工程师', '产品经理', '新媒体运营', '行政专员'];
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
    if (/互联网|软件|科技/.test(text) && /医生|护士|药师|教师|律师|会计|机械|酒店/.test(title)) return true;
    if (/医疗|医院|健康/.test(text)) return !/医生|护士|药师|康复|检验|健康|医/.test(title);
    if (/法律|律所|法务|合规/.test(text)) return !/律师|法务|合规|法律/.test(title);
    if (/教育|学校|培训/.test(text)) return !/教师|教研|课程|助教/.test(title);
    if (/金融|会计|银行|证券|财务/.test(text)) return !/会计|审计|风控|理财|金融|财务/.test(title);
    if (/制造|工程|工厂|建筑/.test(text)) return !/机械|电气|质检|工艺|工程师|施工|资料员/.test(title);
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
    if (/制造|工程|工厂|建筑/.test(industry)) return ['机械工程师', '电气工程师', '质检工程师', '施工资料员'];
    if (/物流|供应链/.test(industry)) return ['物流调度员', '供应链专员', '仓储主管'];
    return ['软件开发工程师', '前端开发工程师', '大数据开发工程师', '产品经理', '测试工程师'];
  },

  defaultBossSkills(job) {
    const title = String(job.title || '岗位');
    if (/数据|AI|算法|标注/.test(title)) return ['数据处理', '模型理解', '质量复核'];
    if (/前端|软件|开发|工程师/.test(title)) return ['JavaScript', '页面开发', '问题排查'];
    if (/护士|药师|康复|检验|医生/.test(title)) return ['医疗规范', '患者沟通', '记录整理'];
    if (/教师|教研|课程/.test(title)) return ['授课表达', '教案设计', '学情分析'];
    if (/法务|律师|合规/.test(title)) return ['合同审阅', '法规检索', '风险判断'];
    if (/会计|审计|风控|财务/.test(title)) return ['表格处理', '票据核对', '风险意识'];
    if (job.payType === '创作者' || /创作|作者|编导|漫画|文案/.test(title)) return ['内容创作', '按要求交付', '版权沟通'];
    if (job.payType === '定时工') return ['准时到岗', '基础执行', '现场配合'];
    return ['岗位基础技能', '沟通协作', '执行反馈'];
  },

  normalizeBossJob(job, index) {
    if (!job?.title || !job?.company) return null;
    const title = this.normalizeBossTitle(job, index);
    const idSeed = `${job.company}-${title}-${this.bossState.randomSeed}-${index}`.replace(/\s+/g, '-');
    return {
      id: String(job.id || `ai-job-${idSeed}`), title, company: String(job.company),
      industry: String(job.industry || this.bossState.filters.industry || '现代服务业'),
      scale: String(job.scale || this.bossState.filters.scale || '20-50人'),
      address: String(job.address || '四川省 成都市 武侯区 玉林街道'), payType: String(job.payType || this.bossState.filters.payType || '员工'),
      base: Number(job.base) || 0, performanceMonths: Number(job.performanceMonths) || 0,
      skills: Array.isArray(job.skills) ? job.skills.map(String) : this.defaultBossSkills(job),
      creatorPay: job.creatorPay || '', level: job.level || '', royalty: job.royalty || '', buyout: job.buyout || '', hourly: Number(job.hourly) || 0,
      matchProfessions: this.normalizeBossMatches(job.matchProfessions, 'professions'),
      matchSkills: this.normalizeBossMatches(job.matchSkills, 'skills'),
      matchKnowledge: this.normalizeBossMatches(job.matchKnowledge, 'knowledge'),
      desc: String(job.desc || '岗位详情待面谈。'),
    };
  },

  normalizeBossMatches(value, key) {
    const values = this.currentRpgState?.values || this.playerIdentityState?.()?.values || {};
    const owned = new Map((values[key] || []).map((x) => [String(x.name || x), x]));
    const raw = Array.isArray(value) ? value : String(value || '').split(/[、,，]/);
    return raw.map((x) => String(x?.name || x).trim()).filter((name, index, arr) => name && owned.has(name) && arr.indexOf(name) === index);
  },
};
