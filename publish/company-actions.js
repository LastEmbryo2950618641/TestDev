window.GameModules = window.GameModules || {};

const companyViewHelperForwarders = {
  companyOrganization: 'companyOrganization',
  companyFields: 'companyFields',
  currentWorkAttendance: 'currentWorkAttendance',
  companyHeaderView: 'companyHeaderView',
  companyAttendanceView: 'companyAttendanceView',
  companyPayPreviewView: 'companyPayPreviewView',
  companyPayPanelView: 'companyPayPanelView',
  companyOrganizationSectionView: 'companyOrganizationSectionView',
  companyFieldSectionView: 'companyFieldSectionView',
  companyContractSectionView: 'companyContractSectionView',
  companyEmploymentRecordSectionView: 'companyEmploymentRecordSectionView',
  workStatusText: 'workStatusText',
  monthlyPayPreview: 'monthlyPayPreview',
};

function callCompanyViewHelper(name, context, ...args) {
  return window.GameModules.ui.company.viewHelpers[name].call(context, ...args);
}

window.GameModules.companyActions = {
  initCompanySystem() {
    if (this._companySystemInitialized && this.companyState) return this.companyState;
    const base = window.GameModules.companySystem.defaultState();
    this.companyState = { ...base, ...(this.companyState || {}) };
    this.companyState.employment = { ...base.employment, ...(this.companyState.employment || {}) };
    this.companyState.unitProfilesByFactionId = this.companyState.unitProfilesByFactionId && typeof this.companyState.unitProfilesByFactionId === 'object'
      ? this.companyState.unitProfilesByFactionId
      : {};
    this.companyState.companies = [];
    this.companyState.contracts = Array.isArray(this.companyState.contracts) ? this.companyState.contracts : [];
    this.companyState.submissions = Array.isArray(this.companyState.submissions) ? this.companyState.submissions : [];
    this.companyState.employmentRecords = Array.isArray(this.companyState.employmentRecords) ? this.companyState.employmentRecords : [];
    this._companySystemInitialized = true;
    this.normalizeCompanyWorkStats(base.workStats);
    this.syncEmploymentFromFaction();
    this.normalizeEmploymentRecords();
    this.syncCompanyLexicon();
    return this.companyState;
  },

  isWorkFaction(faction = {}) {
    const type = String(faction?.type || '').trim();
    const domain = String(faction?.orgDomain || '').trim();
    if (!type && !domain) return false;
    if (['国家', '组织域', '国际组织域'].includes(type)) return false;
    if (['corp', 'edu', 'gov', 'med', 'law', 'media', 'research', 'ngo'].includes(domain)) return true;
    return /公司|工作室|学校|学院|机构|医院|律所|出版社|企业|单位|社团|事务所|基金会|实验室/u.test(type);
  },

  currentWorkFaction() {
    this.initFactionSystem?.();
    const factions = Array.isArray(this.factionState?.factions) ? this.factionState.factions : [];
    const findBy = (id = '', name = '') => factions.find((item) => (id && item.id === id) || (name && item.name === name)) || null;
    const explicitId = String(this.companyState?.currentCompanyId || this.companyState?.employment?.activeCompanyId || '').trim();
    if (explicitId) {
      const faction = findBy(explicitId, '');
      if (faction && this.isWorkFaction(faction)) return faction;
    }
    const activeRecord = (this.companyState?.employmentRecords || []).find((item) => item.status === '在职') || null;
    if (activeRecord?.company) {
      const faction = findBy('', String(activeRecord.company).trim());
      if (faction && this.isWorkFaction(faction)) {
        this.companyState.currentCompanyId = faction.id;
        this.companyState.employment.activeCompanyId = faction.id;
        return faction;
      }
    }
    const player = this.playerIdentityState?.() || this.rpgStates?.['player-self'] || null;
    const memberships = Array.isArray(player?.profile?.memberships) ? player.profile.memberships : [];
    for (const item of memberships) {
      const faction = findBy(String(item?.orgId || '').trim(), String(item?.orgName || '').trim());
      if (faction && this.isWorkFaction(faction)) {
        this.companyState.currentCompanyId = faction.id;
        this.companyState.employment.activeCompanyId = faction.id;
        return faction;
      }
    }
    return null;
  },

  emptyCurrentCompany() {
    return window.GameModules.companySystem.emptyUnit('');
  },

  normalizeWorkUnitProfile(profile = {}, faction = {}) {
    const base = {
      factionId: faction.id || '',
      unitName: faction.name || '',
      workMode: {},
      salary: {},
      rules: [],
      openings: [],
      notes: '',
      generatedAt: '',
      source: '',
    };
    const out = { ...base, ...(profile && typeof profile === 'object' ? profile : {}) };
    out.workMode = out.workMode && typeof out.workMode === 'object' ? out.workMode : {};
    out.salary = out.salary && typeof out.salary === 'object' ? out.salary : {};
    out.rules = Array.isArray(out.rules) ? out.rules.map((item) => String(item || '').trim()).filter(Boolean) : [];
    out.openings = Array.isArray(out.openings) ? out.openings.filter((item) => item && typeof item === 'object').map((item) => ({
      id: String(item.id || '').trim() || `opening-${Date.now()}`,
      name: String(item.name || '').trim(),
      type: String(item.type || '').trim(),
      desc: String(item.desc || '').trim(),
    })).filter((item) => item.name) : [];
    out.salary.monthlyBase = Number(out.salary.monthlyBase ?? out.salary.base ?? 0);
    out.salary.base = Number(out.salary.base ?? out.salary.monthlyBase ?? 0);
    out.salary.performanceRate = Number(out.salary.performanceRate ?? out.salary.commissionRate ?? 0);
    out.salary.performanceMonths = Number(out.salary.performanceMonths ?? out.salary.commissionMonths ?? 0);
    out.salary.currency = String(out.salary.currency || 'CNY');
    out.workMode.type = String(out.workMode.type || '').trim();
    out.workMode.schedule = String(out.workMode.schedule || '').trim();
    out.workMode.workDays = String(out.workMode.workDays || '').trim();
    out.workMode.startTime = String(out.workMode.startTime || '').trim();
    out.workMode.endTime = String(out.workMode.endTime || '').trim();
    out.workMode.lateGraceMinutes = Number(out.workMode.lateGraceMinutes || 0);
    return out;
  },

  factionStructureAsOrganization(faction = {}) {
    const structure = Array.isArray(faction?.structure) ? faction.structure : [];
    return structure.map((dept = {}, index = 0) => ({
      name: String(dept.name || `部门${index + 1}`).trim(),
      jobs: (Array.isArray(dept.roles) ? dept.roles : []).map((role = {}, roleIndex = 0) => ({
        title: String(role.title || `岗位${roleIndex + 1}`).trim(),
        people: Array.isArray(role.characters) && role.characters.length ? role.characters.map((item) => String(item || '').trim()).filter(Boolean) : [],
      })),
    }));
  },

  currentCompany() {
    this.initCompanySystem();
    const faction = this.currentWorkFaction();
    if (!faction) return this.emptyCurrentCompany();
    const profile = this.normalizeWorkUnitProfile(this.companyState.unitProfilesByFactionId?.[faction.id] || {}, faction);
    const company = {
      id: faction.id,
      factionId: faction.id,
      name: faction.name || profile.unitName || '',
      type: faction.type || '',
      industry: faction.domain || '',
      scale: faction.scale || '',
      location: faction.location || '',
      workMode: profile.workMode,
      salary: profile.salary,
      rules: profile.rules,
      openings: profile.openings,
      notes: profile.notes || '',
      organization: this.factionStructureAsOrganization(faction),
      lexicon: [],
      generatedAt: profile.generatedAt || '',
      source: profile.source || '',
      sourceFactionName: faction.name || '',
      sourceFactionId: faction.id || '',
    };
    this.normalizeCompanyPolicy(company);
    return company;
  },

  normalizeCompanyPolicy(company) {
    company.workMode = { ...(company.workMode || {}) };
    company.salary = { ...(company.salary || {}) };
    company.salary.monthlyBase = Number(company.salary.monthlyBase ?? company.salary.base ?? 0);
    company.salary.base = Number(company.salary.base ?? company.salary.monthlyBase ?? 0);
    company.salary.performanceRate = Number(company.salary.performanceRate ?? company.salary.commissionRate ?? 0);
    company.salary.performanceMonths = Number(company.salary.performanceMonths ?? company.salary.commissionMonths ?? 0);
    company.salary.currency = String(company.salary.currency || 'CNY');
    company.rules = Array.isArray(company.rules) ? company.rules : [];
    company.openings = Array.isArray(company.openings) ? company.openings : [];
    company.organization = Array.isArray(company.organization) ? company.organization : [];
    return company;
  },

  syncEmploymentFromFaction() {
    const faction = this.currentWorkFaction();
    if (faction) {
      this.companyState.currentCompanyId = faction.id;
      this.companyState.employment = {
        ...this.companyState.employment,
        active: true,
        activeCompanyId: faction.id,
        resignedCompany: '',
      };
      return faction;
    }
    this.companyState.employment = {
      ...this.companyState.employment,
      active: false,
      activeCompanyId: '',
    };
    return null;
  },

  normalizeCompanyWorkStats(defaults = null) {
    const base = defaults || window.GameModules.companySystem.defaultWorkStats();
    const stats = { ...base, ...(this.companyState?.workStats || {}) };
    stats.attendanceStatus = { ...base.attendanceStatus, ...(stats.attendanceStatus || {}) };
    stats.leaderReview = { ...base.leaderReview, ...(stats.leaderReview || {}) };
    stats.employeeReview = { ...base.employeeReview, ...(stats.employeeReview || {}) };
    stats.contributionItems = Array.isArray(stats.contributionItems) ? stats.contributionItems : [];
    stats.performanceHistory = Array.isArray(stats.performanceHistory) ? stats.performanceHistory : [];
    stats.lateCount = Number(stats.lateCount || 0);
    stats.absentCount = Number(stats.absentCount || 0);
    stats.performance = Number(stats.performance ?? 100);
    stats.commissionRate = Number(stats.commissionRate || 0);
    this.companyState.workStats = stats;
    return stats;
  },

  normalizeEmploymentRecords() {
    const list = Array.isArray(this.companyState?.employmentRecords) ? this.companyState.employmentRecords : [];
    const nowIso = this.phoneDate?.()?.toISOString?.() || new Date().toISOString();
    list.forEach((record) => {
      record.company = record.company || this.currentCompany()?.name || '';
      record.status = record.status || (this.companyState.employment.active === false ? '已离职' : '在职');
      record.startAt = record.startAt || this.companyState.employment.startAt || nowIso;
      record.endAt = this.companyState.employment.resignedAt || record.endAt || '';
      record.duration = this.employmentDurationText(record.startAt, record.endAt || nowIso);
    });
    this.companyState.employmentRecords = list;
  },

  employmentDurationText(start, end) {
    const days = Math.max(0, Math.floor((new Date(end) - new Date(start)) / 86400000));
    const months = Math.floor(days / 30);
    return months ? `${months}个月${days % 30}天` : `${days}天`;
  },

  companyFieldReason(key, label, value) {
    const v = value || '未设置';
    const map = {
      name: '单位名称来自当前任职势力名称，用于标识玩家当前服务的组织主体：' + v,
      type: '单位类型来自当前任职势力类型，用于说明组织性质：' + v,
      industry: '所属行业来自势力领域，用于说明当前工作环境所在方向：' + v,
      scale: '单位规模来自势力规模，用于说明组织体量：' + v,
      location: '办公地点来自势力地点，用于说明当前上班所在地：' + v,
      workMode: '用工制度由 AI 基于势力信息生成，说明玩家当前工作关系：' + v,
      schedule: '上班制度由 AI 基于势力信息生成，说明当前上下班安排：' + v,
      workTime: '上班时间由 AI 基于势力信息生成，用于描述每日时段：' + v,
      baseSalary: '底薪由 AI 基于势力信息与上下文生成，代表固定工资基础：' + v,
      workDays: '完整上班天数用于计算当前月份工作日：' + v,
      dailySalary: '日薪用于反映按底薪和工作日折算后的日收入：' + v,
      annualPerformance: '绩效预估由当前单位规则与绩效提成计算得出：' + v,
      sourceFaction: '当前单位信息以势力为唯一组织源，不得与势力主档冲突：' + v,
      generatedAt: '单位资料由 AI 基于势力生成的时间：' + v,
    };
    return map[key] || (label + '用于补充说明当前单位信息：' + v);
  },

  syncCompanyLexicon() {
    const unit = this.currentCompany();
    unit.lexicon = this.companyFields().map((field) => ({ label: field.label, value: field.value, desc: field.desc }));
  },

  companyPromptContext() {
    const unit = this.currentCompany();
    const faction = this.currentWorkFaction();
    const stats = this.normalizeCompanyWorkStats();
    const attendance = stats.attendanceStatus || {};
    const leader = stats.leaderReview || {};
    const employee = stats.employeeReview || {};
    const contributions = (Array.isArray(stats.contributionItems) ? stats.contributionItems : []).slice(0, 8).map((item, index) => '- ' + (index + 1) + '. ' + (item.title || item.type || '贡献') + '：' + (item.detail || item.valueText || '未填写') + (item.valueText ? '｜价值：' + item.valueText : '')).join('\n') || '- 暂无贡献价值记录';
    const fields = this.companyFields().map((f) => '- ' + f.label + '：' + f.value + '｜' + f.desc).join('\n');
    const org = this.companyOrganization().map((d) => '- ' + d.name + '：' + (Array.isArray(d.jobs) ? d.jobs.map((j) => (j.title || '未命名岗位') + '(' + ((Array.isArray(j.people) && j.people.length) ? j.people.join('、') : '暂无') + ')').join('、') : '暂无岗位')).join('\n') || '- 暂无组织结构';
    return '# 单位词条\n'
      + '- 组织唯一真源：势力\n'
      + '- 当前单位绑定势力：' + (faction?.name || '无') + '｜ID：' + (faction?.id || '无') + '\n'
      + '- 单位生成时间：' + (unit.generatedAt || '未生成') + '\n'
      + fields
      + '\n# 单位组织结构（来自势力）\n' + org
      + '\n# 工作状态\n'
      + '- 迟到次数：' + (stats.lateCount || 0) + '\n'
      + '- 旷班次数：' + (stats.absentCount || 0) + '\n'
      + '- 当前绩效：' + (stats.performance ?? 100) + '/100\n'
      + '- AI上班状态：' + (attendance.status || '未更新') + '｜' + (attendance.detail || '无') + '\n'
      + '- 下一次评绩效日期：' + (stats.nextPerformanceReviewAt || '未设置') + '\n'
      + '- 领导评价：' + (leader.summary || '暂无') + '｜评分：' + (leader.score ?? 0) + '\n'
      + '- 员工评价：' + (employee.summary || '暂无') + '\n'
      + '# 贡献价值\n' + contributions + '\n'
      + '# 单位规则\n' + ((unit.rules || []).join('、') || '暂无单位规则。');
  },

  currentMonthWorkDays() {
    const date = this.phoneDate?.() || new Date();
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    let restDays = 0;
    for (let day = 1; day <= days; day += 1) {
      const week = new Date(year, month, day).getDay();
      if (week === 0 || week === 6) restDays += 1;
    }
    return days - restDays;
  },

  decideWorkAttendance(choice) {
    const stats = this.normalizeCompanyWorkStats();
    const key = this.companyDateKey?.() || new Date().toISOString().slice(0, 10);
    if (stats.lastDecisionAt === key) return;
    if (choice === 'delay') { stats.lateCount += 1; stats.performance = Math.max(0, stats.performance - 6); }
    if (choice === 'absent') { stats.absentCount += 1; stats.performance = Math.max(0, stats.performance - 22); }
    stats.lastDecisionAt = key;
    stats.attendanceStatus = {
      dateKey: key,
      status: choice === 'absent' ? '旷班' : (choice === 'delay' ? '迟到' : '上班'),
      detail: choice === 'absent' ? '系统记录今日旷班。' : (choice === 'delay' ? '系统记录今日迟到到岗。' : '系统记录今日正常到岗。'),
      source: 'system',
      updatedAt: new Date().toISOString(),
    };
    this.companyState.workPromptOpen = false;
    this.companyState.pendingWork = null;
    this.save?.();
  },

  async buildWorkUnitPrompt(faction = null) {
    const currentFaction = faction || this.currentWorkFaction();
    const profile = this.playerProfile || {};
    const current = this.currentCompany();
    return await window.GameModules.renderPrompt('work-unit-from-faction', {
      当前日期: '2026年7月29日（周三）',
      玩家姓名: profile.name || '玩家本人',
      玩家身份: profile.refinedRole || profile.dailyRole || profile.role || '未知身份',
      玩家城市: profile.refinedCity || profile.city || '未知城市',
      势力名称: currentFaction?.name || '无',
      势力ID: currentFaction?.id || '无',
      势力类型: currentFaction?.type || '未知',
      势力领域: currentFaction?.domain || '未知',
      势力规模: currentFaction?.scale || '未知',
      势力地点: currentFaction?.location || '未知',
      势力描述: currentFaction?.description || '暂无描述',
      势力组织结构: JSON.stringify(currentFaction?.structure || [], null, 2),
      势力规则: JSON.stringify(currentFaction?.rules || [], null, 2),
      玩家当前任职资料: JSON.stringify((this.playerIdentityState?.()?.profile?.memberships || []), null, 2),
      当前单位旧资料: JSON.stringify({
        workMode: current.workMode || {},
        salary: current.salary || {},
        rules: current.rules || [],
        openings: current.openings || [],
        notes: current.notes || '',
      }, null, 2),
    });
  },

  parseWorkUnitProfile(raw = '') {
    const source = String(raw || '').replace(/```(?:json)?|```/gi, '').trim();
    const start = source.indexOf('{');
    const end = source.lastIndexOf('}');
    if (start < 0 || end <= start) return { profile: null, error: '未找到合法 JSON 对象' };
    try {
      const data = JSON.parse(source.slice(start, end + 1));
      const profile = data?.unitProfile;
      const error = this.validateWorkUnitProfile(profile);
      return error ? { profile: null, error, raw: data } : { profile: this.normalizeWorkUnitProfile(profile), error: '', raw: data };
    } catch (err) {
      return { profile: null, error: `JSON解析失败：${err?.message || '未知错误'}` };
    }
  },

  validateWorkUnitProfile(profile = null) {
    if (!profile || typeof profile !== 'object') return '缺少 unitProfile 对象';
    if (typeof profile.factionId !== 'string' || !profile.factionId.trim()) return 'unitProfile.factionId 必须为字符串';
    if (typeof profile.unitName !== 'string' || !profile.unitName.trim()) return 'unitProfile.unitName 必须为字符串';
    if (!profile.workMode || typeof profile.workMode !== 'object') return 'unitProfile.workMode 必须为对象';
    if (!profile.salary || typeof profile.salary !== 'object') return 'unitProfile.salary 必须为对象';
    if (!Array.isArray(profile.rules) || profile.rules.some((item) => typeof item !== 'string')) return 'unitProfile.rules 必须为字符串数组';
    if (!Array.isArray(profile.openings)) return 'unitProfile.openings 必须为数组';
    for (const opening of profile.openings) {
      if (!opening || typeof opening !== 'object') return 'unitProfile.openings 项必须为对象';
      if (typeof opening.name !== 'string') return 'opening.name 必须为字符串';
      if (typeof opening.type !== 'string') return 'opening.type 必须为字符串';
      if (typeof opening.desc !== 'string') return 'opening.desc 必须为字符串';
    }
    if (typeof profile.notes !== 'string') return 'unitProfile.notes 必须为字符串';
    return '';
  },

  async ensureCurrentUnitGenerated(force = false) {
    this.initCompanySystem();
    const faction = this.currentWorkFaction();
    if (!faction) {
      this.companyState.generationError = '当前没有可绑定的在职单位势力，工作 App 不会再使用写死单位数据。';
      return null;
    }
    if (!force && this.companyState.unitProfilesByFactionId?.[faction.id]) return this.currentCompany();
    if (this.companyState.generating) return null;
    this.companyState.generating = true;
    this.companyState.generationError = '';
    console.log('[单位生成调试] start', { factionId: faction.id, factionName: faction.name, at: '2026-07-29' });
    try {
      const prompt = await this.buildWorkUnitPrompt(faction);
      let buffer = '';
      const raw = await window.GameModules.aiRequest.complete({
        source: 'work-unit-from-faction',
        model: this.modelId || this.settingsState?.textModelId || window.GameModules.aiRequest?.selectedTextModel?.(),
        prompt,
        timeoutMs: 60000,
        ...(window.GameModules.promptSkills?.completionOptions?.('work-unit-from-faction') || { jsonMode: true, responseFormat: { type: 'json_object' }, outputLimitKind: 'other' }),
        requireDone: true,
        onChunk: (_content, _done, info) => {
          buffer = info?.buffer || buffer;
        },
      });
      const parsed = this.parseWorkUnitProfile(raw || buffer);
      if (!parsed.profile) throw new Error(parsed.error || '单位资料返回无效');
      if (parsed.profile.factionId !== faction.id || parsed.profile.unitName !== faction.name) throw new Error('单位资料必须严格绑定当前势力 ID 与名称');
      this.companyState.unitProfilesByFactionId[faction.id] = {
        ...parsed.profile,
        generatedAt: this.phoneDate?.()?.toISOString?.() || new Date().toISOString(),
        source: 'ai-faction',
      };
      this.companyState.currentCompanyId = faction.id;
      this.companyState.employment.activeCompanyId = faction.id;
      this.companyState.generating = false;
      this.companyState.generationError = '';
      this.syncCompanyLexicon();
      console.log('[单位生成调试] success', this.companyState.unitProfilesByFactionId[faction.id]);
      await this.save?.();
      return this.currentCompany();
    } catch (err) {
      this.companyState.generating = false;
      this.companyState.generationError = err?.message || '单位资料 AI 生成失败';
      console.warn('[单位生成调试] failed:', err?.message || err);
      return null;
    }
  },

  applyRecruitment(type) {
    const unit = this.currentCompany();
    const unitName = unit.name || this.currentWorkFaction()?.name || '当前单位';
    const id = `${type}-${Date.now()}`;
    if (type === 'employee') this.companyState.contracts.push({ id, type: '员工岗位', company: unitName, terms: '按照单位制度上班，执行基础岗位职责与考勤要求。', signedAt: this.phoneDateText?.() || '' });
    if (type === 'timed') this.companyState.submissions.push({ id, type: '定时任务', company: unitName, target: '在规定时间内完成指定事项', rewardRule: '合格可获得基础报酬，表现优秀可获得额外奖励', status: '待执行' });
    if (type === 'creator-low') this.companyState.contracts.push({ id, type: '创作者合作（低分成）', company: unitName, terms: '提供稳定基础支持，并按成果给予 5% 分成。', signedAt: this.phoneDateText?.() || '' });
    if (type === 'creator-high') this.companyState.contracts.push({ id, type: '创作者合作（高分成）', company: unitName, terms: '提供较低基础支持，并按成果给予 30% 分成。', signedAt: this.phoneDateText?.() || '' });
    if (type === 'employee') {
      const startAt = new Date().toISOString();
      const faction = this.currentWorkFaction();
      this.companyState.employment = { active: true, activeCompanyId: faction?.id || '', startAt, resignedAt: '', resignedCompany: '' };
      this.companyState.employmentRecords.unshift({ id, company: unitName, status: '在职', startAt, endAt: '', duration: '0天' });
    }
    this.save?.();
  },

  resignCompany() {
    const unitName = this.currentCompany()?.name || this.currentWorkFaction()?.name || '当前单位';
    const endAt = new Date().toISOString();
    this.companyState.employment = { active: false, activeCompanyId: '', startAt: this.companyState.employment?.startAt || endAt, resignedAt: endAt, resignedCompany: unitName };
    const record = this.companyState.employmentRecords.find((item) => item.status === '在职') || this.companyState.employmentRecords[0];
    if (record) Object.assign(record, { status: '已离职', endAt, duration: this.employmentDurationText(record.startAt, endAt) });
    this.companyState.workPromptOpen = false;
    this.companyState.pendingWork = null;
    this.companyState.contracts = [];
    this.companyState.submissions = [];
    this.companyState.currentCompanyId = '';
    this.syncCompanyLexicon();
    this.save?.();
  },

  async openCompanyApp() {
    this.initCompanySystem();
    this.ensureAllCompanyFactions?.();
    this.identityAppOpen = false;
    this.wechatAppOpen = false;
    this.saveAppOpen = false;
    this.roleCardJsonAppOpen = false;
    this.worldlineAppOpen = false;
    if (this.bossState) this.bossState.open = false;
    if (this.calendarState) this.calendarState.open = false;
    if (this.factionState) this.factionState.open = false;
    if (this.skillsState) this.skillsState.open = false;
    if (this.knownProfessionState) this.knownProfessionState.open = false;
    if (this.promptState) this.promptState.open = false;
    if (this.tokenStatsState) this.tokenStatsState.open = false;
    this.companyState.open = true;
    this.desktopUnlocked = true;
    await this.ensureCurrentUnitGenerated(false);
  },

  async openWorkApp() {
    return this.openCompanyApp();
  },

  closeCompanyApp() {
    this.companyState.open = false;
    this.closeAppToDesktop();
  },

  closeWorkApp() {
    return this.closeCompanyApp();
  },
};

Object.entries(companyViewHelperForwarders).forEach(([name, helperName]) => {
  window.GameModules.companyActions[name] = function companyViewHelperFacade(...args) {
    return callCompanyViewHelper(helperName, this, ...args);
  };
});
