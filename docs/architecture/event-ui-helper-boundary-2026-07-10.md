# Event UI Helper Boundary锛?026-07-10锛?
鏈枃妗ｈ褰曚簨浠舵ā鍧楃涓€鎵逛綆椋庨櫓缁撴瀯鍖栨媶鍒嗙殑杈圭晫銆?
## 鏈宸茶惤鍦?
鐪熷疄瀹炵幇鏂板锛?
- `publish/ui/event/view-helpers.js`
- `publish/ui/event/README.md`

鍏煎鍏ュ彛淇濈暀锛?
- `publish/event-actions.js`

娓呭崟宸茬櫥璁帮細

- `publish/boot/script-manifest.js`

## 鏈宸茶縼绉荤殑 helper

宸茶縼绉诲埌 `publish/ui/event/view-helpers.js` 鐨勫彧璇诲睍绀?helper锛?
- `eventTypeTabs`
- `currentEventList`
- `selectedEvent`
- `eventMeta`
- `eventStatusLabel`
- `eventRandomProbability`

杩欎簺鍑芥暟鐨勫叡鍚岀壒鐐癸細

- 涓昏鏈嶅姟浜嬩欢鍒楄〃銆佷簨浠堕€変腑鎬佷笌鐘舵€佸睍绀?- 涓嶇洿鎺ュ啓鍏ヤ簨浠舵暟鎹?- 涓嶇洿鎺ヨЕ鍙戦殢鏈轰簨浠舵娊鍙?- 涓嶆壙鎷呮彁绀鸿瘝涓婁笅鏂囨瀯閫犱笌瑙﹀彂涓婚摼

## 褰撳墠浠嶄繚鐣欏湪鏃у叆鍙ｇ殑閫昏緫

褰撳墠浠嶇暀鍦?`publish/event-actions.js` 鐨勯€昏緫鍖呮嫭锛?
- 浜嬩欢鑽夌鍐欏叆
- 浜嬩欢澧炲垹鏀?- 闅忔満浜嬩欢绛涢€変笌璁板綍
- prompt 涓婁笅鏂囨瀯閫?- 瑙﹀彂鍘嗗彶鐘舵€佹洿鏂?
淇濈暀鍘熷洜锛?
- 杩欎簺閫昏緫鍖呭惈鍐欏洖銆佽Е鍙戞祦绋嬫垨鏄庢樉鐨勪笟鍔′富閾惧壇浣滅敤銆?- 褰撳墠鏇撮€傚悎鍏堟妸浜嬩欢妯″潡鐨勫彧璇诲睍绀哄眰鎷嗗共鍑€锛屽啀鑰冭檻鏄惁鏈夎交瑙勫垯閫傚悎杩涘叆 `domain/event`銆?
## 褰撳墠缁撹

浜嬩欢妯″潡宸茬粡閫氳繃绗竴鎵?UI helper 鎷嗗垎锛屾垚涓烘柊鐨勬牱鏉垮€欓€夋ā鍧椼€?
瀹冨綋鍓嶆洿鎺ヨ繎锛?
- 宸插舰鎴?`ui/event` 鐪熷疄瀹炵幇
- 鏃у叆鍙ｅ紑濮嬭浆鍚戝吋瀹瑰３
- 鍚庣画鍙瀵熸槸鍚﹀瓨鍦ㄦ竻鏅扮殑 `domain/event` 浣庨闄╁垏闈?

## 褰撳墠闃舵鍒ゆ柇

鍩轰簬褰撳墠 `event` 妯″潡鐨勭粨鏋勶紝鍙互寰楀嚭涓€涓拰 `wechat`銆乣taobao` 涓嶅悓鐨勫垽鏂細

- `event-actions.js` 宸茬粡寮€濮嬫妸鍙灞曠ず helper 鏀惰繘 `ui/event`
- `event-system.js` 鏈韩宸茬粡鎵挎媴浜嗕竴閮ㄥ垎澶╃劧鐨勮鍒?/ 鏍囧噯鍖栬亴璐?- 鍥犳 `event` 鐨勪笅涓€闃舵涓嶄竴瀹氭槸绔嬪埢鏂板缓 `domain/event`锛岃€屾洿鍍忔槸鍏堣瀵?`eventSystem` 鏄惁宸茬粡鍦ㄤ簨瀹炰笂鎵挎媴 domain 瑙掕壊

杩欐剰鍛崇潃褰撳墠鏇寸ǔ鐨勭瓥鐣ユ槸锛?
1. 鍏堟壙璁?`eventSystem` 宸茬粡鏄竴涓緝寮虹殑瑙勫垯涓績銆?2. 涓嶄负浜嗗眰鏁扮粺涓€鑰岄┈涓婂鍒朵竴浠?`domain/event`銆?3. 绛夊悗缁嚭鐜版槑纭殑鍙鐘舵€佸叆鍙ｆ垨瑙勫垯鑱氬悎闇€姹傦紝鍐嶅喅瀹氭槸鍚﹂渶瑕佸崟鐙殑 domain/event銆?

## 鏈疆澶嶆煡缁撹锛堢浜屾鍒ゆ柇锛?
鍦ㄧ户缁鏌?`event-actions.js` 涓?`event-system.js` 鐨勫崗浣滄柟寮忓悗锛屽彲浠ヨ繘涓€姝ョ‘璁わ細

- `eventSystem` 涓嶅彧鏄€氱敤宸ュ叿闆嗗悎锛岃€屾槸浜嬩欢妯″潡褰撳墠鐨勮鍒欐潈濞佷腑蹇冦€?- 瀹冨凡缁忛泦涓壙杞戒簡浜嬩欢绫诲瀷鏍囧噯鍖栥€佽崏绋块粯璁ゅ€笺€佷簨浠舵爣鍑嗗寲銆佹椂闂村尯闂村垽鏂€佽繃鏈熷垽鏂€佺浉鍏虫€ц瘎鍒嗐€佹彁绀鸿瘝琛屾嫾瑁呯瓑鏍稿績瑙勫垯銆?- `event-actions.js` 褰撳墠鏇村儚鐘舵€佺紪鎺掍笌鍓綔鐢ㄦˉ鎺ュ眰锛岃礋璐ｄ簨浠跺鍒犳敼銆佸垪琛ㄥ啓鍥炪€佹棩鍘嗗悓姝ャ€侀殢鏈哄€欓€夌粍缁囦笌鎻愮ず璇嶄笂涓嬫枃鎷兼帴銆?
鍥犳褰撳墠闃舵鐨勬洿绋崇粨璁烘槸锛?
- 涓嶅簲涓轰簡鐩綍瀵圭О鎬у啀鏂板缓涓€灞傞噸澶?`eventSystem` 鑱岃矗鐨?`publish/domain/event/`銆?- `event` 妯″潡褰撳墠鍙涓猴細`ui/event` + `eventSystem`(浜嬪疄 domain) + `event-actions`(鍏煎澹?缂栨帓鍏ュ彛)銆?- 鍚庣画鍙湁鍦ㄥ嚭鐜扳€滅嫭绔嬩簬 store 涓庡壇浣滅敤銆佷笖鍙堜笉閫傚悎缁х画鏀惧湪 `eventSystem` 涓€濈殑鏂拌鍒欒仛鍚堢偣鏃讹紝鎵嶈€冭檻鍗曠嫭寤虹珛 `domain/event/`銆?
## 褰撳墠鍐荤粨寤鸿

鏈ā鍧椾笅涓€闃舵寤鸿鍏堝喕缁撳湪浠ヤ笅缁撴瀯锛?
- `publish/ui/event/`锛氬彧璇诲睍绀?helper
- `publish/event-system.js`锛氫簨浠惰鍒欎腑蹇?- `publish/event-actions.js`锛氱姸鎬佺紪鎺掋€佸吋瀹瑰叆鍙ｃ€佸壇浣滅敤鎺ョ嚎

鍐荤粨鍘熷洜锛?
- 缁х画娣辨媶鐨勬敹鐩婂凡缁忔槑鏄句綆浜庢柊澧為噸澶嶆娊璞＄殑椋庨櫓銆?- 褰撳墠缁撴瀯宸茬粡婊¤冻鈥滅帺娉曚笉鍙樺墠鎻愪笅鏀惰竟鐣屸€濈殑鐩爣銆?- 瀵规湭鏉?`exe / apk` 澶嶇敤鑰岃█锛屼繚鐣欏崟涓€瑙勫垯鏉冨▉涓績姣斾汉涓哄鍒朵竴灞傜洰褰曟洿閲嶈銆?

## 第三模块复制验证补充（2026-07-11）

本轮将 `event` 作为第三个模块进行第一刀复制验证，目标不是继续深拆 `eventSystem`，而是验证“展示层优先收口”是否仍然成立。

本次选择的最小切口是：

- 右侧详情区空态文案 `selectedEventEmptyText`

真实落点：

- `publish/ui/event/view-helpers.js`
- `publish/event-actions.js`
- `publish/index.html` 事件详情空态区域

这一步说明：

- 即使 `event` 当前冻结在 `ui/event + eventSystem + event-actions` 结构，也仍然可以继续做最小展示层收口
- 本轮没有为了目录对称性新增 `domain/event`
- 本轮没有碰事件抽取、草稿写入、随机触发与 prompt 主链

因此可以进一步确认：

- `event` 适合作为第三类复制验证模块：已有规则中心存在时，仍可继续做渐进式 UI 收口
- 这与 `wechat` / `faction` 不同，但仍然遵守同一条低风险方法论


## Event 展示层第三刀补充（2026-07-11）

本轮继续沿用“展示层优先收口”方法，在不触碰 `eventSystem` 与状态写链的前提下，再收一组页头与详情区纯展示标签：

- `eventListEmptyText`
- `eventStatusFieldLabel`
- `eventTriggeredCountFieldLabel`
- `eventHeaderDescription`
- `eventProbabilityFieldLabel`
- `eventBackButtonText`

真实落点：

- `publish/ui/event/view-helpers.js`
- `publish/event-actions.js`
- `publish/index.html`

本轮继续说明：

- `event` 适合先把页面内联展示文本逐块收口到 `ui/event`
- `eventSystem` 仍保持规则中心职责，不因目录对称性被重复抽象
- `event-actions` 继续只承担兼容壳与编排入口

这一步进一步强化了 `event` 作为“已有规则中心 + 渐进式 UI 收口”样板模块的成立性。
