import React from 'react';
import cx from 'classnames';
import ls from './ConstraintExplorer.less';

import connect from 'ui/connect';
import mapContext from 'ui/mapContext';
import Fa from 'ui/components/Fa';

@connect(streams => streams.sketcherApp.constraintsUpdate)
@mapContext(ctx => ({
  remove: constr => {
    let viewer = ctx.services.sketcher.inPlaceEditor.viewer;
    viewer.parametricManager.remove(constr);
    viewer.refresh();
  },
  highlight: constr => {
    let viewer = ctx.services.sketcher.inPlaceEditor.viewer;
    viewer.select(constr.getObjects(), true);
    viewer.refresh();
  },
  withdraw: constr => {
    let viewer = ctx.services.sketcher.inPlaceEditor.viewer;
    viewer.deselectAll();
    viewer.refresh();
  },
  constraints: ctx.services.sketcher.inPlaceEditor.viewer.parametricManager.system.constraints
}))
export class ConstraintExplorer extends React.Component {

  render() {
    const {constraints} = this.props;
    return <React.Fragment>
      <div className={ls.titleBar}>Constraints</div>
      <div className={ls.scrollableArea}>
        {constraints.map((c, i) => <div key={c.id} className={ls.objectItem} 
                                        onMouseEnter={() => this.props.highlight(c)}
                                        onMouseLeave={() => this.props.withdraw(c)}>
          <span className={ls.objectIcon}><img width="15px" src='img/vec/pointOnArc.svg'/></span>
          <span className={ls.objectTag}>
            {i}. {c.UI_NAME}
          </span>
          <span className={ls.removeButton} onClick={() => this.props.remove(c)}><Fa icon='times'/></span>
          
        </div>)}
      </div>
    </React.Fragment>;
  }
}

