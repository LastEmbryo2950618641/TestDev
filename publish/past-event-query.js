window.GameModules = window.GameModules || {};

window.GameModules.pastEventQuery = {
  query(store = null, method = '', params = {}) {
    if (method !== 'searchPastEvent') return this.search(store, params);
    return this.search(store, params);
  },

  search(store = null, params = {}) {
    const keys = this.keywords(params);
    const refs = this.recentReferenceIndex(store);
    const scored = this.sources(store, params).map((row) => this.withReference(this.score(row, keys, params), refs));
    const matched = scored.filter((row) => row.score > 0 || !keys.length);
    const rows = matched.length ? matched : scored;
    rows.sort((a, b) => b.score - a.score || String(b.time || '').localeCompare(String(a.time || '')));
    const picked = this.pick(rows, Number(params.maxChars) || 5000);
    const confidence = this.confidence(matched.length ? picked : [], keys);
    return [
      `过去事件查询：${keys.join('、') || '最近记录'}`,
      `准确度：${confidence.label}｜${confidence.reason}`,
      `回复策略：${confidence.reply}`,
      matched.length ? '命中资料：' : (picked.length ? '命中资料：无；以下为全文候选，仅可用于判断不确定或反问，不可当作准确记忆。' : '命中资料：无'),
      ...picked.map((row, index) => this.formatPickedRow(row, index)),
    ].join('\n\n');
  },

  formatPickedRow(row, index) {
    return `## ${index + 1}. ${row.source}｜${row.title}\n时间：${row.time || '未知'}\n匹配：${row.score}｜关键词：${row.hitKeys.join('、') || '无'}\n${this.rowOutputText(row)}`;
  },

  rowOutputText(row = {}) {
    if (!row.reference) return row.text;
    return [`文本内容参照${row.reference.id}(唯一id)`, `参照对象：${row.reference.label}`].join('\n');
  },

  keywords(params = {}) {
    const raw = [params.question, params.keyword, params.timeHint, params.characterName, params.locationName, ...(Array.isArray(params.keywords) ? params.keywords : [])].filter(Boolean).join(' ');
    return [...new Set(String(raw).split(/[\s,，。！？；、"“”'‘’（）()]+/).map((x) => x.trim()).filter((x) => x.length >= 2).slice(0, 12))];
  },

  sources(store = null, params = {}) {
    return [
      ...this.realRows(),
      ...this.worldlineRows(store, params),
      ...this.memoryRows(store, params),
      ...this.wechatRows(store, params),
    ];
  },

  realRows() {
    try {
      return (window.GameModules.realWorldLogStore?.listRecent?.(600) || []).map((entry) => this.row('现实日志', entry.sceneTitle || entry.locationName || entry.id, entry.time?.label || entry.createdAt, `${entry.text || ''}\n${entry.narration || ''}\n${entry.thinking || ''}`, entry));
    } catch (_) { /* 忽略表不存在 */ }
    return [];
  },

  worldlineRows(store = null, params = {}) {
    const lines = [];
    const addLine = (tag, line = {}) => {
      (line.events || []).forEach((event) => lines.push(this.row(`世界线:${tag}`, event.name || event.eventId || event.id, event.time, `${event.summary || ''}\n${event.detail || ''}\n${JSON.stringify(event)}`, event)));
      (line.plots || []).forEach((plot) => lines.push(this.row(`情节归纳:${tag}`, plot.情节标题 || plot.情节名称 || plot.情节编号 || plot.id, plot.情节时间段, `${plot.情节总结 || plot.摘要 || ''}\n${plot.重要片段 || ''}\n${JSON.stringify(plot)}`, plot)));
    };
    try { addLine('现实世界', store?.realWorldline?.()); } catch (_) { /* ignore */ }
    (store?.savedWorldLores || []).forEach((lore) => addLine(lore.worldTag || params.worldTag || '未知世界', lore.worldline || {}));
    return lines;
  },

  memoryRows(store = null, params = {}) {
    const ids = this.memoryIds(store, params);
    const rows = [];
    ids.forEach((id) => {
      const memory = window.GameModules.characterMemory?.ensure?.(id);
      if (!memory) return;
      const pools = [['刚发生记忆', memory.shortTerm?.recent], ['归纳中记忆', memory.shortTerm?.summaryBuffer], ['近发生记忆', memory.shortTerm?.summarized], ['遗忘区记忆', memory.shortTerm?.forgotten], ['难忘记忆', memory.longTerm?.vivid], ['永久记忆', memory.longTerm?.permanent]];
      pools.forEach(([name, list]) => (list || []).forEach((item) => rows.push(this.row(`${name}:${id}`, item.summary || item.id, item.time?.label, `${item.summary || ''}\n${item.text || ''}`, item))));
      (window.GameModules.characterMemoryStore?.listArchives?.(id) || []).forEach((item) => rows.push(this.row(`记忆归档:${id}`, item.meta?.summary || item.id, item.meta?.time || item.createdAt, item.text || item.meta?.summary || '', item)));
    });
    return rows;
  },

  memoryIds(store = null, params = {}) {
    const ids = new Set(['player-self']);
    [params.characterId, params.contactId].filter(Boolean).forEach((id) => ids.add(String(id)));
    const name = String(params.characterName || params.name || '').trim();
    Object.values(store?.rpgStates || {}).forEach((state) => {
      if (!name || state?.name === name || state?.profile?.name === name) ids.add(state.id);
    });
    return [...ids].filter(Boolean).slice(0, 8);
  },

  wechatRows(store = null, params = {}) {
    const rows = [];
    const wanted = String(params.contactId || params.characterId || '').trim();
    try {
      (window.GameModules.wechatHistoryStore?.listRecent?.(wanted, 300) || []).forEach((record) => {
        const msg = record.message || {};
        rows.push(this.row(`微信历史:${record.contactId}`, msg.side === 'self' ? '玩家消息' : (msg.name || '联系人消息'), msg.at || msg.atDisplay || record.createdAt, msg.imageRecord || msg.text || '', msg));
      });
    } catch (_) { /* 忽略表不存在 */ }
    Object.entries(store?.wechatMessagesByContact || {}).forEach(([id, list]) => {
      if (wanted && id !== wanted) return;
      (list || []).forEach((msg) => rows.push(this.row(`微信缓存:${id}`, msg.side === 'self' ? '玩家消息' : (msg.name || '联系人消息'), msg.at || msg.atDisplay, msg.imageRecord || msg.text || '', msg)));
    });
    return rows;
  },

  row(source, title, time, text, raw) { return { source, title: String(title || '未命名'), time: String(time || ''), text: String(text || ''), raw }; },

  stableId(raw = {}, fallback = '') {
    return String(raw.eventId || raw.id || raw.linkedLongTermId || raw.memoryId || fallback || '').trim();
  },

  normalizeText(text = '') {
    return String(text || '')
      .replace(/[\s\p{P}\p{S}]+/gu, '')
      .slice(0, 900);
  },

  textSimilarity(a = '', b = '') {
    const left = this.normalizeText(a);
    const right = this.normalizeText(b);
    if (!left || !right) return 0;
    if (left.includes(right.slice(0, Math.min(80, right.length))) || right.includes(left.slice(0, Math.min(80, left.length)))) return 1;
    const grams = (text) => {
      const out = new Set();
      for (let i = 0; i < text.length - 1; i += 1) out.add(text.slice(i, i + 2));
      return out;
    };
    const aSet = grams(left), bSet = grams(right);
    if (!aSet.size || !bSet.size) return 0;
    let hit = 0;
    aSet.forEach((gram) => { if (bSet.has(gram)) hit += 1; });
    return hit / Math.min(aSet.size, bSet.size);
  },

  recentReferenceIndex(store = null) {
    const line = store?.realWorldline?.() || {};
    const picked = [];
    let total = 0;
    for (const event of (line.events || []).slice().reverse()) {
      const text = `${event.summary || ''}\n${event.detail || ''}\n${JSON.stringify(event)}`;
      const nextTotal = total + text.length;
      if (nextTotal > 6000) break;
      picked.push(event);
      total = nextTotal;
      if (total >= 5000) break;
    }
    return picked.map((event) => {
      const id = this.stableId(event);
      const text = `${event.summary || ''}\n${event.detail || ''}\n${JSON.stringify(event)}`;
      return id ? { id, label: `${event.name || '世界线记录'}｜${event.time || '未知时间'}`, text } : null;
    }).filter(Boolean);
  },

  withReference(row = {}, refs = []) {
    const id = this.stableId(row.raw);
    const hit = refs.find((ref) => (id && ref.id === id) || this.textSimilarity(row.text, ref.text) >= 0.82);
    return hit ? { ...row, reference: hit } : row;
  },

  score(row, keys = [], params = {}) {
    const body = `${row.source}\n${row.title}\n${row.time}\n${row.text}`;
    const hitKeys = keys.filter((key) => body.includes(key));
    let score = hitKeys.reduce((sum, key) => sum + (body.split(key).length - 1), 0);
    if (params.characterName && body.includes(params.characterName)) score += 3;
    if (params.timeHint && body.includes(params.timeHint)) score += 3;
    return { ...row, score, hitKeys };
  },

  pick(rows = [], budget = 5000) {
    const out = [];
    let total = 0;
    for (const row of rows.slice(0, 30)) {
      out.push(row);
      total += row.text.length + row.title.length + 80;
      if (total >= budget) break;
    }
    return out;
  },

  confidence(rows = [], keys = []) {
    const best = rows[0]?.score || 0;
    const needed = Math.max(3, Math.ceil(keys.length * 0.6));
    if (!rows.length || best <= 0) return { label: '无命中', reason: '没有找到可依据的过去事件。', reply: '按角色性格承认忘记或表示没有必要记得，不要编造。' };
    if (best >= needed + 2) return { label: '高', reason: '多个关键词命中过去资料，可直接确认事件。', reply: '按角色性格说“你说的是那件事呀……”并引用命中事实。' };
    if (best >= needed) return { label: '中', reason: '命中部分关键词，但仍可能有歧义。', reply: '按角色性格先确认“你说的是那件事？”再克制复述。' };
    return { label: '低', reason: '只有弱关键词命中，不能确定具体事件。', reply: '按角色性格说“有些记不得了/你指哪件事？”不要把弱命中当事实。' };
  },
};
