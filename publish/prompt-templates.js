window.GameModules = window.GameModules || {};

window.GameModules.promptTemplates = {
  items: [
    { id: 'story-engine', title: '主剧情 RPG 推演引擎', category: '剧情推演', file: 'prompts/story-engine.md', summary: '操控/离线回合的核心小说续写、数值变化与词条更新。' },
    { id: 'real-world-engine', title: '现实世界推演引擎', category: '现实推演', file: 'prompts/real-world-engine.md', summary: '玩家收起手机后的现实行动、现实状态与词条更新。' },
    { id: 'real-world-map-location-add', title: '电子地图新增地点', category: '现实推演', file: 'prompts/real-world-map-location-add.md', summary: '把玩家新认识的地点加入电子地图树。' },
    { id: 'real-world-map-description-update', title: '电子地图地点说明调整', category: '现实推演', file: 'prompts/real-world-map-description-update.md', summary: '只调整明确变化的地点说明事实数组。' },
    { id: 'player-profile-enrichment', title: '玩家首次手机激活身份补全', category: '手机激活', file: 'prompts/player-profile-enrichment.md', summary: '补全玩家现实身份、人际关系与已有账号资料。' },
    { id: 'character-profile-card', title: '出场人物固化设定', category: '角色生成', file: 'prompts/character-profile-card.md', summary: '生成角色卡主体、关系、词条原因和 RPG 原因。' },
    { id: 'character-profile-part1-base-identity', title: '角色卡 Part1 基础身份', category: '角色生成', file: 'prompts/character-profile-part1-base-identity.md', summary: '按预定义 JSON 生成基础身份与社会关系。' },
    { id: 'character-profile-part2-feeling', title: '角色卡 Part2 情感数值', category: '角色生成', file: 'prompts/character-profile-part2-feeling.md', summary: '按预定义 CSV 生成情绪和对玩家感觉数值。' },
    { id: 'character-profile-part3-abilities-professions', title: '角色卡 Part3 能力职业', category: '角色生成', file: 'prompts/character-profile-part3-abilities-professions.md', summary: '按预定义 JSON 生成技能、知识与职业。' },
    { id: 'character-profile-part4-inventory-wearing-rpg', title: '角色卡 Part4 物品属性', category: '角色生成', file: 'prompts/character-profile-part4-inventory-wearing-rpg.md', summary: '按预定义 JSON 生成装备、物品、穿着与 RPG 属性。' },
    { id: 'character-profile-metric-group', title: '角色卡初始数值组生成', category: '角色生成', file: 'prompts/character-profile-metric-group.md', summary: '拆分生成初始情绪或对玩家感觉数值数组。' },
    { id: 'wechat-relation-profile', title: '微信关系联系人资料生成上下文', category: '微信', file: 'prompts/wechat-relation-profile.md', summary: '从玩家关系与联系人上下文生成微信联系人资料。' },
    { id: 'wechat-chat-reply', title: '微信联系人对话回复', category: '微信', file: 'prompts/wechat-chat-reply.md', summary: '根据联系人角色卡、玩家资料和微信历史模拟联系人口吻回复。' },
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
  warnedFallbacks: {},
  scriptUrl: (() => {
    try { return document.currentScript?.src || ''; }
    catch (_) { return ''; }
  })(),
  baseUrl: (() => {
    try {
      const scriptSrc = document.currentScript?.src || '';
      if (scriptSrc) return new URL('.', scriptSrc).toString();
      return new URL('.', document.baseURI).toString();
    } catch (_) {
      return '';
    }
  })(),
  isBlobPreview() {
    try { return String(location.origin) === 'null' || String(location.href).startsWith('blob:'); }
    catch (_) { return false; }
  },
  defaultState() { return { open: false, query: '', category: '', selectedId: '', selectedText: '', loading: false, error: '' }; },
  list() { return this.items; },
  find(id) { return this.items.find((item) => item.id === id) || this.items[0]; },
  snapshot(id) {
    const item = this.find(id);
    return item ? (this.inline?.[item.id] || this.cache?.[item.id] || '') : '';
  },
  async load(id) {
    const item = this.find(id);
    if (!item) return '';
    const useCache = window.GameModules.cache?.enabled?.('promptTemplates');
    if (useCache && this.cache[item.id]) return this.cache[item.id];
    const urls = this.fileCandidates(item.file);
    if (this.isBlobPreview() && this.inline?.[item.id]) {
      if (useCache) this.cache[item.id] = this.inline[item.id];
      return this.inline[item.id];
    }
    let lastError = null;
    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        if (this.looksLikeWrongAsset(text, item)) throw new Error(`模板内容异常：${url}`);
        if (useCache) this.cache[item.id] = text;
        return text;
      } catch (err) {
        lastError = err;
      }
    }
    if (this.inline?.[item.id]) {
      if (!this.warnedFallbacks[item.id]) {
        this.warnedFallbacks[item.id] = true;
        console.info('提示词模板使用内联快照:', item.id, lastError?.message || '文件不可用', '已尝试:', urls.join('、'));
      }
      if (useCache) this.cache[item.id] = this.inline[item.id];
      return this.inline[item.id];
    }
    const detail = `${item.file}（已尝试：${urls.join('、')}）`;
    console.error('提示词模板读取失败:', detail, lastError?.message, lastError?.stack);
    throw new Error(`模板读取失败：${detail}`);
  },
  fileCandidates(file) {
    const raw = String(file || '').replace(/^\.\//, '');
    const bases = [];
    try { if (document.querySelector('base[href]')?.href) bases.push(document.querySelector('base[href]').href); } catch (_) {}
    try { if (document.baseURI) bases.push(document.baseURI); } catch (_) {}
    if (this.baseUrl) bases.push(this.baseUrl);
    if (this.scriptUrl) bases.push(this.scriptUrl);
    const urls = bases.flatMap((base) => {
      try { return [new URL(raw, base).toString()]; }
      catch (_) { return []; }
    });
    urls.push(raw, `./${raw}`);
    return [...new Set(urls)];
  },
  looksLikeWrongAsset(text, item) {
    const raw = String(text || '').trimStart();
    if (/^<!doctype html/i.test(raw) || /^<html[\s>]/i.test(raw)) return true;
    return item?.id && !raw.includes(item.title) && raw.length > 50000;
  },
  async render(id, vars = {}) {
    const source = await this.load(id);
    return source.replace(/\{([^{}]+)\}/g, (match, key) => Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match);
  },
};
