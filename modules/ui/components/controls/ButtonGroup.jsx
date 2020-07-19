import React from 'react';

import ls from './ButtonGroup.less'
import cx from 'classnames';

export default function ButtonGroup({className, ...props}) {

  return <div className={cx(ls.root, className)} {...props}/>;

}
