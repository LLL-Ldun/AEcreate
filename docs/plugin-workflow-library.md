# Plugin Workflow Library

AEcreate keeps a built-in plugin workflow library so scanned plugin parameters are not treated as isolated controls. The library helps Codex decide whether an effect should be placed on the source layer, an adjustment layer, a solid carrier, or helper layers such as lights and nulls.

## Chinese

扫描插件时，工具会同时生成 workflow 信息：

- `effect-params/*.json`：单个插件的参数树和 workflow。
- `effect-workflows.json`：当前 AE 已安装效果对应的 workflow 目录。
- `current-context.json`：内置 workflow 库和支持的结构化动作类型。

当前内置策略：

- 粒子 / 生成器类：优先新建 Solid 承载层，必要时配合 Light 或 Null 控制层，再把插件加到承载层上，用 `ADD` / `SCREEN` 等方式叠加到原视频。
- 冲击 / 发光 / 模糊 / 抖动 / 调色 / 故障类：优先新建调整层，将插件加到调整层上，并把调整层裁到 marker 附近的效果区间。
- 变速 / 回溯 / 补帧类：优先作用在源素材层或预合成层上，因为这类插件通常需要改变素材时间关系。
- 未匹配插件：标记为 `unknown`，保留参数树，并写入后续联网补全所需的官方文档和教程搜索线索。

这个库不是只服务 Particular。Particular、Twitch、Deep Glow、RSMB、Twixtor 只是第一批能被规则识别的代表。后续扫描到库里没有的插件时，Codex 可以根据 `onlineResearch.queries` 去官方说明或高质量教程里补充 workflow，再把新规则沉淀进库。

## English

When plugins are scanned, AEcreate now emits workflow metadata together with parameter data:

- `effect-params/*.json`: per-plugin parameter tree plus workflow.
- `effect-workflows.json`: workflow catalog for currently installed AE effects.
- `current-context.json`: built-in workflow library and supported structured action types.

Built-in strategies:

- Particle / generator effects: create a solid carrier, optionally add Light or Null helpers, apply the plugin to the carrier, then composite with `ADD` / `SCREEN`.
- Impact / glow / blur / shake / color / glitch effects: create a trimmed adjustment layer and apply the plugin there.
- Retime / interpolation effects: target the source footage or precomp layer because these effects change source timing.
- Unknown plugins: preserve the scanned parameter tree, mark the workflow as `unknown`, and include future online-research queries for official docs or high-quality tutorials.

The workflow library is generic. Particular, Twitch, Deep Glow, RSMB, and Twixtor are only initial recognizable examples; unsupported plugins can be researched later and promoted into the built-in library.
