# Desktop Bootstrap to Electron API Checklist

## 目标
在当前 `bootstrap.js` 草图基础上，给下一轮真正开始接 Electron API 时提供固定步骤，避免直接跳到高风险共享主链改造。

## 起点
当前已有：
- `desktop/shell/main.js`
- `desktop/shell/preload.js`
- `desktop/shell/bootstrap.js`
- desktop handshake / runner / safe-consumer 模板与索引
- ready-to-implement checklist

## 第一轮 Electron API 接入允许做的事
### 1. 只在 `desktop/shell` 内接第一条真实 API 形状
优先范围：
- `desktop/shell/main.js`
- `desktop/shell/preload.js`
- `desktop/shell/bootstrap.js`

### 2. 优先接哪类 API
建议顺序：
1. Electron app / window 创建形状
2. preload 暴露形状
3. 一个最小 bridge 通道占位

### 3. 第一轮不要求
- 不要求 safe-consumer 自动跑通
- 不要求桌面 files 完成真实文件写入
- 不要求改共享 `publish/*` 文件

## 禁止项
1. 不在这一轮改 `publish/index.html`
2. 不在这一轮改 `publish/game.js`
3. 不在这一轮同时改多个高耦合共享业务文件
4. 不在这一轮并行开始 mobile 真实宿主实现

## 推荐的最小落地顺序
1. 在 `main.js` 中表达一个更接近 Electron 的 app/window 启动骨架
2. 在 `preload.js` 中表达一个更接近 Electron 的 expose 形状
3. 在 `bootstrap.js` 中把二者与 handshake 聚合成统一桌面入口视图
4. 补验证文档，确认仍未触碰共享主链

## 第一轮最小验收
1. 至少出现一处“更接近真实 Electron API 语义”的代码结构
2. 所有变化仍局限于 `desktop/shell/*`
3. 当前浏览器/dev 路径完全不受影响
4. 有清晰验证文档说明：
   - 哪些 API 只是草图
   - 哪些还未真实接入
   - 哪些共享主链明确没动

## 当前最重要的提醒
- 进入 Electron API 接入，不等于可以开始改共享玩法运行时。
- 若下一轮需要动到 `publish/index.html` 或多个 `publish/*.js` 业务文件，应先重新评估是否越过当前安全线。
