/**
 * 世界观设定：每个存档首次进入某世界时固化，后续可随剧情补充。
 */
window.GameModules = window.GameModules || {};

window.GameModules.worldLore = {
  async ensure(worldTag, context = '') {
    const save = window.GameModules.sqliteSave;
    const existing = save.getWorldLore(worldTag);
    if (existing) return existing;
    const lore = await this.generate(worldTag, context);
    await save.saveWorldLore(worldTag, lore);
    return lore;
  },

  async generate(worldTag, context) {
    try {
      if (!window.dzmm?.completions) return this.fallback(worldTag);
      let buffer = '';
      await window.dzmm.completions({
        model: 'nalang-medium-0826',
        maxTokens: 1200,
        messages: [{ role: 'user', content: this.prompt(worldTag, context) }],
      }, (chunk) => { buffer += chunk; });
      return this.validate(this.parse(buffer), worldTag);
    } catch (err) {
      console.warn('世界观设定生成失败，使用兜底:', err.message);
      return this.fallback(worldTag);
    }
  },

  prompt(worldTag, context) {
    return `为 AI RPG 视觉小说生成世界《${worldTag}》的固化世界观设定。当前剧情上下文：${context || '暂无'}。只返回 JSON：{"worldTag":"${worldTag}","background":"背景介绍","factions":[{"name":"势力名","desc":"说明"}],"specialJobs":[{"name":"特殊职业","desc":"说明"}],"jobRanks":["等级体系"],"coreRules":["世界规则"],"specialFields":[{"key":"ascii_key","label":"中文属性","type":"number|rank|list","desc":"用途"}]}。specialFields 是该世界人物都可能拥有的固化特殊属性，4到10个。不要 Markdown。`;
  },

  parse(text) {
    const raw = String(text || '').replace(/```json|```/g, '').trim();
    const json = window.GameModules.rpgState.extractJson(raw);
    return JSON.parse(json.replace(/[\u0000-\u001F]/g, ''));
  },

  validate(lore, worldTag) {
    lore.worldTag = worldTag;
    lore.background = String(lore.background || `${worldTag}的冲突正在暗处酝酿。`).slice(0, 240);
    lore.factions = this.list(lore.factions, '势力');
    lore.specialJobs = this.list(lore.specialJobs, '职业');
    lore.jobRanks = (lore.jobRanks || []).slice(0, 8).map(String);
    lore.coreRules = (lore.coreRules || []).slice(0, 8).map(String);
    lore.specialFields = (lore.specialFields || []).slice(0, 10).map((field, index) => ({
      key: /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field.key) ? field.key : `world_field_${index}`,
      label: String(field.label || field.key || '属性').slice(0, 12),
      type: ['number', 'rank', 'list'].includes(field.type) ? field.type : 'number',
      desc: String(field.desc || '').slice(0, 60),
    }));
    return lore;
  },

  list(items, prefix) {
    return (items || []).slice(0, 8).map((item, index) => ({
      name: String(item.name || `${prefix}${index + 1}`).slice(0, 18),
      desc: String(item.desc || '').slice(0, 90),
    }));
  },

  fallback(worldTag) {
    const fate = String(worldTag).includes('Fate');
    return this.validate({
      worldTag,
      background: fate ? '现代魔术社会隐藏在日常背后，圣杯与魔术家系牵动暗处冲突。' : `${worldTag}中存在尚未公开的超常体系。`,
      factions: [{ name: fate ? '魔术协会' : '本地势力', desc: '维护秩序并争夺资源。' }],
      specialJobs: [{ name: fate ? '魔术师' : '异能者', desc: '掌握特殊力量的人。' }],
      jobRanks: fate ? ['见习', '正式', '开位', '祭位', '色位'] : ['低阶', '中阶', '高阶'],
      coreRules: ['力量与身份绑定', '秘密会改变角色处境'],
      specialFields: [
        { key: 'origin', label: '起源', type: 'list', desc: '内在倾向' },
        { key: 'lineage', label: '血统', type: 'rank', desc: '家系质量' },
        { key: 'faction_relation', label: '势力关系', type: 'list', desc: '阵营牵连' },
        { key: 'mystery_depth', label: '神秘深度', type: 'number', desc: '与超常体系的牵连程度' },
      ],
    }, worldTag);
  },
};
