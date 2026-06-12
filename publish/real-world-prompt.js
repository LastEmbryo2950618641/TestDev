/**
 * 现实世界推演提示词：玩家收起手机后，以本人身份在现实世界行动。
 */
window.GameModules = window.GameModules || {};

window.GameModules.createRealWorldPrompt = function createRealWorldPrompt(state, action) {
  const realWorld = window.GameModules.realWorld2026 || {};
  const profile = state.playerSetupSummary?.() || `姓名/代号：${state.playerName || '玩家'}`;
  const identity = state.playerIdentitySummary?.() || '玩家本人属性尚未生成。';
  const company = state.companyPromptContext?.() || '暂无公司系统词条。';
  const recent = (state.realWorldLog || []).slice(-6).map((entry) => {
    if (entry.type === 'user') return `玩家行动：${entry.text}`;
    return `推演结果：${entry.narration || entry.text || ''}`;
  }).join('\n') || '暂无现实世界推演记录。';
  const outputJson = JSON.stringify({
    sceneTitle: '现实场景标题',
    elapsedSeconds: 60,
    thinking: '60到140字，概括现实推演依据，不写隐藏推理',
    narration: '以第二人称续写现实世界中的行动结果，180到360字，现实、克制、细节充分',
    status: '现实状态简述',
    quest: '新的现实目标',
    choices: ['处理现实事务', '联系某个人', '观察周围', '暂时休息'],
  });
  return `# 【现实世界推演引擎】

你是《我狠狠操控》的现实世界推演引擎。这个界面发生在玩家收起手机之后，不是异世界操控界面。

# 【现实背景】
- 世界：${realWorld.label || '2026 现代都市现实世界'}
- 背景：${realWorld.summary || '玩家生活在现代都市，个人信息由玩家自行设定。'}
- 关系边界：${realWorld.relationHint || '玩家相关人际关系只以玩家填写为准，未填写不要擅自补完。'}
- 手机时间：${state.phoneDateText?.() || '未知'} ${state.phoneTimeText?.() || ''}

# 【玩家本人】
${profile}

# 【玩家本人属性】
${identity}

# 【公司与工作系统】
${company}

# 【当前现实状态】
- 场景：${state.realWorldSceneTitle || '现实世界'}
- 目标：${state.realWorldQuest || '确认手机异常与现实处境'}

# 【最近记录】
${recent}

# 【本次行动】
${action || '继续观察现实世界'}

# 【强制规则】
1. 只写现实世界，不要推进被操控角色、异世界角色或原作剧情。
2. 玩家是本人，不是附身到别人身上；使用“你”称呼玩家。
3. 现实事件要合理、克制、可持续，不要凭空添加玩家未填写的重要亲密关系。
4. 可以写手机异常、平台提示、现实人际关系、工作/学习/居住处境，但必须贴合玩家资料。
5. choices 必须给出四个现实世界下一步行动。
6. 必须只返回合法 JSON，不要 Markdown，不要代码块。

# 【输出格式】
${outputJson}`;
};
