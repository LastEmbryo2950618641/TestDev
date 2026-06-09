/**
 * 动态 RPG 状态：同一存档内按世界固化 schema，角色首次出现固化状态。
 */
window.GameModules = window.GameModules || {};

window.GameModules.rpgState = {
  defaultSchema(worldTag) {
    const fate = String(worldTag || '').includes('Fate');
    return {
      worldTag,
      sections: [
        {
          title: fate ? '魔术资质' : '基础资质',
          fields: [
            { key: 'affinity', label: fate ? '魔术适性' : '特殊性', type: 'number', min: 0, max: 100 },
            { key: 'mystery', label: fate ? '神秘' : '感知', type: 'number', min: 0, max: 100 },
            { key: 'will', label: '意志', type: 'number', min: 0, max: 100 },
            { key: 'luck', label: '幸运', type: 'number', min: 0, max: 100 },
          ],
        },
        {
          title: fate ? '战斗参数' : '行动参数',
          fields: [
            { key: 'strength', label: '筋力', type: 'rank' },
            { key: 'agility', label: '敏捷', type: 'rank' },
            { key: 'endurance', label: '耐久', type: 'rank' },
            { key: 'control_resistance', label: '操控抗性', type: 'number', min: 0, max: 100 },
          ],
        },
        {
          title: '持有物',
          fields: [
            { key: 'equipment', label: '装备', type: 'list' },
            { key: 'skills', label: '技能', type: 'list' },
            { key: 'status_tags', label: '状态标签', type: 'list' },
          ],
        },
      ],
    };
  },

  async ensureSchema(worldTag) {
    const save = window.GameModules.sqliteSave;
    const existing = save.getSchema(worldTag);
    if (existing) return existing;
    const schema = await this.generateSchema(worldTag);
    await save.saveSchema(worldTag, schema);
    return schema;
  },

  async generateSchema(worldTag) {
    try {
      if (!window.dzmm?.completions) return this.defaultSchema(worldTag);
      let buffer = '';
      await window.dzmm.completions({
        model: 'nalang-medium-0826',
        maxTokens: 900,
        messages: [{ role: 'user', content: this.schemaPrompt(worldTag) }],
      }, (chunk, done) => {
        buffer += chunk;
        if (!done) return;
      });
      return this.validateSchema(this.parseSchema(buffer), worldTag);
    } catch (err) {
      console.warn('RPG schema 生成失败，使用兜底:', err.message);
      return this.defaultSchema(worldTag);
    }
  },

  parseSchema(text) {
    const raw = String(text || '').replace(/```json|```/g, '').trim();
    const json = this.extractJson(raw);
    const attempts = [json, json.replace(/[\u0000-\u001F]/g, '')];
    for (const value of attempts) {
      try { return JSON.parse(value); } catch (_) { /* 继续尝试 */ }
    }
    throw new Error('schema JSON parse failed');
  },

  extractJson(text) {
    const start = text.indexOf('{');
    if (start === -1) throw new Error('schema JSON missing');
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < text.length; i += 1) {
      const ch = text[i];
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === '"') inString = !inString;
      if (inString) continue;
      if (ch === '{') depth += 1;
      if (ch === '}') depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
    throw new Error('schema JSON incomplete');
  },

  schemaPrompt(worldTag) {
    return `为 AI RPG 视觉小说的世界《${worldTag}》生成角色状态字段 schema。要求只返回 JSON：{"worldTag":"${worldTag}","sections":[{"title":"分组名","fields":[{"key":"ascii_key","label":"中文名","type":"number|rank|list","min":0,"max":100}]}]}。字段必须贴合该世界观，section 2-4 个，每组 3-5 个字段。不要 Markdown。`;
  },

  validateSchema(schema, worldTag) {
    if (!Array.isArray(schema.sections)) throw new Error('schema sections invalid');
    schema.worldTag = worldTag;
    schema.sections = schema.sections.slice(0, 4).map((section, si) => ({
      title: String(section.title || `状态${si + 1}`).slice(0, 12),
      fields: (section.fields || []).slice(0, 5).map((field, fi) => ({
        key: /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field.key) ? field.key : `field_${si}_${fi}`,
        label: String(field.label || field.key || '状态').slice(0, 12),
        type: ['number', 'rank', 'list'].includes(field.type) ? field.type : 'number',
        min: Number.isFinite(field.min) ? field.min : 0,
        max: Number.isFinite(field.max) ? field.max : 100,
      })),
    })).filter((section) => section.fields.length);
    if (!schema.sections.length) throw new Error('schema empty');
    return schema;
  },

  async ensureCharacter(character) {
    const save = window.GameModules.sqliteSave;
    const id = character.id || character.name;
    const existing = save.getCharacterState(id);
    if (existing) return existing;
    const worldTag = character.work || '原创世界';
    const schema = await this.ensureSchema(worldTag);
    const created = this.createCharacterState(character, schema);
    await save.saveCharacterState(created);
    return created;
  },

  createCharacterState(character, schema) {
    const seed = this.seed(character.name + character.role + schema.worldTag);
    const values = { health: 100, stamina: 100, mana: 100 };
    for (const section of schema.sections) {
      for (const field of section.fields) {
        if (['health', 'stamina', 'mana'].includes(field.key)) continue;
        values[field.key] = this.valueFor(field, seed + field.key.length);
      }
    }
    values.skills = character.skills?.map((skill) => skill.name) || values.skills;
    values.status_tags = [character.role, '可被操控', schema.worldTag];
    return {
      id: character.id,
      name: character.name,
      worldTag: schema.worldTag,
      schema,
      values,
      note: character.detail || character.personality || '',
    };
  },

  valueFor(field, seed) {
    if (field.type === 'number') return field.min + (seed % ((field.max - field.min) + 1));
    if (field.type === 'rank') return ['E', 'D', 'C', 'B', 'A', 'EX'][seed % 6];
    if (field.type === 'list') return [];
    return '';
  },

  seed(text) {
    return [...String(text)].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  },
};
