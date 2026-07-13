# 2026-07-11 web core desktop mobile shell rollout

## Goal

在现有 view contract 与多端边界文档基础上，再补一份更可执行的目录拆分草案，明确共享核心、桌面壳、移动壳的职责边界与推进顺序。

## New Document

- `docs/architecture/web-core-desktop-mobile-shell-split-plan-2026-07-11.md`

## Why This Document Was Needed

- 现有文档已经分别覆盖“多端边界”和“目录职责”，但还缺少一份把两者串起来的可执行拆壳路线图。
- 如果没有这份草案，后续很容易误以为需要直接复制一份工程给 exe 或 apk。
- 当前最重要的不是立刻起壳，而是先保护共享核心的收敛方向。

## Key Output

文档明确了：

- `web core` 应由 `publish/app + domain + ui + shared + config` 组成
- `desktop shell` 只负责 exe 宿主、文件系统、窗口与桌面桥接
- `mobile shell` 只负责 WebView/Capacitor 容器、权限与移动桥接
- 平台能力应统一从 `publish/platform/core/` 抽象，再分别由 desktop/mobile/dev 实现
- 第一阶段先继续收敛 `publish/`，第二阶段再起 `desktop/` 与 `mobile/` 壳工程

## Outcome

这份草案让“低耦合 + 代码复用 + 多端可行性”从抽象目标，变成了更具体的目录演进路线。后续继续拆模块或抽平台能力时，可以直接对照这份草案判断落位。