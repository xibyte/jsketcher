import {traceHole, fillHole} from './fillHole.command';
import {applyG1AllSides} from '../continuity/continuity.command';
import type {Tool} from '../../tool';
import type {SurfacingEditor} from '../../SurfacingEditor';
import type {BoundingCurve} from '../../models/BoundingCurve/BoundingCurve.entity';
import {createModeGuideState, showModeGuide, closeModeGuide, toggleG1, type ModeGuideState} from '../../ui/modeGuide';

const LOOP_COLORS = [0x44ee44, 0xee8800, 0x4488ee, 0xee4444];

export class FillHoleTool implements Tool {

  private editor!: SurfacingEditor;
  private _loop: any[] | null = null;
  private _markedCurves: BoundingCurve[] = [];
  private _guide: ModeGuideState = createModeGuideState();

  init(editor: SurfacingEditor): void {
    this.editor = editor;
    document.body.style.cursor = 'crosshair';
    showModeGuide(this._guide, {
      title: 'Fill Hole',
      hint: 'Hover edge to preview · Click=fill · G=G1 · Esc=cancel',
      onG1Toggle: () => toggleG1(this._guide),
    });
  }

  onMouseDown(_e: MouseEvent): void {}

  onMouseUp(_e: MouseEvent): void {
    if (!this._loop) return;
    const scene = this.editor.scene!;
    if (fillHole(scene, this._loop)) {
      if (this._guide.g1) {
        applyG1AllSides(scene, scene.surfaces.length - 1);
      }
      this.editor.rebuildAll();
    }
    this._clearMarks();
    this._loop = null;
    this.editor.requestRender();
  }

  onMouseMove(e: MouseEvent): void {
    this._clearMarks();
    this._loop = null;

    const hit = this.editor.raycast.raycastSurfaceEdge(e);
    if (!hit) {
      this.editor.requestRender();
      return;
    }

    const scene = this.editor.scene!;
    const adj = scene.findAdjacentPatches(hit.patchIdx);
    const isShared = adj.some((a: any) => a.side === hit.side);
    if (isShared) {
      this.editor.requestRender();
      return;
    }

    const loop = traceHole(scene, hit.patchIdx, hit.side);
    if (!loop || (loop.length !== 3 && loop.length !== 4)) {
      this.editor.requestRender();
      return;
    }

    this._loop = loop;
    for (let i = 0; i < loop.length; i++) {
      const edge = loop[i];
      const curve: BoundingCurve = scene.surfaces[edge.patchIdx].getBoundingCurve(edge.side);
      curve.mark(LOOP_COLORS[i % LOOP_COLORS.length]);
      this._markedCurves.push(curve);
    }
    this.editor.requestRender();
  }

  onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.editor.popTool();
      return;
    }
    if (e.key === 'g' || e.key === 'G') {
      toggleG1(this._guide);
    }
  }

  cleanup(): void {
    this._clearMarks();
    this._loop = null;
    document.body.style.cursor = '';
    closeModeGuide(this._guide);
  }

  private _clearMarks(): void {
    for (const c of this._markedCurves) c.unmark();
    this._markedCurves.length = 0;
  }
}
