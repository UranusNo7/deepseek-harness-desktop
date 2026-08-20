# @deepseek-ai/dsh-fast

[English](README.md) | 中文

可插拔的 Fast 服务层级插件。在任意 `cordis.yml` 中加入 `@deepseek-ai/dsh-fast` 即可启用——删掉该行即可禁用，无需改其他包。

## 功能

* 拥有持久化 `fast/mode` 事件（旧 `model-policy/fast` 同等折叠）与 `FastController`（`ctx.fast`）。
* 通过声明合并为 `LlmServiceTierMap` 增加 `fast`，为 `LlmModelInfo` 增加 `supportsFast`——核心 `dsh-llm` 不硬编码 Fast。
* 在 `agent/request` 瀑布中当 `foldFastMode(session.events) === true` 时注入 `serviceTier: 'fast'`，关闭时剥离陈旧的 `fast` 层级。

模型通过适配器的 `LlmModelInfo` 声明 `supportsFast: true`；插件不硬编码模型列表。请求路径在模型策略插件存在时仍通过其校验。

## 人机命令

当组合了 `ctx.commands` 时，插件注册 `/fast [on|off|status]`（裸 `/fast` 为切换）。命令直接追加 `fast/mode`，无需模型轮次。

```sh
/fast        # 切换
/fast on     # 开启
/fast off    # 关闭
/fast status # 查看
```

`dsh-codex-model-policy` 中的 UI 开关仍是主要入口；命令是非 UI 的替代方案，桌面端 AI 也可驱动。

## 组合

```yaml
- id: fast
  name: '@deepseek-ai/dsh-fast'
```

无配置。插件仅运行于 host，无 client 部分。

## Model Experience

插件不增加系统提示。它在 `fast/mode` 激活时通过 `agent/request` 瀑布注入 `serviceTier: 'fast'`，并通过 `LlmModelInfo` 扩展通告 `supportsFast`。该层级属于 `request/header`，因此切换时会参与缓存前缀计算；`fast/mode` 事件本身仅写入日志。

#### Token 与缓存

切换 Fast 会改变下一条 `request/header` 的 `serviceTier` 字段，因此从该点起组装出的前缀不同，切换后的首个请求会错过之前的缓存。后续同层级的请求正常复用缓存；`fast/mode` 事件本身不携带其他权重。

## Known Limitations and Deferred Work

- Fast 的 UI 目前由 `dsh-codex-model-policy` 拥有；未来可拆出独立的 Fast UI。
