# Skills Compat Gate Deepening Checklist (2026-07-12)

## 目的

基于当前已完成的 `skills` 模块 bridge inventory、模板迁移准备、gate 预审、模板外调用审计与长期定位判断，整理出一份“继续推进到真实 compat 删除 gate 评估前，还差哪些证据”的深化清单。

这份清单不是删除计划，而是删除前的证据补齐清单。

## 当前已具备的证据

`skills` 当前已经具备的事实基础包括：

1. 只读查询面已在 `publish/game.js` 中收口为薄桥接：
   - `skillCategories()`
   - `skillsList()`
   - `selectedSkill()`
2. Web / Android 镜像模板消费区块集中且结构一致
3. 动作层公开面边界相对清楚，主要围绕：
   - `openSkillsApp()`
   - `closeSkillsApp()`
   - `openSkillDetail(id)`
   - `closeSkillDetail()`
4. 模板外公开能力主要体现在 `publish/skills-definitions-core.js`
5. 与 `calendar` 相比，`skills` 更适合作为继续压缩 compat 的轻量优先模块

## 当前仍缺的关键证据

### 1. 模板公开面最终定位结论

需要补齐的问题：

- `skills` 最终是保留 `$store.game.skills...` 作为长期稳定 facade
- 还是迁移到新的模块公开面后，再逐步缩小 `game.js` contract
- 只读查询面与轻交互动作面是否采用同一套长期公开策略

缺少这层结论时，无法判断后续工作是在“收紧实现”还是“真实准备删除公开入口”。

### 2. 新的模块模板公开 contract 草案

如果未来不想长期保留现有 `$store.game.skills...` 公开面，还需要先补出：

- Skills 模块对模板的稳定只读公开结构是什么
- Skills 模块对模板的稳定动作入口是什么
- 模板是否还允许直接读取 `skillsState.detailOpen`、`skillsState.selectedSkillId` 等细粒度状态

没有新的 contract 草案，就无法进行 Web / Android 同步迁移评估。

### 3. 动作层与只读层拆分后的状态边界说明

当前仍需要进一步说明：

- `selectedSkill()` 是否只是只读派生 view helper
- `openSkillDetail(id)` / `closeSkillDetail()` 是否应继续直连 `skillsState`
- Skills APP 开关状态与详情弹层状态是否应该拆成更稳定的 view contract

这部分如果不先定义清楚，后续删除 compat 时容易把“模板动作”和“状态组织”两层问题搅在一起。

### 4. 模板外消费是否仅剩说明层

当前审计结论是：

- `skills` 的模板外公开能力主要集中在 `publish/skills-definitions-core.js`

但继续推进前仍应再确认：

- 是否还有运行时脚本直接调用 `openSkillDetail`、`selectedSkill` 或相关 state
- 是否还有后续补充文件、生成链或文案链间接依赖当前入口命名

如果模板外还有隐藏调用面，过早推进 compat 删除会扩大回归面。

### 5. Web / Android 双端同步迁移成本确认

虽然当前模板区块结构一致，但仍缺少更明确的证据：

- 两端模板是否存在局部字段读取差异
- 两端是否都直接依赖 `skillsState.detailOpen` 等原始状态字段
- 若改成新的 view contract，双端是否能一次性同步修改

这一点不确认，后续就无法把 `skills` 视为真正低摩擦的首批候选对象。

### 6. fallback 可以撤除到什么程度的边界说明

当前 `publish/game.js` 上的桥接仍带 fallback 兜底。

还需要补齐：

- 哪些 fallback 只是短期过渡保护
- 哪些 fallback 实际承担初始化安全职责
- 在没有真实删除前，哪些 fallback 不应先动

只有先把 fallback 职责分清，后续才知道应该“删入口”还是“先删兜底”。

### 7. 最小验证方案落地后的执行证据

当前即使已经具备验证方案，也还缺少真正进入 gate 前必须准备的执行证据，例如：

- Web 手工验证记录
- Android 镜像验证记录
- 说明层一致性核对结果
- 初始化边界与空值状态验证结果

也就是说，验证方案只是门槛定义，不等于 gate 证据已经齐全。

## 推荐的下一步补证顺序

### 1. 先固定 `skills` 的长期公开面策略

先回答：

- 保留长期稳定 facade
- 还是进入模板公开面迁移路线

这是后续所有动作的前置条件。

### 2. 补一份新的 Skills 模板 contract 草案

若决定迁移，就先定义：

- 只读展示面
- 详情展示面
- 轻交互动作面
- 模板允许直接读取的状态边界

### 3. 对 Web / Android 模板做一次更细粒度字段消费核对

重点核对：

- 详情弹层显隐条件
- 选中项字段读取
- 列表空状态与过滤行为

### 4. 补一轮 fallback 职责划分说明

至少要确认：

- 可以先收掉的兜底
- 不能先动的兜底
- 与初始化安全强相关的兜底

### 5. 最后才考虑进入局部 compat 删除试点评估

在上面几类证据没补齐前，不建议直接开始删除 `publish/game.js` 上的 `skills` 入口。

## 当前阶段结论

`skills` 已经从“适合继续准备的迁移样板”进一步推进到了“最适合成为首批真实 compat 删除候选评估对象”的位置，但它距离真正进入删除 gate 仍然差一层关键证据补齐。

更准确地说：

1. 候选排序已经成立
2. 最小验证方案已经可以定义
3. 但长期公开面策略、新 contract 草案、fallback 职责边界与双端细粒度消费核对，仍是进入真实 gate 前必须补齐的条件

因此当前最稳的推进方式，仍然是“先补证据，再做删除评估”，而不是直接动 `skills` compat 入口。
