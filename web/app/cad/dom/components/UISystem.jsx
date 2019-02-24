import React from 'react';
import PropTypes from 'prop-types';
import MenuHolder from '../menu/MenuHolder';

import WindowSystem from 'ui/WindowSystem';
import ActionInfo from '../actionInfo/ActionInfo';
import ContributedComponents from './ContributedComponents';
import {stream} from '../../../../../modules/lstream';

export default class UISystem extends React.Component {
  
  onCloseAll = stream();
  
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
    this.onCloseAll.next();
  };

  getChildContext() {
    return {
      closeAllUpPopups: this.closeAllUpPopups,
      onCloseAll: this.onCloseAll
    }
  }
  
  static contextTypes = {
    services: PropTypes.object
  };

  static childContextTypes = {
    closeAllUpPopups: PropTypes.func,
    onCloseAll: PropTypes.object
  };
}

