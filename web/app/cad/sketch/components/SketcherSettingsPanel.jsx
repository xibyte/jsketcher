import React, {useContext, useEffect, useRef, useState} from 'react';
import {ReactApplicationContext} from "cad/dom/ReactApplicationContext";
import {useStream} from "ui/effects";
import ls from '../../dom/components/SettingsPanel.less';
import cx from 'classnames';

const SK_SETTINGS_KEY = 'ForgeCAD.sketcherSettings';

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(SK_SETTINGS_KEY) || '{}'); }
  catch(e) { return {}; }
}

function saveSettings(s) {
  localStorage.setItem(SK_SETTINGS_KEY, JSON.stringify(s));
}

function applySketcherToolbarVars(iconSize, textSize, spacing) {
  const el = document.getElementById('top-toolbar');
  if (!el) return;
  el.style.setProperty('--toolbar-icon-size', `${iconSize}px`);
  el.style.setProperty('--toolbar-text-size', `${textSize}px`);
  el.style.setProperty('--toolbar-spacing', `${spacing}px`);
}

function applySketcherToolbarStretch(enabled) {
  let el = document.getElementById('forgecad-sketcher-toolbar-stretch');
  if (!el) { el = document.createElement('style'); el.id = 'forgecad-sketcher-toolbar-stretch'; document.head.appendChild(el); }
  el.textContent = enabled ? `
    #top-toolbar [class*="mainActions"] { justify-content: space-evenly !important; }
    #top-toolbar [class*="mainActions"] > * { flex: 1 !important; justify-content: center !important; }
    #top-toolbar [class*="splitter"] { flex: 0 0 3px !important; }
  ` : '';
}

function clearSketcherToolbarVars() {
  const el = document.getElementById('top-toolbar');
  if (el) {
    el.style.removeProperty('--toolbar-icon-size');
    el.style.removeProperty('--toolbar-text-size');
    el.style.removeProperty('--toolbar-spacing');
  }
  const stretch = document.getElementById('forgecad-sketcher-toolbar-stretch');
  if (stretch) stretch.textContent = '';
}

const PANEL_WIDTH = 240;

export function SketcherSettingsPanel() {
  const ctx = useContext(ReactApplicationContext);
  const anchor = useStream(ctx => ctx.streams.ui.sketcherSettingsPanelOpen);
  const panelRef = useRef(null);
  const [basePos, setBasePos] = useState({x: 200, y: 52});
  const [dragOffset, setDragOffset] = useState({x: 0, y: 0});

  useEffect(() => {
    if (anchor) {
      let x = anchor.left + anchor.width / 2 - PANEL_WIDTH / 2;
      x = Math.max(8, Math.min(window.innerWidth - PANEL_WIDTH - 8, x));
      setBasePos({x, y: anchor.bottom + 6});
      setDragOffset({x: 0, y: 0});
    }
  }, [anchor]);

  const saved = loadSettings();
  const [snapEnabled, setSnapEnabled] = useState(saved.snapEnabled !== false);
  const [snapBuffer, setSnapBuffer] = useState(saved.snapBuffer ?? 20);
  const [gridVisible, setGridVisible] = useState(saved.gridVisible !== false);
  const [axesVisible, setAxesVisible] = useState(saved.axesVisible !== false);
  const [gridSnap, setGridSnap] = useState(saved.gridSnap === true);
  const [gridStep, setGridStep] = useState(saved.gridStep ?? 10);
  const [iconSize, setIconSize] = useState(saved.iconSize ?? 17);
  const [textSize, setTextSize] = useState(saved.textSize ?? 12);
  const [spacing, setSpacing] = useState(saved.spacing ?? 0);
  const [stretch, setStretch] = useState(saved.stretch === true);

  // Apply vars and snap/grid config on mount, clear on unmount
  useEffect(() => {
    const s = loadSettings();
    applySketcherToolbarVars(s.iconSize ?? 17, s.textSize ?? 12, s.spacing ?? 0);
    applySketcherToolbarStretch(s.stretch === true);
    applySnapConfig(ctx, s.snapEnabled !== false, s.snapBuffer ?? 20);
    applyGridConfig(ctx, s.gridVisible !== false, s.gridSnap === true, s.gridStep ?? 10, s.axesVisible !== false);
    return () => {
      clearSketcherToolbarVars();
    };
  }, [ctx]);

  if (!anchor) return null;

  const left = Math.max(8, Math.min(window.innerWidth - PANEL_WIDTH - 8, basePos.x + dragOffset.x));
  const top = Math.max(8, basePos.y + dragOffset.y);

  function onDragStart(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const startOff = {...dragOffset};
    function onMove(ev) {
      setDragOffset({x: startOff.x + ev.clientX - startX, y: startOff.y + ev.clientY - startY});
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  function save(key, value) {
    const s = loadSettings();
    s[key] = value;
    saveSettings(s);
  }

  return (
    <div className={ls.panel} ref={panelRef} style={{top, left, minWidth: 200, zIndex: 1100, pointerEvents: 'auto'}}>
      <div className={ls.dragHandle} onMouseDown={onDragStart}>
        <div className={ls.dragDots}/>
        <span style={{flex: 1}}>Sketcher Settings</span>
        <span style={{cursor: 'pointer', padding: '0 4px', fontSize: 14, color: 'rgba(255,255,255,0.5)'}}
          onMouseDown={e => e.stopPropagation()}
          onClick={() => ctx.streams.ui.sketcherSettingsPanelOpen.next(null)}>×</span>
      </div>

      <Section title="Snap">
        <Toggle label="Snap enabled" value={snapEnabled} onChange={v => {
          setSnapEnabled(v); save('snapEnabled', v);
          applySnapConfig(ctx, v, snapBuffer);
        }} />
        <div className={ls.sliderLabel}>Sensitivity</div>
        <div className={ls.sliderRow}>
          <input type="range" min="5" max="60" step="1" value={snapBuffer} className={ls.slider}
            onChange={e => {
              const v = Number(e.target.value);
              setSnapBuffer(v); save('snapBuffer', v);
              applySnapConfig(ctx, snapEnabled, v);
            }}
          />
          <span className={ls.sliderVal}>{snapBuffer}px</span>
        </div>
      </Section>

      <Section title="Grid">
        <Toggle label="Show grid" value={gridVisible} onChange={v => {
          setGridVisible(v); save('gridVisible', v);
          applyGridConfig(ctx, v, gridSnap, gridStep, axesVisible);
        }} />
        <Toggle label="Show axes" value={axesVisible} onChange={v => {
          setAxesVisible(v); save('axesVisible', v);
          applyGridConfig(ctx, gridVisible, gridSnap, gridStep, v);
        }} />
        <Toggle label="Snap to grid" value={gridSnap} onChange={v => {
          setGridSnap(v); save('gridSnap', v);
          applyGridConfig(ctx, gridVisible, v, gridStep, axesVisible);
        }} />
        <div className={ls.sliderLabel}>Grid step</div>
        <div className={ls.sliderRow}>
          <input type="range" min="1" max="100" step="1" value={gridStep} className={ls.slider}
            onChange={e => {
              const v = Number(e.target.value);
              setGridStep(v); save('gridStep', v);
              applyGridConfig(ctx, gridVisible, gridSnap, v);
            }}
          />
          <span className={ls.sliderVal}>{gridStep}</span>
        </div>
      </Section>

      <Section title="Toolbar">
        <Toggle label="Stretch to fit" value={stretch} onChange={v => {
          setStretch(v); save('stretch', v);
          applySketcherToolbarStretch(v);
        }} />
        <div className={ls.sliderLabel}>Icon Size</div>
        <div className={ls.sliderRow}>
          <input type="range" min="10" max="36" step="1" value={iconSize} className={ls.slider}
            onChange={e => {
              const v = Number(e.target.value);
              setIconSize(v); save('iconSize', v);
              applySketcherToolbarVars(v, textSize, spacing);
            }}
          />
          <span className={ls.sliderVal}>{iconSize}px</span>
        </div>
        <div className={ls.sliderLabel}>Text Size</div>
        <div className={ls.sliderRow}>
          <input type="range" min="0" max="16" step="1" value={textSize} className={ls.slider}
            onChange={e => {
              const v = Number(e.target.value);
              setTextSize(v); save('textSize', v);
              applySketcherToolbarVars(iconSize, v, spacing);
            }}
          />
          <span className={ls.sliderVal}>{textSize === 0 ? 'off' : textSize + 'px'}</span>
        </div>
        <div className={ls.sliderLabel}>Spacing</div>
        <div className={ls.sliderRow}>
          <input type="range" min="0" max="16" step="1" value={spacing} className={ls.slider}
            onChange={e => {
              const v = Number(e.target.value);
              setSpacing(v); save('spacing', v);
              applySketcherToolbarVars(iconSize, textSize, v);
            }}
          />
          <span className={ls.sliderVal}>{spacing}px</span>
        </div>
      </Section>
    </div>
  );
}

function applySnapConfig(ctx, enabled, buffer) {
  try {
    const viewer = ctx?.services?.sketcher?.inPlaceEditor?.viewer;
    if (viewer?.snapConfig) {
      viewer.snapConfig.enabled = enabled;
      viewer.snapConfig.buffer = buffer;
    }
  } catch(e) {}
}

function applyGridConfig(ctx, visible, snapEnabled, step, axesVisible = true) {
  try {
    const viewer = ctx?.services?.sketcher?.inPlaceEditor?.viewer;
    if (viewer?.gridConfig) {
      viewer.gridConfig.visible = visible;
      viewer.gridConfig.snapEnabled = snapEnabled;
      viewer.gridConfig.step = step;
      viewer.gridConfig.axesVisible = axesVisible;
      viewer.refresh();
    }
  } catch(e) {}
}

function Section({title, children}) {
  return (
    <div className={ls.subMenu}>
      <div className={ls.subMenuHeader} style={{cursor: 'default'}}>
        {title}
      </div>
      <div className={ls.subMenuContent} style={{display: 'block'}}>
        {children}
      </div>
    </div>
  );
}

function Toggle({label, value, onChange}) {
  return (
    <div className={ls.toggleRow} onClick={() => onChange(!value)}>
      <span className={ls.toggleLabel}>{label}</span>
      <div className={cx(ls.toggle, value && ls.on)}>
        <div className={ls.toggleThumb}/>
      </div>
    </div>
  );
}
