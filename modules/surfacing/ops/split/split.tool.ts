import * as SceneGraph from 'scene/sceneGraph';
import ScalableLine from 'scene/objects/scalableLine';
import type {Tool} from '../../tool';
import type {SurfacingEditor} from '../../SurfacingEditor';

export class LoopInsertTool implements Tool {

  private editor!: SurfacingEditor;
  private _previewGroup: any = null;
  private _pending: {patchIdx: number, dir: 'u' | 'v', t: number} | null = null;

  init(editor: SurfacingEditor): void {
    this.editor = editor;
    this._previewGroup = SceneGraph.createGroup();
    this._previewGroup.visible = false;
    editor.workingGroup.add(this._previewGroup);
    document.body.style.cursor = 'crosshair';
  }

  onMouseDown(_e: MouseEvent): void {}

  onMouseUp(_e: MouseEvent): void {
    if (!this._pending) return;
    const {patchIdx, dir, t} = this._pending;
    this.editor.scene!.splitIsoline(patchIdx, dir, t);
    this._pending = null;
    this.editor.clearGroup(this._previewGroup);
    this._previewGroup.visible = false;
    this.editor.rebuildAll();
  }

  onMouseMove(e: MouseEvent): void {
    const hit = this.editor.raycast.raycastToUV(e);
    this.editor.clearGroup(this._previewGroup);

    if (!hit) {
      this._previewGroup.visible = false;
      this._pending = null;
      this.editor.requestRender();
      return;
    }

    let dir: 'u' | 'v' = Math.abs(hit.u - 0.5) < Math.abs(hit.v - 0.5) ? 'u' : 'v';
    if (e.shiftKey) dir = dir === 'u' ? 'v' : 'u';
    const t = Math.max(0.01, Math.min(0.99, dir === 'u' ? hit.u : hit.v));

    this._pending = {patchIdx: hit.patchIdx, dir, t};
    const scene = this.editor.scene!;
    const propagation = scene.computeIsolinePropagation(hit.patchIdx, dir, t);
    const ss = this.editor.sceneSetup;

    for (const seg of propagation) {
      const pts = scene.tessellateIsoline(seg.idx, seg.dir, seg.t, 24);
      const line = new ScalableLine(ss, pts, 3, 0xffcc00);
      line.renderOrder = 4;
      (line as any).raycast = () => {};
      this._previewGroup.add(line);
    }

    this._previewGroup.visible = true;
    this.editor.requestRender();
  }

  onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.editor.popTool();
    }
  }

  cleanup(): void {
    if (this._previewGroup) {
      this.editor.clearGroup(this._previewGroup);
      this._previewGroup.parent?.remove(this._previewGroup);
      this._previewGroup = null;
    }
    this._pending = null;
    document.body.style.cursor = '';
  }
}
