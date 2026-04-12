import React from 'react';

interface ModeGuideProps {
  title: string;
  hint: string;
  g1: boolean;
  onG1Toggle: () => void;
  onFlip?: () => void;
}

export function ModeGuide({title, hint, g1, onG1Toggle, onFlip}: ModeGuideProps) {
  return (
    <div style={{
      position: 'fixed', top: 10, left: '50%', transform: 'translateX(-50%)',
      background: '#1e1e1e', color: '#d4d4d4', padding: '10px 16px',
      borderRadius: 8, fontFamily: 'sans-serif', fontSize: 12,
      zIndex: 10001, boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <span style={{fontWeight: 'bold', fontSize: 13, whiteSpace: 'nowrap'}}>{title}</span>
      <span style={{color: '#555'}}>|</span>
      <button onClick={onG1Toggle} style={{
        padding: '4px 10px', border: 'none', borderRadius: 4, cursor: 'pointer',
        fontSize: 12, fontFamily: 'sans-serif', whiteSpace: 'nowrap',
        background: g1 ? '#4a7' : '#444', color: g1 ? '#fff' : '#aaa',
      }}>
        G1 {g1 ? 'ON' : 'OFF'}
      </button>
      {onFlip && <>
        <span style={{color: '#555'}}>|</span>
        <button onClick={onFlip} style={{
          padding: '4px 10px', background: '#446', color: '#eee',
          border: 'none', borderRadius: 4, cursor: 'pointer',
          fontSize: 12, fontFamily: 'sans-serif', whiteSpace: 'nowrap',
        }}>
          Flip
        </button>
      </>}
      <span style={{color: '#555'}}>|</span>
      <span style={{color: '#888', fontSize: 11, whiteSpace: 'nowrap'}}>{hint}</span>
    </div>
  );
}
