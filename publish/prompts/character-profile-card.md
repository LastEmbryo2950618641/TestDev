# 出场人物固化设定

只返回一个合法 JSON 对象，不要 Markdown、代码块、解释或换行。

## 目标锁定

本次只生成“人物基础区”的候选人物本人。候选姓名是正式姓名时，`name` 必须逐字等于候选姓名，不得同音改字、近形改字、改成玩家、亲属、联系人或关系事件里的其他人。

如果人物基础区写的是“刘思琪”，`name` 就必须是“刘思琪”，禁止输出“刘诗琪”“刘思琦”“刘思绮”等任何变体。若你认为资料里其他写法更常见，也必须服从人物基础区的姓名。

玩家资料只作为关系、住址、社会处境证据；除目标就是玩家本人外，不得把玩家字段当成当前人物字段。若候选姓名是妹妹、联系人、父亲等称谓，按命名要求和关系证据生成正式姓名。

## 玩家本人目标锁定

{玩家本人目标锁定}

## 输入区

人物预设资料：
{人物预设资料区}

人物基础区：
{人物基础区}

玩家基础资料：
{玩家基础资料区}

玩家现实身份：
{玩家现实身份区}

玩家居住家庭：
{玩家居住家庭区}

玩家人际关系：
{玩家人际关系区}

玩家备注：
{玩家备注区}

关系事件：
{关系事件区}

世界观资料：
{世界观资料区}

世界字段：{世界字段}

## 生成规则

1. `name` 是当前人物正式姓名；当人物基础区给出正式姓名时，必须逐字复制该姓名，不能同音替换、不能改字。`relationships` 是”关系：姓名”，多项用中文分号，关系对象不得写成当前人物本人。严禁把多段关系写成链式冒号，例如不要写”妹妹：刘悠:姐姐：刘思瑶”，必须写成”妹妹：刘悠；姐姐：刘思瑶”。
2. `role` 写身份、社会角色或关系定位；`job` 只写已确认的内化职业。学生、亲属、联系人、主角、路人不是职业；不确定时 `job=””` 且 `jobConfirmed=false`。
3. `detail` 写背景、住址、学校/工作、处境和出现原因；`appearance` 只写外貌；`personality` 只写性格与关系边界。三者不要混写；每个字段控制在一句话内。
4. `factions` 是社群角色，元素含 `faction, role, reason`；用于家庭、住址、社区、社交圈等无等级归属。
5. `forcePositions` 是势力地位，元素含 `force, position, reason`；用于国家、学校、公司、部门、组织等有层级归属。现代中国现实人物通常包含”中华人民共和国 / 公民”。
6. `skills/equipment/items/wearing` 都是数组，每项必须有 `reason`。`equipment` 含 `name, description, equipSlots, reason`；`items` 含 `name, description, quantity, reason`；`wearing` 含 `slot, name, description, reason`。
7. 常规生活、上学、工作场景的 `wearing` 应包含基础槽位：内衣、上衣、内裤、下衣、袜子、鞋子；只有明确特殊事件才可返回”未穿戴”。
8. `worldValues` 只填”世界字段”中有证据的 key，没有则 `{}`。
9. `roleCardFieldReasons` 必须完整包含：姓名、所属世界、身份、职业、性别、生日、人际关系、外貌、性格、人物说明、社群角色、势力地位。每个值建议写当前人物本人相关的固化原因，尽量避免抽象套话。
10. `rpgFieldReasons` 必须完整包含这些 key：{RPG字段列表}。每个值建议结合当前人物本人的经历、训练、身体状态或处境原因。
11. 本轮不要返回 `initialMetrics`、`initial_metrics` 或任何情绪/感觉数组；初始数值会由下一步专用小请求生成。
12. 成年角色若资料明确有恋爱、身体吸引、占有欲等证据，只写进 `detail/personality/roleCardFieldReasons` 的事实依据；不要在本轮展开数值数组。

## 输出 JSON Schema

返回的 JSON 必须符合以下完整 Schema 描述。Schema 中每个字段的 `description` 即该字段的含义与约束，与上方生成规则一致：

```json
{
  “type”: “object”,
  “required”: [“name”, “gender”, “relationships”, “role”, “detail”, “appearance”, “personality”, “faction”, “factions”, “forcePositions”, “job”, “jobConfirmed”, “rank”, “skills”, “equipment”, “items”, “wearing”, “worldValues”, “roleCardFieldReasons”, “rpgFieldReasons”],
  “additionalProperties”: false,
  “properties”: {
    “name”: {
      “type”: “string”,
      “description”: “当前人物正式姓名。当人物基础区给出正式姓名时必须逐字复制，不得同音改字、近形改字、改成玩家、亲属、联系人或关系事件里的其他人。”
    },
    “gender”: {
      “type”: “string”,
      “description”: “当前人物性别。使用人物基础区或证据区可确认的性别，不确定可留空字符串。”
    },
    “relationships”: {
      “type”: “string”,
      “description”: “当前人物与他人的关系。格式为'关系：姓名'，多项用中文分号分隔；关系对象不能写成当前人物本人。严禁链式冒号如'妹妹：刘悠:姐姐：刘思瑶'，必须写成'妹妹：刘悠；姐姐：刘思瑶'。”
    },
    “role”: {
      “type”: “string”,
      “description”: “身份、社会角色或关系定位。写'妹妹、同学、程序工程师、邻居'等定位，不要写长背景。”
    },
    “detail”: {
      “type”: “string”,
      “description”: “背景、住址、学校/工作、处境和出现原因。一句话，只写当前人物本人，不要混入外貌和性格。”
    },
    “appearance”: {
      “type”: “string”,
      “description”: “外貌。一句话，只写可见形象、体貌、穿搭风格，不写性格。”
    },
    “personality”: {
      “type”: “string”,
      “description”: “性格与关系边界。一句话，只写稳定性格和互动边界，不写外貌。”
    },
    “faction”: {
      “type”: “string”,
      “description”: “首要社群名。通常取 factions[0].faction，没有则写'无'。”
    },
    “factions”: {
      “type”: “array”,
      “description”: “社群角色列表。用于家庭、住址、社区、社交圈等无等级归属。”,
      “items”: {
        “type”: “object”,
        “required”: [“faction”, “role”, “reason”],
        “additionalProperties”: false,
        “properties”: {
          “faction”: { “type”: “string”, “description”: “社群名称，如家庭、社区、社交圈。” },
          “role”: { “type”: “string”, “description”: “在该社群中的角色，如女儿、成员、邻居。” },
          “reason”: { “type”: “string”, “description”: “该社群角色的固化原因句，必须是当前人物本人相关的原因。” }
        }
      }
    },
    “forcePositions”: {
      “type”: “array”,
      “description”: “势力地位列表。用于国家、学校、公司、部门、组织等有层级归属。现代中国现实人物通常包含'中华人民共和国 / 公民'。”,
      “items”: {
        “type”: “object”,
        “required”: [“force”, “position”, “reason”],
        “additionalProperties”: false,
        “properties”: {
          “force”: { “type”: “string”, “description”: “势力名称，如国家、学校、公司、组织。” },
          “position”: { “type”: “string”, “description”: “在势力中的地位，如公民、学生、职员、成员。” },
          “reason”: { “type”: “string”, “description”: “该势力地位的固化原因句，必须是当前人物本人相关的原因。” }
        }
      }
    },
    “job”: {
      “type”: “string”,
      “description”: “已内化职业。只有明确长期职业/训练时填写；学生、亲属、联系人不是职业。不确定时留空字符串。”
    },
    “jobConfirmed”: {
      “type”: “boolean”,
      “description”: “job 是否有确认证据。job 为空字符串时必须为 false。”
    },
    “rank”: {
      “type”: “string”,
      “description”: “首要势力地位。通常取 forcePositions[0].position，没有可写身份定位。”
    },
    “skills”: {
      “type”: “array”,
      “description”: “个人能力/技能列表。”,
      “items”: {
        “type”: “object”,
        “required”: [“name”, “desc”, “reason”],
        “additionalProperties”: false,
        “properties”: {
          “name”: { “type”: “string”, “description”: “能力名称。” },
          “desc”: { “type”: “string”, “description”: “能力说明。” },
          “reason”: { “type”: “string”, “description”: “获得或形成该能力的原因句，不能是数字。” }
        }
      }
    },
    “equipment”: {
      “type”: “array”,
      “description”: “装备列表。”,
      “items”: {
        “type”: “object”,
        “required”: [“name”, “description”, “equipSlots”, “reason”],
        “additionalProperties”: false,
        “properties”: {
          “name”: { “type”: “string”, “description”: “装备名称。” },
          “description”: { “type”: “string”, “description”: “装备说明。” },
          “equipSlots”: {
            “type”: “array”,
            “items”: { “type”: “string” },
            “description”: “装备占用的槽位列表。”
          },
          “reason”: { “type”: “string”, “description”: “持有该装备的原因句。” }
        }
      }
    },
    “items”: {
      “type”: “array”,
      “description”: “随身或重要物品列表。”,
      “items”: {
        “type”: “object”,
        “required”: [“name”, “description”, “quantity”, “reason”],
        “additionalProperties”: false,
        “properties”: {
          “name”: { “type”: “string”, “description”: “物品名称。” },
          “description”: { “type”: “string”, “description”: “物品说明。” },
          “quantity”: { “type”: “integer”, “minimum”: 1, “description”: “物品数量，最小为 1。” },
          “reason”: { “type”: “string”, “description”: “持有该物品的原因句。” }
        }
      }
    },
    “wearing”: {
      “type”: “array”,
      “description”: “当前穿着列表。常规生活场景应包含基础槽位：内衣、上衣、内裤、下衣、袜子、鞋子。”,
      “items”: {
        “type”: “object”,
        “required”: [“slot”, “name”, “description”, “reason”],
        “additionalProperties”: false,
        “properties”: {
          “slot”: { “type”: “string”, “description”: “穿着槽位，如内衣、上衣、内裤、下衣、袜子、鞋子。” },
          “name”: { “type”: “string”, “description”: “穿着名称。” },
          “description”: { “type”: “string”, “description”: “穿着说明。” },
          “reason”: { “type”: “string”, “description”: “穿戴该物品的原因句。” }
        }
      }
    },
    “worldValues”: {
      “type”: “object”,
      “description”: “世界专属字段初始值。只填输入区'世界字段'中存在且证据明确的 key；没有则返回空对象 {}。”
    },
    “roleCardFieldReasons”: {
      “type”: “object”,
      “description”: “角色卡字段固化原因。必须完整包含以下 key：姓名、所属世界、身份、职业、性别、生日、人际关系、外貌、性格、人物说明、社群角色、势力地位。每个值必须是当前人物本人相关的原因句，禁止返回数字、百分比、布尔值、数组或对象。”,
      “required”: [“姓名”, “所属世界”, “身份”, “职业”, “性别”, “生日”, “人际关系”, “外貌”, “性格”, “人物说明”, “社群角色”, “势力地位”]
    },
    “rpgFieldReasons”: {
      “type”: “object”,
      “description”: “RPG 字段变化原因。必须完整包含 {RPG字段列表} 中的每个 key。每个值必须是中文原因句，禁止返回数字、百分比、布尔值、数组或对象。”,
      “required”: [{RPG字段列表JSON}]
    }
  }
}
```
