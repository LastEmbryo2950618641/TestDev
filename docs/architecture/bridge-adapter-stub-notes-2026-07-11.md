# Bridge Adapter Notes

## 目标
本目录下的 `bridge` stub 用于给未来宿主层接线预留真实文件落点。

## 当前已建立的最小 adapter
### Desktop
- `desktop/shell/bridge/host.js`
- `desktop/shell/bridge/files.js`
- `desktop/shell/bridge/storage.js`
- `desktop/shell/bridge/assets.js`
- `desktop/shell/bridge/keys.js`

### Mobile
- `mobile/shell/bridge/host.js`
- `mobile/shell/bridge/files.js`
- `mobile/shell/bridge/storage.js`
- `mobile/shell/bridge/assets.js`
- `mobile/shell/bridge/keys.js`

## 原则
1. 这些 stub 只是宿主层占位，不接入当前运行主链。
2. 真实实现应在壳层完成，再由壳层装配到共享 `platform.core.*`。
3. 未实现的方法显式抛错，避免误以为能力已经可用。
