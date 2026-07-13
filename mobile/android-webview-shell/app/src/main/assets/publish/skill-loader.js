window.GameModules = window.GameModules || {};

window.GameModules.skillLoader = {
  manifest: 'skills/manifest.json',
  loaded: false,
  loadingPromise: null,

  async load() {
    if (this.loaded) return window.GameModules.skillsDefinitions || [];
    if (this.loadingPromise) return this.loadingPromise;
    this.loadingPromise = (async () => {
      const docs = this.shouldUseInlineFirst() ? this.loadFromInline() : await this.loadDocs();
      this.registerDocs(docs);
      this.loaded = true;
      return window.GameModules.skillsDefinitions || [];
    })().finally(() => { this.loadingPromise = null; });
    return this.loadingPromise;
  },

  async loadDocs() {
    try {
      return await this.loadFromFetch();
    } catch (err) {
      const docs = this.loadFromInline();
      if (!docs.length) console.warn('[Skills] 动态加载失败:', err.message, err.stack);
      return docs;
    }
  },

  shouldUseInlineFirst() {
    try {
      return String(location.protocol) === 'file:' || String(location.origin) === 'null' || String(location.href).startsWith('blob:');
    } catch (_) {
      return true;
    }
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
    window.GameModules.promptSkills?.registerDefinitions?.();
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
    if (!doc) return this.definitionInstruction(id);
    const sections = ['感觉稳定性规则', '输出字段', '数值规则', '推演要求'].map((title) => {
      const body = this.section(doc.body, title);
      return body ? `## ${title}\n${body}` : '';
    }).filter(Boolean).join('\n');
    return [
      `Skill：${doc.meta.name}`,
      `方法：${doc.meta.method || id}`,
      `激活：${doc.meta.trigger || doc.meta.description || ''}`,
      sections ? `关键规则：\n${sections}` : '',
      `返回：${doc.meta.returns || ''}`,
    ].filter(Boolean).join('\n');
  },

  definitionInstruction(id) {
    const skill = (window.GameModules.skillsDefinitions || []).find((item) => item.id === id);
    if (!skill) return '';
    return [
      `Skill：${skill.name || id}`,
      `方法：${skill.method || id}`,
      `激活：${skill.description || ''}`,
      skill.detail ? `关键规则：\n${skill.detail}` : '',
      `返回：${skill.returns || ''}`,
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
