import React from 'react';
import cx from 'classnames';

import ls from './Widget.less';
import AdjustableAbs from './AdjustableAbs';
import Fa from './Fa';
import SymbolButton from './controls/SymbolButton';

export default function Widget({flatTop, flatBottom, flatRight, flatLeft, children, className, title, onClose, ...props}) {
  return <AdjustableAbs className={cx(ls.root, 
                                      flatTop && ls.flatTop, flatBottom && ls.flatBottom,
                                      flatRight && ls.flatRight, flatLeft && ls.flatLeft,
                                      className)} {...props}>
    <div className={ls.header}>
      <div className={ls.title}>{title}</div>
      <span className={ls.headerButtons}>
        <SymbolButton type='danger' onClick={onClose}><Fa fw icon='close'/></SymbolButton>
      </span>
    </div>
    <div className={ls.content}>
      {children}
    </div>
  </AdjustableAbs>;
}
