import React from 'react';
import ReactDOM from 'react-dom';
import {ConstraintEditor} from './ConstraintEditor';
import {ContextualControls} from './ContextualControls';
import {ConstraintList} from './ConstraintExplorer';
import {StreamsContext} from 'ui/streamsContext';

export const SketcherAppContext = React.createContext({});

export function SketcherApp({applicationContext}) {
  return <SketcherAppContext.Provider value={applicationContext}>
    <StreamsContext.Provider value={applicationContext}>
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
  </React.Fragment>
}