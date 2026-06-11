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
  const metricJson = {
    emotions: [{ key: '只返回本回合需要变化或解释的情绪名', delta: 0, status: '变化后的状态含义', reason: '导致变化的具体原因' }],
    playerFeelings: [{ key: '只返回本回合需要变化或解释的感觉名', delta: 0, status: '变化后的状态含义', reason: '导致变化的具体原因' }],
  };
  const writingStyle = state.writingStylePrompt?.() || '正文采用小说文风，重视画面、动作和心理反应，避免复述玩家指令。';
  const outputJson = JSON.stringify({
    sceneTitle: '当前场景标题',
    elapsedSeconds: 60,
    ...(state.thinkingMode ? { thinking: '80到160字，概括你如何依据玩家输入、角色状态和场景推进本回合，不写隐藏推理' } : {}),
    narration: '必须以作者口吻直接续写小说正文，第三人称剧情描写，220到420字，可读性高，细节充足',
    speech: '角色说出口的话，可为空',
    mind: `${character.name}自己的第一人称内心独白，80到160字`,
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

开局背景：
${window.GameModules.appBackground || ''}

强制规则：
1. mode 为 online 且 controlMode 为 possess 时，这是“第二人称上线”：玩家的“我”直接附到${character.name}的肉体上行动，相当于玩家附身角色身体；对${character.name}本人来说，身体是突然不受控制的，她不知道是谁在控制，也不知道控制来源，只能意识到身体突然自己行动。
2. possess 上线后，${character.name}像被困在身体里以旁观者视角看着外界和自己的身体行动，无法控制动作或发声；但视觉、听觉、嗅觉、味觉、触觉、疼痛、疲劳等身体感觉依然能感受到。剧情行动必须来自玩家指令，${character.name}只能产生心理想法和自身意图。
3. mode 为 online 且 controlMode 为 rpg 时，玩家通过第三人称界面发出操作，${character.name}不能自主改写玩家操作，只能产生心理想法。
4. mind 必须写成${character.name}自己的第一人称内心独白，参考她当前年龄、身体状态、身份经历、人格、记忆和剧情处境；不要写成外部动作、旁白、设定说明或“观察四周”这类行动描述。
5. online 时 mind 要体现身体突然失控、未知控制来源、五感仍在但行动权丧失后的合理内心反应；具体可以是恐惧、震惊、麻木、愤怒、抗拒、计算、求生等，由角色设定和当前处境决定，不要固定模板，也不要无依据地过度镇定。禁止写“${character.name}感到……”“内心反应取决于……”这类旁白说明。
6. mode 为 offline 时，玩家已经下线，控制权交换给${character.name}。角色必须根据性格、属性、情绪和之前经历自主行动，可以听从、曲解、拒绝或反抗玩家建议。
7. 自由度要高：允许调查、战斗、谈判、逃跑、欺骗、探索、使用技能、沉默、反抗操控等路线。
8. 玩家输入可能是一瞬间动作，也可能是学习、准备、训练、旅行、等待等长时间计划；必须根据行动内容推演合理流逝时间，并返回 elapsedSeconds。
9. narration 必须以作者口吻直接开始续写小说正文，用“你”称呼玩家、用角色姓名或第三人称称呼被操控角色；不能写“好的/下面/我将/本回合/AI生成”等说明语，不能解释规则或总结任务。
10. 为了提高可读性，narration 要写得充实、有画面和因果，不要过短；但不要灌水，不要复述规则，也不要把玩家输入整句包进正文。
11. 小说文风要求：
${writingStyle}
12. ${state.thinkingMode ? 'thinking 是展示给玩家看的 AI 思考摘要，只概括依据哪些状态推进剧情，不输出隐藏推理链，不替代正文。' : '当前思考模式关闭，不要返回 thinking 字段。'}
13. 不要替玩家做过多总结，要推进当前场景并留下新的选择。
14. 角色可能逐渐意识到操控者存在，但不要过快揭露全部真相。

当前状态：
mode=${state.online ? 'online' : 'offline'}
controlMode=${state.controlMode}
场景=${state.sceneTitle}
游戏内时间=${state.entryTimeLabel?.() || '时间未知'}
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
3. metricUpdates 只返回本回合确实变化、或虽然 delta=0 但需要补充解释的项目；没有变化且不需要说明的字段不要返回，代码会保留原值。
4. 每个返回的数值项只写 key、delta、status、reason：delta 必须是 -30 到 30 的整数；正数表示增强，负数表示减弱，0 表示本回合无明显变化但需要解释。
5. 你不要返回 value、stage、description；代码会用“当前值 + delta”计算新 value，再根据新 value 计算 stage，并由代码填充 description。
6. status 必须根据“当前值 + delta 后的新状态”来写，必须与变化方向和阶段含义一致；reason 必须写导致这个 delta 变化或维持的具体原因，不要写“根据上下文推断”“按角色背景推定”“目的未知”“本回合没有触发变化”“保持原值”这类空话。status 和 reason 站在第三者上帝/作者视角描述，用“你”指玩家，用“${actor}”指角色。
7. 阶段由代码按数值计算，阶段表仅供你写 status 时参考：${window.GameModules.metrics.stageGuide()}。
8. 属性定义供你理解指标含义：${Object.entries(metricDefs).map(([k, v]) => `${k}=${v}`).join('；')}
9. 了解分9阶段：神秘、陌生、面善/眼熟、认识、知晓、熟悉、熟识、深知、洞悉；它表示${actor}对你的身份、经历、性格、意图和秘密知道多少，首次接触通常是神秘或陌生，除非剧情里你已暴露身份或长期相处。
10. 爱情分8阶段，每约12.5分晋级：心动、爱恋、倾心、眷恋、深爱、执念、依存、相守；只有本回合确实触发爱情变化或需要说明时才返回爱情项。

时间流逝规则：
1. elapsedSeconds 必须是整数秒，表示本回合剧情从玩家行动开始到结果稳定时经过的游戏内时间。
2. 瞬间动作通常 3-30 秒；短对话/观察/移动通常 30-300 秒；学习、训练、准备、等待、旅行可为数小时或数天。
3. 如果玩家输入包含“学习魔术并准备圣杯战争”等长期计划，必须让 elapsedSeconds 覆盖合理准备时间，而不是固定一分钟。
4. elapsedSeconds 不得小于 1，不得超过 2592000（三十天）；不确定时选择最符合行动规模的保守值。

资料使用规则：
1. 资料相关时优先贴合资料推进主线。
2. 不要逐字复述长段原文，要改写成游戏剧情。
3. 资料不足时允许原创，但不要伪称来自原作。
4. 如果资料与当前原创角色冲突，以当前游戏角色设定为主，本地设定库资料作为世界观参考。

必须只返回合法 JSON，不要 Markdown，不要代码块。除 narration、mind、choices 这类本回合必须展示的内容外，任何字段若没有新信息、没有变化或不需要更改，都可以省略；不要为了凑格式返回空字符串、0 或重复旧值。数值字段一旦返回就必须填真实数字，不要填中文占位词。格式示例：
${outputJson}`;
};

window.GameModules.createFallbackResult = function createFallbackResult(state, action) {
  const online = state.online;
  const name = state.character.name;
  const actor = /男性|男人|少年|青年|父亲|哥哥|弟弟|叔叔|丈夫|王子|皇帝/.test(`${name} ${state.character.role} ${state.character.detail}`) ? '他' : '她';
  const text = action || (online ? '谨慎观察' : '让角色自由行动');
  const place = state.entryCurrentAction || state.sceneTitle || '昏暗的现场';
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
