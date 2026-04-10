/**
 * Mirror UI: mirror button in the edge dialog.
 */
import {mirrorAcrossEdge} from './mirror.command';

export function createEdgeMirrorButton(view: any, panel: HTMLElement, edgeIdx: number): void {
  const cage = view.model.cage;

  const mirrorBtn = panel.querySelector('#edge-mirror');
  if (mirrorBtn) {
    mirrorBtn.addEventListener('click', () => {
      mirrorAcrossEdge(cage, view.selectedPatchIdx, edgeIdx);
      view.model.recompute();
      view.rebuildAll();
      view.persistCageState();
      view.showEdgeDialog(edgeIdx);
    });
  }
}
