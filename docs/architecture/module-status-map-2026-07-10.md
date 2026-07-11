# 模块状态总览（2026-07-10）

本文档用于汇总当前项目各业务模块在结构规范化中的阶段状态，帮助后续会话快速判断：

- 哪些模块已经是成熟样板
- 哪些模块适合继续推进
- 哪些模块应该停在当前阶段
- 哪些模块的规则中心其实已经由现有 system 对象承担

## 1. 完整业务样板

### `taobao`

当前状态：完整三层样板，且已进入 buy 主链外围收口阶段。

已形成：

- `publish/ui/taobao/`
- `publish/domain/taobao/`
- `publish/app/taobao/`
- 旧入口兼容壳

当前判断：

- 已足够作为后续模块迁移的标准答案
- 不需要为了继续追求层数完整而强行深拆高风险副作用链

参考文档：

- `docs/architecture/taobao-ui-helper-boundary-2026-07-10.md`

## 2. 稳定中间样板

### `wechat`

当前状态：已形成 `ui + 轻量 domain + 兼容壳`。

已形成：

- `publish/ui/wechat/`
- `publish/domain/wechat/`
- 旧入口兼容壳

当前判断：

- 已足够作为“UI + 轻量 domain”样板使用
- 当前不应为了与 `taobao` 一样的层数而过早进入 `app/wechat`

参考文档：

- `docs/architecture/wechat-ui-helper-boundary-2026-07-10.md`

## 3. 已有样板继续扩展案例

### `settings`

当前状态：已有 `ui/settings` 样板，已验证可继续追加只读展示 helper。

当前判断：

- 适合作为“已有 UI 样板继续扩展”的参考模块
- 当前仍不适合直接深拆 provider 请求与保存主链

参考文档：

- `docs/architecture/settings-ui-helper-boundary-2026-07-10.md`

## 4. 明确停手边界案例

### `save`

当前状态：已有 `ui/save` 样板，但旧入口后段高耦合。

当前判断：

- 已确认存在样板基础
- 当前不应继续硬拆 `save-actions.js` 后段
- 更适合等未来出现更明确边界后再处理

参考文档：

- `docs/architecture/save-ui-helper-boundary-2026-07-10.md`

## 5. 结构已足够清晰、稳定优先案例

### `loading`

当前状态：已存在 `ui/loading` 与 `app/loading` 多层样板。

当前判断：

- 当前收益不在于继续拆分，而在于维持稳定
- 若未来继续处理，应由黑屏、进度条异常、预热时序等具体问题驱动

参考文档：

- `docs/architecture/loading-module-boundary-2026-07-10.md`

## 6. 已有 system 规则中心样板

### `event`

当前状态：已完成第一批 `ui/event` helper 落地。

当前判断：

- `event-actions.js` 已开始向兼容壳演进
- `eventSystem` 已经承担部分天然 domain 职责
- 当前应明确避免为了目录一致性重复复制一层 `domain/event`

参考文档：

- `docs/architecture/event-ui-helper-boundary-2026-07-10.md`

## 7. 早期成熟样板

### `real-world`

当前状态：早期成熟的只读 helper 样板。

参考文档：

- `docs/architecture/real-world-ui-helper-boundary-2026-07-10.md`
- `docs/architecture/real-world-map-actions-migration-backlog-2026-07-10.md`

### `company`

当前状态：早期成熟的只读 helper 样板。

说明：

- 已证明分主题 UI helper 收敛方式可行
- 当前不是本轮重点，但仍属于已验证路径的重要来源


### `worldline`

当前状态：已形成 `ui/worldline + 极小 domain/worldline + 兼容壳`。

当前判断：

- `publish/ui/worldline/view-helpers.js` 已稳定承载展示 helper。
- `publish/domain/worldline/format-helpers.js` 已开始承载纯构造 helper。
- `publish/worldline-actions.js` 当前仍保留写回编排与数据组合职责。
- 当前不应继续深拆 `updateWorldlineFromTurn()`、`appendWorldlineEvent()`、`ensureWorldline()` 等写回链。

参考文档：

- `docs/architecture/worldline-helper-boundary-2026-07-11.md`
## 8. 当前不建议优先推进的方向

- 继续在 `save` 上硬拆高耦合后段
- 主动深拆 `loading` 启动主链
- 为了层数统一强行给 `wechat` 建 `app` 层
- 为了目录一致性强行给 `event` 再建一层重复 `eventSystem` 职责的 `domain/event`
- 混合改玩法与改结构的组合修改


## 8.5 控制域优先推进案例

### `control`

当前状态：

- 已存在 `publish/domain/control/` 多个规则 helper
- `control-link-actions.js` 已明显开始向 domain 转发
- 已新增共享控制目标名称、控制状态标签、直接上线分流判断等轻规则权威入口
- 控制列表页已开始消费这些权威规则，用于主按钮文案、禁用态、菜单按钮禁用态
- 单一连接约束已显式进入 `domain/control`，不再只依赖隐式 state 约定
- 现实世界人物卡与桌面当前目标摘要已开始复用 `domain/control/state` 的统一显示 helper
- 现实资料分页与下线按钮显示也已开始复用 `domain/control/state` helper，减少模板条件分支
- 控制入口分流（目标选择、返回列表、入口草稿重置）也已开始复用 `domain/control/state` helper
- 菜单状态与部分系统文案（召唤/上线日志文本）也已开始 helper 化
- `control-actions.js` 仍属于高风险上线主链，不适合直接深拆

当前判断：

- `control` 是下一阶段最值得继续推进的模块之一
- 推进重点应放在“连接状态判断、展示文案、共享控制状态读取、轻规则收敛”
- 不应直接切入 `confirmControl()` 这类高副作用主流程

优先原因：

- 已有 domain 基础，继续推进的边际收益高
- 与桌面展示、连接状态、未来多端壳通信边界直接相关
- 比 `company` 的编码污染区、`save` 的高耦合后段、`loading` 的启动时序更适合作为低风险推进点。

## 9. 当前推荐推进顺序

1. 继续以 `taobao` 作为标准答案指导新模块。
2. 将 `wechat` 维持在稳定的 `UI + 轻量 domain` 阶段。
3. `event` 当前冻结在 `ui/event + eventSystem(规则中心) + event-actions(编排壳)` 结构，暂不重复新建 `domain/event`。
4. `control` 优先继续沿 `domain/control + 兼容 actions` 方向收敛轻规则与展示状态。
5. `settings` 适合作为已有 UI 样板扩展的参考。
6. `save` 与 `loading` 当前以边界记录和稳定优先为主。

## 10. 结论

当前项目已经不只是“哪些模块拆了多少函数”，而是形成了一个更有工程意义的模块状态地图：

- 有标准答案样板
- 有中间样板
- 有扩展示例
- 有停手边界
- 有稳定优先模块
- 有 system 已承担 domain 角色的模块

这张地图的作用，是帮助后续任何会话在进入具体代码前，先判断当前模块属于哪一类，再决定是继续拆、补文档、还是明确停手。
