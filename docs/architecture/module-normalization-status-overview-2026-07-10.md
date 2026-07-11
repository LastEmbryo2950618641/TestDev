# 2026-07-10 module normalization status overview

## 目标

本清单用于记录当前哪些模块已经进入结构规范化轨道，哪些模块已形成可复用样板，哪些模块适合成为下一阶段优先对象。

## 已进入规范化轨道的模块

### 1. `real-world`

当前状态：已形成完整样板。

已完成内容：

- 从 `game.js` 与 `real-world-map-actions.js` 中下沉多批只读展示逻辑
- 建立 `publish/ui/real-world/` 目录
- 建立多主题 helper 文件
- 建立兼容聚合入口
- 建立目录 README 与架构说明文档
- 建立 `real-world-map-actions` 迁移 backlog

当前目录结构示例：

- `log-view-helpers.js`
- `panel-view-helpers.js`
- `map-info-view-helpers.js`
- `map-control-view-helpers.js`
- `map-interior-view-helpers.js`
- `map-view-helpers.js`
- `README.md`

说明：

这是当前最成熟的规范化样板，可作为后续模块拆分参考模板。

### 2. `company`

当前状态：已形成第二个样板，仍在扩展中。

已完成内容：

- 从 `company-actions.js` 与 `company-attendance-actions.js` 中下沉多批只读展示逻辑
- 建立 `publish/ui/company/` 目录
- 建立按主题拆分的 helper 文件
- 保留兼容聚合入口
- 建立目录 README

当前目录结构示例：

- `company-pay-view-helpers.js`
- `company-field-view-helpers.js`
- `company-attendance-view-helpers.js`
- `view-helpers.js`
- `README.md`

说明：

`company` 已经证明这套模式不只适用于 `real-world`，而是可以复制到其他业务模块。

## 已有探索但暂不继续深拆的模块

### 3. `faction`

当前状态：已做过探索，但当前阶段不适合大规模推进。

原因：

- 历史中文异常较多
- 逻辑分支复杂
- 曾经处于半迁移状态
- 风险明显高于 `real-world` 与 `company`

建议：

- 仅允许继续抽取风险极低的纯展示 helper
- 不适合当前阶段做大块迁移

## 尚未系统化启动但适合后续进入的模块

### 4. `taobao`

潜力：较高。

原因：

- 有较多标签、筛选、详情、列表包装类只读展示逻辑
- 很适合复制 `company` / `real-world` 的模式

建议优先级：中高。

### 5. `wechat`

潜力：中高。

原因：

- 展示逻辑非常多
- 但面板、相册、消息、头像裁剪等主题较多，进入前需先缩边界

建议优先级：中。

### 6. `calendar` / `boss` / `event`

潜力：中。

原因：

- 可能存在较多摘要与只读展示函数
- 但需先确认真实实现落点，避免又只围绕 `game.js` 空壳转

建议优先级：中。

## 当前不建议优先推进的方向

- 大规模 `faction` 迁移
- 混合改玩法与改结构的组合修改
- 平台能力与展示逻辑一起拆
- 没有真实实现落点时只围绕 `game.js` 空壳函数做形式化搬运

## 现阶段推荐节奏

1. 先在已成型样板上继续巩固规则
2. 再把同样模式复制到第三个低风险模块
3. 每进入一个新模块，优先：
   - 找真实实现文件
   - 抽只读展示逻辑
   - 建 `ui/<module>/`
   - 保留兼容聚合入口
   - 补目录说明

## 下一阶段优先级建议

### 第一优先级

- `taobao`

### 第二优先级

- `wechat` 的低风险展示切片

### 第三优先级

- `calendar` / `boss` / `event`

## 结论

当前项目已经不再是零散地“抽几个函数”，而是开始形成一套可复制的规范化流程：

- 先找真实实现
- 下沉只读展示逻辑到 `ui/`
- 保留兼容入口
- 按主题二次拆分
- 用 README / architecture 文档固定边界

这套流程已经在 `real-world` 与 `company` 两条线上得到验证，可作为后续多端复用与持续解耦的主路线。