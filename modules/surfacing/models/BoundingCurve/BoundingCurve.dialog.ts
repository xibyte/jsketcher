import {distance as vdist} from 'math/vec';
import type {BoundingCurve} from './BoundingCurve.entity';

const SIDE_NAMES = ['Bottom', 'Right', 'Top', 'Left'];

/**
 * Edge dialog for a BoundingCurve entity.
 * Shows arc constraint controls, G1/G2 continuity, and mirror button.
 */
export function showEdgeDialog(
  curve: BoundingCurve,
  hasNeighbor: boolean,
  callbacks: {
    onArc90Out: () => void;
    onArc90In: () => void;
    onRemoveArc?: () => void;
    onG1?: () => void;
    onG2?: () => void;
    onMirror: () => void;
    onClose: () => void;
  }
): HTMLDivElement {
  const p0 = curve.cp[0].position;
  const p3 = curve.cp[3].position;
  const chordLen = vdist(p0, p3);
  const round = (v: number) => Math.round(v * 1e4) / 1e4;
  const existing = curve.arcConstraint;

  const panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;right:10px;bottom:10px;background:#1e1e1e;color:#d4d4d4;padding:12px;border-radius:8px;width:340px;font-family:sans-serif;font-size:12px;z-index:10000;box-shadow:0 4px 20px rgba(0,0,0,0.5);';
  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <span style="font-size:13px;font-weight:bold;">${SIDE_NAMES[curve.side]} Edge</span>
      <button id="edge-close" style="background:none;border:none;color:#aaa;cursor:pointer;font-size:16px;padding:0 4px;">&times;</button>
    </div>
    <div style="margin-bottom:8px;font-size:11px;color:#888;">
      Chord length: ${round(chordLen)}${hasNeighbor ? ' | Shared' : ' | Free'}
      ${existing ? ' | Arc: ' + round(existing.angle) + '\u00B0 r=' + round(existing.radius) + ' (' + existing.mode + ')' : ''}
    </div>
    <div style="display:flex;gap:6px;">
      <button id="edge-arc90-out" style="flex:1;padding:6px;background:#353;color:#eee;border:none;border-radius:4px;cursor:pointer;">Arc 90\u00B0 Out</button>
      <button id="edge-arc90-in" style="flex:1;padding:6px;background:#345;color:#eee;border:none;border-radius:4px;cursor:pointer;">Arc 90\u00B0 In</button>
      ${existing ? '<button id="edge-remove-arc" style="flex:1;padding:6px;background:#533;color:#eee;border:none;border-radius:4px;cursor:pointer;">Remove</button>' : ''}
    </div>
    ${hasNeighbor ? `
    <div style="display:flex;gap:6px;margin-top:6px;">
      <button id="edge-g1" style="flex:1;padding:6px;background:#446;color:#eee;border:none;border-radius:4px;cursor:pointer;">G1 Tangent</button>
      <button id="edge-g2" style="flex:1;padding:6px;background:#464;color:#eee;border:none;border-radius:4px;cursor:pointer;">G2 Curvature</button>
    </div>` : ''}
    <div style="display:flex;gap:6px;margin-top:6px;">
      <button id="edge-mirror" style="flex:1;padding:6px;background:#556;color:#eee;border:none;border-radius:4px;cursor:pointer;">Mirror</button>
    </div>
  `;

  document.body.appendChild(panel);

  panel.querySelector('#edge-close')!.addEventListener('click', callbacks.onClose);
  panel.querySelector('#edge-arc90-out')!.addEventListener('click', callbacks.onArc90Out);
  panel.querySelector('#edge-arc90-in')!.addEventListener('click', callbacks.onArc90In);

  const removeBtn = panel.querySelector('#edge-remove-arc');
  if (removeBtn && callbacks.onRemoveArc) {
    removeBtn.addEventListener('click', callbacks.onRemoveArc);
  }

  const g1Btn = panel.querySelector('#edge-g1');
  if (g1Btn && callbacks.onG1) g1Btn.addEventListener('click', callbacks.onG1);

  const g2Btn = panel.querySelector('#edge-g2');
  if (g2Btn && callbacks.onG2) g2Btn.addEventListener('click', callbacks.onG2);

  panel.querySelector('#edge-mirror')!.addEventListener('click', callbacks.onMirror);

  return panel;
}
