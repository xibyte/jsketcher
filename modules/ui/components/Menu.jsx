import React, {useContext, useEffect, useState} from 'react';
import PropTypes from 'prop-types';

import ls from './Menu.less';
import AuxWidget from "./AuxWidget";
import cx from 'classnames';
import Fa from './Fa';
import {UISystemContext} from "../../../web/app/cad/dom/components/UISystem";
import {useStream} from "../effects";

export default function Menu({children, x, y, orientationUp, centered, menuId, ...props}) {
  return <AuxWidget 
    className={cx(ls.root, 'disable-selection', 'small-typography')}
    zIndex={500}
    left={x}
    top={orientationUp ? undefined : y}
    bottom={orientationUp ? y : undefined}
    centered={centered}
    data-menu-id={menuId}
    {...props}>
    {children}
  </AuxWidget>;
}

export function MenuSeparator() {
  return <div className={ls.separator} />
}


export function MenuItem({icon, label, hotKey, style, disabled, onClick, children, ...props}) {

  const {closeAllUpPopups} = useContext(UISystemContext);

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
              onMouseDown={e => e.stopPropagation()} style={style} onClick={clickHandler} {...props}>
    {icon}
    <span className={ls.label}>{label}</span>
    {hotKey && <span className={ls.hotKey}>{hotKey}</span>}
  </div>;
}

const ContextMenuContext = React.createContext(null);

export function ContextMenu(props) {

  const [state, setState] = useState({
    active: false
  });

  const {onCloseAll} = useContext(UISystemContext);

  useEffect(() => onCloseAll.attach(close));

  const onClick = e => {
    e.preventDefault();
    setState({
      active: true,
      x: e.clientX,
      y: e.clientY
    });
  };

  const close = () => {
    setState({active: false})
  };

  return <ContextMenuContext.Provider value={close}>
    <span className={ls.contextMenu}>
      <span onContextMenu={onClick}>{props.children}</span>
      <span onClick={onClick} className={ls.contextMenuBtn}><Fa fw icon='ellipsis-h'/></span>
      {state.active && <Menu x={state.x} y={state.y}>
        {props.items}
      </Menu>}
    </span>
  </ContextMenuContext.Provider>;
}

export function ContextMenuItem({onClick, ...props}) {
  const closeMenu = useContext(ContextMenuContext);
  return <MenuItem onClick={() => {
    closeMenu();
    onClick();
  }} {...props}/>;
}
