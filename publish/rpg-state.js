/**
 * 动态 RPG 状态：同一存档内按世界固化 schema，角色首次出现固化状态。
 */
window.GameModules = window.GameModules || {};

window.GameModules.rpgState = {
  baseSchema(worldTag, attrs) {
    return this.validateSchema({
      worldTag,
      sections: [
        { title: '必备属性', fields: [
          { key: 'world_tag', label: '所属世界', type: 'text', min: 0, max: 100 },
          { key: 'age', label: '年龄', type: 'number', min: 0, max: 999 },
          { key: 'health', label: '生命', type: 'number', min: 0, max: 100 },
          { key: 'stamina', label: '精力', type: 'number', min: 0, max: 100 },
          { key: 'mana', label: '魔力', type: 'number', min: 0, max: 100 },
          { key: 'control_resistance', label: '操控抗性', type: 'number', min: 0, max: 100 },
        ] },
        { title: '世界固有属性', fields: this.worldFields(attrs) },
        { title: '持有物', fields: [
          { key: 'equipment', label: '装备', type: 'list' },
          { key: 'skills', label: '技能', type: 'list' },
          { key: 'status_tags', label: '状态标签', type: 'list' },
          { key: 'control_experience', label: '上线体验', type: 'text' },
        ] },
      ],
    }, worldTag);
  },

  worldFields(attrs) {
    return (attrs?.fields || []).slice(0, 16).map((field, index) => ({
      key: /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field.key) ? field.key : `world_field_${index}`,
      label: String(field.label || field.key || '属性').slice(0, 12),
      type: ['number', 'rank', 'list', 'text'].includes(field.type) ? field.type : 'number',
      min: 0,
      max: 100,
      desc: String(field.desc || '').slice(0, 80),
    }));
  },

  async ensureWorldAttributes(worldTag) {
    const save = window.GameModules.sqliteSave;
    const existing = save.getWorldAttributes(worldTag);
    if (existing) return existing;
    const attrs = window.GameModules.worldAttributes.defaults(worldTag);
    await save.saveWorldAttributes(worldTag, attrs);
    return attrs;
  },

  async ensureSchema(worldTag) {
    const save = window.GameModules.sqliteSave;
    const attrs = await this.ensureWorldAttributes(worldTag);
    const existing = save.getSchema(worldTag);
    if (existing && this.schemaMatchesAttrs(existing, attrs)) return existing;
    console.log('[RPG状态] 固化世界属性 schema:', worldTag, attrs.fields?.length || 0);
    const schema = this.baseSchema(worldTag, attrs);
    await save.saveSchema(worldTag, schema);
    return schema;
  },

  schemaMatchesAttrs(schema, attrs) {
    const keys = new Set(schema.sections?.flatMap((section) => section.fields.map((field) => field.key)) || []);
    return (attrs.fields || []).every((field) => keys.has(field.key));
  },


  validateSchema(schema, worldTag) {
    if (!Array.isArray(schema.sections)) throw new Error('schema sections invalid');
    schema.worldTag = worldTag;
    schema.sections = schema.sections.slice(0, 4).map((section, si) => ({
      title: String(section.title || `状态${si + 1}`).slice(0, 12),
      fields: (section.fields || []).slice(0, section.title === '世界固有属性' ? 16 : 5).map((field, fi) => ({
        key: /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field.key) ? field.key : `field_${si}_${fi}`,
        label: String(field.label || field.key || '状态').slice(0, 12),
        type: ['number', 'rank', 'list', 'text'].includes(field.type) ? field.type : 'number',
        min: Number.isFinite(field.min) ? field.min : 0,
        max: Number.isFinite(field.max) ? field.max : 100,
      })),
    })).filter((section) => section.fields.length);
    if (!schema.sections.length) throw new Error('schema empty');
    if (!schema.sections.some((section) => section.fields.some((field) => field.key === 'age'))) {
      schema.sections[0].fields.unshift({ key: 'age', label: '年龄', type: 'number', min: 0, max: 999 });
    }
    return schema;
  },

  async ensureCharacter(character) {
    const save = window.GameModules.sqliteSave;
    const id = character.id || character.name;
    const existing = save.getCharacterState(id);
    if (existing) {
      console.log('[RPG状态] 使用已保存角色状态:', id, existing.worldTag);
      const schema = await this.ensureSchema(existing.worldTag || character.work || '原创世界');
      const upgraded = this.upgradeCharacterState(existing, schema);
      if (upgraded) await save.saveCharacterState(existing);
      return existing;
    }
    const worldTag = save.getCharacterWorld(id) || character.work || '原创世界';
    console.log('[RPG状态] 创建角色状态:', id, character.name, worldTag);
    const schema = await this.ensureSchema(worldTag);
    const created = this.createCharacterState(character, schema);
    await save.saveCharacterState(created);
    return created;
  },

  upgradeCharacterState(state, schema) {
    let changed = false;
    state.worldTag = schema.worldTag;
    if (!state.schema || !this.schemaMatchesAttrs(state.schema, { fields: schema.sections.flatMap((section) => section.fields) })) {
      state.schema = schema;
      changed = true;
    }
    if (!state.values) state.values = {};
    state.values.world_tag = state.worldTag;
    const seed = this.seed(state.name + state.worldTag);
    schema.sections.forEach((section) => section.fields.forEach((field) => {
      if (state.values[field.key] === undefined) {
        state.values[field.key] = ['health', 'stamina', 'mana'].includes(field.key) ? 100 : this.valueFor(field, seed + field.key.length);
        changed = true;
      }
    }));
    return this.ensureControlExperience(state) || changed;
  },

  ensureControlExperience(state) {
    let changed = false;
    if (!state.values) state.values = {};
    if (!state.values.control_experience) {
      state.values.control_experience = { onlineCount: 0, feeling: '未知', adaptation: 0, summary: '尚未经历上线操控。', lastUpdated: '' };
      changed = true;
    }
    const sections = state.schema?.sections || [];
    const itemSection = sections.find((section) => section.title === '持有物') || sections.at(-1);
    if (itemSection && !itemSection.fields.some((field) => field.key === 'control_experience')) {
      itemSection.fields.push({ key: 'control_experience', label: '上线体验', type: 'text' });
      changed = true;
    }
    return changed;
  },

  createCharacterState(character, schema) {
    const seed = this.seed(character.name + character.role + schema.worldTag + (character.detail || ''));
    const values = { world_tag: schema.worldTag, health: 100, stamina: 100, mana: 100 };
    for (const section of schema.sections) {
      for (const field of section.fields) {
        if (['world_tag', 'health', 'stamina', 'mana', 'age'].includes(field.key)) continue;
        values[field.key] = this.valueFor(field, seed + field.key.length);
      }
    }
    values.skills = character.skills?.map((skill) => skill.name) || values.skills;
    Object.assign(values, character.worldValues || {});
    values.status_tags = [character.role, character.importance === 'minor' ? '路人' : '可被操控', schema.worldTag];
    values.control_experience = {
      onlineCount: 0,
      feeling: '未知',
      adaptation: 0,
      summary: '尚未经历上线操控。',
      lastUpdated: '',
    };
    const state = {
      id: character.id,
      name: character.name,
      worldTag: schema.worldTag,
      schema,
      values,
      profile: character,
      note: character.detail || character.personality || '',
    };
    this.ensureControlExperience(state);
    return state;
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
