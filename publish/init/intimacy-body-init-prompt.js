window.GameModules = window.GameModules || {};
window.GameModules.initPromptSources = window.GameModules.initPromptSources || {};

window.GameModules.initPromptSources.intimacyBody = {
  id: 'intimacy-body',
  templateKey: 'intimacyBody',
  prompt: `---
name: real-world-init
description: 根据现实推演正文提取玩家或角色的初始化字段
---

# intimacy-body-init

根据现实推演正文判断玩家或角色是否需要初始化“亲密与身体状态”。

只处理初始化，不处理持续变化；如果字段已经存在且正文没有明确冲突，不要覆盖。

必须结合对应模板 JS 提供的字段含义、缺省值和规范 JSON 格式填写。

返回要求：
1. 只输出合法 JSON 对象，不要 Markdown，不要解释。
2. 使用 \`initUpdates\` 数组承载结果。
3. 每条更新的 \`section\` 写 \`亲密与身体状态初始化\`。
4. \`fields.intimacy\` 只包含需要初始化或被正文明确确认的字段；没有依据的字段不要编造。
5. \`fields.bodyStatus\` 只包含需要初始化或被正文明确确认的身体部位对象；每个部位对象必须符合模板字段。
6. 所有性经历相关字段只保存中性元数据和数字，不写过程描写。
7. 身体状态只写中性短状态和中性描述，不写露骨过程。
8. 没有需要初始化的内容时返回：\`{"initUpdates": []}\`。
`,
};
