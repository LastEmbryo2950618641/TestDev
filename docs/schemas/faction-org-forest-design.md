# 势力组织架构 · 森林模型 需求与设计

> 状态：设计稿 v1.3.3（组织成立门槛 + 所属势力展示规则）  
> 日期：2026-07-05  
> 关联：`org-territory-system-design.md`、`faction-audit.md`、`faction-org-actions.js`、`org-territory-system.js`  
> 前置问题：当前单树 `parentId` 模型导致「公司嵌在街道下」「同名公司上下级重复」「跨省企业无法表达」

---

## 1. 结论

**森林模型 + 国立/私立 + 三轴（层级/制度/策略）+ 迷雾/未认知，满足产品目标：模拟任何组织形态（现实与架空），且组织名、机关名、职位名均由 AI/推演填充，不在 schema 中写死。**

| 产品目标 | 设计回应 |
| --- | --- |
| 模拟 **任何组织** | 固定 **域键 + 合法性矩阵 + 节点类型**；实例名、职位、制度正文运行时写入（§3.10） |
| 现实现代国家/市场/社群 | `geo` ∥ `gov` + `corp` + `community` 四域森林（§3.2–§3.9） |
| 架空/异世界组织 | **同一套骨架**；`worldTag` 隔离实例；域根 **显示名** 可本地化（§2.3、§5.4） |
| 组织 ≠ 地理 | 法人/机关不用 `parentId` 挂街道；地点走 `location` / 地图 / 控势（§3.3） |
| 逐步揭示 | 未认知不渲染；L1 迷雾；L2+ 固化（§3.4） |
| 动态世界观 | 视窗根随推演升格（国家 → 联邦）（§3.6） |

**不必再开第六域 / `orgSubtype` 第三轨**；封建效忠、神权世俗双头、松散国际机构、极简宇宙实体等，均用现有字段组合表达（§3.11）。

### 1.1 设计评审结论（2026-07-05 · 仅需求与设计）

| 评审项 | 结论 |
| --- | --- |
| **合理性** | **通过**。森林四域 + 国立/私立 + 三轴 + 仅上下隶属（§3.12）+ 骨架/实例（§3.10）+ **成立/canon（§3.13）** + **所属势力语义（§5.6）** 自洽，与产品目标一致。 |
| **完善性** | **通过（v1.3.3）**。v1.3.2 缺口已闭合；v1.3.3 增补 **§3.13 成立/canon**、**§5.6/§6.4 所属势力**、**§7.6 门槛**、FR-22/23、AC-14～16。 |
| **范围** | 组织层 **只建模上下隶属**；组织间横向往来 **不在范围**；一国两制 = **同上级、不同 `rules[]`**。 |
| **暂不考虑** | 当前代码实现是否达标（另案验收）。 |

**定稿方向**：可按 §10 分期实施；无需再扩域或 org 关系图。

---

## 2. 背景与问题陈述

### 2.1 现状（v0 单树）

`buildFactionOrgTree()` 对选中势力递归 `parentId`，并把 **子势力** 与 **structure 分支** 合并为同一层 children：

```
国 → 省 → 市 → 区 → 街道 → [公司 faction] → [公司 structure 同名节点] → 部门/职位
```

导致：

1. **域混淆**：法人 `parentId` 被 bootstrap 挂到最细地理节点（街道），跨省总部逻辑错误。  
2. **重复节点**：faction「某科技公司」与 structure 根「某科技公司」同名嵌套（截图 2）。  
3. **兄弟关系丢失**：若再生成「广东省」，与「四川省」本应是同一父下的兄弟，却在单树深度上与公司争抢层级语义。  
4. **治理关系不可见**：「工信部 / 市场监管局」等应属于 **国家机构树** 或 political capability，不应作为公司的 `parentId`。

### 2.2 目标

- 组织架构图表达 **「谁管谁（编制）」** 与 **「谁在哪（地理）」** 两条语义，不强行合一。  
- **迷雾**仅用于「已知有该组织、细节未明」；未进入玩家认知的组织 **不出现在组织图中**。  
- 与 `org-territory-system-design.md` §0 推演闭环兼容；新建 org 须有 archive / 正文合理依据，禁止日常语境凭空出现超自然机关等。  
- audit 仅补全已 exposure 组织，不得替推演「猜」出不该存在的实体。  
- **骨架固定、名字 AI 填**：代码与 prompt 只约束形状与合法性，不写死具体机关名/职位名（§3.10）。

### 2.3 需求分析

#### 2.3.1 产品需求（PR）

| ID | 需求 | 验收要点 |
| --- | --- | --- |
| PR-1 | **模拟任何组织** | 现实公司/政府/军队/NGO/国际机构/架空教会/公会/宇宙实体等，均能用同一 schema 表达（深度可 0～N） |
| PR-2 | **骨架固定** | `orgDomain`、`ownership`、parentId 合法矩阵、节点类型（faction/structure/role/capability entry）、三轴分工不可由 AI 破坏 |
| PR-3 | **名字 AI 填** | `name`、`structure[].name`、`roles[].title`、`rules[]` 正文、`fogLabel` 由推演/audit 写入；禁止写入 schema 常量 |
| PR-4 | **组织与地理分离** | 虚数海、街道、省市区等仅属 geo/地图；组织通过跨域链接关联地点 |
| PR-5 | **三轴不混用** | 隶属→层级；章程/效忠/契约→制度；并购/监管/经营→策略 |
| PR-6 | **推演驱动** | 无 Stage4 / 无 archive 锚点不得 L3 固化；合理性门控（§3.4） |
| PR-7 | **worldTag 隔离** | 现实线 `factions[]` 与异世界 org 实例分表/分 registry，不交叉污染（异世界接入规格见 §14） |
| PR-8 | **仅上下隶属** | 组织节点仅一个 `parentId` 上级；组织间横向往来不在本设计范围（§3.12） |
| PR-9 | **组织成立门槛** | 玩家意图 alone 不成立；路径 A 上级承认 / 路径 B 成立行为+确认方；须 Stage2+Stage4（§3.13） |
| PR-10 | **所属势力展示** | 自立（`foundingType=independent`）UI 不显示所属；收编/承认后才显示具体上级（§5.6、§6.4） |

#### 2.3.2 设计原则（由 PR 导出）

1. **森林多根**：视窗根下并列 `gov` / `geo` / `corp` / `community` 域树；同一域内可有多条并列机关链（如神权 gov ∥ 世俗 gov）。  
2. **国立/私立二分**：表示 **直接管理者** 是国家链还是私人/市场链；组织 **形式**（营利/宗教/封建/非营利）进 `rules[]`，不单开域。  
3. **深度无硬上限**：盖亚类实体可仅 1 个 `structure` 节点；控股集团可 corp 链任意层；UI 折叠，不截断数据。  
4. **单一上级隶属**：松散国际机构等多上级诉求 **不在此设计**；组织节点只有一个 `parentId` 上级（§3.12）。  
5. **bootstrap 默认值 ≠ schema**：新存档默认国名/公司名仅为 **L1 stub**，推演可改名、升格、替换。

**范围澄清（2026-07-05）**

- **组织本体**只表达 **上下隶属**（`parentId` 树 + 内部 `structure[]`）。  
- **组织与组织之间的横向关系/往来**（结盟、网络 cell、对等协作等）**不在本设计范围内**；见 §3.12。  
- **一国两制**等特殊治理：不是新域、不是双 viewport；**同一上级**下，`rules[]`（规章制度）不同即可（§3.12）。

#### 2.3.3 范围边界（非目标）

| 不做 | 说明 |
| --- | --- |
| 法律/工商登记级全仿真 | 叙事引擎，非登记系统 |
| 原生图数据库 / 多 parent DAG | 组织间仅 **上下隶属**；横向往来不在本设计范围（§3.12） |
| 异世界与现实 org 交叉 | 严格 `worldTag` 隔离 |
| 线上社群硬绑地理控势 | 见 `org-territory-system-design.md` §8.3 |
| 开局全量生成政府树 | 仅推演已 exposure 的 org |

#### 2.3.4 与 org-territory 的关系

| 层 | 文档 | 职责 |
| --- | --- | --- |
| 组织注册表 + 森林 | **本文** | 域、隶属、编制、制度、能力、迷雾 |
| 领土控势 + 推演闭环 | `org-territory-system-design.md` | 地图控势、Stage4 结算、exposure、archive |

---

## 3. 概念模型：森林（Forest）

### 3.1 术语

| 术语 | 含义 |
| --- | --- |
| **视窗根（viewport root）** | 组织图顶层实体，**动态**随世界观变化：现实开局多为国家（如「中华人民共和国」）；若推演导致世界统一、成立联邦，则视窗根升格为联邦。由 `resolveViewportRoot()` 根据势力树最高 `sovereign` 节点解析，非写死「仅国家」。 |
| **国立 / 私立（ownership）** | 合法组织的所有制：`state`（国立，隶属 gov 域监管树）或 `private`（私立，隶属 corp 域）。学校、医院、研究机构等均按此分流，不单设 education 域 Tab。 |
| **认知态（exposure）** | **未认知**：组织图不渲染；**已认知 L1**：以迷雾/stub 显示存在；**L2+**：名称与结构逐步固化。 |
| **域（orgDomain）** | 一棵独立树的语义类别，决定 `parentId` 合法上级集合。 |
| **域根（domain root）** | 视窗根下的抽象入口节点；**id 固定**（`{sovereignId}-domain-{key}`），**显示名可配置**（§5.4）。 |
| **骨架（skeleton）** | 不可由 AI 改动的结构：`orgDomain` 枚举、`ownership` 枚举、parentId 合法矩阵、节点类型与 capability 四维。 |
| **实例（instance）** | 运行时填充：`name`、机关名、职位名、`rules[]` 正文、`fogLabel` 等（§3.10）。 |
| **势力节点（faction node）** | `factions[]` 中一条记录，有 id / parentId / orgDomain。 |
| **编制节点（structure node）** | 仅存在于 **该 faction 内部** 的 `structure[]`，不单独占 faction id（除非升格为独立法人）。 |
| **跨域链接（cross-link）** | 不用 parentId 表达 org↔地点/控势：location、territory-control、capability.parentRef（**不含** org↔org 横向往来，§3.12） |

### 3.2 森林拓扑（示意）

下列名称均为 **示例实例名**（AI 可替换）；**域键** `gov|geo|corp|community` 与 id 后缀为骨架。

```
[视窗根] {sovereignName}              orgDomain=country  ← 推演后可变为联邦/帝国等
├── [域根] {govDomainLabel}           orgDomain=gov     id={sovereignId}-domain-gov
│   ├── {中央立法机关}                (L2+ 随推演)
│   ├── {行政机关} → {主管部门A}      (国立监管；未揭示则为迷雾)
│   │   └── {国立机构X}               ownership=state
│   └── … 监管 → corp 域 via capabilities.political
│
├── [域根] {geoDomainLabel}           orgDomain=geo
│   ├── {一级政区A}
│   │   └── {二级政区} → {三级政区} → {基层区划} …
│   └── {一级政区B}                   ← 与 A **同级**
│
├── [域根] {corpDomainLabel}          orgDomain=corp
│   ├── {私立法人Y}                   ownership=private
│   ├── {迷雾机构}                    L1 已认知未揭示
│   └── (未认知 **不渲染**)
│
└── [域根] {communityDomainLabel}     orgDomain=community
    └── 家庭、小区等
```

**国立 / 私立分流（所有合法组织通用）**

| ownership | 典型类型 | parentId 归属 | 示例（实例名 AI 填） |
| --- | --- | --- | --- |
| `state` | 国立学校、公立机构、国企 | gov 域 → 主管部门链 | `{高校}` → `{主管部门}` |
| `private` | 民营公司、民办学校 | corp 域 → 域根或控股链 | `{公司}` → `{corpDomainLabel}` |

**要点**：地理树 **不包含** 公司法人节点；公司树 **不包含** 省市区。  
公司 **注册地 / 办公地** 用 `location` + 地图 POI + `territory-control` 表达，不用 `parentId` 挂到街道。

### 3.3 为何不用「一个 parentId 走天下」

| 关系类型 | 应用机制 | 不用 parentId 的原因 |
| --- | --- | --- |
| 行政隶属 | geo 域 parentId | — |
| 企业隶属国家/集团 | corp 域 parentId | 跨省子公司父节点是集团或「经济组织」，不是某省 |
| 监管 / 审批 | capabilities.political + Stage4 策略 | 属 **策略轴**；非组织间往来层 |
| 办公地点 | location, map anchor | 一地多址、远程办公 |
| 单位内部部门 | structure[] | 非法人编制 |
| 国立法人 | gov 域 parentId | 行政隶属国家主管机关，非地理链 |
| 私立法人 | corp 域 parentId | 市场法人，可无限层控股（见 §3.4） |

### 3.4 迷雾 vs 不存在 vs 合理推演

三级区分，**禁止混用**：

| 状态 | 含义 | 组织图 | Stage4 新建 |
| --- | --- | --- | --- |
| **不存在（未认知）** | 玩家/档案从未表明该组织存在 | **不显示** | 禁止；须先有正文/到达/资料锚点 |
| **存在 · 迷雾（L1）** | 知晓「有这么个组织」，不知名称/结构/负责人 | 显示迷雾节点（可带类型提示，如「某企业（迷雾）」） | 允许 `faction-overview` stub |
| **已揭示（L2+）** | 名称或结构已固化 | 实名节点，structure 随 resolution 展开 | `faction-structure` 等 |

**合理性门控（与日常世界一致）**

- 不得在无上下文的日常推演中 **凭空** 创建超自然/秘密机关（如「国家异能局」），除非 archive 已建立相应世界观（例：异能长期公开存在 → 可 **推断** 国家必有对应机构，但仍须一次正文确认 + Stage4）。  
- **推断 ≠ 发明**：可写「按常理应有 X 类机制」，但 org 入库必须有一次可引用的推演依据；audit 不得跳过此门控。  
- 若连「存在」都未被暗示，则组织图中 **零节点**——不是「隐藏」，是 **尚未进入认知**。

### 3.5 控股层级

- **corp → corp 不限层数**；集团、子公司、孙公司按推演自然生长。  
- **不设人工深度上限**；层数过多时由叙事/管理成本等 **世界内逻辑** 约束，而非代码截断。  
- UI 过深时 **折叠**，不删数据。

### 3.6 视窗根动态升格

| 世界观阶段 | 视窗根示例 | 触发 |
| --- | --- | --- |
| 现实开局 | 中华人民共和国 | bootstrap |
| 区域统合 | 东亚联盟（假设） | `org-status` 结算：多国合并为上级 sovereign |
| 世界统一 | 地球联邦 | 同上，视窗根改为最高 `sovereign` faction |

- 实现：`resolveViewportRoot(factions)` 取 `type=国家|联邦` 且无更上级 parent 的节点；原国家降为视窗根下 **geo/gov 子树**（成员国保留为隶属链上的 sovereign 节点）。  
- 组织图标题、面包屑、域根 id 前缀随视窗根 **热切换**，存档迁移保留旧 id（算法见 §7.4.1）。  
- **多 sovereign 并存**（如神权∥世俗两国）：同一存档可有多棵 **独立四域森林**，每棵对应一个 `sovereign`；UI **同一时刻只展示一个 viewport** 的森林，切换规则见 §6.5。

### 3.7 层级 vs 制度 vs 策略（三条轴，不混用）

| 轴 | 含义 | 数据载体 | 示例 |
| --- | --- | --- | --- |
| **层级（隶属）** | 谁在上、谁在下；编制汇报链 | `parentId`、`structure[]`、`orgDomain` | 子公司挂集团；部门挂公司 |
| **制度（静态规章）** | 组织内部的固定规则模板 | `rules[]`、`structure` 模板、`orgForm` 元数据 | 分公司章程 vs 子公司章程；国企三重一大 |
| **策略（动态决策）** | 运行时经营/治理行为 | `capabilities.*`、Stage4 结算 | 并购、调价、监管处罚、分红政策变更 |

**原则**：经营行为与管理方式属于 **策略**，不属于层级。同一母公司下，**分公司与子公司都是其下级组织**，差异体现在 **制度**（是否独立法人、章程、财务并表规则），而非另设域或 `orgSubtype`。

- **分公司**（常无法人资格）：`corp` 链上节点，或进母公司 `structure[]`；`orgForm: branch` + 对应 `rules[]`。  
- **子公司**（独立法人）：独立 `faction`，`corp→corp`；`orgForm: subsidiary` + 对应 `rules[]`。

### 3.8 地理行政区 vs 同级政府机关（并行，不嵌套）

`geo` 域节点是 **行政区**（四川省、武侯区、玉林街道），**不是** 政府机关本身。

每一级行政区在 **`gov` 域** 有 **同级、并行** 的管理机关（人民政府、市场监督管理局等），机关内设 **职位**（`structure[] → roles`）；下级市/县/区同样各有自己的 gov 机关树。

| 现实 | geo 域 | gov 域 | 链接方式 |
| --- | --- | --- | --- |
| 四川省 | 四川省（政区） | 四川省人民政府、省市场监管局… | `territory-control` / `location` |
| 成都市 | 成都市 | 成都市人民政府… | 同上 |
| 武侯区 | 武侯区 | 区市场监管局、街道办 **机关** | 同上 |

**禁止**：把「XX人民政府」挂为「XX街道」的 `parentId` 子节点。办证、投诉、找街道办等剧情走 **gov 域 + 跨域链接**。

### 3.9 国立 / 私立统一解释（覆盖原「缺口」类型）

**国立（`ownership: state`）** = **直接归属国家（或其 gov 监管链）管理**，不等于「国家创办」；**私立（`ownership: private`）** = **直接归属私人（或 corp 控股链）管理**。管理 **形式**（营利/非营利、宗教/行业/外交属性）由 **制度 `rules[]`** 表达，不单开第三轨 `orgSubtype`。

| 现实类型 | ownership | orgDomain | 说明 |
| --- | --- | --- | --- |
| 央企、国企、公立学校 | `state` | `gov` | 挂国资委/主管部门等 gov 链；经营走 `economic` capability |
| 民营公司、民办学校 | `private` | `corp` | corp 控股链或经济组织域根 |
| 红十字会、基金会、寺庙、行业协会 | `state` 或 `private` | `gov` 或 `corp` | 按 **直接管理者** 分流；章程进 `rules[]` |
| 苹果中国、西门子中国 | `private`（通常） | `corp` | 外资属性进 `rules[]`；上级仍在 corp/gov 隶属链内 |
| 美国驻华使馆 | `state` | `gov` | **外国 sovereign 下** 的 gov 隶属链（与玩家 viewport 国并列的另一棵森林，§6.5）；非横向往来 |
| 联合国、世贸组织等 | `state` 或 `private` | `gov` 或 `corp` | **单一 `parentId` 上级**；章程松散、多成员等写进 `rules[]`，不建多 parent |
| 混合所有制 / JV | 看 **直接管理者** | `gov` 或 `corp` | 分红、合资条款进 `rules[]`，不是新域 |
| 法院、检察院、军队 | `state`（通常） | `gov` | **垂直机关**：parent 走中央条线，不走 geo |
| 个体户、零工、自由职业 | —（无 org 节点） | — | **人** 为公民（国立身份）或依附私人；职业用 `membership` + 角色卡 |

### 3.10 骨架与实例（禁止写死名）

#### 3.10.1 固定（骨架）— 代码 / 校验 / prompt 约束

| 类别 | 内容 |
| --- | --- |
| 域键 | `orgDomain`: `country` \| `gov` \| `geo` \| `corp` \| `community` |
| 所有制 | `ownership`: `state` \| `private` \| `null` |
| 域根 id | `{sovereignId}-domain-gov|geo|corp|community` |
| parentId 矩阵 | §5.2；违反则 migrate / 拒绝写入 |
| 节点类型 | faction → structure[] → roles[]；capability 四维 entries |
| 三轴 | 层级 / 制度 / 策略 分工（§3.7） |
| 认知态 | L0–L4；迷雾 / sketch / established |
| 结算类型 | Stage4 updateType 枚举 |

#### 3.10.2 可变（实例）— AI / 推演 / audit 填充

| 字段 | 说明 |
| --- | --- |
| `faction.name` | 国家名、公司名、机关名、组织名 |
| `structure[].name` | 部门、内设单位、下属机关 |
| `roles[].title` | 职位、头衔、法定身份 |
| `rules[]` | 章程、效忠契约、血缘约束、教会律、分红条款等 **全文** |
| `fogLabel` | L1 占位展示，如「某机构（迷雾）」 |
| `capabilities.*.entries[].name` | 兵种、科室、产线、资产包等条目名 |
| 域根 **显示名** | 按 `worldTag` / 视窗根本地化（见 §5.4） |

#### 3.10.3 禁止与允许

| 禁止 | 允许 |
| --- | --- |
| 在代码常量中写死「教育部」「最高人民法院」等 **具体机关名** 作为唯一合法名 | bootstrap 写 **可替换** L1 stub（如默认国名），推演后改名 |
| prompt 示例让 AI **照抄** 固定机关/职位清单 | prompt 用占位符 `{主管部门}`、`{职位名}` |
| 为特殊组织类型新增第六域 / 第三轨 `orgSubtype` | 用 `ownership` + `orgForm` + `rules[]` 区分形式 |
| audit 无 exposure 输出完整 structure | L1 仅 stub + 空 structure |

#### 3.10.4 验收（骨架 vs 实例）

- AC-9：audit 输出新 gov 机关，名称来自 archive/上下文，**非** prompt 模板抄录。  
- AC-10：更换 `worldTag` 域根显示名后，orgDomain 键与 parentId 规则不变。  
- AC-11：盖亚类 faction 仅 1 个 structure 节点，schema 校验通过。

### 3.11 通用组织形态对照（无第六域）

以下形态 **不** 需要扩展森林架构；此前「模型缺口」多为分类误判。

| 形态 | 错误理解 | 正确落点 |
| --- | --- | --- |
| **封建效忠网** | 需独立「效忠图」 | 正式隶属 → `parentId`；誓约/血缘/契约 **正文** → `rules[]` |
| **神权与世俗双头** | 需新域 | 视窗根下 **gov 域内并列机关树**（或两个 sovereign，各建隶属链） |
| **虚数海 / 位面** | 需 org 域 | **仅 geo/地图**；活动组织 → faction + `location` / 控势 |
| **盖亚 / 阿赖耶** | 「不是组织」 | 合法 faction；`structure[]` 可仅一项；深度浅是实例特征 |
| **松散国际机构** | 需 DAG / 多归属 | **不在此设计** 的 org 间往来；若需组织节点 → **单一上级** + `rules[]` |
| **议会制** | 需 DAG | **gov 机关之一**，`parentId` 在 gov 链 |
| **网络型 / 细胞组织** | 需图数据库 | **不在本设计范围**（§3.12）；组织层仅上下隶属 |
| **一国两制** | 双 viewport / 特殊链接 | **同一上级** 下分支；差异仅在 **`rules[]`**（§3.12.3） |

### 3.12 组织边界：仅上下隶属；横向往来不在范围

#### 3.12.1 在本设计内

| 表达 | 机制 |
| --- | --- |
| A 是 B 的上级法人/机关 | `parentId` |
| A 内部部门、职位 | `structure[]` → `roles[]` |
| 静态章程差异（含一国两制、分/子公司制度差） | 同上级下 **`rules[]` 不同** |
| 动态监管、经营、军事 | `capabilities.*` + Stage4（策略轴） |

#### 3.12.2 不在本设计内（本期不建模）

- 组织与组织之间的 **关系往来**：结盟、对等协作、细胞式联络网等。  
- 叙事需要时由 **正文 + archive** 承担；组织 schema **不** 增横向关系边或第二套 org 图。  
- 存档字段 `relations[]` 若仍存在，**不** 作为森林组织层核心；多对多监管等走 **capabilities.political** + Stage4。  
- **legacy 说明**：`relations[]`、rebel 的 hostile 等 **不等于** 组织图上的第二套隶属或 org 往来边；仅作策略/叙事遗留或 archive 补充，**不** 绘制为组织图横向连线（§6.1）。

#### 3.12.3 一国两制

- **不是** 双 viewport，**不是** geo/gov 特殊双链接模板。  
- 特别法域组织与内地组织一样：挂在 **同一视窗根（同一上级主权）** 的 gov/geo/corp 链上。  
- 「两制」= 该节点或分支的 **`rules[]` 正文** 与兄弟节点不同。

```text
视窗根 {国家}
├── gov → … → {特别行政区机关}    rules[]: 特区基本法/条例 …
├── geo → {特别行政区}             与 gov 并行；地点用 location/控势
└── corp → {特区法人}              rules[]: 特区公司制度 …
```

### 3.13 组织成立与 canon 事实（2026-07-05）

**补全进存档且达 L3 solid / established 的节点 = 推演已确认事实**；未经历 Stage2 可感知事实 + Stage4 的，不算 canon。玩家口头声明、内心计划、meta 指令 ** alone 不创建 org**。

#### 3.13.1 什么算「组织已成立」

满足 **路径 A 或路径 B 之一**，且 **均有 Stage4 结算行**：

| 路径 | 条件 | 典型 `parentId` | `foundingType` |
| --- | --- | --- | --- |
| **A · 上级/法域承认（de jure）** | 正文：授权、登记受理、收编、任命、批文；Stage4 确认 | 具体 **上级 faction**（gov 主管部门 / corp 母体 / 异世界势力） | `subordinate` |
| **B · 事实成立（de facto）** | 正文：**成立行为**（签约、挂牌、首次会议、宣誓…）+ **≥1 个非玩家确认方** 在同轮 Stage4 被写死（`membership` / 机关受理 / 母体代表） | 多为 `{sovereignId}-domain-corp` 或 `{sovereignId}-domain-gov` **域根**（占位挂靠） | `independent` |

**不算成立**：仅玩家意图；路人口头「挺你」无结算；无 archive/正文锚点；audit 替推演「猜」出 org。

**路径 A 补充**：工商/机关 **登记受理** 可使 `legitimacy=recognized`，但若尚无具体 gov 主管部门 faction，`parentId` 仍可暂挂 corp/gov **域根**，`foundingType=subordinate` 仅当 `parentId` 已指向 **具体上级 faction**；否则按域根挂靠 + UI **不显示所属势力**（§5.6），直至 reparent。

**玩家不愿但被成立**：路径 A（上级任命）或路径 B（他人拥立）仍可出现 org；正文须写清 **谁发起**，玩家 `membership` 可为被迫任职。

#### 3.13.2 「有人支持」的判定（路径 B）

**不数好感度、不审查真心**；看 **成立行为 + 确认方**：

| 要点 | 规则 |
| --- | --- |
| 最低确认 | 除玩家外 **≥1** 方在 Stage4 被确认（另一成员、注册窗口、机关代表…） |
| 人数 | **不硬编码**；1～2 人可成立 **微型** org（`scale` 小、`legitimacy: unrecognized` 常见） |
| 全员卧底/假意 | **允许**先成立（表面事实是 canon）；`legitimacy: contested`；后续 Stage4 **更改** 揭露，非「从未存在」 |
| 与 §7.5 关系 | `canIntroduceOrg` 管 **能否新建**；本节管 **成立后属性** |

#### 3.13.3 架构补全 = 确认事实

| 分辨率 | 是否 canon 事实 | 后续变更 |
| --- | --- | --- |
| L1 stub / 迷雾 | 仅「存在意图或名号」 | 可改、可消失（未 solid） |
| L2 sketch | 部分确认，随推演可调 | Stage4 可 upsert |
| L3 solid / established | **是** | 须正文硬事实 + Stage4「更改」 |

**介绍资料 / 上下文注入** 仅为 AI 与结算 **依据**；须经 Stage4（或合规 audit）写入 `structure[]` 才固化。无资料且玩家无接触途径时，玩家声称「早就有的部门」→ 叙事当 **玩笑/非 canon**，组织图 **不增节点**。

---

## 4. 需求说明

### 4.0 PR ↔ FR 索引

| PR | FR | 说明 |
| --- | --- | --- |
| PR-1 | FR-1、FR-18 | 任意组织形态 + 深度 |
| PR-2 | FR-15、FR-8 | 骨架校验 |
| PR-3 | FR-16 | 名字 AI 填 |
| PR-4 | FR-2、FR-5、FR-21 | 组织≠地理 |
| PR-5 | FR-10、§3.7 | 三轴 |
| PR-6 | FR-13、FR-20、NFR-3 | 推演驱动 |
| PR-7 | §14 | worldTag |
| PR-8 | §3.12 | 仅上下隶属 |
| PR-9 | **FR-22** | 组织成立门槛（§3.13、§7.6） |
| PR-10 | **FR-23** | 所属势力展示（§5.6、§6.4） |

### 4.1 功能需求（FR）

| ID | 需求 | 优先级 |
| --- | --- | --- |
| FR-1 | 组织图以 **动态视窗根**（`resolveViewportRoot`）为顶，展示多域森林；视窗根随推演可从国家升格为联邦等。 | P0 |
| FR-2 | **geo 域**：视窗根 → 省 → 市 → 区县 → 街道；同级行政区为兄弟节点。 | P0 |
| FR-3 | **corp 域**：视窗根下 **经济组织** 抽象层；**私立** 合法组织挂此域；L1 已认知但未揭示者显示迷雾。 | P0 |
| FR-4 | **gov 域**：视窗根下国家机构树；**国立** 合法组织挂 `{主管部门}` 链；未推演机构不得编造。 | P1 |
| FR-11 | 合法组织须带 `ownership: state \| private`；国立 → gov 链，私立 → corp 链。 | P0 |
| FR-12 | **未认知组织不渲染**；仅 L1+（已知晓存在）才在组织图出现（迷雾或实名）。 | P0 |
| FR-13 | 新建 org 须通过 **合理性门控**（archive/正文锚点）；禁止无依据的超自然/秘密机关。 | P0 |
| FR-14 | 视窗根升格（如联邦成立）时，域根 id 与 UI 标题自动跟随，原国家保留为子树或成员国。 | P1 |
| FR-5 | 选中 **公司 faction** 时，组织图展示：corp 域路径 + 该公司 **structure 子树**；不展示 geo 全链到公司下。 | P0 |
| FR-6 | **禁止** 同一显示路径出现「faction 公司名 = structure 根节点名」的重复层。 | P0 |
| FR-7 | 迷雾节点可点击跳转势力详情；exposure 升档后同位置 **就地替换** 为实名节点。 | P1 |
| FR-8 | bootstrap / audit / 一致性修复：违反域规则的 `parentId` 自动迁移或写入告警日志。 | P0 |
| FR-9 | Stage4 / audit 新建 **私立** org 时，`parentId` 指向 corp 域合法上级；**国立** 指向 gov 域主管部门。 | P0 |
| FR-10 | 监管事实通过 `capabilities.political.entries` 揭示；P2 可选 UI 虚线 **仅表示 capability 策略事实**，不是 org↔org 隶属或往来边（§3.12）。 | P2 |
| FR-21 | **gov↔geo 对齐**：gov 机关须可关联所辖 geo 节点（`jurisdictionGeoId` / `territoryAnchors`）；见 §5.5、§3.8。 | P1 |
| FR-15 | **骨架固定**：写入/迁移时校验 `orgDomain` + `ownership` + parentId 矩阵；非法组合拒绝或 auto-fix。 | P0 |
| FR-16 | **名字 AI 填**：代码与 audit prompt **不得**写死具体机关名/职位名；bootstrap 仅为可替换 stub。 | P0 |
| FR-17 | 域根 **显示名** 随 `worldTag`/视窗根可配置；**id 后缀与 orgDomain 键**不变。 | P1 |
| FR-18 | 支持 **任意深度** structure（含 0 层、1 层）；禁止以深度截断数据。 | P0 |
| FR-19 | `orgForm`（`branch`/`subsidiary`/…）区分分公司与子公司 **制度**，不新增域。 | P1 |
| FR-20 | `canIntroduceOrg`：无 archive/正文锚点时拒绝新建 org（含超自然机关门控）。 | P1 |
| FR-22 | **组织成立**（PR-9）：仅 Stage2 成立行为/上级承认 + Stage4 可新建 faction；玩家意图 alone 不成立（§3.13）。 | P1 |
| FR-23 | **所属势力展示**（PR-10）：`foundingType=independent` 或 `parent.isDomainRoot` 时 UI **不显示**所属势力；收编/reparent 后显示（§6.4）。 | P1 |

### 4.2 非功能需求（NFR）

| ID | 需求 |
| --- | --- |
| NFR-1 | 与现有存档兼容：加载时迁移旧 parentId，不丢 faction id。 |
| NFR-2 | 渲染性能：单域树深度仍限制 UI 4 层可见，更深折叠。 |
| NFR-3 | 推演约束不变：无 Stage4 不得 L3 固化 structure。 |
| NFR-4 | fieldReasons / 告警 APP 记录迁移与违规修复。 |
| NFR-5 | audit / Stage4 输出须通过骨架校验；实例名冲突不阻断合法 shape。 |

### 4.3 用户故事

1. **作为玩家**，打开组织图，视窗根为当前最高主权体；域 Tab 按 gov/geo/corp/community 分树。  
2. **作为玩家**，在 corp 域看到私立机构；国立机构在 gov 域主管部门链下（名称随推演揭示）。  
3. **作为玩家**，对「听说过但不知道细节」的机构看到 **迷雾** 节点；从未听说过的机构 **不出现**。  
4. **作为玩家**，点进所属组织，只看到 **部门 → 职位** 树，不会出现组织名套组织名。  
5. **作为玩家**，控股集团可有多层子公司，UI 深则折叠，系统不强行截断层数。  
6. **作为系统**，无 archive 依据时拒绝创建无世界观支撑的机关；有 lore 时可推断但仍需 Stage4。  
7. **作为系统**，audit 发现 parentId 违反域规则，自动 migrate 并告警。  
8. **作为系统/AI**，输出机关名与职位名须来自上下文，不得照抄 prompt 模板中的示例专名。  
9. **作为玩家**，我与支持者自立工作室时，势力卡 **不显示**「所属势力」；被集团收编后才显示所属上级。  
10. **作为玩家**，我口头说「成立 xxx 部门」但剧情未发生、无人认 → 组织图 **不出现**该节点；随活动自然露出。

---

## 5. 数据模型设计

### 5.1 faction 字段扩展

在现有字段基础上增加（或规范化）：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `orgDomain` | `'country' \| 'gov' \| 'geo' \| 'corp' \| 'community'` | 域标识；`country` 用于视窗根及 sovereign 节点。 |
| `ownership` | `'state' \| 'private' \| null` | 合法组织所有制：`state`=国立 → gov 链；`private`=私立 → corp 链；社群/家庭可为 null。 |
| `sovereign` | boolean? | true 表示可作为视窗根的最高主权体（国家、联邦）。 |
| `isDomainRoot` | boolean? | true 表示「行政区划」「经济组织」等抽象层节点。 |
| `fogLabel` | string? | L1 展示用，如「某企业（迷雾）」；resolution 升档后清空。 |
| `orgForm` | string? | 制度形态元数据：`branch`（分公司）、`subsidiary`（子公司）、`regulator`（监管机关）等；**不**替代 `orgDomain`。 |
| `jurisdictionGeoId` | string? | gov 机关对应的 geo 政区 faction id（§5.5） |
| `foundingType` | `'independent' \| 'subordinate' \| null` | 成立路径：`independent`=de facto 自立（玩家/支持者）；`subordinate`=上级承认/收编。见 §3.13、§6.4。 |
| `parentId` | string | **约束**：须与 `orgDomain` + `ownership` 兼容（见 §5.2）。 |

**现有字段沿用**：`kind`（admin/community）、`resolution`（L1–L4）、`legitimacy`（`recognized`/`contested`/`unrecognized`，见 `org-territory-system-design.md`）、`location`、`structure[]`、`rules[]`、`solid.capabilities`。

**`parentId` vs 「所属势力」**：`parentId` 为树校验 **必填**（自立 org 可挂域根占位）；**UI「所属势力」** 为语义字段，由 §5.6 解析，**不**把域根当作所属势力展示。

**字段权威**：`orgDomain` + `ownership` 为森林层 **权威**；`kind=admin|community` 为 **迁移期兼容**，须与 `orgDomain` 一致（geo/community），新数据以 `orgDomain` 为准。

### 5.2 parentId 合法性矩阵

**按 orgDomain**

| 子 orgDomain | 合法 parent orgDomain | 备注 |
| --- | --- | --- |
| gov | country/sovereign, gov | 域根 `{sovereignId}-domain-gov` 的 parent 为 sovereign |
| geo | country/sovereign, geo | 域根 parent 为 sovereign；政区链 parent 为 geo 域根或上级政区 |
| corp | country/sovereign, corp | 见下表 **corp 细分** |
| community | country/sovereign, community, geo | 小区等可挂 geo 链；域根 parent 为 sovereign |

**corp 细分（消除歧义）**

| 节点 | 合法 parentId |
| --- | --- |
| `{sovereignId}-domain-corp`（`isDomainRoot`） | 视窗根 sovereign.id |
| 普通私立法人、公司 | `{sovereignId}-domain-corp` 或 corp 链上级法人 id |
| 普通私立法人 | **禁止** 直接 parent = sovereign.id 或 `admin-*` geo id |

**按 ownership（合法组织）**

| ownership | orgDomain | parentId 规则 |
| --- | --- | --- |
| `state` | gov | 视窗根 → … → **主管部门**（名称 AI 填）→ 该国立机构 |
| `private` | corp | 经济组织域根 或 corp 控股链上的上级法人 |

**禁止**：

- `corp` → `geo`（法人通过 location 关联地理，不用 parentId）  
- `geo` → `corp`  
- `state` 机构挂到 corp 域根（国立必须走 gov）  
- `private` 机构挂到 gov 部门下（私立必须走 corp；对国立机构的 **监管** 走 capabilities.political + Stage4，非 org 横向往来）  
- structure 根节点名 = faction.name（见 §5.3）

### 5.3 structure[] 规则（消除重复公司层）

对 `type=公司` 的 faction：

- `structure[]` **直接** 列部门/内设单位（技术部、董事会秘书处…）。  
- **禁止** structure 第一项 `name` 等于 faction.name（审计与 sanitize 剥离该层）。  
- 若 AI 返回「公司 → 公司 → 部门」，sanitize 合并为「部门」挂 faction。

### 5.4 虚拟域根节点（id 骨架 + 显示名可配置）

**id（骨架，不可改键）**

| id 模式 | orgDomain | isDomainRoot |
| --- | --- | --- |
| `{sovereignId}-domain-gov` | gov | true |
| `{sovereignId}-domain-geo` | geo | true |
| `{sovereignId}-domain-corp` | corp | true |
| `{sovereignId}-domain-community` | community | true |

**显示名（实例/本地化，AI 或配置填）**

| orgDomain 键 | 现实默认 label | 架空示例 label |
| --- | --- | --- |
| `gov` | 国家机构 | 帝国机关 / 教廷总署 |
| `geo` | 行政区划 | 领国版图 / 界域 |
| `corp` | 经济组织 | 商会联盟 / 魔导企业 |
| `community` | 社群 | 家族与结社 |

实现：`FOREST_DOMAIN_LABELS[orgDomain]` 或按 `worldTag` 覆盖；**id 与 orgDomain 键不变**。

`sovereignId` = 当前 `resolveViewportRoot()` 的 id。

L1 视窗根：四域根 + geo 下玩家相关区划链；corp 下玩家 **私立** 公司 stub（若已认知）；gov 下已认知的 **国立** stub（如「某国立高校（迷雾）」）或空；**未认知 org 零条**。

### 5.5 跨域引用（org↔地点；非 org↔org 往来）

| 机制 | 用途 |
| --- | --- |
| `location` | 组织主办公/活动地址文本 |
| `realWorldMap` / POI | 地图锚点 |
| `territory-control` | 行政控势，不表示法人隶属 |
| `jurisdictionGeoId` | **gov 机关 ↔ geo 政区对齐**：该 gov faction 所对应的 geo 节点 id（§3.8） |
| `territoryAnchors[]` | 组织与地图/政区锚点列表（可与 `jurisdictionGeoId` 并用） |
| `membership` | 角色在哪任职 |

**gov↔geo 并行规则（§3.8 操作化）**

1. geo 域创建 `{四川省}` 时，**不自动** 创建 gov 机关；gov stub 须 exposure≥1 后由 Stage4 / audit 写入。  
2. 创建 `{四川省人民政府}` 等 gov 机关时，须设 `jurisdictionGeoId = admin-{四川省}`（或对应 geo faction id）。  
3. 同级可有多 gov 机关（人民政府、市场监管局…）共享同一 `jurisdictionGeoId`，彼此为 gov 域 **兄弟** 节点（parent 均为 gov 链上级或省府为 parent）。  
4. **禁止** 用 parentId 把 gov 机关挂到 geo 街道节点下。

### 5.6 所属势力解析（`resolveAffiliatedFaction`）

**语义**：玩家可见的「所属势力」= **具体认你、管你的 faction**；**不是**域根、视窗根或 sovereign。

| 条件 | `resolveAffiliatedFaction` 返回值 | UI |
| --- | --- | --- |
| `foundingType === 'independent'` | `null` | 不显示所属势力；可选文案「独立组织 / 未挂靠」 |
| `parent.isDomainRoot === true` | `null` | 同上（数据挂靠域根，但不展示为所属） |
| `foundingType === 'subordinate'` 且 parent 为具体 faction | `parent` | 显示 `parent.name` |
| 事后收编：Stage4 reparent + `foundingType→subordinate` | 新 parent | 此前不显示，收编后显示 |

```javascript
function resolveAffiliatedFaction(faction, allFactions) {
  if (faction.foundingType === 'independent') return null
  const parent = allFactions.find(f => f.id === faction.parentId)
  if (!parent || parent.isDomainRoot || parent.orgDomain === 'country') return null
  if (faction.foundingType === 'subordinate') return parent
  // 迁移期：未写 foundingType 时，parent 非域根则视为有所属
  return parent.isDomainRoot ? null : parent
}
```

**收编**：Stage4 `org-status` 或专用 reparent 行 — `parentId` 从域根改为上级 faction id，`foundingType: 'subordinate'`，`legitimacy` 按正文更新。

---

## 6. UI / 交互设计

### 6.1 组织图模态（视窗根级）

**布局**：顶栏 `{视窗根.name} · 组织架构`（动态）；下方 **域 Tab**：

| 域 Tab | 内容 |
| --- | --- |
| 国家机构 | gov 树：行政机关/主管部门等（**名称 AI 填**）；国立机构 |
| 行政区划 | geo 树；展开至玩家 familiar 深度 |
| 经济组织 | corp 树：**私立** 公司/学校/民营机构；已认知 L1 为迷雾，未认知不显示 |
| 社群 | 家庭、小区等 |

默认 Tab：玩家主身份所在域（公司 → 经济组织；国立大学生 → 国家机构）或记忆上次选择。

**不采用**「N 家未揭示企业」聚合行：用户已确认——**知晓存在才显示**，每个 L1 stub 独立一行迷雾。

### 6.2 组织图（选中某公司）

- 面包屑：`{视窗根} / 经济组织 / … / 某科技公司`（控股链完整展示，过深折叠）  
- 主体：仅 **structure → roles** 树（faction 自身为标题，不重复为子节点）  
- 侧栏可选：location 地图跳转、已揭示的 political capability 监管方

### 6.3 节点样式（延续现有 CSS）

| kind | 说明 |
| --- | --- |
| `domain-root` | 域根，加 domain 色条 |
| `faction` | 实体势力 |
| `structure` | 内设部门 |
| `role` | 职位 |
| `fog` | 迷雾占位（虚线框 + 「迷雾」meta） |

### 6.4 所属势力展示（势力列表 / 详情卡）

与 §5.6 一致；**面包屑**仍走完整 `parentId` 链（含域根），**「所属势力」字段**单独解析：

| 场景 | 所属势力字段 | 面包屑示例 |
| --- | --- | --- |
| 玩家+支持者自立工作室 | **（空）** 或「独立组织」 | `{视窗根} / 经济组织 / 某某工作室` |
| 上级集团收编后 | **某某集团** | `{视窗根} / 经济组织 / 某某集团 / 工作室` |
| 国家机关设立 | **{主管部门}** | gov 链完整路径 |
| 被迫挂名时钟塔分舵 | **时钟塔** | corp/gov 链 |

**禁止**：自立 org（`foundingType=independent`）在所属势力栏显示「经济组织」「国家」等 **域根/视窗根** 名称冒充上级。

### 6.5 多 sovereign 与组织图视图

| 规则 | 说明 |
| --- | --- |
| 数据 | 每个 `sovereign: true` 节点拥有独立四域根 `{sovereignId}-domain-*` 及下属隶属树 |
| 默认视图 | `resolveViewportRoot()` 选定 **一个** 视窗根；组织图只渲染该 sovereign 下森林 |
| 切换 | 玩家接触外国/第二主权机关（L2+）后，可切换 viewport 至该 sovereign（UI 下拉或档案入口）；**非** org 横向往来 |
| 外国使馆 | 挂在 **所属国 sovereign** 的 gov 树；玩家 viewport 在本国时，未接触则不渲染 |

---

### 6.6 与旧 UI 差异

- 取消「从国一直缩进到街道再挂公司」的单列树。  
- `faction-org-actions.buildFactionOrgTree` 改为 `buildFactionOrgForest(viewportRoot)`，其中 `viewportRoot = resolveViewportRoot(factions)`。

---

## 7. 推演 / Audit / Bootstrap 规则变更

### 7.1 Bootstrap（新存档）

1. 创建 **sovereign** 视窗根（**stub 国名** 由玩家资料推断，可替换；`sovereign: true`）。  
2. 创建四个 `isDomainRoot` 节点，parentId = sovereign.id；显示名用默认 label 或 worldTag 配置。  
3. 按玩家地址在 **geo 域** 建政区链（政区 **名** 来自地址解析，非写死）。  
4. 若玩家资料含 **私立** 公司：corp 域 stub，`ownership: private`，parentId = `{sovereignId}-domain-corp`；`foundingType: 'independent'`（资料未指明控股上级时）；若资料含明确雇主/集团，则 `parentId` 指该法人且 `foundingType: 'subordinate'`。  
5. 若玩家资料含 **国立** 学校等：gov 域 stub（主管部门未揭示则挂 gov 域根或 L1 迷雾），`ownership: state`；`foundingType: 'independent'` 直至主管部门 L2+ 揭示并 reparent。  
6. **不得** 将私立 org parentId 设为街道/区 id；**不得** 为未认知 org 预生成节点；**不得** 在 bootstrap 写入完整 gov 机关树。

### 7.2 faction-audit.md 增补（要点）

- 合法组织必须带 `orgDomain` + `ownership`；国立 → gov 链，私立 → corp 链。  
- **禁止写死名**：不得照抄 prompt 示例专名；名称须来自 archive / 玩家资料 / 上下文。  
- 公司/民营校 `parentId` → corp 域根或上级控股（corp→corp **不限层**）。  
- 国立校/公立机构 → gov 主管部门（须已 L2+ 或迷雾 stub）。  
- 行政区 `parentId` → 仅 geo 链。  
- **未在 archive/玩家资料出现的 org → 不输出**（不是迷雾，是 absent）。  
- **已认知 L1**：输出 stub + `fogLabel`，`structure` 为空。  
- structure 不得含与 faction 同名的根节点；**允许** structure 为空或仅 1 项（极简组织）。  
- 国家机构：无 archive 不得输出完整中央机关树。  
- **合理性**：禁止无世界观依据的秘密部门；允许 lore 支撑下的推断，但须 fieldReasons 引用 archive，且仍等 Stage4 固化。
- **成立路径**（§3.13）：无 Stage2 成立行为/上级承认 → 不新建 faction；路径 B 须 `foundingType=independent`，**勿**在 `parentName` 写具体上级势力名（域根除外）。
- **所属势力**：`foundingType=independent` 时 fieldReasons 注明「独立成立，无所属势力」；仅 `subordinate` 或收编后写上级 `parentName`。

### 7.3 Stage4 结算

| updateType | 森林相关行为 |
| --- | --- |
| faction-overview | 新建 org 须带 `orgDomain` + `ownership` + `foundingType`；须满足认知/合理性门控（§7.5–§7.6）；路径 B 默认 `independent` + 域根 `parentId` |
| faction-structure | 只写 **该 faction** 的 structure，不新建 geo 子 faction |
| org-capability-entry | 监管等事实写入 political entries（策略轴） |
| org-status | **视窗根升格**；**收编/授权**：`parentId` reparent、`foundingType→subordinate`（§3.13、§5.6） |
| membership | 任职不改变 parentId 域；路径 B 成立时至少一条 **非玩家** membership 或等价确认 |

#### 7.3.1 编制升格为独立法人（spin-off）

| 步骤 | 规则 |
| --- | --- |
| 触发 | Stage4 `faction-overview` 新建独立 corp/gov faction + 正文依据 |
| 原组织 | 从 `structure[]` **删除** 已升格节点，或标记 `mergedInto: {新 faction id}` |
| 新法人 | 带完整 `orgDomain` + `ownership` + 合法 `parentId`；制度从原 `rules[]` 拆分或继承；`foundingType` 默认 **`subordinate`**（继承原上级法人/机关） |
| 禁止 | 同一法人同时在 structure 与 faction 双份存在 |

### 7.4 存档迁移（load-time）

`migrateFactionForest()`：

1. 若 `ownership=private` 或 `type=公司` 的 parentId 匹配 `admin-*` → 改挂 `{sovereignId}-domain-corp`。  
2. 若普通 corp 的 parentId = sovereign.id（非域根）→ 改挂 `{sovereignId}-domain-corp`。  
3. 若 `ownership=state` 且错挂 corp/geo → 改挂 gov 链或标记待人工 reconciliation。  
4. 若 sovereign 下无域根 → 补建四域根并重挂子节点。  
5. 剥离 structure 同名根；删除 **零 exposure** 且非 bootstrap 必需的「预造」org。  
6. **补全 `foundingType`**：若 `parentId` 指向 **非域根** 具体 faction → `subordinate`；若仅挂 `{sovereignId}-domain-*` 域根 → `independent`；已有值不覆盖。  
7. 写入 `alert-log`。

#### 7.4.1 视窗根升格迁移（联邦成立）

| 步骤 | 规则 |
| --- | --- |
| 1 | Stage4 `org-status` 创建新联邦 faction：`sovereign: true`，`orgDomain: country` |
| 2 | 为新联邦 id 创建四套域根 `{federationId}-domain-*` |
| 3 | 原成员国 sovereign：`parentId` 改为联邦 id；**保留** 原 `{countryId}-domain-*` id **不删**（历史引用） |
| 4 | 新组织默认挂 **联邦** 域根；旧 id 仅只读/迁移引用，新写入用联邦前缀 |
| 5 | `resolveViewportRoot()` 返回联邦；UI 标题切换为联邦名 |

#### 7.5 合理性门控 `canIntroduceOrg`（FR-20）

| 输入 | 输出 |
| --- | --- |
| `{ type, name, orgDomain, ownership, archive, worldLore, exposureHint }` | `{ allowed: boolean, reason: string, maxResolution: 'L1'\|'L2' }` |

| 条件 | 结果 |
| --- | --- |
| 无 archive/正文/资料锚点 | `allowed: false` — 未认知，不得新建 |
| 有「听说过」锚点，无细节 | `allowed: true, maxResolution: L1` — 仅 stub |
| 有 archive 明确点名 | `allowed: true` — 可 L2+（仍须 Stage4） |
| 超自然/秘密机关且无 worldLore | `allowed: false` |
| worldLore 支撑长期存在，无正文点名 | `allowed: true, maxResolution: L1` + reason 须引用 lore 推断链 |

#### 7.6 组织成立门槛（FR-22 · 与 `canIntroduceOrg` 串联）

调用顺序建议：`canIntroduceOrg` → 路径判定 → Stage4 写入 → 设 `foundingType` / `legitimacy`。

| 步骤 | 检查 |
| --- | --- |
| 1 | 有 archive/正文 **成立行为** 或 **上级承认** 锚点？无 → 拒绝 |
| 2 | 路径 A：Stage4 含授权/收编/登记 + `parentId`=具体上级 + `foundingType=subordinate` |
| 3 | 路径 B：Stage4 含成立行为 + **≥1 非玩家确认方** + `parentId`=域根 + `foundingType=independent` + 常 `legitimacy=unrecognized` |
| 4 | 仅口头/meta → Stage2 可当玩笑；**不写库** |
| 5 | 架构节点 solid：须逐级 Stage2 事实 + Stage4；见 §3.13.3 |

---

## 8. 模块与接口（实现概要）

### 8.1 文件 touch 列表

| 文件 | 变更 |
| --- | --- |
| `publish/faction-org-actions.js` | `buildFactionOrgForest`, `resolveAffiliatedFaction`, 域过滤, structure sanitize |
| `publish/org-territory-system.js` | parentId 合法性, migrateFactionForest |
| `publish/faction-actions.js` / bootstrap | 域根创建, 公司挂 corp |
| `publish/index.html` | 组织图模态：Tab + 多树 |
| `publish/styles/faction-system.css` | domain-root, fog 样式 |
| `publish/prompts/faction-audit.md` | 域规则 |
| `docs/schemas/org-territory-system-design.md` | 交叉引用 § 森林 |

### 8.2 核心 API（草案）

```javascript
// 当前世界观最高主权体（国家 → 联邦 …）
resolveViewportRoot(factions)

// 返回 { viewportRoot, domains: [{ domain, label, tree }] }
buildFactionOrgForest(viewportRoot)

// 仅渲染 exposure≥1 的节点；L1 → fog 样式
filterForestByExposure(domains, archive)

// 合法化 parentId + ownership
sanitizeFactionParentDomain(faction, allFactions)

// 迁移旧存档
migrateFactionForest(factions[])

// 合理性：能否新建该 org（含超自然/秘密机关门控）
canIntroduceOrg({ type, name, orgDomain, ownership, archive, worldLore, exposureHint })

// UI「所属势力」；域根 parent 返回 null（§5.6）
resolveAffiliatedFaction(faction, allFactions)
```

### 8.3 排序

域内仍用现有 `sortFactionHierarchy`（按 level rank）；geo 域省按名称或标准区划码；corp 域玩家公司优先置顶。

---

## 9. 验收标准

| # | 场景 | 期望 |
| --- | --- | --- |
| AC-1 | 打开视窗根组织图 | 见 ≥4 个域根，无「街道 → 公司」连线 |
| AC-2 | 四川省 + 广东省均已 L2 | 同在 geo 域下为兄弟 |
| AC-3 | 打开玩家私立公司 | 无连续两层相同公司名；面包屑在 corp 域 |
| AC-4 | 国立机构 L1 | 在 gov 主管部门链下显示迷雾，不在 corp 域 |
| AC-5 | 从未提及的组织 | 组织图 **零节点** |
| AC-6 | 控股 5 层子公司 | 数据保留，UI 可折叠，无 depth 截断 |
| AC-7 | 推演成立联邦 | 视窗根标题与域根前缀切换为联邦 id |
| AC-8 | 无 archive 提秘密机关 | Stage4 拒绝；有 lore 时可推断但仍需结算行 |
| AC-9 | audit 新建 gov 机关 | 名称来自上下文，非 prompt 模板抄录 |
| AC-10 | 更换 worldTag 域根 label | orgDomain 键与 parentId 规则不变 |
| AC-11 | 极简 org（1 个 structure） | schema 校验通过，组织图可展示 |
| AC-12 | gov 机关创建 | 带 `jurisdictionGeoId` 指向对应 geo 节点 |
| AC-13 | 联邦升格 | 新联邦域根生效；成员国 parent 指向联邦；旧 country 域根 id 保留 |
| AC-14 | 玩家+1 支持者签约成立工作室 | org 存在；`foundingType=independent`；所属势力 **空**；`parentId`=域根 |
| AC-15 | 同上，后 Stage4 收编进集团 | `foundingType=subordinate`；`parentId`=集团；所属势力 **显示集团名** |
| AC-16 | 读势力介绍/档案后 Stage4 补 structure | 节点来自 archive 引用；无 Stage4 行则 structure 仍空 |

---

## 10. 分期实施

| 阶段 | 范围 | 产出 | 状态 |
| --- | --- | --- | --- |
| **P0-a** | 数据：域根 + migrate + sanitize parentId + ownership | 存档加载后公司脱离街道 | ✅ 已实现 |
| **P0-b** | UI：森林 Tab + corp/geo 分树 | 组织图不再单链 | 待做 |
| **P0-c** | structure 去重 + audit/bootstrap 规则 | 无同名双层公司 | 部分（migrate strip） |
| **P0-d** | audit/prompt：骨架约束 + 禁止写死名 | §3.10 / §7.2 落地 | 待做 |
| **P1** | gov 域机关树 + 国立分流 + `canIntroduceOrg` + 成立门槛/所属势力 UI | 办证/监管/学校双轨 | 待做 |
| **P2** | 跨域虚线（监管关系图） | 可选增强 | 待做 |
| **P3** | 异世界 org registry（同 schema，worldTag 隔离） | §14 规格 | 规格 only |

---

## 11. 已确认决策（2026-07-05）

| # | 问题 | 决策 |
| --- | --- | --- |
| 1 | 学校 / 合法组织归属 | **国立 vs 私立** 二分：`ownership=state` → gov 域（`{主管部门}` 链）；`ownership=private` → corp 域。适用于学校、医院等一切合法组织，不单设 education Tab。 |
| 2 | 集团控股层数 | **不限**；corp→corp 任意深度，由推演与世界内逻辑自然约束，代码只折叠 UI。 |
| 3 | 迷雾语义 | **知晓存在、不知细节** → 显示迷雾节点；**不知存在** → 不显示。新建须合理上下文；禁止日常凭空出现异能局等，除非世界观已支撑且经 Stage4。 |
| 4 | 视窗根 | **动态**；开局参照现实（国家为根），推演可升格（联邦等）。`resolveViewportRoot()` 取最高 sovereign，非写死国家级。 |
| 5 | 骨架 vs 实例 | **骨架固定**（域键、合法性、节点类型）；**名字 AI 填**（机关名、职位、rules 正文）；bootstrap 仅为可替换 stub（§3.10）。 |
| 6 | 任何组织 | 不增第六域；封建/双头/国际机构/极简实体用 §3.11 组合表达。 |
| 7 | 组织仅上下隶属 | 组织与组织之间的 **关系往来** 不在本设计范围（§3.12）。 |
| 8 | 一国两制 | **同一上级** 下 `rules[]` 不同即可；不双 viewport、不特殊域（§3.12.3）。 |
| 9 | 组织成立 | **玩家意图 alone 不成立**；须 Stage2 事实 + Stage4。路径 A 上级承认 / 路径 B 成立行为+≥1 非玩家确认（§3.13、§7.6）。 |
| 10 | 所属势力 UI | **自立**（`foundingType=independent`）**不显示**所属势力；**收编/承认**后才显示具体上级（§5.6、§6.4）。 |

---

## 12. 已确认原则（2026-07-05 · 用户八条）

| # | 原则 | 设计落点 |
| --- | --- | --- |
| 1 | 经营/管理是策略，不是层级 | §3.7：`rules[]`（静）+ capabilities/Stage4（动） |
| 2 | 每级行政区有并行 gov 机关与职位 | §3.8：geo ∥ gov，`territory-control` 链接 |
| 3 | 分公司/子公司都是下级组织，差在制度 | §3.7：`orgForm` + `rules[]`，同一 corp 域 |
| 4 | NGO/宗教/行业协会仍国立/私立二分 | §3.9：无第三轨，制度描述形式 |
| 5 | 外资/使馆归属母国；国际组织 | 隶属链内表达；**组织间横向往来不在设计范围**（§3.12） |
| 6 | 个体户/零工是「人+职业」，不是 org 节点 | §3.9：`membership` + 角色卡 |
| 7 | 司法/军事垂直，通常国立 | §3.9：gov 垂直 parent，不走 geo |
| 8 | 混合所有制看直接管理者 | §3.9：ownership 二分 + `rules[]` 分红条款 |

**与 v1.1 评审的差异**：不再建议单独 `orgSubtype: soe` 第三轨；央企/国企 = `ownership: state` + gov 链（如国资委）+ 制度/策略分层。P1 优先补 **gov 域机关树** 与 **geo 并行**，而非新域。

---

## 14. 异世界组织（规格，P3）

现实线已实现 `migrateFactionForest`；异世界 **当前** 在代码中跳过 org/控势结算（`filterUpdatesForStoryWorld`）。若接入：

| 项 | 规则 |
| --- | --- |
| schema | **与现实相同**（§5）；`orgDomain` 键不变 |
| 隔离 | `fictionOrgRegistry[worldTag]` 或等价分表；**禁止**与现实 `factions[]` 交叉 |
| 域根 label | 按作品 lore 配置（§5.4 架空列） |
| 视窗根 | 可为帝国、教会普世权、圣杯监督层等；仍用 `sovereign` + `resolveViewportRoot` |
| 名称 | 全部由设定库 / 推演填充；**禁止**从现实 bootstrap 抄国名 |
| 地理 | 作品内地图/地点树 = geo；虚数海等 **不是 org** |

---

## 15. 附录：与截图问题的对应

| 截图现象 | 根因 | 森林方案 |
| --- | --- | --- |
| 公司在玉林街道下 | corp parentId 错挂 geo | corp 域独立，location 保留成都地址 |
| 公司名上下级重复 | faction + structure 同名 | structure 不含公司根 |
| 单链无法加广东省 | 单树深度语义混乱 | geo 域兄弟省 |
| 职责：迷雾 | L1 已认知但未揭示 | 升 L2 后填 duty；未认知则不出现节点 |

---

*文档 v1.3.3（定稿）。§4.0 PR↔FR；§3.13 成立/canon；§5.6/§6.4 所属势力；§7.1/§7.4 foundingType；FR-22/23；AC-14～16。*
