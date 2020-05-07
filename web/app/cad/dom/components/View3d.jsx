import React from 'react';
import PlugableControlBar from './PlugableControlBar';
import ls from './View3d.less';
import UISystem from './UISystem';
import WizardManager from '../../craft/wizard/components/WizardManager';
import FloatView from './FloatView';
import HistoryTimeline from '../../craft/ui/HistoryTimeline';
import SelectedModificationInfo from '../../craft/ui/SelectedModificationInfo';
import CameraControl from './CameraControl';
import HeadsUpHelper from './HeadsUpHelper';
import {HeadsUpToolbar} from './HeadsUpToolbar';
import {SketchObjectExplorer} from '../../../sketcher/components/SketchObjectExplorer';
import SketcherMode from '../../sketch/components/SketcherMode';
import {ConstraintExplorer} from '../../../sketcher/components/ConstraintExplorer';
import {Scope} from "../../../sketcher/components/Scope";
import {InplaceSketcher} from "../../sketch/components/InplaceSketcher";
import {ContextualControls} from "../../../sketcher/components/ContextualControls";
import {ConstraintEditor} from "../../../sketcher/components/ConstraintEditor";
import SketcherOperationWizard from "../../../sketcher/components/SketcherOperationWizard";
import {StageControl} from "../../../sketcher/components/StageControl";


export default class View3d extends React.Component {

  shouldComponentUpdate() {
    return false;
  }

  render() {
    return <UISystem className={ls.root}>
      <FloatView />
      <div className={ls.mainArea} >
        <div id='viewer-container' key='viewer-container' />
        
        <div className={ls.mainLayout}>
          <div className={ls.headsUp}>
            <HeadsUpToolbar/>
            <HeadsUpHelper/>
          </div>

          <div className={ls.middleSection}>
            <SketcherMode>
              <InplaceSketcher>
                <div className={ls.overlayingPanel} >
                  <Scope><SketchObjectExplorer /></Scope>
                  <Scope><ConstraintExplorer /></Scope>
                  <Scope><ContextualControls /></Scope>
                  <Scope><ConstraintEditor /></Scope>
                  <Scope><SketcherOperationWizard /></Scope>
                  <Scope><StageControl /></Scope>
                </div>
              </InplaceSketcher>
            </SketcherMode>
            <div className={ls.wizardArea} >
              <WizardManager/>
            </div>
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