/**
 * 小说记录：玩家行动、作者叙事与可折叠心理。
 */
window.GameModules = window.GameModules || {};

Object.assign(window.GameModules.actions, {
  addNovelEntry(playerText, options = {}) {
    const entry = {
      id: this.nextId++,
      kind: 'novel',
      type: this.online ? 'player' : 'advice',
      playerText,
      playerVisible: options.playerVisible !== false,
      storyText: '作者正在续写这一段剧情…',
      thinking: '',
      speech: '',
      mind: '',
      promptPack: null,
      thinkingOpen: false,
      streaming: true,
    };
    this.log.push(entry);
    if (this.log.length > 40) this.log.shift();
    this.scrollLog();
    return entry.id;
  },

  normalizeNovelThinking(text) {
    const value = String(text || '').trim();
    return /AI\s*正在整理角色状态|正在整理角色状态、玩家输入/.test(value) ? '' : value;
  },

  updateNovelEntry(id, patch = {}) {
    const entry = this.log.find((item) => item.id === id);
    if (!entry) return;
    if (Object.prototype.hasOwnProperty.call(patch, 'thinking')) patch.thinking = this.normalizeNovelThinking(patch.thinking);
    Object.assign(entry, patch);
    this.log = [...this.log];
    this.scrollLog();
  },

  attachNovelPrompt(id, promptPack) {
    this.updateNovelEntry(id, { promptPack });
  },

  openNovelPrompt(id) {
    const entry = this.log.find((item) => item.id === id);
    if (!entry?.promptPack) return;
    this.promptDialogEntry = entry;
    this.promptDialogTab = 'system';
    this.promptDialogOpen = true;
  },

  promptDialogText() {
    const pack = this.promptDialogEntry?.promptPack || {};
    return this.promptDialogTab === 'user' ? pack.userPrompt : pack.systemPrompt;
  },

  updateNovelStream(id, raw) {
    const entry = this.log.find((item) => item.id === id);
    if (!entry) return false;
    const thinking = this.thinkingMode ? this.extractStreamingField(raw, 'thinking') : '';
    const text = this.extractStreamingField(raw, 'narration');
    const patch = { streaming: true };
    let changed = !entry.streaming;
    if (thinking && thinking !== entry.thinking) {
      patch.thinking = thinking;
      patch.thinkingOpen = true;
      changed = true;
    }
    if (text && text !== entry.storyText) {
      patch.storyText = text;
      changed = true;
    }
    if (changed) this.updateNovelEntry(id, patch);
    return changed;
  },

  finalizeNovelEntry(id, result) {
    if (!id) return false;
    const entry = this.log.find((item) => item.id === id);
    if (!entry) return false;
    const speech = result.speech ? `\n\n「${result.speech}」` : '';
    this.updateNovelEntry(id, {
      storyText: `${result.narration || '剧情继续向前推进。'}${speech}`,
      thinking: this.thinkingMode ? (result.thinking || entry.thinking || '') : '',
      thinkingOpen: false,
      mind: result.mind || '',
      streaming: false,
    });
    return true;
  },

  toggleNovelThinking(id) {
    const entry = this.log.find((item) => item.id === id);
    if (!entry) return;
    entry.thinkingOpen = !entry.thinkingOpen;
    this.log = [...this.log];
  },

  novelLogEntries() {
    return (this.log || []).filter((entry) => entry.kind === 'novel').map((entry) => ({
      ...entry,
      playerVisible: entry.playerVisible !== false && !/《我狠狠控制》APP里选中/.test(entry.playerText || ''),
      thinking: this.normalizeNovelThinking(entry.thinking),
    }));
  },

  legacyLogText(entry) {
    return `${entry.speaker || '记录'}：${entry.text || ''}`;
  },

  extractStreamingField(raw, field) {
    const text = String(raw || '').replace(/```(?:json)?|```/g, '');
    const match = text.match(new RegExp(`"${field}"\\s*:\\s*"([\\s\\S]*)`));
    if (!match) return '';
    let value = match[1];
    const end = value.search(/"\s*,\s*"(?:thinking|narration|speech|mind|mood|trust|resistance|quest|characterIntent|controlFeeling|controlAdaptation|controlExperienceSummary|metricUpdates|choices|appearedCharacters|statChanges|combatEvent)"/);
    if (end >= 0) value = value.slice(0, end);
    value = value.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\').trim();
    return value.length ? value : '';
  },
});
