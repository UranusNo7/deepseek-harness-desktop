<h1 align="center">DeepSeek Harness Desktop（DSH Desktop）</h1>

<p align="center">
  <strong>面向 Windows 和 macOS 的开源 DeepSeek Harness 桌面客户端。</strong><br>
  内置 Electron、Node.js、pnpm 和固定版本的 DSH 依赖，无需配置命令行环境，下载安装即可使用。
</p>

<p align="center"><sub>社区维护的开源项目，并非 DeepSeek 官方产品。中文 · <a href="README.en.md">English</a></sub></p>

<p align="center">
  <img src="assets/desktop-hero-zh.jpg" alt="DeepSeek Harness 桌面端" width="100%">
</p>

<p align="center">
  <a href="https://github.com/anywhere-labs/deepseek-harness-desktop/releases/latest"><img src="https://img.shields.io/github/v/release/anywhere-labs/deepseek-harness-desktop?style=flat&amp;label=release&amp;color=4D6BFE" alt="Latest release"></a>
  <a href="https://github.com/anywhere-labs/deepseek-harness-desktop/releases"><img src="https://img.shields.io/github/downloads/anywhere-labs/deepseek-harness-desktop/total?style=flat&amp;label=downloads&amp;color=4D6BFE" alt="Total downloads"></a>
  <a href="https://github.com/anywhere-labs/deepseek-harness-desktop"><img src="https://img.shields.io/github/stars/anywhere-labs/deepseek-harness-desktop?style=flat&amp;label=%E2%98%85&amp;color=08C" alt="GitHub stars"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-2EA44F?style=flat" alt="MIT License"></a>
  <a href="https://discord.gg/TJeGqKRNM"><img src="https://img.shields.io/badge/Discord-5865F2?style=flat&amp;logo=discord&amp;logoColor=white" alt="Join Discord"></a>
  <img src="https://img.shields.io/badge/macOS%20%7C%20Windows-4493F8?style=flat-square" alt="Supported platforms: macOS and Windows">
</p>

<p align="center">
  <img src="assets/desktop-preview.png" alt="DeepSeek Harness Desktop 界面预览" width="100%">
</p>

DSH Desktop 把 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的本地 Web UI、Host 服务和插件系统装进原生桌面应用。官方 Harness 以固定版本原样运行；Desktop 负责窗口、托盘、终端、更新和工作配置，并通过官方插件机制与 Harness 组合。

<a id="run"></a>

## 下载与安装

当前正式安装包支持 Windows x64 和搭载 Apple 芯片的 macOS。普通用户不需要单独安装 Node.js、pnpm 或 DSH。

| 平台 | 下载 | 安装方式 |
| --- | --- | --- |
| Windows x64 | [下载安装程序](https://www.dshdesktop.cn/api/downloads/windows) | 运行 NSIS 安装程序并按提示完成安装 |
| macOS Apple Silicon | [下载 DMG](https://www.dshdesktop.cn/api/downloads/mac) | 打开 DMG，将 DSH Desktop 拖入 Applications |

也可以从 [GitHub Releases](https://github.com/anywhere-labs/deepseek-harness-desktop/releases/latest) 获取安装包和 SHA-256 摘要。首次启动会创建默认 `desktop` profile，并在本机启动官方 DSH Web 界面。详细步骤、插件命令和故障排查见[用户指南](docs/user-guide.md)与[常见问题](docs/faq.md)。

我们希望和所有插件作者一起，构建一个开放、可组合、可持续的 DSH 插件生态，让每个插件都能与其他插件共同进步：[DSH 插件生态倡议书](docs/plugin-ecosystem.md)。

## 文档

普通用户从[用户指南](docs/user-guide.md)开始即可；开发者文档只在需要扩展或维护时才需要阅读。

### 用户文档

| 目标 | 入口 |
| --- | --- |
| 安装和日常使用 | [用户指南](docs/user-guide.md) |
| 快速确认平台、环境和使用边界 | [常见问题](docs/faq.md) |
| 了解项目为什么存在 | [为什么做 DSH Desktop](docs/why-desktop.md) |
| 查看全部文档与 README 分工 | [文档索引](docs/README.md) |

### 开发者与维护者文档

| 目标 | 入口 |
| --- | --- |
| 阅读插件生态倡议书 | [插件生态倡议书](docs/plugin-ecosystem.md) |
| 编写普通或 Desktop 插件 | [插件开发](docs/plugin-development.md) |
| 了解桌面插件可以使用的能力 | [桌面插件接口说明](dsh-plugin-desktop/docs/plugin-services.zh.md) |
| 了解桌面应用如何工作 | [架构说明](docs/architecture.md) |
| 查阅包级构建与发布细节 | [`dsh-plugin-desktop/README.md`](dsh-plugin-desktop/README.md) |

## 主要功能

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>Desktop</h3>
      <p>把官方 DeepSeek Harness 的本地 Web UI 带到原生桌面。应用自动启动和管理本地 Harness 服务，集成系统托盘与桌面窗口，无需安装 Node.js 或执行命令。</p>
    </td>
    <td width="50%" valign="top">
      <h3>手机远程控制 <img src="https://img.shields.io/badge/%E5%8D%B3%E5%B0%86%E6%8E%A8%E5%87%BA-F59E0B?style=flat-square" alt="即将推出"></h3>
      <p>通过 iOS 和 Android 远程连接 Desktop，在手机上发起任务、查看 Agent 进度，并在需要时继续跟进。</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3><a href="docs/plugin-ecosystem.md">插件市场</a> <img src="https://img.shields.io/badge/%E5%8D%B3%E5%B0%86%E6%8E%A8%E5%87%BA-F59E0B?style=flat-square" alt="即将推出"></h3>
      <p>Harness 遵循“一切皆插件”的架构。桌面端插件市场将提供插件的发现、安装、更新和管理，让模型、工具、界面与工作流能力按需组合。</p>
    </td>
    <td width="50%" valign="top">
      <h3>共建插件生态</h3>
      <p>DSH 的插件生态由社区共同建设。官方、桌面和第三方插件遵循统一的约定，装在一起也能一起工作、互不干扰；欢迎加入共建，详见 <a href="docs/plugin-ecosystem.md">DSH 插件生态倡议书</a>。</p>
    </td>
  </tr>
</table>

## 插件生态

插件是给 DSH 添加能力的扩展包——模型、工具、界面、工作流都可以做成插件，像搭积木一样自由组合。

DSH Desktop 没有魔改上游源码，也不是一个固定写死的外壳。官方 DeepSeek Harness 以固定版本原样运行；桌面壳本身——窗口、托盘、终端、更新、工作配置——就是一个合法的 DSH 插件，通过官方插件机制与官方能力组合进同一个运行时。从核心 agent 到桌面外壳，整个产品遵守同一条"一切皆插件"的规则：官方生态里的插件可以直接用，桌面能力也按插件的方式组合、替换和演进。

我们希望插件生态像手机应用一样：每个插件按同一套规则开发，装在一起也能一起工作、互不干扰。

### 给开发者

与许多其他项目不同，这个项目本身就是一个 DSH [插件](docs/plugin-development.md)：桌面壳与第三方插件走同一条官方组合路径。Desktop 的插件能力已经可以使用。我们提供了 Desktop 服务，让插件开发者能够把插件与桌面能力集成起来：例如查看和切换工作配置，或在当前配置中安装、更新和移除插件。完整用法见[桌面插件接口说明](dsh-plugin-desktop/docs/plugin-services.zh.md)。为什么选择这样的边界、哪些能力不会暴露给第三方插件，见[为什么做 DSH Desktop](docs/why-desktop.md)和[插件开发指南](docs/plugin-development.md)。

## 与官方项目的区别

**一句话：官方提供可组合的智能体引擎，Desktop 提供开箱即用的桌面发行版。**

本项目基于 [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) 构建，但**不是对上游源码的 fork 修改**。`deepseek-harness/` 以 Git submodule 形式固定在某个已验证版本（当前为 `0.1.0-rc.6`），以原样运行；Desktop 自身也是一个合法的 DSH 插件，通过官方 Cordis 插件机制与官方能力组合进同一个运行时。

### 核心差异对比

| 维度 | 官方 deepseek-harness | DSH Desktop（本项目） |
| --- | --- | --- |
| 形态 | CLI + 本地 Web 服务，需自行安装 Node.js / pnpm 并用命令启动 | 原生桌面应用（Electron），内置 Electron / Node.js / pnpm / 固定依赖，下载安装即用 |
| 核心引擎 | Agent 循环、工具、会话、Web UI、插件系统 | **完全复用官方核心**，不改 Agent / 会话 / 工具协议 |
| 组合方式 | 用户自行编写 `cordis.patch.yml` 组合插件 | 在官方 `dsh-web-app` 组合之上**叠加桌面补丁**（`dsh-plugin-desktop/cordis.patch.yml`），再叠加用户 profile 层 |
| 模型能力 | 按 provider 直连 `dsh-llm` / `dsh-llm-pi-ai` | 新增**可选的逻辑模型策略** `llm-model-policy`：跨 provider 逻辑模型路由、GPT 专属 Fast 模式（持久化为 `model-policy/fast` 事件，最终以 `service_tier: priority` 发送到 OpenAI 兼容接口）、旧物理会话 `openai/gpt-5.6-luna` 自动兼容 |
| 搜索能力 | 默认 DeepSeek 搜索 | 默认关闭 DeepSeek 搜索，通过 **Firecrawl** 提供 `web_search` / `web_fetch`，按 profile 按需启用 |
| 运行环境 | 依赖系统已安装的 shell / pnpm / dsh | 自带隔离的 `pnpm` / `dsh` / `node` shim、环境快照、Windows ACL 沙箱与卷健康检查，托盘与终端集成 |
| 分发与更新 | 源码 + pnpm | 提供 **Windows NSIS / macOS DMG** 安装包、托盘内更新检查、已安装 `app.asar.unpacked` 的运行时闭包校验 |
| 插件生态 | 官方插件市场 | **官方插件无需改动即可在桌面内运行**；桌面本身也通过 `desktopProfiles` / `desktopPnpm` 向第三方插件开放受控能力 |

### Desktop 额外做了什么

- **原生壳**：Electron 单实例、BrowserWindow、系统托盘、原生菜单、更新下载器（`src/main.ts` / `src/electron-runtime.ts`）。
- **Host 组合层**：`cordis.patch.yml` 携带但默认禁用的 `llm-model-policy`，以及 Firecrawl 搜索抓取能力，由用户 profile 显式启用后生效。
- **能力补丁**：通过 Yarn patch 固定到 `0.1.0-rc.6` 运行时，补齐 Host 的 `session.models.fast` / `model.supportsFast` / `session.selectModel.fast`、Browser 的 wire schema、LLM 的 `serviceTier` 以及 pi-ai 的 `service_tier` 映射和 `model-policy/fast` 会话事件。
- **Windows 加固**：`node-pty` 内置二进制、`dsh-sandbox-windows-acl` 修复、loopback 绑定校验、`app.asar.unpacked` 物理依赖校验。
- **工程边界**：外层 Yarn workspace（`nodeLinker: node-modules`）与上游 pnpm workspace 隔离，`dsh-plugin-desktop/` 拥有全部桌面代码、测试与发布脚本。

### Desktop 没有做什么

- 不修改 `deepseek-harness/` 子模块内的任何源码。
- 不另造一套 Agent 循环或会话存储协议。
- 不把 Electron API 暴露给 Web renderer，不新增独立的 IPC 插件系统。
- 不自动改写用户的 `$DSH_HOME` / `cordis.patch.yml` / `settings.yaml`；兼容逻辑（如旧 Firecrawl `insert` 迁移）仅在内存中生效。

### 如何选择

- 想**直接使用**、需要窗口 / 托盘 / 安装包 / 一键更新 → 用 **DSH Desktop**。
- 想**通过命令行运行**、参与上游核心功能或插件协议开发 → 直接用 **官方 deepseek-harness**。
- 想**开发插件** → 两边通用；官方插件可直接在 Desktop 内运行，Desktop 插件接口见 [`dsh-plugin-desktop/docs/plugin-services.zh.md`](dsh-plugin-desktop/docs/plugin-services.zh.md)。

## 特别感谢

特别感谢 [DeepSeek Harness 原始仓库](https://github.com/deepseek-ai/deepseek-harness) 和 DeepSeek AI 团队。DSH Desktop 基于固定版本的上游源码构建，核心的智能体、模型、工具、会话、Web UI 和插件生态都来自这个项目。

同时感谢 [Cordis](https://github.com/cordiverse/cordis) 项目提供的插件化基础。没有这些开源项目，就不会有 DSH Desktop。

也感谢 [Koishi.js](https://koishi.chat/) 项目和社区长期积累的插件化实践、工具与经验，以及所有参与讨论、测试、反馈和插件开发的社区成员。

以及每一个使用、支持和参与共建的你。

<a id="run-from-source"></a>

## 开发

桌面端代码位于 `dsh-plugin-desktop/`，外层仓库使用 Yarn，固定的 `deepseek-harness/` 子模块继续使用自己的 pnpm workspace。从仓库根目录执行：

```sh
git submodule update --init --recursive
corepack yarn install --immutable
corepack yarn dev
```

headless 检查使用 `corepack yarn check`；完整的构建、测试和发布边界见[架构说明](docs/architecture.md)和包级 [`README`](dsh-plugin-desktop/README.md)。如何参与贡献见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 社区交流

可选择常用的平台参与讨论，交流使用问题、插件开发和项目进展。

<table>
  <thead>
    <tr>
      <th align="center">微信群</th>
      <th align="center">QQ群</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center"><img src="assets/community-wechat-group.png" alt="DeepSeek Harness Desktop 微信群二维码" width="180" height="180"></td>
      <td align="center"><img src="assets/community-qq-group.jpg" alt="DeepSeek Harness Desktop QQ群二维码" width="180" height="180"></td>
    </tr>
  </tbody>
</table>

Discord：[加入 DeepSeek Harness Desktop 社区](https://discord.gg/TJeGqKRNM)

如果您希望加入我们的技术团队，也欢迎通过 [t4wefan@qq.com](mailto:t4wefan@qq.com) 联系我们。

## 友情链接

这里收录 DeepSeek Harness 生态项目及开发者工具。

| 项目 | 简介 | 链接 |
| --- | --- | --- |
| dshfind | DeepSeek Harness（DSH）学习与分享社区。 | [GitHub](https://github.com/hikariming/dshfind) |
| ModLens | 为 DeepSeek Harness 和纯文本 Coding Agent 提供 OCR、版面与语义识别能力。 | [GitHub](https://github.com/liustack/modlens) · [官网](https://liustack.dev) |
| DeepSeek Harness 橙皮书 | DeepSeek Harness 社区实测手册。 | [GitHub](https://github.com/alchaincyf/deepseek-harness-orange-book) |
| dsh-web-ui | DeepSeek Harness Web UI 插件与皮肤合集。 | [GitHub](https://github.com/zhu1090093659/dsh-web-ui) · [展示站](https://gallery.dsh-market.com) |
| dsh-TUI | DeepSeek Harness 全屏交互式终端界面。 | [GitHub](https://github.com/ccch1mneyyy/dsh-TUI) |
| Agents-Anywhere | 从手机远程控制电脑上的 Coding Agent。 | [GitHub](https://github.com/anywhere-labs/Agents-Anywhere) |
| DSH-better-sidebar | DeepSeek Harness 侧边栏工作台，集成文件、终端、Git 和子代理。 | [GitHub](https://github.com/omdsh-dev/DSH-better-sidebar) |
| Awesome DeepSeek Harness | DeepSeek Harness 插件、工具与基础设施精选列表。 | [GitHub](https://github.com/0xsline/awesome-deepseek-harness) · [官网](https://deepseekdocs.com/) |
| MkSaaS · TanStarter（赞助商） | 面向独立开发者的商业 SaaS 启动模板。MkSaaS 基于 Next.js，TanStarter 基于 TanStack Start 与 Cloudflare，内置 AI、认证、支付和后台等常用能力。 | [MkSaaS](https://mksaas.com) · [TanStarter](https://tanstarter.dev) |

<sub>如果希望收录您的项目，欢迎加入微信群并私信 @王博升Benson。</sub>

## License

本项目遵循 [MIT License](LICENSE)。

> 本项目是基于 DeepSeek Harness 构建的社区桌面版本，并非 DeepSeek 官方产品。

> 本项目完全开源免费。如果有人向您以任何形式出售此软件，请拒绝交易。

> DeepSeek 是 DeepSeek AI 的商标。DSH Desktop 是独立的社区项目，与 DeepSeek 官方没有隶属关系，也未获得其背书。
