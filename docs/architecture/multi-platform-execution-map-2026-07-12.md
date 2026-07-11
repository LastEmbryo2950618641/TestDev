# Multi-Platform Execution Map (2026-07-12)

这份文档只回答一个问题：

后续协作者如果要继续把当前项目推进成 `Windows exe / Android apk / Web index.html` 三端可交付，应该从哪里开始、跑什么、什么时候停手。

## 一、总原则

1. `publish/` 永远是共享 runtime 主目录
2. `desktop/` 与 `mobile/` 只承载宿主壳、桥接、打包、工具链
3. 不允许为了某一端落地而把玩法逻辑复制到宿主目录
4. 任何继续推进，都先看统一总览，再进入单平台专项

## 二、统一入口

先按这个顺序执行：

1. `node mobile/shell/multi-platform-handoff-overview-report.js`
2. `node publish/platform/unified-platform-verification-suite.js`
3. `docs/architecture/requirement-audit-2026-07-12.md`

用途说明：

- 第 1 个入口：先看三端总体 readiness 与推荐方向
- 第 2 个入口：看当前统一验证是否仍然成立
- 第 3 个入口：确认目标条目层面的完成状态与剩余缺口

## 三、Browser / Web 路线

### 当前权威入口

- 页面入口：`publish/index.html`
- 开发运行方式：启动本地静态服务器后访问 `http://127.0.0.1:8000/`

### 先看

1. `docs/architecture/browser-direct-launch-boundary-2026-07-12.md`
2. `node publish/platform/browser-core-verify.js`
3. `node publish/platform/unified-platform-verification-suite.js`

### 当前口径

- `Web runtime ready`：成立
- `file:// 双击本地 index.html 完整可用`：未被当前证据证明

### 后续若继续推进

1. 做 browser direct runtime 稳定化
2. 若要支持 `file://` 双击直开，必须单开兼容专项

## 四、Desktop / Windows exe 路线

### 先看

1. `desktop/README.md`
2. `node desktop/shell/desktop-packaging-toolchain-preflight.cli.js`
3. `node desktop/shell/desktop-packaging-dry-run-plan.cli.js`
4. `node publish/platform/unified-platform-verification-suite.js`

### 目标

- 证明桌面宿主能够围绕共享 `publish/` runtime 完成组装
- 补更真实的 packaging / build / distribution 证据

### 当前状态

- 架构与宿主能力主干已就位
- 下一步重点不是重构 shared runtime，而是更真实的打包链验证

## 五、Mobile / Android apk 路线

### 先看

1. `node mobile/shell/android-webview-toolchain-overview-report.js`
2. `mobile/android-webview-shell/BUILD-LAUNCH-CHECKLIST.md`
3. `docs/architecture/android-final-handoff-summary-2026-07-12.md`
4. `node publish/platform/unified-platform-verification-suite.js`

### 真实构建前顺序

1. `node mobile/shell/android-webview-build-env-report.js`
2. `node mobile/shell/android-webview-build-prep-report.js`
3. `powershell -ExecutionPolicy Bypass -File mobile/shell/materialize-android-local-properties.ps1 -SdkDir "<真实SDK路径>"`
4. 替换真实 `gradlew` / `gradlew.bat`
5. `powershell -ExecutionPolicy Bypass -File mobile/shell/run-android-webview-build-attempt.ps1`

### 当前 blocker

- `missing-local-properties`
- `missing-sdk-dir`
- `placeholder-wrapper`

## 六、什么时候不要继续往下冲

出现以下任一情况就应该先停：

1. 有人开始把玩法逻辑复制进 `desktop/` 或 `mobile/`
2. 有人为了单平台落地修改 `publish/` 主链，且没有边界说明
3. Android 还没接入真实 SDK / wrapper 就宣称可构建
4. 把 `Web ready` 与 `file:// direct double-click ready` 混为一谈

## 七、这份执行图的价值

它的目标不是增加新架构，而是降低执行成本：

- 让后续协作者先走正确入口
- 让三端推进顺序更统一
- 让宿主壳与 shared runtime 的边界继续保持稳定
- 让“下一步到底该跑什么”不再依赖口头记忆
