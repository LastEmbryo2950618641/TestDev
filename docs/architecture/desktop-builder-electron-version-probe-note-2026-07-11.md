# Desktop Builder And Electron Version Probe Note

本文档用于记录当前 desktop 真实打包尝试所处的 `electron-builder` 与 `electron` 版本组合，并据此收窄下一轮实验范围。

## 一、当前版本组合

### 1. electron-builder

- package: `electron-builder`
- version: `26.15.3`

### 2. electron

- package: `electron`
- installed version: `37.10.3`
- package.json optional dependency range: `^37.2.0`

## 二、当前已知事实

1. 该组合下，builder 已能：
   - 加载配置
   - 执行 `@electron/rebuild`
   - 完成 native dependencies 安装
   - 进入 `packaging platform=win32 arch=x64 electron=37.10.3 appOutDir=...`

2. 该组合下，当前仍未看到：
   - `dist/win-unpacked` 或 `dist-minimal/win-unpacked` 落地
   - builder 成功退出日志
   - 明确 stderr 错误

3. 最小包 / dir 目标与完整包 / portable 目标都卡在相同阶段。

## 三、当前可得出的判断

这说明问题更可能位于：

- 当前 Windows 环境下 builder 更底层的 packaging 执行阶段
- 或 `electron-builder 26.15.3 + electron 37.10.3` 这一组合在当前环境中的特定行为

## 四、下一轮最小实验建议

为避免引入新的大范围变量，下一轮只建议做以下二选一实验：

### 方案 A：仅调整 Electron 版本

保持 `electron-builder = 26.15.3` 不变，仅将 Electron 切到更低一档的稳定版本做对照。

### 方案 B：仅调整 builder 版本

保持 Electron 版本不变，仅更换 `electron-builder` 版本做对照。

## 五、当前推荐

优先推荐：

- 先做 **方案 A：仅调整 Electron 版本**

原因：

- 当前项目对 Electron 的宿主使用仍处于早期打包阶段
- 调低 Electron 版本通常比同时更换 builder 与 Electron 更容易解释差异
- 能更快判断是否是 `electron 37` 相关组合问题
