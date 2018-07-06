import React from 'react';
import ls from './BottomStack.less';

export default function BottomStack({children}) {
  return <div className={ls.root}>
    {children}
  </div>;
}