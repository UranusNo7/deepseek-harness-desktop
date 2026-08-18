# DSH Desktop project structure

DSH Desktop is the outer desktop product around a pinned DeepSeek Harness checkout. The outer Yarn workspace owns dependencies, Host composition, and release closure; the upstream submodule keeps its own pnpm workspace.

## Directory responsibilities

- `dsh-plugin-desktop/`: the desktop product boundary, including Electron startup, Desktop Host/Client faces, profile composition, built-in presets, release scripts, and verification tests.
- `dsh-plugin-desktop/cordis.patch.yml`: the base Desktop Host composition. The logical model policy row ships here but is disabled by default; a user profile can reuse the same row id with physical provider routes and logical model configuration.
- `dsh-plugin-desktop/vendor/dsh-llm-model-policy/`: the packaged compiled `@deepseek-ai/dsh-llm-model-policy` dependency. It is a desktop release closure copied from the existing Fast implementation, not an editable upstream workspace.
- `patches/`: Yarn patches for published `@deepseek-ai/dsh-*@0.1.0-rc.6` artifacts. Fast spans LLM types and request configuration, pi-ai service tiers, Host session RPCs, remote/client types, model-selection UI, session event registration, and client-connection type forwarding.
- `deepseek-harness/`: the pinned official upstream submodule. It is read-only from Desktop branches.
- `docs/`: product, architecture, and maintainer documentation; update it when behavior or deployment boundaries change.
- `progress.md`: append-only dated implementation and verification record.

## Fast request path

1. A profile enables `llm-model-policy` in Host composition; the policy maps logical models to physical provider routes.
2. Host `session.models` returns the current model, GPT-only `supportsFast`, and session Fast state; an existing session's physical provider/model receives the same Fast decision when it exactly matches a policy route; `session.selectModel` submits the model, reasoning effort, and Fast switch through one path.
3. The model selector renders Fast below reasoning depth and writes through the shared `ModelDirectory` to Host instead of keeping a separate browser-local state.
4. The policy appends the latest switch as a `model-policy/fast` session event; the Agent request waterfall reads it and sends `serviceTier: "fast"` in Fast mode.
5. pi-ai sends `service_tier: "priority"` to OpenAI-compatible APIs that support service tiers. Host explicitly rejects Fast activation or requests for non-GPT logical models.

## Build and verification boundary

The root uses Yarn 4. The normal desktop loop starts with `corepack yarn install --immutable`, then the desktop build/typecheck, Vitest, and Loader/profile smokes. Windows/macOS release verification additionally checks `app.asar`, `app.asar.unpacked`, the runtime dependency closure, and the installer. Verification remains headless-safe and must not launch a graphical window automatically.
