<h1 align="center">DeepSeek Harness Desktop（DSH Desktop）</h1>

<p align="center">
  <strong>开源的 DeepSeek Harness 桌面发行版，Windows / macOS 开箱即用。</strong><br>
  内置 Electron、Node.js、pnpm 与固定版本 DSH，无需搭命令行环境。
</p>

<p align="center"><sub>社区维护，并非 DeepSeek 官方产品。中文 · <a href="README.en.md">English</a></sub></p>

<p align="center">
  <img src="assets/desktop-hero-zh.jpg" alt="DSH Desktop" width="100%">
</p>

<p align="center">
  <a href="https://github.com/UranusNo7/deepseek-harness-desktop/releases/latest"><img src="https://img.shields.io/github/v/release/UranusNo7/deepseek-harness-desktop?style=flat&label=release&color=4D6BFE" alt="release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-2EA44F?style=flat" alt="MIT"></a>
  <img src="https://img.shields.io/badge/macOS%20%7C%20Windows-4493F8?style=flat-square" alt="macOS | Windows">
</p>

<p align="center">
  <img src="assets/desktop-preview.png" alt="DSH Desktop 预览" width="100%">
</p>

DSH Desktop 把 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的 Web UI、Host 与插件体系装进原生应用。Harness 以固定版本原样运行；桌面壳（窗口、托盘、终端、更新、配置）本身也是一个 DSH 插件，通过官方 Cordis 机制组合。

## 下载与安装

| 平台 | 下载 | 说明 |
| --- | --- | --- |
| Windows x64 | [安装程序](https://www.dshdesktop.cn/api/downloads/windows) | NSIS，一路下一步 |
| macOS Apple Silicon | [DMG](https://www.dshdesktop.cn/api/downloads/mac) | 拖入 Applications |

也可在 [GitHub Releases](https://github.com/UranusNo7/deepseek-harness-desktop/releases/latest) 获取安装包与 SHA-256。首次启动创建 `desktop` profile 并拉起本地 Web。详见[用户指南](docs/user-guide.md)与[常见问题](docs/faq.md)。

## 文档

| 目标 | 入口 |
| --- | --- |
| 日常使用 | [用户指南](docs/user-guide.md) |
| 平台与边界 | [常见问题](docs/faq.md) |
| 为什么做 | [为什么做 DSH Desktop](docs/why-desktop.md) |
| 插件生态 | [插件生态倡议书](docs/plugin-ecosystem.md) |
| 插件开发 | [插件开发](docs/plugin-development.md) |
| 桌面插件能力 | [桌面插件接口](dsh-plugin-desktop/docs/plugin-services.zh.md) |
| 架构 | [架构说明](docs/architecture.md) |

## 主要功能

<table>
  <tr>
    <td width="50%" valign="top"><h3>桌面</h3><p>原生窗口、托盘、单实例与更新器，自动托管本地 Harness 服务，无需装 Node/pnpm。</p></td>
    <td width="50%" valign="top"><h3>Fast <code>/fast</code></h3><p>会话级 <code>fast/mode</code>（兼容旧 <code>model-policy/fast</code>），<code>/fast on|off|status</code> 切换，<code>pi-ai</code> 发 <code>service_tier: priority</code>。由独立插件 <a href="https://github.com/UranusNo7/dsh-fast">dsh-fast</a> 提供。</p></td>
  </tr>
  <tr>
    <td width="50%" valign="top"><h3>Firecrawl 搜索</h3><p>默认关闭 DeepSeek 搜索，<code>web_search</code>/<code>web_fetch</code> 由 Firecrawl 按 profile 按需启用。</p></td>
    <td width="50%" valign="top"><h3>插件生态</h3><p>“一切皆插件”——官方插件在桌面内直接可用，桌面能力也以插件形式暴露给第三方。</p></td>
  </tr>
</table>

## 与官方的区别

**官方是可组合的引擎，Desktop 是开箱即用的发行版。**

`deepseek-harness/` 以 Git submodule 固定在已验证版本（当前 `0.1.0-rc.8` + [`dsh-fast`](https://github.com/UranusNo7/dsh-fast) `c0ca0e4`），原样运行；桌面壳通过 `dsh-plugin-desktop/cordis.patch.yml` 叠加。

| 维度 | 官方 deepseek-harness | DSH Desktop |
| --- | --- | --- |
| 形态 | CLI + Web，需自装 Node/pnpm | Electron 原生应用，内置一切 |
| 引擎 | Agent/工具/会话/Web/插件 | **完全复用**，不改协议 |
| 组合 | 手写 `cordis.patch.yml` | 在 `dsh-web-app` 上叠桌面补丁，再叠用户层 |
| 模型 | 按 provider 直连 `dsh-llm`/`dsh-llm-pi-ai` | 新增 **Fast**（`dsh-fast`）：`fast/mode` 事件 + `/fast` 命令 + `serviceTier: fast` |
| 搜索 | DeepSeek 搜索 | Firecrawl `web_search`/`web_fetch` |
| 环境 | 依赖本机 shell/pnpm | 自带 `pnpm`/`dsh`/`node` shim、Windows ACL 沙箱、卷健康检查 |
| 分发 | 源码 + pnpm | **Windows NSIS / macOS DMG**、托盘更新、`app.asar.unpacked` 校验 |

**Desktop 额外做：**

* 原生壳：Electron 单实例、窗口、托盘、更新器（`src/main.ts`）。
* 组合层：`cordis.patch.yml` 的 `insert: fast`（`@deepseek-ai/dsh-fast`）与 Firecrawl。
* 补丁：`patches/dsh-session@0.1.0-rc.8.patch` 补 `fast/mode`/`model-policy/fast` 进 `KNOWN_SESSION_EVENT_TYPES`，`dsh-sandbox-windows-acl`/`dsh-tool-pwsh` 修复。
* 加固：`node-pty` 二进制、`loopback` 绑定、`app.asar.unpacked` 校验。
* 边界：外层 Yarn（`nodeLinker: node-modules`）与上游 pnpm 隔离，`dsh-plugin-desktop/` 拥有全部桌面代码。

**Desktop 不做：** 不改 `deepseek-harness/` 内源码；不另造 Agent/会话协议；不暴露 Electron 给 renderer；不落盘改写 `$DSH_HOME`（兼容迁移仅内存）。

### 如何选择

* 要**即用**、要窗口/托盘/安装包 → **Desktop**
* 要**命令行**或参与上游协议 → **官方 harness**
* 要**写插件** → 两边通用，官方插件在 Desktop 内直接跑

## Fast 使用

在任意会话输入：

```
/fast        # 切换
/fast on     # 开启
/fast off    # 关闭
/fast status # 查看
```

`fast/mode` 写入会话日志，`agent/request` 瀑布注入 `serviceTier: fast`，首请求会 miss 缓存。`gpt-5.6` 等声明 `supportsFast` 的模型在 `pi-ai` 侧发为 `service_tier: priority`。旧 `model-policy/fast` 自动兼容。

## 开发

```sh
git submodule update --init --recursive
corepack yarn install
corepack yarn dev          # 桌面端
corepack yarn check        # headless 门禁
```

`deepseek-harness` 子模块来自 [`UranusNo7/dsh-fast`](https://github.com/UranusNo7/dsh-fast)（`upstream.json` 记录 `commit`），`dsh-plugin-desktop/` 拥有全部桌面代码。详见[架构](docs/architecture.md)与 [`dsh-plugin-desktop/README.md`](dsh-plugin-desktop/README.md)。

## 社区

| 微信群 | QQ群 |
| --- | --- |
| <img src="assets/community-wechat-group.png" width="180"> | <img src="assets/community-qq-group.jpg" width="180"> |

Discord: https://discord.gg/TJeGqKRNM · 联系: t4wefan@qq.com

## 友情链接

| 项目 | 简介 |
| --- | --- |
| [dsh-fast](https://github.com/UranusNo7/dsh-fast) | 本项目使用的独立 Fast 插件 |
| [dshfind](https://github.com/hikariming/dshfind) | DSH 学习与分享社区 |
| [ModLens](https://github.com/liustack/modlens) | OCR/版面/语义 |
| [橙皮书](https://github.com/alchaincyf/deepseek-harness-orange-book) | 社区实测手册 |
| [Agents-Anywhere](https://github.com/anywhere-labs/Agents-Anywhere) | 手机远控 |

## License

[MIT](LICENSE) · 社区版，非官方产品 · 完全免费，勿信付费倒卖 · DeepSeek 商标归 DeepSeek AI 所有
