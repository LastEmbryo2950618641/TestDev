# Multi-Platform Host Strategy

## 目标
在不改变当前共享玩法入口的前提下，为 `desktop/` 与 `mobile/` 提供可启动的宿主工程选择建议。

## Desktop
### 推荐路径
- 第一阶段：Electron stub
- 第二阶段：评估是否迁到 Tauri

### 原因
- 当前项目还是自定义本地静态服务器 + `publish/index.html` 运行链路。
- Electron 更适合先把桌面宿主桥接、窗口、文件与存储适配跑通。
- 待 `platform.core.*` 更稳定后，再决定是否收敛到更轻量的正式桌面方案。

## Mobile
### 推荐路径
- 第一阶段：Capacitor 方向优先
- 备选：Android WebView 最小原型

### 原因
- 当前共享核心本质仍是 Web runtime。
- Capacitor 对现有代码复用更自然，后续权限、文件桥接和 APK 打包也更工程化。
- 若只是短期快速验证，可先用 Android WebView 壳证明运行可行。

## 统一约束
1. 宿主层不复制玩法逻辑。
2. 宿主差异优先通过 `platform.core.*` 注入。
3. 共享 UI 仍然由 `publish/` 提供。
4. 技术选型服务于渐进迁移，而不是推翻现有共享核心。
