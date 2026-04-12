import type {StateStream} from 'lstream';
import type React from 'react';
import type {SurfacingEditor} from './SurfacingEditor';

export interface Tool {
  /** Reactive state stream — the SurfacingUI component subscribes to this. */
  readonly state$: StateStream<any>;
  init(editor: SurfacingEditor): void;
  onMouseMove(e: MouseEvent): void;
  onMouseDown(e: MouseEvent): void;
  onMouseUp(e: MouseEvent): void;
  onClick(e: MouseEvent): void;
  onKeyDown(e: KeyboardEvent): void;
  cleanup(): void;
  /**
   * Optional factory for the tool's overlay UI. If present, the editor
   * mounts the returned component while this tool is on top of the stack
   * and unmounts it when the tool is popped. Return `null` (or omit the
   * method) if the tool has no UI. The factory typically closes over
   * `this` and returns a parameterless component that internally
   * subscribes to `state$` via `useStream`.
   */
  createUI?(): React.FC | null;
}
