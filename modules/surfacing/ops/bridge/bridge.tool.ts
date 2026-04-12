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
  private edge1: {patchIdx: number, side: number} | null = null;
  private edge2: {patchIdx: number, side: number} | null = null;
  private flipped = false;
  private previewGroup: any = null;
  private markedCurves: BoundingCurve[] = [];
  private guide: ModeGuideState = createModeGuideState();

  init(editor: SurfacingEditor): void {
    this.editor = editor;
    this.previewGroup = SceneGraph.createGroup();
    this.previewGroup.visible = false;
    editor.workingGroup.add(this.previewGroup);
    document.body.style.cursor = 'crosshair';
    showModeGuide(this.guide, {
      title: 'Bridge Surface',
      hint: 'Click two edges · Tab=flip · G=G1 · Esc=cancel',
      onG1Toggle: () => toggleG1(this.guide),
      onFlip: () => this.flip(),
    });
  }

  onMouseDown(_e: MouseEvent): void {}
  onMouseUp(_e: MouseEvent): void {}

  onClick(e: MouseEvent): void {
    const hit = this.editor.raycast.raycastSurfaceEdge(e);
    if (!hit) return;

    if (!this.edge1) {
      this.edge1 = hit;
      this.updatePreview();
      return;
    }

    if (!this.edge2) {
      this.edge2 = hit;
      const scene = this.editor.scene!;
      const e1 = scene.surfaces[this.edge1.patchIdx].getEdgeVertices(this.edge1.side);
      const e2 = scene.surfaces[hit.patchIdx].getEdgeVertices(hit.side);
      const fwd = vdist(e1[0].position, e2[0].position) + vdist(e1[3].position, e2[3].position);
      const rev = vdist(e1[0].position, e2[3].position) + vdist(e1[3].position, e2[0].position);
      this.flipped = rev < fwd;
      this.updatePreview();
      return;
    }

    // Third click = execute
    this.execute();
  }

  onMouseMove(_e: MouseEvent): void {}

  onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.editor.popTool();
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      this.flip();
      return;
    }
    if (e.key === 'g' || e.key === 'G') {
      toggleG1(this.guide);
      return;
    }
    if (e.key === 'Enter' && this.edge1 && this.edge2) {
      this.execute();
    }
  }

  cleanup(): void {
    this.clearMarks();
    if (this.previewGroup) {
      this.editor.clearGroup(this.previewGroup);
      this.previewGroup.parent?.remove(this.previewGroup);
      this.previewGroup = null;
    }
    document.body.style.cursor = '';
    closeModeGuide(this.guide);
    this.edge1 = null;
    this.edge2 = null;
    this.flipped = false;
  }

  private flip(): void {
    if (!this.edge1 || !this.edge2) return;
    this.flipped = !this.flipped;
    this.updatePreview();
    this.editor.requestRender();
  }

  private execute(): void {
    if (!this.edge1 || !this.edge2) return;
    const scene = this.editor.scene!;
    const e1 = scene.surfaces[this.edge1.patchIdx].getEdgeVertices(this.edge1.side);
    const e2 = scene.surfaces[this.edge2.patchIdx].getEdgeVertices(this.edge2.side);
    bridgeSurface(scene, e1, e2, {
      flipped: this.flipped,
      g1: this.guide.g1,
      sourcePatchIdx: this.edge1.patchIdx,
    });
    this.editor.rebuildAll();
    this.resetState();
    this.editor.requestRender();
  }

  private resetState(): void {
    this.clearMarks();
    this.edge1 = null;
    this.edge2 = null;
    this.flipped = false;
    if (this.previewGroup) {
      this.editor.clearGroup(this.previewGroup);
      this.previewGroup.visible = false;
    }
  }

  private updatePreview(): void {
    if (!this.previewGroup) return;
    this.editor.clearGroup(this.previewGroup);
    this.clearMarks();

    const scene = this.editor.scene!;
    const ss = this.editor.sceneSetup;

    if (this.edge1) {
      const curve = scene.surfaces[this.edge1.patchIdx].getBoundingCurve(this.edge1.side);
      curve.mark(EDGE1_COLOR);
      this.markedCurves.push(curve);
    }

    if (this.edge2) {
      const curve = scene.surfaces[this.edge2.patchIdx].getBoundingCurve(this.edge2.side);
      curve.mark(EDGE2_COLOR);
      this.markedCurves.push(curve);

      const e1v = scene.surfaces[this.edge1!.patchIdx].getEdgeVertices(this.edge1!.side);
      let e2v = scene.surfaces[this.edge2.patchIdx].getEdgeVertices(this.edge2.side);
      if (this.flipped) e2v = [e2v[3], e2v[2], e2v[1], e2v[0]];
      for (let ci = 0; ci < 4; ci += 3) {
        const line = new ScalableLine(ss, [e1v[ci].position, e2v[ci].position], 2, 0xaaaaaa);
        line.renderOrder = 4;
        (line as any).raycast = () => {};
        this.previewGroup.add(line);
      }
      this.previewGroup.visible = true;
    } else {
      this.previewGroup.visible = false;
    }

    this.editor.requestRender();
  }

  private clearMarks(): void {
    for (const c of this.markedCurves) c.unmark();
    this.markedCurves.length = 0;
  }
}
