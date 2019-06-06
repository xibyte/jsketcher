import React from 'react';
import cx from 'classnames';
import ls from './SketchObjectExplorer.less'

import connect from 'ui/connect';
import {combine} from 'lstream';
import mapContext from '../../../../modules/ui/mapContext';

@connect(streams => combine(streams.sketcherApp.objects, streams.sketcherApp.selection)
  .map(([objects, selection]) => ({
    objects,
    selection
  })))
@mapContext(ctx => ({
  select:  (obj, exclusive) => {
    let viewer = ctx.services.sketcher.inPlaceEditor.viewer;
    viewer.select([obj], exclusive);
    viewer.refresh();
  },
  deselect:  obj =>  {
    let viewer = ctx.services.sketcher.inPlaceEditor.viewer;
    viewer.deselect(obj);
    viewer.refresh();
  },
  setRole: (obj, role) => {
    let viewer = ctx.services.sketcher.inPlaceEditor.viewer;
    if (obj.aux) {
      return;
    }
    obj.role = role;
    viewer.refresh();
  }
}))
export class SketchObjectExplorer extends React.Component {

  render() {
    const {objects} = this.props;
    return <div>
      {objects.map(o => <div key={o.id} className={cx(ls.objectItem, getClassName(o))}>
        <span className={ls.objectIcon}><img width="15px" src='img/vec/pointOnArc.svg' /></span>
        {this.getObjectRole(o)}
        <span onClick={e => this.tweakSelection(o, e.shiftKey)} className={cx(ls.objectTag, o.marked&&ls.selected)}>{o.simpleClassName} <span>{o.id}</span> </span>
        <span className={ls.menuButton}>...</span>
      </div>)}
    </div>
  }

  tweakSelection(obj, shiftKey) {
    if (obj.marked) {
      this.props.deselect(obj);
    } else {
      this.props.select(obj, !shiftKey);
    }
  }
  
  tweakRole(obj) {
    if (obj.role === 'construction') {
      this.props.setRole(obj, null);
    } else if (obj.role === null) {
      this.props.setRole(obj, 'construction');
    }
    this.forceUpdate();
  }

  getObjectRole(o) {
    if (o.aux) {
      return <span title="object is a readonly 3D feature/boundary" className={cx(ls.objectRole, ls.aux)}>B</span>
    } else if (o.role === 'construction') {
      return <span onClick={e => this.tweakRole(o)} title="construction object not used for 3D operations" className={cx(ls.objectRole, ls.construction)}>C</span>
    } else {
      return <span onClick={e => this.tweakRole(o)} title="sketch object participates in 3D operations" className={cx(ls.objectRole, ls.sketch)}>S</span>
    }
  }

}

function ObjectIcon({object}) {
  
  return null;
}

function getClassName() {
  return null;
}