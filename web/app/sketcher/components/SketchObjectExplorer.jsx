import React, {useCallback, useContext, useEffect, useRef, useState} from 'react';
import cx from 'classnames';
import ls from './SketchObjectExplorer.less'
import {combine} from 'lstream';
import {useStream} from "ui/effects";
import {SketcherAppContext} from "./SketcherAppContext";


const ROW_HEIGHT = 30;
const OVERSCAN = 5;
let explorerSequence = 0;

export function SketchObjectExplorer() {

  const [modification, setModification] = useState(0);
  const objects = useStream(ctx => ctx.viewer.streams.objects);
  const selection = useStream(ctx => ctx.viewer.streams.selection);
  const ctx = useContext(SketcherAppContext);
  const list = useRef(null);
  const prefix = useRef(null);
  if (!prefix.current) prefix.current = `sketch-objects-${++explorerSequence}`;
  const [viewport, setViewport] = useState({top: 0, height: 400});
  const [activeId, setActiveId] = useState(null);
  const [rowHeight, setRowHeight] = useState(ROW_HEIGHT);
  const rowObserver = useRef(null);
  useEffect(() => () => rowObserver.current?.disconnect(), []);
  const measureRow = useCallback(element => {
    rowObserver.current?.disconnect();
    if (!element) return;
    const update = () => setRowHeight(Math.max(ROW_HEIGHT, Math.ceil(element.getBoundingClientRect().height) + 4));
    rowObserver.current = new ResizeObserver(update);
    rowObserver.current.observe(element);
    update();
  }, []);
  const [hasFocus, setHasFocus] = useState(false);
  const hasObjects = !!objects && !!selection;
  useEffect(() => {
    const element = list.current;
    if (!element) return;
    const update = () => setViewport({top: element.scrollTop, height: element.clientHeight || 400});
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasObjects]);

  if (!objects || !selection) {
    return null
  }

  const select = (obj, exclusive) => {
    const viewer = ctx.viewer;
    viewer.select([obj], exclusive);
    viewer.refresh();
  };
  const deselect = obj => {
    const viewer = ctx.viewer;
    viewer.deselect(obj);
    viewer.refresh();
  };
  const setRole = (obj, role) => {
    const viewer = ctx.viewer;
    if (obj.aux) {
      return;
    }
    obj.role = role;
    viewer.refresh();
  };

  const tweakSelection = (obj, shiftKey) => {
    if (obj.marked) {
      deselect(obj);
    } else {
      select(obj, !shiftKey);
    }
  };

  const tweakRole = (obj) => {
    if (obj.role === 'construction') {
      setRole(obj, null);
    } else if (obj.role === null) {
      setRole(obj, 'construction');
    }
    setModification(count => count + 1);
  };

  const getObjectRole = (o) => {
    if (o.aux) {
      return <span title="object is a readonly 3D feature/boundary" className={cx(ls.objectRole, ls.aux)}>B</span>
    } else if (o.role === 'construction') {
      return <span onClick={e => tweakRole(o)} title="construction object not used for 3D operations"
                   className={cx(ls.objectRole, ls.construction)}>C</span>
    } else {
      return <span onClick={e => tweakRole(o)} title="sketch object participates in 3D operations"
                   className={cx(ls.objectRole, ls.sketch)}>S</span>
    }
  };

  // Keep the keyboard-active item mounted even if the list is scrolled away.
  // Every object remains in the model; only off-screen DOM rows are omitted.
  // Track the object, not its row index, when objects are inserted or moved.
  const active = Math.max(0, objects.findIndex(object => object.id === activeId));
  const start = Math.max(0, Math.min(objects.length, Math.floor(viewport.top / rowHeight) - OVERSCAN));
  const end = Math.min(objects.length, Math.ceil((viewport.top + viewport.height) / rowHeight) + OVERSCAN);
  const indices = [];
  for (let i = start; i < end; i++) indices.push(i);
  if (hasFocus && objects.length && (active < start || active >= end)) indices.push(active);
  const onKeyDown = e => {
    if (!objects.length || e.ctrlKey || e.metaKey || e.altKey || e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229) return;
    let next = active;
    if (e.key === 'ArrowDown') next = Math.min(objects.length - 1, active + 1);
    else if (e.key === 'ArrowUp') next = Math.max(0, active - 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = objects.length - 1;
    else if (e.key.toLowerCase() === 'c') {
      e.preventDefault(); tweakRole(objects[active]); return;
    }
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault(); tweakSelection(objects[active], e.shiftKey); return;
    } else return;
    e.preventDefault();
    setActiveId(objects[next].id);
    const element = list.current, top = next * rowHeight;
    if (top < element.scrollTop) element.scrollTop = top;
    else if (top + rowHeight > element.scrollTop + element.clientHeight) element.scrollTop = top + rowHeight - element.clientHeight;
    setViewport({top: element.scrollTop, height: element.clientHeight || 400});
  };

  return <React.Fragment>
    <div className={ls.titleBar}>Objects</div>
    <span id={`${prefix.current}-help`} style={{position:'absolute', width:1, height:1, overflow:'hidden', clipPath:'inset(50%)'}}>
      Use arrow keys, Home or End to navigate, Enter or Space to select, and C to toggle construction.
    </span>
    <div className={ls.scrollableArea} ref={list} role="listbox" aria-label="Sketch objects"
         aria-multiselectable="true" aria-describedby={`${prefix.current}-help`} tabIndex={0} onKeyDown={onKeyDown}
         onFocus={() => setHasFocus(true)} onBlur={() => setHasFocus(false)}
         aria-activedescendant={objects.length && hasFocus ? `${prefix.current}-${active}` : undefined}
         onScroll={e => setViewport({top: e.currentTarget.scrollTop, height: e.currentTarget.clientHeight || 400})}>
      <div style={{height: objects.length * rowHeight, position: 'relative'}}>
        {indices.map(i => {const o = objects[i]; return <div key={o.id} id={`${prefix.current}-${i}`} role="option"
          aria-selected={selection.includes(o)} aria-posinset={i + 1} aria-setsize={objects.length}
          ref={i === start ? measureRow : undefined}
          aria-label={`${o.simpleClassName} ${o.id}, ${o.aux ? 'boundary, read only' : o.role === 'construction' ? 'construction' : 'sketch object'}`}
          style={{position:'absolute', top:i * rowHeight, left:0, right:0, minHeight:26, boxSizing:'border-box', outline:hasFocus && i===active ? '2px solid #ffcb4d' : undefined, outlineOffset:'-2px'}}
          className={cx(ls.objectItem, getClassName(o))} onClick={() => {setActiveId(o.id); list.current?.focus({preventScroll:true});}}>
          <span className={ls.objectIcon}><ObjectIcon object={o}/></span>
          {getObjectRole(o)}
          <span onClick={e => tweakSelection(o, e.shiftKey)} style={{overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis'}}
                className={cx(ls.objectTag, o.marked && ls.selected)}>{o.simpleClassName}&nbsp;<span>{o.id}</span> </span>
          <span className={ls.menuButton}>...</span>
        </div>})}
      </div>
    </div>
  </React.Fragment>;
}

function ObjectIcon({object}) {
  const Icon = object.icon;
  return <Icon />;
}

function getClassName() {
  return null;
}