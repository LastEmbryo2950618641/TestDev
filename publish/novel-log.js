/**
 * 小说记录：玩家行动、作者叙事与可折叠心理。
 */
window.GameModules = window.GameModules || {};

Object.assign(window.GameModules.actions, {
  addNovelEntry(playerText) {
    const entry = {
      id: this.nextId++,
      kind: 'novel',
      type: this.online ? 'player' : 'advice',
      playerText,
      storyText: '作者正在续写这一段剧情…',
      thinking: '',
      speech: '',
      mind: '',
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

  updateNovelStream(id, raw) {
    const thinking = this.thinkingMode ? this.extractStreamingField(raw, 'thinking') : '';
    const text = this.extractStreamingField(raw, 'narration');
    const patch = { streaming: true };
    if (thinking) {
      patch.thinking = thinking;
      patch.thinkingOpen = true;
    }
    if (text) patch.storyText = text;
    this.updateNovelEntry(id, patch);
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
    return value.length > 6 ? value : '';
  },
});
