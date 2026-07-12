# Android Shared Runtime Asset Governance (2026-07-12)

## 结论

Android WebView 壳当前不是维护一套独立前端，而是通过同步脚本直接镜像共享 `publish/` 运行时。
因此 `mobile/android-webview-shell/app/src/main/assets/publish/` 下的 `index.html`、`boot/`、`assets/`、`domain/`、`ui/` 应视为共享运行时在 Android 端的落地镜像，而不是零散平台私有文件。

## 同步依据

1. 计划脚本
- `mobile/shell/android-webview-asset-sync-plan.js`
- 明确 copy plan 为：
  - `publish/index.html -> mobile/android-webview-shell/app/src/main/assets/publish/index.html`
  - `publish/boot -> .../publish/boot`
  - `publish/assets -> .../publish/assets`
  - `publish/domain -> .../publish/domain`
  - `publish/ui -> .../publish/ui`

2. 执行与校验脚本
- `mobile/shell/android-webview-asset-sync.js`
- `mobile/shell/android-webview-asset-sync-verify.js`
- `mobile/android-webview-shell/.last-asset-sync.json`

3. 当前校验结果
- `ok: true`
- `parity.ok: true`
- 说明当前 Android 资产镜像与共享 `publish/` 运行时一致。

## 当前镜像规模

按当前共享运行时统计：
- `publish/boot`: 6 files
- `publish/assets`: 90 files
- `publish/domain`: 17 files
- `publish/ui`: 40 files

这些数量应视为 Android 镜像纳管时的最低边界校验参考，而不是只补录单个 helper 文件。

## 当前 Git 历史问题

1. 当前 `HEAD` 并未完整纳管 Android 模块化镜像文件。
2. 例如 `mobile/android-webview-shell/app/src/main/assets/publish/ui/worldline/` 在工作树中已有：
- `lore-view-helpers.js`
- `plot-view-helpers.js`
- `README.md`
- `real-plot-summary-view-helpers.js`
- `timeline-panel-view-helpers.js`
- `timeline-view-helpers.js`
- `view-helpers.js`

3. 但 `HEAD` 仅跟踪其中一部分，说明当前仓库历史与实际镜像产物不一致。

## 未跟踪项的当前判断

1. 当前 Android `publish/` 下的未跟踪项，在主真源 `publish/` 中都能找到一一对应的源文件或目录。
2. 这说明它们首先应被视为“共享运行时镜像缺口”，而不是 Android 端独有脏文件。
3. 即便名称看起来像临时资源，例如 `publish/assets/tmp.txt`、`tmp2.txt`、`tmp3`，只要它们已被主真源 Git 正式跟踪，就不应在 Android 镜像纳管时单凭文件名排除。
4. 因此 Android 侧的分拣规则应优先服从共享 `publish/` 的已跟踪资产集合，而不是平台侧主观猜测。

## 运行时引用约束

1. 当前 `publish/assets/body-figures/index.json` 已显式引用一批 `player-self-*`、`rel-ai-*` 生成目录。
2. 这说明相关生成资源当前属于运行时索引的一部分，而不是可在 Android 镜像层单独删除的孤立文件。
3. 若未来要清理这类生成资源，必须先调整主真源的资产策略、索引生成逻辑或运行时引用关系，再同步影响到 Android 镜像。
4. 换言之，Android 侧不能先于主真源擅自裁剪这些已被索引引用的资源。

## 提交策略建议

1. 将“主真源旧 helper / facade 收口”与“Android 共享运行时镜像纳管”拆成不同提交。
2. Android 这条线应按目录级镜像边界处理：
- `index.html`
- `boot/`
- `assets/`
- `domain/`
- `ui/`
3. 不建议以“看到哪个未跟踪文件就补哪个”的方式零散入库。
4. 提交前继续使用 `node mobile/shell/android-webview-asset-sync-verify.js` 作为一致性门禁。
