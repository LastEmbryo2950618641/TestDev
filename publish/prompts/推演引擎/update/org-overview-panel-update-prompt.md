---
name: org-overview-panel-update
description: 根据上下文与模型知识推演并写入组织五面板总览事实
---

# 遗留：组织五面板更新

组织或社群的五大总览面板有可写内容时使用。依据可来自：本轮正文、已有上下文资料、以及模型对已知现实/设定组织的常识；不必等到正文逐字确认才写。

## 面板

- `ideology`: 意识形态 / 国体 / 凝聚原因
- `economy`: 经济 / 可用资源（**固定清单**）
- `politics`: 政治 / 管理（**固定清单；不写意识形态**）
- `military`: 军事（**固定清单**）
- `diplomacy`: 外交 / 联谊（**固定清单**）
- `territory`: 统治区域（**固定清单**）

## value JSON 规范（强制）

组织能力每条结算只认：`{ "subject", "panel", "field", "value", "reason" }`。  
`value` 必须按下方类型输出，**禁止**用 Markdown 列表字符串冒充结构化字段。

| 类型 | 用于哪些 field | `value` 形状 |
| --- | --- | --- |
| `text` | 各面板非列表字段 | `string` |
| `number` | `ideology.legitimacy` | `number` |
| `nameDescList` | 各面板 `institutions`/`laws`/`works`，及外交 `memberships`/`treaties` | `[{ "name": string, "description": string }]` |
| `relationList` | 外交 `allies`/`rivals` | `[{ "name": string, "description": string, "viewOfSelf": string }]` |
| `groupItemsList` | 军事 `forces` | `[{ "name": string, "items": string[] }]` |
| `regionList` | 统治区域 `regions` | `[{ "name", "capital", "area", "controlRate", "population", "description", "garrison" }]` |

示例：

```json
{ "panel": "military", "field": "forces", "value": [{ "name": "陆军", "items": ["第一集团军：规模约10万人；训练率约70%"] }], "reason": "…" }
```

```json
{ "panel": "diplomacy", "field": "allies", "value": [{ "name": "俄罗斯", "description": "全面战略协作伙伴", "viewOfSelf": "视我为可靠协作方" }], "reason": "…" }
```

## ideology 必填五字段

| 字段 | 含义 |
| --- | --- |
| `core` | 核心国体 / 意识形态 / 凝聚核心名称 |
| `reason` | 形成原因 |
| `description` | 当前阶段如何解释自身 |
| `base` | 法理 / 阶级 / 参与基础 |
| `legitimacy` | 合法性 / 凝聚力数值，单位 `/100` |

## economy 固定清单

| key | UI 标签 | 输出要求 |
| --- | --- | --- |
| `gdp` | GDP | 如：`18万亿美元 美元（120万亿元 人民币）（消费约X%；投资约Y%；净出口约Z%）`；缺项可省略括号内组成部分 |
| `income` | 收入 | 同 GDP：双货币额度 + 主要收入来源构成 |
| `expenditure` | 支出 | 同 GDP：双货币额度 + 主要支出去向构成 |
| `assets` | 资产 | 写清主要资产类别与规模或占比（如外汇储备、国企净资产、土地/矿产权益、主权基金等） |
| `resources` | 资源 | 写清可量化资源及单位（如原油产量、粮食、稀土、劳动力规模等）；未知写已知项 |
| `production` | 产量 | 写清关键品类与周期产量（年/月）；可带占比或世界位次 |
| `system` | 经济制度 | 一段话写清所有制、计划/市场比重、关键调控方式、对外开放度 |
| `institutions` | 经济机构 | `nameDescList`：机构名 + 职责/管辖范围（央行、财政部、发改委、国资监管等） |
| `laws` | 经济法案/法律 | `nameDescList`：法案名 + 要点（财税、金融、贸易、产业、劳动法相关） |
| `works` | 经济作品 | `nameDescList`：作品名 + 学说/主张要点 |

## politics 固定清单

| key | UI 标签 | 输出要求 |
| --- | --- | --- |
| `regime` | 政体 | 一段话归纳治理形态（共和/君主/党国等）、权力集中度、是否联邦 |
| `powerStructure` | 权力结构 | 一段话写清立法、裁决、执行如何分配与相互制衡/从属 |
| `rulemaking` | 规则制定 | 一段话写清谁提案、谁审议、谁批准、修废程序 |
| `adjudication` | 裁决解释 | 一段话写清争议由谁裁决、终审层级、司法解释权归属 |
| `execution` | 行政执行 | 一段话写清谁执行命令与处分、中央/地方分工 |
| `participation` | 参与与选举 | 一段话写清政党格局、选举范围与方式、公民参与渠道 |
| `leadership` | 统治与继承 | 一段话写清最高领导如何产生、权限边界、任期/继承与罢免 |
| `institutions` | 政治机构 | `nameDescList`：机构名 + 职权 |
| `laws` | 政治法案/宪法/组织法 | `nameDescList`：法名 + 规范要点 |
| `works` | 政治作品 | `nameDescList`：作品名 + 主张要点 |

## military 固定清单

| key | UI 标签 | 输出要求 |
| --- | --- | --- |
| `posture` | 军事总览 | 2～4 句写清：武装力量定位、主要威胁/假想敌方向、当前战备基调（进攻/防御/维稳/威慑） |
| `forces` | 兵力构成 | 写清军种与建制；每单位尽量带规模、阶级构成、兵种构成、训练率、物资充足率、恢复效率。`value`=`groupItemsList` |
| `personnel` | 兵力规模 | 一段话写清现役/预备役/民兵（或准军事）人数；可附男女比、士官/军官比例、征兵或志愿制 |
| `quality` | 质量战备 | 一段话写训练、纪律、士气、战备等级、指挥协同；尽量带粗量化（如训练率 xx%、战备值班旅数量） |
| `sustainment` | 持续力/后勤 | 一段话写弹药/燃料/粮秣可用天数或充足率、医疗后送、战略运输、维修产能、动员周期 |
| `projection` | 投送与控制 | 一段话写本土防御、区域控制、远征/海外基地、快反、核常威慑、特种能力；点明大致能打到哪/守住哪 |
| `equipment` | 装备与武库 | 一段话用可点数的装备量，避免空泛。例：`主战坦克约XXXX台；驱逐舰/护卫舰约XX艘；战斗机约XXX架；远程火炮约XXXX门；弹道/巡航导弹库存约XXXX枚`；未知只写已知项 |
| `institutions` | 军事机构 | `nameDescList`：机构名 + 职责（统帅机关、国防部、军种司令部、战区/军区等） |
| `laws` | 军事法案/法规 | `nameDescList`：法规名 + 要点（兵役、国防、动员、戒严、军事设施保护等） |
| `works` | 军事作品 | `nameDescList`：作品名 + 学说/要点（兵法、作战条令、军事理论著作等） |

## diplomacy 固定清单

| key | UI 标签 | 输出要求 |
| --- | --- | --- |
| `posture` | 外交总览 | 2～4 句写清：对外定位、主要交往对象与议题、当前外交基调（进取/稳健/收缩/对抗等） |
| `orientation` | 对外取向 | 一段话写清多边/单边偏好、开放度、价值观或利益优先、是否结盟导向、对大国与邻国的基本态度 |
| `allies` | 盟友与伙伴 | `relationList`：关系性质、紧密程度、主要合作领域 + `viewOfSelf`（对方如何看待本方） |
| `rivals` | 对手与摩擦 | `relationList`：争议焦点、烈度、是否军事化/制裁化 + `viewOfSelf`（对方如何看待本方） |
| `memberships` | 国际组织与机制 | `nameDescList`：组织/机制名 + 身份与角色（成员国、常任理事国、观察员等） |
| `treaties` | 条约与协定 | `nameDescList`：条约名 + 约束要点与生效范围 |
| `presence` | 驻外网络 | 一段话用可点数写法。例：`大使馆约XX；总领馆约XX；重要国际组织常驻代表处约XX`；未知只写已知项 |
| `institutions` | 外交机构 | `nameDescList`：机构名 + 职责 |
| `laws` | 涉外法规 | `nameDescList`：法规名 + 要点 |
| `works` | 外交作品 | `nameDescList`：作品名 + 主张/要点 |

## territory 固定清单

| key | UI 标签 | 输出要求 |
| --- | --- | --- |
| `capital` | 首都 | 首都名称（如 `北京`） |
| `area` | 统治面积 | 带单位：如 `约960万平方千米` |
| `population` | 统治人数 | 带单位：如 `约14亿人` |
| `adminDivision` | 统治行政区划分 | 写清层级链，如 `省-市-县/区-乡/镇`（或该组织实际层级） |
| `regions` | 统治区域 | `regionList`：默认按最高行政区；每项含省会、面积、控制率、人数、描述（人文/地理/天气等）、驻军 |

`regions` 示例：

```json
[
  {
    "name": "四川省",
    "capital": "成都",
    "area": "约48.6万平方千米",
    "controlRate": "全境",
    "population": "约8300万人",
    "description": "盆地与高原并存，湿热夏季、多云雾；蜀文化与辣味饮食突出",
    "garrison": "驻军西部战区相关集团军，规模约XX万人"
  }
]
```

## 规则

- 允许根据上下文与模型已有知识直接填入；不要因为「正文未逐字说出」就整面板留空。
- 不确定时可写保守概括；禁止为升级 classification 而硬编矛盾事实。
- `economy` / `politics` / `military` / `diplomacy` / `territory` 只用各自固定 key。
- 部门/职位任职写势力结构，不写进五面板与统治区域。
- classification 变更仍走 faction-overview。
