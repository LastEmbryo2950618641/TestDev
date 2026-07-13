# Electron Builder Install Impact Audit

本文档用于在当前高脏工作区背景下，评估如果继续在 `desktop/shell` 内执行真实 `electron-builder` 安装与第一次 dry-run，最可能影响哪些文件、目录和验证结论。

## 一、当前前提

当前 desktop 方向已经具备：

- Electron smoke run 成功证据
- multi-platform readiness 汇总入口
- desktop packaging config 骨架
- packaging toolchain preflight
- packaging tool recommendation
- dry-run plan
- `electron-builder.config.js` 绑定入口

当前唯一未做的是：

1. 真实安装 `electron-builder`
2. 执行第一次 `npx electron-builder --dir --config ...` dry-run

## 二、真实安装最可能影响的文件

### 1. `desktop/shell/package.json`

影响类型：

- 新增 `devDependencies.electron-builder`
- 可能新增或调整正式打包命令脚本

当前风险：

- 如果后续还要支持 `electron-forge` 备选路线，脚本命名需保持克制
- 不应把 builder 专属参数散写到多个脚本里

### 2. `desktop/shell/package-lock.json`

影响类型：

- 明显变更
- 体积会显著增大
- 会锁定一整批 builder 传递依赖

当前风险：

- 在长期 dirty 工作区里，这会是最显眼的一类变化
- 后续若需要回看“哪些变化是 builder 带来的”，必须依赖清晰的提交边界

### 3. `desktop/shell/node_modules/`

影响类型：

- 安装大量新包
- 目录体积明显增大

当前风险：

- 不适合作为“变化理解”的权威来源
- 只适合视为派生结果，不应用于人工 review

### 4. `desktop/shell/dist/`

影响类型：

- 第一次 dry-run 后大概率出现新的构建输出
- 可能包含 unpacked app、临时产物、工具链生成结构

当前风险：

- 若不事先约定是否提交，容易变成新的噪音来源
- 应先明确其是否仅作本地验证产物

## 三、真实 dry-run 最可能暴露的技术问题

### 1. `files` 字段与资源路径问题

重点检查：

- `publish/` 是否被正确带入打包目录
- `electron-main-bootstrap.cjs` 是否仍能按预期定位共享入口
- `electron-preload.js` 是否与打包后路径一致

### 2. `buildResources` 路径问题

重点检查：

- 当前 `assets/` 是否适合作为 builder 的 `buildResources`
- 是否需要单独拆一个更纯粹的打包资源目录

### 3. `node_modules/**/*` 打包范围偏宽

重点检查：

- 现阶段为了先打通 dry-run，范围可以偏宽
- 但正式收口前，后续应继续瘦身，避免把无关内容一起打包

### 4. Windows portable 目标是否顺利生成

重点检查：

- `portable` 目标是否与当前 app 结构兼容
- builder 是否要求额外 metadata 或 icon

## 四、当前建议的安装顺序

### 安装前

1. 保留当前 readiness / config / recommendation / dry-run plan 作为基线证据
2. 明确本轮是否接受：
   - `package-lock.json` 显著变化
   - `node_modules/` 增长
   - `dist/` 新产物出现

### 安装时

推荐只在 `desktop/shell` 内执行：

```bash
npm install -D electron-builder
```

### 安装后立即验证

1. 运行：

```bash
npm run verify:packaging-toolchain
npm run verify:packaging-tool
npm run verify:builder-dry-run-entry
```

2. 再执行第一次 dry-run：

```bash
npx electron-builder --dir --config "C:\Users\liuqi\Documents\TestDev\desktop\shell\electron-builder.config.js"
```

## 五、当前结论

在当前工作区背景下，真实安装 `electron-builder` 的主要风险不是架构错误，而是：

- 会引入大量新的派生变化
- 会让当前已经很脏的工作区更难一眼分辨变化来源

因此当前更稳的做法是：

- 先把安装影响面文档化
- 再由用户决定是否接受这一轮真实依赖与 dry-run 产物进入工作区
