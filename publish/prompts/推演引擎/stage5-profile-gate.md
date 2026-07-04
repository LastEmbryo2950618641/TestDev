# Stage5 盛装外观更新判定\r
\r
任务：只输出一个合法 JSON 对象，不输出 Markdown、代码块、正文或解释。\r
\r
## 目标\r
\r
根据本轮正文与 Stage4 结算结果，判断哪些出场角色的 `dressedProfile`（盛装状态 Part6）需要局部更新。\r
\r
MVP 范围：\r
- 只处理 `profileType: "dressedProfile"`（不写 Part5 永久身体原貌）\r
- 最多 2 个角色，每人最多 3 个部位\r
- 固定部位列表：头发、脸部、耳朵、脖颈、胸部、双臂、小腹、臀部、神秘花园、双大腿、双小腿\r
\r
## 判定规则\r
\r
应判定为需要更新（needsUpdate: true）当且仅当存在明确事实：\r
- 穿着/脱衣/换衣/弄乱/位移/补妆/发型变化等，且会影响对应部位的盛装描写\r
- 正文已明确写出外观视觉变化（本阶段与 Stage4 并行，**优先依据正文**；穿着状态变化摘要仅作辅助）\r
\r
不应更新：\r
- 仅有弱氛围、心理活动、无外观变化的互动\r
- 玩家本人（除非正文明确写玩家外观变化且该角色卡有 dressedProfile）\r
- 无角色卡或未初始化 dressedProfile 的路人\r
\r
部位选择提示：\r
- 换上衣/内衣 → 胸部、双臂、小腹\r
- 换下装/丝袜/鞋 → 臀部、双大腿、双小腿、神秘花园\r
- 弄乱头发/补妆 → 头发、脸部\r
- 戴摘耳饰/项链 → 耳朵、脖颈、脸部\r
\r
## 输入\r
\r
本回合参与者：\r
{{本回合参与者}}\r
\r
穿着状态变化摘要（可能与 Stage4 并行，为空时只看正文）：\r
{{穿着状态变化}}\r
\r
各角色当前盛装摘要：\r
{{当前盛装摘要}}\r
\r
本轮正文（节选）：\r
{{本轮正文}}\r
\r
## 输出 JSON Schema\r
\r
```json\r
{\r
  "needsUpdate": false,\r
  "targets": []\r
}\r
```\r
\r
当 needsUpdate 为 true 时，targets 示例：\r
\r
```json\r
{\r
  "needsUpdate": true,\r
  "targets": [\r
    {\r
      "subject": "角色姓名",\r
      "profileType": "dressedProfile",\r
      "parts": ["胸部", "双臂"],\r
      "reason": "换了一件更薄的上衣",\r
      "evidence": "正文中她解开扣子换上半透明衬衫"\r
    }\r
  ]\r
}\r
```\r
\r
约束：\r
- targets 最多 2 项；每项 parts 最多 3 个，且必须来自固定部位列表\r
- subject 必须是本回合参与者中的出场角色姓名\r
- profileType 固定写 dressedProfile\r
- reason 与 evidence 必须引用正文或穿着变化中的具体事实，不得空话