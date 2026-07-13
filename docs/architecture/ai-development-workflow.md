# AI 开发工作流

## 目的

本文件定义后续 AI 在本项目中处理需求、编写文档、实施改动、验证结果和提交代码时的默认流程。

核心目标是：

- 保持玩法逻辑、提示词规则、状态来源和存档兼容稳定。
- 让重构优先降低耦合，而不是制造新的隐式依赖。
- 让 Web `index.html`、Windows `exe`、Android `apk` 共享同一套核心运行逻辑。
- 让后续 AI 会话知道需求、计划、代码、资源、验证分别应该落在哪里。
- 减少“哪里都能改一点”的无序增长。

## 总原则

1. 先确认目标和边界，再修改代码。
2. 先复用已有模块，再新增模块。
3. 先让旧入口变薄，再考虑删除旧入口。
4. 先保证 Web 主链稳定，再扩展 Windows / Android 宿主能力。
5. 先验证当前小切片，再继续下一刀。

## 接到需求后的第一步

每次收到新需求，先回答以下问题：

1. 这是小改动，还是中大型改动？
2. 属于哪个功能域？
3. 是否影响状态、存档、资源、提示词、平台桥接或多端资源同步？
4. 是否已有可复用的 `app / domain / ui / platform / shared` 模块？
5. 是否需要先写需求文档、计划文档或架构说明？

如果这些问题还没有答案，不应直接跨文件大改。

## 需求分级

### 小改动

适用范围：

- 单点 UI 文案调整。
- 已有展示字段的小修正。
- 已有函数内的局部 bug 修复。
- 不影响存档、资源、提示词、平台桥接和多端清单的局部改动。

处理方式：

- 可以直接实现。
- 仍要先确认权威状态来源和目标模块。
- 改完至少运行与本文件相关的最小验证。

### 中大型改动

适用范围：

- 跨多个系统或多个运行端。
- 影响存档结构、状态来源或恢复流程。
- 影响提示词规则、阶段规则或 AI 输出约束。
- 新增平台能力、宿主桥接或打包链路。
- UI、状态、规则三者一起变化。
- 涉及旧入口迁移、兼容层收缩或旧代码清理。

处理方式：

- 先写文档，再实现。
- 先拆成小切片，再逐步提交。
- 每一刀都要能独立验证、独立提交、必要时独立回退。

## 文档落点

新增文档前先判断它的生命周期。

长期规则和边界：

- 放在 `docs/architecture/`
- 适用：目录结构、模块职责、平台边界、编码规则、迁移模式、协作规则。

需求背景和验收口径：

- 放在 `docs/requirements/`
- 适用：用户目标、行为变化、范围限制、验收标准。

实现计划和阶段验证：

- 放在 `docs/plans/`
- 适用：分阶段计划、影响范围、风险控制、验证记录。

玩法规则和提示词规则：

- 放在 `docs/game-rules/`
- 适用：阶段规则、数值口径、提示词注入规则、角色反应规则。

Superpowers 计划：

- 放在 `docs/superpowers/plans/`
- 适用：使用 `superpowers:writing-plans` 形成的任务级执行计划。

不要为每个很小的动作都新建一份流水账文档。能合并进已有 plan、audit、summary 的，就不要新增平行文档。

## 目录落点

新增代码前先判断职责层级。

### `publish/app/`

适用：

- 编排流程。
- 跨模块调用顺序。
- 恢复、启动、同步、保存等组合流程。
- 旧入口真实逻辑下沉后的承接位置。

规则：

- `app` 可以调用 `domain / ui / platform / shared`。
- `app` 不应承载大量纯规则计算。
- 旧顶层入口迁移时，优先使用“`app` 真实现 + 顶层 facade”的方式。

### `publish/domain/`

适用：

- 玩法规则。
- 状态判定。
- 数值计算。
- 与 UI 和平台无关的业务 helper。

规则：

- `domain` 不应直接操作 DOM。
- `domain` 不应依赖 Electron、Android WebView 或宿主桥。
- `domain` 应尽量保持可复用和可测试。

### `publish/ui/`

适用：

- 展示对象。
- 行、卡片、面板、标题、空状态、按钮状态等派生数据。
- 页面模板消费的 view helper。

规则：

- `ui` 不应写入核心玩法状态，除非是明确的交互状态。
- 模板应优先消费 helper 结果，不要在 HTML 中直接拼复杂状态。

### `publish/platform/`

适用：

- 存储能力。
- 文件、资源、Key、宿主桥接、可用性判断。
- 浏览器与宿主差异的适配。

规则：

- 不要把具体玩法规则写进平台层。
- 平台层应服务 Web / Windows / Android 的统一抽象。

### `publish/shared/`

适用：

- 与具体玩法无关、与具体平台无关、与具体页面无关的通用能力。

规则：

- 不要把 `shared` 当成分类不清时的垃圾桶。
- 若逻辑明显属于某个玩法域，应优先放到对应 `domain` 或 `app`。

### `desktop/` 与 `mobile/`

适用：

- 宿主壳层。
- 平台桥接。
- 打包链路。
- 资源装配。

规则：

- 不要把玩法规则塞进宿主层。
- Android assets 镜像不是权威源码；主源码仍以 `publish/` 为准，再通过同步脚本复制。

## 旧入口迁移规则

当前 `publish/` 顶层旧入口仍承担运行兼容职责，不应先硬删。

默认迁移顺序：

1. 找到旧入口中的真实职责。
2. 在 `publish/app/`、`publish/domain/` 或 `publish/ui/` 中建立明确承接模块。
3. 旧入口改为薄 facade，保留原 public 方法名。
4. 更新 Web 与 Android runtime manifest。
5. 补运行时依赖校验。
6. 跑验证。
7. 提交并 push。
8. 等调用方全部迁移且有验证证据后，再清理旧入口。

不要在同一刀里同时做：

- 大搬迁。
- public API 改名。
- 玩法逻辑变化。
- 编码清洗。
- 旧代码删除。

## 多端同步规则

Web 主链：

- 权威运行目录是 `publish/`。
- 页面入口是 `publish/index.html`。
- 脚本加载顺序由 `publish/boot/script-manifest.js` 与 `publish/boot/scripts.json` 约束。

Android：

- WebView assets 镜像位于 `mobile/android-webview-shell/app/src/main/assets/publish/`。
- 不手工长期维护镜像差异。
- 修改 `publish/` 后运行 `npm run android:sync-assets`。
- 提交前运行 `npm run android:sync-assets -- --check`。

Windows：

- `desktop/` 只承载宿主壳层、打包链路和桥接。
- 不把 Electron 或 exe 打包细节写进玩法模块。

共享原则：

- 多端复用不是复制三份业务逻辑。
- 核心玩法留在 `publish/`。
- 宿主负责加载、桥接、存储和平台能力。

## 编码安全规则

中文文档、HTML、JS、CSS 默认按 UTF-8 处理。

必须遵守：

- 不要只靠 PowerShell 控制台显示判断中文是否乱码。
- 先用 Node 或明确 UTF-8 的方式读取确认。
- 不要用 PowerShell `>`、`>>`、`Set-Content`、`Add-Content` 整文件回写大量中文。
- 对历史编码风险文件，优先小范围补丁，不要顺手整文件清洗。
- 若出现大面积无关 diff、中文异常或整文件被改写，应立即停止并重新选择更安全的写入方式。

推荐验证：

```bash
node -e "const fs=require('fs'); const s=fs.readFileSync('目标文件','utf8'); console.log((s.match(/\\uFFFD/g)||[]).length)"
git diff --check
```

## 验证规则

按改动范围选择验证，不要用窄验证冒充全量证明。

### 通用文档或目录规则

推荐：

```bash
git diff --check
npm run verify:repo-boundaries
```

### Runtime 模块或 manifest

推荐：

```bash
npm run verify:runtime-coverage
npm run verify:runtime-deps
npm run verify:assets
npm run android:sync-assets -- --check
```

### WeChat 聊天主链

推荐：

```bash
npm run verify:wechat-chat-invariants
```

### Web / file / desktop / Android 运行链

按影响面选择：

```bash
npm run validate:control:http
npm run validate:control:file
npm run validate:desktop:launch
npm run android:assemble-debug
```

如果验证失败，先区分：

- 是命令环境问题。
- 是 manifest 或 assets 不一致。
- 是加载顺序问题。
- 是业务逻辑回归。

不要在没有定位前继续扩大修改范围。

## 提交规则

每一刀完成后优先形成小提交。

提交前：

1. `git status --short --branch`
2. `git diff --check`
3. 运行与改动范围匹配的验证命令。
4. 精确 `git add` 本轮文件，不做目录级暂存。
5. `git commit`
6. `git push origin dev-refactor`

不要把构建产物、临时日志、缓存目录、截图、验证副产物混入提交。

## 停手条件

遇到以下情况应先停下，不要继续硬改：

- 需要同时改玩法、存档、提示词、平台桥接和 UI。
- 发现调用链比预期更大，不能在一刀内验证。
- 历史文件出现编码风险或无关 diff 激增。
- Android assets 与 Web manifest 不一致且原因未明。
- 旧入口调用方尚未审计，却准备删除旧入口。
- 验证失败但还没有定位原因。

停手后应补充：

- 现状说明。
- 风险范围。
- 下一步计划。
- 必要的最小验证命令。

## 推荐推进节奏

当前项目最适合的节奏是：

1. 小步收边界。
2. 抽真实现到内聚模块。
3. 旧入口保留兼容 facade。
4. Web 与 Android manifest 同步。
5. 补依赖校验。
6. 验证。
7. 提交并 push。
8. 再继续下一刀。

这个流程看起来慢，但它能最大限度保持玩法不断、结构渐进变稳，并为后续 Windows `exe`、Android `apk`、Web `index.html` 三端复用打好基础。
