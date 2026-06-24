window.GameModules = window.GameModules || {};

window.GameModules.initPromptRegistry = {
  prompts: {},

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

  registerAll(prefix = '') {
    this.prompts = {};
    const sources = window.GameModules.initPromptSources || {};
    Object.entries(sources).forEach(([key, source]) => {
      if (prefix && !String(key).startsWith(prefix)) return;
      this.register(key, source);
    });
  },

  skillText(prefix = '') {
    if (!Object.keys(this.prompts).length) this.registerAll(prefix);
    return Object.values(this.prompts).map((item) => {
      const templateText = item.template?.promptText?.() || '';
      return [`## ${item.name || item.id}`, item.body, templateText].filter(Boolean).join('\n\n');
    }).filter(Boolean).join('\n\n');
  },

  schema(prefix = '') {
    if (!Object.keys(this.prompts).length) this.registerAll(prefix);
    const result = { initUpdates: [] };
    Object.values(this.prompts).forEach((item) => {
      const schema = item.template?.jsonFormat?.();
      if (Array.isArray(schema?.initUpdates)) result.initUpdates.push(...schema.initUpdates);
    });
    return result;
  },
};
