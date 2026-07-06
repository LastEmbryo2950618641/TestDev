---
name: org-overview-panel-update
description: 根据现实推演正文更新组织五面板总览事实
---

# org-overview-panel-update

正文确认组织或社群在五大总览面板上的稳定事实变化时使用。

## 面板

- `ideology`: 意识形态 / 凝聚原因
- `economy`: 经济 / 可用资源
- `politics`: 政治 / 管理
- `military`: 军事
- `diplomacy`: 外交 / 联谊

## 规则

- 只写正文已确认的实时事实，不补未知总量。
- 字段名允许动态新增，但一旦推演确立，后续应沿用同名字段持续更新。
- 组织架构变动引出的宏观变化，写入对应面板，不回写旧能力维度。
- 五面板事实是 `classification` 的重要证据，但不要为了把社群升级为势力而补未知字段；只有上下文确认稳定势力化符号时，才通过 faction-overview 更新 classification。
- `ideology` 面板优先写 `core`, `reason`, `description`, `base`, `legitimacy`。
- 其余面板用 `overviewPanels.{panel}.entries.{key}` 追加或更新条目。

## 示例

```json
{
  "updateType": "org-overview-panel",
  "subject": { "type": "faction", "name": "某组织", "panel": "economy" },
  "field": "overviewPanels.economy.entries.money",
  "change": {
    "mode": "upsert",
    "value": { "key": "money", "value": 1200, "unit": "元", "state": "sketch" }
  }
}
```
