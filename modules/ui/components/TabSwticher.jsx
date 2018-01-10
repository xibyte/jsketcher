import React, {Fragment} from 'react';
import Fa from 'ui/components/Fa';
import cx from 'classnames';

import ls from './TabSwitcher.less';

export default function TabSwitcher({children, className}) {

  return <div className={cx(ls.root, className, 'disable-selection')}>
    {children}
  </div>  
}

export function Tab({id, label, active, closable, onSwitch}) {
  return <span className={cx(ls.tab, active && ls.active)} onClick={() => onSwitch(id)}>
    {label} 
    {closable && <Fragment>
      <Fa fw icon='expand' className={ls.expand} /> <Fa fw icon='close' className={ls.close} />
    </Fragment>}
  </span>;
}