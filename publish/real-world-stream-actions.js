window.GameModules = window.GameModules || {};
window.GameModules.realWorldStreamActions = {
  updateRealWorldStream(id, raw) {
    const entry = (this.realWorldLog || []).find((item) => item.id === id);
    if (!entry) return false;
    const utils = window.GameModules.jsonUtils;
    const thinking = this.thinkingMode ? (utils?.pickStringField?.(raw, 'thinking') || '') : '';
    const narration = utils?.pickStringField?.(raw, 'narration') || '';
    const patch = { streaming: true };
    let changed = !entry.streaming;
    if (thinking && thinking !== entry.thinking) { patch.thinking = thinking; changed = true; }
    if (narration && narration !== entry.narration) { patch.narration = narration; changed = true; }
    if (!changed) return false;
    this.realWorldLog = this.realWorldLog.map((item) => (item.id === id ? { ...item, ...patch } : item));
    return true;
  },
};
