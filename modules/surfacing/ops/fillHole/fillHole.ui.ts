/**
 * Fill hole UI: mode toggle, preview, execute.
 *
 * State lives on the SurfacingEditor as plain fields
 * (`_fillHoleMode`, `_fillHoleLoop`, `_fillHoleHighlighted`). These
 * functions take the editor as their first argument — same pattern as
 * bridge.ui.ts.
 *
 * The hole-boundary preview is drawn by calling `curve.mark(color)` on
 * each edge of the traced loop, not by creating parallel ScalableLines.
 * (The only place in surfacing where we still tessellate a curve for
 * preview purposes is loop split, per design.)
 */
import {traceHole, fillHole} from './fillHole.command';
import {applyG1AllSides} from '../continuity/continuity.command';
import {toggleBridgeMode} from '../bridge/bridge.ui';
import type {BoundingCurve} from '../../models/BoundingCurve/BoundingCurve.entity';

// Rotating colors for the hole's edges — matches the old visual.
const LOOP_COLORS = [0x44ee44, 0xee8800, 0x4488ee, 0xee4444];

export function toggleFillHoleMode(view: any): void {
  view._fillHoleMode = !view._fillHoleMode;
  if (view._fillHoleMode) {
    if (view._loopInsertMode) view.toggleLoopInsertMode();
    if (view._bridgeMode) toggleBridgeMode(view);
    view.selectPatch(null);
    view.setHover(null);
    resetFillHoleState(view);
    document.body.style.cursor = 'crosshair';
    view.showModeGuide('fill');
  } else {
    resetFillHoleState(view);
    document.body.style.cursor = '';
    view.closeModeGuide();
    view.ctx.viewer.requestRender();
  }
}

export function fillHolePreview(view: any, e: MouseEvent): void {
  clearFillHoleHighlights(view);
  view._fillHoleLoop = null;

  const hit = view.hitSurfaceEdge(e);
  if (!hit) {
    view.ctx.viewer.requestRender();
    return;
  }

  const scene = view.scene;
  const adj = scene.findAdjacentPatches(hit.patchIdx);
  const isShared = adj.some((a: any) => a.side === hit.side);
  if (isShared) {
    // Not a free edge — no hole here.
    view.ctx.viewer.requestRender();
    return;
  }

  const loop = traceHole(scene, hit.patchIdx, hit.side);
  if (!loop || (loop.length !== 3 && loop.length !== 4)) {
    view.ctx.viewer.requestRender();
    return;
  }

  view._fillHoleLoop = loop;

  for (let i = 0; i < loop.length; i++) {
    const edge = loop[i];
    const curve: BoundingCurve = scene.surfaces[edge.patchIdx].getBoundingCurve(edge.side);
    curve.mark(LOOP_COLORS[i % LOOP_COLORS.length]);
    view._fillHoleHighlighted.push(curve);
  }

  view.ctx.viewer.requestRender();
}

export function fillHoleExecute(view: any): void {
  if (!view._fillHoleLoop) return;
  const scene = view.scene;

  if (fillHole(scene, view._fillHoleLoop)) {
    if (view._g1Continuity) {
      applyG1AllSides(scene, scene.surfaces.length - 1);
    }
    view.rebuildAll();
    view.persistCageState();
  }

  resetFillHoleState(view);
  view.ctx.viewer.requestRender();
}

function clearFillHoleHighlights(view: any): void {
  const highlighted: BoundingCurve[] = view._fillHoleHighlighted;
  for (const c of highlighted) c.unmark();
  highlighted.length = 0;
}

function resetFillHoleState(view: any): void {
  clearFillHoleHighlights(view);
  view._fillHoleLoop = null;
}
