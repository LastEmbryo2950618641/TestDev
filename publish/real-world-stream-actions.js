window.GameModules = window.GameModules || {};
window.GameModules.realWorldStreamActions = {
  updateRealWorldStream(id, raw) {
    const entry = (this.realWorldLog || []).find((item) => item.id === id);
    if (!entry) return false;
    const pick = (key) => this.pickRealWorldStreamField(raw, key);
    const thinking = this.realWorldThinkMode ? (pick('thinking') || '') : '';
    const narration = this.formatRealWorldStreamNarration(pick('narration') || '');
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

  formatRealWorldStreamNarration(value = '') {
    return window.GameModules.realWorldAi?.formatNarration?.(value, 100) || String(value || '').trim();
  },

  pickRealWorldStreamField(raw = '', key = '') {
    const next = 'type|thinking|reason|narration|sceneTitle|locationName|parentLocationName|locationDescription|status|quest|choices|characters|requests|mapNodes|newLocations|locationDescriptionUpdates|elapsedSeconds|metricUpdates|factionUpdates|lexiconUpdates';
    const text = String(raw || '');
    const loose = text.match(new RegExp(`"${key}"\\s*:\\s*"([\\s\\S]*?)(?:"\\s*,\\s*"(?:${next})"\\s*:|"\\s+"(?:${next})"\\s*:|"\\s*[,}])`));
    if (loose) return loose[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim();
    const strict = text.match(new RegExp(`"${key}"\\s*:\\s*"([^"\\\\]*(?:\\\\.[^"\\\\]*)*)`));
    return strict ? strict[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim() : '';
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
