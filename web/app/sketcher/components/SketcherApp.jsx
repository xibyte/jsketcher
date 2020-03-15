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

export const SketcherAppContext = React.createContext({});

export function SketcherApp({applicationContext}) {
  return <SketcherAppContext.Provider value={applicationContext}>
    <StreamsContext.Provider value={applicationContext}>
      <ToastContainer />
      <RightSideControls />
      {ReactDOM.createPortal(
        <ConstraintList />,
        document.getElementById('constraint-list')
      )}
    </StreamsContext.Provider>
  </SketcherAppContext.Provider>;

}

function RightSideControls() {
  return <React.Fragment>
    <ContextualControls />
    <ConstraintEditor />
    <SketcherOperationWizard />
    <StageControl />
  </React.Fragment>
}