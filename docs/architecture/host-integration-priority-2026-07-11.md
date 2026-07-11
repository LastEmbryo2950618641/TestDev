# Host Integration Priority

## 当前优先级
1. Desktop first
2. Mobile after desktop host path is proven

## 为什么是这个顺序
- 桌面端更容易先验证文件、窗口、本地存储与 bridge 装配。
- 移动端在 WebView 生命周期、权限、文件系统与桥接时序上更复杂。
- 先打通桌面宿主链路，可以降低移动端接入时的不确定性。

## 当前约束
- 这只是宿主接入优先级，不代表桌面业务优先级永远高于移动。
- 共享玩法逻辑仍应优先保持在 `publish/` 与 `platform.core.*` 边界内。
- 真实宿主接入仍应遵守小步验证，不并行大面积推进两个端。

## 对后续会话的建议
- 若要开始真实宿主工程，优先从 `desktop/shell/` 着手。
- 若只做原型验证，可让 `mobile` 保持文档与 stub 状态，待桌面链路成立后再推进。
