# Final Cleanup Audit (2026-07-12)

## 当前结论

1. `publish/index.html` 与 Android 资产镜像 `index.html` 的主干 contract 已经对齐到以下入口：
- `loadingScreenView()`
- `roleCardLoadingPanelView()`
- `homeLoadOverlayView()`
- `companyAttendanceView()`
- `companyPayPanelView()`
- `controlLoreCardView()`
- `realLoreCardView()`
- `pendingRealPlotSummaryView()`
- `realWorldTimelinePanelView()`
- `textProviderSectionView()`
- `textModelSectionView()`
- `drawProviderSectionView()`
- `drawModelSectionView()`

2. Android 工作树剩余主要差异：
- `mobile/android-webview-shell/app/src/main/assets/publish/index.html` 中仍有一块超大的 `settings` 模板区域差异与少量尾部空行。
- 这说明 Android 最后真正未收束的，主要是配置模板区域，而不是多条业务主干同时未完成。

3. 关键旧桥现状：
- `loading` 相关旧 facade 大多已退出模板层，只剩 `progress-view` 内部实现。
- `company`/`worldline` 中 `currentWorkAttendance()`、`companyOrganization()`、`timelineItems()`、`timelineMeta()`、`realWorldRecordingEvents()` 等名字，当前更像模块内部 helper 或聚合层调用，不再是模板主入口。

## 可进入最终清理候选

1. `currentModelSummaryView()`
- 当前模板未消费。
- 若后续确认没有外部调用，可列入直接删除候选。

2. `loading` 线内部 helper
- 模板主入口已收束为高层 contract。
- 后续可继续判断 `progress-view` 内部 helper 是否需要保留为局部实现，还是可以进一步内联/删除。

3. `company`/`worldline` 聚合 helper
- 需要区分“模板主入口”与“仅模块内部转发”。
- 仅模块内部转发且无必要的，可作为第二批旧代码清理候选。

## 下一阶段建议

1. 先解决 Android `settings` 模板剩余差异。
2. 然后做一次“旧 helper 删除候选表”，按：
- 模板仍消费
- 仅内部自用
- 无消费者
三类分组。
3. 最后再开始真实的旧代码删除与验证。

## 2026-07-14 组织领地动作兼容层清理

本轮已完成 `publish/org-territory-actions.js` 的真实迁移与删除，不再保留顶层 facade 或 Android 孤儿镜像。

职责现落位为：

- `publish/domain/org-territory/update-rules.js`：结构路径、面板类型和结算优先级纯规则。
- `publish/app/org-territory/record-helpers.js`：总览条目与系统记录共享写入。
- `publish/app/org-territory/family-actions.js`：家庭、政区 stub、社区归属和家庭地图锚点。
- `publish/app/org-territory/economy-actions.js`：公司/财富镜像、经济级联和就业结束同步。
- `publish/app/org-territory/settlement-actions.js`：Stage4 组织、领土、成员和状态结算编排。

删除 gate 证据：

- `publish/` 与 Android assets 中已无 `orgTerritoryActions` 符号和 `org-territory-actions.js` 清单项。
- Web 与 Android 四份运行时清单顺序统一为 `update-rules -> record-helpers -> family-actions -> economy-actions -> settlement-actions -> faction-actions`。
- `verify:runtime-coverage`、`verify:runtime-deps`、`verify:repo-boundaries`、`verify:orphan-runtime-files` 全部通过。
- `build:multi-platform` 与 `verify:multi-platform` 全部通过；Web 文件/HTTP 可启动，APK 运行时资产无漂移，EXE 发布文件无漂移且可启动。

该结果证明本兼容层满足“先迁移消费者和行为，再删除旧入口”的清理门槛，可作为后续高耦合动作文件拆分的实施样板。

## 2026-07-14 SQLite 运行时实现归位

五个浏览器 SQLite 底层实现已从 `publish/` 根目录归位到 `publish/platform/storage/sqlite/`：

- `save.js`：基础数据库生命周期、slot 与 fallback 状态。
- `world.js`：世界、词典、职业和角色世界关联扩展。
- `worldline.js`：世界线 schema 与读写扩展。
- `memory.js`：角色记忆和归档扩展。
- `real-world-log.js`：现实世界日志 schema、fallback 与读写扩展。

迁移约束及证据：

- 对外 API 仍为 `window.GameModules.sqliteSave`，未改变 schema、slot key、fallback JSON 或迁移调用链。
- 五个 Web 文件、Android 镜像与迁移前 Git blob 哈希逐一一致，证明实现正文没有改动。
- Web 与 Android 四份运行时清单都固定按 `save -> world -> worldline -> memory -> real-world-log` 加载。
- `tests/sqlite-runtime-layout.test.js` 同时禁止根目录旧副本、旧清单入口和 bundle 工具恢复到旧位置。
- `npm run verify:shared` 全部通过。
- `npm run build:multi-platform` 成功生成 APK 与 Windows 解包发布目录。
- `npm run verify:multi-platform` 全部通过：Web 文件/HTTP 可启动；APK 418 个运行时文件零缺失、零漂移；桌面 758 个发布文件零缺失、零漂移且 EXE 可启动。

因此 SQLite 实现现已具备明确的平台存储归属，Android 仍是由 Web 权威源码生成的镜像，根目录不再保留重复实现。
