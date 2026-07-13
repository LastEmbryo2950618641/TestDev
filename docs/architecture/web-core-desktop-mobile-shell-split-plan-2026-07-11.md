# Web Core / Desktop Shell / Mobile Shell Split Plan (2026-07-11)

## 目标

在不改变当前玩法逻辑的前提下，为项目建立一份可执行的多端目录拆分草案。该草案的目的不是立刻重构为三套工程，而是明确：哪些代码应该沉到共享核心层，哪些应该留在桌面壳，哪些未来应放进移动壳。

这份文档直接服务于：

- Windows exe 打包可行性
- Android apk 壳层可行性
- 低耦合与代码复用
- 后续 AI 开发时的落位判断

## 当前现实

当前项目仍以 `publish/` 为主运行目录，历史代码大量集中在根级文件与 `index.html`。但同时，项目已经具备以下结构演进前提：

- `publish/app/` 已存在，可承载装配与流程编排。
- `publish/domain/` 已存在，可承载玩法规则与状态计算。
- `publish/platform/` 已存在，可承载平台能力与宿主差异。
- `publish/ui/` 已存在，并已经开始沉淀 view helper 模式。
- `docs/architecture/cross-module-view-contract-2026-07-11.md` 已明确展示层 contract。

因此，下一阶段最合理的方向不是“重写项目”，而是把现有单体工程逐步演进成“共享核心 + 可替换壳层”的形态。

## 总体拆分思路

推荐形成三段式结构：

1. `web core`：共享业务核心，可被网页、Windows 壳、Android 壳复用。
2. `desktop shell`：桌面宿主专有能力与打包接线。
3. `mobile shell`：移动宿主专有能力与桥接接线。

注意：

- 这里的 `web core` 不是“纯前端页面目录”，而是“当前游戏实际复用核心”。
- `desktop shell` 与 `mobile shell` 不应该复制玩法逻辑，只负责容器、桥接与宿主能力。

## 推荐目录形态

建议按演进顺序逐步形成以下结构：

- `publish/app/`：共享应用装配层
- `publish/domain/`：共享领域规则层
- `publish/ui/`：共享展示整形层
- `publish/platform/core/`：跨平台统一能力抽象入口
- `publish/platform/desktop/`：桌面宿主实现
- `publish/platform/mobile/`：移动宿主实现
- `publish/platform/dev/`：开发环境实现
- `publish/boot/`：当前网页运行时启动壳
- `desktop/`：未来 Windows exe 包装工程
- `mobile/`：未来 Android apk 包装工程

说明：

- `publish/` 仍然可以继续作为现阶段主运行目录。
- `desktop/` 与 `mobile/` 初期可以只做壳层工程，不需要复制 `domain/ui`。
- 共享核心在 `publish/` 内先完成规范化，之后再决定是否外提为更独立的包。

## 各层职责

### 1. Web Core

Web core 由以下部分组成：

- `publish/app/`
- `publish/domain/`
- `publish/ui/`
- `publish/shared/`
- `publish/config/`
- `publish/boot/` 中与网页启动无强绑定的通用装配逻辑

Web core 应负责：

- 游戏状态与玩法规则
- AI 注入与推演流程的业务组织
- 展示数据整形
- 模块注册与应用装配
- 存档结构与领域兼容逻辑

Web core 不应负责：

- 读取本地 key 文件的具体实现
- 原生文件选择器实现
- Windows 特有桥接
- Android WebView / Capacitor 特有桥接

### 2. Desktop Shell

Desktop shell 应负责：

- exe 打包入口
- 本地文件系统桥接
- 桌面资源路径与本地数据目录
- 原生窗口、菜单、权限与宿主生命周期
- 调用 desktop 平台实现并注入给 web core

Desktop shell 不应负责：

- 改写角色玩法规则
- 重新实现 view helper
- 复制 `calendar / event / faction / control` 业务逻辑

### 3. Mobile Shell

Mobile shell 应负责：

- apk 壳层入口
- WebView / Capacitor 容器
- 移动端文件读写桥接
- 权限申请与原生回调
- 调用 mobile 平台实现并注入给 web core

Mobile shell 不应负责：

- 在壳层内再写一套游戏规则
- 在壳层内再做一套模板直拼逻辑
- 复制桌面端平台实现

## 平台能力入口设计

为了让 web core 可复用，平台能力建议统一通过 `publish/platform/core/` 暴露抽象入口。

推荐模式：

- `platform/core/storage.js`：统一存档读写接口
- `platform/core/assets.js`：统一资源访问接口
- `platform/core/keys.js`：统一 key 来源接口
- `platform/core/host.js`：统一宿主能力接口
- `platform/core/files.js`：统一文件读写与选择接口

其下分别由：

- `platform/desktop/*` 提供桌面实现
- `platform/mobile/*` 提供移动实现
- `platform/dev/*` 提供当前开发环境实现

上层模块只依赖 `platform/core/*`，不直接引用具体宿主。

## 与当前 view contract 的关系

当前已经建立的 view contract，是多端拆壳的展示层基础。关系如下：

- `domain` 产出原始业务状态与规则结果
- `ui/view-helpers` 产出稳定的 view object
- `desktop shell` 与 `mobile shell` 都只消费这些稳定边界
- 这样更换容器时，不需要重新复制展示整形逻辑

换句话说：

如果未来桌面端与移动端都围绕同一批 `panel/detail/section view` 工作，那么多端差异主要只剩“容器与宿主能力”，而不是“玩法和展示都要重做一遍”。

## 第一阶段推荐动作

当前最适合的第一阶段，不是新建完整 `desktop/` 或 `mobile/` 工程，而是先继续在现有 `publish/` 内完成共享核心收口。

优先级建议如下：

1. 继续推进 `publish/ui/` 的 view helper 化，降低 `index.html` 与 store 的直接耦合。
2. 把零散平台能力逐步收入口径统一的 `publish/platform/*`。
3. 让 `publish/app/` 承接更多装配逻辑，减轻根级入口压力。
4. 为存档、key、资源访问建立统一平台入口。
5. 在完成这些边界后，再启动 `desktop/` 或 `mobile/` 壳工程。

## 第二阶段推荐动作

当共享核心边界更稳定后，再进入第二阶段：

- 新建 `desktop/` 作为 Windows exe 壳工程
- 新建 `mobile/` 作为 Android apk 壳工程
- 壳层只负责注入平台实现与容器启动
- 不复制 `domain/ui/app` 中的真实业务实现

## 文件落位判断规则

后续每次新增文件时，可用以下问题快速判断落位：

1. 这段代码换到 exe 与 apk 后是否仍应原样复用？
- 如果是，优先放 `app/domain/ui/shared`。

2. 这段代码是否依赖宿主文件系统、权限、路径、桥接？
- 如果是，优先放 `platform/*`。

3. 这段代码主要是在整形展示数据吗？
- 如果是，优先放 `ui/<module>/view-helpers.js`。

4. 这段代码主要是在协调多个模块调用顺序吗？
- 如果是，优先放 `app/`。

5. 这段代码主要是在改变玩法规则吗？
- 如果是，优先放 `domain/` 或当前业务 action 的领域层入口。

## 明确禁止

- 不要在准备多端时直接复制一份 `publish/` 给移动端。
- 不要在 `desktop/` 或 `mobile/` 中复制业务规则文件。
- 不要把平台桥接散写回 `domain` 或 `ui`。
- 不要一轮里同时进行“大搬目录 + 大改玩法”。
- 不要让新壳层绕过已建立的 platform/view contract。

## 与当前项目的直接对应

当前项目里，以下类型最适合继续优先抽共享核心：

- `control-*`
- `event-*`
- `faction-*`
- `calendar-*`
- `worldline-*`
- `save-*`
- `wechat-*` 的展示层与状态整形

以下类型最适合优先平台化：

- key 读取
- 本地资源访问
- 图片落盘
- 本地存档目录
- dev-only 服务入口

## 结论

当前项目最稳妥的多端路线，不是立刻转为“两个新项目”，而是继续把现有 `publish/` 演进成共享核心，并让未来的 `desktop shell / mobile shell` 只承担宿主职责。

只要这一边界持续被遵守，后续无论打包为 Windows exe 还是 Android apk，成本都会显著低于现在直接复制工程分别维护。