import React from 'react';

import cx from 'classnames';

export default function Button({type, onClick, className, ...props}) {

  return <button onClick={onClick} className={cx(type, className)} {...props} />

}

Button.defaultProps = {
  type: 'neutral',
};




