import React from 'react';
import PropTypes from 'prop-types';
import MenuHolder from '../menu/MenuHolder';

import WindowSystem from 'ui/WindowSystem';
import ActionInfo from '../actionInfo/ActionInfo';
import ContributedComponents from './ContributedComponents';

export default class UISystem extends React.Component {
  
  render() {
    return <div {...this.props} onMouseDown={this.closeAllUpPopups} >
      <MenuHolder />
      <ActionInfo />
      <WindowSystem>
        {this.props.children}
        <ContributedComponents />
      </WindowSystem>
    </div>
  }

  shouldComponentUpdate() {
    return false;
  }

  closeAllUpPopups = () => {
    this.context.services.menu.closeAll();
    this.context.services.action.showHintFor(null);
  };

  getChildContext() {
    return {
      closeAllUpPopups: this.closeAllUpPopups
    }
  }
  
  static contextTypes = {
    services: PropTypes.object
  };

  static childContextTypes = {
    closeAllUpPopups: PropTypes.func
  };
}

