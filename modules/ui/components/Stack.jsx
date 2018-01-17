import React from 'react';

import ls from './Stack.less'

export default function Stack({children}) {
  return <div className={ls.root}>{children}</div>
}

Window.defaultProps = {
  type: 'neutral',
};




