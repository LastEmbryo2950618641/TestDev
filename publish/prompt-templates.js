window.GameModules = window.GameModules || {};

window.GameModules.promptTemplates = {
  /** 渲染时在正文前注入 P0 人生取向如实约束的提示词 id */
  aspirationFidelityPriorityPromptIds: [
    'player-aspiration-summary',
    'player-aspiration-goals',
    'inference-stage3-narration',
    'inference-stage4-settlement-window',
    'real-world-final-style-polish',
  ],
  sharedAspirationFidelityPriorityId: 'shared-aspiration-fidelity-priority',
  items: [
    { id: 'inference-stage1-guided-query', title: 'Stage1 资料查询', category: '剧情推演', file: 'prompts/推演引擎/stage1-guided-query.md', summary: '正文前资料路由与出场候选收敛。' },
    { id: 'inference-stage2-scene-anchor', title: 'Stage2 场景锚定', category: '剧情推演', file: 'prompts/推演引擎/stage2-scene-anchor.md', summary: '正文前锚定地点、时间、出场边界与写作重点。' },
    { id: 'inference-stage3-narration', title: 'Stage3 正文生成', category: '剧情推演', file: 'prompts/推演引擎/stage3-narration.md', summary: '服从场景锚定的单段正文。' },
    { id: 'inference-stage4-settlement-window', title: 'Stage4 状态结算', category: '剧情推演', file: 'prompts/推演引擎/stage4-settlement-window.md', summary: '正文后滑动窗口状态结算（含地图/领土控势）。' },
    { id: 'inference-stage5-profile-gate', title: 'Stage5 外观判定', category: '剧情推演', file: 'prompts/推演引擎/stage5-profile-gate.md', summary: '判断自然/盛装外观是否需局部更新。' },
    { id: 'inference-stage5-body-profile-patch', title: 'Stage6 自然外观补丁', category: '剧情推演', file: 'prompts/推演引擎/stage5-body-profile-patch.md', summary: '局部重写 Part5 bodyProfileMeta/bodyProfile。' },
    { id: 'inference-stage5-dressed-profile-patch', title: 'Stage7 盛装外观补丁', category: '剧情推演', file: 'prompts/推演引擎/stage5-dressed-profile-patch.md', summary: '局部重写 Part6 dressedProfileMeta/dressedProfile。' },
    { id: 'inference-stage6-faction-update', title: 'Stage8 势力更新', category: '剧情推演', file: 'prompts/推演引擎/stage6-faction-update.md', summary: '串行势力创建与字段补丁（Skill 写库）。' },
    { id: 'inference-stage10-life-energy-exp', title: 'Stage10 经验结算', category: '剧情推演', file: 'prompts/推演引擎/stage10-life-energy-exp.md', summary: '击杀/吸收结算生命层次经验；正文练习/使用结算知识技能职业经验。' },
    { id: 'inference-init-intimacy-body', title: 'Stage4 亲密身体初始化', category: '结算初始化', file: 'prompts/推演引擎/init/intimacy-body-init-prompt.md', summary: 'Stage4 亲密与身体状态初始化说明。' },
    { id: 'inference-update-generic', title: 'Stage4 通用固化', category: '结算更新', file: 'prompts/推演引擎/update/generic-update-prompt.md', summary: 'Stage4 通用固化更新说明。' },
    { id: 'inference-update-emotion', title: 'Stage4 情绪更新', category: '结算更新', file: 'prompts/推演引擎/update/emotion-update-prompt.md', summary: 'Stage4 情绪变化更新说明。' },
    { id: 'inference-update-feeling', title: 'Stage4 感觉更新', category: '结算更新', file: 'prompts/推演引擎/update/feeling-update-prompt.md', summary: 'Stage4 对玩家感觉变化更新说明。' },
    { id: 'inference-update-vital', title: 'Stage4 生命体征更新', category: '结算更新', file: 'prompts/推演引擎/update/vital-update-prompt.md', summary: 'Stage4 生命体征更新说明。' },
    { id: 'inference-update-role-card', title: 'Stage4 角色卡更新', category: '结算更新', file: 'prompts/推演引擎/update/role-card-update-prompt.md', summary: 'Stage4 角色卡稳定事实更新说明。' },
    { id: 'inference-update-character-goal', title: 'Stage4 长期目标更新', category: '结算更新', file: 'prompts/推演引擎/update/character-goal-update-prompt.md', summary: 'Stage4 短中长期目标进度与阶段成果更新说明。' },
    { id: 'inference-update-relationship', title: 'Stage4 关系更新', category: '结算更新', file: 'prompts/推演引擎/update/relationship-update-prompt.md', summary: 'Stage4 关系变化更新说明。' },
    { id: 'inference-update-sexual-experience', title: 'Stage4 性经历更新', category: '结算更新', file: 'prompts/推演引擎/update/sexual-experience-update-prompt.md', summary: 'Stage4 经历次数抽象更新说明。' },
    { id: 'inference-update-sexual-history', title: 'Stage4 性历史更新', category: '结算更新', file: 'prompts/推演引擎/update/sexual-history-update-prompt.md', summary: 'Stage4 经历历史抽象更新说明。' },
    { id: 'inference-update-body-status', title: 'Stage4 身体状态更新', category: '结算更新', file: 'prompts/推演引擎/update/body-status-update-prompt.md', summary: 'Stage4 身体状态更新说明。' },
    { id: 'inference-update-wearing-state', title: 'Stage4 穿着状态更新', category: '结算更新', file: 'prompts/推演引擎/update/wearing-state-update-prompt.md', summary: 'Stage4 穿着状态更新说明。' },
    { id: 'inference-update-item', title: 'Stage4 物品更新', category: '结算更新', file: 'prompts/推演引擎/update/item-update-prompt.md', summary: 'Stage4 物品与库存更新说明。' },
    { id: 'inference-update-faction-structure', title: '遗留：势力结构更新', category: '结算更新', file: 'prompts/推演引擎/update/faction-structure-update-prompt.md', summary: '遗留结算说明；现由 Stage8 Skill 写库。' },
    { id: 'inference-update-org-overview-panel', title: '遗留：组织五面板更新', category: '结算更新', file: 'prompts/推演引擎/update/org-overview-panel-update-prompt.md', summary: '遗留结算说明；现由 Stage8 Skill 写库。' },
    { id: 'inference-update-territory-control', title: 'Stage4 领土控势更新', category: '结算更新', file: 'prompts/推演引擎/update/territory-control-update-prompt.md', summary: 'Stage4 地图 POI 控势变更说明。' },
    { id: 'inference-update-membership', title: 'Stage4 人事归属更新', category: '结算更新', file: 'prompts/推演引擎/update/membership-update-prompt.md', summary: 'Stage4 角色 membership/orgId 归属说明。' },
    { id: 'inference-update-org-status', title: 'Stage4 政体状态更新', category: '结算更新', file: 'prompts/推演引擎/update/org-status-update-prompt.md', summary: 'Stage4 组织独立/起义/解散/合并说明。' },
    { id: 'inference-update-faction-overview', title: '遗留：势力总览更新', category: '结算更新', file: 'prompts/推演引擎/update/faction-overview-update-prompt.md', summary: '遗留结算说明；现由 Stage8 Skill 写库。' },
    { id: 'inference-update-map', title: 'Stage4 地图更新', category: '结算更新', file: 'prompts/推演引擎/update/map-update-prompt.md', summary: 'Stage4 地图与地点事实更新说明。' },
    { id: 'inference-update-system', title: 'Stage4 系统记录更新', category: '结算更新', file: 'prompts/推演引擎/update/system-update-prompt.md', summary: 'Stage4 系统级记录更新说明。' },
    { id: 'real-world-map-surround-unlock', title: 'Stage9 电子地图周围解锁', category: '剧情推演', file: 'prompts/real-world-map-surround-unlock.md', summary: '独立阶段：首次抵达且无侧向邻点时解锁周围一圈。' },
    { id: 'real-world-map-location-add', title: '电子地图新增地点', category: '现实推演', file: 'prompts/real-world-map-location-add.md', summary: '把玩家新认识的地点加入电子地图树。' },
    { id: 'real-world-map-description-update', title: '电子地图地点说明调整', category: '现实推演', file: 'prompts/real-world-map-description-update.md', summary: '只调整明确变化的地点说明事实数组。' },
    { id: 'player-profile-enrichment', title: '玩家首次手机激活身份补全', category: '手机激活', file: 'prompts/player-profile-enrichment.md', summary: '补全玩家现实身份、人际关系与已有账号资料。' },
    { id: 'shared-aspiration-fidelity-priority', title: '人生取向如实约束（P0）', category: '共享', file: 'prompts/shared/player-aspiration-fidelity-priority.md', summary: '最高优先级约束块，注入总结/目标与推演相关提示词顶部。' },
    { id: 'player-aspiration-goals', title: '玩家人生取向目标生成', category: '手机激活', file: 'prompts/player-aspiration-goals.md', summary: '根据人生总结与价值选择生成近/中/长期目标。' },
    { id: 'player-aspiration-summary', title: '玩家人生取向总结', category: '手机激活', file: 'prompts/player-aspiration-summary.md', summary: '综合立场、六维、底线与心理偏好生成人生取向总结。' },
    { id: 'player-aspiration-psych-tags', title: '心理偏好标签生成', category: '手机激活', file: 'prompts/player-aspiration-psych-tags.md', summary: '换一批时在内置与自定义标签基础上生成不重复的新候选。' },
    { id: 'character-profile-part1-base-identity', title: '角色卡 Part1 基础身份', category: '角色生成', file: 'prompts/character-profile-part1-base-identity.md', summary: '按预定义 JSON 生成基础身份与社会关系。' },
    { id: 'character-profile-essential-preference-layers', title: '角色卡本质偏好五层', category: '角色生成', file: 'prompts/character-profile-essential-preference-layers.md', summary: '根据 Part1 与上下文生成价值立场至心理偏好五层。' },
    { id: 'character-profile-part8-social-drive', title: '角色卡 Part8 社交驱动', category: '角色生成', file: 'prompts/character-profile-part8-social-drive.md', summary: '独立生成 socialDrive（关系门闩、议程、可达渠道），不并入 Part1–7。' },
    { id: 'character-profile-part2-feeling', title: '角色卡 Part2 情感数值', category: '角色生成', file: 'prompts/character-profile-part2-feeling.md', summary: '按 JSON Schema 生成情绪与对玩家感觉数值。' },
    { id: 'character-profile-part2-feeling-fix', title: '角色卡 Part2 情感数值 JSON 修复', category: '角色生成', file: 'prompts/character-profile-part2-feeling-fix.md', summary: '只补齐 Part2 缺失或不完整的 feeling JSON 字段。' },
    { id: 'character-profile-csv-fix', title: '角色卡 JSON 通用修复', category: '角色生成', file: 'prompts/character-profile-csv-fix.md', summary: '只补齐角色卡 JSON 分段中缺失或不完整的字段。' },
    { id: 'character-profile-missing-fields', title: '角色卡缺失字段修复', category: '角色生成', file: 'prompts/character-profile-missing-fields.md', summary: '只补齐角色卡 JSON 分段中缺失的字段。' },
    { id: 'character-profile-part3-abilities-professions', title: '角色卡 Part3 能力职业', category: '角色生成', file: 'prompts/character-profile-part3-abilities-professions.md', summary: '按 JSON Schema 生成技能、知识与职业。' },
    { id: 'character-profile-part3-abilities-professions-fix', title: '角色卡 Part3 能力职业 JSON 修复', category: '角色生成', file: 'prompts/character-profile-part3-abilities-professions-fix.md', summary: '只补齐 Part3 缺失或不完整的 skills/knowledge/professions JSON 条目。' },
    { id: 'character-profile-part4-inventory-wearing-rpg', title: '角色卡 Part4 物品穿着', category: '角色生成', file: 'prompts/character-profile-part4-inventory-wearing-rpg.md', summary: '按 JSON Schema 生成物品与穿着。' },
    { id: 'character-profile-part5-body-profile', title: '角色卡 Part5 身体原貌', category: '角色生成', file: 'prompts/character-profile-part5-body-profile.md', summary: '按 JSON Schema 生成身体原貌 bodyProfile。' },
    { id: 'character-profile-part6-dressed-profile', title: '角色卡 Part6 盛装状态', category: '角色生成', file: 'prompts/character-profile-part6-dressed-profile.md', summary: '按 JSON Schema 生成盛装状态 dressedProfile。' },
    { id: 'character-profile-part7-rpg-field', title: '角色卡 Part7 RPG属性', category: '角色生成', file: 'prompts/character-profile-part7-rpg-field.md', summary: '按预定义 JSON 生成 RPG 属性。' },
    { id: 'character-profile-metric-group', title: '角色卡初始数值组生成', category: '角色生成', file: 'prompts/character-profile-metric-group.md', summary: '按 JSON Schema 拆分生成初始情绪或对玩家感觉数值数组。' },
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
    { id: 'worldline-plot-summary', title: '世界线情节归纳', category: '世界线', file: 'prompts/worldline-plot-summary.md', summary: '把累积事件记录压缩为可检索的短结构情节索引。' },
    { id: 'wechat-history-decision', title: '微信历史按需读取判断', category: '微信', file: 'prompts/wechat-history-decision.md', summary: '判断本次微信回复是否需要读取固定历史表原文。' },
    { id: 'real-world-final-style-polish', title: '现实推演最终正文润色', category: '现实推演', file: 'prompts/real-world-final-style-polish.md', summary: '只润色现实推演 final.narration，不改变结算事实。' },
    { id: 'taobao-product-generate', title: '淘宝商品结构化生成', category: '淘宝', file: 'prompts/taobao-product-generate.md', summary: '根据玩家身份、搜索词和穿戴槽位生成淘宝商品 JSON。' },
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
    let source = await this.load(id);
    const priorityIds = this.aspirationFidelityPriorityPromptIds || [];
    if (priorityIds.includes(id)) {
      try {
        const priority = await this.load(this.sharedAspirationFidelityPriorityId);
        source = `${String(priority || '').trim()}\n\n---\n\n${source}`;
      } catch (err) {
        console.warn('[提示词] P0 人生取向约束注入失败:', err?.message || err);
      }
    }
    const rendered = window.GameModules.promptSkills?.templateEngine
      ? window.GameModules.promptSkills.templateEngine.render(source, vars)
      : source.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (match, key) => Object.prototype.hasOwnProperty.call(vars, String(key).trim()) ? String(vars[String(key).trim()]) : match);
    return rendered.replace(/\{([^{}]+)\}/g, (match, key) => Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match);
  },
};

window.GameModules.renderPrompt = async function renderPrompt(id, vars = {}, options = {}) {
  const templates = window.GameModules.promptTemplates;
  if (templates?.render) return templates.render(id, vars, options);
  return window.GameModules.promptSkills.render(id, vars, options);
};
