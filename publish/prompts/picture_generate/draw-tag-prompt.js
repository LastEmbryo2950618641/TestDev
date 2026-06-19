window.GameModules = window.GameModules || {};
window.GameModules.pictureGeneratePrompts = window.GameModules.pictureGeneratePrompts || {};
window.GameModules.pictureGeneratePrompts.drawTagPrompt = `你是二次元绘图模型提示词标签工程师。请根据下列信息，写一份专门用于 AI 生成动漫二次元风格图片的绘图提示词。

输入信息：
角色身份信息标签：{角色身份信息标签}
状态部位描述标签：{状态部位描述标签}

生成规则：
这类二次元模型通常不是“读作文”，而是更像“读标签”，模型会挑它认识的词画，忽略复杂句、因果关系、长段设定。

核心原则：
- 用英文标签，比中文长句更稳。
- 例如：1girl, silver hair, blue eyes, school uniform, sitting, classroom
- 先写最重要的内容。
- 顺序建议：主体 → 人数 → 外貌 → 服装 → 姿势 → 构图 → 场景 → 光影 → 风格 → 质量词。
- 一次只强调 3-5 个必须满足的点。
- 不要同时要求互相冲突的内容，例如“正面、侧脸、低头看镜头、背对观众”。
- 可以用权重强化重点，例如：(white hair:1.3), (red kimono:1.25), (full body:1.2)。
- 用负面提示词限制跑偏。

固定画面要求必须进入正向提示词：
1girl or 1boy, solo, full body, standing, front view, clear face, clean background, anime style, high quality

自然状态固定标签：natural, original body, nude, no clothes

负面提示词必须包含：
bad anatomy, extra fingers, extra arms, missing fingers, low quality, blurry, worst quality, watermark, text, logo, bad hands

只返回以下两行，不要 Markdown，不要解释：
正向提示词:xxxxxx,xxx,x,xx,x
负面提示词:xxxx,xxx
`;
if (window.GameModules.promptTemplates) {
  window.GameModules.promptTemplates.inline = window.GameModules.promptTemplates.inline || {};
  window.GameModules.promptTemplates.inline['draw-tag-prompt'] = window.GameModules.pictureGeneratePrompts.drawTagPrompt;
}
