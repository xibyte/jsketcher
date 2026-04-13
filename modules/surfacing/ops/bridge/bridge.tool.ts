import * as SceneGraph from 'scene/sceneGraph';
import ScalableLine from 'scene/objects/scalableLine';
import {distance as vdist} from 'math/vec';
import {bridgeSurface} from './bridge.command';
import {state, type StateStream} from 'lstream';
import type {Tool} from '../../tool';
import type {SurfacingEditor} from '../../SurfacingEditor';
import type {BoundingCurve} from '../../models/BoundingCurve/BoundingCurve.entity';
import type {NurbsSurface} from '../../models/NurbsSurface/NurbsSurface.entity';
import {clearGroup} from '../../three';
import {addToPort, removeFromPort} from '../../ui/SurfacingUI';
import {bridgeUI} from './bridge.ui';

export interface BridgeToolState {
  edge1: {surface: NurbsSurface, side: number} | null;
  edge2: {surface: NurbsSurface, side: number} | null;
  flipped: boolean;
  g1: boolean;
}

const EDGE1_COLOR = 0x44ee44;
const EDGE2_COLOR = 0xee8800;

export class BridgeTool implements Tool {

  readonly state$: StateStream<BridgeToolState> = state<BridgeToolState>({
    edge1: null, edge2: null, flipped: false, g1: false,
  });

  private editor!: SurfacingEditor;
  private previewGroup: any = null;
  private markedCurves: BoundingCurve[] = [];

  init(editor: SurfacingEditor): void {
    this.editor = editor;
    this.previewGroup = SceneGraph.createGroup();
    this.previewGroup.visible = false;
    editor.workingGroup.add(this.previewGroup);
    document.body.style.cursor = 'crosshair';
    addToPort('bottom', 'bridgeTool', bridgeUI(this));
  }

  onMouseDown(_e: MouseEvent): void {}
  onMouseUp(_e: MouseEvent): void {}

  onClick(e: MouseEvent): void {
    const hit = this.editor.raycast.raycastSurfaceEdge(e);
    if (!hit) return;
    const s = this.state$.value;

    if (!s.edge1) {
      this.state$.mutate(st => { st.edge1 = hit; });
      this.updatePreview();
      return;
    }

    if (!s.edge2) {
      const e1 = s.edge1.surface.getEdgeVertices(s.edge1.side);
      const e2 = hit.surface.getEdgeVertices(hit.side);
      const fwd = vdist(e1[0].position, e2[0].position) + vdist(e1[3].position, e2[3].position);
      const rev = vdist(e1[0].position, e2[3].position) + vdist(e1[3].position, e2[0].position);
      this.state$.mutate(st => { st.edge2 = hit; st.flipped = rev < fwd; });
      this.updatePreview();
      return;
    }

    this.execute();
  }

  onMouseMove(_e: MouseEvent): void {}

  onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') { this.editor.popTool(); return; }
    if (e.key === 'Tab') { e.preventDefault(); this.flip(); return; }
    if (e.key === 'g' || e.key === 'G') { this.toggleG1(); return; }
    if (e.key === 'Enter' && this.state$.value.edge1 && this.state$.value.edge2) {
      this.execute();
    }
  }

  cleanup(): void {
    this.clearMarks();
    if (this.previewGroup) {
      clearGroup(this.previewGroup);
      this.previewGroup.parent?.remove(this.previewGroup);
      this.previewGroup = null;
    }
    document.body.style.cursor = '';
    this.state$.next({edge1: null, edge2: null, flipped: false, g1: false});
    removeFromPort('bridgeTool');
  }

  flip(): void {
    const s = this.state$.value;
    if (!s.edge1 || !s.edge2) return;
    this.state$.mutate(st => { st.flipped = !st.flipped; });
    this.updatePreview();
    this.editor.requestRender();
  }

  toggleG1(): void {
    this.state$.mutate(st => { st.g1 = !st.g1; });
  }

  private execute(): void {
    const s = this.state$.value;
    if (!s.edge1 || !s.edge2) return;
    const scene = this.editor.scene;
    const e1 = s.edge1.surface.getEdgeVertices(s.edge1.side);
    const e2 = s.edge2.surface.getEdgeVertices(s.edge2.side);
    bridgeSurface(scene, e1, e2, {
      flipped: s.flipped,
      g1: s.g1,
      sourceSurface: s.edge1.surface,
    });
    this.editor.rebuildAll();
    this.resetState();
    this.editor.requestRender();
  }

  private resetState(): void {
    this.clearMarks();
    this.state$.mutate(st => { st.edge1 = null; st.edge2 = null; st.flipped = false; });
    if (this.previewGroup) {
      clearGroup(this.previewGroup);
      this.previewGroup.visible = false;
    }
  }

  private updatePreview(): void {
    if (!this.previewGroup) return;
    clearGroup(this.previewGroup);
    this.clearMarks();
    const s = this.state$.value;
    const ss = this.editor.sceneSetup;

    if (s.edge1) {
      const curve = s.edge1.surface.getBoundingCurve(s.edge1.side);
      curve.mark(EDGE1_COLOR);
      this.markedCurves.push(curve);
    }

    if (s.edge2) {
      const curve = s.edge2.surface.getBoundingCurve(s.edge2.side);
      curve.mark(EDGE2_COLOR);
      this.markedCurves.push(curve);

      const e1v = s.edge1!.surface.getEdgeVertices(s.edge1!.side);
      let e2v = s.edge2.surface.getEdgeVertices(s.edge2.side);
      if (s.flipped) e2v = [e2v[3], e2v[2], e2v[1], e2v[0]];
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
