// GENERATED FROM publish/prompts/推演引擎/update/feeling-update-prompt.md; DO NOT EDIT.
window.GameModules = window.GameModules || {};
window.GameModules.updateRegistry?.registerPrompt?.("feeling-update", "---\nname: feeling-update\ndescription: 根据现实推演正文提取角色或玩家对玩家本人的感觉变化更新\n---\n\n# feeling-update\n\n触发角色对玩家本人的感觉变化时，使用“感觉”结算类型输出中文 K:V 更新。\n\n- 绑定卡片：角色卡；玩家本人绑定玩家卡。\n- 结算对象类型：角色或玩家。\n- 字段：对玩家的感觉名，例如信任、好感、反抗、畏惧等。\n- 变化：通常写正负数值。\n- 触发原因：写导致角色改变对玩家态度的行为或事实。\n- 证据：必须证明这是对玩家本人的感觉，不是泛泛环境感受。\n\n没有明确关系变化时不写。");
