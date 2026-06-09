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
    loading: true,
    loadingStep: '正在接入操控链路，请稍等…',
    loadingDetail: '首次进入或存档较大时会更慢，这是正常现象。',
    busy: false,
    started: false,
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
    stats: cfg.stats,
    online: true,
    input: '',
    lastAction: '',
    turn: 1,
    sceneTitle: '裂隙前厅',
    mood: '冷静',
    trust: 45,
    resistance: 20,
    quest: '确认操控连接',
    mindText: '',
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
    profileViewMode: 'profile',
    profileMenuOpen: false,
    memoryInput: '',
    memoryArchiveQuery: '',
    memoryArchiveResults: [],
    profileOpen: false,
    metricsOpen: false,
    feedbackOpen: false,
    sectionHintsEnabled: cfg.sectionHintsEnabled,

    get character() {
      return window.GameModules.catalog.find(this.selectedCharacterId)
        || this.characters.find((c) => c.id === this.selectedCharacterId)
        || this.characters[0];
    },

    get workCharacters() {
      return window.GameModules.catalog.characters(this.selectedWork);
    },

    get characterRefs() {
      return this.character.refs || [];
    },

    get characterRpgState() {
      return this.rpgStates[this.character.id] || null;
    },

    get currentRpgState() {
      return this.characterRpgState;
    },

    get currentMemory() {
      const id = this.currentRpgState?.id; return id ? window.GameModules.characterMemory.ensure(id) : { shortTerm: [], longTerm: [] };
    },

    get savedWorldLores() {
      return window.GameModules.sqliteSave.db ? window.GameModules.sqliteSave.listWorldLores() : [];
    },

    async init() {
      await this.initGame();
    },

    async loadCatalog() {
      try {
        await window.GameModules.catalog.load();
        this.works = window.GameModules.catalog.works();
        this.selectedWork = this.selectedWork || window.GameModules.catalog.firstWork();
        this.selectedCharacterId = window.GameModules.catalog.firstCharacter(this.selectedWork) || this.selectedCharacterId;
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
      this.busy = true;
      const speaker = this.online ? this.playerName : `${this.playerName}的建议`;
      this.addLog(this.online ? 'player' : 'advice', speaker, action);

      try {
        this.lastAction = action;
        await this.refreshRagContext(action);
        this.memoryContext = await window.GameModules.characterMemory.contextFor(this, action);
        await window.GameModules.ai.generate(this, action);
      } finally {
        this.busy = false;
        this.turn += 1;
        await this.save();
        this.scrollLog();
      }
    },

    async applyResult(result) {
      await this.ensureRpgFromResults(result);
      this.sceneTitle = result.sceneTitle;
      this.mood = result.mood;
      this.trust = result.trust;
      this.resistance = result.resistance;
      this.quest = result.quest;
      this.choices = result.choices;
      this.mindText = result.mind;
      await this.applyStatChanges(result.statChanges);
      await window.GameModules.characterMemory.recordTurn(this, result);
      this.addLog('story', '旁白', result.narration);
      if (result.speech) this.addLog('speech', this.character.name, result.speech);
      this.addLog('mind', `${this.character.name}的心理`, result.mind);
    },

    async applyStatChanges(changes) {
      const state = this.characterRpgState;
      if (!state?.values) return;
      Object.entries(changes || {}).forEach(([key, delta]) => {
        if (!['health', 'stamina', 'mana'].includes(key)) return;
        const current = Number.isFinite(state.values[key]) ? state.values[key] : 100;
        state.values[key] = Math.max(0, Math.min(100, current + delta));
      });
      this.rpgStates = { ...this.rpgStates, [state.id]: state };
      await window.GameModules.sqliteSave.saveCharacterState(state);
    },

    ...window.GameModules.actions,
    ...window.GameModules.loadingActions,
    ...window.GameModules.saveActions,
    ...window.GameModules.coreActions,
  });

  queueMicrotask(() => Alpine.store('game').init());
});
