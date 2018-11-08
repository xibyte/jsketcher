import React from 'react';
import ls from './HeadsUpHelper.less';

import Socket from './Socket';
import {AuxWidgetLook} from 'ui/components/AuxWidget';

export default function HeadsUpHelper() {
  return <AuxWidgetLook Component={Div} className={ls.root} flatTop>
    <Socket entry='headsUpHelper'/>
  </AuxWidgetLook>
}

const Div = props => <div {...props} />;
