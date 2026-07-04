window.GameModules = window.GameModules || {};
window.GameModules.realWorldAgentContextParts = window.GameModules.realWorldAgentContextParts || {};

window.GameModules.realWorldAgentContextParts.core = {
  limit(text, max = 1200) {
    return String(text || '').trim().slice(0, max);
  },


  recentLog(store, limit = 3) {
    const rows = (store.realWorldLog || []).filter((entry) => entry.type !== 'system').slice(-limit);
    return rows.map((entry) => entry.type === 'user'
      ? `玩家行动：${entry.text}`
      : `地点：${entry.locationName || store.realWorldLocationName || '未知'}｜结果：${this.limit(entry.narration || entry.text || '', 260)}`).join('\n') || '暂无现实世界推演记录。';
  },


  worldlineRecordText(event = {}) {
    return [
      `记录编号：${event.eventId || event.id || '未知记录'}`,
      `时间：${event.time || '未知'}`,
      `标题：${event.name || '现实事件'}`,
      `情节：${event.plotId || event.summary || '未归纳'}`,
      `状态：${event.status || '已记录'}`,
      `详细：${String(event.detail || '').trim()}`,
    ].filter(Boolean).join('\n');
  },


  recentWorldlineRecords(store, targetChars = 5000, maxChars = 6000) {
    const line = store.realWorldline?.() || {};
    const events = (line.events || []).filter((event) => String(event.detail || '').trim());
    const picked = [];
    let total = 0;
    const separator = '\n\n---\n\n';
    for (const event of events.slice().reverse()) {
      const text = this.worldlineRecordText(event);
      const nextTotal = total + text.length + (picked.length ? separator.length : 0);
      if (nextTotal > maxChars) break;
      picked.push(text);
      total = nextTotal;
      if (total >= targetChars) break;
    }
    return picked.length ? picked.reverse().join(separator) : '暂无符合长度上限的最近世界线记录。';
  },


  buildLoadedText(items = []) {
    if (!items.length) return '本轮尚未动态载入额外资料。';
    return items.map((item, index) => `### 资料${index + 1}｜${item.title}\n${this.limit(item.text, item.max || 1600)}`).join('\n\n');
  },


  recentWorldline(store, limit = 800, separator = '\n') {
    return this.recentWorldlineRecords(store, limit, limit).split(/\n\n---\n\n/u).join(separator);
  },

  systemRecordLine(record = {}) {
    return [
      `类型：${record.key || '记录'}`,
      record.at ? `时间：${record.at}` : '',
      `内容：${String(record.value || '').trim()}`,
      record.reason ? `原因：${String(record.reason || '').trim()}` : '',
    ].filter(Boolean).join('｜');
  },

  recentSystemRecords(store, limit = 8, maxChars = 1200) {
    const rows = [
      ...(Array.isArray(store?.realWorldSystemRecords) ? store.realWorldSystemRecords : []),
      ...(window.GameModules.updateRegistry?.legacySystemRecords?.(store) || []),
    ].filter((item) => String(item?.value || '').trim());
    const picked = [];
    let total = 0;
    for (const record of rows.slice(-limit).reverse()) {
      const line = this.systemRecordLine(record);
      const nextTotal = total + line.length + (picked.length ? 1 : 0);
      if (nextTotal > maxChars) break;
      picked.push(line);
      total = nextTotal;
    }
    return picked.length ? picked.reverse().join('\n') : '暂无系统级补充记录。';
  },


  recentSummary(store, count = 4) {
    return this.recentLog(store, count);
  },


  recentCompletedLogEntries(store, excludeLogId = null, limit = 4) {
    let rows = (store?.realWorldLog || [])
      .filter((entry) => entry.type !== 'system' && !entry.streaming && entry.id !== excludeLogId);
    if (rows.length && rows[rows.length - 1]?.type === 'user') rows = rows.slice(0, -1);
    return rows.slice(-Math.max(1, limit));
  },


  recentContinuityLogText(store, excludeLogId = null, limit = 4) {
    const rows = this.recentCompletedLogEntries(store, excludeLogId, limit);
    if (!rows.length) return '暂无上一轮推演记录。';
    return rows.map((entry) => entry.type === 'user'
      ? `玩家行动：${entry.text}`
      : `地点：${entry.locationName || store?.realWorldLocationName || '未知'}｜结果：${this.limit(entry.narration || entry.text || '', 260)}`).join('\n');
  },


  lastRoundStage1GuidanceFromStore(store, excludeLogId = null) {
    const aiEntries = (store?.realWorldLog || [])
      .filter((entry) => entry.type === 'ai' && !entry.streaming && entry.id !== excludeLogId && Array.isArray(entry.agentTrace) && entry.agentTrace.length);
    const last = aiEntries[aiEntries.length - 1];
    if (!last) return null;
    const trace = last.agentTrace;
    return [...trace].reverse().find((item) => item?.type === 'context_done') || trace[trace.length - 1] || null;
  },


  stage1GuidanceSummary(guidance = null) {
    if (!guidance) return '无';
    const names = (group = [], reasonLabel = '理由') => (Array.isArray(group) ? group : []).map((item) => {
      const name = typeof item === 'string' ? item : (item.name || item.idOrName || item.id || item.characterName);
      const reason = typeof item === 'object' && item ? item.reason : '';
      return `${name}${reason ? `（${reasonLabel}：${reason}）` : ''}`;
    }).join('、') || '无';
    const random = (Array.isArray(guidance.randomActiveEvents) ? guidance.randomActiveEvents : [])
      .map((item) => `${item.characterName || item.name}：${item.eventType || item.actionMethod || '背景行动'}｜${item.motivation || item.reason || ''}`)
      .join('；') || '无';
    const queryReasons = (label, key) => {
      const items = [...new Set(Array.isArray(guidance.sceneQueries?.[key]) ? guidance.sceneQueries[key] : [])];
      return items.length ? items.map((item, index) => `${label}${index + 1}：${item}`).join('\n') : `${label}1：无`;
    };
    return [
      `资料状态：${guidance.type === 'context_done' ? '资料已足够' : '继续请求资料'}`,
      queryReasons('地点查询理由', 'location'),
      queryReasons('因果查询理由', 'causality'),
      queryReasons('冲突查询理由', 'conflict'),
      `强制出场：${names(guidance.forcedParticipants, '出场理由')}`,
      `高优先候选：${names(guidance.priorityCandidates, '候选理由')}`,
      `戏剧候选：${names(guidance.dramaCandidates, '候选理由')}`,
      `禁止出场：${names(guidance.forbiddenParticipants, '不在场理由')}`,
      `随机主动事件：${random}`,
      `随机事件闯入条件：${guidance.randomIntrusionCondition || '无明确条件则禁止闯入'}`,
    ].join('\n');
  },


  redactPromptPollution(text = '') {
    const banned = [
      /时间规则：所有现实时间都以桌面时间为准[^\n]*/gu,
      /本次 final 必须返回[^\n]*/giu,
      /final\.wechatActions[^\n]*/giu,
      /elapsedSeconds[^\n]*/giu,
      /subject\.id[^\n]*/giu,
      /主体ID规则：[\s\S]*?(?=\n[^\n：]{1,16}：|$)/gu,
      /Skill：[^\n]*/gu,
      /激活条件：[^\n]*/gu,
      /返回格式：[^\n]*/gu,
      /结算对象[^\n]*/gu,
      /类型完成[^\n]*/gu,
      /更新N[^\n]*/gu,
      /正文必须[^\n]*/gu,
      /场景锚定报告[^\n]*/gu,
      /需严格跟着世界线续写[^\n]*/gu,
      /生日[^\n]*/gu,
      /具体地址：[^\n]*/gu,
      /财富[^\n]*/gu,
      /固定收入：[^\n]*/gu,
      /性经验次数：[^\n]*/gu,
      /父母去世原因：[^\n]*/gu,
      /世界观补全：暂无[^\n]*/gu,
      /势力资料库：[\s\S]*?暂无[^\n]*(?=\n|$)/gu,
      /全部情绪值：[^\n]*/gu,
      /全部对玩家感觉值：[^\n]*/gu,
      /全部穿着槽：[^\n]*/gu,
      /全部物品：[^\n]*/gu,
      /全部技能：[^\n]*/gu,
      /全部核心属性数值：[^\n]*/gu,
      /全部身体状态细项：[^\n]*/gu,
    ];
    const promptLeakLine = (line = '') => /final|role[- ]?card|RPG/iu.test(line)
      && /位置|地点|房间|门口|走廊|客厅|空间|相邻|在场|附近|路过|进入|听见|看见|通信|微信|当前行动|当前状态|状态|标题|场景/u.test(line);
    return banned.reduce((out, pattern) => out.replace(pattern, ''), String(text || ''))
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line && !promptLeakLine(line))
      .join('\n');
  },


  sanitizeLoadedTitle(title = '', index = 0) {
    const cleaned = this.redactPromptPollution(title || '').trim();
    const methodLike = /(^|[^\p{Script=Han}])(?:[a-z][\w-]*\.)+(?:[a-z][\w-]*)(?=$|[^\p{Script=Han}])/iu;
    const skillWords = /\b(?:skill|query|method)\b/iu;
    return cleaned && !methodLike.test(cleaned) && !skillWords.test(cleaned) ? cleaned : `资料${index + 1}`;
  },


  isRoleCardMaterial(item = {}) {
    const title = String(item?.title || '');
    const text = String(item?.text || '');
    return /角色卡|character\.query|searchCharacterProfile/u.test(title) || /资料类型：完整角色卡/u.test(text);
  },


  loadedRoleCardRoutingSummary(item = {}) {
    const text = this.redactPromptPollution(item?.text || '');
    const keepKeys = /^(资料类型|姓名|角色ID|世界|身份|性别|年龄\/生日|职业|当前地点|人际关系|外貌|性格|喜好|人物说明|社群角色|势力地位|状态标签|核心属性|身体状态|情绪|对玩家感觉|穿着|物品|技能|知识|上线体验|其他身份状态)：/u;
    const lines = text.split(/\r?\n/u).map((line) => line.trim()).filter((line) => keepKeys.test(line));
    return this.limit(lines.join('\n') || text, 1400);
  },


  loadedRoutingSummary(items = []) {
    if (!items.length) return '无';
    return items.map((item, index) => {
      const title = this.sanitizeLoadedTitle(item?.title || '', index);
      const text = this.redactPromptPollution(item?.text || '');
      const summary = this.isRoleCardMaterial(item) ? this.loadedRoleCardRoutingSummary(item) : this.limit(text, 260);
      return `资料${index + 1}：${title}\n${summary}`;
    }).filter(Boolean).join('\n') || '无';
  },


  loadedAnchorSummary(items = []) {
    if (!items.length) return '无';
    const anchorKeywords = /位置|地点|房间|门口|走廊|客厅|空间|相邻|在场|附近|路过|进入|听见|看见|通信|微信|当前行动|当前状态/u;
    const pollutionKeywords = /全部情绪|全部对玩家感觉|全部穿着槽|全部物品|全部技能|全部核心属性数值|全部身体状态细项|性经验次数|财富|生日|父母去世|等级|力量|敏捷|体质|智力|感知|意志|魅力/u;
    const promptLeakLine = (line = '') => /final|role[- ]?card|RPG/iu.test(line) && anchorKeywords.test(line);
    const titlePollutionKeywords = /final|role[- ]?card|RPG|全部情绪|全部对玩家感觉|全部穿着槽|全部物品|全部技能|全部核心属性数值|全部身体状态细项|性经验次数|财富|生日|父母去世|等级|力量|敏捷|体质|智力|感知|意志|魅力/iu;
    const keepLine = (line = '') => anchorKeywords.test(line) && !pollutionKeywords.test(line) && !promptLeakLine(line);
    return items.map((item, index) => {
      const title = titlePollutionKeywords.test(item?.title || '') ? `资料${index + 1}` : this.sanitizeLoadedTitle(item?.title || '', index);
      const lines = this.redactPromptPollution(item?.text || '').split(/\r?\n/u).filter(keepLine).slice(0, 8);
      return lines.length ? `资料${index + 1}：${title}\n${this.limit(lines.join('\n'), 420)}` : '';
    }).filter(Boolean).join('\n') || '无';
  },


  redactNarrationPollution(text = '') {
    const removeBlocks = [
      /时间规则：所有现实时间都以桌面时间为准[^\n]*/gu,
      /本次 final 必须返回[^\n]*/giu,
      /final\.wechatActions[^\n]*/giu,
      /elapsedSeconds[^\n]*/giu,
      /subject\.id[^\n]*/giu,
      /subject\.id 规则[^\n]*/giu,
      /主体ID规则：[\s\S]*?(?=\n[^\n：]{1,16}：|\n## |$)/gu,
      /势力资料库：[\s\S]*?(?:暂无记录|暂无势力资料库记录。?)[^\n]*(?=\n|$)/gu,
      /需严格跟着世界线续写，保证正文对最新世界线连续性。?/gu,
      /文本内容参照material-[^\n]*/giu,
      /参照对象：[^\n]*/gu,
      /来源ID：[^\n]*/gu,
      /关键词查询：[^\n]*/gu,
      /除非玩家提出新的未知地点[^\n]*request_context[^\n]*/gu,
      /不要继续[^\n]*request_context[^\n]*/gu,
      /不要重复[^\n]*(?:资料请求|request_context)[^\n]*/gu,
      /资料请求\d*：[^\n]*/gu,
      /request_context[^\n]*/giu,
      /Skill：[^\n]*/gu,
      /激活条件：[^\n]*/gu,
      /返回格式：[^\n]*/gu,
      /结算对象[^\n]*/gu,
      /类型完成[^\n]*/gu,
      /更新N[^\n]*/gu,
      /结算边界：[^\n]*/gu,
      /暂无记录。?/gu,
      /未填写/gu,
    ];
    const methodLike = /(^|[^\p{Script=Han}])(?:[a-z][\w-]*\.)+(?:[a-z][\w-]*)(?=$|[^\p{Script=Han}])/iu;
    const protocolLine = (line = '') => methodLike.test(line) || /\b(?:skill|query|method|Top3)\b/iu.test(line);
    return removeBlocks.reduce((out, pattern) => out.replace(pattern, ''), String(text || ''))
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line && !protocolLine(line))
      .join('\n');
  },


  safeNarrationTitle(title = '', index = 0) {
    const cleaned = this.redactNarrationPollution(title || '').trim();
    return cleaned ? this.sanitizeLoadedTitle(cleaned, index) : `资料${index + 1}`;
  },


  loadedNarrationSummary(items = []) {
    if (!items.length) return '无';
    const roleCardFields = /^(?:资料类型|姓名|角色ID|世界|身份|性别|年龄\/生日|职业|当前地点|人际关系|外貌|性格|喜好|人物说明|社群角色|势力地位|状态标签|核心属性|身体状态|情绪|对玩家感觉|穿着|物品|技能|知识|上线体验|其他身份状态)[:：]/u;
    const factKeywords = /位置|地点|房间|门口|走廊|客厅|空间|相邻|在场|附近|路过|进入|离开|等待|回应|听见|看见|可听见|可看见|通信|微信|事实|关系|历史|当前状态|当前行动|状态/u;
    const protocolKeywords = /文本内容参照|参照对象|关键词查询|资料请求|request_context|不要继续|不要重复|Top3|elapsedSeconds|subject\.id|主体ID规则|结算对象|类型完成|更新N|Skill：|激活条件|返回格式/u;
    return items.map((item, index) => {
      const title = this.safeNarrationTitle(item?.title || '', index);
      const text = this.redactNarrationPollution(item?.text || '');
      const isRoleCard = /资料类型[:：](?:完整角色卡|介绍卡)|角色卡/u.test(`${item?.title || ''}\n${text}`);
      const limitLines = isRoleCard ? 24 : 10;
      const limitChars = isRoleCard ? 1800 : 700;
      const lines = text
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .filter((line) => line && !/undefined[:：]/iu.test(line) && !protocolKeywords.test(line))
        .filter((line) => (isRoleCard ? roleCardFields.test(line) : factKeywords.test(line)))
        .slice(0, limitLines);
      return lines.length ? `资料${index + 1}：${title}\n${this.limit(lines.join('\n'), limitChars)}` : '';
    }).filter(Boolean).join('\n') || '无';
  },

};
