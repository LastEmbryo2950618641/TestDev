
;// ---- core/token-stats.js ----
window.GameModules = window.GameModules || {};

window.GameModules.tokenStats = {
  records: [],
  seq: 0,
  maxRecords: 120,
  modelPrices: {},
  defaultState() { return { open: false, query: '', category: '', categoryMenuOpen: false, selectedId: '', selectedTab: 'prompt' }; },
  priceValue(price) {
    const match = String(price ?? '').match(/[\d.]+/);
    const value = match ? Number(match[0]) : Number(price);
    return Number.isFinite(value) && value > 0 ? value : 1;
  },
  syncModelPrices(result) {
    const prices = {};
    (result?.models || []).forEach((model) => { if (model?.internalName) prices[model.internalName] = this.priceValue(model.price); });
    (result?.categories || []).forEach((category) => (category.modelGroups || []).forEach((group) => (group.contexts || []).forEach((ctx) => {
      if (ctx?.internalName && group?.price !== undefined) prices[ctx.internalName] = this.priceValue(group.price);
    })));
    this.modelPrices = { ...this.modelPrices, ...prices };
  },
  estimateCredits(tokens, model = '') {
    const price = this.modelPrices?.[model] || 1;
    return Math.max(1, Math.ceil(((Number(tokens) || 0) / 1000) * price));
  },
  templateIdForSource(promptId) {
    const id = String(promptId || '');
    if (/^character-profile-(emotions|playerFeelings)(?:-|$)/.test(id)) return 'character-profile-metric-group';
    if (/^character-profile-part4-csv-fix$/.test(id)) return 'character-profile-part4-inventory-wearing-rpg';
    return id;
  },
  titleForSource(promptId, item) {
    const id = String(promptId || '');
    const names = {
      'character-profile-part2-csv-fix': '????Part2 ?????CSV ??',
      'character-profile-part3-csv-fix': '????Part3 ???? CSV ??',
      'character-profile-part4-csv-fix': '????Part4 ???? CSV ??',
      'character-profile-part5-csv-fix': '????Part5 ???? CSV ??',
      'character-profile-part6-csv-fix': '????Part6 ?????CSV ??',
      'real-stage3-router': '????3A-??????',
      'real-stage3-update-init': '????3B-??????,
      'real-stage3-update-metrics': '????3B-????????,
      'real-stage3-update-bodySex': '????3B-?????????,
      'real-stage3-update-survival': '????3B-??????????,
      'real-stage3-update-worldSocial': '????3B-??????????,
      'real-stage3-update-inventory': '????3B-????',
    };
    return names[id] || item?.title || id;
  },
  record(promptId, text, meta = {}) {
    if (!promptId) return text;
    const templateId = meta.templateId || this.templateIdForSource(promptId);
    const item = window.GameModules.promptTemplates?.items?.find((tpl) => tpl.id === templateId);
    const createdAt = Date.now();
    const fullText = String(text || '');
    const inputTokens = window.GameModules.characterMemory?.estimateTokens?.(fullText) || Math.ceil(fullText.length / 2);
    const outputTokens = Math.max(0, Number(meta.maxTokens) || 0);
    const tokens = inputTokens + outputTokens;
    const model = meta.model || '';
    const record = {
      id: `${createdAt}-${++this.seq}-${promptId}`,
      promptId,
      text: fullText,
      inputTokens,
      outputTokens,
      tokens,
      model,
      price: this.modelPrices?.[model] || 1,
      credits: this.estimateCredits(tokens, model),
      title: meta.title || this.titleForSource(promptId, item),
      category: meta.category || item?.category || '????,
      summary: meta.summary || item?.summary || '',
      file: meta.file || item?.file || '',
      kind: meta.kind || 'completion',
      responseText: String(meta.responseText || ''),
      responseImages: Array.isArray(meta.responseImages) ? meta.responseImages.filter(Boolean) : [],
      createdAt,
      updatedAt: new Date(createdAt).toLocaleString('zh-CN'),
    };
    this.records.unshift(record);
    if (this.records.length > this.maxRecords) this.records.length = this.maxRecords;
    return record.id;
  },
  recordResponse(recordId, responseText, responseImages = []) {
    const record = this.item(recordId);
    if (!record) return;
    record.responseText = String(responseText || '');
    if (Array.isArray(responseImages)) record.responseImages = responseImages.filter(Boolean);
  },
  item(recordId) { return this.records.find((item) => item.id === recordId) || null; },
  categories() {
    const templateCategories = window.GameModules.promptTemplates.list().map((item) => item.category);
    const recordCategories = this.records.map((item) => item.category);
    return [...new Set([...templateCategories, ...recordCategories].filter(Boolean))];
  },
  list({ query = '', category = '' } = {}) {
    const q = String(query || '').trim().toLowerCase();
    return this.records.filter((item) => {
      const inCategory = !category || item.category === category;
      const haystack = [item.title, item.category, item.summary, item.file, item.updatedAt].join(' ').toLowerCase();
      return inCategory && (!q || haystack.includes(q));
    });
  },
};

window.GameModules.tokenStatsActions = {
  initTokenStatsApp() { this.tokenStatsState = { ...window.GameModules.tokenStats.defaultState(), ...(this.tokenStatsState || {}) }; },
  openTokenStatsApp() {
    this.initTokenStatsApp();
    this.tokenStatsState.selectedId = '';
    this.identityAppOpen = false; this.wechatAppOpen = false; this.saveAppOpen = false; this.roleCardJsonAppOpen = false; this.worldlineAppOpen = false;
    if (this.companyState) this.companyState.open = false;
    if (this.bossState) this.bossState.open = false;
    if (this.calendarState) this.calendarState.open = false;
    if (this.factionState) this.factionState.open = false;
    if (this.skillsState) this.skillsState.open = false;
    if (this.promptState) this.promptState.open = false;
    if (this.alertLogState) this.alertLogState.open = false;
    if (this.knownProfessionState) this.knownProfessionState.open = false;
    this.tokenStatsState.open = true; this.desktopUnlocked = true;
  },
  closeTokenStatsApp() { if (this.tokenStatsState) Object.assign(this.tokenStatsState, { open: false, selectedId: '' }); this.closeAppToDesktop(); },
  tokenPromptList() {
    this.initTokenStatsApp();
    return window.GameModules.tokenStats.list({ query: this.tokenStatsState.query, category: this.tokenStatsState.category });
  },
  tokenPromptCategories() { return window.GameModules.tokenStats.categories(); },
  tokenCategoryLabel() { return this.tokenStatsState?.category || '????'; },
  selectTokenCategory(category = '') {
    this.initTokenStatsApp();
    this.tokenStatsState.category = category;
    this.tokenStatsState.categoryMenuOpen = false;
  },
  openTokenPromptDetail(id) { this.initTokenStatsApp(); this.tokenStatsState.selectedId = id; this.tokenStatsState.selectedTab = 'prompt'; },
  closeTokenPromptDetail() { if (this.tokenStatsState) this.tokenStatsState.selectedId = ''; },
  currentTokenPromptRecord() { return window.GameModules.tokenStats.item(this.tokenStatsState?.selectedId); },
  tokenPromptText(id) { return window.GameModules.tokenStats.item(id)?.text || '???????????? AI ????????????????????????; },
  tokenResponseText(id) { return window.GameModules.tokenStats.item(id)?.responseText || '?? AI ??????????????????????; },
  tokenResponseImages(id) { return window.GameModules.tokenStats.item(id)?.responseImages || []; },
  tokenPromptDetailText() { const id = this.tokenStatsState?.selectedId; return this.tokenStatsState?.selectedTab === 'response' ? this.tokenResponseText(id) : this.tokenPromptText(id); },
  tokenPromptCostText(id) { const stat = window.GameModules.tokenStats.item(id); return stat ? `??${stat.inputTokens || stat.tokens} + ????${stat.outputTokens || 0} token????{stat.model || '??'}?${stat.price || 1}?? ${stat.credits} ??` : '????; },
};


;// ---- core/alert-log.js ----
window.GameModules = window.GameModules || {};

window.GameModules.alertLog = {
  maxEntries: 200,
  seq: 0,

  defaultState() {
    return { open: false, query: '', level: '', selectedId: '' };
  },

  ensureEntries(store) {
    if (!store) return [];
    store.alertLogEntries = Array.isArray(store.alertLogEntries) ? store.alertLogEntries : [];
    return store.alertLogEntries;
  },

  formatTime(at = '') {
    return String(at || '').slice(0, 19).replace('T', ' ') || new Date().toLocaleString('zh-CN');
  },

  levelLabel(level = '') {
    return ({ error: '??', warn: '??', info: '??' })[level] || '??';
  },

  push(store, { level = 'warn', category = '??', title = '', message = '', detail = '', source = '', signature = '' } = {}) {
    if (!store || !message) return null;
    const entries = this.ensureEntries(store);
    const sig = String(signature || `${category}|${level}|${title}|${message}`).slice(0, 400);
    const existing = entries.find((item) => item.signature === sig && !item.dismissed);
    if (existing) {
      existing.updatedAt = new Date().toISOString();
      existing.count = (existing.count || 1) + 1;
      return existing;
    }
    const entry = {
      id: `${Date.now()}-${++this.seq}`,
      level,
      category: String(category || '??').slice(0, 40),
      title: String(title || this.levelLabel(level)).slice(0, 80),
      message: String(message).slice(0, 500),
      detail: String(detail || '').slice(0, 2000),
      source: String(source || '').slice(0, 120),
      signature: sig,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      count: 1,
      read: false,
      dismissed: false,
    };
    entries.unshift(entry);
    if (entries.length > this.maxEntries) entries.length = this.maxEntries;
    return entry;
  },

  ingestConsistencyReport(store, report = {}) {
    if (!store || !report) return;
    const failed = Object.entries(report.compliance?.checks || {}).filter(([, ok]) => ok === false).map(([key]) => key);
    if (failed.length) {
      this.push(store, {
        level: 'error',
        category: '??????,
        title: '???????',
        message: failed.join('??),
        detail: (report.warnings || []).join('\n'),
        source: 'orgTerritory.validateWorldConsistency',
        signature: `consistency|compliance|${failed.join(',')}|${report.signature || ''}`,
      });
    }
    (report.warnings || []).forEach((text) => {
      this.push(store, {
        level: 'warn',
        category: '??????,
        title: '??????,
        message: text,
        source: 'orgTerritory.validateWorldConsistency',
        signature: `consistency|warn|${text}`,
      });
    });
    (report.fixes || []).forEach((text) => {
      this.push(store, {
        level: 'info',
        category: '??????,
        title: '??????,
        message: text,
        source: 'orgTerritory.validateWorldConsistency',
        signature: `consistency|fix|${text}`,
      });
    });
  },

  ingestReconciliationEntry(store, entry = {}) {
    if (!store || !entry) return;
    const text = window.GameModules.factionActions?.orgTerritoryReconciliationText?.(entry)
      || [entry.kind, entry.location, entry.types, entry.count].filter(Boolean).join(' ? ');
    this.push(store, {
      level: 'info',
      category: '????',
      title: String(entry.kind || '????').slice(0, 40),
      message: String(text || '??????').slice(0, 500),
      source: 'orgTerritory.reconciliation',
      signature: `reconcile|${entry.kind}|${entry.at}|${entry.location || ''}|${entry.types || ''}`,
    });
  },

  list(store, { query = '', level = '' } = {}) {
    const q = String(query || '').trim().toLowerCase();
    const entries = this.ensureEntries(store).filter((item) => !item.dismissed);
    return entries.filter((item) => {
      if (level && item.level !== level) return false;
      if (!q) return true;
      const haystack = [item.title, item.category, item.message, item.detail, item.source, item.updatedAt].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  },

  item(store, id = '') {
    return this.ensureEntries(store).find((entry) => entry.id === id) || null;
  },

  unreadCount(store) {
    return this.ensureEntries(store).filter((item) => !item.dismissed && !item.read).length;
  },

  categories(store) {
    return [...new Set(this.ensureEntries(store).map((item) => item.category).filter(Boolean))];
  },
};

window.GameModules.alertLogActions = {
  initAlertLogApp() {
    this.alertLogState = { ...window.GameModules.alertLog.defaultState(), ...(this.alertLogState || {}) };
    window.GameModules.alertLog.ensureEntries(this);
  },

  closeOtherAppsForAlertLog() {
    this.identityAppOpen = false;
    this.wechatAppOpen = false;
    this.saveAppOpen = false;
    this.roleCardJsonAppOpen = false;
    this.worldlineAppOpen = false;
    if (this.settingsState) this.settingsState.open = false;
    if (this.systemTestState) this.systemTestState.open = false;
    if (this.companyState) this.companyState.open = false;
    if (this.bossState) this.bossState.open = false;
    if (this.calendarState) this.calendarState.open = false;
    if (this.factionState) this.factionState.open = false;
    if (this.skillsState) Object.assign(this.skillsState, { open: false, detailOpen: false });
    if (this.knownProfessionState) Object.assign(this.knownProfessionState, { open: false, detailOpen: false });
    if (this.taobaoState) Object.assign(this.taobaoState, { open: false, generatingId: '', walletOpen: false });
    if (this.promptState) Object.assign(this.promptState, { open: false, selectedId: '', selectedText: '', loading: false });
    if (this.tokenStatsState) Object.assign(this.tokenStatsState, { open: false, selectedId: '' });
  },

  openAlertLogApp() {
    this.initAlertLogApp();
    this.closeOtherAppsForAlertLog();
    this.alertLogState.selectedId = '';
    this.alertLogState.open = true;
    this.desktopUnlocked = true;
    this.markAlertLogRead();
  },

  closeAlertLogApp() {
    if (this.alertLogState) Object.assign(this.alertLogState, { open: false, selectedId: '' });
    this.closeAppToDesktop();
  },

  alertLogList() {
    this.initAlertLogApp();
    return window.GameModules.alertLog.list(this, {
      query: this.alertLogState.query,
      level: this.alertLogState.level,
    });
  },

  alertLogUnreadCount() {
    return window.GameModules.alertLog.unreadCount(this);
  },

  alertLogLevelLabel(level = '') {
    return window.GameModules.alertLog.levelLabel(level);
  },

  alertLogEntryTime(entry = {}) {
    return window.GameModules.alertLog.formatTime(entry.updatedAt || entry.createdAt);
  },

  alertLogLevelOptions() {
    return ['error', 'warn', 'info'];
  },

  selectAlertLogLevel(level = '') {
    this.initAlertLogApp();
    this.alertLogState.level = level;
  },

  alertLogLevelFilterLabel() {
    return this.alertLogState?.level ? this.alertLogLevelLabel(this.alertLogState.level) : '????';
  },

  openAlertLogDetail(id) {
    this.initAlertLogApp();
    this.alertLogState.selectedId = id;
    const entry = window.GameModules.alertLog.item(this, id);
    if (entry) entry.read = true;
  },

  closeAlertLogDetail() {
    if (this.alertLogState) this.alertLogState.selectedId = '';
  },

  currentAlertLogEntry() {
    return window.GameModules.alertLog.item(this, this.alertLogState?.selectedId);
  },

  markAlertLogRead() {
    window.GameModules.alertLog.ensureEntries(this).forEach((entry) => { entry.read = true; });
  },

  dismissAlertLogEntry(id) {
    const entry = window.GameModules.alertLog.item(this, id);
    if (entry) entry.dismissed = true;
    if (this.alertLogState?.selectedId === id) this.alertLogState.selectedId = '';
  },

  clearDismissedAlertLogs() {
    this.alertLogEntries = window.GameModules.alertLog.ensureEntries(this).filter((item) => !item.dismissed);
  },

  pushAlertLog(payload = {}) {
    return window.GameModules.alertLog.push(this, payload);
  },
};


;// ---- real-world-faction-actions.js ----
window.GameModules = window.GameModules || {};

window.GameModules.realWorldFactionActions = {
  async applyRealWorldFactionUpdates(updates = []) {
    if (!Array.isArray(updates) || !updates.length) return [];
    this.initFactionSystem?.();
    const ctx = window.GameModules.realWorldAgentContext;
    const orgActions = window.GameModules.orgTerritoryActions;
    const out = [];
    for (const item of updates.slice(0, 8)) {
      const action = String(item?.action || item?.method || '').trim();
      if (action === 'updateStructure') {
        const result = orgActions?.applyLegacyStructure?.(this, item);
        if (result?.text) out.push(result.text);
        continue;
      }
      if (action === 'addFactionPosition') out.push(ctx.addFactionPosition(this, item));
      else out.push(ctx.upsertFaction(this, item));
    }
    return out;
  },
};


;// ---- company-system.js ----
window.GameModules = window.GameModules || {};

window.GameModules.companySystem = {
  defaultState(profile = {}) {
    const companyName = profile.workplace || '????????????';
    return {
      open: false,
      panelTab: 'profile',
      workPromptOpen: false,
      pendingWork: null,
      currentCompanyId: 'main-company',
      workStats: { month: '2026-06', lateCount: 0, absentCount: 0, performance: 100, commissionRate: 0, lastDecisionAt: '' },
      companies: [this.defaultCompany(companyName, profile)],
      contracts: [],
      submissions: [],
      employment: { active: true, startAt: new Date().toISOString(), resignedAt: '', resignedCompany: '' },
      employmentRecords: [this.defaultEmploymentRecord(companyName)],
    };
  },

  defaultEmploymentRecord(companyName) {
    return { id: `job-${Date.now()}`, company: companyName, status: '??', startAt: new Date().toISOString(), endAt: '', duration: '' };
  },

  defaultCompany(name, profile = {}) {
    const role = profile.refinedRole || profile.dailyRole || '??????';
    return {
      id: 'main-company', name, type: this.companyType(name, role), industry: this.industry(role),
      scale: '??????, location: profile.refinedCity || profile.city || '????????,
      workMode: { type: '??', schedule: '????, workDays: '??????, startTime: '09:00', endTime: '18:00', lateGraceMinutes: 10 },
      salary: { monthlyBase: this.baseSalary(role), performanceMonths: 2, minRate: 0, maxRate: 0.3, payday: '??', currency: 'CNY' },
      rules: ['??????????', '????????????, '??=???????????', '????=??????????????'],
      openings: [
        { id: 'employee', name: '??????, type: '??', desc: '?????????????????????????????? },
        { id: 'timed-task', name: '??????, type: '????, desc: '??????????????????????????????????? },
        { id: 'creator', name: '??????, type: '??????, desc: '?????????????????????????????????? },
      ],
      organization: this.defaultOrganization(profile),
      lexicon: [],
      updatedAt: new Date().toISOString(),
    };
  },

  companyType(name, role) {
    if (/???|studio/i.test(name)) return '????;
    if (/??|??|??/.test(role)) return '????;
    if (/??|??|??|??/.test(name)) return '??/??';
    return '??';
  },

  industry(role) {
    if (/??|??|???|??|??|AI|??/.test(role)) return '??????;
    if (/??|??/.test(role)) return '??';
    if (/??|??|??|??|??/.test(role)) return '????';
    return '??????;
  },

  defaultOrganization(profile = {}) {
    const player = profile.name || '????';
    return [
      { name: '????, jobs: [{ title: '????, people: ['??'] }, { title: '????', people: ['??'] }] },
      { name: '??????, jobs: [{ title: '????', people: ['??'] }, { title: '?????, people: [player] }, { title: '??????, people: ['??'] }] },
      { name: '??????, jobs: [{ title: '????', people: ['??'] }, { title: '??????, people: ['????A', '????B'] }] },
      { name: '??????, jobs: [{ title: '????', people: ['??'] }, { title: '????, people: ['????'] }] },
    ];
  },

  baseSalary(role) {
    if (/??|??|lv\.5|??/.test(role)) return 18000;
    if (/??|??|??|??/.test(role)) return 9000;
    if (/??/.test(role)) return 0;
    return 6000;
  },
};


;// ---- company-actions.js ----
window.GameModules = window.GameModules || {};

window.GameModules.companyActions = {
  initCompanySystem() {
    const base = window.GameModules.companySystem.defaultState(this.playerProfile || {});
    this.companyState = { ...base, ...(this.companyState || {}) };
    this.companyState.employment = { ...base.employment, ...(this.companyState.employment || {}) };
    this.companyState.employmentRecords = this.companyState.employmentRecords?.length ? this.companyState.employmentRecords : base.employmentRecords;
    this.companyState.companies = this.companyState.companies?.length ? this.companyState.companies : base.companies;
    this.normalizeEmploymentRecords();
    this.syncCompanyLexicon();
  },

  currentCompany() {
    if (!this.companyState?.companies?.length) this.companyState = window.GameModules.companySystem.defaultState(this.playerProfile || {});
    const company = this.companyState.companies.find((item) => item.id === this.companyState.currentCompanyId) || this.companyState.companies[0];
    this.normalizeCompanyPolicy(company);
    return company;
  },

  normalizeCompanyPolicy(company) {
    company.workMode = { ...(company.workMode || {}), schedule: '????, workDays: '?????? };
    company.salary = company.salary || {};
    company.salary.performanceMonths = Number(company.salary.performanceMonths ?? company.salary.commissionMonths ?? 2);
    company.rules = ['??????????', '????????????, '??=???????????', '????=??????????????'];
    company.organization = company.organization?.length ? company.organization : window.GameModules.companySystem.defaultOrganization(this.playerProfile || {});
  },

  companyOrganization() {
    return this.companyState?.employment?.active === false ? [] : (this.currentCompany().organization || []);
  },

  normalizeEmploymentRecords() {
    const c = this.currentCompany();
    const r = this.companyState.employmentRecords[0];
    r.company = r.company || c.name;
    r.status = this.companyState.employment.active === false ? '???? : '??';
    r.startAt = r.startAt || this.companyState.employment.startAt || new Date().toISOString();
    r.endAt = this.companyState.employment.resignedAt || r.endAt || '';
    r.duration = this.employmentDurationText(r.startAt, r.endAt || new Date().toISOString());
  },

  employmentDurationText(start, end) {
    const days = Math.max(0, Math.floor((new Date(end) - new Date(start)) / 86400000));
    const months = Math.floor(days / 30);
    return months ? `${months}??${days % 30}?` : `${days}?`;
  },

  companyFieldReason(key, label, value) {
    const v = value || '????;
    const map = { name: `??????????{v}????????????????????????`, type: `???????{v}????????????????????????`, industry: `???????{v}????????????????????????`, scale: `???????{v}?????????????????????????`, location: `???????{v}??????????????????????????`, workMode: `???????{v}??????????????????????`, schedule: `???????{v}??????????????????????????`, workTime: `???????{v}??????????????????????`, baseSalary: `?????{v}????????????????????????????`, workDays: `???????????{v}??????????????????????`, dailySalary: `?????{v}?????????????????????????`, annualPerformance: `???????{v}????????????????????` };
    return map[key] || `${label}?????{v}???????????????????`;
  },

  companyFields() {
    if (this.companyState?.employment?.active === false) return [];
    const c = this.currentCompany();
    const salary = c.salary || {};
    const work = c.workMode || {};
    const pay = this.monthlyPayPreview();
    const row = (key, label, value, desc) => ({ key: `company-${key}`, label, kind: '????', value: value || '????, raw: value || '', desc, reason: this.companyFieldReason(key, label, value), worldTag: '2026 ????????', targetType: '????, commonField: true });
    return [
      row('name', '????', c.name, '????????????????????),
      row('type', '????', c.type, '???????????????????????),
      row('industry', '?????, c.industry, '????????????????????),
      row('scale', '????', c.scale, '???????????????????),
      row('location', '????', c.location, '?????????????),
      row('workMode', '????', work.type, '??????????????????),
      row('schedule', '????', `${work.schedule || '????}??{work.workDays || '??????}`, '??????????????????????????),
      row('workTime', '????', `${work.startTime}-${work.endTime}`, '???????????),
      row('baseSalary', '??', `${salary.monthlyBase || 0}${salary.currency || 'CNY'}`, '?????????????????????),
      row('workDays', '????????', `${pay.workDays}?`, '??????????????????),
      row('dailySalary', '??', `${pay.daily}???`, '??=?????????????),
      row('annualPerformance', '????', `${pay.performanceMonths}???? ? ${Math.round(pay.rate * 100)}% = ${pay.annualPerformance}?`, '????=????????????????),
    ];
  },

  syncCompanyLexicon() {
    const c = this.currentCompany();
    c.lexicon = this.companyFields().map((field) => ({ label: field.label, value: field.value, desc: field.desc }));
  },

  companyPromptContext() {
    const c = this.currentCompany();
    const stats = this.companyState?.workStats || {};
    const fields = this.companyFields().map((f) => `- ${f.label}??{f.value}??{f.desc}?`).join('\n');
    const org = this.companyOrganization().map((d) => `- ${d.name}??{d.jobs.map((j) => `${j.title}(${j.people.join('??)})`).join('??)}`).join('\n');
    return `# ????????\n${fields}\n# ??????\n${org}\n# ????????\n- ????{stats.lateCount || 0}?\n- ????{stats.absentCount || 0}?\n- ??????{stats.performance ?? 100}/100\n- ??????{(c.rules || []).join('??)}`;
  },

  workStatusText() {
    if (this.companyState?.employment?.active === false) return `??${this.companyState.employment.resignedCompany || '??'}??`;
    const stats = this.companyState?.workStats || {};
    const pay = this.monthlyPayPreview();
    return `????${stats.performance ?? 100}/100????{stats.lateCount || 0}????${stats.absentCount || 0}??????${pay.total}?`;
  },

  monthlyPayPreview() {
    const c = this.currentCompany();
    const s = c.salary || {};
    const stats = this.companyState?.workStats || {};
    const base = Number(s.monthlyBase) || 0;
    const rate = Number(stats.commissionRate) || Math.max(0, Math.min(Number(s.maxRate) || 0, (stats.performance ?? 100) / 100 * 0.18));
    const performanceMonths = Number(s.performanceMonths ?? s.commissionMonths) || 0;
    const workDays = this.currentMonthWorkDays();
    const daily = workDays ? Math.round(base / workDays) : 0;
    const annualPerformance = Math.round(performanceMonths * base * rate);
    return { base, rate, performanceMonths, workDays, daily, annualPerformance, total: base };
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
    const stats = this.companyState.workStats;
    const key = this.companyDateKey?.() || new Date().toISOString().slice(0, 10);
    if (stats.lastDecisionAt === key) return;
    if (choice === 'delay') { stats.lateCount += 1; stats.performance = Math.max(0, stats.performance - 6); }
    if (choice === 'absent') { stats.absentCount += 1; stats.performance = Math.max(0, stats.performance - 22); }
    stats.lastDecisionAt = key;
    this.companyState.workPromptOpen = false;
    this.companyState.pendingWork = null;
    this.save?.();
  },

  applyRecruitment(type) {
    const c = this.currentCompany();
    const id = `${type}-${Date.now()}`;
    if (type === 'employee') this.companyState.contracts.push({ id, type: '??', company: c.name, terms: '????????????????????????????', signedAt: this.phoneDateText?.() || '' });
    if (type === 'timed') this.companyState.submissions.push({ id, type: '????, company: c.name, target: '????????????, rewardRule: '????????00%????????', status: '???? });
    if (type === 'creator-low') this.companyState.contracts.push({ id, type: '????????, company: c.name, terms: '?????? + 5%??????', signedAt: this.phoneDateText?.() || '' });
    if (type === 'creator-high') this.companyState.contracts.push({ id, type: '????????', company: c.name, terms: '???? + 30%??????', signedAt: this.phoneDateText?.() || '' });
    if (type === 'employee') {
      const startAt = new Date().toISOString();
      this.companyState.employment = { active: true, startAt, resignedAt: '', resignedCompany: '' };
      this.companyState.employmentRecords.unshift({ id, company: c.name, status: '??', startAt, endAt: '', duration: '0?? });
    }
    this.save?.();
  },

  resignCompany() {
    const c = this.currentCompany();
    const endAt = new Date().toISOString();
    this.companyState.employment = { active: false, startAt: this.companyState.employment?.startAt || endAt, resignedAt: endAt, resignedCompany: c.name };
    const record = this.companyState.employmentRecords.find((item) => item.status === '??') || this.companyState.employmentRecords[0];
    if (record) Object.assign(record, { status: '????, endAt, duration: this.employmentDurationText(record.startAt, endAt) });
    this.companyState.workPromptOpen = false;
    this.companyState.pendingWork = null;
    this.companyState.contracts = [];
    this.companyState.submissions = [];
    this.syncCompanyLexicon();
    this.save?.();
  },

  openCompanyApp() {
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
  },

  closeCompanyApp() {
    this.companyState.open = false;
    this.closeAppToDesktop();
  },
};


;// ---- company-attendance-actions.js ----
window.GameModules = window.GameModules || {};

window.GameModules.companyAttendanceActions = {
  companyDateKey(date = this.phoneDate?.() || new Date()) {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  },

  companyHolidayName(date = this.phoneDate?.() || new Date()) {
    const md = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const ranges = [
      ['01-01', '01-03', '????'], ['02-15', '02-23', '????'], ['04-04', '04-06', '????'],
      ['05-01', '05-05', '??????], ['06-19', '06-21', '????'], ['09-25', '09-27', '????'],
      ['10-01', '10-07', '????'],
    ];
    const hit = ranges.find(([start, end]) => md >= start && md <= end);
    if (hit) return hit[2];
    if (date.getDay() === 0 || date.getDay() === 6) return '????;
    return '';
  },

  companyTimePoint(date, value, fallback) {
    const [h, m] = String(value || fallback).split(':').map(Number);
    const point = new Date(date);
    point.setHours(h || 0, m || 0, 0, 0);
    return point;
  },

  companyDurationText(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  },

  currentWorkAttendance() {
    this.initCompanySystem();
    const c = this.currentCompany();
    const work = c.workMode || {};
    const now = this.phoneDate?.() || new Date();
    const holiday = this.companyHolidayName(now);
    const inactive = this.companyState.employment?.active === false || work.type !== '??';
    if (inactive) return { status: '??', className: 'holiday', detail: '?????????????, canCheckIn: false };
    if (holiday) return { status: '??', className: 'holiday', detail: `${holiday}??????`, canCheckIn: false };
    const key = this.companyDateKey(now);
    const stats = this.companyState.workStats || {};
    if (stats.lastDecisionAt === key) return { status: '??', className: 'work', detail: '?????????, canCheckIn: false };
    const start = this.companyTimePoint(now, work.startTime, '09:00');
    const end = this.companyTimePoint(now, work.endTime, '18:00');
    if (now < start) return { status: '??', className: 'work', detail: `????????{work.startTime || '09:00'}???`, canCheckIn: true };
    if (now <= end) return { status: '??', className: 'late', detail: `????${this.companyDurationText(now - start)}??????`, canCheckIn: true };
    return { status: '??', className: 'absent', detail: `?????? ${work.endTime || '18:00'}??????????`, canCheckIn: false };
  },

  checkWorkReminder() {
    const attendance = this.currentWorkAttendance();
    this.companyState.workPromptOpen = false;
    this.companyState.pendingWork = null;
    if (attendance.status === '??') this.decideWorkAttendance('absent');
  },

  checkInWork() {
    const attendance = this.currentWorkAttendance();
    if (!attendance.canCheckIn) return;
    this.decideWorkAttendance(attendance.status === '??' ? 'delay' : 'work');
  },
};


;// ---- company-faction-actions.js ----
window.GameModules = window.GameModules || {};

window.GameModules.companyFactionActions = {
  upsertCompanyFromBossJob(job = {}) {
    if (!job?.company) return null;
    if (!this.companyState) this.initCompanySystem?.();
    const now = new Date().toISOString();
    let company = this.companyState.companies.find((item) => item.name === job.company || item.id === `company-${job.id}`);
    if (!company) {
      company = window.GameModules.companySystem.defaultCompany(job.company, this.playerProfile || {});
      company.id = `company-${job.id || Date.now()}`;
      this.companyState.companies.push(company);
    }
    Object.assign(company, {
      name: job.company,
      type: job.payType === '???? ? '????' : '??',
      industry: job.industry || company.industry,
      scale: job.scale || company.scale,
      location: job.address || company.location,
      updatedAt: now,
    });
    company.openings = [{ id: job.id || `job-${now}`, name: job.title || '????', type: job.payType || '??', desc: job.desc || '?Boss???????? }, ...(company.openings || []).filter((item) => item.name !== job.title)].slice(0, 12);
    this.ensureCompanyFaction(company, `Boss????????{job.company}????APP??????????`);
    return company;
  },

  ensureAllCompanyFactions() {
    if (!this.companyState) this.initCompanySystem?.();
    (this.companyState?.companies || []).forEach((company) => this.ensureCompanyFaction(company, '??APP???????????????????));
  },

  ensureCompanyFaction(company = {}, reason = '??APP?????????) {
    if (!company?.name) return null;
    if (!this.factionState) this.initFactionSystem?.();
    if (!this.factionState?.factions) return null;
    const id = company.id === 'main-company' ? 'company-main' : this.factionIdByName?.(company.name);
    const now = new Date().toISOString();
    const expectedTop = window.GameModules.factionSystem.countryFaction(this.playerProfile || {});
    const top = this.factionState.factions.find((item) => item.id === expectedTop.id || item.name === expectedTop.name) || this.factionState.factions.find((item) => item.type === '??' && !item.parentId) || expectedTop;
    let faction = this.factionState.factions.find((item) => item.id === id || item.name === company.name);
    if (!faction) {
      faction = this.normalizeFactionStructure?.({ id, name: company.name, type: company.type || '??', parentId: top.id, parentName: top.name, level: '????', location: company.location || '??', domain: company.industry || '????', scale: company.scale || '??', stance: '??????', influence: 35, description: `??APP????????${company.name}?`, structure: [], rules: [], resources: [], relations: [], fixed: true, updatedAt: now }) || {};
      this.factionState.factions.push(faction);
    }
    Object.assign(faction, { name: company.name, type: company.type || faction.type || '??', location: company.location || faction.location, domain: company.industry || faction.domain, scale: company.scale || faction.scale, parentId: top.id, parentName: top.name, updatedAt: now });
    this.syncCompanyOrganizationToFaction(faction, company, reason, now);
    window.GameModules.orgTerritoryActions?.syncCompanyEconomicEntry?.(this, faction, company, reason);
    Object.assign(faction, window.GameModules.orgTerritory?.normalizeFaction?.(faction, this) || faction);
    faction.fieldReasons = this.completeFactionReasons?.(faction, faction.fieldReasons, reason) || faction.fieldReasons || {};
    faction.changeLog = [{ field: 'company-sync', reason, at: now, action: 'sync' }, ...(faction.changeLog || [])].slice(0, 50);
    return faction;
  },

  syncCompanyOrganizationToFaction(faction, company, reason, now) {
    faction.structure = faction.structure || [];
    const org = Array.isArray(company.organization) ? company.organization : [];
    for (const dept of org) {
      let node = faction.structure.find((item) => item.name === dept.name);
      if (!node) {
        node = { name: dept.name, level: '????', roles: [] };
        faction.structure.push(node);
      }
      node.level = node.level || '????';
      node.roles = this.normalizeFactionRoles?.(node.roles) || node.roles || [];
      for (const job of dept.jobs || []) {
        let role = node.roles.find((item) => item.title === job.title);
        if (!role) {
          role = { title: job.title, count: job.people?.length || '??', characters: [] };
          node.roles.push(role);
        }
        role.characters = Array.from(new Set([...(role.characters || []), ...(job.people || ['??'])]));
        role.count = role.count || role.characters.length || '??';
      }
    }
  },

  ensureBossJobFaction(job = {}, event = {}) {
    const company = this.upsertCompanyFromBossJob(job);
    const faction = this.ensureCompanyFaction(company, `????????{event.type || '??'}????????????`);
    if (faction) this.addFactionRoleOccupant(faction, job.title || '????', this.playerProfile?.name || '????', `?????????????????{event.type || '??'}???`);
  },

  addPlayerForcePosition(entry = {}) {
    const state = this.playerIdentityState?.();
    if (!state?.values || !entry.force || !entry.position) return;
    const ot = window.GameModules.orgTerritory;
    const orgId = entry.orgId || ot?.resolveOrgIdByName?.(this, entry.force) || '';
    const row = { name: `${entry.force} / ${entry.position}`, force: entry.force, position: entry.position, orgId, reason: entry.reason || '???????????, changeMode: 'Boss????' };
    const list = Array.isArray(state.values.force_positions) ? state.values.force_positions : [];
    if (!list.some((item) => item.force === row.force && item.position === row.position)) state.values.force_positions = [...list, row];
    ot?.upsertCharacterMembership?.(state, { orgId, orgName: entry.force, title: entry.position, reason: row.reason, since: this.phoneDate?.()?.toISOString?.() || new Date().toISOString() }, this);
    if (state.profile) {
      const profileList = Array.isArray(state.profile.force_positions) ? state.profile.force_positions : [];
      if (!profileList.some((item) => item.force === row.force && item.position === row.position)) state.profile.force_positions = [...profileList, row];
    }
    window.GameModules.sqliteSave.saveCharacterState?.(state).catch((err) => console.warn('[????] ????:', err.message, err.stack));
  },
};


;// ---- boss-recruitment.js ----
window.GameModules = window.GameModules || {};

window.GameModules.bossRecruitment = {
  defaultBossState(profile = {}) {
    return {
      open: false,
      filtersCollapsed: false,
      generating: false,
      generationError: '',
      requestId: 0,
      pageSize: 10,
      randomSeed: 0,
      usePlayerFit: false,
      customPrompt: '',
      selectedJobId: '',
      companyDetailOpen: false,
      detailJobId: '',
      applyJobId: '',
      applyHours: 1,
      applyMessage: '',
      filters: {
        industry: '',
        scale: '', province: '', city: '', county: '', town: '', payType: '',
        baseMin: '', baseMax: '', performanceMonths: '', creatorPay: '', creatorLevel: '',
      },
      jobs: [],
    };
  },


  defaultBossJobs(profile = {}) {
    const city = profile.refinedCity || profile.city || '????????????????';
    return [
      { id: 'employee-fe', title: '???????, company: '??????', industry: '??????, scale: '50-150??, address: city, payType: '??', base: 9000, performanceMonths: 2, desc: '???????????????????????????? },
      { id: 'employee-ops', title: '??????', company: '????', industry: '??????, scale: '20-50??, address: city, payType: '??', base: 6000, performanceMonths: 1, desc: '??????????????????????? },
      { id: 'creator-contract', title: '??????, company: '????', industry: '????', scale: '10-20??, address: city, payType: '????, creatorPay: '????', level: 'A????, base: 3200, royalty: '18%', desc: '??????????????????????????????????????? },
      { id: 'creator-buyout', title: '???????, company: '????', industry: '????', scale: '10-20??, address: city, payType: '????, creatorPay: '??????, buyout: '800-5000????, desc: '?????????????????????????????? },
      { id: 'hourly-help', title: '??????????, company: '????', industry: '??????, scale: '20-50??, address: city, payType: '????, hourly: 45, desc: '???????????????????????????? },
    ];
  },
};


;// ---- boss-actions.js ----
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
    this.identityAppOpen = false; this.wechatAppOpen = false; this.saveAppOpen = false; this.roleCardJsonAppOpen = false; this.worldlineAppOpen = false;
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
      Object.assign(this.bossState, { open: false, companyDetailOpen: false, detailJobId: '', applyMessage: '', generating: false });
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
    if (f.payType === '??' && !this.bossEmployeeMatches(job, f)) return false;
    if (f.payType === '???? && !this.bossCreatorMatches(job, f)) return false;
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
    const row = (key, label, value, desc) => ({ key: `boss-company-${key}`, label, value: value || '????, desc });
    return [
      row('name', '????', job.company, '????????????),
      row('industry', '?????, job.industry, '????????????????),
      row('scale', '????', job.scale, '??????????????????),
      row('location', '????', job.address, '?????????????),
      row('workMode', '????', job.payType, '??????????????????),
      row('jobTitle', '????', job.title, '??????????????????????????),
      row('skills', '???????, (job.skills || []).join('??), '???????????????????),
      row('matchProfessions', '??????', this.bossMatchText(job, 'matchProfessions'), 'AI???????????????????????????),
      row('matchSkills', '???????, this.bossMatchText(job, 'matchSkills'), 'AI???????????????????????????),
      row('matchKnowledge', '??????', this.bossMatchText(job, 'matchKnowledge'), 'AI???????????????????????????),
      row('salary', '????', this.bossJobPayText(job), '????????????????),
    ];
  },

  bossMatchText(job, key) {
    const list = Array.isArray(job?.[key]) ? job[key] : [];
    return list.length ? list.join('??) : '';
  },

  bossMatchSummary(job) {
    const items = [this.bossMatchText(job, 'matchProfessions'), this.bossMatchText(job, 'matchSkills'), this.bossMatchText(job, 'matchKnowledge')].filter(Boolean);
    return items.length ? `????{items.join('??)}` : '';
  },

  bossApplyButtonText(job = this.selectedBossCompanyJob()) {
    if (!job) return '????';
    if (job.payType === '????) return '?????????';
    if (job.payType === '????) return '??????????;
    return '??????????;
  },

  bossApplyHint(job = this.selectedBossCompanyJob()) {
    if (!job) return '';
    if (job.payType === '????) return '?????????????????;
    if (job.payType === '????) return '???????????????????????;
    return '?????????????????;
  },

  bossJobPayText(job) {
    if (!job) return '?????';
    if (job.payType === '??') return `??${job.base}????${job.performanceMonths}??????`;
    if (job.creatorPay === '????') return `${job.level}??????{job.base}????${job.royalty}`;
    if (job.creatorPay === '??????) return `????{job.buyout}`;
    return `${job.hourly}?????????`;
  },
};


;// ---- boss-appointment-actions.js ----
window.GameModules = window.GameModules || {};

window.GameModules.bossAppointmentActions = {
  bossAppointmentChoices(job = this.selectedBossCompanyJob()) {
    if (!job) return [];
    if (!Array.isArray(this.bossState.appointmentChoices) || this.bossState.appointmentJobId !== job.id) {
      this.bossState.appointmentChoices = this.generateBossAppointmentChoices(job);
      this.bossState.appointmentJobId = job.id;
      this.bossState.selectedAppointmentIndex = 0;
    }
    return this.bossState.appointmentChoices;
  },

  generateBossAppointmentChoices(job) {
    const now = this.phoneDate?.() || new Date();
    const durations = [30, 45, 60];
    const rows = [];
    for (let offset = 1; rows.length < 4 && offset <= 10; offset += 1) {
      const date = new Date(now);
      date.setDate(date.getDate() + offset);
      const week = date.getDay();
      if (week === 0 || week === 6) continue;
      const slots = [9, 10, 14, 15, 16].sort(() => Math.random() - 0.5);
      for (const hour of slots) {
        if (rows.length >= 4) break;
        const start = new Date(date);
        start.setHours(hour, 0, 0, 0);
        if (start <= now) continue;
        const durationMinutes = durations[Math.floor(Math.random() * durations.length)];
        rows.push({ start: start.toISOString(), durationMinutes, label: this.bossAppointmentLabel(start, durationMinutes, job) });
      }
    }
    return rows;
  },

  bossAppointmentLabel(date, durationMinutes, job) {
    const type = job.payType === '???? ? '????? : job.payType === '???? ? '????' : '??';
    const text = date.toLocaleString('zh-CN', { weekday: 'short', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    return `${text}??{type}${durationMinutes}??`;
  },

  selectedBossAppointment(job = this.selectedBossCompanyJob()) {
    const rows = this.bossAppointmentChoices(job);
    return rows[Number(this.bossState.selectedAppointmentIndex) || 0] || rows[0] || null;
  },

  createBossAppointment(job) {
    const pick = this.selectedBossAppointment(job);
    const hours = Math.max(Number(this.bossState.applyHours) || 1, 1);
    const type = job.payType === '???? ? '????' : job.payType === '???? ? '????' : '??';
    const title = `${job.company}??{job.title}??{type}`;
    const note = job.payType === '???? ? `??${hours}????{this.bossJobPayText(job)}` : this.bossJobPayText(job);
    return { title, type, time: pick?.start || new Date().toISOString(), durationMinutes: pick?.durationMinutes || 60, company: job.company, jobTitle: job.title, note, matterType: 'job-appointment', status: 'pending' };
  },

  applyBossJob() {
    const job = this.selectedBossCompanyJob();
    if (!job) return;
    const event = this.createBossAppointment(job);
    this.addCalendarEvent?.(event);
    this.upsertCompanyFromBossJob?.(job);
    this.ensureBossJobFaction?.(job, event);
    this.addPlayerForcePosition?.({ force: job.company, position: `??${job.title}`, reason: `????{job.company}??{job.title}????${event.type}???` });
    this.bossState.applyMessage = `??????${event.title}??{this.formatCalendarTime(event.time)}`;
    this.save?.();
  },
};


;// ---- boss-ai-actions.js ----
window.GameModules = window.GameModules || {};

window.GameModules.bossAiActions = {
  async generateBossJobsByAI() {
    this.initBossRecruitment();
    if (this.bossState.generating) return;
    Object.assign(this.bossState, { generating: true, generationError: '', requestId: (this.bossState.requestId || 0) + 1 });
    const requestId = this.bossState.requestId;
    try {
      const text = await Promise.race([this.requestBossJobsText(), new Promise((resolve) => setTimeout(() => resolve(''), 60000))]);
      if (requestId !== this.bossState.requestId) return;
      const jobs = this.parseBossJobs(text).slice(0, this.bossState.pageSize);
      if (!jobs.length) jobs.push(...this.fallbackBossJobsFromAI(text || 'AI????????????'));
      this.cacheBossJobs(jobs); this.bossState.selectedJobId = this.currentBossJobs()[0]?.id || ''; this.save?.();
    } catch (err) {
      if (requestId !== this.bossState.requestId) return;
      console.error('AI????????:', err.code, err.message, err.stack);
      this.cacheBossJobs(this.fallbackBossJobsFromAI(err.message || 'AI????????????'));
      this.bossState.selectedJobId = this.currentBossJobs()[0]?.id || ''; this.bossState.generationError = 'AI????????????????????????;
    } finally { if (requestId === this.bossState.requestId) this.bossState.generating = false; }
  },

  async requestBossJobsText() {
    const count = Number(this.bossState.pageSize) || 10;
    const chunks = this.bossJobChunks(count);
    const jobs = [];
    for (let i = 0; i < chunks.length; i += 1) {
      const text = await this.requestBossJobsChunk(chunks[i], i + 1, chunks.length);
      jobs.push(...this.parseBossJobs(text));
    }
    return JSON.stringify(jobs);
  },

  bossJobChunks(count) {
    if (count <= 5) return [count];
    const chunks = [];
    let left = count;
    while (left > 0) {
      const size = Math.min(5, left);
      chunks.push(size);
      left -= size;
    }
    return chunks;
  },

  async requestBossJobsChunk(count, chunkIndex, chunkTotal) {
    let buffer = '';
    const prompt = await this.bossJobsPrompt(count, chunkIndex, chunkTotal);
    await window.GameModules.aiRequest.complete({
      source: chunkTotal > 1 ? `boss-jobs-${chunkIndex}` : 'boss-jobs', model: this.modelId || this.settingsState?.textModelId, prompt, timeoutMs: 60000,
      ...(window.GameModules.promptSkills?.completionOptions?.('boss-jobs') || { jsonMode: true, responseFormat: { type: 'json_object' }, outputLimitKind: 'other' }),
      requireDone: true,
      onChunk: (content, done, info) => {
        if (this.bossState.requestId) buffer = info.buffer;
        if (done) this.bossState.generationDoneAt = this.phoneDateText?.() || '';
      },
    });
    return buffer;
  },

  async bossJobsPrompt(count = Number(this.bossState.pageSize) || 10, chunkIndex = 1, chunkTotal = 1) {
    const f = this.bossState.filters, area = [f.province, f.city, f.county, f.town].filter(Boolean).join(' ') || '??????????';
    const player = this.bossState.usePlayerFit ? this.bossPlayerFitPrompt() : '??????????????????????????????????????????;
    const chunkNote = chunkTotal > 1 ? `????{chunkIndex}/${chunkTotal}??????????????????????` : '?????????????;
    const body = await window.GameModules.renderPrompt('boss-jobs', { ??: count, ????: this.bossPlayerAbilitiesPrompt(), ??: f.industry || '??', ??: f.scale || '??', ??: area, ??: f.payType || '??', ??: `${f.baseMin || '??'}-${f.baseMax || '??'}`, ??: f.performanceMonths || '??', ?????? f.creatorPay || '??', ??: f.creatorLevel || '??', ????: player, ????: chunkNote, ????: String(this.bossState.customPrompt || '').trim() || '??, ????: `${this.bossState.randomSeed || Date.now()}-${chunkIndex}` });
    return `${body}\n\nDeepSeek JSON mode override: return one valid JSON object only, not a root array. The root object must be {"jobs":[...]}, and jobs must contain exactly ${count} job objects.`;
  },

  bossPlayerFitPrompt() {
    const p = this.playerProfile || {};
    const fields = this.playerProfileLexiconFields?.().filter((x) => ['????', '????', '????', '??????, '??'].includes(x.label)).map((x) => `${x.label}:${x.value}`).join('??) || '';
    return `????????????????????0%?????????${p.name || this.playerName || '??'}????${p.refinedRole || p.dailyRole || '??'}????=${p.refinedCity || p.city || '??'}????${this.bossPlayerAbilitiesPrompt()}??{fields}`;
  },
  bossPlayerAbilitiesPrompt() {
    const values = this.currentRpgState?.values || this.playerIdentityState?.()?.values || {};
    const line = (key, label) => `${label}:${(values[key] || []).slice(0, 12).map((x) => `${x.name || x}lv${x.level || 1}`).join('??) || '??}`;
    return [line('professions', '??'), line('skills', '???), line('knowledge', '??')].join('??);
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
    const compact = source.replace(/[??]/g, '"').replace(/[??]/g, "'").replace(/??g, ',').replace(/??g, ':');
    const start = compact.indexOf('['), end = compact.lastIndexOf(']'), objectStart = compact.indexOf('{'), objectEnd = compact.lastIndexOf('}');
    const arrayText = start >= 0 && end >= start ? compact.slice(start, end + 1) : compact, objectText = objectStart >= 0 && objectEnd >= objectStart ? compact.slice(objectStart, objectEnd + 1) : '';
    return [arrayText, objectText].filter(Boolean).flatMap((text) => { const noComments = text.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''); const fixed = noComments.replace(/([{,]\s*)([A-Za-z_][\w]*)(\s*:)/g, '$1"$2"$3').replace(/,\s*([}\]])/g, '$1').replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"'); return [noComments, fixed]; });
  },

  parseBossTextJobs(source) {
    const chunks = source.split(/(?:^|\n)\s*(?:??|??)?\s*\d+\s*[.??:]?/).map((s) => s.trim()).filter(Boolean);
    const jobs = chunks.map((chunk, index) => this.bossJobFromText(chunk, index)).filter(Boolean);
    return jobs.length ? jobs : this.fallbackBossJobsFromAI(source);
  },

  bossJobFromText(chunk, index) {
    const pick = (...names) => {
      for (const name of names) {
        const m = chunk.match(new RegExp(`${name}\\s*[:?]\\s*([^\\n??]+)`));
        if (m) return m[1].trim();
      }
      return '';
    };
    const title = pick('title', '??', '??') || chunk.match(/(?:??|??)([^\n???]{2,18})/)?.[1];
    const company = pick('company', '??', '??');
    if (!title || !company) return null;
    return {
      title, company,
      industry: pick('industry', '??', '??'), scale: pick('scale', '??', '??'),
      address: pick('address', '??', '??'), payType: pick('payType', '????', '??'),
      base: Number(pick('base', '??').match(/\d+/)?.[0]) || 0,
      performanceMonths: Number(pick('performanceMonths', '????', '??????').match(/\d+/)?.[0]) || 0,
      creatorPay: pick('creatorPay', '????'), level: pick('level', '????'), royalty: pick('royalty', '??'),
      buyout: pick('buyout', '??'), hourly: Number(pick('hourly', '??', '????').match(/\d+/)?.[0]) || 0,
      desc: pick('desc', '??', '??') || chunk.slice(0, 90), id: `ai-text-${Date.now()}-${index}`,
    };
  },

  fallbackBossJobsFromAI(source) {
    const f = this.bossState.filters || {};
    const count = Number(this.bossState.pageSize) || 10;
    const industries = f.industry ? [f.industry] : ['??????, '????', '????', '????', '????', '????', '????', '????', '?????, '????', '??????, '????', '????', '????', '????', '????', '????', '????', '????', '????'];
    const payTypes = f.payType ? [f.payType] : ['??', '????, '????];
    return Array.from({ length: count }, (_, i) => {
      const industry = industries[(i + (this.bossState.randomSeed || 0)) % industries.length];
      const payType = payTypes[i % payTypes.length];
      const title = this.fallbackBossTitle(industry, payType, i);
      return { id: `ai-fallback-${Date.now()}-${i}`, title, company: `${industry}?????{i + 1}`, industry, scale: f.scale || ['10-20??, '20-50??, '50-150??, '150-500??][i % 4], address: [f.province || '????, f.city || '????, f.county || '????, f.town || '????'].join(' '), payType, base: Number(f.baseMin) || 4500 + i * 650, performanceMonths: Number(f.performanceMonths) || 1 + (i % 3), creatorPay: f.creatorPay || (payType === '???? ? (i % 2 ? '?????? : '????') : ''), level: f.creatorLevel || ['C????, 'B????, 'A????][i % 3], royalty: '8%-22%', buyout: '800-8000????, hourly: payType === '???? ? 24 + i * 3 : 0, skills: this.defaultBossSkills({ title, payType }), desc: source.slice(0, 80) || 'AI??????????????????????, matchProfessions: [], matchSkills: [], matchKnowledge: [] };
    });
  },

  fallbackBossTitle(industry, payType, index) {
    const map = { ???? ['???????, '??????, '????', '???????, '????????], ???? ['??????, '??????, '??????', '????????, '??????'] };
    if (map[payType]) return map[payType][index % map[payType].length];
    const pairs = [[/AI|????|??/, ['????????', '??????, 'AI????', '????????]], [/??|??|??|??/, ['??', '??', '??????, '?????']], [/??|??/, ['????', '????, '????', '??']], [/??|??/, ['????', '????', '????']], [/??|??|??/, ['??', '????', '????', '????']], [/??|??|??/, ['??????, '??????, '??????, '??????]], [/??|????, ['??????, '??????, '????']], [/??|??|??/, ['????', '????', '????']]];
    const found = pairs.find(([re]) => re.test(industry))?.[1] || ['???????', '???????', '????', '??????, '????'];
    return found[index % found.length];
  },

  normalizeBossTitle(job, index) {
    const raw = String(job.title || '').trim();
    const invalid = /^(??|???|???????\d*$/.test(raw) || this.titleMismatchesIndustry(raw, job.industry);
    if (raw && !invalid) return raw;
    const titles = this.industryBossTitles(job);
    return titles[Number(String(index).split('-').pop()) % titles.length];
  },

  titleMismatchesIndustry(title, industry = '') {
    const text = `${industry} ${this.bossState.filters?.industry || ''}`;
    if (/???|??|??/.test(text) && /??|??|??|??|??|??|??|??/.test(title)) return true;
    if (/??|??|??/.test(text)) return !/??|??|??|??|??|??|??.test(title);
    if (/??|??|??|??/.test(text)) return !/??|??|??|??/.test(title);
    if (/??|??|??/.test(text)) return !/??|??|??|??/.test(title);
    if (/??|??|??|??|??/.test(text)) return !/??|??|??|??|??|??/.test(title);
    if (/??|??|??|??/.test(text)) return !/??|??|??|??|???|??|????.test(title);
    return false;
  },

  industryBossTitles(job) {
    const industry = `${job.industry || ''} ${this.bossState.filters?.industry || ''}`;
    if (job.payType === '????) return ['???????, '??????, '????', '????'];
    if (job.payType === '????) return ['??????, '??????, '??????, '??????'];
    if (/??|??|??/.test(industry)) return ['??', '??', '??', '?????'];
    if (/??|??|??|??/.test(industry)) return ['????', '????', '????'];
    if (/??|??|??/.test(industry)) return ['??', '????', '????];
    if (/??|??|??|??/.test(industry)) return ['??', '????', '????', '????'];
    if (/??|??|??|??/.test(industry)) return ['??????, '??????, '??????, '??????];
    if (/??|????.test(industry)) return ['??????, '??????, '????'];
    return ['???????', '???????', '????????', '????', '??????];
  },

  defaultBossSkills(job) {
    const title = String(job.title || '??');
    if (/??|AI|??|??/.test(title)) return ['????', '????', '????'];
    if (/??|??|??|????.test(title)) return ['JavaScript', '?????, '????'];
    if (/??|??|??|??|??/.test(title)) return ['????', '?????, '????'];
    if (/??|??|??/.test(title)) return ['????', '????', '????'];
    if (/??|??|??/.test(title)) return ['????', '?????, '????'];
    if (/??|??|??|??/.test(title)) return ['????', '????', '????'];
    if (job.payType === '???? || /??|??|??|??|??/.test(title)) return ['????', '??????, '?????];
    if (job.payType === '????) return ['????', '????', '????'];
    return ['???????, '?????, '????'];
  },

  normalizeBossJob(job, index) {
    if (!job?.title || !job?.company) return null;
    const title = this.normalizeBossTitle(job, index);
    const idSeed = `${job.company}-${title}-${this.bossState.randomSeed}-${index}`.replace(/\s+/g, '-');
    return {
      id: String(job.id || `ai-job-${idSeed}`), title, company: String(job.company),
      industry: String(job.industry || this.bossState.filters.industry || '??????),
      scale: String(job.scale || this.bossState.filters.scale || '20-50??),
      address: String(job.address || '????????????????'), payType: String(job.payType || this.bossState.filters.payType || '??'),
      base: Number(job.base) || 0, performanceMonths: Number(job.performanceMonths) || 0,
      skills: Array.isArray(job.skills) ? job.skills.map(String) : this.defaultBossSkills(job),
      creatorPay: job.creatorPay || '', level: job.level || '', royalty: job.royalty || '', buyout: job.buyout || '', hourly: Number(job.hourly) || 0,
      matchProfessions: this.normalizeBossMatches(job.matchProfessions, 'professions'),
      matchSkills: this.normalizeBossMatches(job.matchSkills, 'skills'),
      matchKnowledge: this.normalizeBossMatches(job.matchKnowledge, 'knowledge'),
      desc: String(job.desc || '?????????),
    };
  },

  normalizeBossMatches(value, key) {
    const values = this.currentRpgState?.values || this.playerIdentityState?.()?.values || {};
    const owned = new Map((values[key] || []).map((x) => [String(x.name || x), x]));
    const raw = Array.isArray(value) ? value : String(value || '').split(/[???]/);
    return raw.map((x) => String(x?.name || x).trim()).filter((name, index, arr) => name && owned.has(name) && arr.indexOf(name) === index);
  },
};


;// ---- calendar-system.js ----
window.GameModules = window.GameModules || {};

window.GameModules.calendarSystem = {
  defaultCalendarState() {
    const now = new Date();
    return { open: false, events: [], year: now.getFullYear(), month: now.getMonth() };
  },
};


;// ---- calendar-actions.js ----
window.GameModules = window.GameModules || {};

window.GameModules.calendarActions = {
  initCalendar() {
    const base = window.GameModules.calendarSystem.defaultCalendarState();
    this.calendarState = { ...base, ...(this.calendarState || {}) };
    this.calendarState.events = this.calendarState.events || [];
    this.calendarState.year = Number(this.calendarState.year) || base.year;
    this.calendarState.month = Number.isFinite(Number(this.calendarState.month)) ? Number(this.calendarState.month) : base.month;
  },

  openCalendarApp() {
    this.initCalendar();
    this.identityAppOpen = false;
    this.wechatAppOpen = false;
    this.saveAppOpen = false;
    this.roleCardJsonAppOpen = false;
    this.worldlineAppOpen = false;
    if (this.companyState) this.companyState.open = false;
    if (this.bossState) this.bossState.open = false;
    if (this.factionState) this.factionState.open = false;
    if (this.skillsState) this.skillsState.open = false;
    if (this.knownProfessionState) this.knownProfessionState.open = false;
    if (this.promptState) this.promptState.open = false;
    if (this.tokenStatsState) this.tokenStatsState.open = false;
    this.calendarState.open = true;
    this.desktopUnlocked = true;
  },

  closeCalendarApp() {
    if (this.calendarState) this.calendarState.open = false;
    this.closeAppToDesktop();
  },

  addCalendarEvent(event) {
    this.initCalendar();
    this.calendarState.events.unshift({ ...event, id: event.id || `cal-${Date.now()}`, createdAt: event.createdAt || new Date().toISOString() });
    this.save?.();
  },

  sortedCalendarEvents() {
    this.initCalendar();
    return [...this.calendarState.events].sort((a, b) => new Date(a.time) - new Date(b.time));
  },

  calendarMonthTitle() {
    this.initCalendar();
    return `${this.calendarState.year}??{this.calendarState.month + 1}?`;
  },

  changeCalendarMonth(delta) {
    this.initCalendar();
    const date = new Date(this.calendarState.year, this.calendarState.month + delta, 1);
    this.calendarState.year = date.getFullYear();
    this.calendarState.month = date.getMonth();
  },

  calendarDays() {
    this.initCalendar();
    const y = this.calendarState.year;
    const m = this.calendarState.month;
    const first = new Date(y, m, 1).getDay();
    const total = new Date(y, m + 1, 0).getDate();
    const cells = Array.from({ length: first }, (_, i) => ({ key: `blank-${i}`, blank: true }));
    for (let day = 1; day <= total; day += 1) {
      const date = new Date(y, m, day);
      const events = this.eventsForCalendarDay(day);
      const holiday = this.companyHolidayName?.(date) || '';
      cells.push({ key: `${y}-${m}-${day}`, day, events, holiday, blank: false });
    }
    while (cells.length % 7) cells.push({ key: `blank-end-${cells.length}`, blank: true });
    return cells;
  },

  eventsForCalendarDay(day) {
    const y = this.calendarState.year;
    const m = this.calendarState.month;
    return this.calendarState.events.filter((event) => {
      const d = new Date(event.time);
      return d.getFullYear() === y && d.getMonth() === m && d.getDate() === day;
    });
  },

  formatCalendarTime(value) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '?????? : d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  },
};


;// ---- faction-system.js ----
window.GameModules = window.GameModules || {};

window.GameModules.factionSystem = {
  defaultState(profile = {}) {
    const country = this.countryFaction(profile);
    const company = this.companyFaction(profile, country);
    return { open: false, detailOpen: false, orgChartOpen: false, orgChartMode: 'forest', forestTab: 'corp', generating: false, error: '', requestId: 0, selectedId: company.id, customPrompt: '', showAllStubs: false, factions: [country, company] };
  },

  inferTopCountry(profile = {}) {
    const text = [profile.country, profile.nationality, profile.refinedCity, profile.city, profile.refinedRole, profile.dailyRole, profile.role, profile.work, profile.worldbuildingNote, profile.notes, profile.detail].filter(Boolean).join(' ');
    if (/美国|美利坚|USA|U\.S\.|United States|American|纽约|洛杉矶|旧金山|华盛顿|加州/i.test(text)) return { id: 'country-usa', name: '美利坚合众国', location: '北美', gov: '美利坚合众国联邦政府', head: '总统' };
    if (/日本|Japan|Japanese|东京|大阪|京都/i.test(text)) return { id: 'country-japan', name: '日本国', location: '东亚', gov: '日本国政府', head: '内阁总理大臣' };
    if (/英国|英格兰|United Kingdom|Britain|British|伦敦/i.test(text)) return { id: 'country-uk', name: '大不列颠及北爱尔兰联合王国', location: '西欧', gov: '英国政府', head: '首相' };
    if (/法国|France|French|巴黎/i.test(text)) return { id: 'country-france', name: '法兰西共和国', location: '西欧', gov: '法兰西共和国政府', head: '总统' };
    return { id: 'country-china', name: '中华人民共和国', location: '东亚', gov: '中华人民共和国政府', head: '国家主席' };
  },

  countryFaction(profile = {}) {
    const top = this.inferTopCountry(profile);
    return {
      id: top.id, name: top.name, type: '国家', orgDomain: 'country', sovereign: true, parentId: '', parentName: '无势力归属', level: '国家级',
      location: top.location, domain: '国家治理', scale: '超大型', stance: '现实秩序维护', influence: 95,
      description: '根据玩家/主角现实资料推断出的最高国家级势力，作为公司、学校和组织归属基准。',
      resolution: 'L1',
      stub: { oneLine: `${top.name}（国家级法域 stub，推演接触后细化）` },
      status: 'active',
      solid: { capabilities: { political: { entries: [] }, economic: { entries: [] }, asset: { entries: [] }, military: { entries: [] } } },
      structure: [
        { id: `struct-${top.id}-gov`, name: top.gov, kind: 'department', state: 'sketch', parentRef: { fog: false, orgNodeId: null, label: top.name }, level: '国家级别', roles: [{ title: top.head, count: 1, state: 'fog', titleFog: false, dutyFog: true, occupantFog: true, characters: ['未知'], occupants: [] }] },
      ],
      rules: ['公司、学校、工作室等现实组织默认归属于主角所在最高势力。', '国家级规则优先于普通组织规则。'],
      resources: ['法律体系', '行政资源', '公共基础设施'], relations: [], fieldReasons: this.defaultReasons('根据玩家/主角资料推断最高国家级势力；无明确国家证据时默认中华人民共和国。'), fixed: true, updatedAt: new Date().toISOString(),
    };
  },

  companyFaction(profile = {}, country = null) {
    const name = profile.workplace || '成都星河云栈科技有限公司';
    const parentCountry = country || this.countryFaction(profile);
    const forest = window.GameModules.factionOrgForest;
    const corpParentId = forest?.domainRootId?.(parentCountry.id, 'corp') || parentCountry.id;
    const corpParentName = forest?.DOMAIN_LABELS?.corp || '经济组织';
    return {
      id: 'company-main', name, type: /工作室|studio/i.test(name) ? '工作室' : '公司', orgDomain: 'corp', ownership: 'private', foundingType: 'independent', parentId: corpParentId, parentName: corpParentName, level: '公司级',
      location: profile.refinedCity || profile.city || '现实城市未登记', domain: '现代服务业', scale: '中小型', stance: '雇佣与经营', influence: 35,
      description: '玩家当前工作或默认关联的公司势力，挂接于视窗根下的经济组织域根。',
      resolution: 'L1',
      stub: { oneLine: `${name}（公司 stub，内部架构待推演固化）` },
      status: 'active',
      solid: { capabilities: { political: { entries: [] }, economic: { entries: [] }, asset: { entries: [] }, military: { entries: [] } } },
      structure: [], rules: ['内部组织结构由AI按现实合理性生成后固化。'], resources: ['雇佣关系', '薪酬制度', '工作任务'], relations: [], fieldReasons: this.defaultReasons('当前公司上下文初始化字段，后续由AI全量检视补全理由与组织构成。'), fixed: true, updatedAt: new Date().toISOString(),
    };
  },

  defaultReasons(text) {
    return ['name', 'type', 'parentId', 'parentName', 'level', 'location', 'domain', 'scale', 'stance', 'influence', 'description', 'structure', 'rules', 'resources', 'relations'].reduce((out, key) => {
      out[key] = text;
      return out;
    }, {});
  },
};


;// ---- faction-archive.js ----
window.GameModules = window.GameModules || {};

window.GameModules.factionArchive = {
  docLimit: 10000,
  paragraphTarget: 100,

  ensure(store) {
    store.initFactionSystem?.();
    store.factionState = store.factionState || {};
    store.factionState.archives = store.factionState.archives && typeof store.factionState.archives === 'object' ? store.factionState.archives : {};
    return store.factionState.archives;
  },

  factionKey(faction = {}) {
    return String(faction.id || faction.name || '').trim();
  },

  relatedFactions(store, text = '', extraNames = []) {
    store.initFactionSystem?.();
    const raw = String(text || '');
    const extras = extraNames.map((x) => String(x || '').trim()).filter(Boolean);
    const rows = store.factionState?.factions || [];
    const hits = rows.filter((faction) => {
      const name = String(faction.name || '').trim();
      if (!name) return false;
      return raw.includes(name) || extras.includes(name) || extras.includes(String(faction.id || ''));
    });
    const currentCompany = store.currentCompany?.()?.name || store.companyState?.companies?.[0]?.name || '';
    if (/??|??|??|??|??|??|??|??|??/.test(raw) && currentCompany) {
      const company = rows.find((f) => f.name === currentCompany || f.id === 'company-main');
      if (company && !hits.some((f) => this.factionKey(f) === this.factionKey(company))) hits.push(company);
    }
    if (/??|??|??|??|??|??|??|??/.test(raw)) {
      const top = rows.find((f) => f.type === '??' && !f.parentId);
      if (top && !hits.some((f) => this.factionKey(f) === this.factionKey(top))) hits.push(top);
    }
    return hits.slice(0, 6);
  },

  forcePositionNames(state = {}) {
    const profile = state.profile || state || {};
    const list = profile.force_positions || profile.forcePositions || [];
    return Array.isArray(list) ? list.map((item) => item.force || item.faction || item.name).filter(Boolean) : [];
  },

  recordRealWorld(store, action = '', result = {}) {
    const migrated = window.GameModules.updateRegistry?.migrateLegacyFactionUpdates?.(result) || result;
    const updateNames = window.GameModules.updateRegistry?.orgNamesFromGenericUpdates?.(migrated.genericUpdates, store) || [];
    const text = [
      `??????{action}`,
      result.locationName ? `????{result.locationName}` : '',
      result.sceneTitle ? `????{result.sceneTitle}` : '',
      result.narration ? `????{result.narration}` : '',
      result.thinking ? `??????{result.thinking}` : '',
      result.quest ? `????{result.quest}` : '',
      result.status ? `???${result.status}` : '',
    ].filter(Boolean).join('??);
    this.appendForRelated(store, text, updateNames, '????');
  },

  recordWechat(store, contact = {}, playerText = '', replyText = '', result = {}) {
    const state = store.rpgStates?.[contact.id] || window.GameModules.sqliteSave?.getCharacterState?.(contact.id) || {};
    const names = this.forcePositionNames(state);
    const text = [
      `??????{store.playerName || '??'}???{playerText}?`,
      `${state.profile?.name || contact.name || '????}????{replyText}?`,
      result.mood ? `????{result.mood}` : '',
      result.imageIntent?.imageDescription ? `??????{result.imageIntent.imageDescription}` : '',
    ].filter(Boolean).join('??);
    this.appendForRelated(store, text, names, '????');
  },

  appendForRelated(store, text = '', extraNames = [], source = '??') {
    const factions = this.relatedFactions(store, text, extraNames);
    if (!factions.length) return [];
    const archives = this.ensure(store);
    const now = store.phoneDate?.().toISOString?.() || new Date().toISOString();
    const paragraphs = this.paragraphs(text);
    factions.forEach((faction) => this.appendArchive(archives, faction, paragraphs, source, now));
    return factions;
  },

  paragraphs(text = '') {
    const sentences = String(text || '').replace(/\s+/g, ' ').match(/[^?????]+[?????]?/g) || [];
    const out = [];
    let current = '';
    sentences.forEach((sentence) => {
      const next = `${current}${sentence}`.trim();
      current = next;
      if (current.length >= this.paragraphTarget) {
        out.push(current);
        current = '';
      }
    });
    if (current) out.push(current);
    return out.map((p) => p.slice(0, 600)).filter(Boolean).slice(0, 20);
  },

  appendArchive(archives, faction = {}, paragraphs = [], source = '', now = '') {
    const key = this.factionKey(faction);
    if (!key || !paragraphs.length) return null;
    const archive = archives[key] || { factionId: faction.id || key, factionName: faction.name || key, docs: [], updatedAt: now };
    archive.factionName = faction.name || archive.factionName;
    archive.docs = Array.isArray(archive.docs) ? archive.docs : [];
    paragraphs.forEach((paragraph) => {
      let doc = archive.docs[archive.docs.length - 1];
      if (!doc || doc.sealed || Number(doc.charCount || 0) >= this.docLimit) {
        const index = archive.docs.length + 1;
        doc = { id: `${key}-archive-${index}`, title: `${archive.factionName}????${index}`, sourceTypes: [], paragraphs: [], charCount: 0, sealed: false, createdAt: now, updatedAt: now };
        archive.docs.push(doc);
      }
      doc.paragraphs.push({ text: paragraph, source, at: now });
      doc.charCount = (doc.paragraphs || []).reduce((sum, item) => sum + String(item.text || '').length, 0);
      doc.updatedAt = now;
      if (source && !doc.sourceTypes.includes(source)) doc.sourceTypes.push(source);
      if (doc.charCount >= this.docLimit) doc.sealed = true;
    });
    archive.docs = archive.docs.slice(-20);
    archive.updatedAt = now;
    archives[key] = archive;
    return archive;
  },

  contextFor(store, seed = '', max = 1800) {
    const archives = this.ensure(store);
    const related = this.relatedFactions(store, seed, []);
    const selected = related.length ? related : (store.factionState?.factions || []).slice(0, 4);
    const rows = selected.map((faction) => this.archiveBrief(archives[this.factionKey(faction)], faction)).filter(Boolean);
    return rows.join('\n\n').slice(0, max) || '???????????;
  },

  archiveBrief(archive = null, faction = {}) {
    if (!archive) return `????{faction.name || '??'}??????????`;
    const doc = (archive.docs || [])[archive.docs.length - 1];
    if (!doc) return `????{archive.factionName}??????????`;
    const recent = (doc.paragraphs || []).slice(-3).map((p) => `- ${p.text}`).join('\n');
    return [`????{archive.factionName}`, `??????{doc.title}??{doc.charCount || 0}/${this.docLimit}??${doc.sealed ? '???? : '????}`, recent].filter(Boolean).join('\n');
  },
};


;// ---- faction-archive-actions.js ----
window.GameModules = window.GameModules || {};

window.GameModules.factionArchiveActions = {
  ensureFactionArchiveView() {
    this.initFactionSystem?.();
    window.GameModules.factionArchive?.ensure?.(this);
    this.factionState.selectedArchiveDocId = this.factionState.selectedArchiveDocId || '';
  },

  factionArchiveKey(faction = null) {
    if (!faction) return '';
    return String(faction.id || faction.name || '').trim();
  },

  factionArchiveDocs(faction = null) {
    this.ensureFactionArchiveView();
    const selected = faction || this.selectedFaction?.();
    const key = this.factionArchiveKey(selected);
    const name = String(selected?.name || '').trim();
    const archives = Object.values(this.factionState.archives || {}).filter((archive) => (
      !key || archive.factionId === key || archive.factionName === name
    ));
    return archives.flatMap((archive) => (archive.docs || []).map((doc) => ({
      ...doc,
      archiveKey: `${archive.factionId || archive.factionName}-${doc.id}`,
      factionId: archive.factionId,
      factionName: archive.factionName || '????',
    }))).sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  },

  openFactionArchiveDoc(key = '') {
    this.ensureFactionArchiveView();
    this.factionState.selectedArchiveDocId = key;
  },

  closeFactionArchiveDoc() {
    if (this.factionState) this.factionState.selectedArchiveDocId = '';
  },

  selectedFactionArchiveDoc() {
    const key = this.factionState?.selectedArchiveDocId || '';
    return this.factionArchiveDocs(this.selectedFaction?.()).find((doc) => doc.archiveKey === key) || null;
  },

  factionArchiveDocMeta(doc = null) {
    if (!doc) return '?????';
    const source = (doc.sourceTypes || []).join('??) || '????';
    return `${doc.charCount || 0}??${doc.sealed ? '???? : '????}??{source}`;
  },

  factionArchiveParagraphTime(item = {}) {
    if (!item.at) return '????';
    try { return new Date(item.at).toLocaleString('zh-CN'); } catch (_) { return item.at; }
  },
};


;// ---- faction-actions.js ----
window.GameModules = window.GameModules || {};
if (!window.GameModules._factionInitInflight) window.GameModules._factionInitInflight = new WeakMap();

window.GameModules.factionActions = {
  initFactionSystem() {
    const inflight = window.GameModules._factionInitInflight;
    if (inflight.get(this)) return;
    inflight.set(this, true);
    try {
    const base = window.GameModules.factionSystem.defaultState(this.playerProfile || {});
    this.factionState = { ...base, ...(this.factionState || {}) };
    this.factionState.factions = this.factionState.factions?.length ? this.factionState.factions : base.factions;
    this.factionState.factions = this.factionState.factions.map((faction) => {
      const normalized = window.GameModules.orgTerritory?.normalizeFaction?.(
        this.normalizeFactionStructure({ ...faction, fieldReasons: this.completeFactionReasons?.(faction, faction.fieldReasons) || faction.fieldReasons || {} }),
        this,
      ) || this.normalizeFactionStructure({ ...faction, fieldReasons: this.completeFactionReasons?.(faction, faction.fieldReasons) || faction.fieldReasons || {} });
      return normalized;
    });
    window.GameModules.factionOrgForest?.migrateFactionForest?.(this);
    this.syncAllCharacterMemberships?.();
    window.GameModules.orgTerritory?.validateWorldConsistency?.(this);
    window.GameModules.orgTerritoryActions?.syncPlayerWealthAsset?.(this);
    const top = base.factions[0];
    if (top && !this.factionState.factions.some((faction) => faction.id === top.id || faction.name === top.name)) this.factionState.factions.unshift(top);
    if (top) this.factionState.factions.sort((a, b) => (a.id === top.id ? -1 : b.id === top.id ? 1 : 0));
    this.syncCompanyFaction?.();
    this.ensureAllCompanyFactions?.();
    this.syncRoleCardFactionPositions?.();
    } finally {
      inflight.delete(this);
    }
  },

  syncCompanyFaction() {
    if (!this.factionState) return;
    const c = this.currentCompany?.() || this.companyState?.companies?.[0];
    if (!c) return;
    const item = this.factionState.factions.find((x) => x.id === 'company-main');
    if (!item) return;
    const expectedTop = window.GameModules.factionSystem.countryFaction(this.playerProfile || {});
    const top = this.factionState.factions.find((x) => x.id === expectedTop.id || x.name === expectedTop.name) || this.factionState.factions.find((x) => x.type === '??' && !x.parentId) || expectedTop;
    const forest = window.GameModules.factionOrgForest;
    const corpRootId = forest?.domainRootId?.(top.id, 'corp') || top.id;
    const corpRoot = this.factionState.factions.find((x) => x.id === corpRootId);
    const updates = {
      name: c.name,
      type: c.type || item.type,
      location: c.location || item.location,
      domain: c.industry || item.domain,
      orgDomain: 'corp',
      ownership: item.ownership || 'private',
      foundingType: item.foundingType || 'independent',
      parentId: corpRootId,
      parentName: corpRoot?.name || forest?.DOMAIN_LABELS?.corp || '经济组织',
    };
    const changed = Object.keys(updates).filter((key) => updates[key] !== item[key]);
    Object.assign(item, updates);
    if (changed.length) item.changeLog = [{ field: changed.join('??), reason: '???????????????????????, at: new Date().toISOString(), action: 'adjust' }, ...(item.changeLog || [])];
    item.fieldReasons = this.completeFactionReasons?.(item, item.fieldReasons, '??????????????????) || item.fieldReasons || {};
  },

  normalizeFactionStructure(faction = {}) {
    const ot = window.GameModules.orgTerritory;
    faction.structure = (faction.structure || []).map((node, index) => {
      const name = node.name === '???????? ? this.factionPositionNodeName(faction, node.roles?.[0]?.title) : node.name;
      const base = { ...node, name, roles: node.roles };
      return ot?.normalizeStructureNode?.(base, faction, index, this) || { ...base, roles: this.normalizeFactionRoles(node.roles) };
    });
    return faction;
  },

  factionPositionNodeName(faction = {}, title = '') {
    if (faction.name === '???????? && String(title || '').includes('??')) return '??????';
    return '??????;
  },

  normalizeFactionRoles(roles = []) {
    const ot = window.GameModules.orgTerritory;
    if (ot?.normalizeRole) return (Array.isArray(roles) ? roles : []).map((role) => ot.normalizeRole(role, this));
    return (Array.isArray(roles) ? roles : []).map((role) => {
      if (typeof role === 'string') return { title: role, characters: ['??'] };
      const title = String(role?.title || role?.name || role?.position || '??????).trim();
      const chars = Array.isArray(role?.characters) ? role.characters : (role?.character ? [role.character] : []);
      return { title, characters: chars.map(String).filter(Boolean).length ? chars.map(String).filter(Boolean) : ['??'] };
    });
  },

  syncRoleCardFactionPositions() {
    if (!this.factionState) return;
    this.collectRoleCardForcePositions().forEach((item) => this.ensureFactionPosition(item));
  },

  collectRoleCardForcePositions() {
    const cards = [];
    try { cards.push(this.playerCharacter?.()); } catch (_) { /* ????????????*/ }
    cards.push(this.selectedPlayerRoleCard?.(), ...(this.selectedRelationRoleCards?.() || []));
    const validCards = cards.filter(Boolean);
    const rows = [];
    const blockedForce = /^(????|????|????|??|??|????????$/;
    const blockedPosition = /^(??|??|???|????|??)$/;
    const push = (entry, characterName = '??') => {
      const force = String(entry?.force || entry?.faction || entry?.name || '').split('/')[0].trim();
      const position = String(entry?.position || entry?.role || entry?.rank || '').trim();
      if (force && position && !blockedForce.test(force) && !blockedPosition.test(position)) rows.push({ force, position, characterName, reason: entry.reason || '??????????????? });
    };
    validCards.forEach((card) => (card.force_positions || card.forcePositions || []).forEach((entry) => push(entry, card.name || card.id || '??')));
    return rows;
  },

  factionIdByName(name = '') {
    const slug = String(name || 'faction').replace(/\s+/g, '-').slice(0, 28);
    return `force-${slug}`;
  },

  ensureFactionPosition(item = {}) {
    const name = String(item.force || '').trim();
    const position = String(item.position || '??').trim();
    if (!name) return null;
    const now = new Date().toISOString();
    let faction = this.factionState.factions.find((x) => x.name === name || x.id === this.factionIdByName(name));
    if (!faction) {
      const top = this.factionState.factions.find((x) => x.type === '??' && !x.parentId) || window.GameModules.factionSystem.countryFaction(this.playerProfile || {});
      const isTopCountry = name === top.name;
      faction = this.normalizeFactionStructure({ id: isTopCountry ? top.id : this.factionIdByName(name), name, type: isTopCountry ? '??' : '??', parentId: isTopCountry ? '' : top.id, parentName: isTopCountry ? '?????? : top.name, level: isTopCountry ? '???? : '????, location: this.playerProfile?.refinedCity || this.playerProfile?.city || '??', domain: '??????', scale: '??', stance: '??????????', influence: 30, description: `????????????????${name}?`, structure: [], rules: [], resources: [], relations: [], fixed: true, updatedAt: now });
      faction.fieldReasons = this.completeFactionReasons?.(faction, {}, '???????????????????????????) || {};
      faction.changeLog = [{ field: 'all', reason: item.reason || '????????????????????, at: now, action: 'add' }];
      this.factionState.factions.push(faction);
    }
    this.addFactionRoleOccupant(faction, position, item.characterName || '??', item.reason || '????????????, now);
    return faction;
  },

  addFactionRoleOccupant(faction, title, character, reason, at = new Date().toISOString()) {
    faction.structure = faction.structure || [];
    const nodeName = this.factionPositionNodeName(faction, title);
    let node = faction.structure.find((x) => x.name === nodeName || x.name === '????????);
    if (!node) {
      node = { name: nodeName, roles: [] };
      faction.structure.push(node);
    }
    node.name = nodeName;
    node.roles = this.normalizeFactionRoles(node.roles);
    let role = node.roles.find((x) => x.title === title);
    let changed = false;
    if (!role) {
      role = { title, characters: [] };
      node.roles.push(role);
      changed = true;
    }
    const before = role.characters?.length || 0;
    role.characters = Array.from(new Set([...(role.characters || []), character || '??'].filter(Boolean)));
    changed = changed || role.characters.length !== before;
    if (!changed) return;
    faction.updatedAt = at;
    faction.changeLog = [{ field: 'structure', reason, at, action: 'add-position' }, ...(faction.changeLog || [])].slice(0, 50);
    if (character && character !== '??') {
      const charState = window.GameModules.orgTerritory?.findCharacterStateByName?.(this, character);
      if (charState) {
        window.GameModules.orgTerritory?.upsertCharacterMembership?.(charState, {
          orgId: faction.id,
          orgName: faction.name,
          title,
          department: nodeName,
          departmentFog: false,
          since: at,
          reason,
        }, this);
        this.rpgStates = { ...(this.rpgStates || {}), [charState.id]: charState };
        window.GameModules.sqliteSave?.saveCharacterState?.(charState);
      }
    }
  },

  openFactionApp() {
    this.initFactionSystem();
    this.identityAppOpen = false; this.wechatAppOpen = false; this.saveAppOpen = false; this.roleCardJsonAppOpen = false; this.worldlineAppOpen = false;
    if (this.companyState) this.companyState.open = false;
    if (this.bossState) this.bossState.open = false;
    if (this.calendarState) this.calendarState.open = false;
    if (this.skillsState) this.skillsState.open = false;
    if (this.knownProfessionState) this.knownProfessionState.open = false;
    if (this.promptState) this.promptState.open = false;
    if (this.tokenStatsState) this.tokenStatsState.open = false;
    if (this.alertLogState) this.alertLogState.open = false;
    this.factionState.open = true;
    this.desktopUnlocked = true;
  },

  closeFactionApp() {
    if (this.factionState) {
      this.factionState.open = false;
      this.factionState.detailOpen = false;
      this.factionState.orgChartOpen = false;
    }
    this.closeAppToDesktop();
  },

  selectedFaction() {
    if (!this.factionState) this.initFactionSystem();
    return this.factionState.factions.find((x) => x.id === this.factionState.selectedId) || this.factionState.factions[0];
  },

  selectFaction(id) {
    if (!this.factionState) this.initFactionSystem();
    this.factionState.selectedId = id;
    this.factionState.orgCacheSelectedId = '';
    this.factionState.detailOpen = true;
    if (this.factionState.orgChartOpen) this.refreshFactionOrgCache?.();
  },
  closeFactionDetail() {
    if (!this.factionState) return;
    this.factionState.detailOpen = false;
    this.factionState.orgChartOpen = false;
    this.factionState.selectedArchiveDocId = '';
  },

  openFactionOrgChart() {
    if (!this.factionState) this.initFactionSystem();
    if (!this.factionState.orgChartMode) this.factionState.orgChartMode = 'forest';
    if (!this.factionState.forestTab) this.factionState.forestTab = 'corp';
    this.refreshFactionOrgCache?.();
    this.factionState.orgChartOpen = true;
  },

  closeFactionOrgChart() {
    if (this.factionState) this.factionState.orgChartOpen = false;
  },

  factionRoleText(roles = []) {
    return this.normalizeFactionRoles(roles).map((role) => `${role.title}??{(role.characters || ['??']).join('??)}`).join('??) || '??????;
  },

  factionOrgNodes() {
    return window.GameModules.factionOrgActions?.factionOrgTreeRoot?.call(this)?.children
      || window.GameModules.factionOrgActions?.buildFactionOrgTree?.(this.selectedFaction())?.children
      || [];
  },

  factionOrgTreeRoot() {
    return window.GameModules.factionOrgActions?.factionOrgTreeRoot?.call(this) || null;
  },

  factionOrgTreeRows() {
    return window.GameModules.factionOrgActions?.factionOrgTreeRows?.call(this) || [];
  },

  factionParentName(faction) {
    const forest = window.GameModules.factionOrgForest;
    const affiliated = forest?.resolveAffiliatedFaction?.(faction, this.factionState?.factions || []);
    if (forest) {
      if (affiliated?.name) return affiliated.name;
      if (!faction?.parentId) return '无势力归属';
      if (faction?.foundingType === 'independent') return '独立组织';
      return '无势力归属';
    }
    if (!faction?.parentId) return '无势力归属';
    return this.factionState.factions.find((x) => x.id === faction.parentId)?.name || faction.parentName || '未知势力';
  },

  selectedFactionAffiliatedLabel() {
    const faction = this.selectedFaction?.();
    if (!faction) return '';
    return window.GameModules.factionOrgForest?.affiliatedFactionLabel?.(faction, this.factionState?.factions || []) || '';
  },
  factionChildren(id) {
    if (!id || !this.factionState?.factions) return [];
    return this.factionState.factions.filter((x) => x.parentId === id);
  },

  orgTerritoryConsistencyNotice() {
    return '';
  },

  dismissOrgTerritoryConsistencyNotice() {
    if (this.orgTerritoryConsistency) this.orgTerritoryConsistency.dismissed = true;
  },

  hasOrgTerritoryReconciliationLog() {
    return (Array.isArray(this.orgTerritoryReconciliationLog) ? this.orgTerritoryReconciliationLog : []).length > 0;
  },

  orgTerritoryReconciliationEntries() {
    return (Array.isArray(this.orgTerritoryReconciliationLog) ? this.orgTerritoryReconciliationLog : []).slice().reverse().slice(0, 15);
  },

  orgTerritoryReconciliationText(entry = {}) {
    const kind = String(entry?.kind || '').trim();
    const at = String(entry?.at || '').slice(0, 19).replace('T', ' ');
    if (kind === 'territory-control-dedupe') {
      return `${at} ???? ? ${entry.location || '??} ? ?? ${entry.keptSummary || '??}????${entry.droppedSummary || '??}`;
    }
    if (kind === 'story-world-skip') {
      return `${at} ??????? ${entry.count || 0} ??${entry.types || ''}?`;
    }
    if (kind === 'settlement-truncated') {
      return `${at} ???? ? ?? ${entry.kept || 0} ?? ${entry.dropped || 0}`;
    }
    return `${at} ${kind || '??'}`;
  },

  toggleFactionReconciliationLog() {
    if (!this.factionState) return;
    this.factionState.reconciliationOpen = !this.factionState.reconciliationOpen;
  },

  visibleFactions() {
    if (this.factionState?.showAllStubs) return this.factionState?.factions || [];
    return (this.factionState?.factions || []).filter((f) => (window.GameModules.orgTerritory?.factionExposureScore?.(f, this) || 0) > 0);
  },

  toggleFactionStubIndex() {
    if (!this.factionState) return;
    this.factionState.showAllStubs = !this.factionState.showAllStubs;
  },

  selectedFactionStubNotice() {
    const faction = this.selectedFaction();
    if (!faction) return '';
    const resolution = String(faction.resolution || 'L1').toUpperCase();
    if (resolution === 'L1' && !(faction.structure || []).length) return '????????????????stub??;
    return '';
  },
};


;// ---- faction-org-forest.js ----
/**
 * 势力组织 · 森林模型（数据层）
 * 设计依据：docs/schemas/faction-org-forest-design.md v1.3.3
 */
window.GameModules = window.GameModules || {};

window.GameModules.factionOrgForest = {
  DOMAIN_KEYS: ['gov', 'geo', 'corp', 'community'],

  DOMAIN_LABELS: {
    gov: '国家机构',
    geo: '行政区划',
    corp: '经济组织',
    community: '社群',
  },

  domainRootId(sovereignId, domain) {
    return `${sovereignId}-domain-${domain}`;
  },

  isDomainRootId(id = '') {
    return /-domain-(gov|geo|corp|community)$/.test(String(id || ''));
  },

  resolveViewportRoot(factions = []) {
    const list = Array.isArray(factions) ? factions : [];
    const sovereigns = list.filter((f) => f.sovereign === true || (f.orgDomain === 'country' && f.type === '国家' && !f.parentId));
    if (sovereigns.length) {
      const ranked = sovereigns.sort((a, b) => {
        if (a.parentId && !b.parentId) return 1;
        if (!a.parentId && b.parentId) return -1;
        return String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN');
      });
      return ranked[0];
    }
    return list.find((f) => f.type === '国家' && !f.parentId) || list.find((f) => f.orgDomain === 'country') || null;
  },

  inferOrgDomain(faction = {}) {
    if (faction.orgDomain) return faction.orgDomain;
    if (faction.type === '国家' || faction.sovereign) return 'country';
    if (faction.isDomainRoot) {
      const m = String(faction.id || '').match(/-domain-(gov|geo|corp|community)$/);
      if (m) return m[1];
    }
    if (faction.kind === 'admin' || /^admin-/.test(String(faction.id || ''))) return 'geo';
    if (faction.kind === 'community' || /^community-/.test(String(faction.id || ''))) return 'community';
    if (faction.ownership === 'state' || faction.type === '政府' || faction.type === '机关') return 'gov';
    if (['公司', '工作室', '企业'].includes(faction.type) || faction.ownership === 'private') return 'corp';
    return 'corp';
  },

  inferOwnership(faction = {}) {
    if (faction.ownership === 'state' || faction.ownership === 'private') return faction.ownership;
    if (faction.orgDomain === 'geo' || faction.orgDomain === 'community' || faction.kind === 'admin' || faction.kind === 'community') return null;
    if (faction.type === '国家') return null;
    if (faction.ownership === 'state' || ['政府', '机关', '学校'].includes(faction.type) && faction.description?.includes('国立')) return 'state';
    return 'private';
  },

  inferFoundingType(faction = {}, allFactions = []) {
    if (faction.foundingType === 'independent' || faction.foundingType === 'subordinate') return faction.foundingType;
    const parent = allFactions.find((f) => f.id === faction.parentId);
    if (!parent || parent.isDomainRoot || this.isDomainRootId(parent.id)) return 'independent';
    if (parent.orgDomain === 'country') return 'independent';
    return 'subordinate';
  },

  makeDomainRoot(sovereign = {}, domain = 'corp', labels = {}) {
    const id = this.domainRootId(sovereign.id, domain);
    const labelMap = { ...this.DOMAIN_LABELS, ...labels };
    return {
      id,
      name: labelMap[domain] || domain,
      type: '域根',
      orgDomain: domain,
      ownership: null,
      sovereign: false,
      isDomainRoot: true,
      parentId: sovereign.id,
      parentName: sovereign.name || '',
      level: '域级',
      location: sovereign.location || '',
      domain: labelMap[domain],
      scale: '抽象层',
      stance: '中立',
      influence: 10,
      description: `${labelMap[domain]}域根（森林模型占位节点）`,
      resolution: 'L1',
      stub: { oneLine: `${labelMap[domain]}（域根）` },
      status: 'active',
      structure: [],
      rules: [],
      resources: [],
      relations: [],
      fixed: true,
    };
  },

  ensureDomainRoots(factions = [], sovereign = null) {
    const list = [...factions];
    const root = sovereign || this.resolveViewportRoot(list);
    if (!root?.id) return { factions: list, created: [] };
    const created = [];
    this.DOMAIN_KEYS.forEach((domain) => {
      const id = this.domainRootId(root.id, domain);
      if (!list.some((f) => f.id === id)) {
        const node = this.makeDomainRoot(root, domain);
        list.push(node);
        created.push(node);
      }
    });
    return { factions: list, created };
  },

  stripDuplicateStructureRoot(faction = {}) {
    if (!faction?.structure?.length) return faction;
    const fname = String(faction.name || '').trim();
    faction.structure = faction.structure.filter((node, index) => {
      if (index === 0 && String(node.name || '').trim() === fname) return false;
      return true;
    });
    return faction;
  },

  isAdminGeoParent(parentId = '') {
    return /^admin-|^community-/.test(String(parentId || ''));
  },

  corpDomainRootId(factions = [], sovereignId = '') {
    const sid = sovereignId || this.resolveViewportRoot(factions)?.id;
    return sid ? this.domainRootId(sid, 'corp') : '';
  },

  govDomainRootId(factions = [], sovereignId = '') {
    const sid = sovereignId || this.resolveViewportRoot(factions)?.id;
    return sid ? this.domainRootId(sid, 'gov') : '';
  },

  geoDomainRootId(factions = [], sovereignId = '') {
    const sid = sovereignId || this.resolveViewportRoot(factions)?.id;
    return sid ? this.domainRootId(sid, 'geo') : '';
  },

  sanitizeFactionParentDomain(faction = {}, allFactions = [], log = []) {
    if (!faction?.id) return faction;
    const forest = this;
    faction.orgDomain = forest.inferOrgDomain(faction);
    faction.ownership = forest.inferOwnership(faction);
    faction = forest.stripDuplicateStructureRoot(faction);

    const sovereign = forest.resolveViewportRoot(allFactions);
    if (!sovereign?.id) return faction;

    const corpRoot = forest.domainRootId(sovereign.id, 'corp');
    const govRoot = forest.domainRootId(sovereign.id, 'gov');
    const geoRoot = forest.domainRootId(sovereign.id, 'geo');

    const isCompany = faction.orgDomain === 'corp' || ['公司', '工作室', '企业'].includes(faction.type);
    const isPrivate = faction.ownership === 'private' || (isCompany && faction.ownership !== 'state');

    if (isPrivate && (forest.isAdminGeoParent(faction.parentId) || faction.parentId === sovereign.id)) {
      log.push({ kind: 'parent-reparent', factionId: faction.id, from: faction.parentId, to: corpRoot });
      faction.parentId = corpRoot;
      const root = allFactions.find((f) => f.id === corpRoot);
      faction.parentName = root?.name || forest.DOMAIN_LABELS.corp;
    }

    if (faction.ownership === 'state' && forest.isAdminGeoParent(faction.parentId)) {
      log.push({ kind: 'state-to-gov-root', factionId: faction.id, from: faction.parentId, to: govRoot });
      faction.parentId = govRoot;
      const root = allFactions.find((f) => f.id === govRoot);
      faction.parentName = root?.name || forest.DOMAIN_LABELS.gov;
    }

    if (faction.kind === 'admin' && faction.parentId === sovereign.id) {
      faction.parentId = geoRoot;
      const root = allFactions.find((f) => f.id === geoRoot);
      faction.parentName = root?.name || forest.DOMAIN_LABELS.geo;
      faction.orgDomain = 'geo';
    }

    if (!faction.foundingType) {
      faction.foundingType = forest.inferFoundingType(faction, allFactions);
    }

    return faction;
  },

  migrateFactionForest(store) {
    const log = [];
    store.initFactionSystem?.();
    let factions = [...(store.factionState?.factions || [])];

    factions = factions.map((f) => {
      if (f.type === '国家' && !f.parentId) {
        f.orgDomain = 'country';
        f.sovereign = true;
      }
      return f;
    });

    const sovereign = this.resolveViewportRoot(factions);
    if (sovereign) {
      sovereign.orgDomain = 'country';
      sovereign.sovereign = true;
      const ensured = this.ensureDomainRoots(factions, sovereign);
      factions = ensured.factions;
      if (ensured.created.length) {
        log.push({ kind: 'domain-roots-created', count: ensured.created.length, sovereignId: sovereign.id });
      }
    }

    factions = factions.map((f) => this.sanitizeFactionParentDomain(f, factions, log));

    factions.forEach((f) => {
      if (!f.foundingType) f.foundingType = this.inferFoundingType(f, factions);
    });

    if (store.factionState) store.factionState.factions = factions;
    if (log.length && store.pushAlertLog) {
      store.pushAlertLog({
        level: 'info',
        category: '势力系统',
        title: '森林模型迁移',
        message: `migrateFactionForest: ${log.length} 项调整`,
        source: 'factionOrgForest.migrate',
      });
    }
    store.orgTerritoryReconciliationLog = [...(store.orgTerritoryReconciliationLog || []), ...log.map((item) => ({ ...item, at: store.phoneDate?.()?.toISOString?.() || new Date().toISOString() }))].slice(-50);
    return { factions, log };
  },

  resolveAffiliatedFaction(faction = {}, allFactions = []) {
    if (!faction?.id) return null;
    if (faction.foundingType === 'independent') return null;
    const parent = allFactions.find((f) => f.id === faction.parentId);
    if (!parent || parent.isDomainRoot || this.isDomainRootId(parent.id) || parent.orgDomain === 'country') return null;
    if (faction.foundingType === 'subordinate') return parent;
    return parent.isDomainRoot ? null : parent;
  },

  affiliatedFactionLabel(faction = {}, allFactions = []) {
    const aff = this.resolveAffiliatedFaction(faction, allFactions);
    if (!aff) return '';
    return aff.name || '';
  },

  factionHasExposure(faction = {}, store) {
    const ot = window.GameModules.orgTerritory;
    const score = ot?.factionExposureScore?.(faction, store) ?? 0;
    if (score > 0) return true;
    if (faction.fixed || faction.id === 'company-main') return true;
    if (faction.resolution && String(faction.resolution).toUpperCase() !== 'L1') return true;
    return false;
  },

  filterForestByExposure(factions = [], store) {
    return factions.filter((f) => {
      if (f.isDomainRoot) return true;
      if (f.orgDomain === 'country' || f.sovereign) return true;
      return this.factionHasExposure(f, store);
    });
  },

  canIntroduceOrg({ archive = [], worldLore = '', exposureHint = false } = {}) {
    const hasArchive = Array.isArray(archive) ? archive.length > 0 : Boolean(archive);
    if (!hasArchive && !exposureHint && !worldLore) {
      return { allowed: false, reason: '无 archive/正文/资料锚点', maxResolution: 'L1' };
    }
    if (exposureHint && !hasArchive) {
      return { allowed: true, reason: '听说过锚点', maxResolution: 'L1' };
    }
    return { allowed: true, reason: '有 archive 依据', maxResolution: 'L2' };
  },
};


;// ---- faction-org-actions.js ----
/**
 * 势力组织图 · 森林 UI 构建
 * 设计依据：docs/schemas/faction-org-forest-design.md v1.3.3
 */
window.GameModules = window.GameModules || {};

const _factionOrgActionsBase = {
  normalizeFactionStructure(faction = {}) {
    const ot = window.GameModules.orgTerritory;
    const forest = window.GameModules.factionOrgForest;
    faction.structure = (faction.structure || []).map((node, index) => {
      const legacy = ['角色卡势力地位', '已确认职位', '国家法定身份'].includes(node.name);
      const name = legacy ? this.factionPositionNodeName(faction) : (node.organizationName || node.orgName || node.name || faction.name);
      const level = node.level || node.rank || this.factionNodeLevel(faction, node.name);
      const base = { ...node, name, level, roles: node.roles };
      return ot?.normalizeStructureNode?.({ ...base, level }, faction, index, this) || { ...base, roles: this.normalizeFactionRoles(node.roles) };
    });
    if (forest?.stripDuplicateStructureRoot) forest.stripDuplicateStructureRoot(faction);
    return faction;
  },

  factionNodeLevel(faction = {}, nodeName = '') {
    if (nodeName === '国家法定身份') return '国家法定身份';
    if (String(nodeName).includes('中央')) return '中央级别';
    if (String(nodeName).includes('地方')) return '地方级别';
    return faction.level || '组织级别';
  },

  factionPositionNodeName(faction = {}) {
    return faction.name || '未命名组织';
  },

  normalizeFactionRoles(roles = []) {
    const ot = window.GameModules.orgTerritory;
    if (ot?.normalizeRole) {
      return (Array.isArray(roles) ? roles : []).map((role) => ot.normalizeRole(role, this));
    }
    return (Array.isArray(roles) ? roles : []).map((role) => {
      if (typeof role === 'string') return this.decorateFactionRole({ title: role, count: '未知', characters: ['未知'] });
      const title = String(role?.title || role?.name || role?.position || '未命名职位').trim();
      const chars = Array.isArray(role?.characters) ? role.characters : (role?.character ? [role.character] : []);
      const characters = chars.map(String).filter(Boolean).length ? chars.map(String).filter(Boolean) : ['未知'];
      const count = role?.count ?? role?.quantity ?? role?.number ?? (characters.includes('未知') ? '未知' : characters.length);
      return this.decorateFactionRole({ ...role, title, count, characters });
    });
  },

  decorateFactionRole(role = {}) {
    const characters = Array.isArray(role.characters) && role.characters.length ? role.characters : ['未知'];
    return { ...role, characters, preview: this.factionRolePreviewText(characters), overflow: characters.length > 4 };
  },

  factionRolePreviewText(characters = []) {
    return characters.slice(0, 4).join('、') + (characters.length > 4 ? '……' : '');
  },

  factionRoleText(roles = []) {
    return this.normalizeFactionRoles(roles).map((role) => `${role.title}｜数量:${role.count}｜角色:${role.preview}`).join('；') || '职位未记录';
  },

  forestDomainTabs() {
    return window.GameModules.factionOrgForest?.DOMAIN_KEYS?.map((key) => ({
      key,
      label: window.GameModules.factionOrgForest.DOMAIN_LABELS[key] || key,
    })) || [];
  },

  factionOrgChartMode() {
    return this.factionState?.orgChartMode || 'forest';
  },

  setFactionOrgChartMode(mode = 'forest') {
    if (!this.factionState) return;
    this.factionState.orgChartMode = mode === 'detail' ? 'detail' : 'forest';
    this.factionState.orgCacheSelectedId = '';
    this.refreshFactionOrgCache?.();
  },

  setFactionForestTab(domain = 'corp') {
    if (!this.factionState) return;
    this.factionState.forestTab = domain;
    this.refreshFactionOrgCache?.();
  },

  factionForestTab() {
    return this.factionState?.forestTab || 'corp';
  },

  refreshFactionOrgCache() {
    if (!this.factionState) return;
    const faction = this.selectedFaction();
    this.factionState.orgCacheSelectedId = faction?.id || '';
    this.factionState.structureCards = this.buildFactionStructureCards(faction);
    const mode = this.factionOrgChartMode();
    if (mode === 'forest') {
      const forestData = this.buildFactionOrgForest();
      this.factionState.forestData = forestData;
      this.factionState.orgTree = forestData?.activeTree || null;
      this.factionState.orgNodes = this.flattenFactionOrgTree(this.factionState.orgTree, 0, []);
    } else {
      this.factionState.orgTree = this.buildFactionOrgTree(faction);
      this.factionState.orgNodes = this.factionState.orgTree?.children || [];
    }
    this.factionState.capabilityCards = this.buildFactionCapabilityCards(faction);
  },

  buildFactionOrgForest() {
    const forest = window.GameModules.factionOrgForest;
    if (!forest) return { viewportRoot: null, domains: [], activeTree: null };
    const factions = this.factionState?.factions || [];
    const viewportRoot = forest.resolveViewportRoot(factions);
    if (!viewportRoot) return { viewportRoot: null, domains: [], activeTree: null };

    const visible = forest.filterForestByExposure(factions, this);
    const domains = forest.DOMAIN_KEYS.map((domainKey) => {
      const rootId = forest.domainRootId(viewportRoot.id, domainKey);
      const domainRoot = visible.find((f) => f.id === rootId) || factions.find((f) => f.id === rootId);
      const label = domainRoot?.name || forest.DOMAIN_LABELS[domainKey];
      const tree = this.buildForestDomainTree(domainKey, rootId, visible, viewportRoot);
      return { domain: domainKey, label, rootId, tree };
    });

    const activeTab = this.factionForestTab();
    const active = domains.find((d) => d.domain === activeTab) || domains.find((d) => d.domain === 'corp') || domains[0];
    return {
      viewportRoot,
      domains,
      activeTree: active?.tree || null,
      breadcrumb: [viewportRoot.name, active?.label].filter(Boolean).join(' / '),
    };
  },

  buildForestDomainTree(domainKey, rootId, factions = [], viewportRoot = {}) {
    const forest = window.GameModules.factionOrgForest;
    const rootFaction = factions.find((f) => f.id === rootId);
    const buildNode = (item, kind = 'faction') => {
      const resolution = String(item.resolution || 'L1').toUpperCase();
      const isFog = resolution === 'L1' && !(item.structure || []).length;
      const children = this.sortFactionHierarchy(
        factions.filter((f) => f.parentId === item.id && !f.isDomainRoot && forest.inferOrgDomain(f) === domainKey),
      ).map((child) => buildNode(child, 'faction'));
      return {
        key: `forest-${item.id}`,
        name: isFog && item.fogLabel ? item.fogLabel : item.name,
        kind: item.isDomainRoot ? 'domain-root' : (isFog ? 'fog' : kind),
        meta: [item.level, item.type, item.resolutionBadge || ''].filter(Boolean).join(' · '),
        factionId: item.id,
        orgDomain: domainKey,
        children,
      };
    };

    if (!rootFaction) {
      return {
        key: `forest-${rootId}`,
        name: forest.DOMAIN_LABELS[domainKey],
        kind: 'domain-root',
        meta: '域根',
        factionId: rootId,
        children: [],
      };
    }
    return buildNode(rootFaction, 'domain-root');
  },

  buildFactionStructureCards(faction = this.selectedFaction()) {
    const ot = window.GameModules.orgTerritory;
    return (faction?.structure || []).map((node, index) => ({
      key: `node-${index}-${node.name}`,
      name: node.name,
      level: node.level || this.factionNodeLevel(faction, node.name),
      stateBadge: node.stateBadge || ot?.stateBadge?.(node.state) || '',
      parentLabel: node.parentLabel || ot?.nodeParentLabel?.(node) || '',
      roles: this.normalizeFactionRoles(node.roles),
    }));
  },

  factionStructureCards() {
    const faction = this.selectedFaction();
    if (this.factionState?.orgCacheSelectedId === faction?.id && this.factionState?.structureCards) return this.factionState.structureCards;
    return this.buildFactionStructureCards(faction);
  },

  factionRoleDisplayTitle(role = {}) {
    return role.displayTitle || role.title || '职位：迷雾';
  },

  factionRoleDisplayDuty(role = {}) {
    return role.displayDuty || '职责：迷雾';
  },

  factionRoleDisplayOccupants(role = {}) {
    return role.displayOccupants || `任职：${role.preview || '未知'}`;
  },

  factionRoleStateBadge(role = {}) {
    return role.stateBadge || window.GameModules.orgTerritory?.stateBadge?.(role.state) || '';
  },

  selectedFactionResolutionBadge() {
    const faction = this.selectedFaction();
    return faction?.resolutionBadge || window.GameModules.orgTerritory?.resolutionBadge?.(faction?.resolution) || '';
  },

  selectedFactionStatusLabel() {
    const faction = this.selectedFaction();
    return window.GameModules.orgTerritory?.orgStatusLabel?.(faction) || '';
  },

  selectedFactionAffiliatedLabel() {
    const faction = this.selectedFaction();
    if (!faction) return '';
    return window.GameModules.factionOrgForest?.affiliatedFactionLabel?.(faction, this.factionState?.factions || []) || '';
  },

  factionRolePreview(role = {}) {
    return role.preview || this.factionRolePreviewText(Array.isArray(role.characters) && role.characters.length ? role.characters : ['未知']);
  },

  factionRoleOverflow(role = {}) {
    return Boolean(role.overflow ?? ((Array.isArray(role.characters) ? role.characters : []).length > 4));
  },

  openFactionRoleDialog(role = {}) {
    const normalized = this.normalizeFactionRoles([role])[0] || { title: '未命名职位', count: '未知', characters: ['未知'] };
    this.factionState.roleDialogOpen = true;
    this.factionState.roleDialog = normalized;
  },

  closeFactionRoleDialog() {
    if (!this.factionState) return;
    this.factionState.roleDialogOpen = false;
    this.factionState.roleDialog = null;
  },

  factionLevelRank(level = '') {
    const map = { 国家级: 0, 国家法定身份: 0, 中央级别: 1, 省级: 2, 省市级: 2, 市级: 3, 公司级: 4, 组织级: 5, 部门级: 6, 家庭级: 7, 域级: 1 };
    const clean = String(level || '').trim();
    return Object.prototype.hasOwnProperty.call(map, clean) ? map[clean] : 50;
  },

  sortFactionHierarchy(list = []) {
    return [...(Array.isArray(list) ? list : [])].sort((a, b) => {
      const rank = this.factionLevelRank(a.level) - this.factionLevelRank(b.level);
      if (rank !== 0) return rank;
      if (a.id === 'company-main') return -1;
      if (b.id === 'company-main') return 1;
      return String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN');
    });
  },

  buildStructureBranchNodes(faction = {}) {
    return this.buildFactionStructureCards(faction).map((node) => ({
      key: node.key,
      name: node.name,
      kind: 'structure',
      meta: node.level,
      children: node.roles.map((role, roleIndex) => ({
        key: `${node.key}-role-${roleIndex}`,
        name: this.factionRoleDisplayTitle(role),
        kind: 'role',
        meta: `${this.factionRoleDisplayDuty(role)} · ${this.factionRoleDisplayOccupants(role)}`,
        role,
        children: [],
      })),
    }));
  },

  buildFactionOrgTree(faction = this.selectedFaction()) {
    if (!faction?.id) return null;
    const forest = window.GameModules.factionOrgForest;
    const factions = this.factionState?.factions || [];
    const corpPath = [];
    let cursor = faction;
    const seen = new Set();
    while (cursor && !seen.has(cursor.id)) {
      seen.add(cursor.id);
      if (cursor.orgDomain === 'corp' || ['公司', '工作室', '企业'].includes(cursor.type)) {
        corpPath.unshift(cursor.name);
      }
      cursor = factions.find((f) => f.id === cursor.parentId);
      if (cursor?.isDomainRoot) break;
    }
    this.factionState.orgBreadcrumb = corpPath.length ? corpPath.join(' / ') : faction.name;

    const buildFactionNode = (item, isRoot = false) => {
      if (isRoot) {
        return {
          key: `faction-${item.id}`,
          name: item.name,
          kind: 'root',
          meta: [item.level, item.type].filter(Boolean).join(' · ') || '势力',
          factionId: item.id,
          children: this.buildStructureBranchNodes(item),
        };
      }
      const subFactions = this.sortFactionHierarchy(this.factionChildren(item.id)).map((child) => buildFactionNode(child, false));
      const structureNodes = this.buildStructureBranchNodes(item);
      return {
        key: `faction-${item.id}`,
        name: item.name,
        kind: 'faction',
        meta: [item.level, item.type].filter(Boolean).join(' · ') || '势力',
        factionId: item.id,
        children: [...subFactions, ...structureNodes],
      };
    };
    return buildFactionNode(faction, true);
  },

  flattenFactionOrgTree(node, depth = 0, list = []) {
    if (!node) return list;
    list.push({ ...node, depth, displayName: node.name });
    (node.children || []).forEach((child) => {
      this.flattenFactionOrgTree(child, depth + 1, list);
    });
    return list;
  },

  factionOrgTreeRoot() {
    const faction = this.selectedFaction();
    if (this.factionState?.orgCacheSelectedId === faction?.id && this.factionState?.orgTree) {
      return this.factionState.orgTree;
    }
    if (this.factionOrgChartMode() === 'forest') {
      return this.buildFactionOrgForest()?.activeTree || null;
    }
    return this.buildFactionOrgTree(faction);
  },

  factionOrgTreeRows() {
    return this.flattenFactionOrgTree(this.factionOrgTreeRoot(), 0, []);
  },

  buildFactionOrgNodes(faction = this.selectedFaction(), cards = this.buildFactionStructureCards(faction)) {
    if (this.factionOrgChartMode() === 'forest') {
      return this.flattenFactionOrgTree(this.factionOrgTreeRoot(), 0, []);
    }
    return this.buildFactionOrgTree(faction)?.children || this.buildStructureBranchNodes(faction);
  },

  factionOrgNodes() {
    const faction = this.selectedFaction();
    if (this.factionState?.orgCacheSelectedId === faction?.id && this.factionState?.orgNodes) return this.factionState.orgNodes;
    if (this.factionOrgChartMode() === 'forest') {
      return this.flattenFactionOrgTree(this.factionOrgTreeRoot(), 0, []);
    }
    return this.buildFactionOrgTree(faction)?.children || [];
  },

  factionForestDomains() {
    return this.factionState?.forestData?.domains || this.buildFactionOrgForest()?.domains || [];
  },

  factionForestViewportTitle() {
    return this.factionState?.forestData?.viewportRoot?.name || window.GameModules.factionOrgForest?.resolveViewportRoot(this.factionState?.factions || [])?.name || '';
  },

  buildFactionCapabilityCards(faction = this.selectedFaction()) {
    const ot = window.GameModules.orgTerritory;
    const caps = faction?.solid?.capabilities || ot?.defaultCapabilities?.() || {};
    return (ot?.CAPABILITY_DIMS || ['political', 'economic', 'asset', 'military']).map((dim) => ({
      key: `cap-${dim}`,
      dim,
      label: ot?.CAPABILITY_LABELS?.[dim] || dim,
      entries: (caps[dim]?.entries || []).map((entry, index) => ({
        ...entry,
        key: `${dim}-${index}-${entry.id || entry.name}`,
        stateBadge: entry.stateBadge || ot?.stateBadge?.(entry.state) || '',
        parentLabel: entry.parentLabel || ot?.nodeParentLabel?.({ parentRef: entry.parentRef }) || '',
      })),
    }));
  },

  factionCapabilityCards() {
    const faction = this.selectedFaction();
    if (this.factionState?.orgCacheSelectedId === faction?.id && this.factionState?.capabilityCards) {
      return this.factionState.capabilityCards;
    }
    return this.buildFactionCapabilityCards(faction);
  },
};

window.GameModules.factionOrgActions = _factionOrgActionsBase;

;// ---- faction-membership-actions.js ----
window.GameModules = window.GameModules || {};

window.GameModules.factionMembershipActions = {
  factionMembershipRows() {
    const faction = this.selectedFaction?.();
    if (!faction) return [];
    return window.GameModules.orgTerritory?.collectFactionMemberships?.(this, faction) || [];
  },

  syncAllCharacterMemberships() {
    const ot = window.GameModules.orgTerritory;
    ot?.ensurePresetFamilyMemberships?.(this);
    Object.values(this.rpgStates || {}).forEach((state) => ot?.syncCharacterOrgMemberships?.(state, this));
  },
};


;// ---- faction-ai-actions.js ----
window.GameModules = window.GameModules || {};

window.GameModules.factionAiActions = {
  factionFields: ['name', 'type', 'parentId', 'parentName', 'level', 'location', 'domain', 'scale', 'stance', 'influence', 'description', 'structure', 'rules', 'resources', 'relations'],

  async generateFactionsByAI() {
    this.initFactionSystem();
    if (this.factionState.generating) return;
    const requestId = (this.factionState.requestId || 0) + 1;
    Object.assign(this.factionState, { generating: true, error: '', requestId });
    try {
      const text = await Promise.race([this.requestFactionText(requestId), new Promise((resolve) => setTimeout(() => resolve(''), 60000))]);
      if (requestId !== this.factionState.requestId) return;
      const factions = this.parseFactions(text);
      if (factions.length) this.applyGeneratedFactions(factions);
      else {
        const message = 'AI??????????????????????;
        this.factionState.error = message;
        this.pushAlertLog?.({ level: 'warn', category: '????', title: '????', message, source: 'faction.generateFactionsByAI' });
      }
      this.save?.();
    } catch (err) {
      console.error('AI??????:', err.code, err.message, err.stack);
      const message = 'AI??????????????????????;
      this.factionState.error = message;
      this.pushAlertLog?.({ level: 'error', category: '????', title: '??????', message, detail: err.message, source: 'faction.generateFactionsByAI' });
    } finally {
      if (requestId === this.factionState.requestId) this.factionState.generating = false;
    }
  },

  async requestFactionText(requestId) {
    let buffer = '';
    const prompt = await this.factionPrompt();
    await window.GameModules.aiRequest.complete({
      source: 'faction-audit', model: this.modelId || this.settingsState?.textModelId, prompt, timeoutMs: 60000,
      ...(window.GameModules.promptSkills?.completionOptions?.('faction-audit') || { jsonMode: true, responseFormat: { type: 'json_object' }, outputLimitKind: 'other' }),
      requireDone: true,
      onChunk: (content, done, info) => {
        if (requestId !== this.factionState.requestId) return;
        buffer = info.buffer;
      },
    });
    return buffer;
  },

  factionPrompt() {
    const p = this.playerProfile || {}, company = this.currentCompany?.() || {};
    return window.GameModules.renderPrompt('faction-audit', { ????: p.name || '??', ????: p.refinedCity || p.city || '??', ????: p.refinedRole || p.dailyRole || '??', ????: company.name || p.workplace || '????', ????: company.industry || '??', ????: company.location || p.refinedCity || p.city || '??', ????: JSON.stringify(this.factionState.factions || []), ????: this.factionState.customPrompt || '?? });
  },

  parseFactions(text) {
    const source = String(text || '').replace(/```(?:json)?|```/gi, '').trim();
    const objectStart = source.indexOf('{');
    const objectEnd = source.lastIndexOf('}');
    const arrayStart = source.indexOf('[');
    const arrayEnd = source.lastIndexOf(']');
    try {
      const raw = objectStart >= 0 && objectEnd > objectStart ? JSON.parse(source.slice(objectStart, objectEnd + 1)) : JSON.parse(source.slice(arrayStart, arrayEnd + 1));
      const list = Array.isArray(raw) ? raw : raw.factions;
      return Array.isArray(list) ? list.map((x, i) => this.normalizeFaction(x, i)).filter(Boolean) : [];
    } catch (_) { return []; }
  },

  normalizeFaction(item, index) {
    if (!item?.name) return null;
    const id = String(item.id || `faction-${index}-${item.name}`).replace(/\s+/g, '-');
    const parentId = String(item.parentId || '').trim();
    const faction = { id, name: String(item.name), type: String(item.type || '??'), parentId, parentName: parentId ? String(item.parentName || '????') : '??????, level: String(item.level || '????), location: String(item.location || '??'), domain: String(item.domain || '??'), scale: String(item.scale || '??'), stance: String(item.stance || '??'), influence: Number(item.influence) || 30, description: String(item.description || ''), structure: this.normalizeFactionStructure({ structure: Array.isArray(item.structure) ? item.structure : [] }).structure, rules: Array.isArray(item.rules) ? item.rules.map(String) : [], resources: Array.isArray(item.resources) ? item.resources.map(String) : [], relations: Array.isArray(item.relations) ? item.relations : [], fixed: true, updatedAt: this.phoneDate?.().toISOString?.() || new Date().toISOString() };
    faction.fieldReasons = this.completeFactionReasons(faction, item.fieldReasons || {}, 'AI??????????????);
    return faction;
  },

  completeFactionReasons(faction, reasons = {}, fallback = '?????????????????????) {
    return this.factionFields.reduce((out, key) => {
      out[key] = String(reasons[key] || fallback);
      return out;
    }, {});
  },

  sameFactionValue(a, b) {
    return JSON.stringify(a ?? '') === JSON.stringify(b ?? '');
  },

  mergeExistingFaction(existing, incoming) {
    const merged = { ...existing, fieldReasons: { ...(existing.fieldReasons || {}) }, changeLog: [...(existing.changeLog || [])] };
    this.factionFields.forEach((key) => {
      const reason = incoming.fieldReasons?.[key] || '';
      const changed = !this.sameFactionValue(existing[key], incoming[key]);
      if (changed && reason) {
        merged[key] = incoming[key];
        merged.changeLog.unshift({ field: key, reason, at: incoming.updatedAt, action: 'adjust' });
      }
      if (changed && !reason) merged.changeLog.unshift({ field: key, reason: 'AI????????????????????, at: incoming.updatedAt, action: 'keep' });
      merged.fieldReasons[key] = reason || merged.fieldReasons[key] || '????????????????????????;
    });
    merged.fixed = true;
    merged.updatedAt = incoming.updatedAt;
    return merged;
  },

  applyGeneratedFactions(items) {
    const ot = window.GameModules.orgTerritory;
    const map = new Map(this.factionState.factions.map((x) => [x.id, { ...x, fieldReasons: this.completeFactionReasons(x, x.fieldReasons) }]));
    items.forEach((item) => {
      const existing = map.get(item.id);
      const sanitized = ot?.sanitizeAuditFaction?.({ ...(existing || {}), ...item }, this, existing) || item;
      if (existing) map.set(item.id, this.mergeExistingFaction(existing, sanitized));
      else map.set(item.id, { ...sanitized, changeLog: [{ field: 'all', reason: '????????AI??????????????????, at: sanitized.updatedAt, action: 'add' }] });
    });
    this.factionState.factions = [...map.values()].map((item) => this.normalizeFactionStructure(item));
    this.syncCompanyFaction();
    this.syncRoleCardFactionPositions?.();
    window.GameModules.orgTerritory?.validateWorldConsistency?.(this);
    if (!this.selectedFaction()) this.factionState.selectedId = this.factionState.factions[0]?.id || '';
  },
};


;// ---- skills-definitions-core.js ----
window.GameModules = window.GameModules || {};
window.GameModules.skillsDefinitions = (window.GameModules.skillsDefinitions || []).concat([
  { id: 'desktop.open', category: '????', name: '??????', method: 'openDesktopApp()', params: '??, returns: '????APP?????????, description: '????????????APP??, detail: '????????????????????BOSS????Skills?APP?? },
  { id: 'desktop.close_all', category: '????', name: '????APP', method: 'closeAppToDesktop()', params: '??, returns: '??????APP???????????, description: '????????????, detail: '?????????AI?????????????? },
  { id: 'skills.open', category: '????', name: '??Skills APP', method: 'openSkillsApp()', params: '??, returns: '?????AI???skill????, description: '????????????, detail: 'Skills?AI?????????????????????????????????????APP???????? },
  { id: 'skills.list', category: '????', name: '??Skills', method: 'skillsList()', params: 'query?: ????category?: ??', returns: '????skill??????, description: '?????????????????????, detail: '??AI????????????????????? },
  { id: 'skills.categories', category: '????', name: '??Skills??', method: 'skillCategories()', params: '??, returns: '???????, description: '??Skills APP????????, detail: '???????????? },
  { id: 'lexicon.modify.batch', category: '????', name: '????????', method: 'rpgLexicon.applyLexiconSkill(payload)', params: 'payload: ?????{entries:[...]}????worldTag/kind/name/value/reason??, returns: '?????????????, description: '??????????????????????, detail: '?????????????????????????????????????????AI??????????????Skill???? },
  { id: 'lexicon.query', category: '????', name: '??????????, method: 'searchTermOne(keyword) / searchTermWindow(keyword,beforeChars,afterChars) / addSpecialTerm(name,summary,description,aliases)', params: 'keyword/name/summary/description/aliases', returns: '?????????????, description: '???????????????APP?????????????????????????????, detail: '?? lexicon_entries ???????? kind ??????????? },
  { id: 'faction.query', category: '????', name: '????????, method: 'listFactions() / searchFactionOne(keyword) / getFactionDetail(name) / upsertFaction(payload) / addFactionPosition(payload) / listMemberships(params) / getTerritoryControl(params) / resolveTerritoryBrief(params)', params: 'keyword/name/factionName/parentName/position/characterName/locationName/reason??, returns: '???????????????????????????????, description: '??????????????????????????????????????????????????, detail: '???????? membership.orgId ??????????????????????????????? },
  { id: 'phone.time.view', category: '????', name: '??????', method: 'phoneDate() / phoneDateText() / phoneTimeText()', params: '??, returns: '????/???????????????, description: '???????????????, detail: '?????????????????AI????????? },
  { id: 'phone.time.advance', category: '????', name: '??????', method: 'advancePhoneTime(seconds)', params: 'seconds: ??????-2592000', returns: '??phoneFixedTime??, description: '????????????????????, detail: '???AI????elapsedSeconds??????????????? },
  { id: 'player.profile.view', category: '????', name: '??????????', method: 'playerProfileLexiconFields() / playerCharacter()', params: 'targetId?: ??player-self', returns: '????????????????????????????, description: '??????????????, detail: 'AI??????????????????????????? },
  { id: 'player.profile.summary', category: '????', name: '????????', method: 'playerSetupSummary()', params: '??, returns: '???????????????, description: '?????????????AI?????, detail: '??????prompt?????? },
  { id: 'player.character.view', category: '????', name: '??????????, method: 'playerCharacter()', params: '??, returns: 'player-self??????, description: '??????????????????, detail: '??????????????????????skills?? },
  { id: 'player.rpg.view', category: '????', name: '??????/?????', method: 'ensurePlayerRpgState() / playerIdentityState()', params: 'refresh?: boolean', returns: 'professions?skills?knowledge?factions?status_tags?????, description: '????????????????, detail: 'BOSS?????????????????????????? },
  { id: 'player.identity.summary', category: '????', name: '?????????, method: 'playerIdentitySummary()', params: '??, returns: '????????????????????????????, description: '??????RPG??????, detail: '????????????????? },
  { id: 'identity.open', category: '????, name: '?????APP', method: 'openIdentityApp(targetId)', params: 'targetId: player-self???id', returns: '???????RPG????, description: '???????????, detail: '??????????????APP?????????RPG?????? },
  { id: 'identity.target.view', category: '????, name: '??????????, method: 'identityTargetProfile() / identityTargetFields()', params: '????identityTargetId', returns: '????????????????, description: '?????APP????????, detail: '??AI???????????????? },
  { id: 'player.setup.complete', category: '?????, name: '?????????, method: 'completePlayerSetup(options)', params: 'options?: { skipAi?: boolean }', returns: '????????????????????????, description: '??????????????, detail: '????????????initializedAt??????????? },
  { id: 'player.setup.reopen', category: '?????, name: '????????', method: 'reopenPlayerSetup()', params: '??, returns: '??????????????, description: '????????????, detail: '??phoneSetupDone=false?????????????? },
  { id: 'player.profile.enrich', category: '?????, name: 'AI????????', method: 'enrichPlayerProfile(base)', params: 'base: ??????', returns: 'AI??????????????????JSON??, description: '??????????????????, detail: '????AI???JSON???????????????? },
  { id: 'player.address.normalize', category: '?????, name: '??????', method: 'ensurePreciseAddress(address)', params: 'address: ????', returns: '???????????????, description: '??????????????????, detail: '?????????????????? },
  { id: 'realworld.open', category: '????', name: '????????', method: 'openRealWorldPanel()', params: '??, returns: '????????????????????, description: '??????????????????, detail: '??????????????????????? },
  { id: 'realworld.close', category: '????', name: '????????', method: 'closeRealWorldPanel()', params: '??, returns: 'realWorldOpen=false??, description: '????????, detail: '??????????????? },
  { id: 'realworld.submit', category: '????', name: '??????', method: 'submitRealWorldAction(action)', params: 'action: ????????????', returns: 'AI???????choices?elapsedSeconds??????????, description: '?AI????????????????????, detail: '??????????????????????????? },
  { id: 'realworld.result.apply', category: '????', name: '????????', method: 'applyRealWorldResult(id, result)', params: 'id: ??id?result: AI????', returns: '??????????choices?????????, description: '?AI??????????????, detail: '???AI???????????????????? },
  { id: 'realworld.map.location.add', category: '????', name: '????????', method: 'realWorldMap.addLocation(state, payload, time)', params: 'payload: {name,parentName?,descriptionFacts?/description?}', returns: '????????????????????????????, description: '????????????????????, detail: '???????????descriptionFacts????????????????? },
  { id: 'realworld.map.description.update', category: '????', name: '??????????', method: 'realWorldMapFacts.applyLocationUpdates(state, result)', params: 'locationDescriptionUpdates: [{locationName, action, factId?/oldText?, newText/text}]', returns: '?????????????????, description: '??????????????????, detail: '??????????????????????????????????????????? },
  { id: 'realworld.prompt.open', category: '????', name: '??????Prompt??', method: 'openRealWorldPrompt(id)', params: 'id: ??AI??id', returns: '??promptDialogEntry??, description: '???????????prompt??, detail: '??/?????????????? },
  { id: 'inventory.list', category: '????', name: '????????', method: 'inventoryItems(state)', params: 'state?: ??RPG?????????', returns: '???????????, description: '????????????????, detail: '?????kind/type?quantity?description?equipSlots???????????? },
  { id: 'inventory.wearing.list', category: '????', name: '????????', method: 'wearingItems(state)', params: 'state?: ??RPG?????????', returns: '????????, description: '????????????????????????, detail: '????????????0????????????????? },
  { id: 'inventory.slot.add', category: '????', name: '??????', method: 'addWearSlot(base, state)', params: 'base: ??????state?: ??RPG???, returns: '??????????????1??, description: '???????????????, detail: '?????????????AI????????/???????? },
  { id: 'inventory.equip', category: '????', name: '????????, method: 'equipItemToSlot(itemName, slot, state)', params: 'itemName: ??????slot: ?????????state?: ??RPG???, returns: '????true?????false??, description: '???equipSlots?????????????, detail: 'slot?????????????????????equipSlots?????? },
  { id: 'inventory.unequip', category: '????', name: '??????', method: 'unequipSlot(slot, state)', params: 'slot: ?????state?: ??RPG???, returns: '????true?????false??, description: '???????????????, detail: '???????????????????? },
  { id: 'inventory.apply_updates', category: '????', name: '??????????', method: 'applyInventoryUpdatesToState(state, updates)', params: 'state: ??RPG???updates: lexiconUpdates??', returns: '????????????????????, description: '?AI????????/????????????????, detail: '??????????????/???????????? },
  { id: 'item.query', category: '????', name: '????????????', method: 'listCharacterItems/searchKnownItem/generateItemSkill/addItemToTarget/transferItemSkill/deleteItemSkill/purchaseItemSkill', params: 'target/from/to/itemName/item/price/quantity/reason', returns: '????????????????????, description: '????????????????????????????????????, detail: '?????????????????????????????????????????????????? },
]);


;// ---- skills-definitions-apps.js ----
window.GameModules = window.GameModules || {};
window.GameModules.skillsDefinitions = (window.GameModules.skillsDefinitions || []).concat([
  { id: 'wechat.open', category: '??', name: '????APP', method: 'openWechatApp()', params: '??, returns: '???????????????, description: '??????????, detail: '??????????????? },
  { id: 'wechat.id.ensure', category: '??', name: '??/??????, method: 'ensureWechatId()', params: '??, returns: '???????, description: '?????????ID??, detail: '??????????????? },
  { id: 'wechat.contacts.list', category: '??', name: '????????, method: 'wechatContacts() / wechatThreads()', params: '??, returns: '??????????, description: '??????????????, detail: '??????????/???????????? },
  { id: 'wechat.user.add', category: '??', name: '??????', method: 'addWechatUser(user) / addWechatUsers(users)', params: 'user: { name, relation?, id?, latest?, context? } ????, returns: '????????????????????????RPG????, description: '???????????????, detail: 'AI??????????????????????id????????????????relationships?????????????????? },
  { id: 'wechat.contact.select', category: '??', name: '????????, method: 'selectWechatContact(id)', params: 'id: ?????id', returns: '?????????, description: '??????????, detail: '???wechatSelectedContact??wechatView??chat?? },
  { id: 'wechat.messages.view', category: '??', name: '????????', method: 'wechatMessages()', params: '??????????, returns: '??????????, description: '??????????????, detail: '????????????????????????? },
  { id: 'wechat.query', category: '??', name: '??????????', method: 'listWechatSkills / listContacts / getThread', params: 'contactId?: ???id???id?count?: ????', returns: '????????????????????, description: '??????????????????????, detail: '???????????????????????????? },
  { id: 'wechat.message.incoming', category: '??', name: '???????????', method: 'sendIncomingNow / sendIncomingPast', params: 'contactId, text, timeIso?', returns: '?final.wechatActions???????????????, description: '???????????????, detail: 'sendIncomingPast????????????sendIncomingNow???????? },
  { id: 'wechat.message.send', category: '??', name: '???????, method: 'sendWechatMessage()', params: '?? wechatInput ??????', returns: '????????????????, description: '????????????????????, detail: '??????????????????????????????????? },
  { id: 'wechat.tab.set', category: '??', name: '??????', method: 'setWechatTab(tab)', params: 'tab: chats | contacts | me', returns: '??????????, description: '???????????????, detail: '??wechatView???home?? },
  { id: 'wechat.identity.open', category: '??', name: '??????????', method: 'openWechatIdentity()', params: '??????????, returns: '?????APP?????????, description: '??????????????, detail: '???????player-self?? },
  { id: 'company.open', category: '????', name: '????APP', method: 'openCompanyApp()', params: '??, returns: '??????????????????????????, description: '?????????????????, detail: 'AI??????????????????????????? },
  { id: 'company.current', category: '????', name: '??????', method: 'currentCompany()', params: '??, returns: '????????, description: '????????????, detail: '??????????????????????? },
  { id: 'company.fields', category: '????', name: '??????', method: 'companyFields()', params: '??, returns: '????????????????????????????????, description: '?????????????, detail: '?????????? },
  { id: 'company.context', category: '????', name: '??????????, method: 'companyPromptContext()', params: '??, returns: '?????????????????????????, description: '???????????AI??????????, detail: '?????????????????????????? },
  { id: 'company.organization', category: '????', name: '??????', method: 'companyOrganization()', params: '??, returns: '?????????, description: '????????????, detail: '?????????? },
  { id: 'company.work_status', category: '????', name: '?????????, method: 'workStatusText()', params: '??, returns: '????????????????????, description: '??????????????, detail: '??????????????????????? },
  { id: 'company.pay.preview', category: '????', name: '??????', method: 'monthlyPayPreview()', params: '??, returns: '{ base, rate, performanceMonths, workDays, daily, annualPerformance, total }??, description: '??????????????????, detail: '?????????????????????? },
  { id: 'company.workdays.current_month', category: '????', name: '????????, method: 'currentMonthWorkDays()', params: '??, returns: '?????????????????, description: '?????????????????, detail: '??phoneDate()??????????? },
  { id: 'company.attendance', category: '????', name: '??/?????????, method: 'currentWorkAttendance() / checkInWork() / checkWorkReminder()', params: '?????checkInWork??', returns: '????????????????????, description: '??????????????????????, detail: '??????????????????????????????????? },
  { id: 'company.recruitment.apply', category: '????', name: '????????/??', method: 'applyRecruitment(type)', params: 'type: employee | timed | creator-low | creator-high', returns: '??????????????, description: '??????????????????????, detail: 'employee???????????????? },
  { id: 'company.resign', category: '????', name: '??', method: 'resignCompany()', params: '??, returns: '????????????????/???????????, description: '?????????????, detail: '????????????????????????????? },
  { id: 'calendar.open', category: '??', name: '????APP', method: 'openCalendarApp()', params: '??, returns: '?????????????????????, description: '?????????????, detail: '???????BOSS???????addCalendarEvent???? },
  { id: 'calendar.add', category: '??', name: '??????', method: 'addCalendarEvent(event)', params: 'event: { title,type,time,company?,jobTitle?,note? }', returns: '??calendarState.events?????, description: '????????????????, detail: 'time??????ISO???? },
  { id: 'calendar.events.list', category: '??', name: '??????', method: 'sortedCalendarEvents()', params: '??, returns: '??????????????, description: '?????????????, detail: '?????????? },
  { id: 'calendar.month.change', category: '??', name: '??????', method: 'changeCalendarMonth(delta)', params: 'delta: -1??????', returns: '??calendarState.year/month??, description: '????????, detail: '????????????????? },
  { id: 'calendar.days.view', category: '??', name: '????????', method: 'calendarDays()', params: '??, returns: '?????cells???????events??, description: '????????????, detail: '??AI????????? },
  { id: 'calendar.day.events', category: '??', name: '??????', method: 'eventsForCalendarDay(day)', params: 'day: ??????', returns: '????????, description: '????????????????, detail: '??calendarState.year/month?? },
  { id: 'calendar.time.format', category: '??', name: '????????, method: 'formatCalendarTime(value)', params: 'value: ??????Date', returns: 'MM/DD HH:mm????????, description: '?????????????, detail: '?????? },
  { id: 'faction.open', category: '????', name: '????APP', method: 'openFactionApp()', params: '??, returns: '????????????????????, description: '??????????????????, detail: '????????????????????????????/????????????? },
  { id: 'faction.generate', category: '????', name: '???????????, method: 'generateFactionsByAI()', params: 'factionState.customPrompt: ????', returns: '?????????????????????????, description: '?????????????????????????, detail: '???????????????????????????????????????????????????fieldReasons?? },
  { id: 'faction.list', category: '????', name: '??????', method: 'factionState.factions', params: '??, returns: '?????????, description: '??????????????, detail: '??????id?name?type?parentId?parentName?level?location?domain?scale?stance?influence?description?structure?rules?resources?relations?fieldReasons?changeLog?? },
  { id: 'faction.select', category: '????', name: '??????', method: 'selectFaction(id) / selectedFaction()', params: 'id: ??id', returns: '??????????, description: '????APP??????, detail: '?????????????????????????????AI????????? },
  { id: 'faction.parent', category: '????', name: '??????', method: 'factionParentName(faction)', params: 'faction: ????', returns: '??????????????, description: '???????????, detail: 'parentId????????????????parentId??????????????? },
  { id: 'faction.children', category: '????', name: '??????', method: 'factionChildren(id)', params: 'id: ??id', returns: '????????????????, description: '?????????????????, detail: '??AI?????????????????????????????? },
  { id: 'profession.known.open', category: '????', name: '??????APP', method: 'openKnownProfessionApp()', params: '??, returns: '?????????????, description: '???????????????????, detail: '??????AI???????????????????????????????????????????????? },
  { id: 'profession.know', category: '????', name: '????', method: 'knowProfession(name, worldTag, context)', params: 'name: ????worldTag: ???context: ??????, returns: '???????APP???????, description: '????????????????????????????????, detail: '?????????????????????????????????????????????lv.1?????????????????? },
  { id: 'profession.add', category: '????', name: '????????, method: 'addProfessionToPlayer(job)', params: 'job: ??????', returns: '?????????????lv.1??, description: '?????APP?????????, detail: '??????????????????????????????????????? },
]);


;// ---- skills-definitions-boss-save.js ----
window.GameModules = window.GameModules || {};
window.GameModules.skillsDefinitions = (window.GameModules.skillsDefinitions || []).concat([
  { id: 'boss.open', category: 'BOSS??', name: '??BOSS??APP', method: 'openBossApp()', params: '??, returns: '????????????????????, description: '??????????, detail: '??????????????????????? },
  { id: 'boss.generate', category: 'BOSS??', name: '??????', method: 'randomBossJobs() / generateBossJobsByAI()', params: 'filters, pageSize, customPrompt, usePlayerFit', returns: '????????????????????????, description: '?????????????????????, detail: '?????????????????????????????????AI????????? },
  { id: 'boss.fit.toggle', category: 'BOSS??', name: '????????', method: 'toggleBossPlayerFit()', params: '??, returns: '??usePlayerFit?????????, description: '????????????????????????, detail: '????????????????? },
  { id: 'boss.jobs.current', category: 'BOSS??', name: '????????', method: 'currentBossJobs() / filteredBossJobs()', params: '??????filters', returns: '?????????????, description: '???????????, detail: '???????????????????? },
  { id: 'boss.job.select', category: 'BOSS??', name: '????', method: 'selectBossJob(id)', params: 'id: ??id', returns: '??bossState.selectedJobId??, description: '???????????????, detail: '?????????????? },
  { id: 'boss.company.detail.open', category: 'BOSS??', name: '????????', method: 'openBossCompanyDetail(id)', params: 'id: ??id', returns: '??????????????, description: '?????????????????, detail: '???????? },
  { id: 'boss.company.fields', category: 'BOSS??', name: '????/????', method: 'bossCompanyFields(job)', params: 'job?: ??????????????, returns: '?????????????????????????????, description: '???????????, detail: '????????/????????? },
  { id: 'boss.options', category: 'BOSS??', name: '????????', method: 'bossOptions(key)', params: 'key: industry | scale | province | city | county | town | creatorLevel', returns: '???????????, description: '????????????, detail: '??????????????? },
  { id: 'boss.match.summary', category: 'BOSS??', name: '????????', method: 'bossMatchSummary(job)', params: 'job: ????', returns: '??????????? ???????, description: '??????????????????, detail: '???????????????? },
  { id: 'boss.pay.text', category: 'BOSS??', name: '????????, method: 'bossJobPayText(job)', params: 'job: ????', returns: '????/?????????????????????, description: '????????????, detail: '????????? },
  { id: 'boss.apply', category: 'BOSS??', name: '??????????, method: 'applyBossJob() / createBossAppointment(job)', params: 'jobId: ???????applyHours?: ??????', returns: '?????????????????????, description: '???????????????, detail: '????4??????????48??????????????????? },
  { id: 'boss.appointment.create', category: 'BOSS??', name: '????????', method: 'createBossAppointment(job)', params: 'job: ????', returns: '{ title,type,time,company,jobTitle,note }??, description: '???????????????, detail: '?????????applyBossJob???????? },
  { id: 'boss.abilities.prompt', category: 'BOSS??', name: '??????Prompt', method: 'bossPlayerAbilitiesPrompt()', params: '??, returns: '???????????????, description: '???AI?????????????, detail: '??????????????? },
  { id: 'boss.jobs.parse', category: 'BOSS??', name: '??AI????', method: 'parseBossJobs(text)', params: 'text: AI????', returns: '??????, description: '?AI JSON????????????, detail: '???????????????? },
  { id: 'boss.job.normalize', category: 'BOSS??', name: '??????', method: 'normalizeBossJob(job, index)', params: 'job: ?????index: ??', returns: '???????null??, description: '????????????????, detail: '???????????????? },
  { id: 'memory.player.view', category: '??', name: '????????', method: 'playerMemory()', params: '??, returns: 'player-self??????, description: '????????????, detail: '??????????????????????? },
  { id: 'memory.player.items', category: '??', name: '????????', method: 'playerMemoryItems(kind)', params: 'kind: shortTerm | longTerm', returns: '?????????????, description: '???????????????, detail: '??????????????? },
  { id: 'memory.player.status', category: '??', name: '?????????, method: 'playerMemoryStatus(kind)', params: 'kind: shortTerm | longTerm', returns: '????/??????, description: '?????????????, detail: '???????? },
  { id: 'memory.player.search', category: '??', name: '?????????, method: 'searchPlayerMemoryArchive()', params: 'realWorldMemoryArchiveQuery: ????, returns: 'realWorldMemoryArchiveResults??, description: '????????????, detail: '???????????????? },
  { id: 'memory.player.record', category: '??', name: '????????', method: 'recordPlayerRealWorldMemory(action, result)', params: 'action: ?????result: AI????', returns: '??player-self???????????, description: '????????????????????, detail: '????????????????? },
  { id: 'save.open', category: '??', name: '????APP', method: 'openSaveApp()', params: '??, returns: '??????APP??, description: '?????????????, detail: '??????????????save/load/overwrite?????????slot??????? },
  { id: 'save.current', category: '??', name: '???????, method: 'save()', params: '??, returns: '????slot??????????, description: '??????????????, detail: '?????????????????BOSS???????? },
  { id: 'save.metas.refresh', category: '??', name: '??????', method: 'refreshSaveMetas()', params: '??, returns: '??saveMetas??, description: '????slot???????????, detail: '???????? },
  { id: 'save.meta.view', category: '??', name: '????????, method: 'saveMeta(slot)', params: 'slot: ???id', returns: '{ slot, exists, savedAt }??, description: '???????????, detail: '?????????? },
  { id: 'save.slot.load', category: '??', name: '??????, method: 'loadSlot(slot)', params: 'slot: ???id', returns: '???slot???????????, description: '?????????, detail: '????????????????????? },
  { id: 'save.slot.overwrite', category: '??', name: '??????, method: 'overwriteSlot(slot)', params: 'slot: ???id', returns: '?????????????, description: '?????????slot??, detail: '???????????????? },
  { id: 'save.slot.new', category: '??', name: '??????, method: 'newSlot(slot)', params: 'slot: ???id', returns: '???????????????????, description: '??????????, detail: '?????slot????????????? },
  { id: 'storage.snapshot', category: '??', name: '???????, method: 'window.GameModules.storage.snapshot(store)', params: 'store: Alpine game store', returns: '???????????, description: '??????????????, detail: '??????????????RPG?????APP??????????????? },
  { id: 'storage.restore', category: '??', name: '????????, method: 'window.GameModules.storage.restore(store, save)', params: 'store: game store?save: ????', returns: '????????, description: '??????????store??, detail: '????????????? },
]);


;// ---- skills-definitions-character.js ----
window.GameModules = window.GameModules || {};
window.GameModules.skillsDefinitions = (window.GameModules.skillsDefinitions || []).concat([
  { id: 'character.work.select', category: '????', name: '??????', method: 'selectWork(name)', params: 'name: ????, returns: '????????????????????????/RPG schema??, description: '??????????????, detail: '??AI??????????????????????????????? },
  { id: 'character.select', category: '????', name: '??????', method: 'selectCharacter(id)', params: 'id: ??id', returns: '????????????????????????/RPG schema??, description: '??????/?????????, detail: '?????????????RPG?????????????? },
  { id: 'character.detail.open', category: '????', name: '??????', method: 'openCharacterDetail()', params: '??, returns: '???????????????, description: '??????????????, detail: '????????characterBrief.ensure????????????? },
  { id: 'character.brief.ensure', category: '????', name: '?????????, method: 'window.GameModules.characterBrief.ensure(store)', params: 'store: ???????, returns: '??characterProfiles????????, description: '?????????????????, detail: '????????/???????????????????? },
  { id: 'character.brief.load', category: '????', name: '????????', method: 'window.GameModules.characterBrief.loadProfile(character)', params: 'character: ????', returns: '???????????????, description: '???????????????, detail: '???????AI?????RPG???????? },
  { id: 'character.profile.ensure', category: '????', name: '????????', method: 'window.GameModules.characterProfile.ensure(raw, store, context)', params: 'raw: ?????store: ?????context?: ????, returns: '?????????????, description: '????????????????, detail: '?????????????????????????????????AI??????????? },
  { id: 'character.rpg.ensure', category: '????', name: '??????RPG???, method: 'ensureRpgForCharacter(character)', params: 'character: ????', returns: '??RPG?????rpgStates??, description: '??????????RPG????, detail: '??????????schema????rpgState.ensureCharacter?????? },
  { id: 'character.rpg.current', category: '????', name: '??????RPG???, method: 'ensureRpgForCurrentCharacter(options)', params: 'options?: { refresh?: boolean }', returns: '????RPG????, description: '?????????RPG????, detail: '????refresh ????????/???????????????? },
  { id: 'character.rpg.from_results', category: '????', name: '????????', method: 'ensureRpgFromResults(result)', params: 'result: AI??????appearedCharacters/solidifiableCharacters', returns: '????RPG????????????????????, description: '?????????????????????????????????????????, detail: '???????????????appearedCharacters/solidifiableCharacters?????????? },
  { id: 'entry.prepare', category: '????', name: '??????', method: 'prepareEntrySetup()', params: '??, returns: '???????????RPG????????, description: '?????????????????????, detail: '??????????????????????RPG??????? },
  { id: 'entry.action.generate', category: '????', name: '????????', method: 'generateEntryAction(reason) / requestEntryAction(reason)', params: 'reason: ????', returns: '?????????entryCurrentAction??, description: '????????????????????, detail: '??AI??????????????????????? },
  { id: 'entry.control.confirm', category: '????', name: '??????', method: 'confirmControl()', params: '??, returns: '?????????????/????, description: '?????????????????, detail: '?????????????RPG????????AI???????? },
  { id: 'character.feedback.initial', category: '????', name: '????????', method: 'window.GameModules.characterFeedback.initial(store)', params: 'store: ???????, returns: 'mood?resistance?mind?intent?choices?metricUpdates??, description: '?????????????????????, detail: '?????????????????????????? },
  { id: 'character.query', category: '????', name: '????????', method: 'searchCharacterProfile(name, worldTag), listKnownCharacters(worldTag)', params: 'name/keyword: ????world/worldTag/work: ??????????????maxChars: ??????', returns: '?????????????????????????????????????????????????????????????JSON ?????????, description: '??????????????????????????????????????????????????? appearedCharacters/solidifiableCharacters??, detail: '???????????????????????????????????????????????searchCharacterProfile(name, worldTag) ???????????listKnownCharacters(worldTag) ???????????????? },
  { id: 'past.event.query', category: '??????', name: '????????', method: 'searchPastEvent(question, keywords, characterName, timeHint, worldTag, contactId)', params: 'question: ?????keywords: AI?????????characterName/contactId/timeHint/worldTag ???, returns: '?????????????????????????????????????????????????????????????, description: '?????????????????????????????????????????????????, detail: 'AI???????????????? searchPastEvent ????????????????????????????????????????????????????????????????????????????????????????????????????????????????000??????????????? },
  { id: 'character.ai.normalize_appeared', category: '????', name: '???AI????', method: 'window.GameModules.ai.normalizeCharacter(value, store)', params: 'value: AI?????store: ?????, returns: '???appearedCharacter???null??, description: '?AI???????????????????????, detail: '??????????????????????????????????????? },
  { id: 'character.card.modify', category: '??????, name: '????????, method: 'lexiconUpdates[]', params: 'kind:"?????field/name: ??/??/??/??/????/????/???value: ???reason: ????', returns: '????????????????????, description: '???????????????????????????????, detail: '???????????????????AI?????AI???????????????????????????reason?? },
  { id: 'character.card.skill.add', category: '??????, name: '??/?????????, method: 'lexiconUpdates[]', params: 'kind:"??????name/field:"skills"?value:{name,desc}?reason: ????????, returns: '????skills??????????, description: '?????????????????????????????????, detail: '???????????reason??????????????????????????? },
]);


;// ---- skill-loader.js ----
window.GameModules = window.GameModules || {};

window.GameModules.skillLoader = {
  manifest: 'skills/manifest.json',
  loaded: false,

  async load() {
    if (this.loaded) return window.GameModules.skillsDefinitions || [];
    const docs = this.shouldUseInlineFirst() ? this.loadFromInline() : await this.loadDocs();
    this.registerDocs(docs);
    this.loaded = true;
    return window.GameModules.skillsDefinitions || [];
  },

  async loadDocs() {
    try {
      return await this.loadFromFetch();
    } catch (err) {
      const docs = this.loadFromInline();
      if (!docs.length) console.warn('[Skills] ???????', err.message, err.stack);
      return docs;
    }
  },

  shouldUseInlineFirst() {
    try {
      return String(location.origin) === 'null' || String(location.href).startsWith('blob:');
    } catch (_) {
      return true;
    }
  },

  async loadFromFetch() {
    const files = await this.fetchManifest();
    return Promise.all(files.map((file) => this.fetchSkill(file)));
  },

  loadFromInline() {
    const inline = window.GameModules.skillDocsInline;
    const files = Array.isArray(inline?.manifest) ? inline.manifest : Object.keys(inline?.files || {});
    return files.map((file) => inline?.files?.[file] ? this.parse(inline.files[file], file) : null).filter(Boolean);
  },

  registerDocs(docs = []) {
    const valid = docs.filter(Boolean);
    const oldDocs = window.GameModules.skillDocs || {};
    window.GameModules.skillDocs = { ...oldDocs, ...Object.fromEntries(valid.map((doc) => [doc.meta.id, doc])) };
    const existing = new Set((window.GameModules.skillsDefinitions || []).map((skill) => skill.id));
    const additions = valid.filter((doc) => !existing.has(doc.meta.id)).map((doc) => this.toDefinition(doc));
    window.GameModules.skillsDefinitions = (window.GameModules.skillsDefinitions || []).concat(additions);
    window.GameModules.promptSkills?.registerDefinitions?.();
  },

  async fetchManifest() {
    const res = await fetch(this.manifest);
    if (!res.ok) throw new Error(`manifest HTTP ${res.status}`);
    const list = await res.json();
    return Array.isArray(list) ? list : [];
  },

  async fetchSkill(file) {
    const res = await fetch(`skills/${String(file).replace(/^skills\//, '')}`);
    if (!res.ok) throw new Error(`${file} HTTP ${res.status}`);
    return this.parse(await res.text(), file);
  },

  parse(text, file) {
    const match = String(text || '').match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!match) return null;
    const meta = {};
    match[1].split('\n').forEach((line) => {
      const pos = line.indexOf(':');
      if (pos <= 0) return;
      meta[line.slice(0, pos).trim()] = line.slice(pos + 1).trim();
    });
    if (!meta.id || !meta.name) return null;
    return { file, meta, body: match[2].trim() };
  },

  section(body, title) {
    const match = String(body || '').match(new RegExp(`## ${title}\\n\\n([\\s\\S]*?)(?=\\n## |$)`));
    return match ? match[1].trim() : '';
  },

  async instruction(id) {
    await this.load();
    const doc = window.GameModules.skillDocs?.[id];
    if (!doc) return this.definitionInstruction(id);
    const sections = ['????????, '????', '?????, '????'].map((title) => {
      const body = this.section(doc.body, title);
      return body ? `## ${title}\n${body}` : '';
    }).filter(Boolean).join('\n');
    return [
      `Skill??{doc.meta.name}`,
      `????{doc.meta.method || id}`,
      `???${doc.meta.trigger || doc.meta.description || ''}`,
      sections ? `?????\n${sections}` : '',
      `????{doc.meta.returns || ''}`,
    ].filter(Boolean).join('\n');
  },

  definitionInstruction(id) {
    const skill = (window.GameModules.skillsDefinitions || []).find((item) => item.id === id);
    if (!skill) return '';
    return [
      `Skill??{skill.name || id}`,
      `????{skill.method || id}`,
      `???${skill.description || ''}`,
      skill.detail ? `?????\n${skill.detail}` : '',
      `????{skill.returns || ''}`,
    ].filter(Boolean).join('\n');
  },

  toDefinition(doc) {
    return {
      id: doc.meta.id,
      category: doc.meta.category || '??Skill',
      name: doc.meta.name,
      method: doc.meta.method || '',
      params: doc.meta.params || '',
      returns: doc.meta.returns || '',
      description: doc.meta.trigger || doc.meta.description || '',
      detail: doc.body,
      source: doc.file,
    };
  },
};


;// ---- skills-app.js ----
window.GameModules = window.GameModules || {};

window.GameModules.skillsApp = {
  defaultState() {
    return { open: false, query: '', category: '', selectedSkillId: '', detailOpen: false };
  },

  async loadDefinitions() {
    await window.GameModules.skillLoader?.load?.();
    return this.definitions();
  },

  definitions() {
    return window.GameModules.skillsDefinitions || [];
  },
};


;// ---- skills-actions.js ----
window.GameModules = window.GameModules || {};

window.GameModules.skillsActions = {
  initSkillsApp() {
    const base = window.GameModules.skillsApp.defaultState();
    this.skillsState = { ...base, ...(this.skillsState || {}) };
    window.GameModules.skillsApp.loadDefinitions().catch((err) => console.warn('[Skills] ??????????', err.message, err.stack));
  },

  openSkillsApp() {
    this.initSkillsApp();
    this.identityAppOpen = false;
    this.wechatAppOpen = false;
    this.saveAppOpen = false;
    this.roleCardJsonAppOpen = false;
    this.worldlineAppOpen = false;
    if (this.companyState) this.companyState.open = false;
    if (this.bossState) this.bossState.open = false;
    if (this.calendarState) this.calendarState.open = false;
    if (this.factionState) this.factionState.open = false;
    if (this.knownProfessionState) this.knownProfessionState.open = false;
    if (this.promptState) this.promptState.open = false;
    if (this.tokenStatsState) this.tokenStatsState.open = false;
    this.skillsState.open = true;
    this.desktopUnlocked = true;
  },

  closeSkillsApp() {
    if (this.skillsState) {
      this.skillsState.open = false;
      this.skillsState.detailOpen = false;
    }
    this.closeAppToDesktop();
  },

  openSkillDetail(id) {
    this.initSkillsApp();
    this.skillsState.selectedSkillId = id;
    this.skillsState.detailOpen = true;
  },

  closeSkillDetail() {
    if (!this.skillsState) return;
    this.skillsState.detailOpen = false;
    this.skillsState.selectedSkillId = '';
  },

  skillsList() {
    this.initSkillsApp();
    const q = String(this.skillsState.query || '').trim().toLowerCase();
    return window.GameModules.skillsApp.definitions().filter((skill) => {
      const matchesCategory = !this.skillsState.category || skill.category === this.skillsState.category;
      const haystack = [skill.name, skill.category, skill.method, skill.description, skill.detail].join(' ').toLowerCase();
      return matchesCategory && (!q || haystack.includes(q));
    });
  },

  skillCategories() {
    return [...new Set(window.GameModules.skillsApp.definitions().map((skill) => skill.category))];
  },

  selectedSkill() {
    this.initSkillsApp();
    if (!this.skillsState.selectedSkillId) return null;
    const list = this.skillsList();
    return list.find((skill) => skill.id === this.skillsState.selectedSkillId) || null;
  },
};


;// ---- known-profession-actions.js ----
window.GameModules = window.GameModules || {};

window.GameModules.knownProfessionActions = {
  initKnownProfessionApp() {
    this.knownProfessionState = { open: false, query: '', message: '', selectedName: '', detailOpen: false, ...(this.knownProfessionState || {}) };
  },

  openKnownProfessionApp() {
    this.initKnownProfessionApp();
    this.identityAppOpen = false;
    this.wechatAppOpen = false;
    this.saveAppOpen = false;
    this.roleCardJsonAppOpen = false;
    this.worldlineAppOpen = false;
    if (this.companyState) this.companyState.open = false;
    if (this.bossState) this.bossState.open = false;
    if (this.calendarState) this.calendarState.open = false;
    if (this.factionState) this.factionState.open = false;
    if (this.skillsState) this.skillsState.open = false;
    if (this.promptState) this.promptState.open = false;
    if (this.tokenStatsState) this.tokenStatsState.open = false;
    this.knownProfessionState.open = true;
    this.desktopUnlocked = true;
  },

  closeKnownProfessionApp() {
    if (this.knownProfessionState) {
      this.knownProfessionState.open = false;
      this.knownProfessionState.detailOpen = false;
    }
    this.closeAppToDesktop();
  },

  knownProfessions() {
    this.initKnownProfessionApp();
    const data = window.GameModules.sqliteSave.getMetaJson?.('known_professions') || [];
    const q = String(this.knownProfessionState.query || '').trim().toLowerCase();
    return data.filter((item) => !q || [item.name, item.worldTag, item.summary, item.sourceReason].join(' ').toLowerCase().includes(q));
  },

  openKnownProfessionDetail(job) {
    this.initKnownProfessionApp();
    if (!job?.name) return;
    this.knownProfessionState.selectedName = job.name;
    this.knownProfessionState.detailOpen = true;
  },

  closeKnownProfessionDetail() {
    if (!this.knownProfessionState) return;
    this.knownProfessionState.detailOpen = false;
    this.knownProfessionState.selectedName = '';
  },

  selectedKnownProfession() {
    this.initKnownProfessionApp();
    if (!this.knownProfessionState.selectedName) return null;
    const list = this.knownProfessions();
    return list.find((item) => item.name === this.knownProfessionState.selectedName) || null;
  },

  async knowProfession(name, worldTag, context = {}) {
    const clean = window.GameModules.professionInfo.normalizeJobName(name);
    if (!clean) return null;
    const world = worldTag || this.character?.work || window.GameModules.realWorld2026?.label || '????';
    const info = await window.GameModules.professionInfo.ensure(world, clean, context);
    if (!info) return null;
    const save = window.GameModules.sqliteSave;
    const list = save.getMetaJson?.('known_professions') || [];
    const next = { ...info, knownAt: new Date().toISOString(), sourceReason: context.sourceReason || '?????????? };
    const merged = [next, ...list.filter((item) => !(item.worldTag === world && item.name === info.name))].slice(0, 80);
    await save.saveMetaJson?.('known_professions', merged);
    this.knownProfessionState = { ...(this.knownProfessionState || {}), message: `??????${info.name}`, selectedName: info.name };
    return next;
  },

  professionRequirementText(job) {
    if (!job) return '';
    const req = job.requirements || job;
    return [
      `??????{this.statLabels(req.intrinsicStats).join('??) || '??}`,
      `????????{(req.worldAbilities || []).join('??) || '??}`,
      `???${(req.learnedAbilities || []).join('??) || '??}`,
      `??????{(req.knowledgeAreas || []).join('??) || '??}`,
      req.reason ? `????{req.reason}` : '',
    ].filter(Boolean).join('\n');
  },

  statLabels(keys = []) {
    const map = { strength: '??', agility: '??', constitution: '??', intelligence: '??', perception: '??', willpower: '??', charisma: '??' };
    return (keys || []).map((key) => map[key] || key);
  },

  professionExamResult(job) {
    const state = this.playerIdentityState?.() || this.characterRpgState;
    const values = state?.values || {};
    const has = (list, name) => (list || []).some((item) => String(item?.name || item).includes(name) || name.includes(String(item?.name || item)));
    const req = job?.requirements || job || {};
    const missingSkills = (req.learnedAbilities || []).filter((name) => !has(values.skills, name));
    const missingKnowledge = (req.knowledgeAreas || []).filter((name) => !has(values.knowledge, name));
    const missingStats = (req.intrinsicStats || []).filter((key) => values[key] === undefined || Number(values[key]?.value ?? values[key]) <= 0);
    const missingWorld = (req.worldAbilities || []).filter((name) => values[name] === undefined && !has(values.worldValues, name));
    return { pass: !missingSkills.length && !missingKnowledge.length && !missingStats.length && !missingWorld.length, missingSkills, missingKnowledge, missingStats, missingWorld };
  },

  async addProfessionToPlayer(job) {
    const state = await this.ensurePlayerRpgState?.(true);
    if (!state?.values || !job?.name) return false;
    window.GameModules.rpgProfessionState.ensurePrerequisites(state, job);
    const result = this.professionExamResult(job);
    if (!result.pass) {
      this.knownProfessionState.message = `?????????${[...result.missingStats, ...result.missingWorld, ...result.missingSkills, ...result.missingKnowledge].join('??)}`;
      return false;
    }
    const exists = (state.values.professions || []).some((item) => item.name === job.name);
    if (!exists) state.values.professions = [...(state.values.professions || []), window.GameModules.progression.learned(job.name, '??', 1, job.intrinsicStats || ['intelligence'], job.description || job.summary)];
    const target = state.values.professions.find((item) => item.name === job.name);
    target.info = job;
    target.linkedStats = job.intrinsicStats || target.linkedStats;
    target.levelDescription = job.levelDescription || target.levelDescription;
    target.effect = job.effect || target.effect;
    await window.GameModules.sqliteSave.saveCharacterState(state);
    await window.GameModules.rpgLexicon.syncState(state);
    this.knownProfessionState.message = `??????${job.name} lv.1`;
    return true;
  },
};


;// ---- taobao-actions.js ----
window.GameModules = window.GameModules || {};
window.GameModules.taobaoActions = {
  taobaoDefaultSlots() {
    return [];
  },

  taobaoWearFilters() {
    const p = window.GameModules.progression;
    const body = p?.bodyWearSlots?.() || [];
    const labels = { head: '??', neck: '??', innerwearTop: '??', top: '??', outerwear: '??', gloves: '??', waist: '??', innerwearBottom: '??', bottom: '??', socks: '??', shoes: '??', wrist: '??' };
    const filters = body.map((slot) => ({ slot, label: labels[slot] || p?.clothingPositionForSlot?.(slot) || slot }));
    return [{ slot: '', label: '??' }, { slot: '__set', label: '??? }, ...filters, { slot: '??', label: '??' }, { slot: '??', label: '??' }, { slot: '??', label: '??' }];
  },

  initTaobaoApp() {
    if (!this.taobaoState) this.taobaoState = { open: false, slots: [], selectedId: '', filterSlot: '', searchText: '', count: 5, generatingId: '', requestId: 0, message: '', error: '', walletOpen: false };
    if (!Array.isArray(this.taobaoState.slots)) this.taobaoState.slots = this.taobaoDefaultSlots();
    if (typeof this.taobaoState.filterSlot !== 'string') this.taobaoState.filterSlot = '';
    if (typeof this.taobaoState.searchText !== 'string') this.taobaoState.searchText = '';
    if (!Number(this.taobaoState.count)) this.taobaoState.count = 5;
    if (!this.taobaoState.requestIdActive) this.taobaoState.generatingId = '';
    if (typeof this.taobaoState.walletOpen !== 'boolean') this.taobaoState.walletOpen = false;
    if (typeof this.taobaoState.buyingId !== 'string') this.taobaoState.buyingId = '';
  },

  setTaobaoFilter(slot = '') {
    this.initTaobaoApp();
    this.taobaoState.filterSlot = slot;
    this.taobaoState.message = slot ? `????{this.taobaoFilterLabel(slot)}???` : '??????????;
  },

  setTaobaoCount(value) {
    this.initTaobaoApp();
    this.taobaoState.count = Math.max(1, Math.min(12, Number(value) || 5));
  },

  taobaoSearchHint() {
    const text = String(this.taobaoState?.searchText || '').trim();
    return text ? `????{text}` : '??????????JK??;
  },

  taobaoFilterLabel(slot = this.taobaoState?.filterSlot) {
    return this.taobaoWearFilters().find((item) => item.slot === slot)?.label || slot || '??';
  },

  taobaoFilteredSlots() {
    this.initTaobaoApp();
    const filter = this.taobaoState.filterSlot;
    const slots = this.taobaoState.slots.filter((slot) => slot.product);
    if (!filter || filter === '__set') return slots;
    return slots.filter((slot) => !slot.product || this.taobaoProductMatchesFilter(slot.product, filter));
  },

  taobaoProductMatchesFilter(product = {}, filter = '') {
    if (!filter) return true;
    const p = window.GameModules.progression;
    const targets = (Array.isArray(product.equipSlots) ? product.equipSlots : []).map((slot) => p?.canonicalWearSlot?.(slot) || slot);
    const canonical = p?.canonicalWearSlot?.(filter) || filter;
    return targets.includes(filter) || targets.includes(canonical) || targets.some((slot) => p?.slotBase?.(slot) === filter || p?.slotBase?.(slot) === canonical);
  },

  toggleTaobaoWallet() {
    this.initTaobaoApp();
    this.taobaoState.walletOpen = !this.taobaoState.walletOpen;
  },

  taobaoWalletRows() {
    const p = this.playerProfile || {};
    const rows = [{ label: '????', value: `${Number(p.wealthAmount || 0).toLocaleString('zh-CN')}?` }, { label: '????', value: p.wealthTier || '??' }];
    const source = String(p.wealthSource || '').trim();
    const matches = [...source.matchAll(/([^????]+?)\((-?\d+)\)/g)];
    if (matches.length) matches.forEach((m) => rows.push({ label: m[1].trim(), value: `${Number(m[2] || 0).toLocaleString('zh-CN')}?` }));
    else if (source) rows.push({ label: '????', value: source });
    if (p.wealthFixedIncome) rows.push({ label: '????', value: p.wealthFixedIncome });
    return rows;
  },

  openTaobaoApp() {
    this.closeDesktopApps();
    this.initTaobaoApp();
    this.taobaoState.generatingId = '';
    this.taobaoState.open = true;
    this.desktopUnlocked = true;
  },

  closeTaobaoApp() {
    if (this.taobaoState) this.taobaoState.open = false;
    this.closeAppToDesktop();
  },

  selectedTaobaoSlot() {
    this.initTaobaoApp();
    return this.taobaoState.slots.find((slot) => slot.id === this.taobaoState.selectedId) || null;
  },

  backToTaobaoResults() {
    this.initTaobaoApp();
    this.taobaoState.selectedId = '';
  },

  taobaoSlotSummary(slot = {}) {
    const p = slot.product;
    if (!p) return '';
    const set = Array.isArray(p.setItems) && p.setItems.length ? `??{p.setItems.length}??` : '';
    return `${p.name}??{Number(p.price || 0).toLocaleString('zh-CN')}??${p.category || '????'}${set}`;
  },

  taobaoProductDetail(product = null) {
    if (!product) return '?????????????????????????????????;
    const slots = Array.isArray(product.equipSlots) && product.equipSlots.length ? `????????{product.equipSlots.join('??)}` : '';
    return `${product.shop || '????'}??{product.description || '????'}${slots}`;
  },

  taobaoSetItems(product = null) {
    return Array.isArray(product?.setItems) ? product.setItems : [];
  },

  async selectTaobaoSlot(slotId) {
    this.initTaobaoApp();
    const slot = this.taobaoState.slots.find((item) => item.id === slotId);
    if (!slot) return;
    this.taobaoState.selectedId = slot.id;
    if (!slot.product) await this.generateTaobaoProduct(slot.id);
  },
};


;// ---- taobao-generate-actions.js ----
window.GameModules = window.GameModules || {};
window.GameModules.taobaoGenerateActions = {
  async taobaoPrompt(slot = {}) {
    const p = this.playerProfile || {};
    const bodySlots = window.GameModules.progression.bodyWearSlots();
    const slots = bodySlots.join('??);
    const filter = this.taobaoState?.filterSlot;
    const query = String(this.taobaoState?.searchText || '').trim();
    const queryText = query ? `??????${query}????????????name?category?description????????{query}???????JK?????????????????????????????????????` : '';
    const filterText = filter && filter !== '__set' ? `?????????${this.taobaoFilterLabel(filter)}??{filter}???????????????????` : '';
    const styleSlotText = /jk/i.test(query) && ['bottom', '??', '??'].includes(filter) ? '???JK????????????JK????????????????????????? : '';
    const setText = filter === '__set' ? `??????????????????????equipSlots????????{slots}?????setItems???????slot?slotLabel?name?description?????????????????????????????????` : '';
    return window.GameModules.renderPrompt('taobao-product-generate', {
      playerName: p.name || '??',
      playerAge: p.age || '',
      playerCity: p.refinedCity || p.city || '',
      playerRole: p.refinedRole || p.dailyRole || '',
      wealthTier: p.wealthTier || '??',
      wealthAmount: p.wealthAmount || 0,
      queryText,
      filterText,
      styleSlotText,
      setText,
      slots,
    });
  },

  normalizeTaobaoProduct(data = {}, slot = {}) {
    const price = Math.max(1, Math.floor(Number(data.price) || (this.playerProfile?.wealthTier === '??' ? 9 : 99)));
    const raw = { name: String(data.name || '????').slice(0, 32), description: String(data.description || data.reason || '').slice(0, 180), equipSlots: Array.isArray(data.equipSlots) ? data.equipSlots : String(data.equipSlots || '').split(/[????|??\s]+/).filter(Boolean) };
    const inferred = window.GameModules.progression.inferEquipSlots(raw, data.kind || '');
    const setItems = Array.isArray(data.setItems) ? data.setItems.map((item) => ({ slot: String(item.slot || '').slice(0, 24), slotLabel: String(item.slotLabel || item.slot || '').slice(0, 24), name: String(item.name || '??????).slice(0, 32), description: String(item.description || '').slice(0, 120) })).filter((item) => item.slot || item.name) : [];
    const clothing = inferred.some((slotName) => !['??'].includes(slotName)) || setItems.length;
    const query = String(this.taobaoState?.searchText || '').trim();
    const jkBottom = /jk/i.test(query) && ['bottom', '??', '??'].includes(this.taobaoState?.filterSlot);
    const name = jkBottom && !/jk|??|?|??/i.test(raw.name) ? `JK??????${raw.name}`.slice(0, 32) : raw.name;
    const category = jkBottom ? 'JK??' : String(data.category || slot.hint || '????').slice(0, 20);
    return { id: `tbp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name, category, price, shop: String(data.shop || '?????').slice(0, 30), description: raw.description || (jkBottom ? '??????JK???????? : '???AI?????????????), kind: data.kind === '??' && !clothing ? '??' : '??', equipSlots: setItems.length ? [...new Set([...inferred, ...setItems.map((item) => item.slot).filter(Boolean), ...(jkBottom ? ['bottom'] : [])])] : (jkBottom && !inferred.includes('bottom') ? [...inferred, 'bottom'] : inferred), setItems, reason: String(data.reason || '????').slice(0, 80), generatedAt: new Date().toISOString() };
  },

  taobaoBatchHint(index = 0) {
    const parts = [String(this.taobaoState?.searchText || '').trim(), this.taobaoState?.filterSlot ? this.taobaoFilterLabel() : ''];
    return parts.filter(Boolean).join(' + ') || '';
  },

  taobaoTargetSlots(slotId, count = 1) {
    this.initTaobaoApp();
    const start = slotId ? Math.max(0, this.taobaoState.slots.findIndex((item) => item.id === slotId)) : this.taobaoState.slots.length;
    const targets = [];
    for (let i = 0; i < count; i++) {
      const index = start + i;
      let slot = this.taobaoState.slots[index];
      if (!slot) {
        slot = { id: `tb-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`, hint: '', product: null };
        this.taobaoState.slots.push(slot);
      }
      targets.push(slot);
    }
    return targets;
  },

  async generateTaobaoProducts(slotId, countArg = 0) {
    this.initTaobaoApp();
    if (this.taobaoState.generatingId && this.taobaoState.requestIdActive) return;
    this.taobaoState.generatingId = '';
    this.taobaoState.selectedId = '';
    if (!slotId) this.taobaoState.slots = [];
    const count = Number(countArg || this.taobaoState.count || 5);
    const targets = this.taobaoTargetSlots(slotId, count);
    const reqId = (this.taobaoState.requestId || 0) + 1;
    Object.assign(this.taobaoState, { requestId: reqId, requestIdActive: true, error: '', message: `??AI????${targets.length}??????0??` });
    try {
      if (!window.dzmm?.completions) throw new Error('AI??????);
      for (let i = 0; i < targets.length; i++) {
        const slot = targets[i];
        slot.hint = this.taobaoBatchHint(i);
        this.taobaoState.generatingId = slot.id;
        const prompt = await this.taobaoPrompt(slot);
        const data = await window.GameModules.jsonUtils.generateJsonWithRetry({ source: 'taobao-product', promptId: 'taobao-product-generate', model: this.modelId, prompt, maxTokens: this.taobaoState.filterSlot === '__set' ? 1400 : 900, timeoutMs: 60000, max: 2 });
        if (this.taobaoState.requestId !== reqId) return;
        slot.product = this.normalizeTaobaoProduct(data, slot);
      }
      this.taobaoState.selectedId = '';
      this.taobaoState.message = `????{targets.length}???????????????`;
      await this.save?.();
    } catch (err) {
      if (this.taobaoState.requestId === reqId) this.taobaoState.error = `??????{err.message || '????'}`;
      console.error('[??] ??????:', err.message, err.stack);
    } finally {
      if (this.taobaoState.requestId === reqId) Object.assign(this.taobaoState, { generatingId: '', requestIdActive: false });
    }
  },

  async generateTaobaoProduct(slotId) {
    await this.generateTaobaoProducts(slotId, 1);
  },
};


;// ---- taobao-buy-actions.js ----
window.GameModules = window.GameModules || {};
window.GameModules.taobaoBuyActions = {
  taobaoProductBusyKey(item = {}) {
    return item?.id || item?.name || 'buying';
  },

  async buyTaobaoSlot(slotId) {
    this.initTaobaoApp();
    const slot = this.taobaoState.slots.find((item) => item.id === slotId);
    await this.buyTaobaoProduct(slot?.product || null);
  },

  async buyTaobaoProduct(product = null) {
    this.initTaobaoApp();
    const item = product?.product || product || this.selectedTaobaoSlot()?.product;
    if (!item || item.purchased || this.taobaoState.buyingId) return;
    const price = Math.max(1, Math.floor(Number(item.price) || 1));
    item.price = price;
    const buyKey = this.taobaoProductBusyKey(item);
    this.taobaoState.buyingId = buyKey;
    this.taobaoState.error = '';
    this.taobaoState.message = `????${item.name}?`;
    try {
      const money = Number(this.playerProfile?.wealthAmount || 0);
      if (money < price) {
        this.taobaoState.error = `??????????{money.toLocaleString('zh-CN')}?????${price.toLocaleString('zh-CN')}??`;
        this.taobaoState.message = '';
        return;
      }
      const state = await this.ensurePlayerRpgState?.();
      if (!state) {
        this.taobaoState.error = '????????????????;
        this.taobaoState.message = '';
        return;
      }
      const updates = this.taobaoInventoryUpdates(item);
      await this.applyInventoryUpdatesToState(state, updates);
      this.playerProfile.wealthAmount = money - price;
      window.GameModules.orgTerritoryActions?.syncPlayerWealthAsset?.(this);
      item.purchased = true;
      this.taobaoState.message = `????{item.name}??{updates.length}??????????${price.toLocaleString('zh-CN')}??`;
      this.taobaoState.error = '';
      this.taobaoState.buyingId = '';
      await this.save?.();
    } catch (err) {
      this.taobaoState.error = `??????{err.message || '????'}`;
      console.error('[??] ????:', err.message, err.stack);
    } finally {
      this.taobaoState.buyingId = '';
    }
  },

  taobaoInventoryUpdates(item) {
    const setItems = this.taobaoSetItems(item);
    if (setItems.length) {
      return setItems.map((part) => ({
        kind: '??',
        name: part.name,
        value: {
          name: part.name,
          description: `${part.description || item.description}??{item.name}????????????{item.shop}?`,
          equipSlots: [part.slot],
          slot: part.slot,
          price: Math.max(1, Math.floor(item.price / setItems.length)),
        },
        reason: '??????',
      }));
    }
    return [{
      kind: item.kind || '??',
      name: item.name,
      value: {
        name: item.name,
        description: `${item.description}??????????{item.shop}????${item.price}??`,
        equipSlots: item.equipSlots,
        slot: item.equipSlots?.[0] || '',
        price: item.price,
      },
      reason: '????',
    }];
  },
};


;// ---- prompt-actions.js ----
window.GameModules = window.GameModules || {};

window.GameModules.promptActions = {
  initPromptApp() { this.promptState = { ...window.GameModules.promptTemplates.defaultState(), ...(this.promptState || {}) }; },
  openPromptApp() {
    this.initPromptApp();
    this.identityAppOpen = false; this.wechatAppOpen = false; this.saveAppOpen = false; this.roleCardJsonAppOpen = false; this.worldlineAppOpen = false;
    if (this.companyState) this.companyState.open = false;
    if (this.bossState) this.bossState.open = false;
    if (this.calendarState) this.calendarState.open = false;
    if (this.factionState) this.factionState.open = false;
    if (this.skillsState) this.skillsState.open = false;
    if (this.knownProfessionState) this.knownProfessionState.open = false;
    if (this.tokenStatsState) this.tokenStatsState.open = false;
    this.promptState.open = true; this.desktopUnlocked = true;
  },
  closePromptApp() { if (this.promptState) this.promptState.open = false; this.closeAppToDesktop(); },
  promptDrawItems() {
    return [
      { id: 'draw-wechat-album-natural', title: '??????????????, category: '????', file: 'prompts/picture_generate/wechat-album-photo.md', summary: '???????????{??????} ??{????????}??, drawKind: 'natural' },
      { id: 'draw-wechat-album-dressed', title: '??????????????, category: '????', file: 'prompts/picture_generate/wechat-album-photo.md', summary: '???????????{??????} ??{??????}??, drawKind: 'dressed' },
    ];
  },
  promptRuntimeItems() {
    return (window.GameModules.tokenStats?.records || []).filter((record) => record.kind === 'draw').map((record) => ({
      id: `runtime-${record.id}`,
      title: record.title || '????AI ??',
      category: record.category || '????',
      file: record.file || '??????,
      summary: record.summary || '?????????????,
      runtimeRecordId: record.id,
    }));
  },
  promptAllItems() {
    return [...window.GameModules.promptTemplates.list(), ...this.promptDrawItems(), ...this.promptRuntimeItems()];
  },
  promptList() {
    this.initPromptApp();
    const q = String(this.promptState.query || '').trim().toLowerCase();
    return this.promptAllItems().filter((item) => {
      const inCategory = !this.promptState.category || item.category === this.promptState.category;
      const haystack = [item.title, item.category, item.summary, item.file].join(' ').toLowerCase();
      return inCategory && (!q || haystack.includes(q));
    });
  },
  promptCategories() {
    return [...new Set(this.promptAllItems().map((item) => item.category).filter(Boolean))];
  },
  promptCategoryLabel() { return this.promptState?.category || '????'; },
  selectPromptCategory(category = '') {
    this.initPromptApp();
    this.promptState.category = category;
    this.promptState.categoryMenuOpen = false;
  },
  isPromptOpen(id) { return this.promptState?.selectedId === id; },
  currentPromptItem() {
    const id = this.promptState?.selectedId || '';
    return this.promptAllItems().find((item) => item.id === id) || window.GameModules.promptTemplates.find(id);
  },
  closePromptDetail() { if (this.promptState) { this.promptState.selectedId = ''; this.promptState.selectedText = ''; this.promptState.error = ''; } },
  promptDrawDetailText(contact, kind) {
    const template = window.GameModules.pictureGeneratePrompts?.drawTagPrompt || '';
    const finalPrompt = this.wechatAlbumPhotoPrompt?.(contact, kind) || '??????????????????;
    return [`??????????\n${template || '?????????????}`, `??????????\n${finalPrompt}`].join('\n\n---\n\n');
  },
  async togglePromptDetail(id) {
    this.initPromptApp();
    if (this.promptState.selectedId === id) { this.promptState.selectedId = ''; this.promptState.selectedText = ''; return; }
    this.promptState.selectedId = id; this.promptState.loading = true; this.promptState.error = '';
    const drawItem = this.promptDrawItems().find((item) => item.id === id);
    if (drawItem) {
      const contact = this.wechatProfileContact?.() || this.wechatSelected?.() || { id: 'player-self', name: this.playerName || '????, mark: '?? };
      this.promptState.selectedText = this.promptDrawDetailText(contact, drawItem.drawKind);
      this.promptState.loading = false;
      return;
    }
    const runtimeItem = this.promptRuntimeItems().find((item) => item.id === id);
    if (runtimeItem) {
      this.promptState.selectedText = window.GameModules.tokenStats.item(runtimeItem.runtimeRecordId)?.text || '??????????;
      this.promptState.loading = false;
      return;
    }
    this.promptState.selectedText = window.GameModules.promptTemplates.snapshot(id);
    try { this.promptState.selectedText = await window.GameModules.promptTemplates.load(id); }
    catch (err) { console.error('??????????', err.message, err.stack); this.promptState.error = err.message || '????'; this.promptState.selectedText = ''; }
    finally { this.promptState.loading = false; }
  },
};


;// ---- system-test-actions.js ----
window.GameModules = window.GameModules || {};

window.GameModules.systemTestActions = {
  initSystemTestApp() {
    const neutralThinkingPrompt = '?????????????????????????????;
    const contaminatedThinkingPrompt = '?????????????????????????????????? thinking/think????????;
    const previousState = this.systemTestState || {};
    this.systemTestState = {
      open: false,
      loading: false,
      thinkingLoading: false,
      platformChatLoading: false,
      result: '',
      error: '',
      thinkingError: '',
      thinkingResults: [],
      platformChatPayload: '',
      platformChatRaw: '',
      platformChatError: '',
      systemText: '??????????????????????SYSTEM_OK??,
      userText: '????system role ??????,
      ...previousState,
      thinkingPrompt: previousState.thinkingPrompt && previousState.thinkingPrompt !== contaminatedThinkingPrompt ? previousState.thinkingPrompt : neutralThinkingPrompt,
    };
  },

  openSystemTestApp() {
    this.initSystemTestApp();
    this.closeDesktopApps?.();
    this.systemTestState.open = true;
    this.desktopUnlocked = true;
  },

  closeSystemTestApp() {
    if (this.systemTestState) this.systemTestState.open = false;
    this.closeAppToDesktop?.();
  },

  selectedSystemTestModel() {
    return this.modelId || this.settingsState?.textModelId || window.GameModules.config?.defaultModelId || 'nalang-turbo-0826';
  },

  selectTextBlock(event) {
    const node = event?.currentTarget;
    if (!node || !window.getSelection || !document.createRange) return;
    const range = document.createRange();
    range.selectNodeContents(node);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  },

  async runSystemRoleTest() {
    this.initSystemTestApp();
    const state = this.systemTestState;
    if (state.loading) return;
    state.loading = true;
    state.result = '';
    state.error = '';
    try {
      const fullText = await window.GameModules.aiRequest.complete({
        source: 'system-role-test',
        model: this.selectedSystemTestModel(),
        messages: [
          { role: 'system', content: state.systemText || '' },
          { role: 'user', content: state.userText || '' },
        ],
        maxTokens: 200,
        timeoutMs: 30000,
        jsonMode: false,
        outputLimitKind: 'other',
      });
      state.result = fullText || '????????????;
    } catch (err) {
      state.error = [err?.code, err?.message].filter(Boolean).join('??) || '????';
      console.error('[system role ??] ??:', err?.code, err?.message, err?.stack);
    } finally {
      state.loading = false;
    }
  },

  async runThinkingParamTests() {
    this.initSystemTestApp();
    const state = this.systemTestState;
    if (state.thinkingLoading) return;
    state.thinkingLoading = true;
    state.thinkingError = '';
    state.thinkingResults = [
      this.createThinkingTestResult('deepThinking', '?? deepThinking: true'),
    ];
    for (const target of state.thinkingResults) {
      await this.runSingleThinkingParamTest(target).catch((err) => {
        target.status = '??';
        target.error = [err?.code, err?.message].filter(Boolean).join('??) || '????';
        console.error('[??????] ??:', target.paramKey, err?.code, err?.message, err?.stack);
      });
      state.thinkingResults = [...state.thinkingResults];
    }
    state.thinkingLoading = false;
  },

  createThinkingTestResult(paramKey, label) {
    return { paramKey, label, status: '????, thinking: '', content: '', raw: '', error: '', payload: '', tokenSeen: false };
  },

  async runPlatformChatDeepThinkingTest() {
    this.initSystemTestApp();
    const state = this.systemTestState;
    if (state.platformChatLoading) return;
    const payload = {
      operation: 'generate',
      chatId: 'd4d1e6c2-113c-4645-9efc-048c32f77b0c',
      cardId: '3011985',
      chatSettings: {
        model: 'x-apex-flux-0217-16k',
        style: 'standard',
        maxTokens: 3500,
        randomIndex: 0,
        deepThinking: true,
        enableMemoryEnhance: false,
        voiceSettings: {
          ignore_parentheses: false,
          only_quotes: false,
          ignore_english: false,
          read_asterisks: false,
        },
      },
      presetConfig: { presetIds: [] },
      prompts: [
        { role: 'user', content: state.thinkingPrompt || '????????????????????????????? },
      ],
    };
    state.platformChatLoading = true;
    state.platformChatError = '';
    state.platformChatPayload = JSON.stringify(payload, null, 2);
    state.platformChatRaw = `[raw request]\n${state.platformChatPayload}\n`;
    console.log('[?? /api/chat ??][RAW request object]', payload);
    console.log('[?? /api/chat ??][RAW request JSON]', state.platformChatPayload);
    try {
      await this.fetchPlatformChatRaw(state, payload, 'application/json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      const firstError = { mode: 'application/json', name: err?.name, message: err?.message, stack: err?.stack };
      console.error('[?? /api/chat ??] application/json ??:', err?.message, err?.stack);
      state.platformChatRaw += `\n[application/json fetch error]\n${JSON.stringify(firstError, null, 2)}\n`;
      try {
        await this.fetchPlatformChatRaw(state, payload, 'simple text/plain', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      } catch (fallbackErr) {
        const secondError = { mode: 'simple text/plain', name: fallbackErr?.name, message: fallbackErr?.message, stack: fallbackErr?.stack };
        state.platformChatError = fallbackErr?.message || err?.message || '????';
        console.error('[?? /api/chat ??] simple request ??:', fallbackErr?.message, fallbackErr?.stack);
        state.platformChatRaw += `\n[simple request fetch error]\n${JSON.stringify(secondError, null, 2)}\n`;
      }
    } finally {
      state.platformChatLoading = false;
    }
  },

  async fetchPlatformChatRaw(state, payload, mode, options) {
    state.platformChatRaw += `\n[fetch mode]\n${mode}\n`;
    const response = await fetch('https://www.dzmm.ai/api/chat', options);
    const responseMeta = {
      mode,
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      type: response.type,
      url: response.url,
      headers: Object.fromEntries(response.headers.entries()),
    };
    console.log('[?? /api/chat ??][RAW response meta]', responseMeta);
    state.platformChatRaw += `\n[raw response meta]\n${JSON.stringify(responseMeta, null, 2)}\n`;
    const text = await response.text();
    console.log('[?? /api/chat ??][RAW response text]', text);
    state.platformChatRaw += `\n[raw response text]\n${text}\n`;
    if (!response.ok) state.platformChatError = `${response.status} ${response.statusText}`;
  },

  async runSingleThinkingParamTest(target) {
    const state = this.systemTestState;
    const payload = {
      model: this.selectedSystemTestModel(),
      messages: [{ role: 'user', content: state.thinkingPrompt || '' }],
      maxTokens: 500,
      deepThinking: true,
    };
    const requestPacket = { label: target.label, paramKey: target.paramKey, payload };
    target.payload = JSON.stringify(requestPacket, null, 2);
    target.raw = `[raw request payload]\n${target.payload}\n`;
    target.thinking = '';
    target.content = '?????????????????? / ?? / ????;
    target.status = '????;
    this.systemTestState.thinkingResults = [...this.systemTestState.thinkingResults];
    console.log('[??????][RAW request payload object]', requestPacket);
    console.log('[??????][RAW request payload JSON]', target.payload);
    const response = await window.dzmm.completions(payload, (...args) => {
      const callbackPacket = {
        label: target.label,
        paramKey: target.paramKey,
        callbackArgs: args.map((arg, index) => this.describeThinkingCallbackArg(arg, index)),
      };
      const callbackJson = JSON.stringify(callbackPacket, null, 2);
      console.log('[??????][RAW callback args object]', callbackPacket);
      console.log('[??????][RAW callback args JSON]', callbackJson);
      target.raw += `\n[raw callback args]\n${callbackJson}\n`;
      target.status = Boolean(args[1]) ? '??' : '????;
      this.systemTestState.thinkingResults = [...this.systemTestState.thinkingResults];
    });
    const returnPacket = {
      label: target.label,
      paramKey: target.paramKey,
      promiseReturn: this.describeThinkingCallbackArg(response, 0),
    };
    const returnJson = JSON.stringify(returnPacket, null, 2);
    console.log('[??????][RAW promise return object]', returnPacket);
    console.log('[??????][RAW promise return JSON]', returnJson);
    target.raw += `\n[raw promise return]\n${returnJson}\n`;
    this.systemTestState.thinkingResults = [...this.systemTestState.thinkingResults];
  },

  stringifyThinkingDebugValue(value) {
    if (typeof value === 'string') return value;
    try { return JSON.stringify(value); }
    catch (_) { return String(value); }
  },

  describeThinkingCallbackArg(value, index) {
    const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
    const item = { index, type, value };
    if (typeof value === 'string') item.valueJson = JSON.stringify(value);
    return item;
  },

  parseThinkingCallbackArgs(args = []) {
    const out = { thinking: '', thinkingCumulative: false, content: '', contentCumulative: false, raw: '' };
    args.forEach((arg, index) => {
      if (typeof arg === 'boolean' || arg == null) return;
      if (typeof arg === 'string') {
        const labeled = this.parseThinkingLabeledText(arg);
        const parsed = labeled.matched ? labeled : this.parseThinkingSseText(arg);
        if (parsed.matched) {
          if (parsed.thinking) {
            out.thinking = parsed.thinking;
            out.thinkingCumulative = parsed.thinkingCumulative;
          }
          if (parsed.content) {
            out.content = parsed.contentCumulative ? parsed.content : out.content + parsed.content;
            out.contentCumulative = Boolean(parsed.contentCumulative);
          }
        } else if (index === 0) out.content += arg;
        out.raw += arg;
        return;
      }
      if (typeof arg === 'object') {
        const data = arg.data;
        const objectData = data && typeof data === 'object' ? data : arg;
        if (arg.type === 'step' || objectData.step === '???') {
          out.thinking = String(objectData.content || '');
          out.thinkingCumulative = true;
        } else if (arg.type === 'token') out.content += String(typeof data === 'string' ? data : objectData.content || '');
        else if (arg.type === 'complete') out.content += String(objectData.content || '');
        else {
          out.thinking += String(objectData.thinking || objectData.think || objectData.reasoning || '');
          out.content += String(objectData.content || objectData.delta || objectData.text || '');
        }
        try { out.raw += `${JSON.stringify(arg)}\n`; }
        catch (_) { out.raw += '[???????]\n'; }
      }
    });
    return out;
  },

  parseThinkingLabeledText(text = '') {
    const normalized = String(text || '').replace(/\r\n/g, '\n');
    const out = { matched: false, thinking: '', thinkingCumulative: true, content: '', contentCumulative: true };
    if (normalized.startsWith('thinking\n')) {
      out.matched = true;
      const body = normalized.slice('thinking\n'.length);
      const splitIndex = body.indexOf('\nthink\n');
      if (splitIndex >= 0) {
        out.thinking = body.slice(0, splitIndex);
        out.content = body.slice(splitIndex + '\nthink\n'.length);
      } else {
        out.thinking = body;
      }
      return out;
    }
    if (normalized.startsWith('think\n')) {
      out.matched = true;
      out.content = normalized.slice('think\n'.length);
    }
    return out;
  },

  parseThinkingSseText(text = '') {
    const out = { matched: false, thinking: '', thinkingCumulative: false, content: '', contentCumulative: false };
    String(text).split(/\n+/).forEach((line) => {
      const value = line.trim().startsWith('data:') ? line.trim().slice(5).trim() : line.trim();
      if (!value || !value.startsWith('{')) return;
      try {
        const event = JSON.parse(value);
        const data = event.data && typeof event.data === 'object' ? event.data : event.data;
        out.matched = true;
        if (event.type === 'step') {
          out.thinking = String(data?.content || '');
          out.thinkingCumulative = true;
        } else if (event.type === 'token') out.content += String(data || '');
        else if (event.type === 'complete') out.content += String(data?.content || '');
      } catch (_) {
        // ??SSE JSON ???????????      }
    });
    return out;
  },

  extractThinkingFromFinalText(target) {
    const raw = String(target.raw || target.content || '').trim();
    if (!raw || target.thinking.trim()) return;
    try {
      const data = JSON.parse(raw);
      target.thinking = String(data.thinking || data.think || data.reasoning || target.thinking || '');
      target.content = String(data.content || data.text || data.answer || target.content || '');
    } catch (_) {
      // ???????JSON ??????????????????    }
  },
};


;// ---- role-card-json-app/role-card-json-app.js ----
window.GameModules = window.GameModules || {};

window.GameModules.roleCardJsonApp = {
  clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  },

  normalizeCharacter(state = {}) {
    return {
      id: state.id || state.profile?.id || '',
      name: state.name || state.profile?.name || '',
      worldTag: state.worldTag || state.profile?.work || state.values?.world_tag || '',
      profile: this.clone(state.profile || {}),
      values: this.clone(state.values || {}),
      metrics: this.clone(state.metrics || {}),
      memory: this.clone(state.memory || {}),
      schema: this.clone(state.schema || null),
      updatedAt: state.updatedAt || '',
    };
  },

  buildPayload({ slot = '', states = [], exportedAt = new Date().toISOString() } = {}) {
    const characters = (Array.isArray(states) ? states : []).map((state) => this.normalizeCharacter(state));
    return {
      slot,
      exportedAt,
      count: characters.length,
      characters,
    };
  },

  formatPayload(payload) {
    return JSON.stringify(payload, null, 2);
  },

  actions: {
    openRoleCardJsonApp() {
      this.closeDesktopApps?.();
      this.roleCardJsonAppOpen = true;
      this.desktopUnlocked = true;
      this.refreshRoleCardJsonText?.();
    },

    closeRoleCardJsonApp() {
      this.roleCardJsonAppOpen = false;
      this.closeAppToDesktop?.();
    },

    async refreshRoleCardJsonText() {
      const app = window.GameModules.roleCardJsonApp;
      try {
        const save = window.GameModules.sqliteSave;
        const states = save?.listCharacterStates ? save.listCharacterStates() : [];
        const exportedAt = new Date().toISOString();
        const slot = this.selectedSlot || save?.activeSlot || '';
        const payload = app.buildPayload({ slot, states, exportedAt });
        this.roleCardJsonText = app.formatPayload(payload);
        this.roleCardJsonMeta = { slot: payload.slot, count: payload.count, exportedAt: payload.exportedAt };
        this.roleCardJsonError = '';
      } catch (err) {
        this.roleCardJsonText = '';
        this.roleCardJsonMeta = { slot: this.selectedSlot || '', count: 0, exportedAt: '' };
        this.roleCardJsonError = err?.message || '????JSON ????';
      }
    },
  },
};
