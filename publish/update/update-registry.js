window.GameModules = window.GameModules || {};
window.GameModules.updateRules = window.GameModules.updateRules || {};
window.GameModules.updateRules.sexualExperience = {
  partPrompts: {
    genital: '仅在成人身份且明确稳定事实确认该部位相关经历时计数；禁止过程描写。',
    chest: '仅记录成人抽象经历中胸部相关次数，不记录触碰细节或感官描写。',
    lips: '仅记录接吻或唇部相关抽象次数，不展开亲密过程。',
    mouth: '仅记录口部相关抽象次数；如会变成露骨过程，必须跳过。',
    oralAction: '仅记录成人抽象口部行为次数，不描述动作、过程或感官细节。',
    oralSex: '仅记录成人抽象口交次数，不描述动作、过程或感官细节。',
    oralInternalFinish: '仅记录成人抽象口交中出次数，只作计数，不写过程、体液或感官描写。',
    genitalEntry: '仅记录成人抽象阴部进入次数，不描述进入过程、姿势或感官细节。',
    vaginalInsertion: '仅记录成人抽象阴部插入次数，不描述进入过程、姿势或感官细节。',
    vaginalInternalFinish: '仅记录成人抽象阴部中出次数，只作计数，不写过程、体液或感官描写。',
    anus: '仅在成人身份且明确事实确认时记录肛门相关次数，不写具体行为。',
    analEntry: '仅记录成人抽象肛部进入次数，不描述进入过程、姿势或感官细节。',
    analSex: '仅记录成人抽象肛交次数，不描述动作、过程或感官细节。',
    analInternalFinish: '仅记录成人抽象肛交中出次数，只作计数，不写过程、体液或感官描写。',
    legs: '记录腿部相关亲密接触的抽象次数，保持中性统计。',
    hips: '记录臀部相关抽象次数，避免任何露骨描述。',
    hands: '记录手部相关次数，只作统计。',
    skin: '记录皮肤接触相关抽象次数，避免感官化描述。',
    other: '其他无法归类但合规的成人抽象经历次数。',
  },
};

window.GameModules.updateRegistry = {
  types: [], prompts: {}, skills: {}, uis: {},
  skillAliases: {
    'emotional-feeling-wearing.updateEmotionFeelingWearing': ['emotion', 'feeling'],
  },
  operations: ['delta', 'set', 'append', 'remove', 'merge', 'upsert', 'create', 'delete', 'transfer', 'link', 'unlink'],

  parseSkill(text = '') {
    const raw = String(text || '');
    const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    const meta = {};
    if (match) match[1].split(/\n+/).forEach((line) => {
      const at = line.indexOf(':');
      if (at > 0) meta[line.slice(0, at).trim()] = line.slice(at + 1).trim();
    });
    return { name: meta.name || '', description: meta.description || '', body: match ? match[2].trim() : raw.trim(), raw };
  },

  registerPrompt(id, text) {
    if (!id || !text) return;
    const skill = this.parseSkill(text);
    this.prompts[id] = skill.body || String(text);
    this.skills[id] = { id, ...skill };
  },

  register(type) {
    if (!type?.id) return;
    this.types = this.types.filter((item) => item.id !== type.id).concat(type);
  },

  registerUi(id, ui) {
    if (!id || !ui) return;
    this.uis[id] = ui;
  },

  uiForChange(change = {}) {
    const type = this.typeForChange(change);
    return type?.ui || this.uis[type?.id] || null;
  },

  skillSummaries() {
    return this.types.map((type) => {
      const skill = this.skills[type.promptId] || {};
      const description = skill.description || type.description || type.section || '';
      return `- ${type.id}：${description}`;
    }).join('\n');
  },

  promptText() {
    const base = this.prompts['generic-update'] || '';
    const summaries = this.skillSummaries();
    return [base, summaries ? `## 可用更新 Skills 摘要\n\n${summaries}` : ''].filter(Boolean).join('\n\n');
  },

  skillText(ids = null) {
    const wanted = this.normalizedSkillNameSet(ids);
    const selected = Array.isArray(ids) ? this.types.filter((type) => wanted.has(type.id) || wanted.has(type.promptId) || wanted.has(this.skills[type.promptId]?.name)) : this.types;
    return selected.map((type) => {
      const skill = this.skills[type.promptId] || {};
      const title = skill.name || type.id;
      const body = skill.body || this.prompts[type.promptId] || type.extraPrompt || '';
      return `## ${title}\n\n${body}`;
    }).filter(Boolean).join('\n\n');
  },

  skillsText(ids = null) {
    return this.skillText(ids);
  },

  selectByNames(names = []) {
    const wanted = this.normalizedSkillNameSet(names);
    return this.types.filter((type) => wanted.has(type.id) || wanted.has(type.promptId) || wanted.has(this.skills[type.promptId]?.name));
  },

  canonicalSkillIds(names = []) {
    const wanted = this.normalizedSkillNameSet(names);
    return this.types
      .filter((type) => wanted.has(type.id) || wanted.has(type.promptId) || wanted.has(this.skills[type.promptId]?.name))
      .map((type) => type.id);
  },

  normalizedSkillNameSet(names = []) {
    const out = new Set();
    for (const raw of Array.isArray(names) ? names : []) {
      const name = String(raw || '').trim();
      if (!name) continue;
      const aliases = this.skillAliases?.[name] || [];
      [name, ...aliases].forEach((item) => out.add(item));
      const dotted = name.match(/^([a-z0-9-]+)\.[A-Za-z0-9_]+$/u)?.[1];
      if (dotted) out.add(dotted);
    }
    return out;
  },

  schemaFor(ids = null) {
    const selected = Array.isArray(ids) ? this.selectByNames(ids) : this.types;
    return { genericUpdates: selected.flatMap((type) => type.examples || []) };
  },

  schema() {
    return { genericUpdates: this.types.flatMap((type) => type.examples || []) };
  },

  genericLike(raw = {}, keys = []) {
    return keys.flatMap((key) => (Array.isArray(raw?.[key]) ? raw[key] : []))
      .filter((item) => item && typeof item === 'object' && item.field && item.change && typeof item.change === 'object');
  },

  ensureNormalizedUpdates(raw = {}, store = null) {
    if (raw?._genericUpdatesNormalized) return Array.isArray(raw.genericUpdates) ? raw.genericUpdates : [];
    return this.normalizeUpdates(raw, store);
  },

  finalizeGenericUpdates(payload = {}, rawUpdates = {}, store = null) {
    const migrated = this.migrateLegacyFactionUpdates?.(payload) || payload;
    if (migrated._genericUpdatesNormalized) return migrated;
    return {
      ...migrated,
      genericUpdates: this.normalizeUpdates({ ...rawUpdates, genericUpdates: migrated.genericUpdates ?? payload.genericUpdates }, store) || [],
      _genericUpdatesNormalized: true,
    };
  },

  normalizeUpdates(raw = {}, store = null) {
    const base = Array.isArray(raw?.genericUpdates) ? raw.genericUpdates.map((item) => this.normalizeUpdateAlias(item)) : [];
    const legacyMetrics = this.metricGenericFromLegacy?.(raw, store) || [];
    const extras = [];
    this.types.forEach((type) => {
      if (typeof type.normalize !== 'function') return;
      try {
        const items = type.normalize(raw, store) || [];
        if (Array.isArray(items)) extras.push(...items);
      } catch (err) {
        console.warn(`[UpdateRegistry] ${type.id} normalize failed:`, err.message, err.stack);
      }
    });
    return window.GameModules.orgTerritory?.dedupeOrgTerritoryUpdates?.(
      window.GameModules.characterGoalUpdates?.coalesce?.(
        window.GameModules.characterScheduleUpdates?.coalesce?.(
          this.uniqueUpdates([...base, ...legacyMetrics, ...extras]),
        ) || this.uniqueUpdates([...base, ...legacyMetrics, ...extras]),
      ) || window.GameModules.characterScheduleUpdates?.coalesce?.(
        this.uniqueUpdates([...base, ...legacyMetrics, ...extras]),
      ) || this.uniqueUpdates([...base, ...legacyMetrics, ...extras]),
      store,
    ).slice(0, 80) || window.GameModules.characterGoalUpdates?.coalesce?.(
      window.GameModules.characterScheduleUpdates?.coalesce?.(
        this.uniqueUpdates([...base, ...legacyMetrics, ...extras]),
      ) || this.uniqueUpdates([...base, ...legacyMetrics, ...extras]),
    ).slice(0, 80) || this.uniqueUpdates([...base, ...legacyMetrics, ...extras]).slice(0, 80);
  },

  normalizeUpdateAlias(update = {}) {
    if (!update || typeof update !== 'object') return update;
    const value = update.change?.value;
    const hasSexualCountValue = value && typeof value === 'object' && !Array.isArray(value) && (value.totalDelta !== undefined || value.partKey || value.parts);
    const looksLikeSexualExperience = hasSexualCountValue && (/^intimacy(?:\.|$)/u.test(String(update.field || '')) || update.updateType === 'intimacy-body');
    if (!looksLikeSexualExperience || update.updateType === 'sexual-experience') return update;
    return { ...update, updateType: 'sexual-experience', field: update.field === 'intimacy.bodyStatus' ? 'intimacy.sexualExperienceParts' : update.field };
  },

  uniqueUpdates(updates = []) {
    const seen = new Set();
    return (Array.isArray(updates) ? updates : []).filter((item) => {
      if (!item || typeof item !== 'object') return false;
      const key = JSON.stringify(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  },

  typeForChange(change = {}) {
    const text = `${change.updateType || ''} ${change.field || ''} ${change.section || ''} ${change.subject?.type || ''} ${change.group || ''}`;
    return this.types.find((type) => type.match?.(change, text)) || null;
  },

  cardForChange(change = {}, store = null) {
    const type = this.typeForChange(change);
    const card = type?.card ? type.card(change, store) : this.defaultCard(change, store);
    return this.normalizeCard(card, change, store);
  },

  normalizeCard(card = {}, change = {}, store = null) {
    const subject = change.subject || {};
    const candidates = [
      subject.characterId,
      subject.playerId,
      subject.id,
      subject.name,
      change.target,
      card.title,
      String(card.id || '').replace(/^role:/, ''),
    ].map((item) => String(item || '').trim()).filter(Boolean);
    let state = null;
    for (const key of candidates) {
      state = store?.itemSkillState?.(key) || window.GameModules.characterStateStore?.getByName?.(key) || null;
      if (state?.id) break;
    }
    if (!state?.id) return card;
    const title = store?.itemSkillStateLabel?.(state) || subject.name || card.title || state.id;
    return { ...card, id: `role:${state.id}`, title, section: '角色卡' };
  },

  normalizeSettlementCardRow(row = {}, store = null) {
    if (!row || typeof row !== 'object') return row;
    const card = this.normalizeCard(
      {
        id: row.cardId,
        title: row.cardTitle || row.group || row.name,
        section: row.section || '角色卡',
      },
      {
        subject: { id: row.subjectId, name: row.cardTitle || row.group || row.name },
        target: row.subjectId || row.group || row.name,
        field: row.field,
      },
      store,
    );
    return {
      ...row,
      rowKey: this.rowKeyPart(row.rowKey || row.id || this.settlementRowKey(row)),
      cardId: card.id || row.cardId,
      cardTitle: card.title || row.cardTitle || row.group,
      section: card.section || row.section || '角色卡',
      group: card.title || row.group,
    };
  },

  defaultCard(change = {}, store = null) {
    const subject = change.subject || {};
    const label = subject.name || subject.id || change.group || change.target || '';
    if (change.updateType === 'character-schedule') return { id: 'schedule:real-world', title: '人事安排', section: '人事安排' };
    const playerName = store?.realWorldPlayerSettlementName?.() || '玩家';
    if (!label || label === 'player-self' || label === '玩家' || label === playerName) return { id: 'role:player-self', title: playerName, section: '角色卡' };
    return { id: `misc:${label}`, title: label, section: '其他' };
  },

  reasonText(update = {}, fallback = '现实推演结算。') {
    const reasons = typeof update.reasons === 'string' ? [update.reasons] : (Array.isArray(update.reasons) ? update.reasons : []);
    return this.normalizeSettlementText(reasons
      .map((item) => String(typeof item === 'string' ? item : (item?.evidence || item?.trigger || item?.reason || '')).trim())
      .filter(Boolean)
      .join('；') || String(update.reason || update.evidence || update.trigger || update.description || update.summary || fallback)).slice(0, 240);
  },

  normalizeSettlementText(text = '') {
    if (text === null || text === undefined) return '';
    if (typeof text !== 'string') return text;
    let out = String(text).replace(/\s+/g, ' ').trim();
    if (!out) return '';
    out = out
      .replace(/,/g, '，')
      .replace(/;/g, '；')
      .replace(/!/g, '！')
      .replace(/\?/g, '？')
      .replace(/([\u4e00-\u9fff\d）」』])\s*\.\s*(?=[\u4e00-\u9fff「"'（]|$)/g, '$1。')
      .replace(/([\u4e00-\u9fffA-Za-z\d）」』])\s*:\s*(?=[\u4e00-\u9fff「"'（])/g, '$1：');
    out = out.replace(/([\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])/g, '$1');
    out = out.replace(/[。.!！?？]+[，,、]+/g, '。');
    out = out.replace(/([，。；：！？、])\s+/g, '$1');
    out = out.replace(/\s+([，。；：！？、])/g, '$1');
    return out.replace(/；{2,}/g, '；').trim();
  },

  displayValue(value) {
    if (value && typeof value === 'object') return JSON.stringify(value);
    return this.normalizeSettlementText(String(value ?? ''));
  },

  rowKeyPart(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch (_error) {
        return String(value);
      }
    }
    return String(value);
  },

  settlementRowKey(row = {}) {
    return [
      row.cardId || row.cardTitle || row.group || row.section || '',
      row.updateType || row.field || '',
      row.name || row.uiName || '',
      row.value ?? row.uiValue ?? '',
      row.reason || '',
      row.at || row.settlementAt || '',
    ].map((part) => this.rowKeyPart(part)).join('|');
  },

  decorateRow(row = {}) {
    const norm = (value) => (typeof value === 'string' ? this.normalizeSettlementText(value) : value);
    const detailLines = Array.isArray(row.detailLines) ? row.detailLines.map((line) => norm(line)).filter(Boolean) : [];
    return {
      ...row,
      rowKey: this.rowKeyPart(row.rowKey || row.id || this.settlementRowKey(row)),
      uiTitle: norm(row.uiTitle || row.field || row.group || row.section || '结算'),
      uiName: norm(row.uiName || row.name || ''),
      uiValue: norm(row.uiValue || this.displayValue(row.value)),
      value: norm(row.value),
      reason: norm(row.reason),
      settlementAt: norm(row.settlementAt || ''),
      detailLines,
    };
  },

  rowFromGeneric(update = {}, store = null, entry = null) {
    const card = this.cardForChange(update, store);
    const change = update.change || {};
    const ui = this.uiForChange(update);
    const rawValue = change.value ?? change.toValue ?? change.mode ?? '';
    const settlementAt = update.settlementAt || (change.value && typeof change.value === 'object' ? change.value.updatedAt : '') || entry?.time?.label || '';
    const row = {
      at: entry?.time?.iso || new Date().toISOString(),
      settlementAt,
      cardId: card.id, cardTitle: card.title, section: card.section,
      field: update.field || update.updateType || '通用更新', name: update.name || this.leafName(update.field) || change.mode || '',
      value: this.displayValue(rawValue),
      reason: this.reasonText(update),
      applied: true,
    };
    const patched = typeof ui?.row === 'function' ? { ...row, ...ui.row(update, store, row, entry) } : row;
    return this.decorateRow(patched);
  },

  settlementRows(entry = {}, store = null) {
    const keepSystemUpdate = (item) => {
      if (item?.updateType !== 'system') return true;
      const raw = item?.change?.value;
      const payload = this.systemRecordPayload?.(raw) || {};
      const key = payload.key || this.leafName?.(item.field) || '';
      const value = payload.value || '';
      return !this.isNarrativeSystemEvent?.(key, value);
    };
    return [
      ...(entry.characterCardChanges || []).map((item) => this.decorateRow(this.normalizeSettlementCardRow(item, store))),
      ...((entry.genericUpdates || []).filter(keepSystemUpdate).map((item) => this.decorateRow(this.normalizeSettlementCardRow(this.rowFromGeneric(item, store, entry), store))).filter(Boolean)),
    ];
  },

  settlementGroups(entry = {}, store = null) {
    const groups = new Map();
    for (const item of this.settlementRows(entry, store)) {
      const title = item.cardTitle || item.group || store?.realWorldSettlementGroup?.(item.field, item.name) || item.section || '其他';
      const id = item.cardId || `legacy:${title}`;
      if (!groups.has(id)) groups.set(id, { id, title, section: item.section || item.group || title, items: [] });
      groups.get(id).items.push(item);
    }
    return Array.from(groups.values());
  },

  leafName(path = '') {
    const parts = String(path || '').split('.').filter(Boolean);
    return parts.at(-1) || '';
  },
};
