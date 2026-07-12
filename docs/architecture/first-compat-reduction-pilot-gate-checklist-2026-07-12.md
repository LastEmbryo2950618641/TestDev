# First Compat Reduction Pilot Gate Checklist (2026-07-12)

## 目的

这份清单用于定义：

- 在当前项目里，什么时候才算真正具备开始“第一批 compat 收缩试点”的条件
- 哪些证据必须同时满足
- 哪些情况一旦出现，就应暂停实现收缩、先补前置条件

它不是删除 compat 的执行脚本。

它是“开始第一刀实现之前的 gate 清单”。

## 适用范围

当前主要服务于：

- worldline 第一批只读 facade 收缩候选
- event 后续 forwarding / label facade 收缩候选
- company 未来动作层 compat 收缩准备

## Gate 1：主源码页面层不再直接依赖候选入口

必须满足：

- 根目录 `publish/` 下的主模板主路径，已不再直接消费该 compat 候选入口

可接受证据：

- `publish/index.html` 中已改为消费更稳定的 panel / section / summary contract
- 候选入口只剩 helper 内部依赖，而不是模板直接读取

若不满足：

- 不进入试点实现
- 先继续模板消费收敛

## Gate 2：动作层不存在强直接依赖

必须满足至少一项：

1. 动作层已不再直接显式消费该入口
2. 或该入口仅作为纯只读 helper 内部细节存在，不再承担 actions 的统一转发职责

重点检查：

- `publish/worldline-actions.js`
- `publish/event-actions.js`
- `publish/company-actions.js`
- `publish/company-attendance-actions.js`

若不满足：

- 不进入试点实现
- 先补动作层迁移准备或 forwarding 面清单

## Gate 3：候选入口不是当前必要的 UI 写入点

必须满足：

- 候选入口不是界面状态写入或关键 UI 控制入口

典型不适合直接试点的类型：

- 展开/收起状态写入
- debug 选中态写入
- 当前选中对象写入

原因：

- 这类入口若贸然收掉，最容易把状态写入重新散回模板
- 会直接违背“降低耦合”的目标

若不满足：

- 不进入第一批只读 facade 试点
- 先保留为最小 UI state surface

## Gate 4：宿主镜像侧已通过一致性核查

必须满足至少一项：

1. desktop / mobile 宿主镜像中，已不再直接依赖该入口
2. 或可以明确证明宿主镜像是过期装配结果，并且有清晰同步/重装配路径可覆盖旧依赖

重点检查目录：

- `desktop/shell/dist/`
- `desktop/shell/dist-minimal/`
- `mobile/android-webview-shell/app/src/main/assets/publish/`
- `mobile/android-webview-shell/app/build/intermediates/...`

若不满足：

- 暂缓实现试点
- 先补宿主镜像同步判断或换候选

## Gate 5：主真源与宿主镜像边界已明确

必须满足：

- 本轮试点涉及的修改路径，遵守当前真源/镜像边界：
  - 根目录 `publish/` 作为共享真源
  - desktop 打包产物视为装配结果
  - mobile `app/src/main/assets/publish/` 视为宿主镜像树

若实现方案需要直接在宿主镜像里手改玩法逻辑，视为不通过。

## Gate 6：宿主同步/验证路径明确

必须满足：

- 对应宿主侧存在明确的同步或验证路径

例如：

- Android：
  - `node mobile/shell/android-webview-asset-sync.js`
  - `node mobile/shell/android-webview-asset-sync-verify.js`
- Desktop：
  - 重新走 desktop packaging / assembly 验证链

若改完主源码后无法验证宿主是否自然跟随更新，则不进入试点。

## Gate 7：候选是“最小、可回退、可局部验证”的

必须满足：

- 候选入口职责单一
- 影响面较窄
- 修改后若出现问题，可快速回退到上一层 facade

更适合的候选通常具备：

- 已不再被主模板直接依赖
- 内部传播面小于核心 panel contract
- 不是排序核心、不是状态写入、不是主面板 contract

## Gate 8：试点收缩不会把逻辑重新散回模板或 actions

必须满足：

- 收缩后，逻辑应继续留在明确 helper / panel / service 边界中
- 不允许为了“删 compat”而把逻辑改回模板、actions 或宿主镜像里散写

如果一个收缩方案只能通过“把逻辑挪散”来完成，则视为不通过。

## 当前试点前的推荐判断顺序

每个候选进入实现前，建议按这个顺序过 gate：

1. 主源码页面层是否已脱离直接依赖
2. 动作层是否仍强依赖
3. 是否属于 UI 写入点
4. 宿主镜像是否仍直接依赖
5. 真源/镜像边界是否清楚
6. 宿主同步/验证路径是否清楚
7. 是否足够最小、可回退
8. 是否会把逻辑重新散回不合适层级

## 当前对 `timelineMeta` 的示例判断

按目前证据：

- Gate 1：通过
- Gate 2：基本通过
- Gate 3：通过
- Gate 4：未通过
  - 宿主镜像 `index.html` 仍直接调用它
- Gate 5：已明确
- Gate 6：路径基本存在，但宿主镜像是否已同步仍需额外确认
- Gate 7：候选本身较优
- Gate 8：理论上可满足

因此当前结论是：

- `timelineMeta` 仍是强候选
- 但尚未通过实现前全部 gate
- 暂不应进入第一刀真实收缩实现

## 当前总结论

只有当某个 compat 候选同时满足：

- 主源码页面层已脱离
- 动作层不再强依赖
- 不是 UI 写入点
- 宿主镜像依赖已消除或可被明确同步覆盖
- 宿主同步路径明确
- 修改足够最小、可回退
- 且不会把逻辑重新散回模板或 actions

它才应进入第一批 compat 收缩试点实现。

在这些条件未同时满足前，继续补证据与边界文档，仍然比贸然动实现更符合当前总目标。
