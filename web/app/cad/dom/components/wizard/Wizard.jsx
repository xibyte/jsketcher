import React from 'react';
import PropTypes from 'prop-types';
import Window from 'ui/components/Window';
import Stack from 'ui/components/Stack';
import Field from 'ui/components/controls/Field';
import Label from 'ui/components/controls/Label';
import camelCaseSplit from 'gems/camelCaseSplit';
import NumberControl from 'ui/components/controls/NumberControl';
import TextControl from 'ui/components/controls/TextControl';
import Button from 'ui/components/controls/Button';
import ButtonGroup from 'ui/components/controls/ButtonGroup';
import FaceSelectionControl from './FaceSelectionControl';
import {CURRENT_SELECTION} from "../../../craft/wizard/wizardPlugin";
import {isTCADError} from "../../../../utils/errors";

import ls from './Wizard.less';
import RadioButtons, {RadioButton} from "ui/components/controls/RadioButtons";


export default class Wizard extends React.Component {
  
  constructor({initialState, metadata, previewer}, {services: {selection}}) {
    super();
    this.state = {hasError: false};
    this.params = {};

    metadata.forEach(([name, type, v]) => {
      if (type === 'face' && v === CURRENT_SELECTION) {
        let selectedFace = selection.face()[0];
        v = selectedFace ? selectedFace.id : '';
      }
      this.params[name] = v
    });
    
    Object.assign(this.params, initialState);
    
    this.preview = previewer(this.params);
  }

  render() {
    let {left, title, metadata} = this.props;
    return <Window initWidth={250} 
                   initLeft={left} 
                   title={title} 
                   onClose={this.onClose} 
                   onKeyDown={this.onKeyDown}
                   setFocus={this.focusFirstInput}>
      <Stack >
        {metadata.map(([name, type, , params], index) => {
          return <Field key={index}>
            <Label>{uiLabel(name)}</Label>
            {this.controlForType(name, type, params)}
          </Field>
        } )}
        <ButtonGroup>
          <Button text='Cancel' onClick={this.onClose} />
          <Button text='OK' type='accent' onClick={this.onOK} />
        </ButtonGroup>
        {this.state.hasError && <div className={ls.errorMessage}>
          performing operation with current parameters leads to an invalid object
          (manifold / self-intersecting / zero-thickness / complete degeneration or unsupported cases)
          {this.state.code && <span className={ls.errorCode}>{this.state.code}</span>}
        </div>}

      </Stack>
    </Window>;
  }

  onKeyDown = e => {
    switch (e.keyCode) {
      case 27 :
        this.onClose();
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
    toFocus.focus()
  };
  
  onClose = () => {
    this.preview.dispose();
    this.props.onCancel();
  };
  
  onOK = () => {
    try {
      this.props.onOK(this.params);
      this.onClose();
    } catch (error) {
      let state = {
        hasError: true 
      };
      if (!isTCADError(error)) {
        console.error('internal error while performing operation');
        console.error(error);
      } else {
        state.cadCode = error.code;
        console.log(error);
      }
      this.setState(state);
    }
  };
  
  controlForType(name, type, params, tabindex) {
    const onChange = val => {
      this.params[name] = val;
      this.preview.update(this.params);
    };
    let initValue = this.params[name];
    let commonProps = {onChange, initValue, tabindex};
    if (type === 'number') {
      return <NumberControl {...commonProps} {...params} />
    } else if (type === 'face') {
      return <FaceSelectionControl {...commonProps} {...params} />
    } else if (type === 'choice') {
      return <RadioButtons {...commonProps}>
        {params.options.map(op => <RadioButton value={op} label={op} key={op}/>)}
      </RadioButtons>
    } else {
      return <TextControl {...commonProps} {...params} />
    }
  }
  
  static contextTypes = {
    services: PropTypes.object
  };

}


function uiLabel(name) {
  return camelCaseSplit(name).map(w => w.toLowerCase()).join(' ');
}

