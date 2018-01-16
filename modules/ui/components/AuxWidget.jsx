import React from 'react';
import cx from 'classnames';

import ls from './AuxWidget.less';
import AdjustableAbs from "./AdjustableAbs";

export default function AuxWidget({flatTop, flatBottom, children, className, ...props}) {
  return <AdjustableAbs className={cx(ls.root, flatTop && ls.flatTop, flatBottom && ls.flatBottom, className)} {...props }>
    {children}
  </AdjustableAbs>
}