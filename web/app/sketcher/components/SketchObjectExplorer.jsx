import React, {useContext, useState} from 'react';
import cx from 'classnames';
import ls from './SketchObjectExplorer.less'
import {combine} from 'lstream';
import {useStream} from "ui/effects";
import {SketcherAppContext} from "./SketcherAppContext";


export function SketchObjectExplorer() {

  const [modification, setModification] = useState(0);
  const objects = useStream(ctx => ctx.viewer.streams.objects);
  const selection = useStream(ctx => ctx.viewer.streams.selection);
  const ctx = useContext(SketcherAppContext);

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

  return <React.Fragment>
    <div className={ls.titleBar}>Objects</div>
    <div className={ls.scrollableArea}>
      {objects.map(o => <div key={o.id} className={cx(ls.objectItem, getClassName(o))}>
        <span className={ls.objectIcon}><ObjectIcon object={o}/></span>
        {getObjectRole(o)}
        <span onClick={e => tweakSelection(o, e.shiftKey)}
              className={cx(ls.objectTag, o.marked && ls.selected)}>{o.simpleClassName}&nbsp;<span>{o.id}</span> </span>
        <span className={ls.menuButton}>...</span>
      </div>)}
    </div>
  </React.Fragment>
}

function ObjectIcon({object}) {
  const Icon = object.icon;
  return <Icon />;
}

function getClassName() {
  return null;
}