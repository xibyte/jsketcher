import React from 'react';

import ls from './Field.less'
import cx from 'classnames';

export default function Field({active, name, ...props}) {
  return <div className={cx(ls.root, active&&ls.active)} data-field-name={name} {...props} />
}
