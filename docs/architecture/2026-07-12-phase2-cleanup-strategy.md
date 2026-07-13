# Phase 2 Cleanup Strategy (2026-07-12)

## 当前阶段结论

在两颗主提交落库并 push 之后，第一批“无消费者旧 helper / facade 残影”已经基本清理完成。
继续推进时，剩余对象大多不再属于“纯死代码”，而是三类不同风险的结构件。

## 三类对象

### 1. 仍可继续直接删除的残留
判定标准：
- 模板无引用
- action facade 无转发
- `game.js` 无兜底实现
- 子 helper / 服务层无真实调用

当前状态：
- 暂未发现新的明显同类残留
- 这说明第一阶段直删收益已经下降

### 2. 需要重组的 facade / forwarder
典型形态：
- `worldlineActions` 中 `worldlineViewHelperForwarders`
- `game.js` 中 company/faction 等模块的默认兜底 facade
- `ui/*/view-helpers.js` 中仍承担兼容出口职责的总入口文件

风险特征：
- 它们可能不是死代码
- 但存在“转发层偏厚、入口重复、职责重叠”的问题
- 若要继续压低耦合，需要通过“入口合并 / 责任下沉 / facade 收缩”来处理，而不是简单删除单个函数

### 3. 仍应保留的模板 contract
判定标准：
- `publish/index.html` 或 Android 镜像 `index.html` 仍直接消费
- 或者模板虽不直连，但组件/面板结构明确以此 contract 为渲染边界

示例：
- loading 三件套
- company profile / org / contract / records 面板 contract
- worldline lore / timeline / real plot summary contract
- settings 中仍被模板消费的 section contract

## 下一阶段建议

1. 不再把“继续找死函数”作为主目标。
2. 将第二阶段重点切换为：
- facade 层重组策略
- 默认兜底实现是否可按模块下沉
- 总入口 `view-helpers.js` 是否可进一步瘦身

3. 建议优先审计两条线：
- `publish/game.js` 中的默认 facade / fallback block
- `publish/worldline-actions.js` 中的 view helper forwarders

4. 处理原则：
- 先确认调用者和模板边界
- 再判断是“保留 contract，收口入口”还是“直接移除转发”
- 避免把模板 contract 与 facade 组织问题混为一谈
