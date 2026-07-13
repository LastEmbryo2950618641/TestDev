# 项目说明

这是一个以 AI 推演、角色状态演化、现实世界/异世界双线叙事为核心的网页游戏项目。
当前项目以 `publish/` 作为浏览器运行主目录，通过本地开发服务加载页面与静态资源；中长期目标是在不破坏现有玩法与存档兼容的前提下，逐步完成低耦合重构、目录规范化，以及 Web / Windows / Android 多端复用。

## 当前目标

- 保持现有玩法、提示词规则、角色状态逻辑、存档逻辑不被重构误伤
- 优先做低风险、可验证、可回退的边界收口与职责拆分
- 在 `web index.html` 可持续运行的基础上，推进 `windows exe` 与 `android apk` 壳层复用
- 先完成新结构承接，再清理旧代码与过程噪音
- 让后续人类协作者和 AI 会话都能快速理解项目边界，不再到处散改

## 当前运行方式

- 开发入口：`dev/scripts/dev-server.cjs`
- 页面入口：`publish/index.html`
- 默认地址：`http://127.0.0.1:8000/`

说明：当前项目不是标准的 `npm run dev` / Vite / Webpack HMR 工程，而是基于自定义本地静态服务运行。
因此：

- 浏览器直接双击 `index.html` 不能完整替代当前开发模式
- 热更新能力需要基于现有开发服务补齐，而不是生搬硬套前端脚手架
- 多端壳层也应围绕当前运行链做适配，而不是把业务逻辑反向塞进宿主层

## 目录结构

### 运行与业务主目录

- `publish/`
  - 当前浏览器运行主目录
  - 页面、样式、脚本、静态资源、提示词模板、运行时模块都以这里为主
  - 凡是会被浏览器直接消费的核心运行逻辑，都必须明确自己是否属于这条主链

### 开发与工具目录

- `dev/`
  - 开发服务、辅助脚本、验证脚本、后续开发工具入口
  - 不承载具体玩法业务规则

### 文档目录

- `docs/`
  - 统一放需求、计划、架构、协作规则、迁移说明与长期审计文档
  - 推荐先读：[docs/README.md](docs/README.md)

### 多端宿主目录

- `desktop/`
  - Windows `exe` 方向宿主壳层
  - 只承载宿主装配、平台桥接、打包链路与运行时适配
- `mobile/`
  - Android `apk` 方向宿主壳层
  - 只承载 WebView/宿主桥、资源装配、打包链路与移动端运行时适配

### 共享能力目录

- `shared/`
  - 桌面端、移动端、浏览器端可复用的桥接契约、运行时约束或平台能力抽象
  - 这里的代码应优先保持平台无关，避免混入具体玩法逻辑

### 其他目录

- `assets/`
  - 原始资料、设定材料、整理中的源资源
- `tests/`
  - 独立验证脚本、最小回归测试、结构稳定性验证

## 架构约束

### 1. 功能玩法优先稳定

任何重构都必须以“玩法不变、行为不变、状态来源不乱”为前提。
如果一次改动需要同时影响：

- 业务规则
- 存档结构
- 提示词生成
- 平台桥接
- 页面展示

则默认应先回到文档和计划层拆分，不直接横切多处大改。

### 2. 顶层旧入口先收口，不先硬删

当前 `publish/` 顶层仍有部分活跃入口承担运行链兼容职责。
这些文件在调用面、模板面、运行装配面完全迁移前，不应贸然删除。
原则是：

- 先把展示逻辑、纯派生逻辑、平台细节逐步外移
- 让顶层入口变薄，保留兼容 facade
- 等调用方稳定迁移后，再做旧代码清理

### 3. 多端复用边界

多端复用的正确方向是：

- `publish/` 持续承接核心玩法和浏览器主运行链
- `desktop/` / `mobile/` 负责宿主壳、桥接与打包
- `shared/` 负责共用能力契约与平台抽象

不要把：

- Electron/Android 宿主细节直接塞进玩法模块
- 具体玩法规则反向塞进宿主壳层
- 临时打包脚本当成长期业务入口

## AI 协作规则

### 文档应该写在哪里

- 需求背景与目标：`docs/requirements/`
- 实现计划与验证：`docs/plans/`
- 架构边界与目录规范：`docs/architecture/`
- 玩法规则与提示词规则：`docs/game-rules/`

### 修改前默认动作

1. 先确认权威状态来源
2. 先判断是否已有可复用模块
3. 先判断是否属于展示层收口、状态层收口、平台层收口中的哪一类
4. 中大型改动先补文档，再落代码

### 编码与文件写回规则

- 项目中的中文文档、HTML、JS、CSS 默认按 `UTF-8` 处理
- 不要依据 PowerShell 控制台直接显示的中文效果判断文件是否真实乱码
- 不要使用 PowerShell `>`、`>>`、`Set-Content`、`Add-Content` 直接整文件回写包含大量中文的内容
- 涉及 `publish/index.html`、`README.md`、各类中文说明文档时，优先使用 Node 脚本或能明确保持 `UTF-8` 的方式读写
- 若只是做局部结构替换，优先使用最小补丁；若必须整文件改写，先确认编码与换行策略，再执行
- 若编辑后出现大面积中文异常、无关 diff 激增、整文件被改写，应立即回退该文件并重新选择更安全的写入方式

### 约束 AI 不要到处乱加代码

- 不要在多个无关文件重复补同类逻辑
- 不要把平台实现直接混进业务规则
- 不要继续无边界地往 `game.js` 或顶层旧入口堆功能
- 不要目录级误提交构建产物、临时验证目录、宿主缓存目录
- 不要为了“显得完整”生成大量一次性噪音文档

## 资源与产物规则

### 正式资源放置

- 浏览器运行时直接访问的静态资源：`publish/assets/`
- 原始资料、未整理资源、源素材：`assets/`

### 不应混入正式版本控制的内容

以下内容默认不应被目录级提交：

- `desktop/shell/.artifacts/`
- `desktop/shell/.verify-storage/`
- `desktop/shell/dist/`
- `desktop/shell/dist-minimal/`
- `mobile/android-webview-shell/.gradle/`
- `mobile/android-webview-shell/app/build/`
- `mobile/shell/.verify-storage/`
- `mobile/shell/.bridge-verify-storage/`
- 本地环境文件如 `local.properties`

提交前建议运行：

- `npm run verify:repo-boundaries`
- `npm run verify:runtime-deps`
- `npm run verify:assets`
- `npm run android:sync-assets -- --check`

如需提交，必须白名单确认其确实属于长期项目资产，而不是构建或验证副产物。

## 推荐阅读顺序

1. [README.md](README.md)
2. [docs/README.md](docs/README.md)
3. [docs/architecture/encoding-collaboration-rules.md](docs/architecture/encoding-collaboration-rules.md)
4. [docs/architecture/ai-development-workflow.md](docs/architecture/ai-development-workflow.md)
5. 与当前修改模块直接相关的 playbook / plan / audit 文档

## 当前阶段建议

当前最推荐的推进方式仍然是：

1. 先做小步、低风险、可验证的职责收口
2. 优先把展示派生和纯 helper 逻辑迁到模块内聚位置
3. 保持顶层入口兼容，避免误伤玩法
4. 等新结构真正接住调用链后，再逐步清理旧代码

这样推进虽然慢一些，但更符合当前项目“玩法不断、结构渐进变稳”的目标。
