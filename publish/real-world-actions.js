/**
 * 手机时间与现实世界推演界面。
 */
window.GameModules = window.GameModules || {};

window.GameModules.realWorldActions = {
  startPhoneClock() {
    this.ensurePhoneFixedTime();
  },

  ensurePhoneFixedTime() {
    const initialized = new Date(this.playerProfile?.initializedAt || Date.now()).getTime();
    const base = Number.isFinite(initialized) ? initialized : Date.now();
    if (!Number.isFinite(Number(this.phoneFixedTime))) this.phoneFixedTime = base;
  },

  advancePhoneTime(seconds = 60) {
    this.ensurePhoneFixedTime();
    const delta = Math.max(0, Math.min(2592000, Math.round(Number(seconds) || 0))) * 1000;
    this.phoneFixedTime += delta;
  },

  phoneDate() {
    this.ensurePhoneFixedTime();
    return new Date(this.phoneFixedTime);
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
    this.closeRealWorldPanel();
  },

  realWorldValues() {
    const values = this.playerIdentityState()?.values || {};
    window.GameModules.progression.ensureInventoryFields?.(values);
    return values;
  },

  realWorldFunctionTitle() {
    return { inventory: '背包', wearing: '穿着' }[this.realWorldFunctionView] || '现实功能';
  },

  realWorldFunctionEyebrow() {
    return { inventory: 'INVENTORY', wearing: 'WEARING' }[this.realWorldFunctionView] || 'REAL WORLD';
  },

  realWorldFunctionHint() {
    return { inventory: '查看玩家本人当前持有或可调用的装备与物品。', wearing: '查看内衣、上衣、下衣、鞋子、饰品等当前穿戴。' }[this.realWorldFunctionView] || '选择现实世界中要执行的功能。';
  },

  realWorldInventoryItems() {
    const v = this.realWorldValues();
    const tag = (kind, list) => (Array.isArray(list) ? list : []).map((item) => (typeof item === 'string' ? { name: item, kind } : { kind, ...item }));
    return [...tag('装备', v.equipment), ...tag('物品', v.items)];
  },

  realWorldWearingItems() {
    return this.realWorldValues().wearing || [];
  },

  realWorldInventoryName(item) {
    return String(item?.name || item || '未命名物品');
  },

  realWorldInventoryDetail(item) {
    if (!item || typeof item === 'string') return '暂无详细说明';
    return [item.kind || item.type, item.slot, item.quantity ? `数量${item.quantity}` : '', item.description, item.source, item.changeMode].filter(Boolean).join('｜') || '暂无详细说明';
  },

  realWorldWearingName(item) {
    return item?.name && item.name !== '未穿戴' ? item.name : '未穿戴';
  },

  realWorldWearingDetail(item) {
    if (!item?.name || item.name === '未穿戴') return '该部位暂无已记录穿着。';
    return [item.type || '穿着', item.description, item.source].filter(Boolean).join('｜');
  },

  async applyRealWorldInventoryUpdates(updates = []) {
    const state = this.playerIdentityState?.();
    const values = state?.values;
    if (!values) return;
    window.GameModules.progression.ensureInventoryFields?.(values);
    const slots = window.GameModules.progression.wearableSlots?.() || [];
    let changed = false;
    const upsert = (list, item) => {
      const name = this.realWorldInventoryName(item);
      const index = list.findIndex((old) => this.realWorldInventoryName(old) === name);
      if (index >= 0) list[index] = { ...(typeof list[index] === 'string' ? { name: list[index] } : list[index]), ...item };
      else list.push(item);
      changed = true;
    };
    for (const raw of updates || []) {
      const kind = raw?.kind;
      const value = raw?.value && typeof raw.value === 'object' ? raw.value : {};
      const item = { ...value, name: raw?.name || value.name, type: kind, description: raw?.description || raw?.summary || value.description, changeMode: raw?.reason || raw?.changeMode || 'AI演算' };
      if (kind === '装备') upsert(values.equipment, item);
      if (kind === '物品') upsert(values.items, item);
      if (kind === '穿着') {
        const slot = item.slot || slots.find((name) => String(raw?.name || '').includes(name));
        const index = values.wearing.findIndex((old) => old.slot === slot);
        if (index >= 0) { values.wearing[index] = { ...values.wearing[index], ...item, slot }; changed = true; }
      }
    }
    if (changed) {
      this.rpgStates = { ...this.rpgStates, [state.id]: state };
      await window.GameModules.sqliteSave.saveCharacterState(state);
    }
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
      const prompt = await window.GameModules.createRealWorldPrompt(this, text);
      entry.promptPack = { systemPrompt: prompt, userPrompt: text, model: this.modelId, promptTokens: Math.ceil(prompt.length / 2) };
      const result = await window.GameModules.realWorldAi.generate(this, prompt, text);
      await this.applyRealWorldResult(entry.id, result);
      await this.recordPlayerRealWorldMemory(text, result);
      await this.save();
    } finally {
      this.realWorldBusy = false;
    }
  },

  async applyRealWorldResult(id, result) {
    await window.GameModules.rpgLexicon.applyLexiconSkill?.(result.lexiconUpdates || []);
    await this.applyRealWorldInventoryUpdates(result.lexiconUpdates || []);
    this.advancePhoneTime(result.elapsedSeconds || 300);
    this.checkWorkReminder?.();
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
