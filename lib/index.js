/**
 * Session tags, node half.
 *
 * The empty apply exists so the plugin appears in the host cordis.yml /
 * Loader; the browser half owns every surface through `exports["./client"]`,
 * discovered from the package.json `dsh.client` declaration. Tags are
 * browser-local state (localStorage through `@deepseek-ai/dsh-client-store`),
 * so this package registers no host service, route, or namespace of its own.
 */

/** Host plugin body — no host-side behavior for this surface plugin. */
function apply() {}

export { apply };
