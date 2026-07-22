# 身份证当前位置单一数据源设计

## 目标

身份证页面的“当前位置”只读取玩家角色档案中的 `profile.currentLocation`。

## 数据边界

- 唯一展示来源：`state.profile.currentLocation`。
- `profile.currentLocation` 为空时显示“未记录”。
- `values.current_location` 不参与身份证当前位置的读取、回退或渲染。
- 本次不修改 `values.current_location` 的存储、同步或 RPG 系统用途。

## 界面行为

身份信息区只生成一条“当前位置”展示项，不再把 RPG 状态中的 `current_location` 追加到该区域。

## 测试

- 当 `profile.currentLocation` 有值时，身份证显示该值。
- 当 `profile.currentLocation` 为空、但 `values.current_location` 有值时，身份证仍显示“未记录”。
- 身份信息区只包含一条“当前位置”展示项。

