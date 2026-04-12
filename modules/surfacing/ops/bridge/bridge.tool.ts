import * as SceneGraph from 'scene/sceneGraph';
import ScalableLine from 'scene/objects/scalableLine';
import {distance as vdist} from 'math/vec';
import {bridgeSurface} from './bridge.command';
import type {Tool} from '../../tool';
import type {SurfacingEditor} from '../../SurfacingEditor';
import type {BoundingCurve} from '../../models/BoundingCurve/BoundingCurve.entity';
import {createModeGuideState, showModeGuide, closeModeGuide, toggleG1, type ModeGuideState} from '../../ui/modeGuide';

const EDGE1_COLOR = 0x44ee44;
const EDGE2_COLOR = 0xee8800;

export class BridgeTool implements Tool {

  private editor!: SurfacingEditor;
  private _edge1: {patchIdx: number, side: number} | null = null;
  private _edge2: {patchIdx: number, side: number} | null = null;
  private _flipped = false;
  private _previewGroup: any = null;
  private _markedCurves: BoundingCurve[] = [];
  private _guide: ModeGuideState = createModeGuideState();

  init(editor: SurfacingEditor): void {
    this.editor = editor;
    this._previewGroup = SceneGraph.createGroup();
    this._previewGroup.visible = false;
    editor.workingGroup.add(this._previewGroup);
    document.body.style.cursor = 'crosshair';
    showModeGuide(this._guide, {
      title: 'Bridge Surface',
      hint: 'Click two edges · Tab=flip · G=G1 · Esc=cancel',
      onG1Toggle: () => toggleG1(this._guide),
      onFlip: () => this._flip(),
    });
  }

  onMouseDown(_e: MouseEvent): void {}

  onMouseUp(e: MouseEvent): void {
    const hit = this.editor.raycast.raycastSurfaceEdge(e);
    if (!hit) return;

    if (!this._edge1) {
      this._edge1 = hit;
      this._updatePreview();
      return;
    }

    if (!this._edge2) {
      this._edge2 = hit;
      const scene = this.editor.scene!;
      const e1 = scene.surfaces[this._edge1.patchIdx].getEdgeVertices(this._edge1.side);
      const e2 = scene.surfaces[hit.patchIdx].getEdgeVertices(hit.side);
      const fwd = vdist(e1[0].position, e2[0].position) + vdist(e1[3].position, e2[3].position);
      const rev = vdist(e1[0].position, e2[3].position) + vdist(e1[3].position, e2[0].position);
      this._flipped = rev < fwd;
      this._updatePreview();
      return;
    }

    // Third click = execute
    this._execute();
  }

  onMouseMove(_e: MouseEvent): void {}

  onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.editor.popTool();
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      this._flip();
      return;
    }
    if (e.key === 'g' || e.key === 'G') {
      toggleG1(this._guide);
      return;
    }
    if (e.key === 'Enter' && this._edge1 && this._edge2) {
      this._execute();
    }
  }

  cleanup(): void {
    this._clearMarks();
    if (this._previewGroup) {
      this.editor.clearGroup(this._previewGroup);
      this._previewGroup.parent?.remove(this._previewGroup);
      this._previewGroup = null;
    }
    document.body.style.cursor = '';
    closeModeGuide(this._guide);
    this._edge1 = null;
    this._edge2 = null;
    this._flipped = false;
  }

  private _flip(): void {
    if (!this._edge1 || !this._edge2) return;
    this._flipped = !this._flipped;
    this._updatePreview();
    this.editor.requestRender();
  }

  private _execute(): void {
    if (!this._edge1 || !this._edge2) return;
    const scene = this.editor.scene!;
    const e1 = scene.surfaces[this._edge1.patchIdx].getEdgeVertices(this._edge1.side);
    const e2 = scene.surfaces[this._edge2.patchIdx].getEdgeVertices(this._edge2.side);
    bridgeSurface(scene, e1, e2, {
      flipped: this._flipped,
      g1: this._guide.g1,
      sourcePatchIdx: this._edge1.patchIdx,
    });
    this.editor.rebuildAll();
    this._resetState();
    this.editor.requestRender();
  }

  private _resetState(): void {
    this._clearMarks();
    this._edge1 = null;
    this._edge2 = null;
    this._flipped = false;
    if (this._previewGroup) {
      this.editor.clearGroup(this._previewGroup);
      this._previewGroup.visible = false;
    }
  }

  private _updatePreview(): void {
    if (!this._previewGroup) return;
    this.editor.clearGroup(this._previewGroup);
    this._clearMarks();

    const scene = this.editor.scene!;
    const ss = this.editor.sceneSetup;

    if (this._edge1) {
      const curve = scene.surfaces[this._edge1.patchIdx].getBoundingCurve(this._edge1.side);
      curve.mark(EDGE1_COLOR);
      this._markedCurves.push(curve);
    }

    if (this._edge2) {
      const curve = scene.surfaces[this._edge2.patchIdx].getBoundingCurve(this._edge2.side);
      curve.mark(EDGE2_COLOR);
      this._markedCurves.push(curve);

      const e1v = scene.surfaces[this._edge1!.patchIdx].getEdgeVertices(this._edge1!.side);
      let e2v = scene.surfaces[this._edge2.patchIdx].getEdgeVertices(this._edge2.side);
      if (this._flipped) e2v = [e2v[3], e2v[2], e2v[1], e2v[0]];
      for (let ci = 0; ci < 4; ci += 3) {
        const line = new ScalableLine(ss, [e1v[ci].position, e2v[ci].position], 2, 0xaaaaaa);
        line.renderOrder = 4;
        (line as any).raycast = () => {};
        this._previewGroup.add(line);
      }
      this._previewGroup.visible = true;
    } else {
      this._previewGroup.visible = false;
    }

    this.editor.requestRender();
  }

  private _clearMarks(): void {
    for (const c of this._markedCurves) c.unmark();
    this._markedCurves.length = 0;
  }
}
