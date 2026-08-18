# @deepseek-ai/dsh-llm-model-policy

[English](README.md) | 中文

面向 Harness LLM seam 的跨提供方逻辑模型策略。一个插件实例注册一个逻辑提供方，发布稳定的逻辑模型名，并按优先级把请求发送到多个 pi-ai 物理提供方路由。插件同时向 Host 模型选择 API 提供 GPT-only 会话级 Fast 控制器。插件是可选的，不改变已发布的默认组合。

插件拥有其路由使用的物理提供方 profile。同一 Cordis 组合中，不要让其他 `ctx.llm` 适配器再次注册这些物理提供方 id。本包复用 `@deepseek-ai/dsh-llm-pi-ai` 的凭据解析、图片转换、思考参数转换、回放状态和流式协议实现。

## Config

`providers` 使用与 `@deepseek-ai/dsh-llm-pi-ai` 相同的 profile 字段。`models` 为每个逻辑模型定义输出上限、思考策略、输入模态、可选默认服务等级、Fast 能力和有序物理候选路由。

```yaml
- id: model-policy
  name: '@deepseek-ai/dsh-llm-model-policy'
  config:
    providerId: gpt-policy
    displayName: GPT Policy
    providers:
      aihub:
        apiKeyEnv: AIHUB_API_KEY
        api: openai-responses
        baseURL: https://aihub.example/v1
        models:
          - id: gpt-5.6
            name: GPT-5.6
            contextWindow: 262144
            maxTokens: 128000
            input: [text, image]
            reasoningEfforts:
              off:
              low: low
              medium: medium
              high: high
      backup:
        apiKeyEnv: BACKUP_API_KEY
        api: openai-responses
        baseURL: https://backup.example/v1
        models:
          - id: gpt-5.6
            name: GPT-5.6
            contextWindow: 131072
            maxTokens: 65536
            input: [text]
            reasoningEfforts:
              off:
              high: high
    models:
      gpt-5.6:
        maxTokens: 128000
        input: [text, image]
        reasoning:
          default: high
          allowed: [off, low, medium, high]
        serviceTier: fast
        supportsFast: true
        routes:
          - provider: aihub
            model: gpt-5.6
            priority: 10
          - provider: backup
            model: gpt-5.6
            priority: 20
```

只有当至少一个物理候选路由声明了图片能力时，逻辑模型才会发布图片输入。图片请求会排除纯文本候选路由。只有至少一个候选路由支持某个思考档位时，该档位才可用；逻辑默认值必须位于逻辑允许列表中。

`serviceTier: fast` 会映射为当前 OpenAI wire 字段 `service_tier: priority`。`default`、`auto`、`flex`、`scale` 和 `priority` 会按对应值发送。非 OpenAI 兼容路由会拒绝已配置的 service tier，而不是静默丢弃它。

`supportsFast: true` 会在模型选择界面中为该逻辑模型显示 GPT-only Fast 开关。升级前已记录的物理 provider/model 如果与策略 route 完全匹配，也会被 Host 识别为可用 Fast，因此不需要改写已有 history。Host 控制器会把 `model-policy/fast` 写入 session log；下一次请求会把生效的 `serviceTier` 写入 `request/header`，因此恢复 session 后仍然保留。只有带有 `supportsFast: true` 的逻辑模型或匹配的物理 route 可以启用 Fast；未声明该字段的模型会拒绝切换。

在尚未产生任何模型内容时，如果发生限流、服务端、超时、传输或服务等级能力错误，插件可以切换到下一个符合条件的候选路由。流一旦开始产生内容，就继续使用当前路由，避免重试造成部分输出重复。

## API and lifecycle

本包导出 Cordis 函数插件契约、`ModelPolicyAdapter`、Fast 控制器类型、已解析配置类型和 `Config` schema。插件要求 `llm` 服务，通过 `ctx.llm.registerAdapter()` 注册，并在插件 fiber 中提供可选的 `modelPolicy` Host 控制器。物理适配器快照在一次请求内保持不可变，而凭据和附件服务在请求时解析。

## Model Experience

### Routed request context and condition

#### What the model sees

间接通过 `ctx.llm`：选中的物理 pi-ai 提供方会收到逻辑请求的消息、工具、思考选项、输出上限、服务等级和持久化 assistant 回放状态。只有符合图片能力的路由才会由复用的 pi-ai 适配器转换图片块。Fast 请求使用当前 GPT 逻辑模型的物理路由，并向兼容 endpoint 发送 `service_tier: priority`。

#### Token effect

插件不会直接添加提示词文本。提供方 token 用量和思考 token 来自实际物理路由；请求前容量估算使用逻辑模型配置的上下文窗口，或候选路由中声明的最小窗口。

#### KV Cache effect

同一物理路由持续使用时，逻辑请求前缀保持稳定。切换物理路由会移除原路由的 provider-specific 回放元数据，因此不宣称跨提供方复用缓存。

## Known Limitations and Deferred Work

- **无设置编辑器** — 这是可选包，不增加 Web 设置编辑器，也不加入已发布的默认 profile；通过 Cordis 组合挂载后选择逻辑提供方和模型。
- **保守故障切换** — 仅在模型内容开始前切换；部分响应已经产生后不会把它转发到另一个提供方重放。
- **能力声明** — 图片、思考和 GPT Fast 能力是配置声明，并由策略检查；如果 endpoint 错误声明能力，它仍可能在真正请求时拒绝。
- **提供方协议覆盖** — Fast/Priority 只对 OpenAI 兼容的 pi-ai API 实现；其他协议会拒绝该字段，而不是接收虚构的请求选项。
