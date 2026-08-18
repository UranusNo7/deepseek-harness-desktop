# @deepseek-ai/dsh-llm-model-policy

English | [中文](README.zh.md)

Logical cross-provider model policy for the Harness LLM seam. One plugin instance registers one logical provider, publishes stable logical model ids, and sends each request through ordered physical pi-ai provider routes. It also exposes the session-local Host controller for GPT-only Fast mode. It is opt-in and does not change the shipped composition.

The plugin owns the physical provider profiles used by its routes. Do not register the same physical provider ids in another `ctx.llm` adapter in the same composition. The package reuses `@deepseek-ai/dsh-llm-pi-ai` for credentials, image conversion, reasoning conversion, replay state, and wire streaming.

## Config

`providers` uses the same profile fields as `@deepseek-ai/dsh-llm-pi-ai`. `models` gives each logical model its output cap, reasoning policy, input modalities, optional default service tier, Fast eligibility, and ordered physical candidates.

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

The logical model advertises image input only when at least one configured physical route declares it. An image request excludes text-only candidates. A reasoning effort is accepted only when at least one candidate supports it, and the logical default must be in the logical allowed list.

`serviceTier: fast` is mapped to the current OpenAI wire spelling `service_tier: priority`. `default`, `auto`, `flex`, `scale`, and `priority` are passed as their corresponding values. Non-OpenAI-compatible routes reject a configured service tier instead of silently dropping it.

`supportsFast: true` advertises the GPT-only Fast switch in the model-selection UI. The Host controller also recognizes an existing physical provider/model when it exactly matches a configured route, so upgrades do not need to rewrite prior history. It records `model-policy/fast` in the session log; the next request records the effective `serviceTier` in `request/header`, so the mode survives resume. A request rejects Fast unless its selected logical model or matched physical route belongs to a policy with `supportsFast: true`; models without the flag cannot enable it.

A physical failure before any model block is emitted may move to the next eligible candidate for rate-limit, server, timeout, transport, or service-tier capability failures. Once content has started, the stream remains on that route so a retry cannot duplicate partial output.

## API and lifecycle

The package exports the Cordis function-plugin contract, `ModelPolicyAdapter`, the Fast controller types, the resolved configuration types, and the `Config` schema. The plugin requires the `llm` service, registers through `ctx.llm.registerAdapter()`, and provides the optional `modelPolicy` Host controller with the plugin fiber. The physical adapter snapshots are immutable for one request, while credential and attachment services are resolved at request time.

## Model Experience

### Routed request context and condition

#### What the model sees

The selected physical pi-ai provider receives the logical request's messages, tools, reasoning choice, output cap, service tier, and durable assistant replay state through `ctx.llm`. Image blocks are converted by the reused pi-ai adapter only for an eligible image-capable route. Fast requests use the selected GPT logical model's physical routes and send `service_tier: priority` to compatible endpoints.

#### Token effect

No direct prompt text is added. Provider token usage and any reasoning tokens come from the selected physical route; a pre-request capacity estimate uses the logical model's configured context window or the smallest declared candidate window.

#### KV Cache effect

The logical request prefix remains stable while the same physical route is reused. A route switch removes physical replay metadata for the changed route, so provider-specific cache reuse is not claimed across providers.

## Known Limitations and Deferred Work

- **No settings editor** — this opt-in package does not add a Web settings editor or a shipped default profile; mount it through a Cordis composition and select its logical provider/model.
- **Conservative failover** — switching is limited to failures before model content starts; a partially emitted response is not replayed on another provider.
- **Declared capabilities** — image, reasoning, and GPT Fast eligibility are configuration claims checked by the policy; an endpoint that falsely advertises a capability can still reject its request.
- **Provider protocol coverage** — Fast/Priority is implemented for OpenAI-compatible pi-ai APIs; other protocols reject the field rather than receiving an invented request option.
