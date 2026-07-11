# Module README Templates（2026-07-11）

本文档用于给后续模块目录补统一 README 模板，目标不是制造形式化负担，而是确保：

- 后续 AI 新建或扩展模块目录时，有一致的职责说明方式
- `ui / domain / app` 三层的边界不会因为会话不同而漂移
- 新人或新会话进入某个目录时，能快速知道“这里放什么、不放什么、当前到了哪一阶段”

## 1. 什么时候应该补模块 README

满足以下任一条件时，建议在对应目录保留 README：

- 新建了 `publish/ui/<module>/`
- 新建了 `publish/domain/<module>/`
- 新建了 `publish/app/<module>/`
- 某个目录已经开始成为后续会话反复扩展的稳定落点
- 某个模块已经存在“当前不该继续深拆”的边界，需要在目录内直接提示

## 2. UI 层 README 模板

适用目录：

- `publish/ui/<module>/`

建议模板：

```md
# <Module> UI Helpers

该目录用于承载 <module> 模块中的只读展示 helper。

当前已覆盖：

- <展示列表 1>
- <展示列表 2>
- <展示列表 3>

当前不放：

- 状态写回
- 高副作用主链
- 平台能力
- 持久化流程
- 不可控异步装配

当前阶段判断：

- <module> 当前更适合停留在 <当前层级判断>
- 后续若没有出现更清晰的规则聚合点或流程切面，不建议为了层数统一而继续深拆
```

UI 层 README 必须明确：

- 这里是不是只读展示层
- 当前已承接了哪些展示切面
- 哪些高风险职责不能放进来
- 当前模块是在“起步 / 稳定扩展 / 暂停深拆”哪一阶段

## 3. Domain 层 README 模板

适用目录：

- `publish/domain/<module>/`

建议模板：

```md
# <Module> Domain Helpers

该目录用于承载 <module> 模块中与 DOM、宿主平台、流程副作用无关的只读规则 helper 或轻量状态访问入口。

当前已覆盖：

- <规则 helper 1>
- <状态入口 1>
- <标准化 helper 1>

当前不放：

- 页面展示拼装
- 动作编排
- 消息发送/接收
- 持久化写回
- 平台能力

当前阶段判断：

- 当前 `domain/<module>` 属于 <轻量 domain / 稳定 domain / 暂停扩展>
- 若没有新的天然规则聚合点，不建议为了目录对称性继续强行扩层
```

Domain 层 README 必须明确：

- 这里放的是规则，还是只读状态入口，还是两者都有
- 哪些内容仍应留在 system / actions / app 层
- 当前 domain 是否只是轻量起步，而不是完整领域层

## 4. App 层 README 模板

适用目录：

- `publish/app/<module>/`

建议模板：

```md
# <Module> App Flow

该目录用于承载 <module> 模块的流程装配逻辑。

当前约束：

- 放顺序控制
- 放模块接线
- 放流程 orchestration
- 不放只读展示 helper
- 不放纯规则标准化 helper
- 不重写 ui / domain 已经承担的职责

当前阶段判断：

- 当前 `app/<module>` 用于承接 <具体流程类型>
- 若某段逻辑不包含流程装配意义，而只是展示或规则，应回到 `ui` 或 `domain`
```

App 层 README 必须明确：

- 这里是流程层，不是“什么都能塞”的层
- 这里只负责 orchestration，不负责重复实现 UI / domain
- 当前 app 层到底在承接哪类流程

## 5. 建议附加字段

如果模块已经进入稳定扩展阶段，README 建议额外补充：

- 当前参考文档：
  - 对应 `docs/architecture/...boundary...`
  - 对应 `docs/plans/...`
- 当前停手边界：
  - 明确哪些函数或链路当前不要碰
- 当前样板类型：
  - 模块内 UI 收口样板
  - 跨读链规则复用样板
  - 已有规则中心下的渐进 UI 收口样板

## 6. 后续 AI 会话的使用方式

后续 AI 会话进入某个模块目录时，默认顺序应为：

1. 先看该目录 README
2. 再看对应边界文档
3. 再看最近一次相关 plan / validation 文档
4. 最后再决定代码从哪一刀下手

也就是说，目录 README 不是替代 architecture 文档，而是：

- 目录入口提示
- 快速边界说明
- 帮助后续会话少走错层

## 7. 推荐联动文档

- `README.md`
- `docs/architecture/encoding-collaboration-rules.md`
- `docs/architecture/ai-development-workflow.md`
- `docs/architecture/three-sample-playbook-2026-07-11.md`
- `docs/plans/_template.md`
