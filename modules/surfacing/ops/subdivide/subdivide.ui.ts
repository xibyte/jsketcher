/**
 * Subdivide UI: button handler in the props dialog.
 */
import {subdividePatch} from './subdivide.command';

export function createSubdivideButton(view: any, panel: HTMLElement, patchIdx: number): void {
  panel.querySelector('#props-subdivide')!.addEventListener('click', () => {
    subdividePatch(view.scene, patchIdx);
    view.selectPatch(null);
    view.rebuildAll();
    view.persistCageState();
  });
}
