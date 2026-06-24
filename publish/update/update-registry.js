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
  types: [], prompts: {}, skills: {},
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

  skillSummaries() {
    return this.types.map((type) => {
      const skill = this.skills[type.promptId] || {};
      const name = skill.name || type.id;
      const description = skill.description || type.description || type.section || '';
      return `- ${name}：${description}`;
    }).join('\n');
  },

  promptText() {
    const base = this.prompts['generic-update'] || '';
    const summaries = this.skillSummaries();
    return [base, summaries ? `## 可用更新 Skills 摘要\n\n${summaries}` : ''].filter(Boolean).join('\n\n');
  },

  skillText(ids = null) {
    const list = Array.isArray(ids) ? ids : [];
    const wanted = new Set(list.filter(Boolean));
    const selected = Array.isArray(ids) ? this.types.filter((type) => wanted.has(type.id) || wanted.has(type.promptId) || wanted.has(this.skills[type.promptId]?.name)) : this.types;
    return selected.map((type) => {
      const skill = this.skills[type.promptId] || {};
      const title = skill.name || type.id;
      const body = skill.body || this.prompts[type.promptId] || type.extraPrompt || '';
      return `## ${title}\n\n${body}`;
    }).filter(Boolean).join('\n\n');
  },

  selectByNames(names = []) {
    const wanted = new Set((names || []).map((name) => String(name || '').trim()).filter(Boolean));
    return this.types.filter((type) => wanted.has(type.id) || wanted.has(type.promptId) || wanted.has(this.skills[type.promptId]?.name));
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

  normalizeUpdates(raw = {}, store = null) {
    const base = Array.isArray(raw?.genericUpdates) ? raw.genericUpdates : [];
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
    return this.uniqueUpdates([...base, ...extras]).slice(0, 80);
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
    if (type?.card) return type.card(change, store);
    return this.defaultCard(change, store);
  },

  defaultCard(change = {}, store = null) {
    const subject = change.subject || {};
    const label = subject.name || subject.id || change.group || change.target || '';
    const playerName = store?.realWorldPlayerSettlementName?.() || '玩家';
    if (!label || label === 'player-self' || label === '玩家' || label === playerName) return { id: 'role:player-self', title: playerName, section: '角色卡' };
    return { id: `misc:${label}`, title: label, section: '其他' };
  },

  reasonText(update = {}, fallback = '现实推演结算。') {
    const reasons = typeof update.reasons === 'string' ? [update.reasons] : (Array.isArray(update.reasons) ? update.reasons : []);
    return reasons
      .map((item) => String(typeof item === 'string' ? item : (item?.evidence || item?.trigger || item?.reason || '')).trim())
      .filter(Boolean)
      .join('；').slice(0, 240) || String(update.reason || fallback).slice(0, 240);
  },

  rowFromGeneric(update = {}, store = null) {
    const card = this.cardForChange(update, store);
    const change = update.change || {};
    const rawValue = change.value ?? change.toValue ?? change.mode ?? '';
    return {
      at: new Date().toISOString(), cardId: card.id, cardTitle: card.title, section: card.section,
      field: update.field || update.updateType || '通用更新', name: update.name || this.leafName(update.field) || change.mode || '',
      value: rawValue && typeof rawValue === 'object' ? JSON.stringify(rawValue) : rawValue,
      reason: this.reasonText(update),
      applied: true,
    };
  },

  leafName(path = '') {
    const parts = String(path || '').split('.').filter(Boolean);
    return parts.at(-1) || '';
  },
};
