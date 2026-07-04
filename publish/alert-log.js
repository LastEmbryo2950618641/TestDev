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
