try {
  window.parent?.postMessage?.('iframe:content-ready', '*');
} catch (err) {
  console.warn('平台就绪通知失败:', err.message);
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
  const defaultRealWorldMapState = gm.realWorldMap?.defaultState?.({}) || {
    nodes: [],
    selectedId: '',
    infoNodeId: '',
  };
  const criticalActionFallback = {
    metricGroups(state = null) {
      if (!state || state.id === this.character?.id) {
        window.GameModules.metrics.ensure(this);
        return [
          { title: '情绪', type: 'emotion', values: this.emotions, ready: this.metricsReady },
          { title: '感觉', type: 'player', values: this.playerFeelings, ready: this.metricsReady },
          { title: '临时情绪', type: 'emotion:temporary', values: this.temporaryEmotions || {}, ready: this.metricsReady },
          { title: '临时感觉', type: 'player:temporary', values: this.temporaryPlayerFeelings || {}, ready: this.metricsReady },
        ];
      }
      const metrics = this.ensureStateMetrics ? this.ensureStateMetrics(state) : (state.metrics || {});
      return [
        { title: '情绪', type: 'emotion', values: metrics.emotions || {}, ready: true },
        { title: '感觉', type: 'player', values: metrics.playerFeelings || {}, ready: true },
        { title: '临时情绪', type: 'emotion:temporary', values: metrics.temporaryEmotions || {}, ready: true },
        { title: '临时感觉', type: 'player:temporary', values: metrics.temporaryPlayerFeelings || {}, ready: true },
      ];
    },
    metricEntries(group = {}) { return Object.entries(group.values || {}).map(([key, value]) => ({ key, value, text: this.metricValueText ? this.metricValueText(value, group.ready) : value })); },
    metricValueText(value, ready = this.metricsReady) { return ready && Number.isFinite(Number(value)) ? value : '--'; },
    metricCollapsedItems() {
      window.GameModules.metrics.ensure(this);
      return window.GameModules.metrics.emotionKeys.map((key) => ({ key, value: this.emotions[key], text: this.metricValueText(this.emotions[key]) })).slice(0, Math.max(1, this.metricSummaryLimit || 3));
    },
    installMetricSummaryObserver() {},
    toggleMetric(type, key) { const id = `${type}:${key}`; this.expandedMetricKey = this.expandedMetricKey === id ? '' : id; },
    isMetricOpen(type, key) { return this.expandedMetricKey === `${type}:${key}`; },
    metricNote(type, key) { return window.GameModules.metrics?.descriptions?.[key] || key; },
    loreNames(list, key) { return (Array.isArray(list) ? list : []).map((item) => item?.[key] || '').filter(Boolean).join('、') || '无'; },
    async searchLore() {},
    refreshRagContext() {},
    addNovelEntry() { return 0; },
    promptDialogText() { const pack = this.promptDialogEntry?.promptPack || {}; return this.promptDialogTab === 'user' ? pack.userPrompt : pack.systemPrompt; },
    feedbackText() { return this.feedbackSource === 'ai' ? (this.mindText || '--') : '--'; },
    feedbackPlan() { return this.feedbackSource === 'ai' ? (this.characterIntent || '--') : '--'; },
    feedbackSourceText() { return this.feedbackSource === 'ai' ? 'AI生成' : '本地兜底'; },
    feedbackSummary() { const text = this.feedbackText(); return `【${this.feedbackSourceText()}】${text.length > 18 ? `${text.slice(0, 18)}…` : text} / ${this.feedbackPlan()}`; },
    novelLogEntries() { return (this.log || []).filter((entry) => entry.kind === 'novel'); },
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
    wechatAlbumKindLabel(kind = '') { return kind === 'dressed' ? '盛装状态' : kind === 'custom' ? '自定义状态' : '自然状态'; },
    wechatAlbumSelectedPrompt() { return null; },
    wechatAlbumPromptListPreview() { return ''; },
    wechatAvatarText(contact = {}) { return String(contact?.name || contact?.mark || '联').trim().slice(0, 1) || '联'; },
    wechatAvatarStyle() { return ''; },
    wechatHasChangeReasons() { return false; },
    wechatChangeGroups() { return []; },
    wechatImageConfirmPromptText() { return ''; },
    selectedTaobaoSlot() { return null; },
    taobaoFilteredSlots() { return []; },
    taobaoProductDetail() { return ''; },
    taobaoSetItems() { return []; },
    currentBossJobs() { return []; },
    selectedBossJob() { return null; },
    selectedBossCompanyJob() { return null; },
    bossOptions() { return []; },
    bossAppointmentChoices() { return []; },
    bossCompanyFields() { return []; },
    bossApplyHint() { return ''; },
    bossApplyButtonText() { return '提交'; },
    bossJobPayText() { return ''; },
    bossMatchText() { return ''; },
    calendarMonthTitle() { return ''; },
    calendarDays() { return []; },
    realWorldAvailableMatters() { return []; },
    activeRealWorldMatter() { return null; },
    realWorldMatterText() { return '事项资料加载中'; },
    realWorldChoiceIcon() { return '✦'; },
    realWorldEntryIcon(entry = {}) { return entry?.type === 'user' ? '🧍' : (entry?.transientError ? '⚠️' : '📜'); },
    realWorldStatusIcon(text = '') {
      const value = String(text || '');
      if (/目标|任务/u.test(value)) return '🎯';
      if (/地点|位置|现实/u.test(value)) return '🗺️';
      return '✧';
    },
    realWorldMatterButtonText() { return this.activeRealWorldMatter?.() ? '📌 事项：进行中' : '📌 事项'; },
    openRealWorldPanel() { this.realWorldOpen = true; },
    closeRealWorldPanel() {
      this.realWorldOpen = false;
      this.realWorldFunctionOpen = false;
    },
    openRealWorldFunctionPanel(view = 'menu') {
      this.realWorldFunctionView = view;
      this.realWorldFunctionOpen = true;
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
    realWorldFunctionEyebrow() { return 'FUNCTION'; },
    realWorldFunctionTitle() { return '功能面板'; },
    realWorldFunctionHint() { return '相关模块加载完成后可用。'; },
    realWorldMapRows() { return []; },
    realWorldDisplayLog(log = this.realWorldLog || []) {
      const rows = Array.isArray(log) ? log : [];
      const result = [];
      let activeActionText = '';
      let activeActionPending = false;
      rows.forEach((entry) => {
        if (entry?.type === 'user') {
          const text = String(entry.text || entry.playerText || entry.actionText || '').trim();
          const prev = result[result.length - 1];
          const prevText = String(prev?.text || prev?.playerText || prev?.actionText || '').trim();
          if (prev?.type === 'user' && text && text === prevText) return;
          if (activeActionPending && text && text === activeActionText) return;
          activeActionText = text;
          activeActionPending = Boolean(text);
          result.push(entry);
          return;
        }
        if (entry?.transientError) {
          const text = String(entry.narration || entry.statusText || entry.text || '').trim();
          const prev = result[result.length - 1];
          const prevText = String(prev?.narration || prev?.statusText || prev?.text || '').trim();
          if (prev?.transientError && text && text === prevText) return;
          activeActionPending = Boolean(activeActionText);
          result.push(entry);
          return;
        }
        activeActionText = '';
        activeActionPending = false;
        result.push(entry);
      });
      return result;
    },
    realWorldMapStageStyle() { return ''; },
    realWorldMapHasGraphNodes() { return false; },
    renderRealWorldMapGraph() {},
    ensureRealWorldMapNativeInput() {},
    realWorldMapWheel() {},
    realWorldMapPanStart() {},
    realWorldMapPanMove() {},
    realWorldMapPanEnd() {},
    realWorldMapZoomBy() {},
    resetRealWorldMapView() {},
    realWorldMapInteriorNode() { return null; },
    realWorldMapInteriorTitle() { return ''; },
    realWorldMapInteriorSummary() { return ''; },
    realWorldMapInteriorView() { return 'tree'; },
    realWorldMapInteriorFloors() { return []; },
    realWorldMapInteriorZones() { return []; },
    realWorldMapInteriorFloorOpen() { return false; },
    toggleRealWorldMapInteriorFloor() {},
    closeRealWorldMapInterior() {},
    openRealWorldMapRoom() {},
    backRealWorldMapInteriorTree() {},
    renderRealWorldMapRoomCanvas() {},
    realWorldMapRoomResidentsLabel() { return ''; },
    realWorldMapSelectedRoomResidentsLine() { return ''; },
    realWorldMapSelectedRoomTemplateLabel() { return ''; },
    realWorldMapZoneGridClass() { return ''; },
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
    realWorldLogPageLabel() {
      const total = Math.max(0, Number(this.realWorldLogTotal || this.realWorldLog?.length || 0));
      return `第 ${this.realWorldLogPage || 1} / ${this.realWorldLogMaxPage()} 页，共 ${total} 条`;
    },
    changeRealWorldLogPage(step = 0) {
      const next = Number(this.realWorldLogPage || 1) + Number(step || 0);
      this.realWorldLogPage = Math.min(this.realWorldLogMaxPage(), Math.max(1, next));
    },
    realWorldChoicesWithMatters() { return Array.isArray(this.realWorldChoices) ? this.realWorldChoices : []; },
    taobaoWalletRows() { return []; },
    taobaoFilterLabel(slot = this.taobaoState?.filterSlot) { return slot || '全部'; },
    taobaoWearFilters() { return [{ slot: '', label: '全部' }]; },
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
      return entries.filter((entry) => String(entry?.name || '') !== 'legitimacy').length;
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
            const hasValue = typeof value === 'number' ? Number.isFinite(value) : String(value ?? '').trim();
            if (!hasValue && fieldKey !== 'legitimacy') return null;
            return {
              key: `ideology-${fieldKey}`,
              name: fieldKey,
              label: this.factionOverviewFieldLabel('ideology', fieldKey, faction),
              icon: skin.entryIcons[fieldKey] || skin.icon,
              display: this.factionOverviewEntryValue(field),
              reason: String(field?.reason || '').trim(),
              stateBadge: hasValue ? '已记录' : '',
            };
          }).filter(Boolean);
          const meter = this.factionOverviewPanelMeter(panelKey, entries, faction);
          const effectiveCount = this.factionOverviewEffectiveCount(panelKey, entries);
          return { key: 'cap-ideology', dim: 'ideology', label: meta.labels.ideology, eyebrow: meta.eyebrow, emptyText: meta.empty.ideology, icon: skin.icon, tone: skin.tone, meter, meterStyle: `--meter:${meter};`, rankLabel: this.factionOverviewRankLabel(meter, effectiveCount), statusLabel: `${entries.length}项`, entries };
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
    skillCategories() { return []; },
    skillsList() { return []; },
    selectedSkill() { return null; },
    promptCategoryLabel() { return '全部分类'; },
    promptCategories() { return []; },
    promptList() { return []; },
    currentPromptItem() { return null; },
    wechatAvatarCropImageStyle() { return ''; },
    phoneDateText() { return ''; },
    phoneTimeText() { return ''; },
  };
  const modules = [
    criticalActionFallback, gm.actions, gm.rpgFieldUi, gm.resultActions, gm.loadingActions, gm.roleCardLoadingActions, gm.solidifyActions, gm.wearingSyncActions, gm.saveActions, gm.styleActions,
    gm.worldlineActions, gm.predefinedRoleCardActions, gm.homeActions, gm.playerSetupActions, gm.playerAspirationActions, gm.playerIdentityActions, gm.identityMemoryActions, gm.identityAppActions, gm.memoryQueryActions, gm.wechatActions, gm.wechatViewActions, gm.wechatMemoryContextActions, gm.wechatChatActions, gm.wechatIncomingActions, gm.wechatImageActions, gm.wechatMentionActions, gm.wechatWorldlineActions, gm.wechatMemoryDebugActions, gm.wechatAppActions, gm.wechatAlbumTagActions, gm.wechatAlbumPromptListActions, gm.wechatAvatarCropActions, gm.wechatAlbumActions, gm.wechatChangePanelActions, gm.entryActions, gm.realWorldClockActions,
    gm.catalogActions, gm.coreActions, gm.controlLinkActions, gm.appSwitchActions, gm.currentWorldActions, gm.inventoryActions, gm.inventoryEquipActions, gm.itemSkillActions, gm.realWorldStreamActions, gm.realWorldThinkingActions, gm.realWorldSettlementActions, gm.realWorldUtilityActions, gm.realWorldActions, gm.realWorldLongingActions, gm.realWorldMapActions, gm.realWorldFactionActions, gm.realWorldMatterActions, gm.companyActions, gm.companyAttendanceActions, gm.companyFactionActions,
    gm.bossActions, gm.bossAppointmentActions, gm.bossAiActions, gm.calendarActions, gm.eventActions, gm.factionActions, gm.factionArchiveActions, gm.factionOrgActions, gm.factionAiActions, gm.skillsActions, gm.knownProfessionActions, gm.taobaoActions, gm.taobaoGenerateActions, gm.taobaoBuyActions, gm.promptActions, gm.controlExperienceConfigApp, gm.settingsActions, gm.systemTestActions, gm.tokenStatsActions, gm.uiThemeActions, gm.roleCardJsonApp?.actions,
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
    roleCardLoadingState: { open: false, expanded: true, cards: [], startedAt: 0 }, roleCardLoadingRetryQueue: {}, solidifyState: { open: false, candidates: [], selectedKey: '' },
    busy: false, started: false, desktopUnlocked: false, desktopPage: 0, desktopSwipeStart: null, controlSelectOpen: false, controlLinkMenuId: '', sharedControlTargetId: '', sharedControlActive: false, entrySetupOpen: false, entryIdentityOpen: false, identityAppOpen: false, identityReturnTo: '', wechatAppOpen: false, saveAppOpen: false, roleCardJsonAppOpen: false, identityTargetId: 'player-self', wechatSelectedContact: 'player-self', wechatTab: 'chats', wechatView: 'home', wechatAlbumMode: 'profile', wechatAlbumPromptOpen: false, wechatAlbumPromptStep: 'choice', wechatAlbumPromptDraft: null, wechatAlbumPromptError: '', wechatAlbumBodyFigureContext: null, wechatAlbumGenerating: false, wechatAlbumRequestId: 0, wechatAlbumDeleteConfirm: { open: false, index: -1 }, wechatAlbumPhotos: {}, wechatInput: '', wechatSending: false, wechatError: '', wechatReplyRequestId: 0, wechatMessagesByContact: {}, wechatUsers: [], wechatAddName: '', wechatAddRelation: '',
    initPromise: null, startupWarmupPromise: null, startupWarmupDone: false, phoneSetupDone: false, phoneActivationChoice: '', profileSetupBusy: false, setupError: '', phoneFixedTime: 0, phoneClockStamp: 0, phoneClockLabelShort: '--:--', phoneClockLabelFull: '--:--:--', phoneClockTimer: null, existingProfileExpanded: false,
    roleCardSetup: { loaded: false, usePredefinedPlayerCard: false, cards: [], selectedPlayerName: '', selectedRelationNames: [], relationRoles: {}, selectedRelationCardName: '刘思瑶', gender: '女', relationType: '妹妹', customRelation: '', detailOpen: false, relationDetailOpen: '' },
    knownProfessionState: { open: false, query: '', message: '', selectedName: '', detailOpen: false },
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
    playerProfile: { name: '', gender: '', birthday: '', age: '', city: '', refinedCity: '', dailyRole: '', refinedRole: '', livingStatus: '', refinedLivingStatus: '', wealthTier: '中产', wealthAmount: 500000, wealthSource: '', wealthBreakdown: null, wealthFixedIncome: '', relationships: '', relationshipEntries: [], parents: '', parentStatus: '', parentDeathCause: '', worldbuildingNote: '', notes: '', knownProfessions: [], wechatId: '', profileEnrichedAt: '', initializedAt: '', playerCardAiParts: { part2: true, part5: true, part6: true } }, playerName: '',
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
    log: [], realWorldOpen: false, realWorldBusy: false, realWorldInput: '', realWorldThinkMode: false, realWorldFreedomMode: 'scope', realWorldWordCount: 1000, realWorldFunctionOpen: false, realWorldFunctionView: 'menu', realWorldMatterState: { open: false, activeId: '' }, realWorldSceneTitle: '现实世界', realWorldLocationName: '', realWorldMap: defaultRealWorldMapState, realWorldQuest: '确认手机异常与现实处境', realWorldStatus: '现实稳定', realWorldChoices: ['检查手机记录', '观察居住环境', '联系熟人确认', '暂时休息'], realWorldLog: [], realWorldLogPage: 1, realWorldLogPageSize: 12, realWorldLogTotal: 0, realWorldLongingEvents: [], realWorldLongingPreparedIds: [], realWorldlineState: { events: [], plots: [], pendingPlot: null }, realWorldProfileOpen: false, companyState: defaultCompanyState, bossState: defaultBossState, calendarState: defaultCalendarState, eventState: defaultEventState, factionState: defaultFactionState, skillsState: gm.skillsApp?.defaultState?.() || {}, promptState: gm.promptTemplates?.defaultState?.() || {}, tokenStatsState: gm.tokenStats?.defaultState?.() || {},
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
      return window.GameModules.catalog?.find?.(this.selectedCharacterId) || list.find((c) => c.id === this.selectedCharacterId) || list[0] || {};
    },

    get workCharacters() { return window.GameModules.catalog.characters(this.selectedWork); },

    get homeCharacterProfile() { return this.homeCharacterProfiles[this.character.id] || null; },

    get characterRpgState() { return this.rpgStates[this.character.id] || null; },
    get currentRpgState() { return this.characterRpgState; },
    activeControlTargetState() {
      if (this.sharedControlActive && this.sharedControlTargetId) {
        return this.rpgStates?.[this.sharedControlTargetId] || null;
      }
      return null;
    },
    hasActiveControlTarget() {
      return Boolean(this.activeControlTargetState());
    },
    activeControlTargetName() {
      const state = this.activeControlTargetState();
      return state?.name || state?.profile?.name || this.character?.name || '被控制者';
    },
    activeControlTargetRole() {
      const state = this.activeControlTargetState();
      return String(state?.profile?.role || state?.role || '').trim();
    },
    isControlRoleCurrentlyActive(idOrState = null) {
      const state = typeof idOrState === 'string'
        ? (this.rpgStates?.[idOrState] || null)
        : (idOrState || null);
      return Boolean(this.sharedControlActive && state?.id && state.id === this.sharedControlTargetId);
    },
    desktopTaskTitle() {
      return this.hasActiveControlTarget() ? this.activeControlTargetName() : '选择目标';
    },
    desktopTaskSubtitle() {
      if (!this.hasActiveControlTarget()) return '等待操控者接入';
      const role = this.activeControlTargetRole();
      return role ? '当前被控制者：' + this.activeControlTargetName() + '｜' + role : '当前被控制者：' + this.activeControlTargetName();
    },
    get currentMemory() {
      const id = this.currentRpgState?.id;
      return id ? window.GameModules.characterMemory.ensure(id) : window.GameModules.characterMemory.normalize(null, 'none');
    },
    get savedWorldLores() { return window.GameModules.sqliteSave.db ? window.GameModules.sqliteSave.listWorldLores() : []; },

    async init() {
      if (this.initPromise) return this.initPromise;
      document.getElementById('boot-fallback')?.remove(); this.initPromise = (async () => {
        try {
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
    selectedKnownProfession() { return gm.knownProfessionActions?.selectedKnownProfession?.call(this) || null; },
    professionRequirementText(job) { return gm.knownProfessionActions?.professionRequirementText?.call(this, job) || ''; },
  });

  const startInit = () => Alpine.store('game')?.init?.();
  if (window.queueMicrotask) queueMicrotask(startInit);
  else setTimeout(startInit, 0);
}

document.addEventListener('alpine:init', registerGameStore); window.addEventListener('load', registerGameStore); setTimeout(registerGameStore, 0);
