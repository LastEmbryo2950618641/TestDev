/**
 * 现实世界推演提示词：玩家收起手机后，以本人身份在现实世界行动。
 */
window.GameModules = window.GameModules || {};

window.GameModules.createRealWorldPrompt = async function createRealWorldPrompt(state, action) {
  const realWorld = window.GameModules.realWorld2026 || {};
  const recent = (state.realWorldLog || []).slice(-6).map((entry) => (entry.type === 'user' ? `玩家行动：${entry.text}` : `推演结果：${entry.narration || entry.text || ''}`)).join('\n') || '暂无现实世界推演记录。';
  const outputJson = JSON.stringify({
    sceneTitle: '现实场景标题', elapsedSeconds: 60, thinking: '60到140字，概括现实推演依据，不写隐藏推理', narration: '以第二人称续写现实世界中的行动结果，180到360字，现实、克制、细节充分', status: '现实状态简述', quest: '新的现实目标', choices: ['处理现实事务', '联系某个人', '观察周围', '暂时休息'],
    lexiconUpdates: [{ worldTag: realWorld.label || '2026 现代都市现实世界', kind: '玩家设定', name: '词条名', value: '新值', summary: '摘要', description: '说明', reason: '为什么现实行动导致该词条需要修改或新增' }],
  });
  return window.GameModules.promptTemplates.render('real-world-engine', {
    现实世界: realWorld.label || '2026 现代都市现实世界', 现实背景: realWorld.summary || '玩家生活在现代都市，个人信息由玩家自行设定。', 关系边界: realWorld.relationHint || '玩家相关人际关系只以玩家填写为准，未填写不要擅自补完。', 手机时间: `${state.phoneDateText?.() || '未知'} ${state.phoneTimeText?.() || ''}`,
    玩家资料: state.playerSetupSummary?.() || `姓名/代号：${state.playerName || '玩家'}`, 玩家属性: state.playerIdentitySummary?.() || '玩家本人属性尚未生成。', 公司系统: state.companyPromptContext?.() || '暂无公司系统词条。', 当前场景: state.realWorldSceneTitle || '现实世界', 当前目标: state.realWorldQuest || '确认手机异常与现实处境', 最近记录: recent, 本次行动: action || '继续观察现实世界', 输出示例: outputJson,
  });
};
