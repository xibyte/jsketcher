import type {ControlPoint} from './ControlPoint.entity';

export function showControlPointDialog(
  cp: ControlPoint,
  callbacks: {onWeightChange: (weight: number) => void; onClose: () => void}
): HTMLDivElement {
  const p = cp.vertex.position;
  const panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;right:10px;bottom:10px;background:#1e1e1e;color:#d4d4d4;padding:12px;border-radius:8px;width:240px;font-family:sans-serif;font-size:12px;z-index:10000;box-shadow:0 4px 20px rgba(0,0,0,0.5);';
  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <span style="font-size:13px;font-weight:bold;">Control Point</span>
      <button id="cp-close" style="background:none;border:none;color:#aaa;cursor:pointer;font-size:16px;padding:0 4px;">&times;</button>
    </div>
    <div style="margin-bottom:6px;font-size:11px;color:#888;">
      Position: [${p[0].toFixed(4)}, ${p[1].toFixed(4)}, ${p[2].toFixed(4)}]
    </div>
    <div style="display:flex;align-items:center;gap:6px;">
      <label>Weight</label>
      <input id="cp-weight" type="number" value="${cp.weight.value}" step="0.1" style="width:80px;padding:3px;background:#333;color:#eee;border:1px solid #555;font-size:12px;" />
    </div>
  `;
  document.body.appendChild(panel);
  panel.querySelector('#cp-close')!.addEventListener('click', callbacks.onClose);
  panel.querySelector('#cp-weight')!.addEventListener('input', () => {
    const val = parseFloat((panel.querySelector('#cp-weight') as HTMLInputElement).value);
    if (!isNaN(val)) callbacks.onWeightChange(val);
  });
  return panel;
}
