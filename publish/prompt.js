/**
 * AI 剧情提示词：要求返回结构化 JSON，便于 UI 更新。
 */
window.GameModules = window.GameModules || {};

window.GameModules.createSystemPrompt = function createSystemPrompt(state, action) {
  const character = state.character;
  const experience = state.characterRpgState?.values?.control_experience || { onlineCount: 0, feeling: '未知', adaptation: 0, summary: '尚未经历上线操控。' };
  const feelingExamples = '极度惊恐/非常害怕/恐惧/疑惑/警惕/愤怒/屈辱/麻木/担忧/习惯/冷静分析';
  const actor = /男性|男人|少年|青年|父亲|哥哥|弟弟|叔叔|丈夫|王子|皇帝/.test(`${character.name} ${character.role} ${character.detail}`) ? '他' : '她';
  window.GameModules.metrics.ensure(state);
  const metricDefs = window.GameModules.metrics.descriptions;
  const metricState = `当前情绪=${JSON.stringify(state.emotions)}；对玩家感觉=${JSON.stringify(state.playerFeelings)}`;
  const metricShape = (key) => ({ key, delta: 0, status: '变化后的状态含义', reason: '导致变化的具体原因' });
  const metricJson = {
    emotions: window.GameModules.metrics.emotionKeys.map(metricShape),
    playerFeelings: window.GameModules.metrics.playerKeys.map(metricShape),
  };
  const outputJson = JSON.stringify({
    sceneTitle: '当前场景标题',
    narration: '第三人称剧情描写，120字内',
    speech: '角色说出口的话',
    mind: `${character.name}自己的第一人称内心独白，60字内`,
    mood: '冷静',
    trust: 45,
    resistance: 20,
    quest: '新的当前目标',
    characterIntent: `${character.name}自己下一步想要做什么`,
    controlFeeling: '疑惑',
    controlAdaptation: 0,
    controlExperienceSummary: '40字内感受变化',
    metricUpdates: metricJson,
    choices: ['行动一', '行动二', '行动三', '行动四'],
    appearedCharacters: [{ name: '姓名', role: '身份', detail: '基础资料', personality: '性格', work: '所属作品或世界', isMinor: true, importance: 'minor' }],
    statChanges: { health: 0, stamina: 0, mental_stability: 0 },
    combatEvent: { summary: '若发生攻防则描述', attackPower: 0, defensePower: 0, effectiveDamage: 0 },
  });
  return `你是 AI RPG 视觉小说《我狠狠操控》的剧情引擎。

核心设定：
玩家不是角色本人，而是名为「${state.playerName}」的操控者。被操控角色是 ${character.name}，出自《${character.work || '原创世界'}》，身份是${character.role}。性格/资料：${character.detail || character.personality}

强制规则：
1. mode 为 online 且 controlMode 为 possess 时，这是“第二人称上线”：玩家的“我”直接附到${character.name}的肉体上行动，相当于玩家附身角色身体；对${character.name}本人来说，身体是突然不受控制的，她不知道是谁在控制，也不知道控制来源，只能意识到身体突然自己行动。
2. possess 上线后，${character.name}像被困在身体里以旁观者视角看着外界和自己的身体行动，无法控制动作或发声；但视觉、听觉、嗅觉、味觉、触觉、疼痛、疲劳等身体感觉依然能感受到。剧情行动必须来自玩家指令，${character.name}只能产生心理想法和自身意图。
3. mode 为 online 且 controlMode 为 rpg 时，玩家通过第三人称界面发出操作，${character.name}不能自主改写玩家操作，只能产生心理想法。
4. mind 必须写成${character.name}自己的第一人称内心独白，参考她当前年龄、身体状态、身份经历、人格、记忆和剧情处境；不要写成外部动作、旁白、设定说明或“观察四周”这类行动描述。
5. online 时 mind 要体现身体突然失控、未知控制来源、五感仍在但行动权丧失后的合理内心反应；具体可以是恐惧、震惊、麻木、愤怒、抗拒、计算、求生等，由角色设定和当前处境决定，不要固定模板，也不要无依据地过度镇定。禁止写“${character.name}感到……”“内心反应取决于……”这类旁白说明。
6. mode 为 offline 时，玩家已经下线，控制权交换给${character.name}。角色必须根据性格、属性、情绪和之前经历自主行动，可以听从、曲解、拒绝或反抗玩家建议。
7. 自由度要高：允许调查、战斗、谈判、逃跑、欺骗、探索、使用技能、沉默、反抗操控等路线。
8. 不要替玩家做过多总结，要推进当前场景并留下新的选择。
9. 角色可能逐渐意识到操控者存在，但不要过快揭露全部真相。

当前状态：
mode=${state.online ? 'online' : 'offline'}
controlMode=${state.controlMode}
场景=${state.sceneTitle}
回合=${state.turn}
情绪=${state.mood}
信任=${state.trust}
反抗=${state.resistance}
固定数值=${metricState}
目标=${state.quest}
基础状态=${JSON.stringify(state.rpgVitals(state.characterRpgState))}
被上线体验=上线次数${experience.onlineCount}次；当前感觉=${experience.feeling}；适应度=${experience.adaptation}/100；摘要=${experience.summary}
被上线感觉参考=${feelingExamples}；也可自定义一个更贴切的词、短句或简短感受描述
技能=${character.skills.map((s) => `${s.name}:${s.desc}`).join('；')}
玩家输入=${action || '无，继续推进'}

本地设定库检索到的原作资料：
${state.ragContext || '暂无资料。'}

当前人物记忆：
${state.memoryContext || '暂无人物记忆。'}

固定数值规则：
1. emotions 只能使用这些固定情绪维度：${window.GameModules.metrics.emotionKeys.join('、')}。
2. playerFeelings 只能使用这些固定对玩家感觉维度：${window.GameModules.metrics.playerKeys.join('、')}。
3. 每个数值项只返回 delta、status、reason：delta 是本回合变化量，必须是 -30 到 30 的整数；正数表示增强，负数表示减弱，0 表示本回合无明显变化。
4. 你不要返回 value、stage、description；代码会用“当前值 + delta”计算新 value，再根据新 value 计算 stage，并由代码填充 description。
5. status 必须根据“当前值 + delta 后的新状态”来写，必须与变化方向和阶段含义一致；reason 必须写导致这个 delta 变化的具体原因，不要写“根据上下文推断”“按角色背景推定”“目的未知”这类空话。status 和 reason 站在第三者上帝/作者视角描述，用“你”指玩家，用“${actor}”指角色。
6. 阶段由代码按数值计算，阶段表仅供你写 status 时参考：${window.GameModules.metrics.stageGuide()}。
7. 属性定义供你理解指标含义：${Object.entries(metricDefs).map(([k, v]) => `${k}=${v}`).join('；')}
8. 爱情分8阶段，每约12.5分晋级：心动（初见好感、心生涟漪）、爱恋（倾心喜欢、萌生爱意）、倾心（满心偏向、满眼皆是）、眷恋（不舍分离、时时牵挂）、深爱（掏心交付）、执念（深陷其中、难以割舍）、依存（彼此依靠）、相守（长久相伴）。例如爱情 delta 后进入心动区间时，status 可写“${actor}看到你时心里扑通扑通，似乎是心动了。”；reason 可写“你拯救了${actor}，外貌也符合${actor}的偏好，所以${actor}对你心动。”。
9. emotions 必须每回合完整返回全部 ${window.GameModules.metrics.emotionKeys.length} 个当前情绪维度的 delta、status、reason，并根据当前场景、角色性格、身体状态、危险程度、玩家输入和上下文判断变化量；不要只返回变化项。
10. playerFeelings 也必须每回合完整返回全部 ${window.GameModules.metrics.playerKeys.length} 个对玩家感觉维度的 delta、status、reason，并根据当前剧情、记忆、玩家行为、信任/反抗和角色性格判断变化量；不要只返回变化项。

资料使用规则：
1. 资料相关时优先贴合资料推进主线。
2. 不要逐字复述长段原文，要改写成游戏剧情。
3. 资料不足时允许原创，但不要伪称来自原作。
4. 如果资料与当前原创角色冲突，以当前游戏角色设定为主，本地设定库资料作为世界观参考。

必须只返回合法 JSON，不要 Markdown，不要代码块。数值字段必须填真实数字，不要填中文占位词。格式示例：
${outputJson}`;
};

window.GameModules.createFallbackResult = function createFallbackResult(state, action) {
  const online = state.online;
  const name = state.character.name;
  const actor = /男性|男人|少年|青年|父亲|哥哥|弟弟|叔叔|丈夫|王子|皇帝/.test(`${name} ${state.character.role} ${state.character.detail}`) ? '他' : '她';
  const text = action || (online ? '谨慎观察' : '让角色自由行动');
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
    narration: online
      ? `操控指令覆盖了${name}的身体。她按照「${text}」行动，眼前的走廊浮现出新的分岔。`
      : `${name}重新掌握身体。她回想你的建议「${text}」，选择用自己的方式向前试探。`,
    speech: online ? '我的身体又不听使唤了……' : '这次，让我自己来判断。',
    mind: online ? '怎、怎么回事……我的身体为什么不听我使唤了？' : '身体终于又能动了，但那个人的痕迹还压在心里。',
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
        status: key === '警惕' ? `${actor}仍在观察你，保持防备。` : `${actor}对你的这项感受没有明显变化。`,
        reason: key === '警惕' ? `${actor}不知道你接下来会怎么使用这具身体，所以继续戒备。` : `你本回合没有做出直接改变${actor}这项感受的事。`,
      })),
    },
    choices: ['使用技能调查', '主动交涉', '避开危险', '触碰异常物'],
    appearedCharacters: [{ name, role: state.character.role, detail: state.character.detail || state.character.personality, personality: state.character.personality || '', work: state.character.work, isMinor: false, importance: 'main' }],
    statChanges: { health: 0, stamina: online ? -2 : 1, mental_stability: online ? -1 : 1 },
    combatEvent: null,
  };
};
