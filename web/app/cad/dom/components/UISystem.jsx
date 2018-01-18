import React from 'react';
import PropTypes from 'prop-types';
import MenuHolder from "../menu/MenuHolder";
import {TOKENS as MENU_TOKENS} from '../menu/menuPlugin';

import WindowSystem from 'ui/WindowSystem';
import ActionInfo from "../actionInfo/ActionInfo";

export default class UISystem extends React.Component {
  
  render() {
    return <div {...this.props} onMouseDown={this.closeAllUpPopups}>
      <MenuHolder />
      <ActionInfo />
      <WindowSystem />
      {this.props.children}
    </div>
  }

  closeAllUpPopups = () => {
    let openedMenus = this.context.bus.state[MENU_TOKENS.OPENED];
    if (openedMenus && openedMenus.length !== 0) {
      this.context.bus.dispatch(MENU_TOKENS.CLOSE_ALL);
    }

  };
  
  getChildContext() {
    return {
      closeAllUpPopups: this.closeAllUpPopups
    }
  }
  
  static contextTypes = {
    bus: PropTypes.object
  };

  static childContextTypes = {
    closeAllUpPopups: PropTypes.func
  };
}