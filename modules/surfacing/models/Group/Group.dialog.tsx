import React, {useState} from 'react';
import type {Group} from './Group.entity';

export interface GroupDialogProps {
  group: Group;
  onClose: () => void;
  onRemove: () => void;
}

/**
 * Dialog for a Group entity — shows identity info and a Remove button
 * guarded by an inline confirmation panel.
 */
export function GroupDialog({group, onClose, onRemove}: GroupDialogProps) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div style={{
      position: 'fixed', right: 10, top: '50%', transform: 'translateY(-50%)',
      background: '#1e1e1e', color: '#d4d4d4', padding: 12, borderRadius: 8,
      width: 280, fontFamily: 'sans-serif', fontSize: 12, zIndex: 10000,
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)', pointerEvents: 'auto',
    }}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10}}>
        <span style={{fontSize: 14, fontWeight: 'bold'}}>{group.name || group.id}</span>
        <button onClick={onClose}
          style={{background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 16, padding: '0 4px'}}>
          &times;
        </button>
      </div>
      <div style={{marginBottom: 10, fontSize: 11, color: '#888'}}>
        ID: {group.id}<br />
        Children: {group.children.length}
      </div>
      {confirming && (
        <div style={{marginBottom: 8, padding: 8, background: '#3a2020', borderRadius: 4}}>
          <div style={{marginBottom: 6, color: '#e88'}}>Remove this group and all its surfaces?</div>
          <div style={{display: 'flex', gap: 6}}>
            <button onClick={() => { onRemove(); onClose(); }}
              style={{flex: 1, padding: 5, background: '#a33', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold'}}>
              Yes, Remove
            </button>
            <button onClick={() => setConfirming(false)}
              style={{flex: 1, padding: 5, background: '#444', color: '#ccc', border: 'none', borderRadius: 4, cursor: 'pointer'}}>
              Cancel
            </button>
          </div>
        </div>
      )}
      <div style={{display: 'flex', gap: 6}}>
        <button onClick={() => setConfirming(true)}
          style={{flex: 1, padding: 6, background: '#533', color: '#eee', border: 'none', borderRadius: 4, cursor: 'pointer'}}>
          Remove Group
        </button>
      </div>
    </div>
  );
}
