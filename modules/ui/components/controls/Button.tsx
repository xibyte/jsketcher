import React from 'react';

import cx from 'classnames';

export default function Button({type, onClick, className, compact, ...props}: {
  type?: string,
  onClick: () => void,
  className? : string,
  children?: any,
  compact?: boolean
  } & JSX.IntrinsicAttributes) {

  type = type || 'neutral';

  return <button onClick={onClick} className={cx(type, compact&&'compact', className)} {...props} />

}





