window.GameModules = window.GameModules || {};
window.GameModules.pictureGeneratePrompts = window.GameModules.pictureGeneratePrompts || {};
window.GameModules.pictureGeneratePrompts.wechatAlbumPhoto = `# 微信相册图片生成

## 模板用途

用于微信联系人相册“自然状态 / 盛装状态”的 AI 图片生成。代码会在运行时把变量替换为当前微信联系人的具体信息。

## 变量

- \`{角色身份信息}\`：当前微信联系人角色卡中的姓名、身份、性别、年龄、职业、外貌、性格等身份信息。
- \`{自然状态部位描述}\`：当前微信联系人“自然状态”身体各部位描写，只包含部位与描述。
- \`{盛装部位描述}\`：当前微信联系人“盛装状态”各部位描写，只包含部位与描述。
- \`{生成状态}\`：自然状态或盛装状态。
- \`{状态部位描述}\`：根据生成状态自动填入自然状态或盛装状态的部位描述。

## 图片生成要求

请根据以下角色个人身份信息与 \`{生成状态}\` 的部位描述生成一张全身正面照。

画面要求：
- 单人
- 全身
- 正面站姿
- 清晰面部
- 完整身体比例
- 干净背景
- 无文字
- 无水印
- 高质量二次元风格

## 角色身份信息

{角色身份信息}

## {生成状态}部位描述

{状态部位描述}
`;
if (window.GameModules.promptTemplates) {
  window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
  window.GameModules.promptTemplates.inline['wechat-album-photo'] = window.GameModules.pictureGeneratePrompts.wechatAlbumPhoto;
}
