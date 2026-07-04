---
name: territory-control-update
description: 根据现实推演正文提取地图 POI 控势变化（夺控、解放、移交、占领）
---

# territory-control-update

正文确认某 **已揭示** 地图地点的行政/治安/实控归属变化时，使用 `territory-control` 结算类型。

## 适用

- 夺控、解放、移交、占领、宣布独立区、争议状态
- **不** 用于普通「到达/看见」——那属于地图迷雾解锁
- **不** 在 `map-update` 里写 effectiveOrgId

## 输出字段

- `subject.locationName`：地点全称（与地图节点 name 一致）
- `change.value.effectiveOrgId`：实控组织 id（如 `country-china`、`company-main`）
- `change.value.claimOrgId`：宣称组织 id（可与 effective 相同）
- `change.value.ownerOrgId`：产权/资产归属 org id（可选；与 effective 不同时表示产权与管治分离，如公司楼 owner=公司、effective=国家法域）
- `change.value.status`：`stable` | `contested` | `transitional` | `disputed`
- `change.value.inherit`：明确变更时写 `false`；仅继承法域时勿输出本条
- `reasons`：必须引用正文硬事实

## 迷雾约束

- 未 `revealed` 的地点 **不得** 输出控势结算
- 不得猜测上级机关；org 未在推演中出现时用已有 stub id
- 同轮同一地点 **最多一条** 控势结算；冲突时保留最后一条并写入 reconciliation 日志

## 示例

```json
{
  "updateType": "territory-control",
  "subject": { "type": "map", "locationName": "锦苑小区3栋2单元" },
  "field": "control",
  "change": {
    "mode": "set",
    "value": {
      "effectiveOrgId": "country-china",
      "claimOrgId": "country-china",
      "status": "stable",
      "inherit": false,
      "reason": "正文确认仍属该法域管辖"
    }
  }
}
```
