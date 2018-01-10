import React from 'react';
import PropTypes from 'prop-types';
import PlugableControlBar from './PlugableControlBar';

import ls from './View3d.less';
import ObjectExplorer from './ObjectExplorer';
import OperationHistory from './OperationHistory';
import Toolbar, {ToolbarButton} from 'ui/components/Toolbar';
import ImgIcon from 'ui/components/ImgIcon';
import Fa from 'ui/components/Fa';
import Abs from 'ui/components/Abs';
import {PlugableToolbarLeft, PlugableToolbarLeftSecondary, PlugableToolbarRight} from "./PlugableToolbar";
import MenuHolder from "../menu/MenuHolder";
import {TOKENS as MENU_TOKENS} from '../menu/menuPlugin';


export default class View3d extends React.PureComponent {
  
  render() {
    return <div className={ls.root} onMouseDown={this.closeAllUpPopups}>
      <MenuHolder />
      <div className={ls.sideBar}>
        <ObjectExplorer/>
        <OperationHistory/>
      </div>
      <div className={ls.viewer} id='viewer-container'>
        {/*<div className={ls.viewer} */}
        <div>
        </div>
        <Abs left='2em' top='2em' className={ls.leftToolbarGroup}>
          <PlugableToolbarLeft />
          <PlugableToolbarLeftSecondary />
        </Abs>
        <Abs right='2em' top='2em'>
          <PlugableToolbarRight className={ls.smallToolbar}/>
        </Abs>
        <PlugableControlBar />
      </div>
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