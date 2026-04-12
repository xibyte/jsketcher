/**
 * Shared mode-guide banner shown at the top of the viewport during
 * modal tool modes (Bridge, Fill Hole). Each tool creates its own
 * ModeGuideState and controls it directly — the editor doesn't know
 * about this UI.
 */

export interface ModeGuideState {
  panel: HTMLDivElement | null;
  g1: boolean;
  _updateG1Btn: (() => void) | null;
}

export function createModeGuideState(): ModeGuideState {
  return {panel: null, g1: false, _updateG1Btn: null};
}

export interface ModeGuideOptions {
  title: string;
  hint: string;
  onG1Toggle: () => void;
  onFlip?: () => void;
}

export function showModeGuide(state: ModeGuideState, opts: ModeGuideOptions): void {
  closeModeGuide(state);

  const panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);background:#1e1e1e;color:#d4d4d4;padding:10px 16px;border-radius:8px;font-family:sans-serif;font-size:12px;z-index:10001;box-shadow:0 4px 20px rgba(0,0,0,0.5);display:flex;align-items:center;gap:12px;';

  const title = document.createElement('span');
  title.style.cssText = 'font-weight:bold;font-size:13px;white-space:nowrap;';
  title.textContent = opts.title;
  panel.appendChild(title);

  const sep1 = document.createElement('span');
  sep1.style.cssText = 'color:#555;';
  sep1.textContent = '|';
  panel.appendChild(sep1);

  const g1Btn = document.createElement('button');
  g1Btn.style.cssText = 'padding:4px 10px;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-family:sans-serif;white-space:nowrap;';
  state._updateG1Btn = () => {
    g1Btn.style.background = state.g1 ? '#4a7' : '#444';
    g1Btn.style.color = state.g1 ? '#fff' : '#aaa';
    g1Btn.textContent = 'G1 ' + (state.g1 ? 'ON' : 'OFF');
  };
  state._updateG1Btn();
  g1Btn.onclick = () => opts.onG1Toggle();
  panel.appendChild(g1Btn);

  if (opts.onFlip) {
    const sep2 = document.createElement('span');
    sep2.style.cssText = 'color:#555;';
    sep2.textContent = '|';
    panel.appendChild(sep2);

    const flipBtn = document.createElement('button');
    flipBtn.style.cssText = 'padding:4px 10px;background:#446;color:#eee;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-family:sans-serif;white-space:nowrap;';
    flipBtn.textContent = 'Flip';
    flipBtn.onclick = opts.onFlip;
    panel.appendChild(flipBtn);
  }

  const sep3 = document.createElement('span');
  sep3.style.cssText = 'color:#555;';
  sep3.textContent = '|';
  panel.appendChild(sep3);

  const hint = document.createElement('span');
  hint.style.cssText = 'color:#888;font-size:11px;white-space:nowrap;';
  hint.textContent = opts.hint;
  panel.appendChild(hint);

  document.body.appendChild(panel);
  state.panel = panel;
}

export function updateModeGuide(state: ModeGuideState): void {
  state._updateG1Btn?.();
}

export function closeModeGuide(state: ModeGuideState): void {
  if (state.panel) {
    state.panel.parentNode?.removeChild(state.panel);
    state.panel = null;
    state._updateG1Btn = null;
  }
}

export function toggleG1(state: ModeGuideState): void {
  state.g1 = !state.g1;
  updateModeGuide(state);
}
