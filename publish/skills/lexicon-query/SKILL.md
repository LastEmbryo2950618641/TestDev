---
id: lexicon.query
category: 词条系统
name: 专用术语查询与新增
method: searchTermOne(keyword), searchTermWindow(keyword, beforeChars, afterChars), addSpecialTerm(name, summary, description, aliases)
params: keyword: 术语名或关键词；name: 术语名；summary: 一句话含义；description: 根据已有上下文推断出的设定；aliases: 别名数组
returns: 命中的专用术语定义，或新增后写入词条表的术语定义
trigger: 现实推演中出现 AI 不能确定含义的专用术语、缩写、APP名、功能名、黑话、自定义概念时，必须先查询；未命中且已有上下文足够推断时，新增专用术语。
---

# 专用术语查询与新增 Skill

## 激活描述

现实推演遇到不确定含义的术语时，先查询专用术语库；数据库未命中但已有资料足以克制推断时，把术语作为 `专用术语` 词条新增到词条表。

## 可用方法

1. `searchTermOne(keyword)`：按关键词查询一条专用术语。
2. `searchTermWindow(keyword, beforeChars, afterChars)`：术语说明较长时，按关键词加载前后片段。
3. `addSpecialTerm(name, summary, description, aliases)`：新增专用术语，写入现有词条表 `lexicon_entries`，kind 固定为 `专用术语`。

## 使用规则

1. 出现 AI 不能准确判断含义的术语、缩写、APP 名、功能名、黑话、自定义概念时，先用 `searchTermOne` 查询。
2. 查询未命中时，若当前基础上下文、已载入资料、现实记录或玩家行动足以克制推断含义，可以用 `addSpecialTerm` 新增术语。
3. 新增术语必须写清 `name`、`summary`、`description`，不得把不确定内容写成绝对事实；不确定处写“当前推断为”。
4. 新增术语后，本轮可以基于新增定义继续 final；不要为了同一术语反复查询或反复新增。
5. 如果术语无法从已有资料推断，不能新增，只能在 narration 中保持不确定或让玩家继续确认。
6. 不要在玩家正文中暴露方法名、数据库表名或“我查询了术语库”。
