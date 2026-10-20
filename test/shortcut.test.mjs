/**
 * Validate this plugin's shortcut defaults against the shortcuts service's own
 * admission rules.
 *
 * `ctx.shortcuts.register` validates every runtime/platform pair before it
 * accepts a command; one illegal cell throws, and because the call runs inside
 * `apply`, the plugin then stays in `loading` and the whole web boot aborts.
 * That failure mode is invisible to the ordinary logic check, so this file
 * replays the service's validation with helpers lifted verbatim from the
 * shipped client bundle.
 *
 * Usage: point DSH_SHORTCUTS_SOURCE at the shortcuts client bundle, or pass it
 * as the first argument. The check is skipped when neither is available.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const pluginPath = join(here, "..", "lib", "client.js");
const sourcePath = process.argv[2] ?? process.env.DSH_SHORTCUTS_SOURCE;

if (!sourcePath) {
	console.log("skipped: set DSH_SHORTCUTS_SOURCE (or pass the shortcuts client bundle path)");
	process.exit(0);
}

const src = readFileSync(sourcePath, "utf8");
const plugin = readFileSync(pluginPath, "utf8");

/**
 * Lift one top-level `function NAME(...) {...}` out of the bundle by balancing
 * braces, so the check runs the service's real code rather than a paraphrase.
 * @param name - the function to extract.
 * @returns its source text.
 */
function lift(name) {
	const start = src.indexOf(`function ${name}(`);
	if (start < 0) throw new Error(`not found in the shortcuts bundle: ${name}`);
	let depth = 0;
	for (let index = src.indexOf("{", start); index < src.length; index += 1) {
		if (src[index] === "{") depth += 1;
		else if (src[index] === "}") {
			depth -= 1;
			if (depth === 0) return src.slice(start, index + 1);
		}
	}
	throw new Error(`unbalanced function: ${name}`);
}

const prelude = `
const keyNames = {
	Slash: "/", Comma: ",", Period: ".", Backslash: "\\\\", Backquote: "\`",
	Minus: "-", Equal: "=", BracketLeft: "[", BracketRight: "]", Semicolon: ";",
	Quote: "'", Enter: "Enter", Escape: "Esc", Space: "Space", Tab: "Tab",
	Backspace: "Backspace", Delete: "Delete",
	ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→"
};
const modifierOrder = ["control", "alt", "shift", "meta"];
`;

const helpers = new Function(
	`${prelude}
	${["normalizeBinding", "bindingKey", "isWebBindingAllowed", "bindingIssue"].map(lift).join("\n")}
	return { normalizeBinding, isWebBindingAllowed, bindingIssue };
	`,
)();

// The plugin's defaults, read out of its own bundle text so the check cannot
// drift from what actually ships.
const block = /defaults:\s*\{([\s\S]*?)\n\t{6}\},/.exec(plugin);
if (!block) {
	console.error("FAIL: could not locate the shortcut defaults in lib/client.js");
	process.exit(1);
}
const defaults = {};
for (const line of block[1].split("\n")) {
	const match = /"([^"]+)":\s*\{\s*code:\s*"([^"]+)",\s*modifiers:\s*\[([^\]]*)\]/.exec(line);
	if (!match) continue;
	defaults[match[1]] = {
		code: match[2],
		modifiers: match[3].split(",").map((value) => value.trim().replace(/"/g, "")).filter(Boolean),
	};
}

const platforms = ["desktop:macos", "desktop:windows", "desktop:linux", "web:macos", "web:windows", "web:linux"];
const failures = [];
for (const key of platforms) {
	const binding = defaults[key];
	if (!binding) continue; // register skips an absent platform
	const [runtime, platform] = key.split(":");
	let normalized;
	try {
		normalized = helpers.normalizeBinding(binding, platform);
	} catch (error) {
		failures.push(`${key}: ${error.message}`);
		continue;
	}
	const issue = helpers.bindingIssue(normalized, runtime, platform);
	if (issue !== null) failures.push(`${key}: reserved (${issue})`);
	if (runtime === "web" && !helpers.isWebBindingAllowed(normalized, platform)) {
		failures.push(`${key}: rejected by the Web admission rule`);
	}
}

if (failures.length > 0) {
	console.error(`shortcut defaults rejected by the real rules (${failures.length}):`);
	for (const failure of failures) console.error(`  - ${failure}`);
	process.exit(1);
}
console.log("shortcut defaults accepted by the real rules");
