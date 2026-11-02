import React, {useState} from 'react';
import type {NurbsSurface} from './NurbsSurface.entity';
import {extrude} from '../../ops/extrude/extrude.command';
import {subdivide} from '../../ops/subdivide/subdivide.command';
import {PushPullWizard} from '../../ops/pushPull/pushPull.wizard';

const round = (v: number) => Math.round(v * 1e6) / 1e6;
const fmtVec = (p: number[]) => [round(p[0]), round(p[1]), round(p[2])];

function compactNumberArrays(json: string): string {
  return json.replace(/\[\s*(-?\d[\d.e+\-]*\s*,?\s*)+\]/g, match => {
    const nums = match.slice(1, -1).split(',').map(s => s.trim());
    return '[' + nums.join(', ') + ']';
  });
}

export interface NurbsSurfaceDialogProps {
  surface: NurbsSurface;
  /**
   * Dismisses the dialog. Also invoked by mutation actions that
   * invalidate the current selection (subdivide, remove) so the owner
   * can clear whatever selection state was tracking this surface.
   */
  onClose: () => void;
}

type Tab = 'info' | 'nurbs';

/**
 * Dialog for a selected NurbsSurface — two tabs:
 *   - info: summary and primary mutation actions
 *   - nurbs: full serialized NURBS definition + copy button
 *
 * Mutation handlers (push/pull, extrude, subdivide, remove) call the
 * ops directly through `surface.ctx` (which is the SurfacingEditor);
 * no tool reference needed.
 */
export function NurbsSurfaceDialog({surface, onClose}: NurbsSurfaceDialogProps) {
  const [extrudeDistance, setExtrudeDistance] = useState(10);
  const [tab, setTab] = useState<Tab>('info');

  const editor = surface.ctx;

  const handlePushPull = () => {
    new PushPullWizard(editor, surface);
  };

  const handleExtrude = () => {
    extrude(editor.scene, surface, extrudeDistance);
    editor.commit();
  };

  const handleSubdivide = () => {
    subdivide(editor.scene, surface);
    onClose();
    editor.commit();
  };

  const handleRemove = () => {
    // Exit edit mode BEFORE disposing so the cage + CP handles hide
    // themselves while the entity is still intact.
    onClose();
    if (surface.parent) surface.parent.removeChild(surface);
    surface.dispose();
    editor.commit();
  };

  const cps = surface.getCPs();
  const controlPoints = cps.map(row => row.map(c => fmtVec(c.position)));
  const weights = cps.map(row => row.map(c => round(c.weight.value)));
  const knots = [0, 0, 0, 0, 1, 1, 1, 1];

  const constraints: {edge: string; type: string; mode: string; radius: number; angle: number}[] = [];
  for (const bc of [surface.boundingCurves.bottom, surface.boundingCurves.right,
                     surface.boundingCurves.top, surface.boundingCurves.left]) {
    const arc = bc.constraints.arc;
    if (arc) {
      constraints.push({
        edge: ['bottom', 'right', 'top', 'left'][bc.side],
        type: 'arc',
        mode: arc.mode,
        radius: round(arc.radius),
        angle: round(arc.angle),
      });
    }
  }

  const def: any = {
    surface: surface.id, degree: [3, 3],
    knotsU: knots, knotsV: knots,
    rational: surface.rational, controlPoints, weights,
  };
  if (constraints.length > 0) def.constraints = constraints;
  const json = compactNumberArrays(JSON.stringify(def, null, 2));

  const tabButtonStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '6px 10px', fontFamily: 'sans-serif', fontSize: 12,
    background: active ? '#2a2a2a' : 'transparent',
    color: active ? '#eee' : '#888', border: 'none',
    borderBottom: active ? '2px solid #6af' : '2px solid transparent',
    cursor: 'pointer',
  });

  return (
    <div style={{
      background: '#1e1e1e', color: '#d4d4d4', padding: 12, borderRadius: 8,
      width: 340, maxHeight: '60vh', fontFamily: 'sans-serif', fontSize: 12,
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      display: 'flex', flexDirection: 'column', pointerEvents: 'auto',
    }}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
        <span style={{fontSize: 13, fontWeight: 'bold'}}>
          Surface {surface.id}
        </span>
        <button onClick={onClose}
          style={{background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 16, padding: '0 4px'}}>
          &times;
        </button>
      </div>

      <div style={{display: 'flex', borderBottom: '1px solid #333', marginBottom: 8}}>
        <button style={tabButtonStyle(tab === 'info')} onClick={() => setTab('info')}>Info</button>
        <button style={tabButtonStyle(tab === 'nurbs')} onClick={() => setTab('nurbs')}>NURBS</button>
      </div>

      {tab === 'info' && (
        <div style={{overflow: 'auto', flex: 1, fontSize: 11, lineHeight: 1.6}}>
          <div style={{display: 'grid', gridTemplateColumns: '100px 1fr', rowGap: 2, columnGap: 8, color: '#aaa'}}>
            <div>Degree</div><div style={{color: '#eee'}}>3 × 3</div>
            <div>Rational</div><div style={{color: '#eee'}}>{surface.rational ? 'yes' : 'no'}</div>
            <div>Grid</div><div style={{color: '#eee'}}>{cps.length} × {cps[0].length}</div>
            <div>Constraints</div><div style={{color: '#eee'}}>{constraints.length || 'none'}</div>
          </div>
          {constraints.length > 0 && (
            <div style={{marginTop: 8}}>
              {constraints.map((c, i) => (
                <div key={i} style={{
                  marginTop: 4, padding: 6, background: '#262626', borderRadius: 4,
                  fontFamily: 'monospace', fontSize: 11, color: '#d4d4d4',
                }}>
                  {c.edge} · arc r={c.radius} {c.angle}° ({c.mode})
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'nurbs' && (
        <div style={{display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0}}>
          <pre style={{
            margin: 0, overflow: 'auto', flex: 1, background: '#111',
            padding: 8, borderRadius: 4, whiteSpace: 'pre', userSelect: 'all',
            cursor: 'text', lineHeight: 1.4, fontFamily: 'monospace', fontSize: 11,
          }}>{json}</pre>
          <button onClick={() => navigator.clipboard?.writeText(json)}
            style={{marginTop: 6, padding: 5, background: '#335', color: '#eee', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12}}>
            Copy to Clipboard
          </button>
        </div>
      )}

      <div style={{display: 'flex', gap: 6, marginTop: 8}}>
        <button onClick={handlePushPull}
          style={{flex: 1, padding: 5, background: '#345', color: '#eee', border: 'none', borderRadius: 4, cursor: 'pointer'}}>
          Push / Pull…
        </button>
      </div>
      <div style={{display: 'flex', gap: 6, marginTop: 6, alignItems: 'center'}}>
        <label style={{whiteSpace: 'nowrap'}}>Distance</label>
        <input type="number" value={extrudeDistance} step={1}
          onChange={e => setExtrudeDistance(parseFloat(e.target.value))}
          style={{width: 70, padding: 3, background: '#333', color: '#eee', border: '1px solid #555', fontSize: 12}} />
        <button onClick={handleExtrude}
          style={{flex: 1, padding: 5, background: '#354', color: '#eee', border: 'none', borderRadius: 4, cursor: 'pointer'}}>
          Extrude
        </button>
      </div>
      <div style={{display: 'flex', gap: 6, marginTop: 6}}>
        <button onClick={handleSubdivide}
          style={{flex: 1, padding: 5, background: '#353', color: '#eee', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12}}>
          Subdivide 3x3
        </button>
        <button onClick={handleRemove}
          style={{flex: 1, padding: 5, background: '#533', color: '#eee', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12}}>
          Remove
        </button>
      </div>
    </div>
  );
}
