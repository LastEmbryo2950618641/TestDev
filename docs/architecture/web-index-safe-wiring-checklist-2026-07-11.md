# Web Index Safe Wiring Checklist (2026-07-11)

本文档用于把 `publish/index.html` 这条 Web 入口线从“高风险暂缓改动”进一步固定成一份可执行的安全接线清单，服务于以下目标：

- 保持 `publish/` 继续作为 shared runtime 的默认 Web 宿主
- 在不暴力重写高风险大入口文件的前提下，为后续 browser 装配接线提供明确顺序
- 避免把编码治理、入口抽离、玩法改动混在同一轮里

## 一、当前阶段结论

截至当前状态：

1. `publish/index.html` 仍然是当前唯一真实浏览器运行入口
2. `publish/index.html` 与 `publish/boot/script-manifest.js` 仍属于高风险文件
3. browser 默认平台装配入口已经建立：
   - `publish/platform/browser-core.js`
4. browser 装配自检已建立：
   - `publish/platform/browser-core-verify.js`
5. 当前最稳妥策略仍然不是直接重写 Web 大入口，而是继续以“新增共享装配层 + 文档 + 最小接线规则”推进

## 二、当前 Web 路线的高风险点

以下文件当前仍不适合在没有额外治理前提下做大范围改写：

- `publish/index.html`
- `publish/boot/script-manifest.js`

原因包括：

- 编码/BOM 风险
- 既有内容体积大
- 历史差异复杂
- 一旦直接重写，容易混入：
  - 编码修复
  - 平台装配接线
  - 页面启动流程调整
  - 玩法层联动变化

这会显著提高关联性影响风险，不符合当前阶段目标。

## 三、当前 Web 默认装配基础

当前 browser 侧已建立：

- `publish/platform/browser-core.js`

其当前职责包括：

1. 提供 `attachBrowserPlatformCore(target)`
2. 提供 `readBrowserUiSettings(target, key)`
3. 为 browser 默认提供 `platform.core.storage.localSettingsSource`
4. 作为后续 `web / desktop / mobile` 装配形状统一的一部分

这意味着：

- 后续 Web 接线应优先把“默认 browser 平台能力”集中到 `browser-core.js`
- 而不是继续把更多平台装配细节塞回 `index.html`

## 四、当前允许的安全动作

### 1. 允许继续做的事

- 新增 browser 装配相关共享文件
- 新增 verify 脚本
- 新增接线说明文档
- 在明确编码策略后，做最小插入式接线
- 把主题预读、本地设置预读等小范围初始化逻辑从大入口中抽离成更稳定的共享点

### 2. 当前不建议做的事

- 直接大范围重排 `publish/index.html`
- 在未确认编码/BOM 策略前改写 `publish/boot/script-manifest.js`
- 为了 browser 接线顺手改玩法启动链
- 把 browser 专属初始化逻辑重新散回普通业务文件

## 五、推荐接线顺序

### 阶段 A：只新增、不重写旧入口

完成条件：

- `browser-core.js` 保持独立稳定
- `browser-core-verify.js` 持续可用
- 文档已明确后续接线位置与顺序

当前状态：

- 已完成

### 阶段 B：最小接线准备

前提：

- `index.html` 的编码策略清晰
- `script-manifest.js` 的维护方式清晰
- 已确认本轮不会混入玩法逻辑变更

建议动作：

1. 优先只接入 browser 平台装配入口
2. 优先只处理 `localSettingsSource` / UI 主题预读等最小初始化能力
3. 不在同一轮同时改主题、布局、玩法流程、脚本清单结构

### 阶段 C：统一三端装配形状

最终目标：

- browser -> `attachBrowserPlatformCore(...)`
- desktop -> `attachDesktopPlatformCore(...)`
- mobile -> `attachMobilePlatformCore(...)`

三端都只负责提供：

- `platform.core.host`
- `platform.core.files`
- `platform.core.storage`
- `platform.core.assets`
- `platform.core.keys`

业务层继续只依赖 shared contract，不感知宿主差异。

## 六、后续真正触碰 `index.html` 前的检查清单

在任何会话准备实际改 `publish/index.html` 前，应先确认：

1. 当前修改是否只涉及平台接线，不涉及玩法变更
2. 当前是否已确认编码/BOM 处理方式
3. 当前是否已明确插入点，而不是整体重排结构
4. 当前是否已有对应 verify / 文档支撑
5. 当前是否能在失败时局部回退，而不是把入口文件改得面目全非

若以上任一项不满足，应继续优先新增外围装配文件与文档，而不是直接改大入口。

## 七、当前阶段证据

当前可反复使用的基础证据：

```bash
node publish/platform/browser-core-verify.js
```

以及现有阶段文档：

- `docs/architecture/browser-platform-assembly-safe-migration-2026-07-11.md`
- `docs/architecture/multi-platform-execution-snapshot-2026-07-11.md`
- `docs/architecture/multi-platform-bridge-responsibility-checklist-2026-07-11.md`

这些证据当前足以证明：

- browser 默认平台装配入口已存在
- Web 路线已经具备“先文档化、后最小接线”的安全推进基础
- 当前不直接重写 `index.html` 仍然是最符合风险控制目标的策略
