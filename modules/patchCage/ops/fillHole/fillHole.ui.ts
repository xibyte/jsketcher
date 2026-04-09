/**
 * Fill hole UI: mode toggle, preview, execute.
 */
import ScalableLine from 'scene/objects/scalableLine';
import {traceHole, fillHole} from './fillHole.command';
import {applyG1AllSides} from '../continuity/continuity.command';

export function toggleFillHoleMode(view: any): void {
  view._fillHoleMode = !view._fillHoleMode;
  if (view._fillHoleMode) {
    if (view._loopInsertMode) view.toggleLoopInsertMode();
    if (view._bridgeMode) view.toggleBridgeMode();
    view.selectPatch(-1);
    view.setHover(-1);
    view._fillHoleLoop = null;
    view.clearGroup(view._fillHolePreviewGroup);
    view._fillHolePreviewGroup.visible = false;
    document.body.style.cursor = 'crosshair';
    view.showModeGuide('fill');
  } else {
    view._fillHoleLoop = null;
    view.clearGroup(view._fillHolePreviewGroup);
    view._fillHolePreviewGroup.visible = false;
    document.body.style.cursor = '';
    view.closeModeGuide();
    view.ctx.viewer.requestRender();
  }
}

export function fillHolePreview(view: any, e: MouseEvent): void {
  const hit = view.bridgeHitEdge(e);
  view.clearGroup(view._fillHolePreviewGroup);
  view._fillHoleLoop = null;

  if (!hit) {
    view._fillHolePreviewGroup.visible = false;
    view.ctx.viewer.requestRender();
    return;
  }

  const cage = view.model.cage;
  const adj = cage.findAdjacentPatches(hit.patchIdx);
  const isShared = adj.some((a: any) => a.side === hit.side);
  if (isShared) {
    view._fillHolePreviewGroup.visible = false;
    view.ctx.viewer.requestRender();
    return;
  }

  const loop = traceHole(cage, hit.patchIdx, hit.side);
  if (!loop || (loop.length !== 3 && loop.length !== 4)) {
    view._fillHolePreviewGroup.visible = false;
    view.ctx.viewer.requestRender();
    return;
  }

  view._fillHoleLoop = loop;
  const ss = view.ctx.viewer.sceneSetup;
  const N = 24;

  const colors = [0x44ee44, 0xee8800, 0x4488ee, 0xee4444];
  for (let i = 0; i < loop.length; i++) {
    const edge = loop[i];
    const cps = edge.verts.map((v: any) => v.position);
    const pts = [];
    for (let j = 0; j <= N; j++) {
      const t = j / N, mt = 1 - t;
      pts.push([
        mt*mt*mt*cps[0][0]+3*mt*mt*t*cps[1][0]+3*mt*t*t*cps[2][0]+t*t*t*cps[3][0],
        mt*mt*mt*cps[0][1]+3*mt*mt*t*cps[1][1]+3*mt*t*t*cps[2][1]+t*t*t*cps[3][1],
        mt*mt*mt*cps[0][2]+3*mt*mt*t*cps[1][2]+3*mt*t*t*cps[2][2]+t*t*t*cps[3][2],
      ]);
    }
    const line = new ScalableLine(ss, pts, 4, colors[i % colors.length]);
    line.renderOrder = 4;
    line.raycast = () => {};
    view._fillHolePreviewGroup.add(line);
  }

  view._fillHolePreviewGroup.visible = true;
  view.ctx.viewer.requestRender();
}

export function fillHoleExecute(view: any): void {
  if (!view._fillHoleLoop) return;
  const cage = view.model.cage;

  if (fillHole(cage, view._fillHoleLoop)) {
    if (view._g1Continuity) {
      applyG1AllSides(cage, cage.patches.length - 1);
    }
    view.model.recompute();
    view.rebuildAll();
    view.persistCageState();
  }

  view._fillHoleLoop = null;
  view.clearGroup(view._fillHolePreviewGroup);
  view._fillHolePreviewGroup.visible = false;
  view.ctx.viewer.requestRender();
}
