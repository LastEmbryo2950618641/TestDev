/**
 * 手机时间与现实世界推演界面。
 */
window.GameModules = window.GameModules || {};

window.GameModules.realWorldActions = {
  startPhoneClock() {
    if (this.phoneClockTimer) return;
    this.phoneClockSessionStart = Date.now();
    this.phoneClockNow = this.phoneClockSessionStart;
    this.phoneClockTimer = setInterval(() => { this.phoneClockNow = Date.now(); }, 1000);
  },

  phoneDate() {
    const now = this.phoneClockNow || Date.now();
    const sessionStart = this.phoneClockSessionStart || now;
    const initialized = new Date(this.playerProfile?.initializedAt || sessionStart).getTime();
    const base = Number.isFinite(initialized) ? initialized : sessionStart;
    return new Date(base + Math.max(0, now - sessionStart));
  },

  phoneTimeText() {
    const d = this.phoneDate();
    return [d.getHours(), d.getMinutes(), d.getSeconds()].map((x) => String(x).padStart(2, '0')).join(':');
  },

  phoneDateText() {
    const d = this.phoneDate();
    const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${week}`;
  },

  openRealWorldPanel() {
    this.realWorldOpen = true;
    this.checkWorkReminder?.();
    if (!this.realWorldLog.length) this.seedRealWorldLog();
  },

  closeRealWorldPanel() {
    this.realWorldOpen = false;
  },

  seedRealWorldLog() {
    this.realWorldLog = [{
      id: this.nextId++, type: 'system',
      narration: `你把手机屏幕压暗，现实世界的声音重新浮上来。${this.playerProfile?.refinedLivingStatus || '你的住处'}仍保持着原本的秩序，但那台新手机带来的异常感并没有消失。`,
      thinking: '现实世界推演已接入玩家本人资料，只追踪手机外的现实行动。',
    }];
  },

  async submitRealWorldAction(action = '') {
    const text = String(action || this.realWorldInput || '').trim();
    if (!text || this.realWorldBusy) return;
    this.realWorldInput = '';
    this.realWorldBusy = true;
    this.realWorldLog.push({ id: this.nextId++, type: 'user', text });
    const entry = { id: this.nextId++, type: 'ai', narration: '现实世界正在推演…', thinking: '', streaming: true };
    this.realWorldLog.push(entry);
    try {
      const prompt = window.GameModules.createRealWorldPrompt(this, text);
      entry.promptPack = { systemPrompt: prompt, userPrompt: text, model: this.modelId, promptTokens: Math.ceil(prompt.length / 2) };
      const result = await window.GameModules.realWorldAi.generate(this, prompt, text);
      this.applyRealWorldResult(entry.id, result);
      await this.recordPlayerRealWorldMemory(text, result);
      await this.save();
    } finally {
      this.realWorldBusy = false;
    }
  },

  applyRealWorldResult(id, result) {
    this.realWorldSceneTitle = result.sceneTitle || this.realWorldSceneTitle;
    this.realWorldQuest = result.quest || this.realWorldQuest;
    this.realWorldStatus = result.status || this.realWorldStatus;
    this.realWorldChoices = result.choices || this.realWorldChoices;
    this.realWorldLog = this.realWorldLog.map((entry) => (entry.id === id ? { ...entry, ...result, type: 'ai', streaming: false } : entry)).slice(-30);
  },

  async recordPlayerRealWorldMemory(action, result) {
    const text = [`现实行动：${action}`, `发生：${result.narration || ''}`, result.thinking ? `推演：${result.thinking}` : '', `目标：${result.quest || this.realWorldQuest}`].filter(Boolean).join('\n');
    const store = { ...this, sceneTitle: result.sceneTitle || this.realWorldSceneTitle, entryTime: null, entryTimeLabel: () => `${this.phoneDateText()} ${this.phoneTimeText()}` };
    const memory = window.GameModules.characterMemory.ensure('player-self');
    const item = window.GameModules.characterMemory.memoryItem(store, { text, source: 'real-world', impression: 55 });
    memory.shortTerm.recent.push(item);
    window.GameModules.characterMemory.promote(memory, item);
    await window.GameModules.characterMemory.compact('player-self', memory);
  },

  openRealWorldPrompt(id) {
    const entry = this.realWorldLog.find((item) => item.id === id);
    if (!entry?.promptPack) return;
    this.promptDialogEntry = entry;
    this.promptDialogTab = 'system';
    this.promptDialogOpen = true;
  },
};
