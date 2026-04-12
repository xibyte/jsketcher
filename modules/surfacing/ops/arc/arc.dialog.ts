import {distance as vdist} from 'math/vec';
import type {Scene} from '../../models/Scene/Scene.entity';

export interface ArcDialogCallbacks {
  onClose(): void;
  onRemove(): void;
  onApply(): void;
}

export function showArcDialog(
  scene: Scene,
  patchIdx: number,
  callbacks: ArcDialogCallbacks,
): {panel: HTMLDivElement, applyFromDialog: () => void} {

  const panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;left:10px;top:50%;transform:translateY(-50%);background:#2a2a2a;color:#eee;padding:16px;border-radius:8px;width:220px;font-family:sans-serif;font-size:13px;z-index:10000;box-shadow:0 4px 20px rgba(0,0,0,0.5);';
  panel.innerHTML = `
    <div style="font-size:14px;font-weight:bold;margin-bottom:10px;">Arc Constraint</div>
    <div style="margin-bottom:6px;">
      <label>Edge</label>
      <select id="arc-side" style="width:100%;padding:3px;background:#333;color:#eee;border:1px solid #555;margin-top:2px;">
        <option value="0">Bottom</option>
        <option value="1">Right</option>
        <option value="2">Top</option>
        <option value="3">Left</option>
      </select>
    </div>
    <div style="margin-bottom:6px;">
      <label>Radius</label>
      <input id="arc-radius" type="number" value="50" step="1" style="width:100%;padding:3px;background:#333;color:#eee;border:1px solid #555;margin-top:2px;" />
    </div>
    <div style="margin-bottom:6px;">
      <label>Flip</label>
      <input id="arc-flip" type="checkbox" style="margin-left:8px;" />
    </div>
    <div style="margin-bottom:10px;">
      <label>Mode</label>
      <select id="arc-mode" style="width:100%;padding:3px;background:#333;color:#eee;border:1px solid #555;margin-top:2px;">
        <option value="approximate">Approximate (Bézier)</option>
        <option value="rational" selected>Rational (Exact NURBS)</option>
      </select>
    </div>
    <div style="display:flex;gap:6px;">
      <button id="arc-close" style="flex:1;padding:5px;background:#555;color:#eee;border:none;border-radius:4px;cursor:pointer;">Close</button>
      <button id="arc-remove" style="flex:1;padding:5px;background:#884444;color:#eee;border:none;border-radius:4px;cursor:pointer;">Remove</button>
    </div>
  `;

  document.body.appendChild(panel);

  let debounce: number | null = null;

  function applyFromDialog(): void {
    const side = parseInt((panel.querySelector('#arc-side') as HTMLSelectElement).value);
    const radius = parseFloat((panel.querySelector('#arc-radius') as HTMLInputElement).value);
    const flip = (panel.querySelector('#arc-flip') as HTMLInputElement).checked;
    const mode = (panel.querySelector('#arc-mode') as HTMLSelectElement).value;

    if (isNaN(radius) || radius <= 0) return;

    const patch = scene.surfaces[patchIdx];
    if (!patch) return;

    const edgeVerts = patch.getEdgeVertices(side);
    const p0 = edgeVerts[0].position;
    const p3 = edgeVerts[3].position;
    const chordLen = vdist(p0, p3);
    const sinHalf = Math.min(1, chordLen / (2 * radius));
    const angle = 2 * Math.asin(sinHalf) * (180 / Math.PI);

    let u = 0.5, v = 0.5;
    if (side === 0) v = 0;
    else if (side === 1) u = 1;
    else if (side === 2) v = 1;
    else if (side === 3) u = 0;
    let planeNormal = patch.normal(u, v);
    if (flip) planeNormal = [-planeNormal[0], -planeNormal[1], -planeNormal[2]] as any;

    scene.arcConstraints = scene.arcConstraints.filter(c => {
      if (c.patchSide && c.patchSide.patchIdx === patchIdx && c.patchSide.side === side) {
        return false;
      }
      return true;
    });

    scene.constrainEdgeToArc(patchIdx, side, radius, angle, planeNormal, mode as any);
    callbacks.onApply();
  }

  const applyLive = () => {
    if (debounce !== null) cancelAnimationFrame(debounce);
    debounce = requestAnimationFrame(() => {
      debounce = null;
      applyFromDialog();
    });
  };

  (panel.querySelector('#arc-side') as HTMLElement).oninput = applyLive;
  (panel.querySelector('#arc-radius') as HTMLElement).oninput = applyLive;
  (panel.querySelector('#arc-flip') as HTMLElement).oninput = applyLive;
  (panel.querySelector('#arc-mode') as HTMLElement).oninput = applyLive;

  (panel.querySelector('#arc-close') as HTMLElement).onclick = () => callbacks.onClose();
  (panel.querySelector('#arc-remove') as HTMLElement).onclick = () => callbacks.onRemove();

  applyLive();

  return {panel, applyFromDialog};
}

export function closeArcDialog(state: {panel: HTMLDivElement | null}): void {
  if (state.panel && state.panel.parentNode) {
    state.panel.parentNode.removeChild(state.panel);
    state.panel = null;
  }
}
