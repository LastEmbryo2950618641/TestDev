window.GameModules = window.GameModules || {};

window.GameModules.promptTemplates = {
  items: [
    { id: 'inference-stage1-guided-query', title: '推演引擎 Stage1 中文查询规划', category: '剧情推演', file: 'prompts/推演引擎/stage1-guided-query.md', summary: '推演引擎第一阶段中文 K:V 查询规划。' },
    { id: 'inference-stage2-scene-anchor', title: '推演引擎 Stage2 场景锚定', category: '剧情推演', file: 'prompts/推演引擎/stage2-scene-anchor.md', summary: '推演引擎第二阶段中文 K:V 场景锚定报告。' },
    { id: 'inference-stage3-narration', title: '推演引擎 Stage3 单段正文', category: '剧情推演', file: 'prompts/推演引擎/stage3-narration.md', summary: '推演引擎第三阶段服从场景锚定的单段正文。' },
    { id: 'inference-stage4-settlement-window', title: '推演引擎 Stage4 滑动结算窗口', category: '剧情推演', file: 'prompts/推演引擎/stage4-settlement-window.md', summary: '推演引擎第四阶段中文 K:V 滑动状态结算。' },
    { id: 'real-world-map-location-add', title: '电子地图新增地点', category: '现实推演', file: 'prompts/real-world-map-location-add.md', summary: '把玩家新认识的地点加入电子地图树。' },
    { id: 'real-world-map-description-update', title: '电子地图地点说明调整', category: '现实推演', file: 'prompts/real-world-map-description-update.md', summary: '只调整明确变化的地点说明事实数组。' },
    { id: 'player-profile-enrichment', title: '玩家首次手机激活身份补全', category: '手机激活', file: 'prompts/player-profile-enrichment.md', summary: '补全玩家现实身份、人际关系与已有账号资料。' },
    { id: 'character-profile-part1-base-identity', title: '角色卡 Part1 基础身份', category: '角色生成', file: 'prompts/character-profile-part1-base-identity.md', summary: '按预定义 JSON 生成基础身份与社会关系。' },
    { id: 'character-profile-part2-feeling', title: '角色卡 Part2 情感数值', category: '角色生成', file: 'prompts/character-profile-part2-feeling.md', summary: '按预定义 CSV 生成情绪和对玩家感觉数值。' },
    { id: 'character-profile-part2-feeling-fix', title: '角色卡 Part2 情感数值行修复', category: '角色生成', file: 'prompts/character-profile-part2-feeling-fix.md', summary: '只补齐 Part2 缺失或不完整的固定情感 CSV 行。' },
    { id: 'character-profile-part3-abilities-professions', title: '角色卡 Part3 能力职业', category: '角色生成', file: 'prompts/character-profile-part3-abilities-professions.md', summary: '按预定义 CSV 生成技能、知识与职业。' },
    { id: 'character-profile-part3-abilities-professions-fix', title: '角色卡 Part3 能力职业行修复', category: '角色生成', file: 'prompts/character-profile-part3-abilities-professions-fix.md', summary: '只补齐 Part3 缺失或不完整的技能、知识、职业 CSV 行。' },
    { id: 'character-profile-part4-inventory-wearing-rpg', title: '角色卡 Part4 物品穿着', category: '角色生成', file: 'prompts/character-profile-part4-inventory-wearing-rpg.md', summary: '按预定义 CSV 生成物品与穿着。' },
    { id: 'character-profile-part5-body-profile', title: '角色卡 Part5 身体原貌', category: '角色生成', file: 'prompts/character-profile-part5-body-profile.md', summary: '按预定义 CSV 生成身体原貌描写。' },
    { id: 'character-profile-part6-dressed-profile', title: '角色卡 Part6 盛装状态', category: '角色生成', file: 'prompts/character-profile-part6-dressed-profile.md', summary: '按预定义 CSV 生成盛装打扮分部位描写。' },
    { id: 'character-profile-part7-rpg-field', title: '角色卡 Part7 RPG属性', category: '角色生成', file: 'prompts/character-profile-part7-rpg-field.md', summary: '按预定义 JSON 生成 RPG 属性。' },
    { id: 'character-profile-metric-group', title: '角色卡初始数值组生成', category: '角色生成', file: 'prompts/character-profile-metric-group.md', summary: '拆分生成初始情绪或对玩家感觉数值数组。' },
    { id: 'wechat-relation-profile', title: '微信关系联系人资料生成上下文', category: '微信', file: 'prompts/wechat-relation-profile.md', summary: '从玩家关系与联系人上下文生成微信联系人资料。' },
    { id: 'wechat-chat-reply', title: '微信联系人对话回复', category: '微信', file: 'prompts/wechat-chat-reply.md', summary: '根据联系人角色卡、玩家资料和微信历史模拟联系人口吻回复。' },
    { id: 'wechat-image-prompt-collect', title: '微信图片提示词收集', category: '微信', file: 'prompts/wechat/wechat-image-prompt-collect.md', summary: '根据联系人记忆和当前穿戴收集图片编辑动态标签。' },
    { id: 'wechat-album-photo', title: '微信相册图片生成模板', category: '图片生成', file: 'prompts/picture_generate/wechat-album-photo.md', summary: '使用标签变量生成微信联系人全身正面照。' },
    { id: 'draw-tag-prompt', title: '二次元绘画标签提示词生成', category: '图片生成', file: 'prompts/picture_generate/draw-tag-prompt.md', summary: '根据角色身份与部位标签生成正向/负面绘图提示词。' },
    { id: 'common-image-edit-generate', title: '通用图片编辑与生成提示词', category: '图片生成', file: 'prompts/picture_generate/common-image-edit-generate.md', summary: '将动态标签拼入通用二次元全身图提示词。' },
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
  defaultState() { return { open: false, query: '', category: '', categoryMenuOpen: false, selectedId: '', selectedText: '', loading: false, error: '' }; },
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
    if (this.inline?.[item.id]) {
      if (useCache) this.cache[item.id] = this.inline[item.id];
      return this.inline[item.id];
    }
    const inlineAttempt = await this.loadInlineScript(item);
    if (this.inline?.[item.id]) {
      if (useCache) this.cache[item.id] = this.inline[item.id];
      return this.inline[item.id];
    }
    const urls = this.fileCandidates(item.file);
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
    const tried = [...(inlineAttempt.urls || []), ...urls];
    const detail = `${item.file}（已尝试：${tried.join('、')}）`;
    const inlineError = inlineAttempt.lastError ? `；同名 JS 加载失败：${inlineAttempt.lastError.message || inlineAttempt.lastError}` : '';
    console.error('提示词模板读取失败:', detail, `${lastError?.message || ''}${inlineError}`, lastError?.stack);
    throw new Error(`模板读取失败：${detail}${inlineError}`);
  },
  async loadInlineScript(item) {
    const scriptFile = String(item?.file || '').replace(/\.md$/u, '.js');
    if (!scriptFile || scriptFile === item?.file) return { urls: [], lastError: null };
    const urls = this.fileCandidates(scriptFile);
    let lastError = null;
    for (const url of urls) {
      try {
        await this.loadScript(url);
        if (this.inline?.[item.id]) return { urls, lastError: null };
      } catch (err) {
        lastError = err;
      }
    }
    return { urls, lastError };
  },
  loadScript(url) {
    return new Promise((resolve, reject) => {
      try {
        const script = document.createElement('script');
        script.src = url;
        script.onload = () => resolve(true);
        script.onerror = () => reject(new Error(`脚本读取失败：${url}`));
        document.head.appendChild(script);
      } catch (err) {
        reject(err);
      }
    });
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
    return source
      .replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (match, key) => Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match)
      .replace(/\{([^{}]+)\}/g, (match, key) => Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match);
  },
};
