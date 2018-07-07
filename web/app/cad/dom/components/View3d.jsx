import React from 'react';
import PlugableControlBar from './PlugableControlBar';
import ls from './View3d.less';
import Abs from 'ui/components/Abs';
import {AuxiliaryToolbar, HeadsUpToolbar} from './PlugableToolbar';
import UISystem from './UISystem';
import WizardManager from '../../craft/wizard/components/WizardManager';
import FloatView from './FloatView';
import HistoryTimeline from '../../craft/ui/HistoryTimeline';
import BottomStack from './BottomStack';
import SelectedModificationInfo from '../../craft/ui/SelectedModificationInfo';


export default class View3d extends React.Component {

  shouldComponentUpdate() {
    //we don't want the dom to be updated under any circumstances or we loose the WEB-GL container
    return false;
  }

  render() {
    return <UISystem className={ls.root}>
      <FloatView />
      <div className={ls.viewer} id='viewer-container'>
        <Abs left='0.8em' top='0.8em'>
          <HeadsUpToolbar/>
        </Abs>
        <Abs right='0.8em' top='0.8em'>
          <AuxiliaryToolbar small vertical/>
        </Abs>
        <BottomStack>
          <HistoryTimeline />
          <PlugableControlBar/>
        </BottomStack>
        <WizardManager/>
      </div>
      <SelectedModificationInfo />
    </UISystem>;
  }

  componentWillUnmount() {
    throw 'big no-no';
  }
}