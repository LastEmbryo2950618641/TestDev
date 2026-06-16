window.GameModules = window.GameModules || {};

window.GameModules.skillLoader = {
  manifest: 'skills/manifest.json',
  loaded: false,

  async load() {
    if (this.loaded) return window.GameModules.skillsDefinitions || [];
    this.loaded = true;
    try {
      const files = await this.fetchManifest();
      const docs = await Promise.all(files.map((file) => this.fetchSkill(file)));
      const skills = docs.filter(Boolean).map((doc) => this.toDefinition(doc));
      window.GameModules.skillsDefinitions = (window.GameModules.skillsDefinitions || []).concat(skills);
      window.GameModules.skillDocs = Object.fromEntries(docs.filter(Boolean).map((doc) => [doc.meta.id, doc]));
    } catch (err) {
      console.warn('[Skills] 动态加载失败:', err.message, err.stack);
    }
    return window.GameModules.skillsDefinitions || [];
  },

  async fetchManifest() {
    const res = await fetch(this.manifest);
    if (!res.ok) throw new Error(`manifest HTTP ${res.status}`);
    const list = await res.json();
    return Array.isArray(list) ? list : [];
  },

  async fetchSkill(file) {
    const res = await fetch(`skills/${String(file).replace(/^skills\//, '')}`);
    if (!res.ok) throw new Error(`${file} HTTP ${res.status}`);
    return this.parse(await res.text(), file);
  },

  parse(text, file) {
    const match = String(text || '').match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!match) return null;
    const meta = {};
    match[1].split('\n').forEach((line) => {
      const pos = line.indexOf(':');
      if (pos <= 0) return;
      meta[line.slice(0, pos).trim()] = line.slice(pos + 1).trim();
    });
    if (!meta.id || !meta.name) return null;
    return { file, meta, body: match[2].trim() };
  },

  async instruction(id) {
    await this.load();
    const doc = window.GameModules.skillDocs?.[id];
    if (!doc) return '';
    return [
      `Skill：${doc.meta.name}`,
      `方法：${doc.meta.method || id}`,
      `激活：${doc.meta.trigger || doc.meta.description || ''}`,
      `返回：${doc.meta.returns || ''}`,
    ].filter(Boolean).join('\n');
  },

  toDefinition(doc) {
    return {
      id: doc.meta.id,
      category: doc.meta.category || '动态Skill',
      name: doc.meta.name,
      method: doc.meta.method || '',
      params: doc.meta.params || '',
      returns: doc.meta.returns || '',
      description: doc.meta.trigger || doc.meta.description || '',
      detail: doc.body,
      source: doc.file,
    };
  },
};
