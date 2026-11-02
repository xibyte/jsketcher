import type {SurfacingEditor} from './SurfacingEditor';

/**
 * A Wizard is an optional per-operation helper that owns its own state
 * and contributes UI to the surfacing ports. It's the non-interactive
 * sibling of a Tool: a Wizard is not part of the tool stack, doesn't
 * respond to raw mouse/keyboard, and typically runs until the user
 * applies or cancels the underlying operation.
 *
 * Lifecycle:
 *   - `start(editor)`   — called when the wizard begins (e.g. from an
 *                         action button). Typically stashes the editor,
 *                         initializes reactive state, and contributes
 *                         components via `addToPort(...)`.
 *   - `cleanup()`       — called when the wizard ends (apply, cancel,
 *                         or forced teardown). Should remove every
 *                         component it contributed via
 *                         `removeFromPort(...)`.
 *
 * Concrete wizards live next to their operation, conventionally as
 * `ops/<name>/<name>.wizard.ts`, paired with a `<name>.ui.tsx` factory
 * that renders the wizard's panel. There is no central registry — the
 * caller just does `new FooWizard().start(editor)` and the wizard takes
 * care of itself from there.
 */
export interface Wizard {
  start(editor: SurfacingEditor): void;
  cleanup(): void;
}
