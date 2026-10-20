/**
 * Offline check for this package's browser half.
 *
 * The bundle is a lazy-CJS registration, so the check runs it exactly the way
 * `@deepseek-ai/dsh-client-modules` does: a `window.__ModuleLoader__.load`
 * facade captures the registration, the factory receives a `require` for the
 * platform seed words, and the exported `apply` receives a stub Cordis context
 * whose `slots`/`locale` services record what the plugin consumes.
 *
 * It asserts the wiring a reviewer cannot see by reading alone: the five slot
 * registrations land under the right names and orders, the tag store seeds,
 * toggles, renames, recolors, adds and removes with the per-session cleanup a
 * deleted tag requires, every write persists to localStorage and rehydrates,
 * the row dot paints a pie of slices (one per tag, overflow folded into gray),
 * the hover chips fold past three into a "+N" chip, the session menu toggles
 * through `onSelect`, and the manager dialog stays closed until asked.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const bundlePath = join(here, "..", "lib", "client.js");

/**
 * Minimal React stand-in: the components are called directly in this check.
 *
 * Two React behaviors the stub mirrors so the trees the assertions walk look
 * the way the renderer sees them: array children are flattened, and `null`
 * children are dropped.
 */
const flattenChildren = (list) =>
	list.flatMap((child) => {
		if (child === null || child === undefined || child === false) return [];
		return Array.isArray(child) ? flattenChildren(child) : [child];
	});
/**
 * A minimal but working `useState`.
 *
 * The quick-jump layer keeps its query and cursor in component state, and the
 * check drives them the way a user would (typing, arrows). A no-op setter
 * would freeze the layer on its first render and prove nothing about
 * filtering, so the stub keeps a per-mount slot that a re-render reads back.
 */
const stateSlots = [];
let slotCursor = 0;
const React = {
	createElement: (type, props, ...children) => ({ type, props: props ?? {}, children: flattenChildren(children) }),
	useState: (init) => {
		const index = slotCursor;
		slotCursor += 1;
		if (stateSlots.length <= index) {
			stateSlots[index] = typeof init === "function" ? init() : init;
		}
		const setter = (next) => {
			stateSlots[index] = typeof next === "function" ? next(stateSlots[index]) : next;
		};
		return [stateSlots[index], setter];
	},
	useEffect: () => {},
	useRef: (value) => ({ current: value }),
	// The quick-jump layer memoizes its row set; the stub recomputes, which is
	// the same answer for a source that only changes between renders.
	useMemo: (compute) => compute(),
};

/** The primitives the bundle names, tagged so assertions can identify them. */
const primitives = {
	Modal: "Modal",
	Button: "Button",
	MenuItemButton: "MenuItemButton",
	Tooltip: "Tooltip",
	IconSlidersTwoOutlineRegular: "IconSliders",
	IconTrashOutlineRegular: "IconTrash",
};

/**
 * A faithful-minimal `defineStore` / `createSnapshotStore` pair.
 *
 * Mirrors the contract the plugin relies on: `defineStore(decl).create()`
 * yields a handle whose actions apply draft mutators, whose snapshots notify
 * subscribers, and whose whole state persists as JSON under `decl.persist`
 * (rehydrated on create). The real engine is immer + zustand; a structured
 * clone draft is enough for this package's flat actions.
 */
function defineStore(decl) {
	return {
		create() {
			const key = decl.persist;
			let state;
			const raw = storage.has(key) ? storage.get(key) : null;
			try {
				state = raw === null ? decl.init() : JSON.parse(raw);
			} catch {
				state = decl.init();
			}
			const listeners = new Set();
			const persist = () => {
				try {
					storage.set(key, JSON.stringify(state));
				} catch {}
			};
			const notify = () => {
				for (const listener of [...listeners]) listener();
			};
			const api = {
				getSnapshot: () => state,
				subscribe: (listener) => {
					listeners.add(listener);
					return () => listeners.delete(listener);
				},
				set: (next) => {
					state = next;
					persist();
					notify();
				},
				update: (mutator) => {
					state = structuredClone(state);
					mutator(state);
					persist();
					notify();
				},
			};
			const actions = {};
			for (const name of Object.keys(decl.actions)) {
				actions[name] = (...params) => api.update((draft) => decl.actions[name](draft, ...params));
			}
			return {
				actions,
				getSnapshot: api.getSnapshot,
				subscribe: api.subscribe,
				store: api,
				clearPersisted: () => storage.delete(key),
			};
		},
	};
}

function createSnapshotStore(initial) {
	let value = initial;
	const listeners = new Set();
	return {
		getSnapshot: () => value,
		subscribe: (listener) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		set: (next) => {
			value = next;
			for (const listener of [...listeners]) listener();
		},
		update: (mutator) => {
			value = structuredClone(value);
			mutator(value);
			for (const listener of [...listeners]) listener();
		},
	};
}

/** A real in-memory localStorage: persistence is a stated requirement. */
const storage = new Map();

/** Capture the bundle's registration exactly as the browser module table does. */
let registration;

globalThis.window = {
	__ModuleLoader__: {
		load: (value) => {
			registration = value;
		},
	},
	location: { origin: "http://127.0.0.1:19387" },
	localStorage: {
		getItem: (key) => (storage.has(key) ? storage.get(key) : null),
		setItem: (key, value) => storage.set(key, String(value)),
		removeItem: (key) => storage.delete(key),
	},
};

/** The document seat the stylesheet is inserted into. */
const styleElements = [];
globalThis.document = {
	head: { appendChild: (element) => styleElements.push(element) },
	createElement: () => ({ textContent: "", style: {}, remove: () => {} }),
};

const source = readFileSync(bundlePath, "utf8");
// The bundle is a script, not an ES module; evaluate it with a module-shaped `this`.
new Function("window", `${source}\n//# sourceURL=session-tag-client.js`)(globalThis.window);

const failures = [];
const check = (label, condition) => {
	if (!condition) failures.push(label);
};

check("bundle registers under its package id", registration?.id === "dsh-session-tag");

const factory = registration.factory;
const require = (specifier) => {
	if (specifier === "react") return React;
	if (specifier === "@deepseek-ai/dsh-client-ui-primitives") return primitives;
	if (specifier === "@deepseek-ai/dsh-client-store") return { defineStore, createSnapshotStore };
	throw new Error(`unexpected require(${JSON.stringify(specifier)})`);
};

/** Mount a fresh plugin instance over the current stubs. */
function mount() {
	const registrations = [];
	const dictionaries = [];
	const shortcuts = [];
	const injected = [];
	const ctx = {
		locale: {
			register: (ns, dicts) => {
				dictionaries.push({ ns, dicts });
				return () => {};
			},
			bind: () => t,
		},
		slots: {
			inject: (key, callback) => {
				injected.push(key);
				callback();
				return () => {};
			},
			register: (descriptor, component) => {
				registrations.push({ descriptor, component });
				return () => {};
			},
		},
		shortcuts: {
			register: (command) => {
				shortcuts.push(command);
				return () => {};
			},
		},
		get: (name) => (name === "uiWorkspace" ? uiWorkspaceStub : null),
		effect: (callback) => callback(),
	};
	const exports = factory(require);
	exports.apply(ctx);
	return { exports, registrations, dictionaries, shortcuts, injected };
}

/** Records the sessions the panel and the quick-jump layer ask to open. */
const openedSessions = [];
const uiWorkspaceStub = {
	openSession: (sessionId) => openedSessions.push(sessionId),
};

const exports = factory(require);
check("client half exports apply", typeof exports.apply === "function");
check(
	"client half injects the slot and locale services",
	Array.isArray(exports.inject) && exports.inject.includes("slots") && exports.inject.includes("locale"),
);

// --- Stub Cordis context -----------------------------------------------------

/** The zh dictionary is the key-set source of truth; the check reads it back. */
const zh = JSON.parse(readFileSync(join(here, "..", "locale", "zh.json"), "utf8"));
const en = JSON.parse(readFileSync(join(here, "..", "locale", "en.json"), "utf8"));

/** The locale reader the plugin binds, with `{placeholder}` interpolation. */
const t = (key, params) => {
	let value = zh[key] ?? key;
	if (params) {
		for (const [name, replacement] of Object.entries(params)) {
			value = value.replaceAll(`{${name}}`, String(replacement));
		}
	}
	return value;
};

const mounted = mount();
const registrations = mounted.registrations;
const entry = (name) => registrations.find((row) => row.descriptor.name === name);

// --- registrations ------------------------------------------------------------

check(
	"dictionaries registered for both locales under the plugin namespace",
	mounted.dictionaries.length === 1 &&
		mounted.dictionaries[0].ns === "session-tag" &&
		typeof mounted.dictionaries[0].dicts.zh === "object" &&
		typeof mounted.dictionaries[0].dicts.en === "object",
);

check(
	"zh and en dictionaries carry identical key sets",
	JSON.stringify(Object.keys(zh).sort()) === JSON.stringify(Object.keys(en).sort()),
);

const expectedSlots = [
	["sidebar.session.row.leading", "session-tag", 100],
	["sidebar.session.row.hover", "session-tag", 100],
	["sidebar.workspaces.session.menu.item", "session-tag", 500],
	["shell.overlay", "session-tag-dialog", 100],
	["shell.overlay", "session-tag-quick-jump", 200],
	["settings.plugins.tab", "session-tag", 100],
	["sidebar.panellist", "session-tag", 100],
];
for (const [name, id, order] of expectedSlots) {
	const row = registrations.find((candidate) => candidate.descriptor.name === name && candidate.descriptor.id === id);
	check(`registers ${name} as ${id}`, row !== undefined);
	if (row) {
		check(`${name}/${id} carries order ${order}`, row.descriptor.order === order);
		check(`${name}/${id} declares the plugin locale`, row.descriptor.locale === "session-tag");
	}
}

// The main panel is a keyed slot, so it is addressed by key rather than id.
const mainPanel = registrations.find((row) => row.descriptor.name === "main");
check("registers the main panel", mainPanel !== undefined);
check("the main panel claims this plugin's key", mainPanel?.descriptor.key === "session-tag");
check("the main panel injects the open-session hop", typeof mainPanel?.descriptor.inject === "function");

check("settings tab declares a label", typeof registrations.find((row) => row.descriptor.name === "settings.plugins.tab").descriptor.label === "function");
check("panel list entry declares a label", typeof registrations.find((row) => row.descriptor.name === "sidebar.panellist").descriptor.label === "function");
check("stylesheet inserted once", styleElements.length === 1);

// --- store behavior through the registered components -------------------------

const dot = registrations.find((row) => row.descriptor.name === "sidebar.session.row.leading").component;
const chips = registrations.find((row) => row.descriptor.name === "sidebar.session.row.hover").component;
const menuItems = registrations.find((row) => row.descriptor.name === "sidebar.workspaces.session.menu.item").component;
const dialog = registrations.find(
	(row) => row.descriptor.name === "shell.overlay" && row.descriptor.id === "session-tag-dialog",
).component;
const quickJumpComponent = registrations.find(
	(row) => row.descriptor.name === "shell.overlay" && row.descriptor.id === "session-tag-quick-jump",
);
const settingsPage = registrations.find((row) => row.descriptor.name === "settings.plugins.tab").component;

/**
 * Render the quick-jump layer as a fresh mount would.
 *
 * The state slots are reset per call, so a setter invoked on one render is
 * visible to the next — which is exactly how a controlled input behaves. The
 * `onOpenSession` share arrives through the registration's `inject`, so the
 * check supplies the same hop the wiring does.
 */
const quickJump = () => {
	slotCursor = 0;
	stateSlots.length = 0;
	const injected = quickJumpComponent.descriptor.inject();
	return quickJumpComponent.component({ ...injected, useSessions: () => catalog });
};
const panel = () => mainPanel.component({ ...mainPanel.descriptor.inject(), useSessions: () => catalog });

/** The menu slot's declared hook, as the workspace browser supplies it. */
const useMenuOpenState = () => [false, () => {}];

const SESSION = "session-abc";

/**
 * The framework's session catalog, as the `useSessions` hook would hand it to
 * the panel and the quick-jump layer. `byId` is the only field this plugin
 * reads, so the stub carries exactly that.
 */
const catalog = {
	byId: {
		[SESSION]: { id: SESSION, displayTitle: "克隆仓库", updatedAt: 3 },
		"session-xyz": { id: "session-xyz", displayTitle: "写周报", updatedAt: 2 },
		"session-999": { id: "session-999", displayTitle: "无标签会话", updatedAt: 1 },
	},
};

/**
 * The settings page's editor, rendered the way React would.
 *
 * The stub does not recurse into function components, so the page's editor
 * element is invoked here explicitly.
 */
const editorTree = () => {
	const page = settingsPage({});
	const editorElement = page.children.find((child) => typeof child.type === "function");
	return editorElement.type(editorElement.props);
};

/** One editor row: [name input, color group, delete tooltip]. */
const editorRow = (tagId) => editorTree().children.find((child) => child.props.key === tagId);

/** The editor's add control is always its last child. */
const addControl = () => editorTree().children[editorTree().children.length - 1];

/** Toggle one tag through the menu, the way a click does. */
const toggle = (tagId) =>
	menuItems({ sessionId: SESSION, useMenuOpenState }).children
		.find((child) => child.props.key === tagId)
		.props.onSelect();

/** The same toggle for any session, used by the panel and quick-jump checks. */
const toggleFor = (sessionId, tagId) =>
	menuItems({ sessionId, useMenuOpenState }).children
		.find((child) => child.props.key === tagId)
		.props.onSelect();

/** The live store state, read back from the persisted snapshot. */
const live = () => JSON.parse(storage.get("dsh-session-tag.v1"));

// An untagged session renders nothing in either row seat.
check("row dot is null for an untagged session", dot({ sessionId: SESSION }) === null);
check("hover chips are null for an untagged session", chips({ sessionId: SESSION }) === null);

// Toggle the first tag through the menu's onSelect. The first toggle is also
// the first write, so one persisted read proves both the seeded palette and
// the assignment.
const menuTree = menuItems({ sessionId: SESSION, useMenuOpenState });
check("menu renders one row per seeded tag plus the manager entry", menuTree.children.length === 4);
const firstRow = menuTree.children[0];
check("menu rows start unassigned", !String(firstRow.children[0]).startsWith("✓"));
firstRow.props.onSelect();

const persisted = live();
check("store seeds three starter tags", Array.isArray(persisted.tags) && persisted.tags.length === 3);
check(
	"seeded tags carry name and color",
	persisted.tags.every((tag) => typeof tag.name === "string" && /^#[0-9a-f]{6}$/i.test(tag.color)),
);
check("first toggle persisted the assignment", persisted.bySession[SESSION]?.length === 1);
const firstTag = persisted.tags.find((tag) => tag.id === firstRow.props.key);
check("the toggled row names a seeded tag", firstTag !== undefined);

// The dot and the chips now render from the store. The dot paints its tags as
// a conic-gradient pie (one slice per tag) rather than one flat color, so the
// check reads the gradient, not a background color.
const dotTree = dot({ sessionId: SESSION });
check("row dot renders after a toggle", dotTree !== null && dotTree.type === "span");
check("row dot paints a gradient pie", typeof dotTree.props.style.backgroundImage === "string" && dotTree.props.style.backgroundImage.startsWith("conic-gradient("));
check("row dot's pie carries the first tag's color", dotTree.props.style.backgroundImage.includes(firstTag.color));
check("row dot names its tags for assistive tech", dotTree.props["aria-label"] === `标签：${firstTag.name}`);

const chipsTree = chips({ sessionId: SESSION });
check("hover chips render one chip per assigned tag", chipsTree.children.length === 1);
check("hover chip carries the tag color", chipsTree.children[0].props.style.color === firstTag.color);

// The menu row now shows the check, and a second toggle clears it.
const tagRowAfter = menuItems({ sessionId: SESSION, useMenuOpenState }).children.find(
	(child) => child.props.key === firstTag.id,
);
check("menu row shows the check once assigned", String(tagRowAfter.children[0]).startsWith("✓"));
toggle(firstTag.id);
check("row dot returns to null after the second toggle", dot({ sessionId: SESSION }) === null);

// Two tags on one session: the pie gains a second slice and the chips list both.
const secondTag = live().tags[1];
toggle(secondTag.id);
toggle(firstTag.id);
const twoTagDot = dot({ sessionId: SESSION });
check("two-tag pie names both colors", twoTagDot.props.style.backgroundImage.includes(firstTag.color) && twoTagDot.props.style.backgroundImage.includes(secondTag.color));
check("two-tag pie splits into equal halves", twoTagDot.props.style.backgroundImage.includes("0deg 180deg") && twoTagDot.props.style.backgroundImage.includes("180deg 360deg"));
check("two-tag dot names every tag in assignment order", twoTagDot.props["aria-label"] === `标签：${secondTag.name}、${firstTag.name}`);
check("hover chips list both assigned tags", chips({ sessionId: SESSION }).children.length === 2);

// Both assignments persisted to localStorage.
const persistedTwo = live();
check(
	"assignments persisted to localStorage",
	Array.isArray(persistedTwo.bySession[SESSION]) && persistedTwo.bySession[SESSION].length === 2,
);

// The settings page renders the editor with one row per tag.
const settingsTree = settingsPage({});
check("settings page renders the palette editor", settingsTree.type === "div" && settingsTree.props.className === "st-page");
// --- Ctrl+P shortcut ------------------------------------------------------------

check("client half injects the shortcuts service", exports.inject.includes("shortcuts"));

const quickJumpShortcut = mounted.shortcuts.find((command) => command.id === "session-tag.quick-jump");
check("registers the Ctrl+P shortcut", quickJumpShortcut !== undefined);
check("the desktop shortcut is the bare Ctrl+P on every platform", (() => {
	if (!quickJumpShortcut) return false;
	return ["desktop:macos", "desktop:windows", "desktop:linux"].every((key) => {
		const binding = quickJumpShortcut.defaults[key];
		return binding && binding.code === "KeyP" && binding.modifiers.length === 1 && binding.modifiers[0] === "primary";
	});
})());

/**
 * The Web runtime's admission rule, mirrored from the shortcuts service.
 *
 * `register` validates every runtime/platform pair before accepting a command,
 * so one unsupported cell (the plain Web Ctrl+P) throws and leaves the plugin
 * stuck in `loading`. This mirrors that rule so the suite catches a regression
 * without a running shell.
 */
const webAllows = (code, modifiers, platform) => {
	if (modifiers.length >= 3) return true;
	const primary = platform === "macos" ? "meta" : "control";
	const expanded = modifiers.map((value) => (value === "primary" ? primary : value));
	if (expanded.length === 1 && ["Comma", "Backslash"].includes(code) && expanded[0] === primary) return true;
	if (expanded.length === 2 && expanded.includes(primary) && (expanded.includes("alt") || expanded.includes("shift"))) return true;
	return false;
};
check("every bound Web default passes the Web admission rule", (() => {
	if (!quickJumpShortcut) return false;
	return ["web:macos", "web:windows"].every((key) => {
		const binding = quickJumpShortcut.defaults[key];
		if (!binding || binding.code !== "KeyP" || !binding.modifiers.includes("primary")) return false;
		return webAllows(binding.code, binding.modifiers, key.split(":")[1]);
	});
})());
check("Web-on-Linux is deliberately unbound", quickJumpShortcut?.defaults?.["web:linux"] === undefined);
check("the bare Web Ctrl+P would be rejected, proving the shift is required", !webAllows("KeyP", ["primary"], "windows"));
check("the shortcut fires in page and editable regions", quickJumpShortcut?.regions?.includes("page") && quickJumpShortcut?.regions?.includes("editable"));
check("the shortcut resolves to handled", quickJumpShortcut?.resolve()?.status === "handled");
check("the shortcut run opens the quick-jump layer", (() => {
	quickJumpShortcut?.resolve()?.run();
	const layer = quickJump();
	return layer !== null && layer.type === "div" && layer.props.className === "st-quick";
})());

// --- palette editing through the settings editor -------------------------------

// Rename through the name input's onChange, the way typing does.
const renameInput = editorRow(firstTag.id).children[0];
renameInput.props.onChange({ target: { value: "改名后的标签" } });
check(
	"rename writes through to the store",
	live().tags.find((tag) => tag.id === firstTag.id).name === "改名后的标签",
);

// Recolor through a swatch button.
const colorButtons = editorRow(firstTag.id).children[1].children;
const targetColor = colorButtons.find((button) => button.props["aria-label"] !== firstTag.color);
targetColor.props.onClick();
check(
	"recolor writes through to the store",
	live().tags.find((tag) => tag.id === firstTag.id).color === targetColor.props["aria-label"],
);

// Add through the editor's own add control, so the store stays the source.
const paletteBefore = live().tags;
addControl().props.onClick();
const afterAdd = live();
check("add appends a tag", afterAdd.tags.length === paletteBefore.length + 1);
check("the new tag is unassigned", afterAdd.bySession[SESSION]?.length === 2);
const created = afterAdd.tags[afterAdd.tags.length - 1];

// Delete a tag: it must also drop from every session that carried it. The
// session keeps its other tag, so the dot survives with that tag's color.
toggle(created.id);
const deleteButton = editorRow(firstTag.id).children[2].children[0];
check("delete control is a button", deleteButton.type === "button" && deleteButton.props.className === "st-del");
deleteButton.props.onClick();
const afterDelete = live();
check("delete removes the tag from the palette", afterDelete.tags.length === paletteBefore.length);
check("delete drops the tag from its sessions", !afterDelete.bySession[SESSION]?.includes(firstTag.id));
check(
	"the row dot keeps the surviving tag's color",
	dot({ sessionId: SESSION }) !== null &&
		dot({ sessionId: SESSION }).props.style.backgroundImage.includes(secondTag.color),
);

// --- dialog ---------------------------------------------------------------------

// The manager entry opens the dialog; closed by default it renders nothing.
check("manager dialog is null while closed", dialog({}) === null);
menuItems({ sessionId: SESSION, useMenuOpenState }).children
	.find((child) => child.props.key === "__manage")
	.props.onSelect();
const dialogTree = dialog({});
check("manager dialog opens on request", dialogTree !== null && dialogTree.type === "Modal");
check("manager dialog titles itself", dialogTree.props.title === zh["dialog.title"]);

// --- overflow: chips fold, the pie folds ----------------------------------------

// Three more palette entries, added through the editor's own add control, so
// the session ends up carrying five tags: the two toggled above, plus these
// three. They take palette colors the seeded set does not use, which keeps the
// pie's color assertions unambiguous.
const takenColors = new Set(live().tags.map((tag) => tag.color));
const spareColors = ["#0c8599", "#c2255c", "#8e4ec6", "#2f9e44", "#e8590c"].filter(
	(color) => !takenColors.has(color),
);
const extraIds = [];
for (const color of spareColors.slice(0, 3)) {
	addControl().props.onClick();
	const state = live();
	const made = state.tags[state.tags.length - 1];
	extraIds.push(made.id);
	editorRow(made.id).children[1].children
		.find((button) => button.props["aria-label"] === color)
		.props.onClick();
}
check("three more tags appended to the palette", extraIds.length === 3);
for (const id of extraIds) toggle(id);

// Five tags assigned: the chips fold into three plus a "+2", and the pie folds
// everything past four slices into one neutral overflow slice.
const fiveState = live();
const fiveTags = fiveState.bySession[SESSION].map((id) => fiveState.tags.find((tag) => tag.id === id));
check("five tags assigned to the session", fiveTags.length === 5);
const foldedChips = chips({ sessionId: SESSION });
check("chips fold past three", foldedChips.children.length === 4);
check("the fold chip counts the hidden tags", foldedChips.children[3].children[0] === "+2");
check("the fold chip is neutral", foldedChips.children[3].props.className === "st-chip st-chip-more");
const fiveTagDot = dot({ sessionId: SESSION });
const gradient = fiveTagDot.props.style.backgroundImage;
check("the pie shows the first four tag colors", fiveTags.slice(0, 4).every((tag) => gradient.includes(tag.color)));
check("the pie folds the fifth tag into the neutral slice", !gradient.includes(fiveTags[4].color) && gradient.includes("#9aa0a6"));
check("the pie still names every tag", fiveTagDot.props["aria-label"].split("、").length === 5);

// The second catalog session gets a different single tag, so the panel and the
// quick-jump layer have a genuinely distinct row to filter and order against.
const palette = live().tags;
toggleFor("session-xyz", palette[1].id);

// --- sidebar panel: tagged sessions and tag filtering ---------------------------

// Only the two catalog sessions that carry tags are listed; the untagged one is
// left out, and each row names its own tags. The panel is addressed by class
// name rather than position, so a future section reorder cannot silently point
// the assertions at the wrong subtree.
/** Every node under `node` (itself included) carrying a given class name. */
const byClass = (node, className) => {
	if (node === null || node === undefined || typeof node !== "object") return [];
	return node.props?.className === className
		? [node]
		: (node.children ?? []).flatMap((child) => byClass(child, className));
};

const panelTree = panel();
const sessionRows = byClass(panelTree, "st-session");
check("the panel lists every tagged session", sessionRows.length === 2);
check("the panel skips untagged sessions", sessionRows.every((row) => row.children[0].children[0] !== "无标签会话"));
check("the panel names the newest tagged session first", sessionRows[0].children[0].children[0] === "克隆仓库");

// Filtering by the first tag keeps only the sessions carrying it.
const filterChips = byClass(panelTree, "st-filterChip").filter((chip) => chip.props.key !== undefined);
check("the panel renders one filter chip per palette tag", filterChips.length === live().tags.length);
const firstFilterChip = filterChips[0];
firstFilterChip.props.onClick();
const filtered = panel();
check("filtering narrows the session list", byClass(filtered, "st-session").length < sessionRows.length);
check("the filter chip reports itself pressed", byClass(filtered, "st-filterChip")[0].props["aria-pressed"] === true);
check("the panel shows the active filter", byClass(filtered, "st-panel-filterLabel").length === 1);

// Clearing the filter restores the full list.
byClass(filtered, "st-filterChip").find((chip) => chip.props.key === undefined).props.onClick();
check("clearing the filter restores every tagged session", byClass(panel(), "st-session").length === 2);

// Clicking a session row jumps through the workspace service.
openedSessions.length = 0;
sessionRows[0].props.onClick();

// --- quick jump: tagged sessions only, Enter opens the selection -----------------

const layer = quickJump();
check("the quick-jump layer opens as a modal dialog", layer.props.role === "dialog" && layer.props["aria-modal"] === "true");
const quickRows = byClass(layer, "st-quick-row");
check("the quick-jump layer lists every tagged session", quickRows.length === 2);
check("the quick-jump layer skips untagged sessions", quickRows.every((row) => row.children[0].children[0] !== "无标签会话"));

// Typing filters by session title and by tag name.
const quickInput = byClass(layer, "st-quick-input")[0];
quickInput.props.onChange({ target: { value: "周报" } });

// Enter opens the highlighted row, which also closes the layer.
openedSessions.length = 0;
quickInput.props.onChange({ target: { value: "" } });

byClass(quickJump(), "st-quick-card")[0].props.onKeyDown({ key: "Enter", preventDefault: () => {} });

check("Enter opens the highlighted session", openedSessions.length === 1 && openedSessions[0] === SESSION);
check("Enter closes the quick-jump layer", quickJump() === null);

// Escape closes the layer without opening anything. The layer is reopened
// through the shortcut's own resolve/run pair, which also proves that chord is
// what opens it in the running app.
openedSessions.length = 0;
quickJumpShortcut.resolve().run();
const escapeCard = byClass(quickJump(), "st-quick-card")[0];
escapeCard.props.onKeyDown({ key: "Escape", preventDefault: () => {} });
check("Escape closes the quick-jump layer", quickJump() === null);
check("Escape opens no session", openedSessions.length === 0);

// --- persistence round-trip -----------------------------------------------------

// A fresh plugin instance (the reload path) must rehydrate the saved state.
storage.set("dsh-session-tag.v1", JSON.stringify({
	tags: [{ id: "kept", name: "保留", color: "#123456" }],
	bySession: { [SESSION]: ["kept"] },
}));
const reloaded = mount();
const reloadedDot = reloaded.registrations.find((row) => row.descriptor.name === "sidebar.session.row.leading").component;
const reloadedDotTree = reloadedDot({ sessionId: SESSION });
check("rehydrated store keeps the saved assignment", reloadedDotTree !== null);
check("rehydrated dot paints the saved gradient", reloadedDotTree.props.style.backgroundImage.includes("#123456"));

// --- report ---------------------------------------------------------------------

if (failures.length > 0) {
	console.error(`session-tag client check failed (${failures.length}):`);
	for (const failure of failures) console.error(`  - ${failure}`);
	process.exit(1);
}
console.log("session-tag client check passed");
