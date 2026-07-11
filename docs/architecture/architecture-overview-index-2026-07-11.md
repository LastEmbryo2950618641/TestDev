# Architecture Overview Index (2026-07-11)

本文档作为当前架构治理、多端复用、shared runtime 收口工作的统一索引入口，帮助后续协作者快速判断：

- 先看哪一类文档
- 当前阶段已经做到哪里
- 下一步该沿哪条线继续推进

## 一、当前总体结论

截至当前状态，项目已完成以下关键阶段沉淀：

1. 业务层 `characterStateStore / realWorldLogStore / localSettings` 收口已基本完成
2. browser / desktop / mobile 三端平台桥接入口已建立
3. Windows exe 路线已具备基础打包链与执行清单
4. Android apk 路线已具备 bridge 骨架与执行清单
5. Web `index.html` 路线已具备安全接线清单，继续维持高风险入口谨慎治理策略

因此，当前项目已从“边改边探路”进入“有规则、有索引、有分阶段执行文档”的状态。

## 二、首次阅读建议顺序

### 1. 先读阶段结论

优先阅读：

- `docs/architecture/business-store-migration-stage-snapshot-2026-07-11.md`
- `docs/architecture/platform-boundary-note-2026-07-11.md`

用途：

- 了解当前业务层 store 收口做到什么程度
- 明确什么是业务层残留，什么是平台桥接层保留项

### 2. 再读三端桥接总清单

优先阅读：

- `docs/architecture/multi-platform-bridge-responsibility-checklist-2026-07-11.md`

用途：

- 了解 browser / desktop / mobile 三端装配入口分别负责什么
- 了解共享层当前允许依赖哪些统一契约

### 3. 根据目标选择端侧执行清单

如果目标是 Windows exe：

- `docs/architecture/windows-exe-execution-checklist-2026-07-11.md`

如果目标是 Android apk：

- `docs/architecture/android-apk-execution-checklist-2026-07-11.md`

如果目标是 Web 入口治理：

- `docs/architecture/web-index-safe-wiring-checklist-2026-07-11.md`

## 三、按主题分类的核心文档

### A. 业务层收口与 store 迁移

核心文档：

- `docs/architecture/store-migration-playbook-2026-07-11.md`
- `docs/architecture/business-store-migration-stage-snapshot-2026-07-11.md`
- `docs/architecture/store-migration-focus-sweep-2026-07-11.md`
- `docs/architecture/store-migration-coverage-tail-2026-07-11.md`

适合场景：

- 想继续检查业务层是否还有平台直连
- 想理解为什么当前不该继续误扫平台桥接层
- 想看共享 store 收口的阶段结论

### B. 平台边界与桥接职责

核心文档：

- `docs/architecture/platform-boundary-note-2026-07-11.md`
- `docs/architecture/multi-platform-bridge-responsibility-checklist-2026-07-11.md`
- `docs/architecture/multi-platform-assembly-alignment-2026-07-11.md`
- `docs/architecture/shell-assembly-map-2026-07-11.md`

适合场景：

- 想判断某段代码应放业务层、中层，还是平台桥接层
- 想继续推进 browser / desktop / mobile 统一装配形状

### C. Windows exe 路线

核心文档：

- `docs/architecture/windows-exe-execution-checklist-2026-07-11.md`
- `docs/architecture/desktop-packaging-runbook-2026-07-11.md`
- `docs/architecture/multi-platform-execution-snapshot-2026-07-11.md`

适合场景：

- 想继续收口 desktop bridge 与 packaging config
- 想继续核对 `electronDist`、packaging config、桌面产物路线

### D. Android apk 路线

核心文档：

- `docs/architecture/android-apk-execution-checklist-2026-07-11.md`
- `docs/architecture/web-core-desktop-mobile-shell-split-plan-2026-07-11.md`
- `docs/architecture/web-desktop-mobile-track-note-2026-07-11.md`

适合场景：

- 想继续明确 mobile bridge 的宿主 API 映射方向
- 想继续梳理 Android 壳层定位与 shared runtime 关系

### E. Web 入口治理

核心文档：

- `docs/architecture/web-index-safe-wiring-checklist-2026-07-11.md`
- `docs/architecture/browser-platform-assembly-safe-migration-2026-07-11.md`
- `docs/architecture/multi-platform-execution-snapshot-2026-07-11.md`

适合场景：

- 想继续规划 `publish/index.html` 的最小安全接线
- 想判断某轮是否适合真正触碰高风险 Web 入口

## 四、当前基础验证入口

### 1. 共享 store

```bash
node publish/character-state-store-verify.js
node publish/real-world-log-store-verify.js
```

### 2. browser

```bash
node publish/platform/browser-core-verify.js
```

### 3. desktop

```bash
node desktop/shell/assembly-entry-verify.js
node desktop/shell/desktop-packaging-electron-dist-state.cli.js
```

### 4. mobile

```bash
node mobile/shell/assembly-entry-verify.js
```

## 五、当前最推荐的继续推进方向

在当前阶段，不再推荐继续机械扫描普通业务文件寻找 `platform` 字样。

更推荐的方向是：

1. 继续补宿主 API 映射表
2. 继续收口 desktop / mobile 的运行说明与打包说明
3. 在确认编码治理策略后，再选择最小 Web 入口接线点
4. 继续保持 shared runtime 不分叉

## 六、后续协作者最低约束

后续协作者至少应遵循：

1. 业务层不新增 `platform.storage.*Source` 直连调用
2. 平台桥接职责不重新散回普通业务模块
3. desktop / mobile 不承载玩法逻辑副本
4. 在没有明确编码策略前，不大改 `publish/index.html` 与 `publish/boot/script-manifest.js`

## 七、当前索引对应的主目标

本索引服务于当前主目标：

- 保证低耦合
- 保证代码复用性
- 保证功能玩法不变
- 在降低关联性影响风险的前提下推进 `window exe / android apk / web index.html` 三端复用
- 持续规范代码结构与目录边界
