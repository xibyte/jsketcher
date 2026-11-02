import React, {useState} from 'react';
import type {ControlPoint} from './ControlPoint.entity';

export interface ControlPointDialogProps {
  cp: ControlPoint;
  onClose: () => void;
  onWeightChange: (weight: number) => void;
}

export function ControlPointDialog({cp, onClose, onWeightChange}: ControlPointDialogProps) {
  const p = cp.position;
  const [weight, setWeight] = useState(cp.weight.value);

  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setWeight(val);
    if (!isNaN(val)) onWeightChange(val);
  };

  return (
    <div style={{
      position: 'fixed', right: 10, bottom: 10, background: '#1e1e1e',
      color: '#d4d4d4', padding: 12, borderRadius: 8, width: 240,
      fontFamily: 'sans-serif', fontSize: 12, zIndex: 10000,
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)', pointerEvents: 'auto',
    }}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
        <span style={{fontSize: 13, fontWeight: 'bold'}}>Control Point</span>
        <button onClick={onClose}
          style={{background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 16, padding: '0 4px'}}>
          &times;
        </button>
      </div>
      <div style={{marginBottom: 6, fontSize: 11, color: '#888'}}>
        Position: [{p[0].toFixed(4)}, {p[1].toFixed(4)}, {p[2].toFixed(4)}]
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
        <label>Weight</label>
        <input type="number" value={weight} step={0.1} onChange={onInput}
          style={{width: 80, padding: 3, background: '#333', color: '#eee', border: '1px solid #555', fontSize: 12}} />
      </div>
    </div>
  );
}
