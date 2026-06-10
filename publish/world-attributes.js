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
        { key: 'magic_circuit_quality', label: '魔术回路质', type: 'rank', desc: '魔术回路单条质量、转换效率与稳定性。' },
        { key: 'magic_circuit_quantity', label: '魔术回路量', type: 'number', desc: '魔术回路数量与可用规模。' },
        { key: 'mana_capacity', label: '魔力量', type: 'number', desc: '当前可调用魔力储备。' },
        { key: 'magic_attribute', label: '魔术属性', type: 'list', desc: '元素或方向性属性。' },
        { key: 'magic_trait', label: '魔术特性', type: 'list', desc: '魔术运作倾向或术式特征。' },
        { key: 'origin', label: '起源', type: 'list', desc: '灵魂深处的根源性倾向。' },
        { key: 'mystery_affinity', label: '神秘适性', type: 'number', desc: '接触、理解、承载神秘的适配程度。' },
        { key: 'lineage_accumulation', label: '家系积累', type: 'rank', desc: '家系传承、刻印、研究与资源积累。' },
        { key: 'magic_crest_integrity', label: '魔术刻印完整度', type: 'number', desc: '魔术刻印完整、可继承、可使用程度。' },
        { key: 'grail_war_aptitude', label: '圣杯战争适格', type: 'number', desc: '被圣杯战争体系卷入或契约的适合度。' },
      ],
    };
  },
};
