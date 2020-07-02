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
import {ToastContainer} from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import {ContributedComponents} from "./ContributedComponents";

export default class View3d extends React.Component {

  shouldComponentUpdate() {
    return false;
  }

  render() {
    return <UISystem className={ls.root}>
      <ToastContainer />
      <FloatView />
      <div className={ls.mainArea} >
        <div id='viewer-container' key='viewer-container' />
        
        <div className={ls.mainLayout}>
          <div className={ls.headsUp}>
            <HeadsUpToolbar/>
            <HeadsUpHelper/>
          </div>

          <div className={ls.middleSection + ' small-typography'}>
            <SketcherMode>
              <InplaceSketcher>
                <div className={ls.overlayingPanel} >
                  <Scope><SketchObjectExplorer /></Scope>
                  <Scope><ConstraintExplorer /></Scope>
                </div>
                <div className={ls.sketcherViewport} >
                  <Scope><ContextualControls /></Scope>
                  <Scope><ConstraintEditor leftOffset/></Scope>
                  <Scope><SketcherOperationWizard /></Scope>
                </div>
              </InplaceSketcher>
            </SketcherMode>

            <div className={ls.wizardArea} >
              <WizardManager/>
            </div>
            <div className='regular-typography'>
              <ContributedComponents/>
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