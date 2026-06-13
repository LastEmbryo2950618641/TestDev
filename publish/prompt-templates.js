window.GameModules = window.GameModules || {};

window.GameModules.promptTemplates = {
  items: [
    { id: 'story-engine', title: '主剧情 RPG 推演引擎', category: '剧情推演', file: 'prompts/story-engine.md', summary: '操控/离线回合的核心小说续写、数值变化与词条更新。' },
    { id: 'real-world-engine', title: '现实世界推演引擎', category: '现实推演', file: 'prompts/real-world-engine.md', summary: '玩家收起手机后的现实行动、现实状态与词条更新。' },
    { id: 'player-profile-enrichment', title: '玩家首次手机激活身份补全', category: '手机激活', file: 'prompts/player-profile-enrichment.md', summary: '补全玩家现实身份、人际关系与已有账号资料。' },
    { id: 'character-profile-card', title: '出场人物固化设定', category: '角色生成', file: 'prompts/character-profile-card.md', summary: '生成角色卡、关系与初始情绪其余数值。' },
    { id: 'wechat-relation-profile', title: '微信关系联系人资料生成上下文', category: '微信', file: 'prompts/wechat-relation-profile.md', summary: '从玩家关系与联系人上下文生成微信联系人资料。' },
    { id: 'entry-action', title: '进入时机行动生成', category: '进入时机', file: 'prompts/entry-action.md', summary: '根据世界观和剧情索引生成角色当前正在做什么。' },
    { id: 'entry-year-audit', title: '年份与年龄证据自审', category: '进入时机', file: 'prompts/entry-year-audit.md', summary: '根据证据判断剧情年份或角色年龄是否可信。' },
    { id: 'world-lore', title: '世界观固化设定', category: '世界观', file: 'prompts/world-lore.md', summary: '生成世界背景、势力、职业体系、日历和世界线。' },
    { id: 'profession-info', title: '职业资料生成', category: '角色生成', file: 'prompts/profession-info.md', summary: '判定并固化角色职业能力、等级说明和实际作用。' },
    { id: 'character-feedback', title: '初始角色反馈', category: '角色生成', file: 'prompts/character-feedback.md', summary: '角色首次被上线时的内心、意图、感受和选项。' },
    { id: 'memory-intent-query', title: '角色记忆检索意图', category: '记忆', file: 'prompts/memory-intent-query.md', summary: '把玩家输入压缩成用于检索角色记忆的关键词短句。' },
    { id: 'faction-audit', title: '势力数据库初始化与审计', category: '势力', file: 'prompts/faction-audit.md', summary: '生成、补齐和审计现实世界组织势力数据库。' },
    { id: 'boss-jobs', title: 'BOSS 招聘岗位生成', category: 'BOSS招聘', file: 'prompts/boss-jobs.md', summary: '根据筛选条件和玩家能力生成招聘岗位。' },
    { id: 'json-repair', title: 'JSON 修复重试', category: '通用', file: 'prompts/json-repair.md', summary: '当 AI 输出不是合法 JSON 时用于重试修复。' },
    { id: 'writing-styles', title: '小说文风预设', category: '剧情推演', file: 'prompts/writing-styles.md', summary: '主剧情推演可选文风预设文本。' },
  ],
  cache: {},
  defaultState() { return { open: false, query: '', category: '', selectedId: '', selectedText: '', loading: false, error: '' }; },
  list() { return this.items; },
  find(id) { return this.items.find((item) => item.id === id) || this.items[0]; },
  async load(id) {
    const item = this.find(id);
    if (!item) return '';
    if (this.cache[item.id]) return this.cache[item.id];
    try {
      const res = await fetch(item.file);
      if (!res.ok) throw new Error(`模板读取失败：${item.file}`);
      this.cache[item.id] = await res.text();
      return this.cache[item.id];
    } catch (err) {
      if (this.inline?.[item.id]) {
        console.warn('提示词模板读取失败，使用内联兜底:', item.file, err.message, err.stack);
        this.cache[item.id] = this.inline[item.id];
        return this.cache[item.id];
      }
      console.error('提示词模板读取失败:', item.file, err.message, err.stack);
      throw err;
    }
  },
  async render(id, vars = {}) {
    const source = await this.load(id);
    return source.replace(/\{([^{}]+)\}/g, (match, key) => Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match);
  },
};
