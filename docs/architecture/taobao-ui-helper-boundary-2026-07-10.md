# Taobao UI Helper Boundary（2026-07-10）

本文档记录淘宝模块第一批低风险结构化拆分的边界，用于指导后续继续拆分时保持低耦合与低回归风险。

## 本次已落地

真实实现新增：

- `publish/ui/taobao/view-helpers.js`
- `publish/ui/taobao/README.md`

兼容入口保留：

- `publish/taobao-actions.js`

清单已登记：

- `publish/boot/script-manifest.js`

## 本次已迁移的 helper

已迁移到 `publish/ui/taobao/view-helpers.js` 的只读展示 helper：

- `taobaoWearFilters`
- `taobaoSearchHint`
- `taobaoFilterLabel`
- `taobaoWalletRows`
- `taobaoSlotSummary`
- `taobaoProductDetail`
- `taobaoSetItems`

这些函数的共同特点：

- 主要输出用于界面展示的文本或数组
- 不直接发起 AI 调用
- 不直接写入持久化
- 不直接改变购买结果
- 不承担生成流程控制

## 仍保留在旧入口的逻辑

当前仍留在 `publish/taobao-actions.js` 的逻辑包括：

- `initTaobaoApp`
- `setTaobaoFilter`
- `setTaobaoCount`
- `taobaoFilteredSlots`
- `taobaoProductMatchesFilter`
- `toggleTaobaoWallet`
- `openTaobaoApp`
- `closeTaobaoApp`
- `selectedTaobaoSlot`
- `backToTaobaoResults`
- `selectTaobaoSlot`

保留原因：

- 这些逻辑包含状态初始化、流程控制或行为触发。
- 其中部分逻辑虽不重，但与运行态状态链更近，不适合与只读视图 helper 混在同一批迁移。

## 后续推荐拆分方向

### 第二批适合进入 `ui/taobao/`

如果后续继续做 UI 层收敛，优先考虑：

- 结果列表展示派生
- 商品选中面板的轻量视图拼装
- 与筛选状态相关的只读文案

### 更适合进入 `domain/taobao/`

如果后续继续做规则层收敛，优先考虑：

- 商品是否匹配部位筛选的判定
- 与装备槽 canonical / base 映射相关的规则 helper
- 不依赖 DOM 和平台的状态筛选逻辑

### 暂不建议立即迁移的部分

暂不建议本阶段直接深拆：

- 商品生成提示词构造
- AI 商品生成流程
- 购买后库存 / 穿戴 / 财富变更主链
- 与其它 app 或 RPG 状态联动较深的逻辑

## 当前结论

淘宝模块已经具备与 `real-world`、`company` 相同的渐进迁移基础：

- 新目录中承载真实实现
- 旧入口保留兼容转发
- 先拆只读 helper
- 暂不碰高风险行为链

这意味着后续可以继续按“UI 先行、规则次之、生成最晚”的顺序推进，而不必回到整文件硬改模式。

## 第二批已落地（domain）

真实实现新增：

- `publish/domain/taobao/filter-helpers.js`
- `publish/domain/taobao/README.md`

本批已迁移到 `publish/domain/taobao/filter-helpers.js` 的规则 helper：

- `taobaoFilteredSlots`
- `taobaoProductMatchesFilter`

这些函数的共同特点：

- 负责纯规则判断与状态筛选
- 不依赖 DOM
- 不发起 AI 调用
- 不直接进行购买、副作用写入或持久化

这意味着当前淘宝模块已经形成更清晰的分层：

- `ui/taobao`：展示 helper
- `domain/taobao`：规则与筛选 helper
- `taobao-actions.js`：兼容入口与轻量流程壳

## 第三批已落地（domain）

本批继续下沉到 `publish/domain/taobao/filter-helpers.js` 的 helper：

- `taobaoBatchHint`
- `taobaoTargetSlots`
- `normalizeTaobaoProduct`

这些函数的共同特点：

- 负责商品标准化、批次槽位派生、搜索上下文摘要
- 依赖领域状态与进度系统，但不直接发起生成流程
- 不负责请求 AI、不负责错误处理、不负责保存时机

这一步之后，`taobao-generate-actions.js` 更接近“生成流程壳”，而商品标准化与批次规则已开始沉到 `domain`。

## 第四批已落地（app）

真实实现新增：

- `publish/app/taobao/generate-flow.js`
- `publish/app/taobao/README.md`

本批迁移到 `publish/app/taobao/generate-flow.js` 的流程装配函数：

- `generateTaobaoProducts`
- `generateTaobaoProduct`

这些函数的共同特点：

- 负责生成流程编排、顺序控制、错误处理与保存时机
- 依赖已经下沉的 `domain` helper 和原有 prompt 构造
- 不承担展示 helper 职责

这一步之后，淘宝模块已经具备更清晰的三层样板：

- `ui/taobao`：展示 helper
- `domain/taobao`：规则、筛选、标准化 helper
- `app/taobao`：生成流程装配

## 第五批已落地（buy 第一阶段）

真实实现新增：

- `publish/app/taobao/buy-flow.js`

本批新增或下沉的低风险 buy 相关 helper：

- `taobaoProductBusyKey` -> `domain/taobao`
- `taobaoInventoryUpdates` -> `domain/taobao`
- `buyTaobaoSlot` -> `app/taobao`

当前保留在 `publish/taobao-buy-actions.js` 的仍是高风险购买主链：

- 余额校验
- RPG 背包更新调用
- 财富扣减
- 资产同步
- 保存时机

这样做的目的是先把购买模块中的“规则 / 轻流程”拆出来，而不在同一轮里直接动副作用主链。

## 第六批已落地（buy 第二阶段）

本批继续下沉或外提的 buy 相关 helper：

- `taobaoSelectedProduct` -> `domain/taobao`
- `taobaoNormalizedPrice` -> `domain/taobao`
- `taobaoInsufficientFundsMessage` -> `domain/taobao`
- `taobaoMissingInventoryStateMessage` -> `domain/taobao`
- `taobaoPurchaseSuccessMessage` -> `domain/taobao`
- `resolveBuyProduct` -> `app/taobao`

这些函数的共同特点：

- 负责购买前目标商品解析、价格标准化、结果文案和轻流程装配
- 不直接执行库存更新、财富扣减、资产同步和保存
- 可以在不改动高风险副作用链的前提下，继续缩小根级入口文件职责

## 第七批已落地（buy 第三阶段）

本批继续下沉或外提的 buy 相关 helper：

- `taobaoPurchaseFailureMessage` -> `domain/taobao`
- `taobaoCanStartPurchase` -> `domain/taobao`
- `taobaoHasEnoughFunds` -> `domain/taobao`
- `canStartPurchase` -> `app/taobao`
- `ensureBuyInventoryState` -> `app/taobao`

这些函数的共同特点：

- 负责购买前启动条件判断、余额校验与失败结果文案
- 只把“是否能进入副作用主链”的判断外提，不改动副作用主链本身
- 让 `buyTaobaoProduct` 更接近一个受控的高风险执行壳，而不是同时承担大量外围判断

## 当前成熟度总结

截至当前阶段，`taobao` 已经是项目中最完整的业务模块迁移样板：

- `ui/taobao`：承接只读展示 helper
- `domain/taobao`：承接筛选、标准化、购买外围规则
- `app/taobao`：承接生成流程与购买轻流程装配
- 旧入口文件：保留兼容壳与高风险副作用执行壳

当前仍保留在高风险壳中的核心部分主要是：

- 库存写入执行
- 财富扣减执行
- 资产同步执行
- 保存时机

这意味着 `taobao` 当前已经足够作为后续模块迁移的标准答案，不需要为了继续追求层数完整而强行深拆高风险主链。
