import React from 'react';
import cx from 'classnames';

import ls from './Toolbar.less';

export default function Toolbar({children, className, ...props}) {
  return <div className={cx(`${ls.root} disable-selection compact-font`, className)} {...props}>
    {children}
  </div>; 
}

export function ToolbarButton({children, disabled}) {
  return <div className={cx(ls.button, {disabled})}>
    {children}
  </div>;
}
