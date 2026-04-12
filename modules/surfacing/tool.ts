import type {StateStream} from 'lstream';
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
}
