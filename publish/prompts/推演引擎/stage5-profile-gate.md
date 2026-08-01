# Stage6 外观判定

任务：只输出一个合法 JSON 对象，不输出 Markdown、代码块、正文或解释。

## 目标

根据本轮正文与 Stage4 结算结果，判断哪些出场角色的外观档案需要局部更新：

- `dressedProfile` + `dressedProfileMeta`（盛装 Part6，衣着、饰品、妆容、刻意发型或造型变化）
- `bodyProfile` + `bodyProfileMeta`（自然 Part5，当前身体外观变化；对亲密/性相关后的可见观感变化更灵敏）

**11 个固定部位与 meta 适用同一套事实规则**；不因某一类剧情（发育、伤病、亲密累积等）而偏袒或忽略其他部位。

MVP 范围：
- 最多 2 个角色；每人每类 profile 最多 1 条 target
- 固定部位列表：头发、脸部、耳朵、脖颈、胸部、双臂、小腹、臀部、神秘花园、双大腿、双小腿
- `updateScope`：`parts`（局部部位）、`meta`（仅全局 meta）、`both`（meta+部位）

{{stage5GateTriggerGuide}}

## 判定规则（摘要）

**dressedProfile** — 衣着、饰品、妆容、刻意发型或造型变化；仅视觉塑形 → 只改盛装。

**bodyProfile** — 只要正文已形成**可确认的身体外观变化**即可更新：
1. **正文确认**（能从正文或已结算事实确认，不是纯脑补）；
2. **属于身体外观**（而非纯衣着、纯姿势、纯镜面错觉）；
3. **可落成当前外观描述**（可写入 tags / description / meta）。

洗澡、刚洗完、湿发、滴水、水汽、卸妆、素颜、自然脸色、睡意疲态等当前可见的身体/脸/头发状态，属于自然外观。

无事实依据 → **needsUpdate: false**，与部位无关。

## 输入

本回合参与者：
{{本回合参与者}}

穿着状态变化摘要（可能与 Stage4 并行，为空时只看正文）：
{{穿着状态变化}}

各角色当前自然状态摘要：
{{当前自然摘要}}

各角色当前盛装摘要：
{{当前盛装摘要}}

本轮正文（节选）：
{{本轮正文}}

## 输出 JSON Schema

```json
{
  "needsUpdate": false,
  "targets": []
}
```

当 needsUpdate 为 true 时，targets 示例（类型多样，勿照搬为唯一合法模式）：

```json
{
  "needsUpdate": true,
  "targets": [
    {
      "subject": "角色姓名",
      "profileType": "dressedProfile",
      "updateScope": "parts",
      "parts": ["头发", "脸部"],
      "metaFields": [],
      "reason": "补妆并重新扎发",
      "evidence": "正文：她对镜补唇彩并将头发扎起"
    },
    {
      "subject": "角色姓名",
      "profileType": "bodyProfile",
      "updateScope": "parts",
      "parts": ["双臂"],
      "metaFields": [],
      "reason": "前臂留下可见伤痕",
      "evidence": "正文：缝合后前臂内侧留下线性伤痕，当前已可见"
    },
    {
      "subject": "角色姓名",
      "profileType": "bodyProfile",
      "updateScope": "meta",
      "parts": [],
      "metaFields": ["weight", "figure"],
      "reason": "当前体重与体型已出现可确认变化",
      "evidence": "正文：体检记录体重由43kg变为38kg，当前外观更纤细"
    }
  ]
}
```

**反例（needsUpdate: false）**：
- 仅「感觉/似乎/好像」或玩家单方面说法，无验证
- 妆造、内衣、姿势造成的视觉差
- 只有心理感受、快感或疼痛，但没有形成可观察外观

约束：
- targets 最多 2 项；每项 parts 最多 3 个
- subject 必须是本回合参与者中的出场角色姓名
- evidence 须引用正文可确认事实；优先说明当前能观察到的外观变化，勿只写主观感受

