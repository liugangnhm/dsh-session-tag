# dsh-session-tag

为侧边栏会话添加彩色标签。

[English](README.md) | [中文](README.zh.md)

---

## 功能

- **空闲会话行**：前导格显示彩色饼图——每个标签一个等大扇区，单标签读作实心圆点，多标签读作色轮；超过四个标签时其余折入一个灰色扇区。
- **悬停卡**：在相对时间与状态行之间，以彩色芯片列出该会话的全部标签；超过三个标签时其余折入一个 "+N" 芯片。
- **会话“···”菜单**：每个标签一行切换项（已打标的显示 `✓`），另有“管理标签…”入口打开标签管理弹窗。
- **设置 → 插件 → 会话标签**：完整的标签管理页——重命名、改色、新增、删除，即时保存。

内置三个起始标签（重要 / 进行中 / 待办），可随意改名、改色或删除。

## 接入的 Slot

| 界面 | Slot | 收到的 props |
| --- | --- | --- |
| 行前导饼图 | `sidebar.session.row.leading` | `{ sessionId }` |
| 悬停卡芯片 | `sidebar.session.row.hover` | `{ sessionId }` |
| 会话菜单项 | `sidebar.workspaces.session.menu.item` | `{ sessionId, displayTitle, useMenuOpenState }` |
| 标签管理弹窗 | `shell.overlay` | locale 席位 |
| 设置页 | `settings.plugins.tab` | locale 席位 |

四个会话行 Slot 均为追加型 list slot（`replaceRisk: none`），与官方固定 / 重命名 / 分支 / 归档条目及其他插件和平共存。

## 安装

```sh
dsh plugin --profile <名称> add <路径或规格>
```

从 GitHub 源安装：

```sh
dsh plugin --profile <名称> add github:<owner>/dsh-session-tag
```

安装后重启该 profile（或刷新网页）生效。host 半区故意为空；全部界面由浏览器半区提供，通过包的 `dsh.client` 声明被发现。

## 开发

本插件无构建步骤——`lib/client.js` 即交付的浏览器 bundle，写成 `window.__ModuleLoader__.load(...)` 注册形式，由 host 的 `clientModules` 服务合成进 boot 图。

```sh
npm test        # 对浏览器半区的离线逻辑检查
```

该检查以与浏览器模块表相同的方式加载 `lib/client.js`（`window.__ModuleLoader__.load` 门面 + 平台种子词的 `require`），并基于内存版 `localStorage` 驱动已注册组件，因此无需运行中的 DSH。

## 已知限制

- 前导格仅在该行主状态为**空闲**时渲染：运行中或待处理的会话由官方状态点占据该格，标签改在悬停卡中展示。这是侧边栏行组件的既定契约，非插件选择。
- 空白行（“新会话”）与已归档行完全不渲染前导格。
- 标签数据**仅存于当前浏览器**（经 `@deepseek-ai/dsh-client-store` 使用 localStorage）：不跨浏览器、设备或 profile 同步，清除站点数据会一并清除。
- 行中段（标题与时间之间）没有官方扩展点，因此标签不会以常驻芯片形式出现在那里。

## 许可

MIT
