# 小说文风预设

默认笔风已拆分到 `prompts/pen_style/`，每个笔风一份 Markdown 与同名同步 JS。

## 注册方式

1. `prompts/pen_style/register.js` 维护每个笔风的 `id / name / sourceKey / file` 元数据。
2. 每个笔风 JS 由 `dev/tools/md-to-inline-js.js` 从同名 Markdown 生成，只提供 `window.GameModules.inlineMd` 正文快照。
3. `register.js` 读取 `inlineMd` 正文并统一注册到设置界面的“小说笔风”下拉框。

## 当前默认笔风

- `prompts/pen_style/literary.md` / `literary.js`：文学细腻
- `prompts/pen_style/dark.md` / `dark.js`：黑暗压抑
- `prompts/pen_style/light-novel.md` / `light-novel.js`：轻小说节奏
- `prompts/pen_style/epic.md` / `epic.js`：史诗庄重
- `prompts/pen_style/suspense.md` / `suspense.js`：悬疑紧张
- `prompts/pen_style/spring-heart.md` / `spring-heart.js`：春心萌动
