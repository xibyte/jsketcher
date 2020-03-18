import React from 'react';
import ReactDOM from 'react-dom';
import {ConstraintEditor} from './ConstraintEditor';
import {ContextualControls} from './ContextualControls';
import {ConstraintList} from './ConstraintExplorer';
import {StreamsContext} from 'ui/streamsContext';
import {ToastContainer} from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import SketcherOperationWizard from "./SketcherOperationWizard";
import {StageControl} from "./StageControl";
import {Scope} from "./Scope";
import {SketcherToolbar} from "./SketcherToolbar";
import {sketcherRightToolbarConfig} from "../uiConfig";

export const SketcherAppContext = React.createContext({});

export function SketcherApp({applicationContext}) {
  return <SketcherAppContext.Provider value={applicationContext}>
    <StreamsContext.Provider value={applicationContext}>
      <Scope><ToastContainer /></Scope>
      <Scope><RightSideControls /></Scope>
      {ReactDOM.createPortal(
        <Scope><ConstraintList /></Scope>,
        document.getElementById('constraint-list')
      )}
      {ReactDOM.createPortal(
        <Scope><SketcherToolbar actions={sketcherRightToolbarConfig}/></Scope>,
        document.getElementById('right-toolbar')
      )}
    </StreamsContext.Provider>
  </SketcherAppContext.Provider>;

}

function RightSideControls() {
  return <React.Fragment>
    <Scope><ContextualControls /></Scope>
    <Scope><ConstraintEditor /></Scope>
    <Scope><SketcherOperationWizard /></Scope>
    <Scope><StageControl /></Scope>
  </React.Fragment>
}