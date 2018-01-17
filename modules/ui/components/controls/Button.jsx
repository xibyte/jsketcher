import React from 'react';

import ls from './Button.less'

export default function Button({text, type}) {

  return <button className={ls[type]}>{text}</button>

}

Button.defaultProps = {
  type: 'neutral',
};




