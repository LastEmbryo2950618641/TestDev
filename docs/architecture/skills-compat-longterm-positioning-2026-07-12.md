# Skills Compat Longterm Positioning (2026-07-12)

## 目的

在 `skills` 已经具备桥接收口、模板迁移准备样板、gate 预审与模板外调用面审计的基础上，进一步回答：

- `skills` 当前这些 compat 入口，长期来看更应该继续压缩，还是有一部分会沉淀为稳定 facade

这份文档的目的不是立即给出最终删除决定，而是明确当前阶段最合理的长期定位方向。

## 当前候选入口

当前与 `skills` 长期定位密切相关的入口包括：

- `skillCategories()`
- `skillsList()`
- `selectedSkill()`
- `openSkillDetail(id)`
- `closeSkillDetail()`
- `skillsState.detailOpen`
- `skillsState.selectedSkillId`

## 当前观察到的三个事实

### 1. 只读查询面已经是典型薄桥接

`publish/game.js` 上：

- `skillCategories()`
- `skillsList()`
- `selectedSkill()`

已经只是转发到 `gm.skillsActions` 的薄桥接。

这说明：

- 它们已经不再是厚逻辑残留
- 结构上已经具备继续压缩 compat 的条件基础

### 2. 动作面与状态面仍直接暴露给模板

当前模板仍直接依赖：

- `openSkillDetail(id)`
- `closeSkillDetail()`
- `skillsState.detailOpen`
- `skillsState.selectedSkillId`（通过 `selectedSkill()` 间接起作用）

这说明：

- `skills` 还没有像 `calendar` 那样收敛到成熟的对象化 view contract
- 当前它更像“可继续迁移、可继续压缩”的过渡型模块

### 3. 模板外公开能力面相对轻

当前已确认的模板外公开能力主要集中在：

- `publish/skills-definitions-core.js` 对 `skillsList()` / `skillCategories()` 的说明层暴露

但未见更重的跨业务模块运行时依赖链。

这说明：

- `skills` 的长期演化阻力小于 `calendar`
- 若要继续压缩 compat，收益相对更可能高于成本

## 两种长期定位路线

### 路线 A：将 skills 认定为稳定 facade 模块

若采用这一路线，则：

1. `skillCategories()` / `skillsList()` / `selectedSkill()` 继续保留在 `$store.game`
2. `openSkillDetail()` / `closeSkillDetail()` 继续作为模板动作公开面
3. `skillsState.detailOpen` 等状态继续允许模板直接读

优点：

- 改动最小
- 现有模板与镜像几乎无需迁移
- 风险低

缺点：

- `skills` 公开面仍显得偏旧式、偏直接
- 无法体现这类轻量模块进一步压缩 compat 的结构价值

### 路线 B：将 skills 认定为“继续压缩 compat 的优先候选模块”

若采用这一路线，则：

1. 继续把只读查询面与动作面拆开看
2. 优先推动只读查询面迁移准备
3. 再评估动作面与状态面是否也能逐步收敛
4. 最终只保留真正必要的稳定公开面

优点：

- 更符合 `skills` 当前仍有明显过渡特征的现实
- 更有机会成为首批“局部 compat 删除评估”的轻量试点
- 与 `calendar` 形成清晰分工：
  - `calendar` 保留为稳定 facade 样板
  - `skills` 用于验证“轻量模块如何真正继续压缩 compat”

缺点：

- 需要更细地处理模板动作面与状态面
- 需要补齐最小验证方案后，才能安全进入下一阶段

## 当前阶段最合理的判断

基于当前证据，`skills` 更接近路线 B，而不是路线 A。

原因：

1. 它的只读面已经足够薄
2. 模板外运行时耦合较轻
3. 动作面与状态面仍明显带有过渡特征
4. 若不继续推进压缩，它会长期停留在“可以更清晰但尚未清晰”的中间态

也就是说：

- `skills` 不像 `calendar` 那样更适合认定为成熟稳定 facade
- 它更适合作为“首批继续压缩 compat 的真实候选模块”

## 当前推荐结论

当前最推荐的长期定位是：

1. 把 `skills` 视为“继续压缩 compat 的轻量优先模块”
2. 不急着整组删除
3. 但应优先围绕它继续补：
   - 动作面与只读面拆分策略
   - 最小验证方案
   - 局部 compat 删除评估条件

## 对整体排序的影响

这会进一步强化当前的排序修正：

- `skills` 作为首批真实 compat 删除候选评估第一名是合理的
- `calendar` 更适合作为稳定 facade 样板保留
- `prompt` 仍作为第二优先的轻交互样板候选

## 当前阶段结论

在当前证据下，`skills` 的最佳长期定位更像：

- 继续压缩 compat 的轻量优先模块

而不是：

- 已经成熟到应直接认定为长期稳定 facade 的模块

这意味着：

- 后续若要开始真正挑一个轻量模块进入局部 compat 删除评估，优先看 `skills` 是对的
- `skills` 当前最需要的，不再是更多总览文档，而是更具体的删除前评估与验证设计