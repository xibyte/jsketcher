import React, {useContext, useEffect, useRef, useState} from 'react';
import {ReactApplicationContext} from 'cad/dom/ReactApplicationContext';
import {useStream, useStreamWithPatcher} from 'ui/effects';
import {MShell, MBrepShell} from 'cad/model/mshell';
import {MOpenFaceShell} from 'cad/model/mopenFace';
import ls from './ScenePanel.less';
import {TbEye, TbEyeOff} from 'react-icons/tb';
import cx from 'classnames';

const SETTINGS_KEY = 'ForgeCAD.settings';

function loadSetting(key, fallback) {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    return s[key] ?? fallback;
  } catch(e) { return fallback; }
}

function saveSetting(key, value) {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    s[key] = value;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch(e) {}
}

function applyFaceSketchVisibility(face, hidden) {
  if (face.ext && face.ext.view) face.ext.view.sketchGroup.visible = !hidden;
}

export function ScenePanel() {
  const ctx = useContext(ReactApplicationContext);
  const models = useStream(c => c.craftService.models$);
  const [hiddenSketches, setHiddenSketches] = useState(() => new Set(loadSetting('hiddenSketches', [])));
  const [bodyLabels, setBodyLabels] = useState(() => loadSetting('bodyLabels', {}));
  const [sketchLabels, setSketchLabels] = useState(() => loadSetting('sketchLabels', {}));
  useEffect(() => {
    if (!models) return;
    models.forEach(m => {
      if (m instanceof MShell) {
        m.faces.forEach(f => {
          if (f.sketchObjects.length > 0) applyFaceSketchVisibility(f, hiddenSketches.has(f.id));
        });
      }
    });
    ctx.viewer.requestRender();
  }, [models]);

  const toggleSketch = (faceId, face) => {
    const next = new Set(hiddenSketches);
    const hidden = next.has(faceId);
    hidden ? next.delete(faceId) : next.add(faceId);
    if (face) applyFaceSketchVisibility(face, !hidden);
    setHiddenSketches(next);
    saveSetting('hiddenSketches', Array.from(next));
    ctx.viewer.requestRender();
  };

  const toggleAllSketches = (shell, hide) => {
    const next = new Set(hiddenSketches);
    shell.faces.forEach(f => {
      if (f.sketchObjects.length > 0) {
        hide ? next.add(f.id) : next.delete(f.id);
        applyFaceSketchVisibility(f, hide);
      }
    });
    setHiddenSketches(next);
    saveSetting('hiddenSketches', Array.from(next));
    ctx.viewer.requestRender();
  };

  const renameBody = (shellId, currentLabel) => {
    const name = window.prompt('Rename body:', currentLabel);
    if (name === null) return;
    const next = {...bodyLabels, [shellId]: name.trim() || currentLabel};
    setBodyLabels(next);
    saveSetting('bodyLabels', next);
  };

  const deleteSketch = (face) => {
    if (!window.confirm('Delete sketch?')) return;
    const key = ctx.projectService.sketchStorageKey(face.defaultSketchId);
    ctx.services.storage.remove(key);
    const next = new Set(hiddenSketches);
    next.delete(face.id);
    setHiddenSketches(next);
    saveSetting('hiddenSketches', Array.from(next));
  };

  const renameSketch = (faceId, currentLabel) => {
    const name = window.prompt('Rename sketch:', currentLabel);
    if (name === null) return;
    const next = {...sketchLabels, [faceId]: name.trim() || currentLabel};
    setSketchLabels(next);
    saveSetting('sketchLabels', next);
  };

  const deleteBody = (shell) => {
    ctx.craftService.modify({type: 'DELETE_BODY', params: {tools: [shell.id]}}, () => {}, () => {});
  };

  const shells = models ? models.filter(m => m instanceof MBrepShell) : [];
  const openFaces = models ? models.filter(m => m instanceof MOpenFaceShell) : [];
  let planeCount = 0;

  return (
    <div className={ls.root}>
      <div className={ls.section}>
          {shells.length === 0 && openFaces.length === 0 && <div className={ls.empty}>No bodies</div>}
          {shells.map((shell, i) => (
            <div key={shell.id}>
              <BodyGroup
                shell={shell}
                label={bodyLabels[shell.id] || `Body ${i + 1}`}
                hiddenSketches={hiddenSketches}
                sketchLabels={sketchLabels}
                toggleSketch={toggleSketch}
                toggleAllSketches={toggleAllSketches}
                onDelete={() => deleteBody(shell)}
                onRename={() => renameBody(shell.id, bodyLabels[shell.id] || `Body ${i + 1}`)}
                onRenameSketch={renameSketch}
                onDeleteSketch={deleteSketch}
              />
              {(i < shells.length - 1 || openFaces.length > 0) && <div className={ls.groupSeparator} />}
            </div>
          ))}
          {openFaces.map((m, i) => {
            planeCount++;
            const planeLabel = bodyLabels[m.id] || `Plane ${planeCount}`;
            return (
              <div key={m.id}>
                {i > 0 && <div className={ls.groupSeparator} />}
                <BodyGroup
                  shell={m}
                  label={planeLabel}
                  hiddenSketches={hiddenSketches}
                  sketchLabels={sketchLabels}
                  toggleSketch={toggleSketch}
                  toggleAllSketches={toggleAllSketches}
                  onDelete={() => deleteBody(m)}
                  onRename={() => renameBody(m.id, planeLabel)}
                  onRenameSketch={renameSketch}
                  onDeleteSketch={deleteSketch}
                />
              </div>
            );
          })}
      </div>
    </div>
  );
}

function BodyGroup({shell, label, hiddenSketches, sketchLabels, toggleSketch, toggleAllSketches, onDelete, onRename, onRenameSketch, onDeleteSketch}) {
  const ctx = useContext(ReactApplicationContext);
  const [bodyExpanded, setBodyExpanded] = useState(false);
  const [facesExpanded, setFacesExpanded] = useState(false);
  const [edgesExpanded, setEdgesExpanded] = useState(false);
  const [sketchesExpanded, setSketchesExpanded] = useState(false);
  const [menu, setMenu] = useState(null);
  const [sketchMenu, setSketchMenu] = useState(null);
  const sketchFaces = shell.faces.filter(f => f.sketchObjects.length > 0);
  const allHidden = sketchFaces.length > 0 && sketchFaces.every(f => hiddenSketches.has(f.id));

  const handleContextMenu = (e) => { e.preventDefault(); setMenu({x: e.clientX, y: e.clientY}); };
  const handleSketchContextMenu = (e, face) => { e.preventDefault(); setSketchMenu({x: e.clientX, y: e.clientY, face}); };

  return (
    <div className={ls.bodyGroup}>
      <div
        className={ls.bodyRow}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => ctx.highlightService.highlight(shell.id)}
        onMouseLeave={() => ctx.highlightService.unHighlight(shell.id)}
      >
        <span className={ls.expandBtn} onClick={() => setBodyExpanded(v => !v)}>
          {bodyExpanded ? '▾' : '▸'}
        </span>
        <span className={ls.bodyLabel} onClick={() => ctx.services.pickControl.pick(shell)}>{label}</span>
        <VisibleSwitch modelId={shell.id} />
      </div>

      {bodyExpanded && (
        <div className={ls.bodyChildren}>
          <div className={ls.subHeader} onClick={() => setFacesExpanded(v => !v)} style={{cursor:'pointer'}}>
            <span className={ls.expandBtn}>{facesExpanded ? '▾' : '▸'}</span> Faces
          </div>
          {facesExpanded && <div className={ls.modelList}>
            {shell.faces.map(f => <SimpleModelRow key={f.id} model={f} />)}
          </div>}
          <div className={ls.subHeader} onClick={() => setEdgesExpanded(v => !v)} style={{cursor:'pointer'}}>
            <span className={ls.expandBtn}>{edgesExpanded ? '▾' : '▸'}</span> Edges
          </div>
          {edgesExpanded && <div className={ls.modelList}>
            {shell.edges.map(e => <SimpleModelRow key={e.id} model={e} />)}
          </div>}
        </div>
      )}

      {sketchFaces.length > 0 && (
        <div className={ls.sketchesBlock}>
          <div className={ls.sketchesHeader} onClick={() => setSketchesExpanded(v => !v)}>
            <span className={ls.expandBtn}>{sketchesExpanded ? '▾' : '▸'}</span>
            <span className={ls.sketchesTitle}>Sketches</span>
            <button
              className={ls.eyeBtn}
              onClick={e => { e.stopPropagation(); toggleAllSketches(shell, !allHidden); }}
              title={allHidden ? 'Show all' : 'Hide all'}
            >
              {allHidden ? <TbEyeOff /> : <TbEye />}
            </button>
          </div>
          {sketchesExpanded && (
            <div className={ls.sketchesList}>
              {sketchFaces.map((f, si) => {
                const hidden = hiddenSketches.has(f.id);
                const label = sketchLabels[f.id] || `Sketch ${si + 1}`;
                return (
                  <div key={f.id} className={ls.sketchRow} onContextMenu={e => handleSketchContextMenu(e, f)}>
                    <span className={ls.sketchLabel}>{label}</span>
                    <button className={ls.eyeBtn} onClick={() => toggleSketch(f.id, f)} title={hidden ? 'Show' : 'Hide'}>
                      {hidden ? <TbEyeOff /> : <TbEye />}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {menu && (
        <ContextMenu x={menu.x} y={menu.y} onClose={() => setMenu(null)} items={[
          {label: 'Rename', action: () => { onRename(); setMenu(null); }},
          {label: 'Delete Body', danger: true, action: () => { onDelete(); setMenu(null); }},
        ]} />
      )}
      {sketchMenu && (
        <ContextMenu x={sketchMenu.x} y={sketchMenu.y} onClose={() => setSketchMenu(null)} items={[
          {label: 'Rename', action: () => { onRenameSketch(sketchMenu.face.id, sketchLabels[sketchMenu.face.id] || sketchMenu.face.id); setSketchMenu(null); }},
          {label: 'Delete Sketch', danger: true, action: () => { onDeleteSketch(sketchMenu.face); setSketchMenu(null); }},
        ]} />
      )}
    </div>
  );
}

function ContextMenu({x, y, onClose, items}) {
  const ref = useRef();
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return (
    <div ref={ref} className={ls.contextMenu} style={{left: x, top: y}}>
      {items.map(item => (
        <div
          key={item.label}
          className={cx(ls.contextMenuItem, item.danger && ls.danger, item.disabled && ls.disabled)}
          title={item.title || ''}
          onClick={item.disabled ? undefined : item.action}
        >
          {item.label}
        </div>
      ))}
    </div>
  );
}

function SimpleModelRow({model}) {
  const ctx = useContext(ReactApplicationContext);
  const highlights = useStream(c => c.highlightService.highlighted$);
  const selection = useStream(c => c.streams.selection.all);
  const highlighted = highlights && highlights.has(model.id);
  const selected = selection && selection.indexOf(model.id) !== -1;
  return (
    <div
      className={cx(ls.simpleRow, highlighted && ls.simpleRowHighlighted, selected && ls.simpleRowSelected)}
      onClick={() => ctx.services.pickControl.pick(model)}
      onMouseEnter={() => ctx.highlightService.highlight(model.id)}
      onMouseLeave={() => ctx.highlightService.unHighlight(model.id)}
    >
      {model.id}
    </div>
  );
}

function VisibleSwitch({modelId}) {
  const [attrs, patch] = useStreamWithPatcher(ctx => ctx.attributesService.streams.get(modelId));
  return (
    <button
      className={ls.eyeBtn}
      title={attrs.hidden ? 'Show' : 'Hide'}
      onClick={e => { e.stopPropagation(); patch(a => { a.hidden = !a.hidden; }); }}
    >
      {attrs.hidden ? <TbEyeOff /> : <TbEye />}
    </button>
  );
}

function SectionHeader({label, open, onToggle}) {
  return (
    <div className={ls.sectionHeader} onClick={onToggle}>
      <span className={ls.sectionCaret}>{open ? '▾' : '▸'}</span>
      <span>{label}</span>
    </div>
  );
}
