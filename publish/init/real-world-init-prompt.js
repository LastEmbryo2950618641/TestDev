window.GameModules = window.GameModules || {};
window.GameModules.initPromptSources = window.GameModules.initPromptSources || {};

window.GameModules.initPromptSources.realWorld = {
  id: 'real-world',
  prompt: `---
name: real-world-init
description: 根据现实推演正文提取玩家或角色的初始化字段
---

# real-world-init

当现实推演正文中出现需要为玩家或角色补全初始化的稳定事实时，返回 \`initUpdates\` 数组。

仅在字段不存在、为空、尚未初始化，或正文明确给出了可作为初始状态的事实时返回；不要覆盖已经存在且无明确冲突的旧值。

每条 \`initUpdates\` 只描述一个主体的一组初始化字段：

\`\`\`json
{
  "target": "player-self 或角色id/姓名",
  "subject": { "type": "player 或 character", "id": "player-self 或角色id", "name": "角色名" },
  "section": "初始化",
  "fields": {
    "fieldKey": "初始化值"
  },
  "reason": "正文中的初始化依据"
}
\`\`\`

要求：
1. \`target\` 必填；玩家本人固定写 \`player-self\`。
2. \`subject.type\` 只能是 \`player\` 或 \`character\`。
3. \`fields\` 只写正文明确支持的初始化字段，不要编造。
4. \`reason\` 必须引用本回合正文中的事实依据，不超过 40 个汉字。
5. 没有需要初始化的字段时返回 \`"initUpdates": []\`。
6. 只做初始化，不做持续变化结算；持续变化仍交给其他更新数组处理。

最小返回示例：

\`\`\`json
{
  "initUpdates": [
    {
      "target": "player-self",
      "subject": { "type": "player", "id": "player-self", "name": "玩家" },
      "section": "初始化",
      "fields": { "livingStatus": "独居" },
      "reason": "正文确认玩家独自居住"
    }
  ]
}
\`\`\`
`,
};
