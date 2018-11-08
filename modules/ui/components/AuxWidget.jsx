import React from 'react';
import cx from 'classnames';

import ls from './AuxWidget.less';
import AdjustableAbs from './AdjustableAbs';

export default function AuxWidget(props) {
  return <AuxWidgetLook {...props} Component={AdjustableAbs}/>
}

export function AuxWidgetLook({flatTop, flatBottom, flatRight, flatLeft, children, className, Component, ...props}) {
  return <Component className={cx(ls.root,
    flatTop && ls.flatTop, flatBottom && ls.flatBottom,
    flatRight && ls.flatRight, flatLeft && ls.flatLeft,
    className)} {...props}>
    {children}
  </Component>;
}