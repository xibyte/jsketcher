/**
 * Continuity UI: G1/G2 buttons in the edge dialog.
 */
import {applyG1, applyG2} from './continuity.command';

export function createEdgeContinuityButtons(view: any, panel: HTMLElement, edgeIdx: number): void {
  const cage = view.model.cage;

  const g1Btn = panel.querySelector('#edge-g1');
  if (g1Btn) {
    g1Btn.addEventListener('click', () => {
      applyG1(cage, view.selectedPatchIdx, edgeIdx);
      view.model.recompute();
      view.rebuildAll();
      view.persistCageState();
      view.showEdgeDialog(edgeIdx);
    });
  }
  const g2Btn = panel.querySelector('#edge-g2');
  if (g2Btn) {
    g2Btn.addEventListener('click', () => {
      applyG2(cage, view.selectedPatchIdx, edgeIdx);
      view.model.recompute();
      view.rebuildAll();
      view.persistCageState();
      view.showEdgeDialog(edgeIdx);
    });
  }
}
