/**
 * Mirror UI: mirror button in the edge dialog.
 */
import {mirrorAcrossEdge} from './mirror.command';

export function createEdgeMirrorButton(view: any, panel: HTMLElement, edgeIdx: number): void {
  const scene = view.scene;

  const mirrorBtn = panel.querySelector('#edge-mirror');
  if (mirrorBtn) {
    mirrorBtn.addEventListener('click', () => {
      mirrorAcrossEdge(scene, view.selectedPatchIdx, edgeIdx);
      view.rebuildAll();
      view.showEdgeDialog(edgeIdx);
    });
  }
}
