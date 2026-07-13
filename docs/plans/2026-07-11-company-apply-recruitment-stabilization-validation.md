# 2026-07-11 Company Apply Recruitment Stabilization Validation

本轮属于 `publish/company-actions.js` 的块级语法稳定化推进，只处理 `applyRecruitment()`。

## 1. 本轮目标

- 只替换 `applyRecruitment()` 本身
- 保留原有分支入口与数据写入目标
- 确认最早语法报错是否成功推进到下一块

## 2. 本轮处理

本轮将 `applyRecruitment()` 重写为稳定、可读的招聘写入逻辑：

- 保留 `employee` / `timed` / `creator-low` / `creator-high` 四个分支
- 继续写入 `contracts` / `submissions` / `employment` / `employmentRecords`
- 保留 `id`、`company`、`signedAt`、`startAt` 等核心字段
- 继续在末尾调用 `this.save?.()`

## 3. 本轮没有做

- 没有处理 `resignCompany()`
- 没有改公司数据源结构
- 没有改出勤、组织结构、词条逻辑
- 没有改保存链与初始化链

## 4. 验证结果

重新执行 `node --check publish/company-actions.js` 后：

- 最早报错已不再停留在 `applyRecruitment()`
- 新的最早报错推进到 `resignCompany()` 区域

这说明：

- `applyRecruitment()` 这一块已经成功脱离关键阻塞路径
- 下一轮应单独处理 `resignCompany()`

## 5. 当前推进顺序

截至目前，`publish/company-actions.js` 的块级稳定化已推进为：

1. 前置状态与默认文案小修
2. `companyFieldReason()` 稳定化完成
3. `companyPromptContext()` 稳定化完成
4. `applyRecruitment()` 稳定化完成
5. 当前主阻塞点：`resignCompany()`
