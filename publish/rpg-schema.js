window.GameModules = window.GameModules || {};

window.GameModules.rpgSchema = {
  base(worldTag, attrs) {
    return this.validate({ worldTag, sections: window.GameModules.progression.schemaSections(attrs) }, worldTag);
  },

  matchesAttrs(schema, attrs) {
    const fields = schema.sections?.flatMap((section) => section.fields) || [];
    return (attrs.fields || []).every((field) => {
      const current = fields.find((item) => item.key === field.key);
      return current && current.type === field.type && (current.desc || '') === (field.desc || '') && Boolean(current.grade) === Boolean(field.grade);
    });
  },

  sameFields(left, right) {
    const sig = (fields) => (fields || []).map((field) => [field.key, field.type, field.desc || '', field.grade ? 1 : 0].join(':')).join('|');
    return sig(left) === sig(right);
  },

  validate(schema, worldTag) {
    if (!Array.isArray(schema.sections)) throw new Error('schema sections invalid');
    schema.worldTag = worldTag;
    schema.sections = schema.sections.slice(0, 4).map((section, si) => ({
      title: String(section.title || `状态${si + 1}`).slice(0, 12),
      fields: (section.fields || []).slice(0, section.title === '基础能力' ? 15 : (section.title === '世界固有属性' ? 16 : (section.title === '习得与职业' ? 12 : 10))).map((field, fi) => ({
        key: /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field.key) ? field.key : `field_${si}_${fi}`,
        label: String(field.label || field.key || '状态').slice(0, 12),
        type: ['number', 'rank', 'list', 'text'].includes(field.type) ? field.type : 'number',
        min: Number.isFinite(field.min) ? field.min : 0,
        max: Number.isFinite(field.max) ? field.max : 100,
        desc: String(field.desc || '').slice(0, 100),
        grade: Boolean(field.grade),
      })),
    })).filter((section) => section.fields.length);
    if (!schema.sections.length) throw new Error('schema empty');
    if (!schema.sections.some((section) => section.fields.some((field) => field.key === 'age'))) {
      schema.sections[0].fields.unshift({ key: 'age', label: '年龄', type: 'number', min: 0, max: 999 });
    }
    return schema;
  },
};
