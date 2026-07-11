# WeChat Domain Helpers

该目录用于承载微信模块中与平台、DOM、消息发送流程无关的只读状态访问与轻规则 helper。

当前已覆盖：

- 角色状态入口读取
- 文本可用性判断
- 初始指标 profile 项查找

当前不放：

- 页面展示拼装
- 动作编排
- 消息发送
- 消息接收
- 记忆写回
- 持久化写回
- 平台能力
- 高风险流程装配

当前阶段判断：

- 当前 `domain/wechat` 属于轻量 domain 样板
- 它已经足够支撑变化原因面板等只读展示派生
- 若没有新的天然规则聚合点，不建议为了目录对称性强行进入 `app/wechat` 或继续扩大 domain 职责

当前停手边界：

- 不在该目录中加入消息发送与接收流程
- 不在该目录中加入记忆写回
- 不在该目录中加入宿主平台能力
- 不在该目录中接管尚未稳定的流程装配职责

当前样板类型：

- UI + 轻量 domain 协作样板

当前参考文档：

- `docs/architecture/wechat-ui-helper-boundary-2026-07-10.md`
- `docs/architecture/wechat-display-refactor-playbook-2026-07-11.md`
- `docs/architecture/three-sample-playbook-2026-07-11.md`
