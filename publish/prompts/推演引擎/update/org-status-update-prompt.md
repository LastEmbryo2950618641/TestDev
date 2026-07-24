---
name: org-status-update
description: 根据现实推演正文变更组织政体状态（独立、起义、解散、合并）
---

# Stage4 政体状态更新

正文确认组织 **政体级** 变化时使用；须在 `territory-control` 之前 apply（若同轮兼有控势变更）。

## status 取值

- `active` — 正常
- `rebel` — 起义/武装割据
- `independent` — 独立宣告
- `dissolved` — 解散
- `merged` — 合并入 successor

## 字段

- `successorId` / `successorIds[]`：合并/解散后的承接 org（地图 effective 自动重定向）
- `legitimacy`：`recognized` | `contested` | `unrecognized`
- `predecessorIds[]`：可选

## 禁止

- 无正文硬事实不得改 **已 active 且 L3+** org 为 dissolved（需「更改」证据）
- 不得用本类型写地图 POI 控势细节 → 用 `territory-control`
