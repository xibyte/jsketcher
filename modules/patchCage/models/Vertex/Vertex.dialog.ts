import type {Vertex} from './Vertex.entity';

export function showVertexDialog(vertex: Vertex, callbacks: {onClose: () => void}): HTMLDivElement {
  const p = vertex.position;
  const panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;right:10px;bottom:10px;background:#1e1e1e;color:#d4d4d4;padding:12px;border-radius:8px;width:240px;font-family:sans-serif;font-size:12px;z-index:10000;box-shadow:0 4px 20px rgba(0,0,0,0.5);';
  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <span style="font-size:13px;font-weight:bold;">Vertex</span>
      <button id="vtx-close" style="background:none;border:none;color:#aaa;cursor:pointer;font-size:16px;padding:0 4px;">&times;</button>
    </div>
    <div style="font-size:11px;color:#888;">
      Position: [${p[0].toFixed(4)}, ${p[1].toFixed(4)}, ${p[2].toFixed(4)}]
    </div>
  `;
  document.body.appendChild(panel);
  panel.querySelector('#vtx-close')!.addEventListener('click', callbacks.onClose);
  return panel;
}
