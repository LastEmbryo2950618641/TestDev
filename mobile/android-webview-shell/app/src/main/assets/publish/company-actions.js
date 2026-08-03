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
  freelanceLevelSectionView: 'freelanceLevelSectionView',
  freelanceOrderSectionView: 'freelanceOrderSectionView',
  freelanceWorksSectionView: 'freelanceWorksSectionView',
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
    this.companyState.activeCareerApp = this.companyState.activeCareerApp === 'freelance' ? 'freelance' : 'work';
    this.companyState.careerProfile = this.companyState.careerProfile && typeof this.companyState.careerProfile === 'object'
      ? this.normalizeCareerProfile(this.companyState.careerProfile)
      : null;
    this.companyState.workUnitProfile = this.companyState.workUnitProfile && typeof this.companyState.workUnitProfile === 'object'
      ? this.normalizeCareerProfile(this.companyState.workUnitProfile)
      : null;
    this.companyState.freelanceProfile = this.companyState.freelanceProfile && typeof this.companyState.freelanceProfile === 'object'
      ? this.normalizeCareerProfile(this.companyState.freelanceProfile)
      : null;
    this.companyState.freelanceProfiles = Array.isArray(this.companyState.freelanceProfiles)
      ? this.companyState.freelanceProfiles.map((item) => this.normalizeCareerProfile(item)).filter((item) => item.organizationName)
      : [];
    this.companyState.freelanceStatsById = this.companyState.freelanceStatsById && typeof this.companyState.freelanceStatsById === 'object'
      ? this.companyState.freelanceStatsById
      : {};
    this.companyState.freelancePicker = {
      open: false,
      query: '',
      results: [],
      searched: false,
      loading: false,
      error: '',
      ...(this.companyState.freelancePicker || {}),
    };
    if (this.companyState.freelanceProfile?.organizationName && !this.companyState.freelanceProfiles.length) {
      this.companyState.freelanceProfiles = [this.companyState.freelanceProfile];
    }
    if (!this.companyState.selectedFreelanceId && this.companyState.freelanceProfiles.length) {
      this.companyState.selectedFreelanceId = this.companyState.freelanceProfiles[0].id;
    }
    if (this.companyState.careerProfile && !this.companyState.workUnitProfile && !this.companyState.freelanceProfiles.length) {
      if (this.isFreelanceProfile(this.companyState.careerProfile)) {
        this.companyState.freelanceProfile = this.companyState.careerProfile;
        this.companyState.freelanceProfiles = [this.companyState.careerProfile];
        this.companyState.selectedFreelanceId = this.companyState.careerProfile.id;
      }
      else this.companyState.workUnitProfile = this.companyState.careerProfile;
    }
    this.companyState.companies = [];
    this.companyState.contracts = Array.isArray(this.companyState.contracts) ? this.companyState.contracts : [];
    this.companyState.submissions = Array.isArray(this.companyState.submissions) ? this.companyState.submissions : [];
    this.companyState.employmentRecords = Array.isArray(this.companyState.employmentRecords) ? this.companyState.employmentRecords : [];
    this._companySystemInitialized = true;
    this.normalizeCompanyWorkStats(base.workStats);
    this.normalizeFreelanceStats?.();
    this.syncEmploymentFromFaction();
    this.normalizeEmploymentRecords();
    this.syncCompanyLexicon();
    return this.companyState;
  },

  isFreelanceProfile(profile = {}) {
    const type = String(profile?.workMode?.type || profile?.workType || profile?.organizationType || '').trim();
    return /自由|接单|外包|个人/u.test(type);
  },

  currentCareerProfile(app = this.companyState?.activeCareerApp || 'work') {
    this.initCompanySystem();
    if (app === 'freelance') return this.selectedFreelanceProfile() || null;
    return this.companyState.workUnitProfile || (!this.isFreelanceProfile(this.companyState.careerProfile) ? this.companyState.careerProfile : null);
  },

  freelanceProfiles() {
    this.initCompanySystem();
    return Array.isArray(this.companyState.freelanceProfiles) ? this.companyState.freelanceProfiles : [];
  },

  selectedFreelanceProfile() {
    const list = Array.isArray(this.companyState?.freelanceProfiles) ? this.companyState.freelanceProfiles : [];
    if (!list.length) return null;
    const selected = list.find((item) => item.id === this.companyState.selectedFreelanceId) || list[0];
    if (selected && this.companyState.selectedFreelanceId !== selected.id) this.companyState.selectedFreelanceId = selected.id;
    if (selected) this.ensureFreelanceProfileLocalDetails(selected);
    this.companyState.freelanceProfile = selected || null;
    return selected || null;
  },

  selectFreelanceProfile(id = '') {
    this.initCompanySystem();
    const hit = this.freelanceProfiles().find((item) => item.id === id);
    if (!hit) return null;
    this.companyState.selectedFreelanceId = hit.id;
    this.ensureFreelanceProfileLocalDetails(hit);
    this.companyState.freelanceProfile = hit;
    this.syncCompanyLexicon?.();
    this.save?.();
    return hit;
  },

  playerCareerSources() {
    const state = this.playerIdentityState?.() || this.rpgStates?.['player-self'] || {};
    const profile = state.profile || this.playerProfile || {};
    const values = state.values || {};
    const collect = (items, type) => (Array.isArray(items) ? items : []).map((item) => ({
      type: String(item?.type || type || '').trim(),
      name: String(item?.name || item?.label || item || '').trim(),
      level: Number(item?.level ?? item?.lv ?? item?.exp?.level ?? 0),
    })).filter((item) => item.name);
    return {
      text: [profile.refinedRole, profile.dailyRole, profile.work, profile.notes, profile.worldbuildingNote, this.playerProfile?.refinedRole, this.playerProfile?.dailyRole].filter(Boolean).join(' '),
      abilities: [
        ...collect(profile.knowledge, '知识'),
        ...collect(values.knowledge, '知识'),
        ...collect(profile.skills, '技能'),
        ...collect(values.skills, '技能'),
        ...collect(profile.professions, '职业'),
        ...collect(values.professions, '职业'),
      ],
    };
  },

  inferFreelanceKind(profile = {}) {
    const player = this.playerCareerSources();
    const text = [profile.organizationName, profile.positionTitle, profile.careerSummary, profile.industry, player.text].filter(Boolean).join(' ');
    if (/画|绘|美术|插画|头像|立绘|表情|设定图|二次元/u.test(text)) return 'art';
    if (/程序|开发|代码|软件|脚本|网站|前端|后端|数据库|游戏/u.test(text)) return 'code';
    if (/顾问|咨询|架构|评审|排障/u.test(text)) return 'consult';
    if (/文案|写作|剧情|策划|脚本|小说/u.test(text)) return 'writing';
    if (/数据|表格|报表|自动化/u.test(text)) return 'data';
    if (/家教|辅导|教学|课程/u.test(text)) return 'tutor';
    return 'general';
  },

  freelanceAbilityLevel(name = '', fallback = 1) {
    const sources = this.playerCareerSources().abilities;
    const hit = sources.find((item) => item.name && (name.includes(item.name) || item.name.includes(name)));
    return Math.max(1, Number(hit?.level || fallback));
  },

  freelanceRelevantAbility(profile = {}, ability = {}) {
    const kind = this.inferFreelanceKind(profile);
    const name = String(ability.name || '');
    const type = String(ability.type || '');
    const text = `${type}${name}`;
    const patterns = {
      art: /画|绘|美术|插画|头像|立绘|表情|设定|二次元/u,
      code: /程序|开发|代码|软件|脚本|网站|前端|后端|数据库|游戏|编程/u,
      consult: /顾问|咨询|架构|评审|排障|技术/u,
      writing: /文案|写作|剧情|策划|脚本|小说/u,
      data: /数据|表格|报表|自动化/u,
      tutor: /家教|辅导|教学|课程|讲解/u,
      general: /./u,
    };
    return (patterns[kind] || patterns.general).test(text);
  },

  buildFreelanceLocalDetails(profile = {}) {
    const kind = this.inferFreelanceKind(profile);
    const now = this.phoneDateText?.() || new Date().toLocaleString('zh-CN', { hour12: false });
    const presets = {
      art: {
        specialty: '二次元角色立绘、头像与表情包绘制',
        orders: [['二次元头像绘制', '同城桌游社群客户', '本地小型社群', '良', '清爽校园风', '300元', '业内名声 +2'], ['表情包草稿绘制', '个人社交账号运营者', '个人小客户', '一般', '可爱夸张风', '180元', '业内名声 +1']],
      },
      code: {
        specialty: '游戏工具、网页功能与数据库脚本开发',
        orders: [['小型后台功能开发', '本地小微企业', '小型企业客户', '较好', '稳定实用', '1200元', '业内名声 +4'], ['数据报表脚本', '个体商户', '个体客户', '良', '简洁可维护', '600元', '业内名声 +2']],
      },
      consult: {
        specialty: '技术选型、代码评审与部署排障',
        orders: [['项目技术选型咨询', '初创团队负责人', '初创团队', '较好', '清晰可执行', '500元', '业内名声 +3'], ['部署故障排查', '小型开发团队', '小型团队', '良', '快速定位', '800元', '业内名声 +3']],
      },
      writing: {
        specialty: '剧情设定、宣传文案与短篇脚本',
        orders: [['商品宣传文案', '网店店主', '小型网店', '良', '简洁卖点明确', '200元', '业内名声 +1'], ['短篇剧情梗概', '个人创作者', '个人创作者', '一般', '都市日常风', '150元', '业内名声 +1']],
      },
      data: {
        specialty: '表格清洗、报表整理与自动化流程',
        orders: [['销售表格清洗', '社区小店经营者', '社区小店', '良', '准确整洁', '260元', '业内名声 +1'], ['月度报表自动化', '小型工作室', '小型工作室', '较好', '可复用模板', '900元', '业内名声 +3']],
      },
      tutor: {
        specialty: '线上答疑、课程辅导与专项训练',
        orders: [['周末作业辅导', '学生家长', '个人客户', '良', '耐心清晰', '120元', '业内名声 +1'], ['专项知识点梳理', '线上学生', '个人客户', '一般', '条理化讲解', '180元', '业内名声 +1']],
      },
      general: {
        specialty: '按客户需求承接小型项目与临时任务',
        orders: [['临时项目协助', '本地客户', '普通客户', '一般', '按需交付', '200元', '业内名声 +1'], ['资料整理任务', '个人客户', '个人客户', '一般', '清晰准确', '120元', '业内名声 +1']],
      },
    };
    const preset = presets[kind] || presets.general;
    const playerAbilities = this.playerCareerSources().abilities;
    const abilities = playerAbilities
      .filter((item) => this.freelanceRelevantAbility(profile, item))
      .map((item, index) => ({
        id: `local-${kind}-${String(item.type || 'ability').toLowerCase()}-${index + 1}`,
        type: item.type || '能力',
        name: item.name,
        level: Math.max(1, Number(item.level || 1)),
      }));
    return {
      abilities,
      specialty: preset.specialty,
      orders: preset.orders.map(([title, publisher, publisherStatus, requiredQuality, requiredStyle, priceText, reputationReward], index) => ({
        id: `local-order-${kind}-${index + 1}`,
        title,
        publisher,
        publisherStatus,
        publishedAt: now,
        deadlineAt: this.freelanceOrderDeadlineText?.(index) || '',
        requiredQuality,
        requiredStyle,
        priceText,
        reputationReward,
      })),
    };
  },

  freelanceOrderDeadlineText(index = 0) {
    const base = this.phoneDate?.() || new Date();
    const deadline = new Date(base.getTime() + (3 + Number(index || 0) * 2) * 86400000);
    return deadline.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
  },

  ensureFreelanceProfileLocalDetails(profile = {}) {
    if (!profile || typeof profile !== 'object') return profile;
    const titleValue = profile.reputationTitle;
    const hasTitle = titleValue && typeof titleValue === 'object' && String(titleValue.title || '').trim() && String(titleValue.title || '').trim() !== '[object Object]';
    const hasAbilities = Array.isArray(profile.abilities) && profile.abilities.length;
    const hasSpecialty = String(profile.specialty || '').trim();
    const hasOrders = Array.isArray(profile.orders) && profile.orders.length;
    if (hasTitle && hasAbilities && hasSpecialty && hasOrders) return profile;
    const details = this.buildFreelanceLocalDetails(profile);
    if (!hasAbilities) profile.abilities = details.abilities;
    if (!hasSpecialty) profile.specialty = details.specialty;
    if (!hasOrders) profile.orders = details.orders;
    return profile;
  },

  openFreelancePicker() {
    this.initCompanySystem();
    this.companyState.freelancePicker = {
      ...(this.companyState.freelancePicker || {}),
      open: true,
      query: this.companyState.freelancePicker?.query || '',
      results: this.companyState.freelancePicker?.results || [],
      searched: false,
      loading: false,
      error: '',
    };
  },

  closeFreelancePicker() {
    this.initCompanySystem();
    this.companyState.freelancePicker.open = false;
  },

  async freelanceCandidatePrompt(query = '') {
    const playerState = this.playerIdentityState?.() || this.rpgStates?.['player-self'] || {};
    const profile = playerState.profile || this.playerProfile || {};
    const values = playerState.values || this.currentRpgState?.values || {};
    const worldTag = this.currentWorldTag?.() || this.character?.work || this.selectedWork || window.GameModules.realWorld2026?.label || '未知世界';
    const lore = window.GameModules.worldLoreStore?.get?.(worldTag) || {};
    const abilityText = (items, label) => (Array.isArray(items) ? items : [])
      .map((item) => `${item?.name || item}${item?.level || item?.lv ? ` lv.${item.level || item.lv}` : ''}`)
      .filter(Boolean)
      .slice(0, 20)
      .join('、') || '无';
    return window.GameModules.renderPrompt('freelance-candidates', {
      玩家输入: String(query || '').trim(),
      当前世界: worldTag,
      世界背景: String(lore.background || lore.summary || lore.core || '').slice(0, 1200) || '无',
      玩家资料: [
        `姓名：${profile.name || this.playerName || '玩家'}`,
        `身份：${profile.refinedRole || profile.dailyRole || profile.role || '未知'}`,
        `地点：${profile.refinedCity || profile.city || profile.location || '未知'}`,
        `备注：${[profile.work, profile.notes, profile.worldbuildingNote].filter(Boolean).join('；') || '无'}`,
      ].join('\n'),
      玩家能力: [
        `知识：${abilityText(profile.knowledge || values.knowledge, '知识')}`,
        `技能：${abilityText(profile.skills || values.skills, '技能')}`,
        `职业：${abilityText(profile.professions || values.professions, '职业')}`,
      ].join('\n'),
      已有自由职业者: JSON.stringify(this.freelanceProfiles().map((item) => ({ name: item.organizationName, intro: item.careerSummary })).slice(0, 30)),
    });
  },

  parseFreelanceCandidates(text = '') {
    const source = String(text || '').replace(/```(?:json)?|```/gi, '').trim();
    const compact = source.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/，/g, ',').replace(/：/g, ':');
    const start = compact.indexOf('[');
    const end = compact.lastIndexOf(']');
    const objectStart = compact.indexOf('{');
    const objectEnd = compact.lastIndexOf('}');
    const candidates = [
      objectStart >= 0 && objectEnd >= objectStart ? compact.slice(objectStart, objectEnd + 1) : '',
      start >= 0 && end >= start ? compact.slice(start, end + 1) : compact,
    ].filter(Boolean);
    for (const item of candidates) {
      try {
        const parsed = JSON.parse(item);
        const list = Array.isArray(parsed) ? parsed : parsed?.candidates;
        if (Array.isArray(list)) {
          return list.map((candidate, index) => ({
            id: String(candidate?.id || candidate?.name || `ai-candidate-${index + 1}`).trim(),
            name: String(candidate?.name || candidate?.title || candidate?.职业 || '').trim(),
            intro: String(candidate?.intro || candidate?.desc || candidate?.介绍 || '').trim(),
          })).filter((candidate) => candidate.name);
        }
      } catch (_) {}
    }
    return [];
  },

  async searchFreelanceCandidates() {
    this.initCompanySystem();
    const query = String(this.companyState.freelancePicker?.query || '').trim();
    Object.assign(this.companyState.freelancePicker, { searched: true, loading: true, error: '', results: [] });
    if (!query) {
      Object.assign(this.companyState.freelancePicker, { loading: false, error: '请输入想要搜索的自由职业者。' });
      return [];
    }
    try {
      const prompt = await this.freelanceCandidatePrompt(query);
      let buffer = '';
      const direct = await window.GameModules.aiRequest.complete({
        source: 'freelance-candidates',
        model: this.modelId || this.settingsState?.textModelId,
        prompt,
        timeoutMs: 60000,
        ...(window.GameModules.promptSkills?.completionOptions?.('freelance-candidates') || { jsonMode: true, responseFormat: { type: 'json_object' }, outputLimitKind: 'other' }),
        requireDone: true,
        onChunk: (content, done, info) => { buffer = info?.buffer || buffer || content || ''; },
      });
      const results = this.parseFreelanceCandidates(buffer || direct);
      this.companyState.freelancePicker.results = results;
      if (!results.length) this.companyState.freelancePicker.error = 'AI没有返回可用候选，请换个说法再搜索。';
      return results;
    } catch (err) {
      console.error('AI生成自由职业候选失败:', err);
      this.companyState.freelancePicker.error = `AI搜索失败：${err?.message || '未知错误'}`;
      return [];
    } finally {
      this.companyState.freelancePicker.loading = false;
    }
  },

  addFreelanceProfileFromCandidate(candidate = {}) {
    this.initCompanySystem();
    const name = String(candidate.name || '').trim();
    if (!name) return null;
    const profile = this.normalizeCareerProfile({
      id: `freelance-${name}`,
      active: true,
      organizationName: name,
      organizationType: '自由职业',
      positionTitle: name,
      workMode: { type: '自由职业', orderMode: '待现实推演补全接单方式', availability: '待现实推演补全可接单时间' },
      salary: { monthlyBase: 0, monthlyExpectedIncome: 0, orderIncomeText: '待现实推演补全收入构成', currency: 'CNY' },
      careerSummary: candidate.intro || `${name}，待现实推演 Stage13 补全详细信息。`,
      currentProjects: [],
      currentTasks: [],
      risks: [],
      notes: '玩家手动添加自由职业者基础卡片；详细档案等待现实推演 Stage13 更新。',
    });
    const list = this.freelanceProfiles();
    const index = list.findIndex((item) => item.id === profile.id || item.organizationName === profile.organizationName);
    if (index >= 0) list[index] = { ...list[index], ...profile };
    else list.push(profile);
    this.companyState.freelanceProfiles = list;
    this.companyState.selectedFreelanceId = profile.id;
    this.companyState.freelanceProfile = profile;
    this.closeFreelancePicker();
    this.syncCompanyLexicon?.();
    this.save?.();
    return profile;
  },

  setActiveCareerApp(app = 'work') {
    this.initCompanySystem();
    this.companyState.activeCareerApp = app === 'freelance' ? 'freelance' : 'work';
    if (this.companyState.activeCareerApp === 'freelance') this.companyState.panelTab = 'profile';
    this.syncCompanyLexicon?.();
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

  normalizeCareerProfile(profile = {}) {
    const source = profile && typeof profile === 'object' ? profile : {};
    const workMode = source.workMode && typeof source.workMode === 'object' ? source.workMode : {};
    const salary = source.salary && typeof source.salary === 'object' ? source.salary : {};
    const list = (value) => Array.isArray(value) ? value.map((item) => typeof item === 'string' ? item.trim() : item).filter(Boolean) : [];
    const rawType = String(workMode.type || source.workType || '').trim();
    const modeType = /自由|接单|外包|个人/u.test(rawType) ? '自由职业' : (/员工|雇员|全职|单位/u.test(rawType) ? '员工制' : rawType);
    const idSeed = String(source.id || source.factionId || source.organizationName || source.positionTitle || `career-${Date.now()}`).trim();
    const reputationSource = source.reputationTitle && typeof source.reputationTitle === 'object' ? source.reputationTitle : {};
    const fameSource = source.fameTitle && typeof source.fameTitle === 'object' ? source.fameTitle : {};
    const rawTitle = typeof source.reputationTitle === 'string' ? source.reputationTitle : (typeof source.fameTitle === 'string' ? source.fameTitle : '');
    const safeId = idSeed
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5-]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      || `career-${Date.now()}`;
    return {
      id: safeId,
      active: source.active !== false,
      organizationName: String(source.organizationName || '').trim(),
      organizationType: String(source.organizationType || '').trim(),
      factionId: String(source.factionId || '').trim(),
      positionTitle: String(source.positionTitle || '').trim(),
      directLeader: {
        name: String(source.directLeader?.name || '').trim(),
        title: String(source.directLeader?.title || '').trim(),
      },
      currentRoute: String(source.currentRoute || '').trim(),
      department: String(source.department || '').trim(),
      industry: String(source.industry || '').trim(),
      location: String(source.location || '').trim(),
      workMode: {
        type: modeType,
        schedule: String(workMode.schedule || '').trim(),
        workDays: String(workMode.workDays || '').trim(),
        startTime: String(workMode.startTime || '').trim(),
        endTime: String(workMode.endTime || '').trim(),
        lateGraceMinutes: Number(workMode.lateGraceMinutes || 0),
        orderMode: String(workMode.orderMode || workMode.schedule || '').trim(),
        availability: String(workMode.availability || workMode.workDays || '').trim(),
      },
      salary: {
        monthlyBase: Number(salary.monthlyBase ?? 0),
        base: Number(salary.monthlyBase ?? 0),
        annualPackage: Number(salary.annualPackage ?? salary.annualTotalPackage ?? salary.totalAnnualPackage ?? salary.yearlyPackage ?? 0),
        monthlyExpectedIncome: Number(salary.monthlyExpectedIncome ?? salary.expectedMonthlyIncome ?? salary.monthlyBase ?? 0),
        orderIncomeText: String(salary.orderIncomeText || salary.pricing || '').trim(),
        performanceMonths: Number(salary.performanceMonths ?? 0),
        performanceRate: Number(salary.performanceRate ?? 0),
        payday: String(salary.payday || '').trim(),
        currency: String(salary.currency || 'CNY').trim(),
      },
      reputationTitle: {
        title: String(reputationSource.title || fameSource.title || rawTitle || '').trim(),
        current: Number(reputationSource.current ?? fameSource.current ?? 0),
        max: Number(reputationSource.max ?? fameSource.max ?? 0),
        nextTitle: String(reputationSource.nextTitle || fameSource.nextTitle || '').trim(),
        review: String(reputationSource.review || reputationSource.evaluation || fameSource.review || fameSource.evaluation || '').trim(),
      },
      abilities: list(source.abilities || source.capabilities || source.skills).filter((item) => item && typeof item === 'object').map((item, index) => ({
        id: String(item.id || '').trim() || `ability-${index + 1}`,
        type: String(item.type || '').trim(),
        name: String(item.name || '').trim(),
        level: Number(item.level ?? item.currentLevel ?? 0),
      })).filter((item) => item.name),
      specialty: String(source.specialty || source.strength || '').trim(),
      orders: list(source.orders || source.availableOrders).filter((item) => item && typeof item === 'object').map((item, index) => ({
        id: String(item.id || '').trim() || `order-${index + 1}`,
        title: String(item.title || item.name || '').trim(),
        publisher: String(item.publisher || item.client || '').trim(),
        publisherStatus: String(item.publisherStatus || item.publisherRank || item.industryStatus || '').trim(),
        publishedAt: String(item.publishedAt || item.publishTime || item.time || '').trim(),
        deadlineAt: String(item.deadlineAt || item.deadline || item.dueAt || '').trim(),
        requiredQuality: String(item.requiredQuality || item.quality || '').trim(),
        requiredStyle: String(item.requiredStyle || item.style || '').trim(),
        priceText: String(item.priceText || item.price || '').trim(),
        reputationReward: String(item.reputationReward || item.fameReward || item.reputationText || '').trim(),
      })).filter((item) => item.title),
      works: list(source.works || source.achievements || source.results).filter((item) => item && typeof item === 'object').map((item, index) => ({
        id: String(item.id || '').trim() || `work-${index + 1}`,
        title: String(item.title || item.name || '').trim(),
        intro: String(item.intro || item.desc || item.description || '').trim(),
        recognition: Number(item.recognition ?? item.score ?? 0),
        review: String(item.review || item.evaluation || item.comment || '').trim(),
      })).filter((item) => item.title),
      rules: list(source.rules).map((item) => String(item || '').trim()).filter(Boolean),
      openings: list(source.openings).filter((item) => item && typeof item === 'object').map((item, index) => ({
        id: String(item.id || '').trim() || `opening-${index + 1}`,
        name: String(item.name || '').trim(),
        type: String(item.type || '').trim(),
        desc: String(item.desc || item.description || '').trim(),
      })).filter((item) => item.name),
      promotionRoutes: list(source.promotionRoutes).filter((item) => item && typeof item === 'object').map((item, index) => this.normalizeCareerPromotionRoute(item, index)).filter((item) => item.name || item.nextPosition),
      careerSummary: String(source.careerSummary || '').trim(),
      currentProjects: list(source.currentProjects).filter((item) => item && typeof item === 'object').map((item, index) => ({
        id: String(item.id || '').trim() || `project-${index + 1}`,
        role: String(item.role || '').trim(),
        description: String(item.description || '').trim(),
      })).filter((item) => item.role || item.description),
      currentTasks: list(source.currentTasks).map((item) => String(item || '').trim()).filter(Boolean),
      risks: list(source.risks).map((item) => String(item || '').trim()).filter(Boolean),
      notes: String(source.notes || '').trim(),
      recordSummary: String(source.recordSummary || '').trim(),
      createdAt: String(source.createdAt || '').trim(),
      updatedAt: String(source.updatedAt || '').trim(),
      source: String(source.source || 'ai-career').trim(),
    };
  },

  normalizeCareerPromotionRoute(route = {}, index = 0) {
    const reqs = Array.isArray(route.requirements) ? route.requirements : [];
    const currentPerformance = Number(route.currentPerformance ?? this.companyState?.workStats?.performance ?? 0);
    const requiredPerformance = Number(route.requiredPerformance ?? 0);
    return {
      id: String(route.id || '').trim() || `route-${index + 1}`,
      name: String(route.name || '').trim(),
      nextPosition: String(route.nextPosition || '').trim(),
      currentPerformance,
      requiredPerformance,
      requirements: reqs.map((item = {}, reqIndex) => ({
        id: String(item.id || '').trim() || `req-${index + 1}-${reqIndex + 1}`,
        type: String(item.type || '').trim(),
        name: String(item.name || '').trim(),
        currentLevel: Number(item.currentLevel ?? 0),
        requiredLevel: Number(item.requiredLevel ?? 0),
      })).filter((item) => item.name),
      vacancies: Number(route.vacancies ?? 0),
      notes: String(route.notes || '').trim(),
    };
  },

  currentCompany() {
    this.initCompanySystem();
    const career = this.currentCareerProfile();
    if (!career?.organizationName) return this.emptyCurrentCompany();
    const factions = Array.isArray(this.factionState?.factions) ? this.factionState.factions : [];
    const sourceFaction = career.factionId ? factions.find((item) => item.id === career.factionId) : null;
    const company = {
      id: career.factionId || 'career-current',
      factionId: career.factionId || '',
      name: career.organizationName,
      type: career.organizationType,
      industry: career.industry,
      scale: '',
      location: career.location,
      workMode: career.workMode,
      salary: career.salary,
      rules: career.rules,
      openings: career.openings,
      notes: career.notes || career.careerSummary || '',
      lexicon: [],
      generatedAt: career.updatedAt || career.createdAt || '',
      source: career.source || 'ai-career',
      sourceFactionName: sourceFaction?.name || '',
      sourceFactionId: sourceFaction?.id || '',
      positionTitle: career.positionTitle,
      directLeader: career.directLeader,
      currentRoute: career.currentRoute,
      department: career.department,
      careerSummary: career.careerSummary,
      currentProjects: career.currentProjects,
      reputationTitle: career.reputationTitle,
      abilities: career.abilities,
      specialty: career.specialty,
      orders: career.orders,
      works: career.works,
      promotionRoutes: career.promotionRoutes,
      currentTasks: career.currentTasks,
      risks: career.risks,
    };
    this.normalizeCompanyPolicy(company);
    return company;
  },

  normalizeCompanyPolicy(company) {
    company.workMode = { ...(company.workMode || {}) };
    company.salary = { ...(company.salary || {}) };
    const rawType = String(company.workMode.type || '').trim();
    company.workMode.type = /自由|接单|外包|个人/u.test(rawType) ? '自由职业' : (/员工|雇员|全职|单位/u.test(rawType) ? '员工制' : rawType);
    company.salary.monthlyBase = Number(company.salary.monthlyBase ?? company.salary.base ?? 0);
    company.salary.base = Number(company.salary.base ?? company.salary.monthlyBase ?? 0);
    company.salary.annualPackage = Number(company.salary.annualPackage ?? company.salary.annualTotalPackage ?? company.salary.totalAnnualPackage ?? company.salary.yearlyPackage ?? 0);
    company.salary.monthlyExpectedIncome = Number(company.salary.monthlyExpectedIncome ?? company.salary.expectedMonthlyIncome ?? company.salary.monthlyBase ?? 0);
    company.salary.orderIncomeText = String(company.salary.orderIncomeText || company.salary.pricing || '');
    company.salary.performanceRate = Number(company.salary.performanceRate ?? company.salary.commissionRate ?? 0);
    company.salary.performanceMonths = Number(company.salary.performanceMonths ?? company.salary.commissionMonths ?? 0);
    company.salary.currency = String(company.salary.currency || 'CNY');
    company.rules = Array.isArray(company.rules) ? company.rules : [];
    company.openings = Array.isArray(company.openings) ? company.openings : [];
    company.promotionRoutes = Array.isArray(company.promotionRoutes) ? company.promotionRoutes : [];
    return company;
  },

  isFreelanceCareer() {
    return this.companyState?.activeCareerApp === 'freelance';
  },

  careerAppName() {
    return this.isFreelanceCareer() ? '自由职业' : '工作';
  },

  syncEmploymentFromFaction() {
    const career = this.currentCareerProfile('work');
    if (career?.organizationName) {
      this.companyState.workUnitProfile = this.normalizeCareerProfile(career);
      this.companyState.currentCompanyId = career.factionId || '';
      this.companyState.employment = {
        ...this.companyState.employment,
        active: career.active !== false,
        activeCompanyId: career.factionId || '',
        resignedCompany: career.active === false ? career.organizationName : '',
      };
      return career.factionId ? this.currentWorkFaction() : null;
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

  normalizeFreelanceStats(defaults = null) {
    const base = defaults || window.GameModules.companySystem.defaultWorkStats();
    const selectedId = this.selectedFreelanceProfile()?.id || this.companyState?.selectedFreelanceId || 'default';
    const byId = this.companyState.freelanceStatsById && typeof this.companyState.freelanceStatsById === 'object' ? this.companyState.freelanceStatsById : {};
    const stats = { ...base, ...(byId[selectedId] || this.companyState?.freelanceStats || {}) };
    stats.attendanceStatus = { ...base.attendanceStatus, ...(stats.attendanceStatus || {}) };
    stats.leaderReview = { ...base.leaderReview, ...(stats.leaderReview || {}) };
    stats.employeeReview = { ...base.employeeReview, ...(stats.employeeReview || {}) };
    stats.contributionItems = Array.isArray(stats.contributionItems) ? stats.contributionItems : [];
    stats.performanceHistory = Array.isArray(stats.performanceHistory) ? stats.performanceHistory : [];
    stats.lateCount = 0;
    stats.absentCount = 0;
    stats.performance = Number(stats.performance ?? 100);
    stats.commissionRate = Number(stats.commissionRate || 0);
    byId[selectedId] = stats;
    this.companyState.freelanceStatsById = byId;
    this.companyState.freelanceStats = stats;
    return stats;
  },

  currentCareerStats() {
    return this.isFreelanceCareer() ? this.normalizeFreelanceStats() : this.normalizeCompanyWorkStats();
  },

  hasActiveCareerProfile(app = this.companyState?.activeCareerApp || 'work') {
    const profile = this.currentCareerProfile(app);
    return !!(profile && profile.active !== false && profile.organizationName);
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
      sourceFaction: '当前职业生涯可参考已知势力，但不要求绑定：' + v,
      generatedAt: '职业生涯由 AI 基于上下文生成或更新的时间：' + v,
      currentProjects: '当前参与项目由 AI 基于职业上下文生成，说明玩家在项目中的角色与项目内容：' + v,
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
    const stats = this.currentCareerStats();
    const attendance = stats.attendanceStatus || {};
    const leader = stats.leaderReview || {};
    const employee = stats.employeeReview || {};
    const contributions = (Array.isArray(stats.contributionItems) ? stats.contributionItems : []).slice(0, 8).map((item, index) => '- ' + (index + 1) + '. ' + (item.title || item.type || '贡献') + '：' + (item.detail || item.valueText || '未填写') + (item.valueText ? '｜价值：' + item.valueText : '')).join('\n') || '- 暂无贡献价值记录';
    const fields = this.companyFields().map((f) => '- ' + f.label + '：' + f.value + '｜' + f.desc).join('\n');
    const promotionRoutes = this.careerPromotionRoutes().map((route) => {
      const abilities = (Array.isArray(route.requirements) ? route.requirements : []).map((item) => `${item.name} lv.${Number(item.currentLevel || 0)}/lv.${Number(item.requiredLevel || 0)}`).join('，') || '无明确能力要求';
      return `- ${route.name || '晋级路线'}：下一级 ${route.nextPosition || '未设定'}；绩效 ${Number(route.currentPerformance || 0)}/${Number(route.requiredPerformance || 0)}；能力 ${abilities}；空缺 ${Number(route.vacancies || 0)}；${route.notes || '可通过现实推演争取其他晋级途径。'}`;
    }).join('\n') || '- 暂无职业晋级路线';
    return '# 职业生涯词条\n'
      + '- 职业生涯可选参考势力：' + (faction?.name || '无') + '｜ID：' + (faction?.id || '无') + '\n'
      + '- 职业档案更新时间：' + (unit.generatedAt || '未生成') + '\n'
      + fields
      + '\n# 职业晋级路线\n' + promotionRoutes
      + '\n# 工作状态\n'
      + '- 迟到次数：' + (stats.lateCount || 0) + '\n'
      + '- 旷班次数：' + (stats.absentCount || 0) + '\n'
      + '- 当前绩效：' + (stats.performance ?? 100) + '/100\n'
      + '- AI上班状态：' + (attendance.status || '未更新') + '｜' + (attendance.detail || '无') + '\n'
      + '- 下一次评绩效日期：' + (stats.nextPerformanceReviewAt || '未设置') + '\n'
      + '- 领导评价：' + (leader.summary || '暂无') + '｜评分：' + (leader.score ?? 0) + '\n'
      + '- 员工评价：' + (employee.summary || '暂无') + '\n'
      + '# 贡献价值\n' + contributions + '\n'
      + '# 职业规则\n' + ((unit.rules || []).join('、') || '暂无职业规则。');
  },

  async buildCareerPrompt() {
    return '';
  },

  async ensureCareerGenerated() {
    this.initCompanySystem();
    this.companyState.generating = false;
    this.companyState.generationError = '';
    return this.currentCompany();
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

  async ensureCurrentUnitGenerated() {
    return this.currentCompany();
  },

  careerPromotionRoutes() {
    this.initCompanySystem();
    const stats = this.currentCareerStats?.() || this.companyState?.workStats || {};
    const performance = Math.max(0, Math.min(100, Number(stats.performance ?? 100)));
    return (this.currentCompany().promotionRoutes || []).map((route) => ({ ...route, currentPerformance: performance }));
  },

  careerCurrentRouteName() {
    const career = this.currentCareerProfile();
    const routes = career?.promotionRoutes || [];
    if (career?.currentRoute && routes.some((item) => item.name === career.currentRoute)) return career.currentRoute;
    return routes[0]?.name || '';
  },

  canPromoteCareerRoute(route = {}) {
    const stats = this.currentCareerStats?.() || this.companyState?.workStats || {};
    const currentPerformance = Math.max(0, Math.min(100, Number(stats.performance ?? route.currentPerformance ?? 0)));
    const requiredPerformance = Number(route.requiredPerformance || 0);
    const performanceOk = currentPerformance >= requiredPerformance;
    const abilities = Array.isArray(route.requirements) ? route.requirements : [];
    const abilitiesOk = abilities.every((item) => Number(item.currentLevel || 0) >= Number(item.requiredLevel || 0));
    const vacanciesOk = Number(route.vacancies || 0) > 0;
    const missing = [];
    if (!performanceOk) missing.push(`绩效不足 ${currentPerformance}/${requiredPerformance}`);
    if (!abilitiesOk) missing.push('能力等级不足');
    if (!vacanciesOk) missing.push('没有职位空缺');
    return { ok: performanceOk && abilitiesOk && vacanciesOk, performanceOk, abilitiesOk, vacanciesOk, missing };
  },

  promoteCareerRoute(routeId = '') {
    this.initCompanySystem();
    const career = this.companyState?.careerProfile ? this.normalizeCareerProfile(this.companyState.careerProfile) : null;
    if (!career) {
      this.companyState.promotionMessage = '暂无职业生涯档案，无法晋升。';
      return false;
    }
    const routes = career.promotionRoutes || [];
    const route = routes.find((item) => item.id === routeId || item.name === routeId) || routes[0];
    if (!route) {
      this.companyState.promotionMessage = '暂无可用晋升路线。';
      return false;
    }
    const check = this.canPromoteCareerRoute(route);
    if (!check.ok) {
      this.companyState.promotionMessage = `暂不满足【${route.name || '晋升路线'}】晋升条件：${check.missing.join('、')}。`;
      this.save?.();
      return false;
    }
    const oldPosition = career.positionTitle || '当前职位';
    career.positionTitle = route.nextPosition || career.positionTitle;
    career.currentRoute = route.name || career.currentRoute;
    career.promotionRoutes = routes.map((item) => item.id === route.id ? { ...item, vacancies: Math.max(0, Number(item.vacancies || 0) - 1) } : item);
    career.recordSummary = `从${oldPosition}晋升为${career.positionTitle}`;
    career.updatedAt = this.phoneDate?.()?.toISOString?.() || new Date().toISOString();
    this.companyState.careerProfile = career;
    this.companyState.promotionMessage = `已晋升：${oldPosition} → ${career.positionTitle}。`;
    const record = (this.companyState.employmentRecords || []).find((item) => item.status === '在职') || this.companyState.employmentRecords?.[0];
    if (record) record.positionTitle = career.positionTitle;
    this.save?.();
    return true;
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

  async openCompanyApp(app = 'work') {
    this.initCompanySystem();
    this.setActiveCareerApp(app);
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
  },

  async openWorkApp() {
    return this.openCompanyApp('work');
  },

  async openFreelanceApp() {
    return this.openCompanyApp('freelance');
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
