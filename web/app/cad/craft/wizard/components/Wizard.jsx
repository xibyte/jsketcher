import React from 'react';
import PropTypes from 'prop-types';
import Window from 'ui/components/Window';
import Stack from 'ui/components/Stack';
import Button from 'ui/components/controls/Button';
import ButtonGroup from 'ui/components/controls/ButtonGroup';

import ls from './Wizard.less';
import CadError from '../../../../utils/errors';
import {createPreviewer} from '../../../preview/scenePreviewer';
import {FormContext} from './form/Form';

export default class Wizard extends React.Component {

  state = {hasError: false};

  constructor({initialState}) {
    super();
    this.formContext = {
      data: initialState || {},
      onChange: noop
    };
  }
  
  componentDidMount() {
    let {services} = this.context;

    let {previewGeomProvider} = services.operation.get(this.props.type);

    let previewer = createPreviewer(previewGeomProvider, services);
    let preview = previewer(this.formContext.data);

    this.formContext.onChange = () => preview.update(this.formContext.data);
    this.dispose = () => {
      preview.dispose();
    };
  }
  
  componentWillUnmount() {
    this.dispose();
    this.formContext.onChange = noop;
  }

  componentDidCatch() {
    this.setState({hasInternalError: true});
  }


  render() {
    if (this.state.hasInternalError) {
      return <span>operation error</span>;
    }
    let {type, left} = this.props;
    let {wizard: WizardImpl} = this.context.services.operation.get(type);

    return <Window initWidth={250}
                   initLeft={left}
                   title={type}
                   onClose={this.cancel}
                   onKeyDown={this.onKeyDown}
                   setFocus={this.focusFirstInput}>
      <FormContext.Provider value={this.formContext}>
        <WizardImpl />
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
    if (this.props.onCancel) {
      this.props.onCancel();
    }
    this.props.close();
  };

  onOK = () => {
    try {
      if (this.props.onOK) {
        this.props.onOK(this.formContext.data);
      } else {
        this.context.services.craft.modify({type: this.props.type, params: this.formContext.data});
      }
      this.props.close();
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


  static contextTypes = {
    services: PropTypes.object
  };

}

const noop = () => {};
