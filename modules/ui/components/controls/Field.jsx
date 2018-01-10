import React from 'react';

import ls from './Label.less'

export default function Field({children}) {
  
  return <div className={ls.root}>
    {children[0]} {children[1]}
  </div>;


}
