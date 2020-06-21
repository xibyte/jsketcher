import React from 'react';
import Stack from 'ui/components/Stack';
import Button from 'ui/components/controls/Button';
import ButtonGroup from 'ui/components/controls/ButtonGroup';

import ls from './Wizard.less';
import CadError from '../../../../utils/errors';
import {FormContext} from './form/Form';
import connect from 'ui/connect';
import {combine} from 'lstream';
import {GenericWizard} from "ui/components/GenericWizard";

@connect((streams, props) => combine(props.context.workingRequest$, props.context.state$)
  .map(([workingRequest, state]) => ({
    ...workingRequest,
    activeParam: state.activeParam,
    error: state.error
  })))
export default class Wizard extends React.Component {

  state = {
    hasInternalError: false,
  };

  updateParam = (name, value) => {
    this.props.context.updateParam(name, value);
  };

  setActiveParam = param => {
    this.props.context.updateState(state => state.activeParam = param);
  };

  componentDidCatch() {
    this.setState({hasInternalError: true});
  }

  render() {
    if (this.state.hasInternalError) {
      return <span>operation error</span>;
    }

    let {left, type, params, state, context} = this.props;
    let operation = context.operation;

    let title = (operation.label || type).toUpperCase();

    let formContext = {
      data: params,
      activeParam: this.props.activeParam,
      setActiveParam: this.setActiveParam,
      updateParam: this.updateParam
    };

    let Form = operation.form;

    const error = this.props.error;
    return <GenericWizard
                   left={left}
                   title={title}
                   onClose={this.cancel}
                   onKeyDown={this.onKeyDown}
                   setFocus={this.focusFirstInput}
                   className='Wizard'
                   data-operation-id={operation.id}
                   topicId={operation.id}
                   onCancel={this.cancel}
                   onOK={this.onOK}
                   infoText={error && <div className={ls.errorMessage}>
                     {CadError.ALGORITHM_ERROR_KINDS.includes(error.kind) && <span>
                        performing operation with current parameters leads to an invalid object
                        (self-intersecting / zero-thickness / complete degeneration or unsupported cases)
                      </span>}
                     {error.code && <div className={ls.errorCode}>{error.code}</div>}
                     {error.userMessage && <div className={ls.userErrorMessage}>{error.userMessage}</div>}
                     {!error.userMessage && <div>internal error processing operation, check the log</div>}
                   </div>}
    >
      <FormContext.Provider value={formContext}>
        <Form/>
      </FormContext.Provider>
    </GenericWizard>;
  }

  onKeyDown = e => {
    switch (e.keyCode) {
      case 27 :
        this.cancel();
        break;
      case 13 :
        this.onOK();
        break;
    }
  };

  focusFirstInput = el => {
    if (this.props.noFocus) {
      return;
    }
    let toFocus = el.querySelector('input, select');
    if (!toFocus) {
      toFocus = el;
    }
    toFocus.focus();
  };

  cancel = () => {
    this.props.onCancel();
  };

  onOK = () => {
    this.props.onOK();
  };
}


