import React from 'react';
import PropTypes from 'prop-types';

import ls from './Menu.less';
import AuxWidget from "./AuxWidget";
import cx from 'classnames';

export default function Menu({children, visible, x, y, orientationUp, style, ...props}) {
  return <AuxWidget 
    className={cx(ls.root, 'disable-selection')}
    style={{
      display: visible ? 'block' : 'none',
      ...style
    }}
    left={x}
    top={orientationUp ? undefined : y}
    bottom={orientationUp ? y : undefined}
    {...props}>
    {children}
  </AuxWidget>;
}

export function MenuSeparator() {
  return <div className={ls.separator} />
}


export function MenuItem({icon, label, hotKey, style, disabled, onClick}, {closeAllUpPopups}) {

  if (hotKey) {
    hotKey = hotKey.replace(/\s/g, '');
    if (hotKey.length > 15) {
      hotKey = null;
    }
  }
  let clickHandler = disabled ?  undefined : () => {
    closeAllUpPopups();
    onClick();
  };
  return <div className={cx(ls.item, disabled && ls.disabled)} 
              onMouseDown={e => e.stopPropagation()} style={style} onClick={clickHandler}>
    {icon}
    <span className={ls.label}>{label}</span>
    {hotKey && <span className={ls.hotKey}>{hotKey}</span>}
  </div>;
}

MenuItem.contextTypes = {
  closeAllUpPopups: PropTypes.func
};
