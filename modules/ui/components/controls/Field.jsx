import React from 'react';

import ls from './Field.less'
import cx from 'classnames';

export default function Field({active, ...props}) {
  return <div className={cx(ls.root, active&&ls.active)} {...props} />
}
