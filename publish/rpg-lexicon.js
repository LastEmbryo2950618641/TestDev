window.GameModules = window.GameModules || {};

window.GameModules.rpgLexicon = {
  normalizeName(name) {
    return String(name || '').trim().slice(0, 32);
  },

  entry(worldTag, kind, name, data = {}) {
    const clean = this.normalizeName(name);
    if (!clean) return null;
    return {
      worldTag: worldTag || '原创世界',
      kind,
      name: clean,
      summary: String(data.summary || data.desc || data.description || '').slice(0, 80),
      description: String(data.description || data.desc || data.summary || '').slice(0, 240),
      value: Object.prototype.hasOwnProperty.call(data, 'value') ? data.value : null,
      promptInstruction: String(data.promptInstruction || this.defaultPromptInstruction(kind, clean)).slice(0, 260),
      aliases: Array.isArray(data.aliases) ? data.aliases.slice(0, 6).map(String) : [],
      related: Array.isArray(data.related) ? data.related.slice(0, 12).map(String) : [],
      meta: data.meta || {},
      source: data.source || 'runtime',
    };
  },

  defaultPromptInstruction(kind, name) {
    if (kind === '玩家设定' && name === '具体地址') return '生成内容：精确为省 / 市州 / 区县 / 镇街道 / 社区或小区 / 楼栋 / 门牌。\n改变要求：玩家明确已经搬到了指定地区，则可以改变。';
    if (kind === '职业') return '生成内容：真实身份、训练或社会功能，包含等级说明与当前作用。\n改变要求：角色职业、训练经历或社会身份发生明确变化时才可改变。';
    if (['知识', '技能'].includes(kind)) return '生成内容：具体名称、等级说明、当前作用、经验与来源。\n改变要求：学习、练习或剧情事件明确影响该项时才可改变。';
    return `生成内容：${kind || '词条'}“${name}”必须准确、可落库、可被剧情判定。\n改变要求：只有剧情事实明确改变该词条时才可改变。`;
  },

  get(worldTag, kind, name) {
    return window.GameModules.sqliteSave.getLexiconEntry?.(worldTag || '原创世界', kind, this.normalizeName(name));
  },

  async save(worldTag, kind, name, data) {
    const clean = this.normalizeName(name);
    const old = this.get(worldTag, kind, clean);
    const entry = this.entry(worldTag, kind, clean, { ...data, promptInstruction: old?.promptInstruction || data?.promptInstruction });
    if (!entry) return null;
    await window.GameModules.sqliteSave.saveLexiconEntry?.(entry);
    return entry;
  },

  async saveMany(entries) {
    const save = window.GameModules.sqliteSave;
    if (!save.db || !entries.length) return;
    const now = new Date().toISOString();
    for (const raw of entries) {
      const old = this.get(raw.worldTag, raw.kind, raw.name);
      const entry = this.entry(raw.worldTag, raw.kind, raw.name, { ...raw, promptInstruction: old?.promptInstruction || raw.promptInstruction });
      if (!entry) continue;
      save.db.run(
        'INSERT OR REPLACE INTO lexicon_entries(world_tag,kind,name,entry_json,source,created_at,updated_at) VALUES (?,?,?,?,?,COALESCE((SELECT created_at FROM lexicon_entries WHERE world_tag=? AND kind=? AND name=?),?),?)',
        [entry.worldTag, entry.kind, entry.name, JSON.stringify(entry), entry.source, entry.worldTag, entry.kind, entry.name, now, now],
      );
    }
    await save.persist();
  },
};
