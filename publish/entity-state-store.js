window.GameModules = window.GameModules || {};

window.GameModules.entityStateStore = {
  kind: '实体状态',

  currentWorldTag(store = null, fallback = '') {
    return String(fallback || store?.currentWorldTag?.() || store?.character?.work || window.GameModules.realWorld2026?.label || '2026 现代都市现实世界').trim();
  },

  isAvailable() {
    return Boolean(window.GameModules.lexiconStore?.isAvailable?.());
  },

  text(value = '') {
    return String(value ?? '').trim();
  },

  listValue(value, limit = 12) {
    if (Array.isArray(value)) return value.map((item) => this.text(item)).filter(Boolean).slice(0, limit);
    const text = this.text(value);
    return text ? [text] : [];
  },

  entityEntries(store = null, params = {}) {
    const worldTag = this.currentWorldTag(store, params.world || params.worldTag);
    return [
      ...(window.GameModules.lexiconStore?.list?.(worldTag, this.kind) || []),
      ...(window.GameModules.lexiconStore?.list?.('', this.kind) || []),
    ].filter((entry, index, arr) => arr.findIndex((item) => `${item.worldTag}:${item.kind}:${item.name}` === `${entry.worldTag}:${entry.kind}:${entry.name}`) === index);
  },

  entityRawText(entry = {}) {
    const value = entry.value || {};
    return [
      entry.name,
      value.name,
      (value.aliases || entry.aliases || []).join('、'),
      entry.summary,
      entry.description,
      value.description,
      (value.identityHints || []).join('、'),
      value.owner,
      value.currentLocation,
      value.container,
      value.currentState,
      value.status,
      (value.visibleFeatures || []).join('、'),
      value.usage,
      value.source,
      value.lastAction,
      (value.tags || []).join('、'),
      JSON.stringify(value.currentSnapshot || {}),
      JSON.stringify(value.stateHistory || []),
      JSON.stringify(value.historyAnchors || []),
    ].filter(Boolean).join('\n');
  },

  entityLine(entry = {}) {
    const value = entry.value || {};
    const name = value.name || entry.name || '未命名实体';
    const type = value.entityType || 'entity';
    const owner = value.owner ? `｜归属:${value.owner}` : '';
    const location = value.currentLocation ? `｜位置:${value.currentLocation}` : '';
    const container = value.container ? `｜容器:${value.container}` : '';
    const state = value.currentState || value.status || entry.summary || '状态未记录';
    return `- ${name}（${type}）${owner}${location}${container}｜${state}`;
  },

  entityDetail(entry = {}, { includeHistory = false, maxHistory = 5 } = {}) {
    const value = entry.value || {};
    const history = (value.stateHistory || value.historyAnchors || []).slice(-Math.max(0, Number(maxHistory) || 0));
    return [
      `实体：${value.name || entry.name || '未命名实体'}`,
      `类型：${value.entityType || 'entity'}`,
      `说明：${value.description || entry.description || '暂无说明'}`,
      `指认特征：${(value.identityHints || []).join('、') || '无'}`,
      `归属/持有人：${value.owner || '未知'}`,
      `当前位置：${value.currentLocation || '未知'}`,
      `容器/依附对象：${value.container || '无'}`,
      `当前状态：${value.currentState || value.status || '未知'}`,
      value.quantity !== undefined && value.quantity !== null ? `数量：${value.quantity}` : '',
      value.memberCount !== undefined && value.memberCount !== null ? `成员数：${value.memberCount}` : '',
      value.activity ? `当前活动：${value.activity}` : '',
      value.affiliation ? `归属/依附：${value.affiliation}` : '',
      `用途：${value.usage || '未知'}`,
      `外观/识别特征：${(value.visibleFeatures || []).join('、') || '无'}`,
      `来源：${value.source || '未知'}`,
      `最近动作：${value.lastAction || '无'}`,
      `标签：${(value.tags || []).join('、') || '无'}`,
      includeHistory ? `历史状态链：\n${history.map((item) => this.historyLine(item)).join('\n') || '无'}` : '',
    ].filter(Boolean).join('\n');
  },

  historyLine(item = {}) {
    const time = item.time || item.at || '时间未知';
    const code = item.code || item.statusCode || 'STATE_CHANGED';
    const summary = item.stateSummary || item.summary || item.reason || JSON.stringify(item.state || item.currentSnapshot || {});
    const anchors = [
      item.action,
      item.actor,
      item.owner,
      item.location,
      item.container,
      ...(Array.isArray(item.keywords) ? item.keywords.slice(0, 6) : []),
    ].filter(Boolean).join('、');
    return `  - ${time}｜${code}｜${summary}${anchors ? `｜锚点:${anchors}` : ''}`;
  },

  search(store = null, params = {}) {
    const keyword = this.text(params.keyword || params.name || params.entityName);
    const owner = this.text(params.owner);
    const location = this.text(params.location || params.currentLocation);
    const container = this.text(params.container);
    const usage = this.text(params.usage);
    const tags = this.listValue(params.tags);
    const entries = this.entityEntries(store, params);
    const rows = entries
      .map((entry) => ({ entry, score: this.matchScore(entry, { keyword, owner, location, container, usage, tags }) }))
      .filter((row) => row.score > 0 || (!keyword && !owner && !location && !container && !usage && !tags.length))
      .sort((a, b) => b.score - a.score);
    return rows.map((row) => row.entry);
  },

  searchText(store = null, params = {}, { includeHistory = false, limit = 8 } = {}) {
    const rows = this.search(store, params).slice(0, Math.max(1, Number(limit) || 8));
    if (!rows.length) return '未命中实体状态。';
    return rows.map((entry) => includeHistory ? this.entityDetail(entry, { includeHistory, maxHistory: 8 }) : this.entityLine(entry)).join('\n\n');
  },

  contextText(store = null, action = '', max = 1600) {
    const keyword = this.text(action).slice(0, 80);
    const rows = (keyword ? this.search(store, { keyword }) : this.entityEntries(store, {})).slice(0, 12);
    const text = rows.map((entry) => this.entityLine(entry)).join('\n');
    return this.limit(text || '暂无实体状态记录。', max);
  },

  limit(text = '', max = 1600) {
    const raw = String(text || '');
    const n = Math.max(1, Number(max) || 1600);
    return raw.length > n ? `${raw.slice(0, n)}…` : raw;
  },

  normalizedCore(entity = {}, store = null) {
    const name = this.text(entity.name || entity.entityName || entity.title || '未命名实体').slice(0, 80);
    const entityType = this.text(entity.entityType || entity.type || 'other').slice(0, 32) || 'other';
    const worldTag = this.currentWorldTag(store, entity.worldTag || entity.world);
    const aliases = this.listValue(entity.aliases || entity.alias || entity['别名'], 8);
    const identityHints = this.listValue(entity.identityHints || entity.identity || entity['指认特征'], 12);
    const visibleFeatures = this.listValue(entity.visibleFeatures || entity.features || entity['外观特征'], 12);
    const tags = this.listValue(entity.tags || entity.keywords || entity['标签'], 12);
    return {
      worldTag,
      entityType,
      name,
      aliases,
      description: this.text(entity.description || entity.summary || entity['实体说明']).slice(0, 500),
      identityHints,
      owner: this.text(entity.owner || entity.holder || entity['归属'] || entity['持有人']).slice(0, 80),
      currentLocation: this.text(entity.currentLocation || entity.location || entity['当前位置']).slice(0, 160),
      container: this.text(entity.container || entity.attachedTo || entity['容器']).slice(0, 120),
      currentState: this.text(entity.currentState || entity.state || entity.status || entity['当前状态']).slice(0, 500),
      quantity: this.normalizeNullableNumber(entity.quantity ?? entity.count ?? entity['数量']),
      visibleFeatures,
      usage: this.text(entity.usage || entity.purpose || entity['用途']).slice(0, 160),
      source: this.text(entity.source || entity.origin || entity['来源']).slice(0, 160),
      lastAction: this.text(entity.lastAction || entity.action || entity['最近动作']).slice(0, 160),
      tags,
      memberCount: this.normalizeNullableNumber(entity.memberCount ?? entity.size ?? entity['成员数']),
      membersKnown: this.listValue(entity.membersKnown || entity.members || entity['已知成员'], 30),
      composition: this.text(entity.composition || entity['组成说明']).slice(0, 260),
      activity: this.text(entity.activity || entity['当前活动']).slice(0, 260),
      affiliation: this.text(entity.affiliation || entity['归属势力'] || entity['依附对象']).slice(0, 160),
      leader: this.text(entity.leader || entity['负责人']).slice(0, 80),
      confidence: this.text(entity.confidence || entity['置信度'] || 'confirmed').slice(0, 32),
      reason: this.text(entity.reason || entity.evidence || entity['原因']).slice(0, 260),
    };
  },

  normalizeNullableNumber(value) {
    if (value === undefined || value === null || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  },

  stableSignature(core = {}) {
    return [
      core.worldTag,
      core.entityType,
      core.name,
      core.owner,
      core.usage,
      core.source,
      ...(core.aliases || []),
      ...(core.identityHints || []),
      ...(core.visibleFeatures || []),
    ].map((item) => String(item || '').trim()).filter(Boolean).join('|').toLowerCase();
  },

  storageName(core = {}, entries = [], existing = null) {
    if (existing?.name) return existing.name;
    const qualifiers = [core.owner, core.usage, core.source, core.currentLocation, core.container, core.visibleFeatures?.[0]].filter(Boolean);
    const base = qualifiers.length ? `${core.name}（${qualifiers.slice(0, 2).join('·')}）` : core.name;
    let candidate = base.slice(0, 120);
    let index = 2;
    const names = new Set(entries.map((entry) => entry.name));
    while (names.has(candidate)) {
      candidate = `${base.slice(0, 110)}·${index}`;
      index += 1;
    }
    return candidate;
  },

  matchScore(entry = {}, query = {}) {
    const value = entry.value || {};
    const raw = this.entityRawText(entry);
    let score = 0;
    if (query.keyword && raw.includes(query.keyword)) score += 3;
    if (query.keyword && (String(value.name || entry.name || '').includes(query.keyword) || (value.aliases || entry.aliases || []).some((alias) => String(alias).includes(query.keyword)))) score += 4;
    if (query.owner && String(value.owner || '').includes(query.owner)) score += 5;
    if (query.location && String(value.currentLocation || '').includes(query.location)) score += 3;
    if (query.container && String(value.container || '').includes(query.container)) score += 3;
    if (query.usage && String(value.usage || '').includes(query.usage)) score += 3;
    for (const tag of query.tags || []) if (raw.includes(tag)) score += 1;
    return score;
  },

  findExisting(core = {}, entries = []) {
    const signature = this.stableSignature(core);
    const exact = entries.find((entry) => String(entry.value?.entityKey || '') === signature);
    if (exact) return exact;
    const rows = entries.map((entry) => ({
      entry,
      score: this.matchScore(entry, {
        keyword: core.name,
        owner: core.owner,
        location: core.currentLocation,
        container: core.container,
        usage: core.usage,
        tags: [...(core.identityHints || []), ...(core.visibleFeatures || []), ...(core.tags || [])],
      }),
    })).sort((a, b) => b.score - a.score);
    return rows[0]?.score >= 8 ? rows[0].entry : null;
  },

  buildHistoryAnchor(core = {}, entity = {}, store = null) {
    const now = [store?.phoneDateText?.(), store?.phoneTimeText?.()].filter(Boolean).join(' ').trim() || new Date().toISOString();
    const provided = entity.historyAnchor || entity.anchor || null;
    const action = this.text(provided?.action || entity.historyAction || core.lastAction || entity.action);
    const code = this.text(provided?.code || entity.historyCode || entity.code || this.inferHistoryCode(action, core)).slice(0, 48);
    const keywords = [
      core.name,
      core.owner,
      core.currentLocation,
      core.container,
      core.usage,
      action,
      ...(core.tags || []),
      ...(core.identityHints || []),
    ].filter(Boolean).slice(0, 16);
    return {
      time: this.text(provided?.time || entity.time || entity.at || now).slice(0, 48),
      code: code || 'STATE_CHANGED',
      action: action.slice(0, 80),
      actor: this.text(provided?.actor || entity.actor || entity.subject || '').slice(0, 80),
      owner: core.owner,
      location: core.currentLocation,
      container: core.container,
      relatedEntities: this.listValue(provided?.relatedEntities || entity.relatedEntities || [core.name, core.container].filter(Boolean), 12),
      keywords,
      stateSummary: this.text(provided?.stateSummary || entity.stateSummary || core.currentState || core.lastAction || core.description).slice(0, 260),
      reason: core.reason || '本轮上下文确认实体状态变化。',
    };
  },

  inferHistoryCode(action = '', core = {}) {
    const text = `${action}\n${core.currentState || ''}\n${core.lastAction || ''}`;
    if (/放入|放进|收进|装进|置入/u.test(text)) return 'PLACED_IN_CONTAINER';
    if (/取出|拿出|移出/u.test(text)) return 'REMOVED_FROM_CONTAINER';
    if (/交给|转交|递给|给了/u.test(text)) return 'TRANSFERRED';
    if (/丢失|遗失|找不到/u.test(text)) return 'LOST';
    if (/移动|搬到|来到|转移|移至/u.test(text)) return core.entityType === 'group' ? 'GROUP_MOVED' : 'MOVED';
    if (/人数|成员|增加|减少|聚集|散开/u.test(text)) return 'GROUP_SIZE_CHANGED';
    if (/解散|分流/u.test(text)) return 'GROUP_DISBANDED';
    if (/数量|消耗|新增|减少/u.test(text)) return 'QUANTITY_CHANGED';
    return 'STATE_CHANGED';
  },

  mergeEntity(entity = {}, existing = null, store = null, entries = []) {
    const core = this.normalizedCore(entity, store);
    if (!core.name) return null;
    const oldValue = existing?.value || {};
    const entityKey = oldValue.entityKey || this.stableSignature(core);
    const anchor = this.buildHistoryAnchor(core, entity, store);
    const stateHistory = [...(oldValue.stateHistory || []), anchor].slice(-80);
    const historyAnchors = [...(oldValue.historyAnchors || []), anchor].slice(-80);
    const value = {
      ...oldValue,
      entityKey,
      entityType: core.entityType || oldValue.entityType || 'other',
      name: core.name || oldValue.name,
      aliases: this.mergeList(oldValue.aliases, core.aliases),
      description: core.description || oldValue.description || '',
      identityHints: this.mergeList(oldValue.identityHints, core.identityHints),
      owner: core.owner || oldValue.owner || '',
      currentLocation: core.currentLocation || oldValue.currentLocation || '',
      container: core.container || oldValue.container || '',
      currentState: core.currentState || oldValue.currentState || oldValue.status || '',
      quantity: core.quantity ?? oldValue.quantity ?? null,
      visibleFeatures: this.mergeList(oldValue.visibleFeatures, core.visibleFeatures),
      usage: core.usage || oldValue.usage || '',
      source: core.source || oldValue.source || '',
      lastAction: core.lastAction || oldValue.lastAction || '',
      tags: this.mergeList(oldValue.tags, core.tags),
      memberCount: core.memberCount ?? oldValue.memberCount ?? null,
      membersKnown: this.mergeList(oldValue.membersKnown, core.membersKnown, 60),
      composition: core.composition || oldValue.composition || '',
      activity: core.activity || oldValue.activity || '',
      affiliation: core.affiliation || oldValue.affiliation || '',
      leader: core.leader || oldValue.leader || '',
      confidence: core.confidence || oldValue.confidence || 'confirmed',
      currentSnapshot: {
        owner: core.owner || oldValue.owner || '',
        currentLocation: core.currentLocation || oldValue.currentLocation || '',
        container: core.container || oldValue.container || '',
        currentState: core.currentState || oldValue.currentState || oldValue.status || '',
        quantity: core.quantity ?? oldValue.quantity ?? null,
        memberCount: core.memberCount ?? oldValue.memberCount ?? null,
        activity: core.activity || oldValue.activity || '',
      },
      recentHistory: stateHistory.slice(-5),
      stateHistory,
      historyAnchors,
      lastUpdatedAt: anchor.time,
    };
    const name = this.storageName(core, entries, existing);
    const summary = core.currentState || core.description || oldValue.currentState || oldValue.description || `${core.name}的实体状态`;
    return {
      worldTag: core.worldTag,
      kind: this.kind,
      name,
      summary: String(summary).slice(0, 160),
      description: String(core.description || oldValue.description || summary).slice(0, 500),
      value,
      aliases: value.aliases || [],
      related: value.tags || [],
      promptInstruction: `遇到“${value.name}”时按实体状态库定位：先看归属、位置、容器、用途、外观特征和历史状态链，避免与同名实体混淆。`.slice(0, 260),
      source: 'ai',
      aiGenerated: true,
      meta: {
        ...(existing?.meta || {}),
        scope: 'runtime-entity',
        entityType: value.entityType,
        modifyReason: core.reason || anchor.reason,
      },
    };
  },

  mergeList(left = [], right = [], limit = 24) {
    const out = [];
    for (const item of [...(Array.isArray(left) ? left : []), ...(Array.isArray(right) ? right : [])]) {
      const text = this.text(item);
      if (text && !out.includes(text)) out.push(text);
      if (out.length >= limit) break;
    }
    return out;
  },

  async applyEntities(store = null, entities = []) {
    if (!this.isAvailable() || !Array.isArray(entities) || !entities.length) return [];
    const entries = this.entityEntries(store, {});
    const changed = [];
    for (const entity of entities) {
      const core = this.normalizedCore(entity, store);
      if (!core.name) continue;
      const existing = this.findExisting(core, [...entries, ...changed]);
      const merged = this.mergeEntity(entity, existing, store, [...entries, ...changed]);
      if (!merged) continue;
      changed.push(merged);
    }
    if (changed.length) await window.GameModules.lexiconStore?.saveMany?.(changed);
    return changed;
  },
};
