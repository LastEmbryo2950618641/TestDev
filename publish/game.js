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
    busy: false,
    started: false,
    playerName: '',
    selectedSlot: 'slot-1',
    saveSlots: window.GameModules.storage.slots,
    modelId: cfg.defaultModelId,
    characters: cfg.characters,
    works: [],
    selectedWork: '',
    selectedCharacterId: cfg.characters[0].id,
    stats: cfg.stats,
    online: true,
    input: '',
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
    ragResults: [],
    ragBusy: false,
    ragError: '',
    rpgStates: {},
    rpgPanelCharacterId: '',

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

    get currentRpgState() {
      return this.rpgStates[this.rpgPanelCharacterId] || this.rpgStates[this.character.id] || null;
    },

    get rpgStateList() {
      return Object.values(this.rpgStates);
    },

    async init() {
      await dzmmReady;
      await this.loadCatalog();
      await this.loadModelAndUser();
      await window.GameModules.storage.open(this.selectedSlot);
      const save = await window.GameModules.storage.get();
      window.GameModules.storage.restore(this, save);
      this.ensureCatalogSelection();
      this.loadSavedRpgStates();
      await this.ensureRpgForCurrentCharacter();
      this.loading = false;
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
        const info = await window.dzmm?.user?.info?.();
        if (info?.name && !this.playerName) this.playerName = info.name;
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
        await this.refreshRagContext(action);
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
      this.applyStatChanges(result.statChanges);
      this.addLog('story', '旁白', result.narration);
      if (result.speech) this.addLog('speech', this.character.name, result.speech);
      this.addLog('mind', `${this.character.name}的心理`, result.mind);
    },

    applyStatChanges(changes) {
      Object.entries(changes || {}).forEach(([key, delta]) => {
        if (typeof this.character.stats[key] !== 'number') return;
        this.character.stats[key] = Math.max(0, Math.min(100, this.character.stats[key] + delta));
      });
    },

    ...window.GameModules.actions,
    ...window.GameModules.saveActions,
    ...window.GameModules.coreActions,
  });

  queueMicrotask(() => Alpine.store('game').init());
});
