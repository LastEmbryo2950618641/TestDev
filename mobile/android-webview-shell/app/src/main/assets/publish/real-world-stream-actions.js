window.GameModules = window.GameModules || {};
window.GameModules.realWorldStreamActions = {
  updateRealWorldStream(id, raw, options = {}) {
    const entry = (this.realWorldLog || []).find((item) => item.id === id) || window.GameModules.realWorldLogStore?.get?.(id);
    if (!entry) return false;
    const pick = (key) => this.pickRealWorldStreamField(raw, key);
    const thinking = this.realWorldThinkMode ? (pick('thinking') || '') : '';
    const narration = this.realWorldStreamNarration(raw, pick);
    const streamTrace = this.realWorldStreamTrace(raw, pick);
    const patch = { streaming: true };
    let changed = !entry.streaming;
    if (thinking && thinking !== entry.thinking) { patch.thinking = thinking; changed = true; }
    if (narration && narration !== entry.narration) { patch.narration = narration; changed = true; }
    if (streamTrace.length && JSON.stringify(streamTrace) !== JSON.stringify(entry.streamTrace || [])) { patch.streamTrace = streamTrace; changed = true; }
    if (!changed) return false;
    return this.patchRealWorldLogEntry?.(id, patch, { live: Boolean(options.live) }) || false;
  },

  realWorldStreamNarration(raw = '', pick = () => '') {
    const text = String(raw || '');
    const sep = window.GameModules.realWorldAgentLoop?.finalSeparator || '<!--REAL_WORLD_JSON-->';
    const sepAt = text.indexOf(sep);
    if (sepAt >= 0) return this.formatRealWorldStreamNarration(text.slice(0, sepAt));
    const field = pick('narration');
    if (field) return this.formatRealWorldStreamNarration(field);
    const trimmed = text.trim();
    if (!trimmed || trimmed.startsWith('{') || trimmed.startsWith('```')) return '';
    const markerAt = text.indexOf('<!--REAL_WORLD_JSON');
    return this.formatRealWorldStreamNarration(markerAt >= 0 ? text.slice(0, markerAt) : text);
  },

  formatRealWorldStreamNarration(value = '') {
    return window.GameModules.realWorldAi?.formatNarration?.(value, 100) || String(value || '').trim();
  },

  pickRealWorldStreamField(raw = '', key = '') {
    const next = 'type|thinking|reason|narration|sceneTitle|locationName|parentLocationName|locationDescription|status|quest|choices|characters|requests|mapNodes|newLocations|locationDescriptionUpdates|elapsedSeconds|metricUpdates|genericUpdates|lexiconUpdates';
    const text = String(raw || '');
    const loose = text.match(new RegExp(`"${key}"\\s*:\\s*"([\\s\\S]*?)(?:"\\s*,\\s*"(?:${next})"\\s*:|"\\s+"(?:${next})"\\s*:|"\\s*[,}])`));
    if (loose) return loose[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim();
    const strict = text.match(new RegExp(`"${key}"\\s*:\\s*"([^"\\\\]*(?:\\\\.[^"\\\\]*)*)`));
    return strict ? strict[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim() : '';
  },

  realWorldStreamTrace(raw = '', pick = () => '') {
    const type = pick('type');
    const reason = pick('reason');
    const lines = ['姝ラ杩涜涓綔姝ｅ湪鎺ㄦ紨'];
    if (type) lines[0] = `姝ラ杩涜涓綔${this.realWorldTraceType?.(type) || type}`;
    if (reason) lines.push(`鍘熷洜锛?{reason}`);
    if (!reason && !type && String(raw || '').trim()) lines.push('姝ｅ湪鎺ユ敹鐜板疄 AI 鐨勬帹婕斿唴瀹广€?);
    return lines;
  },
};
