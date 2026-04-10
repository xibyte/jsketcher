/**
 * Split UI: U/V key split and loop insert mode.
 */
import * as SceneGraph from 'scene/sceneGraph';
import ScalableLine from 'scene/objects/scalableLine';
import {splitIsoline, computeIsolinePropagation, tessellateIsoline} from './split.command';

export function handleSplitKeydown(view: any, key: string): boolean {
  if (view.selectedPatchIdx < 0) return false;
  if (key === 'u' || key === 'U') {
    splitIsoline(view.scene, view.selectedPatchIdx, 'u', 0.5);
    view.selectPatch(-1);
    view.rebuildAll();
    view.persistCageState();
    return true;
  } else if (key === 'v' || key === 'V') {
    splitIsoline(view.scene, view.selectedPatchIdx, 'v', 0.5);
    view.selectPatch(-1);
    view.rebuildAll();
    view.persistCageState();
    return true;
  }
  return false;
}

export function toggleLoopInsertMode(view: any): void {
  view._loopInsertMode = !view._loopInsertMode;
  if (view._loopInsertMode) {
    view.selectPatch(-1);
    view.setHover(-1);
    document.body.style.cursor = 'crosshair';
  } else {
    view.clearGroup(view._loopPreviewGroup);
    view._loopPreviewGroup.visible = false;
    view._loopPending = null;
    document.body.style.cursor = '';
    view.ctx.viewer.requestRender();
  }
}

export function loopInsertPreview(view: any, e: MouseEvent): void {
  const hit = view.hitToUV(e);
  view.clearGroup(view._loopPreviewGroup);

  if (!hit) {
    view._loopPreviewGroup.visible = false;
    view._loopPending = null;
    view.ctx.viewer.requestRender();
    return;
  }

  let dir: 'u' | 'v' = Math.abs(hit.u - 0.5) < Math.abs(hit.v - 0.5) ? 'u' : 'v';
  if (e.shiftKey) dir = dir === 'u' ? 'v' : 'u';
  const t = Math.max(0.01, Math.min(0.99, dir === 'u' ? hit.u : hit.v));

  view._loopPending = {patchIdx: hit.patchIdx, dir, t};
  const scene = view.scene;
  const propagation = computeIsolinePropagation(scene, hit.patchIdx, dir, t);
  const ss = view.ctx.viewer.sceneSetup;

  for (const seg of propagation) {
    const pts = tessellateIsoline(scene, seg.idx, seg.dir, seg.t, 24);
    const line = new ScalableLine(ss, pts, 3, 0xffcc00);
    line.renderOrder = 4;
    line.raycast = () => {};
    view._loopPreviewGroup.add(line);
  }

  view._loopPreviewGroup.visible = true;
  view.ctx.viewer.requestRender();
}

export function loopInsertExecute(view: any): void {
  if (!view._loopPending) return;
  const {patchIdx, dir, t} = view._loopPending;
  splitIsoline(view.scene, patchIdx, dir, t);
  view._loopPending = null;
  view.clearGroup(view._loopPreviewGroup);
  view._loopPreviewGroup.visible = false;
  view.rebuildAll();
  view.persistCageState();
}
