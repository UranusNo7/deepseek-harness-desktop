# DSH Desktop 项目结构

DSH Desktop 是围绕固定版本 DeepSeek Harness 的外层桌面产品。依赖、Host 组合和发布闭包由外层 Yarn workspace 管理；官方上游子模块保持独立的 pnpm workspace。

## 目录职责

- `dsh-plugin-desktop/`：桌面产品的唯一实现边界，包含 Electron 启动、Desktop Host/Client face、profile 组合、内置 preset、发布脚本和验证测试。
- `dsh-plugin-desktop/cordis.patch.yml`：桌面基础 Host 组合。逻辑模型策略 row 在这里随包提供但默认禁用；用户 profile 可用相同 row id 提供物理 provider 路由和逻辑模型配置。
- `dsh-plugin-desktop/vendor/dsh-llm-model-policy/`：桌面随包携带的 `@deepseek-ai/dsh-llm-model-policy` 编译包。它不是上游源码副本的可编辑 workspace，而是从既有 Fast 实现导出的发布闭包。
- `patches/`：针对发布版 `@deepseek-ai/dsh-*@0.1.0-rc.6` 的 Yarn patches。Fast 涉及 LLM 类型与请求层、pi-ai service tier、Host session RPC、remote/client 类型、模型选择 UI、session event 注册，以及 client-connection 类型转发。
- `deepseek-harness/`：固定的官方上游子模块，只读使用，桌面分支不得编辑。
- `docs/`：产品、架构和维护者文档；行为或部署边界发生变化时同步更新。
- `progress.md`：按日期追加的实施与验证记录，不改写历史记录。

## Fast 请求链路

1. profile 在 Host 组合层启用 `llm-model-policy`，策略把逻辑模型映射到物理 provider route。
2. Host 通过 `session.models` 返回当前模型、GPT-only `supportsFast` 和 session Fast 状态；已有 session 的物理 provider/model 若精确匹配策略 route，也使用同一 Fast 判定；`session.selectModel` 统一提交模型、reasoning effort 和 Fast 开关。
3. 模型选择器在 reasoning-depth 下方渲染 Fast，并通过共享 `ModelDirectory` 回写 Host，不使用浏览器本地独立状态。
4. 策略把开关状态追加为 `model-policy/fast` session event；Agent request waterfall 读取最新事件并在 Fast 模式发送 `serviceTier: "fast"`。
5. pi-ai 对支持 service tier 的 OpenAI-compatible API 发送 `service_tier: "priority"`。非 GPT 逻辑模型的 Fast 激活或请求会在 Host 明确拒绝。

## 构建与验证边界

根目录使用 Yarn 4；常规桌面闭环从 `corepack yarn install --immutable`、桌面 build/typecheck、Vitest 和 Loader/profile smoke 开始。Windows/macOS 发布验证还要检查 `app.asar`、`app.asar.unpacked`、运行时依赖闭包和安装器。任何验证都必须保持 headless-safe，不自动启动图形窗口。
