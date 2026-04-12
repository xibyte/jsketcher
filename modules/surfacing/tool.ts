import type {SurfacingEditor} from './SurfacingEditor';

export interface Tool {
  init(editor: SurfacingEditor): void;
  onMouseMove(e: MouseEvent): void;
  onMouseDown(e: MouseEvent): void;
  onMouseUp(e: MouseEvent): void;
  onKeyDown(e: KeyboardEvent): void;
  cleanup(): void;
}
