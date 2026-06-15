/**
 * AI 剧情提示词：要求返回结构化 JSON，便于 UI 更新。
 */
window.GameModules = window.GameModules || {};

window.GameModules.createSystemPrompt = async function createSystemPrompt(state, action) {
  const character = state.character;
  const experience = state.characterRpgState?.values?.control_experience || { onlineCount: 0, feeling: '未知', adaptation: 0, summary: '尚未经历上线操控。' };
  const actor = /男性|男人|少年|青年|父亲|哥哥|弟弟|叔叔|丈夫|王子|皇帝/.test(`${character.name} ${character.role} ${character.detail}`) ? '他' : '她';
  window.GameModules.metrics.ensure(state);
  const realWorld = window.GameModules.realWorld2026 || {};
  const outputJson = JSON.stringify({
    sceneTitle: '当前场景标题', elapsedSeconds: 60,
    ...(state.thinkingMode ? { thinking: '80到160字，概括你如何依据玩家输入、角色状态和场景推进本回合，不写隐藏推理' } : {}),
    narration: '必须以作者口吻直接续写小说正文，第三人称剧情描写，220到420字，可读性高，细节充足', speech: '角色说出口的话，可为空', mind: `${character.name}自己的第一人称内心独白，80到160字`, mood: '冷静', trust: 45, resistance: 20,
    quest: '新的当前目标', characterIntent: `${character.name}自己下一步想要做什么`, controlFeeling: '疑惑', controlAdaptation: 0, controlExperienceSummary: '40字内感受变化',
    metricUpdates: { emotions: [{ key: '只返回本回合需要变化或解释的情绪名', delta: 0, status: '变化后的状态含义', reason: '导致变化的具体原因' }], playerFeelings: [{ key: '只返回本回合需要变化或解释的感觉名', delta: 0, status: '变化后的状态含义', reason: '导致变化的具体原因' }] },
    choices: ['观察周围异常', '尝试开口交流', '移动到安全位置', '使用当前能力'], appearedCharacters: [{ name: '姓名', role: '身份', detail: '基础资料', personality: '性格', work: '所属作品或世界', isMinor: true, importance: 'minor' }],
    statChanges: { health: 0, stamina: 0, mental_stability: 0 }, combatEvent: { summary: '若发生攻防则描述', attackPower: 0, defensePower: 0, effectiveDamage: 0 },
    lexiconUpdates: [{ worldTag: character.work || '原创世界', kind: '装备/物品/穿着/状态/角色卡/角色技能', field: '角色卡字段名', name: '词条名或skills', value: { name: '技能名', desc: '技能说明', description: '说明', equipSlots: ['装备'], slot: '装备' }, summary: '摘要', description: '说明', reason: '本回合事实证据、触发事件、角色动机、状态来源或关系变化依据' }],
  });
  return window.GameModules.promptTemplates.render('story-engine', {
    玩家姓名: state.playerName || '玩家', 游戏介绍: window.GameModules.appBackground || '你手机上无意中多了一个名为《我狠狠控制》的 APP。你选择作品、角色与进入时机后，按下连接按钮，意识坠入黑暗，并在陌生身体的真实感官里醒来。',
    现实世界: realWorld.label || '2026 现代都市现实世界', 现实背景: realWorld.summary || '玩家生活在现代都市，个人信息由玩家自行设定。', 玩家资料: state.playerSetupSummary?.() || `姓名/代号：${state.playerName || '玩家'}`, 玩家属性: state.playerIdentitySummary?.() || '玩家本人属性尚未生成。', 关系边界: realWorld.relationHint || '玩家相关人际关系只以玩家填写为准，未填写不要擅自补完。',
    角色姓名: character.name, 作品: character.work || '原创世界', 角色身份: character.role, 角色资料: character.detail || character.personality || '暂无补充资料', 角色技能: character.skills.map((s) => `${s.name}:${s.desc}`).join('；') || '无', 角色代词: actor,
    小说文风: state.writingStylePrompt?.() || '正文采用小说文风，重视画面、动作和心理反应，避免复述玩家指令。', 思考展示规则: state.thinkingMode ? 'thinking 是展示给玩家看的 AI 思考摘要，只概括依据哪些状态推进剧情，不输出隐藏推理链，不替代正文。' : '当前思考模式关闭，不要返回 thinking 字段。',
    上线状态: state.online ? 'online' : 'offline', 控制模式: state.controlMode, 当前场景: state.sceneTitle, 游戏时间: state.entryTimeLabel?.() || '时间未知', 回合: state.turn, 当前情绪: state.mood, 信任: state.trust, 反抗: state.resistance, 目标: state.quest, 基础状态: JSON.stringify(state.rpgVitals(state.characterRpgState)), 固定数值: `当前情绪=${JSON.stringify(state.emotions)}；对玩家感觉=${JSON.stringify(state.playerFeelings)}`,
    上线次数: experience.onlineCount, 上线感觉: experience.feeling, 适应度: experience.adaptation, 上线摘要: experience.summary, 感觉参考: '极度惊恐/非常害怕/恐惧/疑惑/警惕/愤怒/屈辱/麻木/担忧/习惯/冷静分析', 玩家输入: action || '无，继续推进', 人物记忆: state.memoryContext || '暂无人物记忆。', 参考资料: state.ragContext || '暂无资料。',
    情绪字段: window.GameModules.metrics.emotionKeys.join('、'), 关系指标字段: window.GameModules.metrics.playerKeys.join('、'), 阶段表: window.GameModules.metrics.stageGuide(), 属性定义: Object.entries(window.GameModules.metrics.descriptions).map(([k, v]) => `- ${k}：${v}`).join('\n'), 输出示例: outputJson,
  });
};
