import React, {useState, useCallback, useRef, useEffect} from 'react';
import {distance as vdist} from 'math/vec';
import type {DefaultTool, DefaultToolState} from '../tools/defaultTool';
import {constrainEdgeToArc} from '../ops/arc/arc.command';

export function ArcDialog({tool, state}: {tool: DefaultTool, state: DefaultToolState}) {
  const arc = state.arcDialog;
  if (!arc) return null;

  const scene = (tool as any).editor?.scene;
  if (!scene) return null;

  const [side, setSide] = useState(0);
  const [radius, setRadius] = useState(50);
  const [flip, setFlip] = useState(false);
  const [mode, setMode] = useState<'approximate' | 'rational'>('rational');
  const debounceRef = useRef<number | null>(null);

  const applyLive = useCallback(() => {
    if (debounceRef.current !== null) cancelAnimationFrame(debounceRef.current);
    debounceRef.current = requestAnimationFrame(() => {
      debounceRef.current = null;
      if (isNaN(radius) || radius <= 0) return;
      const surface = arc.surface;
      if (!surface) return;

      const edgeVerts = surface.getEdgeVertices(side);
      const chordLen = vdist(edgeVerts[0].position, edgeVerts[3].position);
      const sinHalf = Math.min(1, chordLen / (2 * radius));
      const angle = 2 * Math.asin(sinHalf) * (180 / Math.PI);

      let u = 0.5, v = 0.5;
      if (side === 0) v = 0;
      else if (side === 1) u = 1;
      else if (side === 2) v = 1;
      else if (side === 3) u = 0;
      let planeNormal = surface.normal(u, v);
      if (flip) planeNormal = [-planeNormal[0], -planeNormal[1], -planeNormal[2]];

      scene.arcConstraints = scene.arcConstraints.filter((c: any) =>
        !(c.surfaceSide && c.surfaceSide.surface === surface && c.surfaceSide.side === side)
      );
      constrainEdgeToArc(scene, surface, side, radius, angle, planeNormal, mode);
      (tool as any).editor.rebuildAll();
    });
  }, [side, radius, flip, mode, arc.surface, scene, tool]);

  useEffect(() => { applyLive(); }, [side, radius, flip, mode]);

  const inputStyle = {width: '100%', padding: 3, background: '#333', color: '#eee', border: '1px solid #555', marginTop: 2};

  return (
    <div style={{
      position: 'fixed', left: 10, top: '50%', transform: 'translateY(-50%)',
      background: '#2a2a2a', color: '#eee', padding: 16, borderRadius: 8,
      width: 220, fontFamily: 'sans-serif', fontSize: 13, zIndex: 10000,
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    }}>
      <div style={{fontSize: 14, fontWeight: 'bold', marginBottom: 10}}>Arc Constraint</div>
      <div style={{marginBottom: 6}}>
        <label>Edge</label>
        <select value={side} onChange={e => setSide(parseInt(e.target.value))} style={{...inputStyle}}>
          <option value={0}>Bottom</option>
          <option value={1}>Right</option>
          <option value={2}>Top</option>
          <option value={3}>Left</option>
        </select>
      </div>
      <div style={{marginBottom: 6}}>
        <label>Radius</label>
        <input type="number" value={radius} step={1} onChange={e => setRadius(parseFloat(e.target.value))} style={inputStyle} />
      </div>
      <div style={{marginBottom: 6}}>
        <label>Flip</label>
        <input type="checkbox" checked={flip} onChange={e => setFlip(e.target.checked)} style={{marginLeft: 8}} />
      </div>
      <div style={{marginBottom: 10}}>
        <label>Mode</label>
        <select value={mode} onChange={e => setMode(e.target.value as any)} style={{...inputStyle}}>
          <option value="approximate">Approximate (Bézier)</option>
          <option value="rational">Rational (Exact NURBS)</option>
        </select>
      </div>
      <div style={{display: 'flex', gap: 6}}>
        <button onClick={() => tool.closeArcDialog()}
          style={{flex: 1, padding: 5, background: '#555', color: '#eee', border: 'none', borderRadius: 4, cursor: 'pointer'}}>
          Close
        </button>
        <button onClick={() => tool.arcRemoveConstraint()}
          style={{flex: 1, padding: 5, background: '#884444', color: '#eee', border: 'none', borderRadius: 4, cursor: 'pointer'}}>
          Remove
        </button>
      </div>
    </div>
  );
}
