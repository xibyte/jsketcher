import React from 'react';

import ls from './Button.less'

export default function Button({text, type, onClick}) {

  return <button onClick={onClick} className={ls[type]}>{text}</button>

}

Button.defaultProps = {
  type: 'neutral',
};




