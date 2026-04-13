import React, {useState, useEffect, useRef, useCallback} from 'react';
import {distance as vdist} from 'math/vec';
import type {NurbsSurface} from '../../models/NurbsSurface/NurbsSurface.entity';
import {removeFromPort} from '../../ui/SurfacingUI';
import {constrainEdgeToArc, removeArcConstraint} from './arc.command';

/** Port id that the arc editor occupies while open. */
export const ARC_EDITOR_PORT_ID = 'arcEditor';

const SIDE_NAMES = ['Bottom', 'Right', 'Top', 'Left'];

/**
 * Factory for the arc-constraint editor panel. The caller (typically
 * `BoundingCurveDialog`) picks the surface + edge side; the editor is
 * scoped to that one edge and never lets the user retarget it. It
 * owns its own radius / flip / mode state, pushes changes to the scene
 * on every tick via `constrainEdgeToArc`, and removes itself from the
 * port when the user clicks Close or Remove.
 *
 * It does NOT need a tool reference; the surface entity provides the
 * scene + editor via `surface.ctx`.
 */
export function arcEditorUI(surface: NurbsSurface, side: number): React.FC {
  return function ArcEditorUI() {
    const [radius, setRadius] = useState(50);
    const [flip, setFlip] = useState(false);
    const [mode, setMode] = useState<'approximate' | 'rational'>('rational');
    const debounceRef = useRef<number | null>(null);

    const applyLive = useCallback(() => {
      if (debounceRef.current !== null) cancelAnimationFrame(debounceRef.current);
      debounceRef.current = requestAnimationFrame(() => {
        debounceRef.current = null;
        if (isNaN(radius) || radius <= 0) return;

        const edgeVerts = surface.getEdgeVertices(side);
        const chordLen = vdist(edgeVerts[0].position, edgeVerts[3].position);
        const sinHalf = Math.min(1, chordLen / (2 * radius));
        const angle = 2 * Math.asin(sinHalf) * (180 / Math.PI);

        let u = 0.5, v = 0.5;
        if (side === 0) v = 0;
        else if (side === 1) u = 1;
        else if (side === 2) v = 1;
        else if (side === 3) u = 0;
        const n = surface.normal(u, v);
        const planeNormal: [number, number, number] = flip
          ? [-n[0], -n[1], -n[2]]
          : [n[0], n[1], n[2]];

        const editor = surface.ctx;
        const scene = editor.scene;
        scene.arcConstraints = scene.arcConstraints.filter(cc =>
          !(cc.surfaceSide?.surface === surface && cc.surfaceSide?.side === side)
        );
        constrainEdgeToArc(scene, surface, side, radius, angle, planeNormal, mode);
        editor.commit();
      });
    }, [radius, flip, mode]);

    useEffect(() => { applyLive(); }, [applyLive]);

    const handleClose = () => removeFromPort(ARC_EDITOR_PORT_ID);

    const handleRemove = () => {
      const editor = surface.ctx;
      const scene = editor.scene;
      // Drop the constraint for this (surface, side). Using
      // removeArcConstraint preserves the op's side-effects (weight
      // reset for rational mode).
      const constraint = scene.arcConstraints.find(cc =>
        cc.surfaceSide?.surface === surface && cc.surfaceSide?.side === side
      );
      if (constraint) removeArcConstraint(scene, constraint);
      editor.commit();
      removeFromPort(ARC_EDITOR_PORT_ID);
    };

    const inputStyle = {width: '100%', padding: 3, background: '#333', color: '#eee', border: '1px solid #555', marginTop: 2};

    return (
      <div style={{
        background: '#2a2a2a', color: '#eee', padding: 16, borderRadius: 8,
        width: 220, fontFamily: 'sans-serif', fontSize: 13,
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)', pointerEvents: 'auto',
      }}>
        <div style={{fontSize: 14, fontWeight: 'bold', marginBottom: 4}}>Arc Constraint</div>
        <div style={{fontSize: 11, color: '#888', marginBottom: 10}}>
          {SIDE_NAMES[side]} edge
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
          <button onClick={handleClose}
            style={{flex: 1, padding: 5, background: '#555', color: '#eee', border: 'none', borderRadius: 4, cursor: 'pointer'}}>
            Close
          </button>
          <button onClick={handleRemove}
            style={{flex: 1, padding: 5, background: '#884444', color: '#eee', border: 'none', borderRadius: 4, cursor: 'pointer'}}>
            Remove
          </button>
        </div>
      </div>
    );
  };
}
