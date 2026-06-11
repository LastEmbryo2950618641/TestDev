/**
 * 世界观设定：每个存档首次进入某世界时固化，后续可随剧情补充。
 */
window.GameModules = window.GameModules || {};

window.GameModules.worldLore = {
  async ensure(worldTag, context = '') {
    const save = window.GameModules.sqliteSave;
    const existing = save.getWorldLore(worldTag);
    if (existing) {
      console.log('[世界观] 使用已保存设定:', worldTag);
      return existing;
    }
    console.log('[世界观] 开始生成设定:', worldTag, 'contextLength=', String(context || '').length);
    const lore = await this.generate(worldTag, context);
    await save.saveWorldLore(worldTag, lore);
    return lore;
  },

  async generate(worldTag, context) {
    try {
      if (!window.dzmm?.completions) return this.fallback(worldTag);
      let buffer = '';
      const prompt = this.prompt(worldTag, context);
      console.log('[世界观] AI请求:', { worldTag, promptLength: prompt.length, model: 'nalang-medium-0826', maxTokens: 2000 });
      await window.dzmm.completions({
        model: 'nalang-medium-0826',
        maxTokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }, (chunk) => { buffer = window.GameModules.jsonUtils.mergeStreamText(buffer, chunk); });
      console.log('[世界观] AI返回:', { worldTag, length: buffer.length, preview: buffer.slice(0, 180) });
      return this.validate(this.parse(buffer), worldTag);
    } catch (err) {
      console.warn('世界观设定生成失败，使用兜底:', err.message);
      return this.fallback(worldTag);
    }
  },

  prompt(worldTag, context) {
    return `为 AI RPG 视觉小说生成世界《${worldTag}》的固化世界观设定。当前剧情上下文：${String(context || '暂无').slice(0, 240)}。只返回一行紧凑 JSON，不要 Markdown，不要换行，不要解释。严格控制长度：background 不超过80字；factions 2到4个，每个 desc 不超过30字；specialJobs 1到4个，每个 desc 不超过30字；jobRanks 3到6项；coreRules 3到6项，每项不超过24字。必须生成 worldline 并写入：timeRange 是世界范围时间[时间1 - 时间2]；events 是异世界事件数组，每个含 eventId、name、time、summary、detail、storyIndexes、factionIds、status；storyIndexes 是原著剧情索引数组，对应 md 文档“剧情索引”；factionMap 是势力对象键值对，key=势力ID，value 必须含 势力ID、名称、类型、属性、关系网、当前目标、近期决策、状态。属性是 key:value；关系网 value 为 -100 到 100；状态只能是 正常/危机/扩张/衰退。不要生成世界专属属性字段，它会从能力维度文档固化。格式：{"worldTag":"${worldTag}","background":"背景介绍","factions":[{"name":"势力名","desc":"说明"}],"specialJobs":[{"name":"特殊职业","desc":"说明"}],"jobRanks":["等级体系"],"coreRules":["世界规则"],"calendar":{"label":"纪年名","months":["月份"],"days":30,"hours":["时段名"],"units":{"year":"年","month":"月","day":"日","hour":"时"}},"worldline":{"timeRange":"[时间1 - 时间2]","events":[{"eventId":"event_1","name":"事件名","time":"时间","summary":"摘要","detail":"详细信息","storyIndexes":["剧情索引1"],"factionIds":["faction_1"],"status":"进行中"}],"storyIndexes":["剧情索引1"],"factionMap":{"faction_1":{"势力ID":"faction_1","名称":"势力名","类型":"组织","属性":{"资源":"中等"},"关系网":{},"当前目标":"主要意图","近期决策":[],"状态":"正常"}}}}`;
  },

  parse(text) {
    return window.GameModules.jsonUtils.parseLoose(String(text || '').replace(/[\u0000-\u001F]/g, ''));
  },

  validate(lore, worldTag) {
    lore.worldTag = worldTag;
    lore.background = String(lore.background || `${worldTag}的冲突正在暗处酝酿。`).slice(0, 240);
    lore.factions = this.list(lore.factions, '势力');
    lore.specialJobs = this.list(lore.specialJobs, '职业');
    lore.jobRanks = (lore.jobRanks || []).slice(0, 8).map(String);
    lore.coreRules = (lore.coreRules || []).slice(0, 8).map(String);
    lore.calendar = this.calendar(lore.calendar, worldTag);
    lore.specialFields = window.GameModules.worldAttributes.defaults(worldTag).fields;
    lore.worldline = this.worldline(lore.worldline, lore, worldTag);
    return lore;
  },

  worldline(raw, lore, worldTag) {
    const firstFaction = (raw?.factionMap && Object.keys(raw.factionMap)[0]) || 'faction_1';
    const factions = this.factionMap(raw?.factionMap, lore.factions, worldTag);
    const storyIndexes = (raw?.storyIndexes || []).slice(0, 8).map(String);
    const events = (raw?.events || []).slice(0, 8).map((item, i) => ({
      eventId: String(item.eventId || item.事件ID || `event_${i + 1}`).slice(0, 32),
      name: String(item.name || item.名称 || `事件${i + 1}`).slice(0, 28),
      time: String(item.time || item.时间 || raw?.timeRange || '时间未知').slice(0, 48),
      summary: String(item.summary || item.摘要 || '').slice(0, 90),
      detail: String(item.detail || item.详细信息 || item.summary || '').slice(0, 420),
      storyIndexes: (item.storyIndexes || item.剧情索引 || storyIndexes).slice(0, 6).map(String),
      factionIds: (item.factionIds || item.关联势力 || [firstFaction]).slice(0, 6).map(String),
      status: ['未触发', '进行中', '已结束', '改变原著'].includes(item.status || item.状态) ? (item.status || item.状态) : '进行中',
    }));
    return { timeRange: String(raw?.timeRange || raw?.时间 || '[时间未知 - 时间未知]').slice(0, 80), events, storyIndexes, factions };
  },

  factionMap(raw, list, worldTag) {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) return Object.fromEntries(Object.entries(raw).slice(0, 8).map(([id, item]) => [id, this.faction(id, item)]));
    return Object.fromEntries((list?.length ? list : [{ name: `${worldTag}主要势力`, desc: '影响当前世界线。' }]).slice(0, 4).map((item, i) => {
      const id = `faction_${i + 1}`;
      return [id, this.faction(id, { 名称: item.name, 类型: '组织', 属性: { 说明: item.desc || '暂无' }, 关系网: {}, 当前目标: item.desc || '维持影响力', 近期决策: [], 状态: '正常' })];
    }));
  },

  faction(id, item) {
    const state = ['正常', '危机', '扩张', '衰退'].includes(item?.状态 || item?.status) ? (item.状态 || item.status) : '正常';
    return { 势力ID: String(item?.势力ID || item?.id || id), 名称: String(item?.名称 || item?.name || id).slice(0, 28), 类型: String(item?.类型 || item?.type || '组织').slice(0, 12), 属性: item?.属性 || item?.attrs || {}, 关系网: item?.关系网 || item?.relations || {}, 当前目标: String(item?.当前目标 || item?.goal || '').slice(0, 90), 近期决策: (item?.近期决策 || item?.decisions || []).slice(0, 6).map(String), 状态: state };
  },

  list(items, prefix) {
    return (items || []).slice(0, 8).map((item, index) => ({
      name: String(item.name || `${prefix}${index + 1}`).slice(0, 18),
      desc: String(item.desc || '').slice(0, 90),
    }));
  },

  calendar(raw, worldTag) {
    const fallback = window.GameModules.entryTime?.calendarFor(worldTag, { worldTag }) || { label: '公元纪年', months: ['1月'], days: 31, hours: ['上午'], units: { year: '年', month: '月', day: '日', hour: '时' } };
    return {
      label: String(raw?.label || fallback.label).slice(0, 14),
      months: (raw?.months?.length ? raw.months : fallback.months).slice(0, 12).map((x) => String(x).slice(0, 10)),
      days: Math.max(7, Math.min(60, Number(raw?.days) || fallback.days || 30)),
      hours: (raw?.hours?.length ? raw.hours : fallback.hours).slice(0, 8).map((x) => String(x).slice(0, 10)),
      units: raw?.units || fallback.units,
    };
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
