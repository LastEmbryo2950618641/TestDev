try {
  window.parent?.postMessage?.('iframe:content-ready', '*');
} catch (err) {
  console.warn('骞冲彴灏辩华閫氱煡澶辫触:', err.message);
}

const dzmmReady = new Promise((resolve) => {
  if (window.dzmm) return resolve();
  window.addEventListener('message', function handler(event) {
    if (event.data?.type === 'dzmm:ready') {
      window.removeEventListener('message', handler);
      resolve();
    }
  });
  setTimeout(resolve, 1200);
});

function registerGameStore() {
  if (!window.Alpine || window.Alpine.store('game')) return;
  const cfg = window.GameModules.config;
  const gm = window.GameModules;
  gm.realWorld2026 = gm.realWorld2026 || { label: '2026 现代都市现实世界', summary: '' };
  const stateOf = (obj, method, fallback = {}) => (obj?.[method] ? obj[method]({}) : fallback);
  const defaultBossState = gm.bossRecruitment?.defaultBossState?.({}) || {
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
      scale: '',
      province: '',
      city: '',
      county: '',
      town: '',
      payType: '',
      baseMin: '',
      baseMax: '',
      performanceMonths: '',
      creatorPay: '',
      creatorLevel: '',
    },
    jobs: [],
  };
  const defaultCompanyState = stateOf(gm.companySystem, 'defaultState', {
    open: false,
    companies: [],
    currentCompanyId: '',
    employment: { active: false, activeCompanyId: '' },
    submissions: [],
    records: [],
  });
  const defaultFactionState = stateOf(gm.factionSystem, 'defaultState', {
    open: false,
    selectedId: '',
    factions: [],
    orgChartMode: 'forest',
    forestTab: 'corp',
    forestData: { viewportRoot: null, domains: [], activeTree: null, breadcrumb: '' },
    orgTree: null,
    orgNodes: [],
    structureCards: [],
    capabilityCards: [],
    roleDialogOpen: false,
    roleDialog: null,
  });
  const defaultCalendarState = gm.calendarSystem?.defaultCalendarState?.() || {
    open: false,
    selectedDate: '',
    selectedEventId: '',
    events: [],
  };
  const defaultEventState = gm.eventSystem?.defaultState?.() || {
    open: false,
    tab: 'random',
    selectedId: '',
    message: '',
    currentContext: null,
    randomProbability: 10,
    events: [],
    draft: {},
  };
  const defaultNewsDriverState = gm.newsDriverSystem?.defaultState?.() || {
    open: false,
    enabled: true,
    channelId: 'all',
    filter: 'all',
    selectedId: '',
    items: [],
    channels: [],
    promotedEventIds: [],
    recentOps: [],
  };
  const defaultRealWorldMapState = gm.realWorldMap?.defaultState?.({}) || {
    nodes: [],
    selectedId: '',
    infoNodeId: '',
  };
  const criticalActionFallback = {
    metricGroups(state = null) { return window.GameModules.ui.criticalAction.metricViewHelpers.metricGroups.call(this, state); },
    metricEntries(group = {}) { return window.GameModules.ui.criticalAction.metricViewHelpers.metricEntries.call(this, group); },
    metricValueText(value, ready = this.metricsReady) { return window.GameModules.ui.criticalAction.metricViewHelpers.metricValueText.call(this, value, ready); },
    metricCollapsedItems() { return window.GameModules.ui.criticalAction.metricViewHelpers.metricCollapsedItems.call(this); },
    installMetricSummaryObserver() { return window.GameModules.ui.criticalAction.metricViewHelpers.installMetricSummaryObserver.call(this); },
    toggleMetric(type, key) { return window.GameModules.ui.criticalAction.metricViewHelpers.toggleMetric.call(this, type, key); },
    isMetricOpen(type, key) { return window.GameModules.ui.criticalAction.metricViewHelpers.isMetricOpen.call(this, type, key); },
    metricNote(type, key) { return window.GameModules.ui.criticalAction.metricViewHelpers.metricNote.call(this, type, key); },
    loreNames(list, key) { return window.GameModules.ui.criticalAction.metricViewHelpers.loreNames.call(this, list, key); },
    async searchLore() {},
    refreshRagContext() {},
    addNovelEntry() { return 0; },
    promptDialogText() { return window.GameModules.ui.criticalAction.metricViewHelpers.promptDialogText.call(this); },
    feedbackText() { return window.GameModules.ui.criticalAction.metricViewHelpers.feedbackText.call(this); },
    feedbackPlan() { return window.GameModules.ui.criticalAction.metricViewHelpers.feedbackPlan.call(this); },
    feedbackSourceText() { return window.GameModules.ui.criticalAction.metricViewHelpers.feedbackSourceText.call(this); },
    feedbackSummary() { return window.GameModules.ui.criticalAction.metricViewHelpers.feedbackSummary.call(this); },
    savePanelView() {
      return {
        rows: Array.from({ length: 3 }, (_, index) => ({
          key: 'safe-' + (index + 1),
          slot: index + 1,
          active: false,
          exists: false,
          statusText: 'Empty',
          timeText: 'Unavailable in safe mode',
        })),
      };
    },
    roleCardLoadingSummary() { return window.GameModules.ui.loading.progressView.roleCardLoadingSummary.call(this); },
    roleCardLoadingProgressText() { return window.GameModules.ui.loading.progressView.roleCardLoadingProgressText.call(this); },
    roleCardLoadingProgressPercent() { return window.GameModules.ui.loading.progressView.roleCardLoadingProgressPercent.call(this); },
    roleCardLoadingCardProgress(card = {}) { return window.GameModules.ui.loading.progressView.roleCardLoadingCardProgress.call(this, card); },
    roleCardLoadingStepProgress(step = {}) { return window.GameModules.ui.loading.progressView.roleCardLoadingStepProgress.call(this, step); },
    roleCardLoadingStatusText(status = '') { return window.GameModules.ui.loading.progressView.roleCardLoadingStatusText.call(this, status); },
    stageText(status = '') { return window.GameModules.ui.loading.progressView.stageText.call(this, status); },
    elapsedText(startedAt = 0, finishedAt = 0) { return window.GameModules.ui.loading.progressView.elapsedText.call(this, startedAt, finishedAt); },
    memoryStatus(kind = 'shortTerm') {
      return kind === 'longTerm' ? 'Long-term memory is temporarily simplified.' : 'Short-term memory is temporarily simplified.';
    },
    controlWorldLores() { return []; },
    themeOptions() {
      return [
        { id: 'safe-default', accent: '#7fe5ff', emoji: '*', name: 'Safe Default' },
      ];
    },
    selectedPlayerRoleCard() {
      const cards = this.roleCardSetup?.cards || [];
      const id = this.roleCardSetup?.selectedPlayerId || '';
      return cards.find((card) => window.GameModules.predefinedRoleCards?.roleCardId?.(card) === id) || cards.find((card) => card?.name === this.roleCardSetup?.selectedPlayerName) || cards[0] || { name: 'Player' };
    },
    roleCardSimpleFields() { return []; },
    novelLogEntries() { return window.GameModules.ui.criticalAction.metricViewHelpers.novelLogEntries.call(this); },
    tokenPromptList() { return []; },
    tokenPromptCategories() { return []; },
    tokenCategoryLabel() { return '全部分类'; },
    currentTokenPromptRecord() { return null; },
    tokenPromptCostText() { return ''; },
    tokenPromptDetailText() { return ''; },
    tokenResponseImages() { return []; },
    wechatContacts() { return []; },
    wechatThreads() { return []; },
    wechatSelected() { return { id: this.wechatSelectedContact || 'player-self', name: '微信', group: true, mark: '微' }; },
    wechatProfileContact() { return this.wechatSelected?.() || { id: 'player-self', name: '联系人', mark: '联', relation: '', subtitle: '' }; },
    wechatMessages() { return []; },
    wechatAlbumPhotoListForContact() { return []; },
    wechatAlbumPhotoList() { return []; },
    wechatImageMentionSources() { return []; },
    wechatAlbumPromptList() { return []; },
    wechatAlbumPromptOptions() { return { identity: [], body: [] }; },
    eventRandomProbability() { return Math.max(0, Math.min(100, Math.round(Number(this.eventState?.randomProbability ?? 10) || 0))); },
    drivePrimaryTabs() {
      return [
        { id: 'inbox', label: '日常队列', count: 0, showCount: true },
        { id: 'events', label: '事件库', count: 0, showCount: false },
        { id: 'tempo', label: '节奏参数', count: 0, showCount: false },
      ];
    },
    inboxFilterTabs() {
      return [
        { id: 'pending', label: '待处理' },
        { id: 'prepared', label: '已备稿' },
        { id: 'consumed', label: '已消耗' },
        { id: 'all', label: '全部' },
      ];
    },
    currentInboxList() { return []; },
    inboxListEmptyText() { return '暂无待处理日常入队。'; },
    selectedInboxItem() { return null; },
    inboxChannelLabel(channel = '') { return ({ wechat: '微信', call: '电话', scene: '当面' })[channel] || '电话'; },
    inboxStatusLabel(status = '') { return ({ pending: '待处理', prepared: '已备稿', consumed: '已消耗', expired: '已过期' })[status] || '待处理'; },
    inboxUrgencyDots() { return { filled: 0, total: 4, label: '无' }; },
    inboxRelativeTime() { return ''; },
    inboxBudgetTiersView() { return []; },
    setDrivePrimaryTab() {},
    setInboxFilter() {},
    selectInboxItem() {},
    setInboxBudgetTier() {},
    resetInboxBudgetTiers() {},
    eventTypeTabs() {
      return [
        { type: 'random', label: '随机事件', count: 0 },
        { type: 'inference', label: '大地图事件', count: 0 },
        { type: 'periodic', label: '周期事件', count: 0 },
      ];
    },
    currentEventList() { return []; },
    selectedEvent() { return null; },
    eventName(event = {}) { return event.title || event.name || '未命名事件'; },
    eventMeta(event = {}) { return event.type || ''; },
    eventStatusLabel(event = {}) { return event.status || '未开始'; },
    setEventTab(type = 'random') { this.eventState = { ...(this.eventState || {}), tab: type }; },
    setEventRandomProbability(value = 10) { this.eventState = { ...(this.eventState || {}), randomProbability: Math.max(0, Math.min(100, Math.round(Number(value) || 0))) }; },
    newsChannelTabs() { return [{ id: 'all', label: '全部', count: 0 }]; },
    newsFilterTabs() { return [{ id: 'all', label: '全部' }]; },
    currentNewsList() { return []; },
    selectedNewsItem() { return null; },
    newsChannelLabel(channelId = '') { return channelId || '未知频道'; },
    newsScopeLabel(scope = '') { return scope || '未知'; },
    newsTaskPotentialLabel(value = '') { return value || '背景'; },
    newsTrendLabel(value = '') { return value || '稳定'; },
    newsHeatClass() { return 'cool'; },
    setNewsChannel() {},
    setNewsFilter() {},
    selectNewsItem() {},
    newsNarrationPromptContext() { return ''; },
    wechatAlbumKindLabel(kind = '') { return kind === 'dressed' ? '盛装状态' : kind === 'custom' ? '自定义状态' : '自然状态'; },
    wechatAlbumSelectedPrompt() { return null; },
    wechatAlbumPromptListPreview() { return ''; },
    wechatAvatarText(contact = {}) { return String(contact?.name || contact?.mark || '联').trim().slice(0, 1) || '联'; },
    wechatAvatarStyle() { return ''; },
    wechatHasChangeReasons() { return false; },
    wechatChangeGroups() { return []; },
    wechatImageConfirmPromptText() { return ''; },
    selectedTaobaoSlot() { return gm.taobaoActions?.selectedTaobaoSlot?.call(this) || null; },
    taobaoFilteredSlots() { return gm.taobaoActions?.taobaoFilteredSlots?.call(this) || []; },
    taobaoProductDetail(product = null) { return gm.taobaoActions?.taobaoProductDetail?.call(this, product) || ''; },
    taobaoSetItems(product = null) { return gm.taobaoActions?.taobaoSetItems?.call(this, product) || []; },
    currentBossJobs() { return gm.bossActions?.currentBossJobs?.call(this) || []; },
    selectedBossJob() { return gm.bossActions?.selectedBossJob?.call(this) || null; },
    selectedBossCompanyJob() { return gm.bossActions?.selectedBossCompanyJob?.call(this) || null; },
    bossOptions(key) { return gm.bossActions?.bossOptions?.call(this, key) || []; },
    bossAppointmentChoices(job = this.selectedBossCompanyJob?.()) { return gm.bossAppointmentActions?.bossAppointmentChoices?.call(this, job) || []; },
    bossCompanyFields(job = this.selectedBossCompanyJob?.()) { return gm.bossActions?.bossCompanyFields?.call(this, job) || []; },
    bossApplyHint(job = this.selectedBossCompanyJob?.()) { return gm.bossActions?.bossApplyHint?.call(this, job) || ''; },
    bossApplyButtonText(job = this.selectedBossCompanyJob?.()) { return gm.bossActions?.bossApplyButtonText?.call(this, job) || '提交'; },
    bossJobPayText(job) { return gm.bossActions?.bossJobPayText?.call(this, job) || ''; },
    bossMatchText(job, key) { return gm.bossActions?.bossMatchText?.call(this, job, key) || ''; },
    calendarMonthTitle() { return gm.calendarActions?.calendarMonthTitle?.call(this) || ''; },
    calendarDays() { return gm.calendarActions?.calendarDays?.call(this) || []; },
    realWorldAvailableMatters() { return []; },
    activeRealWorldMatter() { return null; },
    realWorldMatterText() { return '事项资料加载中'; },
    realWorldChoiceIcon() { return window.GameModules.ui.realWorld.panelViewHelpers.choiceIcon.call(this); },
    realWorldEntryIcon(entry = {}) { return window.GameModules.ui.realWorld.panelViewHelpers.entryIcon.call(this, entry); },
    realWorldStatusIcon(text = '') { return window.GameModules.ui.realWorld.panelViewHelpers.statusIcon.call(this, text); },
    realWorldMatterButtonText() { return window.GameModules.ui.realWorld.panelViewHelpers.matterButtonText.call(this); },
    async openRealWorldPanel() {
      this.realWorldOpen = true;
      const previous = this.openRealWorldPanel;
      await window.GameModules.assetLoader?.ensureChunks?.(['gameplay'], this);
      window.GameModules.remergeGameStore?.();
      if (this.openRealWorldPanel !== previous) return this.openRealWorldPanel();
      return undefined;
    },
    closeRealWorldPanel() {
      this.realWorldOpen = false;
      this.realWorldFunctionOpen = false;
    },
    async openRealWorldFunctionPanel(view = 'menu') {
      this.realWorldFunctionView = view;
      this.realWorldFunctionOpen = true;
      if (['inventory', 'wearing', 'map', 'generation'].includes(view)) {
        const previous = this.openRealWorldFunctionPanel;
        await window.GameModules.assetLoader?.ensureChunks?.(['gameplay'], this);
        window.GameModules.remergeGameStore?.();
        if (this.openRealWorldFunctionPanel !== previous) return this.openRealWorldFunctionPanel(view);
        if (view === 'map') {
          this.ensureRealWorldMapNativeInput?.();
          this.fitRealWorldMapView?.();
        }
      }
      return undefined;
    },
    closeRealWorldFunctionPanel() {
      this.realWorldFunctionOpen = false;
      this.realWorldFunctionView = 'menu';
    },
    openPhoneFromRealWorld() {
      this.realWorldFunctionOpen = false;
      this.realWorldOpen = false;
      this.schedulePhoneWarmup?.();
    },
    realWorldFunctionEyebrow() { return window.GameModules.ui.realWorld.panelViewHelpers.functionEyebrow.call(this); },
    realWorldFunctionTitle() { return window.GameModules.ui.realWorld.panelViewHelpers.functionTitle.call(this); },
    realWorldFunctionHint() { return window.GameModules.ui.realWorld.panelViewHelpers.functionHint.call(this); },
    realWorldMapRows() { return []; },
    realWorldDisplayLog(log = this.realWorldLog || []) { return window.GameModules.ui.realWorld.logViewHelpers.displayLog.call(this, log); },
    realWorldMapStageStyle() { return ''; },
    realWorldMapHasGraphNodes() { return false; },
    realWorldMapJsonDump: '',
    realWorldMapJsonDumpText() { return ''; },
    refreshRealWorldMapJsonDump() { return ''; },
    renderRealWorldMapGraph() {},
    ensureRealWorldMapNativeInput() {},
    realWorldMapWheel() {},
    realWorldMapPanStart() {},
    realWorldMapPanMove() {},
    realWorldMapPanEnd() {},
    async realWorldMapZoomBy(...args) {
      const previous = this.realWorldMapZoomBy;
      await window.GameModules.assetLoader?.ensureChunks?.(['gameplay'], this);
      window.GameModules.remergeGameStore?.();
      if (this.realWorldMapZoomBy !== previous) return this.realWorldMapZoomBy(...args);
      return undefined;
    },
    resetRealWorldMapView() {},
    realWorldMapInteriorNode() { return null; },
    realWorldMapInteriorTitle() { return ''; },
    realWorldMapInteriorSummary() { return ''; },
    realWorldMapInteriorView() { return 'tree'; },
    realWorldMapInteriorFloors() { return []; },
    async openRealWorldMapInteriorFloor(...args) {
      const previous = this.openRealWorldMapInteriorFloor;
      await window.GameModules.assetLoader?.ensureChunks?.(['gameplay'], this);
      window.GameModules.remergeGameStore?.();
      if (this.openRealWorldMapInteriorFloor !== previous) return this.openRealWorldMapInteriorFloor(...args);
      return undefined;
    },
    async openRealWorldMapInfoInterior(...args) {
      const previous = this.openRealWorldMapInfoInterior;
      await window.GameModules.assetLoader?.ensureChunks?.(['gameplay'], this);
      window.GameModules.remergeGameStore?.();
      if (this.openRealWorldMapInfoInterior !== previous) return this.openRealWorldMapInfoInterior(...args);
      return undefined;
    },
    closeRealWorldMapInterior() {},
    openRealWorldMapRoom() {},
    backRealWorldMapInteriorTree() {},
    backRealWorldMapInteriorFloor() {},
    realWorldMapSelectedFloor() { return null; },
    renderRealWorldMapRoomCanvas() {},
    realWorldMapRoomLayoutClick() {},
    clearRealWorldMapRoomArea() {},
    realWorldMapRoomTitle(room = {}) { return room?.number || room?.name || ''; },
    realWorldMapRoomResidentsLabel() { return ''; },
    realWorldMapSelectedRoomResidentsLine() { return ''; },
    realWorldMapSelectedRoomObjectsLine() { return ''; },
    realWorldMapSelectedRoomAreaTitle() { return ''; },
    realWorldMapSelectedRoomObjectTitle() { return ''; },
    realWorldMapSelectedRoomObjectLine() { return ''; },
    realWorldMapInfoNode() { return null; },
    realWorldMapInfoFacts() { return []; },
    realWorldMapFactText() { return ''; },
    realWorldMapInfoControlLine() { return ''; },
    closeRealWorldMapInfo() {},
    realWorldLogMaxPage() {
      const total = Math.max(0, Number(this.realWorldLogTotal || this.realWorldLog?.length || 0));
      const size = Math.max(1, Number(this.realWorldLogPageSize || 12));
      return Math.max(1, Math.ceil(total / size));
    },
    realWorldLogPageLabel() { return window.GameModules.ui.realWorld.logViewHelpers.logPageLabel.call(this); },
    changeRealWorldLogPage(step = 0) {
      const next = Number(this.realWorldLogPage || 1) + Number(step || 0);
      this.realWorldLogPage = Math.min(this.realWorldLogMaxPage(), Math.max(1, next));
    },
    realWorldChoicesWithMatters() { return window.GameModules.ui.realWorld.panelViewHelpers.choicesWithMatters.call(this); },
    taobaoWalletRows() { return gm.taobaoActions?.taobaoWalletRows?.call(this) || []; },
    taobaoFilterLabel(slot = this.taobaoState?.filterSlot) { return gm.taobaoActions?.taobaoFilterLabel?.call(this, slot) || slot || '全部'; },
    taobaoWearFilters() { return gm.taobaoActions?.taobaoWearFilters?.call(this) || [{ slot: '', label: '全部' }]; },
    currentCompany() {
      return {
        name: '暂无在职公司',
        organization: [],
        salary: { base: 0, performanceRate: 0, performanceMonths: 0 },
      };
    },
    workStatusText() {
      return this.companyState?.employment?.active === false ? '当前未处于在职状态。' : '公司资料加载中';
    },
    currentWorkAttendance() {
      return { className: 'idle', status: '未记录', detail: '上班状态尚未加载。', canCheckIn: false };
    },
    companyFields() { return []; },
    companyOrganization() { return []; },
    monthlyPayPreview() {
      return { base: 0, rate: 0, performanceMonths: 0, workDays: 0, daily: 0, annualPerformance: 0, total: 0 };
    },
    selectedFaction() { return null; },
    factionParentName() { return '无势力归属'; },
    factionChildren() { return []; },
    factionArchiveDocs() { return []; },
    selectedFactionArchiveDoc() { return null; },
    factionArchiveDocMeta() { return ''; },
    factionArchiveParagraphTime() { return ''; },
    factionStructureCards() { return []; },
    factionTerritoryEntries() { return []; },
    selectedFactionResolutionBadge() {
      const faction = this.selectedFaction?.();
      return faction?.resolutionBadge || window.GameModules.orgTerritory?.resolutionBadge?.(faction?.resolution) || '';
    },
    selectedFactionStatusLabel() {
      const faction = this.selectedFaction?.();
      if (!faction) return '';
      return window.GameModules.orgTerritory?.orgStatusLabel?.(faction) || '';
    },
    factionOverviewModeMeta(faction = null) {
      const current = faction || this.selectedFaction?.() || {};
      const ot = window.GameModules.orgTerritory;
      const structuralCountry = current?.sovereign === true
        || String(current?.orgDomain || '').trim() === 'country'
        || String(current?.type || '').trim() === '国家'
        || String(current?.level || '').includes('国家');
      const classification = ot?.deriveClassification?.(current)
        || ot?.normalizeClassification?.(current?.classification)
        || (structuralCountry ? 'country' : String(current?.maturityClass || '').trim())
        || 'community';
      const ideologyCore = String(current?.solid?.overviewPanels?.ideology?.core?.value || '').trim();
      const gestalt = String(current?.type || '').includes('格式塔意识') || ideologyCore === '格式塔意识';
      if (gestalt) {
        return {
          eyebrow: 'GESTALT PROFILE',
          labels: { ideology: '格式塔意识', economy: '资源', politics: '统一个体', military: '军事', diplomacy: '外交' },
          ideologyLabels: { core: '核心', reason: '形成原因', description: '当前说明', base: '意识基底', legitimacy: '统一度' },
          empty: { ideology: '尚未记录统一意识说明', economy: '尚未记录资源事实', politics: '尚未记录统一个体事实', military: '尚未记录军事事实', diplomacy: '尚未记录外交事实' },
          hideMilitaryWhenEmpty: false,
        };
      }
      if (classification === 'country') {
        return {
          eyebrow: 'COUNTRY PROFILE',
          labels: { ideology: '国体', economy: '经济', politics: '政治', military: '军事', diplomacy: '外交' },
          ideologyLabels: { core: '国体核心', reason: '形成原因', description: '当前说明', base: '法理基础', legitimacy: '合法性' },
          empty: { ideology: '国家事实尚未展开', economy: '经济事实尚未展开', politics: '政治事实尚未展开', military: '军事事实尚未展开', diplomacy: '外交事实尚未展开' },
          hideMilitaryWhenEmpty: false,
        };
      }
      if (classification === 'claim') {
        return {
          eyebrow: 'CLAIM PROFILE',
          labels: { ideology: '宣称基础', economy: '可用资源', politics: '组织化程度', military: '武力宣称', diplomacy: '外部回应' },
          ideologyLabels: { core: '宣称核心', reason: '宣称原因', description: '当前说明', base: '参与基础', legitimacy: '可信度' },
          empty: { ideology: '尚未记录宣称基础', economy: '尚未记录可用资源', politics: '尚未记录组织化事实', military: '尚未记录武力事实', diplomacy: '尚未记录外部回应' },
          hideMilitaryWhenEmpty: true,
        };
      }
      if (classification === 'community') {
        return {
          eyebrow: 'COMMUNITY PROFILE',
          labels: { ideology: '凝聚原因', economy: '可用资源', politics: '管理', military: '军事', diplomacy: '联谊' },
          ideologyLabels: { core: '核心', reason: '形成原因', description: '当前说明', base: '参与基础', legitimacy: '凝聚力' },
          empty: { ideology: '尚未记录凝聚原因', economy: '尚未记录可用资源', politics: '默认按沟通协同处理', military: '社群态默认隐藏军事面板', diplomacy: '尚未记录联谊关系' },
          hideMilitaryWhenEmpty: true,
        };
      }
      return {
        eyebrow: 'CORE PROFILE',
        labels: { ideology: '意识形态', economy: '经济', politics: '政治', military: '军事', diplomacy: '外交' },
        ideologyLabels: { core: '核心', reason: '原因', description: '说明', base: '基础', legitimacy: '合法性' },
        empty: { ideology: '尚未记录意识形态事实', economy: '尚未记录经济事实', politics: '尚未记录政治事实', military: '尚未记录军事事实', diplomacy: '尚未记录外交事实' },
        hideMilitaryWhenEmpty: false,
      };
    },
    factionOverviewFieldLabel(panelKey = '', fieldKey = '', faction = null) {
      const meta = this.factionOverviewModeMeta(faction);
      if (panelKey === 'ideology') return meta.ideologyLabels?.[fieldKey] || fieldKey;
      return fieldKey;
    },
    factionOverviewEntryValue(entry = {}) {
      const raw = entry?.value;
      if (typeof raw === 'number') return `${raw}${entry?.unit || ''}`;
      const text = String(raw ?? '').trim();
      return `${text}${entry?.unit || ''}`.trim();
    },
    factionOverviewPanelSkin(panelKey = '') {
      const map = {
        ideology: { icon: '🜁', tone: 'gold', entryIcons: { core: '⚑', reason: '✦', description: '☷', base: '⬡', legitimacy: '♛' } },
        economy: { icon: '◇', tone: 'green', entryIcons: {} },
        politics: { icon: '⚖', tone: 'blue', entryIcons: {} },
        military: { icon: '⚔', tone: 'red', entryIcons: {} },
        diplomacy: { icon: '✉', tone: 'cyan', entryIcons: {} },
      };
      return map[panelKey] || { icon: '◆', tone: 'blue', entryIcons: {} };
    },
    factionOverviewPanelMeter(panelKey = '', entries = [], faction = null) {
      if (panelKey === 'ideology') {
        const value = Number(faction?.solid?.overviewPanels?.ideology?.legitimacy?.value);
        if (Number.isFinite(value)) return Math.max(0, Math.min(100, value));
      }
      return Math.max(0, Math.min(100, entries.length * 28));
    },
    factionOverviewRankLabel(meter = 0, count = 0) {
      if (!count) return '迷雾未展开';
      if (meter >= 75) return '核心态势稳固';
      if (meter >= 45) return '已形成可观测态势';
      return '初步确立';
    },
    factionOverviewEffectiveCount(panelKey = '', entries = []) {
      if (panelKey !== 'ideology') return entries.length;
      return entries.filter((entry) => String(entry?.name || '') !== 'legitimacy' && entry?.filled).length;
    },
    selectedFactionOverviewSummary() {
      const faction = this.selectedFaction?.();
      if (!faction) return '';
      const summary = window.GameModules.orgTerritory?.overviewSummary?.(faction, 3) || '';
      if (summary) return summary;
      return faction.stub?.oneLine || faction.description || '尚未推演出稳定的宏观总览事实。';
    },
    factionCapabilityCards() {
      const faction = this.selectedFaction?.();
      const ot = window.GameModules.orgTerritory;
      const panels = ot?.normalizeOverviewPanels?.(faction?.solid?.overviewPanels || {})
        || ot?.defaultOverviewPanels?.()
        || { ideology: {}, economy: { entries: {} }, politics: { entries: {} }, military: { entries: {} }, diplomacy: { entries: {} } };
      const meta = this.factionOverviewModeMeta(faction);
      return ['ideology', 'economy', 'politics', 'military', 'diplomacy'].map((panelKey) => {
        const skin = this.factionOverviewPanelSkin(panelKey);
        if (panelKey === 'ideology') {
          const ideology = panels.ideology || {};
          const entries = ['core', 'reason', 'description', 'base', 'legitimacy'].map((fieldKey) => {
            const field = ideology[fieldKey] || {};
            const value = field?.value;
            const hasValue = typeof value === 'number'
              ? Number.isFinite(value)
              : Boolean(String(value ?? '').trim());
            const display = hasValue
              ? this.factionOverviewEntryValue(field)
              : (fieldKey === 'legitimacy' ? '0/100' : '待推演补全');
            return {
              key: `ideology-${fieldKey}`,
              name: fieldKey,
              label: this.factionOverviewFieldLabel('ideology', fieldKey, faction),
              icon: skin.entryIcons[fieldKey] || skin.icon,
              display,
              reason: String(field?.reason || '').trim(),
              stateBadge: hasValue ? '已记录' : '待填',
              filled: hasValue,
            };
          });
          const meter = this.factionOverviewPanelMeter(panelKey, entries, faction);
          const effectiveCount = this.factionOverviewEffectiveCount(panelKey, entries);
          const filledCount = entries.filter((entry) => entry.filled).length;
          return { key: 'cap-ideology', dim: 'ideology', label: meta.labels.ideology, eyebrow: meta.eyebrow, emptyText: meta.empty.ideology, icon: skin.icon, tone: skin.tone, meter, meterStyle: `--meter:${meter};`, rankLabel: this.factionOverviewRankLabel(meter, effectiveCount), statusLabel: `${filledCount}/5项`, entries };
        }
        const entries = Object.entries(panels[panelKey]?.entries || {}).map(([key, entry]) => ({
          ...(entry && typeof entry === 'object' ? entry : { value: entry }),
          key: `${panelKey}-${key}`,
          name: key,
          label: this.factionOverviewFieldLabel(panelKey, key, faction),
          icon: skin.entryIcons[key] || skin.icon,
          display: this.factionOverviewEntryValue(entry && typeof entry === 'object' ? entry : { value: entry }),
          reason: String(entry?.reason || '').trim(),
          stateBadge: entry?.state ? (ot?.stateBadge?.(entry.state) || '') : '',
        }));
        const meter = this.factionOverviewPanelMeter(panelKey, entries, faction);
        const effectiveCount = this.factionOverviewEffectiveCount(panelKey, entries);
        return { key: `cap-${panelKey}`, dim: panelKey, label: meta.labels[panelKey] || panelKey, eyebrow: meta.eyebrow, emptyText: meta.empty[panelKey] || '尚未记录', icon: skin.icon, tone: skin.tone, meter, meterStyle: `--meter:${meter};`, rankLabel: this.factionOverviewRankLabel(meter, effectiveCount), statusLabel: `${entries.length}项`, entries };
      }).filter((card) => !(card.dim === 'military' && meta.hideMilitaryWhenEmpty && !card.entries.length));
    },
    selectedFactionStubNotice() {
      const faction = this.selectedFaction?.();
      if (!faction) return '';
      const resolution = String(faction.resolution || 'L1').toUpperCase();
      if (resolution === 'L1' && !(faction.structure || []).length) return '尚未接触，无法审计结构；仅显示 stub。';
      return '';
    },
    forestDomainTabs() {
      const forest = window.GameModules.factionOrgForest;
      return forest?.DOMAIN_KEYS?.map((key) => ({ key, label: forest.DOMAIN_LABELS?.[key] || key }))
        || [
          { key: 'gov', label: '国家机构' },
          { key: 'geo', label: '行政区划' },
          { key: 'corp', label: '经济组织' },
          { key: 'community', label: '社群' },
        ];
    },
    factionOrgChartMode() { return this.factionState?.orgChartMode || 'forest'; },
    setFactionOrgChartMode(mode = 'forest') {
      this.factionState = this.factionState || {};
      this.factionState.orgChartMode = mode === 'detail' ? 'detail' : 'forest';
    },
    setFactionForestTab(domain = 'corp') {
      this.factionState = this.factionState || {};
      this.factionState.forestTab = domain || 'corp';
    },
    factionForestTab() { return this.factionState?.forestTab || 'corp'; },
    factionForestViewportTitle() {
      return this.factionState?.forestData?.viewportRoot?.name || this.selectedFaction?.()?.name || '';
    },
    factionOrgTreeRows() { return []; },
    skillCategories() { return gm.skillsActions?.skillCategories?.call(this) || []; },
    skillsList() { return gm.skillsActions?.skillsList?.call(this) || []; },
    selectedSkill() { return gm.skillsActions?.selectedSkill?.call(this) || null; },
    setSkillsQuery(value = '') { return gm.skillsActions?.setSkillsQuery?.call(this, value); },
    selectSkillCategory(value = '') { return gm.skillsActions?.selectSkillCategory?.call(this, value); },
    skillsPanelView() {
      return gm.skillsActions?.skillsPanelView?.call(this) || {
        open: !!this.skillsState?.open,
        query: this.skillsState?.query || '',
        category: this.skillsState?.category || '',
        categories: this.skillCategories(),
        items: this.skillsList(),
        empty: !this.skillsList().length,
        detailOpen: !!this.skillsState?.detailOpen,
        selected: this.selectedSkill(),
      };
    },
    selectedSkillDetailView() {
      return gm.skillsActions?.selectedSkillDetailView?.call(this) || {
        detailOpen: !!this.skillsState?.detailOpen,
        item: this.selectedSkill(),
      };
    },
    promptCategoryLabel() { return gm.promptActions?.promptCategoryLabel?.call(this) || '全部分类'; },
    setPromptQuery(value = '') { return gm.promptActions?.setPromptQuery?.call(this, value); },
    promptCategories() { return gm.promptActions?.promptCategories?.call(this) || []; },
    promptList() { return gm.promptActions?.promptList?.call(this) || []; },
    currentPromptItem() { return gm.promptActions?.currentPromptItem?.call(this) || null; },
    promptPanelView() {
      return gm.promptActions?.promptPanelView?.call(this) || {
        open: !!this.promptState?.open,
        query: this.promptState?.query || '',
        category: this.promptState?.category || '',
        categoryLabel: this.promptCategoryLabel(),
        categories: this.promptCategories(),
        items: this.promptList(),
        empty: !this.promptList().length,
        error: this.promptState?.error || '',
        selectedId: this.promptState?.selectedId || '',
      };
    },
    promptDetailView() {
      return gm.promptActions?.promptDetailView?.call(this) || {
        open: !!this.promptState?.selectedId,
        item: this.currentPromptItem(),
        text: this.promptState?.selectedText || '',
        loading: !!this.promptState?.loading,
        error: this.promptState?.error || '',
      };
    },
    wechatAvatarCropImageStyle() { return ''; },
    phoneDateText() { return ''; },
    phoneTimeText() { return ''; },
    realWorldWordCountValue() {
      return Math.floor(Number(this.realWorldWordCount) || 0);
    },
    realWorldWordCountValid() {
      return this.realWorldFreedomMode !== 'words' || this.realWorldWordCountValue() >= 200;
    },
  };
  const modules = [
    criticalActionFallback, gm.actions, gm.rpgFieldUi, gm.resultActions, gm.loadingActions, gm.roleCardLoadingActions, gm.solidifyActions, gm.wearingSyncActions, gm.saveActions, gm.styleActions,
    gm.worldlineActions, gm.domain?.worldline?.stateService, gm.predefinedRoleCardActions, gm.homeActions, gm.playerSetupActions, gm.playerAspirationActions, gm.playerIdentityActions, gm.rpgActions, gm.identityMemoryActions, gm.identityAppActions, gm.memoryQueryActions,     gm.wechatActions, gm.wechatFriendRequestActions, gm.wechatViewActions, gm.wechatMemoryContextActions, gm.wechatChatActions, gm.wechatIncomingActions, gm.wechatImageActions, gm.wechatMentionActions, gm.wechatWorldlineActions, gm.wechatMemoryDebugActions, gm.wechatAppActions, gm.wechatAlbumTagActions, gm.wechatAlbumPromptListActions, gm.wechatAvatarCropActions, gm.wechatAlbumActions, gm.wechatChangePanelActions, gm.controlEntryActions, gm.entryActions, gm.realWorldClockActions,
    gm.catalogActions, gm.coreActions, gm.controlState, gm.controlLinkActions, gm.appSwitchActions, gm.currentWorldActions, gm.inventoryActions, gm.inventoryEquipActions, gm.itemSkillActions, gm.realWorldStreamActions, gm.realWorldThinkingActions, gm.realWorldSettlementActions, gm.realWorldUtilityActions, gm.realWorldActions, gm.realWorldLongingActions, gm.realWorldSocialInboxActions, gm.newsDriverActions, gm.realWorldMapActions, gm.realWorldFactionActions, gm.realWorldMatterActions, gm.companyActions, gm.companyAttendanceActions, gm.companyFactionActions,
    gm.bossActions, gm.bossAppointmentActions, gm.bossAiActions, gm.calendarActions, gm.eventActions, gm.factionActions, gm.factionArchiveActions, gm.factionOrgActions, gm.factionAiActions, gm.factionMembershipActions, gm.skillsActions, gm.knownProfessionActions, gm.characterRosterActions, gm.taobaoActions, gm.taobaoGenerateActions, gm.taobaoBuyActions, gm.promptActions, gm.controlExperienceConfigApp, gm.settingsActions, gm.systemTestActions, gm.tokenStatsActions, gm.uiThemeActions, gm.roleCardJsonApp?.actions,
    {
      async openWechatApp(...args) {
        await window.GameModules.assetLoader?.ensureChunks?.(['wechat'], this);
        const fn = window.GameModules.app?.wechat?.appOrchestration?.openWechatApp;
        if (typeof fn === 'function') return fn.call(this, ...args);
        this.closeDesktopApps?.();
        this.wechatAppOpen = true;
        this.desktopUnlocked = true;
        return undefined;
      },
      closeWechatApp() {
        const fn = window.GameModules.app?.wechat?.appOrchestration?.closeWechatApp;
        if (typeof fn === 'function') return fn.call(this);
        return this.closeAppToDesktop?.();
      },
      async openWechatIdentity(...args) {
        const fn = window.GameModules.app?.wechat?.appOrchestration?.openWechatIdentity;
        if (typeof fn === 'function') return fn.call(this, ...args);
        return this.openIdentityApp?.('player-self', 'wechat');
      },
      parentFallbackLabel(kind = '') {
        if (kind === 'independent') return '独立组织';
        if (kind === 'unknown') return '未知势力';
        return '无势力归属';
      },
    },
  ].map((module) => module || {});

  Alpine.store('game', {
    loading: true, loadingStep: '等待平台连接',
    homeScreenView: 'menu', homeMessage: '', homeSavePanelOpen: false,
    homeLoadActive: false, homeLoadPercent: 0, homeLoadLabel: '', homeLoadSlot: '',
    phoneDesktopBooting: false,
    playerAspiration: null,
    aspirationSetupOpen: false, aspirationStep: 1, aspirationPsychStep: 1,
    aspirationBusy: false, aspirationPsychLoading: false, aspirationError: '',
    aspirationDraft: null, aspirationGoalDraft: { short: '', medium: '', long: '', summary: '' },
    aspirationSummaryDraft: { portrait: '' }, aspirationPsychCustomDraft: {},
    loadingDetail: '首次进入或存档较大时会更慢，这是正常现象。',
    loadingStages: [], entryStages: [], loadingStartedAt: 0, loadingNow: Date.now(), loadingTimer: null,
    roleCardLoadingState: { open: false, expanded: true, cards: [], startedAt: 0 }, roleCardLoadingRetryQueue: {}, currentLocationFillState: { open: false, status: 'idle', percent: 0, step: '', detail: '', currentLocation: '', error: '', startedAt: 0, finishedAt: 0 }, solidifyState: { open: false, candidates: [], selectedKey: '' },
    busy: false, started: false, desktopUnlocked: false, desktopPage: 0, desktopSwipeStart: null, controlSelectOpen: false, controlLinkMenuId: '', sharedControlTargetId: '', sharedControlActive: false, entrySetupOpen: false, entryIdentityOpen: false, identityAppOpen: false, identityReturnTo: '', wechatAppOpen: false, saveAppOpen: false, roleCardJsonAppOpen: false, identityTargetId: 'player-self', wechatSelectedContact: 'player-self', wechatTab: 'chats', wechatView: 'home', wechatAlbumMode: 'profile', wechatAlbumPromptOpen: false, wechatAlbumPromptStep: 'choice', wechatAlbumPromptDraft: null, wechatAlbumPromptError: '', wechatAlbumBodyFigureContext: null, wechatAlbumGenerating: false, wechatAlbumRequestId: 0, wechatAlbumDeleteConfirm: { open: false, index: -1 }, wechatAlbumPhotos: {}, wechatInput: '', wechatSending: false, wechatError: '', wechatReplyRequestId: 0, wechatMessagesByContact: {}, wechatUsers: [], wechatFriendRequests: [], wechatAddName: '', wechatAddRelation: '',
    initPromise: null, startupWarmupPromise: null, startupWarmupDone: false, phoneSetupDone: false, phoneActivationChoice: '', profileSetupBusy: false, setupError: '', phoneFixedTime: 0, phoneClockStamp: 0, phoneClockLabelShort: '--:--', phoneClockLabelFull: '--:--:--', phoneClockTimer: null, existingProfileExpanded: false,
    roleCardSetup: { loaded: false, usePredefinedPlayerCard: false, cards: [], selectedPlayerId: '', selectedPlayerName: '', selectedCardIds: [], selectedCardId: '', detailOpen: false, cardDetailOpen: '' },
    knownProfessionState: { open: false, query: '', message: '', selectedName: '', detailOpen: false },
    characterRosterState: { open: false, query: '', message: '', selectedKey: '', suppressSelectUntil: 0, tab: 'role' },
    taobaoState: { open: false, slots: [], selectedId: '', generatingId: '', buyingId: '', requestId: 0, message: '', error: '', walletOpen: false, searchText: '', filterSlot: '' },
    settingsState: {
      open: false,
      loading: false,
      loaded: false,
      error: '',
      textProvider: cfg.textProviders?.defaultProvider || 'dzmm',
      drawProvider: cfg.drawProviders?.defaultProvider || 'pixai',
      drawProviderExplicit: false,
      textModels: [],
      drawModels: [],
      textModelId: cfg.defaultModelId,
      deepseekApiKey: '',
      deepseekBaseUrl: cfg.textProviders?.deepseek?.baseUrl || 'https://api.deepseek.com',
      deepseekModel: cfg.textProviders?.deepseek?.defaultModel || 'deepseek-v4-flash',
      drawModelId: 'anime',
      pixaiApiKey: '',
      pixaiBaseUrl: cfg.drawProviders?.pixai?.baseUrl || 'https://api.pixai.art',
      pixaiModelVersionId: cfg.drawProviders?.pixai?.defaultModel || '',
      pixaiMode: cfg.drawProviders?.pixai?.defaultMode || 'standard',
      stage1MaterialIterationLimited: false,
      stage1MaterialMaxIterations: 2,
      modelTestLoading: false,
      modelTestOk: null,
      modelTestMessage: '',
      uiThemeId: 'dark',
      uiThemeCustomColor: '#7fe5ff',
    },
    controlExperienceConfigState: gm.controlExperienceConfigApp?.defaultState?.() || { open: false, enabled: true, masterPrompt: '', message: '', error: '', previewItems: [] },
    systemTestState: { open: false, loading: false, thinkingLoading: false, platformChatLoading: false, systemText: '你是一个测试助手。无论用户输入什么，只回答：SYSTEM_OK。', userText: '请测试 system role 是否生效。', thinkingPrompt: '请用简洁中文回答：为什么晴天适合散步？列出三点理由即可。', result: '', error: '', thinkingError: '', thinkingResults: [], platformChatPayload: '', platformChatRaw: '', platformChatError: '' },
    playerProfile: { name: '', gender: '', birthday: '', age: '', city: '', refinedCity: '', dailyRole: '', refinedRole: '', livingStatus: '', refinedLivingStatus: '', wealthTier: '中产', wealthAmount: 500000, wealthSource: '', wealthBreakdown: null, wealthFixedIncome: '', relationships: '', relationshipEntries: [], parents: '', parentStatus: '', parentDeathCause: '', appearance: '', preferences: '', personality: '', worldbuildingNote: '', notes: '', knownProfessions: [], wechatId: '', profileEnrichedAt: '', initializedAt: '' }, playerName: '',
    playerProfileTraitDefaultsApplied: false,
    selectedSlot: 'slot-1', saveSlots: window.GameModules.storage.slots,
    savePanelOpen: false, functionPanelOpen: false, worldlineAppOpen: false,
    libraryTab: 'worlds', worldlineAppTab: 'control', realWorldlineSubTab: 'recording', expandedWorldlineTag: '', worldlineDebugSection: '世界线APP主面板', selectedRealWorldPlotId: '',
    activeStyleIds: ['spring-heart'], customWritingStyles: [], customStyleName: '', customStylePrompt: '',
    saveMessage: '',
    saveMetas: {},
    roleCardJsonText: '',
    roleCardJsonMeta: { slot: '', count: 0, exportedAt: '' },
    roleCardJsonError: '',
    modelId: cfg.defaultModelId,
    characters: cfg.characters,
    works: [],
    selectedWork: '',
    selectedCharacterId: cfg.characters[0].id,
    workMenuOpen: false,
    characterMenuOpen: false,
    characterProfiles: {},
    homeCharacterProfiles: {},
    characterDetailOpen: false,
    characterBriefBusy: false,
    entryCalendar: null, characterAge: '',
    entryTime: { year: '', month: '', day: '', hour: '', minute: '', second: '' },
    entryTimeOptions: { years: [], months: [], days: [], hours: [], minutes: [], seconds: [], start: null },
    entryCurrentAction: '', entryAdvanceInput: '10', controlMode: 'possess',
    stats: cfg.stats,
    online: true,
    input: '',
    lastAction: '',
    turn: 1,
    sceneTitle: '裂隙前厅',
    mood: '冷静',
    trust: 45,
    resistance: 20,
    emotions: window.GameModules.metrics.fresh().emotions,
    playerFeelings: window.GameModules.metrics.fresh().playerFeelings,
    temporaryEmotions: {},
    temporaryPlayerFeelings: {},
    metricsReady: false,
    metricNotes: {},
    metricSummaryLimit: 3,
    metricSummaryObserver: null,
    expandedMetricKey: '',
    expandedRpgFieldKey: '',
    abilityDetailPanel: null,
    quest: '确认操控连接', thinkingMode: true,
    mindText: '', feedbackSource: 'pending',
    characterIntent: '',
    choices: cfg.openingChoices,
    log: [], realWorldOpen: false, realWorldBusy: false, realWorldInput: '', realWorldThinkMode: false, realWorldFreedomMode: 'scope', realWorldWordCount: 1000, realWorldFunctionOpen: false, realWorldFunctionView: 'menu', realWorldMatterState: { open: false, activeId: '' }, realWorldSceneTitle: '现实世界', realWorldLocationName: '', realWorldMap: defaultRealWorldMapState, locationGraph: null, realWorldQuest: '确认手机异常与现实处境', realWorldStatus: '现实稳定', realWorldChoices: ['检查手机记录', '观察居住环境', '联系熟人确认', '暂时休息'], realWorldLog: [], realWorldLogPage: 1, realWorldLogPageSize: 12, realWorldLogTotal: 0, realWorldLongingEvents: [], realWorldLongingPreparedIds: [], socialInbox: [], socialInboxPreparedIds: [], newsDriverState: defaultNewsDriverState, realWorldlineState: { events: [], plots: [], pendingPlot: null }, realWorldProfileOpen: false, companyState: defaultCompanyState, bossState: defaultBossState, calendarState: defaultCalendarState, eventState: defaultEventState, factionState: defaultFactionState, skillsState: gm.skillsApp?.defaultState?.() || {}, promptState: gm.promptTemplates?.defaultState?.() || {}, tokenStatsState: gm.tokenStats?.defaultState?.() || {},
    nextId: 1,
    ragQuery: '',
    ragContext: '',
    memoryContext: '',
    ragResults: [],
    ragBusy: false,
    ragError: '',
    rpgStates: {},
    rpgPanelCharacterId: '',
    rpgPrepareToken: 0,
    rpgPreparePromise: null,
    rpgPrepareCharacterId: '',
    profileViewMode: 'profile', profileMenuOpen: false, memoryInput: '', memoryArchiveQuery: '', memoryArchiveResults: [],
    realWorldProfileViewMode: 'profile', realWorldProfileMenuOpen: false, realWorldMemoryInput: '', realWorldMemoryArchiveQuery: '', realWorldMemoryArchiveResults: [], realWorldMemoryShortTab: 'recent', realWorldMemoryLongTab: 'vivid',
    identityMemoryViewMode: 'shortTerm', identityMemoryShortTab: 'recent', identityMemoryLongTab: 'vivid', identityMemoryArchiveQuery: '', identityMemoryArchiveResults: [],
    profileOpen: false, metricsOpen: false, identityMetricsOpen: false, feedbackOpen: false,
    promptDialogOpen: false, promptDialogEntry: null, promptDialogTab: 'system',
    wechatAlbumPrompts: {}, wechatAlbumPromptSelectedId: '', wechatAlbumPromptEditText: '', wechatAlbumPromptEditNegative: '', wechatAvatarCropOpen: false, wechatAvatarCropPhotoIndex: 0, wechatAvatarCropState: { url: '', x: 24, y: 4, scale: 1.92, ratio: 1.5 }, wechatImageConfirmOpen: false, wechatImageConfirmMessage: null, wechatImageGenerating: false, wechatImageRequestId: 0, wechatImagePreview: { open: false, url: '', title: '' }, wechatMentionPanelOpen: false,
    sectionHintsEnabled: cfg.sectionHintsEnabled,

    get character() {
      const list = Array.isArray(this.characters) ? this.characters : [];
      if (this.selectedCharacterId === 'player-self') return this.playerDisplayCharacter?.() || this.playerCharacterBase?.() || { id: 'player-self', name: this.playerName || 'player-self', work: this.selectedWork || '2026 现代都市现实世界', role: '玩家本人', isPlayer: true };
      const catalogCharacter = window.GameModules.catalog?.find?.(this.selectedCharacterId);
      if (catalogCharacter) return catalogCharacter;
      const fallbackCharacter = list.find((c) => c.id === this.selectedCharacterId) || list[0] || {};
      return fallbackCharacter?.id && !fallbackCharacter.work
        ? { ...fallbackCharacter, work: '原创世界' }
        : fallbackCharacter;
    },

    get workCharacters() { return window.GameModules.catalog.characters(this.selectedWork); },

    get homeCharacterProfile() { return this.homeCharacterProfiles[this.character.id] || null; },

    get characterRpgState() { return this.rpgStates[this.character.id] || null; },
    get currentRpgState() { return this.characterRpgState; },
    get currentMemory() {
      const id = this.currentRpgState?.id;
      return id ? window.GameModules.characterMemory.ensure(id) : window.GameModules.characterMemory.normalize(null, 'none');
    },
    get savedWorldLores() { return window.GameModules.platform.storage.capabilities.isReady?.() ? window.GameModules.platform.storage.worldLoreSource.list?.() : []; },

    async initGame() {
      window.GameModules.metrics.ensure?.(this);
      this.loading = true;
      this.loadingDetail = this.loadingDetail || 'initializing game';
      this.rpgStates = this.rpgStates || {};
      this.characters = Array.isArray(this.characters) ? this.characters : [];
      this.wechatUsers = Array.isArray(this.wechatUsers) ? this.wechatUsers : [];
      this.log = Array.isArray(this.log) ? this.log : [];
      this.realWorldLog = Array.isArray(this.realWorldLog) ? this.realWorldLog : [];
      this.phoneDesktopBooting = false;
      if (this.refreshSaveMetas) await this.refreshSaveMetas();
      if (this.refreshPhoneClockLabels) this.refreshPhoneClockLabels();
      this.loading = false;
      return true;
    },

    memoryItems(scope = 'shortTerm') {
      const memory = this.currentMemory || {};
      const shortList = Array.isArray(memory.shortTerm) ? memory.shortTerm : (Array.isArray(memory.recent) ? memory.recent : []);
      const longList = Array.isArray(memory.longTerm) ? memory.longTerm : (Array.isArray(memory.summary) ? memory.summary : []);
      return scope === 'longTerm' ? longList : shortList;
    },

    async init() {
      if (this.initPromise) return this.initPromise;
      document.getElementById('boot-fallback')?.remove(); this.initPromise = (async () => {
        try {
          window.GameModules.characterStateStore?.bindLiveHost?.(this);
          window.GameModules.metrics.ensure(this);
          await this.initGame();
          this.startPhoneClock?.();
          this.refreshPhoneClockLabels?.();
          this.runDeferredInits?.();
        } catch (err) {
          console.error('游戏初始化失败:', err.message, err.stack);
          this.loadingDetail = `初始化失败：${err.message || '未知错误'}`;
          this.loading = false;
        }
      })();
      return this.initPromise;
    },


    async submitAction(action) {
      if (this.busy) return;
      if (this.isRealCurrentWorld?.()) return this.submitRealWorldAction?.(action);
      console.log('[回合流程] 玩家提交行动:', { turn: this.turn, action, online: this.online, character: this.character.name });
      this.busy = true;
      const logId = this.addNovelEntry(action);

      try {
        this.lastAction = action;
        this.ragContext = '';
        this.ragResults = [];
        this.memoryContext = '由分阶段 Loop Agent 按需动态载入。';
        await window.GameModules.ai.generate(this, action, logId);
      } finally {
        this.busy = false;
        this.turn += 1;
        await this.save();
        this.scrollLog();
      }
    },

    ...Object.assign({}, ...modules),
    refreshPhoneClockLabels() {
      const initialized = new Date(this.playerProfile?.initializedAt || Date.now()).getTime();
      const fallback = Number.isFinite(initialized) && initialized > 946684800000 ? initialized : Date.now();
      const current = Number(this.phoneFixedTime);
      const ms = Number.isFinite(current) && current > 946684800000 ? current : fallback;
      if (!Number.isFinite(current) || current <= 946684800000) this.phoneFixedTime = ms;
      const d = new Date(ms);
      const parts = [d.getHours(), d.getMinutes(), d.getSeconds()].map((x) => String(x).padStart(2, '0'));
      this.phoneClockLabelShort = `${parts[0]}:${parts[1]}`;
      this.phoneClockLabelFull = parts.join(':');
      this.phoneClockStamp = Date.now();
    },
    phoneTimeShortText() {
      void this.phoneClockStamp;
      return this.phoneClockLabelShort || '--:--';
    },
    phoneTimeDisplayText() {
      void this.phoneClockStamp;
      return this.phoneClockLabelFull || '--:--:--';
    },
    knownProfessions() { return gm.knownProfessionActions?.knownProfessions?.call(this) || []; },
    setKnownProfessionQuery(value = '') { return gm.knownProfessionActions?.setKnownProfessionQuery?.call(this, value); },
    selectedKnownProfession() { return gm.knownProfessionActions?.selectedKnownProfession?.call(this) || null; },
    knownProfessionPanelView() {
      return gm.knownProfessionActions?.knownProfessionPanelView?.call(this) || {
        open: !!this.knownProfessionState?.open,
        query: this.knownProfessionState?.query || '',
        message: this.knownProfessionState?.message || '',
        items: this.knownProfessions(),
        empty: !this.knownProfessions().length,
        detailOpen: !!this.knownProfessionState?.detailOpen,
        selected: this.selectedKnownProfession(),
      };
    },
    selectedKnownProfessionDetailView() {
      return gm.knownProfessionActions?.selectedKnownProfessionDetailView?.call(this) || {
        detailOpen: !!this.knownProfessionState?.detailOpen,
        item: this.selectedKnownProfession(),
        requirementText: this.professionRequirementText(this.selectedKnownProfession()),
      };
    },
    professionRequirementText(job) { return gm.knownProfessionActions?.professionRequirementText?.call(this, job) || ''; },
  });

  const startInit = () => Alpine.store('game')?.init?.();
  if (window.queueMicrotask) queueMicrotask(startInit);
  else setTimeout(startInit, 0);
}

document.addEventListener('alpine:init', registerGameStore); window.addEventListener('load', registerGameStore); setTimeout(registerGameStore, 0);

