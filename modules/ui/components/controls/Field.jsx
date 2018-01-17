import React from 'react';

import ls from './Field.less'

export default function Field({children}) {
 
  return <div className={ls.root}>
    {children}
  </div>;
}
