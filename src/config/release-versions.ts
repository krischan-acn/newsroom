/**
 * True when the backend can actually group translations. Flips to a real check
 * once the grouping key exists; until then the sidebar uses it to decide
 * whether the block is showing a complete picture or just the current edition.
 *
 * Lives here rather than in services/release-versions.ts so the (client)
 * sidebar can read it without importing that service, which pulls in the
 * server-only slug code and its `transliteration` tables.
 */
export const RELEASE_VERSIONS_SUPPORTED = false;
