import type {NurbsSurface} from './NurbsSurface.entity';

/**
 * Properties dialog for a NurbsSurface entity.
 * Shows NURBS definition (control points, weights, knots, constraints)
 * and action buttons (Push/Pull, Extrude, Subdivide, Remove).
 */
export function showNurbsSurfaceDialog(
  surface: NurbsSurface,
  surfaceIdx: number,
  callbacks: {
    onPushPull: (distance: number) => void;
    onExtrude: (distance: number) => void;
    onSubdivide: () => void;
    onRemove: () => void;
    onClose: () => void;
  }
): HTMLDivElement {
  const round = (v: number) => Math.round(v * 1e6) / 1e6;
  const fmtVec = (p: number[]) => [round(p[0]), round(p[1]), round(p[2])];

  const cps = surface.getCPs();
  const controlPoints = cps.map(row => row.map(c => fmtVec(c.position)));
  const weights = cps.map(row => row.map(c => round(c.weight.value)));
  const knots = [0, 0, 0, 0, 1, 1, 1, 1];

  const sideNames = ['bottom', 'right', 'top', 'left'];
  const constraints: any[] = [];
  for (const bc of [surface.boundingCurves.bottom, surface.boundingCurves.right,
                     surface.boundingCurves.top, surface.boundingCurves.left]) {
    if (bc.arcConstraint) {
      constraints.push({
        edge: sideNames[bc.side],
        type: 'arc',
        mode: bc.arcConstraint.mode,
        radius: round(bc.arcConstraint.radius),
        angle: round(bc.arcConstraint.angle),
        center: fmtVec(bc.arcConstraint.center as number[]),
        planeNormal: fmtVec(bc.arcConstraint.planeNormal as number[]),
      });
    }
  }

  const def: any = {
    surface: surfaceIdx,
    degree: [3, 3],
    knotsU: knots,
    knotsV: knots,
    rational: surface.rational,
    controlPoints,
    weights,
  };
  if (constraints.length > 0) def.constraints = constraints;

  const json = compactNumberArrays(JSON.stringify(def, null, 2));

  const panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;right:10px;top:50%;transform:translateY(-50%);background:#1e1e1e;color:#d4d4d4;padding:12px;border-radius:8px;width:340px;max-height:70vh;font-family:monospace;font-size:11px;z-index:10000;box-shadow:0 4px 20px rgba(0,0,0,0.5);display:flex;flex-direction:column;';
  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <span style="font-family:sans-serif;font-size:13px;font-weight:bold;">Surface ${surfaceIdx} — NURBS Definition</span>
      <button id="props-close" style="background:none;border:none;color:#aaa;cursor:pointer;font-size:16px;padding:0 4px;">&times;</button>
    </div>
    <pre id="props-json" style="margin:0;overflow:auto;flex:1;background:#111;padding:8px;border-radius:4px;white-space:pre;user-select:all;cursor:text;line-height:1.4;">${escapeHtml(json)}</pre>
    <div style="display:flex;gap:6px;margin-top:8px;font-family:sans-serif;font-size:12px;align-items:center;">
      <label style="white-space:nowrap;">Distance</label>
      <input id="props-distance" type="number" value="10" step="1" style="width:70px;padding:3px;background:#333;color:#eee;border:1px solid #555;font-size:12px;" />
      <button id="props-push" style="flex:1;padding:5px;background:#345;color:#eee;border:none;border-radius:4px;cursor:pointer;">Push/Pull</button>
      <button id="props-extrude" style="flex:1;padding:5px;background:#354;color:#eee;border:none;border-radius:4px;cursor:pointer;">Extrude</button>
    </div>
    <div style="display:flex;gap:6px;margin-top:6px;">
      <button id="props-copy" style="flex:1;padding:5px;background:#335;color:#eee;border:none;border-radius:4px;cursor:pointer;font-family:sans-serif;font-size:12px;">Copy to Clipboard</button>
      <button id="props-subdivide" style="flex:1;padding:5px;background:#353;color:#eee;border:none;border-radius:4px;cursor:pointer;font-family:sans-serif;font-size:12px;">Subdivide 3x3</button>
      <button id="props-remove" style="flex:1;padding:5px;background:#533;color:#eee;border:none;border-radius:4px;cursor:pointer;font-family:sans-serif;font-size:12px;">Remove</button>
    </div>
  `;

  document.body.appendChild(panel);

  panel.querySelector('#props-close')!.addEventListener('click', callbacks.onClose);
  panel.querySelector('#props-copy')!.addEventListener('click', () => {
    navigator.clipboard.writeText(json).then(() => {
      const btn = panel.querySelector('#props-copy')!;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = 'Copy to Clipboard'; }, 1500);
    });
  });
  panel.querySelector('#props-push')!.addEventListener('click', () => {
    const dist = parseFloat((panel.querySelector('#props-distance') as HTMLInputElement).value);
    if (!isNaN(dist) && dist !== 0) callbacks.onPushPull(dist);
  });
  panel.querySelector('#props-extrude')!.addEventListener('click', () => {
    const dist = parseFloat((panel.querySelector('#props-distance') as HTMLInputElement).value);
    if (!isNaN(dist) && dist !== 0) callbacks.onExtrude(dist);
  });
  panel.querySelector('#props-subdivide')!.addEventListener('click', callbacks.onSubdivide);
  panel.querySelector('#props-remove')!.addEventListener('click', callbacks.onRemove);

  return panel;
}

export function closeNurbsSurfaceDialog(panel: HTMLDivElement | null): void {
  if (panel && panel.parentNode) {
    panel.parentNode.removeChild(panel);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function compactNumberArrays(json: string): string {
  return json.replace(/\[\s*(-?\d[\d.e+\-]*\s*,?\s*)+\]/g, match => {
    const nums = match.slice(1, -1).split(',').map(s => s.trim());
    return '[' + nums.join(', ') + ']';
  });
}
