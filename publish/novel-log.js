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
      speech: '',
      mind: '',
      mindOpen: false,
      streaming: true,
    };
    this.log.push(entry);
    if (this.log.length > 40) this.log.shift();
    this.scrollLog();
    return entry.id;
  },

  updateNovelEntry(id, patch = {}) {
    const entry = this.log.find((item) => item.id === id);
    if (!entry) return;
    Object.assign(entry, patch);
    this.log = [...this.log];
    this.scrollLog();
  },

  updateNovelStream(id, raw) {
    const text = this.extractStreamingNarration(raw);
    if (text) this.updateNovelEntry(id, { storyText: text, streaming: true });
  },

  finalizeNovelEntry(id, result) {
    if (!id) return false;
    const entry = this.log.find((item) => item.id === id);
    if (!entry) return false;
    const speech = result.speech ? `\n\n「${result.speech}」` : '';
    this.updateNovelEntry(id, {
      storyText: `${result.narration || '剧情继续向前推进。'}${speech}`,
      mind: result.mind || '',
      streaming: false,
    });
    return true;
  },

  toggleNovelMind(id) {
    const entry = this.log.find((item) => item.id === id);
    if (!entry) return;
    entry.mindOpen = !entry.mindOpen;
    this.log = [...this.log];
  },

  legacyLogText(entry) {
    return `${entry.speaker || '记录'}：${entry.text || ''}`;
  },

  extractStreamingNarration(raw) {
    const text = String(raw || '').replace(/```(?:json)?|```/g, '');
    const match = text.match(/"narration"\s*:\s*"([\s\S]*)/);
    if (!match) return '';
    let value = match[1];
    const end = value.search(/"\s*,\s*"(?:speech|mind|mood|trust|resistance|quest|characterIntent|controlFeeling|controlAdaptation|controlExperienceSummary|metricUpdates|choices|appearedCharacters|statChanges|combatEvent)"/);
    if (end >= 0) value = value.slice(0, end);
    value = value.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\').trim();
    return value.length > 8 ? value : '';
  },
});
