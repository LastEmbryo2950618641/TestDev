if (window.parent !== window) window.parent.postMessage('iframe:content-ready', '*');

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
  const criticalActionFallback = {
    metricGroups(state = null) {
      if (!state || state.id === this.character?.id) {
        window.GameModules.metrics.ensure(this);
        return [{ title: '情绪', type: 'emotion', values: this.emotions, ready: this.metricsReady }, { title: '其余', type: 'player', values: this.playerFeelings, ready: this.metricsReady }];
      }
      const metrics = this.ensureStateMetrics ? this.ensureStateMetrics(state) : (state.metrics || {});
      return [{ title: '情绪', type: 'emotion', values: metrics.emotions || {}, ready: true }, { title: '其余', type: 'player', values: metrics.playerFeelings || {}, ready: true }];
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
  };
  const modules = [
    criticalActionFallback, gm.actions, gm.rpgFieldUi, gm.resultActions, gm.loadingActions, gm.roleCardLoadingActions, gm.saveActions, gm.styleActions,
    gm.worldlineActions, gm.predefinedRoleCardActions, gm.playerSetupActions, gm.playerIdentityActions, gm.identityMemoryActions, gm.identityAppActions, gm.memoryQueryActions, gm.wechatActions, gm.wechatViewActions, gm.wechatMemoryContextActions, gm.wechatChatActions, gm.wechatImageActions, gm.wechatMentionActions, gm.wechatWorldlineActions, gm.wechatMemoryDebugActions, gm.wechatAppActions, gm.wechatAlbumTagActions, gm.wechatAlbumPromptListActions, gm.wechatAvatarCropActions, gm.wechatAlbumActions, gm.wechatChangePanelActions, gm.entryActions,
    gm.catalogActions, gm.coreActions, gm.appSwitchActions, gm.inventoryActions, gm.realWorldStreamActions, gm.realWorldThinkingActions, gm.realWorldActions, gm.companyActions, gm.companyAttendanceActions,
    gm.bossActions, gm.bossAiActions, gm.calendarActions, gm.factionActions, gm.factionAiActions, gm.skillsActions, gm.knownProfessionActions, gm.promptActions, gm.settingsActions, gm.tokenStatsActions,
  ].map((module) => module || {});

  Alpine.store('game', {
    loading: true, loadingStep: '等待平台连接',
    loadingDetail: '首次进入或存档较大时会更慢，这是正常现象。',
    loadingStages: [], entryStages: [], loadingStartedAt: 0, loadingNow: Date.now(), loadingTimer: null,
    roleCardLoadingState: { open: false, expanded: true, cards: [], startedAt: 0 }, roleCardLoadingRetryQueue: {},
    busy: false, started: false, desktopUnlocked: false, desktopPage: 0, desktopSwipeStart: null, entrySetupOpen: false, identityAppOpen: false, identityReturnTo: '', wechatAppOpen: false, saveAppOpen: false, identityTargetId: 'player-self', wechatSelectedContact: 'player-self', wechatTab: 'chats', wechatView: 'home', wechatAlbumMode: 'profile', wechatAlbumPromptOpen: false, wechatAlbumPromptStep: 'choice', wechatAlbumPromptDraft: null, wechatAlbumGenerating: false, wechatAlbumRequestId: 0, wechatAlbumPhotos: {}, wechatInput: '', wechatSending: false, wechatError: '', wechatReplyRequestId: 0, wechatMessagesByContact: {}, wechatUsers: [], wechatAddName: '', wechatAddRelation: '',
    initPromise: null, startupWarmupPromise: null, startupWarmupDone: false, phoneSetupDone: false, phoneActivationChoice: '', profileSetupBusy: false, setupError: '', phoneFixedTime: 0, phoneClockTimer: null, existingProfileExpanded: false,
    roleCardSetup: { loaded: false, usePredefinedPlayerCard: false, cards: [], selectedPlayerName: '', selectedRelationNames: [], relationRoles: {}, selectedRelationCardName: '刘思瑶', gender: '女', relationType: '妹妹', customRelation: '', detailOpen: false, relationDetailOpen: '' },
    knownProfessionState: { open: false, query: '', message: '', selectedName: '', detailOpen: false },
    settingsState: { open: false, loading: false, loaded: false, error: '', textModels: [], drawModels: [], textModelId: cfg.defaultModelId, drawModelId: 'anime' },
    playerProfile: { name: '', gender: '', birthday: '', age: '', city: '', refinedCity: '', dailyRole: '', refinedRole: '', livingStatus: '', refinedLivingStatus: '', relationships: '', relationshipEntries: [], parents: '', parentStatus: '', parentDeathCause: '', worldbuildingNote: '', notes: '', knownProfessions: [], wechatId: '', profileEnrichedAt: '', initializedAt: '', playerCardAiParts: { part2: false, part5: false, part6: false } }, playerName: '',
    selectedSlot: 'slot-1', saveSlots: window.GameModules.storage.slots,
    savePanelOpen: false, functionPanelOpen: false, worldlineAppOpen: false,
    libraryTab: 'worlds', worldlineAppTab: 'control', realWorldlineSubTab: 'recording', expandedWorldlineTag: '', worldlineDebugSection: '世界线APP主面板', selectedRealWorldPlotId: '',
    activeStyleIds: ['literary'], customWritingStyles: [], customStyleName: '', customStylePrompt: '',
    saveMessage: '',
    saveMetas: {},
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
    metricsReady: false,
    metricNotes: {},
    metricSummaryLimit: 3,
    metricSummaryObserver: null,
    expandedMetricKey: '',
    expandedRpgFieldKey: '',
    quest: '确认操控连接', thinkingMode: true,
    mindText: '', feedbackSource: 'pending',
    characterIntent: '',
    choices: cfg.openingChoices,
    log: [], realWorldOpen: false, realWorldBusy: false, realWorldInput: '', realWorldThinkMode: false, realWorldFunctionOpen: false, realWorldFunctionView: 'menu', realWorldSceneTitle: '现实世界', realWorldLocationName: '', realWorldMap: window.GameModules.realWorldMap.defaultState({}), realWorldQuest: '确认手机异常与现实处境', realWorldStatus: '现实稳定', realWorldChoices: ['检查手机记录', '观察居住环境', '联系熟人确认', '暂时休息'], realWorldLog: [], realWorldLogPage: 1, realWorldLogPageSize: 12, realWorldLogTotal: 0, realWorldlineState: { events: [], plots: [], pendingPlot: null }, realWorldProfileOpen: false, companyState: window.GameModules.companySystem.defaultState({}), bossState: window.GameModules.bossRecruitment.defaultBossState({}), calendarState: window.GameModules.calendarSystem.defaultCalendarState(), factionState: window.GameModules.factionSystem.defaultState({}), skillsState: window.GameModules.skillsApp.defaultState(), promptState: window.GameModules.promptTemplates.defaultState(), tokenStatsState: window.GameModules.tokenStats.defaultState(),
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
    realWorldProfileViewMode: 'profile', realWorldProfileMenuOpen: false, realWorldMemoryInput: '', realWorldMemoryArchiveQuery: '', realWorldMemoryArchiveResults: [],
    identityMemoryViewMode: 'shortTerm', identityMemoryShortTab: 'recent', identityMemoryLongTab: 'vivid', identityMemoryArchiveQuery: '', identityMemoryArchiveResults: [],
    profileOpen: false, metricsOpen: false, identityMetricsOpen: false, feedbackOpen: false,
    promptDialogOpen: false, promptDialogEntry: null, promptDialogTab: 'system',
    wechatAlbumPrompts: {}, wechatAlbumPromptSelectedId: '', wechatAlbumPromptEditText: '', wechatAlbumPromptEditNegative: '', wechatAvatarCropOpen: false, wechatAvatarCropPhotoIndex: 0, wechatAvatarCropState: { url: '', x: 24, y: 4, scale: 1.92, ratio: 1.5 }, wechatImageConfirmOpen: false, wechatImageConfirmMessage: null, wechatImageGenerating: false, wechatImageRequestId: 0, wechatImagePreview: { open: false, url: '', title: '' }, wechatMentionPanelOpen: false,
    sectionHintsEnabled: cfg.sectionHintsEnabled,

    get character() { return window.GameModules.catalog.find(this.selectedCharacterId) || this.characters.find((c) => c.id === this.selectedCharacterId) || this.characters[0]; },

    get workCharacters() { return window.GameModules.catalog.characters(this.selectedWork); },

    get homeCharacterProfile() { return this.homeCharacterProfiles[this.character.id] || null; },

    get characterRpgState() { return this.rpgStates[this.character.id] || null; },
    get currentRpgState() { return this.characterRpgState; },
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
          this.initCompanySystem?.(); this.initBossRecruitment?.(); this.initCalendar?.(); this.initFactionSystem?.(); this.initSkillsApp?.(); this.initKnownProfessionApp?.(); this.initPromptApp?.(); this.initTokenStatsApp?.();
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
      console.log('[回合流程] 玩家提交行动:', { turn: this.turn, action, online: this.online, character: this.character.name });
      this.busy = true;
      const logId = this.addNovelEntry(action);

      try {
        this.lastAction = action;
        await this.refreshRagContext(action);
        console.log('[回合流程] RAG上下文完成:', { length: String(this.ragContext || '').length, results: this.ragResults?.length || 0 });
        this.memoryContext = await window.GameModules.characterMemory.contextFor(this, action);
        console.log('[回合流程] 记忆上下文完成:', { length: String(this.memoryContext || '').length });
        await window.GameModules.ai.generate(this, action, logId);
      } finally {
        this.busy = false;
        this.turn += 1;
        await this.save();
        this.scrollLog();
      }
    },

    ...Object.assign({}, ...modules),
    knownProfessions() { return gm.knownProfessionActions?.knownProfessions?.call(this) || []; },
    selectedKnownProfession() { return gm.knownProfessionActions?.selectedKnownProfession?.call(this) || null; },
    professionRequirementText(job) { return gm.knownProfessionActions?.professionRequirementText?.call(this, job) || ''; },
  });

  const startInit = () => Alpine.store('game')?.init?.();
  if (window.queueMicrotask) queueMicrotask(startInit);
  else setTimeout(startInit, 0);
}

document.addEventListener('alpine:init', registerGameStore); window.addEventListener('load', registerGameStore); setTimeout(registerGameStore, 0);
