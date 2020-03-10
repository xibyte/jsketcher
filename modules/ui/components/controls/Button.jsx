import React from 'react';

import cx from 'classnames';

export default function Button({type, onClick, className, children}) {

  return <button onClick={onClick} className={cx(type, className)}>{children}</button>

}

Button.defaultProps = {
  type: 'neutral',
};




