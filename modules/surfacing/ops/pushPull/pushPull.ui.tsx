import React, {useEffect, useState} from 'react';
import {useStream} from 'ui/effects';
import type {PushPullWizard} from './pushPull.wizard';

const round = (v: number) => Math.round(v * 1e4) / 1e4;

type Direction = 'push' | 'pull';

/** Convert the combo direction + positive magnitude into signed distance. */
function toSignedDistance(dir: Direction, mag: number): number {
  return dir === 'push' ? -mag : mag;
}

/**
 * Bottom-port banner for the push/pull wizard.
 *
 * UI layout:   [Push/Pull ▾]  distance [ n ]  [Go]  |  [Close]
 *
 * The combo lets the user pick direction explicitly (push is the
 * negative side of the normal, pull the positive side). The input is
 * the unsigned magnitude — it never shows a minus. When the wizard's
 * internal distance changes (e.g. from dragging the 3D arrow), the
 * combo and input stay in sync via useEffect; the combo flips the
 * moment the drag crosses zero.
 */
export function pushPullUI(wizard: PushPullWizard): React.FC {
  return function PushPullUI() {
    const state = useStream(wizard.state$);
    const distance = state?.distance ?? 0;

    const [text, setText] = useState(() => String(round(Math.abs(distance))));
    const [direction, setDirection] = useState<Direction>(() =>
      distance < 0 ? 'push' : 'pull'
    );

    // External (drag) updates → sync the input + combo. A distance of
    // exactly zero is ambiguous so we keep whatever the user last
    // chose instead of resetting the combo.
    useEffect(() => {
      setText(String(round(Math.abs(distance))));
      if (distance > 0) setDirection('pull');
      else if (distance < 0) setDirection('push');
    }, [distance]);

    const apply = () => {
      const mag = Math.abs(parseFloat(text));
      if (Number.isNaN(mag)) {
        setText(String(round(Math.abs(wizard.state$.value.distance))));
        return;
      }
      wizard.setDistance(toSignedDistance(direction, mag));
    };

    const onDirectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newDir = e.target.value as Direction;
      setDirection(newDir);
      // Commit the swap immediately — same magnitude, opposite sign.
      const mag = Math.abs(parseFloat(text));
      if (!Number.isNaN(mag)) {
        wizard.setDistance(toSignedDistance(newDir, mag));
      }
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        apply();
        (e.target as HTMLInputElement).blur();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setText(String(round(Math.abs(wizard.state$.value.distance))));
        (e.target as HTMLInputElement).blur();
      }
    };

    const selectStyle = {
      padding: '4px 6px', background: '#333', color: '#eee',
      border: '1px solid #555', borderRadius: 3, fontSize: 12,
      fontFamily: 'sans-serif',
    };

    return (
      <div style={{
        background: '#1e1e1e', color: '#d4d4d4', padding: '10px 16px',
        borderRadius: 8, fontFamily: 'sans-serif', fontSize: 12,
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', gap: 12, pointerEvents: 'auto',
      }}>
        <select value={direction} onChange={onDirectionChange} style={selectStyle}>
          <option value="push">Push</option>
          <option value="pull">Pull</option>
        </select>
        <label style={{color: '#888'}}>distance</label>
        <input
          type="number"
          min={0}
          value={text}
          step={1}
          onChange={e => setText(e.target.value)}
          onBlur={apply}
          onKeyDown={onKeyDown}
          style={{
            width: 80, padding: 4, background: '#333', color: '#eee',
            border: '1px solid #555', borderRadius: 3, fontSize: 12,
          }}
        />
        <button onClick={apply} style={{
          padding: '4px 10px', background: '#446', color: '#eee',
          border: 'none', borderRadius: 4, cursor: 'pointer',
          fontSize: 12, fontFamily: 'sans-serif',
        }}>
          Go
        </button>
        <span style={{color: '#555'}}>|</span>
        <button onClick={() => wizard.dispose()} style={{
          padding: '4px 10px', background: '#555', color: '#eee',
          border: 'none', borderRadius: 4, cursor: 'pointer',
          fontSize: 12, fontFamily: 'sans-serif',
        }}>
          Close
        </button>
      </div>
    );
  };
}
