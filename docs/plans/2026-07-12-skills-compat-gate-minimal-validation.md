# Skills Compat Gate Minimal Validation (2026-07-12)

## 目的

为 `skills` 模块未来若进入真实 compat 删除 gate 评估时，准备一份最小验证方案。

这份方案当前不代表立即执行删除，只用于提前定义：

- 如果未来调整或删除部分 skills compat 入口
- 最少需要验证哪些行为仍保持不变
- Web / Android / 能力说明层哪几类行为必须一起看

## 验证范围

围绕以下能力进行最小验证：

- `skillCategories()`
- `skillsList()`
- `selectedSkill()`
- `openSkillDetail(id)`
- `closeSkillDetail()`
- `openSkillsApp()`
- `closeSkillsApp()`

## 一、Web 端最小验证

### 1. Skills APP 可以正常打开

验证点：

- 点击桌面 Skills 图标后，Skills APP 正常打开
- 分类下拉、列表区、详情弹层容器正常渲染
- 初始状态下不会直接报错或出现空白主面板

通过标准：

- 无明显脚本报错
- 无整块空白 UI
- Skills APP 主体结构可见

### 2. 分类列表可以正常读取

验证点：

- 分类下拉能正常渲染 `skillCategories()` 返回内容
- 切换分类后，列表能跟随变化
- 空分类或默认分类时，列表状态正常

通过标准：

- 分类项不是空白占位
- 切换分类后列表同步更新
- 不出现 `undefined`、空值错位或残留旧数据

### 3. 技能列表可以正常过滤和渲染

验证点：

- Skills 列表能正常渲染 `skillsList()` 返回结果
- 搜索词或分类条件变化后，列表内容随之变化
- 无结果时，空状态提示正常显示

通过标准：

- 列表项名称、分类、描述正常显示
- 过滤结果与当前 state 一致
- 无结果时不会显示脏数据或上一次残留内容

### 4. 技能详情可以正常打开

验证点：

- 点击任意技能项后，`openSkillDetail(id)` 能正常驱动详情弹层
- 详情区能通过 `selectedSkill()` 读取正确对象
- 标题、分类、方法、参数、返回值、详情说明正常展示

通过标准：

- 详情弹层能打开
- 展示内容与点击项一致
- 不出现打开后仍显示上一条技能详情的错位现象

### 5. 技能详情可以正常关闭

验证点：

- 点击关闭按钮或遮罩层后，`closeSkillDetail()` 能正常关闭详情弹层
- 关闭后再次打开其他技能，内容仍正常切换

通过标准：

- 弹层显隐行为正常
- 无关闭失败、再次打开失效或状态卡死

### 6. Skills APP 可以正常关闭

验证点：

- 调用 `closeSkillsApp()` 后，Skills APP 主界面正常关闭
- 重新打开后，基础列表与详情行为仍正常

通过标准：

- APP 开关状态正常
- 重新进入后无明显初始化异常

## 二、Android 镜像端最小验证

### 1. 模板显示与 Web 一致

验证点：

- Android 镜像中的 Skills APP 能正常打开
- 分类列表、技能列表、详情弹层结构与 Web 行为一致

通过标准：

- 镜像端没有因为 contract 不一致而出现独有错误
- 关键展示行为与 Web 端一致

### 2. 镜像消费入口未失配

验证点：

- `skillCategories()`
- `skillsList()`
- `selectedSkill()`
- `openSkillDetail(id)`
- `closeSkillDetail()`

仍能在镜像模板中正常驱动界面

通过标准：

- 不出现因入口移位导致的空白、按钮失效或弹层失效

## 三、能力说明层最小验证

### 1. 核心 skills 定义说明仍与真实公开面一致

验证点：

- 检查 `publish/skills-definitions-core.js` 中对 Skills APP 相关能力的说明
- 核对 `openSkillsApp()`、`skillsList()`、`skillCategories()` 等方法名与用途描述

通过标准：

- 能力说明与当前真实公开面一致
- 不出现“说明仍写旧入口，但实际实现已迁移”的失配

### 2. Skills 详情展示与定义源一致

验证点：

- Skills APP 中点击技能后展示的字段，能与 skills definitions 源数据对应
- 不因 compat 调整出现字段缺失、命名不一致或内容空白

通过标准：

- `method`、`params`、`returns`、`detail` 等字段展示正常
- UI 展示字段与 definitions 源字段一致

## 四、兼容兜底最小验证

### 1. 初始化边界不报错

验证点：

- 在 Skills APP 尚未显式打开前，若模板或动作路径触发相关读取，不应直接因 compat 或 fallback 移动而报错
- 初始 state 下 `selectedSkill()` 返回空值时，模板显示仍安全

通过标准：

- 不出现 `is not a function`
- 不出现未初始化 state 导致的直接崩溃
- 不出现详情区域空值读取报错

### 2. fallback 行为仍可承接过渡状态

验证点：

- 当正式模块实现未完全替换或调用路径仍混用时，`publish/game.js` 上的薄桥接与 fallback 不应立刻失稳
- 只读查询面与详情选择面仍能在过渡期内提供一致返回

通过标准：

- 不出现桥接存在但返回结构突然变化的情况
- 模板读取面和动作面能共同维持当前行为

## 五、执行顺序建议

若未来真的进入 skills compat 删除 gate，建议验证顺序为：

1. 先跑 Web 端 Skills APP 打开、分类、列表、详情开关
2. 再跑 Android 镜像端同样行为
3. 再核对 `skills-definitions-core.js` 的能力说明一致性
4. 最后验证初始化边界与 fallback 安全性

## 当前阶段结论

`skills` 若未来进入 compat 删除 gate，最小验证不能只看技能列表是否还能显示，至少还必须覆盖：

1. Web 端 Skills APP 打开与详情开关
2. Android 镜像模板同样行为
3. 能力说明层与真实公开面一致性
4. 初始化边界安全性
5. fallback 过渡行为稳定性

只有这些都被纳入验证，`skills` 才有资格从“排序第一的候选对象”继续进入“可执行的真实 compat 删除评估”阶段。
