# Platform Core Assembly Examples

## 目标
提供桌面壳与移动壳将宿主 `bridge` adapter 挂接到共享 `platform.core.*` 的示例装配方式。

## 文件
### Desktop
- `desktop/shell/assembly-example.js`

### Mobile
- `mobile/shell/assembly-example.js`

## 说明
1. 这些文件是示例装配，不接入当前浏览器主链。
2. 它们展示的是“宿主层如何将 bridge adapter 装配到共享 contract”，而不是最终运行方式。
3. 真正接入某个宿主时，应在该宿主启动流程中调用相应的 `attach*PlatformCore(...)`。
4. 当前 storage 仍保留共享实现，本示例只额外挂出 shell bridge 落点：
   - `platform.core.storage.desktopBridge`
   - `platform.core.storage.mobileBridge`

## 当前边界
- `publish/index.html` 仍是唯一真实运行入口。
- 这些 assembly example 仅用于后续 Electron / Capacitor / WebView 宿主接线参考。
