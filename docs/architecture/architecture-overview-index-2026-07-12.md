# 架构总览索引（2026-07-12）

本文档用于给后续人类协作者与 AI 会话提供一份稳定、可读、低噪音的架构阅读入口。

目标不是重复散落文档的全部内容，而是回答三个问题：

- 当前项目已经形成了哪些相对稳定的目录边界
- 哪些文档适合作为长期入口
- 下一步重构应该优先沿哪些低风险路径推进

## 1. 当前目录结构结论

当前仓库已经从“旧入口直连大量逻辑”的形态，进入“新分层逐步承接旧入口”的过渡阶段。

可以把当前目录理解为以下几层：

### 运行主链

- `publish/`
  - 浏览器运行主目录
  - 当前 `index.html`、运行时脚本、提示词、资源、主要玩法逻辑仍以这里为核心

### 宿主与打包方向

- `desktop/`
  - Windows `exe` 壳层与桌面宿主方向
- `mobile/`
  - Android `apk` 壳层与 WebView 宿主方向

### 开发与验证

- `dev/`
  - 本地开发服务、辅助脚本、开发入口
- `tests/`
  - 验证脚本、最小回归、结构稳定性检查

### 文档与协作

- `docs/`
  - 需求、计划、架构、规则与协作约束

### 原始资料与运行资产

- `assets/`
  - 原始资料与整理中的源素材
- `publish/assets/`
  - 浏览器运行时直接访问的正式静态资源

## 2. publish 目录当前分层

`publish/` 目前已经开始形成如下分层：

- `publish/app/`
  - 运行编排、调用胶水、面向某功能面的应用层帮助逻辑
- `publish/domain/`
  - 状态、查询、规则、事件构造等偏领域逻辑
- `publish/ui/`
  - 展示整形、只读视图对象、面板显示帮助逻辑
- `publish/platform/`
  - 平台差异、宿主能力、桥接约束、平台相关产物
- `publish/shared/`
  - 可跨层复用的中立能力
- `publish/boot/` / `publish/init/`
  - 启动装配与初始化入口

当前阶段的正确方向不是“大挪移”，而是：

1. 先让新目录承接纯逻辑或只读逻辑
2. 旧入口文件保留兼容 facade
3. 等调用稳定后，再清理旧代码

## 3. 已经相对成型的模块边界

以下目录已经不再只是空壳，后续可以优先复用其边界：

### Worldline

- `publish/domain/worldline/`
- `publish/ui/worldline/`

说明：
- 这条线已经形成“domain + ui + 旧入口兼容转发”的基本结构
- 适合作为状态查询、事件构造、展示整形分层的参考样例

### Real-world UI

- `publish/ui/real-world/`

说明：
- 已经拆出 panel / map / log / stage 等只读展示帮助逻辑
- 当前适合继续沿“超小只读 helper”模式推进
- 暂不适合把带 runtime 交互、viewport 写入、canvas 尺寸回写的方法直接下沉到该层

### WeChat（局部成熟）

- `publish/app/wechat/`
- `publish/ui/wechat/`
- `publish/domain/wechat/`

说明：
- 已经存在部分可复用 helper 与 README
- 但部分 legacy 文件仍有编码历史与高耦合主链风险
- 适合继续做小步、安全、单方法迁移，不适合大拆

## 4. 当前不宜激进处理的区域

以下区域虽然看起来值得整理，但当前阶段不适合做激进拆分：

- `publish/wechat-actions.js`
  - 需要视为编码风险门控文件
- `publish/wechat-past-event-actions.js`
  - 靠近回复主链、记忆写回、历史上下文拼装
- 部分初始化与恢复入口
  - 涉及启动链、兼容链、历史状态恢复

原则：

- 不因为“看起来大”就优先拆
- 不因为“目录已经有新层”就强行迁移
- 先走低风险展示层、纯派生层、纯状态查询层

## 5. 推荐长期入口文档

后续进入项目时，推荐优先阅读以下文档：

1. `README.md`
2. `docs/README.md`
3. `docs/architecture/project-structure.md`
4. `docs/architecture/architecture-overview-index-2026-07-12.md`
5. 与当前模块直接相关的 boundary / README / playbook / plan 文档

如果当前目标与模块边界直接相关，可继续读：

- `docs/architecture/module-migration-priority-ladder-2026-07-11.md`
- `docs/architecture/module-maturity-overview-2026-07-11.md`
- `docs/architecture/three-sample-playbook-2026-07-11.md`
- `docs/architecture/wechat-display-refactor-playbook-2026-07-11.md`
- `docs/architecture/worldline-forwarder-stability-note-2026-07-12.md`
- `docs/architecture/workspace-noise-governance-plan-2026-07-12.md`

## 6. 当前阶段最稳的推进方式

当前最稳的推进模式已经比较明确：

1. 先补边界文档或模块 README
2. 每次只抽一个超小 helper 或一个小簇 helper
3. 旧入口保留兼容转发
4. 每步做最小语法/运行验证
5. 成功后及时提交，避免大坨未收口改动

这条路径的价值在于：

- 降低关联性影响风险
- 保持原玩法不变
- 提高目录语义清晰度
- 为后续 `web / exe / apk` 共用核心逻辑打基础

## 7. 当前阶段最需要警惕的问题

当前仓库还没有进入“完全收口完成”的状态，主要风险包括：

- 旧入口仍然较多
- 文档数量增长较快，存在过程性噪音
- Android 镜像资源与根 `publish/` 主源之间容易形成脏 diff
- 少数历史中文文件存在编码风险，不能用大范围重写方式处理

因此现阶段的重点不是追求“目录看起来完美”，而是：

- 让新增代码优先进入新边界
- 让旧入口逐步变薄
- 让文档入口更稳定
- 让噪音治理与代码重构分开推进

## 8. 下一步建议

从结构规范化角度，推荐继续按以下顺序推进：

1. 优先继续 `publish/ui/real-world/` 的低风险只读 helper 收口
2. 补齐模块入口 README 与边界文档之间的索引关系
3. 将新需求默认落到 `app / domain / ui / platform / shared` 五类目录之一
4. 在确认新结构已完整承接后，再计划批量清理旧 facade 与过程性噪音文档

本索引文档的定位是“稳定导航页”，后续若某个模块边界发生重大变化，应优先增量补充，而不是整体重写。
