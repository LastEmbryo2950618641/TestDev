/**
 * 现实世界推演提示词：玩家收起手机后，以本人身份在现实世界行动。
 */
window.GameModules = window.GameModules || {};

window.GameModules.createRealWorldPrompt = async function createRealWorldPrompt(state, action) {
  const realWorld = window.GameModules.realWorld2026 || {};
  const stateSkill = await window.GameModules.skillLoader?.instruction?.('emotion.feeling.wearing.assess') || '';
  const memorySkill = await window.GameModules.skillLoader?.instruction?.('memory.query') || '';
  const vitalSkill = await window.GameModules.skillLoader?.instruction?.('realworld.vitals.adjust') || '';
  const memoryArchive = await state.searchMemoryArchive?.('player-self', action) || '无';
  const map = window.GameModules.realWorldMap.ensure(state, state.playerProfile || {});
  const recent = (state.realWorldLog || []).slice(-6).map((entry) => (entry.type === 'user' ? `玩家行动：${entry.text}` : `地点：${entry.locationName || state.realWorldLocationName || map.current}\n推演结果：${entry.narration || entry.text || ''}`)).join('\n') || '暂无现实世界推演记录。';
  const facts = (map.nodes || []).map((node) => `${node.name}：${(node.descriptionFacts || []).map((fact, i) => window.GameModules.realWorldMapFacts.formatFact(fact, i)).join('')}`).join('\n') || '暂无地点说明。';
  const outputJson = JSON.stringify({
    sceneTitle: '现实场景标题', locationName: '具体地点名', parentLocationName: '上级地点名', locationDescription: '当前地点本次新认识的事实', mapNodes: [{ name: '子地点名', parentName: '上级地点名', descriptionFacts: ['玩家已知地点事实'] }], newLocations: [{ name: '新增地点名', parentName: '', descriptionFacts: ['玩家已知事实'] }], locationDescriptionUpdates: [{ locationName: '地点名', action: 'add', text: '新增或更新的玩家已知事实' }], elapsedSeconds: 60, narration: '以第二人称续写现实世界中的行动过程和直接结果，180到360字，现实、克制、细节充分', status: '现实状态简述', quest: '新的现实目标', choices: ['处理现实事务', '联系某个人', '观察周围', '暂时休息'],
    vitalUpdates: [{ key: 'stamina_pool', delta: -1, reason: '本次行动消耗少量精力。' }, { key: 'satiety', delta: 0, reason: '本次行动时间较短，饱食度基本不变。' }, { key: 'hydration', delta: 0, reason: '本次行动时间较短，水分基本不变。' }, { key: 'fatigue', delta: 1, reason: '持续行动带来轻微疲劳。' }, { key: 'mental_stability', delta: 0, reason: '本次行动没有直接冲击精神稳定。' }],
    metricUpdates: { target: 'player-self', emotions: [{ key: '情绪名', delta: 0, status: '变化后的状态含义', reason: '现实触发原因' }], playerFeelings: [{ key: '感觉名', delta: 0, status: '变化后的状态含义', reason: '现实触发原因' }] },
    characterMetricUpdates: [{ target: '相关角色id或姓名', emotions: [{ key: '情绪名', delta: 0, status: '变化后的状态含义', reason: '该角色受本回合事件影响的原因' }], playerFeelings: [{ key: '感觉名', delta: 0, status: '该角色对玩家的新态度', reason: '该角色对玩家感觉变化或维持的具体证据' }] }],
    lexiconUpdates: [{ worldTag: realWorld.label || '2026 现代都市现实世界', kind: '玩家设定/装备/物品/穿着/角色卡/角色技能', field: '角色卡字段名', name: '词条名或skills', value: '新值或对象', summary: '摘要', description: '说明', reason: '现实证据、触发行动、状态来源或动机' }],
  });
  return window.GameModules.promptTemplates.render('real-world-engine', {
    现实世界: realWorld.label || '2026 现代都市现实世界', 现实背景: realWorld.summary || '玩家生活在现代都市，个人信息由玩家自行设定。', 关系边界: realWorld.relationHint || '玩家相关人际关系只以玩家填写为准，未填写不要擅自补完。', 手机时间: `${state.phoneDateText?.() || '未知'} ${state.phoneTimeText?.() || ''}`,
    玩家资料: state.playerSetupSummary?.() || `姓名/代号：${state.playerName || '玩家'}`, 玩家属性: state.playerIdentitySummary?.() || '玩家本人属性尚未生成。', 公司系统: state.companyPromptContext?.() || '暂无公司系统词条。', 当前场景: state.realWorldSceneTitle || '现实世界', 当前地点: state.realWorldLocationName || map.current || '尚未生成，必须由本次推演根据玩家资料生成具体地点', 现实地图: map.lastText || window.GameModules.realWorldMap.render(map), 已知地点: (map.nodes || []).map((node) => `${node.parentId ? '子地点' : '根地点'}：${node.name}`).join('；') || '暂无，必须本次生成具体根地点', 地点说明: facts, 当前目标: state.realWorldQuest || '确认手机异常与现实处境', 目标状态快照: window.GameModules.promptSections.stateSnapshot(state, state.playerIdentityState?.()), 最近记录: recent, 记忆查询结果: [state.memoryQueryContext?.('player-self', action) || '暂无人物记忆。', `## 记忆归档\n${memoryArchive}`].join('\n\n'), 本次行动: action || '继续观察现实世界', 状态判定Skill: [stateSkill, vitalSkill].filter(Boolean).join('\n\n'), 记忆查询Skill: memorySkill, 输出示例: outputJson,
  });
};
