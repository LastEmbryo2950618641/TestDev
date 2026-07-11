# company UI helper directory notes

## 目的

`publish/ui/company/` 用于承接公司系统中的只读展示逻辑。
这里的文件不负责雇佣流程变更、不负责上班打卡写入、不负责存档或平台能力，而是专注于：

- 公司字段展示
- 公司摘要文案
- 薪酬预览
- 组织结构的只读输出
- 出勤状态的只读结果生成

## 当前文件职责

### `company-pay-view-helpers.js`

负责薪酬与收入摘要：

- `monthlyPayPreview`
- `workStatusText`

### `company-field-view-helpers.js`

负责公司字段与组织结构展示：

- `companyOrganization`
- `companyFields`

### `company-attendance-view-helpers.js`

负责出勤状态的只读结果生成：

- `currentWorkAttendance`

### `view-helpers.js`

这是兼容聚合入口：

- 对外保留原有 `window.GameModules.ui.company.viewHelpers.*` 访问路径
- 内部只转发到 `company-pay-view-helpers.js`、`company-field-view-helpers.js`、`company-attendance-view-helpers.js`
- 新逻辑不要优先继续堆在这里，除非只是补兼容转发

## 适合放入这里的逻辑

- 读取现有公司状态并生成展示文本
- 对公司字段做只读整理
- 组织结构、岗位、薪酬等信息的只读包装
- 出勤状态的只读摘要、标签、说明文案
- 不改变状态的视图层辅助函数

## 不应放入这里的逻辑

以下逻辑不应继续落在 `publish/ui/company/`：

- 入职 / 离职 / 招聘流程写入
- 打卡、迟到、旷班等状态写入
- 工作提醒触发
- 存档与恢复
- 平台能力访问
- AI 推演与更新落库

## 后续扩展建议

- 如果公司系统展示逻辑继续增长，可再继续细分：
  - `company-summary-view-helpers.js`
  - `company-organization-view-helpers.js`
- 新逻辑优先进入真实主题文件，不要把所有内容继续堆回 `view-helpers.js`
- 如果后续发现某些 helper 同时服务于桌面壳与移动壳，优先保持其为纯只读、无平台依赖函数

## 长期方向

这组 helper 的目标是让公司系统逐步形成独立的展示层，便于：

- 降低 `company-actions.js`、`company-attendance-actions.js` 与 `game.js` 的展示耦合
- 让桌面端 `exe` 与移动端 `apk` 共用公司展示逻辑
- 让后续 AI / 人工协作有更稳定的目录边界