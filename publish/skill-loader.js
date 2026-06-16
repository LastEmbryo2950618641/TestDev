window.GameModules = window.GameModules || {};

window.GameModules.skillLoader = {
  manifest: 'skills/manifest.json',
  loaded: false,

  async load() {
    if (this.loaded) return window.GameModules.skillsDefinitions || [];
    let docs = [];
    try {
      docs = await this.loadFromFetch();
    } catch (err) {
      docs = this.loadFromInline();
      if (!docs.length) console.warn('[Skills] 动态加载失败:', err.message, err.stack);
      else console.info('[Skills] 动态加载失败，已使用内联文档兜底:', err.message);
    }
    this.registerDocs(docs);
    this.loaded = true;
    return window.GameModules.skillsDefinitions || [];
  },

  async loadFromFetch() {
    const files = await this.fetchManifest();
    return Promise.all(files.map((file) => this.fetchSkill(file)));
  },

  loadFromInline() {
    const inline = window.GameModules.skillDocsInline;
    const files = Array.isArray(inline?.manifest) ? inline.manifest : Object.keys(inline?.files || {});
    return files.map((file) => inline?.files?.[file] ? this.parse(inline.files[file], file) : null).filter(Boolean);
  },

  registerDocs(docs = []) {
    const valid = docs.filter(Boolean);
    const oldDocs = window.GameModules.skillDocs || {};
    window.GameModules.skillDocs = { ...oldDocs, ...Object.fromEntries(valid.map((doc) => [doc.meta.id, doc])) };
    const existing = new Set((window.GameModules.skillsDefinitions || []).map((skill) => skill.id));
    const additions = valid.filter((doc) => !existing.has(doc.meta.id)).map((doc) => this.toDefinition(doc));
    window.GameModules.skillsDefinitions = (window.GameModules.skillsDefinitions || []).concat(additions);
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

  section(body, title) {
    const match = String(body || '').match(new RegExp(`## ${title}\\n\\n([\\s\\S]*?)(?=\\n## |$)`));
    return match ? match[1].trim() : '';
  },

  async instruction(id) {
    await this.load();
    const doc = window.GameModules.skillDocs?.[id];
    if (!doc) return '';
    const stability = this.section(doc.body, '感觉稳定性规则');
    return [
      `Skill：${doc.meta.name}`,
      `方法：${doc.meta.method || id}`,
      `激活：${doc.meta.trigger || doc.meta.description || ''}`,
      stability ? `关键规则：\n${stability}` : '',
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
