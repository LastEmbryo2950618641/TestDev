window.GameModules = window.GameModules || {};
window.GameModules.pictureGeneratePrompts = window.GameModules.pictureGeneratePrompts || {};
window.GameModules.pictureGeneratePrompts.wechatAlbumPhoto = `# 微信相册图片生成

## 图片生成要求

请根据以下角色个人身份信息与 \`{生成状态}\` 的部位描述生成一张全身正面照。

{自然状态补充要求}

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
