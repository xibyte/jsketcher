import * as SceneGraph from 'scene/sceneGraph';
import ScalableLine from 'scene/objects/scalableLine';
import type {Tool} from '../../tool';
import type {SurfacingEditor} from '../../SurfacingEditor';

export class LoopInsertTool implements Tool {

  private editor!: SurfacingEditor;
  private previewGroup: any = null;
  private pending: {patchIdx: number, dir: 'u' | 'v', t: number} | null = null;

  init(editor: SurfacingEditor): void {
    this.editor = editor;
    this.previewGroup = SceneGraph.createGroup();
    this.previewGroup.visible = false;
    editor.workingGroup.add(this.previewGroup);
    document.body.style.cursor = 'crosshair';
  }

  onMouseDown(_e: MouseEvent): void {}

  onMouseUp(_e: MouseEvent): void {
    if (!this.pending) return;
    const {patchIdx, dir, t} = this.pending;
    this.editor.scene!.splitIsoline(patchIdx, dir, t);
    this.pending = null;
    this.editor.clearGroup(this.previewGroup);
    this.previewGroup.visible = false;
    this.editor.rebuildAll();
  }

  onMouseMove(e: MouseEvent): void {
    const hit = this.editor.raycast.raycastToUV(e);
    this.editor.clearGroup(this.previewGroup);

    if (!hit) {
      this.previewGroup.visible = false;
      this.pending = null;
      this.editor.requestRender();
      return;
    }

    let dir: 'u' | 'v' = Math.abs(hit.u - 0.5) < Math.abs(hit.v - 0.5) ? 'u' : 'v';
    if (e.shiftKey) dir = dir === 'u' ? 'v' : 'u';
    const t = Math.max(0.01, Math.min(0.99, dir === 'u' ? hit.u : hit.v));

    this.pending = {patchIdx: hit.patchIdx, dir, t};
    const scene = this.editor.scene!;
    const propagation = scene.computeIsolinePropagation(hit.patchIdx, dir, t);
    const ss = this.editor.sceneSetup;

    for (const seg of propagation) {
      const pts = scene.tessellateIsoline(seg.idx, seg.dir, seg.t, 24);
      const line = new ScalableLine(ss, pts, 3, 0xffcc00);
      line.renderOrder = 4;
      (line as any).raycast = () => {};
      this.previewGroup.add(line);
    }

    this.previewGroup.visible = true;
    this.editor.requestRender();
  }

  onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.editor.popTool();
    }
  }

  cleanup(): void {
    if (this.previewGroup) {
      this.editor.clearGroup(this.previewGroup);
      this.previewGroup.parent?.remove(this.previewGroup);
      this.previewGroup = null;
    }
    this.pending = null;
    document.body.style.cursor = '';
  }
}
