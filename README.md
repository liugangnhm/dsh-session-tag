# dsh-session-tag

Color-tag your sessions from the sidebar.

[English](README.md) | [中文](README.zh.md)

---

## What it does

- **Sidebar panel** — a new entry beside *Plugins* and *Automation tasks* in the left rail. It lists every tagged session and doubles as the tag palette: click a tag to filter the list, click again to clear.
- **Idle session rows** show a colored pie in the leading cell — one equal slice per tag, so one tag reads as a solid dot and several as a color wheel. Past four tags the rest fold into one gray slice.
- **Hover card** lists every tag of the session as a colored chip, between the relative time and the status lines. Past three tags the rest fold into a single "+N" chip.
- **Session "···" menu** carries one toggle row per tag (a `✓` marks the assigned ones) plus a *Manage tags…* entry that opens the palette dialog.
- **Ctrl+P** opens a VSCode-style quick-jump box over the **tagged sessions only**: type to filter by session title or tag name, ↑↓ to move, Enter to jump, Esc to close.
- **Settings → Plugins → Session tags** is the full palette manager: rename, recolor, add, and delete tags. Every edit saves immediately.

Tags ship with three starters (Important / In progress / Todo) that you can rename, recolor, or delete.

## Where it plugs in

| Surface | Slot | Props received |
| --- | --- | --- |
| Sidebar rail icon | `sidebar.panellist` | `{ size }` |
| Tag panel page | `main` (key `session-tag`) | locale seat + `useSessions` |
| Ctrl+P quick-jump layer | `shell.overlay` | locale seat + `useSessions` |
| Row leading pie | `sidebar.session.row.leading` | `{ sessionId }` |
| Hover-card chips | `sidebar.session.row.hover` | `{ sessionId }` |
| Session menu rows | `sidebar.workspaces.session.menu.item` | `{ sessionId, displayTitle, useMenuOpenState }` |
| Palette dialog | `shell.overlay` | locale seat |
| Settings page | `settings.plugins.tab` | locale seat |

All four session-row slots are additive list slots (`replaceRisk: none`), so the plugin coexists with the official pin / rename / fork / archive entries and with other plugins.

## Install

```sh
dsh plugin --profile <name> add github:liugangnhm/dsh-session-tag
```

For a local checkout:

```sh
dsh plugin --profile <name> add <path-to-this-package>
```

Restart the profile (or reload the web page) afterwards. The host half is intentionally empty; every surface is the browser half, discovered through the package's `dsh.client` declaration.

## Development

The plugin has no build step — `lib/client.js` is the shipped browser bundle, written as a `window.__ModuleLoader__.load(...)` registration that the host's `clientModules` service composes into the boot graph.

```sh
npm test        # offline logic check over the browser half
```

The check loads `lib/client.js` the same way the browser module table does (a `window.__ModuleLoader__.load` facade plus a `require` for the platform seed words) and drives the registered components against an in-memory `localStorage`, so it needs no running DSH.

## Known limitations

- The leading seat only renders while a row's primary state is **idle** — a running or pending session keeps the official status dot in that cell and shows its tags in the hover card instead. This is the shell's row contract, not a plugin choice.
- Blank ("New session") and archived rows render no leading seat at all.
- Tags are **browser-local** (`localStorage` through `@deepseek-ai/dsh-client-store`): they do not sync across browsers, devices, or profiles, and clearing site data clears them.
- The row's middle area (between title and time) has no official extension point, so tags never appear as inline chips there.

## License

MIT
