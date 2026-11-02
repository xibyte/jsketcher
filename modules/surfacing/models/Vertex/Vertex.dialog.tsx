import React from 'react';
import type {Vertex} from './Vertex.entity';

export interface VertexDialogProps {
  vertex: Vertex;
  onClose: () => void;
}

/** Read-only info popup for a selected vertex. */
export function VertexDialog({vertex, onClose}: VertexDialogProps) {
  const p = vertex.position;
  return (
    <div style={{
      position: 'fixed', right: 10, bottom: 10, background: '#1e1e1e',
      color: '#d4d4d4', padding: 12, borderRadius: 8, width: 240,
      fontFamily: 'sans-serif', fontSize: 12, zIndex: 10000,
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)', pointerEvents: 'auto',
    }}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
        <span style={{fontSize: 13, fontWeight: 'bold'}}>Vertex</span>
        <button onClick={onClose}
          style={{background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 16, padding: '0 4px'}}>
          &times;
        </button>
      </div>
      <div style={{fontSize: 11, color: '#888'}}>
        Position: [{p[0].toFixed(4)}, {p[1].toFixed(4)}, {p[2].toFixed(4)}]
      </div>
    </div>
  );
}
