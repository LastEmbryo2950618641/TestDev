# Mobile Shell

本目录用于承载 Android `apk` 方向的宿主壳工程，不直接承载玩法逻辑。

## 目标
- 复用 `publish/` 中已经整理出的共享运行时与静态资源。
- 通过移动宿主实现 `platform.core.host` / `platform.core.files` / `platform.core.storage` 的移动特化版本。
- 控制移动端改动面，避免将平台差异重新扩散进玩法层。

## 当前阶段
- 仅建立骨架与装配约束。
- 现阶段移动壳尚未切换现有浏览器入口，也不影响当前 `publish/index.html` 运行链路。

## 目录约定
- `mobile/shell/`
  - 移动宿主入口、WebView 装配、桥接层、权限适配。
- `mobile/docs/`
  - 移动壳专属说明、打包约束、宿主能力映射。

## 后续接入原则
1. `publish/` 仍然是共享 Web 核心来源。
2. 移动壳只负责宿主能力装配，不复制玩法模块。
3. 若移动端需要文件/存储/主机能力，应优先实现到 `platform.core.*` 的移动版本。
4. 移动壳新增代码不得反向把平台细节泄漏回共享业务模块。
