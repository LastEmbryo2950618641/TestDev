/**
 * 现实世界推演提示词：玩家收起手机后，以本人身份在现实世界行动。
 */
window.GameModules = window.GameModules || {};

window.GameModules.createRealWorldPrompt = async function createRealWorldPrompt(state, action) {
  const realWorld = window.GameModules.realWorld2026 || {};
  const memoryArchive = await state.searchMemoryArchive?.('player-self', action) || '无';
  const map = window.GameModules.realWorldMap.ensure(state, state.playerProfile || {});
  const recent = (state.realWorldLog || []).slice(-6).map((entry) => (entry.type === 'user' ? `玩家行动：${entry.text}` : `地点：${entry.locationName || state.realWorldLocationName || map.current}\n推演结果：${entry.narration || entry.text || ''}`)).join('\n') || '暂无现实世界推演记录。';
  const facts = (map.nodes || []).map((node) => {
    const infoFacts = window.GameModules.realWorldMapFacts?.normalizeFacts?.(node, node.description, window.GameModules.realWorldMapFacts.nowLabel(state)) || [];
    const factsText = infoFacts.map((fact, index) => window.GameModules.ui.realWorld.mapInfoViewHelpers.factText.call(state, fact, index)).filter(Boolean).join('') || node.description || '暂无说明。';
    return `${node.name}：${factsText}`;
  }).join('\\n') || '暂无地点说明。';
  const outputJson = JSON.stringify({
    sceneTitle: '现实场景标题', locationName: '具体地点名', parentLocationName: '上级地点名', locationDescription: '当前地点本次新认识的事实', mapNodes: [{ name: '子地点名', parentName: '上级地点名', descriptionFacts: ['玩家已知地点事实'] }], newLocations: [{ name: '新增地点名', parentName: '', descriptionFacts: ['玩家已知事实'] }], locationDescriptionUpdates: [{ locationName: '地点名', action: 'add', text: '新增或更新的玩家已知事实' }], elapsedSeconds: 60, narration: '以第二人称续写现实世界中的行动过程和直接结果，180到360字，现实、克制、细节充分', status: '现实状态简述', quest: '新的现实目标', choices: ['处理现实事务', '联系某个人', '观察周围', '暂时休息'],
    genericUpdates: [{ updateType: 'vital', subject: { type: 'player', id: 'player-self' }, field: 'vitals.stamina_pool', change: { mode: 'delta', value: -1 }, reasons: [{ trigger: '行动消耗', evidence: '本次行动消耗少量精力', confidence: 'confirmed' }] }, { updateType: 'emotion', subject: { type: 'player', id: 'player-self' }, field: 'metrics.emotions.紧张', change: { mode: 'delta', value: 1 }, reasons: [{ trigger: '现实刺激', evidence: '正文确认情绪变化', confidence: 'confirmed' }] }, { updateType: 'feeling', subject: { type: 'character', id: '相关角色id或姓名' }, field: 'metrics.playerFeelings.信任', change: { mode: 'delta', value: 1 }, reasons: [{ trigger: '互动结果', evidence: '正文确认角色对玩家感觉变化', confidence: 'confirmed' }] }],
  });
  const actionText = action || '继续观察现实世界';
  const currentLocation = state.realWorldLocationName || map.current || '尚未生成，必须由本次推演根据玩家资料生成具体地点';
  const baseContext = [
    `现实世界：${realWorld.label || '2026 现代都市现实世界'}`,
    `现实背景：${realWorld.summary || '玩家生活在现代都市，个人信息由玩家自行设定。'}`,
    window.GameModules.gamePremise?.aiPremiseLine || '',
    `关系边界：${realWorld.relationHint || '玩家相关人际关系只以玩家填写为准，未填写不要擅自补完。'}`,
    `手机时间：${state.phoneDateText?.() || '未知'} ${state.phoneTimeText?.() || ''}`,
    `玩家资料：${state.playerSetupSummary?.() || `姓名/代号：${state.playerName || '玩家'}`}`,
    ...(state.playerAspirationSummary?.() ? [`人生取向：${state.playerAspirationSummary()}`] : []),
    `玩家属性：${state.playerIdentitySummary?.() || '玩家本人属性尚未生成。'}`,
    `公司系统：${state.companyPromptContext?.() || '暂无公司系统词条。'}`,
    `当前场景：${state.realWorldSceneTitle || '现实世界'}`,
    `当前目标：${state.realWorldQuest || '确认手机异常与现实处境'}`,
    `目标状态快照：${window.GameModules.promptSections.stateSnapshot(state, state.playerIdentityState?.())}`,
    `主体ID规则：${window.GameModules.promptSections.subjectIdRules(state)}`,
    `最近记录：\n${recent}`,
  ].join('\n');
  const sceneAnchorReport = [
    `当前地点：${currentLocation}`,
    `现实地图：${map.lastText || window.GameModules.realWorldMap.render(map)}`,
    `已知地点：${(map.nodes || []).map((node) => `${node.parentId ? '子地点' : '根地点'}：${node.name}`).join('；') || '暂无，必须本次生成具体根地点'}`,
    `地点说明：\n${facts}`,
  ].join('\n');
  const loadedMaterials = [
    state.memoryQueryContext?.('player-self', action) || '暂无人物记忆。',
    `## 记忆归档\n${memoryArchive}`,
  ].join('\n\n');
  const renderPrompt = window.GameModules.renderPrompt || ((id, vars) => window.GameModules.promptTemplates?.render?.(id, vars));
  return renderPrompt('inference-stage3-narration', {
    模式标签: '现实',
    本次行动: actionText,
    基础上下文: baseContext,
    场景锚定报告: sceneAnchorReport,
    已动态载入资料: loadedMaterials,
    紧凑返回规则: `只输出正文，不输出 JSON。旧结构示例仅作兼容参考：${outputJson}`,
  });
};
