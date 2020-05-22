import React from 'react';

import cx from 'classnames';

export default function Button({type, onClick, className, ...props}: {
  type?: string,
  onClick: () => void,
  className? : string,
  children?: any,
  } & JSX.IntrinsicAttributes) {

  type = type || 'neutral';

  return <button onClick={onClick} className={cx(type, className)} {...props} />

}





