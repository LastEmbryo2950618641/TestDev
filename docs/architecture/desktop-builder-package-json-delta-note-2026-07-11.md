# Desktop Builder Package Json Delta Note

本文档用于说明在当前 `desktop/shell` 边界内，若下一步执行真实 `npm install -D electron-builder`，`package.json` 预期将发生什么变化，以及哪些变化不应再继续扩散。

## 一、当前 package.json 状态

当前已具备：

- `main: electron-main-bootstrap.cjs`
- 一组稳定的 packaging verify 脚本：
  - `verify:packaging-config`
  - `verify:packaging-toolchain`
  - `verify:packaging-tool`
  - `verify:packaging-dry-run-plan`
  - `verify:builder-dry-run-entry`
- `optionalDependencies.electron`

当前缺少：

- `devDependencies.electron-builder`

## 二、真实安装后预期最小变化

### 1. 应新增的内容

最小预期仅新增：

- `devDependencies.electron-builder`

### 2. 当前不建议同步新增的内容

安装第一轮后，不建议立刻再加：

- 大量新的 builder 专属 npm scripts
- 多套并行的打包命令别名
- 与 `electron-forge` 同时混用的命名

原因：

- 当前目标是先跑通第一次 dry-run
- 不应在第一次安装时就把脚本入口扩散复杂化

## 三、推荐保持不变的部分

以下字段当前建议继续保持稳定：

- `name`
- `private`
- `type`
- `main`
- 现有 `verify:*` 脚本命名

## 四、第一次安装后建议的理解方式

如果安装 `electron-builder` 后出现 `package.json` 变化，优先只把它理解成：

- desktop builder 接入所需依赖已进入本地工程

不应同时把它解释成：

- 共享玩法逻辑变化
- multi-platform 结构边界变化
- 业务规则变化

## 五、当前结论

从 `package.json` 角度看，继续进入真实 builder 安装的最小变化面已经很小。

真正显著的变化更可能来自：

- `package-lock.json`
- `node_modules/`
- `dist/`
