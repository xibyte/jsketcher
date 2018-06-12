import React from 'react';
import PlugableControlBar from './PlugableControlBar';

import ls from './View3d.less';
import Abs from 'ui/components/Abs';
import {PlugableToolbarLeft, PlugableToolbarLeftSecondary, PlugableToolbarRight} from './PlugableToolbar';
import UISystem from './UISystem';
import WizardManager from '../../craft/wizard/components/WizardManager';
import PartPanel from './PartPanel';


export default class View3d extends React.Component {

  shouldComponentUpdate() {
    //we don't want the dom to be updated under any circumstances or we loose the WEB-GL container
    return false;
  }
  
  render() {
    return <UISystem className={ls.root} >
      <div className={ls.sideBar}>
        <PartPanel />
      </div>
      <div className={ls.viewer} id='viewer-container'>
        <Abs left='0.8em' top='0.8em' className={ls.leftToolbarGroup}>
          <PlugableToolbarLeft />
          <PlugableToolbarLeftSecondary />
        </Abs>
        <Abs right='0.8em' top='0.8em'>
          <PlugableToolbarRight />
        </Abs>
        <PlugableControlBar />
        <WizardManager />
      </div>
    </UISystem>
  }
  
  componentWillUnmount() {
    throw 'big no-no';
  }
}