/**
 * Bridge surface UI: mode toggle, edge picking, flip, preview, execute.
 *
 * State lives on the SurfacingEditor as plain fields (`_bridgeMode`,
 * `_bridgeEdge1`, `_bridgeEdge2`, `_bridgeFlipped`, `_bridgeHighlighted`,
 * `_bridgePreviewGroup`) — same pattern as fillHole.ui.ts. These functions
 * take the editor as their first argument.
 *
 * Edge highlight is done by calling `curve.mark(color)` on the two picked
 * BoundingCurve entities — no parallel ScalableLine geometry for the
 * edges themselves. The only lines we create live in `_bridgePreviewGroup`
 * and they're the gray endpoint-to-endpoint connectors that show flip
 * orientation; those have no reusable source.
 */
import ScalableLine from 'scene/objects/scalableLine';
import {distance as vdist} from 'math/vec';
import {bridgeSurface} from './bridge.command';
import {toggleFillHoleMode} from '../fillHole/fillHole.ui';
import type {BoundingCurve} from '../../models/BoundingCurve/BoundingCurve.entity';

const EDGE1_COLOR = 0x44ee44; // green  — first picked edge
const EDGE2_COLOR = 0xee8800; // orange — second picked edge

export function toggleBridgeMode(view: any): void {
  view._bridgeMode = !view._bridgeMode;
  if (view._bridgeMode) {
    if (view._loopInsertMode) view.toggleLoopInsertMode();
    if (view._fillHoleMode) toggleFillHoleMode(view);
    view.selectPatch(null);
    view.setHover(null);
    resetBridgeState(view);
    document.body.style.cursor = 'crosshair';
    view.showModeGuide('bridge');
  } else {
    resetBridgeState(view);
    document.body.style.cursor = '';
    view.closeModeGuide();
    view.ctx.viewer.requestRender();
  }
}

export function bridgePickEdge(view: any, e: MouseEvent): void {
  const hit = view.hitSurfaceEdge(e);
  if (!hit) return;

  if (!view._bridgeEdge1) {
    view._bridgeEdge1 = hit;
    bridgeUpdatePreview(view);
    return;
  }

  if (!view._bridgeEdge2) {
    view._bridgeEdge2 = hit;
    const scene = view.scene;
    const e1 = scene.surfaces[view._bridgeEdge1.patchIdx].getEdgeVertices(view._bridgeEdge1.side);
    const e2 = scene.surfaces[hit.patchIdx].getEdgeVertices(hit.side);
    const fwd = vdist(e1[0].position, e2[0].position) + vdist(e1[3].position, e2[3].position);
    const rev = vdist(e1[0].position, e2[3].position) + vdist(e1[3].position, e2[0].position);
    view._bridgeFlipped = rev < fwd;
    bridgeUpdatePreview(view);
    return;
  }

  // Third click = confirm (same as Enter)
  bridgeExecute(view);
}

export function bridgeFlip(view: any): void {
  if (!view._bridgeEdge1 || !view._bridgeEdge2) return;
  view._bridgeFlipped = !view._bridgeFlipped;
  bridgeUpdatePreview(view);
  view.ctx.viewer.requestRender();
}

export function bridgeUpdatePreview(view: any): void {
  view.clearGroup(view._bridgePreviewGroup);
  clearBridgeHighlights(view);

  const scene = view.scene;
  const ss = view.ctx.viewer.sceneSetup;

  if (view._bridgeEdge1) {
    const curve: BoundingCurve = scene.surfaces[view._bridgeEdge1.patchIdx]
      .getBoundingCurve(view._bridgeEdge1.side);
    curve.mark(EDGE1_COLOR);
    view._bridgeHighlighted.push(curve);
  }

  if (view._bridgeEdge2) {
    const curve: BoundingCurve = scene.surfaces[view._bridgeEdge2.patchIdx]
      .getBoundingCurve(view._bridgeEdge2.side);
    curve.mark(EDGE2_COLOR);
    view._bridgeHighlighted.push(curve);

    // Topology connectors: gray lines between the two picked edges' endpoints,
    // showing which corner meets which under the current flip state. These
    // aren't curve tessellations — they have no reusable source, so they
    // stay as ScalableLines in the preview group.
    const e1v = scene.surfaces[view._bridgeEdge1.patchIdx].getEdgeVertices(view._bridgeEdge1.side);
    let e2v = scene.surfaces[view._bridgeEdge2.patchIdx].getEdgeVertices(view._bridgeEdge2.side);
    if (view._bridgeFlipped) e2v = [e2v[3], e2v[2], e2v[1], e2v[0]];
    for (let ci = 0; ci < 4; ci += 3) {
      const line = new ScalableLine(ss, [e1v[ci].position, e2v[ci].position], 2, 0xaaaaaa);
      line.renderOrder = 4;
      (line as any).raycast = () => {};
      view._bridgePreviewGroup.add(line);
    }
    view._bridgePreviewGroup.visible = true;
  } else {
    view._bridgePreviewGroup.visible = false;
  }

  view.ctx.viewer.requestRender();
}

export function bridgeExecute(view: any): void {
  if (!view._bridgeEdge1 || !view._bridgeEdge2) return;
  const scene = view.scene;

  const e1 = scene.surfaces[view._bridgeEdge1.patchIdx].getEdgeVertices(view._bridgeEdge1.side);
  const e2 = scene.surfaces[view._bridgeEdge2.patchIdx].getEdgeVertices(view._bridgeEdge2.side);
  bridgeSurface(scene, e1, e2, {
    flipped: view._bridgeFlipped,
    g1: view._g1Continuity,
    sourcePatchIdx: view._bridgeEdge1.patchIdx,
  });

  view.rebuildAll();
  view.persistCageState();

  // Reset state, stay in bridge mode for more bridges
  resetBridgeState(view);
  view.ctx.viewer.requestRender();
}

function clearBridgeHighlights(view: any): void {
  const highlighted: BoundingCurve[] = view._bridgeHighlighted;
  for (const c of highlighted) c.unmark();
  highlighted.length = 0;
}

function resetBridgeState(view: any): void {
  clearBridgeHighlights(view);
  view._bridgeEdge1 = null;
  view._bridgeEdge2 = null;
  view._bridgeFlipped = false;
  view.clearGroup(view._bridgePreviewGroup);
  view._bridgePreviewGroup.visible = false;
}
