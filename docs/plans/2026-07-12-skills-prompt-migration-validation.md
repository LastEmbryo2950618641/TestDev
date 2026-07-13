# Skills Prompt Migration Validation (2026-07-12)

## 目的

记录当前 `skills` 与 `prompt` 两个轻交互模块，作为第一批模板 contract 收紧试点时，已经完成到哪一步、还剩哪些尾项。

这份文档不是功能完成声明，而是迁移样板验证记录。

## 一、skills 当前验证状态

### 已完成

1. 模块内新增只读 view helper：
   - `skillsPanelView()`
   - `selectedSkillDetailView()`
2. `publish/game.js` 已新增对应 compat 薄桥接
3. Web 模板已迁移读取面：
   - APP 显隐
   - 分类列表
   - 列表空态
   - 列表项
   - 详情弹层显隐
   - 详情字段展示
4. Android 镜像模板已做同样读取面迁移
5. 模板输入写入已收口到动作层：
   - `setSkillsQuery(value)`
   - `selectSkillCategory(value)`

### 当前结论

`skills` 已基本具备“第一份完整试点样板”的形态。

更具体地说：

- 模板不再直接读写 `skillsState.query` / `skillsState.category`
- 模板主要通过 view helper 读取展示数据
- 模板通过显式动作触发筛选与详情交互
- 异步定义加载链仍保持原有行为

### 剩余尾项

1. 是否继续把详情动作也进一步抽象成更统一的 app view contract
2. 是否补一轮最小人工验证记录
3. 是否在后续 compat 删除评估中正式把它作为首批试点模块

## 二、prompt 当前验证状态

### 已完成

1. 模块内新增只读 view helper：
   - `promptPanelView()`
   - `promptDetailView()`
2. `publish/game.js` 已新增对应 compat 薄桥接
3. Web 模板已迁移读取面：
   - APP 显隐
   - 分类文案
   - 分类列表
   - 列表空态
   - 列表错误
   - 列表项
   - 详情弹层显隐
   - 详情标题
   - 详情正文/加载/错误展示
4. Android 镜像模板已做同样读取面迁移
5. 查询输入写入已收口到动作层：
   - `setPromptQuery(value)`
6. 分类切换仍继续使用原有动作：
   - `selectPromptCategory(category)`

### 当前结论

`prompt` 已经完成与 `skills` 同一路径的主要读取/写入收口，且保留了原有异步详情加载逻辑。

更具体地说：

- 模板已不再直接写 `promptState.query`
- 异步详情正文加载仍由 `togglePromptDetail(id)` 驱动
- 详情视图展示已经迁到 `promptDetailView()`
- 这使 `prompt` 成为第二份可复用的轻交互迁移样板

### 剩余尾项

1. 是否还需要进一步收口 `selectPromptCategory` 周边的菜单状态展示 contract
2. 是否补一轮针对运行时 prompt 条目与 draw 条目的最小验证记录
3. 是否在后续继续统一 prompt APP 的显示 contract 命名

## 三、样板层面的阶段结论

当前至少已经有两块模块，验证了同一条低风险迁移路径可复用：

1. 先审计模板真实消费面
2. 再在模块内补 view helper
3. 再在 `publish/game.js` 增加 compat 薄桥接
4. 再迁 Web / Android 的只读读取面
5. 最后再逐步收口输入写入动作

这说明当前重构策略不是只适用于单一模块，而是已经具备模块级复用性。

## 四、对总目标的意义

这两份样板带来的直接价值包括：

1. 证明“低耦合 + 玩法不变”的渐进式迁移可行
2. 证明 Web / Android 双端可以同步迁移同一套模板 contract
3. 为后续继续推进其他轻交互模块提供可复制路径
4. 让 `publish/game.js` 更明确地向“薄 compat facade”收口

## 当前阶段结论

当前还远不能声称总目标完成，但 `skills` 与 `prompt` 已经足以构成第一批真实迁移样板。

后续更稳的推进顺序应是：

1. 先补最小验证记录或手工验证结论
2. 再选择下一个轻交互模块复用同一路径
3. 最后才进入局部 compat 删除评估与旧代码清理讨论

## 五、当前最小手工验证建议

### skills 最小验证建议

建议至少手工确认以下行为：

1. 打开 Skills APP 后主面板正常显示
2. 输入查询词后，列表过滤结果即时变化
3. 切换分类后，列表与空态提示同步变化
4. 点击技能项后，详情弹层正常打开
5. 关闭详情后，再打开另一项内容仍正确
6. Web 与 Android 镜像端行为一致

### prompt 最小验证建议

建议至少手工确认以下行为：

1. 打开 Prompt APP 后主面板正常显示
2. 输入查询词后，prompt 列表过滤结果即时变化
3. 切换分类后，分类文案与列表结果同步变化
4. 点击普通 prompt 条目后，详情正文正常显示
5. 点击 draw prompt 条目后，替换后正文正常显示
6. 点击 runtime prompt 条目后，运行时正文正常显示
7. 详情加载中与错误态显示仍正常
8. Web 与 Android 镜像端行为一致

## 六、当前未证实边界

虽然当前结构迁移已经落地，但以下事项仍属于“尚未通过执行证据确认”的边界：

1. 尚未附上真正的手工执行记录或截图证据
2. 尚未附上 Web / Android 镜像逐项对照验证结果
3. 尚未对 runtime prompt 与 draw prompt 两种特殊详情来源做完整回归证明
4. 尚未证明可以安全开始删除旧 compat 入口

因此当前结论仍应保持为：

- 样板迁移路径已经成立
- 样板代码已经落地
- 但 compat 删除评估仍需更多执行证据支持

## 七、第三个候选模块建议

基于当前模板消费面与动作复杂度，下一批最适合复用同一路径的轻交互候选，优先建议如下：

1. `knownProfession`
2. `tokenStats`

### 为什么 `knownProfession` 更适合作为第三候选

1. 模板结构与 `skills` 高度相似：
   - 查询输入
   - 列表展示
   - 详情弹层
2. 动作链较短：
   - `openKnownProfessionDetail(job)`
   - `closeKnownProfessionDetail()`
3. Web / Android 镜像消费区块集中
4. 比 `tokenStats` 少一层运行时记录来源复杂度

### 为什么 `tokenStats` 暂时排在 `knownProfession` 后面

1. 其展示列表与详情更容易牵动运行时 token 记录链
2. 记录来源横跨多个 AI 请求动作模块
3. 虽然 UI 不算重，但模板迁移的回归面更广

## 八、下一步最稳建议

当前更稳的推进顺序建议为：

1. 先补 `skills` 与 `prompt` 的最小手工验证执行记录
2. 再把同一套路复制到 `knownProfession`
3. `knownProfession` 跑顺后，再考虑 `tokenStats`
4. 三块轻交互样板稳定后，再回头讨论第一批真实 compat 删除评估

## 九、knownProfession 当前阶段记录

### 已完成

1. 模块内新增只读 view helper：
   - `knownProfessionPanelView()`
   - `selectedKnownProfessionDetailView()`
2. `publish/game.js` 已新增对应 compat 薄桥接
3. Web 模板已迁移读取面：
   - APP 显隐
   - 提示消息
   - 列表空态
   - 列表项
   - 详情弹层显隐
   - 详情标题与描述
   - 职业要求文本
   - 加入职业按钮目标对象
4. Android 镜像模板已做同样读取面迁移
5. 查询输入写入已收口到动作层：
   - `setKnownProfessionQuery(value)`

### 当前结论

`knownProfession` 已经进入与 `skills`、`prompt` 相同的迁移路径中，且第三个样板已经不再只停留在读取收口阶段。

更具体地说：

- 模板已不再直接写 `knownProfessionState.query`
- 详情展示已迁到 `selectedKnownProfessionDetailView()`
- 职业考核与加入职业逻辑仍保持原有动作链
- 这使 `knownProfession` 成为第三个可继续完善的轻交互迁移样板

### 剩余尾项

1. 是否继续补一轮 `knownProfession` 最小手工验证记录
2. 是否进一步统一详情动作与 app 显示 contract 命名
3. 是否在三块样板稳定后再决定进入 `tokenStats`

## 十、knownProfession 最小手工验证建议

建议至少手工确认以下行为：

1. 打开 knownProfession APP 后主面板正常显示
2. 输入查询词后，职业列表过滤结果即时变化
3. 提示消息在识别新职业后仍能正常显示
4. 点击职业项后，详情弹层正常打开
5. 详情中的职业要求文本正常显示
6. 点击“加入职业”按钮后，原有职业考核与加入逻辑仍正常执行
7. 关闭详情后，再打开另一项内容仍正确
8. Web 与 Android 镜像端行为一致

## 十一、knownProfession 当前未证实边界

虽然 `knownProfession` 的读取与查询写入收口已经落地，但当前仍未通过更强执行证据确认的边界包括：

1. 尚未附上 knownProfession 的手工执行记录或截图证据
2. 尚未附上 Web / Android 镜像逐项对照验证结果
3. 尚未完整证明“识别职业后提示消息变化”与“加入职业后状态持久化”链路的回归结果
4. 尚未证明可以开始删除其旧 compat 入口

因此当前更准确的结论仍应是：

- 第三个样板迁移路径已经成立
- 第三个样板代码已经落地到读写收口阶段
- 但仍需要执行证据支撑后续 compat 删除评估

## 十二、三块样板的共同模式结论

当前 `skills`、`prompt`、`knownProfession` 三块模块，已经共同验证了以下模式可复用：

1. 模板读取面先迁到模块 view helper
2. 原始 state 写入再逐步收口到显式 setter 或动作层
3. `publish/game.js` 继续充当薄 compat facade
4. Web / Android 镜像模板可以同步按同一路径迁移
5. 真正高风险的业务动作链可以先保持不动

这说明当前迁移策略不只是“能改一点 UI”，而是已经验证为一条可复制的模块重构方法。

## 十三、下一步扩展顺序结论

基于当前三块样板的落地程度，后续更稳的顺序建议为：

1. 先补三块样板的最小手工执行记录
2. 再决定是否开始触碰 `tokenStats`
3. 在没有执行证据前，不进入真实 compat 删除动作
4. 在样板验证更完整前，不讨论旧代码清理
