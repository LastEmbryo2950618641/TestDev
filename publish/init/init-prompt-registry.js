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

  register(id, text) {
    if (!id || !text) return;
    this.prompts[id] = { id, ...this.parse(text) };
  },

  registerAll() {
    this.register('real-world-init', window.GameModules.initPrompts?.realWorldInit || '');
  },

  skillText() {
    if (!Object.keys(this.prompts).length) this.registerAll();
    return Object.values(this.prompts).map((item) => `## ${item.name || item.id}\n\n${item.body}`).filter(Boolean).join('\n\n');
  },

  schema() {
    return { initUpdates: [] };
  },
};
