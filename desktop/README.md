# Desktop Shell

本目录用于承载 Windows `exe` 方向的宿主壳工程，不直接承载玩法逻辑。

## 目标
- 复用 `publish/` 中已经整理出的共享运行时与静态资源。
- 通过桌面宿主实现 `platform.core.host` / `platform.core.files` / `platform.core.storage` 的桌面特化版本。
- 不把新的业务玩法逻辑写回桌面壳目录。

## 当前阶段
- 仅建立骨架与装配约束。
- 现阶段桌面壳尚未切换现有浏览器入口，也不影响当前 `publish/index.html` 运行链路。

## 目录约定
- `desktop/shell/`
  - 桌面宿主入口、窗口管理、预加载、宿主 API 适配。
- `desktop/docs/`
  - 桌面壳专属说明、打包约束、宿主能力映射。

## 后续接入原则
1. `publish/` 仍然是共享 Web 核心来源。
2. 桌面壳只负责宿主能力装配，不复制玩法模块。
3. 若桌面需要文件/存储/主机能力，应优先实现到 `platform.core.*` 的桌面版本。
4. 桌面壳新增代码不得反向把平台细节泄漏回共享业务模块。
