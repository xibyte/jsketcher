import type {SurfacingEditor} from './SurfacingEditor';

export interface Tool {
  init(editor: SurfacingEditor): void;
  onMouseMove(e: MouseEvent): void;
  onMouseDown(e: MouseEvent): void;
  /** Always fires on mouse-up — use for state cleanup (e.g. clearing drag flags). */
  onMouseUp(e: MouseEvent): void;
  /** Fires only when mouse-up is a click (drag < threshold). */
  onClick(e: MouseEvent): void;
  onKeyDown(e: KeyboardEvent): void;
  cleanup(): void;
}
