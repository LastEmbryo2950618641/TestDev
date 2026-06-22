# 小说文风预设

默认笔风已拆分到 `prompts/pen_style/`，每个笔风一份 Markdown 与同名 JS 注册文件。

## 注册方式

1. `prompts/pen_style/registry.js` 提供 `window.GameModules.penStyleRegistry.register()`。
2. 每个笔风 JS 通过 `register({ id, name, file, prompt })` 注册。
3. 设置界面的“小说笔风”下拉框读取注册器列表。

## 当前默认笔风

- `prompts/pen_style/literary.md` / `literary.js`：文学细腻
- `prompts/pen_style/dark.md` / `dark.js`：黑暗压抑
- `prompts/pen_style/light-novel.md` / `light-novel.js`：轻小说节奏
- `prompts/pen_style/epic.md` / `epic.js`：史诗庄重
- `prompts/pen_style/suspense.md` / `suspense.js`：悬疑紧张
- `prompts/pen_style/spring-heart.md` / `spring-heart.js`：春心萌动
