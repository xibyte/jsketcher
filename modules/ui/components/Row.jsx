import React from 'react';
import ls from './Row.less';
import cx from 'classnames';

export default function Row({className, props, children}) {
  return <div className={cx(ls.root, className)} {...props} >{children}</div>;
}