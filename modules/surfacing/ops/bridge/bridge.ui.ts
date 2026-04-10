/**
 * Bridge surface UI: mode toggle, edge picking, flip, preview, execute.
 */
import ScalableLine from 'scene/objects/scalableLine';
import {CageVertex, NurbsPatch} from '../../models/Scene/PatchCageCore';
import {distance as vdist, lerp as vlerp} from 'math/vec';
import {bridgeSurface} from './bridge.command';

export function toggleBridgeMode(view: any): void {
  view._bridgeMode = !view._bridgeMode;
  if (view._bridgeMode) {
    if (view._loopInsertMode) view.toggleLoopInsertMode();
    if (view._fillHoleMode) view.toggleFillHoleMode();
    view.selectPatch(-1);
    view.setHover(-1);
    view._bridgeEdge1 = null;
    view._bridgeEdge2 = null;
    view._bridgeFlipped = false;
    view.clearGroup(view._bridgePreviewGroup);
    view._bridgePreviewGroup.visible = false;
    document.body.style.cursor = 'crosshair';
    view.showModeGuide('bridge');
  } else {
    view._bridgeEdge1 = null;
    view._bridgeEdge2 = null;
    view.clearGroup(view._bridgePreviewGroup);
    view._bridgePreviewGroup.visible = false;
    document.body.style.cursor = '';
    view.closeModeGuide();
    view.ctx.viewer.requestRender();
  }
}

export function bridgePickEdge(view: any, e: MouseEvent): void {
  const hit = view.bridgeHitEdge(e);
  if (!hit) return;

  if (!view._bridgeEdge1) {
    view._bridgeEdge1 = hit;
    bridgeUpdatePreview(view);
  } else if (!view._bridgeEdge2) {
    view._bridgeEdge2 = hit;
    const cage = view.model.cage;
    const e1 = cage.patches[view._bridgeEdge1.patchIdx].getEdgeVertices(view._bridgeEdge1.side);
    const e2 = cage.patches[hit.patchIdx].getEdgeVertices(hit.side);
    const fwdDist = vdist(e1[0].position, e2[0].position) + vdist(e1[3].position, e2[3].position);
    const revDist = vdist(e1[0].position, e2[3].position) + vdist(e1[3].position, e2[0].position);
    view._bridgeFlipped = revDist < fwdDist;
    bridgeUpdatePreview(view);
  } else {
    bridgeExecute(view);
  }
}

export function bridgeFlip(view: any): void {
  if (!view._bridgeEdge1 || !view._bridgeEdge2) return;
  view._bridgeFlipped = !view._bridgeFlipped;
  bridgeUpdatePreview(view);
  view.ctx.viewer.requestRender();
}

export function bridgeUpdatePreview(view: any): void {
  view.clearGroup(view._bridgePreviewGroup);
  const ss = view.ctx.viewer.sceneSetup;
  const cage = view.model.cage;

  if (view._bridgeEdge1) {
    const pts = view.tessellateEdge(view._bridgeEdge1.patchIdx, view._bridgeEdge1.side, 24);
    const line = new ScalableLine(ss, pts, 4, 0x44ee44);
    line.renderOrder = 4;
    line.raycast = () => {};
    view._bridgePreviewGroup.add(line);
  }

  if (view._bridgeEdge2) {
    const pts = view.tessellateEdge(view._bridgeEdge2.patchIdx, view._bridgeEdge2.side, 24);
    const line = new ScalableLine(ss, pts, 4, 0xee8800);
    line.renderOrder = 4;
    line.raycast = () => {};
    view._bridgePreviewGroup.add(line);

    const e1Verts = cage.patches[view._bridgeEdge1.patchIdx].getEdgeVertices(view._bridgeEdge1.side);
    let e2Verts = cage.patches[view._bridgeEdge2.patchIdx].getEdgeVertices(view._bridgeEdge2.side);
    if (view._bridgeFlipped) e2Verts = [e2Verts[3], e2Verts[2], e2Verts[1], e2Verts[0]];

    for (let ci = 0; ci < 4; ci += 3) {
      const p1 = e1Verts[ci].position;
      const p2 = e2Verts[ci].position;
      const pts = [p1, p2];
      const connLine = new ScalableLine(ss, pts, 2, 0xaaaaaa);
      connLine.renderOrder = 4;
      connLine.raycast = () => {};
      view._bridgePreviewGroup.add(connLine);
    }
  }

  view._bridgePreviewGroup.visible = true;
  view.ctx.viewer.requestRender();
}

export function bridgeExecute(view: any): void {
  if (!view._bridgeEdge1 || !view._bridgeEdge2) return;
  const cage = view.model.cage;

  const e1 = cage.patches[view._bridgeEdge1.patchIdx].getEdgeVertices(view._bridgeEdge1.side);
  const e2 = cage.patches[view._bridgeEdge2.patchIdx].getEdgeVertices(view._bridgeEdge2.side);

  bridgeSurface(cage, e1, e2, {flipped: view._bridgeFlipped, g1: view._g1Continuity, sourcePatchIdx: view._bridgeEdge1.patchIdx});
  view.model.recompute();
  view.rebuildAll();
  view.persistCageState();

  view._bridgeEdge1 = null;
  view._bridgeEdge2 = null;
  view._bridgeFlipped = false;
  view.clearGroup(view._bridgePreviewGroup);
  view._bridgePreviewGroup.visible = false;
  view.ctx.viewer.requestRender();
}
