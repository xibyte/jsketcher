import React, {useState, useEffect, useRef, useCallback} from 'react';
import {distance as vdist} from 'math/vec';
import type {BoundingCurve} from './BoundingCurve.entity';
import type {NurbsSurface} from '../NurbsSurface/NurbsSurface.entity';

const SIDE_NAMES = ['Bottom', 'Right', 'Top', 'Left'];

// =====================================================================
// BoundingCurveDialog — selected-edge side panel with action buttons
// =====================================================================

export interface BoundingCurveDialogProps {
  curve: BoundingCurve;
  side: number;
  hasNeighbor: boolean;
  onClose: () => void;
  onApplyArc90: (flip: boolean) => void;
  onRemoveArc: () => void;
  onApplyG1: () => void;
  onApplyG2: () => void;
  onMirror: () => void;
}

export function BoundingCurveDialog({
  curve, side, hasNeighbor,
  onClose, onApplyArc90, onRemoveArc, onApplyG1, onApplyG2, onMirror,
}: BoundingCurveDialogProps) {
  const p0 = curve.cp[0].position;
  const p3 = curve.cp[3].position;
  const chordLen = Math.round(vdist(p0, p3) * 1e4) / 1e4;
  const existing = curve.arcConstraint;

  const btn = (label: string, bg: string, onClick: () => void) => (
    <button onClick={onClick} style={{
      flex: 1, padding: 6, background: bg, color: '#eee',
      border: 'none', borderRadius: 4, cursor: 'pointer',
    }}>{label}</button>
  );

  return (
    <div style={{
      position: 'fixed', right: 10, bottom: 10, background: '#1e1e1e',
      color: '#d4d4d4', padding: 12, borderRadius: 8, width: 340,
      fontFamily: 'sans-serif', fontSize: 12, zIndex: 10000,
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)', pointerEvents: 'auto',
    }}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
        <span style={{fontSize: 13, fontWeight: 'bold'}}>{SIDE_NAMES[side]} Edge</span>
        <button onClick={onClose}
          style={{background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 16, padding: '0 4px'}}>
          &times;
        </button>
      </div>
      <div style={{marginBottom: 8, fontSize: 11, color: '#888'}}>
        Chord length: {chordLen}{hasNeighbor ? ' | Shared' : ' | Free'}
        {existing && ` | Arc: ${Math.round(existing.angle * 1e4) / 1e4}° r=${Math.round(existing.radius * 1e4) / 1e4} (${existing.mode})`}
      </div>
      <div style={{display: 'flex', gap: 6}}>
        {btn('Arc 90° Out', '#353', () => onApplyArc90(false))}
        {btn('Arc 90° In', '#345', () => onApplyArc90(true))}
        {existing && btn('Remove', '#533', onRemoveArc)}
      </div>
      {hasNeighbor && (
        <div style={{display: 'flex', gap: 6, marginTop: 6}}>
          {btn('G1 Tangent', '#446', onApplyG1)}
          {btn('G2 Curvature', '#464', onApplyG2)}
        </div>
      )}
      <div style={{display: 'flex', gap: 6, marginTop: 6}}>
        {btn('Mirror', '#556', onMirror)}
      </div>
    </div>
  );
}

// =====================================================================
// ArcConstraintEditor — live-preview modal for authoring an arc constraint
// =====================================================================

export interface ArcConstraintParams {
  side: number;
  radius: number;
  /** Sweep angle in degrees, derived from chord length + radius. */
  angle: number;
  /** Plane normal (already flipped if `flip` is true). */
  planeNormal: [number, number, number];
  mode: 'approximate' | 'rational';
}

export interface ArcConstraintEditorProps {
  surface: NurbsSurface;
  onClose: () => void;
  /** Called (rAF-debounced) whenever any input changes. */
  onApply: (params: ArcConstraintParams) => void;
  onRemove: () => void;
}

export function ArcConstraintEditor({
  surface, onClose, onApply, onRemove,
}: ArcConstraintEditorProps) {
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

      onApply({side, radius, angle, planeNormal, mode});
    });
  }, [side, radius, flip, mode, surface, onApply]);

  useEffect(() => { applyLive(); }, [applyLive]);

  const inputStyle = {width: '100%', padding: 3, background: '#333', color: '#eee', border: '1px solid #555', marginTop: 2};

  return (
    <div style={{
      position: 'fixed', left: 10, top: '50%', transform: 'translateY(-50%)',
      background: '#2a2a2a', color: '#eee', padding: 16, borderRadius: 8,
      width: 220, fontFamily: 'sans-serif', fontSize: 13, zIndex: 10000,
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)', pointerEvents: 'auto',
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
        <button onClick={onClose}
          style={{flex: 1, padding: 5, background: '#555', color: '#eee', border: 'none', borderRadius: 4, cursor: 'pointer'}}>
          Close
        </button>
        <button onClick={onRemove}
          style={{flex: 1, padding: 5, background: '#884444', color: '#eee', border: 'none', borderRadius: 4, cursor: 'pointer'}}>
          Remove
        </button>
      </div>
    </div>
  );
}
