# 预定义角色卡导出与默认账号直连设计

## 背景

当前默认账号需要使用当前存档中的刘悠、刘思瑶、刘思琪、刘思怡信息，固化为四张预定义角色卡。用户不能直接取得存档 JSON，因此工具不能要求输入 JSON 文件，而应接收存档名/slot 名，从应用同源存储读取该 slot 并导出 JSON/JS。

## 目标

1. 在 `tools/` 中提供本地导出/预定义化工具，按指定存档名生成 `publish/predefined-role-cards/*.json` 与对应 `*.js`。
2. 生成四张卡：刘悠为玩家卡，刘思瑶、刘思琪、刘思怡为角色卡。
3. 三胞胎统一按成人口径固化为 18 岁。
4. 性经验次数全部归 0。
5. 除年龄成人化与性经验次数归 0 外，尽量保持当前存档角色状态中的信息。
6. 默认账号确认时直接使用这些预定义卡创建一张玩家卡与三张角色卡，不再请求 AI 生成。
7. 不修改、不读取 `publish/config/default-existing-profile.*` 作为资料源。
8. 不创建 git commit。

## 非目标

- 不从 `default-existing-profile` 概览反推角色卡。
- 不凭空补不存在的存档字段。
- 不新增正式 UI 导出按钮。
- 不清理现有工作区中的无关未提交改动。

## 工具设计

新增文件：

```text
tools/export-predefined-role-cards.js
```

推荐命令：

```bash
node "tools/export-predefined-role-cards.js" --slot "slot-1"
```

可选参数：

```bash
--slot <name>        存档名，默认 slot-1。可传 slot-1、slot-2 等。
--out <dir>          输出目录，默认 publish/predefined-role-cards。
--publish <dir>      publish 根目录，默认 publish。
--dry-run            只打印将导出的角色和文件，不写文件。
```

### 存档读取策略

工具必须能在本地 Node 环境中从同项目可访问的存储读取指定 slot。读取顺序：

1. 优先读取本地可用的 Gamefy/dzmm KV CLI 或模拟存储文件（如果项目环境暴露）。
2. 回退读取浏览器 localStorage 导出的同名键文件或已有 raw 文件时，仅作为兼容能力，不作为主交互要求。
3. raw key 格式沿用现有应用逻辑：`control-rpg-sqlite-${slot}`。
4. 若无法读取 slot，输出明确错误，提示当前环境没有暴露该存档，需要先在应用侧保存/同步到可读取 KV。

### raw 数据解析

工具支持两类 raw：

1. fallback JSON：包含 `characterStates`，直接读取。
2. SQLite base64：使用 `sql.js` 解码，读取 `character_state` 表中的 `state_json`。

如果 raw 是 SQLite base64 但本地缺少 `sql.js`，工具应提示安装/可用性问题，而不是静默失败。

### 角色筛选

按姓名提取：

- 刘悠
- 刘思瑶
- 刘思琪
- 刘思怡

每个角色优先使用：

```js
state.profile
```

并从 `state.values` 与 `state.metrics` 补足存档中已经固化的字段，例如：

- `items`
- `wearing`
- `factions`
- `force_positions`
- `bodyStatus`
- `intimacy`
- `initialMetrics`
- `worldAttributes`
- `rpgFieldReasons`
- `roleCardFieldReasons`

字段只在存档中存在时同步，不生成虚构内容。

### 成人化规则

对刘思瑶、刘思琪、刘思怡：

- `profile.age = 18`
- `values.age = 18`（如输出中保留 values 派生字段）
- 文本字段中明确的 `15岁`、`15 岁` 替换为 `18岁`。
- 如果生日字段存在且能安全推导，保持原生日不强改，避免破坏存档原始日期；年龄显示以 `age: 18` 为准。

### 性经验归零规则

工具递归处理导出卡对象：

- 任何键名匹配 `sexualExperienceCount` 的数值设为 `0`。
- 常见中文字段如 `性经验次数` 设为 `0`。
- `intimacy.sexualExperienceCount` 明确设为 `0`。
- 不删除其他性历史/亲密字段，除非它们本身是次数计数。

## 输出设计

输出目录：

```text
publish/predefined-role-cards/
```

文件：

```text
liu-you.json
liu-you.js
liu-siyao.json
liu-siyao.js
liu-siqi.json
liu-siqi.js
liu-siyi.json
liu-siyi.js
```

每个 `.json` 是格式化 JSON。

每个 `.js` 注册同一份对象：

```js
window.GameModules = window.GameModules || {};
window.GameModules.predefinedRoleCardData = window.GameModules.predefinedRoleCardData || {};
window.GameModules.predefinedRoleCardData['liu-siyi'] = { ... };
```

## 运行时接入设计

修改 `publish/predefined-role-cards.js`：

- `keys` 改为四人：

```js
['liu-you', 'liu-siyao', 'liu-siqi', 'liu-siyi']
```

- 默认玩家卡为刘悠。
- 默认关系卡为刘思瑶、刘思琪、刘思怡。
- `saveSelectedRelationshipStates()` 默认关系卡列表改为三姐妹。

修改 `publish/index.html`：

- 加载四组 `publish/predefined-role-cards/*.js`。

确认流程保持使用既有 `usePredefinedPlayerCard` 路径：

- 选择默认账号后自动启用预定义玩家卡。
- 点击确认时调用既有保存逻辑创建：
  - `player-self`：刘悠
  - 三张关系角色卡：刘思瑶、刘思琪、刘思怡
- 由于 `ensurePlayerRpgState()` 已优先走 `predefinedRoleCards.ensurePlayerState()`，此路径不调用 `characterProfile.ensure()`，避免 AI 生成玩家卡。
- 关系卡通过 `saveSelectedRelationshipStates()` 直接 `createState()`，避免 AI 生成关系卡。

## 测试计划

1. 单元测试导出转换函数：
   - 能从角色状态数组提取四人。
   - 三姐妹年龄变为 18。
   - `sexualExperienceCount` 全部归 0。
   - `15岁` 文本替换为 `18岁`。
2. 单元测试 JS 输出格式：
   - 每个 JS 注册到正确 key。
3. 运行时测试：
   - `predefinedRoleCards.keys` 包含四人。
   - 默认关系卡包含三姐妹。
   - `ensurePlayerState()` 使用刘悠创建 `player-self`。
4. 手动验证：
   - 用 `node "tools/export-predefined-role-cards.js" --slot "slot-1" --dry-run` 确认能读取角色。
   - 正式运行后检查生成的 JSON/JS。

## 风险与处理

- 风险：Node 环境无法访问浏览器 localStorage 或 dzmm KV。
  - 处理：工具输出明确错误，并保留 raw 文件兼容入口作为调试后备。
- 风险：SQLite base64 解析依赖 `sql.js`。
  - 处理：检测依赖，不可用时给出安装或环境提示。
- 风险：存档中缺少刘思怡或某角色未固化。
  - 处理：工具失败并列出已找到角色，避免生成半套默认卡。
- 风险：导出内容仍含未成年人年龄文本。
  - 处理：对三姐妹导出对象递归替换 `15岁`/`15 岁` 为 `18岁`，并测试覆盖。
