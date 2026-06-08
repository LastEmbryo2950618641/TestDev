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

    async init() {
      await dzmmReady;
      await this.loadCatalog();
      await this.loadModelAndUser();
      const save = await window.GameModules.storage.get();
      window.GameModules.storage.restore(this, save);
      this.ensureCatalogSelection();
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

    selectWork(name) {
      this.selectedWork = name;
      this.selectedCharacterId = window.GameModules.catalog.firstCharacter(name) || this.selectedCharacterId;
    },

    selectCharacter(id) {
      this.selectedCharacterId = id;
    },

    async start() {
      this.started = true;
      this.log = [];
      this.turn = 1;
      this.mindText = `${this.character.name}感觉到意识深处多了一道陌生的注视。`;
      this.addLog('system', '系统', `操控链路已连接：${this.playerName} → ${this.character.name}`);
      this.addLog('story', '旁白', `${this.character.name}在一座异常安静的前厅醒来。视野边缘闪烁着「上线」标记。`);
      this.addLog('mind', `${this.character.name}的心理`, this.mindText);
      await this.save();
    },

    setOnline(value) {
      if (this.online === value) return;
      this.online = value;
      const text = value ? '操控者上线，角色身体行动权被接管。' : '操控者下线，角色重新获得身体控制权。';
      this.addLog('system', '控制权', text);
      this.save();
    },

    async submitFreeInput() {
      const action = this.input.trim();
      if (!action) return;
      this.input = '';
      await this.submitAction(action);
    },

    async autoplay() {
      await this.submitAction(this.online ? '按照当前局势做最有效的行动' : '让角色完全自主决定下一步');
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

    applyResult(result) {
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
  });

  queueMicrotask(() => Alpine.store('game').init());
});
