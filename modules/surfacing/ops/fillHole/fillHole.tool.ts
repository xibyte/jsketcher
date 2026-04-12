import {state, type StateStream} from 'lstream';
import {traceHole, fillHole} from './fillHole.command';
import {applyG1AllSides} from '../continuity/continuity.command';
import type {Tool} from '../../tool';
import type {SurfacingEditor} from '../../SurfacingEditor';
import type {BoundingCurve} from '../../models/BoundingCurve/BoundingCurve.entity';

const LOOP_COLORS = [0x44ee44, 0xee8800, 0x4488ee, 0xee4444];

export interface FillHoleToolState {
  g1: boolean;
}

export class FillHoleTool implements Tool {

  readonly state$: StateStream<FillHoleToolState> = state<FillHoleToolState>({g1: false});

  private editor!: SurfacingEditor;
  private loop: any[] | null = null;
  private markedCurves: BoundingCurve[] = [];

  init(editor: SurfacingEditor): void {
    this.editor = editor;
    document.body.style.cursor = 'crosshair';
  }

  onMouseDown(_e: MouseEvent): void {}
  onMouseUp(_e: MouseEvent): void {}

  onClick(_e: MouseEvent): void {
    if (!this.loop) return;
    const scene = this.editor.scene;
    if (fillHole(scene, this.loop)) {
      if (this.state$.value.g1) {
        const created = scene.surfaces[scene.surfaces.length - 1];
        applyG1AllSides(scene, created);
      }
      this.editor.rebuildAll();
    }
    this.clearMarks();
    this.loop = null;
    this.editor.requestRender();
  }

  onMouseMove(e: MouseEvent): void {
    this.clearMarks();
    this.loop = null;

    const hit = this.editor.raycast.raycastSurfaceEdge(e);
    if (!hit) {
      this.editor.requestRender();
      return;
    }

    const scene = this.editor.scene;
    const adj = scene.findAdjacentSurfaces(hit.surface);
    const isShared = adj.some((a: any) => a.side === hit.side);
    if (isShared) {
      this.editor.requestRender();
      return;
    }

    const loop = traceHole(scene, hit.surface, hit.side);
    if (!loop || (loop.length !== 3 && loop.length !== 4)) {
      this.editor.requestRender();
      return;
    }

    this.loop = loop;
    for (let i = 0; i < loop.length; i++) {
      const edge = loop[i];
      const curve: BoundingCurve = edge.surface.getBoundingCurve(edge.side);
      curve.mark(LOOP_COLORS[i % LOOP_COLORS.length]);
      this.markedCurves.push(curve);
    }
    this.editor.requestRender();
  }

  onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') { this.editor.popTool(); return; }
    if (e.key === 'g' || e.key === 'G') { this.toggleG1(); }
  }

  toggleG1(): void {
    this.state$.mutate(s => { s.g1 = !s.g1; });
  }

  cleanup(): void {
    this.clearMarks();
    this.loop = null;
    document.body.style.cursor = '';
    this.state$.next({g1: false});
  }

  private clearMarks(): void {
    for (const c of this.markedCurves) c.unmark();
    this.markedCurves.length = 0;
  }
}
