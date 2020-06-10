import React from 'react';
import cx from 'classnames';

export default function Fa({icon, fw, fa, stack, className, ...props}: {
  icon: string,
  fw?: boolean,
  fa?: string[],
  stack?: string,
  className?: string,
  props?: any
}) {
  let faCss = fa ? fa.map(s => 'fa-' + s) : [];
  if (icon) {
    icon = 'fa-' + icon;
  }
  if (fw) {
    faCss.push('fa-fw');
  }
  if (stack) {
    faCss.push('fa-stack-' + stack);
  }
  return <i className={ cx('fa', icon, faCss, className) } {...props}/>
}