import React, {useContext, useEffect, useRef, useState} from 'react';
import cx from 'classnames';
import {ReactApplicationContext} from "cad/dom/ReactApplicationContext";
import {ViewMode, CAMERA_MODE} from "cad/scene/viewer";
import ls from './SettingsPanel.less';

const SETTINGS_KEY = 'ForgeCAD.settings';

const TESS_DEFLECTION = { low: 2, medium: 0.5, high: 0.1, ultra: 0.05 };

export function getTessellationDeflection() {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    return TESS_DEFLECTION[s.tessQuality] ?? 0.1;
  } catch(e) { return 0.1; }
}

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); }
  catch(e) { return {}; }
}

function saveSettings(s) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

const THEMES = {
  dark:   { bg0:'#12121a', bg1:'#16161b', bg2:'#1a1a21', bg3:'#1e1e25', bg4:'#26262f', border:'#2a2a36', textMain:'#e2e2ee', textMinor:'#7a7a96', textSupp:'#4a4a64', clearColor:0x12121a },
  medium: { bg0:'#2e2e38', bg1:'#333340', bg2:'#38383f', bg3:'#3e3e48', bg4:'#46464f', border:'#50505e', textMain:'#e2e2ee', textMinor:'#9a9ab0', textSupp:'#6a6a80', clearColor:0x2e2e38 },
  light:  { bg0:'#f2f2f6', bg1:'#eaeaf0', bg2:'#e2e2ea', bg3:'#dadae4', bg4:'#d0d0dc', border:'#c0c0cc', textMain:'#1a1a2e', textMinor:'#5a5a7a', textSupp:'#8a8aa0', clearColor:0xf2f2f6 },
};

const TOOLBAR_BG_COLORS = {
  dark:   '22,22,27',
  medium: '51,51,64',
  light:  '200,200,200',
};


function applyToolbarStretch(enabled) {
  let el = document.getElementById('forgecad-toolbar-stretch');
  if (!el) { el = document.createElement('style'); el.id = 'forgecad-toolbar-stretch'; document.head.appendChild(el); }
  el.textContent = enabled ? `
    #top-toolbar [class*="mainActions"] { justify-content: space-evenly !important; }
    #top-toolbar [class*="mainActions"] > * { flex: 1 !important; justify-content: center !important; }
    #top-toolbar [class*="splitter"] { flex: 0 0 3px !important; }
  ` : '';
}

function applyToolbarVars(iconSize, textSize, spacing) {
  const r = document.documentElement;
  r.style.setProperty('--toolbar-icon-size', `${iconSize}px`);
  r.style.setProperty('--toolbar-text-size', `${textSize}px`);
  r.style.setProperty('--toolbar-spacing', `${spacing}px`);
}

function applyGizmoSize(size) {
  const container = document.getElementById('gizmo-container');
  if (!container) return;
  const el = container.firstChild;
  if (!el) return;
  el.style.transform = `scale(${size / 100})`;
  el.style.transformOrigin = 'bottom right';
}

function applyNavCubeSize(size) {
  const el = document.getElementById('nav-cube-container');
  if (!el) return;
  el.style.transform = `scale(${size / 100})`;
  el.style.transformOrigin = 'top right';
}

function applyIconColorMode(v) {
  let el = document.getElementById('forgecad-icon-mode');
  if (!el) { el = document.createElement('style'); el.id = 'forgecad-icon-mode'; document.head.appendChild(el); }
  el.textContent = v
    ? `.icon-color-svg { display: inline-flex !important; align-items: center; } .icon-mono { display: none !important; }`
    : `.icon-color-svg { display: none !important; }`;
}

function applyToolbarBg(bgColor) {
  const rgb = TOOLBAR_BG_COLORS[bgColor] || TOOLBAR_BG_COLORS.dark;
  const el = document.getElementById('top-toolbar');
  if (!el) return;
  el.style.setProperty('background-color', `rgba(${rgb},0.92)`, 'important');
}

function applyTheme(name, ctx) {
  const t = THEMES[name];
  if (!t) return;
  const r = document.documentElement;
  r.style.setProperty('--bg-color-0', t.bg0);
  r.style.setProperty('--bg-color-1', t.bg1);
  r.style.setProperty('--bg-color-2', t.bg2);
  r.style.setProperty('--bg-color-3', t.bg3);
  r.style.setProperty('--bg-color-4', t.bg4);
  r.style.setProperty('--border-color', t.border);
  r.style.setProperty('--font-color-empph', t.textMain);
  r.style.setProperty('--font-color-minor', t.textMinor);
  r.style.setProperty('--font-color-suppressed', t.textSupp);
  document.body.style.backgroundColor = t.bg0;
  if (ctx?.viewer?.sceneSetup?.renderer) {
    ctx.viewer.sceneSetup.renderer.setClearColor(t.clearColor, 1);
    ctx.viewer.requestRender();
  }
}

export default function SettingsPanel() {
  const ctx = useContext(ReactApplicationContext);
  const panelRef = useRef(null);
  const saved = loadSettings();

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({x: 0, y: 52});
  const anchorRef = useRef({x: 0, y: 52});
  const [dragOffset, setDragOffset] = useState({x: 0, y: 0});
  const draggingRef = useRef(false);
  const [viewMode, setViewModeState] = useState(ViewMode.SHADED_WITH_EDGES);
  const [camera, setCameraState] = useState(CAMERA_MODE.PERSPECTIVE);
  const [gridVisible, setGridVisible] = useState(saved.grid !== false);
  const [axisX, setAxisX] = useState(saved.axisX === true);
  const [axisY, setAxisY] = useState(saved.axisY === true);
  const [axisZ, setAxisZ] = useState(saved.axisZ === true);
  const [navCubeVisible, setNavCubeVisible] = useState(saved.navCube !== false);
  const [navCubeSize, setNavCubeSizeState] = useState(saved.navCubeSize ?? 100);
  const [gizmoSize, setGizmoSizeState] = useState(saved.gizmoSize ?? 100);
  const [gizmoVisible, setGizmoVisible] = useState(saved.gizmo !== false);
  const [theme, setThemeState] = useState(saved.theme || 'medium');
  const [toolbarBgColor, setToolbarBgColorState] = useState(saved.toolbarBgColor || 'dark');
  const [toolbarIconSize, setToolbarIconSizeState] = useState(saved.toolbarIconSize ?? 25);
  const [toolbarTextSize, setToolbarTextSizeState] = useState(saved.toolbarTextSize ?? 12);
  const [toolbarSpacing, setToolbarSpacingState] = useState(saved.toolbarSpacing ?? 0);
  const [toolbarStretch, setToolbarStretchState] = useState(saved.toolbarStretch !== false);
  const [iconColorMode, setIconColorModeState] = useState(saved.iconColorMode !== false);
  const [antialias, setAntialiasState] = useState(saved.antialias !== false);
  const [tessQuality, setTessQualityState] = useState(saved.tessQuality || 'medium');
  const [gridSize, setGridSizeState] = useState(saved.gridSize || 10);
  const [gridTotal, setGridTotalState] = useState(saved.gridTotal || 500);
  const [gridOpacity, setGridOpacityState] = useState(saved.gridOpacity || 0.8);
  const [gridColor, setGridColorState] = useState(saved.gridColor || 80);

  useEffect(() => {
    if (!ctx?.streams?.ui?.settingsPanelOpen) return;
    const detach = ctx.streams.ui.settingsPanelOpen.attach(v => {
      if (v && typeof v === 'object') {
        const clampedX = Math.min(v.x, window.innerWidth - 250);
        anchorRef.current = {x: clampedX, y: v.y};
        setPos({x: clampedX, y: v.y});
        setDragOffset({x: 0, y: 0});
        setOpen(true);
      } else {
        setDragOffset({x: 0, y: 0});
        setOpen(false);
      }
    });
    return detach;
  }, [ctx]);

  useEffect(() => {
    if (!ctx?.viewer?.viewMode$) return;
    const detach = ctx.viewer.viewMode$.attach(m => setViewModeState(m));
    return detach;
  }, [ctx]);

  useEffect(() => {
    if (!ctx?.viewer?.cameraMode$) return;
    const detach = ctx.viewer.cameraMode$.attach(m => setCameraState(m));
    return detach;
  }, [ctx]);

  useEffect(() => {
    if (!ctx) return;
    applyTheme(saved.theme || 'medium', ctx);
    if (ctx.viewer?.sceneSetup) {
      ctx.viewer.sceneSetup.createGrid(saved.gridTotal || 500, saved.gridSize || 10, saved.gridOpacity || 0.8, saved.gridColor || 80);
      ctx.viewer.sceneSetup.grid.visible = saved.grid !== false;
      ctx.viewer.requestRender();
    }
    if (ctx.cadScene?.axesGroup) {
      const ch = ctx.cadScene.axesGroup.children;
      if (ch[0]) ch[0].visible = saved.axisX === true;
      if (ch[1]) ch[1].visible = saved.axisY === true;
      if (ch[2]) ch[2].visible = saved.axisZ === true;
    }
    applyToolbarVars(saved.toolbarIconSize ?? 25, saved.toolbarTextSize ?? 12, saved.toolbarSpacing ?? 0);
    applyToolbarStretch(saved.toolbarStretch !== false);
    applyIconColorMode(saved.iconColorMode !== false);
    if (ctx.cadScene?.hideGlobalCsys) {
      ctx.cadScene.hideGlobalCsys();
    }
    const nc = document.getElementById('nav-cube-container');
    if (nc) nc.style.display = (saved.navCube !== false) ? '' : 'none';
    applyNavCubeSize(saved.navCubeSize ?? 100);
    applyGizmoSize(saved.gizmoSize ?? 100);
    const gz = document.getElementById('gizmo-container');
    if (gz) gz.style.display = (saved.gizmo !== false) ? '' : 'none';
  }, [ctx]);

  useEffect(() => {
    applyToolbarBg(toolbarBgColor);
  }, [toolbarBgColor]);


  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        const isSettingsBtn = e.target.closest('[data-action-id="ToggleSettings"]');
        if (!isSettingsBtn) {
          ctx.streams.ui.settingsPanelOpen.next(false);
        }
      }
    }
    setTimeout(() => document.addEventListener('mousedown', handleClick), 0);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (!open) return null;
  const leftPos = Math.max(0, pos.x + dragOffset.x);
  const topPos = Math.max(0, pos.y + dragOffset.y);

  function onDragStart(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    draggingRef.current = true;
    const startX = e.clientX, startY = e.clientY;
    const startOff = {...dragOffset};
    function onMove(ev) {
      setDragOffset({x: startOff.x + ev.clientX - startX, y: startOff.y + ev.clientY - startY});
    }
    function onUp() {
      draggingRef.current = false;
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

  function setViewMode(mode) {
    ctx.viewer.viewMode$.next(mode);
    ctx.viewer.requestRender();
  }

  function setCamera(mode) {
    ctx.viewer.cameraMode$.next(mode);
    ctx.viewer.requestRender();
  }

  function toggleGrid(v) {
    setGridVisible(v); save('grid', v);
    if (ctx.viewer?.sceneSetup?.grid) { ctx.viewer.sceneSetup.grid.visible = v; ctx.viewer.requestRender(); }
  }

  function toggleAxis(index, v, setter, key) {
    setter(v); save(key, v);
    const ch = ctx.cadScene?.axesGroup?.children;
    if (ch && ch[index]) { ch[index].visible = v; ctx.viewer.requestRender(); }
  }

  function toggleNavCube(v) {
    setNavCubeVisible(v); save('navCube', v);
    const el = document.getElementById('nav-cube-container');
    if (el) el.style.display = v ? '' : 'none';
  }

  function toggleGizmo(v) {
    setGizmoVisible(v); save('gizmo', v);
    const el = document.getElementById('gizmo-container');
    if (el) el.style.display = v ? '' : 'none';
  }

  const THEME_GRID_PRESETS = {
    dark:   {color: 128, opacity: 0.7},
    medium: {color: 0,   opacity: 0.7},
    light:  {color: 0,   opacity: 0.7},
  };

  function changeTheme(t) {
    setThemeState(t); save('theme', t); applyTheme(t, ctx);
    const preset = THEME_GRID_PRESETS[t];
    if (preset && ctx?.viewer?.sceneSetup) {
      setGridColorState(preset.color);
      setGridOpacityState(preset.opacity);
      save('gridColor', preset.color);
      save('gridOpacity', preset.opacity);
      ctx.viewer.sceneSetup.createGrid(gridTotal, gridSize, preset.opacity, preset.color);
      ctx.viewer.requestRender();
    }
  }

    return (
    <div className={ls.panel} ref={panelRef} style={{top: topPos, left: leftPos}}>
      <div className={ls.dragHandle} onMouseDown={onDragStart}>
        <div className={ls.dragDots}/>
        <span>Settings</span>
      </div>
      <SubMenu title="Look">
        <Section title="Theme">
          <RadioGroup
            options={[
              {label: 'Dark', value: 'dark'},
              {label: 'Medium', value: 'medium'},
              {label: 'Light', value: 'light'},
            ]}
            value={theme}
            onChange={changeTheme}
          />
        </Section>
        <Section title="Toolbar">
          <RadioGroup
            options={[
              {label: 'Dark', value: 'dark'},
              {label: 'Medium', value: 'medium'},
              {label: 'Light', value: 'light'},
            ]}
            value={toolbarBgColor}
            onChange={v => { setToolbarBgColorState(v); save('toolbarBgColor', v); }}
          />
          <div className={ls.sliderLabel}>Icon Size</div>
          <div className={ls.sliderRow}>
            <input type="range" min="10" max="30" step="1" value={toolbarIconSize} className={ls.slider}
              onChange={e => {
                const v = Number(e.target.value);
                setToolbarIconSizeState(v); save('toolbarIconSize', v);
                applyToolbarVars(v, toolbarTextSize, toolbarSpacing);
              }}
            />
            <span className={ls.sliderVal}>{toolbarIconSize}px</span>
          </div>
          <div className={ls.sliderLabel}>Text Size</div>
          <div className={ls.sliderRow}>
            <input type="range" min="0" max="15" step="1" value={toolbarTextSize} className={ls.slider}
              onChange={e => {
                const v = Number(e.target.value);
                setToolbarTextSizeState(v); save('toolbarTextSize', v);
                applyToolbarVars(toolbarIconSize, v, toolbarSpacing);
              }}
            />
            <span className={ls.sliderVal}>{toolbarTextSize === 0 ? 'off' : toolbarTextSize + 'px'}</span>
          </div>
          <div className={ls.sliderLabel}>Spacing</div>
          <div className={ls.sliderRow}>
            <input type="range" min="0" max="20" step="1" value={toolbarSpacing} className={ls.slider}
              onChange={e => {
                const v = Number(e.target.value);
                setToolbarSpacingState(v); save('toolbarSpacing', v);
                applyToolbarVars(toolbarIconSize, toolbarTextSize, v);
              }}
            />
            <span className={ls.sliderVal}>{toolbarSpacing}px</span>
          </div>
          <div className={ls.toggleRow} onClick={() => {
            const v = !toolbarStretch;
            setToolbarStretchState(v); save('toolbarStretch', v);
            applyToolbarStretch(v);
          }}>
            <span className={ls.toggleLabel}>Stretch to fill</span>
            <div className={cx(ls.toggle, toolbarStretch && ls.on)}>
              <div className={ls.toggleThumb}/>
            </div>
          </div>
          <div className={ls.toggleRow} onClick={() => {
            const v = !iconColorMode;
            setIconColorModeState(v); save('iconColorMode', v);
            applyIconColorMode(v);
          }}>
            <span className={ls.toggleLabel}>Colored icons</span>
            <div className={cx(ls.toggle, iconColorMode && ls.on)}>
              <div className={ls.toggleThumb}/>
            </div>
          </div>
        </Section>
      </SubMenu>
      <SubMenu title="Views">
        <Section title="Camera">
          <RadioGroup
            options={[
              {label: 'Perspective', value: CAMERA_MODE.PERSPECTIVE},
              {label: 'Orthographic', value: CAMERA_MODE.ORTHOGRAPHIC},
            ]}
            value={camera}
            onChange={setCamera}
          />
        </Section>
        <Section title="View Mode">
          <RadioGroup
            options={[
              {label: 'Wireframe', value: ViewMode.WIREFRAME},
              {label: 'Shaded', value: ViewMode.SHADED},
              {label: 'Shaded + Edges', value: ViewMode.SHADED_WITH_EDGES},
            ]}
            value={viewMode}
            onChange={setViewMode}
          />
        </Section>
        <Section title="Viewport">
          <div className={ls.axisRow}>
            <span className={ls.axisLabel}>Axes</span>
            <button className={cx(ls.axisBtn, ls.axisX, axisX && ls.axisBtnOn)} onClick={() => toggleAxis(0, !axisX, setAxisX, 'axisX')}>X</button>
            <button className={cx(ls.axisBtn, ls.axisY, axisY && ls.axisBtnOn)} onClick={() => toggleAxis(1, !axisY, setAxisY, 'axisY')}>Y</button>
            <button className={cx(ls.axisBtn, ls.axisZ, axisZ && ls.axisBtnOn)} onClick={() => toggleAxis(2, !axisZ, setAxisZ, 'axisZ')}>Z</button>
          </div>
          <Toggle label="Gizmo" value={gizmoVisible} onChange={toggleGizmo} />
          <div className={ls.sliderLabel}>Gizmo Size</div>
          <div className={ls.sliderRow}>
            <input type="range" min="40" max="200" step="5" value={gizmoSize} className={ls.slider}
              onChange={e => {
                const v = Number(e.target.value);
                setGizmoSizeState(v); save('gizmoSize', v);
                applyGizmoSize(v);
              }}
            />
            <span className={ls.sliderVal}>{gizmoSize}%</span>
          </div>
          <Toggle label="Nav Cube" value={navCubeVisible} onChange={toggleNavCube} />
          <div className={ls.sliderLabel}>Nav Cube Size</div>
          <div className={ls.sliderRow}>
            <input type="range" min="40" max="200" step="5" value={navCubeSize} className={ls.slider}
              onChange={e => {
                const v = Number(e.target.value);
                setNavCubeSizeState(v); save('navCubeSize', v);
                applyNavCubeSize(v);
              }}
            />
            <span className={ls.sliderVal}>{navCubeSize}%</span>
          </div>
        </Section>
      </SubMenu>
      <SubMenu title="Render">
        <Section title="">
          <Toggle label="Antialiasing (restart required)" value={antialias} onChange={v => {
            setAntialiasState(v);
            save('antialias', v);
          }} />
        </Section>
        <Section title="Tessellation Quality">
          <RadioGroup
            options={[
              {label: 'Low',    value: 'low'},
              {label: 'Medium', value: 'medium'},
              {label: 'High',   value: 'high'},
              {label: 'Ultra',  value: 'ultra'},
            ]}
            value={tessQuality}
            onChange={v => { setTessQualityState(v); save('tessQuality', v); }}
          />
        </Section>
      </SubMenu>
      <SubMenu title="Grid">
        <Section title="">
          <Toggle label="Show Grid" value={gridVisible} onChange={toggleGrid} />
          <div className={ls.sliderLabel}>Cell Size</div>
          <div className={ls.sliderRow}>
            <input type="range" min="1" max="50" step="1"
              value={gridSize}
              className={ls.slider}
              onChange={e => {
                const v = Number(e.target.value);
                setGridSizeState(v);
                save('gridSize', v);
                if (ctx?.viewer?.sceneSetup) {
                  ctx.viewer.sceneSetup.createGrid(gridTotal, v);
                  ctx.viewer.sceneSetup.grid.material.opacity = gridOpacity;
                  const c = gridColor;
                  ctx.viewer.sceneSetup.grid.material.color.setHex((c << 16) | (c << 8) | c);
                  ctx.viewer.requestRender();
                }
              }}
            />
            <span className={ls.sliderVal}>{gridSize}</span>
          </div>
          <div className={ls.sliderLabel}>Total Size</div>
          <div className={ls.sliderRow}>
            <input type="range" min="100" max="2000" step="100"
              value={gridTotal}
              className={ls.slider}
              onChange={e => {
                const v = Number(e.target.value);
                setGridTotalState(v);
                save('gridTotal', v);
                if (ctx?.viewer?.sceneSetup) {
                  ctx.viewer.sceneSetup.createGrid(v, gridSize);
                  ctx.viewer.sceneSetup.grid.material.opacity = gridOpacity;
                  const c = gridColor;
                  ctx.viewer.sceneSetup.grid.material.color.setHex((c << 16) | (c << 8) | c);
                  ctx.viewer.requestRender();
                }
              }}
            />
            <span className={ls.sliderVal}>{gridTotal}</span>
          </div>
          <div className={ls.sliderLabel}>Opacity</div>
          <div className={ls.sliderRow}>
            <input type="range" min="0.1" max="1" step="0.05"
              value={gridOpacity}
              className={ls.slider}
              onChange={e => {
                const v = Number(e.target.value);
                setGridOpacityState(v);
                save('gridOpacity', v);
                if (ctx?.viewer?.sceneSetup?.grid) {
                  ctx.viewer.sceneSetup.grid.material.opacity = v;
                  ctx.viewer.requestRender();
                }
              }}
            />
            <span className={ls.sliderVal}>{Math.round(gridOpacity * 100)}%</span>
          </div>
          <div className={ls.sliderLabel}>Color</div>
          <div className={ls.sliderRow}>
            <input type="range" min="0" max="255" step="1"
              value={gridColor}
              className={ls.slider}
              onChange={e => {
                const v = Number(e.target.value);
                setGridColorState(v);
                save('gridColor', v);
                if (ctx?.viewer?.sceneSetup) {
                  ctx.viewer.sceneSetup.createGrid(gridTotal, gridSize, gridOpacity, v);
                  ctx.viewer.requestRender();
                }
              }}
            />
            <span className={ls.sliderVal} style={{color: `rgb(${gridColor},${gridColor},${gridColor})`}}>■</span>
          </div>
        </Section>
      </SubMenu>
    </div>
  );
}
function SubMenu({title, children}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={ls.subMenu}>
      <div className={ls.subMenuHeader} onClick={() => setOpen(v => !v)}>
        <span className={ls.subMenuCaret}>{open ? '▾' : '▸'}</span>
        {title}
      </div>
      {open && <div className={ls.subMenuContent}>{children}</div>}
    </div>
  );
}

function Section({title, children}) {
  return (
    <div className={ls.section}>
      {title && <div className={ls.sectionTitle}>{title}</div>}
      {children}
    </div>
  );
}

function RadioGroup({options, value, onChange}) {
  return (
    <div className={ls.radioGroup}>
      {options.map(opt => (
        <button
          key={opt.value}
          className={ls.radioBtn + (value === opt.value ? ' ' + ls.active : '')}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({label, value, onChange}) {
  return (
    <div className={ls.toggleRow} onClick={() => onChange(!value)}>
      <span className={ls.toggleLabel}>{label}</span>
      <div className={ls.toggle + (value ? ' ' + ls.on : '')}>
        <div className={ls.toggleThumb} />
      </div>
    </div>
  );
}