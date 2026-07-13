/**
 * 世界专属固化属性：运行时从这里写入 SQLite 世界属性表。
 */
window.GameModules = window.GameModules || {};

window.GameModules.worldAttributes = {
  defaults(worldTag) {
    return this.isTypeMoon(worldTag) ? this.typeMoon(worldTag) : { worldTag, source: 'fallback', fields: [] };
  },

  isTypeMoon(worldTag) {
    return /Fate|fate|Zero|型月|魔术|圣杯/.test(String(worldTag || ''));
  },

  typeMoon(worldTag) {
    return {
      worldTag,
      source: 'assets/fate zero/AI设定库/00_常驻加载/能力维度属性.md',
      fields: [
        { key: 'magic_circuit_quality', label: '魔术回路质', type: 'number', desc: '魔术回路单条质量、转换效率与稳定性。', grade: true },
        { key: 'magic_circuit_quantity', label: '魔术回路量', type: 'number', desc: '魔术回路的数量。', grade: true },
        { key: 'mana_capacity', label: '魔力量', type: 'number', desc: '当前可调用魔力储备。', grade: true },
        { key: 'magic_attribute', label: '魔术属性', type: 'list', desc: '元素或方向性属性。' },
        { key: 'magic_trait', label: '魔术特性', type: 'list', desc: '魔术运作倾向或术式特征。' },
        { key: 'origin', label: '起源', type: 'list', desc: '灵魂深处的根源性倾向。' },
        { key: 'mystery_affinity', label: '神秘适性', type: 'number', desc: '个人体质对神秘、魔术、诅咒或仪式的适配程度。', grade: true },
        { key: 'magic_crest_affinity', label: '刻印适配度', type: 'number', desc: '承受、继承或移植魔术刻印的个人适配程度。', grade: true },
      ],
    };
  },

  grade(value) {
    const n = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
    if (n >= 95) return 'EX';
    if (n >= 80) return 'A';
    if (n >= 65) return 'B';
    if (n >= 45) return 'C';
    if (n >= 25) return 'D';
    return 'E';
  },

  displayValue(field, value) {
    if (!field?.grade || typeof value !== 'number') return value;
    return `${value}（${this.grade(value)}）`;
  },
};
