import React, {useState} from 'react';
import type {DefaultTool, DefaultToolState} from '../tools/defaultTool';

const round = (v: number) => Math.round(v * 1e6) / 1e6;
const fmtVec = (p: number[]) => [round(p[0]), round(p[1]), round(p[2])];

function compactNumberArrays(json: string): string {
  return json.replace(/\[\s*(-?\d[\d.e+\-]*\s*,?\s*)+\]/g, match => {
    const nums = match.slice(1, -1).split(',').map(s => s.trim());
    return '[' + nums.join(', ') + ']';
  });
}

export function SurfacePropsPanel({tool, state}: {tool: DefaultTool, state: DefaultToolState}) {
  const [distance, setDistance] = useState(10);
  const sel = state.selectedSurface;
  if (!sel) return null;

  const {surface, patchIdx} = sel;
  const cps = surface.getCPs();
  const controlPoints = cps.map(row => row.map(c => fmtVec(c.position)));
  const weights = cps.map(row => row.map(c => round(c.weight.value)));
  const knots = [0, 0, 0, 0, 1, 1, 1, 1];

  const constraints: any[] = [];
  for (const bc of [surface.boundingCurves.bottom, surface.boundingCurves.right,
                     surface.boundingCurves.top, surface.boundingCurves.left]) {
    if (bc.arcConstraint) {
      constraints.push({
        edge: ['bottom', 'right', 'top', 'left'][bc.side],
        type: 'arc',
        mode: bc.arcConstraint.mode,
        radius: round(bc.arcConstraint.radius),
        angle: round(bc.arcConstraint.angle),
      });
    }
  }

  const def: any = {
    surface: patchIdx, degree: [3, 3],
    knotsU: knots, knotsV: knots,
    rational: surface.rational, controlPoints, weights,
  };
  if (constraints.length > 0) def.constraints = constraints;
  const json = compactNumberArrays(JSON.stringify(def, null, 2));

  return (
    <div style={{
      position: 'fixed', right: 10, top: '50%', transform: 'translateY(-50%)',
      background: '#1e1e1e', color: '#d4d4d4', padding: 12, borderRadius: 8,
      width: 340, maxHeight: '70vh', fontFamily: 'monospace', fontSize: 11,
      zIndex: 10000, boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
        <span style={{fontFamily: 'sans-serif', fontSize: 13, fontWeight: 'bold'}}>
          Surface {patchIdx} — NURBS Definition
        </span>
        <button onClick={() => tool.deselectSurface()}
          style={{background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 16, padding: '0 4px'}}>
          &times;
        </button>
      </div>
      <pre style={{
        margin: 0, overflow: 'auto', flex: 1, background: '#111',
        padding: 8, borderRadius: 4, whiteSpace: 'pre', userSelect: 'all',
        cursor: 'text', lineHeight: 1.4,
      }}>{json}</pre>
      <div style={{display: 'flex', gap: 6, marginTop: 8, fontFamily: 'sans-serif', fontSize: 12, alignItems: 'center'}}>
        <label style={{whiteSpace: 'nowrap'}}>Distance</label>
        <input type="number" value={distance} step={1}
          onChange={e => setDistance(parseFloat(e.target.value))}
          style={{width: 70, padding: 3, background: '#333', color: '#eee', border: '1px solid #555', fontSize: 12}} />
        <button onClick={() => tool.pushPull(distance)}
          style={{flex: 1, padding: 5, background: '#345', color: '#eee', border: 'none', borderRadius: 4, cursor: 'pointer'}}>
          Push/Pull
        </button>
        <button onClick={() => tool.extrude(distance)}
          style={{flex: 1, padding: 5, background: '#354', color: '#eee', border: 'none', borderRadius: 4, cursor: 'pointer'}}>
          Extrude
        </button>
      </div>
      <div style={{display: 'flex', gap: 6, marginTop: 6}}>
        <button onClick={() => navigator.clipboard?.writeText(json)}
          style={{flex: 1, padding: 5, background: '#335', color: '#eee', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'sans-serif', fontSize: 12}}>
          Copy to Clipboard
        </button>
        <button onClick={() => tool.subdivide()}
          style={{flex: 1, padding: 5, background: '#353', color: '#eee', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'sans-serif', fontSize: 12}}>
          Subdivide 3x3
        </button>
        <button onClick={() => tool.removeSurface()}
          style={{flex: 1, padding: 5, background: '#533', color: '#eee', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'sans-serif', fontSize: 12}}>
          Remove
        </button>
      </div>
    </div>
  );
}
