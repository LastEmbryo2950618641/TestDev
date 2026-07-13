# 2026-07-11 Company Prompt Context Stabilization Validation

本轮属于 `publish/company-actions.js` 的块级语法稳定化推进，只处理 `companyPromptContext()`。

## 1. 本轮目标

- 只替换 `companyPromptContext()` 本身
- 保留其“返回公司上下文长文本”的职责
- 确认最早语法报错是否成功推进到下一块

## 2. 本轮处理

本轮将 `companyPromptContext()` 重写为稳定、可读的上下文拼接逻辑：

- 使用 `companyFields()` 生成公司词条段
- 使用 `companyOrganization()` 生成组织结构段
- 使用 `workStats` 生成工作状态段
- 使用 `c.rules` 生成公司规则段

返回值仍然是单个长文本字符串。

## 3. 本轮没有做

- 没有处理 `applyRecruitment()`
- 没有改招聘类型数据
- 没有改合同/投稿数据结构
- 没有改保存链与初始化链

## 4. 验证结果

重新执行 `node --check publish/company-actions.js` 后：

- 最早报错已不再停留在 `companyPromptContext()`
- 新的最早报错推进到 `applyRecruitment()` 区域

这说明：

- `companyPromptContext()` 这一块已经成功脱离关键阻塞路径
- 下一轮应单独处理 `applyRecruitment()` 附近的历史断串

## 5. 当前推进顺序

截至目前，`publish/company-actions.js` 的块级稳定化已推进为：

1. 前置状态与默认文案小修
2. `companyFieldReason()` 稳定化完成
3. `companyPromptContext()` 稳定化完成
4. 当前主阻塞点：`applyRecruitment()`
