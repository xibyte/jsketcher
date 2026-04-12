import React from 'react';
import {distance as vdist} from 'math/vec';
import type {DefaultTool, DefaultToolState} from '../tools/defaultTool';

const SIDE_NAMES = ['Bottom', 'Right', 'Top', 'Left'];

export function EdgePropsPanel({tool, state}: {tool: DefaultTool, state: DefaultToolState}) {
  const sel = state.selectedCurve;
  if (!sel) return null;

  const {curve, side, hasNeighbor} = sel;
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
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    }}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
        <span style={{fontSize: 13, fontWeight: 'bold'}}>{SIDE_NAMES[side]} Edge</span>
        <button onClick={() => tool.deselectCurve()}
          style={{background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 16, padding: '0 4px'}}>
          &times;
        </button>
      </div>
      <div style={{marginBottom: 8, fontSize: 11, color: '#888'}}>
        Chord length: {chordLen}{hasNeighbor ? ' | Shared' : ' | Free'}
        {existing && ` | Arc: ${Math.round(existing.angle * 1e4) / 1e4}° r=${Math.round(existing.radius * 1e4) / 1e4} (${existing.mode})`}
      </div>
      <div style={{display: 'flex', gap: 6}}>
        {btn('Arc 90° Out', '#353', () => tool.applyArc90(false))}
        {btn('Arc 90° In', '#345', () => tool.applyArc90(true))}
        {existing && btn('Remove', '#533', () => tool.removeArc())}
      </div>
      {hasNeighbor && (
        <div style={{display: 'flex', gap: 6, marginTop: 6}}>
          {btn('G1 Tangent', '#446', () => tool.applyG1())}
          {btn('G2 Curvature', '#464', () => tool.applyG2())}
        </div>
      )}
      <div style={{display: 'flex', gap: 6, marginTop: 6}}>
        {btn('Mirror', '#556', () => tool.mirror())}
      </div>
    </div>
  );
}
