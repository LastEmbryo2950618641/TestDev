window.GameModules = window.GameModules || {};

window.GameModules.initPromptRegistry = {
  prompts: {},
  executed: {},

  loadExecuted(store = null) {
    const saved = store?.playerIdentityState?.()?.values?.initPromptExecuted;
    if (saved && typeof saved === 'object') this.executed = { ...this.executed, ...saved };
  },

  saveExecuted(store = null) {
    const state = store?.playerIdentityState?.();
    if (!state?.values) return;
    state.values.initPromptExecuted = { ...(state.values.initPromptExecuted || {}), ...this.executed };
  },

  parse(text = '') {
    const raw = String(text || '');
    const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    const meta = {};
    if (match) match[1].split(/\n+/).forEach((line) => {
      const at = line.indexOf(':');
      if (at > 0) meta[line.slice(0, at).trim()] = line.slice(at + 1).trim();
    });
    return { name: meta.name || '', description: meta.description || '', body: match ? match[2].trim() : raw.trim(), raw };
  },

  register(id, source = {}) {
    const text = typeof source === 'string' ? source : source.prompt;
    if (!id || !text) return;
    const parsed = this.parse(text);
    const templateKey = typeof source === 'object' ? source.templateKey : '';
    const template = templateKey ? window.GameModules.initTemplateSources?.[templateKey] : null;
    this.prompts[id] = { id, templateKey, template, ...parsed };
  },

  pending(prefix = '', store = null) {
    if (!Object.keys(this.prompts).length) this.registerAll(prefix);
    this.loadExecuted(store);
    return Object.values(this.prompts).filter((item) => {
      if (prefix && !String(item.id).startsWith(prefix)) return false;
      return !this.executed[item.id];
    });
  },

  markExecuted(ids = [], store = null) {
    const list = Array.isArray(ids) ? ids : [ids];
    const changed = [];
    list.filter(Boolean).forEach((id) => {
      if (!this.executed[id]) changed.push(id);
      this.executed[id] = true;
    });
    this.saveExecuted(store);
    return changed;
  },

  markByInitUpdates(updates = [], store = null) {
    if (!Array.isArray(updates) || !updates.length) return [];
    const pending = this.pending('', store);
    const matched = pending.filter((item) => updates.some((update) => {
      const promptId = update.initPromptId || update.promptId || update.registryId;
      if (promptId && promptId === item.id) return true;
      const templateKey = update.templateKey || update.template;
      if (templateKey && templateKey === item.templateKey) return true;
      const section = String(update.section || '');
      const title = String(item.template?.title || item.name || item.id || '');
      return section && title && (section.includes(title) || title.includes(section));
    })).map((item) => item.id);
    return this.markExecuted(matched, store);
  },

  targetState(store, update = {}) {
    const subject = update.subject || {};
    const id = subject.characterId || subject.playerId || subject.id || update.target || 'player-self';
    return store?.itemSkillState?.(id) || (id === 'player-self' ? store?.playerIdentityState?.() : null);
  },

  async apply(store, updates = []) {
    const applied = [];
    for (const update of Array.isArray(updates) ? updates : []) {
      const fields = update?.fields;
      const state = this.targetState(store, update);
      if (!state?.values || !fields || typeof fields !== 'object') continue;
      Object.entries(fields).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        state.values[key] = this.clone(value);
      });
      applied.push(update);
      await window.GameModules.sqliteSave.saveCharacterState?.(state);
    }
    this.markByInitUpdates(applied, store);
    return applied;
  },

  clone(value) {
    return JSON.parse(JSON.stringify(value));
  },

  template(key = '') {
    return window.GameModules.initTemplateSources?.[key] || window.GameModules.initDefaults?.[key] || null;
  },

  defaultValue(templateKey = '', method = '') {
    const template = this.template(templateKey);
    return template?.[method] ? template[method]() : null;
  },

  ensureTemplateState(templateKey = '', state = {}) {
    return Boolean(this.template(templateKey)?.ensure?.(state));
  },

  fields(templateKey = '', state = {}) {
    return this.template(templateKey)?.uiFields?.(state) || this.template(templateKey)?.fields?.(state) || [];
  },

  async applyGeneric(store, updates = []) {
    const changed = new Set();
    for (const update of Array.isArray(updates) ? updates : []) {
      const state = this.targetState(store, update);
      if (!state?.values) continue;
      const templates = Object.values(window.GameModules.initTemplateSources || {});
      const matched = templates.find((template) => template?.applyUpdate?.(state, update));
      if (matched) changed.add(state.id);
    }
    for (const id of changed) {
      const state = store.rpgStates?.[id] || window.GameModules.sqliteSave.getCharacterState?.(id);
      if (!state) continue;
      store.rpgStates = { ...(store.rpgStates || {}), [id]: state };
      await window.GameModules.sqliteSave.saveCharacterState?.(state);
    }
  },

  registerAll(prefix = '') {
    this.prompts = {};
    const sources = window.GameModules.initPromptSources || {};
    Object.entries(sources).forEach(([key, source]) => {
      if (prefix && !String(key).startsWith(prefix)) return;
      this.register(key, source);
    });
  },

  selectByNames(names = [], store = null) {
    const wanted = new Set((names || []).map((name) => String(name || '').trim()).filter(Boolean));
    return this.pending('', store).filter((item) => wanted.has(item.id) || wanted.has(item.templateKey) || wanted.has(item.name));
  },

  skillSummaries(store = null) {
    return this.pending('', store).map((item) => `- ${item.name || item.id}：${item.description || item.template?.title || ''}`).join('\n');
  },

  skillText(ids = null, store = null) {
    const selected = Array.isArray(ids) ? this.selectByNames(ids, store) : this.pending(String(ids || ''), store);
    return selected.map((item) => {
      const templateText = item.template?.promptText?.() || '';
      return [`## ${item.name || item.id}`, item.body, templateText].filter(Boolean).join('\n\n');
    }).filter(Boolean).join('\n\n');
  },

  schema(ids = null, store = null) {
    const result = { initUpdates: [] };
    const selected = Array.isArray(ids) ? this.selectByNames(ids, store) : this.pending(String(ids || ''), store);
    selected.forEach((item) => {
      const schema = item.template?.jsonFormat?.();
      if (Array.isArray(schema?.initUpdates)) result.initUpdates.push(...schema.initUpdates);
    });
    return result;
  },
};
