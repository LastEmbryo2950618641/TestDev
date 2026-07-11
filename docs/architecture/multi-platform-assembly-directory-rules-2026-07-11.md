# Multi-Platform Assembly Directory Rules

本文档用于将 browser / desktop / mobile 三端装配入口的目录规则固定下来，方便后续 AI 与人工协作者继续推进而不把平台代码写散。

## 一、正式装配入口

当前三端正式装配入口约定如下：

- browser
  - `publish/platform/browser-core.js`
- desktop
  - `desktop/shell/assembly-entry.js`
- mobile
  - `mobile/shell/assembly-entry.js`

这些文件负责平台能力装配，不负责玩法逻辑实现。

## 二、自检入口

每个装配入口都应优先配套独立 verify 文件：

- browser
  - `publish/platform/browser-core-verify.js`
- desktop
  - `desktop/shell/assembly-entry-verify.js`
- mobile
  - `mobile/shell/assembly-entry-verify.js`

后续新增平台装配能力时，优先先补 verify，再考虑接入真实大入口文件。

## 三、写码约束

1. 平台宿主代码只写在：
   - `publish/platform/`
   - `desktop/shell/`
   - `mobile/shell/`

2. 玩法逻辑不要写回：
   - `desktop/shell/`
   - `mobile/shell/`

3. 平台入口文件只做：
   - host 挂接
   - files 挂接
   - storage 挂接
   - assets 挂接
   - keys 挂接

4. 如需改动 `publish/index.html`、`publish/boot/script-manifest.js` 之类大入口，优先先补迁移说明与验证脚本，再做最小接线。

## 四、后续优先级

推荐顺序：

1. 继续统一三端 attach 形状
2. 将业务代码逐步收口到 `platform.core.*`
3. 最后再收旧入口接线与编码治理

## 五、当前结论

当前目录规则已经足以支撑后续以低耦合方式继续推进 `exe / apk / browser` 共用业务核心，不必再让平台差异直接渗进玩法层。
