# Platform Core Shell Mapping Index

## 目标
把 `platform.core` 合约与 `desktop/`、`mobile/` 壳目录中的具体映射文档连接起来，形成后续多端宿主实现的统一索引。

## 共享合约来源
- `docs/architecture/platform-core-contract-2026-07-11.md`

## 宿主策略
- `docs/architecture/multi-platform-host-strategy-2026-07-11.md`

## 按端映射
### Desktop
- `desktop/docs/platform-core-mapping.md`
- 推荐宿主方向：Electron first，后续评估 Tauri

### Mobile
- `mobile/docs/platform-core-mapping.md`
- 推荐宿主方向：Capacitor first，Android WebView 作为快速原型备选

## 使用方式
1. 先阅读共享 `platform.core` contract。
2. 再看目标宿主端的 mapping 文档。
3. 宿主桥接实现优先写入对应壳目录，不回写业务模块。
4. 共享业务模块继续只依赖 `platform.core.*`。

## 当前状态
- 现阶段 mapping 文档只定义职责与落点，不切换当前运行入口。
- `publish/index.html` 仍然是唯一真实运行入口。
