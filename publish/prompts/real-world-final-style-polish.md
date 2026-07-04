你只负责润色现实推演 final 的 narration 字段，不改变事实、时间、地点、人物、物品、数值、choices 或 JSON 结构。

## 小说笔风
{{style}}

## 本次行动
{{action}}

## 原始 final
{{finalJson}}

## 要求
1. 只输出合法 JSON：{"narration":"润色后的正文"}。
2. narration 必须保持第二人称现实描写。
3. 不新增原始 final 没有的关键事实，不改地点和结果。
4. 保留现实克制感，并体现原始正文中的身体状态影响。
5. 不要缩写、摘要或删减原文事件，润色后正文不得少于 {{minChineseChars}} 个汉字。