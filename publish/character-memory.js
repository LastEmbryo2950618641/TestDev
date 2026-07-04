/**
 * 人物记忆：分层短期/长期/归档上下文。
 */
window.GameModules = window.GameModules || {};

window.GameModules.characterMemory = {
  limits: { recent: 1200, summaryBuffer: 1600, summarized: 900, forgotten: 500, vivid: 1200, permanent: 800, archiveHits: 5, vividThreshold: 60, permanentThreshold: 88, summaryTargetChars: 180 },

  async contextFor(store, action) {
    const debug = window.GameModules.debug;
    const token = debug?.start?.('[记忆上下文] 组装', { characterId: store.characterRpgState?.id, actionLength: String(action || '').length });
    const state = store.characterRpgState;
    if (!state) return '暂无人物记忆。';
    const memory = this.ensure(state.id);
    const archive = await this.queryArchive(state.id, `${action} ${store.sceneTitle} ${store.quest} ${store.mindText}`);
    memory.archive = this.archiveStats(state.id);
    const text = this.format(memory, archive);
    debug?.done?.(token, { archiveHits: archive.length, contextLength: text.length });
    return text;
  },

  ensure(characterId) {
    const raw = window.GameModules.sqliteSave.getCharacterMemory(characterId);
    const memory = this.normalize(raw, characterId);
    memory.archive = this.archiveStats(characterId);
    return memory;
  },

  normalize(raw, characterId) {
    const base = { characterId, version: 2, shortTerm: { recent: [], summaryBuffer: [], summarized: [], forgotten: [] }, longTerm: { vivid: [], permanent: [] }, archive: { indexCount: 0, itemCount: 0 }, updatedAt: new Date().toISOString() };
    if (!raw) return base;
    if (raw.version === 2) return { ...base, ...raw, shortTerm: { ...base.shortTerm, ...(raw.shortTerm || {}) }, longTerm: { ...base.longTerm, ...(raw.longTerm || {}) } };
    return { ...base, shortTerm: { ...base.shortTerm, recent: (raw.shortTerm || []).map((x) => this.legacyItem(x, 'short')) }, longTerm: { ...base.longTerm, vivid: (raw.longTerm || []).map((x) => this.legacyItem(x, 'long')) }, updatedAt: raw.updatedAt || base.updatedAt };
  },

  legacyItem(item, source) {
    const text = item.text || item.summary || '';
    return this.withTokens({ id: item.id || `mem_legacy_${window.GameModules.rpgState.seed(text)}`, time: { label: `旧记忆/第${item.turn || '?'}回合`, value: null }, place: item.scene || item.title || '旧场景', text, summary: item.summary || text.slice(0, 120), impression: source === 'long' ? 65 : 35, source, sourceIds: [], linkedLongTermId: '', createdAt: item.createdAt || new Date().toISOString() });
  },

  archiveStats(characterId) {
    const count = window.GameModules.sqliteSave.listMemoryArchives(characterId).length;
    return { indexCount: count, itemCount: count };
  },

  stats(items, maxTokens) {
    const tokens = (items || []).reduce((sum, item) => sum + (item.tokens || this.estimateTokens(this.itemText(item))), 0);
    return { count: (items || []).length, tokens, maxTokens };
  },

  format(memory, archive) {
    const s = memory.shortTerm; const l = memory.longTerm;
    return [
      '人物记忆状态：',
      this.statLine('刚发生记忆', this.stats(s.recent, this.limits.recent)),
      this.statLine('归纳总结区', this.stats(s.summaryBuffer, this.limits.summaryBuffer)),
      this.statLine('近发生记忆', this.stats(s.summarized, this.limits.summarized)),
      this.statLine('难以忘记的记忆', this.stats(l.vivid, this.limits.vivid)),
      this.statLine('不可忘记的记忆', this.stats(l.permanent, this.limits.permanent)),
      this.statLine('遗忘区', this.stats(s.forgotten, this.limits.forgotten)),
      `记忆归档：当前索引 ${memory.archive.indexCount} / 当前条目 ${memory.archive.itemCount}，本次命中 ${archive.length}`,
      '', this.section('刚发生记忆', s.recent), this.section('近发生记忆', s.summarized),
      this.section('难以忘记的记忆', l.vivid), this.section('不可忘记的记忆', l.permanent), this.archiveSection(archive),
    ].join('\n');
  },

  statLine(name, stat) { return `${name}：当前 ${stat.count} 条 / ${stat.tokens} token / 可用 ${stat.maxTokens} token`; },
  section(name, items) { return `${name}：\n${(items || []).map((x) => `- ${this.itemText(x)}`).join('\n') || '无'}`; },
  archiveSection(items) { return `记忆归档检索结果：\n${items.map((x) => `- ${x.meta?.time || '时间未知'}｜${x.meta?.place || '地点未知'}｜印象${x.meta?.impression ?? '?'}｜${x.meta?.summary || x.text}`).join('\n') || '无'}`; },
  itemText(item) { return `${item.time?.label || '时间未知'}｜${item.place || '地点未知'}｜印象${item.impression ?? 0}｜${item.summary || item.text || ''}`; },

  withTokens(item) {
    const next = { ...item };
    next.tokens = this.estimateTokens(`${this.itemText(next)}\n${next.text || ''}`);
    return next;
  },

  estimateTokens(text) {
    const s = String(text || '');
    const han = (s.match(/[\u4e00-\u9fff]/g) || []).length;
    const words = (s.match(/[a-zA-Z0-9_]+/g) || []).reduce((n, w) => n + Math.ceil(w.length / 4), 0);
    return Math.ceil(han * 0.65 + words + s.length / 18);
  },

  gameTime(store) {
    const value = this.timeValue(store.entryTime);
    const label = value ? `${value.year}年${value.month}月${value.day}日 ${String(value.hour).padStart(2, '0')}:${String(value.minute).padStart(2, '0')}:${String(value.second).padStart(2, '0')}` : (store.entryTimeLabel?.() || '时间未知');
    return { label, value };
  },

  timeValue(entryTime) {
    const get = (key) => Number(String(entryTime?.[key] || '').match(/\d+/)?.[0]);
    const value = { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute'), second: get('second') };
    return Object.values(value).every(Number.isFinite) ? value : null;
  },

  archiveItem(characterId, memory, detailText) {
    const createdAt = new Date().toISOString();
    const text = detailText || memory.text || memory.summary || '';
    return { id: `${characterId}-${createdAt}-${window.GameModules.rpgState.seed(text)}`, text, vector: this.vectorize(`${memory.summary || ''} ${text}`), meta: { time: memory.time?.label, place: memory.place, summary: memory.summary, impression: memory.impression, sourceIds: memory.sourceIds || [memory.id] }, createdAt };
  },

  async queryArchive(characterId, rawQuery) {
    const query = await this.intentQuery(rawQuery);
    const qv = this.vectorize(query);
    return window.GameModules.sqliteSave.listMemoryArchives(characterId).map((item) => ({ ...item, score: this.cosine(qv, item.vector) })).sort((a, b) => b.score - a.score).slice(0, this.limits.archiveHits);
  },

  async intentQuery(rawQuery) {
    try {
      if (!window.dzmm?.completions) return rawQuery;
      const prompt = await window.GameModules.renderPrompt('memory-intent-query', { 玩家输入: rawQuery });
      const buffer = await window.GameModules.aiRequest.complete({ source: 'memory-intent-query', model: window.GameModules.aiRequest?.selectedTextModel?.(), prompt, timeoutMs: 60000, ...(window.GameModules.promptSkills?.completionOptions?.('memory-intent-query') || { jsonMode: false, outputLimitKind: 'other' }) });
      return buffer.trim() || rawQuery;
    } catch (err) {
      console.warn('记忆检索意图解析失败:', err.code, err.message);
      return rawQuery;
    }
  },

  vectorize(text) {
    const vector = Array(64).fill(0);
    const tokens = String(text || '').match(/[\p{Script=Han}]|[a-zA-Z0-9_]+/gu) || [];
    for (const token of tokens) vector[window.GameModules.rpgState.seed(token) % vector.length] += Math.max(1, token.length);
    return vector;
  },

  cosine(a, b) {
    let dot = 0; let an = 0; let bn = 0;
    for (let i = 0; i < a.length; i += 1) { dot += a[i] * (b[i] || 0); an += a[i] ** 2; bn += (b[i] || 0) ** 2; }
    return dot / (Math.sqrt(an) * Math.sqrt(bn) || 1);
  },
};
