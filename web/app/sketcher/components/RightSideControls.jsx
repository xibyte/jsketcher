import React from 'react';
import {ConstraintEditor} from "./ConstraintEditor";
import {ContextualControls} from "./ContextualControls";

export function RightSideControls() {

  return <React.Fragment>
    <ContextualControls />
    <ConstraintEditor />
  </React.Fragment>;

}


