import React from 'react';
import PropTypes from 'prop-types';

import ls from './Menu.less';
import AuxWidget from "./AuxWidget";
import cx from 'classnames';
import Fa from './Fa';

export default function Menu({children, x, y, orientationUp, centered, menuId, ...props}) {
  return <AuxWidget 
    className={cx(ls.root, 'disable-selection')}
    zIndex={500}
    left={x}
    top={orientationUp ? undefined : y}
    bottom={orientationUp ? y : undefined}
    centered={centered}
    {...props}>
    {children}
  </AuxWidget>;
}

export function MenuSeparator() {
  return <div className={ls.separator} />
}


export function MenuItem({icon, label, hotKey, style, disabled, onClick, children, ...props}, {closeAllUpPopups}) {

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

export class ContextMenu extends React.Component {

  state = {
    active: false
  };

  onClick = e => {
    e.preventDefault();
    this.setState({
      active: true,
      x: e.clientX,
      y: e.clientY
    });
  };

  close = () => {
    this.setState({active: false})
  };
  
  componentDidMount() {
    this.detacher = this.context.onCloseAll.attach(this.close);
  }

  componentWillUnmount() {
    this.detacher();
  }

  render() {
    return <span className={ls.contextMenu}>
      <span onContextMenu={this.onClick}>{this.props.children}</span>
      <span onClick={this.onClick} className={ls.contextMenuBtn}><Fa fw icon='ellipsis-h'/></span>
      {this.state.active && <Menu x={this.state.x} y={this.state.y}>
        {this.props.items}
      </Menu>}
    </span>
  }

  getChildContext() {
    return {
      closeMenu: this.close
    };
  }
  
  static contextTypes = {
    onCloseAll: PropTypes.object
  };

  static childContextTypes = {
    closeMenu: PropTypes.func
  };
}

export function ContextMenuItem({onClick, ...props}, {closeMenu}) {
  return <MenuItem onClick={() => {
    closeMenu();
    onClick();
  }} {...props}/>;
}

ContextMenuItem.contextTypes = {
  closeMenu: PropTypes.func
};

MenuItem.contextTypes = {
  closeAllUpPopups: PropTypes.func
};
