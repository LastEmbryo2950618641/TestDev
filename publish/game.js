/**
 * 主入口：Alpine store 与玩家交互。
 */
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

document.addEventListener('alpine:init', () => {
  const cfg = window.GameModules.config;

  Alpine.store('game', {
    loading: true, loadingStep: '等待平台连接',
    loadingDetail: '首次进入或存档较大时会更慢，这是正常现象。',
    loadingStages: [], entryStages: [],
    busy: false, started: false, entrySetupOpen: false,
    initPromise: null,
    playerName: '',
    selectedSlot: 'slot-1',
    saveSlots: window.GameModules.storage.slots,
    savePanelOpen: false,
    functionPanelOpen: false,
    libraryTab: 'worlds',
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
    log: [],
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
    profileViewMode: 'profile',
    profileMenuOpen: false,
    memoryInput: '',
    memoryArchiveQuery: '',
    memoryArchiveResults: [],
    profileOpen: false, metricsOpen: false, feedbackOpen: false,
    sectionHintsEnabled: cfg.sectionHintsEnabled,

    get character() {
      return window.GameModules.catalog.find(this.selectedCharacterId)
        || this.characters.find((c) => c.id === this.selectedCharacterId)
        || this.characters[0];
    },

    get workCharacters() {
      return window.GameModules.catalog.characters(this.selectedWork);
    },

    get characterRpgState() {
      return this.rpgStates[this.character.id] || null;
    },

    get currentRpgState() {
      return this.characterRpgState;
    },

    get currentMemory() {
      const id = this.currentRpgState?.id;
      return id ? window.GameModules.characterMemory.ensure(id) : window.GameModules.characterMemory.normalize(null, 'none');
    },

    get savedWorldLores() {
      return window.GameModules.sqliteSave.db ? window.GameModules.sqliteSave.listWorldLores() : [];
    },

    async init() {
      if (this.initPromise) return this.initPromise;
      document.getElementById('boot-fallback')?.remove(); this.initPromise = (async () => {
        try {
          window.GameModules.metrics.ensure(this);
          await this.initGame();
        } catch (err) {
          console.error('游戏初始化失败:', err.message, err.stack);
          this.loadingDetail = `初始化失败：${err.message || '未知错误'}`;
          this.loading = false;
        }
      })();
      return this.initPromise;
    },

    async loadCatalog() {
      try {
        await window.GameModules.catalog.load();
        this.works = window.GameModules.catalog.works();
        this.selectedWork = this.selectedWork || window.GameModules.catalog.firstWork();
        this.selectedCharacterId = window.GameModules.catalog.firstCharacter(this.selectedWork) || this.selectedCharacterId;
        window.GameModules.characterBrief.ensure(this);
      } catch (err) {
        console.error('角色目录加载失败:', err.message, err.stack);
      }
    },

    async loadModelAndUser() {
      try {
        const info = await window.dzmm?.user?.info?.(); if (info?.name && !this.playerName) this.playerName = info.name;
      } catch (err) {
        console.warn('读取用户信息失败:', err.code, err.message);
      }

      try {
        const result = await window.dzmm?.models?.list?.();
        this.modelId = result?.defaultModel || result?.models?.[0]?.internalName || this.modelId;
      } catch (err) {
        console.warn('读取模型列表失败:', err.code, err.message);
      }
    },

    ensureCatalogSelection() {
      if (!this.works.some((work) => work.name === this.selectedWork)) {
        this.selectedWork = window.GameModules.catalog.firstWork();
      }
      if (!window.GameModules.catalog.find(this.selectedCharacterId)) {
        this.selectedCharacterId = window.GameModules.catalog.firstCharacter(this.selectedWork) || this.selectedCharacterId;
      }
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


    ...window.GameModules.actions,
    ...window.GameModules.rpgFieldUi,
    ...window.GameModules.resultActions,
    ...window.GameModules.loadingActions,
    ...window.GameModules.saveActions,
    ...window.GameModules.entryActions,
    ...window.GameModules.coreActions,
  });

  queueMicrotask(() => Alpine.store('game').init());
});
