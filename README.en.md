<h1 align="center">DeepSeek Harness Desktop (DSH Desktop)</h1>

<p align="center">
  <strong>Open-source desktop distribution of DeepSeek Harness for Windows and macOS.</strong><br>
  Batteries included: Electron, Node.js, pnpm and pinned DSH.
</p>

<p align="center"><sub>Community maintained, not an official DeepSeek product. <a href="README.md">中文</a> · English</sub></p>

<p align="center">
  <img src="assets/desktop-hero-en.jpg" alt="DSH Desktop" width="100%">
</p>

<p align="center">
  <a href="https://github.com/UranusNo7/deepseek-harness-desktop/releases/latest"><img src="https://img.shields.io/github/v/release/UranusNo7/deepseek-harness-desktop?style=flat&label=release&color=4D6BFE" alt="release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-2EA44F?style=flat" alt="MIT"></a>
  <img src="https://img.shields.io/badge/macOS%20%7C%20Windows-4493F8?style=flat-square" alt="macOS | Windows">
</p>

<p align="center">
  <img src="assets/desktop-preview.png" alt="DSH Desktop preview" width="100%">
</p>

DSH Desktop packages the Web UI, Host and plugin system from [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) into a native app. Harness runs unchanged at a pinned version; the shell (window, tray, terminal, updates) is itself a DSH plugin composed via Cordis.

## Download

| Platform | Download | Notes |
| --- | --- | --- |
| Windows x64 | [Installer](https://www.dshdesktop.cn/api/downloads/windows) | NSIS |
| macOS Apple Silicon | [DMG](https://www.dshdesktop.cn/api/downloads/mac) | Drag to Applications |

Also on [GitHub Releases](https://github.com/UranusNo7/deepseek-harness-desktop/releases/latest). First launch creates the `desktop` profile. See [user guide](docs/user-guide.en.md).

## Docs

| Goal | Entry |
| --- | --- |
| Use the app | [User guide](docs/user-guide.en.md) |
| Why this project | [Why DSH Desktop](docs/why-desktop.en.md) |
| Plugin ecosystem | [Plugin ecosystem](docs/plugin-ecosystem.en.md) |
| Plugin dev | [Plugin development](docs/plugin-development.en.md) |
| Desktop API | [Desktop plugin API](dsh-plugin-desktop/docs/plugin-services.md) |
| Architecture | [Architecture](docs/architecture.en.md) |

## Features

<table>
  <tr>
    <td width="50%" valign="top"><h3>Desktop</h3><p>Native window, tray, single-instance and updater hosting the official Web UI.</p></td>
    <td width="50%" valign="top"><h3>Fast <code>/fast</code></h3><p>Session-scoped <code>fast/mode</code> (compat <code>model-policy/fast</code>), <code>/fast on|off|status</code>, <code>pi-ai</code> sends <code>service_tier: priority</code>. Plugin: <a href="https://github.com/UranusNo7/dsh-fast">dsh-fast</a>.</p></td>
  </tr>
  <tr>
    <td width="50%" valign="top"><h3>Firecrawl Search</h3><p>DeepSeek search off by default; Firecrawl provides <code>web_search</code>/<code>web_fetch</code> per profile.</p></td>
    <td width="50%" valign="top"><h3>Plugin Ecosystem</h3><p>Everything is a plugin — official plugins run in Desktop as-is.</p></td>
  </tr>
</table>

## How it differs

`deepseek-harness/` is pinned as a submodule (now `0.1.0-rc.8` + [`dsh-fast`](https://github.com/UranusNo7/dsh-fast) `c0ca0e4`) and runs unchanged; the shell is overlaid via `dsh-plugin-desktop/cordis.patch.yml`.

| Dimension | Official harness | DSH Desktop |
| --- | --- | --- |
| Form | CLI + Web, you install Node/pnpm | Native Electron app, batteries included |
| Core | Agent/tools/sessions/Web | **Reuses unchanged** |
| Composition | You write `cordis.patch.yml` | Overlays desktop patch on `dsh-web-app`, then user layer |
| Models | Direct `dsh-llm`/`dsh-llm-pi-ai` | Adds **Fast** (`dsh-fast`): `fast/mode` + `/fast` + `serviceTier: fast` |
| Search | DeepSeek search | Firecrawl `web_search`/`web_fetch` |
| Env | Whatever is on the system | Isolated `pnpm`/`dsh`/`node` shims, Windows ACL sandbox |
| Dist | Source + pnpm | **NSIS / DMG**, tray updater, `app.asar.unpacked` check |

**Adds:** native shell, `insert: fast` + Firecrawl, `dsh-session`/`sandbox` patches, Windows hardening. **Does not:** edit `deepseek-harness/` source, replace agent/session protocol, expose Electron to renderer, or rewrite `$DSH_HOME` on disk.

## Fast

```
/fast        # toggle
/fast on     # enable
/fast off    # disable
/fast status # show
```

Written as `fast/mode` (legacy `model-policy/fast` folded), injected as `serviceTier: fast` in `agent/request`, first request after toggle misses cache. `gpt-5.6` etc. with `supportsFast` goes as `service_tier: priority` via `pi-ai`.

## Develop

```sh
git submodule update --init --recursive
corepack yarn install
corepack yarn dev
corepack yarn check
```

`deepseek-harness` comes from [`UranusNo7/dsh-fast`](https://github.com/UranusNo7/dsh-fast) (`upstream.json` pins the commit). See [architecture](docs/architecture.en.md).

## Community

| WeChat | QQ |
| --- | --- |
| <img src="assets/community-wechat-group.png" width="180"> | <img src="assets/community-qq-group.jpg" width="180"> |

Discord: https://discord.gg/TJeGqKRNM · Contact: t4wefan@qq.com

## Related

| Project | About |
| --- | --- |
| [dsh-fast](https://github.com/UranusNo7/dsh-fast) | Standalone Fast plugin used here |
| [dshfind](https://github.com/hikariming/dshfind) | Learning community |
| [ModLens](https://github.com/liustack/modlens) | Vision for agents |

## License

[MIT](LICENSE) · Community edition, not official · Free · DeepSeek trademark belongs to DeepSeek AI
