window.__ModuleLoader__.load({
	id: "dsh-session-tag",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		const React = require("react");
		const primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		const { defineStore, createSnapshotStore } = require("@deepseek-ai/dsh-client-store");
		const {
			Modal,
			Button,
			MenuItemButton,
			Tooltip,
			IconChecklistOutlineRegular,
			IconSlidersTwoOutlineRegular,
			IconTrashOutlineRegular,
		} = primitives;
		const e = React.createElement;

		/** Dictionary namespace owned by this plugin. */
		const NS = "session-tag";

		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"menu.manage": "管理标签…",
			"dialog.title": "管理会话标签",
			"dialog.close": "完成",
			"dialog.hint": "在任意会话的“···”菜单里切换标签；空闲会话行的前导格会显示彩色圆点，悬停卡显示全部标签。",
			"settings.title": "会话标签",
			"settings.intro": "为会话添加彩色标签：在任意会话的“···”菜单中切换。空闲会话行前导格显示彩色圆点，悬停卡列出全部标签。数据保存在当前浏览器。",
			"settings.add": "添加标签",
			"settings.name": "名称",
			"settings.color": "颜色",
			"settings.delete": "删除该标签",
			"settings.empty": "还没有标签，点击“添加标签”创建第一个。",
			"settings.defaultName": "新标签",
			"dot.label": "标签：{names}",
			"hover.tags": "标签",
			"seed.important": "重要",
			"seed.active": "进行中",
			"seed.todo": "待办",
			"panel.label": "标签",
			"panel.title": "会话标签",
			"panel.palette": "标签",
			"panel.paletteHint": "点击标签可快速筛选下方会话；再次点击取消筛选。",
			"panel.sessions": "会话",
			"panel.sessionsAll": "全部",
			"panel.filtered": "已筛选：{names}",
			"panel.clearFilter": "清除筛选",
			"panel.noTagged": "还没有会话被打标签。在任意会话的“···”菜单里给它贴上标签。",
			"panel.noMatch": "当前筛选下没有会话。",
			"panel.open": "打开会话",
			"panel.count": "{n} 个会话",
			"panel.untagged": "未标签",
			"panel.manage": "管理标签",
			"quick.open": "跳转到会话",
			"quick.placeholder": "搜索已打标签的会话…",
			"quick.empty": "没有匹配的已打标签会话",
			"quick.hint": "输入以筛选 · ↑↓ 选择 · Enter 跳转 · Esc 关闭",
			"quick.title": "标签会话",
			"quick.aria": "搜索已打标签的会话",
			"shortcut.label": "标签会话快速跳转",
			"shortcut.aria": "打开已打标签会话的快速跳转",
		};

		/** English dictionary, key-identical to the Chinese source of truth. */
		const en = {
			"menu.manage": "Manage tags…",
			"dialog.title": "Manage session tags",
			"dialog.close": "Done",
			"dialog.hint": "Toggle tags from any session's \"···\" menu. Idle session rows show a colored dot; the hover card lists every tag.",
			"settings.title": "Session tags",
			"settings.intro": "Color-tag your sessions: toggle tags from any session's \"···\" menu. Idle rows show a colored dot; the hover card lists every tag. Data is stored in this browser.",
			"settings.add": "Add tag",
			"settings.name": "Name",
			"settings.color": "Color",
			"settings.delete": "Delete this tag",
			"settings.empty": "No tags yet — click “Add tag” to create the first one.",
			"settings.defaultName": "New tag",
			"dot.label": "Tags: {names}",
			"hover.tags": "Tags",
			"seed.important": "Important",
			"seed.active": "In progress",
			"seed.todo": "Todo",
			"panel.label": "Tags",
			"panel.title": "Session tags",
			"panel.palette": "Tags",
			"panel.paletteHint": "Click a tag to filter the sessions below; click again to clear.",
			"panel.sessions": "Sessions",
			"panel.sessionsAll": "All",
			"panel.filtered": "Filtered: {names}",
			"panel.clearFilter": "Clear filter",
			"panel.noTagged": "No tagged sessions yet. Tag one from any session's \"···\" menu.",
			"panel.noMatch": "No sessions under the current filter.",
			"panel.open": "Open session",
			"panel.count": "{n} sessions",
			"panel.untagged": "Untagged",
			"panel.manage": "Manage tags",
			"quick.open": "Jump to session",
			"quick.placeholder": "Search tagged sessions…",
			"quick.empty": "No matching tagged sessions",
			"quick.hint": "Type to filter · ↑↓ to move · Enter to jump · Esc to close",
			"quick.title": "Tagged sessions",
			"quick.aria": "Search tagged sessions",
			"shortcut.label": "Jump to a tagged session",
			"shortcut.aria": "Open quick jump to a tagged session",
		};

		/**
		 * The preset color palette.
		 *
		 * Mid-tone hues chosen to stay legible as chip text on a translucent
		 * background in both the light and the dark theme; the same value is
		 * used solid for the row dot and the swatches.
		 */
		const COLORS = [
			"#e5484d",
			"#e8590c",
			"#bf8705",
			"#2f9e44",
			"#0c8599",
			"#1971c2",
			"#8e4ec6",
			"#c2255c",
			"#5c6370",
		];

		/** Persisted store key; the version suffix allows a future schema change. */
		const STORE_KEY = "dsh-session-tag.v1";

		/**
		 * The `main` panel key this plugin owns. It must be unique across every
		 * panel entry in the shell, so it carries the plugin's own prefix.
		 */
		const PANEL_ID = "session-tag";

		/**
		 * One `#rrggbb` color plus an alpha, as an `rgba()` string.
		 *
		 * Hand-parsed rather than `color-mix()` so the chip background works on
		 * every Chromium the desktop shell may embed.
		 * @param hex - a `#rrggbb` color.
		 * @param alpha - 0..1 opacity.
		 * @returns the `rgba()` string.
		 */
		function withAlpha(hex, alpha) {
			const value = Number.parseInt(hex.slice(1), 16);
			const r = (value >> 16) & 255;
			const g = (value >> 8) & 255;
			const b = value & 255;
			return `rgba(${r}, ${g}, ${b}, ${alpha})`;
		}

		/** A fresh tag id; the fallback covers non-secure contexts. */
		function newId() {
			try {
				return crypto.randomUUID();
			} catch {
				return `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
			}
		}

		/**
		 * The tag palette and the per-session assignments, one persisted store.
		 *
		 * `tags` is the palette (id, name, color); `bySession` maps a session
		 * id to its ordered tag ids. Deleting a tag also drops it from every
		 * session, so a removed color can never linger on a row.
		 * @param t - the locale reader, for the seeded starter tags.
		 * @returns the store handle.
		 */
		function createTagStore(t) {
			return defineStore({
				persist: STORE_KEY,
				init: () => ({
					tags: [
						{ id: "seed-important", name: t("seed.important"), color: COLORS[0] },
						{ id: "seed-active", name: t("seed.active"), color: COLORS[5] },
						{ id: "seed-todo", name: t("seed.todo"), color: COLORS[1] },
					],
					bySession: {},
				}),
				actions: {
					addTag: (d, tag) => {
						if (d.tags.some((existing) => existing.id === tag.id)) return;
						d.tags.push(tag);
					},
					renameTag: (d, id, name) => {
						const tag = d.tags.find((entry) => entry.id === id);
						if (tag) tag.name = name;
					},
					setTagColor: (d, id, color) => {
						const tag = d.tags.find((entry) => entry.id === id);
						if (tag) tag.color = color;
					},
					removeTag: (d, id) => {
						d.tags = d.tags.filter((entry) => entry.id !== id);
						for (const sessionId of Object.keys(d.bySession)) {
							d.bySession[sessionId] = d.bySession[sessionId].filter((tagId) => tagId !== id);
							if (d.bySession[sessionId].length === 0) delete d.bySession[sessionId];
						}
					},
					toggleTag: (d, sessionId, tagId) => {
						const current = d.bySession[sessionId] ?? (d.bySession[sessionId] = []);
						const at = current.indexOf(tagId);
						if (at === -1) current.push(tagId);
						else current.splice(at, 1);
						if (current.length === 0) delete d.bySession[sessionId];
					},
				},
			}).create();
		}

		/** The tags one session carries, in palette order of assignment. */
		function tagsOf(state, sessionId) {
			const ids = state.bySession[sessionId];
			if (!ids || ids.length === 0) return [];
			return ids.map((id) => state.tags.find((tag) => tag.id === id)).filter(Boolean);
		}

		/** React binding for one snapshot source; stable across re-renders. */
		function useSnap(source) {
			const [value, setValue] = React.useState(() => source.getSnapshot());
			React.useEffect(() => source.subscribe(() => setValue(source.getSnapshot())), [source]);
			return value;
		}

		/** Plugin stylesheet, inserted once per plugin life into the app document. */
		const CSS = `
.st-dot{width:8px;height:8px;border-radius:50%;display:inline-block;flex:none}
.st-chips{display:flex;flex-wrap:wrap;gap:4px;margin:2px 0}
.st-chip{font-size:11px;line-height:16px;padding:1px 8px;border-radius:999px;border:1px solid;white-space:nowrap}
.st-chip-more{color:var(--dsw-alias-label-tertiary,#9aa0a6);background:var(--dsw-alias-bg-layer-2,#292a2d);border-color:var(--dsw-alias-border-l1,#3c4043)}
.st-swatch{width:10px;height:10px;border-radius:50%;display:inline-block;flex:none}
.st-page{max-width:760px;color:var(--dsw-alias-label-primary);display:flex;flex-direction:column;gap:12px}
.st-intro{margin:0;color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:20px}
.st-list{display:flex;flex-direction:column;gap:8px}
.st-row{display:flex;align-items:center;gap:8px}
.st-name{flex:1;min-width:0;font:inherit;font-size:13px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2,#292a2d);border:1px solid var(--dsw-alias-border-l1,#3c4043);border-radius:var(--dsw-radius-md,6px);padding:5px 8px}
.st-name:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:1px}
.st-colors{display:flex;align-items:center;gap:4px;flex:none}
.st-color{appearance:none;width:16px;height:16px;padding:0;border-radius:50%;border:1px solid var(--dsw-alias-border-l2,#4b4f54);cursor:pointer}
.st-color[data-active="true"]{box-shadow:0 0 0 2px var(--dsw-alias-bg-base,#202124),0 0 0 3px currentColor}
.st-del{appearance:none;flex:none;width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;background:transparent;border:0;border-radius:6px;color:var(--dsw-alias-label-tertiary,#9aa0a6);cursor:pointer}
.st-del:hover{background:var(--dsw-alias-interactive-bg-hover,#333537);color:var(--dsw-alias-label-primary,#e8eaed)}
.st-empty{margin:0;color:var(--dsw-alias-label-tertiary);font-size:13px}
.st-hint{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.st-panel{max-width:760px;color:var(--dsw-alias-label-primary);display:flex;flex-direction:column;gap:14px}
.st-panel-head{display:flex;align-items:center;gap:8px}
.st-panel-heading{margin:0;font-size:18px;font-weight:600;flex:1;min-width:0}
.st-panel-group{display:flex;flex-direction:column;gap:8px}
.st-panel-groupHead{display:flex;align-items:center;gap:8px}
.st-panel-groupTitle{margin:0;font-size:15px;font-weight:600;line-height:22px}
.st-panel-count{color:var(--dsw-alias-label-tertiary);font-size:12px;font-variant-numeric:tabular-nums}
.st-panel-filterBar{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.st-panel-filterLabel{color:var(--dsw-alias-label-tertiary);font-size:12px}
.st-filterChip{appearance:none;font:inherit;font-size:12px;line-height:18px;display:inline-flex;align-items:center;gap:5px;padding:2px 9px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1,#3c4043);background:var(--dsw-alias-bg-layer-2,#292a2d);color:var(--dsw-alias-label-secondary,#9aa0a6);cursor:pointer}
.st-filterChip:hover{color:var(--dsw-alias-label-primary,#e8eaed);background:var(--dsw-alias-interactive-bg-hover,#333537)}
.st-filterChip[data-active="true"]{color:var(--dsw-alias-label-primary);border-color:currentColor}
.st-filterChip .st-swatch{width:8px;height:8px}
.st-sessions{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px}
.st-session{display:flex;align-items:center;gap:8px;width:100%;text-align:left;font:inherit;font-size:13px;color:var(--dsw-alias-label-primary);background:transparent;border:0;border-radius:var(--dsw-radius-md,6px);padding:7px 8px;cursor:pointer}
.st-session:hover,.st-session[data-active="true"]{background:var(--dsw-alias-interactive-bg-hover,#333537)}
.st-session-title{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.st-session-tags{display:flex;align-items:center;gap:4px;flex:none}
.st-quick{position:fixed;inset:0;z-index:1100;display:flex;align-items:flex-start;justify-content:center;padding-top:14vh;background:rgba(0,0,0,.32)}
.st-quick-card{width:min(560px,calc(100vw - 32px));max-height:60vh;display:flex;flex-direction:column;background:var(--dsw-alias-bg-overlay,#202124);border:1px solid var(--dsw-alias-border-l1,#3c4043);border-radius:10px;box-shadow:0 18px 48px rgba(0,0,0,.4);overflow:hidden}
.st-quick-head{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--dsw-alias-border-l1,#3c4043)}
.st-quick-title{flex:1;min-width:0;font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary)}
.st-quick-input{flex:1;min-width:0;font:inherit;font-size:13px;color:var(--dsw-alias-label-primary);background:transparent;border:0;outline:none}
.st-quick-input::placeholder{color:var(--dsw-alias-label-tertiary,#9aa0a6)}
.st-quick-list{list-style:none;margin:0;padding:6px;overflow-y:auto;display:flex;flex-direction:column;gap:2px}
.st-quick-row{display:flex;align-items:center;gap:8px;width:100%;text-align:left;font:inherit;font-size:13px;color:var(--dsw-alias-label-primary);background:transparent;border:0;border-radius:6px;padding:8px 10px;cursor:pointer}
.st-quick-row[data-active="true"]{background:var(--dsw-alias-interactive-bg-hover,#333537)}
.st-quick-row-title{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.st-quick-foot{padding:7px 12px;border-top:1px solid var(--dsw-alias-border-l1,#3c4043);color:var(--dsw-alias-label-tertiary);font-size:11px}
`;

		/**
		 * Client plugin body: own the tag store, then decorate the sidebar's
		 * session rows (leading dot, hover-card chips), the session menu (quick
		 * toggle plus the manager entry), the manager dialog, and the Settings
		 * → Plugins page.
		 * @param ctx - client root context.
		 */
		function apply(ctx) {
			const t = ctx.locale.bind(NS);
			const store = createTagStore(t);
			/** Ephemeral open state of the manager dialog; never persisted. */
			const dialog = createSnapshotStore({ open: false });

			ctx.effect(
				() => ctx.locale.register(NS, { zh, en }),
				"session-tag: dictionaries",
			);

			const style = document.createElement("style");
			style.textContent = CSS;
			document.head.appendChild(style);
			ctx.effect(
				() => () => style.remove(),
				"session-tag: styles",
			);

			// --- row decorations -------------------------------------------------

			/**
			 * How many tag colors the leading dot can show before it folds the
			 * rest into one gray "more" slice. Four keeps each slice wide enough
			 * to read as a distinct color inside 8px.
			 */
			const DOT_MAX_SLICES = 4;

			/** Neutral slice color for the tags beyond {@link DOT_MAX_SLICES}. */
			const DOT_OVERFLOW_COLOR = "#9aa0a6";

			/**
			 * Build the `conic-gradient` for the leading dot: one slice per tag,
			 * equal-sized, in assignment order, with the overflow tags folded
			 * into a single neutral slice.
			 * @param tags - the session's tags, in assignment order.
			 * @returns the CSS gradient value.
			 */
			function dotGradient(tags) {
				const shown = tags.slice(0, DOT_MAX_SLICES);
				const overflow = tags.length - shown.length;
				const stops = [];
				let angle = 0;
				const push = (color, share) => {
					const next = angle + share * 360;
					stops.push(`${color} ${angle}deg ${next}deg`);
					angle = next;
				};
				for (const tag of shown) push(tag.color, 1 / tags.length);
				if (overflow > 0) push(DOT_OVERFLOW_COLOR, overflow / tags.length);
				return `conic-gradient(from 0deg, ${stops.join(", ")})`;
			}

			/**
			 * The `sidebar.session.row.leading` entry: the session's tags as one
			 * pie of equal slices inside the 16px cell the row's own state dot
			 * otherwise occupies — a single tag reads as a solid dot, several as
			 * a color wheel. The seat only renders while the row's primary state
			 * is idle, so a running session keeps its official status dot and
			 * shows its tags in the hover card instead.
			 * @param props - `{ sessionId }` plus the locale seat.
			 * @returns the dot, or null when the session carries no tag.
			 */
			function TagDot({ sessionId }) {
				const state = useSnap(store);
				const tags = tagsOf(state, sessionId);
				if (tags.length === 0) return null;
				const names = tags.map((tag) => tag.name).join("、");
				return e("span", {
					className: "st-dot",
					style: { backgroundImage: dotGradient(tags) },
					role: "img",
					"aria-label": t("dot.label", { names }),
					title: names,
				});
			}

			/**
			 * How many chips the hover card shows before folding the rest into
			 * one "+N" chip. The card is a hover surface, so it stays short
			 * rather than growing with the palette.
			 */
			const CHIPS_MAX = 3;

			/**
			 * The `sidebar.session.row.hover` entry: the session's tags as
			 * colored chips between the hover card's relative time and its
			 * status lines. Past {@link CHIPS_MAX} the rest fold into one
			 * "+N" chip; the leading dot still shows up to four colors and the
			 * tooltip names every tag.
			 * @param props - `{ sessionId }` plus the locale seat.
			 * @returns the chip row, or null when the session carries no tag.
			 */
			function SessionTagChips({ sessionId }) {
				const state = useSnap(store);
				const tags = tagsOf(state, sessionId);
				if (tags.length === 0) return null;
				const shown = tags.slice(0, CHIPS_MAX);
				const hidden = tags.length - shown.length;
				return e(
					"div",
					{ className: "st-chips", role: "list", "aria-label": t("hover.tags") },
					shown.map((tag) =>
						e(
							"span",
							{
								key: tag.id,
								className: "st-chip",
								role: "listitem",
								style: {
									color: tag.color,
									backgroundColor: withAlpha(tag.color, 0.14),
									borderColor: withAlpha(tag.color, 0.38),
								},
							},
							tag.name,
						),
					),
					hidden > 0
						? e(
								"span",
								{ key: "__more", className: "st-chip st-chip-more", role: "listitem" },
								"+" + hidden,
							)
						: null,
				);
			}

			// --- session menu ------------------------------------------------------

			/**
			 * The `sidebar.workspaces.session.menu.item` entry: one toggle row
			 * per palette tag (a check marks the assigned ones) plus the manager
			 * entry. A single registration keeps the tag rows together at the
			 * end of the session menu.
			 * @param props - `{ sessionId, displayTitle, useMenuOpenState }` plus the locale seat.
			 * @returns the menu rows.
			 */
			function TagMenuItems({ sessionId, useMenuOpenState }) {
				const state = useSnap(store);
				// The workspace browser declares this hook for every entry of the
				// session-menu slot, so the call is unconditional by contract.
				const [, setMenuOpen] = useMenuOpenState();
				const assigned = state.bySession[sessionId] ?? [];
				const rows = state.tags.map((tag) => {
					const active = assigned.includes(tag.id);
					return e(
						MenuItemButton,
						{
							key: tag.id,
							icon: e("span", { className: "st-swatch", style: { backgroundColor: tag.color } }),
							onSelect: () => {
								setMenuOpen(false);
								store.actions.toggleTag(sessionId, tag.id);
							},
						},
						(active ? "✓ " : "") + tag.name,
					);
				});
				rows.push(
					e(
						MenuItemButton,
						{
							key: "__manage",
							icon: e(IconSlidersTwoOutlineRegular, { size: 14 }),
							onSelect: () => {
								setMenuOpen(false);
								dialog.set({ open: true });
							},
						},
						t("menu.manage"),
					),
				);
				return e(React.Fragment, null, ...rows);
			}

			// --- palette editor ----------------------------------------------------

			/**
			 * The shared palette editor: one row per tag (name, color, delete)
			 * plus the add control. Every edit writes straight through to the
			 * persisted store, so the dialog and the settings page need no save
			 * step.
			 * @param props - `{ t }` — the locale seat.
			 * @returns the editor.
			 */
			function TagEditor({ t: translate }) {
				const state = useSnap(store);
				return e(
					"div",
					{ className: "st-list" },
					state.tags.length === 0
						? e("p", { className: "st-empty" }, translate("settings.empty"))
						: state.tags.map((tag) =>
								e(
									"div",
									{ key: tag.id, className: "st-row" },
									e("input", {
										className: "st-name",
										value: tag.name,
										"aria-label": translate("settings.name"),
										onChange: (event) => store.actions.renameTag(tag.id, event.target.value),
									}),
									e(
										"span",
										{ className: "st-colors", role: "group", "aria-label": translate("settings.color") },
										COLORS.map((color) =>
											e("button", {
												key: color,
												type: "button",
												className: "st-color",
												style: { backgroundColor: color, color },
												"data-active": tag.color === color ? "true" : undefined,
												"aria-label": color,
												"aria-pressed": tag.color === color,
												onClick: () => store.actions.setTagColor(tag.id, color),
											}),
										),
									),
									e(
										Tooltip,
										{
											label: translate("settings.delete"),
											side: "bottom",
											align: "end",
											delayMs: 500,
										},
										e(
											"button",
											{
												type: "button",
												className: "st-del",
												"aria-label": translate("settings.delete"),
												onClick: () => store.actions.removeTag(tag.id),
											},
											e(IconTrashOutlineRegular, { size: 14 }),
										),
									),
								),
							),
					e(
						Button,
						{
							variant: "outline",
							onClick: () =>
								store.actions.addTag({
									id: newId(),
									name: t("settings.defaultName"),
									color: COLORS[state.tags.length % COLORS.length],
								}),
						},
						translate("settings.add"),
					),
				);
			}

			/**
			 * The `shell.overlay` entry: the manager dialog. Nothing renders
			 * while it is closed, so the overlay stays quiet until a session
			 * menu asks for it.
			 * @param props - the locale seat.
			 * @returns the open dialog, or null.
			 */
			function TagManagerDialog(props) {
				const open = useSnap(dialog).open;
				const translate = props.t || t;
				if (!open) return null;
				return e(
					Modal,
					{
						open: true,
						onClose: () => dialog.set({ open: false }),
						closeLabel: translate("dialog.close"),
						title: translate("dialog.title"),
						footer: e(
							Button,
							{
								variant: "primary",
								onClick: () => dialog.set({ open: false }),
							},
							translate("dialog.close"),
						),
					},
					e("p", { className: "st-hint" }, translate("dialog.hint")),
					e(TagEditor, { t: translate }),
				);
			}

			/**
			 * The `settings.plugins.tab` entry: the palette manager as a
			 * Settings → Plugins page, titled by the registration's label.
			 * @param props - the locale seat.
			 * @returns the page.
			 */
			function TagSettingsPage(props) {
				const translate = props.t || t;
				return e(
					"div",
					{ className: "st-page" },
					e("p", { className: "st-intro" }, translate("settings.intro")),
					e(TagEditor, { t: translate }),
				);
			}

			// --- sidebar panel -------------------------------------------------------

			/** Which palette tags the panel currently filters by; empty means all. */
			const filterStore = createSnapshotStore({ active: [] });
			/** Whether the Ctrl+P quick-jump layer is open. */
			const quickStore = createSnapshotStore({ open: false });

			/**
			 * The `sidebar.panellist` entry: the icon beside 插件 and 自动化任务
			 * that selects this plugin's main panel. The shell owns the selected
			 * styling, so the icon only supplies its glyph — a checklist, the
			 * closest shipped mark to a tag list.
			 * @param props - framework shares; `size` is the cell's pixel size.
			 * @returns the icon element.
			 */
			function TagPanelIcon({ size }) {
				return e(IconChecklistOutlineRegular, { size });
			}

			/**
			 * The tagged sessions, newest first.
			 *
			 * Reads the framework's session catalog through the `useSessions` hook
			 * the slot hands every component, so the panel never keeps its own
			 * copy of the list. Sessions the Host has since dropped are skipped
			 * rather than rendered as dead rows.
			 * @param state - the tag store snapshot.
			 * @param sessions - the session catalog snapshot.
			 * @returns one row per tagged session.
			 */
			function taggedRows(state, sessions) {
				if (!sessions || !sessions.byId) return [];
				const rows = [];
				for (const [sessionId, tagIds] of Object.entries(state.bySession)) {
					const summary = sessions.byId[sessionId];
					if (!summary) continue;
					const tags = tagIds.map((id) => state.tags.find((tag) => tag.id === id)).filter(Boolean);
					if (tags.length === 0) continue;
					rows.push({
						id: sessionId,
						title: summary.displayTitle || String(sessionId),
						tags,
						updatedAt: typeof summary.updatedAt === "number" ? summary.updatedAt : 0,
					});
				}
				rows.sort((left, right) => right.updatedAt - left.updatedAt);
				return rows;
			}

			/**
			 * The `main` panel entry: the tag palette as a filter, the tagged
			 * session list, and the palette editor — the sidebar's own home for
			 * everything this plugin does.
			 * @param props - framework shares; `useSessions` is the catalog hook.
			 * @returns the panel page.
			 */
			function TagPanelPage(props) {
				const translate = props.t || t;
				const state = useSnap(store);
				const filter = useSnap(filterStore);
				const sessions = typeof props.useSessions === "function" ? props.useSessions((value) => value) : null;
				const rows = taggedRows(state, sessions);
				const active = new Set(filter.active);
				const visible = active.size === 0 ? rows : rows.filter((row) => row.tags.some((tag) => active.has(tag.id)));
				const toggleFilter = (tagId) =>
					filterStore.set({
						active: filter.active.includes(tagId)
							? filter.active.filter((id) => id !== tagId)
							: [...filter.active, tagId],
					});
				const open = (sessionId) => {
					if (typeof props.onOpenSession === "function") props.onOpenSession(sessionId);
				};
				return e(
					"div",
					{ className: "st-panel" },
					e(
						"div",
						{ className: "st-panel-head" },
						e("h2", { className: "st-panel-heading" }, translate("panel.title")),
					),
					e(
						"div",
						{ className: "st-panel-group" },
						e(
							"div",
							{ className: "st-panel-groupHead" },
							e("h3", { className: "st-panel-groupTitle" }, translate("panel.palette")),
							e("span", { className: "st-panel-count" }, String(state.tags.length)),
						),
						e("p", { className: "st-hint" }, translate("panel.paletteHint")),
						state.tags.length === 0
							? e("p", { className: "st-empty" }, translate("settings.empty"))
							: e(
									"div",
									{ className: "st-panel-filterBar", role: "group", "aria-label": translate("panel.palette") },
									state.tags.map((tag) =>
										e(
											"button",
											{
												key: tag.id,
												type: "button",
												className: "st-filterChip",
												"data-active": active.has(tag.id) ? "true" : undefined,
												"aria-pressed": active.has(tag.id),
												onClick: () => toggleFilter(tag.id),
											},
											e("span", { className: "st-swatch", style: { backgroundColor: tag.color } }),
											tag.name,
										),
									),
								),
					),
					e(
						"div",
						{ className: "st-panel-group" },
						e(
							"div",
							{ className: "st-panel-groupHead" },
							e("h3", { className: "st-panel-groupTitle" }, translate("panel.sessions")),
							e("span", { className: "st-panel-count" }, translate("panel.count", { n: visible.length })),
						),
						filter.active.length > 0
							? e(
									"div",
									{ className: "st-panel-filterBar" },
									e("span", { className: "st-panel-filterLabel" }, translate("panel.filtered", {
										names: filter.active
											.map((id) => state.tags.find((tag) => tag.id === id))
											.filter(Boolean)
											.map((tag) => tag.name)
											.join("、"),
									})),
									e(
										"button",
										{ type: "button", className: "st-filterChip", onClick: () => filterStore.set({ active: [] }) },
										translate("panel.clearFilter"),
									),
								)
							: null,
						rows.length === 0
							? e("p", { className: "st-empty" }, translate("panel.noTagged"))
							: visible.length === 0
								? e("p", { className: "st-empty" }, translate("panel.noMatch"))
								: e(
										"ul",
										{ className: "st-sessions" },
										visible.map((row) =>
											e(
												"li",
												{ key: row.id },
												e(
													"button",
													{
														type: "button",
														className: "st-session",
														title: row.title,
														onClick: () => open(row.id),
													},
													e("span", { className: "st-session-title" }, row.title),
													e(
														"span",
														{ className: "st-session-tags" },
														row.tags.map((tag) =>
															e("span", {
																key: tag.id,
																className: "st-swatch",
																style: { backgroundColor: tag.color },
																title: tag.name,
															}),
														),
													),
												),
											),
										),
									),
					),
					e(TagEditor, { t: translate }),
				);
			}

			// --- quick jump (Ctrl+P) -------------------------------------------------

			/**
			 * The `shell.overlay` entry: the Ctrl+P quick-jump layer. A centered
			 * VSCode-style box over the tagged sessions only — typing filters by
			 * session title and tag name, arrows move, Enter opens the selection,
			 * Escape or an outside click closes.
			 * @param props - framework shares; `useSessions` is the catalog hook.
			 * @returns the open layer, or null while it is closed.
			 */
			function TagQuickJump(props) {
				const translate = props.t || t;
				const open = useSnap(quickStore).open;
				const state = useSnap(store);
				const sessions = typeof props.useSessions === "function" ? props.useSessions((value) => value) : null;
				const [query, setQuery] = React.useState("");
				const [cursor, setCursor] = React.useState(0);
				const inputRef = React.useRef(null);

				const rows = React.useMemo(() => {
					const needle = query.trim().toLowerCase();
					if (needle === "") return taggedRows(state, sessions);
					return taggedRows(state, sessions).filter(
						(row) =>
							row.title.toLowerCase().includes(needle) ||
							row.tags.some((tag) => tag.name.toLowerCase().includes(needle)),
					);
				}, [query, state, sessions]);

				React.useEffect(() => {
					if (!open) return;
					setQuery("");
					setCursor(0);
					// Focus after the layer commits, so the caret lands in the box.
					const timer = setTimeout(() => {
						if (inputRef.current) inputRef.current.focus();
					}, 0);
					return () => clearTimeout(timer);
				}, [open]);

				React.useEffect(() => {
					if (cursor > rows.length - 1) setCursor(Math.max(0, rows.length - 1));
				}, [rows.length, cursor]);

				if (!open) return null;

				const close = () => quickStore.set({ open: false });
				const choose = (sessionId) => {
					close();
					if (typeof props.onOpenSession === "function") props.onOpenSession(sessionId);
				};
				const onKeyDown = (event) => {
					if (event.key === "Escape") {
						event.preventDefault();
						close();
					} else if (event.key === "ArrowDown") {
						event.preventDefault();
						setCursor((value) => (rows.length === 0 ? 0 : (value + 1) % rows.length));
					} else if (event.key === "ArrowUp") {
						event.preventDefault();
						setCursor((value) => (rows.length === 0 ? 0 : (value - 1 + rows.length) % rows.length));
					} else if (event.key === "Enter") {
						event.preventDefault();
						const row = rows[cursor];
						if (row) choose(row.id);
					}
				};

				return e(
					"div",
					{
						className: "st-quick",
						role: "dialog",
						"aria-modal": "true",
						"aria-label": translate("quick.aria"),
						onPointerDown: (event) => {
							if (event.target === event.currentTarget) close();
						},
					},
					e(
						"div",
						{ className: "st-quick-card", onKeyDown },
						e(
							"div",
							{ className: "st-quick-head" },
							e("span", { className: "st-quick-title" }, translate("quick.title")),
							e("input", {
								ref: inputRef,
								className: "st-quick-input",
								value: query,
								placeholder: translate("quick.placeholder"),
								"aria-label": translate("quick.aria"),
								onChange: (event) => {
									setQuery(event.target.value);
									setCursor(0);
								},
							}),
						),
						rows.length === 0
							? e("p", { className: "st-empty", style: { padding: "14px 12px" } }, translate("quick.empty"))
							: e(
									"ul",
									{ className: "st-quick-list", role: "listbox" },
									rows.map((row, index) =>
										e(
											"li",
											{ key: row.id, role: "option", "aria-selected": index === cursor },
											e(
												"button",
												{
													type: "button",
													className: "st-quick-row",
													"data-active": index === cursor ? "true" : undefined,
													onPointerEnter: () => setCursor(index),
													onClick: () => choose(row.id),
												},
												e("span", { className: "st-quick-row-title" }, row.title),
												e(
													"span",
													{ className: "st-session-tags" },
													row.tags.map((tag) =>
														e("span", {
															key: tag.id,
															className: "st-swatch",
															style: { backgroundColor: tag.color },
															title: tag.name,
														}),
													),
												),
											),
										),
									),
								),
						e("div", { className: "st-quick-foot" }, translate("quick.hint")),
					),
				);
			}

			// --- wiring ------------------------------------------------------------

			/**
			 * Open one session's conversation, whatever surface asked for it.
			 *
			 * The panel and the quick-jump layer both jump, so the navigation
			 * hop lives here once rather than in each component.
			 * @param sessionId - the session to show.
			 */
			const openSession = (sessionId) => {
				const uiWorkspace = ctx.get("uiWorkspace");
				if (uiWorkspace && typeof uiWorkspace.openSession === "function") {
					try {
						uiWorkspace.openSession(sessionId);
					} catch {}
				}
			};

			ctx.slots.inject("sidebar.session.row.leading", () =>
				ctx.slots.register(
					{
						name: "sidebar.session.row.leading",
						id: "session-tag",
						order: 100,
						locale: NS,
					},
					TagDot,
				),
			);

			ctx.slots.inject("sidebar.session.row.hover", () =>
				ctx.slots.register(
					{
						name: "sidebar.session.row.hover",
						id: "session-tag",
						order: 100,
						locale: NS,
					},
					SessionTagChips,
				),
			);

			ctx.slots.inject("sidebar.workspaces.session.menu.item", () =>
				ctx.slots.register(
					{
						name: "sidebar.workspaces.session.menu.item",
						id: "session-tag",
						order: 500,
						locale: NS,
					},
					TagMenuItems,
				),
			);

			ctx.slots.inject("shell.overlay", () =>
				ctx.slots.register(
					{
						name: "shell.overlay",
						id: "session-tag-dialog",
						order: 100,
						locale: NS,
					},
					TagManagerDialog,
				),
			);

			ctx.slots.inject("settings.plugins.tab", () =>
				ctx.slots.register(
					{
						name: "settings.plugins.tab",
						id: "session-tag",
						order: 100,
						label: () => t("settings.title"),
						locale: NS,
					},
					TagSettingsPage,
				),
			);

			// The sidebar's panel list entry (beside 插件 / 自动化任务) and the
			// main panel it selects: the tag palette as a filter plus the tagged
			// session list.
			ctx.slots.inject("sidebar.panellist", () =>
				ctx.slots.register(
					{
						name: "sidebar.panellist",
						id: "session-tag",
						order: 100,
						locale: NS,
						label: () => t("panel.label"),
					},
					TagPanelIcon,
				),
			);

			ctx.slots.inject("main", () =>
				ctx.slots.register(
					{
						name: "main",
						key: PANEL_ID,
						locale: NS,
						inject: () => ({ onOpenSession: openSession }),
					},
					TagPanelPage,
				),
			);

			// The Ctrl+P quick-jump layer, over the tagged sessions only.
			ctx.slots.inject("shell.overlay", () =>
				ctx.slots.register(
					{
						name: "shell.overlay",
						id: "session-tag-quick-jump",
						order: 200,
						locale: NS,
						inject: () => ({ onOpenSession: openSession }),
					},
					TagQuickJump,
				),
			);

			// Ctrl+P. The desktop shell accepts the bare chord outright. The Web
			// runtime admits only a narrow set — a lone primary+letter is not in
			// it, while primary+shift is — so the browser gets the shifted
			// chord, and Web-on-Linux is left unbound because its admission list
			// is narrower still and a three-modifier chord would be worse than
			// no default. Registration validates every runtime/platform pair
			// before accepting the command, so one illegal cell would fail the
			// whole call and leave this plugin stuck in `loading`.
			ctx.effect(
				() =>
					ctx.shortcuts.register({
						id: "session-tag.quick-jump",
						label: () => t("shortcut.label"),
						aliases: ["tagged sessions", "jump to tagged session"],
						defaults: {
							"desktop:macos": { code: "KeyP", modifiers: ["primary"] },
							"desktop:windows": { code: "KeyP", modifiers: ["primary"] },
							"desktop:linux": { code: "KeyP", modifiers: ["primary"] },
							"web:macos": { code: "KeyP", modifiers: ["primary", "shift"] },
							"web:windows": { code: "KeyP", modifiers: ["primary", "shift"] },
						},
						regions: ["page", "editable"],
						modals: [],
						resolve: () => ({
							status: "handled",
							run: () => quickStore.set({ open: true }),
						}),
					}),
				"session-tag: quick-jump shortcut",
			);
		}

		exports.apply = apply;
		exports.inject = ["slots", "locale", "shortcuts"];
		return module.exports;
	},
});
