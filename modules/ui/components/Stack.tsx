import React from 'react';

import ls from './Stack.less'
import cx from "classnames";

type StackProps = React.HTMLAttributes<HTMLDivElement>;

export default function Stack({className, ...props}: StackProps) {
  return <div className={cx(ls.root, className)} {...props} />
}




