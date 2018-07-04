import React from 'react';
import cx from 'classnames';

import ls from './Toolbar.less';

export default function Toolbar({children, className, small, vertical, ...props}) {
  return <div
    className={cx(`${ls.root} disable-selection compact-font`, small && ls.small, vertical && ls.vertical, className)} 
    {...props}>
    {children}
  </div>;
}

export function ToolbarButton({children, disabled, ...props}) {
  return <div className={cx(ls.button, disabled && ls.disabled)} {...props}>
    {children}
  </div>;
}
