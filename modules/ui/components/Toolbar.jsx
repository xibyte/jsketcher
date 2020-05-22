import React from 'react';
import cx from 'classnames';

import ls from './Toolbar.less';

export default function Toolbar({children, className, size, medium, vertical, flat, ...props}) {
  return <div
    className={cx(`${ls.root} disable-selection condensed`, ls[size],
               vertical && ls.vertical, flat && ls.flat, className)} 
    {...props}>
    {children}
  </div>;
}

export function ToolbarButton({children, disabled, ...props}) {
  return <div className={cx(ls.button, disabled && ls.disabled)} {...props}>
    {children}
  </div>;
}

export function ToolbarSplitter() {
  return <div className={ls.splitter} />
}

export function ToolbarBraker() {
  return <div className={ls.braker} />
}

export function ToolbarGroup({children}) {
  return <div className={ls.group} >
    {children}
  </div>;
}