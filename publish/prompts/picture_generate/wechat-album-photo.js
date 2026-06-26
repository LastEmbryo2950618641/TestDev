window.GameModules = window.GameModules || {};
window.GameModules.pictureGeneratePrompts = window.GameModules.pictureGeneratePrompts || {};
window.GameModules.pictureGeneratePrompts.wechatAlbumPhoto = `单人，全身，正面站姿，清晰面部，完整身体比例，干净背景，无文字，无水印，高质量二次元风格，{角色身份信息标签}，{状态部位描述标签}，natural, original body, no clothes
`;
if (window.GameModules.promptTemplates) {
  window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
  window.GameModules.promptTemplates.inline['wechat-album-photo'] = window.GameModules.pictureGeneratePrompts.wechatAlbumPhoto;
}
