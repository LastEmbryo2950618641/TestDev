window.GameModules = window.GameModules || {};

window.GameModules.initPromptRegistry = {
  prompts: {},
  executed: {},
  ui: {},
registerUi(templateKey, ui = {}) {
    if (!templateKey || !ui) return;
    this.ui[templateKey] = { ...(this.ui[templateKey] || {}), ...ui };
  },
uiFor(templateKey = '') {
    return this.ui[templateKey] || {};
  },
loadExecuted(store = null) {
    const saved = store?.playerIdentityState?.()?.values?.initPromptExecuted;
    if (saved && typeof saved === 'object') this.executed = { ...this.executed, ...saved };
  },
saveExecuted(store = null) {
    const state = store?.playerIdentityState?.();
    if (state?.values) state.values.initPromptExecuted = { ...(state.values.initPromptExecuted || {}), ...this.executed };
  },
parse(text = '') {
    const raw = String(text || ''), match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/), meta = {};
    if (match) match[1].split(/\n+/).forEach((line) => { const at = line.indexOf(':'); if (at > 0) meta[line.slice(0, at).trim()] = line.slice(at + 1).trim(); });
    return { name: meta.name || '', description: meta.description || '', body: match ? match[2].trim() : raw.trim(), raw };
  },
register(id, source = {}) {
    const text = typeof source === 'string' ? source : source.prompt;
    if (!id || !text) return;
    const templateKey = typeof source === 'object' ? source.templateKey : '';
    this.prompts[id] = { id, templateKey, template: templateKey ? window.GameModules.initTemplateSources?.[templateKey] : null, ...this.parse(text) };
  },
pending(prefix = '', store = null) {
    if (!Object.keys(this.prompts).length) this.registerAll(prefix);
    this.loadExecuted(store);
    return Object.values(this.prompts).filter((item) => (!prefix || String(item.id).startsWith(prefix)) && !this.executed[item.id]);
  },
markExecuted(ids = [], store = null) {
    const changed = [];
    (Array.isArray(ids) ? ids : [ids]).filter(Boolean).forEach((id) => { if (!this.executed[id]) changed.push(id); this.executed[id] = true; });
    this.saveExecuted(store);
    return changed;
  },
markByInitUpdates(updates = [], store = null) {
    if (!Array.isArray(updates) || !updates.length) return [];
    const matched = this.pending('', store).filter((item) => updates.some((update) => {
      const promptId = update.initPromptId || update.promptId || update.registryId, templateKey = update.templateKey || update.template;
      if ((promptId && promptId === item.id) || (templateKey && templateKey === item.templateKey)) return true;
      const section = String(update.section || ''), title = String(item.template?.title || item.name || item.id || '');
      return section && title && (section.includes(title) || title.includes(section));
    })).map((item) => item.id);
    return this.markExecuted(matched, store);
  },
targetState(store, update = {}) {
    const subject = update.subject || {};
    const rawId = subject.characterId || subject.playerId || subject.id || update.target || 'player-self';
    const id = window.GameModules.updateRegistry?.normalizeSubjectId?.(store, rawId, subject) || rawId;
    return store?.itemSkillState?.(id) || (id === 'player-self' ? store?.playerIdentityState?.() : null);
  },
async apply(store, updates = []) {
    const applied = [];
    for (const update of Array.isArray(updates) ? updates : []) {
      const fields = update?.fields, state = this.targetState(store, update);
      if (!state?.values || !fields || typeof fields !== 'object') continue;
      const templateKey = this.templateKeyForUpdate(update, store);
      if (templateKey) this.ensureTemplateState(templateKey, state);
      Object.entries(fields).forEach(([key, value]) => this.applyField(state.values, key, this.markInitializedValue(templateKey, key, value)));
      applied.push(update);
      await window.GameModules.characterStateStore?.save?.(state);
    }
    this.markByInitUpdates(applied, store);
    return applied;
  },
  templateKeyForUpdate(update = {}, store = null) {
    const direct = update.templateKey || update.template;
    if (direct && this.template(direct)) return direct;
    const promptId = update.initPromptId || update.promptId || update.registryId;
    if (promptId && this.prompts[promptId]?.templateKey) return this.prompts[promptId].templateKey;
    return this.pending('', store).find((item) => {
      const title = String(item.template?.title || item.name || item.id || ''), section = String(update.section || '');
      return section && title && (section.includes(title) || title.includes(section));
    })?.templateKey || '';
  },
  applyField(values = {}, key = '', value) {
    if (value === undefined || value === null) return;
    const current = values[key];
    if (current && typeof current === 'object' && !Array.isArray(current) && value && typeof value === 'object' && !Array.isArray(value)) values[key] = this.deepMerge(current, value);
    else values[key] = this.clone(value);
  },
  markInitializedValue(templateKey = '', key = '', value) {
    if (templateKey !== 'intimacyBody' || !value || typeof value !== 'object' || Array.isArray(value)) return value;
    const next = this.clone(value);
    if (key === 'intimacy') return { ...next, initializedByAi: true, source: 'AI初始化' };
    if (key !== 'bodyStatus') return value;
    Object.keys(next).forEach((partKey) => {
      if (next[partKey] && typeof next[partKey] === 'object' && !Array.isArray(next[partKey])) next[partKey] = { ...next[partKey], initializedByAi: true, source: 'AI初始化' };
    });
    return next;
  },
  deepMerge(base, patch) {
    const next = this.clone(base);
    Object.entries(patch || {}).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (next[key] && typeof next[key] === 'object' && !Array.isArray(next[key]) && value && typeof value === 'object' && !Array.isArray(value)) next[key] = this.deepMerge(next[key], value);
      else next[key] = this.clone(value);
    });
    return next;
  },
clone(value) { return JSON.parse(JSON.stringify(value ?? null)); },
  template(key = '') { return window.GameModules.initTemplateSources?.[key] || window.GameModules.initDefaults?.[key] || null; },
  parts(path = '') { return String(path || '').split('.').filter(Boolean); },
  get(obj, path = '', fallback = undefined) { return this.parts(path).reduce((acc, key) => acc?.[key], obj) ?? fallback; },
  set(obj, path = '', value) { const keys = this.parts(path), last = keys.pop(), target = keys.reduce((acc, key) => (acc[key] = acc[key] || {}), obj); target[last] = value; },
mergeMissing(target, defaults) {
    if (!target || typeof target !== 'object' || Array.isArray(target)) return this.clone(defaults);
    let changed = false;
    Object.entries(defaults || {}).forEach(([key, value]) => {
      if (target[key] === undefined || target[key] === null) { target[key] = this.clone(value); changed = true; }
      else if (value && typeof value === 'object' && !Array.isArray(value)) changed = this.mergeMissing(target[key], value) || changed;
    });
    return changed;
  },
defaultValue(templateKey = '', key = '') {
    const template = this.template(templateKey), def = template?.stateDefaults?.find((item) => item.key === key || item.path === key);
    if (!template || !def) return null;
    return typeof template[def.factory] === 'function' ? template[def.factory]() : this.clone(this.get(template, def.factory));
  },
  markPendingInit(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
    const next = { ...this.clone(value), pendingAiInit: true, initializedByAi: false, source: '妯℃澘鍗犱綅' };
    Object.keys(next).forEach((partKey) => {
      if (next[partKey] && typeof next[partKey] === 'object' && !Array.isArray(next[partKey])) next[partKey] = { ...next[partKey], pendingAiInit: true, initializedByAi: false, source: '妯℃澘鍗犱綅' };
    });
    return next;
  },
ensureTemplateState(templateKey = '', state = {}) {
    const template = this.template(templateKey);
    if (!template || !state?.values) return false;
    let changed = false;
    (template.stateDefaults || []).forEach((def) => {
      const value = this.defaultValue(templateKey, def.key), current = this.get(state.values, def.path);
      if (current === undefined || current === null) { this.set(state.values, def.path, templateKey === 'intimacyBody' && (def.path === 'bodyStatus' || def.path === 'intimacy') ? this.markPendingInit(value) : value); changed = true; }
      else if (value && typeof value === 'object') changed = this.mergeMissing(current, value) || changed;
    });
    return changed;
  },
fieldRows(template, def, raw, initial) {
    const empty = template.valueDefaults?.empty || '--';
    if (raw === undefined || raw === null) return { value: empty, raw: '', initialMeeting: initial ?? empty };
    if (def.display === 'count') return { value: `${Number(raw) || 0}${def.unit || ''}`, raw: Number(raw) || 0, initialMeeting: `${Number(initial) || 0}${def.unit || ''}` };
    if (def.display === 'list') return { value: Array.isArray(raw) && raw.length ? raw : [template.displayTexts?.[def.emptyText] || empty], raw: Array.isArray(raw) ? raw : [], initialMeeting: initial || empty };
    if (def.display === 'sexPartRows') return this.sexPartRows(template, def, raw, initial);
    if (def.display === 'bodyStatusRows') return this.bodyStatusRows(template, def, raw, initial);
    return { value: raw || empty, raw, initialMeeting: initial ?? empty };
  },
sexPartRows(template, def, raw = {}, initial = {}) {
    const rows = Object.entries(template[def.labels] || {}).map(([key, name]) => {
      const count = Number(raw?.[key]) || 0, initialCount = Number(initial?.[key]) || 0;
      return { partKey: key, name, count, initialCount, laterCount: Math.max(0, count - initialCount), prompt: template.sexPartPrompts?.[key] || template.sexPartPrompts?.other || '', type: template.fieldMeta?.[def.meta]?.kind };
    });
    return { value: rows.map((item) => template.formatExperienceSplit?.(item) || ((item.name || '') + '：' + (item.count ?? ''))), raw: rows, initialMeeting: rows.map((item) => template.formatInitialExperience?.(item) || ((item.name || '') + '：' + (item.initialCount ?? ''))) };
  },
bodyStatusRows(template, def, raw = {}, initial = {}) {
    const rows = Object.values(raw || {}).map((item) => ({ ...item, name: item.part || item.partKey, type: template.fieldMeta?.[def.meta]?.kind }));
    return { value: rows.map((item) => template.formatBodyStatus?.(item) || ((item.part || item.partKey || '') + '：' + (item.status || '--'))), raw: rows, initialMeeting: Object.values(initial || {}).map((item) => template.formatInitialBody?.(item) || ((item.part || '') + '：' + (item.status || ''))) };
  },
fields(templateKey = '', state = {}) {
    const template = this.template(templateKey);
    if (!template || !state?.values) return [];
    const initial = template.initialMeeting?.() || {}, p = state.profile || {}, base = { stateId: state.id || '', worldTag: p.work || state.worldTag || '原创世界', targetType: p.isPlayer ? '非角色' : '角色', commonField: true };
    return (template.uiFieldDefs || []).map((def) => {
      const meta = template.fieldMeta?.[def.meta] || {}, shown = this.fieldRows(template, def, this.get(state.values, def.path), this.get(initial, def.initialPath));
      return { key: def.key, templateKey, ...meta, ...base, ...shown, reason: this.get(state.values, `${def.path}.reason`) || this.get(state.values, 'intimacy.reason') || meta.reasonFallback || '' };
    });
  },
registerAll(prefix = '') { this.prompts = {}; Object.entries(window.GameModules.initPromptSources || {}).forEach(([key, source]) => { if (!prefix || String(key).startsWith(prefix)) this.register(key, source); }); },
  selectByNames(names = [], store = null) { const wanted = this.normalizedSkillNameSet(names); return this.pending('', store).filter((item) => wanted.has(item.id) || wanted.has(item.templateKey) || wanted.has(item.name)); },
  canonicalSkillIds(names = [], store = null) { const wanted = this.normalizedSkillNameSet(names); return this.pending('', store).filter((item) => wanted.has(item.id) || wanted.has(item.templateKey) || wanted.has(item.name)).map((item) => item.id); },
  normalizedSkillNameSet(names = []) {
    const out = new Set();
    for (const raw of Array.isArray(names) ? names : []) {
      const name = String(raw || '').trim();
      if (!name) continue;
      out.add(name);
      const dotted = name.match(/^([a-z0-9-]+)\.[A-Za-z0-9_]+$/u)?.[1];
      if (dotted) out.add(dotted);
    }
    return out;
  },
  skillSummaries(store = null) { return this.pending('', store).map((item) => `- ${item.id}锛?{item.description || item.template?.title || ''}`).join('\n'); },
  skillText(ids = null, store = null) { const selected = Array.isArray(ids) ? this.selectByNames(ids, store) : this.pending(String(ids || ''), store); return selected.map((item) => [`## ${item.name || item.id}`, item.body, item.template?.promptText?.() || ''].filter(Boolean).join('\n\n')).filter(Boolean).join('\n\n'); },
  schema(ids = null, store = null) { const result = { initUpdates: [] }, selected = Array.isArray(ids) ? this.selectByNames(ids, store) : this.pending(String(ids || ''), store); selected.forEach((item) => { const schema = item.template?.jsonFormat?.(); if (Array.isArray(schema?.initUpdates)) result.initUpdates.push(...schema.initUpdates); }); return result; },
};

