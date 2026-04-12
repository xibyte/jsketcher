import React from 'react';
import type {LoopInsertTool} from './split.tool';

/**
 * LoopInsertTool has no reactive state of its own — just a top banner
 * explaining the keyboard / mouse affordances while the tool is active.
 */
export function loopInsertUI(_tool: LoopInsertTool): React.FC {
  return function LoopInsertToolUI() {
    return (
      <div style={{
        position: 'fixed', top: 10, left: '50%', transform: 'translateX(-50%)',
        background: '#1e1e1e', color: '#d4d4d4', padding: '10px 16px',
        borderRadius: 8, fontFamily: 'sans-serif', fontSize: 12,
        zIndex: 10001, boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', gap: 12, pointerEvents: 'auto',
      }}>
        <span style={{fontWeight: 'bold', fontSize: 13, whiteSpace: 'nowrap'}}>Insert Loop</span>
        <span style={{color: '#555'}}>|</span>
        <span style={{color: '#888', fontSize: 11, whiteSpace: 'nowrap'}}>
          Hover surface · Click=insert · Shift=swap u/v · Esc=cancel
        </span>
      </div>
    );
  };
}
