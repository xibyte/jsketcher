import React from 'react';
import ls from './SketcherToolbar.less';
import cx from 'classnames';
import {SketcherActionButton} from "./SketcherActionButton";

export function SketcherToolbar({actions, horizontal=false, compact}) {

  return <div className={cx(ls[horizontal?'horizontal':'vertical'], ls.root, compact && ls.compact)}>
    {actions.map((action, index) => {
      if (action === '-') {
        return <div key={index} className={ls.separator} />
      }
      return <SketcherActionButton key={action} actionId={action}/>
    })}
  </div>;
}
