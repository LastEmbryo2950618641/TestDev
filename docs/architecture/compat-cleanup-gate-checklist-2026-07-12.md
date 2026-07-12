# Compat Cleanup Gate Checklist (2026-07-12)

## 目的

这份清单用于统一约束当前渐进式重构中的 compat facade 清理时机。

项目现在已经在多个模块中形成了“主题 helper 分层 + compat 聚合入口”的形态，但这不等于旧入口已经可以立即删除。

本清单回答三个问题：

- 哪些 compat 入口当前仍需保留
- 删除 compat 前必须满足哪些证据
- 当前哪些模块适合继续结构推进，哪些模块应暂缓清理

## 当前适用模块

本清单当前覆盖：

- `publish/ui/company/view-helpers.js`
- `publish/ui/worldline/view-helpers.js`
- `publish/ui/event/view-helpers.js`

## Compat facade 的统一定义

在本项目中，compat facade 指：

- 对外继续保留旧访问路径
- 内部主要转发到已拆出的主题 helper
- 本身不再承载大块新逻辑
- 其主要价值是降低调用方迁移期间的回归风险

只要某个聚合入口仍承担这些职责，就不应因为“文件变薄”而被误判成“已经可以删”。

## 删除 compat 前必须满足的统一条件

以下条件必须同时满足，才可以考虑删除 compat facade：

### 1. 调用链审计完成

必须能证明：

- 已不存在对旧 `window.GameModules...viewHelpers.*` 路径的活跃依赖
- 或者所有剩余依赖都已被同步迁移并验证

若无法证明这一点，则默认继续保留 compat。

### 2. 新主题 helper 边界稳定

必须能证明：

- 拆出的 helper 已经按主题稳定落位
- 不再频繁回流逻辑到聚合入口
- README / boundary 文档已能清晰描述当前边界

### 3. 最小验证仍成立

必须至少完成：

- 相关 helper 文件语法验证
- 聚合入口移除后的调用面验证
- 关键展示面最小行为回归检查

### 4. 不与高风险清理混做

不得在同一轮里同时做：

- compat 删除
- 编码清洗
- 宿主镜像同步
- 顶层动作链重排

compat 删除只能作为单独、可审计的一步执行。

## 分模块当前结论

### company

当前结论：`暂不进入 compat 删除阶段`

原因：

- 展示层样板已经形成
- 但基础 helper 仍存在明显历史编码脏字风险
- 调用链尚未完成审计
- 当前更适合作为“结构已收口、基础层暂缓清理”的模块

因此：

- `publish/ui/company/view-helpers.js` 继续保留
- 后续若要删 compat，应先完成 company 专项调用方与编码风险审计

### worldline

当前结论：`暂不进入 compat 删除阶段，但已具备成熟样板价值`

原因：

- 主题 helper 分层已较完整
- 连续多刀迁移稳定
- 当前 compat 壳已非常薄
- 但调用链审计尚未完成
- `selectRealWorldPlot()` 仍承担最小界面选择状态写入，不宜和纯只读 helper 混拆

因此：

- `publish/ui/worldline/view-helpers.js` 继续保留
- worldline 更适合作为后续模块重构样板，而不是第一个删 compat 的试验场

### event

当前结论：`暂不进入 compat 删除阶段`

原因：

- 已开始形成 panel / label 分层
- 但整体成熟度仍低于 worldline
- 规则中心仍集中在 `eventSystem`
- compat 壳仍承担旧入口聚合职责

因此：

- `publish/ui/event/view-helpers.js` 继续保留
- event 当前更适合继续扩大小簇拆分覆盖面，而不是提早删 compat

## 当前可继续做的事

### 优先做

- 继续在低风险模块中拆纯只读 helper
- 补边界复核文档
- 补调用链审计计划
- 为未来 compat 清理准备证据

### 暂缓做

- 直接删除 compat facade
- 在同一轮里同时做 compat 删除和高风险编码清洗
- 直接改宿主镜像目录来“顺便同步”结构调整

## 下一阶段建议

更推荐的路线是：

1. 继续把成熟样板复制到更多低风险模块
2. 先积累跨模块的边界复核与调用链清单
3. 选择一个证据最充分、风险最低的模块，作为未来 compat 清理首个试点

在当前证据下，任何模块都还不应直接进入 compat 删除阶段。

## 当前总判断

当前项目已经进入“为清理做准备”的阶段，但还没有进入“可以大规模删 compat”的阶段。

这意味着：

- 结构收口方向是对的
- 文档与样板正在形成
- 下一步应继续扩大证据，而不是过早追求表面干净
