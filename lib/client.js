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

			// --- wiring ------------------------------------------------------------

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
		}

		exports.apply = apply;
		exports.inject = ["slots", "locale"];
		return module.exports;
	},
});
