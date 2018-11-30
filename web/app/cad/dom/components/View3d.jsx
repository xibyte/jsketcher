import React from 'react';
import PlugableControlBar from './PlugableControlBar';
import ls from './View3d.less';
import Abs from 'ui/components/Abs';
import UISystem from './UISystem';
import WizardManager from '../../craft/wizard/components/WizardManager';
import FloatView from './FloatView';
import HistoryTimeline from '../../craft/ui/HistoryTimeline';
import SelectedModificationInfo from '../../craft/ui/SelectedModificationInfo';
import BottomStack from './BottomStack';
import SketcherToolbars from './SketcherToolbars';
import CameraControl from './CameraControl';
import HeadsUpHelper from './HeadsUpHelper';
import {HeadsUpToolbar} from './HeadsUpToolbar';


export default class View3d extends React.Component {

  shouldComponentUpdate() {
    //we don't want the dom to be updated under any circumstances or we loose the WEB-GL container
    return false;
  }

  render() {
    return <UISystem className={ls.root}>
      <FloatView />
      <div className={ls.mainArea} >
        <div id='viewer-container' />
        <Abs left={0} right={0} top={0}>
          <HeadsUpToolbar/>
          <HeadsUpHelper/>
          <WizardManager/>
          <SketcherToolbars />
        </Abs>
        <BottomStack>
          <CameraControl />
          <HistoryTimeline />
          <PlugableControlBar/>
        </BottomStack>
      </div>
      <SelectedModificationInfo />
    </UISystem>;
  }

  componentWillUnmount() {
    throw 'big no-no';
  }
}