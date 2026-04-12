/**
 * Module-level selection helpers used to live here as a `select(entity)` /
 * `selection$` stream. That's now gone — every entity owns its own
 * `select()` / `deselect()` method and routes through `ctx.editor` hooks
 * for gizmo + dialog side effects. This file stays as a placeholder so
 * `three/index.ts` can keep re-exporting from it without a broken import
 * during the rename.
 */
export {};
