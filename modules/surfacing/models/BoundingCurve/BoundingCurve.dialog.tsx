import React, {useEffect} from 'react';
import {distance as vdist, lerp as vlerp} from 'math/vec';
import type {BoundingCurve} from './BoundingCurve.entity';
import type {NurbsSurface} from '../NurbsSurface/NurbsSurface.entity';
import {constrainEdgeToArc} from '../../ops/arc/arc.command';
import {applyG1, applyG2} from '../../ops/continuity/continuity.command';
import {mirrorAcrossEdge} from '../../ops/mirror/mirror.command';
import {addToPort, removeFromPort} from '../../ui/SurfacingUI';
import {arcEditorUI, ARC_EDITOR_PORT_ID} from '../../ops/arc/arc.ui';

const SIDE_NAMES = ['Bottom', 'Right', 'Top', 'Left'];

export interface BoundingCurveDialogProps {
  /**
   * The surface whose edge is being edited. A BoundingCurve may be
   * shared between adjacent surfaces, so the dialog needs to know which
   * surface is the current selection context (for surface.normal,
   * arcConstraints lookup, and for the mirror op source).
   */
  surface: NurbsSurface;
  curve: BoundingCurve;
  side: number;
  hasNeighbor: boolean;
  onClose: () => void;
}

export function BoundingCurveDialog({
  surface, curve, side, hasNeighbor, onClose,
}: BoundingCurveDialogProps) {
  // The arc editor is a port entry; tear it down when this dialog
  // goes away (edge deselected, tool swapped, etc.) so we don't leave
  // a zombie modal bound to a surface/side that's no longer in focus.
  useEffect(() => {
    return () => removeFromPort(ARC_EDITOR_PORT_ID);
  }, []);

  const p0 = curve.cp[0].position;
  const p3 = curve.cp[3].position;
  const chordLen = Math.round(vdist(p0, p3) * 1e4) / 1e4;
  const existing = curve.arcConstraint;
  const editor = surface.ctx;

  const handleOpenArcEditor = () => {
    addToPort('right', ARC_EDITOR_PORT_ID, arcEditorUI(surface, side));
  };

  const handleApplyArc90 = (flip: boolean) => {
    const scene = editor.scene;
    const ev = surface.getEdgeVertices(side);
    const chord = vdist(ev[0].position, ev[3].position);
    const radius = chord / Math.SQRT2;
    let u = 0.5, v = 0.5;
    if (side === 0) v = 0;
    else if (side === 1) u = 1;
    else if (side === 2) v = 1;
    else if (side === 3) u = 0;
    const n = surface.normal(u, v);
    const planeNormal: [number, number, number] = flip
      ? [-n[0], -n[1], -n[2]]
      : [n[0], n[1], n[2]];
    scene.arcConstraints = scene.arcConstraints.filter(cc =>
      !(cc.surfaceSide?.surface === surface && cc.surfaceSide?.side === side)
    );
    constrainEdgeToArc(scene, surface, side, radius, 90, planeNormal, 'rational');
    editor.commit();
  };

  const handleRemoveArc = () => {
    const scene = editor.scene;
    scene.arcConstraints = scene.arcConstraints.filter(cc => {
      if (cc.surfaceSide?.surface === surface && cc.surfaceSide?.side === side) {
        const ev = surface.getEdgeVertices(side);
        const lp1 = vlerp(ev[0].position, ev[3].position, 1 / 3);
        const lp2 = vlerp(ev[0].position, ev[3].position, 2 / 3);
        ev[1].set(lp1[0], lp1[1], lp1[2]);
        ev[2].set(lp2[0], lp2[1], lp2[2]);
        return false;
      }
      return true;
    });
    for (const row of surface.grid) {
      for (const cp of row) (cp as any).weight.value = 1;
    }
    editor.commit();
  };

  const handleApplyG1 = () => {
    applyG1(surface, side);
    editor.commit();
  };

  const handleApplyG2 = () => {
    applyG2(surface, side);
    editor.commit();
  };

  const handleMirror = () => {
    mirrorAcrossEdge(editor.scene, surface, side);
    editor.commit();
  };

  const btn = (label: string, bg: string, onClick: () => void) => (
    <button onClick={onClick} style={{
      flex: 1, padding: 6, background: bg, color: '#eee',
      border: 'none', borderRadius: 4, cursor: 'pointer',
    }}>{label}</button>
  );

  return (
    <div style={{
      background: '#1e1e1e', color: '#d4d4d4', padding: 12, borderRadius: 8,
      width: 340, fontFamily: 'sans-serif', fontSize: 12,
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
        {btn('Arc 90° Out', '#353', () => handleApplyArc90(false))}
        {btn('Arc 90° In', '#345', () => handleApplyArc90(true))}
        {existing && btn('Remove', '#533', handleRemoveArc)}
      </div>
      <div style={{display: 'flex', gap: 6, marginTop: 6}}>
        {btn('Arc Editor…', '#444', handleOpenArcEditor)}
      </div>
      {hasNeighbor && (
        <div style={{display: 'flex', gap: 6, marginTop: 6}}>
          {btn('G1 Tangent', '#446', handleApplyG1)}
          {btn('G2 Curvature', '#464', handleApplyG2)}
        </div>
      )}
      <div style={{display: 'flex', gap: 6, marginTop: 6}}>
        {btn('Mirror', '#556', handleMirror)}
      </div>
    </div>
  );
}
