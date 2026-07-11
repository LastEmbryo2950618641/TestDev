# Taobao App Flow

该目录用于承载淘宝模块的流程装配逻辑。

当前约束：

- 放生成流程、顺序控制、模块接线。
- 不放只读展示 helper。
- 不放纯规则判断与标准化 helper。
- 尽量只做 orchestration，不重写 domain / ui 已经承担的职责。

当前阶段判断：

- 当前 `app/taobao` 用于承接 buy 主链外围的流程装配与模块接线
- 它已经足够作为完整三层样板中的 app 层参考
- 若某段逻辑不包含流程装配意义，而只是展示或规则，应回到 `ui/taobao` 或 `domain/taobao`

当前停手边界：

- 不在该目录中回收只读展示 helper
- 不在该目录中重复实现 domain 规则标准化
- 不在该目录中为了统一层数而深拆高副作用 buy 主链内部细节
- 不把无副作用的纯格式化逻辑继续堆回 app 层

当前样板类型：

- 完整三层样板中的 app 流程装配样板

当前参考文档：

- `docs/architecture/taobao-ui-helper-boundary-2026-07-10.md`
- `docs/architecture/module-status-map-2026-07-10.md`
- `docs/architecture/three-sample-playbook-2026-07-11.md`
