# HANDOFF — deepseek-harness-desktop 工作交接

> 目的：后续任务将在此仓库内开新对话继续。**新对话开始时，先读本文件**，再读仓库根 `AGENTS.md`（仓库规则）。
> 更新：2026-08-16 · 交接人：上一轮会话（UranusNo7 fork 的 DSH Desktop 修复工作）

---

## 1. 项目背景与两个仓库的关系

- **本仓库**：`D:\python_code\deepseek-harness-desktop` —— 是 [anywhere-labs/deepseek-harness-desktop](https://github.com/anywhere-labs/deepseek-harness-desktop) 的 fork，远端 `origin` = `https://github.com/UranusNo7/deepseek-harness-desktop.git`（master 分支）。
- **桌面版本质**：Electron 薄壳。官方 DeepSeek Harness（core）以**固定版本 submodule** 形式钉在 `deepseek-harness/`（上游 `deepseek-ai/deepseek-harness@47f9438`，架构文档见 `docs/architecture.md`）。
- **官方 core 的本地副本**（供参考修复来源）：`D:\python_code\deepseek-harness-master` —— 这是 **ZIP 解压，无 git**，所有修复记录在它的 `progress.md`。
- **桌面层铁律**（仓库 `AGENTS.md` 明令）：**绝不编辑 `deepseek-harness/` 子模块内部文件**。core 的修复只能以「桌面自有层」方式带入：要么桌面 profile/preset 覆盖，要么 Yarn patch 覆盖 npm 依赖产物。
- 桌面端实际消费的 core 能力来自 **npm 发布的 `@deepseek-ai/dsh-*@0.1.0-rc.6`**（非子模块源码），因此 core 的本地修复（未发布 npm）必须通过桌面自有机制透传。

## 2. 已完成工作（两轮修复，均已发布 release）

### 2.1 v2.0.1 — minimal 预设 Windows 兼容修复（core progress.md 第一条）
| 项 | 内容 |
|---|---|
| 问题 | 极简模式硬编码持久 bash PTY 栈，win32 无终端检查实现，完全不可用 |
| 机制 | **桌面自有 preset 覆盖**：`dsh-plugin-desktop/agent-presets/minimal/` 先于 shipped 根解析（同 id 早 root 胜出） |
| 关键文件 | `dsh-plugin-desktop/agent-presets/minimal/agent.cordis.yml`（`!!js` 平台门控：POSIX 持久 bash / win32 一次性 `tool-pwsh`）、`preset.yml`；`dsh-plugin-desktop/src/profile.ts` 的 `desktopPresetRoot()` + `agent-presets` roots 前置；`package.json` 的 `files`/`asarUnpack` 加 `agent-presets/**`；`scripts/verify-packaged-runtime.ts` 加必备条目；`tests/profile.spec.ts`、`tests/package.spec.ts` 同步断言 |
| 版本 | 2.0.0 → 2.0.1，tag `v2.0.1`，release 已生成 |

### 2.2 v2.0.2 — dsh-tool-pwsh danger-full-access 升级字段修复（core progress.md 第二条）
| 项 | 内容 |
|---|---|
| 问题 | 有效权限模式已是 `danger-full-access` 时，模型携带的 `sandbox_permissions`/`justification` 仍走严格配对 + 审批，阻断执行 |
| 机制 | **Yarn patch**（因是 npm 包代码行为修复，profile 层无法覆盖）：`patches/dsh-tool-pwsh@0.1.0-rc.6.patch` + 根 `package.json` `resolutions` 挂 `patch:` 协议（`@deepseek-ai/dsh-tool-pwsh@npm:^0.1.0-rc.6` key） |
| 内容 | 对 npm 包构建产物 `lib/index.js` 两处等价改动：① `validatePwshArgs` 移除无条件 `validateEscalationArgs`；② `execute` 加 `effectiveMode !== "danger-full-access"` 门控（配对校验与 `approvePwshEscalation` 均跳过）。先例：`dsh-sandbox-windows-acl` patch 完全同构 |
| 版本 | 2.0.1 → 2.0.2，tag `v2.0.2`，release 已生成 |

## 3. 发布流程（已验证可复现）

1. **版本 bump**：根 `package.json` 与 `dsh-plugin-desktop/package.json` 的 `version` **必须同步改**（`tests/package.spec.ts` 断言两者相等）。
2. `corepack yarn install` 刷新 `yarn.lock`（含 workspace resolution 与 patch hash）。
3. 本地验证（见 §4）。
4. `git add` + `git commit` + `git push origin master`。
   - 只要**不涉及 `.github/workflows/*` 文件**，现有 gh 凭据即可推送。
   - 若改动 workflow 文件：当前 gh OAuth token **无 `workflow` scope** 会被拒绝；上轮用用户提供的 PAT 通过 `https://x-access-token:<PAT>@github.com/...` 的 URL 方式推送成功。**该 PAT 已暴露在进程/命令行，建议用户吊销**（已在上一轮提醒）。
5. 打 tag 触发 CI：`git tag -a vX.Y.Z -m "..." && git push origin refs/tags/vX.Y.Z`。
6. CI：`.github/workflows/release.yml`（`release-windows`）在 `windows-latest` 上跑 `corepack yarn install --immutable` → `yarn workspace dsh-plugin-desktop dist:win`（内部先跑 `check:win-package`）→ `softprops/action-gh-release@v2` 上传 `dsh-plugin-desktop/dist/DSH-Desktop-*-x64-Setup.exe` 到 release（触发条件：`v*` tag push 或 `workflow_dispatch`）。
7. 监控/验证：`gh run list --repo UranusNo7/deepseek-harness-desktop`；`gh run watch <id>`；`gh release view <tag> --json assets`。

## 4. 本地验证命令（桌面仓库根目录执行）

```sh
corepack yarn install --immutable      # 首次/依赖变化后
corepack yarn workspace dsh-plugin-desktop typecheck
corepack yarn workspace dsh-plugin-desktop build
corepack yarn workspace dsh-plugin-desktop verify:closure
# Windows 相关测试子集（即 CI check:win-package 用的集合，全部应通过）：
corepack yarn workspace dsh-plugin-desktop vitest run ^
  tests/profile.spec.ts tests/package.spec.ts tests/package-win.spec.ts ^
  tests/update-checker.spec.ts tests/update-download.spec.ts ^
  tests/verify-win-installer.spec.ts tests/verify-packaged-runtime.spec.ts ^
  tests/windows-pwsh-sandbox.spec.ts tests/window-options.spec.ts
```

**重要**：`vitest run`（全量）在 Windows 宿主上有 19 个**既有**失败——全是 macOS/linux 平台用例（`verify-mac-release.spec.ts`、`desktop-runtime-environment.spec.ts` 等路径/权限断言）与 `updates.spec.ts` 文件权限断言，**与本仓库改动无关**，勿误判。CI 只用上述 Windows 子集。

## 5. 红线与注意事项

- **绝不编辑 `deepseek-harness/` 子模块**（含 commit、bump 指针需单独评估——它指向 `deepseek-ai` 上游，本 fork 无法推送）。
- **两处覆盖都是冻结副本**：上游一旦合入/发布对应修复（新 npm 版本或新 submodule commit），应移除桌面覆盖并 bump，避免长期双轨维护。
  - minimal 覆盖移除点：`dsh-plugin-desktop/agent-presets/minimal/` + `profile.ts` 的 `desktopPresetRoot()` 前置逻辑。
  - pwsh patch 移除点：`patches/dsh-tool-pwsh@0.1.0-rc.6.patch` + 根 `package.json` resolutions 对应行。
- **发布包未签名**（unsigned）：`dist:win` 显式 `--config.win.signExecutable=false`，Windows SmartScreen 提示属预期；正式签名是独立步骤。
- **Node 要求**：^22.19.0 或 24.x（本地 Node v24.19.0 + corepack，Yarn 4.18.0）。
- 本仓库是 `UranusNo7` 的**个人 fork**，非官方；发布产物不代表 DeepSeek 官方。

## 6. 后续任务建议路径（如适用）

- **core 再出新修复**：先读 `D:\python_code\deepseek-harness-master\progress.md`（那里有每轮修复的 What/Testing/Notes/回滚方式）；判断是配置类（→ preset 覆盖）还是 npm 包代码行为类（→ Yarn patch），按 §2 的先例执行，再按 §3 发布。
- **上游合入后回退桌面覆盖**：见 §5 移除点。
- **扩展发布矩阵**（可选）：在 `release.yml` 增加 macOS job（`dist:mac` 需要 macOS runner、签名/公证配置）。

## 7. 关键路径速查

| 关注点 | 路径 |
|---|---|
| 桌面 preset 覆盖 | `dsh-plugin-desktop/agent-presets/minimal/` |
| 桌面 profile 组合（preset roots、win32 覆盖） | `dsh-plugin-desktop/src/profile.ts`（`prepareDesktopProfile`） |
| Yarn patch 挂载 | 根 `package.json` `resolutions` + `patches/*.patch` |
| 打包必备条目校验 | `dsh-plugin-desktop/scripts/verify-packaged-runtime.ts` |
| Windows 打包入口 | `dsh-plugin-desktop/scripts/package-win.ts`（`dist:win`） |
| 发布 workflow | `.github/workflows/release.yml` |
| 官方 core 修复记录 | `D:\python_code\deepseek-harness-master\progress.md` |
| 桌面仓库架构文档 | `docs/architecture.md`、`docs/why-desktop.md` |

## 8. 当前仓库状态（交接时点）

- 远端 `origin/master` = `95d3fa1a50`（HANDOFF 提交）；本地 `master` 已合入上游同步 = `3566d24a2e`（**尚未推送**，见 8.1）。
- 已发布 release：`v2.0.1`、`v2.0.2`（均含 Windows x64 NSIS 安装包资产）。
- 本地依赖已安装（`node_modules` 就绪）；`.yarn/` 仅含 install-state（gitignore 规则：`.yarn/*` 忽略、`.yarn/patches` 放行——当前无遗留 patch 在 `.yarn/patches`，统一放根 `patches/`）。

### 8.1 上游同步（2026-08-16，分支 `sync/upstream-20260816`）

- 已用 Clash 代理（`127.0.0.1:7890`，已写入本仓库 `.git/config` 的 `http.proxy`/`https.proxy`）拉取上游 `anywhere-labs/deepseek-harness-desktop:master`，同步至 `f94a18e6ac`。
- 合并提交 `aa5fff2c2e`：解决 `package.json` 与 `dsh-plugin-desktop/package.json` 的 version 冲突，保留 fork 版本 `2.0.2`；上游带入的 Windows 卷诊断、win32 pwsh 路径、CI 门禁、Windows 全量测试可移植化、NSIS `useZip`、许可证门禁等已全部进入。
- 追加提交 `25ff0ddc1f`：应用上游未合并 PR #90 的 koffi `3.1.5` pin（修复 Windows x64 workspace-write 沙箱 segfault），并重生成 Windows 版 `THIRD_PARTY_NOTICES.md`。
- 增量合并提交 `3566d24a2e`：上游随后新增的 `f94a18e6ac`（向 Host 插件暴露 `dsh` 命令）已合入。
- 验证：`yarn workspace dsh-plugin-desktop check` 全绿（build/typecheck/286 tests/closure/cli/loader/profile/licenses）；`dist:win` 成功产出并验证 `dsh-plugin-desktop/dist/DSH-Desktop-2.0.2-x64-Setup.exe`；Electron 二进制已重新下载到 `dsh-plugin-desktop/node_modules/electron/dist`。
- 待办：推送 `master`/`sync/upstream-20260816`。推送含 `.github/workflows/ci.yml` 增删，当前 gh token 无 `workflow` scope 被 GitHub 拒绝，需带 `workflow` scope 的 PAT 或重新授权；若要发版再同步 bump 版本并打 tag。

### 8.2 Firecrawl 决策记录（2026-08-16，已选路径 A：等 npm 发布）

- **现状**：用户在本机 core 副本（`D:\python_code\deepseek-harness-master`）添加了 `@deepseek-ai/dsh-web-fetch-firecrawl`（fetch/deep-scrape provider，`ctx.web.registerFetchProvider`，`FIRECRAWL_API_KEY`）。该包**不在** npm（404）、不在桌面 submodule 钉点（`47f9438` 的 `packages/web/` 无此目录）、不在桌面依赖树（yarn.lock 无 firecrawl 匹配）。桌面端构建（yarn install + dist:win）只消费 npm `@deepseek-ai/dsh-*@0.1.0-rc.6`，**不会**读取 core 本地副本或 submodule 源码 → 当前 v2.0.x 安装包无 firecrawl。
- **决策**：路径 A（等上游发布到 npm 后再 bump + 挂载）；路径 B（桌面自有 vendor/patch）已否决——npm 无该包时 Yarn patch 不可用，vendor 会产生冻结副本。
- **等待信号**：`npm view @deepseek-ai/dsh dist-tags` 出现 `latest > 0.1.0-rc.6`，且 `npm view @deepseek-ai/dsh-web-fetch-firecrawl version` 不再 404。
- **发布后执行清单**：
  1. bump `dsh-plugin-desktop/package.json` 全部 `@deepseek-ai/dsh-*` 依赖到新版本（与 `@deepseek-ai/dsh` 一致），`corepack yarn install` 刷新 lockfile；
  2. 在桌面 profile 组合挂载 `web-fetch-firecrawl` 行（`dsh-plugin-desktop/cordis.patch.yml` 的 `insert` 段：`- id: web-fetch-firecrawl` / `name: '@deepseek-ai/dsh-web-fetch-firecrawl'` / `config: { apiKeyEnv: FIRECRAWL_API_KEY }`），并按新版本包文档确认 fetch provider 选择配置（`web`/`web-runtime` 行）；
  3. 本地验证（typecheck、Windows 测试子集、build）→ 版本 bump → commit/push → tag → CI release（§3 既有流程）。
