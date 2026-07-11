# Settings Stability Boundary（2026-07-11）

本文档用于说明 `settings` 模块当前的历史编码/断串风险、稳定化边界，以及后续 AI 会话在这一模块上的安全推进方式。

它服务于以下目标：

- 保持玩法逻辑、请求逻辑、保存逻辑不被误伤
- 先恢复最小可验证性，再继续展示层对象化
- 为后续 exe / apk 多端复用提供更稳定的设置层基础
- 避免后续 AI 在 `settings` 上“顺手大改”或混做功能与清污染

## 1. 当前结论

`settings` 目前不是单纯的“存在乱码”，而是已经进入 **P0 语法稳定化区**：

- `publish/ui/settings/view-helpers.js` 当前 `node --check` 失败
- `publish/settings-actions.js` 当前 `node --check` 失败
- 两边都存在历史断串、乱码模板字符串、半残缺文本
- 如果不先稳定化，后续任何对象化、模块拆分、热更新改造都会持续受阻

## 2. 当前证据

### `publish/ui/settings/view-helpers.js`

已确认现象：

- 存在半截字符串与破损模板字符串
- 典型表现包括：
  - `'xxx?;`
  - `` `xxx ? ${...}` `` 结构残缺
  - 文案中混入历史乱码，导致替换与定位失败率上升
- 当前报错点之一在摘要区附近，说明即使是只读 helper 也已经失去最小语法可靠性

### `publish/settings-actions.js`

已确认现象：

- 文件前部就存在断串导致的语法错误
- 当前报错位置出现在超时错误包装附近
- 这意味着该文件不仅有编码污染，而且已经影响请求/测试入口链的最小校验

## 3. 为什么这块必须单列处理

`settings` 同时承担了多种职责：

- provider / model 设置
- 一部分 AI 输出限制设置
- system test / provider 调试入口
- 保存、读取、派生展示
- 部分只读摘要 helper

如果在这种状态下继续混做“功能开发 + 展示层拆分 + 历史清污染”，风险会明显放大：

- 很难判断报错是旧污染还是新改动引入
- 容易把本该稳定化的小修，扩展成对请求/保存链的重构
- 容易让后续 AI 为了绕开报错而放弃验证

## 4. 后续修复批次建议

建议将 `settings` 拆成三个批次，而不是一轮做完：

### 第一批：语法恢复批

目标：

- 只恢复 `node --check publish/ui/settings/view-helpers.js`
- 只恢复 `node --check publish/settings-actions.js`
- 不调整功能分工
- 不修改 provider 请求策略
- 不修改设置保存字段结构

允许修改：

- 破损字符串
- 断掉的模板字符串
- 明显的乱码占位导致的语法中断
- 极小范围的安全兼容文案替代

禁止修改：

- 请求发起链
- 保存/读取主链
- 初始化逻辑
- 配置字段命名
- system test 行为

### 第二批：只读展示收口批

前置条件：

- 第一批通过后再进行

目标：

- 将摘要区、provider/model 摘要、AI 输出限制展示继续下沉到 `publish/ui/settings/view-helpers.js`
- `publish/settings-actions.js` 只保留最小兼容壳
- 模板逐步消费 section/detail/summary view object

### 第三批：结构规范化批

前置条件：

- 第一批、第二批都已稳定

目标：

- 继续把 `settings` 内的展示 helper、动作入口、测试入口按职责区分
- 为后续多端打包时的设置界面复用打基础

## 5. 推荐的修复顺序

建议先按以下顺序处理 `settings`：

1. `publish/ui/settings/view-helpers.js` 的语法恢复
2. `publish/settings-actions.js` 的语法恢复
3. 再补一份 validation 文档，确认这轮只是“稳定化”
4. 然后才进入 settings 展示层对象化继续推进

原因：

- helper 文件的风险更局部，更适合先恢复
- action 文件更靠近请求/测试链，应该在 helper 稳下来后再单独修

## 6. 编辑规则

后续任何 AI 在 `settings` 上工作时，都应遵守：

- 不要整文件重写
- 不要做全文件格式化
- 不要一次性把乱码“全修掉”
- 只做最小行级替换
- 每修一小段就立刻重新校验
- 先修语法，再修文案可读性
- 稳定化批次与功能批次必须分开记录

## 7. 验证要求

第一批至少要满足：

- `node --check publish/ui/settings/view-helpers.js` 通过
- `node --check publish/settings-actions.js` 通过
- 模板引用未出现新增未定义入口
- 不声称功能正确，只声称“最小语法恢复”完成

第二批再补：

- helper / 兼容壳 / 模板引用三者对应关系校验
- 至少一份 settings 边界或 validation 文档更新

## 8. 与总路线的关系

这份文档属于“降低关联影响风险”的保护措施，不是为了延迟改造，而是为了让后续改造能继续保持：

- 低耦合
- 可复用
- 可验证
- 可逐步迁移到 exe / apk 共用结构

## 9. 联动文档

- `docs/architecture/legacy-encoding-syntax-stabilization-backlog-2026-07-11.md`
- `docs/architecture/encoding-collaboration-rules.md`
- `docs/architecture/ai-development-workflow.md`
- `docs/plans/2026-07-11-worktree-risk-audit.md`
