# 阶段一第一刀验证说明

对应计划：
- `docs/plans/2026-07-10-architecture-refactor-plan.md`
- `docs/plans/2026-07-10-control-domain-refactor-phase1-plan.md`

## 本次变更目标

在不改变现有控制玩法结果的前提下，先完成“当前控制目标相关状态判断”的第一批收敛。

## 本次实际变更范围

- `publish/control-state.js`
- `publish/game.js`
- `publish/control-link-actions.js`
- `publish/boot/script-manifest.js`
- `publish/index.html`

## 本次完成内容

1. 新增控制状态模块，集中承载：
   - 当前控制目标状态
   - 当前控制目标名称
   - 当前控制目标身份
   - 当前角色是否为已连接目标
   - 首页卡片文案摘要

2. 从 `publish/game.js` 中移除重复控制状态判断，避免入口文件继续持有同一套逻辑。

3. 将 `sharedControlState()` 收敛为复用统一控制状态入口，而不是再次直接拼 `sharedControlActive + sharedControlTargetId + rpgStates`。

4. 首页卡片与控制角色列表继续保持现有展示功能，但其读取来源已统一。

## 本次未变更内容

以下内容本次没有修改：
- 上线动作结果
- 下线动作结果
- 召唤动作结果
- 提示词逻辑
- 存档结构
- 平台能力实现
- 资源文件结构

## 低耦合收益

- 页面不再自行构造当前控制目标判断
- 控制域内部也不再保留第二套同义判断入口
- 后续新增消费方可统一读取 `control-state`

## 代码复用收益

以下场景可直接复用控制状态模块：
- 首页当前目标卡片
- 控制角色列表按钮状态
- 现实世界控制摘要
- 顶部控制状态栏
- 其他需要判断“当前谁被控制”的展示点

## 风险控制结果

本次改动未扩散到：
- `storage`
- `prompt`
- `body-figure`
- `entry-actions`
- `real-world-*` 主流程
- 平台适配层

因此风险仍然限制在控制域第一批状态收敛范围内。

## 当前结论

本次可视为阶段一第一刀的小里程碑：
- 已完成最小状态收敛
- 已降低入口层重复逻辑
- 已为后续第二刀（控制动作边界整理）打下基础
- 仍保持玩法逻辑不变
