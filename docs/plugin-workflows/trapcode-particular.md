# Trapcode Particular Workflow Notes

This is public, product-level guidance for generating AEcreate `pending-action.json` modules. It does not contain user project paths or private effect plans.

## Chinese

Trapcode Particular 不应该直接加到原视频素材层上做覆盖粒子。正确的默认流程是：

1. 在目标视频层上方新建一个全合成尺寸的粒子承载 Solid。
2. 将该 Solid 的时间范围限制在效果发生区间，例如 marker 起点到起点后 5 秒。
3. 将该 Solid 的混合模式设为 `ADD` 或 `SCREEN`，让粒子叠加到视频画面上，而不是用黑底挡住原视频。
4. 可选：新建 Light 层或 Null 层作为发射器/控制器，再让 Particular 的发射器参数跟随该控制层。
5. 将 `tc Particular` 加到粒子承载层，而不是原视频层。
6. 后续 `setProperty` / `setKeyframes` / `setExpression` 动作必须使用 `targetRef` 指向粒子承载层。

推荐动作结构：

- `addSolidLayer`：创建粒子承载层，使用 `ref` 命名，例如 `particles`。
- `addLightLayer`：创建可被 Particular 使用的灯光/发射器层，使用 `ref` 命名，例如 `emitter`。
- `addNullLayer`：创建需要表达式或位置控制时的控制层。
- `addEffect` + `targetRef`：把 Particular 加到 `particles` 层。
- `setLayerProperties` + `targetRef`：设置承载层的 `inPoint`、`outPoint`、`blendingMode`、`opacity` 等。

生成方案时的关键原则：原视频层应作为视觉底图保留，Particular 应存在于叠加层/承载层上。除非用户明确要求破坏性处理原视频层，否则不要把 Particular 直接加到 footage 层。

## English

Trapcode Particular should not be applied directly to the original footage layer for overlay particles. The safer default workflow is:

1. Create a full-comp particle carrier solid above the target footage.
2. Limit the carrier's time range to the requested effect span, such as marker time through marker time plus 5 seconds.
3. Set the carrier blending mode to `ADD` or `SCREEN` so particles composite over the footage instead of covering it with a black solid.
4. Optionally create a Light or Null layer as an emitter/control layer, then bind Particular emitter parameters to that control layer.
5. Add `tc Particular` to the carrier layer, not the footage layer.
6. Use `targetRef` on later `setProperty`, `setKeyframes`, and `setExpression` actions so they target the carrier layer.

Recommended action types:

- `addSolidLayer`: creates the particle carrier layer with a `ref`, such as `particles`.
- `addLightLayer`: creates a light/emitter helper layer with a `ref`, such as `emitter`.
- `addNullLayer`: creates a control helper layer for expressions or positional control.
- `addEffect` with `targetRef`: adds Particular to the `particles` layer.
- `setLayerProperties` with `targetRef`: sets carrier `inPoint`, `outPoint`, `blendingMode`, `opacity`, and related layer properties.

The core rule: keep the footage layer as the visual base, and place Particular on a composited carrier/control workflow unless the user explicitly requests destructive footage-layer treatment.
