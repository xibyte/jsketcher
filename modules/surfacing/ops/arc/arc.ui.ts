/**
 * Arc constraint UI: edge dialog arc buttons and advanced arc dialog.
 */
import {distance as vdist, lerp as vlerp} from 'math/vec';
import {constrainEdgeToArc, removeArcConstraint} from './arc.command';

export function createEdgeArcButtons(view: any, panel: HTMLElement, edgeIdx: number): void {
  const scene = view.scene;

  const applyArc90 = (flip: boolean) => {
    const patchIdx = view.selectedPatchIdx;
    const side = edgeIdx;
    const ptch = scene.surfaces[patchIdx];
    const ev = ptch.getEdgeVertices(side);

    const chord = vdist(ev[0].position, ev[3].position);
    const radius = chord / Math.SQRT2;

    let u = 0.5, v = 0.5;
    if (side === 0) v = 0;
    else if (side === 1) u = 1;
    else if (side === 2) v = 1;
    else if (side === 3) u = 0;
    let planeNormal = ptch.normal(u, v);
    if (flip) planeNormal = [-planeNormal[0], -planeNormal[1], -planeNormal[2]] as [number, number, number];

    scene.arcConstraints = scene.arcConstraints.filter((c: any) => {
      if (c.patchSide && c.patchSide.patchIdx === patchIdx && c.patchSide.side === side) {
        if (c.mode === 'rational') ptch.rational = false;
        return false;
      }
      return true;
    });

    constrainEdgeToArc(scene, patchIdx, side, radius, 90, planeNormal, 'rational');
    view.rebuildAll();
    view.persistCageState();
    view.showEdgeDialog(edgeIdx);
  };

  panel.querySelector('#edge-arc90-out')!.addEventListener('click', () => applyArc90(false));
  panel.querySelector('#edge-arc90-in')!.addEventListener('click', () => applyArc90(true));

  const removeBtn = panel.querySelector('#edge-remove-arc');
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      scene.arcConstraints = scene.arcConstraints.filter((c: any) => {
        if (c.patchSide && c.patchSide.patchIdx === view.selectedPatchIdx && c.patchSide.side === edgeIdx) {
          if (c.mode === 'rational') {
            scene.surfaces[c.patchSide.patchIdx].rational = false;
          }
          const ev = scene.surfaces[view.selectedPatchIdx].getEdgeVertices(edgeIdx);
          const lp1 = vlerp(ev[0].position, ev[3].position, 1/3);
          const lp2 = vlerp(ev[0].position, ev[3].position, 2/3);
          ev[1].set(lp1[0], lp1[1], lp1[2]);
          ev[2].set(lp2[0], lp2[1], lp2[2]);
          return false;
        }
        return true;
      });
      scene.surfaces[view.selectedPatchIdx].weights.forEach((row: number[]) => {
        for (let i = 0; i < row.length; i++) row[i] = 1;
      });
      scene.surfaces[view.selectedPatchIdx].rational = false;
      view.rebuildAll();
      view.persistCageState();
      view.showEdgeDialog(edgeIdx);
    });
  }
}

export function showArcDialog(view: any): void {
  if (view.selectedPatchIdx < 0) return;
  if (view._arcDialog) { closeArcDialog(view); return; }

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
        <option value="approximate">Approximate (Bezier)</option>
        <option value="rational" selected>Rational (Exact NURBS)</option>
      </select>
    </div>
    <div style="display:flex;gap:6px;">
      <button id="arc-close" style="flex:1;padding:5px;background:#555;color:#eee;border:none;border-radius:4px;cursor:pointer;">Close</button>
      <button id="arc-remove" style="flex:1;padding:5px;background:#884444;color:#eee;border:none;border-radius:4px;cursor:pointer;">Remove</button>
    </div>
  `;

  document.body.appendChild(panel);
  view._arcDialog = panel;
  view._arcPatchIdx = view.selectedPatchIdx;
  view._arcDebounce = null;

  const applyLive = () => {
    if (view._arcDebounce) cancelAnimationFrame(view._arcDebounce);
    view._arcDebounce = requestAnimationFrame(() => {
      view._arcDebounce = null;
      applyArcFromDialog(view);
    });
  };

  panel.querySelector('#arc-side')!.addEventListener('input', applyLive);
  panel.querySelector('#arc-radius')!.addEventListener('input', applyLive);
  panel.querySelector('#arc-flip')!.addEventListener('input', applyLive);
  panel.querySelector('#arc-mode')!.addEventListener('input', applyLive);

  panel.querySelector('#arc-close')!.addEventListener('click', () => closeArcDialog(view));
  panel.querySelector('#arc-remove')!.addEventListener('click', () => {
    const scene = view.scene;
    if (scene.arcConstraints.length > 0) {
      removeArcConstraint(scene, scene.arcConstraints[scene.arcConstraints.length - 1]);
    }
    view.rebuildAll();
    view.persistCageState();
    closeArcDialog(view);
  });

  applyLive();
}

export function applyArcFromDialog(view: any): void {
  if (!view._arcDialog) return;
  const panel = view._arcDialog;
  const patchIdx = view._arcPatchIdx;

  const side = parseInt((panel.querySelector('#arc-side') as HTMLSelectElement).value);
  const radius = parseFloat((panel.querySelector('#arc-radius') as HTMLInputElement).value);
  const flip = (panel.querySelector('#arc-flip') as HTMLInputElement).checked;
  const mode = (panel.querySelector('#arc-mode') as HTMLSelectElement).value;

  if (isNaN(radius) || radius <= 0) return;

  const scene = view.scene;
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
  if (flip) planeNormal = [-planeNormal[0], -planeNormal[1], -planeNormal[2]] as [number, number, number];

  scene.arcConstraints = scene.arcConstraints.filter((c: any) => {
    if (c.patchSide && c.patchSide.patchIdx === patchIdx && c.patchSide.side === side) {
      if (c.mode === 'rational') {
        scene.surfaces[c.patchSide.patchIdx].rational = false;
      }
      return false;
    }
    return true;
  });

  constrainEdgeToArc(scene, patchIdx, side, radius, angle, planeNormal, mode as any);
  view.rebuildAll();
  if (view.selectedPatchIdx >= 0) {
    view.buildSubcage(view.selectedPatchIdx);
  }
  view.persistCageState();
}

export function closeArcDialog(view: any): void {
  if (view._arcDialog) {
    document.body.removeChild(view._arcDialog);
    view._arcDialog = null;
  }
  if (view._arcDebounce) {
    cancelAnimationFrame(view._arcDebounce);
    view._arcDebounce = null;
  }
}
