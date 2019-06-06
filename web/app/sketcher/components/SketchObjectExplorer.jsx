import React from 'react';
import cx from 'classnames';
import ls from './SketchObjectExplorer.less'

import connect from 'ui/connect';

@connect(streams => streams.sketcherApp.objects.map(objects => ({objects})))
export class SketchObjectExplorer extends React.Component {

  render() {
    const {objects} = this.props;
    return <div>
      {objects.map(o => <div className={cx(ls.objectItem, getClassName(o))}>
        <span className={ls.objectIcon}><img width="15px" src='img/vec/pointOnArc.svg' /></span>
        {getObjectRole(o)}
        <span className={ls.objectTag}>{o.simpleClassName}</span>
        <span>{o.id}</span>
        <span className={ls.menuButton}></span>
      </div>)}
    </div>
  }
}

function getObjectRole(o) {
  if (o.aux) {
    return <span title="object is a readonly 3D feature/boundary" className={cx(ls.objectRole, ls.aux)}>B</span>
  } else if (o.role) {
    return <span title="object is a readonly 3D feature/boundary" className={cx(ls.objectRole, ls.aux)}>B</span>
  }
}

function ObjectIcon({object}) {
  
  return null;
}

function getClassName() {
  return null;
}