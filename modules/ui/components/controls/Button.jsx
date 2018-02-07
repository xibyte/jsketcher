import React from 'react';

import ls from './Button.less'

export default function Button({type, onClick, children}) {

  return <button onClick={onClick} className={ls[type]}>{children}</button>

}

Button.defaultProps = {
  type: 'neutral',
};




