# 2026-07-11 Company Resign Company Stabilization Validation

本轮属于 `publish/company-actions.js` 的块级语法稳定化推进，只处理 `resignCompany()`。

## 1. 本轮目标

- 只替换 `resignCompany()` 本身
- 保留离职状态写回链路
- 验证 `publish/company-actions.js` 是否整体恢复到可通过 `node --check`

## 2. 本轮处理

本轮将 `resignCompany()` 重写为稳定、可读的离职写入逻辑：

- 继续写回 `employment`
- 继续更新 `employmentRecords`
- 继续清空 `contracts` / `submissions`
- 继续关闭工作提示状态
- 继续调用 `syncCompanyLexicon()` 与 `save?.()`

## 3. 本轮没有做

- 没有改 open/close app 行为
- 没有改公司数据源结构
- 没有改招聘、出勤、组织结构逻辑
- 没有改展示层对象化结构

## 4. 验证结果

已执行：

- `node --check publish/company-actions.js`

结果：

- 当前文件已通过最小语法检查

## 5. 当前阶段结论

截至本轮，`publish/company-actions.js` 的历史语法稳定化主线已经完成：

1. 前置状态与默认文案小修
2. `companyFieldReason()` 稳定化完成
3. `companyPromptContext()` 稳定化完成
4. `applyRecruitment()` 稳定化完成
5. `resignCompany()` 稳定化完成
6. `publish/company-actions.js` 已重新通过 `node --check`
