import React from 'react';
import PropTypes from 'prop-types';
import MenuHolder from '../menu/MenuHolder';

import ActionInfo from '../actionInfo/ActionInfo';
import ContributedComponents from './ContributedComponents';
import {stream} from 'lstream';
import {DocumentationWindow} from 'doc/DocumentationWindow';
import {Scope} from "../../../sketcher/components/Scope";
import {ContextualControls} from "../../../sketcher/components/ContextualControls";
import {ConstraintEditor} from "../../../sketcher/components/ConstraintEditor";
import SketcherOperationWizard from "../../../sketcher/components/SketcherOperationWizard";
import {StageControl} from "../../../sketcher/components/StageControl";

export default class UISystem extends React.Component {
  
  onCloseAll = stream();
  
  render() {
    return <div {...this.props} onMouseDown={this.closeAllUpPopups} >
      <MenuHolder />
      <ActionInfo />
      {this.props.children}
      <ContributedComponents />
      <Scope><DocumentationWindow /></Scope>
      <React.Fragment>
      <Scope><ContextualControls /></Scope>
      <Scope><ConstraintEditor /></Scope>
      <Scope><SketcherOperationWizard /></Scope>
      <Scope><StageControl /></Scope>
    </React.Fragment>
    </div>
  }

  shouldComponentUpdate() {
    return false;
  }

  closeAllUpPopups = () => {
    this.context.services.menu.closeAll();
    this.context.services.action.showHintFor(null);
    this.onCloseAll.next();
  };

  getChildContext() {
    return {
      closeAllUpPopups: this.closeAllUpPopups,
      onCloseAll: this.onCloseAll
    }
  }
  
  static contextTypes = {
    services: PropTypes.object
  };

  static childContextTypes = {
    closeAllUpPopups: PropTypes.func,
    onCloseAll: PropTypes.object
  };
}

