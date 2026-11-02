import type {StateStream} from 'lstream';
import type {SurfacingEditor} from './SurfacingEditor';

/**
 * A Tool is an interactive mode that lives on the editor's tool stack
 * and responds to raw mouse / keyboard events. Tools own their own
 * reactive state and contribute UI via the port system
 * (`addToPort(...)` / `removeFromPort(...)` from `ui/SurfacingUI`).
 *
 * Lifecycle (driven by the editor's pushTool / popTool):
 *   - `init(editor)` — called when the tool becomes current. Typical
 *                      responsibilities: stash editor reference, set up
 *                      preview overlays, contribute components to ports.
 *   - `cleanup()`    — called when the tool is no longer current.
 *                      Tear down whatever init set up, and remove every
 *                      component this tool contributed to the ports.
 */
export interface Tool {
  /** Reactive state stream — the tool's UI factory subscribes to this. */
  readonly state$: StateStream<any>;
  init(editor: SurfacingEditor): void;
  onMouseMove(e: MouseEvent): void;
  onMouseDown(e: MouseEvent): void;
  onMouseUp(e: MouseEvent): void;
  onClick(e: MouseEvent): void;
  onKeyDown(e: KeyboardEvent): void;
  cleanup(): void;
}
