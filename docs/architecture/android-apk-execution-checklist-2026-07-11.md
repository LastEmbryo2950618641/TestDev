# Android Apk Execution Checklist (2026-07-11)

本文档用于把当前 `mobile/shell` 路线从“桥接骨架已建立”进一步固定成面向后续 Android `apk` 落地的执行清单，服务于以下目标：

- 继续复用 shared runtime (`publish/`)
- 让 Android 壳只负责 bridge 与宿主能力接线
- 避免移动端单独分叉玩法、状态或现实日志逻辑

## 一、当前阶段结论

截至当前状态：

1. `mobile/shell/assembly-entry.js` 已作为 mobile 平台桥接正式入口
2. mobile 当前已具备 host / files / storage / assets / keys 五类桥接挂点
3. 当前 Android 路线仍停留在“桥接底座可用、壳层实现未正式接入”的阶段
4. 当前目标不是直接声称 APK 已可打包交付，而是把后续落地方向与约束写清楚

## 二、mobile 当前职责

### 1. mobile bridge 层

入口：

- `mobile/shell/assembly-entry.js`

当前负责装配：

- `platform.core.host`
- `platform.core.files`
- `platform.core.storage.mobileBridge`
- `platform.core.assets.bodyFigure`
- `platform.core.keys`

约束：

- 不新增剧情玩法逻辑
- 不复制 `publish/` 普通业务模块
- 不单独分叉角色状态、现实日志或控制逻辑

### 2. mobile shell 层

当前定位：

- 为 Android `apk` / WebView 壳提供桥接装配落点
- 承接未来 Capacitor / Android WebView / 其他移动宿主的能力接入
- 继续让 shared runtime 保留在 `publish/`

应坚持：

- 壳只负责容器、权限、桥接、资源与存储接入
- shared gameplay 不迁移到 `mobile/`

## 三、当前 mobile 与 shared runtime 的关系

当前移动路线应坚持：

1. shared runtime 仍在 `publish/`
2. mobile 只负责 bridge 与宿主能力接线
3. shared 业务层通过 store / settings 与 `platform.core.*` 统一契约访问能力
4. Android 壳后续接入时，不应直接要求业务层读取移动专属全局对象

这意味着 Android 的正确方向是：

- 复用 `publish/`
- 通过 `mobile/shell` 提供宿主能力
- 通过统一 bridge 把 Android 差异拦在平台层

而不是：

- 为 Android 再写一套状态系统
- 为 Android 再写一套路由/玩法副本

## 四、当前已接桥接能力与后续映射方向

### 1. host

当前挂点：

- `platform.core.host`

后续需要承接：

- 宿主识别
- 生命周期通知
- 前后台状态
- 壳层级导航/唤起信息（如后续需要）

### 2. files

当前挂点：

- `platform.core.files`

后续需要承接：

- Android 沙盒文件读写
- 临时缓存/导入导出
- 与宿主权限策略关联的文件访问行为

### 3. storage

当前挂点：

- `platform.core.storage.mobileBridge`

后续需要承接：

- 角色状态/现实日志/设置等最终落地能力的移动宿主映射
- 与 `characterStateStore / realWorldLogStore / localSettings` 的最终衔接

### 4. assets

当前挂点：

- `platform.core.assets.bodyFigure`

后续需要承接：

- 身体资源/图片/静态资产在移动宿主中的访问方式
- 本地资源与包内资源的区分

### 5. keys

当前挂点：

- `platform.core.keys`

后续需要承接：

- 移动端密钥、配置或安全存储的宿主映射
- 与本地持久化或安全存储机制的边界说明

## 五、当前 Android 路线还未正式收口的点

### 1. 壳层形态选择

当前仍未最终固定：

- Capacitor
- Android WebView 壳
- 其他移动容器方案

当前建议：

- 先固定 bridge 边界，再决定最终壳
- 不在壳未定前，把业务逻辑绑死到某个移动框架私有 API

### 2. Android 宿主 API 映射

仍需后续继续明确：

- 文件读写映射
- 存储映射
- 权限映射
- 资源访问映射
- 密钥/安全存储映射

### 3. 打包与运行链说明

仍需后续继续补充：

- Android 工程如何承载 shared runtime
- `publish/` 如何被壳层加载
- `mobile/shell` 如何在启动时装配 bridge
- Android 包内资源与运行时资源的边界

## 六、下一步建议执行顺序

### 阶段 1：继续固定 shared runtime 与 mobile bridge 边界

1. 保持 `mobile/shell` 只负责 bridge
2. 持续避免在移动层分叉 shared gameplay
3. 继续维持 store / settings 中层统一入口

### 阶段 2：补 Android 宿主映射清单

1. 为 host/files/storage/assets/keys 各自列出 Android 映射方向
2. 补充权限与沙盒策略说明
3. 补充资源访问策略说明

### 阶段 3：确定壳层技术并做正式接线

1. 在 Capacitor / WebView 方案间定最终形态
2. 将 `mobile/shell` 与壳层入口对接
3. 保证 shared runtime 不分叉

## 七、当前阶段证据

当前可反复使用的基础证据：

```bash
node mobile/shell/assembly-entry-verify.js
node publish/character-state-store-verify.js
node publish/real-world-log-store-verify.js
```

这些证据当前足以证明：

- mobile bridge 主干成立
- shared store 主干成立
- Android 路线具备继续从 bridge/documentation 阶段向真实壳接入推进的基础
