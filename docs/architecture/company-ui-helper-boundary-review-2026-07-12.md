# Company UI Helper Boundary Review (2026-07-12)

## 目的

这份文档用于记录 `publish/ui/company/` 当前阶段已经完成的展示层收口结果、仍需保留的兼容入口，以及暂时不应继续深改或删除的高风险文件。

目标不是宣布 company 模块已完全重构完成，而是给后续协作者一个清晰判断：

- 哪些迁移已经落地
- 哪些旧入口暂时必须保留
- 哪些文件因为编码或耦合风险暂不清理
- 下一阶段该继续做什么，不该误做什么

## 当前目录现状

截至 2026-07-12，`publish/ui/company/` 已形成以下文件分层：

### 基础数据 helper

- `company-pay-view-helpers.js`
  - `monthlyPayPreview`
  - `workStatusText`
- `company-field-view-helpers.js`
  - `companyOrganization`
  - `companyFields`
- `company-attendance-view-helpers.js`
  - `currentWorkAttendance`

### 展示对象 helper

- `company-summary-view-helpers.js`
  - `companyHeaderView`
  - `companyAttendanceView`
  - `companyPayPreviewView`
- `company-organization-view-helpers.js`
  - `companyOrganizationSectionView`
- `company-field-section-view-helpers.js`
  - `companyFieldSectionView`
- `company-contract-view-helpers.js`
  - `companyContractSectionView`
- `company-employment-record-view-helpers.js`
  - `companyEmploymentRecordSectionView`

### 兼容聚合入口

- `view-helpers.js`
  - 对外继续保留 `window.GameModules.ui.company.viewHelpers.*`
  - 内部已主要退化为 compat facade

## 已完成的迁移结论

以下展示层逻辑已经从 `view-helpers.js` 内联实现迁移为独立 helper：

- `companyHeaderView`
- `companyAttendanceView`
- `companyPayPreviewView`
- `companyOrganizationSectionView`
- `companyFieldSectionView`
- `companyContractSectionView`
- `companyEmploymentRecordSectionView`

这意味着 company 模块当前最主要的一组只读展示 section，已经具备：

- 按主题分文件承接
- 与基础数据 helper 分层
- 可继续被 Web / Desktop / Android 宿主共享
- 可由 compat 入口维持旧调用链稳定

## 为什么 `view-helpers.js` 现在还不能删除

虽然 `view-helpers.js` 已明显变薄，但当前仍不应直接删除，原因如下：

1. 旧访问路径仍可能被其他调用方依赖
2. 当前尚未完成调用面审计，不能证明所有消费者都已改为新 helper 直接访问
3. 兼容壳文件本身已经足够薄，保留它的成本低于误删后的回归风险

因此当前策略应为：

- 保留 `view-helpers.js` 作为 compat facade
- 暂不把“文件变薄”误当成“可以立即删除”
- 等后续完成调用链审计后，再决定是否进一步下沉或移除兼容层

## 当前确认的高风险文件

以下文件中存在明显历史编码脏字或高风险文本污染痕迹：

- `company-pay-view-helpers.js`
- `company-attendance-view-helpers.js`
- `company-field-view-helpers.js`

证据表现包括：

- 中文文案出现错误转码痕迹
- 部分字符串在控制台读取时显示异常
- 这类文件同时承担基础数据与可见文案输出，误改容易造成真实功能回归

因此这三类文件当前不应被当作“顺手清洗”的对象。

## 当前暂不建议做的事

### 1. 不要立即清理 compat 入口

在没有完成调用链审计前，不要删除：

- `view-helpers.js` 中保留的基础 compat 路径

### 2. 不要把编码清洗和结构重构混做

对于存在脏编码的文件：

- 不要因为正在做结构优化，就顺手整文件重写
- 不要在没有专门计划的情况下批量替换中文文案

### 3. 不要同时修改主源码与宿主镜像

当前 company 线的权威源码仍应以 `publish/ui/company/` 为主。
在未进入宿主同步阶段前，不要顺手改：

- `mobile/android-webview-shell/app/src/main/assets/publish/...`

## 当前阶段的建议结论

company 模块当前最适合被视为“展示层收口样板模块”，而不是“已经可以整体清理完成的模块”。

更准确地说：

- 展示层收口：已取得明显成果
- 兼容层删除：证据不足，暂不推进
- 编码清洗：风险较高，应单独开计划
- 宿主同步：暂不在本阶段并行处理

## 下一阶段建议

### 方向 A：切回其他低风险模块复制成功模式

优先继续在以下模块寻找同类只读切口：

- `publish/ui/event/`
- `publish/ui/worldline/`
- `publish/ui/real-world/`

理由：

- 已经有成功样板
- 风险低于直接碰 company 的历史编码文件
- 更符合“先扩大稳定结构，再回头清高风险旧代码”的总目标

### 方向 B：为 company 单独开一轮编码与调用链审计

如果后续要继续深入 company，则建议先单独形成计划，处理：

- 调用方审计
- 编码风险审计
- 基础数据 helper 的最小稳定化策略

在没有这轮计划前，不建议继续深入改动 `company-pay-view-helpers.js`、`company-attendance-view-helpers.js`、`company-field-view-helpers.js`。
