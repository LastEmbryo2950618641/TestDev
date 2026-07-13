/**
 * AI 剧情兜底结果：在模型失败或 JSON 解析失败时保持剧情可继续。
 */
window.GameModules = window.GameModules || {};

window.GameModules.createFallbackResult = function createFallbackResult(state, action) {
  const online = state.online;
  const name = state.character.name;
  const actor = /男性|男人|少年|青年|父亲|哥哥|弟弟|叔叔|丈夫|王子|皇帝/.test(`${name} ${state.character.role} ${state.character.detail}`) ? '他' : '她';
  const text = action || (online ? '谨慎观察' : '让角色自由行动');
  const rawPlace = state.entryCurrentAction || state.sceneTitle || '昏暗的现场';
  const place = /进入时机行动生成|任务定位|原因[:：]|时间[:：]|角色[:：]|世界观[:：]|剧情索引/.test(String(rawPlace || '')) ? `${name}当前所在的场景` : rawPlace;
  const onlineCount = state.characterRpgState?.values?.control_experience?.onlineCount || 0;
  const firstOnline = onlineCount <= 1;
  const resistance = Math.max(0, Math.min(100, state.resistance + (online ? 3 : -2)));
  const trust = Math.max(0, Math.min(100, state.trust + (online ? 0 : 2)));
  const emotionDeltas = online
    ? { 冷静: -6, 恐惧: 8, 担忧: 6, 高兴: -2, 紧张: 7, 愤怒: 3, 羞耻: 1, 悲伤: 1, 好奇: 2, 麻木: 0, 嫉妒: 0, 绝望: 2 }
    : { 冷静: 4, 恐惧: -4, 担忧: -2, 高兴: 1, 紧张: -3, 愤怒: -1, 羞耻: 0, 悲伤: 0, 好奇: 3, 麻木: -1, 嫉妒: 0, 绝望: -1 };
  const emotions = window.GameModules.metrics.emotionKeys.map((key) => ({
    key,
    delta: emotionDeltas[key] ?? 0,
    status: online ? `${actor}身体失控，这项情绪随之波动。` : `${actor}重新获得自主，这项情绪趋于稳定。`,
    reason: online ? `你接管了${actor}的身体，让${actor}失去行动主导权。` : `你暂时退开，${actor}终于能按自己的判断行动。`,
  }));

  return {
    sceneTitle: state.sceneTitle || '裂隙前厅',
    elapsedSeconds: /学习|训练|准备|研究|等待|旅行|赶路|休息|睡|一天|小时/.test(text) ? 3600 : 60,
    thinking: state.thinkingMode ? `依据玩家输入「${text}」、当前上线状态与${name}的心理压力，优先推进可见行动结果，同时保留角色对操控的反应。` : '',
    narration: online
      ? `意识沉下去的瞬间，空气像冰水一样灌进肺里。你在${name}的身体里睁开眼，皮肤、骨节与呼吸都变得陌生而真实；${place}的阴影贴在四周，细小的声响沿着神经爬过来。身体先于迟疑做出反应，向能避开危险的方向挪动半步，而真正的${name}被困在更深处，只能感到这具身体正一点点脱离自己的意志。`
      : `${name}重新掌握身体时，指尖还残留着不属于自己的僵硬。她没有立刻照做你的建议，而是先压住呼吸，确认四周的动静，再用自己的判断向前试探。`,
    speech: online ? (firstOnline ? '我的身体……为什么不听使唤了？' : '我的身体又不听使唤了……') : '这次，让我自己来判断。',
    mind: online ? (firstOnline ? '怎、怎么回事……我的身体为什么突然不听我使唤了？' : '又来了……我的身体为什么又不听我使唤了？') : '身体终于又能动了，但那个人的痕迹还压在心里。',
    mood: online ? '动摇' : '好奇',
    trust,
    resistance,
    quest: '调查操控裂隙',
    characterIntent: online ? `${name}下一步想要夺回身体的主导权。` : `${name}下一步想要用自己的方式判断局势。`,
    controlFeeling: state.characterRpgState?.values?.control_experience?.feeling || '疑惑',
    controlAdaptation: state.characterRpgState?.values?.control_experience?.adaptation || 0,
    controlExperienceSummary: '身体控制权异常，来源仍然未知。',
    metricUpdates: {
      emotions,
      playerFeelings: window.GameModules.metrics.playerKeys.map((key) => ({
        key,
        delta: key === '警惕' ? (online ? 5 : -2) : 0,
        status: key === '了解' ? `${actor}仍不清楚你的身份与来历。` : (key === '警惕' ? `${actor}仍在观察你，保持防备。` : `${actor}对你的这项感受没有明显变化。`),
        reason: key === '了解' ? `你没有透露更多关于自己的信息。` : (key === '警惕' ? `${actor}不知道你接下来会怎么使用这具身体，所以继续戒备。` : `你本回合没有做出直接改变${actor}这项感受的事。`),
      })),
    },
    choices: ['使用技能调查', '主动交涉', '避开危险', '触碰异常物'],
    appearedCharacters: [{ name, role: state.character.role, detail: state.character.detail || state.character.personality, personality: state.character.personality || '', work: state.character.work, isMinor: false, importance: 'main' }],
    statChanges: { health: 0, stamina: online ? -2 : 1, mental_stability: online ? -1 : 1 },
    combatEvent: null,
  };
};
