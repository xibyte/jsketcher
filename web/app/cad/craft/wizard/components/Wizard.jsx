import React from 'react';
import Window from 'ui/components/Window';
import Stack from 'ui/components/Stack';
import Button from 'ui/components/controls/Button';
import ButtonGroup from 'ui/components/controls/ButtonGroup';

import ls from './Wizard.less';
import CadError from '../../../../utils/errors';
import {FormContext} from './form/Form';
import connect from 'ui/connect';
import mapContext from 'ui/mapContext';

@connect(streams => streams.wizard.workingRequest)
@mapContext(ctx => ({
  updateParam: (name, value) => {
    let workingRequest$ = ctx.streams.wizard.workingRequest;
    if (workingRequest$.value.params && workingRequest$.value.type) {
      workingRequest$.mutate(data => data.params[name] = value)
    }
  }
}))
export default class Wizard extends React.Component {

  state = {
    hasError: false,
    validationErrors: [],
  };


  componentDidCatch() {
    this.setState({hasInternalError: true});
  }

  render() {
    if (this.state.hasInternalError) {
      return <span>operation error</span>;
    }

    let {left, type, params, resolveOperation, updateParam} = this.props;
    if (!type) {
      return null;
    }

    let operation = resolveOperation(type);
    if (!operation) {
      console.error('unknown operation ' + type);
      return null;
    }

    let title = (operation.label || type).toUpperCase();

    let formContext = {
      data: params,
      validationErrors: this.state.validationErrors,
      updateParam,
    };

    let Form = operation.form;

    return <Window initWidth={250}
                   initLeft={left || 25}
                   title={title}
                   onClose={this.cancel}
                   onKeyDown={this.onKeyDown}
                   setFocus={this.focusFirstInput}>
      <FormContext.Provider value={formContext}>
        <Form/>
      </FormContext.Provider>
      <Stack>
        <ButtonGroup>
          <Button onClick={this.cancel}>Cancel</Button>
          <Button type='accent' onClick={this.onOK}>OK</Button>
        </ButtonGroup>
        {this.state.hasError && <div className={ls.errorMessage}>
          performing operation with current parameters leads to an invalid object
          (self-intersecting / zero-thickness / complete degeneration or unsupported cases)
          {this.state.code && <div className={ls.errorCode}>{this.state.code}</div>}
          {this.state.userMessage && <div className={ls.userErrorMessage}>{this.state.userMessage}</div>}
        </div>}
        {this.state.validationErrors.length !== 0 && <div className={ls.errorMessage}>
          {this.state.validationErrors.map((err, i) => <div key={i}> {err.path.join(' ')} {err.message}</div>)}
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
    try {
      let {type, params, resolveOperation, validator} = this.props;
      if (!type) {
        return null;
      }

      let operation = resolveOperation(type);
      let validationErrors = validator(params, operation.schema);
      if (validationErrors.length !== 0) {
        this.setState({validationErrors});
        return;
      }
      this.props.onOK();
    } catch (error) {
      this.handleError(error);
    }
  };

  handleError(error) {
    let stateUpdate = {
      hasError: true
    };
    let printError = true;
    if (error.TYPE === CadError) {
      let {code, userMessage, kind} = error;
      printError = !code;
      if (code && kind === CadError.KIND.INTERNAL_ERROR) {
        console.warn('Operation Error Code: ' + code);
      }
      Object.assign(stateUpdate, {code, userMessage});
    }
    this.setState(stateUpdate);
    if (printError) {
      throw error;
    }
  }
}


