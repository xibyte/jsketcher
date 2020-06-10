import React from 'react';
import Window, {WindowControlButton} from 'ui/components/Window';
import Stack from 'ui/components/Stack';
import Button from 'ui/components/controls/Button';
import ButtonGroup from 'ui/components/controls/ButtonGroup';

import ls from './Wizard.less';
import CadError from '../../../../utils/errors';
import {FormContext} from './form/Form';
import connect from 'ui/connect';
import {combine} from 'lstream';
import {DocumentationTopic$} from "../../../../../../modules/doc/DocumentationWindow";
import {IoMdHelp} from "react-icons/io";

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
    return <Window initWidth={250}
                   initLeft={left || 15}
                   title={title}
                   onClose={this.cancel}
                   onKeyDown={this.onKeyDown}
                   setFocus={this.focusFirstInput}
                   className='Wizard mid-typography'
                   data-operation-id={operation.id}
                   controlButtons={<>
                     <WindowControlButton title='help' onClick={(e) => DocumentationTopic$.next({
                       topic: operation.id,
                       x: e.pageX + 40,
                       y: e.pageY
                     })}>
                       <IoMdHelp />
                     </WindowControlButton>
                   </>}>
      <FormContext.Provider value={formContext}>
        <Form/>
      </FormContext.Provider>
      <Stack>
        <ButtonGroup>
          <Button className='dialog-cancel' onClick={this.cancel}>Cancel</Button>
          <Button className='dialog-ok' type='accent' onClick={this.onOK}>OK</Button>
        </ButtonGroup>
        {error && <div className={ls.errorMessage}>
          {CadError.ALGORITMTHM_ERROR_KINDS.includes(error.kind) && <span>
            performing operation with current parameters leads to an invalid object
            (self-intersecting / zero-thickness / complete degeneration or unsupported cases)
          </span>}
          {error.code && <div className={ls.errorCode}>{error.code}</div>}
          {error.userMessage && <div className={ls.userErrorMessage}>{error.userMessage}</div>}
          {!error.userMessage && <div>internal error processing operation, check the log</div>}
        </div>}
      </Stack>
    </Window>;
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


