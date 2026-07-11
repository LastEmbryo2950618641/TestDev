# Store Migration Playbook

本文档作为当前项目“业务层 -> 中层 store -> 平台 source”迁移模式的总纲说明，服务于以下正式目标：

- Web: `publish/index.html`
- Windows: `desktop/shell` -> `exe`
- Android: `mobile/shell` -> `apk`

## 一、迁移总原则

当前项目不应再优先让业务模块直接依赖：

- `window.GameModules.platform.storage.*Source`
- `window.GameModules.platform.core.storage.*Source`

优先改为：

- 业务层依赖中层 store / settings API
- 中层 store / settings 再依赖平台 source
- 平台装配层负责 browser / desktop / mobile / web 的具体宿主差异

## 二、当前三类中层入口

### 1. 本地设置

- `publish/local-settings.js`

职责：

- 提供 `readStored()` / `writeStored()`
- 作为 UI 主题、启动设置、密钥预填等业务的统一入口

### 2. 现实日志

- `publish/real-world-log-store.js`

职责：

- 提供 `get / list / count / append / saveAll`
- 作为现实日志读取与持久化的统一入口

### 3. 角色状态

- `publish/character-state-store.js`

职责：

- 提供 `get / getByName / resolve / list / save`
- 作为角色状态读取与保存的统一入口

## 三、推荐迁移顺序

### 阶段 A：读取型调用先收口

优先把业务中的：

- `source.get(...)`
- `source.list(...)`
- `source.count(...)`
- `source.resolve(...)`

改成：

- `store.get(...)`
- `store.list(...)`
- `store.count(...)`
- `store.resolve(...)`

原因：

- 读取型风险更低
- 更容易验证行为不变
- 更适合作为第一批样板

### 阶段 B：整体回写语义优先

当开始接触写入型调用时，优先迁移：

- `saveAll(...)`
- 明确单 `state` 的 `save(...)`

原因：

- 语义清楚
- 局部边界稳定
- 不容易与高频交互时序缠在一起

### 阶段 C：细粒度追加 / 高频交互写入

最后再迁移：

- `append(...)`
- 多次局部交互触发的写入
- UI 状态连带保存

原因：

- 更依赖时序
- 更容易与交互状态耦合
- 需要前两阶段打好样板基础后再扩展

## 四、当前已落地样板

### localSettings

- 业务消费样板：`publish/ui-theme-actions.js`

### realWorldLogStore

- 读取样板：
  - `publish/real-world-stream-actions.js`
  - `publish/real-world-agent-history.js`
  - `publish/real-world-thinking-actions.js`
- `saveAll(...)` 样板：
  - `publish/app/storage/restore-post-flow.js`
  - `publish/control-link-actions.js`
- `append(...)` 样板：
  - `publish/real-world-clock-actions.js`
  - `publish/control-link-actions.js`

### characterStateStore

- 读取样板：
  - `publish/real-world-agent-memory.js`
  - `publish/item-skill-actions.js`
  - `publish/real-world-longing-actions.js`
  - `publish/predefined-role-cards.js`
  - `publish/player-identity-actions.js`
  - `publish/update/generic-update-applier.js`
- `save(...)` 样板：
  - `publish/predefined-role-cards.js`
  - `publish/character-card-lexicon.js`

## 五、与多端目标的关系

### Web (`publish/index.html`)

- 业务层越多依赖 store / settings 中层，未来越容易在不直接触碰高风险入口文件的前提下完成安全接线。

### Windows exe

- 桌面壳只应提供 platform 能力与打包底座，不应重新持有业务逻辑。
- store 迁移越完整，shared web core 越容易直接被 Electron 壳复用。

### Android apk

- 移动壳应复用同一套业务中层，不应单独分叉角色状态或现实日志逻辑。

## 六、禁止事项

后续协作者应尽量避免：

1. 新业务继续直接新增 `platform.storage.xxxSource` 的业务侧调用
2. 在 `desktop/shell`、`mobile/shell` 写入玩法逻辑
3. 为了省事直接在高风险入口文件里大范围回填平台差异代码
4. 在没有样板与验证的情况下批量替换写入逻辑

## 七、推荐工作流

每次推进新的迁移点，优先遵循：

1. 先判断是否适合做读取型样板
2. 若是写入型，优先选择语义单纯的局部封装点
3. 落地后补 verify 或至少文本核对
4. 再补一篇短说明文档，记录为何选择该点

## 八、当前结论

当前项目已不再处于“架构设想”阶段，而是已经形成可重复执行的迁移模式。后续应继续沿 store 中层化主线推进，而不是重新回到业务直接依赖平台 source 的写法。
