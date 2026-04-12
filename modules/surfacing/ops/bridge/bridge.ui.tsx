import React from 'react';
import {useStream} from 'ui/effects';
import type {BridgeTool} from './bridge.tool';

/**
 * Factory for BridgeTool's overlay UI. Closes over the tool so the
 * returned parameterless component can read state$ and invoke tool
 * methods directly.
 */
export function bridgeUI(tool: BridgeTool): React.FC {
  return function BridgeToolUI() {
    const state = useStream(tool.state$);
    if (!state) return null;

    return (
      <div style={{
        position: 'fixed', bottom: 110, left: '50%', transform: 'translateX(-50%)',
        background: '#1e1e1e', color: '#d4d4d4', padding: '10px 16px',
        borderRadius: 8, fontFamily: 'sans-serif', fontSize: 12,
        zIndex: 10001, boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', gap: 12, pointerEvents: 'auto',
      }}>
        <span style={{fontWeight: 'bold', fontSize: 13, whiteSpace: 'nowrap'}}>Bridge Surface</span>
        <span style={{color: '#555'}}>|</span>
        <button onClick={() => tool.toggleG1()} style={{
          padding: '4px 10px', border: 'none', borderRadius: 4, cursor: 'pointer',
          fontSize: 12, fontFamily: 'sans-serif', whiteSpace: 'nowrap',
          background: state.g1 ? '#4a7' : '#444', color: state.g1 ? '#fff' : '#aaa',
        }}>
          G1 {state.g1 ? 'ON' : 'OFF'}
        </button>
        <span style={{color: '#555'}}>|</span>
        <button onClick={() => tool.flip()} style={{
          padding: '4px 10px', background: '#446', color: '#eee',
          border: 'none', borderRadius: 4, cursor: 'pointer',
          fontSize: 12, fontFamily: 'sans-serif', whiteSpace: 'nowrap',
        }}>
          Flip
        </button>
        <span style={{color: '#555'}}>|</span>
        <span style={{color: '#888', fontSize: 11, whiteSpace: 'nowrap'}}>
          Click two edges · Tab=flip · G=G1 · Esc=cancel
        </span>
      </div>
    );
  };
}
