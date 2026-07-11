# Next Implementation Roadmap (2026-07-11)

本文档用于把当前项目从“架构/边界/执行清单已经成形”的状态，推进到“下一阶段真实接线与实现”的统一路线图。目标不是立即做三端完整实现，而是明确：

- 先做哪一段
- 每段做到什么程度算完成
- 每段对应哪些验证口径
- 如何避免把多端实现重新做成高耦合分叉

## 一、当前起点判断

截至当前状态：

1. 业务层 `characterStateStore / realWorldLogStore / localSettings` 收口已基本完成
2. browser / desktop / mobile 三端装配入口已建立
3. Windows exe / Android apk / Web 安全接线已分别形成执行清单
4. Android / Windows 两端都已开始具备宿主接线设计表

因此，当前不再属于“继续找业务层平台直连”的阶段，而是进入：

- bridge 细化
- 宿主接线最小实现
- 打包/入口最小闭环验证

## 二、总体实施顺序

推荐按以下阶段推进：

### 阶段 1：bridge 最小实现阶段

优先目标：

- 让 desktop / mobile 的最小宿主 bridge 从“接口/文档”进入“可用最小实现草图”

优先顺序：

1. desktop `storage / host`
2. mobile `storage / host`
3. desktop `files / assets`
4. mobile `files / assets`
5. desktop / mobile `keys`

阶段完成标准：

- 相关 bridge 不再全部是纯 `not implemented` stub
- 至少形成一条最小可运行路径或明确的最小实现样板
- 不要求一次做成生产级，但必须保持 shared runtime 不分叉

对应验证口径：

```bash
node desktop/shell/assembly-entry-verify.js
node mobile/shell/assembly-entry-verify.js
node publish/character-state-store-verify.js
node publish/real-world-log-store-verify.js
```

### 阶段 2：宿主存储接线阶段

优先目标：

- 让 shared `characterStateStore / realWorldLogStore / localSettings` 真正有宿主落地后端可接

优先顺序：

1. desktop storage bridge 最小落地方案
2. mobile storage bridge 最小落地方案
3. 验证 shared store 与桥接后端之间的边界没有倒灌进业务层

阶段完成标准：

- desktop 至少明确一条 raw/settings 落地链
- mobile 至少明确一条 raw/settings 落地链
- shared store 不需要知道宿主具体实现细节

对应验证口径：

- 现有 store verify 继续通过
- 如后续新增 bridge verify，应补 bridge-storage 级别验证脚本

### 阶段 3：资源与文件接线阶段

优先目标：

- 让资源访问、图片索引、文件读写不再只是文档设计，而开始具备宿主实现落点

优先顺序：

1. desktop assets/files
2. mobile assets/files

阶段完成标准：

- 包内只读资源与运行时可写资源边界被固定
- 文件导入导出、资源索引、缓存资源访问具备最小接线路径
- shared 层仍不直接接触绝对路径或宿主私有 API

### 阶段 4：Web 最小安全接线阶段

优先目标：

- 在不暴力重写高风险入口文件的前提下，为 browser 装配完成一轮最小安全接线

前提条件：

1. `publish/index.html` 编码/BOM 策略已明确
2. `publish/boot/script-manifest.js` 的维护方式已明确
3. 本轮不混入玩法逻辑变更

阶段完成标准：

- browser 接线只做最小插入
- `localSettingsSource` / 主题预读等小范围初始化能力被更稳地抽离
- 不把 platform 初始化逻辑重新散回业务层

对应验证口径：

```bash
node publish/platform/browser-core-verify.js
```

并辅以最小人工启动验证。

### 阶段 5：端侧交付收口阶段

优先目标：

- 将 desktop / mobile / web 从“可接线”推进到“可继续收口交付”

分线目标：

#### desktop

- 收口 `portable` 验收规则
- 继续明确图标、签名、asar、资源目录规范

#### mobile

- 固定最终壳层技术
- 将 `mobile/shell` 与壳层正式对接
- 收口权限、文件、存储、资源、keys 的真实映射

#### web

- 在安全策略下完成最小 browser 正式接线
- 继续保持高风险入口只做最小变更

## 三、当前最推荐的下一步

如果只选最优先的一步，推荐先做：

1. desktop storage bridge 最小落地方案草图
2. mobile storage bridge 最小落地方案草图

原因：

- shared store 的最终价值，最依赖宿主落地后端是否开始成形
- storage 是 desktop / mobile 两端最基础、最共通、最能验证架构有效性的 bridge

## 四、各阶段禁止事项

在后续实施阶段中，持续禁止：

1. 为了快，直接在业务层新增 `platform.storage.*Source` 调用
2. 为 desktop / mobile 复制一套 shared gameplay
3. 在没有编码治理方案前大改 `publish/index.html` 与 `publish/boot/script-manifest.js`
4. 让宿主私有对象直接暴露给 shared runtime

## 五、阶段完成后应补的证据

每完成一个新阶段，至少应补：

1. 对应的短说明文档或快照文档
2. 对应的 verify 结果或最小验证口径
3. 对 shared runtime 不分叉这一原则的再次确认

## 六、当前路线图服务的核心目标

本路线图服务于以下长期目标：

- 保证低耦合
- 保证代码复用性
- 保证功能玩法不变
- 在降低关联性影响风险的前提下推进 `window exe / android apk / web index.html` 三端复用
- 持续规范代码结构、目录边界与协作入口
