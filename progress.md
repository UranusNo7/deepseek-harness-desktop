## 2026-08-16 - Task: 内置 Firecrawl 插件并准备 v2.0.3

### What was done

- 将 `@uranusno7/dsh-web-fetch-firecrawl@0.2.0` 作为桌面生产依赖固定到 GitHub commit `e279cd7f928563e8f3606a0160598a3ba48863a8`，使用 Yarn 4 可复现的 codeload tarball URL，并刷新锁文件。
- 在桌面自有 Cordis patch 中禁用 DeepSeek 搜索、选择 Firecrawl search/fetch provider，并以凭据引用名挂载 Firecrawl 插件。
- 新增桌面自有 `standard-firecrawl` 完整预设副本，只修改 `tool-web` 的 search、fetch 和 timeout 配置；未修改 `deepseek-harness/` 子模块。
- 增加 package surface、profile composition 和 packaged-runtime 门禁，确保 preset、patch 和 Firecrawl package 进入 Windows staging tree 与安装包。
- 将根包、桌面包和交接文档版本同步到 `2.0.3`，更新用户迁移说明、双语用户指南、包级发布路径和第三方许可清单。

### Testing

- `corepack yarn install`：通过，解析并安装固定 codeload 依赖。
- `corepack yarn install --immutable`：通过；Yarn 4.18.0 报现有 peer dependency warning（YN0086），未阻断安装。
- `corepack yarn workspace dsh-plugin-desktop typecheck`：通过。
- `corepack yarn workspace dsh-plugin-desktop verify:loader`：通过。
- `corepack yarn workspace dsh-plugin-desktop verify:profile`：通过。
- `corepack yarn workspace dsh-plugin-desktop vitest run tests/profile.spec.ts tests/package.spec.ts`：通过，30 tests。
- `corepack yarn workspace dsh-plugin-desktop check:win-package`：首次因新增断言未规范化 CRLF 而失败；修正断言后重跑通过，9 个 test files、112 tests 全部通过，runtime closure 通过。
- `corepack yarn workspace dsh-plugin-desktop verify:licenses`：通过，519 个生产依赖许可检查通过；`verify:notices` 已更新清单。
- `corepack yarn workspace dsh-plugin-desktop dist:win`：通过，生成并验证 `dsh-plugin-desktop/dist/DSH-Desktop-2.0.3-x64-Setup.exe`；packaged-runtime、ASAR、app.asar.unpacked 和 PE 检查通过。
- 额外静态检查：YAML 解析、preset 与 shipped standard 的允许差异、profile provider 行、桌面 node_modules 与 Windows staging tree 中的插件解析均通过；改动文件明文凭据扫描通过。
- 直接执行 `yarn workspace ... typecheck` 在当前环境因 `yarn` 未加入 PowerShell PATH 失败；使用等价的 `corepack yarn workspace ...` 完成并通过。

### Notes

- `package.json`：根版本更新为 `2.0.3`。
- `yarn.lock`：记录固定 commit codeload URL、包版本、依赖和 checksum。
- `dsh-plugin-desktop/package.json`：桌面版本更新并加入 Firecrawl 生产依赖。
- `dsh-plugin-desktop/cordis.patch.yml`：禁用 DeepSeek 搜索、选择 Firecrawl provider 并挂载插件。
- `dsh-plugin-desktop/agent-presets/standard-firecrawl/agent.cordis.yml`：复制 shipped standard，仅开启 `tool-web.search` 与 `tool-web.fetch`。
- `dsh-plugin-desktop/agent-presets/standard-firecrawl/preset.yml`：写入“标准模式（Firecrawl）”显示名和说明。
- `dsh-plugin-desktop/scripts/verify-packaged-runtime.ts`：加入 Firecrawl preset、patch 关联运行时条目和 package export 检查。
- `dsh-plugin-desktop/tests/package.spec.ts`：增加依赖、patch 和 preset 内容断言。
- `dsh-plugin-desktop/tests/profile.spec.ts`：增加 provider 选择、禁用行和插件配置断言。
- `dsh-plugin-desktop/THIRD_PARTY_NOTICES.md`：加入 Firecrawl MIT 许可条目。
- `dsh-plugin-desktop/README.md`：同步 v2.0.3 安装包与发布版本示例。
- `dsh-plugin-desktop/README.zh.md`：同步中文 v2.0.3 安装包与发布版本示例。
- `HANDOFF.md`：追加 v2.0.3 固定依赖、内置挂载、预设和用户迁移说明；保留任务开始前已有的未提交交接记录。
- `docs/user-guide.md`：记录内置 Firecrawl provider、preset 使用和升级迁移要求。
- `docs/user-guide.en.md`：同步英文内置 Firecrawl provider、preset 使用和升级迁移要求。
- `progress.md`：记录本轮实施与验证证据。
- 回滚点：本轮未提交 commit；保留任务开始前 `HANDOFF.md` 的既有未提交内容，仅移除本轮追加的 8.6 段。其余本轮文件可按 `git diff` 逐文件反向应用；不要对整个 `HANDOFF.md` 执行 `git restore`，以免覆盖既有交接记录；新增 `dsh-plugin-desktop/agent-presets/standard-firecrawl/` 可直接删除。

## 2026-08-18 - Task: 集成 Fast logical model policy 到 Desktop Host/Browser runtime

### What was done

- 将参考实现的 Fast 逻辑模型能力接入发布版 rc.6 运行时：LLM service tier 与 `supportsFast` 类型、pi-ai OpenAI priority 映射、Host session model RPC、remote/client 类型、模型选择 UI、session event 注册和 client-connection 类型转发均通过 Yarn patch 固定到桌面 workspace。
- 将 `@deepseek-ai/dsh-llm-model-policy` 以桌面 vendored 编译包随包发布；Desktop base Cordis row 默认禁用，现有用户 profile 可通过同一 row 启用物理 provider 路由和逻辑模型，Agent presets 继续共享 Host 组合，不复制 policy row。
- Fast 开关位于 reasoning-depth 下方，状态通过 `model-policy/fast` session event 与 Host `session.models`/`session.selectModel` RPC 往返；仅 `supportsFast: true` 的 GPT 逻辑模型可启用，非 GPT 激活和 stale active request 都明确拒绝；未增加 `/fast` slash commands。
- 保持 upstream 子模块、`app.asar.unpacked` 和既有 Firecrawl 组合不变；补充文档、profile/Host/Browser smoke、请求映射、打包闭包和许可验证。为使 Electron runtime 测试与当前 2.0.3 manifest 一致，修正了两处遗留的 2.0.2 期望值；测试 tsconfig 对第三方 Anthropic SDK 声明启用 `skipLibCheck`，不放宽桌面源码类型检查。

### Testing

- `corepack yarn install --immutable`：通过；Yarn 4.18.0 仅报告既有 YN0086 peer dependency warnings。
- `corepack yarn workspace dsh-plugin-desktop typecheck`：通过。
- `corepack yarn workspace dsh-plugin-desktop build`：通过，重新生成 Desktop Host/Client artifacts。
- `corepack yarn workspace dsh-plugin-desktop vitest run tests/fast-policy.spec.ts tests/package.spec.ts tests/profile.spec.ts tests/verify-packaged-runtime.spec.ts`：通过；Fast policy、Host RPC、GPT-only rejection、OpenAI Responses `service_tier: priority`、UI 开关顺序、无 slash command、profile composition 和 packaged-runtime 共 54 tests 通过；后续新增 slash command 断言的 19 tests 也通过。
- `corepack yarn workspace dsh-plugin-desktop test`：通过，32 test files、295 tests 全部通过。
- `corepack yarn workspace dsh-plugin-desktop verify:loader`、`verify:profile`：通过；profile smoke 实际启用 logical policy，并验证 GPT/non-GPT `supportsFast` 和 Web model-selection entry。
- 现有用户 profile 只读 composition smoke：通过，`llm-model-policy` 为 enabled，provider 为 `model-policy`，4 个物理 providers 和 7 个逻辑 models 均被读取；未改写用户 profile/settings。
- `corepack yarn workspace dsh-plugin-desktop verify:licenses`、`verify:notices`：通过，520 个生产包检查完成。
- `corepack yarn workspace dsh-plugin-desktop check:win-package`：通过，9 test files、113 tests、198-node runtime closure 全部通过。
- `corepack yarn workspace dsh-plugin-desktop dist:win` 的前置检查通过；Electron Builder 首次前台调用超过 harness 120 秒限制后，使用同一命令作为受管后台 job 完成，`node scripts/verify-win-installer.ts` 通过，生成并检查 `dsh-plugin-desktop/dist/DSH-Desktop-2.0.3-x64-Setup.exe`。ASAR、`app.asar.unpacked`、policy/UI/Host 依赖和 NSIS 安装器均已验证。

### Notes

- `package.json`：加入 rc.6 Fast patches 的 exact/`^` resolutions，并保持现有 Windows/Firecrawl resolutions。
- `yarn.lock`：锁定所有 Fast patches、client-connection patch 和本地 vendored policy 依赖。
- `patches/dsh-llm@0.1.0-rc.6.patch`：补充 service tier 与 Fast model capability。
- `patches/dsh-llm-pi-ai@0.1.0-rc.6.patch`：补充 OpenAI-compatible `service_tier` 与 Fast→priority 映射。
- `patches/dsh-host-apiproxy@0.1.0-rc.6.patch`：补充 Host session Fast schema、catalog 和 RPC 桥接。
- `patches/dsh-api-remotes@0.1.0-rc.6.patch`：补充 remote/client model policy Fast 类型。
- `patches/dsh-client-ui-model-selection@0.1.0-rc.6.patch`：补充共享 ModelDirectory、Fast UI 开关、RPC 提交和本地化样式。
- `patches/dsh-client-connection@0.1.0-rc.6.patch`：转发新增 Fast 类型到 client API surface。
- `patches/dsh-session@0.1.0-rc.6.patch`：注册 durable `model-policy/fast` event。
- `dsh-plugin-desktop/vendor/dsh-llm-model-policy/package.json`：声明桌面 vendored policy 包及 rc.6 peer 范围。
- `dsh-plugin-desktop/vendor/dsh-llm-model-policy/lib/index.js`：携带参考实现的 Fast policy runtime；其余 `lib/types/**` 与双语 README 为同一发布闭包。
- `dsh-plugin-desktop/package.json`：加入 vendored policy、pi-ai peer provider 和 vendor 发布文件。
- `dsh-plugin-desktop/cordis.patch.yml`：加入默认禁用的 `llm-model-policy` row。
- `dsh-plugin-desktop/scripts/verify-profile-boot.mjs`：在完整 Host/Web profile smoke 中启用并检查 logical policy。
- `dsh-plugin-desktop/scripts/verify-packaged-runtime.ts`：要求 policy package 进入 ASAR、unpacked runtime 和 package resolution。
- `dsh-plugin-desktop/tests/fast-policy.spec.ts`：覆盖 durable event、GPT-only rejection、Host session RPC 和 OpenAI Responses priority 映射。
- `dsh-plugin-desktop/tests/package.spec.ts`：覆盖 vendored closure、UI Fast 顺序和无 slash command。
- `dsh-plugin-desktop/tests/profile.spec.ts`：覆盖默认禁用 row、profile overlay 和 shared Host composition。
- `dsh-plugin-desktop/tests/electron-runtime.spec.ts`：将两处遗留版本期望从 2.0.2 对齐到当前 2.0.3。
- `dsh-plugin-desktop/tsconfig.tests.json`：只对测试使用的第三方声明启用 `skipLibCheck`。
- `docs/user-guide.md`、`docs/user-guide.en.md`：记录 logical model/Fast 使用边界和无 slash command 设计。
- `docs/architecture.md`、`docs/architecture.en.md`：记录 shared Host policy 与请求链路。
- `docs/project-structure.md`、`docs/project-structure.en.md`：记录目录职责、patch/vendor 闭包和 Fast 验证边界。
- `docs/README.md`、`docs/README.en.md`：加入项目结构文档入口。
- `progress.md`：追加本轮实施和验证记录。
- 回滚点：本轮未提交 commit；按上述文件逐项反向应用即可回滚 Fast 集成，删除 `dsh-plugin-desktop/vendor/dsh-llm-model-policy/`、`dsh-plugin-desktop/tests/fast-policy.spec.ts`、`docs/project-structure.md`、`docs/project-structure.en.md` 和 7 个 Fast patch，再恢复根 `package.json`、`yarn.lock`、Desktop package/Cordis/smoke/tests/docs 的对应 diff；不要对整个 `HANDOFF.md`、Firecrawl preset 或其他既有未提交文件执行 `git restore`。

## 2026-08-18 - Task: 修复 2.0.3 使用旧 Firecrawl profile 时无法启动

### What was done

- 用隔离的 2.0.3 packaged runtime 和当前用户 profile 复现了启动失败；失败原因不是 Fast policy，而是 2.0.3 Desktop base layer 新增了 `web-fetch-firecrawl`，旧 profile 的 `insert: web-fetch-firecrawl` 又插入了一次，Loader 因 `duplicate loader entry id` 在启动阶段退出。
- 在 Desktop profile composition 中加入向后兼容迁移：同时处理 profile 层和 `$DSH_HOME/cordis.patch.yml` 的旧 Firecrawl insert，将其转换成对内置 row 的 id-targeted 配置覆盖；不修改用户 profile/settings，保留旧配置中的 credentials、`fetch` 和其他 provider 设置。
- 增加真实 profile-layer 回归测试，并更新双语用户指南，明确升级前不需要进入 UI 或手动修改 profile。

### Testing

- 修复前隔离启动证据：2.0.3 executable 退出码 `1`，stderr 为 `plugin tree failed to load: failed to apply loader entry include (cordis:include): duplicate loader entry id: web-fetch-firecrawl`。
- 修复后使用当前用户 profile 配置（只复制 profile 配置文件到隔离 `$DSH_HOME`）启动 `dist/win-unpacked/DSH Desktop.exe` 15 秒，进程保持存活；stderr 仅有 Node deprecation warning，Electron 日志仅有无 GPU 环境 warning，没有 Loader 错误。
- 当前用户 profile 的 source composition smoke：`llm-model-policy` 仍为 enabled，`web-fetch-firecrawl` 合并后只有 1 个 row。
- `corepack yarn workspace dsh-plugin-desktop typecheck`：通过。
- `corepack yarn workspace dsh-plugin-desktop test`：通过，32 test files、296 tests 全部通过。
- `corepack yarn workspace dsh-plugin-desktop check:win-package`：通过，9 test files、113 tests，198-node runtime closure 全部通过。
- `corepack yarn workspace dsh-plugin-desktop verify:loader`、`verify:profile`：通过。
- `corepack yarn install --immutable`：通过，仍仅有既有 YN0086 peer warning。
- `corepack yarn workspace dsh-plugin-desktop dist:win`：通过；`node scripts/verify-win-installer.ts` 通过，最终产物为 `dsh-plugin-desktop/dist/DSH-Desktop-2.0.3-x64-Setup.exe`，runtime 文件版本为 `2.0.3.0`。

### Notes

- `dsh-plugin-desktop/src/profile.ts`：新增旧 Firecrawl insert 的 profile/home 双层兼容迁移，不写回用户文件。
- `dsh-plugin-desktop/tests/profile.spec.ts`：覆盖旧 profile-layer insert 与内置 row 合并后只保留一个 Loader entry。
- `docs/user-guide.md`：更新中文升级说明，旧 Firecrawl insert 不再是启动前置阻碍。
- `docs/user-guide.en.md`：更新英文升级说明。
- `progress.md`：追加本轮诊断、修复和验证记录。
- 回滚点：保留之前的 Fast 集成；仅移除 `dsh-plugin-desktop/src/profile.ts` 中的 Firecrawl 兼容迁移、对应 `tests/profile.spec.ts` 回归测试和本轮双语文档段落即可。不要恢复整个 `tests/profile.spec.ts`、`docs/user-guide*.md` 或修改用户的 `$DSH_HOME` 文件，以免覆盖上一轮 Fast/Firecrawl 改动。

## 2026-08-18 - Task: 修复 2.0.3 Fast 在 UI 中不可见并发布 2.0.4

### What was done

- 定位到 Fast 不是 Host policy 或 UI 条件问题：2.0.3 的 `dsh-client-connection/lib/client.js` 运行时响应 schema 没有声明 `session.models.fast` 与模型的 `supportsFast`，Browser 解析 Host 响应时把这些字段丢弃，最终 effort pane 收到 `fast: null`。
- 扩展 `dsh-client-connection` Yarn patch 的运行时 schema，同时保留已有类型导出补丁；补充包级回归断言，避免只补 `.d.ts` 而漏掉 Browser wire schema。
- 将根包和桌面包版本提升到 `2.0.4`，同步桌面发布说明，生成新的 Windows x64 安装器；未修改上游 `deepseek-harness/`、已安装 `app.asar.unpacked` 或用户 profile/settings。

### Testing

- `corepack yarn install --immutable`：通过，仅保留既有 YN0086 peer warning。
- `corepack yarn workspace dsh-plugin-desktop typecheck`：通过。
- `corepack yarn workspace dsh-plugin-desktop test`：通过，32 test files、296 tests 全部通过。
- `corepack yarn workspace dsh-plugin-desktop vitest run tests/package.spec.ts tests/fast-policy.spec.ts tests/profile.spec.ts`：通过，3 files、38 tests 全部通过。
- 2.0.4 隔离 packaged runtime 启动成功；通过 Browser 同源 RPC 调用读取 `session.models`，确认 `fast: { active: false, available: true }`，且 `gpt-5.6-luna.supportsFast === true`。
- `node scripts/verify-win-installer.ts`：通过；`dsh-plugin-desktop/dist/DSH-Desktop-2.0.4-x64-Setup.exe` 存在，runtime 文件版本为 `2.0.4.0`。

### Notes

- `patches/dsh-client-connection@0.1.0-rc.6.patch`：新增 Browser 运行时 Fast 状态、`supportsFast` 和 select-model Fast schema。
- `yarn.lock`：更新 client-connection patch 内容哈希。
- `package.json`：根工作区版本更新为 `2.0.4`。
- `dsh-plugin-desktop/package.json`：桌面包版本更新为 `2.0.4`。
- `dsh-plugin-desktop/tests/package.spec.ts`：增加运行时 wire schema 回归检查。
- `dsh-plugin-desktop/tests/electron-runtime.spec.ts`：同步当前产品版本期望值。
- `dsh-plugin-desktop/README.md`、`dsh-plugin-desktop/README.zh.md`：同步 2.0.4 发布命令与产物说明。
- `progress.md`：追加本轮定位、修复和验证记录。
- 回滚点：本轮未提交 commit；如需回到 2.0.3，针对上述文件逐项反向应用本轮差异（移除 patch 中 `lib/client.js` runtime hunk、恢复 patch hash、版本号/测试/README 中的 2.0.3），保留既有 Fast policy、Firecrawl 迁移和其他未列出的改动；不要使用 `git restore` 恢复整个文件或修改用户 `$DSH_HOME`。

## 2026-08-18 - Task: 让已有物理 route 对话也显示并支持 Fast，发布 2.0.5

### What was done

- 确认用户已有历史对话记录的是物理选择 `openai/gpt-5.6-luna`，新对话默认使用逻辑选择 `model-policy/gpt-5.6-luna`；因此旧对话的 Host policy 精确匹配 provider 后原先返回 `fast.available: false`。
- 扩展 Desktop 随包的 model-policy runtime：当已有 session 的物理 provider/model 精确匹配一个 `supportsFast: true` 的策略 route 时，沿用同一 Fast 判定和 durable `model-policy/fast` 事件，不改写旧 history。
- 调整模型选择 UI 在物理 route 没有 `supportsFast` 元数据时保留已开启 Fast，避免旧对话在仅切换 reasoning effort 时被浏览器误关掉；非 GPT route 仍由 Host 明确拒绝 Fast。
- 版本提升到 `2.0.5`，同步双语用户指南、项目结构说明、policy README 和 Windows 发布说明。

### Testing

- `corepack yarn install --immutable`：通过，仅保留既有 YN0086 peer warning。
- `corepack yarn workspace dsh-plugin-desktop typecheck`：通过。
- `corepack yarn workspace dsh-plugin-desktop vitest run tests/fast-policy.spec.ts tests/package.spec.ts tests/profile.spec.ts`：通过，3 files、40 tests 全部通过。
- `corepack yarn workspace dsh-plugin-desktop test`：通过，32 test files、298 tests 全部通过。
- `corepack yarn workspace dsh-plugin-desktop dist:win`：通过，Windows preflight 的 9 files、113 tests 和 198-node runtime closure 全部通过。
- 2.0.5 隔离 packaged runtime 使用复制的真实历史 session 启动成功；Browser `session.models` 对 `openai/gpt-5.6-luna` 返回 `fast: { active: false, available: true }`，随后 `session.selectModel(..., fast: true)` 成功并再次读取为 `active: true`。
- `node scripts/verify-win-installer.ts`：通过；最终安装器为 `dsh-plugin-desktop/dist/DSH-Desktop-2.0.5-x64-Setup.exe`，runtime 文件版本为 `2.0.5.0`。
- `git diff --check`：通过；仅报告既有 CRLF/LF warning，无 whitespace error。

### Notes

- `dsh-plugin-desktop/vendor/dsh-llm-model-policy/lib/index.js`、`dsh-plugin-desktop/vendor/dsh-llm-model-policy/lib/types/index.js`：让逻辑策略按物理 route 识别升级前已有 session 的 Fast 能力。
- `patches/dsh-client-ui-model-selection@0.1.0-rc.6.patch`：保持未知物理 route 的已开启 Fast，交由 Host 校验非 GPT 切换。
- `dsh-plugin-desktop/tests/fast-policy.spec.ts`：增加 legacy physical route 的 policy、Host RPC 和 durable Fast 回归覆盖。
- `dsh-plugin-desktop/tests/package.spec.ts`：增加 route-compatibility runtime 闭包断言。
- `docs/user-guide.md`、`docs/user-guide.en.md`、`docs/project-structure.md`、`docs/project-structure.en.md`：说明已有物理 route 对话的 Fast 兼容行为。
- `dsh-plugin-desktop/vendor/dsh-llm-model-policy/README.md`、`README.zh.md`：同步 policy package 的 route compatibility 契约。
- `package.json`、`dsh-plugin-desktop/package.json`、`dsh-plugin-desktop/tests/electron-runtime.spec.ts`、`dsh-plugin-desktop/README.md`、`README.zh.md`：同步 2.0.5 版本与产物说明。
- `yarn.lock`：更新 vendor policy 与 UI patch 内容哈希。
- `progress.md`：追加本轮诊断、修复和验证记录。
- 回滚点：本轮未提交 commit；如需回到 2.0.4，仅反向移除上述 route compatibility runtime/UI hunk、legacy 测试、文档说明和 2.0.5 版本/lock hash，保留 2.0.4 的 client-connection wire schema、Fast policy、Firecrawl 迁移及其他未列出的改动；不要使用 `git restore` 恢复整个文件或修改用户 `$DSH_HOME`。
