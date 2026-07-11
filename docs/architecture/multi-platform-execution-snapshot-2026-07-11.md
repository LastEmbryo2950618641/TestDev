# Multi-Platform Execution Snapshot

当前多端目标与迁移主线汇总：

- Web: `publish/index.html`
- Windows exe: `desktop/shell`
- Android apk: `mobile/shell`

## 当前状态摘要

1. 三端装配入口已建立
2. 桌面打包底座已可验证
3. 业务中层主线已建立：
   - `localSettings`
   - `realWorldLogStore`
   - `characterStateStore`
4. 中层迁移总纲：
   - `docs/architecture/store-migration-playbook-2026-07-11.md`

## 当前策略

- 不暴力重写高风险大入口文件
- 先让业务通过中层 store / settings 访问平台能力
- 再择机完成 `web index.html` 的最小安全接线
