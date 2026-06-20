window.GameModules = window.GameModules || {};
window.GameModules.realWorldStreamActions = {
  updateRealWorldStream(id, raw) {
    const entry = (this.realWorldLog || []).find((item) => item.id === id);
    if (!entry) return false;
    const utils = window.GameModules.jsonUtils;
    const pick = (key) => (utils?.pickStringField?.(raw, key) || this.pickRealWorldStreamField(raw, key));
    const thinking = this.thinkingMode ? (pick('thinking') || '') : '';
    const narration = pick('narration') || '';
    const streamTrace = this.realWorldStreamTrace(raw, pick);
    const patch = { streaming: true };
    let changed = !entry.streaming;
    if (thinking && thinking !== entry.thinking) { patch.thinking = thinking; changed = true; }
    if (narration && narration !== entry.narration) { patch.narration = narration; changed = true; }
    if (streamTrace.length && JSON.stringify(streamTrace) !== JSON.stringify(entry.streamTrace || [])) { patch.streamTrace = streamTrace; changed = true; }
    if (!changed) return false;
    this.realWorldLog = this.realWorldLog.map((item) => (item.id === id ? { ...item, ...patch } : item));
    return true;
  },

  pickRealWorldStreamField(raw = '', key = '') {
    const match = String(raw || '').match(new RegExp(`"${key}"\\s*:\\s*"([^"\\\\]*(?:\\\\.[^"\\\\]*)*)`));
    return match ? match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim() : '';
  },

  realWorldStreamTrace(raw = '', pick = () => '') {
    const type = pick('type');
    const reason = pick('reason');
    const lines = ['步骤进行中｜正在推演'];
    if (type) lines[0] = `步骤进行中｜${this.realWorldTraceType?.(type) || type}`;
    if (reason) lines.push(`原因：${reason}`);
    if (!reason && !type && String(raw || '').trim()) lines.push('正在接收现实 AI 的推演内容。');
    return lines;
  },
};
