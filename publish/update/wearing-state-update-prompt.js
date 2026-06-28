window.GameModules = window.GameModules || {};
window.GameModules.updateRegistry?.registerPrompt?.('wearing-state-update', `---
name: wearing-state-update
description: 根据正文确认事实更新亲密相关穿着/外观状态
---

# wearing-state-update

正文确认亲密相关衣物或外观状态变化时，返回 updateType:"wearing-state"。

- 绑定卡片：角色卡；玩家本人绑定玩家卡。
- 本 skill 属于 bodySex 组，因为穿着状态会影响身体接触、外露状态、性经历和性历史判断。
- 更新字段优先使用 values.wearing；如项目已有数组结构，change.value 返回完整数组。
- 更新依据必须同时参考当前已知穿着状态与 Stage 2 正文确认变化。
- 穿着状态必须描述当前实际状态，不是简单二值脱/穿。
- 如果正文只确认衣物被推开、掀起、解开、拉下但未脱下，必须保留“仍穿着”并记录局部状态。
- 如果正文没有确认脱下，禁止更新为未穿。
- 禁止因为亲密行为自动推断脱衣、换衣、衣物破损。
- 示例：{"updateType":"wearing-state","subject":{"type":"character","id":"角色id","name":"姓名"},"field":"values.wearing","change":{"mode":"set","value":[{"slot":"bra","name":"胸罩","state":"仍穿着但被推开，胸部外露"}]},"reasons":[{"trigger":"衣物局部状态变化","evidence":"正文确认胸罩被推开但未脱下","confidence":"confirmed"}]}
`);
