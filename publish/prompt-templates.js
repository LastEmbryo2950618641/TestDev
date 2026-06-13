window.GameModules = window.GameModules || {};

window.GameModules.promptTemplates = {
  items: [
    { id: 'player-profile-enrichment', title: '玩家首次手机激活身份补全', category: '手机激活', file: 'prompts/player-profile-enrichment.md', summary: '补全玩家现实身份、人际关系与已有账号资料。' },
    { id: 'character-profile-card', title: '出场人物固化设定', category: '角色生成', file: 'prompts/character-profile-card.md', summary: '生成角色卡、关系与初始情绪其余数值。' },
    { id: 'wechat-relation-profile', title: '微信关系联系人资料生成上下文', category: '微信', file: 'prompts/wechat-relation-profile.md', summary: '从玩家关系与联系人上下文生成微信联系人资料。' },
  ],
  cache: {},
  defaultState() { return { open: false, query: '', category: '', selectedId: '', selectedText: '', loading: false, error: '' }; },
  list() { return this.items; },
  find(id) { return this.items.find((item) => item.id === id) || this.items[0]; },
  async load(id) {
    const item = this.find(id);
    if (!item) return '';
    if (this.cache[item.id]) return this.cache[item.id];
    const res = await fetch(item.file);
    if (!res.ok) throw new Error(`模板读取失败：${item.file}`);
    this.cache[item.id] = await res.text();
    return this.cache[item.id];
  },
  async render(id, vars = {}) {
    const source = await this.load(id);
    return source.replace(/\{([^{}]+)\}/g, (match, key) => Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match);
  },
};
