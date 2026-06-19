window.GameModules = window.GameModules || {};
window.GameModules.pictureGeneratePrompts = window.GameModules.pictureGeneratePrompts || {};
window.GameModules.pictureGeneratePrompts.commonImageEditGenerate = `单人，全身，正面站姿，清晰面部，完整身体比例，干净背景，无文字，无水印，高质量二次元风格，{动态标签}
`;
if (window.GameModules.promptTemplates) {
  window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
  window.GameModules.promptTemplates.inline['common-image-edit-generate'] = window.GameModules.pictureGeneratePrompts.commonImageEditGenerate;
}
