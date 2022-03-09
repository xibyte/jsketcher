import React from 'react';

import ls from './Stack.less'
import cx from "classnames";

export default function Stack({className, ...props}) {
  return <div className={cx(ls.root, className)} {...props} />
}




