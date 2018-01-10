import React from 'react';
import Abs from "./Abs";
import cx from 'classnames';

import ls from './AuxWidget.less';

export default function AuxWidget({flatTop, flatBottom, children, className, ...props}) {
  return <Abs className={cx(ls.root, flatTop && ls.flatTop, flatBottom && ls.flatBottom, className)} {...props }>
    {children}
  </Abs>
}