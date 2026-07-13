# Browser Platform Assembly Safe Migration Note

本文档用于记录浏览器入口向统一平台装配结构迁移的安全路线，避免在高风险编码现场直接改写 `publish/index.html` 与其他超大文件。

## 一、当前判断

当前项目已经具备以下多端共识：

- `publish/` 仍然是共享 Web 核心来源
- `desktop/` 是 Windows `exe` 宿主壳
- `mobile/` 是 Android `apk` 宿主壳
- `publish/platform/` 正在承载共享平台能力契约与浏览器默认实现

目前最适合继续抽离的稳定切口不是玩法模块，而是：

- 浏览器平台装配入口
- `platform.core.*` 的默认浏览器实现挂接
- UI 预引导阶段对本地设置的读取逻辑

## 二、为什么现在不直接重写 `publish/index.html`

当前工作区里，`publish/index.html` 与 `publish/boot/script-manifest.js` 已存在：

- 编码/BOM 风险
- 大量既有内容差异
- 超大体积 diff

在这种现场下继续直接重写旧入口，会同时混入：

- 编码修复
- 平台入口抽取
- 玩法页面内容变化

这会明显增加关联性影响风险，不符合本轮目标。

## 三、当前已落地的安全前置件

本轮已新增：

- `publish/platform/browser-core.js`

其职责是：

1. 提供 `attachBrowserPlatformCore(target)`
2. 提供 `readBrowserUiSettings(target, key)`
3. 为浏览器宿主提供 `localSettingsSource` 的统一默认装配位置
4. 让后续 `web / desktop / mobile` 的平台装配形状更接近一致

## 四、推荐迁移顺序

### 阶段 A：仅新增，不改旧入口

完成条件：

- 新共享文件与验证脚本先稳定
- 不修改 `publish/index.html` 的大段结构
- 不依赖直接重写 `script-manifest.js` 来证明架构方向

建议动作：

1. 保持 `publish/platform/browser-core.js` 作为 browser attach 草案
2. 增加浏览器装配自检脚本
3. 由文档固定未来接线位置和脚本顺序

### 阶段 B：小范围接线

前提：

- 已确认 `index.html` 的编码策略
- 已确认 `script-manifest.js` 的维护方式

建议动作：

1. 将 `index.html` 中与 `localSettingsSource` 相关的内联初始化改为只保留主题预读逻辑
2. 其余 `platform.core.storage` 装配收口到 `browser-core.js`
3. 如需接入 manifest，优先以最小插入方式增加 `platform/browser-core.js`

### 阶段 C：统一多端装配形状

建议目标：

- browser: `attachBrowserPlatformCore(...)`
- mobile: `attachMobilePlatformCore(...)`
- desktop: 未来补 `attachDesktopPlatformCore(...)`

统一后，多端装配层只负责：

- host
- files
- storage
- assets
- keys

玩法层禁止直接感知 `electron`、`android webview`、`local file path` 等宿主差异。

## 五、后续最适合新增的文件

建议优先新增而不是改旧大文件：

- `publish/platform/browser-core-verify.js`
- `desktop/shell/assembly-entry.js` 或类似的桌面装配入口
- `mobile/shell/assembly-entry.js` 的正式版替代当前 example
- `docs/architecture/multi-platform-browser-assembly-note-*.md`

## 六、验证原则

每次推进都优先验证：

1. 不改玩法逻辑
2. 不破坏当前浏览器 HTTP 启动链
3. 不破坏桌面壳打包链
4. 平台装配逻辑尽量只新增、不回写业务层

## 七、当前结论

本轮最安全且最符合长期目标的推进方式是：

- 暂停直接触碰高风险大入口文件
- 继续以新增共享装配文件、验证脚本、迁移文档的方式推进
- 等编码与入口治理条件清晰后，再做最后接线
