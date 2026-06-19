window.GameModules = window.GameModules || {};
window.GameModules.pictureGeneratePrompts = window.GameModules.pictureGeneratePrompts || {};
window.GameModules.pictureGeneratePrompts.wechatAlbumPhoto = `# 微信相册图片生成

## 图片生成要求

请将以下信息整理为绘图标签，不要写成作文或完整句子。
最终提示词必须使用逗号分隔的标签形式：标签1，标签2，标签3，标签4，……

固定标签：
单人，全身，正面站姿，清晰面部，完整身体比例，干净背景，无文字，无水印，高质量二次元风格

变量标签提取规则：
- 从角色身份信息中提取身份、年龄感、性别气质、发色、发型、眼睛、服装、体型、风格等可视化词语，作为「角色身份信息标签」
- 从 \`{生成状态}\` 部位描述中提取姿态、表情、动作、身体部位、服饰状态、可见细节等词语，作为「状态部位描述标签」
- 从自然状态补充要求中提取自然感、真实生活感、姿态合理性、画面限制等词语，作为「自然状态补充要求标签」
- 只保留适合绘图模型识别的短标签，删除解释性文字、因果描述、长句和无视觉意义内容

输出格式：
单人，全身，正面站姿，清晰面部，完整身体比例，干净背景，无文字，无水印，高质量二次元风格，{角色身份信息标签}，{状态部位描述标签}，{自然状态补充要求标签}

## 角色身份信息

{角色身份信息}

## {生成状态}部位描述

{状态部位描述}

## 自然状态补充要求

{自然状态补充要求}
`;
if (window.GameModules.promptTemplates) {
  window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
  window.GameModules.promptTemplates.inline['wechat-album-photo'] = window.GameModules.pictureGeneratePrompts.wechatAlbumPhoto;
}
