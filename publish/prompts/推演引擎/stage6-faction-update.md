---
name: Stage9-faction-update
description: 正文与 Stage4–8 之后串行执行的势力创建/字段更新（Skill 写库）
---

# Stage9 势力更新

只输出一个合法 JSON 对象，不要 Markdown、解释或正文。

本阶段在 Stage4–8 **之后串行**执行，可利用上文正文与结算上下文。

## 规则

判定以「本轮正文是否出现势力/组织/公司正式名」为准（含 `<force>` 标签与裸写名称）；对照「当前势力索引」。

1. **出现且未入库 → 必须创建**：正文出现现实世界真实组织/公司/学校/机关/社群等势力名，且索引中没有同名势力时，调用 `createFaction`。按正文与上下文补全可知字段；不得以“本轮未互动/未拜访/未改字段/只是背景提及”为由跳过。
   - `params` 尽量给完整势力对象（id/name/type/classification/worldTag/structure/solid.overviewPanels 等已知字段）。
2. **已入库且正文有事实变化 → 更新**：势力已存在，且正文明确说明该势力相关数据发生变化（人事、架构、归属、资源、立场、控势、规则等）时，调用 `patchFactionField`。
   - `params`: `{ id, panel?, field, op, value?, index?, reason }`
   - `panel`: `ideology|economy|politics|military|diplomacy|territory`（国体/经济等）；顶层字段可不写 panel
   - `op=set`：覆盖字符串/数值/整字段
   - `op=append`：向列表末尾追加一项
   - `op=delete`：按 `index`（从 0）删除列表某一项
   - `reason` 须点明正文事实依据。
3. **仅出现、无事实变化**：已入库势力只被提及、正文未给出可写入的数据变化时，不要为该势力写 patch。
4. 本轮既无“未入库出现”也无可写入变化时：`{ "ops": [], "done": true }`。
5. 禁止批量编造与正文无关的势力；只处理正文实际出现的条目。

## 输出合约

```json
{ "ops": [ { "method": "createFaction|patchFactionField", "params": {} } ], "done": true }
```

