# 2026-07-11 Electron Thin Integration Handoff

## 目标
结束当前“结构准备阶段”，把后续工作明确切换到“真实 Electron 极薄接入阶段”。

## 当前结论
- desktop shell 的准备链已经基本完成。
- 再继续新增同层 draft / wrapper / skeleton / shim 的收益已很低。
- 后续若要继续向最终目标推进，必须开始真实 Electron 极薄接入。

## 当前已完成的 desktop 准备边界

### Preload side
已具备：
- contract
- payload
- wrapper
- skeleton
- real-call-ready shim
- runtime entry
- runtime invoke skeleton
- ultra-thin real call skeleton
- real-call-style entry

关键文件：
- `desktop/shell/preload.js`
- `desktop/shell/preload-runtime-entry.js`

### Main-process side
已具备：
- contract
- payload
- wrapper
- skeleton
- real-call-ready shim
- runtime entry
- runtime invoke skeleton
- ultra-thin real call skeleton
- real-call-style entry

关键文件：
- `desktop/shell/executor-shim.js`
- `desktop/shell/executor-runtime-entry.js`

## 后续不要优先做的事
- 不要继续横向新增更多 desktop 同层草图。
- 不要优先修改 `publish/index.html`。
- 不要优先修改 `publish/game.js`。
- 不要把平台接入逻辑直接扩散回共享玩法主链。

## 下一步唯一高价值动作
开始第一次真实 Electron 极薄接入。

### 推荐顺序
1. 从 `desktop/shell/preload-runtime-entry.js` 开始。
2. 只做最小真实调用骨架占位。
3. 保持当前浏览器运行链不受影响。
4. 完成后再评估是否继续到 `desktop/shell/executor-runtime-entry.js`。

### 推荐最小目标
在 `preload-runtime-entry.js` 中引入“可选 runtime 参数”或“可选调用器参数”，使其能够：
- 接收一个 contextBridge-like 对象
- 在存在时构造真实 `exposeInMainWorld(namespace, payload)` 调用
- 在不存在时继续只返回描述对象

### 必须保持的边界
- 不引入真实 `electron` 依赖到当前浏览器链。
- 不让当前 dev 浏览器入口依赖 Electron globals。
- 不把接入点回写到 `publish/*`。
- 优先在 runtime entry 层完成第一步真实接入。

## mobile 当前建议
- mobile 这条线保持现状即可。
- 在 desktop 第一次真实极薄接入完成前，不建议继续给 mobile 增加同层占位。
- desktop 打通第一个真实接入点后，再镜像到 mobile runtime entry。

## 一句话交接
后续工作不该再继续“补结构”，而应直接从 `desktop/shell/preload-runtime-entry.js` 开始做第一个真实 Electron 极薄接入。
