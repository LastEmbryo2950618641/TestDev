# Android Settings Contract Sync Audit

日期：2026-07-12
范围：`mobile/android-webview-shell/app/src/main/assets/publish/index.html` 剩余 `settings/model` 模板旧段
目标：证明删除旧模板散读逻辑时，功能已被主真源与现有 settings view helpers 承接。

## 旧项与新承接

1. 文本模型选择
- 旧模板：`modelId` + `selectTextModel(...)`
- 新承接：`textModelSectionView()`

2. 绘图平台选择
- 旧模板：`settingsState.drawProvider` + `selectDrawProvider(...)`
- 新承接：`drawProviderSectionView()`

3. PixAI Base URL
- 旧模板：`settingsState.pixaiBaseUrl`
- 新承接：`drawProviderSectionView().showPixaiConfig` + `pixaiBaseTitle`

4. PixAI API Key
- 旧模板：`settingsState.pixaiApiKey`
- 新承接：`drawProviderSectionView().showPixaiConfig` + `pixaiKeyTitle`

5. 绘图模型选择
- 旧模板：`selectedDrawModelId()` + `currentDrawModels()`
- 新承接：`drawModelSectionView()`

6. PixAI modelVersionId
- 旧模板：`settingsState.pixaiModelVersionId`
- 新承接：`drawModelSectionView().showPixaiModelVersion`

7. PixAI mode
- 旧模板：`settingsState.pixaiMode`
- 新承接：`drawModelSectionView().showPixaiMode`

8. 文本模型测试按钮与状态
- 保留在主真源 settings 模板中
- 未被 Android 本轮收束删除功能，只是与新 section 布局重新对齐

9. system role test 入口
- 已迁移到独立 `systemTestState` 面板
- 不再依赖旧配置块内联承载

10. 当前模型摘要
- 旧模板散读 provider/model 字段
- 新承接：当前主真源仍保留摘要展示，且 helper 已提供 `currentModelSummaryView()`

## 判定

- 本批次属于“旧配置模板残段整体收束”，不是新增功能。
- 允许在 Android 镜像中出现较大的模板区块替换，只要替换后的结构与 `publish/index.html` 当前主真源一致。
- 验证重点是：功能承接存在、Android 资产同步校验通过、未夹带配置区之外的主题块。
