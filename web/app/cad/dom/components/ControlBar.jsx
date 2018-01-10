import React from 'react';

import ls from './ControlBar.less';
import cx from 'classnames';

export default function ControlBar({left, right}) {

  return <div className={ls.root}>
    <div className={ls.left}>
      {right}
    </div>
    <div className={ls.right}>
      {left}
    </div>
  </div>
}

export function ControlBarButton({onClick, onElement, disabled, children}) {
  return <span className={cx(ls.button, 'disable-selection', {disabled})} 
               onClick={disabled || onClick} ref={onElement}>
    {children}
  </span>
}