# 2026-07-11 faction-actions stabilization audit

## 目标

对 `publish/faction-actions.js` 做一次低风险稳定化审计，区分：

- 有价值的 compat forwarder 迁移
- 需要清理的历史编码污染

并只修复污染项，不回退已经符合项目规范方向的迁移工作。

## 本轮结论

经审计，`publish/faction-actions.js` 当前 diff 主要包含两类变化：

### 1. 正向变化，应保留

这些变化符合当前项目级显示层迁移契约：

- action 层转发到 `publish/ui/faction/overview-view-helpers.js`
- 将原先零散的只读展示逻辑迁移到 helper 层
- 新增 `selectedFactionOverviewView()` compat 入口

这些变化有助于：

- 降低 action 文件耦合
- 为模板层统一消费 view object 做准备
- 形成与 `real-world`、`event` 一致的模块边界

### 2. 污染变化，应修复

发现少量中文字面量曾被错误转码，例如：

- `国家`
- `未知`
- `成员`

本轮已将这些污染字面量恢复为正常中文，同时保留 compat forwarder 迁移本身。

## 本轮实际处理

- 去除 `publish/faction-actions.js` BOM
- 修复错误转码的中文字面量
- 保留已有 helper forwarder 重构方向
- 不对业务行为逻辑做额外改写

## 验证

已执行：

```powershell
node --check publish/faction-actions.js
```

并以 Node 读取文件内容确认：

- `国家` 存在
- `未知` 存在
- `成员` 存在
- `selectedFactionOverviewView()` 存在

## 原则沉淀

今后遇到类似文件时，优先遵循：

1. 不因局部污染就回退整段已有价值的 helper 迁移
2. 先识别“污染字面量”与“正向结构迁移”
3. 只修污染，不抹掉结构进展
4. 用 Node 校验 UTF-8 文本与无 BOM 状态

## 结果

`publish/faction-actions.js` 现在可以作为继续推进 `faction` 模块显示层迁移的稳定入口，而不是必须先整体回滚重做的高风险文件。
