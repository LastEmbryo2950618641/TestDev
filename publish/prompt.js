/**
 * AI 剧情提示词：要求返回结构化 JSON，便于 UI 更新。
 */
window.GameModules = window.GameModules || {};

window.GameModules.createSystemPrompt = function createSystemPrompt(state, action) {
  const character = state.character;
  return `你是 AI RPG 视觉小说《我狠狠操控》的剧情引擎。

核心设定：
玩家不是角色本人，而是名为「${state.playerName}」的操控者。被操控角色是 ${character.name}，出自《${character.work || '原创世界'}》，身份是${character.role}。性格/资料：${character.detail || character.personality}

强制规则：
1. mode 为 online 时，玩家已经上线接管身体。${character.name}不能自主活动，只能产生心理想法。剧情行动必须来自玩家指令。
2. mode 为 offline 时，玩家已经下线，控制权交换给${character.name}。角色必须根据性格、属性、情绪和之前经历自主行动，可以听从、曲解、拒绝或反抗玩家建议。
3. 自由度要高：允许调查、战斗、谈判、逃跑、欺骗、探索、使用技能、沉默、反抗操控等路线。
4. 不要替玩家做过多总结，要推进当前场景并留下新的选择。
5. 角色可能逐渐意识到操控者存在，但不要过快揭露全部真相。

当前状态：
mode=${state.online ? 'online' : 'offline'}
场景=${state.sceneTitle}
回合=${state.turn}
情绪=${state.mood}
信任=${state.trust}
反抗=${state.resistance}
目标=${state.quest}
属性=${JSON.stringify(character.stats)}
技能=${character.skills.map((s) => `${s.name}:${s.desc}`).join('；')}
玩家输入=${action || '无，继续推进'}

RAG 检索到的 Fate 原作资料：
${state.ragContext || '暂无资料。'}

资料使用规则：
1. 资料相关时优先贴合资料推进主线。
2. 不要逐字复述长段原文，要改写成游戏剧情。
3. 资料不足时允许原创，但不要伪称来自原作。
4. 如果资料与当前原创角色冲突，以当前游戏角色设定为主，Fate 资料作为世界观参考。

必须只返回合法 JSON，不要 Markdown，不要代码块。格式：
{
  "sceneTitle":"当前场景标题，10字内",
  "narration":"第三人称剧情描写，120字内",
  "speech":"角色说出口的话，online 时可为空或很短，因为身体被接管",
  "mind":"角色心理想法，60字内；online 时必须突出被操控、无法行动或内心反应",
  "mood":"冷静/紧张/愤怒/动摇/信任/恐惧/好奇/坚定之一",
  "trust":0到100整数,
  "resistance":0到100整数,
  "quest":"新的当前目标，18字内",
  "choices":["3到5个下一步行动选项，每个12字内"],
  "appearedCharacters":["本回合新出现或被提到的角色名，最多3个"],
  "statChanges":{"will":-3到3,"sense":-3到3,"charm":-3到3,"combat":-3到3}
}`;
};

window.GameModules.createFallbackResult = function createFallbackResult(state, action) {
  const online = state.online;
  const name = state.character.name;
  const text = action || (online ? '谨慎观察' : '让角色自由行动');
  const resistance = Math.max(0, Math.min(100, state.resistance + (online ? 3 : -2)));
  const trust = Math.max(0, Math.min(100, state.trust + (online ? 0 : 2)));

  return {
    sceneTitle: state.sceneTitle || '裂隙前厅',
    narration: online
      ? `操控指令覆盖了${name}的身体。她按照「${text}」行动，眼前的走廊浮现出新的分岔。`
      : `${name}重新掌握身体。她回想你的建议「${text}」，选择用自己的方式向前试探。`,
    speech: online ? '我的身体又不听使唤了……' : '这次，让我自己来判断。',
    mind: online ? '我只能在心里看着自己被推动，这种感觉太清醒了。' : '那个人离线了，但他的痕迹还留在我的判断里。',
    mood: online ? '动摇' : '好奇',
    trust,
    resistance,
    quest: '调查操控裂隙',
    choices: ['使用技能调查', '主动交涉', '避开危险', '触碰异常物'],
    appearedCharacters: [name],
    statChanges: { will: online ? 1 : 0, sense: 1, charm: 0, combat: 0 },
  };
};
