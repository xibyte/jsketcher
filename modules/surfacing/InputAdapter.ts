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
  private _clickStartX = 0;
  private _clickStartY = 0;

  private _onMouseDown: (e: MouseEvent) => void;
  private _onMouseUp: (e: MouseEvent) => void;
  private _onMouseMove: (e: MouseEvent) => void;
  private _onKeyDown: (e: KeyboardEvent) => void;

  constructor(editor: SurfacingEditor) {
    this.editor = editor;
    this.dom = editor.sceneSetup.renderer.domElement;

    this._onMouseDown = (e: MouseEvent) => {
      this._clickStartX = e.offsetX;
      this._clickStartY = e.offsetY;
      this.editor.currentTool.onMouseDown(e);
    };

    this._onMouseUp = (e: MouseEvent) => {
      const dx = Math.abs(e.offsetX - this._clickStartX);
      const dy = Math.abs(e.offsetY - this._clickStartY);
      if (dx < CLICK_THRESHOLD && dy < CLICK_THRESHOLD && e.button === 0) {
        this.editor.currentTool.onMouseUp(e);
      }
    };

    this._onMouseMove = (e: MouseEvent) => {
      this.editor.currentTool.onMouseMove(e);
    };

    this._onKeyDown = (e: KeyboardEvent) => {
      this.editor.currentTool.onKeyDown(e);
    };

    this.dom.addEventListener('mousedown', this._onMouseDown);
    this.dom.addEventListener('mouseup', this._onMouseUp);
    this.dom.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('keydown', this._onKeyDown);
  }

  dispose(): void {
    this.dom.removeEventListener('mousedown', this._onMouseDown);
    this.dom.removeEventListener('mouseup', this._onMouseUp);
    this.dom.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('keydown', this._onKeyDown);
    document.body.style.cursor = '';
  }
}
