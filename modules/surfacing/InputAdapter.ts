import type {SurfacingEditor} from './SurfacingEditor';

const CLICK_THRESHOLD = 3;

/**
 * Translates raw DOM mouse / keyboard events into tool callbacks.
 * Owns the event listener lifecycle — attach in constructor, detach
 * in dispose(). The editor holds one of these and never touches DOM
 * events directly.
 */
export class InputAdapter {

  private editor: SurfacingEditor;
  private dom: HTMLElement;
  private clickStartX = 0;
  private clickStartY = 0;

  private onMouseDown: (e: MouseEvent) => void;
  private onMouseUp: (e: MouseEvent) => void;
  private onMouseMove: (e: MouseEvent) => void;
  private onKeyDown: (e: KeyboardEvent) => void;

  constructor(editor: SurfacingEditor) {
    this.editor = editor;
    this.dom = editor.sceneSetup.renderer.domElement;

    this.onMouseDown = (e: MouseEvent) => {
      this.clickStartX = e.offsetX;
      this.clickStartY = e.offsetY;
      this.editor.currentTool.onMouseDown(e);
    };

    this.onMouseUp = (e: MouseEvent) => {
      const dx = Math.abs(e.offsetX - this.clickStartX);
      const dy = Math.abs(e.offsetY - this.clickStartY);
      if (dx < CLICK_THRESHOLD && dy < CLICK_THRESHOLD && e.button === 0) {
        this.editor.currentTool.onMouseUp(e);
      }
    };

    this.onMouseMove = (e: MouseEvent) => {
      this.editor.currentTool.onMouseMove(e);
    };

    this.onKeyDown = (e: KeyboardEvent) => {
      this.editor.currentTool.onKeyDown(e);
    };

    this.dom.addEventListener('mousedown', this.onMouseDown);
    this.dom.addEventListener('mouseup', this.onMouseUp);
    this.dom.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('keydown', this.onKeyDown);
  }

  dispose(): void {
    this.dom.removeEventListener('mousedown', this.onMouseDown);
    this.dom.removeEventListener('mouseup', this.onMouseUp);
    this.dom.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('keydown', this.onKeyDown);
    document.body.style.cursor = '';
  }
}
