# Platform Boundary Note (2026-07-11)

本文档用于明确当前项目在“shared business / store middle layer / platform bridge”三层上的职责边界，作为下一阶段多端复用工作的约束说明。

## 一、三层职责

### 1. 业务层

典型位置：

- `publish/*.js`
- `publish/update/*.js`
- `publish/app/**/*.js`

职责：

- 编排玩法
- 修改角色状态
- 生成/读取现实日志
- 处理 UI 状态与交互流程

约束：

- 不直接依赖 `platform.storage.*Source`
- 不直接依赖 `platform.core.storage.*Source`
- 优先依赖 `characterStateStore` / `realWorldLogStore` / `localSettings`

### 2. 中层 store / settings

典型位置：

- `publish/character-state-store.js`
- `publish/real-world-log-store.js`
- `publish/local-settings.js`

职责：

- 为业务层提供统一保存/读取语义
- 屏蔽 browser / desktop / mobile 的底层差异
- 让业务层不关心最终是 sqlite、electron、web 宿主还是移动桥接

### 3. 平台桥接层

典型位置：

- `publish/platform/browser-core.js`
- `publish/platform/storage/*.js`
- `desktop/shell/assembly-entry.js`
- `mobile/shell/assembly-entry.js`

职责：

- 挂接默认 browser 能力
- 提供 desktop / mobile 宿主能力桥接
- 暴露中层最终需要的 source
- 不持有玩法逻辑

## 二、当前边界判断规则

看到以下调用时，应先判断它是否位于桥接层，而不是立即替换：

- `platform.core.storage.localSettingsSource`
- `platform.storage.characterStateSource`
- `platform.storage.realWorldLogSource`

判断准则：

1. 如果代码位于普通业务文件，则优先迁移到中层
2. 如果代码位于 `publish/platform/*`、`publish/local-settings.js`、`desktop/shell/*`、`mobile/shell/*`，则优先视为桥接职责
3. 不要为了清搜索结果，把桥接代码重新散回业务层

## 三、与多端目标的关系

### Web

- `publish/index.html` 仍是高风险入口
- 继续保持“业务先走中层，入口谨慎接线”的策略

### Windows exe

- `desktop/shell` 应继续只负责容器、桥接、打包
- 不应重新承载 shared 玩法逻辑

### Android apk

- `mobile/shell` 应继续只负责移动桥接与宿主能力接入
- shared 业务层不应为移动端单独分叉一套状态或日志逻辑

## 四、下一阶段建议

当前业务层 store 收口阶段完成后，后续建议优先推进：

1. 平台桥接职责文档化
2. Windows exe 打包链继续收口
3. Android 壳层/桥接设计继续收口
4. web index.html 安全接线策略继续细化
