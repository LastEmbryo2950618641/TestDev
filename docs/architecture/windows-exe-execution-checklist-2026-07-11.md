# Windows Exe Execution Checklist (2026-07-11)

本文档用于把当前 `desktop/shell` 路线从“架构底座可用”进一步固定成面向后续交付的执行清单，服务于以下目标：

- 保持 shared runtime 继续复用 `publish/`
- 让 Windows exe 不复制玩法逻辑
- 让后续协作者明确 desktop bridge、packaging config、builder 验证与产物检查之间的顺序

## 一、当前阶段结论

截至当前状态：

1. `desktop/shell/assembly-entry.js` 已作为 desktop 平台桥接正式入口
2. `desktop/shell/desktop-packaging-config.js` 与 `desktop/shell/desktop-minimal-packaging-config.js` 已接入本地 `electronDist` 绕过方案
3. 当前已有以下产物验证记录：
   - `desktop/shell/dist-minimal/win-unpacked/GamefyMinimal.exe`
   - `desktop/shell/dist/win-unpacked/Gamefy.exe`
4. 当前桌面路线已不是纯草图，而是“基础打包链可用，生产级细节未完全收口”

## 二、desktop 当前职责

### 1. desktop bridge 层

入口：

- `desktop/shell/assembly-entry.js`

当前负责装配：

- `platform.core.host`
- `platform.core.files`
- `platform.core.storage.desktopBridge`
- `platform.core.assets.bodyFigure`
- `platform.core.keys`

约束：

- 不新增剧情玩法逻辑
- 不复制 `publish/` 普通业务模块
- 不在 shell 内分叉角色状态或现实日志规则

### 2. packaging config 层

当前配置文件：

- `desktop/shell/desktop-packaging-config.js`
- `desktop/shell/desktop-minimal-packaging-config.js`
- `desktop/shell/desktop-packaging-paths.js`

当前职责：

- 指定 Electron 主入口文件
- 指定 `publish/` 共享运行时如何被打进桌面包
- 指定构建资源目录
- 通过显式 `electronDist` 避免默认 Electron 发行包解包卡死

### 3. packaging verify / inspect 层

当前验证入口：

- `desktop/shell/desktop-packaging-electron-dist-state.cli.js`
- `desktop/shell/assembly-entry-verify.js`

当前职责：

- 验证 bridge 装配是否成立
- 验证主配置与最小配置是否都已接入 `electronDist`

## 三、当前已知稳定路径

### A. 桥接主干验证

```bash
node desktop/shell/assembly-entry-verify.js
```

应确认：

- `host / files / storage / assets / keys` 均已挂接
- `storageChannel` 指向 electron

### B. packaging config 状态验证

```bash
node desktop/shell/desktop-packaging-electron-dist-state.cli.js
```

应确认：

- `main.hasElectronDist = true`
- `minimal.hasElectronDist = true`

### C. 最小配置产物验证

最小配置目标：

- 验证桌面壳 + 最小 publish 子集 + Electron 入口是否能完整落出运行目录

当前配置：

- `desktop/shell/desktop-minimal-packaging-config.js`
- `win.target = ['dir']`

### D. 主配置产物验证

主配置目标：

- 验证完整共享 runtime 与桌面壳能生成 Windows 桌面产物

当前配置：

- `desktop/shell/desktop-packaging-config.js`
- `win.target = ['portable']`

## 四、当前 desktop 与 shared runtime 的关系

当前桌面路线应坚持：

1. shared runtime 仍在 `publish/`
2. desktop 只负责 bridge 与 packaging
3. `desktop/shell` 通过 `files` 配置把 `publish/` 打包进桌面产物
4. 不允许为了 exe 路线，在 shell 里重写 shared gameplay 逻辑

当前主配置已明确把以下共享内容打进包：

- `publish/`
- Electron main / preload / bootstrap
- shell bridge 相关文件

这说明 exe 路线的正确方向是：

- 复用 shared runtime
- 补齐宿主能力
- 收口打包链

而不是：

- 复制一套 desktop 版玩法代码

## 五、当前还未完全收口的点

### 1. 桌面生产级打包细节

仍需继续明确：

- `portable` 最终产物的完整验收口径
- 图标资源
- 签名策略
- `asar` 策略
- 构建资源目录规范

### 2. 桌面运行链说明

仍建议继续补充：

- Electron 主进程入口与 preload 边界说明
- desktop bridge 与 shared runtime 的调用流
- 资源、存档、设置、密钥在桌面宿主中的落点说明

### 3. 与多端统一目标的联动

仍需继续保证：

- desktop 新增 bridge 不把平台差异回写到业务层
- shared runtime 不为 desktop 单独分叉状态逻辑
- 后续 Android / Web 不被 desktop 特例拖偏

## 六、下一步建议执行顺序

### 阶段 1：维持当前桌面链路稳定

1. 持续保留 `electronDist` 显式接入方案
2. 持续使用 verify 脚本确认 bridge / packaging config 状态
3. 不改 shared gameplay，只收文档与桥接边界

### 阶段 2：补桌面运行与打包验收清单

1. 明确 `portable` 产物的验收项
2. 明确 build resources 的整理规则
3. 明确桌面资源/存档/设置/密钥的落点说明

### 阶段 3：为正式桌面交付做准备

1. 继续收敛图标、签名、asar 等生产细节
2. 与 shared runtime 统一目录规则保持一致
3. 在不复制玩法层的前提下准备最终 exe 路线

## 七、当前阶段证据

当前可反复使用的基础证据：

```bash
node desktop/shell/assembly-entry-verify.js
node desktop/shell/desktop-packaging-electron-dist-state.cli.js
```

以及当前已存在的产物记录：

- `desktop/shell/dist-minimal/win-unpacked/GamefyMinimal.exe`
- `desktop/shell/dist/win-unpacked/Gamefy.exe`

这些证据当前足以证明：

- desktop bridge 主干成立
- packaging config 主干成立
- Windows exe 路线具备继续收口而非从零搭建的基础
