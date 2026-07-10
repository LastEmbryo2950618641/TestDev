# 2026-07-10 阶段一第二刀：控制动作入口收敛计划

## 1. 目标

在不改变现有控制流程行为结果的前提下，将“控制角色选择与进入控制流程入口”从 `core-actions` 中收敛到控制域动作模块，减少核心交互模块对控制逻辑的混杂承载。

## 2. 本刀范围

重点处理：
- `connectControlRole()`
- `openControlCharacterAdd()`
- `backToHome()` 中与控制入口切换相关的职责确认
- `start()` 是否仍应留在 `core-actions`，或作为暂时过渡入口保留

本刀不处理：
- `onlineControlRole()`
- `offlineSharedControlRole()`
- `summonControlRole()`
- `confirmControl()` 正式上线流程
- 提示词、存档、平台层

## 3. 原则

- 只收敛入口职责，不改变流程结果
- 不改按钮交互含义
- 不改变开始连接、进入时机、确认控制的玩法顺序
- 先把控制相关入口从通用 core 逻辑中抽离，再考虑后续进一步拆动作流

## 4. 计划方式

建议新增控制域动作入口模块，例如：
- `publish/control-entry-actions.js`

优先承接：
- 控制角色选择后的连接入口
- 新增控制角色入口
- 返回控制首页入口

## 5. 验收标准

- `core-actions.js` 中控制域职责减少
- 控制角色选择 -> 进入准备流程行为不变
- 返回首页与新增控制角色行为不变
- 不影响 `online / offline / summon / confirmControl` 原有结果
