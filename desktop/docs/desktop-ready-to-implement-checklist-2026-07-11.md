# Desktop Ready-to-Implement Checklist

## 目标
当下一轮真正开始第一版 Electron / 桌面宿主实现时，用这份清单约束最小改动面、禁止项和最小验收，避免从“结构准备阶段”直接跳到大面积主链改造。

## 当前前提
只有在以下条件都满足时，才进入真实桌面实现：
1. 已阅读：
   - `docs/plans/2026-07-11-multi-platform-track-completion-audit.md`
   - `desktop/docs/desktop-entry-integration-checklist-2026-07-11.md`
   - `desktop/docs/desktop-safe-consumer-handshake-index-2026-07-11.md`
2. 明确接受当前仍处于：
   - desktop runtime 未开始
   - mobile runtime 未开始
   - 高耦合玩法主链未开始宿主接入

## 第一轮真实实现允许优先动的文件范围
### Desktop shell
- `desktop/shell/bridge/host.js`
- `desktop/shell/bridge/files.js`
- `desktop/shell/assembly-example.js`
- `desktop/shell/handshake-example.js`
- 未来新增的桌面宿主入口文件，例如：
  - `desktop/shell/main.*`
  - `desktop/shell/preload.*`
  - `desktop/shell/bootstrap.*`

### 说明/计划文档
- `desktop/docs/*`
- `docs/architecture/*desktop*`
- `docs/plans/*desktop*`

## 第一轮真实实现不要碰的文件范围
### 共享高耦合主链
- `publish/index.html`
- `publish/game.js`
- 现实推演主链相关大文件
- 微信主链相关大文件
- 剧情生成主链相关大文件

### 共享低层也暂不建议大改
- `publish/local-settings.js`
- `publish/role-card-json-app/role-card-json-app.js`
- `publish/platform/files/browser.js`
- `publish/platform/host/browser.js`

说明：
第一轮真实实现应优先在桌面壳里完成“真宿主能力接入”，而不是先回头改共享浏览器实现。

## 第一轮真实实现的推荐目标
### 必做
1. 让桌面宿主能暴露一个明确 bridge 通道
2. 让 `desktop host` draft 至少有一个真实通道可识别
3. 让 `desktop files` draft 至少有一条真实保存文件链路雏形

### 先不要做
1. 不要求第一轮就完成桌面 storage 真实实现
2. 不要求第一轮就让 safe-consumer 自动运行
3. 不要求第一轮就把任何高耦合玩法链路切到桌面宿主

## 第一轮最小验收
1. 桌面宿主入口文件已出现
2. `desktop/shell/bridge/host.js` 至少能识别一个真实 bridge 通道
3. `desktop/shell/bridge/files.js` 至少有一个真实方法从纯 draft 进入可调用实现
4. 浏览器/dev 运行方式完全不受影响
5. 有单独验证文档说明：
   - 动了哪些文件
   - 没动哪些主链
   - 当前仍未开始的范围

## 当前阶段最重要的提醒
- 目标是“开始真实桌面宿主实现”，不是“开始重构共享玩法运行时”。
- 若下一轮需要同时改动 `publish/index.html` 与多个共享业务大文件，应先停下来重新评估是否越过了当前安全线。
