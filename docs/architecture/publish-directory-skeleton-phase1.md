# 发布端目录骨架（第一阶段）

## 目标

在不打断现有 `publish/boot/script-manifest.js` 加载链的前提下，先为后续重构建立稳定的新目录承载层，让新模块优先进入规范目录，而不是继续平铺在 `publish/` 根目录。

## 第一阶段目录职责

### `publish/app/`

放应用装配层代码：
- 启动编排
- 模块组装
- 全局桥接入口
- 运行时组合逻辑

特点：
- 负责“接线”
- 不承载具体玩法规则
- 可以依赖 `domain / platform / ui / shared`

### `publish/domain/`

放玩法领域逻辑：
- 状态读取
- 规则判定
- 业务计算
- 领域动作

特点：
- 不直接依赖 dev-only 路径、文件路径、原生桥接
- 尽量只表达玩法和状态本身

### `publish/platform/`

放平台相关实现：
- 本地 dev server 接口
- 文件访问
- 静态资源路径
- 未来 exe / apk 的桥接入口

特点：
- 这里允许知道“资源在哪、接口在哪、平台怎么读写”
- 上层业务应通过这里拿能力，而不是反向知道平台细节

### `publish/ui/`

放 UI 交互与展示逻辑：
- 展示状态拼装
- UI 专用事件桥接
- 页面动作适配

特点：
- 关注展示，不直接承载底层资源读写
- 尽量复用 domain 输出

### `publish/shared/`

放跨层复用能力：
- 通用工具
- 运行时公共能力
- 常量、格式化、轻量帮助函数

特点：
- 不应反向依赖具体玩法模块
- 保持小而稳，不做“杂物堆”

## 当前迁移策略

第一阶段不进行大规模搬迁，只遵守以下规则：

1. 新增模块优先落到新目录骨架。
2. 旧模块只在需要时逐步迁移，不为搬而搬。
3. `script-manifest` 仍可先引用旧路径或新路径，保持加载稳定。
4. 同一刀只处理一个明确边界，避免“边搬目录边改玩法”。

## 当前已落位示例

- `publish/platform-body-figure-source.js`
  - 下一步应迁移到 `publish/platform/body-figure/`
- `publish/platform-key-source.js`
  - 下一步应迁移到 `publish/platform/keys/`
- `publish/control-state.js`
  - 下一步应迁移到 `publish/domain/control/`

## 第二阶段建议

当新目录骨架稳定后，再开始做“兼容迁移文件”策略：
- 旧路径保留薄转发层
- 新实现进入新目录
- `script-manifest` 逐步切换到新目录

这样可以减少一次性搬迁导致的黑屏和连锁影响。
