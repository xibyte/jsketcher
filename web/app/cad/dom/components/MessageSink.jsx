import React from 'react';

import AuxWidget from './../../../../../modules/ui/components/AuxWidget';

export default function MessageSink({children, ...props}) {

  return <AuxWidget {...props}>
    {children}    
  </AuxWidget>;
}

