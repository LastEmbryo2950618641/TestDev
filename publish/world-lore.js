window.GameModules = window.GameModules || {};

window.GameModules.worldLore = {
  inflight: {},

  async ensure(worldTag, context = '') {
    const save = window.GameModules.sqliteSave;
    const existing = save.getWorldLore(worldTag);
    if (existing) {
      if (!existing.worldline && !save.getWorldline?.(worldTag)) {
        console.debug('[世界观] 旧设定缺少世界线，正在补齐:', worldTag);
        const upgraded = this.validate(existing, worldTag);
        await save.saveWorldLore(worldTag, upgraded);
        return upgraded;
      }
      if (!existing.worldline) existing.worldline = save.getWorldline?.(worldTag);
      console.debug('[世界观] 使用已保存设定:', worldTag);
      return existing;
    }
    const key = String(worldTag || '未知世界');
    if (this.inflight[key]) return this.inflight[key];
    this.inflight[key] = (async () => {
      console.debug('[世界观] 开始生成设定:', worldTag, 'contextLength=', String(context || '').length);
      const lore = await this.generate(worldTag, context);
      await save.saveWorldLore(worldTag, lore);
      return lore;
    })();
    try { return await this.inflight[key]; }
    finally { delete this.inflight[key]; }
  },

  async generate(worldTag, context) {
    try {
      if (this.isRealWorld(worldTag)) return this.realWorld(worldTag);
      if (!window.dzmm?.completions) return this.fallback(worldTag);
      const prompt = await this.prompt(worldTag, context);
      console.debug('[世界观] AI请求:', { worldTag, promptLength: prompt.length, model: window.GameModules.aiRequest?.selectedTextModel?.()});
      return await window.GameModules.jsonUtils.generateJsonWithRetry({
        source: 'world-lore',
        model: window.GameModules.aiRequest?.selectedTextModel?.(),
        prompt,
        timeoutMs: 60000,
        maxAttempts: 2,
        maxTokens: 1600,
        max: 2,
        parse: (text) => this.parse(text),
        validate: (data) => this.validate(data, worldTag),
        repairHint: '只返回一行完整合法 JSON；不要 Markdown；不要尾随逗号；数组最后一项后必须直接闭合。',
      });
    } catch (err) {
      console.warn('世界观设定生成失败，使用兜底:', err.message);
      return this.fallback(worldTag);
    }
  },

  async prompt(worldTag, context) {
    return window.GameModules.promptTemplates.render('world-lore', { 世界: worldTag, 剧情上下文: String(context || '暂无').slice(0, 240) });
  },

  parse(text) {
    return window.GameModules.jsonUtils.parseLoose(String(text || '').replace(/[\u0000-\u001F]/g, ''));
  },

  parseOrRecover(text, worldTag) {
    try { return this.parse(text); } catch (err) {
      console.warn('[世界观] JSON解析失败，改用文本恢复兜底:', err.message);
      return this.recover(text, worldTag);
    }
  },

  recover(text, worldTag) {
    const utils = window.GameModules.jsonUtils;
    const source = String(text || '').replace(/```(?:json)?|```/g, '');
    const pick = (key, fallback) => utils.pickStringField?.(source, key) || fallback;
    const names = (key, fallback) => {
      const list = utils.pickObjectArrayNames?.(source, key) || [];
      return (list.length ? list : fallback).slice(0, 4).map((name) => ({ name, desc: `${name}影响${worldTag}的局势。` }));
    };
    return {
      worldTag,
      background: pick('background', `${worldTag}的日常秩序下隐藏着会改变角色处境的冲突。`),
      factions: names('factions', ['本地社会', '关键关系网']),
      specialJobs: names('specialJobs', ['普通职业']),
      jobRanks: utils.pickStringArray?.(source, 'jobRanks').slice(0, 6),
      coreRules: utils.pickStringArray?.(source, 'coreRules').slice(0, 6),
      calendar: this.fallback(worldTag).calendar,
      worldline: this.fallback(worldTag).worldline,
    };
  },

  validate(lore, worldTag) {
    lore.worldTag = worldTag;
    lore.background = String(lore.background || `${worldTag}的冲突正在暗处酝酿。`).slice(0, 240);
    lore.factions = this.list(lore.factions, '势力');
    lore.specialJobs = this.list(lore.specialJobs, '职业');
    lore.jobRanks = this.stringList(lore.jobRanks, 8);
    lore.coreRules = this.stringList(lore.coreRules, 8);
    lore.calendar = this.calendar(lore.calendar, worldTag);
    lore.specialFields = window.GameModules.worldAttributes.defaults(worldTag).fields;
    lore.worldline = this.worldline(lore.worldline, lore, worldTag);
    return lore;
  },

  worldline(raw, lore, worldTag) {
    const firstFaction = (raw?.factionMap && Object.keys(raw.factionMap)[0]) || 'faction_1';
    const factions = this.factionMap(raw?.factionMap, lore.factions, worldTag);
    const storyIndexes = this.stringList(raw?.storyIndexes, 8);
    const events = this.array(raw?.events).slice(0, 8).map((item, i) => {
      const obj = this.object(item);
      return {
        eventId: String(obj.eventId || obj.事件ID || `event_${i + 1}`).slice(0, 32),
        name: String(obj.name || obj.名称 || `事件${i + 1}`).slice(0, 28),
        time: String(obj.time || obj.时间 || raw?.timeRange || '时间未知').slice(0, 48),
        summary: String(obj.summary || obj.摘要 || item || '').slice(0, 90),
        detail: String(obj.detail || obj.详细信息 || obj.summary || item || '').slice(0, 420),
        storyIndexes: this.stringList(obj.storyIndexes || obj.剧情索引 || storyIndexes, 6),
        factionIds: this.stringList(obj.factionIds || obj.关联势力 || [firstFaction], 6),
        status: ['未触发', '进行中', '已结束', '改变原著'].includes(obj.status || obj.状态) ? (obj.status || obj.状态) : '进行中',
      };
    });
    return { timeRange: String(raw?.timeRange || raw?.时间 || '[时间未知 - 时间未知]').slice(0, 80), events, storyIndexes, factions };
  },

  factionMap(raw, list, worldTag) {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) return Object.fromEntries(Object.entries(raw).slice(0, 8).map(([id, item]) => [id, this.faction(id, item)]));
    return Object.fromEntries(this.array(list?.length ? list : [{ name: `${worldTag}主要势力`, desc: '影响当前世界线。' }]).slice(0, 4).map((item, i) => {
      const id = `faction_${i + 1}`;
      const obj = this.object(item);
      return [id, this.faction(id, { 名称: obj.name || item, 类型: '组织', 属性: { 说明: obj.desc || String(item || '暂无') }, 关系网: {}, 当前目标: obj.desc || '维持影响力', 近期决策: [], 状态: '正常' })];
    }));
  },

  faction(id, item) {
    const obj = this.object(item);
    const state = ['正常', '危机', '扩张', '衰退'].includes(obj.状态 || obj.status) ? (obj.状态 || obj.status) : '正常';
    return { 势力ID: String(obj.势力ID || obj.id || id), 名称: String(obj.名称 || obj.name || item || id).slice(0, 28), 类型: String(obj.类型 || obj.type || '组织').slice(0, 12), 属性: this.object(obj.属性 || obj.attrs), 关系网: this.object(obj.关系网 || obj.relations), 当前目标: String(obj.当前目标 || obj.goal || '').slice(0, 90), 近期决策: this.stringList(obj.近期决策 || obj.decisions, 6), 状态: state };
  },

  object(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  },

  array(value) {
    if (Array.isArray(value)) return value;
    return value == null || value === '' ? [] : [value];
  },

  stringList(value, max) {
    return this.array(value).slice(0, max).map(String);
  },

  list(items, prefix) {
    return this.array(items).slice(0, 8).map((item, index) => {
      const obj = this.object(item);
      return {
        name: String(obj.name || obj.名称 || item || `${prefix}${index + 1}`).slice(0, 18),
        desc: String(obj.desc || obj.description || obj.说明 || '').slice(0, 90),
      };
    });
  },

  calendar(raw, worldTag) {
    const obj = this.object(raw);
    const fallback = window.GameModules.entryTime?.calendarFor(worldTag, { worldTag }) || { label: '公元纪年', months: ['1月'], days: 31, hours: ['上午'], units: { year: '年', month: '月', day: '日', hour: '时' } };
    return {
      label: String(obj.label || fallback.label).slice(0, 14),
      months: this.stringList(this.array(obj.months).length ? obj.months : fallback.months, 12).map((x) => x.slice(0, 10)),
      days: Math.max(7, Math.min(60, Number(obj.days) || fallback.days || 30)),
      hours: this.stringList(this.array(obj.hours).length ? obj.hours : fallback.hours, 8).map((x) => x.slice(0, 10)),
      units: this.object(obj.units).year ? obj.units : fallback.units,
    };
  },

  isRealWorld(worldTag) { return /现实|现代都市|2026/.test(String(worldTag || '')); },

  realWorld(worldTag) {
    const event = { eventId: 'event_1', name: '现实日常展开', time: '当前时期', summary: '家庭与工作生活继续推进。', detail: '玩家在现实城市生活中处理工作、家庭和人际关系。', storyIndexes: ['现实日常'], factionIds: ['faction_1'], status: '进行中' };
    return this.validate({ worldTag, background: '2026年现代都市日常生活。', factions: [{ name: '家庭关系网', desc: '亲属与同住关系' }, { name: '职场组织', desc: '工作与社会协作' }], specialJobs: [{ name: '程序工程师', desc: '软件研发职业' }, { name: '学生', desc: '现代教育身份' }], jobRanks: ['初级', '中级', '高级'], coreRules: ['现实法律约束', '家庭责任影响', '职场秩序运行'], calendar: { label: '公元纪年', months: ['1月', '6月', '12月'], days: 31, hours: ['上午', '下午', '夜晚'], units: { year: '年', month: '月', day: '日', hour: '时' } }, worldline: { timeRange: '[2026年当前 - 后续日常]', events: [event], storyIndexes: ['现实日常'], factionMap: { faction_1: { 势力ID: 'faction_1', 名称: '现实社会', 类型: '社会', 属性: { 影响: '高' }, 关系网: {}, 当前目标: '维持日常秩序', 近期决策: [], 状态: '正常' } } }, specialFields: window.GameModules.worldAttributes.defaults(worldTag).fields }, worldTag);
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
      worldline: {
        timeRange: '[当前起点 - 后续发展]',
        events: [{ eventId: 'event_1', name: fate ? '圣杯暗流' : '异变扩散', time: '当前时期', summary: '暗处冲突开始影响角色行动。', detail: '世界线中出现会改变原有剧情走向的异常事件，角色与势力会围绕资源、秘密或生存做出选择。', storyIndexes: ['默认剧情起点'], factionIds: ['faction_1'], status: '进行中' }],
        storyIndexes: ['默认剧情起点'],
        factionMap: { faction_1: { 势力ID: 'faction_1', 名称: fate ? '魔术协会' : '本地势力', 类型: '组织', 属性: { 影响力: '中', 资源: '中' }, 关系网: {}, 当前目标: '维持秩序并争夺关键资源', 近期决策: [], 状态: '正常' } },
      },
      specialFields: window.GameModules.worldAttributes.defaults(worldTag).fields,
    }, worldTag);
  },
};
