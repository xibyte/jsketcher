import React from 'react';

import ls from './Button.less'
import cx from 'classnames';

export default function Button({type, onClick, children}) {

  return <button onClick={onClick} className={cx(ls[type], ls.button)}>{children}</button>

}

Button.defaultProps = {
  type: 'neutral',
};




