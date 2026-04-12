/**
 * Push/Pull UI: button handler in the props dialog.
 */
import {pushPullPatch} from './pushPull.command';

export function createPushPullButton(view: any, panel: HTMLElement, patchIdx: number): void {
  panel.querySelector('#props-push')!.addEventListener('click', () => {
    const dist = parseFloat((panel.querySelector('#props-distance') as HTMLInputElement).value);
    if (isNaN(dist) || dist === 0) return;
    pushPullPatch(view.scene, patchIdx, dist);
    view.rebuildAll();
    view.showPropsDialog(patchIdx);
  });
}
