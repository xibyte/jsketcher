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
import {SketchObjectExplorer} from '../../../sketcher/components/SketchObjectExplorer';
import SketcherMode from './SketcherMode';


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
        
        <div className={ls.mainLayout}>
          <div className={ls.headsUp}>
            <HeadsUpToolbar/>
            <HeadsUpHelper/>
          </div>

          <div className={ls.middleSection}>
            <SketcherMode>
              <div className={ls.overlayingPanel} >
                <SketchObjectExplorer />
              </div>
            </SketcherMode>
            <div className={ls.wizardArea} >
              <WizardManager/>
            </div>
            <SketcherMode>
              <div className={ls.spring} />
              <div className={ls.middleRight}>
                <SketcherToolbars />
              </div>
            </SketcherMode>
          </div>

          <div className={ls.bottomStack}>
            <CameraControl />
            <HistoryTimeline />
            <PlugableControlBar/>
          </div>
          
        </div>
      </div>
      <SelectedModificationInfo />
    </UISystem>;
  }

  componentWillUnmount() {
    throw 'big no-no';
  }
}