/**
 * Extrude UI: button handler in the props dialog.
 */
import {extrudePatch} from './extrude.command';

export function createExtrudeButton(view: any, panel: HTMLElement, patchIdx: number): void {
  panel.querySelector('#props-extrude')!.addEventListener('click', () => {
    const dist = parseFloat((panel.querySelector('#props-distance') as HTMLInputElement).value);
    if (isNaN(dist) || dist === 0) return;
    extrudePatch(view.scene, patchIdx, dist);
    view.rebuildAll();
    view.showPropsDialog(patchIdx);
  });
}
