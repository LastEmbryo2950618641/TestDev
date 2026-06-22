window.GameModules = window.GameModules || {};

window.GameModules.realWorldUtilityActions = {
  async assignRealWorldlineEntry(entry) {
    this.realWorldlineState = this.realWorldlineState || { events: [], plots: [], pendingPlot: null };
    const event = { eventId: `real_${entry.id}`, name: entry.sceneTitle || entry.locationName || this.realWorldSceneTitle || '现实事件', time: entry.time?.label || '', detail: String(entry.narration || entry.thinking || entry.text || ''), status: entry.streaming ? '记录中' : '已记录' };
    this.realWorldlineState.events = [...(this.realWorldlineState.events || []).filter((item) => item.eventId !== event.eventId), event].slice(-40);
    const assigned = window.GameModules.worldlinePlots.assign(this, this.realWorldlineState, event, '现实情节');
    entry.plotId = event.plotId;
    await assigned;
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

  realWorldWordCountValue() {
    return Math.floor(Number(this.realWorldWordCount) || 0);
  },

  realWorldWordCountValid() {
    return this.realWorldFreedomMode !== 'words' || this.realWorldWordCountValue() >= 200;
  },

  validateRealWorldFreedom() {
    if (this.realWorldWordCountValid()) return true;
    window.dzmm?.toast?.error?.('要求字数最少 200');
    return false;
  },

  realWorldFreedomRule() {
    const mode = this.realWorldFreedomMode || 'scope';
    if (mode === 'free') return '推演自由度：AI自由发挥。final 不受玩家本次行动边界约束，也不设置字数上限；AI 应根据当前已知场景、时间、地点、人物状态、现实因果、生命体征和已载入资料，尽可能输出其能够合理推演的最大内容量。允许连续推进环境变化、他人反应、事件连锁、阶段性结果和后续影响，直到当前场景在逻辑上达到可停顿的最大推演点；但不得无依据篡改已知设定、无中生有关键旧事实或违背现实因果。';
    if (mode === 'words') return `推演自由度：要求字数。final 的 narration 不得少于 ${Math.max(200, this.realWorldWordCountValue())} 个汉字；仍需遵守本次行动边界和现实因果，必须把行动过程、环境、身体状态影响、人物反应和直接结果写充分。`;
    return '推演自由度：行动范围内。只推演玩家本次输入行动自然抵达的过程和直接结果，不替玩家继续追问、离开、处理后续长期事务或完成未输入的下一步行动；但必须在该行动范围内尽可能充分推演，包括玩家动作过程、身体感受、周围环境变化、可见细节、他人反应、对话回应、短期连锁影响和结果落点。narration 不要写成简略总结，建议 420 到 800 个汉字。';
  },

  realWorldNarrationHint() {
    if (this.realWorldFreedomMode === 'words') return `以第二人称续写现实世界中的行动结果，不少于 ${Math.max(200, this.realWorldWordCountValue())} 个汉字，现实、克制、细节充分，并体现精力、饱食、水分、疲劳或精神稳定对行动的影响`;
    if (this.realWorldFreedomMode === 'free') return '以第二人称续写现实世界中的行动结果，不设字数上限，按当前场景和已载入资料尽可能输出可合理推演的最大内容量，连续呈现环境变化、他人反应、事件连锁、阶段性结果和后续影响，并体现生命体征影响';
    return '以第二人称续写现实世界中的行动过程和直接结果，420到800字，在行动范围内充分描写动作过程、周围情况、别人反应、短期影响和生命体征影响';
  },

  async copyRealWorldPlayerText(text = '') {
    const value = String(text || '').trim();
    if (!value) return;
    const current = String(this.realWorldInput || '').trimEnd();
    this.realWorldInput = current ? `${current} ${value}` : value;
    window.dzmm?.toast?.success?.('已追加到输入框');
  },

  openRealWorldPrompt(id) {
    const entry = this.realWorldLog.find((item) => item.id === id);
    if (!entry?.promptPack) return;
    this.promptDialogEntry = entry;
    this.promptDialogTab = 'system';
    this.promptDialogOpen = true;
  },
};
