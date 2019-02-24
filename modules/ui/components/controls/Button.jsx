import React from 'react';

import ls from './Button.less'
import cx from 'classnames';

export default function Button({type, onClick, className, children}) {

  return <button onClick={onClick} className={cx(ls[type], ls.button, className)}>{children}</button>

}

Button.defaultProps = {
  type: 'neutral',
};




