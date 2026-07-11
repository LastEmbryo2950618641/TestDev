# Settings UI Helper Boundary锛?026-07-10锛?
鏈枃妗ｈ褰曡缃ā鍧楀湪宸叉湁 `ui/settings` 鍩虹涓婄户缁墿灞曠涓€鎵瑰彲澶嶇敤灞曠ず helper 鐨勮竟鐣屻€?
## 鏈宸茶惤鍦?
鎵╁睍鍒?`publish/ui/settings/view-helpers.js` 鐨?helper锛?
- `aiOutputLimitKinds`
- `aiOutputLimitPrefix`
- `currentDrawModels`
- `stage1MaterialIterationModeText`
- `textProviderSummaryLabel`
- `textModelSummaryLabel`
- `drawProviderSummaryLabel`
- `drawModelSummaryLabel`
- `stage3OutputSummaryLabel`
- `currentSettingsSummaryParts`
- `currentSettingsSummaryText`

杩欎簺鍑芥暟鐨勫叡鍚岀壒鐐癸細

- 涓昏鏈嶅姟璁剧疆鐣岄潰鐨勯€夐」灞曠ず銆佺姸鎬佹憳瑕佸拰娲剧敓鏁版嵁
- 涓嶇洿鎺ュ彂璧?provider 璇锋眰
- 涓嶇洿鎺ヤ繚瀛樿缃?- 涓嶇洿鎺ヤ慨鏀硅繙绋嬫ā鍨嬬姸鎬?
## 褰撳墠浠嶇暀鍦ㄦ棫鍏ュ彛鐨勯€昏緫

褰撳墠浠嶄繚鐣欏湪 `publish/settings-actions.js` 鐨勯€昏緫鍖呮嫭锛?
- provider 鍒楄〃鍔犺浇
- 杩炴帴娴嬭瘯
- key/baseUrl 璁剧疆
- draw provider / model 閫夋嫨淇濆瓨
- AI 杈撳嚭闄愬埗鐨勭姸鎬佸啓鍥?
淇濈暀鍘熷洜锛?
- 杩欎簺閫昏緫娑夊強缃戠粶璇锋眰銆佹寔涔呭寲鎴栨槑鏄惧壇浣滅敤銆?- 褰撳墠鏇撮€傚悎鍏堟墿灞?settings 鐨勫彧璇诲睍绀哄眰锛岃€屼笉鏄洿鎺ユ繁鎷嗚缃富娴佺▼銆?
## 褰撳墠缁撹

璁剧疆妯″潡宸茬粡鍏峰鈥滃凡鏈?UI 鏍锋澘缁х画鎵╁睍鈥濈殑绗笁妯″潡楠岃瘉浠峰€笺€?
杩欒鏄庝笟鍔℃ā鍧楄縼绉绘ā鏉夸笉浠呴€傜敤浜庝粠闆惰捣姝ョ殑鏂扮洰褰曪紝涔熼€傜敤浜庯細

- 宸茬粡瀛樺湪 `ui/<module>/` 鐨勬ā鍧?- 缁х画鍚戣鐩綍杩藉姞绾睍绀?helper
- 淇濇寔鏃у叆鍙ｅ吋瀹逛笉鍔ㄤ富閾?

## 鏈疆琛ュ厖锛欰I 杈撳嚭闀垮害闄愬埗 row 鏀跺彛锛?026-07-11锛?
缁х画娌?`settings` 鐨勬棦鏈?`ui/settings` 鏍锋澘鎺ㄨ繘锛屾湰杞‘璁や簡涓€绫婚€傚悎缁х画鎶界鐨勫彧璇诲睍绀哄垏鍙ｏ細

- AI 杈撳嚭闀垮害闄愬埗鍒楄〃 row
- title / desc / effectiveText 鐨勭粨鏋勫寲杈撳嚭
- mode / max / inputDisabled / canFollowGlobal 杩欑被鍙娲剧敓灞曠ず瀛楁

鏈疆鏂板 helper锛?
- `publish/ui/settings/view-helpers.js`
  - `aiOutputLimitRows()`

瀵瑰簲鍏煎鍏ュ彛锛?
- `publish/settings-actions.js`
  - `aiOutputLimitRows()`

瀵瑰簲 UI 娑堣垂锛?
- `publish/index.html`
  - settings 椤甸潰涓?AI 杈撳嚭闀垮害闄愬埗鍖哄煙宸叉敼涓烘秷璐?`aiOutputLimitRows()`

杩欒鏄庯細

- `settings` 閫傚悎鎴愪负缁?`faction`銆乣real-world` 涔嬪悗鐨勭涓変釜灞曠ず灞傛牱鏉胯捣鐐?- 瀹冨綋鍓嶆洿鎺ヨ繎 `faction` 寮忕殑鈥滄ā鍧楀唴 UI row 瀵硅薄鍖栨敹鍙ｂ€濓紝鑰屼笉鏄?`real-world` 寮忕殑璺ㄨ閾捐鍒欏鐢?

## 鏈疆琛ュ厖锛歴ettings summary rows 鏀跺彛锛?026-07-11锛?
缁х画娌?`settings` 鐨勭涓夋牱鏉胯捣鐐规帹杩涳紝鏈疆纭浜嗗彟涓€绫婚€傚悎缁х画鎶界鐨勫彧璇诲睍绀哄垏鍙ｏ細

- 椤甸潰搴曢儴褰撳墠璁剧疆鎽樿 summary
- label / value 鐨勭粨鏋勫寲 row 杈撳嚭
- 绗旈銆丼tage1 璧勬枡杩唬銆佹鏂囪緭鍑虹瓑鍙娲剧敓鍊肩殑缁熶竴姹囨€?
鏈疆鏂板 helper锛?
- `publish/ui/settings/view-helpers.js`
  - `currentSettingsSummaryRows()`

瀵瑰簲鍏煎鍏ュ彛锛?
- `publish/settings-actions.js`
  - `currentSettingsSummaryRows()`

瀵瑰簲 UI 娑堣垂锛?
- `publish/index.html`
  - settings 椤甸潰搴曢儴褰撳墠璁剧疆鎽樿宸叉敼涓烘秷璐?`currentSettingsSummaryRows()`

杩欒鏄庯細

- `settings` 宸茬粡涓嶅彧鏄崟鐐?row 鏀跺彛锛岃€屾槸寮€濮嬪舰鎴愯繛缁殑妯″潡鍐?UI row / summary 妯″紡
- 瀹冪户缁瘉鏄?`faction` 寮忕殑鈥滄ā鍧楀唴灞曠ず瀵硅薄鍖栨敹鍙ｂ€濆彲浠ュ鍒跺埌宸叉湁 `ui/<module>` 鍩虹鐨勪笟鍔℃ā鍧?

## 本轮补充：draw model option rows 收口（2026-07-11）

继续沿 `settings` 第三样板推进，本轮完成了 draw model 下拉选项的对象化展示收口：

- `currentDrawModelRows()`

对应兼容入口：

- `publish/settings-actions.js`
  - `currentDrawModelRows()`

对应 UI 消费：

- `publish/index.html`
  - settings 页面中 draw model 下拉区域已改为消费 `currentDrawModelRows()`

这说明：

- `settings` 已经从 summary / row 的单点收口，继续扩展到 option rows
- 它正在形成连续的模块内展示对象化样板，而不只是零散 helper 增补


## 本轮补充：text model option rows 收口（2026-07-11）

继续沿 `settings` 第三样板推进，本轮完成了 text model 下拉选项的对象化展示收口：

- `currentTextModelRows()`

对应兼容入口：

- `publish/settings-actions.js`
  - `currentTextModelRows()`

对应 UI 消费：

- `publish/index.html`
  - settings 页面中文本模型下拉区域已改为消费 `currentTextModelRows()`

这说明：

- `settings` 已经形成 AI 输出限制 rows、settings summary rows、draw model option rows、text model option rows 的连续样板
- 第三样板已经不再只是起点，而是具备了稳定的可复制展示层收口路径
